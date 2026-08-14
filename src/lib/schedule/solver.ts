import solver from "javascript-lp-solver";

export type SolverEmployee = { id: string; displayName: string };
export type SolverStore = { id: number; allowedShiftIds: number[] };
export type SolverShift = { id: number; startHour: number; endHour: number };
export type SolverAvailability = Record<
  string,
  Record<string, { start: number; end: number }[]>
>;

export type SolverAssignment = {
  userId: string;
  storeId: number;
  shiftId: number;
  day: string;
  startHour: number;
  endHour: number;
};

// 13 khung 1 giờ từ 9h đến 22h (mục 5) — hour = giờ bắt đầu của khung đó.
export const SOLVER_HOURS = Array.from({ length: 13 }, (_, i) => 9 + i);

const COVERAGE_WEIGHT = 1000;
const FAIRNESS_WEIGHT = 1;

function shiftCoversHour(shift: SolverShift, hour: number) {
  return shift.startHour <= hour && shift.endHour > hour;
}

function isWithinAvailability(
  ranges: { start: number; end: number }[],
  shift: SolverShift,
) {
  return ranges.some((r) => r.start <= shift.startHour && r.end >= shift.endHour);
}

type LPModel = {
  optimize: string;
  opType: "max";
  constraints: Record<string, { max?: number; min?: number }>;
  variables: Record<string, Record<string, number>>;
  binaries: Record<string, 1>;
  timeout: number;
};

// Bộ giải branch-and-cut thuần JS (không phải highs-js biên dịch C++) chậm
// hơn nhiều so với ước tính "phần nghìn giây" của spec ở quy mô thực tế
// (~2000-4000 biến nhị phân) — đã đo được >120s không xong. Đặt trần thời
// gian, hết giờ thì coi như lỗi và rơi xuống greedy (đúng cơ chế dự phòng
// mục 5 đã định sẵn).
const SOLVE_TIMEOUT_MS = 5000;

/**
 * Mô hình ILP theo đúng mục 5: biến x (phân công), biến y (độ phủ theo
 * giờ), 3 ràng buộc cốt lõi, hàm mục tiêu 1000×phủ − 1×(lệch giờ làm).
 * "Lệch giờ làm" xấp xỉ tuyến tính bằng (giờ làm nhiều nhất − ít nhất) qua
 * 2 biến phụ maxH/minH — cách chuẩn để giữ mô hình tuyến tính cho LP solver.
 */
export function solveWithILP(
  employees: SolverEmployee[],
  stores: SolverStore[],
  shifts: SolverShift[],
  weekDays: string[],
  availability: SolverAvailability,
): SolverAssignment[] {
  const model: LPModel = {
    optimize: "objective",
    opType: "max",
    constraints: {},
    variables: {},
    binaries: {},
    timeout: SOLVE_TIMEOUT_MS,
  };

  function setCoef(varName: string, constraintName: string, coef: number) {
    if (!model.variables[varName]) model.variables[varName] = {};
    model.variables[varName][constraintName] = coef;
  }

  for (const store of stores) {
    for (const day of weekDays) {
      for (const hour of SOLVER_HOURS) {
        const yVar = `y_${store.id}_${hour}_${day}`;
        model.binaries[yVar] = 1;
        setCoef(yVar, "objective", COVERAGE_WEIGHT);
      }
    }
  }

  const xMeta: Record<
    string,
    {
      empId: string;
      storeId: number;
      shiftId: number;
      day: string;
      startHour: number;
      endHour: number;
    }
  > = {};
  const empXVars: Record<string, { xVar: string; duration: number }[]> = {};
  for (const emp of employees) empXVars[emp.id] = [];

  for (const emp of employees) {
    for (const store of stores) {
      const storeShifts = shifts.filter((s) => store.allowedShiftIds.includes(s.id));
      for (const shift of storeShifts) {
        for (const day of weekDays) {
          const ranges = availability[emp.id]?.[day] ?? [];
          if (!isWithinAvailability(ranges, shift)) continue;

          const xVar = `x_${emp.id}_${store.id}_${shift.id}_${day}`;
          const duration = shift.endHour - shift.startHour;
          model.binaries[xVar] = 1;
          xMeta[xVar] = {
            empId: emp.id,
            storeId: store.id,
            shiftId: shift.id,
            day,
            startHour: shift.startHour,
            endHour: shift.endHour,
          };
          empXVars[emp.id].push({ xVar, duration });

          for (const hour of SOLVER_HOURS) {
            if (!shiftCoversHour(shift, hour)) continue;

            // Ràng buộc 1 — liên kết phủ: y <= sum(x)
            const coverConstraint = `cover_${store.id}_${hour}_${day}`;
            model.constraints[coverConstraint] = { max: 0 };
            setCoef(`y_${store.id}_${hour}_${day}`, coverConstraint, 1);
            setCoef(xVar, coverConstraint, -1);

            // Ràng buộc 2 — không phân thân: mỗi nhân viên tối đa 1 ca/giờ
            const noSplitConstraint = `nosplit_${emp.id}_${hour}_${day}`;
            model.constraints[noSplitConstraint] = { max: 1 };
            setCoef(xVar, noSplitConstraint, 1);
          }

          // Ràng buộc 3 — tối đa 1 người mỗi (cửa hàng, ca, ngày)
          const oneCellConstraint = `onecell_${store.id}_${shift.id}_${day}`;
          model.constraints[oneCellConstraint] = { max: 1 };
          setCoef(xVar, oneCellConstraint, 1);
        }
      }
    }
  }

  setCoef("maxH", "objective", -FAIRNESS_WEIGHT);
  setCoef("minH", "objective", FAIRNESS_WEIGHT);

  for (const emp of employees) {
    const maxConstraint = `maxbound_${emp.id}`;
    model.constraints[maxConstraint] = { min: 0 };
    setCoef("maxH", maxConstraint, 1);

    const minConstraint = `minbound_${emp.id}`;
    model.constraints[minConstraint] = { min: 0 };
    setCoef("minH", minConstraint, -1);

    for (const { xVar, duration } of empXVars[emp.id]) {
      setCoef(xVar, maxConstraint, -duration);
      setCoef(xVar, minConstraint, duration);
    }
  }

  const solution = solver.Solve(model) as Record<string, number | boolean | undefined>;
  if (!solution.feasible) {
    throw new Error("Mô hình không có nghiệm khả thi.");
  }
  // Hết timeout giữa chừng có thể trả về nghiệm chưa nguyên — không dùng
  // được làm lịch thật (giá trị biến có thể là số lẻ như 0.5), rơi xuống
  // greedy thay vì xếp sai.
  if (solution.isIntegral === false) {
    throw new Error("Quá thời gian chờ, nghiệm chưa tối ưu nguyên.");
  }

  const assignments: SolverAssignment[] = [];
  for (const [xVar, meta] of Object.entries(xMeta)) {
    const value = solution[xVar];
    if (typeof value === "number" && value > 0.5) {
      assignments.push({
        userId: meta.empId,
        storeId: meta.storeId,
        shiftId: meta.shiftId,
        day: meta.day,
        startHour: meta.startHour,
        endHour: meta.endHour,
      });
    }
  }

  return assignments;
}

/**
 * Phương án dự phòng (mục 5): ưu tiên (cửa hàng, ca, ngày) có ÍT người rảnh
 * nhất trước (dễ hết người nếu để sau), chọn người đầu tiên còn rảnh.
 */
export function solveGreedy(
  employees: SolverEmployee[],
  stores: SolverStore[],
  shifts: SolverShift[],
  weekDays: string[],
  availability: SolverAvailability,
): SolverAssignment[] {
  const assignments: SolverAssignment[] = [];
  const busy: Record<string, { day: string; start: number; end: number }[]> = {};
  for (const emp of employees) busy[emp.id] = [];

  function isBusy(empId: string, day: string, shift: SolverShift) {
    return busy[empId].some(
      (b) => b.day === day && b.start < shift.endHour && shift.startHour < b.end,
    );
  }

  type Candidate = { storeId: number; shift: SolverShift; day: string; empIds: string[] };
  const candidates: Candidate[] = [];

  for (const store of stores) {
    const storeShifts = shifts.filter((s) => store.allowedShiftIds.includes(s.id));
    for (const shift of storeShifts) {
      for (const day of weekDays) {
        const empIds = employees
          .filter((emp) => isWithinAvailability(availability[emp.id]?.[day] ?? [], shift))
          .map((e) => e.id);
        candidates.push({ storeId: store.id, shift, day, empIds });
      }
    }
  }

  candidates.sort((a, b) => a.empIds.length - b.empIds.length);

  for (const c of candidates) {
    const free = c.empIds.find((empId) => !isBusy(empId, c.day, c.shift));
    if (!free) continue;
    busy[free].push({ day: c.day, start: c.shift.startHour, end: c.shift.endHour });
    assignments.push({
      userId: free,
      storeId: c.storeId,
      shiftId: c.shift.id,
      day: c.day,
      startHour: c.shift.startHour,
      endHour: c.shift.endHour,
    });
  }

  return assignments;
}

export function runSolver(
  employees: SolverEmployee[],
  stores: SolverStore[],
  shifts: SolverShift[],
  weekDays: string[],
  availability: SolverAvailability,
): { assignments: SolverAssignment[]; method: "ilp" | "greedy" } {
  try {
    const assignments = solveWithILP(employees, stores, shifts, weekDays, availability);
    return { assignments, method: "ilp" };
  } catch {
    const assignments = solveGreedy(employees, stores, shifts, weekDays, availability);
    return { assignments, method: "greedy" };
  }
}

export function countCoveredWindows(
  assignments: SolverAssignment[],
  stores: SolverStore[],
  weekDays: string[],
): { covered: number; total: number } {
  const total = stores.length * weekDays.length * SOLVER_HOURS.length;
  let covered = 0;
  for (const store of stores) {
    for (const day of weekDays) {
      for (const hour of SOLVER_HOURS) {
        const hasCoverage = assignments.some(
          (a) =>
            a.storeId === store.id &&
            a.day === day &&
            a.startHour <= hour &&
            a.endHour > hour,
        );
        if (hasCoverage) covered++;
      }
    }
  }
  return { covered, total };
}

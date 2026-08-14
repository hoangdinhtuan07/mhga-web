import { mergeSelectedSlots, type DaySelection } from "@/lib/schedule/registration";

export type ShiftDef = {
  id: number;
  startHour: number;
  endHour: number;
};

export type ScheduleAssignment = {
  id: string;
  userId: string;
  displayName: string;
  storeId: number;
  workDate: string;
  startHour: number;
  endHour: number;
  source: "auto" | "manual";
};

export function isOverlapping(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start < b.end && b.start < a.end;
}

// Ca không khớp bất kỳ dòng ca nào ĐANG HIỂN THỊ của chính cửa hàng đó
// (không phải "khác 5 ca chuẩn") -> rơi vào dòng "Khác" (mục 4.3, cảnh báo bẫy).
export function isOtherRowAssignment(
  assignment: { startHour: number; endHour: number },
  storeShifts: ShiftDef[],
): boolean {
  return !storeShifts.some(
    (s) => s.startHour === assignment.startHour && s.endHour === assignment.endHour,
  );
}

export function isUserBusy(
  userId: string,
  day: string,
  shift: { startHour: number; endHour: number },
  assignments: ScheduleAssignment[],
): boolean {
  return assignments.some(
    (a) =>
      a.userId === userId &&
      a.workDate === day &&
      isOverlapping(
        { start: a.startHour, end: a.endHour },
        { start: shift.startHour, end: shift.endHour },
      ),
  );
}

export function isAvailableForShift(
  selection: DaySelection,
  shift: { startHour: number; endHour: number },
): boolean {
  return mergeSelectedSlots(selection).some(
    (r) => r.start <= shift.startHour && r.end >= shift.endHour,
  );
}

export type EmployeeLike = {
  id: string;
  displayName: string;
  selections: Record<string, DaySelection>;
};

export type GapSuggestions<T extends EmployeeLike = EmployeeLike> = {
  fullyAvailable: T[];
  partial: { emp: T; coverStart: number; coverEnd: number }[];
};

/**
 * Gợi ý cho ô đỏ ở bảng xem lại (mục 4.3, Bước 3): "Rảnh trọn khung" — khoảng
 * rảnh bao trọn lát cắt và chưa bận; "Vá được một phần" — chỉ phủ được một
 * khúc (giao giữa khoảng rảnh và lát cắt), phần còn lại vẫn đỏ.
 */
export function getGapSuggestions<T extends EmployeeLike>(
  day: string,
  slice: { start: number; end: number },
  employees: T[],
  allAssignments: ScheduleAssignment[],
): GapSuggestions<T> {
  const fullyAvailable: T[] = [];
  const partial: { emp: T; coverStart: number; coverEnd: number }[] = [];

  for (const emp of employees) {
    if (
      isUserBusy(
        emp.id,
        day,
        { startHour: slice.start, endHour: slice.end },
        allAssignments,
      )
    )
      continue;

    const ranges = mergeSelectedSlots(
      emp.selections[day] ?? [false, false, false, false],
    );

    const fullyCovers = ranges.some(
      (r) => r.start <= slice.start && r.end >= slice.end,
    );
    if (fullyCovers) {
      fullyAvailable.push(emp);
      continue;
    }

    const overlapping = ranges.find(
      (r) => r.start < slice.end && slice.start < r.end,
    );
    if (overlapping) {
      partial.push({
        emp,
        coverStart: Math.max(overlapping.start, slice.start),
        coverEnd: Math.min(overlapping.end, slice.end),
      });
    }
  }

  return { fullyAvailable, partial };
}

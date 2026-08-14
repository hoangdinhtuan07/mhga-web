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

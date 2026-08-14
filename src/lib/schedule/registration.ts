// 4 khoảng giờ dùng để đăng ký (mục 4.1) — ranh giới của cả 5 ca cố định.
export const SLOTS = [
  { start: 9, end: 13, label: "9-13h" },
  { start: 13, end: 15, label: "13-15h" },
  { start: 15, end: 18, label: "15-18h" },
  { start: 18, end: 22, label: "18-22h" },
] as const;

export type DaySelection = [boolean, boolean, boolean, boolean];

export const EMPTY_DAY_SELECTION: DaySelection = [false, false, false, false];

/**
 * Quy tắc hợp lệ (mục 4.2, 2 dòng):
 * - Ô 13-15h phải đi kèm 9-13h hoặc 15-18h.
 * - Ô 15-18h phải đi kèm 13-15h hoặc 18-22h.
 */
export function isValidDaySelection(selection: DaySelection): boolean {
  const [s9_13, s13_15, s15_18, s18_22] = selection;
  if (s13_15 && !(s9_13 || s15_18)) return false;
  if (s15_18 && !(s13_15 || s18_22)) return false;
  return true;
}

export function mergeSelectedSlots(
  selection: DaySelection,
): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let current: { start: number; end: number } | null = null;

  SLOTS.forEach((slot, i) => {
    if (!selection[i]) {
      current = null;
      return;
    }
    if (current && current.end === slot.start) {
      current.end = slot.end;
    } else {
      current = { start: slot.start, end: slot.end };
      ranges.push(current);
    }
  });

  return ranges;
}

export function formatRanges(ranges: { start: number; end: number }[]): string {
  if (ranges.length === 0) return "";
  return ranges.map((r) => `${r.start}-${r.end}h`).join(" · ");
}

export function totalHours(selection: DaySelection): number {
  return mergeSelectedSlots(selection).reduce(
    (sum, r) => sum + (r.end - r.start),
    0,
  );
}

// Suy ngược từ các khoảng đã lưu trong DB về trạng thái 4 ô — dùng để điền
// sẵn lưới khi tải trang.
export function slotsFromRanges(
  ranges: { start_hour: number; end_hour: number }[],
): DaySelection {
  return SLOTS.map((slot) =>
    ranges.some((r) => r.start_hour <= slot.start && r.end_hour >= slot.end),
  ) as DaySelection;
}

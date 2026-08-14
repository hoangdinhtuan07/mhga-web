// Độ phủ tính theo trục thời gian liên tục 9h-22h (mục 4.3, 5), không theo
// từng dòng ca riêng lẻ — để phát hiện đúng khoảng trống thực.
export function isFullyCovered(
  intervals: { start: number; end: number }[],
  rangeStart = 9,
  rangeEnd = 22,
): boolean {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  let cursor = rangeStart;
  for (const interval of sorted) {
    if (interval.start > cursor) return false;
    if (interval.end > cursor) cursor = interval.end;
  }
  return cursor >= rangeEnd;
}

// "Chỉ số duy nhất ở đầu" Bước 3: số cửa hàng-ngày còn khoảng trống giờ.
export function countStoreDayGaps(
  storeIds: number[],
  weekDays: string[],
  scheduleRows: { storeId: number; workDate: string; startHour: number; endHour: number }[],
): number {
  let count = 0;
  for (const storeId of storeIds) {
    for (const day of weekDays) {
      const intervals = scheduleRows
        .filter((r) => r.storeId === storeId && r.workDate === day)
        .map((r) => ({ start: r.startHour, end: r.endHour }));
      if (!isFullyCovered(intervals)) count++;
    }
  }
  return count;
}

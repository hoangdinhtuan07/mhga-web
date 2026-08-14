import type { ScheduleAssignment } from "@/lib/schedule/assignment";

export type GridPerson = {
  id: string;
  displayName: string;
  source: "auto" | "manual";
};

export type GridSegment = {
  startIndex: number;
  sliceCount: number;
  people: GridPerson[];
};

export type StoreGridResult = {
  slices: { start: number; end: number }[];
  segmentsByDay: Record<string, GridSegment[]>;
};

function samePeopleSet(a: GridPerson[], b: GridPerson[]): boolean {
  if (a.length !== b.length) return false;
  const idsA = a.map((p) => p.id).sort();
  const idsB = b.map((p) => p.id).sort();
  return idsA.every((id, i) => id === idsB[i]);
}

/**
 * Thuật toán "bảng lịch chung" dùng chung cho bảng xem lại (Bước 3) và bảng
 * lịch nháp (Bước 4, mục 4.3): sinh lát cắt giờ từ mọi mốc thời gian xuất
 * hiện trong tuần của cửa hàng (cộng 9h/22h), xác định tập người phủ mỗi
 * lát cắt, rồi gộp dọc các lát cắt liền nhau có cùng tập người.
 */
export function buildStoreGrid(
  weekDays: string[],
  storeAssignments: ScheduleAssignment[],
  rangeStart = 9,
  rangeEnd = 22,
): StoreGridResult {
  const boundarySet = new Set<number>([rangeStart, rangeEnd]);
  for (const a of storeAssignments) {
    boundarySet.add(a.startHour);
    boundarySet.add(a.endHour);
  }
  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);
  const slices = boundaries
    .slice(0, -1)
    .map((start, i) => ({ start, end: boundaries[i + 1] }));

  const segmentsByDay: StoreGridResult["segmentsByDay"] = {};

  for (const day of weekDays) {
    const dayAssignments = storeAssignments.filter((a) => a.workDate === day);
    const peoplePerSlice: GridPerson[][] = slices.map((slice) =>
      dayAssignments
        .filter((a) => a.startHour <= slice.start && a.endHour >= slice.end)
        .map((a) => ({ id: a.userId, displayName: a.displayName, source: a.source })),
    );

    const segments: GridSegment[] = [];
    let i = 0;
    while (i < slices.length) {
      const people = peoplePerSlice[i];
      let j = i + 1;
      while (j < slices.length && samePeopleSet(peoplePerSlice[j], people)) {
        j++;
      }
      segments.push({ startIndex: i, sliceCount: j - i, people });
      i = j;
    }
    segmentsByDay[day] = segments;
  }

  return { slices, segmentsByDay };
}

// Số giờ còn trống của MỘT cửa hàng, theo từng ngày — dùng cho nhãn "đủ
// người"/"thiếu Xh" và dãy chọn ngày trên điện thoại (mục 9).
export function storeDayGapHours(
  weekDays: string[],
  storeAssignments: ScheduleAssignment[],
): Record<string, number> {
  const { slices, segmentsByDay } = buildStoreGrid(weekDays, storeAssignments);
  const result: Record<string, number> = {};
  for (const day of weekDays) {
    let gap = 0;
    for (const segment of segmentsByDay[day]) {
      if (segment.people.length === 0) {
        const start = slices[segment.startIndex].start;
        const end = slices[segment.startIndex + segment.sliceCount - 1].end;
        gap += end - start;
      }
    }
    result[day] = gap;
  }
  return result;
}

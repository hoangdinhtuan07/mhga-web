import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { buildStoreGrid } from "@/lib/schedule/grid";
import type { ScheduleAssignment } from "@/lib/schedule/assignment";
import {
  CELL_BASE,
  CELL_EMPTY,
  CELL_FILLED,
  CELL_MINE,
  HOUR_CELL,
  STORE_CELL,
  STORE_ROW,
  STORE_START_ROW,
  TABLE_HEADER_CELL,
  TABLE_HEADER_DAY,
  TABLE_HEADER_ROW,
} from "@/lib/schedule/table-styles";

const WEEKDAY_LABELS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];

function formatDayShort(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

/**
 * "Bảng lịch chung" (mục 4.2, khớp giao-dien-tham-chieu-mhgaweb.html mục 2)
 * — dùng lại buildStoreGrid (thuật toán lát cắt) như draft-schedule-grid.tsx
 * (edit) và schedule-review.tsx (pick), chỉ khác ở chỗ không có tương tác.
 * Ô đỏ để trống, không ghi chữ.
 */
export function ReadonlyScheduleTable({
  weekDays,
  stores,
  assignments,
  highlightUserId,
}: {
  weekDays: string[];
  stores: { id: number; name: string }[];
  assignments: ScheduleAssignment[];
  highlightUserId: string;
}) {
  return (
    <div className="space-y-4">
      <h2 className="font-medium">Lịch làm việc cả hệ thống</h2>

      {/* Bố cục máy tính */}
      <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] md:block">
        <table className="w-full table-fixed border-collapse text-[11px]">
          <colgroup>
            <col style={{ width: "88px" }} />
            <col style={{ width: "58px" }} />
            {weekDays.map((day) => (
              <col key={day} />
            ))}
          </colgroup>
          <thead>
            <tr className={TABLE_HEADER_ROW}>
              <th className={cn("p-2 text-left", TABLE_HEADER_CELL)}>Cửa hàng</th>
              <th className={cn("p-2 text-center", TABLE_HEADER_CELL)}>Giờ</th>
              {weekDays.map((day, i) => (
                <th
                  key={day}
                  className={cn("p-2 text-center", TABLE_HEADER_CELL, TABLE_HEADER_DAY)}
                >
                  {WEEKDAY_LABELS[i].replace("Thứ ", "T").replace("Chủ nhật", "CN")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => {
              const storeAssignments = assignments.filter((a) => a.storeId === store.id);
              const { slices, segmentsByDay } = buildStoreGrid(weekDays, storeAssignments);

              return (
                <Fragment key={store.id}>
                  {slices.map((slice, sliceIndex) => (
                    <tr
                      key={`${slice.start}-${slice.end}`}
                      className={sliceIndex === 0 ? STORE_START_ROW : STORE_ROW}
                    >
                      {sliceIndex === 0 && (
                        <td rowSpan={slices.length} className={cn("p-2 align-middle", STORE_CELL)}>
                          {store.name}
                        </td>
                      )}
                      <td className={cn("p-2 whitespace-nowrap", HOUR_CELL)}>
                        {slice.start}-{slice.end}h
                      </td>
                      {weekDays.map((day) => {
                        const segment = segmentsByDay[day].find(
                          (seg) => seg.startIndex === sliceIndex,
                        );
                        if (!segment) return null;
                        const hasMe = segment.people.some((p) => p.id === highlightUserId);
                        const isEmpty = segment.people.length === 0;
                        return (
                          <td
                            key={day}
                            rowSpan={segment.sliceCount}
                            className={cn(
                              "p-2 text-center align-middle",
                              CELL_BASE,
                              isEmpty && CELL_EMPTY,
                              !isEmpty && !hasMe && CELL_FILLED,
                              hasMe && CELL_MINE,
                            )}
                          >
                            {segment.people.map((p) => p.displayName).join(", ")}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bố cục điện thoại: 7 thẻ ngày gập lại (mục 9) */}
      <div className="space-y-2 md:hidden">
        {weekDays.map((day, dayIndex) => {
          const hasShiftToday = assignments.some(
            (a) => a.userId === highlightUserId && a.workDate === day,
          );
          return (
            <details
              key={day}
              className="group rounded-[var(--radius)] border border-[var(--border)] p-4"
            >
              <summary className="flex cursor-pointer items-center justify-between font-medium marker:content-none">
                <span>
                  {WEEKDAY_LABELS[dayIndex]} · {formatDayShort(day)}
                  <span className="ml-1 font-normal text-[var(--text-muted)]">
                    · {hasShiftToday ? "bạn có ca" : "bạn nghỉ"}
                  </span>
                </span>
                <span className="text-[var(--text-muted)] group-open:rotate-180">▾</span>
              </summary>
              <div className="mt-3 space-y-2">
                {stores.map((store) => {
                  const storeAssignments = assignments.filter((a) => a.storeId === store.id);
                  const { slices, segmentsByDay } = buildStoreGrid(weekDays, storeAssignments);
                  const daySegments = segmentsByDay[day].filter(
                    (seg) => seg.people.length > 0,
                  );
                  if (daySegments.length === 0) return null;
                  return (
                    <div key={store.id} className="space-y-1">
                      <p className="text-sm font-medium">{store.name}</p>
                      {daySegments.map((seg) => {
                        const start = slices[seg.startIndex].start;
                        const end = slices[seg.startIndex + seg.sliceCount - 1].end;
                        const hasMe = seg.people.some((p) => p.id === highlightUserId);
                        return (
                          <p
                            key={`${start}-${end}`}
                            className={cn(
                              "rounded-md px-2 py-1 text-sm",
                              hasMe ? CELL_MINE : CELL_FILLED,
                            )}
                          >
                            {start}-{end}h: {seg.people.map((p) => p.displayName).join(", ")}
                          </p>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

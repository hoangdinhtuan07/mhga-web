import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { buildStoreGrid } from "@/lib/schedule/grid";
import type { ScheduleAssignment } from "@/lib/schedule/assignment";

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
 * "Bảng lịch chung" ở chế độ readonly (mục 4.2: "dùng chung component với
 * Bước 4 của admin, chế độ chỉ đọc, không có nút công bố") — dùng lại
 * buildStoreGrid (thuật toán lát cắt) như draft-schedule-grid.tsx (edit) và
 * schedule-review.tsx (pick), chỉ khác ở chỗ không có tương tác.
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
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-r bg-muted/40 p-2 text-left font-medium">
                Cửa hàng
              </th>
              <th className="border-b border-r bg-muted/20 p-2 text-left font-medium">
                Mốc giờ
              </th>
              {weekDays.map((day, i) => (
                <th key={day} className="border-b border-l p-2 text-center font-medium">
                  <div>{WEEKDAY_LABELS[i]}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {formatDayShort(day)}
                  </div>
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
                      className={sliceIndex === 0 ? "border-t-4 border-t-foreground/20" : ""}
                    >
                      {sliceIndex === 0 && (
                        <td
                          rowSpan={slices.length}
                          className="border-r bg-muted/40 p-2 align-top font-medium"
                        >
                          {store.name}
                        </td>
                      )}
                      <td className="border-r bg-muted/20 p-2 text-xs whitespace-nowrap">
                        {slice.start}-{slice.end}h
                      </td>
                      {weekDays.map((day) => {
                        const segment = segmentsByDay[day].find(
                          (seg) => seg.startIndex === sliceIndex,
                        );
                        if (!segment) return null;
                        const hasMe = segment.people.some((p) => p.id === highlightUserId);
                        return (
                          <td
                            key={day}
                            rowSpan={segment.sliceCount}
                            className={cn(
                              "border-l p-1.5 align-top text-xs",
                              segment.people.length === 0 && "bg-destructive/5",
                              hasMe && "bg-primary/20 font-bold",
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
            <details key={day} className="group rounded-lg border p-3">
              <summary className="flex cursor-pointer items-center justify-between font-medium marker:content-none">
                <span>
                  {WEEKDAY_LABELS[dayIndex]} · {formatDayShort(day)}
                  <span className="ml-1 font-normal text-muted-foreground">
                    · {hasShiftToday ? "bạn có ca" : "bạn nghỉ"}
                  </span>
                </span>
                <span className="text-muted-foreground group-open:rotate-180">▾</span>
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
                              "pl-2 text-sm",
                              hasMe && "font-bold text-primary",
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

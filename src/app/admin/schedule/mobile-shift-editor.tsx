"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildStoreGrid, storeDayGapHours } from "@/lib/schedule/grid";
import {
  getGapSuggestions,
  isAvailableForShift,
  isUserBusy,
  type ScheduleAssignment,
  type ShiftDef,
} from "@/lib/schedule/assignment";
import type { DaySelection } from "@/lib/schedule/registration";
import type { EmployeeRegistration } from "./registration-overview-table";
import type { StoreDef } from "./assignment-table";
import { assignShift, patchGap, unassignShift } from "./actions";

const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatDayShort(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

type ActiveGap = { storeId: number; sliceIndex: number; start: number; end: number };
type ActiveAdd = { storeId: number; shiftId: number };

// Mục 9, Bước 3 điện thoại: gộp bảng gán người + bảng xem lại làm một —
// mỗi khối giờ vừa là chỗ xem vừa là chỗ sửa, khác bản máy tính (2 bảng
// tách biệt trong AssignmentTable + ScheduleReview).
export function MobileShiftEditor({
  weekStart,
  weekDays,
  stores,
  shifts,
  assignments,
  employees,
}: {
  weekStart: string;
  weekDays: string[];
  stores: StoreDef[];
  shifts: ShiftDef[];
  assignments: ScheduleAssignment[];
  employees: EmployeeRegistration[];
}) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(weekDays[0]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [activeGap, setActiveGap] = useState<ActiveGap | null>(null);
  const [activeAdd, setActiveAdd] = useState<ActiveAdd | null>(null);

  const gapHoursByStoreDay = Object.fromEntries(
    stores.map((store) => [
      store.id,
      storeDayGapHours(
        weekDays,
        assignments.filter((a) => a.storeId === store.id),
      ),
    ]),
  ) as Record<number, Record<string, number>>;

  const dayTotalGap = Object.fromEntries(
    weekDays.map((day) => [
      day,
      stores.reduce((sum, store) => sum + (gapHoursByStoreDay[store.id]?.[day] ?? 0), 0),
    ]),
  );

  function refresh() {
    setActiveGap(null);
    setActiveAdd(null);
    router.refresh();
  }

  function handlePatchGap(storeId: number, userId: string, start: number, end: number) {
    setError(null);
    startTransition(async () => {
      const result = await patchGap({ weekStart, storeId, day: selectedDay, userId, startHour: start, endHour: end });
      if (!result.success) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleAssign(storeId: number, shiftId: number, userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await assignShift({ weekStart, storeId, shiftId, day: selectedDay, userId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  function handleRemove(scheduleId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unassignShift(scheduleId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weekDays.map((day, i) => {
          const gap = dayTotalGap[day] ?? 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => {
                setSelectedDay(day);
                setActiveGap(null);
                setActiveAdd(null);
              }}
              className={cn(
                "flex h-12 shrink-0 flex-col items-center justify-center rounded-md border px-3 text-xs font-medium",
                selectedDay === day
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input",
              )}
            >
              <span>
                {WEEKDAY_SHORT[i]} · {formatDayShort(day)}
              </span>
              <span
                className={cn(
                  "font-normal",
                  gap > 0 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                {gap > 0 ? `hở ${gap}h` : "đủ"}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="space-y-3">
        {stores.map((store) => {
          const storeShifts = shifts.filter((s) => store.allowedShiftIds.includes(s.id));
          const storeAssignments = assignments.filter((a) => a.storeId === store.id);
          const { slices, segmentsByDay } = buildStoreGrid(weekDays, storeAssignments);
          const segments = segmentsByDay[selectedDay];
          const gap = gapHoursByStoreDay[store.id]?.[selectedDay] ?? 0;

          return (
            <div key={store.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{store.name}</p>
                <span
                  className={cn(
                    "text-xs font-medium",
                    gap > 0 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {gap > 0 ? `thiếu ${gap}h` : "đủ người"}
                </span>
              </div>

              <div className="space-y-1.5">
                {segments.map((segment) => {
                  const slice = slices[segment.startIndex];
                  const end = slices[segment.startIndex + segment.sliceCount - 1].end;
                  const isRed = segment.people.length === 0;
                  const isActive =
                    activeGap?.storeId === store.id &&
                    activeGap.sliceIndex === segment.startIndex;

                  if (isRed) {
                    const gapSuggestions = isActive
                      ? getGapSuggestions(
                          selectedDay,
                          { start: slice.start, end },
                          employees,
                          assignments,
                        )
                      : null;
                    return (
                      <div key={segment.startIndex} className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveGap(
                              isActive
                                ? null
                                : { storeId: store.id, sliceIndex: segment.startIndex, start: slice.start, end },
                            )
                          }
                          className="flex h-11 w-full items-center justify-between rounded-md border border-destructive/40 bg-destructive/10 px-3 text-sm text-destructive"
                        >
                          <span>
                            {slice.start}-{end}h
                          </span>
                          <span>Trống</span>
                        </button>
                        {isActive && gapSuggestions && (
                          <div className="space-y-2 rounded-md border p-3">
                            {gapSuggestions.fullyAvailable.length === 0 &&
                              gapSuggestions.partial.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  Không còn ai rảnh khung giờ này.
                                </p>
                              )}
                            {gapSuggestions.fullyAvailable.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Rảnh trọn khung
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {gapSuggestions.fullyAvailable.map((emp) => (
                                    <button
                                      key={emp.id}
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => handlePatchGap(store.id, emp.id, slice.start, end)}
                                      className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
                                    >
                                      {emp.displayName}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {gapSuggestions.partial.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                  Chỉ vá được một phần
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {gapSuggestions.partial.map(({ emp, coverStart, coverEnd }) => (
                                    <button
                                      key={emp.id}
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => handlePatchGap(store.id, emp.id, coverStart, coverEnd)}
                                      className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
                                    >
                                      {emp.displayName} ({coverStart}-{coverEnd}h)
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={segment.startIndex}
                      className="flex h-11 w-full items-center justify-between rounded-md border bg-primary/10 px-3 text-sm"
                    >
                      <span>
                        {slice.start}-{end}h
                      </span>
                      <span className="flex flex-wrap justify-end gap-x-1">
                        {segment.people.map((person, idx) => {
                          const assignmentId = assignments.find(
                            (a) =>
                              a.userId === person.id &&
                              a.workDate === selectedDay &&
                              a.startHour === slice.start &&
                              a.endHour === end,
                          )?.id;
                          return (
                            <span key={person.id}>
                              {person.displayName}
                              {person.source === "manual" ? " ★" : ""}
                              {person.source === "manual" && assignmentId && (
                                <button
                                  type="button"
                                  disabled={isPending}
                                  onClick={() => handleRemove(assignmentId)}
                                  className="ml-1 text-muted-foreground hover:text-destructive disabled:opacity-50"
                                  aria-label={`Bỏ ${person.displayName}`}
                                >
                                  ×
                                </button>
                              )}
                              {idx < segment.people.length - 1 ? "," : ""}
                            </span>
                          );
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() =>
                  setActiveAdd(
                    activeAdd?.storeId === store.id ? null : { storeId: store.id, shiftId: storeShifts[0]?.id ?? 0 },
                  )
                }
                className="flex h-11 w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
              >
                + Thêm người vào ca
              </button>

              {activeAdd?.storeId === store.id && (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="flex flex-wrap gap-1">
                    {storeShifts.map((shift) => (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => setActiveAdd({ storeId: store.id, shiftId: shift.id })}
                        className={cn(
                          "h-9 rounded-md border px-2 text-xs",
                          activeAdd.shiftId === shift.id && "border-primary bg-primary/10 text-primary",
                        )}
                      >
                        {shift.startHour}-{shift.endHour}h
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const shift = storeShifts.find((s) => s.id === activeAdd.shiftId);
                    if (!shift) return null;
                    const currentUserIds = assignments
                      .filter(
                        (a) =>
                          a.storeId === store.id &&
                          a.workDate === selectedDay &&
                          a.startHour === shift.startHour &&
                          a.endHour === shift.endHour,
                      )
                      .map((a) => a.userId);
                    const candidates = employees.filter((emp) => {
                      if (currentUserIds.includes(emp.id)) return false;
                      if (isUserBusy(emp.id, selectedDay, shift, assignments)) return false;
                      return true;
                    });
                    const available = candidates.filter((emp) =>
                      isAvailableForShift(
                        emp.selections[selectedDay] ?? ([false, false, false, false] as DaySelection),
                        shift,
                      ),
                    );
                    const others = candidates.filter((emp) => !available.includes(emp));
                    return (
                      <div className="flex flex-wrap gap-2">
                        {[...available, ...others].map((emp) => (
                          <button
                            key={emp.id}
                            type="button"
                            disabled={isPending}
                            onClick={() => handleAssign(store.id, shift.id, emp.id)}
                            className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
                          >
                            {emp.displayName}
                          </button>
                        ))}
                        {candidates.length === 0 && (
                          <p className="text-sm text-muted-foreground">Không còn ai rảnh.</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

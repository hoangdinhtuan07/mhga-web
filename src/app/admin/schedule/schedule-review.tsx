"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { buildStoreGrid, type GridPerson } from "@/lib/schedule/grid";
import {
  getGapSuggestions,
  type ScheduleAssignment,
} from "@/lib/schedule/assignment";
import type { EmployeeRegistration } from "./registration-overview-table";
import type { StoreDef } from "./assignment-table";
import { patchGap, unassignShift } from "./actions";
import {
  HOUR_CELL,
  STORE_CELL,
  STORE_ROW,
  STORE_START_ROW,
  TABLE_HEADER_CELL,
  TABLE_HEADER_DAY,
  TABLE_HEADER_ROW,
} from "@/lib/schedule/table-styles";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type SelectedGap = {
  storeId: number;
  storeName: string;
  day: string;
  start: number;
  end: number;
};

function GapCellLabel({
  day,
  slice,
  employees,
  assignments,
}: {
  day: string;
  slice: { start: number; end: number };
  employees: EmployeeRegistration[];
  assignments: ScheduleAssignment[];
}) {
  const { fullyAvailable, partial } = getGapSuggestions(
    day,
    slice,
    employees,
    assignments,
  );
  if (fullyAvailable.length > 0) {
    return <span>{fullyAvailable.length} rảnh</span>;
  }
  if (partial.length > 0) {
    return <span>{partial.length} vá</span>;
  }
  return <span>trống</span>;
}

function PersonWithRemove({
  person,
  disabled,
  onRemove,
}: {
  person: GridPerson;
  disabled: boolean;
  onRemove: () => void;
}) {
  if (person.source !== "manual") {
    return <span>{person.displayName}</span>;
  }
  return (
    <span>
      {person.displayName}{" "}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="text-[var(--text-muted)] hover:text-[var(--text-danger)] disabled:opacity-50"
        aria-label={`Bỏ ${person.displayName}`}
      >
        ×
      </button>
    </span>
  );
}

export function ScheduleReview({
  weekStart,
  weekDays,
  stores,
  assignments,
  employees,
}: {
  weekStart: string;
  weekDays: string[];
  stores: StoreDef[];
  assignments: ScheduleAssignment[];
  employees: EmployeeRegistration[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedGap, setSelectedGap] = useState<SelectedGap | null>(null);

  function findAssignmentId(userId: string, day: string, start: number, end: number) {
    return assignments.find(
      (a) =>
        a.userId === userId &&
        a.workDate === day &&
        a.startHour === start &&
        a.endHour === end,
    )?.id;
  }

  function handleRemove(scheduleId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unassignShift(scheduleId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handlePick(userId: string, coverStart: number, coverEnd: number) {
    if (!selectedGap) return;
    setError(null);
    startTransition(async () => {
      const result = await patchGap({
        weekStart,
        storeId: selectedGap.storeId,
        day: selectedGap.day,
        userId,
        startHour: coverStart,
        endHour: coverEnd,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSelectedGap(null);
      router.refresh();
    });
  }

  const gapSuggestions = selectedGap
    ? getGapSuggestions(
        selectedGap.day,
        { start: selectedGap.start, end: selectedGap.end },
        employees,
        assignments,
      )
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-medium">Bảng xem lại</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Bấm ô đỏ để vá tay, × để bỏ người đã vá
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius)] bg-[var(--bg-danger)] p-4 text-sm text-[var(--text-danger)]"
        >
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)]">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className={TABLE_HEADER_ROW}>
              <th className={cn("p-2 text-left", TABLE_HEADER_CELL)}>Cửa hàng</th>
              <th className={cn("p-2 text-left", TABLE_HEADER_CELL)}>Giờ</th>
              {weekDays.map((day, i) => (
                <th
                  key={day}
                  className={cn("p-2 text-center", TABLE_HEADER_CELL, TABLE_HEADER_DAY)}
                >
                  {WEEKDAY_LABELS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => {
              const storeAssignments = assignments.filter(
                (a) => a.storeId === store.id,
              );
              const { slices, segmentsByDay } = buildStoreGrid(
                weekDays,
                storeAssignments,
              );

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
                        if (!segment) return null; // bị rowSpan của segment trước phủ

                        const isRed = segment.people.length === 0;
                        const isSelected =
                          selectedGap?.storeId === store.id &&
                          selectedGap.day === day &&
                          selectedGap.start === slice.start &&
                          selectedGap.end === slice.end;

                        return (
                          <td
                            key={day}
                            rowSpan={segment.sliceCount}
                            className={cn(
                              "border-l-[1.5px] border-l-[var(--border)] p-2 text-center",
                              isRed && "bg-[var(--bg-danger)]",
                              !isRed && "bg-[var(--bg-success)]",
                              isSelected && "ring-2 ring-inset ring-[var(--text-accent)]",
                            )}
                          >
                            {isRed ? (
                              <button
                                type="button"
                                className="w-full rounded px-1 py-1 text-center text-[var(--text-danger)] hover:underline"
                                onClick={() =>
                                  setSelectedGap({
                                    storeId: store.id,
                                    storeName: store.name,
                                    day,
                                    start: slice.start,
                                    end: slice.end,
                                  })
                                }
                              >
                                <GapCellLabel
                                  day={day}
                                  slice={slice}
                                  employees={employees}
                                  assignments={assignments}
                                />
                              </button>
                            ) : (
                              <div className="flex flex-wrap justify-center gap-x-1 text-[var(--text-success)]">
                                {segment.people.map((person, idx) => {
                                  const id = findAssignmentId(
                                    person.id,
                                    day,
                                    slice.start,
                                    slice.end,
                                  );
                                  return (
                                    <span key={person.id} className="whitespace-nowrap">
                                      <PersonWithRemove
                                        person={person}
                                        disabled={isPending}
                                        onRemove={() => id && handleRemove(id)}
                                      />
                                      {idx < segment.people.length - 1 ? "," : ""}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
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

      {selectedGap && gapSuggestions && (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--border)] p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {selectedGap.storeName} · {selectedGap.start}-{selectedGap.end}h
            </p>
            <button
              type="button"
              className="text-sm text-[var(--text-muted)] hover:underline"
              onClick={() => setSelectedGap(null)}
            >
              Đóng
            </button>
          </div>

          {gapSuggestions.fullyAvailable.length === 0 &&
            gapSuggestions.partial.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">
                Không còn ai rảnh khung giờ này.
              </p>
            )}

          {gapSuggestions.fullyAvailable.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Rảnh trọn khung
              </p>
              <div className="flex flex-wrap gap-2">
                {gapSuggestions.fullyAvailable.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      handlePick(emp.id, selectedGap.start, selectedGap.end)
                    }
                    className="h-9 rounded-full border px-3 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    {emp.displayName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {gapSuggestions.partial.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Vá được một phần
              </p>
              <div className="flex flex-wrap gap-2">
                {gapSuggestions.partial.map(({ emp, coverStart, coverEnd }) => (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handlePick(emp.id, coverStart, coverEnd)}
                    className="h-9 rounded-full border px-3 text-sm hover:bg-muted disabled:opacity-50"
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

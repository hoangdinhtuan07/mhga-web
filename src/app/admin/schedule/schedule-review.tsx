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
        className="text-muted-foreground hover:text-destructive disabled:opacity-50"
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
      <h2 className="font-medium">Bảng xem lại</h2>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
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
                <th
                  key={day}
                  className="border-b border-l p-2 text-center font-medium"
                >
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
                              "border-l p-1.5 align-top text-xs",
                              isRed && "bg-destructive/10",
                              isSelected && "ring-2 ring-inset ring-primary",
                            )}
                          >
                            {isRed ? (
                              <button
                                type="button"
                                className="w-full rounded px-1 py-1 text-center text-destructive hover:underline"
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
                              <div className="flex flex-wrap gap-x-1">
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
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {selectedGap.storeName} · {selectedGap.start}-{selectedGap.end}h
            </p>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:underline"
              onClick={() => setSelectedGap(null)}
            >
              Đóng
            </button>
          </div>

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
                    onClick={() =>
                      handlePick(emp.id, selectedGap.start, selectedGap.end)
                    }
                    className="h-9 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-50"
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
                Vá được một phần
              </p>
              <div className="flex flex-wrap gap-2">
                {gapSuggestions.partial.map(({ emp, coverStart, coverEnd }) => (
                  <button
                    key={emp.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handlePick(emp.id, coverStart, coverEnd)}
                    className="h-9 rounded-md border px-3 text-sm hover:bg-muted disabled:opacity-50"
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

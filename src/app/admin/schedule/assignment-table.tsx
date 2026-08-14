"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { countStoreDayGaps } from "@/lib/schedule/coverage";
import {
  isAvailableForShift,
  isOtherRowAssignment,
  isUserBusy,
  type ScheduleAssignment,
  type ShiftDef,
} from "@/lib/schedule/assignment";
import type { DaySelection } from "@/lib/schedule/registration";
import type { EmployeeRegistration } from "./registration-overview-table";
import { assignShift, unassignShift } from "./actions";

const WEEKDAY_LABELS = [
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
  "Chủ nhật",
];
const WEEKDAY_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function formatDayShort(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

export type StoreDef = {
  id: number;
  name: string;
  allowedShiftIds: number[];
};

function Chip({
  name,
  source,
  onRemove,
  disabled,
}: {
  name: string;
  source: "auto" | "manual";
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap",
        source === "manual"
          ? "border-primary/60 bg-primary/10"
          : "border-border bg-muted",
      )}
    >
      {name}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive disabled:opacity-50"
        aria-label={`Bỏ ${name}`}
      >
        ×
      </button>
    </span>
  );
}

function AddPersonMenu({
  eligible,
  onPick,
  disabled,
}: {
  eligible: { available: EmployeeRegistration[]; others: EmployeeRegistration[] };
  onPick: (userId: string) => void;
  disabled: boolean;
}) {
  const hasAny = eligible.available.length > 0 || eligible.others.length > 0;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
        aria-label="Thêm người"
      >
        +
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {!hasAny && (
          <DropdownMenuItem disabled>Không còn ai rảnh</DropdownMenuItem>
        )}
        {eligible.available.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Rảnh đúng khung này</DropdownMenuLabel>
            {eligible.available.map((emp) => (
              <DropdownMenuItem key={emp.id} onClick={() => onPick(emp.id)}>
                {emp.displayName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
        {eligible.available.length > 0 && eligible.others.length > 0 && (
          <DropdownMenuSeparator />
        )}
        {eligible.others.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel>Người khác</DropdownMenuLabel>
            {eligible.others.map((emp) => (
              <DropdownMenuItem key={emp.id} onClick={() => onPick(emp.id)}>
                {emp.displayName}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AssignmentTable({
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

  const gapCount = countStoreDayGaps(
    stores.map((s) => s.id),
    weekDays,
    assignments,
  );

  function cellAssignments(storeId: number, day: string, shift: ShiftDef) {
    return assignments.filter(
      (a) =>
        a.storeId === storeId &&
        a.workDate === day &&
        a.startHour === shift.startHour &&
        a.endHour === shift.endHour,
    );
  }

  function otherRowAssignments(storeId: number, day: string, storeShifts: ShiftDef[]) {
    return assignments.filter(
      (a) =>
        a.storeId === storeId &&
        a.workDate === day &&
        isOtherRowAssignment(a, storeShifts),
    );
  }

  function eligibleFor(day: string, shift: ShiftDef, currentUserIds: string[]) {
    const available: EmployeeRegistration[] = [];
    const others: EmployeeRegistration[] = [];
    for (const emp of employees) {
      if (currentUserIds.includes(emp.id)) continue;
      if (isUserBusy(emp.id, day, shift, assignments)) continue;
      const selection: DaySelection = emp.selections[day] ?? [false, false, false, false];
      if (isAvailableForShift(selection, shift)) {
        available.push(emp);
      } else {
        others.push(emp);
      }
    }
    return { available, others };
  }

  function handleAssign(storeId: number, shiftId: number, day: string, userId: string) {
    setError(null);
    startTransition(async () => {
      const result = await assignShift({ weekStart, storeId, shiftId, day, userId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUnassign(scheduleId: string) {
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

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {gapCount > 0
          ? `Còn ${gapCount} cửa hàng-ngày còn khoảng trống giờ.`
          : "Đã phủ kín toàn bộ khung giờ mở cửa."}
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {/* Bố cục máy tính */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-r bg-muted/40 p-2 text-left font-medium">
                Cửa hàng
              </th>
              <th className="border-b border-r bg-muted/20 p-2 text-left font-medium">
                Ca
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
              const storeShifts = shifts.filter((s) =>
                store.allowedShiftIds.includes(s.id),
              );
              const rowCount = storeShifts.length + 1;
              return (
                <Fragment key={store.id}>
                  {storeShifts.map((shift, idx) => (
                    <tr
                      key={shift.id}
                      className={idx === 0 ? "border-t-4 border-t-foreground/20" : ""}
                    >
                      {idx === 0 && (
                        <td
                          rowSpan={rowCount}
                          className="border-r bg-muted/40 p-2 align-top font-medium"
                        >
                          {store.name}
                        </td>
                      )}
                      <td className="border-r bg-muted/20 p-2 text-xs whitespace-nowrap">
                        {shift.startHour}-{shift.endHour}h
                      </td>
                      {weekDays.map((day) => {
                        const cellItems = cellAssignments(store.id, day, shift);
                        const eligible = eligibleFor(
                          day,
                          shift,
                          cellItems.map((c) => c.userId),
                        );
                        return (
                          <td key={day} className="border-l p-1.5 align-top">
                            <div className="flex flex-wrap items-center gap-1">
                              {cellItems.map((item) => (
                                <Chip
                                  key={item.id}
                                  name={item.displayName}
                                  source={item.source}
                                  disabled={isPending}
                                  onRemove={() => handleUnassign(item.id)}
                                />
                              ))}
                              <AddPersonMenu
                                eligible={eligible}
                                disabled={isPending}
                                onPick={(userId) =>
                                  handleAssign(store.id, shift.id, day, userId)
                                }
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="border-r bg-muted/20 p-2 text-xs whitespace-nowrap text-muted-foreground">
                      Khác
                    </td>
                    {weekDays.map((day) => {
                      const items = otherRowAssignments(store.id, day, storeShifts);
                      return (
                        <td key={day} className="border-l p-1.5 align-top">
                          <div className="flex flex-wrap items-center gap-1">
                            {items.length === 0 && (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                            {items.map((item) => (
                              <Chip
                                key={item.id}
                                name={`${item.displayName} ${item.startHour}-${item.endHour}h`}
                                source={item.source}
                                disabled={isPending}
                                onRemove={() => handleUnassign(item.id)}
                              />
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bố cục điện thoại: chọn 1 ngày, xem/sửa theo từng cửa hàng.
          Sẽ gộp với bảng xem lại ở Bước 3 (7c) theo đúng mục 9. */}
      <div className="space-y-3 md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weekDays.map((day, i) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                "flex h-11 shrink-0 flex-col items-center justify-center rounded-md border px-3 text-xs font-medium",
                selectedDay === day
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input",
              )}
            >
              <span>{WEEKDAY_SHORT[i]}</span>
              <span className="font-normal text-muted-foreground">
                {formatDayShort(day)}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {stores.map((store) => {
            const storeShifts = shifts.filter((s) =>
              store.allowedShiftIds.includes(s.id),
            );
            const otherItems = otherRowAssignments(store.id, selectedDay, storeShifts);
            return (
              <div key={store.id} className="space-y-2 rounded-lg border p-3">
                <p className="font-medium">{store.name}</p>
                {storeShifts.map((shift) => {
                  const cellItems = cellAssignments(store.id, selectedDay, shift);
                  const eligible = eligibleFor(
                    selectedDay,
                    shift,
                    cellItems.map((c) => c.userId),
                  );
                  return (
                    <div key={shift.id} className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {shift.startHour}-{shift.endHour}h
                      </p>
                      <div className="flex flex-wrap items-center gap-1">
                        {cellItems.map((item) => (
                          <Chip
                            key={item.id}
                            name={item.displayName}
                            source={item.source}
                            disabled={isPending}
                            onRemove={() => handleUnassign(item.id)}
                          />
                        ))}
                        <AddPersonMenu
                          eligible={eligible}
                          disabled={isPending}
                          onPick={(userId) =>
                            handleAssign(store.id, shift.id, selectedDay, userId)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Khác</p>
                  <div className="flex flex-wrap items-center gap-1">
                    {otherItems.length === 0 && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                    {otherItems.map((item) => (
                      <Chip
                        key={item.id}
                        name={`${item.displayName} ${item.startHour}-${item.endHour}h`}
                        source={item.source}
                        disabled={isPending}
                        onRemove={() => handleUnassign(item.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

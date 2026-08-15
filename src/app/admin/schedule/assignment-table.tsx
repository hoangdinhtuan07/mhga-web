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
        "inline-flex items-center rounded-[10px] border bg-[var(--surface-2)] px-1.5 py-0.5 text-[10px] whitespace-nowrap text-[var(--text-primary)]",
        source === "manual" ? "border-[var(--border-accent)]" : "border-[var(--border)]",
      )}
    >
      {name}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        className="ml-[3px] text-[11px] text-[var(--text-muted)] disabled:opacity-50"
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
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
        aria-label="Thêm người"
      >
        ⌄
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

// Bảng "Cửa hàng × Ca × Ngày" — chỉ bố cục máy tính. Bố cục điện thoại của
// Bước 3 gộp chung với bảng xem lại trong MobileShiftEditor (mục 9).
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
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      <div>
        <h2 className="font-medium">Bảng gán người</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Dòng &quot;Khác&quot; chứa ca lẻ vá tay
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
              <th className={cn("p-2 text-left", TABLE_HEADER_CELL)}>Ca</th>
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
              const storeShifts = shifts.filter((s) =>
                store.allowedShiftIds.includes(s.id),
              );
              const rowCount = storeShifts.length + 1;
              return (
                <Fragment key={store.id}>
                  {storeShifts.map((shift, idx) => (
                    <tr key={shift.id} className={idx === 0 ? STORE_START_ROW : STORE_ROW}>
                      {idx === 0 && (
                        <td rowSpan={rowCount} className={cn("p-2 align-middle", STORE_CELL)}>
                          {store.name}
                        </td>
                      )}
                      <td className={cn("p-2 whitespace-nowrap", HOUR_CELL)}>
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
                          <td key={day} className="border-l-[1.5px] border-l-[var(--border)] p-0.5">
                            <div
                              className={cn(
                                "flex min-h-[18px] flex-wrap items-center gap-0.5 rounded p-0.5",
                                cellItems.length > 0 && "bg-[var(--bg-success)]",
                              )}
                            >
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
                  <tr className={STORE_ROW}>
                    <td className={cn("p-2 whitespace-nowrap", HOUR_CELL)}>Khác</td>
                    {weekDays.map((day) => {
                      const items = otherRowAssignments(store.id, day, storeShifts);
                      return (
                        <td key={day} className="border-l-[1.5px] border-l-[var(--border)] p-0.5">
                          <div
                            className={cn(
                              "flex min-h-[18px] flex-wrap items-center gap-0.5 rounded p-0.5",
                              items.length > 0 && "bg-[var(--bg-success)]",
                            )}
                          >
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
    </div>
  );
}

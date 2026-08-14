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
      <h2 className="font-medium">Bảng gán người</h2>

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
    </div>
  );
}

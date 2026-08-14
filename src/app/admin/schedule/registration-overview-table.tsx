"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatRanges,
  mergeSelectedSlots,
  type DaySelection,
} from "@/lib/schedule/registration";

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

export type EmployeeRegistration = {
  id: string;
  displayName: string;
  selections: Record<string, DaySelection>;
};

// Dùng chung cho Bước 1 và tab "Lịch đăng ký" ở Bước 3 (mục 4.3, 4.4).
export function RegistrationOverviewTable({
  weekDays,
  employees,
}: {
  weekDays: string[];
  employees: EmployeeRegistration[];
}) {
  const [selectedDay, setSelectedDay] = useState(weekDays[0]);

  const hasAnyRegistration = (emp: EmployeeRegistration) =>
    weekDays.some((day) => emp.selections[day]?.some(Boolean));

  const notRegisteredAllWeek = employees.filter((emp) => !hasAnyRegistration(emp));

  const dayEntries = employees
    .map((emp) => ({
      emp,
      ranges: mergeSelectedSlots(emp.selections[selectedDay] ?? [false, false, false, false]),
    }))
    .filter((entry) => entry.ranges.length > 0)
    .sort((a, b) => a.ranges[0].start - b.ranges[0].start);

  const offSelectedDay = employees.filter(
    (emp) =>
      mergeSelectedSlots(emp.selections[selectedDay] ?? [false, false, false, false])
        .length === 0,
  );

  return (
    <div className="space-y-4">
      {/* Bố cục máy tính: ma trận Nhân viên × Ngày */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b p-2 text-left font-medium">Nhân viên</th>
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
            {employees.map((emp) => {
              const registered = hasAnyRegistration(emp);
              return (
                <tr key={emp.id}>
                  <td
                    className={cn(
                      "border-b p-2 font-medium",
                      !registered && "text-muted-foreground opacity-50",
                    )}
                  >
                    {emp.displayName}
                  </td>
                  {weekDays.map((day) => {
                    const ranges = mergeSelectedSlots(emp.selections[day]);
                    const hasRanges = ranges.length > 0;
                    return (
                      <td
                        key={day}
                        className={cn(
                          "border-b border-l p-2 text-center text-xs",
                          hasRanges && "bg-primary/10 font-medium",
                          !hasRanges && "text-muted-foreground",
                        )}
                      >
                        {hasRanges ? formatRanges(ranges) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bố cục điện thoại: chọn 1 ngày, xem ai rảnh hôm đó sắp theo giờ bắt đầu */}
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

        <div className="space-y-2">
          {dayEntries.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Chưa ai đăng ký rảnh ngày này.
            </p>
          )}
          {dayEntries.map(({ emp, ranges }) => (
            <div
              key={emp.id}
              className="flex items-center justify-between rounded-md border p-3"
            >
              <span className="font-medium">{emp.displayName}</span>
              <span className="text-sm text-muted-foreground">
                {formatRanges(ranges)}
              </span>
            </div>
          ))}
        </div>

        {offSelectedDay.length > 0 && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Không rảnh ngày này ({offSelectedDay.length})
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              {offSelectedDay.map((e) => e.displayName).join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* Cố định, không phụ thuộc ngày đang chọn */}
      <div
        className={cn(
          "rounded-md border p-4 text-sm",
          notRegisteredAllWeek.length > 0
            ? "border-destructive/30 bg-destructive/10 text-destructive"
            : "border-primary/30 bg-primary/10 text-primary",
        )}
      >
        {notRegisteredAllWeek.length > 0 ? (
          <>
            <p className="font-medium">
              Còn {notRegisteredAllWeek.length} người chưa đăng ký gì cả tuần
            </p>
            <p className="mt-1">
              {notRegisteredAllWeek.map((e) => e.displayName).join(", ")}
            </p>
          </>
        ) : (
          <p className="font-medium">Mọi người đã đăng ký đủ.</p>
        )}
      </div>
    </div>
  );
}

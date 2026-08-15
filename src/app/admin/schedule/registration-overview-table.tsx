"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatRanges,
  mergeSelectedSlots,
  type DaySelection,
} from "@/lib/schedule/registration";
import {
  TABLE_HEADER_CELL,
  TABLE_HEADER_DAY,
  TABLE_HEADER_ROW,
} from "@/lib/schedule/table-styles";

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
// onContinue chỉ truyền khi dùng làm Bước 1 (tab trái Bước 3 chỉ để tra cứu).
export function RegistrationOverviewTable({
  weekDays,
  employees,
  onContinue,
}: {
  weekDays: string[];
  employees: EmployeeRegistration[];
  onContinue?: () => void;
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
      <div>
        <h2 className="font-semibold">Bước 1 — Lịch đăng ký</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Mỗi ô là khoảng giờ người đó có thể làm hôm ấy.
        </p>
      </div>

      {/* Bố cục máy tính: ma trận Nhân viên × Ngày */}
      <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] md:block">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className={TABLE_HEADER_ROW}>
              <th className={cn("p-2 text-left", TABLE_HEADER_CELL)}>Nhân sự</th>
              {weekDays.map((day, i) => (
                <th
                  key={day}
                  className={cn("p-2 text-center", TABLE_HEADER_CELL, TABLE_HEADER_DAY)}
                >
                  {WEEKDAY_SHORT[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const registered = hasAnyRegistration(emp);
              return (
                <tr key={emp.id} className="border-t border-t-[var(--border)]">
                  <td
                    className={cn(
                      "p-2 font-medium",
                      !registered && "text-[var(--text-muted)]",
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
                          "border-l-[1.5px] border-l-[var(--border)] p-2 text-center",
                          hasRanges && "bg-[var(--bg-success)] font-medium text-[var(--text-success)]",
                          !hasRanges && "text-[var(--text-muted)]",
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
                "flex h-11 shrink-0 flex-col items-center justify-center rounded-lg px-3 text-xs font-medium",
                selectedDay === day
                  ? "bg-[var(--fill-primary)] text-[var(--on-primary)]"
                  : "bg-[var(--surface-1)] text-[var(--text-muted)]",
              )}
            >
              <span>{WEEKDAY_SHORT[i]}</span>
              <span className="font-normal opacity-80">{formatDayShort(day)}</span>
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {dayEntries.length === 0 && (
            <p className="rounded-[var(--radius)] border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--text-muted)]">
              Chưa ai đăng ký rảnh ngày này.
            </p>
          )}
          {dayEntries.map(({ emp, ranges }) => (
            <div
              key={emp.id}
              className="flex items-center justify-between rounded-[var(--radius)] bg-[var(--surface-1)] p-3"
            >
              <span className="font-medium">{emp.displayName}</span>
              <span className="text-sm text-[var(--text-secondary)]">
                {formatRanges(ranges)}
              </span>
            </div>
          ))}
        </div>

        {offSelectedDay.length > 0 && (
          <div className="rounded-[var(--radius)] bg-[var(--bg-warning)] p-4 text-sm">
            <p className="font-medium text-[var(--text-warning)]">
              Không rảnh ngày này ({offSelectedDay.length})
            </p>
            <p className="mt-1 text-[var(--text-warning)]">
              {offSelectedDay.map((e) => e.displayName).join(", ")}
            </p>
          </div>
        )}
      </div>

      {/* Cố định, không phụ thuộc ngày đang chọn */}
      <div
        className={cn(
          "rounded-[var(--radius)] p-4 text-sm",
          notRegisteredAllWeek.length > 0
            ? "bg-[var(--bg-warning)] text-[var(--text-warning)]"
            : "bg-[var(--bg-success)] text-[var(--text-success)]",
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

      {onContinue && (
        <Button className="h-12 w-full rounded-lg text-base" onClick={onContinue}>
          Tiếp tục → Tạo gợi ý
        </Button>
      )}
    </div>
  );
}

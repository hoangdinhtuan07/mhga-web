"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveRegistrations } from "./actions";
import {
  EMPTY_DAY_SELECTION,
  SLOTS,
  formatRanges,
  isValidDaySelection,
  mergeSelectedSlots,
  totalHours,
  type DaySelection,
} from "@/lib/schedule/registration";
import {
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

export function RegistrationGrid({
  weekDays,
  weekLabel,
  locked,
  daysLeft,
  initialSelections,
}: {
  weekDays: string[];
  weekLabel: string;
  locked: boolean;
  daysLeft: number;
  initialSelections: Record<string, DaySelection>;
}) {
  const [selections, setSelections] =
    useState<Record<string, DaySelection>>(initialSelections);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const dayValidity = Object.fromEntries(
    weekDays.map((day) => [day, isValidDaySelection(selections[day])]),
  );
  const allValid = Object.values(dayValidity).every(Boolean);

  function toggleSlot(day: string, slotIndex: number) {
    if (locked) return;
    setMessage(null);
    setError(null);
    setSelections((prev) => {
      const current = [...prev[day]] as DaySelection;
      current[slotIndex] = !current[slotIndex];
      return { ...prev, [day]: current };
    });
  }

  function clearAll() {
    if (locked) return;
    setMessage(null);
    setError(null);
    setSelections(
      Object.fromEntries(weekDays.map((day) => [day, EMPTY_DAY_SELECTION])),
    );
  }

  function handleSave() {
    if (locked || !allValid || isPending) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await saveRegistrations(selections);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMessage("Đã lưu đăng ký.");
    });
  }

  const weekTotalHours = weekDays.reduce(
    (sum, day) => sum + totalHours(selections[day]),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Đăng ký cho tuần {weekLabel}</h1>
        {!locked && (
          <p className="text-sm text-[var(--text-warning)]">
            {daysLeft === 0
              ? "Hết hạn đăng ký hôm nay (hết Thứ 7)."
              : `Còn ${daysLeft} ngày nữa hết hạn (hết Thứ 7).`}
          </p>
        )}
      </div>

      {locked && (
        <p className="rounded-[var(--radius)] bg-[var(--bg-warning)] p-4 text-sm text-[var(--text-warning)]">
          Đã hết hạn đăng ký cho tuần {weekLabel}. Đăng ký cho tuần kế tiếp mở
          lại từ Thứ 2.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius)] bg-[var(--bg-danger)] p-4 text-sm text-[var(--text-danger)]"
        >
          {error}
        </p>
      )}
      {message && !error && (
        <p
          role="status"
          className="rounded-[var(--radius)] bg-[var(--bg-success)] p-4 text-sm text-[var(--text-success)]"
        >
          {message}
        </p>
      )}

      {/* Bố cục máy tính */}
      <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] md:block">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className={TABLE_HEADER_ROW}>
              <th className={cn("w-28 p-2 text-left", TABLE_HEADER_CELL)}>
                Giờ
              </th>
              {weekDays.map((day, dayIndex) => (
                <th
                  key={day}
                  className={cn(
                    "p-2 text-center",
                    TABLE_HEADER_CELL,
                    TABLE_HEADER_DAY,
                    !dayValidity[day] && "text-[var(--text-danger)]",
                  )}
                >
                  <div>{WEEKDAY_LABELS[dayIndex]}</div>
                  <div className="text-[10px] font-normal opacity-70">
                    {formatDayShort(day)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot, slotIndex) => (
              <tr key={slot.label} className="border-t border-t-[var(--border)]">
                <td className="bg-white p-2 text-[var(--text-secondary)] whitespace-nowrap">
                  {slot.label}
                </td>
                {weekDays.map((day) => {
                  const isSelected = selections[day][slotIndex];
                  const dayOk = dayValidity[day];
                  return (
                    <td
                      key={day}
                      className="border-l-[1.5px] border-l-[var(--border)] p-0.5"
                    >
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => toggleSlot(day, slotIndex)}
                        className={cn(
                          "h-[30px] w-full text-sm transition-colors",
                          isSelected && dayOk && "bg-[var(--bg-success)] text-[var(--text-success)]",
                          isSelected && !dayOk && "bg-[var(--bg-danger)] text-[var(--text-danger)]",
                          !isSelected && "bg-white text-[var(--text-muted)]",
                          locked && "cursor-not-allowed opacity-70",
                        )}
                      >
                        {isSelected ? (dayOk ? "✓" : "!") : ""}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="border-t-2 border-t-[var(--border-strong)] bg-white p-2 text-[10px] text-[var(--text-muted)]">
                Có thể làm
              </td>
              {weekDays.map((day) => (
                <td
                  key={day}
                  className={cn(
                    "border-t-2 border-t-[var(--border-strong)] border-l-[1.5px] border-l-[var(--border)] p-1.5 text-center text-[10px] font-semibold",
                    dayValidity[day]
                      ? "text-[var(--text-accent)]"
                      : "text-[var(--text-danger)]",
                  )}
                >
                  {dayValidity[day]
                    ? formatRanges(mergeSelectedSlots(selections[day])) || (
                        <span className="font-normal text-[var(--text-muted)]">—</span>
                      )
                    : "Chưa hợp lệ"}
                </td>
              ))}
            </tr>
            {!locked && (
              <tr>
                <td className="p-2" />
                {weekDays.map((day) =>
                  !dayValidity[day] ? (
                    <td
                      key={day}
                      className="border-l-[1.5px] border-l-[var(--border)] p-2 text-center text-[10px] text-[var(--text-danger)]"
                    >
                      Khoảng này chưa ghép được thành ca
                    </td>
                  ) : (
                    <td key={day} className="border-l-[1.5px] border-l-[var(--border)] p-2" />
                  ),
                )}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bố cục điện thoại */}
      <div className="space-y-3 md:hidden">
        {weekDays.map((day, dayIndex) => {
          const dayOk = dayValidity[day];
          const daySelection = selections[day];
          const hasAny = daySelection.some(Boolean);

          if (locked && !hasAny) {
            return (
              <div
                key={day}
                className="rounded-[10px] border border-[var(--border)] p-3"
              >
                <p className="font-semibold text-[var(--text-primary)]">
                  {WEEKDAY_LABELS[dayIndex]} · {formatDayShort(day)}
                </p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Không đăng ký ngày này
                </p>
              </div>
            );
          }

          return (
            <div
              key={day}
              className={cn(
                "space-y-2 rounded-[10px] border border-[var(--border)] p-3",
                !dayOk && "outline outline-[1.5px] outline-[var(--text-danger)]",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  {WEEKDAY_LABELS[dayIndex]} · {formatDayShort(day)}
                </span>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    dayOk ? "text-[var(--text-accent)]" : "text-[var(--text-danger)]",
                  )}
                >
                  {dayOk
                    ? formatRanges(mergeSelectedSlots(daySelection)) || "—"
                    : "Chưa hợp lệ"}
                </span>
              </div>
              <div className="space-y-1.5">
                {SLOTS.map((slot, slotIndex) => {
                  const isSelected = daySelection[slotIndex];
                  if (locked && !isSelected) return null;
                  return (
                    <button
                      key={slot.label}
                      type="button"
                      disabled={locked}
                      onClick={() => toggleSlot(day, slotIndex)}
                      className={cn(
                        "flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm",
                        isSelected && dayOk && "bg-[var(--bg-success)] text-[var(--text-success)]",
                        isSelected && !dayOk && "bg-[var(--bg-danger)] text-[var(--text-danger)]",
                        !isSelected && "bg-[var(--surface-1)] text-[var(--text-secondary)]",
                        locked && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <span>{slot.label}</span>
                      <span>{isSelected ? (dayOk ? "✓" : "!") : ""}</span>
                    </button>
                  );
                })}
              </div>
              {!dayOk && (
                <p className="text-[11px] text-[var(--text-danger)]">
                  Khoảng này chưa ghép được thành ca
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--border)] p-4">
        <p className="text-sm">
          Tổng số giờ có thể làm trong tuần: <strong>{weekTotalHours}h</strong>
        </p>
        {!locked && (
          <div className="flex gap-2">
            <Button variant="outline" className="h-11 rounded-lg" onClick={clearAll}>
              Xoá hết
            </Button>
            <Button
              className="h-11 rounded-lg"
              onClick={handleSave}
              disabled={!allValid || isPending}
            >
              {isPending
                ? "Đang lưu..."
                : !allValid
                  ? "Sửa các ngày chưa hợp lệ để lưu"
                  : "Lưu"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

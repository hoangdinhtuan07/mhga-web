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
          <p className="text-sm text-muted-foreground">
            {daysLeft === 0
              ? "Hết hạn đăng ký hôm nay."
              : `Còn ${daysLeft} ngày nữa hết hạn đăng ký.`}
          </p>
        )}
      </div>

      {locked && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Đã hết hạn đăng ký cho tuần {weekLabel}. Đăng ký cho tuần kế tiếp mở
          lại từ Thứ 2.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {message && !error && (
        <p role="status" className="rounded-md bg-primary/10 p-3 text-sm">
          {message}
        </p>
      )}

      {/* Bố cục máy tính */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-28 border-b p-2 text-left font-medium">
                Khoảng giờ
              </th>
              {weekDays.map((day, dayIndex) => (
                <th
                  key={day}
                  className={cn(
                    "border-b border-l p-2 text-center font-medium",
                    !dayValidity[day] && "text-destructive",
                  )}
                >
                  <div>{WEEKDAY_LABELS[dayIndex]}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {formatDayShort(day)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.map((slot, slotIndex) => (
              <tr key={slot.label}>
                <td className="border-b p-2 font-medium">{slot.label}</td>
                {weekDays.map((day) => {
                  const isSelected = selections[day][slotIndex];
                  const dayOk = dayValidity[day];
                  return (
                    <td key={day} className="border-b border-l p-1">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => toggleSlot(day, slotIndex)}
                        className={cn(
                          "h-11 w-full rounded-md border text-sm transition-colors",
                          isSelected &&
                            dayOk &&
                            "border-primary bg-primary/15 font-medium text-primary",
                          isSelected &&
                            !dayOk &&
                            "border-destructive bg-destructive/15 font-medium text-destructive",
                          !isSelected && "border-transparent hover:bg-muted",
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
              <td className="border-t p-2 font-medium">Có thể làm</td>
              {weekDays.map((day) => (
                <td
                  key={day}
                  className={cn(
                    "border-t border-l p-2 text-center text-xs",
                    !dayValidity[day] && "text-destructive",
                  )}
                >
                  {dayValidity[day]
                    ? formatRanges(mergeSelectedSlots(selections[day])) || "—"
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
                      className="border-l p-2 text-center text-xs text-destructive"
                    >
                      Khoảng này chưa ghép được thành ca
                    </td>
                  ) : (
                    <td key={day} className="border-l p-2" />
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
              <div key={day} className="rounded-lg border p-4">
                <p className="font-medium">
                  {WEEKDAY_LABELS[dayIndex]} · {formatDayShort(day)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Không đăng ký ngày này
                </p>
              </div>
            );
          }

          return (
            <div
              key={day}
              className={cn(
                "space-y-3 rounded-lg border p-4",
                !dayOk && "border-destructive",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className={cn("font-medium", !dayOk && "text-destructive")}>
                  {WEEKDAY_LABELS[dayIndex]} · {formatDayShort(day)}
                </p>
                <p className={cn("text-xs", !dayOk && "text-destructive")}>
                  {dayOk
                    ? formatRanges(mergeSelectedSlots(daySelection))
                    : "Chưa hợp lệ"}
                </p>
              </div>
              <div className="space-y-2">
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
                        "flex h-11 w-full items-center justify-between rounded-md border px-3 text-sm",
                        isSelected &&
                          dayOk &&
                          "border-primary bg-primary/15 font-medium text-primary",
                        isSelected &&
                          !dayOk &&
                          "border-destructive bg-destructive/15 font-medium text-destructive",
                        !isSelected && "border-input",
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
                <p className="text-sm text-destructive">
                  Khoảng này chưa ghép được thành ca
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
        <p className="text-sm">
          Tổng số giờ có thể làm trong tuần: <strong>{weekTotalHours}h</strong>
        </p>
        {!locked && (
          <div className="flex gap-2">
            <Button variant="outline" className="h-11" onClick={clearAll}>
              Xoá hết
            </Button>
            <Button
              className="h-11"
              onClick={handleSave}
              disabled={!allValid || isPending}
            >
              {isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

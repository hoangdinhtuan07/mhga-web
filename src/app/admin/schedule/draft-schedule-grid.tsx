"use client";

import { Fragment, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buildStoreGrid, storeDayGapHours } from "@/lib/schedule/grid";
import type { ScheduleAssignment } from "@/lib/schedule/assignment";
import type { StoreDef } from "./assignment-table";
import type { EmployeeRegistration } from "./registration-overview-table";
import { editDraftCell, publishSchedule } from "./actions";
import {
  SCHED_CELL_BASE,
  SCHED_CELL_EMPTY,
  SCHED_CELL_FILLED,
  SCHED_HEADER_CELL,
  SCHED_HEADER_ROW,
  SCHED_HOUR_CELL,
  SCHED_STORE_CELL,
  SCHED_STORE_ROW,
  STORE_START_ROW,
  TABLE_HEADER_DAY,
} from "@/lib/schedule/table-styles";

const WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type EditingCell = { storeId: number; day: string; start: number; end: number };

function cellKey(storeId: number, day: string, start: number, end: number) {
  return `${storeId}|${day}|${start}-${end}`;
}

function formatDayShort(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

export function DraftScheduleGrid({
  weekStart,
  weekLabel,
  weekDays,
  stores,
  assignments,
  employees,
  isPublished,
}: {
  weekStart: string;
  weekLabel: string;
  weekDays: string[];
  stores: StoreDef[];
  assignments: ScheduleAssignment[];
  employees: EmployeeRegistration[];
  isPublished: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState("");
  const [skipped, setSkipped] = useState<Record<string, string[]>>({});
  const [selectedDay, setSelectedDay] = useState(weekDays[0]);
  const [isPending, startTransition] = useTransition();
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);

  const gapHoursByStoreDay = Object.fromEntries(
    stores.map((store) => [
      store.id,
      storeDayGapHours(weekDays, assignments.filter((a) => a.storeId === store.id)),
    ]),
  ) as Record<number, Record<string, number>>;

  const dayTotalGap = Object.fromEntries(
    weekDays.map((day) => [
      day,
      stores.reduce((sum, store) => sum + (gapHoursByStoreDay[store.id]?.[day] ?? 0), 0),
    ]),
  );

  const totalGapHours = weekDays.reduce((sum, day) => sum + (dayTotalGap[day] ?? 0), 0);

  function startEdit(storeId: number, day: string, start: number, end: number, names: string[]) {
    setEditing({ storeId, day, start, end });
    setEditValue(names.join(", "));
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue("");
  }

  function commitEdit() {
    if (!editing) return;
    const { storeId, day, start, end } = editing;
    const key = cellKey(storeId, day, start, end);
    startTransition(async () => {
      const result = await editDraftCell({
        weekStart,
        storeId,
        day,
        startHour: start,
        endHour: end,
        rawNames: editValue,
      });
      setEditing(null);
      if (!result.success) return;
      setSkipped((prev) => ({ ...prev, [key]: result.skippedNames }));
      router.refresh();
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  }

  function handlePublish() {
    setPublishError(null);
    startTransition(async () => {
      const result = await publishSchedule(weekStart);
      setPublishConfirm(false);
      if (!result.success) {
        setPublishError(result.error);
        return;
      }
      // Phản hồi ngay lập tức, không chờ router.refresh() tải lại xong mới
      // biết đã công bố — đây chính là điều admin báo "không biết đã công
      // bố chưa".
      setJustPublished(true);
      router.refresh();
    });
  }

  if (isPublished || justPublished) {
    return (
      <div className="space-y-4">
        <h2 className="font-semibold">Bước 4 — Lịch làm việc tuần {weekLabel}</h2>
        <div className="rounded-[var(--radius)] bg-[var(--bg-success)] p-6 text-center">
          <p className="text-lg font-medium text-[var(--text-success)]">
            ✓ Đã công bố lịch chính thức
          </p>
          <p className="mt-1 text-sm text-[var(--text-success)]">
            Lịch tuần {weekLabel} đã xuất hiện trên trang chủ của toàn bộ
            tài khoản. Đăng ký khoảng rảnh của tuần này cũng đã bị khoá.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">Bước 4 — Lịch làm việc tuần {weekLabel}</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Bấm vào ô để sửa trực tiếp. Muốn gợi ý lại, quay về Bước 3.
        </p>
      </div>

      {totalGapHours > 0 && (
        <p className="rounded-[var(--radius)] bg-[var(--bg-danger)] p-4 text-sm text-[var(--text-danger)]">
          <strong>Còn {totalGapHours} giờ chưa có người</strong> trong tuần này.
        </p>
      )}

      <datalist id="draft-employee-names">
        {employees.map((emp) => (
          <option key={emp.id} value={emp.displayName} />
        ))}
      </datalist>

      {/* Bố cục máy tính */}
      <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] md:block">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className={SCHED_HEADER_ROW}>
              <th className={cn("text-left", SCHED_HEADER_CELL)}>Cửa hàng</th>
              <th className={cn("text-center", SCHED_HEADER_CELL)}>Giờ</th>
              {weekDays.map((day, i) => (
                <th
                  key={day}
                  className={cn("text-center", SCHED_HEADER_CELL, TABLE_HEADER_DAY)}
                >
                  {WEEKDAY_LABELS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stores.map((store) => {
              const storeAssignments = assignments.filter((a) => a.storeId === store.id);
              const { slices, segmentsByDay } = buildStoreGrid(weekDays, storeAssignments);

              return (
                <Fragment key={store.id}>
                  {slices.map((slice, sliceIndex) => (
                    <tr
                      key={`${slice.start}-${slice.end}`}
                      className={sliceIndex === 0 ? STORE_START_ROW : SCHED_STORE_ROW}
                    >
                      {sliceIndex === 0 && (
                        <td rowSpan={slices.length} className={SCHED_STORE_CELL}>
                          {store.name}
                        </td>
                      )}
                      <td className={cn("whitespace-nowrap", SCHED_HOUR_CELL)}>
                        {slice.start}-{slice.end}h
                      </td>
                      {weekDays.map((day) => {
                        const segment = segmentsByDay[day].find(
                          (seg) => seg.startIndex === sliceIndex,
                        );
                        if (!segment) return null;

                        const end = slices[segment.startIndex + segment.sliceCount - 1].end;
                        const isEditingThis =
                          editing?.storeId === store.id &&
                          editing.day === day &&
                          editing.start === slice.start &&
                          editing.end === end;
                        const isRed = segment.people.length === 0;
                        const key = cellKey(store.id, day, slice.start, end);
                        const skippedNames = skipped[key] ?? [];

                        return (
                          <td
                            key={day}
                            rowSpan={segment.sliceCount}
                            className={cn(
                              "relative",
                              SCHED_CELL_BASE,
                              isRed && !isEditingThis && SCHED_CELL_EMPTY,
                              !isRed && SCHED_CELL_FILLED,
                            )}
                          >
                            {isEditingThis ? (
                              <input
                                autoFocus
                                list="draft-employee-names"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onBlur={commitEdit}
                                disabled={isPending}
                                className="h-8 w-full min-w-[7rem] border border-[var(--border)] bg-[var(--surface-2)] px-1 text-[11px] text-[var(--text-primary)] outline-none focus:border-[var(--text-accent)]"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  startEdit(
                                    store.id,
                                    day,
                                    slice.start,
                                    end,
                                    segment.people.map((p) => p.displayName),
                                  )
                                }
                                className="absolute inset-0 h-full w-full"
                              >
                                {isRed
                                  ? null
                                  : segment.people.map((p) => p.displayName).join(", ")}
                              </button>
                            )}
                            {skippedNames.length > 0 && (
                              <p className="mt-1 text-[10px] text-[var(--text-danger)]">
                                Không có tài khoản tên: {skippedNames.join(", ")} — đã bỏ qua
                              </p>
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

      {/* Bố cục điện thoại: chọn ngày rồi bấm từng ô để sửa trực tiếp (mục 9) */}
      <div className="space-y-3 md:hidden">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weekDays.map((day, i) => {
            const gap = dayTotalGap[day] ?? 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "flex h-12 shrink-0 flex-col items-center justify-center rounded-[var(--radius)] border px-3 text-xs font-medium",
                  selectedDay === day
                    ? "border-transparent bg-[var(--fill-primary)] text-[var(--on-primary)]"
                    : "border-[var(--border)]",
                )}
              >
                <span>
                  {WEEKDAY_LABELS[i]} · {formatDayShort(day)}
                </span>
                <span
                  className={cn(
                    "font-normal",
                    selectedDay === day
                      ? "text-[var(--on-primary)] opacity-80"
                      : gap > 0
                        ? "text-[var(--text-danger)]"
                        : "text-[var(--text-muted)]",
                  )}
                >
                  {gap > 0 ? `hở ${gap}h` : "đủ"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          {stores.map((store) => {
            const storeAssignments = assignments.filter((a) => a.storeId === store.id);
            const { slices, segmentsByDay } = buildStoreGrid(weekDays, storeAssignments);
            const segments = segmentsByDay[selectedDay];
            const gap = gapHoursByStoreDay[store.id]?.[selectedDay] ?? 0;

            return (
              <div
                key={store.id}
                className="space-y-1.5 rounded-[var(--radius)] border border-[var(--border)] p-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">{store.name}</p>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      gap > 0 ? "text-[var(--text-danger)]" : "text-[var(--text-muted)]",
                    )}
                  >
                    {gap > 0 ? `thiếu ${gap}h` : "đủ người"}
                  </span>
                </div>

                {segments.map((segment) => {
                  const slice = slices[segment.startIndex];
                  const end = slices[segment.startIndex + segment.sliceCount - 1].end;
                  const isRed = segment.people.length === 0;
                  const isEditingThis =
                    editing?.storeId === store.id &&
                    editing.day === selectedDay &&
                    editing.start === slice.start &&
                    editing.end === end;
                  const key = cellKey(store.id, selectedDay, slice.start, end);
                  const skippedNames = skipped[key] ?? [];

                  return (
                    <div key={segment.startIndex}>
                      {isEditingThis ? (
                        <input
                          autoFocus
                          list="draft-employee-names"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          onBlur={commitEdit}
                          disabled={isPending}
                          className="h-11 w-full rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--text-accent)]"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(
                              store.id,
                              selectedDay,
                              slice.start,
                              end,
                              segment.people.map((p) => p.displayName),
                            )
                          }
                          className={cn(
                            "flex h-11 w-full items-center justify-between rounded-[var(--radius)] px-3 text-sm",
                            isRed
                              ? "bg-[var(--bg-danger)] text-[var(--text-danger)]"
                              : "bg-[var(--bg-success)] text-[var(--text-success)]",
                          )}
                        >
                          <span>
                            {slice.start}-{end}h
                          </span>
                          <span>
                            {isRed
                              ? "+ nhập tên"
                              : segment.people.map((p) => p.displayName).join(", ")}
                          </span>
                        </button>
                      )}
                      {skippedNames.length > 0 && (
                        <p className="mt-1 text-[11px] text-[var(--text-danger)]">
                          Không có tài khoản tên: {skippedNames.join(", ")} — đã bỏ qua
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {publishError && (
        <p
          role="alert"
          className="rounded-[var(--radius)] bg-[var(--bg-danger)] p-4 text-sm text-[var(--text-danger)]"
        >
          {publishError}
        </p>
      )}

      <Button
        className="h-12 w-full rounded-lg text-base"
        disabled={isPending}
        onClick={() => (totalGapHours > 0 ? setPublishConfirm(true) : handlePublish())}
      >
        {isPending ? "Đang công bố..." : `Công bố lịch tuần ${weekLabel}`}
      </Button>

      <AlertDialog open={publishConfirm} onOpenChange={setPublishConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lịch còn chỗ trống</AlertDialogTitle>
            <AlertDialogDescription>
              Còn {totalGapHours} khung giờ chưa có người. Vẫn công bố hay tiếp tục sửa?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <Button variant="outline" className="h-10" onClick={() => setPublishConfirm(false)}>
              Tiếp tục sửa
            </Button>
            <Button
              variant="destructive"
              className="h-10"
              disabled={isPending}
              onClick={handlePublish}
            >
              {isPending ? "Đang công bố..." : "Vẫn công bố"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

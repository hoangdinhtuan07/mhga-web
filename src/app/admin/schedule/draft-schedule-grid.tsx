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

type EditingCell = { storeId: number; day: string; start: number; end: number };

function cellKey(storeId: number, day: string, start: number, end: number) {
  return `${storeId}|${day}|${start}-${end}`;
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
  const [isPending, startTransition] = useTransition();
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState(false);

  const totalGapHours = stores.reduce((sum, store) => {
    const perDay = storeDayGapHours(
      weekDays,
      assignments.filter((a) => a.storeId === store.id),
    );
    return sum + weekDays.reduce((s, day) => s + (perDay[day] ?? 0), 0);
  }, 0);

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
        <h2 className="font-medium">Bảng lịch nháp — tuần {weekLabel}</h2>
        <div className="rounded-md border border-primary/30 bg-primary/10 p-6 text-center">
          <p className="text-lg font-medium">✓ Đã công bố lịch chính thức</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Lịch tuần {weekLabel} đã xuất hiện trên trang chủ của toàn bộ
            tài khoản. Đăng ký khoảng rảnh của tuần này cũng đã bị khoá.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-medium">Bảng lịch nháp — tuần {weekLabel}</h2>

      {totalGapHours > 0 && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          Còn {totalGapHours} khung giờ chưa xếp được ai. Bấm vào ô đỏ để điền tên.
        </p>
      )}

      <datalist id="draft-employee-names">
        {employees.map((emp) => (
          <option key={emp.id} value={emp.displayName} />
        ))}
      </datalist>

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
                <th key={day} className="border-b border-l p-2 text-center font-medium">
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
              const storeAssignments = assignments.filter((a) => a.storeId === store.id);
              const { slices, segmentsByDay } = buildStoreGrid(weekDays, storeAssignments);

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
                              "border-l p-1 align-top text-xs",
                              isRed && !isEditingThis && "bg-destructive/10",
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
                                className="h-8 w-full min-w-[7rem] rounded border px-1 text-xs outline-none focus:border-primary"
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
                                className={cn(
                                  "w-full rounded px-1 py-1 text-left hover:underline",
                                  isRed && "text-center text-destructive",
                                )}
                              >
                                {isRed
                                  ? "+ nhập tên"
                                  : segment.people.map((p) => p.displayName).join(", ")}
                              </button>
                            )}
                            {skippedNames.length > 0 && (
                              <p className="mt-1 text-[11px] text-destructive">
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

      {publishError && (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {publishError}
        </p>
      )}

      <Button
        className="h-11 w-full md:w-auto"
        disabled={isPending}
        onClick={() => (totalGapHours > 0 ? setPublishConfirm(true) : handlePublish())}
      >
        {isPending ? "Đang công bố..." : "Công bố lịch chính thức"}
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

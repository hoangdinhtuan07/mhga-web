"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ScheduleAssignment } from "@/lib/schedule/assignment";
import type { StoreDef } from "./assignment-table";
import { runSuggestion } from "./actions";

const SHIFT_LABELS: Record<number, string> = {
  1: "9-13h",
  2: "13-18h",
  3: "18-22h",
  4: "9-15h",
  5: "15-22h",
};

export function SuggestionStep({
  weekStart,
  weekLabel,
  stores,
  assignments,
}: {
  weekStart: string;
  weekLabel: string;
  stores: StoreDef[];
  assignments: ScheduleAssignment[];
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [log, setLog] = useState<string[] | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const manualCount = assignments.filter((a) => a.source === "manual").length;

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await runSuggestion(weekStart);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setLog(result.log);
      setWarning(result.warning);
      router.refresh();
    });
  }

  function handleClickRun() {
    if (manualCount > 0) {
      setConfirmOpen(true);
      return;
    }
    run();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-4">
        <p className="text-sm font-medium">Cấu hình ca theo cửa hàng</p>
        <ul className="hidden space-y-1 text-sm text-muted-foreground md:block">
          {stores.map((store) => (
            <li key={store.id}>
              {store.name}: {store.allowedShiftIds.map((id) => SHIFT_LABELS[id]).join(", ")}
            </li>
          ))}
        </ul>
        <div className="space-y-1 text-sm text-muted-foreground md:hidden">
          <p>91 &amp; 15 Hàng Gai: 3 ca nhỏ (9-13h, 13-18h, 18-22h)</p>
          <p>76 Hàng Gai, 62 Hàng Trống, 42 Hàng Ngang: 2 ca lớn (9-15h, 15-22h) + ca nhỏ</p>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button className="h-11 w-full md:w-auto" onClick={handleClickRun} disabled={isPending}>
        {isPending ? "Đang chạy..." : `Chạy gợi ý cho tuần ${weekLabel}`}
      </Button>

      {log && (
        <div className="space-y-1 rounded-md border p-4 font-mono text-xs">
          {log.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
          {warning && <p className="text-destructive">{warning}</p>}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chạy lại sẽ xoá toàn bộ chỉnh sửa tay</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang có {manualCount} ca vá tay. Chạy lại gợi ý sẽ xoá hết và thay bằng kết
              quả mới.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-wrap gap-2">
            <Button variant="outline" className="h-10" onClick={() => setConfirmOpen(false)}>
              Huỷ
            </Button>
            <Button
              variant="destructive"
              className="h-10"
              onClick={() => {
                setConfirmOpen(false);
                run();
              }}
            >
              Vẫn chạy lại
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
import { runSuggestion } from "./actions";

export function SuggestionStep({
  weekStart,
  weekLabel,
  assignments,
  onContinue,
}: {
  weekStart: string;
  weekLabel: string;
  assignments: ScheduleAssignment[];
  onContinue?: () => void;
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
      <div>
        <h2 className="font-semibold">Bước 2 — Tạo gợi ý lịch tự động</h2>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Cấu hình ca</p>
        <p className="text-sm text-[var(--text-muted)]">
          91 &amp; 15 Hàng Gai — chỉ 3 ca nhỏ: 9-13h, 13-18h, 18-22h
        </p>
        <p className="text-sm text-[var(--text-muted)]">
          76 Hàng Gai, 62 Hàng Trống, 42 Hàng Ngang — 2 ca lớn, nhận thêm ca nhỏ
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

      <Button
        className="h-12 w-full rounded-lg text-base"
        onClick={handleClickRun}
        disabled={isPending}
      >
        {isPending ? "Đang chạy..." : `Chạy gợi ý cho tuần ${weekLabel}`}
      </Button>

      {log && (
        <div className="space-y-2 text-sm">
          {log.map((line, i) => (
            <p key={i}>{line.startsWith("✓") ? line : <strong>{line}</strong>}</p>
          ))}
          {warning ? (
            <p className="font-semibold text-[var(--text-danger)]">{warning}</p>
          ) : (
            <p className="font-semibold text-[var(--text-success)]">
              Đã phủ kín toàn bộ khung giờ mở cửa.
            </p>
          )}
        </div>
      )}

      {log && onContinue && (
        <Button className="h-12 w-full rounded-lg text-base" onClick={onContinue}>
          Xem &amp; chỉnh lịch →
        </Button>
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

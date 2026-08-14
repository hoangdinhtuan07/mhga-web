"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { AccountRow } from "./accounts-table";

export function DeleteAccountDialog({
  account,
  onClose,
  onDeleted,
}: {
  account: AccountRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shiftCount, setShiftCount] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const res = await fetch(`/api/admin/users/${account.id}`, {
        method: "GET",
      });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setError(data.error ?? "Có lỗi xảy ra, thử lại.");
      } else {
        setShiftCount(data.shiftCount ?? 0);
      }
      setChecked(true);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [account.id]);

  async function handleConfirmDelete() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${account.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Có lỗi xảy ra, thử lại.");
      return;
    }
    onDeleted();
  }

  async function handleDeactivateInstead() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/users/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "inactive" }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Có lỗi xảy ra, thử lại.");
      return;
    }
    onDeleted();
  }

  const hasShifts = checked && (shiftCount ?? 0) > 0;

  return (
    <AlertDialog open onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Xoá tài khoản {account.display_name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {!checked
              ? "Đang kiểm tra..."
              : hasShifts
                ? `Người này đang có ${shiftCount} ca trong lịch. Xoá sẽ khiến tên biến mất khỏi mọi lịch cũ đã công bố. Cân nhắc dùng "Cho nghỉ" thay vì xoá để giữ lại lịch sử.`
                : "Hành động này không thể hoàn tác."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <AlertDialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-11"
            onClick={onClose}
            disabled={loading}
          >
            Huỷ
          </Button>
          {hasShifts && (
            <Button
              variant="outline"
              className="h-11"
              onClick={handleDeactivateInstead}
              disabled={loading}
            >
              Cho nghỉ thay vì xoá
            </Button>
          )}
          <Button
            variant="destructive"
            className="h-11"
            onClick={handleConfirmDelete}
            disabled={loading || !checked}
          >
            Vẫn xoá
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

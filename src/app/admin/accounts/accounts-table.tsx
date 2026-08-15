"use client";

import { useState, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { AccountFormDialog } from "./account-form-dialog";
import { DeleteAccountDialog } from "./delete-account-dialog";
import { TABLE_HEADER_CELL, TABLE_HEADER_ROW } from "@/lib/schedule/table-styles";

export type AccountRow = {
  id: string;
  display_name: string;
  username: string;
  role: "admin" | "staff";
  status: "active" | "inactive";
};

function RoleBadge({ role }: { role: AccountRow["role"] }) {
  if (role === "staff") {
    return <span className="text-sm">Nhân viên</span>;
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--bg-accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--text-accent)]">
      Admin
    </span>
  );
}

function StatusText({ status }: { status: AccountRow["status"] }) {
  return (
    <span
      className={cn(
        "text-sm font-medium",
        status === "active" ? "text-[var(--text-success)]" : "text-[var(--text-muted)]",
      )}
    >
      {status === "active" ? "Đang làm" : "Đã nghỉ"}
    </span>
  );
}

function PillButton({
  tone = "default",
  ...props
}: Omit<ComponentProps<typeof Button>, "variant"> & { tone?: "default" | "danger" }) {
  return (
    <Button
      {...props}
      variant="outline"
      size="sm"
      className={cn(
        "rounded-full border-[var(--border)]",
        tone === "danger" && "border-[var(--text-danger)]/40 text-[var(--text-danger)] hover:bg-[var(--bg-danger)]",
        props.className,
      )}
    />
  );
}

export function AccountsTable({
  accounts,
  currentUserId,
}: {
  accounts: AccountRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<AccountRow | "new" | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AccountRow | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
  }

  async function handleToggleStatus(account: AccountRow) {
    setError(null);
    setPendingId(account.id);
    const nextStatus = account.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/admin/users/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const data = await res.json();
    setPendingId(null);
    if (!res.ok) {
      setError(data.error ?? "Có lỗi xảy ra, thử lại.");
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-[var(--radius)] bg-[var(--bg-danger)] p-3 text-sm text-[var(--text-danger)]"
        >
          {error}
        </p>
      )}

      <Button className="h-11 rounded-lg" onClick={() => setFormTarget("new")}>
        + Thêm tài khoản
      </Button>

      {formTarget && (
        <AccountFormDialog
          account={formTarget === "new" ? null : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={() => {
            setFormTarget(null);
            refresh();
          }}
        />
      )}

      {/* Bố cục máy tính */}
      <div className="hidden overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] md:block">
        <Table>
          <TableHeader>
            <TableRow className={cn(TABLE_HEADER_ROW, "hover:bg-[var(--bg-header)]")}>
              <TableHead className={TABLE_HEADER_CELL}>Tên hiển thị</TableHead>
              <TableHead className={TABLE_HEADER_CELL}>Đăng nhập</TableHead>
              <TableHead className={TABLE_HEADER_CELL}>Vai trò</TableHead>
              <TableHead className={TABLE_HEADER_CELL}>Trạng thái</TableHead>
              <TableHead className={cn("text-right", TABLE_HEADER_CELL)}>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow
                key={account.id}
                className={cn(account.status === "inactive" && "opacity-60")}
              >
                <TableCell className="font-medium">
                  {account.display_name}
                  {account.id === currentUserId && (
                    <span className="text-muted-foreground"> (bạn)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {account.username}
                </TableCell>
                <TableCell>
                  <RoleBadge role={account.role} />
                </TableCell>
                <TableCell>
                  <StatusText status={account.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <PillButton onClick={() => setFormTarget(account)}>Sửa</PillButton>
                    <PillButton
                      disabled={
                        account.id === currentUserId ||
                        pendingId === account.id
                      }
                      onClick={() => handleToggleStatus(account)}
                    >
                      {account.status === "active"
                        ? "Cho nghỉ"
                        : "Cho làm lại"}
                    </PillButton>
                    <PillButton
                      tone="danger"
                      disabled={account.id === currentUserId}
                      onClick={() => setDeleteTarget(account)}
                    >
                      Xoá
                    </PillButton>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bố cục điện thoại */}
      <div className="space-y-3 md:hidden">
        {accounts.map((account) => (
          <div
            key={account.id}
            className={cn(
              "space-y-3 rounded-[var(--radius)] border p-4",
              account.status === "inactive" && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{account.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  {account.username}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <RoleBadge role={account.role} />
                <StatusText status={account.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <PillButton className="h-11 flex-1" onClick={() => setFormTarget(account)}>
                Sửa
              </PillButton>
              <PillButton
                className="h-11 flex-1"
                disabled={
                  account.id === currentUserId || pendingId === account.id
                }
                onClick={() => handleToggleStatus(account)}
              >
                {account.status === "active" ? "Cho nghỉ" : "Cho làm lại"}
              </PillButton>
              <PillButton
                tone="danger"
                className="h-11 flex-1"
                disabled={account.id === currentUserId}
                onClick={() => setDeleteTarget(account)}
              >
                Xoá
              </PillButton>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <DeleteAccountDialog
          account={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

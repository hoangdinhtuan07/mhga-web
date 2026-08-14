"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export type AccountRow = {
  id: string;
  display_name: string;
  username: string;
  role: "admin" | "staff";
  status: "active" | "inactive";
};

function RoleBadge({ role }: { role: AccountRow["role"] }) {
  return (
    <Badge variant={role === "admin" ? "default" : "secondary"}>
      {role === "admin" ? "Admin" : "Nhân viên"}
    </Badge>
  );
}

function StatusBadge({ status }: { status: AccountRow["status"] }) {
  return (
    <Badge variant={status === "active" ? "default" : "secondary"}>
      {status === "active" ? "Đang làm" : "Đã nghỉ"}
    </Badge>
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
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button className="h-11" onClick={() => setFormTarget("new")}>
          + Thêm tài khoản
        </Button>
      </div>

      {/* Bố cục máy tính */}
      <div className="hidden overflow-x-auto rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên hiển thị</TableHead>
              <TableHead>Tên đăng nhập</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow
                key={account.id}
                className={cn(account.status === "inactive" && "opacity-50")}
              >
                <TableCell className="font-medium">
                  {account.display_name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {account.username}
                </TableCell>
                <TableCell>
                  <RoleBadge role={account.role} />
                </TableCell>
                <TableCell>
                  <StatusBadge status={account.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFormTarget(account)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        account.id === currentUserId ||
                        pendingId === account.id
                      }
                      onClick={() => handleToggleStatus(account)}
                    >
                      {account.status === "active"
                        ? "Cho nghỉ"
                        : "Kích hoạt lại"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={account.id === currentUserId}
                      onClick={() => setDeleteTarget(account)}
                    >
                      Xoá
                    </Button>
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
              "space-y-3 rounded-lg border p-4",
              account.status === "inactive" && "opacity-50",
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
                <StatusBadge status={account.status} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="h-11 flex-1"
                onClick={() => setFormTarget(account)}
              >
                Sửa
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1"
                disabled={
                  account.id === currentUserId || pendingId === account.id
                }
                onClick={() => handleToggleStatus(account)}
              >
                {account.status === "active" ? "Cho nghỉ" : "Kích hoạt lại"}
              </Button>
              <Button
                variant="destructive"
                className="h-11 flex-1"
                disabled={account.id === currentUserId}
                onClick={() => setDeleteTarget(account)}
              >
                Xoá
              </Button>
            </div>
          </div>
        ))}
      </div>

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

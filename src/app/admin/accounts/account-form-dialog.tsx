"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AccountRow } from "./accounts-table";

const PASSWORD_CHARS =
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePassword() {
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)];
  }
  return result;
}

export function AccountFormDialog({
  account,
  onClose,
  onSaved,
}: {
  account: AccountRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = account !== null;

  const [displayName, setDisplayName] = useState(account?.display_name ?? "");
  const [username, setUsername] = useState(account?.username ?? "");
  const [role, setRole] = useState<"admin" | "staff">(
    account?.role ?? "staff",
  );
  const [password, setPassword] = useState(isEdit ? "" : generatePassword());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    username: string;
    password: string;
  } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedDisplayName = displayName.trim();
    const normalizedUsername = username.trim().toLowerCase();

    if (!trimmedDisplayName || !normalizedUsername) {
      setError("Vui lòng nhập đầy đủ tên hiển thị và tên đăng nhập.");
      return;
    }
    if (!isEdit && password.length < 6) {
      setError("Mật khẩu phải từ 6 ký tự trở lên.");
      return;
    }
    if (isEdit && password.length > 0 && password.length < 6) {
      setError("Mật khẩu phải từ 6 ký tự trở lên.");
      return;
    }

    setLoading(true);

    const url = isEdit ? `/api/admin/users/${account.id}` : "/api/admin/users";
    const method = isEdit ? "PATCH" : "POST";
    const body: Record<string, unknown> = {
      displayName: trimmedDisplayName,
      username: normalizedUsername,
      role,
    };
    if (!isEdit || password.length > 0) {
      body.password = password;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Có lỗi xảy ra, thử lại.");
      return;
    }

    if (!isEdit) {
      setResult({ username: normalizedUsername, password });
      return;
    }

    onSaved();
  }

  if (result) {
    return (
      <Dialog open onOpenChange={onSaved}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đã tạo tài khoản</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>Báo lại cho nhân viên thông tin đăng nhập sau:</p>
            <div className="space-y-1 rounded-md border bg-muted p-3 font-mono text-sm">
              <p>Tên đăng nhập: {result.username}</p>
              <p>Mật khẩu: {result.password}</p>
            </div>
          </div>
          <DialogFooter>
            <Button className="h-11" onClick={onSaved}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa tài khoản" : "Thêm tài khoản"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Tên hiển thị</Label>
            <Input
              id="display-name"
              className="h-11"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoFocus
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">
                Đổi tên hiển thị sẽ thay đổi trên mọi bảng lịch, kể cả lịch đã
                công bố.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <Input
              id="username"
              className="h-11"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value.toLowerCase())
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Vai trò</Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as "admin" | "staff")}
            >
              <SelectTrigger id="role" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Nhân viên</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              {isEdit ? "Mật khẩu mới (để trống nếu giữ nguyên)" : "Mật khẩu"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="password"
                className="h-11"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 shrink-0"
                onClick={() => setPassword(generatePassword())}
              >
                Tạo ngẫu nhiên
              </Button>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={onClose}
            >
              Huỷ
            </Button>
            <Button type="submit" className="h-11" disabled={loading}>
              {loading ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo tài khoản"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

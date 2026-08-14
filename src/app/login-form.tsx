"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { normalizeUsername, usernameToEmail } from "@/lib/auth/username";

const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30; // 30 ngày

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "inactive"
      ? "Tài khoản này đã ngừng hoạt động, liên hệ quản lý."
      : null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }

    setError(null);
    setLoading(true);

    const supabase = createClient(
      rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE } : { maxAge: undefined },
    );

    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: usernameToEmail(normalizedUsername),
        password,
      });

    if (signInError || !signInData.user) {
      setLoading(false);
      setError("Tên đăng nhập hoặc mật khẩu không đúng.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role, status")
      .eq("id", signInData.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Không tìm thấy hồ sơ tài khoản, liên hệ quản lý.");
      return;
    }

    if (profile.status === "inactive") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Tài khoản này đã ngừng hoạt động, liên hệ quản lý.");
      return;
    }

    router.push(profile.role === "admin" ? "/admin" : "/staff");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <h1 className="mb-6 text-xl font-semibold">Đăng nhập</h1>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                className="h-11"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-11 pr-11"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex h-11 items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={setRememberMe}
              />
              <Label htmlFor="remember" className="font-normal">
                Ghi nhớ đăng nhập
              </Label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Quên mật khẩu? Liên hệ quản lý để được cấp lại
        </p>
      </div>
    </main>
  );
}

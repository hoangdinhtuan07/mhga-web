"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type NavItem = { label: string; href: string; active: boolean };

// Thanh điều hướng dùng chung mọi trang sau đăng nhập — mục đang chọn là
// pill đen, mục còn lại chữ xám phẳng, không viền/nền.
export function AppHeader({
  role,
  active,
}: {
  role: "admin" | "staff";
  active: "home" | "accounts" | "schedule" | "register";
}) {
  const router = useRouter();

  const items: NavItem[] =
    role === "admin"
      ? [
          { label: "Trang chủ", href: "/admin", active: active === "home" },
          {
            label: "Quản lý tài khoản",
            href: "/admin/accounts",
            active: active === "accounts",
          },
          {
            label: "Xếp lịch làm việc",
            href: "/admin/schedule",
            active: active === "schedule",
          },
        ]
      : [
          { label: "Trang chủ", href: "/staff", active: active === "home" },
          {
            label: "Đăng ký lịch làm việc",
            href: "/register",
            active: active === "register",
          },
        ];

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="flex flex-wrap items-center gap-1.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex h-11 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors sm:flex-1",
            item.active
              ? "bg-[var(--fill-primary)] text-[var(--on-primary)]"
              : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
          )}
        >
          {item.label}
        </Link>
      ))}

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--surface-1)] text-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            •••
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {role === "admin" && active !== "register" && (
              <DropdownMenuItem onClick={() => router.push("/register")}>
                Đăng ký khoảng rảnh của tôi
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout}>Đăng xuất</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

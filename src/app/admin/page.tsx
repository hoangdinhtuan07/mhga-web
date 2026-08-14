import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/get-profile";
import { LogoutButton } from "@/components/logout-button";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminHomePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/staff");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm text-muted-foreground">Trang chủ Admin</p>
      <h1 className="text-2xl font-semibold">
        Xin chào, {profile.display_name}
      </h1>
      <p className="text-muted-foreground">Vai trò: Admin</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/admin/accounts"
          className={buttonVariants({ variant: "outline", className: "h-11" })}
        >
          Quản lý tài khoản
        </Link>
        <Link href="/register" className={buttonVariants({ className: "h-11" })}>
          Đăng ký lịch làm việc
        </Link>
      </div>
      <LogoutButton />
    </main>
  );
}

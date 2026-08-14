import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/get-profile";
import { LogoutButton } from "@/components/logout-button";
import { buttonVariants } from "@/components/ui/button";

export default async function StaffHomePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-sm text-muted-foreground">Trang chủ Nhân viên</p>
      <h1 className="text-2xl font-semibold">
        Xin chào, {profile.display_name}
      </h1>
      <p className="text-muted-foreground">
        Vai trò: {profile.role === "admin" ? "Admin" : "Nhân viên"}
      </p>
      <Link href="/register" className={buttonVariants({ className: "h-11" })}>
        Đăng ký lịch làm việc
      </Link>
      <LogoutButton />
    </main>
  );
}

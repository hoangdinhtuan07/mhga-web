import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import {
  resolveHomeSchedule,
  resolveSpecificWeek,
} from "@/lib/schedule/home-schedule";
import {
  addWeeks,
  getCurrentWeekMonday,
  getVnNow,
  parseDateKey,
  toDateKey,
} from "@/lib/schedule/week";
import { HomeMenu } from "@/components/schedule/home-menu";
import { PersonalWeekBlock } from "@/components/schedule/personal-week-block";
import { ReadonlyScheduleTable } from "@/components/schedule/readonly-schedule-table";
import { LogoutButton } from "@/components/logout-button";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/staff");

  const { week } = await searchParams;

  const supabase = await createClient();
  const [{ data: storesData }, home] = await Promise.all([
    supabase.from("stores").select("id, name").order("id"),
    week ? resolveSpecificWeek(supabase, week) : resolveHomeSchedule(supabase),
  ]);

  const stores = (storesData ?? []).map((s) => ({ id: s.id, name: s.name }));
  const storesById = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  // Nút chuyển tuần phải LUÔN hiện, kể cả khi tuần mặc định (hiện tại/tuần
  // trước) chưa có lịch nào — nếu không, admin không có cách nào duyệt tới
  // các tuần đã công bố khác. Dùng tuần hiện tại làm mốc khi chưa xem tuần
  // cụ thể nào và cũng chưa tìm thấy lịch mặc định.
  const referenceWeekStart =
    home?.weekStart ?? toDateKey(getCurrentWeekMonday(getVnNow()));
  const prevWeekStart = toDateKey(addWeeks(parseDateKey(referenceWeekStart), -1));
  const nextWeekStart = toDateKey(addWeeks(parseDateKey(referenceWeekStart), 1));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Trang chủ Admin</p>
          <h1 className="text-xl font-semibold">
            Xin chào, {profile.display_name}
          </h1>
        </div>
        <LogoutButton />
      </div>

      <HomeMenu
        items={[
          { label: "Xếp lịch làm việc", href: "/admin/schedule", locked: false },
          { label: "Quản lý tài khoản", href: "/admin/accounts", locked: false },
          { label: "Đăng ký khoảng rảnh của tôi", href: "/register", locked: false },
          { label: "Đào tạo", locked: true },
          { label: "Tra cứu thông tin tranh", locked: true },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {week
            ? `Đang xem tuần đã công bố: ${home?.weekLabel}`
            : home && !home.isCurrentWeek
              ? `Chưa có lịch tuần này — đang hiện lịch đã công bố gần nhất, tuần ${home.weekLabel}.`
              : home
                ? `Tuần ${home.weekLabel}`
                : "Chưa có lịch làm việc."}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/admin?week=${prevWeekStart}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            ◀ Tuần trước
          </Link>
          {week && (
            <Link
              href="/admin"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Về tuần hiện tại
            </Link>
          )}
          <Link
            href={`/admin?week=${nextWeekStart}`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Tuần sau ▶
          </Link>
        </div>
      </div>

      {home && home.assignments.length > 0 ? (
        <>
          <PersonalWeekBlock
            weekDays={home.weekDays}
            assignments={home.assignments}
            userId={profile.id}
            storesById={storesById}
          />
          <ReadonlyScheduleTable
            weekDays={home.weekDays}
            stores={stores}
            assignments={home.assignments}
            highlightUserId={profile.id}
          />
        </>
      ) : (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {week
            ? `Chưa có lịch đã công bố cho tuần ${home?.weekLabel}.`
            : "Chưa có lịch làm việc."}
        </p>
      )}
    </main>
  );
}

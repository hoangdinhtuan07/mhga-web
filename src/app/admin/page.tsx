import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarPlus, Users } from "lucide-react";
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
import { AppHeader } from "@/components/schedule/app-header";
import { HomeMenu } from "@/components/schedule/home-menu";
import { PersonalWeekBlock } from "@/components/schedule/personal-week-block";
import { ReadonlyScheduleTable } from "@/components/schedule/readonly-schedule-table";

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

  const referenceWeekStart =
    home?.weekStart ?? toDateKey(getCurrentWeekMonday(getVnNow()));
  const prevWeekStart = toDateKey(addWeeks(parseDateKey(referenceWeekStart), -1));
  const nextWeekStart = toDateKey(addWeeks(parseDateKey(referenceWeekStart), 1));
  const isViewingCurrent = !week && home?.isCurrentWeek;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <AppHeader role="admin" active="home" />

      <div>
        <h1 className="text-2xl font-semibold">Xin chào, {profile.display_name}</h1>
        <p className="text-muted-foreground">Admin · quản lý toàn hệ thống</p>
      </div>

      <HomeMenu
        items={[
          { label: "Xếp lịch làm việc", href: "/admin/schedule", locked: false, icon: CalendarPlus },
          { label: "Quản lý tài khoản", href: "/admin/accounts", locked: false, icon: Users },
          { label: "Đào tạo", locked: true, icon: CalendarPlus },
          { label: "Tra cứu thông tin tranh", locked: true, icon: CalendarPlus },
        ]}
      />

      {home && home.assignments.length > 0 && (
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
      )}

      {(!home || home.assignments.length === 0) && (
        <p className="rounded-[var(--radius)] border border-dashed p-6 text-center text-sm text-muted-foreground">
          {week
            ? `Chưa có lịch đã công bố cho tuần ${home?.weekLabel}.`
            : "Chưa có lịch làm việc."}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <Link
          href={`/admin?week=${prevWeekStart}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ‹ Tuần trước
        </Link>
        <span className="font-semibold">
          {home ? (
            <>
              Lịch tuần {home.weekLabel}
              {isViewingCurrent ? " (tuần này)" : ""}
            </>
          ) : (
            "Chưa có lịch làm việc"
          )}
        </span>
        <Link
          href={`/admin?week=${nextWeekStart}`}
          className="text-muted-foreground hover:text-foreground"
        >
          Tuần sau ›
        </Link>
      </div>
      {week && (
        <p className="text-center text-sm">
          <Link href="/admin" className="text-muted-foreground underline hover:text-foreground">
            Về tuần hiện tại
          </Link>
        </p>
      )}
    </main>
  );
}

import { redirect } from "next/navigation";
import { CalendarPlus } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import { resolveHomeSchedule } from "@/lib/schedule/home-schedule";
import { AppHeader } from "@/components/schedule/app-header";
import { HomeMenu } from "@/components/schedule/home-menu";
import { PersonalWeekBlock } from "@/components/schedule/personal-week-block";
import { ReadonlyScheduleTable } from "@/components/schedule/readonly-schedule-table";

export default async function StaffHomePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");

  const supabase = await createClient();
  const [{ data: storesData }, home] = await Promise.all([
    supabase.from("stores").select("id, name").order("id"),
    resolveHomeSchedule(supabase),
  ]);

  const stores = (storesData ?? []).map((s) => ({ id: s.id, name: s.name }));
  const storesById = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <AppHeader role="staff" active="home" />

      <div>
        <h1 className="text-2xl font-semibold">Xin chào, {profile.display_name}</h1>
        <p className="text-muted-foreground">Nhân viên</p>
      </div>

      <HomeMenu
        items={[
          { label: "Đăng ký lịch làm việc", href: "/register", locked: false, icon: CalendarPlus },
          { label: "Đào tạo", locked: true, icon: CalendarPlus },
          { label: "Tra cứu thông tin tranh", locked: true, icon: CalendarPlus },
        ]}
      />

      {home ? (
        <>
          <PersonalWeekBlock
            weekDays={home.weekDays}
            assignments={home.assignments}
            userId={profile.id}
            storesById={storesById}
          />

          <p className="text-center text-sm text-muted-foreground">
            {home.isCurrentWeek ? (
              <>Lịch tuần {home.weekLabel} (tuần này)</>
            ) : (
              <>Chưa có lịch tuần này — đang hiện lịch đã công bố gần nhất, tuần {home.weekLabel}.</>
            )}
          </p>

          <ReadonlyScheduleTable
            weekDays={home.weekDays}
            stores={stores}
            assignments={home.assignments}
            highlightUserId={profile.id}
          />
        </>
      ) : (
        <p className="rounded-[var(--radius)] border border-dashed p-6 text-center text-sm text-muted-foreground">
          Chưa có lịch làm việc.
        </p>
      )}
    </main>
  );
}

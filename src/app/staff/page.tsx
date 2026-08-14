import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import { resolveHomeSchedule } from "@/lib/schedule/home-schedule";
import { HomeMenu } from "@/components/schedule/home-menu";
import { PersonalWeekBlock } from "@/components/schedule/personal-week-block";
import { ReadonlyScheduleTable } from "@/components/schedule/readonly-schedule-table";
import { LogoutButton } from "@/components/logout-button";

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Trang chủ Nhân viên</p>
          <h1 className="text-xl font-semibold">
            Xin chào, {profile.display_name}
          </h1>
        </div>
        <LogoutButton />
      </div>

      <HomeMenu
        items={[
          { label: "Đăng ký lịch làm việc", href: "/register", locked: false },
          { label: "Đào tạo", locked: true },
          { label: "Tra cứu thông tin tranh", locked: true },
        ]}
      />

      {home ? (
        <>
          {!home.isCurrentWeek && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
              Chưa có lịch tuần này — đang hiện lịch đã công bố gần nhất, tuần{" "}
              {home.weekLabel}.
            </p>
          )}
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
          Chưa có lịch làm việc.
        </p>
      )}
    </main>
  );
}

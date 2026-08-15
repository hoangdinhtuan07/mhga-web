import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import {
  daysUntilDeadline,
  formatWeekLabel,
  getTargetRegistrationWeekMonday,
  getVnNow,
  getWeekDays,
  isRegistrationLocked,
  toDateKey,
} from "@/lib/schedule/week";
import { slotsFromRanges, type DaySelection } from "@/lib/schedule/registration";
import { AppHeader } from "@/components/schedule/app-header";
import { RegistrationGrid } from "./registration-grid";

export default async function RegisterPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");

  const now = getVnNow();
  const targetMonday = getTargetRegistrationWeekMonday(now);
  const weekStart = toDateKey(targetMonday);
  const weekDays = getWeekDays(targetMonday).map(toDateKey);
  const weekLabel = formatWeekLabel(targetMonday);
  const daysLeft = daysUntilDeadline(now);

  const supabase = await createClient();
  const [{ data: rows }, { data: published }] = await Promise.all([
    supabase
      .from("registrations")
      .select("reg_date, start_hour, end_hour")
      .eq("user_id", profile.id)
      .eq("week_start", weekStart),
    supabase
      .from("schedule")
      .select("id")
      .eq("week_start", weekStart)
      .eq("status", "published")
      .limit(1),
  ]);

  // Khoá do hết hạn (Chủ nhật) HOẶC do admin đã công bố lịch tuần này sớm
  // hơn dự kiến (mục 4.3, Bước 4: "đồng thời khoá không cho sửa đăng ký").
  const locked = isRegistrationLocked(now) || (published ?? []).length > 0;

  const initialSelections: Record<string, DaySelection> = {};
  for (const day of weekDays) {
    const dayRanges = (rows ?? []).filter((r) => r.reg_date === day);
    initialSelections[day] = slotsFromRanges(dayRanges);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
      <AppHeader role={profile.role} active="register" />
      <RegistrationGrid
        weekDays={weekDays}
        weekLabel={weekLabel}
        locked={locked}
        daysLeft={daysLeft}
        initialSelections={initialSelections}
      />
    </main>
  );
}

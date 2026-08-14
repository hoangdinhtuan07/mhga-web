import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import {
  formatWeekLabel,
  getTargetRegistrationWeekMonday,
  getVnNow,
  getWeekDays,
  toDateKey,
} from "@/lib/schedule/week";
import { slotsFromRanges, type DaySelection } from "@/lib/schedule/registration";
import { ScheduleWizard } from "./schedule-wizard";
import type { EmployeeRegistration } from "./registration-overview-table";

export default async function AdminSchedulePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/staff");

  const now = getVnNow();
  const targetMonday = getTargetRegistrationWeekMonday(now);
  const weekStart = toDateKey(targetMonday);
  const weekDays = getWeekDays(targetMonday).map(toDateKey);
  const weekLabel = formatWeekLabel(targetMonday);

  const supabase = await createClient();

  const [{ data: users }, { data: registrations }] = await Promise.all([
    supabase
      .from("users")
      .select("id, display_name")
      .eq("status", "active")
      .order("display_name", { ascending: true }),
    supabase
      .from("registrations")
      .select("user_id, reg_date, start_hour, end_hour")
      .eq("week_start", weekStart),
  ]);

  const employees: EmployeeRegistration[] = (users ?? []).map((u) => {
    const selections: Record<string, DaySelection> = {};
    for (const day of weekDays) {
      const dayRanges = (registrations ?? []).filter(
        (r) => r.user_id === u.id && r.reg_date === day,
      );
      selections[day] = slotsFromRanges(dayRanges);
    }
    return { id: u.id, displayName: u.display_name, selections };
  });

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <ScheduleWizard
        weekLabel={weekLabel}
        weekDays={weekDays}
        employees={employees}
      />
    </main>
  );
}

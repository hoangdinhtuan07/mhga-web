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
import { RegistrationGrid } from "./registration-grid";

export default async function RegisterPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");

  const now = getVnNow();
  const targetMonday = getTargetRegistrationWeekMonday(now);
  const weekStart = toDateKey(targetMonday);
  const weekDays = getWeekDays(targetMonday).map(toDateKey);
  const weekLabel = formatWeekLabel(targetMonday);
  const locked = isRegistrationLocked(now);
  const daysLeft = daysUntilDeadline(now);

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("registrations")
    .select("reg_date, start_hour, end_hour")
    .eq("user_id", profile.id)
    .eq("week_start", weekStart);

  const initialSelections: Record<string, DaySelection> = {};
  for (const day of weekDays) {
    const dayRanges = (rows ?? []).filter((r) => r.reg_date === day);
    initialSelections[day] = slotsFromRanges(dayRanges);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 md:p-8">
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

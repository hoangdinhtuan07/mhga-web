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
import type { ScheduleAssignment } from "@/lib/schedule/assignment";
import { AppHeader } from "@/components/schedule/app-header";
import { ScheduleWizard } from "./schedule-wizard";
import type { EmployeeRegistration } from "./registration-overview-table";
import type { StoreDef } from "./assignment-table";

// runSuggestion (Bước 2) có thể chạy tới ~15-20s ở quy mô 25 người (bộ giải
// JS thuần không tuân thủ timeout nội bộ chặt chẽ) — nới trần thời gian
// chạy Server Action trên Vercel qua route segment config của trang gọi nó.
export const maxDuration = 30;

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

  const [
    { data: users },
    { data: registrations },
    { data: storesData },
    { data: shiftsData },
    { data: scheduleRows },
    { data: publishedRows },
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id, display_name")
      .eq("status", "active")
      .order("display_name", { ascending: true }),
    supabase
      .from("registrations")
      .select("user_id, reg_date, start_hour, end_hour")
      .eq("week_start", weekStart),
    supabase.from("stores").select("id, name, allowed_shift_ids").order("id"),
    supabase.from("shifts").select("id, start_hour, end_hour").order("id"),
    supabase
      .from("schedule")
      .select(
        "id, user_id, store_id, work_date, start_hour, end_hour, source, users(display_name)",
      )
      .eq("week_start", weekStart)
      .eq("status", "draft"),
    supabase
      .from("schedule")
      .select("id")
      .eq("week_start", weekStart)
      .eq("status", "published")
      .limit(1),
  ]);

  // Đã công bố thì bảng nháp trống trơn (mọi ca đã chuyển sang published) —
  // cần cờ riêng để giao diện báo rõ lý do thay vì trông như bị xoá sạch.
  const isPublished = (publishedRows ?? []).length > 0;

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

  const stores: StoreDef[] = (storesData ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    allowedShiftIds: s.allowed_shift_ids,
  }));

  const shifts = (shiftsData ?? []).map((s) => ({
    id: s.id,
    startHour: s.start_hour,
    endHour: s.end_hour,
  }));

  const assignments: ScheduleAssignment[] = (scheduleRows ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    displayName:
      (r.users as unknown as { display_name: string } | null)?.display_name ?? "?",
    storeId: r.store_id,
    workDate: r.work_date,
    startHour: r.start_hour,
    endHour: r.end_hour,
    source: r.source as "auto" | "manual",
  }));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <AppHeader role="admin" active="schedule" />
      <ScheduleWizard
        weekStart={weekStart}
        weekLabel={weekLabel}
        weekDays={weekDays}
        employees={employees}
        stores={stores}
        shifts={shifts}
        assignments={assignments}
        isPublished={isPublished}
      />
    </main>
  );
}

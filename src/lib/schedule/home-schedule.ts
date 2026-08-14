import type { createClient } from "@/lib/supabase/server";
import {
  addWeeks,
  formatWeekLabel,
  getCurrentWeekMonday,
  getVnNow,
  getWeekDays,
  parseDateKey,
  toDateKey,
} from "@/lib/schedule/week";
import type { ScheduleAssignment } from "@/lib/schedule/assignment";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type HomeScheduleData = {
  weekStart: string;
  weekDays: string[];
  weekLabel: string;
  isCurrentWeek: boolean;
  assignments: ScheduleAssignment[];
};

async function fetchPublishedWeek(
  supabase: SupabaseServerClient,
  weekStart: string,
): Promise<ScheduleAssignment[]> {
  const { data } = await supabase
    .from("schedule")
    .select(
      "id, user_id, store_id, work_date, start_hour, end_hour, source, users(display_name)",
    )
    .eq("week_start", weekStart)
    .eq("status", "published");

  return (data ?? []).map((r) => ({
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
}

/**
 * Trang chủ (mục 4.2): ưu tiên lịch đã công bố của tuần hiện tại; nếu chưa
 * có thì lùi về lịch tuần trước (kèm nhãn); nếu chưa có lịch nào cả thì
 * trả về null để trang hiện "Chưa có lịch làm việc".
 */
export async function resolveHomeSchedule(
  supabase: SupabaseServerClient,
): Promise<HomeScheduleData | null> {
  const currentMonday = getCurrentWeekMonday(getVnNow());

  const currentWeekStart = toDateKey(currentMonday);
  const currentAssignments = await fetchPublishedWeek(supabase, currentWeekStart);
  if (currentAssignments.length > 0) {
    return {
      weekStart: currentWeekStart,
      weekDays: getWeekDays(currentMonday).map(toDateKey),
      weekLabel: formatWeekLabel(currentMonday),
      isCurrentWeek: true,
      assignments: currentAssignments,
    };
  }

  const previousMonday = addWeeks(currentMonday, -1);
  const previousWeekStart = toDateKey(previousMonday);
  const previousAssignments = await fetchPublishedWeek(supabase, previousWeekStart);
  if (previousAssignments.length > 0) {
    return {
      weekStart: previousWeekStart,
      weekDays: getWeekDays(previousMonday).map(toDateKey),
      weekLabel: formatWeekLabel(previousMonday),
      isCurrentWeek: false,
      assignments: previousAssignments,
    };
  }

  return null;
}

// Admin xem một tuần cụ thể trong quá khứ (nút chuyển tuần, mục 4.3) — luôn
// trả về dữ liệu (kể cả rỗng) để vẫn giữ được điều khiển chuyển tuần.
export async function resolveSpecificWeek(
  supabase: SupabaseServerClient,
  weekStartKey: string,
): Promise<HomeScheduleData> {
  const monday = parseDateKey(weekStartKey);
  const assignments = await fetchPublishedWeek(supabase, weekStartKey);
  return {
    weekStart: weekStartKey,
    weekDays: getWeekDays(monday).map(toDateKey),
    weekLabel: formatWeekLabel(monday),
    isCurrentWeek: false,
    assignments,
  };
}

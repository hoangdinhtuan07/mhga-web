"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getTargetRegistrationWeekMonday,
  getVnNow,
  isRegistrationLocked,
  toDateKey,
} from "@/lib/schedule/week";
import {
  isValidDaySelection,
  mergeSelectedSlots,
  type DaySelection,
} from "@/lib/schedule/registration";

export type SaveRegistrationsResult =
  | { success: true }
  | { success: false; error: string };

export async function saveRegistrations(
  entries: Record<string, DaySelection>,
): Promise<SaveRegistrationsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: "Phiên đăng nhập đã hết hạn, tải lại trang.",
    };
  }

  // Không tin thời điểm/tuần phía client — server tự tính lại để chặn dữ
  // liệu cũ hoặc bị can thiệp ghi nhầm sang tuần khác.
  const now = getVnNow();
  if (isRegistrationLocked(now)) {
    return { success: false, error: "Đã hết hạn đăng ký cho tuần này." };
  }

  for (const [regDate, selection] of Object.entries(entries)) {
    if (!isValidDaySelection(selection)) {
      return {
        success: false,
        error: `Khoảng giờ ngày ${regDate} chưa hợp lệ, tải lại trang và thử lại.`,
      };
    }
  }

  const targetMonday = getTargetRegistrationWeekMonday(now);
  const weekStart = toDateKey(targetMonday);

  const payload = Object.entries(entries).flatMap(([regDate, selection]) =>
    mergeSelectedSlots(selection).map((range) => ({
      reg_date: regDate,
      start_hour: range.start,
      end_hour: range.end,
    })),
  );

  const { error } = await supabase.rpc("save_registrations", {
    p_week_start: weekStart,
    p_entries: payload,
  });

  if (error) {
    return { success: false, error: "Không lưu được, thử lại." };
  }

  return { success: true };
}

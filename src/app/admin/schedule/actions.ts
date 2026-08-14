"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isOverlapping } from "@/lib/schedule/assignment";

export type ActionResult = { success: true } | { success: false; error: string };

export async function assignShift(input: {
  weekStart: string;
  storeId: number;
  shiftId: number;
  day: string;
  userId: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Không có quyền." };

  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, allowed_shift_ids")
    .eq("id", input.storeId)
    .single();
  if (!store || !store.allowed_shift_ids.includes(input.shiftId)) {
    return { success: false, error: "Ca không thuộc cấu hình cửa hàng này." };
  }

  const { data: shift } = await supabase
    .from("shifts")
    .select("id, start_hour, end_hour")
    .eq("id", input.shiftId)
    .single();
  if (!shift) {
    return { success: false, error: "Không tìm thấy ca." };
  }

  const { data: existingRows } = await supabase
    .from("schedule")
    .select("start_hour, end_hour")
    .eq("user_id", input.userId)
    .eq("week_start", input.weekStart)
    .eq("work_date", input.day);

  const busy = (existingRows ?? []).some((r) =>
    isOverlapping(
      { start: r.start_hour, end: r.end_hour },
      { start: shift.start_hour, end: shift.end_hour },
    ),
  );
  if (busy) {
    return {
      success: false,
      error: "Người này đã có ca trùng giờ ở cửa hàng khác.",
    };
  }

  const { error } = await supabase.from("schedule").insert({
    user_id: input.userId,
    week_start: input.weekStart,
    work_date: input.day,
    start_hour: shift.start_hour,
    end_hour: shift.end_hour,
    store_id: input.storeId,
    source: "manual",
    status: "draft",
  });

  if (error) {
    return { success: false, error: "Không lưu được, thử lại." };
  }

  return { success: true };
}

export async function unassignShift(scheduleId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Không có quyền." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    return { success: false, error: "Không xoá được, thử lại." };
  }

  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { isOverlapping } from "@/lib/schedule/assignment";
import { getWeekDays, parseDateKey, toDateKey } from "@/lib/schedule/week";
import {
  countCoveredWindows,
  runSolver,
  type SolverAvailability,
} from "@/lib/schedule/solver";

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

// Vá tay ở bảng xem lại (mục 4.3): khoảng giờ tuỳ ý (thường là lát cắt hoặc
// giao giữa lát cắt và khoảng rảnh), được phép vượt cấu hình ca của cửa
// hàng — khác assignShift ở chỗ không kiểm tra allowed_shift_ids.
export async function patchGap(input: {
  weekStart: string;
  storeId: number;
  day: string;
  userId: string;
  startHour: number;
  endHour: number;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Không có quyền." };

  if (
    input.startHour >= input.endHour ||
    input.startHour < 9 ||
    input.endHour > 22
  ) {
    return { success: false, error: "Khoảng giờ không hợp lệ." };
  }

  const supabase = await createClient();

  const { data: existingRows } = await supabase
    .from("schedule")
    .select("start_hour, end_hour")
    .eq("user_id", input.userId)
    .eq("week_start", input.weekStart)
    .eq("work_date", input.day);

  const busy = (existingRows ?? []).some((r) =>
    isOverlapping(
      { start: r.start_hour, end: r.end_hour },
      { start: input.startHour, end: input.endHour },
    ),
  );
  if (busy) {
    return { success: false, error: "Người này đã có ca trùng giờ." };
  }

  const { error } = await supabase.from("schedule").insert({
    user_id: input.userId,
    week_start: input.weekStart,
    work_date: input.day,
    start_hour: input.startHour,
    end_hour: input.endHour,
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

export type SuggestionResult =
  | {
      success: true;
      log: string[];
      warning: string | null;
      method: "ilp" | "greedy";
    }
  | { success: false; error: string };

// Bước 2 (mục 4.3, 5): chạy bộ giải, XOÁ toàn bộ ca nháp hiện có của tuần
// (kể cả vá tay — admin đã được cảnh báo trước ở giao diện) rồi ghi kết quả
// mới với nguồn = auto.
export async function runSuggestion(weekStart: string): Promise<SuggestionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Không có quyền." };

  const supabase = await createClient();
  const weekDays = getWeekDays(parseDateKey(weekStart)).map(toDateKey);

  const [{ data: users }, { data: registrations }, { data: storesData }, { data: shiftsData }] =
    await Promise.all([
      supabase.from("users").select("id, display_name").eq("status", "active"),
      supabase
        .from("registrations")
        .select("user_id, reg_date, start_hour, end_hour")
        .eq("week_start", weekStart),
      supabase.from("stores").select("id, allowed_shift_ids"),
      supabase.from("shifts").select("id, start_hour, end_hour"),
    ]);

  const employees = (users ?? []).map((u) => ({ id: u.id, displayName: u.display_name }));
  const stores = (storesData ?? []).map((s) => ({
    id: s.id,
    allowedShiftIds: s.allowed_shift_ids as number[],
  }));
  const shifts = (shiftsData ?? []).map((s) => ({
    id: s.id,
    startHour: s.start_hour,
    endHour: s.end_hour,
  }));

  const availability: SolverAvailability = {};
  for (const emp of employees) availability[emp.id] = {};
  for (const r of registrations ?? []) {
    if (!availability[r.user_id]) availability[r.user_id] = {};
    if (!availability[r.user_id][r.reg_date]) availability[r.user_id][r.reg_date] = [];
    availability[r.user_id][r.reg_date].push({ start: r.start_hour, end: r.end_hour });
  }

  const log: string[] = [
    `✓ Đã tải dữ liệu: ${employees.length} nhân viên, ${stores.length} cửa hàng, ${(registrations ?? []).length} khoảng đăng ký`,
  ];

  const { assignments, method } = runSolver(employees, stores, shifts, weekDays, availability);

  log.push(
    method === "ilp"
      ? "✓ Giải xong bằng quy hoạch nguyên (ILP)"
      : "✓ ILP lỗi hoặc quá thời gian — dùng thuật toán dự phòng (greedy)",
  );

  const { error: deleteError } = await supabase
    .from("schedule")
    .delete()
    .eq("week_start", weekStart)
    .eq("status", "draft");
  if (deleteError) {
    return { success: false, error: "Không dọn được lịch nháp cũ, thử lại." };
  }

  if (assignments.length > 0) {
    const rows = assignments.map((a) => ({
      user_id: a.userId,
      week_start: weekStart,
      work_date: a.day,
      start_hour: a.startHour,
      end_hour: a.endHour,
      store_id: a.storeId,
      source: "auto" as const,
      status: "draft" as const,
    }));
    const { error: insertError } = await supabase.from("schedule").insert(rows);
    if (insertError) {
      return { success: false, error: "Không lưu được kết quả, thử lại." };
    }
  }

  log.push(`✓ Đã ghi ${assignments.length} ca vào lịch nháp`);

  const { covered, total } = countCoveredWindows(assignments, stores, weekDays);
  const percent = total > 0 ? Math.round((covered / total) * 100) : 100;
  log.push(`Phủ được ${covered}/${total} khung giờ (${percent}%)`);

  const warning =
    covered < total
      ? `Còn ${total - covered} khung giờ (giờ) chưa có người — sang Bước 3 để vá tay.`
      : null;

  return { success: true, log, warning, method };
}

export type EditDraftCellResult =
  | { success: true; skippedNames: string[] }
  | { success: false; error: string };

// Bước 4 (mục 4.3): sửa trực tiếp 1 ô trong bảng lịch nháp. Cắt các ca dài
// đang chồng lên khoảng đang sửa thay vì xoá cả ca, giữ đúng phần ngoài
// khoảng — phần giữ nguyên giữ lại nguồn (auto/manual) gốc; phần mới ghi
// đè trong khoảng đang sửa luôn đánh dấu nguồn = manual.
export async function editDraftCell(input: {
  weekStart: string;
  storeId: number;
  day: string;
  startHour: number;
  endHour: number;
  rawNames: string;
}): Promise<EditDraftCellResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Không có quyền." };

  const supabase = await createClient();

  const names = input.rawNames
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const { data: activeUsers } = await supabase
    .from("users")
    .select("id, display_name")
    .eq("status", "active");

  const byName = new Map((activeUsers ?? []).map((u) => [u.display_name, u.id]));

  const validIds: string[] = [];
  const skippedNames: string[] = [];
  for (const name of names) {
    const id = byName.get(name);
    if (id) {
      if (!validIds.includes(id)) validIds.push(id);
    } else {
      skippedNames.push(name);
    }
  }

  const { data: overlapping } = await supabase
    .from("schedule")
    .select("id, user_id, start_hour, end_hour, source")
    .eq("week_start", input.weekStart)
    .eq("store_id", input.storeId)
    .eq("work_date", input.day)
    .lt("start_hour", input.endHour)
    .gt("end_hour", input.startHour);

  const idsToDelete = (overlapping ?? []).map((r) => r.id);
  const remainderRows: {
    user_id: string;
    start_hour: number;
    end_hour: number;
    source: "auto" | "manual";
  }[] = [];

  for (const row of overlapping ?? []) {
    if (row.start_hour < input.startHour) {
      remainderRows.push({
        user_id: row.user_id,
        start_hour: row.start_hour,
        end_hour: input.startHour,
        source: row.source as "auto" | "manual",
      });
    }
    if (row.end_hour > input.endHour) {
      remainderRows.push({
        user_id: row.user_id,
        start_hour: input.endHour,
        end_hour: row.end_hour,
        source: row.source as "auto" | "manual",
      });
    }
  }

  if (idsToDelete.length > 0) {
    const { error: delError } = await supabase.from("schedule").delete().in("id", idsToDelete);
    if (delError) return { success: false, error: "Không lưu được, thử lại." };
  }

  const newRows = [
    ...remainderRows.map((r) => ({
      user_id: r.user_id,
      week_start: input.weekStart,
      work_date: input.day,
      start_hour: r.start_hour,
      end_hour: r.end_hour,
      store_id: input.storeId,
      source: r.source,
      status: "draft" as const,
    })),
    ...validIds.map((userId) => ({
      user_id: userId,
      week_start: input.weekStart,
      work_date: input.day,
      start_hour: input.startHour,
      end_hour: input.endHour,
      store_id: input.storeId,
      source: "manual" as const,
      status: "draft" as const,
    })),
  ];

  if (newRows.length > 0) {
    const { error: insError } = await supabase.from("schedule").insert(newRows);
    if (insError) return { success: false, error: "Không lưu được, thử lại." };
  }

  return { success: true, skippedNames };
}

// Bước 4: công bố lịch chính thức — chuyển toàn bộ ca nháp của tuần này
// sang published, đồng thời khoá đăng ký của tuần đó (kiểm tra ở
// src/app/register/page.tsx và actions.ts).
export async function publishSchedule(weekStart: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Không có quyền." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule")
    .update({ status: "published" })
    .eq("week_start", weekStart)
    .eq("status", "draft");

  if (error) {
    return { success: false, error: "Không công bố được, thử lại." };
  }

  return { success: true };
}

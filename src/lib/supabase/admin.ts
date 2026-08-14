import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * CHỈ dùng ở server (Route Handler). service_role key bỏ qua RLS và có
 * quyền quản lý Supabase Auth (tạo/xoá/đổi mật khẩu user) — tuyệt đối
 * không import file này vào Client Component hay để lộ
 * SUPABASE_SERVICE_ROLE_KEY ra phía trình duyệt (biến này không có tiền
 * tố NEXT_PUBLIC_ nên Next.js không bao giờ đưa nó vào bundle client).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

import { createClient } from "@/lib/supabase/server";

export type AdminProfile = {
  id: string;
  display_name: string;
  username: string;
  role: "admin";
  status: "active";
};

/**
 * Xác thực người gọi API là admin đang hoạt động, dựa trên session cookie
 * (không phải service_role key) — dùng ở đầu mọi Route Handler quản lý
 * tài khoản để chặn người không có quyền gọi thẳng API.
 */
export async function requireAdmin(): Promise<AdminProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("id, display_name, username, role, status")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || profile.status !== "active") {
    return null;
  }

  return profile as AdminProfile;
}

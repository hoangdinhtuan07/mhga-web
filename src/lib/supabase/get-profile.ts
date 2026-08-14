import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  display_name: string;
  username: string;
  role: "admin" | "staff";
  status: "active" | "inactive";
};

export async function getCurrentProfile(): Promise<Profile | null> {
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

  return profile;
}

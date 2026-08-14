import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/supabase/get-profile";
import { createClient } from "@/lib/supabase/server";
import { AccountsTable, type AccountRow } from "./accounts-table";

export default async function AccountsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/");
  if (profile.role !== "admin") redirect("/staff");

  const supabase = await createClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, display_name, username, role, status")
    .order("display_name", { ascending: true });

  const accounts = (users ?? []) as AccountRow[];
  const total = accounts.length;
  const activeCount = accounts.filter((u) => u.status === "active").length;
  const adminCount = accounts.filter((u) => u.role === "admin").length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Quản lý tài khoản</h1>
        <p className="text-sm text-muted-foreground">
          Tổng {total} tài khoản · {activeCount} đang làm · {adminCount} admin
        </p>
      </div>

      <AccountsTable accounts={accounts} currentUserId={profile.id} />
    </main>
  );
}

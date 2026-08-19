import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/workspace";
import { canManageMembers } from "@/lib/roles";
import AppShell from "@/components/AppShell";
import AutoRefresh from "@/components/AutoRefresh";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getMemberRole(user.id) : null;

  return (
    <AppShell isAdmin={canManageMembers(role)} email={user?.email}>
      <AutoRefresh />
      {children}
    </AppShell>
  );
}

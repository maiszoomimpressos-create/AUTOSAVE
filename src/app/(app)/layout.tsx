import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/workspace";
import { canManageMembers } from "@/lib/roles";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

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
    <div className="min-h-full bg-paper">
      <Sidebar isAdmin={canManageMembers(role)} />
      <div className="pl-60">
        <TopBar email={user?.email} />
        <main className="px-4 pb-8">{children}</main>
      </div>
    </div>
  );
}

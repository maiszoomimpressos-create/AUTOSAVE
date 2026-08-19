import { createClient } from "@/lib/supabase/server";
import PortalShell from "@/components/PortalShell";
import AutoRefresh from "@/components/AutoRefresh";
import { getClientProfile, isClientProfileComplete } from "@/lib/client-profile";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getClientProfile(user?.id ?? "");
  const profileIncomplete = !isClientProfileComplete(profile);

  return (
    <PortalShell email={user?.email} profileIncomplete={profileIncomplete}>
      <AutoRefresh />
      {children}
    </PortalShell>
  );
}

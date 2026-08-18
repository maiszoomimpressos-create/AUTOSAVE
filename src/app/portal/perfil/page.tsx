import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import ClientProfileForm from "@/components/ClientProfileForm";
import { getClientProfile, isClientProfileComplete } from "@/lib/client-profile";

export default async function PortalPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getClientProfile(user?.id ?? "");
  const complete = isClientProfileComplete(profile);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-ink">Perfil</h1>
            <p className="mt-1 text-sm text-ink-muted">{user?.email}</p>
          </div>
          {!complete && (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600" aria-hidden />
              Perfil incompleto
            </span>
          )}
        </div>
      </div>

      <ClientProfileForm profile={profile} />

      <ChangePasswordForm />
    </div>
  );
}

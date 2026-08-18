import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function PortalPerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Perfil</h1>
        <p className="mt-1 text-sm text-ink-muted">{user?.email}</p>
      </div>

      <ChangePasswordForm />
    </div>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import StatTile from "@/components/StatTile";
import { getClientProfile, isClientProfileComplete } from "@/lib/client-profile";

export default async function PortalDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const userId = user?.id ?? "";

  const profile = await getClientProfile(userId);
  const profileIncomplete = !isClientProfileComplete(profile);

  const [{ count: total }, { count: approved }, { count: pending }] = await Promise.all([
    admin
      .from("api_key_requests")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", userId),
    admin
      .from("api_key_requests")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", userId)
      .eq("status", "approved"),
    admin
      .from("api_key_requests")
      .select("id", { count: "exact", head: true })
      .eq("requested_by", userId)
      .eq("status", "pending"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-8">
        <h1 className="text-xl font-semibold text-ink">Bem-vindo</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Use o menu à esquerda para pedir acesso à API e acompanhar suas chaves.
        </p>
      </div>

      {profileIncomplete && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            ⚠ Seu perfil está incompleto — complete nome, CPF/CNPJ e telefone
            pra deixar seus pedidos de API vinculados a um perfil PF ou PJ.
          </p>
          <Link
            href="/portal/perfil"
            className="whitespace-nowrap rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
          >
            Completar perfil
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Pedidos de API" value={total ?? 0} icon="🔌" />
        <StatTile label="Aprovados" value={approved ?? 0} icon="✅" />
        <StatTile label="Em análise" value={pending ?? 0} icon="⏳" />
      </div>

      <div className="rounded-xl border border-line bg-elevated p-6">
        <h2 className="text-base font-semibold text-ink">Pronto pra integrar?</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Peça acesso a um tipo de dado e, assim que for aprovado, sua chave de
          API fica disponível aqui.
        </p>
        <Link
          href="/portal/pedir-api"
          className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong"
        >
          Pedir acesso à API
        </Link>
      </div>
    </div>
  );
}

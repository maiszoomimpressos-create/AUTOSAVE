import { createAdminClient } from "@/lib/supabase/admin";
import StatTile from "@/components/StatTile";

export default async function Home() {
  const supabase = createAdminClient();
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;

  const [{ count: vehicleCount }, { count: customerCount }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-8">
        <h1 className="text-xl font-semibold text-ink">Bem-vindo</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Use o menu à esquerda para navegar.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Usuários cadastrados" value={customerCount ?? 0} icon="🙍" />
        <StatTile label="Veículos cadastrados" value={vehicleCount ?? 0} icon="🚗" />
      </div>
    </div>
  );
}

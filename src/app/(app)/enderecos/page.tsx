import { createAdminClient } from "@/lib/supabase/admin";
import PlaceTable from "@/components/PlaceTable";

const COLUMNS = [
  { key: "name", label: "Nome" },
  { key: "address", label: "Endereço" },
  { key: "lat", label: "Latitude" },
  { key: "lng", label: "Longitude" },
  { key: "query_norm", label: "Busca" },
  { key: "source", label: "Fonte" },
  { key: "status", label: "Status" },
  { key: "fetched_at_fmt", label: "Buscado em" },
  { key: "expires_at_fmt", label: "Expira em" },
  { key: "place_id", label: "ID do local" },
];

function fmt(v: unknown): string | null {
  return v ? new Date(String(v)).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;
}

export default async function EnderecosPage() {
  const { data, error } = await createAdminClient()
    .from("places_cache")
    .select("id, name, address, lat, lng, query_norm, source, place_id, fetched_at, expires_at, invalidated_at")
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
    .order("fetched_at", { ascending: false })
    .limit(1000);

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        Erro ao carregar os endereços: {error.message}
      </div>
    );
  }

  const now = Date.now();
  const rows = (data ?? []).map((r) => ({
    ...r,
    status: r.invalidated_at
      ? "Local errado"
      : new Date(r.expires_at).getTime() < now
        ? "Expirado"
        : "Válido",
    fetched_at_fmt: fmt(r.fetched_at),
    expires_at_fmt: fmt(r.expires_at),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Endereços</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {rows.length} endereço(s) salvos pela busca da API (MAI Drive e outros parceiros).
          Cada resultado fica guardado por 90 dias; marcado como &quot;Local errado&quot;, ele deixa
          de ser usado e a próxima busca consulta o provedor de novo.
        </p>
      </div>
      <PlaceTable
        columns={COLUMNS}
        rows={rows}
        defaultVisible={["name", "address", "source", "status", "expires_at_fmt"]}
        emptyMessage="Nenhum endereço salvo ainda."
      />
    </div>
  );
}

import { createAdminClient } from "@/lib/supabase/admin";
import PlaceTable from "@/components/PlaceTable";
import { mergeAddress, parseBrazilianAddress, type StructuredAddress } from "@/lib/places-address";

const COLUMNS = [
  { key: "name", label: "Nome" },
  { key: "street", label: "Rua" },
  { key: "street_number", label: "Número" },
  { key: "neighborhood", label: "Bairro" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "UF" },
  { key: "postal_code", label: "CEP" },
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

function currentTime(): number {
  return Date.now();
}

export default async function EnderecosPage() {
  const base = "id, name, address, lat, lng, query_norm, source, place_id, fetched_at, expires_at, invalidated_at";
  const load = (cols: string) =>
    createAdminClient()
      .from("places_cache")
      .select(cols)
      .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
      .order("fetched_at", { ascending: false })
      .limit(1000);
  // Antes da migration 20261024000000 as colunas de endereco nao existem:
  // carrega as antigas e deriva rua/numero/bairro/cidade/UF/CEP do texto.
  let { data, error } = await load(`${base}, street, street_number, neighborhood, city, state, postal_code`);
  if (error && (error.code === "42703" || /does not exist/i.test(error.message))) {
    ({ data, error } = await load(base));
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-sm text-red-700">
        Erro ao carregar os endereços: {error.message}
      </div>
    );
  }

  const now = currentTime();
  type PlaceRow = Record<string, unknown> & {
    id: string;
    address: string | null;
    expires_at: string;
    invalidated_at: string | null;
    fetched_at: string;
  } & Partial<StructuredAddress>;
  const rows = ((data ?? []) as unknown as PlaceRow[]).map((r) => ({
    ...r,
    ...mergeAddress(
      {
        street: r.street ?? null,
        street_number: r.street_number ?? null,
        neighborhood: r.neighborhood ?? null,
        city: r.city ?? null,
        state: r.state ?? null,
        postal_code: r.postal_code ?? null,
      },
      parseBrazilianAddress(r.address),
    ),
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
        defaultVisible={["name", "street", "street_number", "neighborhood", "city", "state", "source", "status"]}
        emptyMessage="Nenhum endereço salvo ainda."
      />
    </div>
  );
}

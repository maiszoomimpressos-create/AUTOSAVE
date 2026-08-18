import { createAdminClient } from "@/lib/supabase/admin";

// Preço confirmado pela APIBrasil pro endpoint de consulta de veículos
// (ver src/app/api/plate-lookup/route.ts) — configurável caso o plano mude.
const COST_PER_CALL = Number(process.env.APIBRASIL_COST_PER_CALL) || 0.08;

export type PlateLookupReport = {
  /** Total de tentativas de busca de placa já feitas. */
  totalCalls: number;
  /** Achou no banco (veículo já cadastrado) — grátis. */
  databaseCalls: number;
  /** Achou no cache (placa consultada antes) — grátis. */
  cacheCalls: number;
  /** databaseCalls + cacheCalls — quanto já tínhamos salvo, sem custo. */
  alreadyHadCalls: number;
  /** Foi de fato pra APIBrasil e cobrou. */
  apiCalls: number;
  /** Foi pra APIBrasil em modo homologação (teste, grátis, não conta). */
  apiHomologCalls: number;
  /** Nada encontrado (nem grátis nem pago), inclui bloqueios pelo teto diário. */
  notFoundCalls: number;
  costPerCall: number;
  totalCost: number;
};

async function countBySource(
  admin: ReturnType<typeof createAdminClient>,
  source: string,
): Promise<number> {
  const { count } = await admin
    .from("plate_lookup_requests")
    .select("id", { count: "exact", head: true })
    .eq("source", source);
  return count ?? 0;
}

export async function getPlateLookupReport(): Promise<PlateLookupReport> {
  const admin = createAdminClient();

  const [databaseCalls, cacheCalls, apiCalls, apiHomologCalls, notFoundCalls] =
    await Promise.all([
      countBySource(admin, "database"),
      countBySource(admin, "cache"),
      countBySource(admin, "api"),
      countBySource(admin, "api_homolog"),
      countBySource(admin, "not_found"),
    ]);

  const alreadyHadCalls = databaseCalls + cacheCalls;
  const totalCalls =
    alreadyHadCalls + apiCalls + apiHomologCalls + notFoundCalls;

  return {
    totalCalls,
    databaseCalls,
    cacheCalls,
    alreadyHadCalls,
    apiCalls,
    apiHomologCalls,
    notFoundCalls,
    costPerCall: COST_PER_CALL,
    totalCost: apiCalls * COST_PER_CALL,
  };
}

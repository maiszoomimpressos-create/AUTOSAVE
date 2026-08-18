import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/workspace";
import { normalizePlate } from "@/lib/vehicles-api";
import { lookupVehicleByPlate } from "@/lib/apibrasil";
import { lookupFipeByCode, mapFipeVehicleKind } from "@/lib/fipe";

// A APIBrasil recomenda até 120s de timeout no exemplo deles — sem isso a
// Vercel poderia derrubar a função antes da resposta chegar.
export const maxDuration = 100;

const DAILY_CAP = Number(process.env.PLATE_LOOKUP_DAILY_CAP) || 50;

type LookupResult = {
  found: boolean;
  source?: "database" | "cache" | "api";
  plate?: string;
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  type?: string | null;
  fipeCode?: string | null;
  fipeValue?: number | null;
  fipeReferenceMonth?: string | null;
  chassisNumber?: string | null;
  fuelType?: string | null;
  engineNumber?: string | null;
  powerCv?: number | null;
  displacement?: number | null;
  city?: string | null;
  state?: string | null;
};

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value != null && value !== "") return value;
  }
  return null;
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

// Loga toda tentativa de busca (mesmo as gratuitas ou sem resultado) na
// plate_lookup_requests, pra alimentar o relatório de /api-docs — a
// plate_lookup_cache sozinha só mostra chamadas pagas (upsert por placa, uma
// vez na vida), não dá pra saber quantas vieram de graça (banco/cache) nem o
// total de tentativas. Best-effort: uma falha aqui não pode derrubar a busca.
async function logRequest(
  admin: ReturnType<typeof createAdminClient>,
  plate: string,
  source: "database" | "cache" | "api" | "api_homolog" | "not_found",
) {
  try {
    await admin.from("plate_lookup_requests").insert({ plate, source });
  } catch {
    // silencioso — log é auxiliar, não pode impedir a resposta ao usuário.
  }
}

// GET /api/plate-lookup?plate=ABC1D23
//
// Exige sessão + membro ativo do workspace (a rota mexe com dado real da
// frota e, a partir de agora, com uma API paga por chamada — não pode ficar
// aberta pra qualquer um, como estava antes).
//
// Ordem de busca: 1) nossos veículos já cadastrados (grátis) → 2) cache de
// consultas já pagas (grátis, evita pagar duas vezes pela mesma placa) →
// 3) só então a APIBrasil (paga).
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<LookupResult>({ found: false });
  }

  const role = await getMemberRole(user.id);
  if (!role) {
    return NextResponse.json<LookupResult>({ found: false });
  }

  const { searchParams } = new URL(request.url);
  const plate = normalizePlate(searchParams.get("plate") ?? "");

  // Placa BR (padrão antigo ou Mercosul) sempre tem 7 caracteres.
  if (plate.length !== 7) {
    return NextResponse.json<LookupResult>({ found: false });
  }

  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("vehicles")
    .select(
      "plate, type, brand, model, year, color, fipe_code, fipe_value, fipe_reference_month, chassis_number, fuel_type, engine_number, power_cv, displacement, city, state",
    )
    .eq("workspace_id", workspaceId)
    .eq("plate", plate)
    .maybeSingle();

  if (existing) {
    await logRequest(admin, plate, "database");
    return NextResponse.json<LookupResult>({
      found: true,
      source: "database",
      plate: existing.plate,
      brand: existing.brand,
      model: existing.model,
      year: existing.year,
      color: existing.color,
      type: existing.type,
      fipeCode: existing.fipe_code,
      fipeValue: existing.fipe_value,
      fipeReferenceMonth: existing.fipe_reference_month,
      chassisNumber: existing.chassis_number,
      fuelType: existing.fuel_type,
      engineNumber: existing.engine_number,
      powerCv: existing.power_cv,
      displacement: existing.displacement,
      city: existing.city,
      state: existing.state,
    });
  }

  const { data: cached } = await admin
    .from("plate_lookup_cache")
    .select(
      "plate, brand, model, year, color, fipe_code, fipe_value, fipe_reference_month, chassis_number, fuel_type, engine_number, power_cv, displacement, city, state",
    )
    .eq("plate", plate)
    .maybeSingle();

  if (cached) {
    await logRequest(admin, plate, "cache");
    return NextResponse.json<LookupResult>({
      found: true,
      source: "cache",
      plate: cached.plate,
      brand: cached.brand,
      model: cached.model,
      year: cached.year,
      color: cached.color,
      fipeCode: cached.fipe_code,
      fipeValue: cached.fipe_value,
      fipeReferenceMonth: cached.fipe_reference_month,
      chassisNumber: cached.chassis_number,
      fuelType: cached.fuel_type,
      engineNumber: cached.engine_number,
      powerCv: cached.power_cv,
      displacement: cached.displacement,
      city: cached.city,
      state: cached.state,
    });
  }

  // Trava de gasto diário: cada linha do cache = uma chamada paga feita hoje.
  const { count: callsToday } = await admin
    .from("plate_lookup_cache")
    .select("plate", { count: "exact", head: true })
    .gte("fetched_at", startOfTodayIso());

  if ((callsToday ?? 0) >= DAILY_CAP) {
    await logRequest(admin, plate, "not_found");
    return NextResponse.json<LookupResult>({ found: false });
  }

  const result = await lookupVehicleByPlate(plate);
  if (!result.ok) {
    await logRequest(admin, plate, "not_found");
    return NextResponse.json<LookupResult>({ found: false });
  }

  const raw = result.data as unknown as Record<string, unknown>;
  const brand = pick(raw, ["marca", "fabricante"]);
  const model = pick(raw, ["modelo"]);
  const yearRaw = pick(raw, ["ano_modelo", "ano_fabricacao"]);
  const color = pick(raw, ["cor"]);
  const year = yearRaw ? Number(String(yearRaw).slice(0, 4)) : null;

  const fuelType = pick(raw, ["combustivel"]) as string | null;

  const cacheRow: Record<string, unknown> = {
    plate,
    brand: brand ? String(brand).toUpperCase() : null,
    model: model ? String(model).toUpperCase() : null,
    year: year && !Number.isNaN(year) ? year : null,
    color: color ? String(color).toUpperCase() : null,
    chassis_number: pick(raw, ["chassi"]),
    fuel_type: fuelType,
    engine_number: pick(raw, ["numero_motor"]),
    power_cv: pick(raw, ["potencia"]),
    displacement: pick(raw, ["cilindradas"]),
    city: pick(raw, ["cidade"]),
    state: pick(raw, ["uf_jurisdicao"]),
    raw,
  };

  // A APIBrasil só devolve o fipeId "em alguns casos" (confirmado pelo
  // suporte deles, não é garantido pra toda placa) — quando vier, aproveita
  // pra buscar o valor FIPE oficial direto pelo código, sem precisar
  // adivinhar marca/modelo/versão por nome. Em homolog o fipeId é fixo (dado
  // de exemplo), então pularia essa busca também nesse modo.
  const fipeId = result.data.marcaDetalhes?.fipeId;
  if (fipeId != null && !result.homolog) {
    try {
      const fipeKind = mapFipeVehicleKind(pick(raw, ["tipo_veiculo"]) as string | null);
      const fipeResult = await lookupFipeByCode(String(fipeId), fipeKind, cacheRow.year as number | null, fuelType);
      if (fipeResult.ok) {
        cacheRow.fipe_code = fipeResult.fipeCode;
        cacheRow.fipe_value = fipeResult.value;
        cacheRow.fipe_model = fipeResult.model;
        cacheRow.fipe_reference_month = fipeResult.referenceMonth;
      } else {
        console.error(`[fipe] não achou valor pra fipeId ${fipeId} (placa ${plate}): ${fipeResult.reason}`);
      }
    } catch (err) {
      // Best-effort — a busca FIPE não pode derrubar a resposta da placa.
      console.error(`[fipe] falha inesperada pra fipeId ${fipeId} (placa ${plate}):`, err);
    }
  }

  // Modo homologação: não grava no cache (não representa nem gasto real nem
  // dado real — a APIBrasil devolve um veículo de exemplo fixo nesse modo).
  if (!result.homolog) {
    // Guarda o resultado — a próxima busca dessa placa (por qualquer
    // usuário, qualquer workspace) sai do cache, sem pagar de novo.
    await admin.from("plate_lookup_cache").upsert(cacheRow);
  }
  await logRequest(admin, plate, result.homolog ? "api_homolog" : "api");

  return NextResponse.json<LookupResult>({
    found: true,
    source: "api",
    plate,
    brand: cacheRow.brand as string | null,
    model: cacheRow.model as string | null,
    year: cacheRow.year as number | null,
    color: cacheRow.color as string | null,
    fipeCode: (cacheRow.fipe_code as string | undefined) ?? null,
    fipeValue: (cacheRow.fipe_value as number | undefined) ?? null,
    fipeReferenceMonth: (cacheRow.fipe_reference_month as string | undefined) ?? null,
    chassisNumber: (cacheRow.chassis_number as string | undefined) ?? null,
    fuelType: (cacheRow.fuel_type as string | undefined) ?? null,
    engineNumber: (cacheRow.engine_number as string | undefined) ?? null,
    powerCv: (cacheRow.power_cv as number | undefined) ?? null,
    displacement: (cacheRow.displacement as number | undefined) ?? null,
    city: (cacheRow.city as string | undefined) ?? null,
    state: (cacheRow.state as string | undefined) ?? null,
  });
}

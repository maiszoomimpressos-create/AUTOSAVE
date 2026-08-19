import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inferVehicleTypeFromSpecs, mapApiVehicleType } from "@/lib/vehicles-api";
import { lookupVehicleByPlate } from "@/lib/apibrasil";
import { lookupFipeByCode, mapFipeVehicleKind } from "@/lib/fipe";

// Cadeia de busca compartilhada entre a tela interna (/api/plate-lookup,
// sessão de usuário) e a API de parceiros (/api/v1/vehicles, x-api-key) —
// movida pra cá pra não duplicar a lógica de cache/custo em dois lugares.
// Ordem: 1) nossos veículos já cadastrados (grátis) → 2) cache de consultas
// já pagas (grátis, evita pagar duas vezes pela mesma placa) → 3) só então
// a APIBrasil (paga, com trava de gasto diário).

const DAILY_CAP = Number(process.env.PLATE_LOOKUP_DAILY_CAP) || 50;

export type PlateLookupResult = {
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
  // Dado bruto da APIBrasil (source "cache"/"api") — quem chama usa isso
  // pra rodar a classificação automática (vehicle-classifier.ts) na hora
  // de criar um veículo de verdade a partir do resultado da busca. Vem
  // null pra source "database" (o veículo já existe, já foi classificado
  // quando foi criado).
  raw?: Record<string, unknown> | null;
};

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (value != null && value !== "") return value;
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  const value = pick(obj, keys);
  if (value == null) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// Tipo oficial (Detran) primeiro; se não vier, deduz pelas especificações
// técnicas que a APIBrasil ainda manda mesmo sem tipo_veiculo definido.
function resolveVehicleType(raw: Record<string, unknown>): ReturnType<typeof mapApiVehicleType> {
  const official = mapApiVehicleType(
    pick(raw, ["tipo_veiculo"]) as string | null,
    pick(raw, ["especie"]) as string | null,
  );
  if (official) return official;

  return inferVehicleTypeFromSpecs({
    displacementCc: pickNumber(raw, ["cilindradas"]),
    axles: pickNumber(raw, ["quantidade_eixo"]),
    seats: pickNumber(raw, ["quantidade_lugares"]),
    grossWeightKg: pickNumber(raw, ["peso_bruto_total"]),
  });
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

// plate já deve vir normalizada (7 caracteres, maiúscula, sem traço/espaço)
// — quem chama (rota de sessão ou rota de API key) valida isso antes.
export async function resolvePlateLookup(plate: string, workspaceId: string): Promise<PlateLookupResult> {
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
    return {
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
    };
  }

  const { data: cached } = await admin
    .from("plate_lookup_cache")
    .select(
      "plate, brand, model, year, color, fipe_code, fipe_value, fipe_reference_month, chassis_number, fuel_type, engine_number, power_cv, displacement, city, state, raw",
    )
    .eq("plate", plate)
    .maybeSingle();

  if (cached) {
    await logRequest(admin, plate, "cache");
    const cachedRaw = (cached.raw ?? {}) as Record<string, unknown>;
    return {
      found: true,
      source: "cache",
      plate: cached.plate,
      brand: cached.brand,
      model: cached.model,
      year: cached.year,
      color: cached.color,
      type: resolveVehicleType(cachedRaw),
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
      raw: cachedRaw,
    };
  }

  // Trava de gasto diário: cada linha do cache = uma chamada paga feita hoje.
  // Compartilhada entre a tela interna e todas as chaves de API de
  // parceiros — é o mesmo saldo da APIBrasil sendo gasto, então é a mesma
  // trava que decide "temos crédito reservado pra mais uma consulta hoje?".
  const { count: callsToday } = await admin
    .from("plate_lookup_cache")
    .select("plate", { count: "exact", head: true })
    .gte("fetched_at", startOfTodayIso());

  if ((callsToday ?? 0) >= DAILY_CAP) {
    await logRequest(admin, plate, "not_found");
    return { found: false };
  }

  const result = await lookupVehicleByPlate(plate);
  if (!result.ok) {
    // Cobre tanto "sem crédito" (a APIBrasil devolve 402/erro quando o saldo
    // acaba) quanto qualquer outra falha (token não configurado, timeout,
    // rede) — em todos os casos o resultado pro chamador é o mesmo: não
    // achou, segue com preenchimento manual.
    await logRequest(admin, plate, "not_found");
    return { found: false };
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

  // Achado real (19/08/2026, com dinheiro de verdade): se o chamador (ex.:
  // Tipo7) desiste da conexão antes da gente terminar — o timeout deles é
  // menor que o tempo que às vezes a APIBrasil demora — a Vercel pode matar
  // a execução no meio, e um `await` normal aqui nunca chegaria a rodar:
  // já tínhamos PAGO a consulta e não salvaríamos nada, então a próxima
  // busca da mesma placa pagaria de novo. Testado e confirmado com abort
  // forçado antes desse fix.
  //
  // `after()` (next/server) resolve isso: usa o `waitUntil` da Vercel por
  // baixo, que estende a vida da invocação especificamente pra terminar
  // esse trabalho, mesmo que a resposta já tenha sido enviada (ou que
  // ninguém mais esteja esperando por ela). Já pagamos a APIBrasil nesse
  // ponto — salvar não pode mais depender do cliente continuar conectado.
  after(async () => {
    try {
      // Modo homologação: não grava no cache (não representa nem gasto real
      // nem dado real — a APIBrasil devolve um veículo de exemplo fixo).
      if (!result.homolog) {
        // Guarda o resultado — a próxima busca dessa placa (por qualquer
        // usuário, qualquer chave de API, qualquer workspace) sai do cache,
        // sem pagar de novo.
        await admin.from("plate_lookup_cache").upsert(cacheRow);
      }
      await logRequest(admin, plate, result.homolog ? "api_homolog" : "api");
    } catch (err) {
      console.error(`[plate-lookup] falha ao salvar o cache pra placa ${plate} (já pago na APIBrasil):`, err);
    }
  });

  return {
    found: true,
    source: "api",
    plate,
    brand: cacheRow.brand as string | null,
    model: cacheRow.model as string | null,
    year: cacheRow.year as number | null,
    color: cacheRow.color as string | null,
    type: resolveVehicleType(raw),
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
    raw,
  };
}

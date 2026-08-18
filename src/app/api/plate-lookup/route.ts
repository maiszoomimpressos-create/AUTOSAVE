import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getMemberRole } from "@/lib/workspace";
import { normalizePlate } from "@/lib/vehicles-api";

const APIBRASIL_URL = "https://gateway.apibrasil.io/api/v2/vehicles/dados";
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
    .select("plate, type, brand, model, year, color")
    .eq("workspace_id", workspaceId)
    .eq("plate", plate)
    .maybeSingle();

  if (existing) {
    return NextResponse.json<LookupResult>({
      found: true,
      source: "database",
      plate: existing.plate,
      brand: existing.brand,
      model: existing.model,
      year: existing.year,
      color: existing.color,
      type: existing.type,
    });
  }

  const { data: cached } = await admin
    .from("plate_lookup_cache")
    .select("plate, brand, model, year, color")
    .eq("plate", plate)
    .maybeSingle();

  if (cached) {
    return NextResponse.json<LookupResult>({
      found: true,
      source: "cache",
      plate: cached.plate,
      brand: cached.brand,
      model: cached.model,
      year: cached.year,
      color: cached.color,
    });
  }

  const deviceToken = process.env.APIBRASIL_DEVICE_TOKEN;
  const bearerToken = process.env.APIBRASIL_BEARER_TOKEN;

  // Sem credenciais configuradas ainda — não acusa erro pro usuário, só não
  // encontra nada (o formulário segue funcionando no preenchimento manual).
  if (!deviceToken || !bearerToken) {
    return NextResponse.json<LookupResult>({ found: false });
  }

  // Trava de gasto diário: cada linha do cache = uma chamada paga feita hoje.
  const { count: callsToday } = await admin
    .from("plate_lookup_cache")
    .select("plate", { count: "exact", head: true })
    .gte("fetched_at", startOfTodayIso());

  if ((callsToday ?? 0) >= DAILY_CAP) {
    return NextResponse.json<LookupResult>({ found: false });
  }

  try {
    const res = await fetch(APIBRASIL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        DeviceToken: deviceToken,
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify({ placa: plate }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json<LookupResult>({ found: false });
    }

    const payload = await res.json();

    if (payload?.error === true) {
      return NextResponse.json<LookupResult>({ found: false });
    }

    // Formato confirmado: o dado do veículo vem em "data" (não "response"
    // nem "dados" — mantidos como fallback só por segurança).
    const raw = (payload?.data ?? payload?.response ?? payload?.dados ?? {}) as Record<
      string,
      unknown
    >;

    const brand = pick(raw, ["marca", "fabricante", "MARCA", "brand"]);
    const model = pick(raw, ["modelo", "MODELO", "model"]);
    const yearRaw = pick(raw, ["ano_modelo", "ano_fabricacao", "anoModelo", "ano", "year"]);
    const color = pick(raw, ["cor", "COR", "color"]);

    if (!brand && !model) {
      return NextResponse.json<LookupResult>({ found: false });
    }

    const year = yearRaw ? Number(String(yearRaw).slice(0, 4)) : null;

    const cacheRow = {
      plate,
      brand: brand ? String(brand).toUpperCase() : null,
      model: model ? String(model).toUpperCase() : null,
      year: year && !Number.isNaN(year) ? year : null,
      color: color ? String(color).toUpperCase() : null,
      chassis_number: pick(raw, ["chassi", "chassis"]),
      fuel_type: pick(raw, ["combustivel"]),
      engine_number: pick(raw, ["numero_motor"]),
      power_cv: pick(raw, ["potencia"]),
      displacement: pick(raw, ["cilindradas"]),
      city: pick(raw, ["cidade"]),
      state: pick(raw, ["uf_jurisdicao", "uf"]),
      raw,
    };

    // Guarda o resultado — a próxima busca dessa placa (por qualquer
    // usuário, qualquer workspace) sai do cache, sem pagar de novo.
    await admin.from("plate_lookup_cache").upsert(cacheRow);

    return NextResponse.json<LookupResult>({
      found: true,
      source: "api",
      plate,
      brand: cacheRow.brand,
      model: cacheRow.model,
      year: cacheRow.year,
      color: cacheRow.color,
    });
  } catch {
    return NextResponse.json<LookupResult>({ found: false });
  }
}

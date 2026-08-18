import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlate } from "@/lib/vehicles-api";

const APIBRASIL_URL = "https://gateway.apibrasil.io/api/v2/vehicles/dados";

type LookupResult = {
  found: boolean;
  source?: "database" | "api";
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

// GET /api/plate-lookup?plate=ABC1D23
//
// 1) Busca primeiro no nosso banco (workspace atual) — instantâneo e sem
//    gastar consulta da API externa.
// 2) Só se não achar aqui, cai pra APIBrasil (consulta paga/por crédito).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const plate = normalizePlate(searchParams.get("plate") ?? "");

  // Placa BR (padrão antigo ou Mercosul) sempre tem 7 caracteres.
  if (plate.length !== 7) {
    return NextResponse.json<LookupResult>({ found: false });
  }

  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
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

  const deviceToken = process.env.APIBRASIL_DEVICE_TOKEN;
  const bearerToken = process.env.APIBRASIL_BEARER_TOKEN;

  // Sem credenciais configuradas ainda — não acusa erro pro usuário, só não
  // encontra nada (o formulário segue funcionando no preenchimento manual).
  if (!deviceToken || !bearerToken) {
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

    const data = await res.json();

    // A APIBrasil costuma encapsular o resultado em "response" (ou "dados",
    // dependendo do plano/versão) — tenta os formatos mais comuns e vários
    // apelidos de campo, já que o schema exato pode variar por plano.
    const raw = (data?.response ?? data?.dados ?? data ?? {}) as Record<string, unknown>;

    const brand = pick(raw, ["marca", "MARCA", "brand", "fabricante"]);
    const model = pick(raw, ["modelo", "MODELO", "model", "submodelo", "SUBMODELO"]);
    const yearRaw = pick(raw, ["ano", "anoModelo", "ano_modelo", "ANO_MODELO", "year"]);
    const color = pick(raw, ["cor", "COR", "color"]);

    if (!brand && !model) {
      return NextResponse.json<LookupResult>({ found: false });
    }

    const year = yearRaw ? Number(String(yearRaw).slice(0, 4)) : null;

    return NextResponse.json<LookupResult>({
      found: true,
      source: "api",
      plate,
      brand: brand ? String(brand).toUpperCase() : null,
      model: model ? String(model).toUpperCase() : null,
      year: year && !Number.isNaN(year) ? year : null,
      color: color ? String(color).toUpperCase() : null,
    });
  } catch {
    return NextResponse.json<LookupResult>({ found: false });
  }
}

import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizePlate,
  uppercaseTextFields,
  VEHICLE_FIELDS,
  VEHICLE_TYPE_VALUES,
  VEHICLE_STATUS_VALUES,
} from "@/lib/vehicles-api";
import {
  listCustomFieldDefinitions,
  isValidIncomingFieldKey,
  ensureFieldDefinitions,
} from "@/lib/custom-fields";
import { notifyWebhooks } from "@/lib/webhooks";
import { classifyForVehicleRecord } from "@/lib/vehicle-classifier";
import { resolvePlateLookup } from "@/lib/plate-lookup";

type Row = Record<string, unknown>;

// Colunas de classificação automática — nunca setáveis diretamente pelo
// cliente da API, só o motor de classificação escreve nelas (spec §39).
// Ficam em KNOWN_FIELDS pra não virarem custom_fields por engano; ficam de
// fora de VEHICLE_FIELDS pra nunca entrar no whitelist de leitura do body.
const CLASSIFICATION_FIELDS = [
  "tipo_original",
  "descricao_original",
  "marca_original",
  "modelo_original",
  "categoria_id",
  "categoria_codigo",
  "categoria_nome",
  "classificacao_metodo",
  "classificacao_confianca",
] as const;

const KNOWN_FIELDS = new Set<string>([
  ...VEHICLE_FIELDS,
  ...CLASSIFICATION_FIELDS,
  "plate",
  "name",
]);
const RESERVED_KEYS = new Set(["id", "workspace_id", "custom_fields", "created_at", "updated_at"]);

function flattenRecord(row: Row): Row {
  const customFields = (row.custom_fields as Row | null) ?? {};
  const result = { ...row, ...customFields };
  delete result.custom_fields;
  return result;
}

function splitFields(fields: string[]) {
  const known = fields.filter((f) => KNOWN_FIELDS.has(f) || f === "id");
  const custom = fields.filter((f) => !KNOWN_FIELDS.has(f) && f !== "id");
  return { known, custom };
}

function flattenCustom(row: Row, customKeys: string[]): Row {
  const customFields = (row.custom_fields as Row | null) ?? {};
  const result: Row = { ...row };
  delete result.custom_fields;
  for (const key of customKeys) {
    result[key] = customFields[key] ?? null;
  }
  return result;
}

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "vehicles");
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const plateParam = searchParams.get("plate");

  if (!plateParam) {
    return NextResponse.json({ error: "Informe o parâmetro 'plate'." }, { status: 400 });
  }

  const plate = normalizePlate(plateParam);
  const supabase = createAdminClient();

  const { known, custom } = splitFields(auth.key.allowed_fields);
  const selectFields = Array.from(
    new Set(["id", "plate", ...known, ...(custom.length ? ["custom_fields"] : [])]),
  ).join(",");

  const { data, error } = await supabase
    .from("vehicles")
    .select(selectFields)
    .eq("workspace_id", auth.key.workspace_id)
    .ilike("plate", `${plate}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("[api/v1/vehicles GET]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let vehicles = (data as unknown as Row[]).map((row) => flattenCustom(row, custom));

  // Achado real (18/08/2026, pedido do dono — integração Tipo7/estacionamento):
  // pra quem usa este recurso pra reconhecer carro na entrada de um evento, a
  // maioria das placas nunca passou por aqui antes — sem isso, a busca sempre
  // volta vazia pra placa nova, mesmo tendo crédito na APIBrasil pra achar o
  // dado de verdade. Só dispara pra placa completa (7 caracteres) sem
  // resultado local — nunca em busca parcial/autocomplete (evitaria gastar
  // crédito a cada tecla digitada). Cadeia: cache já pago (grátis) →
  // APIBrasil (paga, com a mesma trava de gasto diário da tela interna). Se
  // nada disso achar — sem crédito, sem token configurado, placa realmente
  // não existe — volta found:false do mesmo jeito que hoje, e quem chamou
  // segue com preenchimento manual (é o que o Tipo7 já faz).
  if (vehicles.length === 0 && plate.length === 7) {
    const resolved = await resolvePlateLookup(plate, auth.key.workspace_id);
    if (resolved.found) {
      const fullRecord: Row = {
        plate: resolved.plate ?? plate,
        brand: resolved.brand ?? null,
        model: resolved.model ?? null,
        year: resolved.year ?? null,
        color: resolved.color ?? null,
        type: resolved.type ?? null,
        chassis_number: resolved.chassisNumber ?? null,
        fuel_type: resolved.fuelType ?? null,
        engine_number: resolved.engineNumber ?? null,
        power_cv: resolved.powerCv ?? null,
        displacement: resolved.displacement ?? null,
        city: resolved.city ?? null,
        state: resolved.state ?? null,
      };
      // Mesmo filtro de campos que a busca no banco já respeita acima — só
      // devolve o que essa chave de API tem permissão de ver.
      const filtered: Row = { plate: fullRecord.plate };
      for (const field of known) {
        if (field in fullRecord) filtered[field] = fullRecord[field];
      }
      vehicles = [filtered];
    }
  }

  return NextResponse.json({ found: vehicles.length > 0, vehicles });
}

export async function POST(request: Request) {
  const auth = await requireApiKey(request, "vehicles");
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);

  if (!body || typeof body.plate !== "string" || !body.plate.trim()) {
    return NextResponse.json({ error: "Campo 'plate' é obrigatório." }, { status: 400 });
  }

  const plate = normalizePlate(body.plate);
  const workspaceId = auth.key.workspace_id;

  const rawFields: Row = {};
  for (const field of VEHICLE_FIELDS) {
    if (body[field] !== undefined) {
      rawFields[field] = body[field];
    }
  }
  if (typeof body.name === "string" && body.name.trim()) {
    rawFields.name = body.name.trim();
  }
  const fields = uppercaseTextFields(rawFields);

  // Enum columns: reject bad values here with a clean 400 instead of letting
  // it fall through to Postgres and coming back as a raw 500.
  if (typeof fields.type === "string" && !VEHICLE_TYPE_VALUES.includes(fields.type as never)) {
    return NextResponse.json(
      {
        error: `Valor inválido para 'type': "${fields.type}". Valores aceitos: ${VEHICLE_TYPE_VALUES.join(", ")}.`,
      },
      { status: 400 },
    );
  }
  if (typeof fields.status === "string" && !VEHICLE_STATUS_VALUES.includes(fields.status as never)) {
    return NextResponse.json(
      {
        error: `Valor inválido para 'status': "${fields.status}". Valores aceitos: ${VEHICLE_STATUS_VALUES.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  // Any field sent that isn't one of our known columns is treated as a custom
  // field: the definition is auto-created on first sight (so it shows up in
  // the UI and in future API responses that ask for it), and the value is
  // stored in the record's custom_fields jsonb.
  const definitions = await listCustomFieldDefinitions(workspaceId, "vehicles");
  const definedKeys = new Set(definitions.map((d) => d.field_key));
  const incomingCustom: Row = {};
  const newKeys: string[] = [];

  for (const key of Object.keys(body)) {
    if (KNOWN_FIELDS.has(key) || RESERVED_KEYS.has(key)) {
      continue;
    }
    if (!isValidIncomingFieldKey(key)) {
      continue;
    }
    incomingCustom[key] = body[key];
    if (!definedKeys.has(key)) {
      newKeys.push(key);
    }
  }

  if (newKeys.length > 0) {
    await ensureFieldDefinitions(workspaceId, "vehicles", newKeys);
  }

  const supabase = createAdminClient();

  // Classificação automática (spec AGENTS.md) — mesma hierarquia de fontes
  // de todo write path: dado bruto de uma consulta de placa já paga (se essa
  // placa tiver uma) prevalece sobre o que veio no body da requisição.
  const { data: plateCache } = await supabase
    .from("plate_lookup_cache")
    .select("raw")
    .eq("plate", plate)
    .maybeSingle();

  const { regra: _regra, ...classification } = classifyForVehicleRecord({
    raw: (plateCache?.raw as Row | null) ?? null,
    type: typeof fields.type === "string" ? fields.type : null,
    brand: typeof fields.brand === "string" ? fields.brand : null,
    model: typeof fields.model === "string" ? fields.model : null,
  });
  Object.assign(fields, classification);

  const { data: existing, error: findError } = await supabase
    .from("vehicles")
    .select("id, custom_fields")
    .eq("workspace_id", workspaceId)
    .eq("plate", plate)
    .maybeSingle();

  if (findError) {
    console.error("[api/v1/vehicles POST lookup]", findError.message);
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (Object.keys(incomingCustom).length > 0) {
    const currentCustom = ((existing as unknown as Row | null)?.custom_fields as Row | null) ?? {};
    fields.custom_fields = { ...currentCustom, ...incomingCustom };
  }

  if (existing) {
    const { data, error } = await supabase
      .from("vehicles")
      .update(fields)
      .eq("id", (existing as unknown as Row).id as string)
      .select()
      .single();

    if (error) {
      console.error("[api/v1/vehicles POST update]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await notifyWebhooks({
      workspaceId,
      resource: "vehicles",
      event: "updated",
      record: flattenRecord(data as unknown as Row),
      skipKeyId: auth.key.id,
    });

    return NextResponse.json({ vehicle: flattenRecord(data as unknown as Row), created: false }, { status: 200 });
  }

  if (!fields.name) {
    fields.name = ([fields.brand, fields.model].filter(Boolean).join(" ") || plate) as string;
  }

  const { data, error } = await supabase
    .from("vehicles")
    .insert({ ...fields, plate, workspace_id: workspaceId })
    .select()
    .single();

  if (error) {
    console.error("[api/v1/vehicles POST insert]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await notifyWebhooks({
    workspaceId,
    resource: "vehicles",
    event: "created",
    record: flattenRecord(data as unknown as Row),
    skipKeyId: auth.key.id,
  });

  return NextResponse.json({ vehicle: flattenRecord(data as unknown as Row), created: true }, { status: 201 });
}

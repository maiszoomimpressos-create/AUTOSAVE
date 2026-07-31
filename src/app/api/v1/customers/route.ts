import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { CUSTOMER_FIELDS, normalizeCpf, normalizeCnpj, normalizeEmail } from "@/lib/customers-api";
import {
  listCustomFieldDefinitions,
  isValidIncomingFieldKey,
  ensureFieldDefinitions,
} from "@/lib/custom-fields";
import { notifyWebhooks } from "@/lib/webhooks";

function flattenRecord(row: Row): Row {
  const customFields = (row.custom_fields as Row | null) ?? {};
  return { ...row, ...customFields };
}

type AdminClient = ReturnType<typeof createAdminClient>;
type Row = Record<string, unknown>;

const KNOWN_FIELDS = new Set<string>(CUSTOMER_FIELDS);
const RESERVED_KEYS = new Set([
  "id",
  "workspace_id",
  "custom_fields",
  "created_at",
  "updated_at",
]);

function splitFields(fields: string[]) {
  const known = fields.filter((f) => KNOWN_FIELDS.has(f));
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

async function findRowByAnyKey(
  supabase: AdminClient,
  workspaceId: string,
  selectFields: string,
  lookups: { field: string; value: string }[],
) {
  for (const { field, value } of lookups) {
    if (!value) continue;
    const { data } = await supabase
      .from("customers")
      .select(selectFields)
      .eq("workspace_id", workspaceId)
      .eq(field, value)
      .maybeSingle();
    if (data) return data;
  }
  return null;
}

export async function GET(request: Request) {
  const auth = await requireApiKey(request, "customers");
  if ("response" in auth) return auth.response;

  const { searchParams } = new URL(request.url);
  const externalId = searchParams.get("external_id");
  const cpfParam = searchParams.get("cpf");
  const cnpjParam = searchParams.get("cnpj");
  const emailParam = searchParams.get("email");

  if (!externalId && !cpfParam && !cnpjParam && !emailParam) {
    return NextResponse.json(
      { error: "Informe 'external_id', 'cpf', 'cnpj' ou 'email'." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { known, custom } = splitFields(auth.key.allowed_fields);
  const selectFields = Array.from(
    new Set(["id", ...known, ...(custom.length ? ["custom_fields"] : [])]),
  ).join(",");

  const customer = await findRowByAnyKey(supabase, auth.key.workspace_id, selectFields, [
    { field: "external_id", value: externalId ?? "" },
    { field: "cpf", value: cpfParam ? normalizeCpf(cpfParam) : "" },
    { field: "cnpj", value: cnpjParam ? normalizeCnpj(cnpjParam) : "" },
    { field: "email", value: emailParam ? normalizeEmail(emailParam) : "" },
  ]);

  const result = customer ? flattenCustom(customer as unknown as Row, custom) : null;

  return NextResponse.json({ found: !!result, customer: result });
}

export async function POST(request: Request) {
  const auth = await requireApiKey(request, "customers");
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const externalId = typeof body.external_id === "string" ? body.external_id.trim() : "";
  const cpfValue = typeof body.cpf === "string" ? normalizeCpf(body.cpf) : "";
  const cnpjValue = typeof body.cnpj === "string" ? normalizeCnpj(body.cnpj) : "";
  const emailValue = typeof body.email === "string" ? normalizeEmail(body.email) : "";

  if (!externalId && !cpfValue && !cnpjValue && !emailValue) {
    return NextResponse.json(
      { error: "Informe pelo menos um de: 'external_id', 'cpf', 'cnpj' ou 'email'." },
      { status: 400 },
    );
  }

  const workspaceId = auth.key.workspace_id;

  const fields: Row = {};
  for (const field of CUSTOMER_FIELDS) {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }
  }
  if (externalId) fields.external_id = externalId;
  if (cpfValue) fields.cpf = cpfValue;
  if (cnpjValue) fields.cnpj = cnpjValue;
  if (emailValue) fields.email = emailValue;

  const definitions = await listCustomFieldDefinitions(workspaceId, "customers");
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
    await ensureFieldDefinitions(workspaceId, "customers", newKeys);
  }

  const supabase = createAdminClient();

  // A person may show up via different identifiers over time (e.g. named on a
  // ticket by cpf/email before ever having an external_id from a full account).
  // Match on whichever identifier is available so the same real person is never
  // duplicated or rejected as a conflict.
  const existing = await findRowByAnyKey(
    supabase,
    workspaceId,
    "id, external_id, custom_fields",
    [
      { field: "external_id", value: externalId },
      { field: "cpf", value: cpfValue },
      { field: "cnpj", value: cnpjValue },
      { field: "email", value: emailValue },
    ],
  );

  if (Object.keys(incomingCustom).length > 0) {
    const currentCustom =
      ((existing as unknown as Row | null)?.custom_fields as Row | null) ?? {};
    fields.custom_fields = { ...currentCustom, ...incomingCustom };
  }

  if (existing) {
    const existingRow = existing as unknown as Row;
    // Never silently reassign a person's external_id if they already have a
    // different one on file — that would be exactly the kind of mix-up to avoid.
    if (
      fields.external_id &&
      existingRow.external_id &&
      existingRow.external_id !== fields.external_id
    ) {
      delete fields.external_id;
    }

    const { data, error } = await supabase
      .from("customers")
      .update(fields)
      .eq("id", existingRow.id as string)
      .select()
      .single();

    if (error) {
      const status = error.code === "23505" ? 409 : 500;
      const message =
        error.code === "23505"
          ? "CPF, CNPJ ou e-mail já usado por outro cliente neste workspace."
          : error.message;
      return NextResponse.json({ error: message }, { status });
    }

    await notifyWebhooks({
      workspaceId,
      resource: "customers",
      event: "updated",
      record: flattenRecord(data as unknown as Row),
      skipKeyId: auth.key.id,
    });

    return NextResponse.json({ customer: data, created: false }, { status: 200 });
  }

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...fields, workspace_id: workspaceId })
    .select()
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 500;
    const message =
      error.code === "23505"
        ? "CPF ou e-mail já usado por outro cliente neste workspace."
        : error.message;
    return NextResponse.json({ error: message }, { status });
  }

  await notifyWebhooks({
    workspaceId,
    resource: "customers",
    event: "created",
    record: flattenRecord(data as unknown as Row),
    skipKeyId: auth.key.id,
  });

  return NextResponse.json({ customer: data, created: true }, { status: 201 });
}

import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlate, uppercaseTextFields, VEHICLE_FIELDS } from "@/lib/vehicles-api";

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

  const selectFields = Array.from(
    new Set(["id", "plate", ...auth.key.allowed_fields]),
  ).join(",");

  const { data, error } = await supabase
    .from("vehicles")
    .select(selectFields)
    .eq("workspace_id", auth.key.workspace_id)
    .ilike("plate", `${plate}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ found: data.length > 0, vehicles: data });
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

  const rawFields: Record<string, unknown> = {};
  for (const field of VEHICLE_FIELDS) {
    if (body[field] !== undefined) {
      rawFields[field] = body[field];
    }
  }
  if (typeof body.name === "string" && body.name.trim()) {
    rawFields.name = body.name.trim();
  }
  const fields = uppercaseTextFields(rawFields);

  const supabase = createAdminClient();

  const { data: existing, error: findError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("plate", plate)
    .maybeSingle();

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 });
  }

  if (existing) {
    const { data, error } = await supabase
      .from("vehicles")
      .update(fields)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vehicle: data, created: false }, { status: 200 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vehicle: data, created: true }, { status: 201 });
}

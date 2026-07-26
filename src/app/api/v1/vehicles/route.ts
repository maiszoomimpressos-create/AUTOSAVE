import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlate, VEHICLE_FIELDS } from "@/lib/vehicles-api";

export async function GET(request: Request) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const plateParam = searchParams.get("plate");

  if (!plateParam) {
    return NextResponse.json({ error: "Informe o parâmetro 'plate'." }, { status: 400 });
  }

  const plate = normalizePlate(plateParam);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
    .ilike("plate", `${plate}%`)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ found: data.length > 0, vehicles: data });
}

export async function POST(request: Request) {
  const unauthorized = requireApiKey(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);

  if (!body || typeof body.plate !== "string" || !body.plate.trim()) {
    return NextResponse.json({ error: "Campo 'plate' é obrigatório." }, { status: 400 });
  }

  const plate = normalizePlate(body.plate);
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;

  const fields: Record<string, unknown> = {};
  for (const field of VEHICLE_FIELDS) {
    if (body[field] !== undefined) {
      fields[field] = body[field];
    }
  }
  if (typeof body.name === "string" && body.name.trim()) {
    fields.name = body.name.trim();
  }

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
    fields.name = [body.brand, body.model].filter(Boolean).join(" ") || plate;
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

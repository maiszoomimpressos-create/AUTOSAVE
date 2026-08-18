"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlate, VEHICLE_STATUS_VALUES, VEHICLE_TYPE_VALUES } from "@/lib/vehicles-api";

// `ok` distingue "acabou de salvar com sucesso" do estado inicial (null) —
// se sucesso também fosse `null`, useActionState não teria como notificar
// os componentes de que o estado mudou (null === null não dispara efeitos).
export type VehicleFormState = { error?: string; ok?: true } | null;

export async function createVehicle(
  _prevState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const plateRaw = String(formData.get("plate") ?? "").trim();
  if (!plateRaw) {
    return { error: "Placa é obrigatória." };
  }

  const plate = normalizePlate(plateRaw);
  const typeRaw = String(formData.get("type") ?? "").trim();
  const type = (VEHICLE_TYPE_VALUES as readonly string[]).includes(typeRaw) ? typeRaw : null;
  const brand = String(formData.get("brand") ?? "").trim().toUpperCase();
  const model = String(formData.get("model") ?? "").trim().toUpperCase();
  const color = String(formData.get("color") ?? "").trim().toUpperCase();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const driverPhone = String(formData.get("driver_phone") ?? "").trim();

  const supabase = createAdminClient();
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;

  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("plate", plate)
    .maybeSingle();

  if (existing) {
    return { error: "Já existe um veículo com essa placa." };
  }

  const insertRow: Record<string, unknown> = {
    workspace_id: workspaceId,
    plate,
    name: [brand, model].filter(Boolean).join(" ") || plate,
    brand: brand || null,
    model: model || null,
    color: color || null,
    year: yearRaw ? Number(yearRaw) : null,
    driver_phone: driverPhone || null,
  };
  if (type) {
    insertRow.type = type;
  }

  // Se essa placa já foi consultada na API de placas antes (mesmo que o
  // usuário não tenha visto todos os campos no formulário rápido), aproveita
  // os dados técnicos extras que já pagamos por ela — sem precisar de campo
  // novo na tela.
  const { data: cached } = await supabase
    .from("plate_lookup_cache")
    .select(
      "chassis_number, fuel_type, engine_number, power_cv, displacement, city, state, fipe_code, fipe_value, fipe_reference_month",
    )
    .eq("plate", plate)
    .maybeSingle();

  if (cached) {
    for (const [key, value] of Object.entries(cached)) {
      if (value != null && insertRow[key] == null) {
        insertRow[key] = value;
      }
    }
  }

  const { error } = await supabase.from("vehicles").insert(insertRow);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/veiculos");
  return { ok: true };
}

export async function updateVehicle(
  _prevState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) {
    return { error: "Veículo inválido." };
  }

  const plateRaw = String(formData.get("plate") ?? "").trim();
  if (!plateRaw) {
    return { error: "Placa é obrigatória." };
  }

  const plate = normalizePlate(plateRaw);
  const typeRaw = String(formData.get("type") ?? "").trim();
  const type = (VEHICLE_TYPE_VALUES as readonly string[]).includes(typeRaw) ? typeRaw : null;
  const statusRaw = String(formData.get("status") ?? "").trim();
  const status = (VEHICLE_STATUS_VALUES as readonly string[]).includes(statusRaw)
    ? statusRaw
    : null;
  const brand = String(formData.get("brand") ?? "").trim().toUpperCase();
  const model = String(formData.get("model") ?? "").trim().toUpperCase();
  const color = String(formData.get("color") ?? "").trim().toUpperCase();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const driverPhone = String(formData.get("driver_phone") ?? "").trim();

  const supabase = createAdminClient();
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;

  const { data: existing } = await supabase
    .from("vehicles")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("plate", plate)
    .neq("id", id)
    .maybeSingle();

  if (existing) {
    return { error: "Já existe outro veículo com essa placa." };
  }

  const updateRow: Record<string, unknown> = {
    plate,
    name: [brand, model].filter(Boolean).join(" ") || plate,
    brand: brand || null,
    model: model || null,
    color: color || null,
    year: yearRaw ? Number(yearRaw) : null,
    driver_phone: driverPhone || null,
  };
  if (type) {
    updateRow.type = type;
  }
  if (status) {
    updateRow.status = status;
  }

  const { error } = await supabase
    .from("vehicles")
    .update(updateRow)
    .eq("id", id)
    .eq("workspace_id", workspaceId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/veiculos");
  return { ok: true };
}

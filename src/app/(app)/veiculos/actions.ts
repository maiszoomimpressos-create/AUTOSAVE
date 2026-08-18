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

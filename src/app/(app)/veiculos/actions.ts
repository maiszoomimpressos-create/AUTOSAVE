"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlate } from "@/lib/vehicles-api";

export type VehicleFormState = { error?: string } | null;

export async function createVehicle(
  _prevState: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const plateRaw = String(formData.get("plate") ?? "").trim();
  if (!plateRaw) {
    return { error: "Placa é obrigatória." };
  }

  const plate = normalizePlate(plateRaw);
  const brand = String(formData.get("brand") ?? "").trim().toUpperCase();
  const model = String(formData.get("model") ?? "").trim().toUpperCase();
  const color = String(formData.get("color") ?? "").trim().toUpperCase();
  const yearRaw = String(formData.get("year") ?? "").trim();

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

  const { error } = await supabase.from("vehicles").insert({
    workspace_id: workspaceId,
    plate,
    name: [brand, model].filter(Boolean).join(" ") || plate,
    brand: brand || null,
    model: model || null,
    color: color || null,
    year: yearRaw ? Number(yearRaw) : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/veiculos");
  return null;
}

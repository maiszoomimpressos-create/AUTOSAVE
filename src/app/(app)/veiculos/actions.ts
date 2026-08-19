"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePlate, VEHICLE_STATUS_VALUES, VEHICLE_TYPE_VALUES } from "@/lib/vehicles-api";
import { classifyForVehicleRecord } from "@/lib/vehicle-classifier";

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
      "chassis_number, fuel_type, engine_number, power_cv, displacement, city, state, fipe_code, fipe_value, fipe_reference_month, raw",
    )
    .eq("plate", plate)
    .maybeSingle();

  if (cached) {
    for (const [key, value] of Object.entries(cached)) {
      if (key !== "raw" && value != null && insertRow[key] == null) {
        insertRow[key] = value;
      }
    }
  }

  // Classificação automática (spec AGENTS.md) — roda por cima do dado bruto
  // da consulta de placa quando disponível; senão, usa o que foi digitado no
  // formulário (type/brand/model) como melhor palpite. `regra` é só pra log/
  // debug, não é coluna da tabela.
  const { regra: _regra, ...classification } = classifyForVehicleRecord({
    raw: (cached?.raw as Record<string, unknown> | null) ?? null,
    type,
    brand,
    model,
  });
  Object.assign(insertRow, classification);

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

  // Reclassifica com os dados atuais do formulário — se essa placa tem uma
  // consulta em cache, o dado bruto dela ainda prevalece sobre o que foi
  // digitado à mão (mesma hierarquia de fontes do cadastro).
  const { data: cached } = await supabase
    .from("plate_lookup_cache")
    .select("raw")
    .eq("plate", plate)
    .maybeSingle();

  const { regra: _regra, ...classification } = classifyForVehicleRecord({
    raw: (cached?.raw as Record<string, unknown> | null) ?? null,
    type,
    brand,
    model,
  });
  Object.assign(updateRow, classification);

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

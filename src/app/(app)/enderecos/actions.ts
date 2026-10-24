"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeStreet, normalizeText } from "@/lib/places-address";

export type PlaceFormState = { error?: string; ok?: true } | null;

function coord(raw: FormDataEntryValue | null, limit: number): number | null | "invalid" {
  const s = String(raw ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : "invalid";
}

export async function updatePlace(
  _prev: PlaceFormState,
  formData: FormData,
): Promise<PlaceFormState> {
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const lat = coord(formData.get("lat"), 90);
  const lng = coord(formData.get("lng"), 180);
  if (!id) return { error: "Endereço inválido." };
  if (!name) return { error: "Nome é obrigatório." };
  if (lat === "invalid" || lng === "invalid") return { error: "Latitude/longitude inválida." };

  const text = (k: string) => String(formData.get(k) ?? "").trim() || null;
  const street = text("street");
  const structured = {
    street,
    street_number: text("street_number"),
    neighborhood: text("neighborhood"),
    city: text("city"),
    state: text("state")?.toUpperCase() ?? null,
    postal_code: text("postal_code"),
    name_norm: normalizeText(name),
    street_norm: street ? normalizeStreet(street) : null,
  };
  const base = {
    name,
    address: address || null,
    lat,
    lng,
    source: "manual",
    invalidated_at: null,
    updated_at: new Date().toISOString(),
  };
  const save = (values: Record<string, unknown>) =>
    createAdminClient()
      .from("places_cache")
      .update(values)
      .eq("id", id)
      .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!);
  let { error } = await save({ ...base, ...structured });
  // Antes da migration 20261024000000 as colunas novas nao existem: salva so o basico.
  if (error && (error.code === "42703" || error.code === "PGRST204")) ({ error } = await save(base));
  if (error) return { error: error.message };

  revalidatePath("/enderecos");
  return { ok: true };
}

export async function setPlaceInvalidated(id: string, invalid: boolean): Promise<PlaceFormState> {
  const { error } = await createAdminClient()
    .from("places_cache")
    .update({
      invalidated_at: invalid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!);
  if (error) return { error: error.message };
  revalidatePath("/enderecos");
  return { ok: true };
}

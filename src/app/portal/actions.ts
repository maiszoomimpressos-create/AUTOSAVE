"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { RESOURCES, isResourceKey } from "@/lib/resources";
import { listCustomFieldDefinitions } from "@/lib/custom-fields";
import { normalizeCpf, normalizeCnpj } from "@/lib/customers-api";
import type { ClientProfileType } from "@/lib/client-profile";

export type RequestApiKeyFormState = { error?: string; ok?: true } | null;

export async function requestApiKey(
  _prevState: RequestApiKeyFormState,
  formData: FormData,
): Promise<RequestApiKeyFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const resource = String(formData.get("resource") ?? "");
  const fields = formData.getAll("fields").map(String);
  const reason = String(formData.get("reason") ?? "").trim();

  if (!isResourceKey(resource)) {
    return { error: "Escolha um tipo de dado válido." };
  }
  if (fields.length === 0) {
    return { error: "Selecione pelo menos um campo." };
  }

  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const customDefs = await listCustomFieldDefinitions(workspaceId, resource);
  const validFields = new Set([
    ...RESOURCES[resource].fields.map((f) => f.field),
    ...customDefs.map((d) => d.field_key),
  ]);
  const requestedFields = fields.filter((f) => validFields.has(f));

  if (requestedFields.length === 0) {
    return { error: "Selecione pelo menos um campo válido." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("api_key_requests").insert({
    workspace_id: workspaceId,
    requested_by: user.id,
    resource,
    requested_fields: requestedFields,
    reason: reason || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portal/pedir-api");
  return { ok: true };
}

// Marca a chave revelada como "já vista" — some da tela pra sempre, mesma
// lógica de "copie agora" das chaves criadas internamente.
export async function acknowledgeKeyReveal(requestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const admin = createAdminClient();
  await admin
    .from("api_key_requests")
    .update({ raw_key_pending: null })
    .eq("id", requestId)
    .eq("requested_by", user.id);

  revalidatePath("/portal/pedir-api");
}

export type ClientProfileFormState = { error?: string; ok?: true } | null;

// Salva (ou atualiza) o perfil PF/PJ do cliente externo — é o que marca o
// perfil como completo e o que aparece pro admin junto de cada pedido de
// API na tela /api-docs.
export async function saveClientProfile(
  _prevState: ClientProfileFormState,
  formData: FormData,
): Promise<ClientProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado." };
  }

  const type: ClientProfileType = formData.get("type") === "pj" ? "pj" : "pf";
  const fullName = String(formData.get("full_name") ?? "").trim();
  const documentRaw = String(formData.get("document") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const document = type === "pf" ? normalizeCpf(documentRaw) : normalizeCnpj(documentRaw);

  if (!fullName) {
    return { error: type === "pj" ? "Razão social é obrigatória." : "Nome completo é obrigatório." };
  }
  if (type === "pf" && document.length !== 11) {
    return { error: "Informe um CPF válido (11 dígitos)." };
  }
  if (type === "pj" && document.length !== 14) {
    return { error: "Informe um CNPJ válido (14 dígitos)." };
  }
  if (!phone) {
    return { error: "Telefone é obrigatório." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("client_profiles").upsert({
    user_id: user.id,
    workspace_id: process.env.DEFAULT_WORKSPACE_ID!,
    type,
    full_name: fullName,
    document,
    phone,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/portal/perfil");
  revalidatePath("/portal");
  revalidatePath("/portal/pedir-api");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createApiKeyRecord } from "@/lib/api-keys";
import { RESOURCES, isResourceKey, type ResourceKey } from "@/lib/resources";
import { listCustomFieldDefinitions } from "@/lib/custom-fields";
import { canManageMembers } from "@/lib/roles";
import { getMemberRole } from "@/lib/workspace";

async function requireManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  const role = await getMemberRole(user.id);
  if (!canManageMembers(role)) throw new Error("Sem permissão.");

  return user;
}

export type CreateKeyFormState =
  | { error: string }
  | { rawKey: string; name: string; webhookSecret: string | null }
  | null;

export async function createApiKey(
  _prevState: CreateKeyFormState,
  formData: FormData,
): Promise<CreateKeyFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const resource = String(formData.get("resource") ?? "");
  const fields = formData.getAll("fields").map(String);
  const webhookUrl = String(formData.get("webhook_url") ?? "").trim();

  if (!name) {
    return { error: "Dê um nome para a chave." };
  }
  if (!isResourceKey(resource)) {
    return { error: "Escolha um tipo de dado válido." };
  }
  if (fields.length === 0) {
    return { error: "Selecione pelo menos um campo." };
  }
  if (webhookUrl && !/^https:\/\//.test(webhookUrl)) {
    return { error: "A URL do webhook precisa começar com https://" };
  }

  const customDefs = await listCustomFieldDefinitions(
    process.env.DEFAULT_WORKSPACE_ID!,
    resource,
  );
  const validFields = new Set([
    ...RESOURCES[resource].fields.map((f) => f.field),
    ...customDefs.map((d) => d.field_key),
  ]);
  const allowedFields = fields.filter((f) => validFields.has(f));

  if (allowedFields.length === 0) {
    return { error: "Selecione pelo menos um campo válido." };
  }

  const { rawKey, webhookSecret } = await createApiKeyRecord({
    workspaceId: process.env.DEFAULT_WORKSPACE_ID!,
    name,
    resource,
    allowedFields,
    webhookUrl: webhookUrl || undefined,
  });

  revalidatePath("/api-docs");
  return { rawKey, name, webhookSecret };
}

export async function revokeApiKey(id: string) {
  const supabase = createAdminClient();
  await supabase
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!);

  revalidatePath("/api-docs");
}

export async function reactivateApiKey(id: string) {
  const supabase = createAdminClient();
  await supabase
    .from("api_keys")
    .update({ revoked_at: null })
    .eq("id", id)
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!);

  revalidatePath("/api-docs");
}

export async function deleteApiKey(id: string) {
  const supabase = createAdminClient();
  await supabase
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
    .not("revoked_at", "is", null);

  revalidatePath("/api-docs");
}

export type UpdateFieldsState = { error: string } | { ok: true } | null;

export async function updateApiKeyFields(
  _prevState: UpdateFieldsState,
  formData: FormData,
): Promise<UpdateFieldsState> {
  const id = String(formData.get("id") ?? "");
  const resource = String(formData.get("resource") ?? "");
  const fields = formData.getAll("fields").map(String);

  if (!id || !isResourceKey(resource)) {
    return { error: "Requisição inválida." };
  }
  if (fields.length === 0) {
    return { error: "Selecione pelo menos um campo." };
  }

  const customDefs = await listCustomFieldDefinitions(
    process.env.DEFAULT_WORKSPACE_ID!,
    resource,
  );
  const validFields = new Set([
    ...RESOURCES[resource].fields.map((f) => f.field),
    ...customDefs.map((d) => d.field_key),
  ]);
  const allowedFields = fields.filter((f) => validFields.has(f));

  if (allowedFields.length === 0) {
    return { error: "Selecione pelo menos um campo válido." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("api_keys")
    .update({ allowed_fields: allowedFields })
    .eq("id", id)
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
    .is("revoked_at", null);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/api-docs");
  return { ok: true };
}

// Aprova o pedido de um cliente externo: cria a chave de verdade e guarda o
// valor bruto em raw_key_pending pra ele ver (uma vez só) na próxima visita
// ao portal — quem aprova não está presente com o cliente pra "copiar
// agora", então o reveal precisa esperar até lá.
export async function approveApiKeyRequest(requestId: string) {
  const manager = await requireManager();
  const admin = createAdminClient();
  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;

  const { data: request } = await admin
    .from("api_key_requests")
    .select("id, resource, requested_fields, status")
    .eq("id", requestId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!request || request.status !== "pending") return;

  const resource = request.resource as ResourceKey;
  const { rawKey, record } = await createApiKeyRecord({
    workspaceId,
    name: `Cliente — ${RESOURCES[resource]?.label ?? resource}`,
    resource,
    allowedFields: request.requested_fields,
  });

  await admin
    .from("api_key_requests")
    .update({
      status: "approved",
      reviewed_by: manager.id,
      reviewed_at: new Date().toISOString(),
      resulting_api_key_id: record.id,
      raw_key_pending: rawKey,
    })
    .eq("id", requestId);

  revalidatePath("/api-docs");
}

export type SaveWhatsappKeyState = { error?: string; ok?: true } | null;

export async function saveWhatsappApiKey(
  _prevState: SaveWhatsappKeyState,
  formData: FormData,
): Promise<SaveWhatsappKeyState> {
  const manager = await requireManager();
  const apiKey = String(formData.get("api_key") ?? "").trim();

  if (!apiKey) {
    return { error: "Cole a chave antes de salvar." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_integration_settings").upsert(
    {
      workspace_id: process.env.DEFAULT_WORKSPACE_ID!,
      name: "Maiszap",
      api_key: apiKey,
      updated_by: manager.id,
    },
    { onConflict: "workspace_id" },
  );

  if (error) return { error: error.message };

  revalidatePath("/api-docs");
  return { ok: true };
}

export async function rejectApiKeyRequest(requestId: string) {
  const manager = await requireManager();
  const admin = createAdminClient();

  await admin
    .from("api_key_requests")
    .update({
      status: "rejected",
      reviewed_by: manager.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("workspace_id", process.env.DEFAULT_WORKSPACE_ID!)
    .eq("status", "pending");

  revalidatePath("/api-docs");
}

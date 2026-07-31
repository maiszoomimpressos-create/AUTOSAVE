"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createApiKeyRecord } from "@/lib/api-keys";
import { RESOURCES, isResourceKey } from "@/lib/resources";
import { listCustomFieldDefinitions } from "@/lib/custom-fields";

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

import { randomBytes, createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResourceKey } from "@/lib/resources";
import { generateWebhookSecret } from "@/lib/webhooks";

export function generateApiKey(): string {
  return `ask_${randomBytes(24).toString("hex")}`;
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export type ApiKeyRecord = {
  id: string;
  workspace_id: string;
  name: string;
  resource: string;
  allowed_fields: string[];
  key_prefix: string;
  webhook_url: string | null;
  created_at: string;
  revoked_at: string | null;
};

export async function verifyApiKey(rawKey: string): Promise<ApiKeyRecord | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("*")
    .eq("key_hash", hashApiKey(rawKey))
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as ApiKeyRecord;
}

export async function createApiKeyRecord(params: {
  workspaceId: string;
  name: string;
  resource: ResourceKey;
  allowedFields: string[];
  webhookUrl?: string;
}): Promise<{ rawKey: string; webhookSecret: string | null; record: ApiKeyRecord }> {
  const rawKey = generateApiKey();
  const webhookSecret = params.webhookUrl ? generateWebhookSecret() : null;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      workspace_id: params.workspaceId,
      name: params.name,
      resource: params.resource,
      allowed_fields: params.allowedFields,
      key_hash: hashApiKey(rawKey),
      key_prefix: rawKey.slice(0, 12),
      webhook_url: params.webhookUrl || null,
      webhook_secret: webhookSecret,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return { rawKey, webhookSecret, record: data as ApiKeyRecord };
}

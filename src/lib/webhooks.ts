import { createHmac, randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export function generateWebhookSecret(): string {
  return randomBytes(24).toString("hex");
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function notifyWebhooks(params: {
  workspaceId: string;
  resource: string;
  event: "created" | "updated";
  record: Record<string, unknown>;
  skipKeyId?: string;
}) {
  const supabase = createAdminClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, allowed_fields, webhook_url, webhook_secret")
    .eq("workspace_id", params.workspaceId)
    .eq("resource", params.resource)
    .is("revoked_at", null)
    .not("webhook_url", "is", null);

  if (!keys || keys.length === 0) return;

  await Promise.all(
    keys
      .filter((k) => k.id !== params.skipKeyId && k.webhook_url)
      .map(async (k) => {
        const filtered: Record<string, unknown> = {};
        for (const field of k.allowed_fields as string[]) {
          filtered[field] = params.record[field] ?? null;
        }

        const body = JSON.stringify({
          event: params.event,
          resource: params.resource,
          data: filtered,
        });

        const signature = k.webhook_secret ? sign(k.webhook_secret, body) : "";

        try {
          await fetch(k.webhook_url as string, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Autosave-Signature": signature,
            },
            body,
            signal: AbortSignal.timeout(4000),
          });
        } catch {
          // Best-effort delivery. A failed webhook must never fail the caller's write.
        }
      }),
  );
}

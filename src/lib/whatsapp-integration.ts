import { createAdminClient } from "@/lib/supabase/admin";

export type WhatsappIntegrationSettings = {
  id: string;
  workspace_id: string;
  name: string;
  api_key: string | null;
  updated_at: string;
};

export async function getWhatsappIntegrationSettings(
  workspaceId: string,
): Promise<WhatsappIntegrationSettings | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("whatsapp_integration_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data as WhatsappIntegrationSettings) ?? null;
}

// Só pra exibição — nunca devolve a chave inteira pra tela.
export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 7)}${"•".repeat(8)}${key.slice(-4)}`;
}

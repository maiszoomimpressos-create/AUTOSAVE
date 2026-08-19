import { createAdminClient } from "@/lib/supabase/admin";

export type BalanceAlertThresholdType = "fixed" | "percent";

export type BalanceAlertSettings = {
  id: string;
  workspace_id: string;
  threshold_type: BalanceAlertThresholdType;
  threshold_value: number;
  reference_value: number | null;
  active: boolean;
  // Marca quando o alerta disparou pra esse cruzamento do limite — evita
  // mandar mensagem de novo a cada checagem do cron enquanto o saldo
  // continuar baixo. Zera assim que o saldo volta pra cima do limite,
  // liberando um novo aviso na próxima vez que cruzar.
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getBalanceAlertSettings(
  workspaceId: string,
): Promise<BalanceAlertSettings | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("balance_alert_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (data as BalanceAlertSettings) ?? null;
}

// Valor efetivo do limite em R$. Quando é percentual, calcula em cima do
// valor de referência salvo — não do saldo atual — pra não virar um alvo
// móvel que muda sozinho toda vez que o saldo sobe ou desce.
export function effectiveThresholdBRL(settings: BalanceAlertSettings): number {
  if (settings.threshold_type === "fixed") return settings.threshold_value;
  return ((settings.reference_value ?? 0) * settings.threshold_value) / 100;
}

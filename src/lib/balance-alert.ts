import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountBalance } from "@/lib/apibrasil";
import { sendWhatsappBalanceAlert } from "@/lib/whatsapp-alert";

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

const LOG = "[balance-alert-check]";

// Lógica de "o saldo cruzou o limite? então avisa" — compartilhada entre o
// cron diário (rede de segurança) e o gatilho principal: chamada direto
// depois de qualquer consulta paga na APIBrasil (ver plate-lookup.ts), já
// que é exatamente aí que o saldo muda. Isso não depende do cron da Vercel
// disparar sozinho no horário — dispara no mesmo instante em que o saldo é
// consumido de verdade.
//
// Sempre best-effort: nunca lança — quem chama (a busca de placa, o cron)
// não pode quebrar por causa disso.
export async function checkAndSendBalanceAlert(): Promise<void> {
  try {
    const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
    const [balanceResult, settings] = await Promise.all([
      getAccountBalance(),
      getBalanceAlertSettings(workspaceId),
    ]);

    if (!settings || !settings.active) {
      console.log(`${LOG} skipping: no_active_alert`);
      return;
    }
    if (!balanceResult.ok) {
      console.log(`${LOG} skipping: balance_lookup_failed (${balanceResult.reason})`);
      return;
    }

    const threshold = effectiveThresholdBRL(settings);
    const isBelow = balanceResult.balance <= threshold;
    console.log(
      `${LOG} balance=${balanceResult.balance} threshold=${threshold} isBelow=${isBelow} ` +
        `alreadyTriggered=${Boolean(settings.triggered_at)}`,
    );

    const admin = createAdminClient();

    if (isBelow && settings.triggered_at) {
      console.log(`${LOG} skipping: already_triggered at ${settings.triggered_at}`);
      return;
    }

    if (isBelow) {
      console.log(`${LOG} threshold crossed — calling sendWhatsappBalanceAlert`);
      const sendResult = await sendWhatsappBalanceAlert(balanceResult.balance);
      console.log(`${LOG} sendResult=${JSON.stringify(sendResult)}`);

      const { error } = await admin
        .from("balance_alert_settings")
        .update({ triggered_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId);
      if (error) console.log(`${LOG} failed to set triggered_at: ${error.message}`);
      return;
    }

    if (settings.triggered_at) {
      console.log(`${LOG} balance recovered above threshold — clearing triggered_at`);
      const { error } = await admin
        .from("balance_alert_settings")
        .update({ triggered_at: null })
        .eq("workspace_id", workspaceId);
      if (error) console.log(`${LOG} failed to clear triggered_at: ${error.message}`);
    }
  } catch (err) {
    console.error(`${LOG} unhandled error`, err);
  }
}

import { NextResponse } from "next/server";
import { getAccountBalance } from "@/lib/apibrasil";
import { effectiveThresholdBRL, getBalanceAlertSettings } from "@/lib/balance-alert";
import { sendWhatsappBalanceAlert } from "@/lib/whatsapp-alert";
import { createAdminClient } from "@/lib/supabase/admin";

// Prefixo fixo pra dar pra filtrar isso sozinho em "vercel logs" / no
// dashboard, sem misturar com log de outra rota.
const LOG = "[balance-alert-cron]";

// Disparada pela Vercel (ver vercel.json) 1x por dia. A Vercel injeta o
// próprio CRON_SECRET configurado no projeto no header Authorization —
// batendo essa rota de fora sem o segredo certo dá 401.
export async function GET(request: Request) {
  console.log(`${LOG} invoked at ${new Date().toISOString()}`);

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log(
      `${LOG} unauthorized — header ${auth ? "present but doesn't match" : "missing"}, ` +
        `CRON_SECRET ${process.env.CRON_SECRET ? "is set" : "is NOT set"} in this environment`,
    );
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
    const [balanceResult, settings] = await Promise.all([
      getAccountBalance(),
      getBalanceAlertSettings(workspaceId),
    ]);

    console.log(`${LOG} balanceResult=${JSON.stringify(balanceResult)}`);
    console.log(
      `${LOG} settings=${
        settings
          ? JSON.stringify({
              active: settings.active,
              threshold_type: settings.threshold_type,
              threshold_value: settings.threshold_value,
              reference_value: settings.reference_value,
              triggered_at: settings.triggered_at,
            })
          : "null (nenhuma linha em balance_alert_settings pra esse workspace)"
      }`,
    );

    if (!settings || !settings.active) {
      console.log(`${LOG} skipping: no_active_alert`);
      return NextResponse.json({ skipped: "no_active_alert" });
    }
    if (!balanceResult.ok) {
      console.log(`${LOG} skipping: balance_lookup_failed (${balanceResult.reason})`);
      return NextResponse.json({ skipped: "balance_lookup_failed", reason: balanceResult.reason });
    }

    const threshold = effectiveThresholdBRL(settings);
    const isBelow = balanceResult.balance <= threshold;
    console.log(
      `${LOG} balance=${balanceResult.balance} threshold=${threshold} isBelow=${isBelow} ` +
        `alreadyTriggered=${Boolean(settings.triggered_at)}`,
    );
    const admin = createAdminClient();

    // Já tinha disparado e continua baixo — não manda de novo a cada tick do
    // cron, só quando o saldo se recuperar e cair de novo.
    if (isBelow && settings.triggered_at) {
      console.log(`${LOG} skipping: already_triggered at ${settings.triggered_at}`);
      return NextResponse.json({ skipped: "already_triggered", balance: balanceResult.balance, threshold });
    }

    if (isBelow) {
      console.log(`${LOG} threshold crossed — calling sendWhatsappBalanceAlert`);
      const sendResult = await sendWhatsappBalanceAlert(balanceResult.balance);
      console.log(`${LOG} sendResult=${JSON.stringify(sendResult)}`);

      const { error: updateError } = await admin
        .from("balance_alert_settings")
        .update({ triggered_at: new Date().toISOString() })
        .eq("workspace_id", workspaceId);
      if (updateError) console.log(`${LOG} failed to set triggered_at: ${updateError.message}`);

      return NextResponse.json({ triggered: true, balance: balanceResult.balance, threshold, sendResult });
    }

    // Saldo voltou pra cima do limite — libera um novo aviso da próxima vez
    // que cruzar.
    if (settings.triggered_at) {
      console.log(`${LOG} balance recovered above threshold — clearing triggered_at`);
      const { error: updateError } = await admin
        .from("balance_alert_settings")
        .update({ triggered_at: null })
        .eq("workspace_id", workspaceId);
      if (updateError) console.log(`${LOG} failed to clear triggered_at: ${updateError.message}`);

      return NextResponse.json({ reset: true, balance: balanceResult.balance, threshold });
    }

    console.log(`${LOG} noop — balance above threshold, nothing to do`);
    return NextResponse.json({ noop: true, balance: balanceResult.balance, threshold });
  } catch (err) {
    console.error(`${LOG} unhandled error`, err);
    return NextResponse.json(
      { error: "unhandled_error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

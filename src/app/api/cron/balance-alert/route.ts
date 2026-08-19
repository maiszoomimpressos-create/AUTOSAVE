import { NextResponse } from "next/server";
import { getAccountBalance } from "@/lib/apibrasil";
import { effectiveThresholdBRL, getBalanceAlertSettings } from "@/lib/balance-alert";
import { sendWhatsappBalanceAlert } from "@/lib/whatsapp-alert";
import { createAdminClient } from "@/lib/supabase/admin";

// Disparada pela Vercel (ver vercel.json) a cada 15min. A Vercel injeta o
// próprio CRON_SECRET configurado no projeto no header Authorization —
// batendo essa rota de fora sem o segredo certo dá 401.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const workspaceId = process.env.DEFAULT_WORKSPACE_ID!;
  const [balanceResult, settings] = await Promise.all([
    getAccountBalance(),
    getBalanceAlertSettings(workspaceId),
  ]);

  if (!settings || !settings.active) {
    return NextResponse.json({ skipped: "no_active_alert" });
  }
  if (!balanceResult.ok) {
    return NextResponse.json({ skipped: "balance_lookup_failed", reason: balanceResult.reason });
  }

  const threshold = effectiveThresholdBRL(settings);
  const isBelow = balanceResult.balance <= threshold;
  const admin = createAdminClient();

  // Já tinha disparado e continua baixo — não manda de novo a cada tick do
  // cron, só quando o saldo se recuperar e cair de novo.
  if (isBelow && settings.triggered_at) {
    return NextResponse.json({ skipped: "already_triggered", balance: balanceResult.balance, threshold });
  }

  if (isBelow) {
    const sendResult = await sendWhatsappBalanceAlert(balanceResult.balance);
    await admin
      .from("balance_alert_settings")
      .update({ triggered_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId);

    return NextResponse.json({ triggered: true, balance: balanceResult.balance, threshold, sendResult });
  }

  // Saldo voltou pra cima do limite — libera um novo aviso da próxima vez
  // que cruzar.
  if (settings.triggered_at) {
    await admin
      .from("balance_alert_settings")
      .update({ triggered_at: null })
      .eq("workspace_id", workspaceId);

    return NextResponse.json({ reset: true, balance: balanceResult.balance, threshold });
  }

  return NextResponse.json({ noop: true, balance: balanceResult.balance, threshold });
}

import { getWhatsappIntegrationSettings } from "@/lib/whatsapp-integration";

// Chama o endpoint de alerta de saldo do Boot Whats/Maiszap (mesma
// conexão/chave que o Tipo7 já usa). Contrato: POST
// {baseUrl}/api/v1/whatsapp/balance-alert, Bearer <chave>, body
// { saldo?: string }. Nunca manda número de destino — o Boot Whats sempre
// entrega pros até 3 números fixos cadastrados no painel dele (Minhas
// Conexões → Alertas de saldo), de propósito.
const BALANCE_ALERT_PATH = "/api/v1/whatsapp/balance-alert";
const REQUEST_TIMEOUT_MS = 15_000;
const LOG = "[whatsapp-alert]";

export type WhatsappAlertResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "unauthorized" | "timeout" | "network_error" | "unexpected_response";
      detail?: string;
    };

export async function sendWhatsappBalanceAlert(saldo: number): Promise<WhatsappAlertResult> {
  const baseUrl = process.env.TIPO7_WHATSAPP_API_URL;
  // A chave colada na tela API → "puxamos" (Maiszap) manda mais que o env
  // var — assim dá pra trocar a chave sem precisar de um novo deploy.
  const settings = await getWhatsappIntegrationSettings(process.env.DEFAULT_WORKSPACE_ID!);
  const apiKey = settings?.api_key || process.env.TIPO7_WHATSAPP_API_KEY;

  if (!baseUrl || !apiKey) {
    console.log(
      `${LOG} not_configured — baseUrl ${baseUrl ? "ok" : "MISSING"}, ` +
        `apiKey ${apiKey ? "ok (source: " + (settings?.api_key ? "db" : "env") + ")" : "MISSING"}`,
    );
    return { ok: false, reason: "not_configured" };
  }

  const url = `${baseUrl.replace(/\/$/, "")}${BALANCE_ALERT_PATH}`;
  console.log(`${LOG} POST ${url} saldo=${saldo.toFixed(2)} (key source: ${settings?.api_key ? "db" : "env"})`);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ saldo: saldo.toFixed(2) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 401) {
      console.log(`${LOG} unauthorized — a chave salva foi recusada pelo Boot Whats (401)`);
      return { ok: false, reason: "unauthorized" };
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => undefined);
      console.log(`${LOG} unexpected_response — HTTP ${res.status}: ${detail?.slice(0, 500)}`);
      return { ok: false, reason: "unexpected_response", detail };
    }

    const body = await res.text().catch(() => "");
    console.log(`${LOG} ok — HTTP ${res.status}: ${body.slice(0, 500)}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      console.log(`${LOG} timeout after ${REQUEST_TIMEOUT_MS}ms`);
      return { ok: false, reason: "timeout" };
    }
    console.log(`${LOG} network_error — ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, reason: "network_error" };
  }
}

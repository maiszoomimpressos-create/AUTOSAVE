// Chama o endpoint de alerta de saldo do Boot Whats (mesma conexão/chave que
// o Tipo7 já usa — ver TIPO7_WHATSAPP_API_URL / TIPO7_WHATSAPP_API_KEY).
// Contrato: POST {baseUrl}/api/v1/whatsapp/balance-alert, Bearer <chave>,
// body { saldo?: string }. Nunca manda número de destino — o Boot Whats
// sempre entrega pros até 3 números fixos cadastrados no painel dele
// (Minhas Conexões → Alertas de saldo), de propósito.
const BALANCE_ALERT_PATH = "/api/v1/whatsapp/balance-alert";
const REQUEST_TIMEOUT_MS = 15_000;

export type WhatsappAlertResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_configured" | "unauthorized" | "timeout" | "network_error" | "unexpected_response";
      detail?: string;
    };

export async function sendWhatsappBalanceAlert(saldo: number): Promise<WhatsappAlertResult> {
  const baseUrl = process.env.TIPO7_WHATSAPP_API_URL;
  const apiKey = process.env.TIPO7_WHATSAPP_API_KEY;

  if (!baseUrl || !apiKey) {
    return { ok: false, reason: "not_configured" };
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${BALANCE_ALERT_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ saldo: saldo.toFixed(2) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (res.status === 401) {
      return { ok: false, reason: "unauthorized" };
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => undefined);
      return { ok: false, reason: "unexpected_response", detail };
    }

    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "network_error" };
  }
}

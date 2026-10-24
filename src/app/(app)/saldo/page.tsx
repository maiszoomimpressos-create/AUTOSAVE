import { getAccountBalance } from "@/lib/apibrasil";
import { getBalanceAlertSettings } from "@/lib/balance-alert";
import BalanceAlertCard from "@/components/BalanceAlertCard";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Mensagens amigáveis pro motivo da falha — os códigos vêm de
// src/lib/apibrasil.ts (getAccountBalance).
const FAILURE_LABELS: Record<string, string> = {
  not_configured: "o token da APIBrasil não está configurado",
  timeout: "a APIBrasil demorou demais pra responder",
  network_error: "não deu pra conectar na APIBrasil",
  unexpected_response: "a APIBrasil devolveu uma resposta em formato inesperado",
};

function failureLabel(reason: string): string {
  return FAILURE_LABELS[reason] ?? `a APIBrasil devolveu um erro (${reason})`;
}

export default async function SaldoPage() {
  const [result, alertSettings] = await Promise.all([
    getAccountBalance(),
    getBalanceAlertSettings(process.env.DEFAULT_WORKSPACE_ID!),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="page-header">
        <h1 className="page-title">Saldo</h1>
        <p className="page-subtitle">Créditos disponíveis na APIBrasil e alertas de saldo baixo.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="card p-5 sm:p-6">
          {result.ok ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  APIBrasil
                </span>
                <span className="text-xs font-medium text-ink-muted">Saldo disponível</span>
                <span className="text-4xl font-semibold text-ink">{formatBRL(result.balance)}</span>
              </div>

              <BalanceAlertCard settings={alertSettings} />
            </div>
          ) : (
            <p className="text-sm text-amber-600">
              Não foi possível consultar o saldo agora: {failureLabel(result.reason)}. Recarregue a
              página pra tentar de novo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

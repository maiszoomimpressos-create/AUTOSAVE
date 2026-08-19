import { getAccountBalance } from "@/lib/apibrasil";

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
  const result = await getAccountBalance();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-line bg-elevated p-6">
        <h1 className="text-xl font-semibold text-ink">Saldo</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Saldo real da conta na APIBrasil (usada na busca de placa) — puxado
          direto de lá na hora, não é uma estimativa.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-elevated p-6">
        {result.ok ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-ink-muted">Saldo disponível</span>
            <span className="text-4xl font-semibold text-ink">{formatBRL(result.balance)}</span>
          </div>
        ) : (
          <p className="text-sm text-amber-600">
            Não foi possível consultar o saldo agora: {failureLabel(result.reason)}. Recarregue a
            página pra tentar de novo.
          </p>
        )}
      </div>
    </div>
  );
}

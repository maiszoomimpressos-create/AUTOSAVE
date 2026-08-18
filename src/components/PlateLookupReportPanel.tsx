"use client";

import { useState } from "react";
import type { PlateLookupReport } from "@/lib/plate-lookup-report";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-line bg-paper p-4">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <span className="text-2xl font-semibold text-ink">{value}</span>
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}

export default function PlateLookupReportPanel({
  report,
  defaultOpen = false,
}: {
  report: PlateLookupReport;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-elevated p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink">Relatórios</h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink"
        >
          {open ? "Ocultar" : "Ver relatório"}
        </button>
      </div>

      {open && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-muted">
            Uso da busca de placa (chave da Tipo7 puxando dados de veículo) desde
            que o registro começou a ser guardado.
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total de buscas" value={String(report.totalCalls)} />
            <Stat
              label="Foram pra APIBrasil"
              value={String(report.apiCalls)}
              hint={
                report.apiHomologCalls > 0
                  ? `+${report.apiHomologCalls} em homologação (grátis)`
                  : undefined
              }
            />
            <Stat
              label="Custo estimado"
              value={formatBRL(report.totalCost)}
              hint={`${formatBRL(report.costPerCall)} por chamada`}
            />
            <Stat
              label="Já tínhamos salvo"
              value={String(report.alreadyHadCalls)}
              hint={`${report.databaseCalls} do banco + ${report.cacheCalls} do cache`}
            />
          </div>

          {report.notFoundCalls > 0 && (
            <p className="text-xs text-ink-muted">
              {report.notFoundCalls} busca(s) não encontraram nada (inclui
              bloqueios pelo teto diário de gasto).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

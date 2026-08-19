"use client";

import { useState } from "react";
import BalanceAlertModal from "@/components/BalanceAlertModal";
import { disableBalanceAlert } from "@/app/(app)/saldo/actions";
import { effectiveThresholdBRL, type BalanceAlertSettings } from "@/lib/balance-alert";

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function BalanceAlertCard({
  settings,
}: {
  settings: BalanceAlertSettings | null;
}) {
  const [open, setOpen] = useState(false);
  const configured = settings != null && settings.active;

  return (
    <div className="flex flex-col gap-2 border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
      <span className="text-xs font-medium text-ink-muted">Alerta de saldo</span>

      {configured ? (
        <>
          <p className="text-sm text-ink">
            Avisar quando cair para{" "}
            <span className="font-semibold">
              {settings.threshold_type === "percent"
                ? `${settings.threshold_value}% de ${formatBRL(settings.reference_value ?? 0)}`
                : formatBRL(settings.threshold_value)}
            </span>
            {settings.threshold_type === "percent" && (
              <> (≈ {formatBRL(effectiveThresholdBRL(settings))})</>
            )}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="self-start rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
            >
              Editar alerta
            </button>
            <button
              type="button"
              onClick={() => disableBalanceAlert()}
              className="self-start text-sm text-ink-muted hover:text-red-600"
            >
              Desativar
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong"
        >
          Configurar alerta
        </button>
      )}

      {open && <BalanceAlertModal settings={settings} onClose={() => setOpen(false)} />}
    </div>
  );
}

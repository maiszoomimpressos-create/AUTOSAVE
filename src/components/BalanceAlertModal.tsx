"use client";

import { useActionState, useEffect, useState } from "react";
import { saveBalanceAlert, type SaveBalanceAlertState } from "@/app/(app)/saldo/actions";
import ModalBackdrop from "@/components/ModalBackdrop";
import type { BalanceAlertSettings, BalanceAlertThresholdType } from "@/lib/balance-alert";

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

export default function BalanceAlertModal({
  settings,
  onClose,
}: {
  settings: BalanceAlertSettings | null;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<SaveBalanceAlertState, FormData>(
    saveBalanceAlert,
    null,
  );
  const [type, setType] = useState<BalanceAlertThresholdType>(settings?.threshold_type ?? "fixed");

  const saved = state?.ok === true;

  // Depois de salvar, mostra a confirmação por um instante e fecha sozinho —
  // mesmo padrão do CustomerEditModal.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(onClose, 1400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  return (
    <ModalBackdrop onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-4 rounded-xl border border-line bg-elevated p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-ink">Alerta de saldo</h3>
          <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:text-ink">
            Fechar
          </button>
        </div>

        {saved && (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ Alerta salvo com sucesso.
          </p>
        )}

        {!saved && (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="threshold_type" value={type} />

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Avisar quando o saldo cair para
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setType("fixed")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    type === "fixed"
                      ? "bg-accent text-accent-ink"
                      : "border border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  R$ (valor fixo)
                </button>
                <button
                  type="button"
                  onClick={() => setType("percent")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    type === "percent"
                      ? "bg-accent text-accent-ink"
                      : "border border-line text-ink-muted hover:text-ink"
                  }`}
                >
                  % (percentual)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                {type === "fixed" ? "Valor do alerta (R$)" : "Percentual do alerta (%)"}
                <input
                  name="threshold_value"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  max={type === "percent" ? 100 : undefined}
                  required
                  defaultValue={settings?.threshold_value ?? ""}
                  placeholder={type === "fixed" ? "Ex.: 20,00" : "Ex.: 20"}
                  className={inputClass}
                />
              </label>

              {type === "percent" && (
                <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
                  Referente a (base em R$)
                  <input
                    name="reference_value"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue={settings?.reference_value ?? ""}
                    placeholder="Ex.: 200,00"
                    className={inputClass}
                  />
                </label>
              )}
            </div>

            <p className="text-xs text-ink-muted">
              {type === "percent"
                ? "O percentual é calculado sobre o valor de referência acima, não sobre o saldo atual — assim o alerta não se move sozinho conforme o saldo muda."
                : "Assim que o saldo consultado na APIBrasil ficar menor ou igual a esse valor, o alerta dispara."}
              {" "}A checagem roda sozinha a cada 15 minutos e manda um aviso pro WhatsApp assim que o limite for cruzado.
            </p>

            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

            <div className="flex items-center gap-3 border-t border-line pt-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
              >
                {pending ? "Salvando..." : "Salvar alerta"}
              </button>
              <button type="button" onClick={onClose} className="text-sm text-ink-muted hover:text-ink">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalBackdrop>
  );
}

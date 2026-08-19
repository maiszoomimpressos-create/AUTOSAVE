"use client";

import { useActionState, useEffect, useState } from "react";
import { saveWhatsappApiKey, type SaveWhatsappKeyState } from "@/app/(app)/api-docs/actions";

const inputClass =
  "flex-1 rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

export default function WhatsappApiKeyForm({
  name,
  maskedKey,
}: {
  name: string;
  maskedKey: string | null;
}) {
  const [state, formAction, pending] = useActionState<SaveWhatsappKeyState, FormData>(
    saveWhatsappApiKey,
    null,
  );
  const [editing, setEditing] = useState(!maskedKey);

  const saved = state?.ok === true;

  // Depois de salvar, mostra a confirmação por um instante e volta pra
  // visão mascarada sozinho — mesmo padrão do CustomerEditModal.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setEditing(false), 1400);
    return () => clearTimeout(timer);
  }, [saved]);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-6">
      <h2 className="font-medium text-ink">{name}</h2>
      <p className="text-sm text-ink-muted">
        Chave usada pra chamar o endpoint de alerta de saldo do bot de WhatsApp
        (mesma conexão que o Tipo7 já usa) — Minhas Conexões → API, no painel do bot.
      </p>

      {maskedKey && !editing ? (
        <div className="flex items-center gap-3">
          <code className="rounded-md bg-paper px-3 py-2 font-mono text-sm text-ink">
            {maskedKey}
          </code>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-sm font-medium text-ink-muted hover:text-ink"
          >
            Trocar chave
          </button>
        </div>
      ) : (
        <form action={formAction} className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="api_key"
              placeholder="bw_live_..."
              autoComplete="off"
              spellCheck={false}
              required
              className={inputClass}
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Salvar chave"}
            </button>
          </div>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.ok && <p className="text-sm text-green-700">✓ Chave salva.</p>}
        </form>
      )}
    </div>
  );
}

"use client";

import { useActionState, useState } from "react";
import { addCustomField, type CustomFieldFormState } from "@/app/(app)/cadastros/actions";
import type { CustomFieldDefinition } from "@/lib/custom-fields";

function NewFieldModal({ onClose }: { onClose: () => void }) {
  const [state, formAction, pending] = useActionState<CustomFieldFormState, FormData>(
    addCustomField,
    null,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-3 rounded-xl border border-line bg-elevated p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-ink">Novo campo</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Fechar
          </button>
        </div>

        {state && "ok" in state ? (
          <p className="text-sm text-green-700">Campo criado.</p>
        ) : (
          <form action={formAction} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink-muted">
                Nome do campo (ex: &quot;Número da CNH&quot;)
              </span>
              <input
                name="label"
                type="text"
                required
                autoFocus
                placeholder="Número da CNH"
                className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </label>

            {state && "error" in state && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
            >
              {pending ? "Criando..." : "Criar campo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function CustomFieldsManager({
  fields,
}: {
  fields: CustomFieldDefinition[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-elevated p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink">Campos personalizados</h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-strong"
        >
          + Novo campo
        </button>
      </div>

      {fields.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {fields.map((f) => (
            <span
              key={f.id}
              className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-ink-muted"
            >
              {f.label} <code className="text-ink">({f.field_key})</code>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-muted">Nenhum campo personalizado ainda.</p>
      )}

      {open && <NewFieldModal onClose={() => setOpen(false)} />}
    </div>
  );
}

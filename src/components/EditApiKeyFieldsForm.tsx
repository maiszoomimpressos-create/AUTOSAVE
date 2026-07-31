"use client";

import { useActionState, useState } from "react";
import { updateApiKeyFields, type UpdateFieldsState } from "@/app/(app)/api-docs/actions";
import type { FieldDef } from "@/lib/resources";

export default function EditApiKeyFieldsForm({
  id,
  resource,
  fields,
  allowedFields,
}: {
  id: string;
  resource: string;
  fields: FieldDef[];
  allowedFields: string[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<UpdateFieldsState, FormData>(
    updateApiKeyFields,
    null,
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-ink-muted hover:text-ink hover:underline"
      >
        Editar campos
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-md border border-line bg-paper p-3"
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="resource" value={resource} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f.field} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="fields"
              value={f.field}
              defaultChecked={allowedFields.includes(f.field)}
              className="accent-accent"
            />
            {f.label}
          </label>
        ))}
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}
      {state && "ok" in state && (
        <p className="text-sm text-green-700">Campos atualizados.</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Fechar
        </button>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { requestApiKey, type RequestApiKeyFormState } from "@/app/portal/actions";
import { RESOURCES, type ResourceKey, type FieldDef } from "@/lib/resources";

const RESOURCE_OPTIONS = Object.entries(RESOURCES) as [ResourceKey, (typeof RESOURCES)[ResourceKey]][];

export default function RequestApiKeyForm({
  customFieldsByResource = {},
}: {
  customFieldsByResource?: Partial<Record<ResourceKey, FieldDef[]>>;
}) {
  const [resource, setResource] = useState<ResourceKey>(RESOURCE_OPTIONS[0][0]);
  const [state, formAction, pending] = useActionState<RequestApiKeyFormState, FormData>(
    requestApiKey,
    null,
  );

  const fields = [...RESOURCES[resource].fields, ...(customFieldsByResource[resource] ?? [])];

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-line bg-elevated p-6"
    >
      <h2 className="font-medium text-ink">Pedir acesso à API</h2>
      <p className="text-sm text-ink-muted">
        Escolha o que você precisa consultar. Um administrador revisa o pedido antes
        da chave ser liberada.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">Tipo de dado</span>
        <select
          name="resource"
          value={resource}
          onChange={(e) => setResource(e.target.value as ResourceKey)}
          className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        >
          {RESOURCE_OPTIONS.map(([key, def]) => (
            <option key={key} value={key}>
              {def.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">Campos que você precisa</span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-line bg-paper p-3 sm:grid-cols-3">
          {fields.map((f) => (
            <label key={f.field} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="fields" value={f.field} className="accent-accent" />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">Motivo (opcional)</span>
        <textarea
          name="reason"
          rows={2}
          placeholder="Pra que você vai usar esses dados?"
          className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-green-700">
          ✓ Pedido enviado. Assim que for aprovado, a chave aparece aqui embaixo.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Enviando..." : "Enviar pedido"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import CopyButton from "@/components/CopyButton";
import { createApiKey, type CreateKeyFormState } from "@/app/(app)/api-docs/actions";
import { RESOURCES, type ResourceKey, type FieldDef } from "@/lib/resources";

const RESOURCE_OPTIONS = Object.entries(RESOURCES) as [ResourceKey, (typeof RESOURCES)[ResourceKey]][];

export default function ApiKeyForm({
  customFieldsByResource = {},
}: {
  customFieldsByResource?: Partial<Record<ResourceKey, FieldDef[]>>;
}) {
  const [open, setOpen] = useState(false);
  const [resource, setResource] = useState<ResourceKey>(RESOURCE_OPTIONS[0][0]);
  const [state, formAction, pending] = useActionState<CreateKeyFormState, FormData>(
    createApiKey,
    null,
  );

  if (state && "rawKey" in state) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-elevated p-6">
        <h2 className="font-medium text-ink">
          Chave &quot;{state.name}&quot; criada
        </h2>
        <p className="text-sm text-ink-muted">
          Copie agora — ela não será mostrada novamente.
        </p>
        <div className="flex items-center gap-2 rounded-md bg-paper p-3">
          <code className="flex-1 break-all font-mono text-sm text-ink">
            {state.rawKey}
          </code>
          <CopyButton text={state.rawKey} />
        </div>

        {state.webhookSecret && (
          <>
            <p className="text-sm text-ink-muted">
              Segredo do webhook — usem pra verificar a assinatura{" "}
              <code>X-Autosave-Signature</code> (HMAC-SHA256) de cada notificação.
            </p>
            <div className="flex items-center gap-2 rounded-md bg-paper p-3">
              <code className="flex-1 break-all font-mono text-sm text-ink">
                {state.webhookSecret}
              </code>
              <CopyButton text={state.webhookSecret} />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="self-start rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink hover:bg-paper"
        >
          Fechar
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong"
      >
        + Nova chave de API
      </button>
    );
  }

  const fields = [
    ...RESOURCES[resource].fields,
    ...(customFieldsByResource[resource] ?? []),
  ];

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-xl border border-line bg-elevated p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-ink">Nova chave de API</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Cancelar
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">
          Nome da chave
        </span>
        <input
          name="name"
          type="text"
          required
          placeholder="Ex: Sistema de ingressos - produção"
          className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">
          Tipo de dado
        </span>
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

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">
          URL de webhook (opcional)
        </span>
        <input
          name="webhook_url"
          type="url"
          placeholder="https://sistema-parceiro.com/webhooks/autosave"
          className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <span className="text-xs text-ink-muted">
          Se preenchido, avisamos essa URL automaticamente sempre que um registro
          desse tipo for criado ou atualizado por qualquer via (API, tela, ou outra
          chave).
        </span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink-muted">
          Campos que essa chave pode consultar
        </span>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border border-line bg-paper p-3 sm:grid-cols-3">
          {fields.map((f) => (
            <label key={f.field} className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" name="fields" value={f.field} className="accent-accent" />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      {state && "error" in state && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Criando..." : "Criar chave"}
      </button>
    </form>
  );
}

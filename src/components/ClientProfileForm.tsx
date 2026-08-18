"use client";

import { useActionState, useState } from "react";
import { saveClientProfile, type ClientProfileFormState } from "@/app/portal/actions";
import {
  CLIENT_PROFILE_DOCUMENT_LABEL,
  CLIENT_PROFILE_NAME_LABEL,
  type ClientProfile,
  type ClientProfileType,
} from "@/lib/client-profile";

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

export default function ClientProfileForm({ profile }: { profile: ClientProfile | null }) {
  const [state, formAction, pending] = useActionState<ClientProfileFormState, FormData>(
    saveClientProfile,
    null,
  );
  const [type, setType] = useState<ClientProfileType>(profile?.type ?? "pf");

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-line bg-elevated p-6"
    >
      <h2 className="font-medium text-ink">Dados do perfil</h2>
      <p className="text-sm text-ink-muted">
        Pessoa física ou jurídica? Isso fica salvo no seu perfil e aparece
        junto de cada pedido de API que você fizer.
      </p>

      <input type="hidden" name="type" value={type} />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setType("pf")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            type === "pf"
              ? "bg-accent text-accent-ink"
              : "border border-line text-ink-muted hover:text-ink"
          }`}
        >
          Pessoa física
        </button>
        <button
          type="button"
          onClick={() => setType("pj")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            type === "pj"
              ? "bg-accent text-accent-ink"
              : "border border-line text-ink-muted hover:text-ink"
          }`}
        >
          Pessoa jurídica
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-sm font-medium text-ink-muted">
            {CLIENT_PROFILE_NAME_LABEL[type]}
          </span>
          <input
            name="full_name"
            defaultValue={profile?.full_name}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink-muted">
            {CLIENT_PROFILE_DOCUMENT_LABEL[type]}
          </span>
          <input
            key={type}
            name="document"
            placeholder="Somente números"
            defaultValue={profile?.type === type ? profile.document : ""}
            required
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink-muted">Telefone</span>
          <input
            name="phone"
            defaultValue={profile?.phone}
            required
            className={inputClass}
          />
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">✓ Perfil atualizado.</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );
}

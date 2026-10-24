"use client";

import { useActionState } from "react";
import { addMember, type AddMemberFormState } from "@/app/(app)/membros/actions";
import { ASSIGNABLE_ROLES } from "@/lib/roles";

export default function MemberAddForm() {
  const [state, formAction, pending] = useActionState<AddMemberFormState, FormData>(
    addMember,
    null,
  );

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 card p-6 sm:flex-row sm:items-end"
    >
      <label className="flex flex-1 flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">
          E-mail (já precisa ter conta criada em /cadastro)
        </span>
        <input
          name="email"
          type="email"
          required
          placeholder="pessoa@empresa.com"
          className="rounded-lg border border-line-strong bg-elevated px-3 py-2 text-sm text-ink"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">Papel</span>
        <select
          name="role"
          defaultValue="viewer"
          className="rounded-lg border border-line-strong bg-elevated px-3 py-2 text-sm text-ink"
        >
          {ASSIGNABLE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      {state?.error && <p className="text-sm text-red-600 sm:basis-full">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="btn-primary"
      >
        {pending ? "Adicionando..." : "Adicionar acesso"}
      </button>
    </form>
  );
}

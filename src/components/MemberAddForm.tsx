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
      className="flex flex-col gap-3 rounded-xl border border-line bg-elevated p-6 sm:flex-row sm:items-end"
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
          className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink-muted">Papel</span>
        <select
          name="role"
          defaultValue="viewer"
          className="rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
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
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Adicionando..." : "Adicionar acesso"}
      </button>
    </form>
  );
}

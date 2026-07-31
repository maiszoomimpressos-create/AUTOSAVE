"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import BackButton from "@/components/BackButton";
import { login, type LoginFormState } from "./actions";

function DeniedNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("denied") !== "1") return null;

  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      Sua conta ainda não tem acesso a este workspace. Fale com um administrador
      pra ser adicionado.
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    login,
    null,
  );

  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-4">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <BackButton />
        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-lg border border-line bg-elevated p-8 shadow-sm"
        >
          <h1 className="text-center text-2xl font-semibold text-ink">Entrar</h1>

          <Suspense fallback={null}>
            <DeniedNotice />
          </Suspense>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="rounded-md border border-line bg-paper px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">Senha</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-line bg-paper px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-center text-sm text-ink-muted">
            Não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-accent hover:underline">
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

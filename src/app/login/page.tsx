"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type LoginFormState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    login,
    null,
  );

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <form
        action={formAction}
        className="w-full max-w-sm flex flex-col gap-4 bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800"
      >
        <h1 className="text-2xl font-semibold text-center text-zinc-900 dark:text-zinc-50">
          Entrar
        </h1>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            E-mail
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Senha
          </span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-blue-600 hover:underline">
            Cadastre-se
          </Link>
        </p>
      </form>
    </div>
  );
}

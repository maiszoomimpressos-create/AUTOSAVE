"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUp, type SignUpFormState } from "./actions";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState<SignUpFormState, FormData>(
    signUp,
    null,
  );

  if (state?.success) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-4">
        <div className="w-full max-w-sm flex flex-col gap-4 bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Cadastro realizado
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Verifique seu e-mail para confirmar o cadastro antes de entrar.
          </p>
          <Link
            href="/login"
            className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700"
          >
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-4">
      <form
        action={formAction}
        className="w-full max-w-sm flex flex-col gap-4 bg-white dark:bg-zinc-900 p-8 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800"
      >
        <h1 className="text-2xl font-semibold text-center text-zinc-900 dark:text-zinc-50">
          Criar conta
        </h1>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Nome
          </span>
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

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
            minLength={6}
            autoComplete="new-password"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-500">
            Mínimo 6 caracteres, com maiúscula, minúscula, número e símbolo.
          </span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Confirmar senha
          </span>
          <input
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className="rounded-md border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Criando conta..." : "Criar conta"}
        </button>

        <p className="text-sm text-center text-zinc-600 dark:text-zinc-400">
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}

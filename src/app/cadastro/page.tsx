"use client";

import { useActionState } from "react";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import { signUp, type SignUpFormState } from "./actions";

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent";

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState<SignUpFormState, FormData>(
    signUp,
    null,
  );

  if (state?.success) {
    return (
      <div className="flex flex-1 items-center justify-center bg-paper px-4">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <BackButton />
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-elevated p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-ink">Cadastro realizado</h1>
            <p className="text-sm text-ink-muted">
              Verifique seu e-mail para confirmar o cadastro antes de entrar.
            </p>
            <Link
              href="/login"
              className="mt-2 rounded-md bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-strong"
            >
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-paper px-4">
      <div className="flex w-full max-w-sm flex-col gap-3">
        <BackButton />
        <form
          action={formAction}
          className="flex flex-col gap-4 rounded-lg border border-line bg-elevated p-8 shadow-sm"
        >
          <h1 className="text-center text-2xl font-semibold text-ink">Criar conta</h1>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">Nome</span>
            <input
              name="name"
              type="text"
              required
              autoComplete="name"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">E-mail</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">Senha</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}"
              title="Mínimo 6 caracteres, com maiúscula, minúscula, número e caractere especial."
              autoComplete="new-password"
              className={inputClass}
            />
            <span className="text-xs text-ink-muted">
              Mínimo 6 caracteres, com maiúscula, minúscula, número e caractere
              especial.
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">
              Confirmar senha
            </span>
            <input
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
            />
          </label>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-accent px-4 py-2 font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
          >
            {pending ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="text-center text-sm text-ink-muted">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

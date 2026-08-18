"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { PASSWORD_HINT, PASSWORD_PATTERN } from "@/lib/password";
import PasswordRequirements from "@/components/PasswordRequirements";
import { signUp, type SignUpFormState } from "./actions";

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-brand";

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <Image
        src="/logo-mark.png"
        alt="AutoSave"
        width={40}
        height={40}
        className="h-10 w-10 rounded-xl"
        priority
      />
      <span className="text-lg font-semibold tracking-tight text-ink">
        AutoSave
      </span>
    </Link>
  );
}

export default function CadastroPage() {
  const [state, formAction, pending] = useActionState<SignUpFormState, FormData>(
    signUp,
    null,
  );
  const [password, setPassword] = useState("");

  if (state?.success) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-paper px-4">
        <Logo />
        <div className="flex w-full max-w-sm flex-col gap-3">
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-elevated p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-ink">Cadastro realizado</h1>
            <p className="text-sm text-ink-muted">
              Verifique seu e-mail para confirmar o cadastro antes de entrar.
            </p>
            <Link
              href="/login"
              className="mt-2 rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:bg-brand-strong"
            >
              Ir para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-paper px-4">
      <Logo />
      <div className="flex w-full max-w-sm flex-col gap-3">
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
              pattern={PASSWORD_PATTERN}
              title={PASSWORD_HINT}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <PasswordRequirements password={password} />
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
            className="mt-2 rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:bg-brand-strong disabled:opacity-50"
          >
            {pending ? "Criando conta..." : "Criar conta"}
          </button>

          <p className="text-center text-sm text-ink-muted">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-brand hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

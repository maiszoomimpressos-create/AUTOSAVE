"use client";

import { Suspense, useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import AuthFrame from "@/components/AuthFrame";
import { useSearchParams } from "next/navigation";
import { login, type LoginFormState } from "./actions";

const DENIED_MESSAGES: Record<string, string> = {
  pending:
    "Seu cadastro foi recebido e está aguardando aprovação de um administrador. Tente entrar novamente mais tarde.",
  suspended: "Sua conta foi suspensa. Fale com um administrador.",
  "1": "Sua conta ainda não tem acesso a este workspace. Fale com um administrador pra ser adicionado.",
};

function DeniedNotice() {
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied");
  const message = denied ? DENIED_MESSAGES[denied] : null;
  if (!message) return null;

  return (
    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginFormState, FormData>(
    login,
    null,
  );

  return (
    <AuthFrame>
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

      <div className="flex w-full max-w-sm flex-col gap-3">
        <form
          action={formAction}
          className="flex flex-col gap-4 card p-6 sm:p-8"
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
              className="rounded-lg border border-line-strong bg-elevated px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink-muted">Senha</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-lg border border-line-strong bg-elevated px-3 py-2 text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 btn-primary py-2.5 disabled:opacity-50"
          >
            {pending ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-center text-sm text-ink-muted">
            Não tem conta?{" "}
            <Link href="/cadastro" className="font-medium text-brand hover:underline">
              Cadastre-se
            </Link>
          </p>
        </form>
      </div>
    </AuthFrame>
  );
}

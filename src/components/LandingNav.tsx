"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/app/(app)/actions";

const LINKS = [
  { href: "#recursos", label: "Recursos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#contato", label: "Contato" },
];

export default function LandingNav({
  loggedIn,
  appHref,
}: {
  loggedIn: boolean;
  appHref: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-3 z-40 mx-3 flex items-center justify-between gap-3 rounded-full border border-white/10 bg-brand-deep/80 px-3 py-2 shadow-lg shadow-brand-deep/20 backdrop-blur-md sm:top-5 sm:mx-6 sm:px-5">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <Image
            src="/logo-mark.png"
            alt="AutoSave"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-xl"
            priority
          />
          <span className="truncate text-base font-semibold tracking-tight text-white">
            AutoSave
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={open}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-white/90 transition-colors hover:bg-white/10"
        >
          ☰
        </button>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-brand-deep/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col gap-8 bg-brand-deep px-6 py-6 text-white shadow-2xl transition-transform duration-200 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Image
              src="/logo-mark.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg"
              aria-hidden
            />
            <span className="text-sm font-semibold tracking-tight text-white">
              AutoSave
            </span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-base font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-6">
          {loggedIn ? (
            <>
              <Link
                href={appHref}
                onClick={() => setOpen(false)}
                className="rounded-lg bg-brand-glow px-4 py-2.5 text-center text-sm font-semibold text-brand-deep transition-colors hover:brightness-95"
              >
                Ir para o painel
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/cadastro"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-brand-glow px-4 py-2.5 text-center text-sm font-semibold text-brand-deep transition-colors hover:brightness-95"
              >
                Cadastre-se
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
              >
                Entrar
              </Link>
            </>
          )}
        </div>
      </aside>
    </>
  );
}

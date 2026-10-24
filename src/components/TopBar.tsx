"use client";

import { usePathname } from "next/navigation";
import { signOut } from "@/app/(app)/actions";
import InstallPwaButton from "@/components/InstallPwaButton";
import NavIcon from "@/components/NavIcon";

const TITLES: Record<string, string> = {
  "/painel": "Início",
  "/cadastros": "Usuários",
  "/veiculos": "Veículos",
  "/enderecos": "Endereços",
  "/api-docs": "API",
  "/relatorios": "Relatórios",
  "/saldo": "Saldo",
  "/documentos": "Documentos",
  "/membros": "Membros",
  "/portal": "Dashboard",
  "/portal/pedir-api": "API",
  "/portal/perfil": "Perfil",
};

export default function TopBar({
  email,
  onMenuClick,
  title = "Painel",
}: {
  email?: string;
  onMenuClick?: () => void;
  title?: string;
}) {
  const pathname = usePathname();
  const pageTitle = TITLES[pathname] ?? title;
  const initial = (email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-10 mb-6 border-b border-line bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-ink hover:bg-sunken lg:hidden"
          >
            <NavIcon name="menu" className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">{title}</span>
            <span className="truncate text-base font-semibold text-ink">{pageTitle}</span>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <InstallPwaButton />
          <div className="hidden items-center gap-2 rounded-full border border-line bg-elevated py-1 pl-1 pr-3 md:flex">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent" aria-hidden>
              {initial}
            </span>
            <span className="max-w-[14rem] truncate text-sm text-ink">{email}</span>
          </div>
          <form action={signOut}>
            <button type="submit" className="btn-secondary px-3" title="Sair">
              <NavIcon name="logout" className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

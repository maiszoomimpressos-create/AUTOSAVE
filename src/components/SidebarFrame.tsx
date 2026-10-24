"use client";

import Image from "next/image";
import Link from "next/link";
import NavIcon from "@/components/NavIcon";

// Moldura comum dos menus laterais (painel interno e portal do cliente):
// gaveta no mobile, fixa a partir de lg.
export default function SidebarFrame({
  open,
  onClose,
  homeHref,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  homeHref: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] lg:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-steel-line bg-steel transition-transform duration-200 ease-out lg:z-20 lg:w-64 lg:translate-x-0 ${
          open ? "translate-x-0 shadow-pop" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link href={homeHref} onClick={onClose} className="flex items-center gap-2.5">
            <Image src="/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight text-steel-ink">AutoSave</span>
              <span className="text-[11px] text-steel-ink-muted">{subtitle}</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-lg p-1.5 text-steel-ink-muted hover:bg-steel-elevated hover:text-steel-ink lg:hidden"
          >
            <NavIcon name="close" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">{children}</nav>
        <div className="border-t border-steel-line px-5 py-4 text-[11px] text-steel-ink-muted">
          AutoSave · gestão de frota e cadastros
        </div>
      </aside>
    </>
  );
}

export function navItemClass(active: boolean, disabled?: boolean): string {
  return `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    disabled
      ? "cursor-not-allowed text-steel-ink-muted opacity-50"
      : active
        ? "bg-accent text-accent-ink shadow-sm"
        : "text-steel-ink-muted hover:bg-steel-elevated hover:text-steel-ink"
  }`;
}

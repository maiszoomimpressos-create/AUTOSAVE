"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  disabled?: boolean;
};

type NavGroup = {
  label: string;
  icon: string;
  children: NavItem[];
};

const NAV: (NavItem | NavGroup)[] = [
  { href: "/", label: "Início", icon: "🏠" },
  {
    label: "Registros",
    icon: "🧾",
    children: [
      { href: "/cadastros", label: "Usuários", icon: "🙍" },
      { href: "/veiculos", label: "Veículos", icon: "🚗" },
    ],
  },
  { href: "/api-docs", label: "API", icon: "🔌" },
  { href: "/relatorios", label: "Relatórios", icon: "📊" },
  { href: "/documentos", label: "Documentos", icon: "📄", disabled: true },
];

function isGroup(item: NavItem | NavGroup): item is NavGroup {
  return "children" in item;
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.disabled ? "#" : item.href}
      aria-disabled={item.disabled}
      onClick={() => !item.disabled && onNavigate()}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        item.disabled
          ? "cursor-not-allowed text-steel-ink-muted/50"
          : active
            ? "bg-accent text-accent-ink"
            : "text-steel-ink-muted hover:bg-steel-elevated hover:text-steel-ink"
      }`}
    >
      <span>{item.icon}</span>
      {item.label}
      {item.disabled && (
        <span className="ml-auto text-[10px] uppercase text-steel-ink-muted/50">
          em breve
        </span>
      )}
    </Link>
  );
}

function NavGroupItem({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const hasActiveChild = group.children.some((c) => pathname === c.href);
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          open ? "text-accent" : "text-white hover:text-steel-ink"
        }`}
      >
        <span>{group.icon}</span>
        {group.label}
        <span className={`ml-auto text-[10px] transition-transform ${open ? "rotate-90" : ""}`}>
          ▶
        </span>
      </button>
      {open && (
        <div className="ml-4 flex flex-col gap-1 border-l border-steel-line pl-2">
          {group.children.map((child) => (
            <NavLink
              key={child.href}
              item={child}
              active={pathname === child.href}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  isAdmin,
  open,
  onClose,
}: {
  isAdmin: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const items: (NavItem | NavGroup)[] = isAdmin
    ? [...NAV, { href: "/membros", label: "Membros", icon: "👥" }]
    : NAV;

  return (
    <>
      {/* Overlay — só aparece no mobile/tablet quando o menu está aberto */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[80vw] flex-col bg-steel px-4 py-6 transition-transform duration-200 ease-in-out lg:z-20 lg:w-60 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            <span className="text-lg font-semibold tracking-tight text-steel-ink">
              AUTOSAVE
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-md p-1 text-steel-ink-muted hover:bg-steel-elevated hover:text-steel-ink lg:hidden"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto">
          {items.map((item) =>
            isGroup(item) ? (
              <NavGroupItem
                key={item.label}
                group={item}
                pathname={pathname}
                onNavigate={onClose}
              />
            ) : (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href}
                onNavigate={onClose}
              />
            ),
          )}
        </nav>
      </aside>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/NavIcon";
import SidebarFrame, { navItemClass } from "@/components/SidebarFrame";

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
  { href: "/painel", label: "Início", icon: "home" },
  {
    label: "Registros",
    icon: "folder",
    children: [
      { href: "/cadastros", label: "Usuários", icon: "users" },
      { href: "/veiculos", label: "Veículos", icon: "car" },
      { href: "/enderecos", label: "Endereços", icon: "pin" },
    ],
  },
  { href: "/api-docs", label: "API", icon: "plug" },
  { href: "/relatorios", label: "Relatórios", icon: "chart" },
  { href: "/saldo", label: "Saldo", icon: "wallet" },
  { href: "/documentos", label: "Documentos", icon: "doc", disabled: true },
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
      aria-current={active ? "page" : undefined}
      className={navItemClass(active, item.disabled)}
    >
      <NavIcon name={item.icon} />
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
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-steel-elevated ${
          open || hasActiveChild ? "text-steel-ink" : "text-steel-ink-muted hover:text-steel-ink"
        }`}
      >
        <NavIcon name={group.icon} />
        {group.label}
        <NavIcon name="chevron" className={`ml-auto h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="ml-5 flex flex-col gap-0.5 border-l border-steel-line pl-2">
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
    ? [...NAV, { href: "/membros", label: "Membros", icon: "shield" }]
    : NAV;

  return (
    <SidebarFrame open={open} onClose={onClose} homeHref="/painel" subtitle="Painel administrativo">
      {items.map((item) =>
        isGroup(item) ? (
          <NavGroupItem key={item.label} group={item} pathname={pathname} onNavigate={onClose} />
        ) : (
          <NavLink key={item.href} item={item} active={pathname === item.href} onNavigate={onClose} />
        ),
      )}
    </SidebarFrame>
  );
}

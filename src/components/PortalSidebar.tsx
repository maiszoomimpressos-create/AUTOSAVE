"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Menu do portal de clientes externos — bem mais enxuto que o Sidebar
// interno (sem grupos, sem itens de admin). Mesma linguagem visual.
const NAV = [
  { href: "/portal", label: "Dashboard", icon: "🏠" },
  { href: "/portal/pedir-api", label: "API", icon: "🔌" },
  { href: "/portal/perfil", label: "Perfil", icon: "🙍" },
];

export default function PortalSidebar({
  open,
  onClose,
  profileIncomplete,
}: {
  open: boolean;
  onClose: () => void;
  profileIncomplete?: boolean;
}) {
  const pathname = usePathname();

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
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-accent text-accent-ink"
                  : "text-steel-ink-muted hover:bg-steel-elevated hover:text-steel-ink"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.href === "/portal/perfil" && profileIncomplete && (
                <span
                  className="ml-auto h-2 w-2 rounded-full bg-amber-500"
                  aria-label="Perfil incompleto"
                  title="Perfil incompleto"
                />
              )}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}

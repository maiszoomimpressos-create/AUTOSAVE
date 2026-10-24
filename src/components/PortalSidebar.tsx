"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/NavIcon";
import SidebarFrame, { navItemClass } from "@/components/SidebarFrame";

// Menu do portal de clientes externos — bem mais enxuto que o Sidebar
// interno (sem grupos, sem itens de admin). Mesma linguagem visual.
const NAV = [
  { href: "/portal", label: "Dashboard", icon: "home" },
  { href: "/portal/pedir-api", label: "API", icon: "plug" },
  { href: "/portal/perfil", label: "Perfil", icon: "user" },
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
    <SidebarFrame open={open} onClose={onClose} homeHref="/portal" subtitle="Portal do cliente">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onClose}
          aria-current={pathname === item.href ? "page" : undefined}
          className={navItemClass(pathname === item.href)}
        >
          <NavIcon name={item.icon} />
          {item.label}
          {item.href === "/portal/perfil" && profileIncomplete && (
            <span className="ml-auto h-2 w-2 rounded-full bg-amber-500" aria-label="Perfil incompleto" title="Perfil incompleto" />
          )}
        </Link>
      ))}
    </SidebarFrame>
  );
}

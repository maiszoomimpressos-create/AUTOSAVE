"use client";

import { useState } from "react";
import PortalSidebar from "@/components/PortalSidebar";
import TopBar from "@/components/TopBar";

export default function PortalShell({
  email,
  profileIncomplete,
  children,
}: {
  email?: string;
  profileIncomplete?: boolean;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-full bg-paper lg:pl-64">
      <PortalSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        profileIncomplete={profileIncomplete}
      />
      <div>
        <TopBar email={email} onMenuClick={() => setMenuOpen(true)} title="Portal" />
        <main className="mx-auto w-full max-w-7xl px-3 pb-12 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

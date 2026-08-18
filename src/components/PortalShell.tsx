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
    <div className="min-h-full bg-paper lg:pl-60">
      <PortalSidebar
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        profileIncomplete={profileIncomplete}
      />
      <div>
        <TopBar email={email} onMenuClick={() => setMenuOpen(true)} title="Portal" />
        <main className="px-2 pb-8 sm:px-4">{children}</main>
      </div>
    </div>
  );
}

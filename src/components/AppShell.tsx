"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default function AppShell({
  isAdmin,
  email,
  children,
}: {
  isAdmin: boolean;
  email?: string;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-full bg-paper lg:pl-60">
      <Sidebar isAdmin={isAdmin} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div>
        <TopBar email={email} onMenuClick={() => setMenuOpen(true)} />
        <main className="px-2 pb-8 sm:px-4">{children}</main>
      </div>
    </div>
  );
}

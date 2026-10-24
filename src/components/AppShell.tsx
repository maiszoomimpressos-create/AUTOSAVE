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
    <div className="min-h-full bg-paper lg:pl-64">
      <Sidebar isAdmin={isAdmin} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div>
        <TopBar email={email} onMenuClick={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-7xl px-3 pb-12 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";

const TABS = [
  { key: "fornecemos", label: "APIs que fornecemos" },
  { key: "puxamos", label: "APIs que puxamos" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ApiDocsTabs({
  fornecemos,
  puxamos,
}: {
  fornecemos: ReactNode;
  puxamos: ReactNode;
}) {
  const [tab, setTab] = useState<TabKey>("fornecemos");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-accent text-accent-ink"
                : "border border-line text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={tab === "fornecemos" ? "flex flex-col gap-6" : "hidden"}>
        {fornecemos}
      </div>
      <div className={tab === "puxamos" ? "flex flex-col gap-6" : "hidden"}>
        {puxamos}
      </div>
    </div>
  );
}

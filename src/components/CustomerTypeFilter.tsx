"use client";

import { useState } from "react";
import FilterableTable from "@/components/FilterableTable";

type Column = { key: string; label: string };
type Row = Record<string, unknown> & { id: string };

const OPTIONS: { key: "todos" | "pf" | "pj"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pf", label: "Pessoa física" },
  { key: "pj", label: "Pessoa jurídica" },
];

export default function CustomerTypeFilter({
  columns,
  rows,
  defaultVisible,
  emptyMessage,
}: {
  columns: Column[];
  rows: Row[];
  defaultVisible: string[];
  emptyMessage?: string;
}) {
  const [tipo, setTipo] = useState<"todos" | "pf" | "pj">("todos");

  const filteredRows =
    tipo === "todos" ? rows : rows.filter((r) => r.customer_type === tipo);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setTipo(opt.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tipo === opt.key
                ? "bg-accent text-accent-ink"
                : "border border-line text-ink-muted hover:text-ink"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <FilterableTable
        columns={columns}
        rows={filteredRows}
        defaultVisible={defaultVisible}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}

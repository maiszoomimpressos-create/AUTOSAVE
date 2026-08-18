"use client";

import { useState } from "react";
import FilterableTable from "@/components/FilterableTable";
import CustomerEditModal from "@/components/CustomerEditModal";
import RecordViewModal from "@/components/RecordViewModal";
import { EyeIcon, PencilIcon } from "@/components/icons";

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
  const [viewing, setViewing] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);

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
        renderRowActions={(row) => (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewing(row)}
              aria-label="Visualizar cadastro"
              title="Visualizar"
              className="text-ink-muted hover:text-ink"
            >
              <EyeIcon />
            </button>
            <button
              type="button"
              onClick={() => setEditing(row)}
              aria-label="Editar cadastro"
              title="Editar"
              className="text-ink-muted hover:text-accent"
            >
              <PencilIcon />
            </button>
          </div>
        )}
      />

      {viewing && (
        <RecordViewModal
          title="Cadastro"
          columns={columns}
          row={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
        />
      )}

      {editing && (
        <CustomerEditModal customer={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

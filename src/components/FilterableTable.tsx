"use client";

import { useState } from "react";

type Column = { key: string; label: string };
type Row = Record<string, unknown> & { id: string };

export default function FilterableTable({
  columns,
  rows,
  defaultVisible,
  emptyMessage = "Nenhum registro ainda.",
}: {
  columns: Column[];
  rows: Row[];
  defaultVisible: string[];
  emptyMessage?: string;
}) {
  const defaultSet = new Set(defaultVisible);
  const [visible, setVisible] = useState<Set<string>>(
    new Set(columns.filter((c) => defaultSet.has(c.key)).map((c) => c.key)),
  );
  const [filterOpen, setFilterOpen] = useState(false);

  const activeColumns = columns.filter((c) => visible.has(c.key));

  function toggle(key: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-xl border border-line bg-elevated p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink"
          >
            <span className={`transition-transform ${filterOpen ? "rotate-90" : ""}`}>
              ▶
            </span>
            Mostrar apenas estes dados
            <span className="text-xs text-ink-muted">
              ({activeColumns.length} de {columns.length})
            </span>
          </button>
          {filterOpen && (
            <div className="flex gap-3 text-xs">
              <button
                type="button"
                onClick={() => setVisible(new Set(columns.map((c) => c.key)))}
                className="text-accent hover:underline"
              >
                Marcar tudo
              </button>
              <button
                type="button"
                onClick={() => setVisible(new Set())}
                className="text-ink-muted hover:underline"
              >
                Limpar
              </button>
            </div>
          )}
        </div>
        {filterOpen && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {columns.map((col) => (
              <label key={col.key} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={visible.has(col.key)}
                  onChange={() => toggle(col.key)}
                  className="accent-accent"
                />
                {col.label}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-elevated">
        {activeColumns.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">
            Marque pelo menos um dado acima pra ver a lista.
          </p>
        ) : (
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                {activeColumns.map((col) => (
                  <th key={col.key} className="whitespace-nowrap px-4 py-3 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    {activeColumns.map((col, i) => (
                      <td
                        key={col.key}
                        className={`whitespace-nowrap px-4 py-3 ${
                          i === 0 ? "font-medium text-ink" : "text-ink-muted"
                        }`}
                      >
                        {row[col.key] != null ? String(row[col.key]) : "-"}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={activeColumns.length}
                    className="px-4 py-6 text-center text-ink-muted"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

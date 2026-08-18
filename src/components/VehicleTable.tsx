"use client";

import { useState } from "react";
import FilterableTable from "@/components/FilterableTable";
import VehicleEditModal from "@/components/VehicleEditModal";
import RecordViewModal from "@/components/RecordViewModal";
import { EyeIcon, PencilIcon } from "@/components/icons";

type Column = { key: string; label: string };
type Row = Record<string, unknown> & { id: string };

export default function VehicleTable({
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
  const [viewing, setViewing] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);

  return (
    <>
      <FilterableTable
        columns={columns}
        rows={rows}
        defaultVisible={defaultVisible}
        emptyMessage={emptyMessage}
        renderRowActions={(row) => (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewing(row)}
              aria-label="Visualizar veículo"
              title="Visualizar"
              className="text-ink-muted hover:text-ink"
            >
              <EyeIcon />
            </button>
            <button
              type="button"
              onClick={() => setEditing(row)}
              aria-label="Editar veículo"
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
          title="Veículo"
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
        <VehicleEditModal vehicle={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import FilterableTable from "@/components/FilterableTable";
import VehicleEditModal from "@/components/VehicleEditModal";

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
  const [editing, setEditing] = useState<Row | null>(null);

  return (
    <>
      <FilterableTable
        columns={columns}
        rows={rows}
        defaultVisible={defaultVisible}
        emptyMessage={emptyMessage}
        renderRowActions={(row) => (
          <button
            type="button"
            onClick={() => setEditing(row)}
            className="text-sm font-medium text-accent hover:underline"
          >
            Editar
          </button>
        )}
      />

      {editing && (
        <VehicleEditModal vehicle={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

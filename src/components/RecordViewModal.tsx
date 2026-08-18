"use client";

import ModalBackdrop from "@/components/ModalBackdrop";

type Column = { key: string; label: string };
type Row = Record<string, unknown> & { id: string };

export default function RecordViewModal({
  title,
  columns,
  row,
  onClose,
  onEdit,
}: {
  title: string;
  columns: Column[];
  row: Row;
  onClose: () => void;
  onEdit?: () => void;
}) {
  return (
    <ModalBackdrop onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-4 rounded-xl border border-line bg-elevated p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-ink">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Fechar
          </button>
        </div>

        <dl className="grid max-h-[60vh] grid-cols-1 gap-x-4 gap-y-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {columns.map((col) => (
            <div key={col.key} className="flex flex-col gap-0.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                {col.label}
              </dt>
              <dd className="break-words text-sm text-ink">
                {row[col.key] != null && row[col.key] !== "" ? String(row[col.key]) : "-"}
              </dd>
            </div>
          ))}
        </dl>

        {onEdit && (
          <div className="flex justify-end border-t border-line pt-3">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong"
            >
              Editar
            </button>
          </div>
        )}
      </div>
    </ModalBackdrop>
  );
}

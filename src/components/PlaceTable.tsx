"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import FilterableTable from "@/components/FilterableTable";
import ModalBackdrop from "@/components/ModalBackdrop";
import { PencilIcon } from "@/components/icons";
import { setPlaceInvalidated, updatePlace } from "@/app/(app)/enderecos/actions";

type Column = { key: string; label: string };
type Row = Record<string, unknown> & { id: string };

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function PlaceEditModal({ place, onClose }: { place: Row; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(updatePlace, null);
  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-line bg-elevated p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">Editar endereço</h2>
        <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={place.id} />
          <label className="col-span-full flex flex-col gap-1 text-sm text-ink-muted">
            Nome
            <input name="name" defaultValue={str(place.name)} required className={inputClass} />
          </label>
          <label className="col-span-full flex flex-col gap-1 text-sm text-ink-muted">
            Endereço
            <input name="address" defaultValue={str(place.address)} className={inputClass} />
          </label>
          {(
            [
              ["street", "Rua", "col-span-full"],
              ["street_number", "Número", ""],
              ["neighborhood", "Bairro", ""],
              ["city", "Cidade", ""],
              ["state", "UF", ""],
              ["postal_code", "CEP", ""],
            ] as const
          ).map(([key, label, span]) => (
            <label key={key} className={`flex flex-col gap-1 text-sm text-ink-muted ${span}`}>
              {label}
              <input name={key} defaultValue={str(place[key])} className={inputClass} />
            </label>
          ))}
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Latitude
            <input name="lat" defaultValue={str(place.lat)} inputMode="decimal" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-sm text-ink-muted">
            Longitude
            <input name="lng" defaultValue={str(place.lng)} inputMode="decimal" className={inputClass} />
          </label>
          {state?.error && <p className="col-span-full text-sm text-red-600">{state.error}</p>}
          <div className="col-span-full flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-ink-muted hover:text-ink">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

export default function PlaceTable({
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
  const [pending, startTransition] = useTransition();

  return (
    <>
      <FilterableTable
        columns={columns}
        rows={rows}
        defaultVisible={defaultVisible}
        emptyMessage={emptyMessage}
        searchKeys={["name", "address", "street", "neighborhood", "city", "postal_code", "query_norm"]}
        searchPlaceholder="Pesquisar por nome, rua, bairro, cidade, CEP, endereço ou busca..."
        renderRowActions={(row) => {
          const invalid = Boolean(row.invalidated_at);
          return (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditing(row)}
                aria-label="Editar endereço"
                title="Editar"
                className="text-ink-muted hover:text-accent"
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => startTransition(async () => void (await setPlaceInvalidated(row.id, !invalid)))}
                className={`text-xs font-medium hover:underline disabled:opacity-50 ${invalid ? "text-accent" : "text-red-600"}`}
              >
                {invalid ? "Reativar" : "Local errado"}
              </button>
            </div>
          );
        }}
      />
      {editing && <PlaceEditModal place={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

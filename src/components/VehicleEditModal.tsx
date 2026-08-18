"use client";

import { useActionState, useEffect } from "react";
import { updateVehicle, type VehicleFormState } from "@/app/(app)/veiculos/actions";

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "car", label: "Carro" },
  { value: "motorcycle", label: "Moto" },
  { value: "truck", label: "Caminhão" },
  { value: "bus", label: "Ônibus" },
  { value: "van", label: "Van" },
  { value: "tractor", label: "Trator" },
  { value: "harvester", label: "Colheitadeira" },
  { value: "forklift", label: "Empilhadeira" },
  { value: "generator", label: "Gerador" },
  { value: "trailer", label: "Reboque / Carreta" },
  { value: "equipment", label: "Equipamento" },
  { value: "other", label: "Outro" },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Ativo" },
  { value: "maintenance", label: "Manutenção" },
  { value: "stopped", label: "Parado" },
  { value: "critical", label: "Crítico" },
];

type Vehicle = Record<string, unknown> & { id: string };

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export default function VehicleEditModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<VehicleFormState, FormData>(
    updateVehicle,
    null,
  );

  // Fecha o modal sozinho quando a edição é salva com sucesso.
  useEffect(() => {
    if (state === null) return;
    if (!("error" in state)) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-3 rounded-xl border border-line bg-elevated p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-ink">Editar veículo</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Fechar
          </button>
        </div>

        <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={vehicle.id} />

          <input
            name="plate"
            placeholder="Placa"
            required
            defaultValue={str(vehicle.plate)}
            className={inputClass}
          />

          <select name="type" defaultValue={str(vehicle.type)} className={inputClass}>
            <option value="">Tipo (opcional)</option>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            name="brand"
            placeholder="Marca"
            defaultValue={str(vehicle.brand)}
            className={inputClass}
          />
          <input
            name="model"
            placeholder="Modelo"
            defaultValue={str(vehicle.model)}
            className={inputClass}
          />
          <input
            name="year"
            type="number"
            placeholder="Ano"
            defaultValue={str(vehicle.year)}
            className={inputClass}
          />
          <input
            name="color"
            placeholder="Cor"
            defaultValue={str(vehicle.color)}
            className={inputClass}
          />
          <input
            name="driver_phone"
            placeholder="Telefone do motorista"
            defaultValue={str(vehicle.driver_phone)}
            className={inputClass}
          />

          <select name="status" defaultValue={str(vehicle.status) || "active"} className={inputClass}>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {state?.error && (
            <p className="col-span-full text-sm text-red-600">{state.error}</p>
          )}

          <div className="col-span-full flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-ink-muted hover:text-ink"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { createVehicle, type VehicleFormState } from "@/app/(app)/veiculos/actions";

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

export default function VehicleQuickAddForm() {
  const [state, formAction, pending] = useActionState<VehicleFormState, FormData>(
    createVehicle,
    null,
  );

  return (
    <form
      action={formAction}
      className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-elevated p-6 sm:grid-cols-5"
    >
      <input name="plate" placeholder="Placa" required className={inputClass} />
      <input name="brand" placeholder="Marca" className={inputClass} />
      <input name="model" placeholder="Modelo" className={inputClass} />
      <input name="year" type="number" placeholder="Ano" className={inputClass} />
      <input name="color" placeholder="Cor" className={inputClass} />

      {state?.error && (
        <p className="col-span-full text-sm text-red-600">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="col-span-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50 sm:col-span-1"
      >
        {pending ? "Salvando..." : "Adicionar"}
      </button>
    </form>
  );
}

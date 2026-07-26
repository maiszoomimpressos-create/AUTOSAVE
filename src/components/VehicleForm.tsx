"use client";

import { useActionState } from "react";
import type { VehicleInput } from "@/lib/vehicles";

type FormState = {
  errors?: Partial<Record<keyof VehicleInput, string>>;
  values?: VehicleInput;
} | null;

type Props = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultValues?: Partial<VehicleInput>;
  submitLabel: string;
};

export default function VehicleForm({ action, defaultValues, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  const values = state?.values ?? defaultValues ?? {};
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4 max-w-md">
      <Field label="Placa" name="placa" defaultValue={values.placa} error={errors.placa} />
      <Field label="Marca" name="marca" defaultValue={values.marca} error={errors.marca} />
      <Field label="Modelo" name="modelo" defaultValue={values.modelo} error={errors.modelo} />
      <Field
        label="Ano"
        name="ano"
        type="number"
        defaultValue={values.ano?.toString()}
        error={errors.ano}
      />
      <Field label="Cor" name="cor" defaultValue={values.cor} error={errors.cor} />
      <Field
        label="Proprietário"
        name="proprietario"
        defaultValue={values.proprietario}
        error={errors.proprietario}
      />
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {error && <span className="text-sm text-red-600">{error}</span>}
    </label>
  );
}

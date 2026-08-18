"use client";

import { useActionState, useEffect, useState } from "react";
import { updateCustomer, type CustomerFormState } from "@/app/(app)/cadastros/actions";
import ModalBackdrop from "@/components/ModalBackdrop";

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

type Customer = Record<string, unknown> & { id: string };

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export default function CustomerEditModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(
    updateCustomer,
    null,
  );
  const [type, setType] = useState<"pf" | "pj">(
    str(customer.customer_type) === "pj" ? "pj" : "pf",
  );

  const saved = state?.ok === true;

  // Depois de salvar, mostra a confirmação por um instante e fecha sozinho.
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(onClose, 1400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  return (
    <ModalBackdrop onClose={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-2xl flex-col gap-3 rounded-xl border border-line bg-elevated p-6 shadow-lg"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-ink">Editar cadastro</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Fechar
          </button>
        </div>

        {saved && (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            ✓ Cadastro atualizado com sucesso.
          </p>
        )}

        {!saved && (
        <form
          action={formAction}
          className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1"
        >
          <input type="hidden" name="id" value={customer.id} />
          <input type="hidden" name="customer_type" value={type} />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("pf")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                type === "pf"
                  ? "bg-accent text-accent-ink"
                  : "border border-line text-ink-muted hover:text-ink"
              }`}
            >
              Pessoa física
            </button>
            <button
              type="button"
              onClick={() => setType("pj")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                type === "pj"
                  ? "bg-accent text-accent-ink"
                  : "border border-line text-ink-muted hover:text-ink"
              }`}
            >
              Pessoa jurídica
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <input
              name="full_name"
              placeholder={type === "pj" ? "Razão social" : "Nome completo"}
              required
              defaultValue={str(customer.full_name)}
              className={inputClass}
            />
            {type === "pj" && (
              <>
                <input
                  name="trade_name"
                  placeholder="Nome fantasia"
                  defaultValue={str(customer.trade_name)}
                  className={inputClass}
                />
                <input
                  name="cnpj"
                  placeholder="CNPJ"
                  defaultValue={str(customer.cnpj)}
                  className={inputClass}
                />
              </>
            )}
            {type === "pf" && (
              <>
                <input
                  name="cpf"
                  placeholder="CPF"
                  defaultValue={str(customer.cpf)}
                  className={inputClass}
                />
                <input
                  name="rg"
                  placeholder="RG"
                  defaultValue={str(customer.rg)}
                  className={inputClass}
                />
                <input
                  name="birth_date"
                  type="date"
                  placeholder="Nascimento"
                  defaultValue={str(customer.birth_date)}
                  className={inputClass}
                />
              </>
            )}
            <input
              name="email"
              type="email"
              placeholder="E-mail"
              defaultValue={str(customer.email)}
              className={inputClass}
            />
            <input
              name="phone"
              placeholder="Telefone"
              defaultValue={str(customer.phone)}
              className={inputClass}
            />
          </div>

          <div className="border-t border-line pt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Endereço
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <input
                name="zip_code"
                placeholder="CEP"
                defaultValue={str(customer.zip_code)}
                className={inputClass}
              />
              <input
                name="street"
                placeholder="Rua"
                defaultValue={str(customer.street)}
                className={inputClass}
              />
              <input
                name="street_number"
                placeholder="Número"
                defaultValue={str(customer.street_number)}
                className={inputClass}
              />
              <input
                name="neighborhood"
                placeholder="Bairro"
                defaultValue={str(customer.neighborhood)}
                className={inputClass}
              />
              <input
                name="city"
                placeholder="Cidade"
                defaultValue={str(customer.city)}
                className={inputClass}
              />
              <input
                name="state"
                placeholder="UF"
                maxLength={2}
                defaultValue={str(customer.state)}
                className={inputClass}
              />
              <input
                name="complement"
                placeholder="Complemento"
                defaultValue={str(customer.complement)}
                className={inputClass}
              />
              <input
                name="address_type"
                placeholder="Tipo de endereço"
                defaultValue={str(customer.address_type)}
                className={inputClass}
              />
            </div>
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex items-center gap-3 border-t border-line pt-3">
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
        )}
      </div>
    </ModalBackdrop>
  );
}

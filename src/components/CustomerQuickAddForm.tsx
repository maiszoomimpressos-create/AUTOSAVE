"use client";

import { useActionState, useState } from "react";
import { createCustomer, type CustomerFormState } from "@/app/(app)/cadastros/actions";

const inputClass =
  "rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent";

type CnpjLookup = {
  found: boolean;
  razao_social: string | null;
  nome_fantasia: string | null;
  email: string | null;
  phone: string | null;
  situacao: string | null;
};

export default function CustomerQuickAddForm() {
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(
    createCustomer,
    null,
  );
  const [type, setType] = useState<"pf" | "pj">("pf");

  const [fullName, setFullName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [cnpjBuscando, setCnpjBuscando] = useState(false);
  const [cnpjResultado, setCnpjResultado] = useState<CnpjLookup | null>(null);

  async function handleCnpjBlur(value: string) {
    const digits = value.replace(/\D/g, "");
    setCnpjResultado(null);
    if (digits.length !== 14) return;

    setCnpjBuscando(true);
    try {
      const res = await fetch(`/api/cnpj-lookup?cnpj=${digits}`);
      const data = (await res.json()) as CnpjLookup;
      if (data.found) {
        setCnpjResultado(data);
        if (!fullName.trim() && data.razao_social) setFullName(data.razao_social);
        if (!tradeName.trim() && data.nome_fantasia) setTradeName(data.nome_fantasia);
        if (!email.trim() && data.email) setEmail(data.email);
        if (!phone.trim() && data.phone) setPhone(data.phone);
      }
    } catch {
      // Busca é best-effort — se falhar, segue preenchimento manual.
    } finally {
      setCnpjBuscando(false);
    }
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-line bg-elevated p-6"
    >
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {type === "pj" && (
          <div className="relative">
            <input
              name="cnpj"
              placeholder="CNPJ"
              onBlur={(e) => handleCnpjBlur(e.target.value)}
              className={`${inputClass} w-full`}
            />
            {cnpjBuscando && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
                buscando...
              </span>
            )}
          </div>
        )}

        <input
          name="full_name"
          placeholder={type === "pj" ? "Razão social" : "Nome completo"}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className={inputClass}
        />

        {type === "pj" && (
          <input
            name="trade_name"
            placeholder="Nome fantasia"
            value={tradeName}
            onChange={(e) => setTradeName(e.target.value)}
            className={inputClass}
          />
        )}

        {type === "pf" && <input name="cpf" placeholder="CPF" className={inputClass} />}

        <input
          name="email"
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          name="phone"
          placeholder="Telefone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>

      {cnpjResultado && (
        <p className="text-xs text-ink-muted">
          Encontramos: {cnpjResultado.razao_social}
          {cnpjResultado.situacao ? ` — situação: ${cnpjResultado.situacao}` : ""}
        </p>
      )}

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-strong disabled:opacity-50"
      >
        {pending ? "Salvando..." : "Adicionar"}
      </button>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { createVehicle, type VehicleFormState } from "@/app/(app)/veiculos/actions";

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

// A FIPE só tem tabela pra esses três — os demais tipos continuam texto livre.
const FIPE_ELIGIBLE = new Set(["car", "motorcycle", "truck"]);

type FipeOption = { codigo: string | number; nome: string };

type PlateLookupResult = {
  found: boolean;
  source?: "database" | "api";
  brand?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  type?: string | null;
};

export default function VehicleQuickAddForm() {
  const [state, formAction, pending] = useActionState<VehicleFormState, FormData>(
    createVehicle,
    null,
  );

  const [type, setType] = useState("");
  const [manualMode, setManualMode] = useState(false);

  const [marcas, setMarcas] = useState<FipeOption[]>([]);
  const [marcasLoading, setMarcasLoading] = useState(false);
  const [marcasError, setMarcasError] = useState(false);
  const [selectedMarca, setSelectedMarca] = useState("");

  const [modelos, setModelos] = useState<FipeOption[]>([]);
  const [modelosLoading, setModelosLoading] = useState(false);
  const [modelosError, setModelosError] = useState(false);
  const [selectedModelo, setSelectedModelo] = useState("");

  // Preenchidos manualmente OU por uma consulta de placa bem-sucedida.
  const [manualBrand, setManualBrand] = useState("");
  const [manualModel, setManualModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");

  const [plateLookupLoading, setPlateLookupLoading] = useState(false);
  const [plateLookupMsg, setPlateLookupMsg] = useState<string | null>(null);

  const fipeEligible = FIPE_ELIGIBLE.has(type) && !manualMode;

  // Tipo mudou: reseta marca/modelo e busca as marcas da FIPE pro novo tipo.
  useEffect(() => {
    setSelectedMarca("");
    setSelectedModelo("");
    setModelos([]);

    if (!FIPE_ELIGIBLE.has(type) || manualMode) {
      setMarcas([]);
      return;
    }

    let cancelled = false;
    setMarcasLoading(true);
    setMarcasError(false);

    fetch(`/api/fipe/marcas?type=${type}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setMarcas(data.marcas ?? []);
      })
      .catch(() => {
        if (!cancelled) setMarcasError(true);
      })
      .finally(() => {
        if (!cancelled) setMarcasLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, manualMode]);

  // Marca mudou: busca os modelos dela.
  useEffect(() => {
    setSelectedModelo("");

    if (!selectedMarca || !fipeEligible) {
      setModelos([]);
      return;
    }

    const marca = marcas.find((m) => m.nome === selectedMarca);
    if (!marca) return;

    let cancelled = false;
    setModelosLoading(true);
    setModelosError(false);

    fetch(`/api/fipe/modelos?type=${type}&marca=${marca.codigo}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled) setModelos(data.modelos ?? []);
      })
      .catch(() => {
        if (!cancelled) setModelosError(true);
      })
      .finally(() => {
        if (!cancelled) setModelosLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarca]);

  const showFipeSelects = fipeEligible && !marcasError;

  // Placa perdeu o foco: busca primeiro no nosso banco, depois na API
  // externa (APIBrasil) — nessa ordem, pra só gastar consulta paga quando
  // realmente precisa.
  async function handlePlateBlur(value: string) {
    const plate = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    setPlateLookupMsg(null);
    if (plate.length !== 7) return;

    setPlateLookupLoading(true);
    try {
      const res = await fetch(`/api/plate-lookup?plate=${plate}`);
      const data = (await res.json()) as PlateLookupResult;

      if (!data.found) {
        setPlateLookupMsg(null);
        return;
      }

      if (data.source === "database") {
        setPlateLookupMsg("⚠ Essa placa já está cadastrada no sistema.");
        return;
      }

      // Achou na API externa — preenche o formulário automaticamente.
      // Troca pro modo manual porque já temos a marca/modelo exatos da API,
      // sem precisar passar pelos selects em cascata da tabela FIPE.
      setManualMode(true);
      if (data.brand) setManualBrand(data.brand);
      if (data.model) setManualModel(data.model);
      if (data.year) setYear(String(data.year));
      if (data.color) setColor(data.color);
      setPlateLookupMsg("✓ Dados encontrados e preenchidos automaticamente.");
    } catch {
      // Busca é best-effort — se falhar, segue preenchimento manual.
    } finally {
      setPlateLookupLoading(false);
    }
  }

  return (
    <form
      action={formAction}
      className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-elevated p-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
    >
      <div className="relative">
        <input
          name="plate"
          placeholder="Placa"
          required
          onBlur={(e) => handlePlateBlur(e.target.value)}
          className={`${inputClass} w-full`}
        />
        {plateLookupLoading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            buscando...
          </span>
        )}
      </div>

      <select
        name="type"
        value={type}
        onChange={(e) => setType(e.target.value)}
        className={inputClass}
      >
        <option value="">Tipo (opcional)</option>
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {showFipeSelects ? (
        <>
          <select
            name="brand"
            value={selectedMarca}
            onChange={(e) => setSelectedMarca(e.target.value)}
            disabled={marcasLoading}
            className={inputClass}
          >
            <option value="">{marcasLoading ? "Carregando marcas..." : "Marca"}</option>
            {marcas.map((m) => (
              <option key={m.codigo} value={m.nome}>
                {m.nome}
              </option>
            ))}
          </select>

          <select
            name="model"
            value={selectedModelo}
            onChange={(e) => setSelectedModelo(e.target.value)}
            disabled={!selectedMarca || modelosLoading}
            className={inputClass}
          >
            <option value="">
              {!selectedMarca
                ? "Modelo"
                : modelosLoading
                  ? "Carregando modelos..."
                  : modelosError
                    ? "Falha ao carregar"
                    : "Modelo"}
            </option>
            {modelos.map((m) => (
              <option key={m.codigo} value={m.nome}>
                {m.nome}
              </option>
            ))}
          </select>
        </>
      ) : (
        <>
          <input
            name="brand"
            placeholder="Marca"
            value={manualBrand}
            onChange={(e) => setManualBrand(e.target.value)}
            className={inputClass}
          />
          <input
            name="model"
            placeholder="Modelo"
            value={manualModel}
            onChange={(e) => setManualModel(e.target.value)}
            className={inputClass}
          />
        </>
      )}

      <input
        name="year"
        type="number"
        placeholder="Ano"
        value={year}
        onChange={(e) => setYear(e.target.value)}
        className={inputClass}
      />
      <input
        name="color"
        placeholder="Cor"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className={inputClass}
      />
      <input name="driver_phone" placeholder="Telefone do motorista" className={inputClass} />

      {FIPE_ELIGIBLE.has(type) && (
        <button
          type="button"
          onClick={() => setManualMode((v) => !v)}
          className="col-span-full self-start text-left text-xs text-ink-muted underline hover:text-ink"
        >
          {manualMode ? "Usar tabela FIPE (marca/modelo)" : "Prefiro digitar marca/modelo manualmente"}
        </button>
      )}

      {marcasError && (
        <p className="col-span-full text-xs text-amber-600">
          Não deu pra carregar a tabela FIPE agora — preenchendo marca/modelo como texto livre.
        </p>
      )}

      {plateLookupMsg && (
        <p
          className={`col-span-full text-xs ${
            plateLookupMsg.startsWith("⚠") ? "text-amber-600" : "text-green-700"
          }`}
        >
          {plateLookupMsg}
        </p>
      )}

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

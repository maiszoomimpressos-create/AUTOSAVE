// Busca direta na tabela FIPE por codigoFipe — usado quando a APIBrasil
// devolve o fipeId junto da consulta de veículo (só acontece "em alguns
// casos", conforme confirmado pelo suporte da APIBrasil; não é garantido).
//
// Como o codigoFipe já identifica o veículo exato (sem precisar adivinhar
// marca/modelo/versão por nome), usamos a Parallelum v2, que permite
// consultar direto pelo código: https://fipe.parallelum.com.br/api/v2
const FIPE_V2_BASE = "https://fipe.parallelum.com.br/api/v2";

export type FipeVehicleKind = "cars" | "motorcycles" | "trucks";

// Mapeia o tipo_veiculo que vem da APIBrasil pro segmento da FIPE.
export function mapFipeVehicleKind(tipoVeiculo: string | null | undefined): FipeVehicleKind {
  const normalized = (tipoVeiculo ?? "").toLowerCase();
  if (normalized.includes("moto")) return "motorcycles";
  if (normalized.includes("camin") || normalized.includes("onibus") || normalized.includes("ônibus")) {
    return "trucks";
  }
  return "cars";
}

type FipeYearOption = { code: string; name: string };

type FipeYearDetail = {
  vehicleType: number;
  price: string;
  brand: string;
  model: string;
  modelYear: number;
  fuel: string;
  codeFipe: string;
  referenceMonth: string;
  fuelAcronym: string;
};

export type FipeLookupResult =
  | {
      ok: true;
      fipeCode: string;
      model: string;
      value: number;
      referenceMonth: string;
    }
  | { ok: false; reason: string };

// Código FIPE de veículo é sempre 6 dígitos + dígito verificador (ex.:
// "025267-0"). A APIBrasil às vezes manda outra coisa nesse campo (visto na
// prática: o código numérico da marca, tipo 21 pra Fiat) — sem essa
// validação a gente bateria num /years/404 e logaria um erro sem sentido.
const FIPE_CODE_PATTERN = /^\d{6}-\d$/;

function normalize(text: string | null | undefined): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacriticos (acentos)
    .toLowerCase();
}

// Entre os anos disponíveis pro código FIPE, acha o que bate com o
// ano_modelo e o combustível do veículo. Sem isso, um mesmo código de
// carro pode ter mais de uma variante de combustível listada por ano.
function pickYearOption(options: FipeYearOption[], modelYear: number, fuelHint: string): FipeYearOption | null {
  const sameYear = options.filter((o) => o.name.startsWith(String(modelYear)));
  if (sameYear.length === 0) return null;
  if (sameYear.length === 1) return sameYear[0];

  const fuel = normalize(fuelHint);
  const isFlex = fuel.includes("flex") || (fuel.includes("alcool") && fuel.includes("gasolina"));
  const isDiesel = fuel.includes("diesel");
  const isAlcool = !isFlex && (fuel.includes("alcool") || fuel.includes("etanol"));
  const isGasolina = !isFlex && fuel.includes("gasolina");

  const byName = (needle: string) => sameYear.find((o) => normalize(o.name).includes(needle));

  if (isFlex) return byName("flex") ?? sameYear[0];
  if (isDiesel) return byName("diesel") ?? sameYear[0];
  if (isAlcool) return byName("alcool") ?? sameYear[0];
  if (isGasolina) return byName("gasolina") ?? sameYear[0];
  return sameYear[0];
}

// Consulta o valor FIPE direto pelo código, sem depender de match de nome
// (marca/modelo por texto) — só entra em jogo quando a APIBrasil devolveu
// um fipeId de verdade nessa consulta.
export async function lookupFipeByCode(
  fipeCode: string,
  kind: FipeVehicleKind,
  modelYear: number | null,
  fuelHint: string | null,
): Promise<FipeLookupResult> {
  if (!FIPE_CODE_PATTERN.test(fipeCode)) {
    return { ok: false, reason: "invalid_fipe_id" };
  }
  if (!modelYear) {
    return { ok: false, reason: "missing_model_year" };
  }

  let yearsRes: Response;
  try {
    yearsRes = await fetch(`${FIPE_V2_BASE}/${kind}/${encodeURIComponent(fipeCode)}/years`, {
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.error(`[fipe] falha ao buscar anos do código ${fipeCode}:`, err);
    return { ok: false, reason: "network_error" };
  }

  if (!yearsRes.ok) {
    return { ok: false, reason: `http_${yearsRes.status}` };
  }

  const years = (await yearsRes.json()) as FipeYearOption[];
  const yearOption = pickYearOption(years, modelYear, fuelHint ?? "");
  if (!yearOption) {
    return { ok: false, reason: "year_not_found" };
  }

  let detailRes: Response;
  try {
    detailRes = await fetch(
      `${FIPE_V2_BASE}/${kind}/${encodeURIComponent(fipeCode)}/years/${encodeURIComponent(yearOption.code)}`,
      { signal: AbortSignal.timeout(10_000) },
    );
  } catch (err) {
    console.error(`[fipe] falha ao buscar detalhe do ano ${yearOption.code} (código ${fipeCode}):`, err);
    return { ok: false, reason: "network_error" };
  }

  if (!detailRes.ok) {
    return { ok: false, reason: `http_${detailRes.status}` };
  }

  const detail = (await detailRes.json()) as FipeYearDetail;
  const value = Number(detail.price.replace(/[^\d,]/g, "").replace(",", "."));

  return {
    ok: true,
    fipeCode: detail.codeFipe,
    model: detail.model,
    value: Number.isNaN(value) ? 0 : value,
    referenceMonth: detail.referenceMonth,
  };
}

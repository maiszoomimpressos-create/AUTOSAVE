export function normalizePlate(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Mirrors the vehicle_type / vehicle_status Postgres enums. Keep in sync with
// the DB — these are validated here so bad input gets a clean, fast 400
// instead of a raw Postgres error surfaced as a 500.
export const VEHICLE_TYPE_VALUES = [
  "car",
  "motorcycle",
  "truck",
  "bus",
  "van",
  "tractor",
  "harvester",
  "forklift",
  "generator",
  "trailer",
  "equipment",
  "other",
] as const;

export const VEHICLE_STATUS_VALUES = ["active", "maintenance", "stopped", "critical"] as const;

export type VehicleType = (typeof VEHICLE_TYPE_VALUES)[number];

function normalizeForMatch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase();
}

// Traduz o "tipo_veiculo" (e, como reforço, a "especie") que a APIBrasil
// devolve pro nosso enum de tipo — só entra em jogo quando o Detran de
// origem realmente informou o dado; "Desconhecido"/vazio não é chutado
// como "other", fica sem sugestão pro usuário escolher.
export function mapApiVehicleType(
  tipoVeiculo: string | null | undefined,
  especie?: string | null | undefined,
): VehicleType | null {
  const text = normalizeForMatch(`${tipoVeiculo ?? ""} ${especie ?? ""}`.trim());
  if (!text || text.includes("desconhecido")) return null;

  if (text.includes("moto") || text.includes("ciclomotor") || text.includes("triciclo")) {
    return "motorcycle";
  }
  if (text.includes("onibus")) return "bus";
  if (text.includes("semi-reboque") || text.includes("semirreboque") || text.includes("reboque")) {
    return "trailer";
  }
  if (text.includes("trator")) return "tractor";
  if (text.includes("colheitadeira")) return "harvester";
  if (text.includes("empilhadeira")) return "forklift";
  if (text.includes("gerador")) return "generator";
  if (text.includes("caminhao")) return "truck";
  if (
    text.includes("caminhonete") ||
    text.includes("camioneta") ||
    text.includes("utilitario") ||
    text.includes("furgao")
  ) {
    return "van";
  }
  if (text.includes("automovel") || text.includes("misto")) return "car";

  return "other";
}

export type VehicleTypeSpecHints = {
  displacementCc?: number | null;
  axles?: number | null;
  seats?: number | null;
  grossWeightKg?: number | null;
};

// Fallback quando o Detran não informa tipo_veiculo/especie ("Desconhecido"
// ou vazio) — deduz pelas especificações técnicas que a APIBrasil ainda
// manda mesmo nesse caso. É chute, não fato oficial: só usar quando
// mapApiVehicleType() já devolveu null, nunca pra sobrescrever um tipo
// que o Detran de fato informou.
export function inferVehicleTypeFromSpecs(hints: VehicleTypeSpecHints): VehicleType | null {
  const { displacementCc, axles, seats, grossWeightKg } = hints;

  // Nenhum carro vendido no Brasil tem motor abaixo de ~1.0L (999cc) — abaixo
  // de 500cc só existe em moto/scooter/ciclomotor, com boa margem de folga.
  if (displacementCc != null && displacementCc > 0 && displacementCc <= 500) {
    return "motorcycle";
  }

  // 10+ lugares é ônibus/micro-ônibus, não carro nem van de passeio.
  if (seats != null && seats >= 10) return "bus";

  // 3+ eixos ou 3.500kg+ de PBT é caminhão (categoria C de CNH em diante) —
  // carro e moto nunca chegam lá.
  if ((axles != null && axles >= 3) || (grossWeightKg != null && grossWeightKg >= 3500)) {
    return "truck";
  }

  return null;
}

// type/status are enum columns that must stay lowercase to match their DB enum labels.
const NO_UPPERCASE_FIELDS = new Set(["type", "status", "license_expiry"]);

export function uppercaseTextFields<T extends Record<string, unknown>>(fields: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] =
      typeof value === "string" && !NO_UPPERCASE_FIELDS.has(key)
        ? value.toUpperCase()
        : value;
  }
  return result as T;
}

export const VEHICLE_FIELDS = [
  "type",
  "brand",
  "model",
  "year",
  "color",
  "status",
  "odometer_km",
  "fuel_type",
  "chassis_number",
  "renavam",
  "notes",
  "engine_number",
  "owner_name",
  "owner_document",
  "driver_phone",
  "category",
  "species",
  "body_type",
  "capacity",
  "power_cv",
  "displacement",
  "cmt",
  "axles",
  "city",
  "state",
  "licensing_year",
  "restrictions",
  "security_code",
  "license_expiry",
] as const;

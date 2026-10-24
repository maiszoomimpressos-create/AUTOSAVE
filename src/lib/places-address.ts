// Endereco estruturado + busca nos dois sentidos + deduplicacao (places_cache).
// Modulo PURO (sem imports): roda no Next e em `node --test` (tests/).
//
// - parseBrazilianAddress: "Av. Assuncao, 1757 - Alto Alegre, Cascavel - PR, 85805-030"
//   -> rua, numero, bairro, cidade, UF, CEP (formato do Google formattedAddress).
// - fromGoogleComponents / fromNominatimAddress: quando o provedor manda os
//   componentes, eles tem prioridade sobre o texto.
// - isAddressQuery/parseAddressQuery: decide se a busca e por ENDERECO (rua,
//   numero) -> lista os lugares naquela rua; senao e por NOME -> traz o endereco.
// - dedupePlaces: mesmo place_id, ou mesmo nome normalizado a < 50 m.

export type StructuredAddress = {
  street: string | null;
  street_number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
};

export const EMPTY_ADDRESS: StructuredAddress = {
  street: null,
  street_number: null,
  neighborhood: null,
  city: null,
  state: null,
  postal_code: null,
};

export function normalizeText(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STREET_ABBREV: Record<string, string> = {
  r: "rua",
  av: "avenida",
  avda: "avenida",
  tv: "travessa",
  trav: "travessa",
  rod: "rodovia",
  al: "alameda",
  est: "estrada",
  estr: "estrada",
  pca: "praca",
  pc: "praca",
  lgo: "largo",
  dr: "doutor",
  dra: "doutora",
  prof: "professor",
  profa: "professora",
  pres: "presidente",
  gov: "governador",
  sen: "senador",
  dep: "deputado",
  cel: "coronel",
  gal: "general",
  cap: "capitao",
  sta: "santa",
  sto: "santo",
  n: "nossa",
  sra: "senhora",
};

const STREET_TYPES = new Set(["rua", "avenida", "travessa", "rodovia", "alameda", "estrada", "praca", "largo", "via", "viela", "servidao", "br", "pr", "sc", "rs", "sp"]);

/** Nome de rua normalizado: sem acento, minusculo, abreviacoes expandidas (Av. -> avenida). */
export function normalizeStreet(street: string): string {
  return normalizeText(street)
    .split(" ")
    .filter(Boolean)
    .map((w) => STREET_ABBREV[w] ?? w)
    .join(" ");
}

function clean(s: string | null | undefined): string | null {
  const t = (s ?? "").replace(/\s+/g, " ").trim().replace(/^[,\-\s]+|[,\-\s]+$/g, "");
  return t ? t : null;
}

function looksLikeStreet(part: string): boolean {
  const first = normalizeStreet(part).split(" ")[0] ?? "";
  return STREET_TYPES.has(first);
}

/** Endereco formatado brasileiro (Google) -> campos. Campos nao reconhecidos ficam null. */
export function parseBrazilianAddress(formatted: string | null | undefined): StructuredAddress {
  const out: StructuredAddress = { ...EMPTY_ADDRESS };
  let s = (formatted ?? "").trim();
  if (!s) return out;
  s = s.replace(/,\s*(Brasil|Brazil)\s*$/i, "");

  const cep = s.match(/\b(\d{5})-?(\d{3})\b/);
  if (cep) {
    out.postal_code = `${cep[1]}-${cep[2]}`;
    s = (s.slice(0, cep.index) + s.slice((cep.index ?? 0) + cep[0].length)).trim();
  }
  s = s.replace(/[,\s]+$/, "");

  // "... Cidade - UF" no fim
  const cityUf = s.match(/(?:^|,)\s*([^,]+?)\s+-\s+([A-Z]{2})\s*$/);
  if (cityUf) {
    out.city = clean(cityUf[1]);
    out.state = cityUf[2];
    s = s.slice(0, cityUf.index).trim();
  }
  s = s.replace(/[,\s]+$/, "");
  if (!s) return out;

  const parts = s.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  let streetIdx = parts.findIndex((p) => looksLikeStreet(p));
  if (streetIdx < 0) streetIdx = parts.findIndex((p) => /,\s*(\d+[a-zA-Z]?|s\/?n)\b/i.test(p));
  if (streetIdx >= 0) {
    const m = parts[streetIdx].match(/^(.*?),\s*(\d+[a-zA-Z]?|s\/?n)\b/i);
    out.street = clean(m ? m[1] : parts[streetIdx].split(",")[0]);
    out.street_number = m ? m[2].toUpperCase() === "SN" || /s\/n/i.test(m[2]) ? "S/N" : m[2] : null;
    const after = parts.slice(streetIdx + 1);
    if (after.length) out.neighborhood = clean(after[after.length - 1].split(",")[0]);
  } else if (parts.length) {
    // So bairro/area (ex.: "Centro, Francisco Beltrao - PR")
    out.neighborhood = clean(parts[parts.length - 1].split(",")[0]);
  }
  return out;
}

type GoogleComponent = { longText?: string; shortText?: string; types?: string[] };

export function fromGoogleComponents(components: GoogleComponent[] | null | undefined): StructuredAddress {
  const out: StructuredAddress = { ...EMPTY_ADDRESS };
  if (!Array.isArray(components)) return out;
  const get = (type: string, short = false) => {
    const c = components.find((x) => x.types?.includes(type));
    return clean(short ? c?.shortText ?? c?.longText : c?.longText ?? c?.shortText);
  };
  out.street = get("route");
  out.street_number = get("street_number");
  out.neighborhood = get("sublocality_level_1") ?? get("sublocality") ?? get("neighborhood");
  out.city = get("administrative_area_level_2") ?? get("locality");
  out.state = get("administrative_area_level_1", true);
  out.postal_code = get("postal_code");
  return out;
}

export function fromNominatimAddress(a: Record<string, string | undefined> | null | undefined): StructuredAddress {
  const out: StructuredAddress = { ...EMPTY_ADDRESS };
  if (!a) return out;
  out.street = clean(a.road ?? a.pedestrian ?? a.footway);
  out.street_number = clean(a.house_number);
  out.neighborhood = clean(a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district);
  out.city = clean(a.city ?? a.town ?? a.village ?? a.municipality);
  const iso = a["ISO3166-2-lvl4"];
  out.state = iso?.startsWith("BR-") ? iso.slice(3) : clean(a.state);
  out.postal_code = clean(a.postcode);
  return out;
}

/** Componentes do provedor primeiro; o que faltar vem do texto formatado. */
export function mergeAddress(primary: StructuredAddress, fallback: StructuredAddress): StructuredAddress {
  const out = { ...EMPTY_ADDRESS };
  for (const k of Object.keys(out) as (keyof StructuredAddress)[]) out[k] = primary[k] ?? fallback[k];
  return out;
}

export type AddressQuery = { street: string; street_norm: string; number: string | null };

/**
 * Busca por endereco = comeca com tipo de logradouro (rua, av., travessa...)
 * ou tem numero depois de um texto ("damasco 120"). Senao e busca por nome.
 */
export function parseAddressQuery(q: string): AddressQuery | null {
  const raw = q.trim();
  if (!raw) return null;
  const m = raw.match(/^(.*?)[,\s]+(\d+[a-zA-Z]?)\b/);
  const streetText = clean(m ? m[1] : raw.split(/\s+-\s+|,/)[0]) ?? "";
  const number = m ? m[2] : null;
  const isStreet = looksLikeStreet(streetText) || (number != null && /[a-zA-Z]{3,}/.test(streetText));
  if (!isStreet) return null;
  const street_norm = normalizeStreet(streetText);
  if (street_norm.length < 3) return null;
  return { street: streetText, street_norm, number };
}

export function isAddressQuery(q: string): boolean {
  return parseAddressQuery(q) != null;
}

export function distanceMeters(
  a: { lat: number | null; lng: number | null },
  b: { lat: number | null; lng: number | null },
): number {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Infinity;
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const DEDUPE_RADIUS_M = 50;

/** Remove repetidos mantendo o 1o: mesmo place_id, ou mesmo nome normalizado a < 50 m. */
export function dedupePlaces<T extends { place_id: string; name: string; lat: number | null; lng: number | null }>(list: T[]): T[] {
  const out: T[] = [];
  const ids = new Set<string>();
  for (const p of list) {
    if (ids.has(p.place_id)) continue;
    const n = normalizeText(p.name);
    if (out.some((o) => normalizeText(o.name) === n && distanceMeters(o, p) < DEDUPE_RADIUS_M)) continue;
    ids.add(p.place_id);
    out.push(p);
  }
  return out;
}
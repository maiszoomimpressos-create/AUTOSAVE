import { createAdminClient } from "@/lib/supabase/admin";
import {
  dedupePlaces,
  distanceMeters,
  fromGoogleComponents,
  fromNominatimAddress,
  mergeAddress,
  normalizeStreet,
  normalizeText,
  parseAddressQuery,
  parseBrazilianAddress,
  type StructuredAddress,
} from "@/lib/places-address";

// Busca de enderecos / pontos de interesse com cache proprio (places_cache).
// Ordem: cache valido da MESMA busca -> cache por nome/rua (2026-10-24) ->
// Google Places Text Search (se GOOGLE_PLACES_API_KEY existir) ->
// Nominatim/OSM (gratis) -> grava no cache por 90 dias. O "Local errado" do
// parceiro marca invalidated_at, e a proxima busca vai de novo ao provedor.

// Contrato da API: name/address/lat/lng/place_id sempre; os campos de
// endereco estruturado e `match` sao ADICIONAIS (2026-10-24) - clientes
// antigos (MAI Drive places-search) simplesmente ignoram.
export type PlaceResult = {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string;
} & StructuredAddress & {
    /** query = mesma busca; name = achado pelo nome; address = lugar cadastrado nessa rua */
    match?: "query" | "name" | "address";
  };

export type PlaceSource = "cache" | "google" | "nominatim" | "none";

type ProviderHit = PlaceResult & { raw: unknown };

const MAX_RESULTS = 5;
const CACHE_DAYS = 90;
const TEXT_SEARCH_RADIUS_M = 30000;
const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT || "AUTOSAVE-places/1.0 (MAI Drive; contato via autosave)";

const BASE_COLS = "name, address, lat, lng, place_id";
const ADDR_COLS = "street, street_number, neighborhood, city, state, postal_code";
const STRUCTURED_KEYS = ["street", "street_number", "neighborhood", "city", "state", "postal_code", "name_norm", "street_norm"];

// Ate a migration 20261024000000_places_structured_address ser aplicada as
// colunas novas nao existem: na 1a falha (42703 / PGRST204) o modulo passa a
// usar so as colunas antigas e desliga a busca por nome/rua no cache.
let structuredAvailable = true;
function isMissingColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === "42703" ||
    err.code === "PGRST204" ||
    /column .* does not exist|Could not find the .* column/i.test(err.message ?? "")
  );
}

export function normalizeQuery(q: string): string {
  return normalizeText(q);
}

// ~1,1 km de precisao - buscas proximas compartilham o mesmo cache.
export function bucket(value: number | null): number | null {
  return value == null ? null : Math.round(value * 100) / 100;
}

export function parseCoord(value: string | null, limit: number): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

async function searchGoogle(
  q: string,
  lat: number | null,
  lng: number | null,
  apiKey: string,
): Promise<ProviderHit[]> {
  const body: Record<string, unknown> = {
    textQuery: q,
    languageCode: "pt-BR",
    regionCode: "BR",
    maxResultCount: MAX_RESULTS,
  };
  if (lat != null && lng != null) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 30000 } };
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google Places HTTP ${res.status}`);
  const json = (await res.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      location?: { latitude?: number; longitude?: number };
      addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
    }>;
  };
  return (json.places ?? []).map((p) => ({
    place_id: `google:${p.id}`,
    name: p.displayName?.text ?? p.formattedAddress ?? q,
    address: p.formattedAddress ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    ...mergeAddress(fromGoogleComponents(p.addressComponents), parseBrazilianAddress(p.formattedAddress)),
    raw: p,
  }));
}

// Politica do Nominatim: no maximo 1 requisicao/segundo e User-Agent proprio.
let nominatimQueue: Promise<void> = Promise.resolve();
let nominatimLast = 0;
function nominatimSlot(): Promise<void> {
  const next = nominatimQueue.then(async () => {
    const wait = nominatimLast + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    nominatimLast = Date.now();
  });
  nominatimQueue = next.catch(() => undefined);
  return next;
}

async function searchNominatim(
  q: string,
  lat: number | null,
  lng: number | null,
): Promise<ProviderHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("limit", String(MAX_RESULTS));
  url.searchParams.set("accept-language", "pt-BR");
  url.searchParams.set("addressdetails", "1");
  if (lat != null && lng != null) {
    const d = 0.3; // ~30 km, so preferencia (bounded=0)
    url.searchParams.set("viewbox", `${lng - d},${lat + d},${lng + d},${lat - d}`);
  }
  await nominatimSlot();
  const res = await fetch(url, {
    headers: { "User-Agent": NOMINATIM_UA, Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const json = (await res.json()) as Array<{
    osm_type?: string;
    osm_id?: number;
    place_id?: number;
    name?: string;
    display_name?: string;
    lat?: string;
    lon?: string;
    address?: Record<string, string | undefined>;
  }>;
  return json.map((p) => ({
    place_id: p.osm_type && p.osm_id ? `osm:${p.osm_type}:${p.osm_id}` : `osm:${p.place_id}`,
    name: p.name || (p.display_name ?? q).split(",")[0],
    address: p.display_name ?? null,
    lat: p.lat != null ? Number(p.lat) : null,
    lng: p.lon != null ? Number(p.lon) : null,
    ...fromNominatimAddress(p.address),
    raw: p,
  }));
}

function str(v: unknown): string | null {
  return v == null || v === "" ? null : String(v);
}

function toResult(row: Record<string, unknown>, match: PlaceResult["match"]): PlaceResult {
  const fromCols: StructuredAddress = {
    street: str(row.street),
    street_number: str(row.street_number),
    neighborhood: str(row.neighborhood),
    city: str(row.city),
    state: str(row.state),
    postal_code: str(row.postal_code),
  };
  return {
    name: row.name as string,
    address: str(row.address),
    lat: row.lat as number | null,
    lng: row.lng as number | null,
    place_id: row.place_id as string,
    // Linha antiga sem as colunas preenchidas: deriva do texto na hora.
    ...mergeAddress(fromCols, parseBrazilianAddress(str(row.address))),
    match,
  };
}

/** Colunas gravadas no cache para um lugar (nome/rua normalizados = busca nos dois sentidos). */
export function structuredColumns(p: { name: string } & StructuredAddress) {
  return {
    street: p.street,
    street_number: p.street_number,
    neighborhood: p.neighborhood,
    city: p.city,
    state: p.state,
    postal_code: p.postal_code,
    name_norm: normalizeText(p.name),
    street_norm: p.street ? normalizeStreet(p.street) : null,
  };
}

/**
 * Busca no cache nos DOIS sentidos (so linhas validas do workspace):
 * - endereco ("Rua X, 120", "av brasil 50"): lugares cadastrados nessa rua
 *   (street_norm), com o mesmo numero primeiro;
 * - nome ("rodoviaria municipal"): lugares cujo nome contem o texto -> traz o endereco.
 * Com lat/lng, so ate 30 km. Sem resultado devolve [] e a busca segue pro provedor.
 */
async function searchCacheByText(
  supabase: ReturnType<typeof createAdminClient>,
  params: { workspaceId: string; q: string; lat: number | null; lng: number | null },
  nowIso: string,
): Promise<PlaceResult[]> {
  if (!structuredAvailable) return [];
  const addr = parseAddressQuery(params.q);
  const qn = normalizeText(params.q);
  let query = supabase
    .from("places_cache")
    .select(`${BASE_COLS}, ${ADDR_COLS}`)
    .eq("workspace_id", params.workspaceId)
    .is("invalidated_at", null)
    .gt("expires_at", nowIso)
    .order("fetched_at", { ascending: true })
    .limit(200);
  if (addr) query = query.eq("street_norm", addr.street_norm);
  else if (qn.length >= 4) query = query.ilike("name_norm", `%${qn}%`);
  else return [];

  const { data, error } = await query;
  if (error) {
    if (isMissingColumn(error)) structuredAvailable = false;
    else console.error("[places] busca no cache por nome/rua falhou:", error.message);
    return [];
  }
  const here = { lat: params.lat, lng: params.lng };
  const hasHere = params.lat != null && params.lng != null;
  let rows = (data ?? []).map((r) => toResult(r as Record<string, unknown>, addr ? "address" : "name"));
  if (hasHere) rows = rows.filter((r) => distanceMeters(here, r) <= TEXT_SEARCH_RADIUS_M);
  if (hasHere) rows.sort((a, b) => distanceMeters(here, a) - distanceMeters(here, b));
  if (addr?.number) {
    const n = addr.number.toUpperCase();
    const same = (r: PlaceResult) => Number((r.street_number ?? "").toUpperCase() === n);
    rows.sort((a, b) => same(b) - same(a));
  }
  return dedupePlaces(rows).slice(0, MAX_RESULTS);
}

export async function searchPlaces(params: {
  workspaceId: string;
  q: string;
  lat: number | null;
  lng: number | null;
}): Promise<{ found: boolean; source: PlaceSource; results: PlaceResult[] }> {
  const supabase = createAdminClient();
  const queryNorm = normalizeQuery(params.q);
  const latB = bucket(params.lat);
  const lngB = bucket(params.lng);
  const nowIso = new Date().toISOString();

  const runCacheQuery = (cols: string) => {
    let cq = supabase
      .from("places_cache")
      .select(cols)
      .eq("workspace_id", params.workspaceId)
      .eq("query_norm", queryNorm)
      .is("invalidated_at", null)
      .gt("expires_at", nowIso)
      .order("fetched_at", { ascending: true })
      .limit(MAX_RESULTS * 2);
    cq = latB == null ? cq.is("lat_bucket", null) : cq.eq("lat_bucket", latB);
    cq = lngB == null ? cq.is("lng_bucket", null) : cq.eq("lng_bucket", lngB);
    return cq;
  };

  let { data: cached, error: cacheError } = await runCacheQuery(
    structuredAvailable ? `${BASE_COLS}, ${ADDR_COLS}` : BASE_COLS,
  );
  if (cacheError && structuredAvailable && isMissingColumn(cacheError)) {
    structuredAvailable = false;
    ({ data: cached, error: cacheError } = await runCacheQuery(BASE_COLS));
  }
  if (cacheError) throw new Error(cacheError.message);
  if (cached && cached.length > 0) {
    const rows = cached as unknown as Record<string, unknown>[];
    return { found: true, source: "cache", results: dedupePlaces(rows.map((r) => toResult(r, "query"))).slice(0, MAX_RESULTS) };
  }

  // A mesma busca nao esta no cache: tenta pelo nome / pela rua no que ja foi salvo.
  const byText = await searchCacheByText(supabase, params, nowIso);
  if (byText.length > 0) return { found: true, source: "cache", results: byText };

  // Lugares que o parceiro marcou como "Local errado" nao voltam por essa busca.
  const { data: bad } = await supabase
    .from("places_cache")
    .select("place_id")
    .eq("workspace_id", params.workspaceId)
    .eq("query_norm", queryNorm)
    .not("invalidated_at", "is", null);
  const badIds = new Set((bad ?? []).map((r) => r.place_id as string));

  let source: PlaceSource = "none";
  let hits: ProviderHit[] = [];
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (googleKey) {
    try {
      hits = await searchGoogle(params.q, params.lat, params.lng, googleKey);
      source = "google";
    } catch (e) {
      console.error("[places] Google falhou, caindo pro Nominatim:", (e as Error).message);
    }
  }
  if (source === "none") {
    hits = await searchNominatim(params.q, params.lat, params.lng);
    source = "nominatim";
  }

  // Prevencao de duplicados na gravacao: mesmo place_id, ou mesmo nome a < 50 m.
  hits = dedupePlaces(hits.filter((h) => !badIds.has(h.place_id)));
  if (hits.length === 0) return { found: false, source, results: [] };

  const expires = new Date(Date.now() + CACHE_DAYS * 86400_000).toISOString();
  const rows: Record<string, unknown>[] = hits.map((h) => ({
    workspace_id: params.workspaceId,
    query_norm: queryNorm,
    lat_bucket: latB,
    lng_bucket: lngB,
    place_id: h.place_id,
    name: h.name,
    address: h.address,
    lat: h.lat,
    lng: h.lng,
    ...(structuredAvailable ? structuredColumns(h) : {}),
    source,
    raw: h.raw,
    fetched_at: nowIso,
    expires_at: expires,
    invalidated_at: null,
    updated_at: nowIso,
  }));
  const onConflict = "workspace_id,query_norm,lat_bucket,lng_bucket,place_id";
  let { error: upsertError } = await supabase.from("places_cache").upsert(rows, { onConflict });
  if (upsertError && isMissingColumn(upsertError)) {
    structuredAvailable = false;
    const legacy = rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !STRUCTURED_KEYS.includes(k))));
    ({ error: upsertError } = await supabase.from("places_cache").upsert(legacy, { onConflict }));
  }
  if (upsertError) console.error("[places] falha ao gravar cache:", upsertError.message);

  return {
    found: true,
    source,
    results: hits.map((h) => {
      const r: PlaceResult & { raw?: unknown } = { ...h, match: "query" };
      delete r.raw;
      return r;
    }),
  };
}
export async function invalidatePlace(params: {
  workspaceId: string;
  id?: string;
  placeId?: string;
}): Promise<number> {
  const supabase = createAdminClient();
  let q = supabase
    .from("places_cache")
    .update({ invalidated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("workspace_id", params.workspaceId)
    .is("invalidated_at", null);
  if (params.id) q = q.eq("id", params.id);
  else if (params.placeId) q = q.eq("place_id", params.placeId);
  else return 0;
  const { data, error } = await q.select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

import { createAdminClient } from "@/lib/supabase/admin";

// Busca de endereços / pontos de interesse com cache próprio (places_cache).
// Ordem: cache válido (não expirado, não invalidado) → Google Places Text
// Search (se GOOGLE_PLACES_API_KEY existir) → Nominatim/OSM (grátis) →
// grava no cache por 90 dias. O "Local errado" do parceiro marca
// invalidated_at, e a próxima busca vai de novo ao provedor.

export type PlaceResult = {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  place_id: string;
};

export type PlaceSource = "cache" | "google" | "nominatim" | "none";

type ProviderHit = PlaceResult & { raw: unknown };

const MAX_RESULTS = 5;
const CACHE_DAYS = 90;
const NOMINATIM_UA =
  process.env.NOMINATIM_USER_AGENT || "AUTOSAVE-places/1.0 (MAI Drive; contato via autosave)";

export function normalizeQuery(q: string): string {
  return q
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ~1,1 km de precisão — buscas próximas compartilham o mesmo cache.
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
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
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
    }>;
  };
  return (json.places ?? []).map((p) => ({
    place_id: `google:${p.id}`,
    name: p.displayName?.text ?? p.formattedAddress ?? q,
    address: p.formattedAddress ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    raw: p,
  }));
}

// Política do Nominatim: no máximo 1 requisição/segundo e User-Agent próprio.
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
  if (lat != null && lng != null) {
    const d = 0.3; // ~30 km, só preferência (bounded=0)
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
  }>;
  return json.map((p) => ({
    place_id: p.osm_type && p.osm_id ? `osm:${p.osm_type}:${p.osm_id}` : `osm:${p.place_id}`,
    name: p.name || (p.display_name ?? q).split(",")[0],
    address: p.display_name ?? null,
    lat: p.lat != null ? Number(p.lat) : null,
    lng: p.lon != null ? Number(p.lon) : null,
    raw: p,
  }));
}

function toResult(row: Record<string, unknown>): PlaceResult {
  return {
    name: row.name as string,
    address: (row.address as string | null) ?? null,
    lat: row.lat as number | null,
    lng: row.lng as number | null,
    place_id: row.place_id as string,
  };
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

  let cacheQuery = supabase
    .from("places_cache")
    .select("name, address, lat, lng, place_id")
    .eq("workspace_id", params.workspaceId)
    .eq("query_norm", queryNorm)
    .is("invalidated_at", null)
    .gt("expires_at", nowIso)
    .order("fetched_at", { ascending: true })
    .limit(MAX_RESULTS);
  cacheQuery = latB == null ? cacheQuery.is("lat_bucket", null) : cacheQuery.eq("lat_bucket", latB);
  cacheQuery = lngB == null ? cacheQuery.is("lng_bucket", null) : cacheQuery.eq("lng_bucket", lngB);

  const { data: cached, error: cacheError } = await cacheQuery;
  if (cacheError) throw new Error(cacheError.message);
  if (cached && cached.length > 0) {
    return { found: true, source: "cache", results: cached.map(toResult) };
  }

  // Lugares que o parceiro marcou como "Local errado" não voltam por essa busca.
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

  hits = hits.filter((h) => !badIds.has(h.place_id));
  if (hits.length === 0) return { found: false, source, results: [] };

  const expires = new Date(Date.now() + CACHE_DAYS * 86400_000).toISOString();
  const rows = hits.map((h) => ({
    workspace_id: params.workspaceId,
    query_norm: queryNorm,
    lat_bucket: latB,
    lng_bucket: lngB,
    place_id: h.place_id,
    name: h.name,
    address: h.address,
    lat: h.lat,
    lng: h.lng,
    source,
    raw: h.raw,
    fetched_at: nowIso,
    expires_at: expires,
    invalidated_at: null,
    updated_at: nowIso,
  }));
  const { error: upsertError } = await supabase
    .from("places_cache")
    .upsert(rows, { onConflict: "workspace_id,query_norm,lat_bucket,lng_bucket,place_id" });
  if (upsertError) console.error("[places] falha ao gravar cache:", upsertError.message);

  return { found: true, source, results: hits.map(({ raw: _raw, ...r }) => r) };
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

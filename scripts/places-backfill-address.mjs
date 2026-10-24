// Backfill das colunas de endereco estruturado em places_cache (migration
// 20261024000000_places_structured_address precisa estar aplicada).
// NAO EXECUTADO. Padrao = simulacao (so mostra contagens/exemplos, nao grava).
//   node scripts/places-backfill-address.mjs            -> simulacao
//   node scripts/places-backfill-address.mjs --apply    -> grava (com OK do Neomar)
// Usa DATABASE_URL do .env (nunca imprime). So preenche colunas que estao NULL;
// nao altera name/address/lat/lng nem apaga nada. Fonte: componentes do raw
// (Google addressComponents / Nominatim address) e, se faltar, o texto do address.
import "dotenv/config";
import pg from "pg";
import {
  fromGoogleComponents,
  fromNominatimAddress,
  mergeAddress,
  normalizeStreet,
  normalizeText,
  parseBrazilianAddress,
} from "../src/lib/places-address.ts";

const apply = process.argv.includes("--apply");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows } = await client.query(
    `SELECT id, name, address, raw FROM public.places_cache
      WHERE street IS NULL OR city IS NULL OR name_norm IS NULL`,
  );
  let filled = 0;
  const samples = [];
  if (apply) await client.query("BEGIN");
  for (const r of rows) {
    const raw = r.raw ?? {};
    const comp = raw.addressComponents
      ? fromGoogleComponents(raw.addressComponents)
      : raw.address && typeof raw.address === "object"
        ? fromNominatimAddress(raw.address)
        : parseBrazilianAddress(null);
    const a = mergeAddress(comp, parseBrazilianAddress(r.address));
    const name_norm = normalizeText(r.name ?? "");
    const street_norm = a.street ? normalizeStreet(a.street) : null;
    if (a.street || a.city) filled++;
    if (samples.length < 5) samples.push({ name: r.name, ...a });
    if (apply) {
      await client.query(
        `UPDATE public.places_cache SET
           street = COALESCE(street, $2), street_number = COALESCE(street_number, $3),
           neighborhood = COALESCE(neighborhood, $4), city = COALESCE(city, $5),
           state = COALESCE(state, $6), postal_code = COALESCE(postal_code, $7),
           name_norm = COALESCE(name_norm, $8), street_norm = COALESCE(street_norm, $9)
         WHERE id = $1`,
        [r.id, a.street, a.street_number, a.neighborhood, a.city, a.state, a.postal_code, name_norm, street_norm],
      );
    }
  }
  if (apply) await client.query("COMMIT");
  console.log(JSON.stringify({ modo: apply ? "APLICADO" : "SIMULACAO", linhas: rows.length, com_rua_ou_cidade: filled, exemplos: samples }, null, 1));
} catch (e) {
  if (apply) await client.query("ROLLBACK").catch(() => {});
  console.error("Falhou:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
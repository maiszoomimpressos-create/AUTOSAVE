// Gera uma chave x-api-key de parceiro (recurso "places") pelo mesmo formato de
// src/lib/api-keys.ts (ask_<48 hex>, guarda só o SHA-256 em api_keys).
// O valor bruto vai SÓ para o arquivo indicado — nunca é impresso.
// Uso: node --env-file=.env scripts/create-places-api-key.mjs "<nome>" "<arquivo de saída>"
import { randomBytes, createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [name, outFile] = process.argv.slice(2);
if (!name || !outFile) throw new Error("Uso: <nome> <arquivo de saída>");
if (existsSync(outFile)) throw new Error("Arquivo de saída já existe; não sobrescrevo.");
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret, DEFAULT_WORKSPACE_ID: ws } = process.env;
if (!url || !secret || !ws) throw new Error("Faltam variáveis NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY / DEFAULT_WORKSPACE_ID.");

const rawKey = `ask_${randomBytes(24).toString("hex")}`;
const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
const { data, error } = await supabase
  .from("api_keys")
  .insert({
    workspace_id: ws,
    name,
    resource: "places",
    allowed_fields: ["name", "address", "lat", "lng", "place_id"],
    key_hash: createHash("sha256").update(rawKey).digest("hex"),
    key_prefix: rawKey.slice(0, 12),
    webhook_url: null,
    webhook_secret: null,
  })
  .select("id, key_prefix")
  .single();
if (error) throw new Error(error.message);

writeFileSync(
  outFile,
  `# AUTOSAVE x-api-key do parceiro "${name}" (recurso places). NÃO versionar / NÃO compartilhar.\n` +
    `# api_keys.id=${data.id}  criada em ${new Date().toISOString()}\n` +
    `AUTOSAVE_PLACES_API_KEY=${rawKey}\n`,
  { mode: 0o600 },
);
console.log(`OK: chave criada (id ${data.id}, prefixo ${data.key_prefix.slice(0, 4)}…) e salva em ${outFile}`);

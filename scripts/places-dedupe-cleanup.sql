-- Limpeza de duplicados em places_cache. NAO EXECUTADO. Rodar so com OK do Neomar.
--
-- O que e duplicado (e o que NAO e):
-- * A mesma place_id em buscas DIFERENTES (query_norm/bucket) NAO e duplicado:
--   cada linha e a entrada de cache daquela busca ("rodoviaria de cas",
--   "rodoviaria de cascavel"...). Apagar quebraria o cache dessas buscas.
--   A deduplicacao desses casos e feita na LEITURA (dedupePlaces) e a busca
--   por nome/rua devolve cada lugar uma vez.
-- * Mesma place_id dentro da mesma busca: impossivel (unique places_cache_query_place_uniq).
-- * DUPLICADO DE VERDADE: dentro da MESMA busca (workspace, query_norm, bucket),
--   place_id diferentes com o mesmo nome normalizado a menos de 50 m.
--   Mantem a linha mais antiga (fetched_at, depois id) e apaga as outras.
BEGIN;

CREATE TABLE IF NOT EXISTS public.places_cache_dedupe_backup_20261024 AS
  SELECT * FROM public.places_cache WITH NO DATA;
ALTER TABLE public.places_cache_dedupe_backup_20261024 ENABLE ROW LEVEL SECURITY;

WITH n AS (
  SELECT id, workspace_id, query_norm, lat_bucket, lng_bucket, place_id, lat, lng, fetched_at,
         regexp_replace(lower(translate(name,
           'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
           'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')), '[^a-z0-9]+', ' ', 'g') AS nn
    FROM public.places_cache
), dup AS (
  SELECT DISTINCT b.id
    FROM n a JOIN n b
      ON a.workspace_id = b.workspace_id AND a.query_norm = b.query_norm
     AND a.lat_bucket IS NOT DISTINCT FROM b.lat_bucket AND a.lng_bucket IS NOT DISTINCT FROM b.lng_bucket
     AND a.place_id <> b.place_id AND trim(a.nn) = trim(b.nn)
     AND (a.fetched_at, a.id) < (b.fetched_at, b.id)
     AND sqrt(power((a.lat - b.lat) * 111320, 2) + power((a.lng - b.lng) * 111320 * cos(radians(a.lat)), 2)) < 50
)
INSERT INTO public.places_cache_dedupe_backup_20261024 SELECT p.* FROM public.places_cache p JOIN dup USING (id);

DELETE FROM public.places_cache p USING public.places_cache_dedupe_backup_20261024 b WHERE p.id = b.id;

SELECT count(*) AS removidas FROM public.places_cache_dedupe_backup_20261024;
-- Conferir e trocar por COMMIT. Para desfazer depois do COMMIT:
--   INSERT INTO public.places_cache SELECT * FROM public.places_cache_dedupe_backup_20261024 ON CONFLICT DO NOTHING;
ROLLBACK;
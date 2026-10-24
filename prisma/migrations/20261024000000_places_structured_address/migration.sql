-- places_cache: endereco estruturado separado do nome + busca nos dois sentidos.
-- 100% ADITIVO: so colunas novas (todas NULL) e indices novos. Nada existente
-- e alterado ou apagado; o codigo antigo continua funcionando (ignora as colunas).
-- Backfill das linhas existentes: scripts/places-backfill-address.mjs (separado, opcional).
-- Backup do estado antes de aplicar: docs/places-structured-address-backup.sql
-- Rollback: docs/places-structured-address-rollback.sql
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS postal_code text;
-- Normalizados (sem acento, minusculo; rua com abreviacoes expandidas) - preenchidos pelo app.
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS name_norm text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS street_norm text;

-- nome -> endereco (ILIKE '%texto%' no name_norm; tabela pequena, prefixo usa o indice)
CREATE INDEX IF NOT EXISTS places_cache_name_norm_idx
  ON public.places_cache (workspace_id, name_norm text_pattern_ops)
  WHERE invalidated_at IS NULL;
-- rua -> lugares nessa rua
CREATE INDEX IF NOT EXISTS places_cache_street_norm_idx
  ON public.places_cache (workspace_id, street_norm, street_number)
  WHERE invalidated_at IS NULL AND street_norm IS NOT NULL;
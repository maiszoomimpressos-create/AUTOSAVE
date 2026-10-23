-- places_cache: cache de endereços / pontos de interesse (MAI Drive).
-- 100% aditivo: só cria uma tabela nova + índices. Nada existente é alterado.
-- Rollback: docs/places-cache-rollback.sql
CREATE TABLE IF NOT EXISTS public.places_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  query_norm text NOT NULL,
  lat_bucket numeric(6,2),
  lng_bucket numeric(6,2),
  place_id text NOT NULL,
  name text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  source text NOT NULL CHECK (source IN ('google', 'nominatim', 'manual')),
  raw jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  invalidated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS places_cache_query_place_uniq
  ON public.places_cache (workspace_id, query_norm, lat_bucket, lng_bucket, place_id)
  NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS places_cache_lookup_idx
  ON public.places_cache (workspace_id, query_norm, lat_bucket, lng_bucket, expires_at)
  WHERE invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS places_cache_place_id_idx
  ON public.places_cache (workspace_id, place_id);

-- Acesso só pelo servidor (service role ignora RLS); sem policies = anon/authenticated bloqueados.
ALTER TABLE public.places_cache ENABLE ROW LEVEL SECURITY;

-- Rollback da migration 20261024000000_places_structured_address.
-- Remove so o que ela criou (indices + colunas novas). Nao toca nas colunas originais.
DROP INDEX IF EXISTS public.places_cache_street_norm_idx;
DROP INDEX IF EXISTS public.places_cache_name_norm_idx;
ALTER TABLE public.places_cache DROP COLUMN IF EXISTS street_norm;
ALTER TABLE public.places_cache DROP COLUMN IF EXISTS name_norm;
ALTER TABLE public.places_cache DROP COLUMN IF EXISTS postal_code;
ALTER TABLE public.places_cache DROP COLUMN IF EXISTS state;
ALTER TABLE public.places_cache DROP COLUMN IF EXISTS city;
ALTER TABLE public.places_cache DROP COLUMN IF EXISTS neighborhood;
ALTER TABLE public.places_cache DROP COLUMN IF EXISTS street_number;
ALTER TABLE public.places_cache DROP COLUMN IF EXISTS street;
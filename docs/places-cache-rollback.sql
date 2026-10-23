-- Rollback da migration 20261023000000_places_cache (apaga só a tabela nova).
DROP TABLE IF EXISTS public.places_cache;

-- Backup ANTES de aplicar 20261024000000_places_structured_address (rodar e guardar a saida).
-- A migration so adiciona colunas/indices; o backup serve pra conferir que nada mudou.
-- 1) Copia integral da tabela (fica no proprio banco; apagar depois de validar):
CREATE TABLE IF NOT EXISTS public.places_cache_backup_20261024 AS TABLE public.places_cache;
ALTER TABLE public.places_cache_backup_20261024 ENABLE ROW LEVEL SECURITY;
-- 2) Estado da estrutura (guardar a saida):
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'places_cache'
 ORDER BY ordinal_position;
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'places_cache';
SELECT count(*) AS linhas, md5(string_agg(id::text || place_id || coalesce(address, ''), ',' ORDER BY id)) AS assinatura
  FROM public.places_cache;
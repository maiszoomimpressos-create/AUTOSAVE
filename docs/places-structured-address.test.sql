-- Teste da migration 20261024000000_places_structured_address + rollback.
-- TUDO dentro de BEGIN ... ROLLBACK: linhas temporarias com workspace_id
-- aleatorio (nenhum dado real e tocado); nada fica no banco.
BEGIN;
-- migration (mesmo texto do arquivo)
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS street_number text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS name_norm text;
ALTER TABLE public.places_cache ADD COLUMN IF NOT EXISTS street_norm text;
CREATE INDEX IF NOT EXISTS places_cache_name_norm_idx
  ON public.places_cache (workspace_id, name_norm text_pattern_ops) WHERE invalidated_at IS NULL;
CREATE INDEX IF NOT EXISTS places_cache_street_norm_idx
  ON public.places_cache (workspace_id, street_norm, street_number)
  WHERE invalidated_at IS NULL AND street_norm IS NOT NULL;

DO $$
DECLARE
  ws uuid := gen_random_uuid();
  n_before bigint;
  n int;
BEGIN
  SELECT count(*) INTO n_before FROM public.places_cache WHERE workspace_id <> ws;
  -- T1 linhas antigas continuam validas (colunas novas NULL)
  ASSERT (SELECT count(*) FROM public.places_cache WHERE street IS NOT NULL AND workspace_id <> ws) = 0, 'T1 colunas novas nulas';
  -- fixtures temporarias (workspace aleatorio)
  INSERT INTO public.places_cache (workspace_id, query_norm, place_id, name, address, lat, lng, source,
      street, street_number, neighborhood, city, state, postal_code, name_norm, street_norm)
  VALUES
   (ws, 'teste lugar a', 'test:a', 'Lugar Teste A', 'R. Teste Um, 100 - Centro, Cidade Teste - PR, 85000-000', -26.1, -53.05, 'manual',
    'R. Teste Um', '100', 'Centro', 'Cidade Teste', 'PR', '85000-000', 'lugar teste a', 'rua teste um'),
   (ws, 'teste lugar b', 'test:b', 'Lugar Teste B', 'R. Teste Um, 200 - Centro, Cidade Teste - PR, 85000-000', -26.101, -53.051, 'manual',
    'R. Teste Um', '200', 'Centro', 'Cidade Teste', 'PR', '85000-000', 'lugar teste b', 'rua teste um'),
   (ws, 'teste lugar c', 'test:c', 'Lugar Teste C', 'Av. Outra, 5 - Bairro, Cidade Teste - PR', -26.2, -53.1, 'manual',
    'Av. Outra', '5', 'Bairro', 'Cidade Teste', 'PR', NULL, 'lugar teste c', 'avenida outra');
  -- T2 nome -> endereco
  SELECT count(*) INTO n FROM public.places_cache WHERE workspace_id = ws AND invalidated_at IS NULL AND name_norm ILIKE '%teste a%';
  ASSERT n = 1, 'T2 busca por nome';
  -- T3 rua -> lugares nessa rua
  SELECT count(*) INTO n FROM public.places_cache WHERE workspace_id = ws AND invalidated_at IS NULL AND street_norm = 'rua teste um';
  ASSERT n = 2, 'T3 busca por rua';
  -- T4 rua + numero
  SELECT count(*) INTO n FROM public.places_cache WHERE workspace_id = ws AND street_norm = 'rua teste um' AND street_number = '200';
  ASSERT n = 1, 'T4 rua + numero';
  -- T5 unique antigo continua valendo
  BEGIN
    INSERT INTO public.places_cache (workspace_id, query_norm, place_id, name, source) VALUES (ws, 'teste lugar a', 'test:a', 'dup', 'manual');
    RAISE EXCEPTION 'T5 deveria barrar duplicado';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  -- T6 indices criados
  ASSERT to_regclass('public.places_cache_name_norm_idx') IS NOT NULL AND to_regclass('public.places_cache_street_norm_idx') IS NOT NULL, 'T6 indices';
  -- T7 nenhuma linha real mudou de quantidade
  ASSERT (SELECT count(*) FROM public.places_cache WHERE workspace_id <> ws) = n_before, 'T7 linhas reais';
END $$;

-- rollback (mesmo texto do arquivo) e conferencia
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
DO $$ BEGIN
  ASSERT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='places_cache'
    AND column_name IN ('street','street_number','neighborhood','city','state','postal_code','name_norm','street_norm')), 'rollback colunas';
  ASSERT to_regclass('public.places_cache_name_norm_idx') IS NULL, 'rollback indice';
END $$;
SELECT 'TESTS_PASSED' AS result;
ROLLBACK;
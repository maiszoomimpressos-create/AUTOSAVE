-- Vehicle classification system (see AGENTS.md "Sistema Completo de
-- Classificação Automática de Veículos"). 100% additive: new table + new
-- nullable columns. Nothing existing is altered or dropped.

-- 1. Lookup table with the 22 official AutoSave categories.
--
-- NOTE: named `vehicle_classification_categories`, not `vehicle_categories` —
-- a `vehicle_categories` table already exists in this DB (created 2026-07-10,
-- 4 rows, uuid id, icon/color columns) and is not referenced anywhere in
-- src/. It looks like a leftover from an earlier, different feature. Left
-- fully untouched here to avoid clobbering data this migration didn't
-- create; ask before merging/dropping it separately.
CREATE TABLE IF NOT EXISTS vehicle_classification_categories (
  id integer PRIMARY KEY,
  codigo text UNIQUE NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  ordem integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO vehicle_classification_categories (id, codigo, nome, ordem) VALUES
  (1,  'CARRO',              'Carro',                  20),
  (2,  'MOTO',                'Moto',                   14),
  (3,  'CAMINHAO',            'Caminhão',               13),
  (4,  'ONIBUS',              'Ônibus',                 12),
  (5,  'VAN',                 'Van',                    16),
  (6,  'PICKUP',              'Pickup',                 15),
  (7,  'UTILITARIO',          'Utilitário',             17),
  (8,  'TRATOR',              'Trator',                  4),
  (9,  'COLHEITADEIRA',       'Colheitadeira',           5),
  (10, 'EMPILHADEIRA',        'Empilhadeira',            6),
  (11, 'GERADOR',             'Gerador',                 7),
  (12, 'REBOQUE',             'Reboque',                 1),
  (13, 'SEMIRREBOQUE',        'Semirreboque',            2),
  (14, 'CARRETA',             'Carreta',                 3),
  (15, 'MOTORHOME',           'Motorhome',              11),
  (16, 'AMBULANCIA',          'Ambulância',             10),
  (17, 'VEICULO_ESPECIAL',    'Veículo especial',       18),
  (18, 'MAQUINA_AGRICOLA',    'Máquina agrícola',        8),
  (19, 'MAQUINA_CONSTRUCAO',  'Máquina de construção',   9),
  (20, 'ELETRICO',            'Veículo elétrico',       19),
  (21, 'OUTRO',               'Outro',                  21),
  (22, 'NAO_IDENTIFICADO',    'Não identificado',       22)
ON CONFLICT (id) DO NOTHING;

-- 2. Classification layer on `vehicles` — never overwrites the raw data
--    returned by the plate-lookup API, which is preserved in the
--    *_original columns alongside it.
ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS tipo_original text,
  ADD COLUMN IF NOT EXISTS descricao_original text,
  ADD COLUMN IF NOT EXISTS marca_original text,
  ADD COLUMN IF NOT EXISTS modelo_original text,
  ADD COLUMN IF NOT EXISTS categoria_id integer REFERENCES vehicle_classification_categories(id),
  ADD COLUMN IF NOT EXISTS categoria_codigo text,
  ADD COLUMN IF NOT EXISTS categoria_nome text,
  ADD COLUMN IF NOT EXISTS classificacao_metodo text,
  ADD COLUMN IF NOT EXISTS classificacao_confianca smallint;

CREATE INDEX IF NOT EXISTS vehicles_categoria_id_idx ON vehicles (categoria_id);

-- Classificação Esforço x Impacto (4 perguntas por eixo, escala 1-3).
-- NULL = pergunta ainda não respondida. Escrita já coberta pela policy
-- "projects_write" existente (coordenador).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS esforco_estrutura smallint CHECK (esforco_estrutura BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS esforco_tempo smallint CHECK (esforco_tempo BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS esforco_etl smallint CHECK (esforco_etl BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS esforco_visual smallint CHECK (esforco_visual BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS impacto_decisao smallint CHECK (impacto_decisao BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS impacto_abrangencia smallint CHECK (impacto_abrangencia BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS impacto_criticidade smallint CHECK (impacto_criticidade BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS impacto_eficiencia smallint CHECK (impacto_eficiencia BETWEEN 1 AND 3);

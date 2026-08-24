-- Adiciona duração em dias úteis por etapa (modelo de cronograma arrastável, eixo fixo de 10 semanas)
ALTER TABLE public.stages ADD COLUMN duracao_dias integer NOT NULL DEFAULT 5;

-- Backfill: para etapas que já têm datas previstas, deriva a duração em dias úteis a partir delas
UPDATE public.stages
SET duracao_dias = GREATEST(
  1,
  (
    SELECT COUNT(*)
    FROM generate_series(data_prevista_inicio, data_prevista_fim, interval '1 day') AS d
    WHERE EXTRACT(ISODOW FROM d) < 6
  )
)
WHERE data_prevista_inicio IS NOT NULL AND data_prevista_fim IS NOT NULL;

-- Adiciona a área/departamento solicitante do projeto, usada na Visão Geral
-- para agrupar volume de projetos por área.
ALTER TABLE public.projects ADD COLUMN area text;
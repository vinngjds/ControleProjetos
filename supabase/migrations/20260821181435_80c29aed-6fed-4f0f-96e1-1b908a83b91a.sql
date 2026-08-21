-- Permite ao coordenador distribuir subtarefas entre a equipe.
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON public.subtasks(assigned_to);

-- Classificação Esforço x Impacto (4 perguntas por eixo, escala 1-3).
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS esforco_estrutura smallint CHECK (esforco_estrutura BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS esforco_tempo smallint CHECK (esforco_tempo BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS esforco_etl smallint CHECK (esforco_etl BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS esforco_visual smallint CHECK (esforco_visual BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS impacto_decisao smallint CHECK (impacto_decisao BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS impacto_abrangencia smallint CHECK (impacto_abrangencia BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS impacto_criticidade smallint CHECK (impacto_criticidade BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS impacto_eficiencia smallint CHECK (impacto_eficiencia BETWEEN 1 AND 3);

-- Suporte a Backlog
ALTER TABLE public.projects
  ALTER COLUMN data_entrega DROP NOT NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS projeto_relacionado_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.categoria IS
  'Categoria do item de backlog: dashboard | melhoria | app. Só é relevante quando status = ''backlog''.';
COMMENT ON COLUMN public.projects.projeto_relacionado_id IS
  'Para itens de categoria melhoria: projeto existente que a melhoria afeta (opcional).';

-- Grants (Data API não concede privilégios por padrão)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attachments TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

GRANT ALL ON public.projects TO service_role;
GRANT ALL ON public.stages TO service_role;
GRANT ALL ON public.tasks TO service_role;
GRANT ALL ON public.subtasks TO service_role;
GRANT ALL ON public.attachments TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
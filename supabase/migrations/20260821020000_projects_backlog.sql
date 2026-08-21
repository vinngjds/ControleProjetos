-- Suporte a Backlog: itens leves (Dashboards / Melhorias / Apps) antes de
-- virarem projetos "ativo" de verdade. data_entrega passa a ser opcional
-- porque um item de backlog ainda não tem prazo definido.
ALTER TABLE public.projects
  ALTER COLUMN data_entrega DROP NOT NULL;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS categoria TEXT,
  ADD COLUMN IF NOT EXISTS projeto_relacionado_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.projects.categoria IS
  'Categoria do item de backlog: dashboard | melhoria | app. Só é relevante quando status = ''backlog''.';
COMMENT ON COLUMN public.projects.projeto_relacionado_id IS
  'Para itens de categoria melhoria: projeto existente que a melhoria afeta (opcional).';

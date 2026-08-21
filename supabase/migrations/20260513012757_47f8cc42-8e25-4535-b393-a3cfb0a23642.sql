
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  data_prevista_inicio DATE,
  data_prevista_fim DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_id UUID NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  horas_estimadas NUMERIC NOT NULL DEFAULT 0,
  horas_trabalhadas NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'a_fazer',
  ordem INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Single-user app: open access
CREATE POLICY "open_all" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_all" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_stages_project ON public.stages(project_id);
CREATE INDEX idx_tasks_stage ON public.tasks(stage_id);

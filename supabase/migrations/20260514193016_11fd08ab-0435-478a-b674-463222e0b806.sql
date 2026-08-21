CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  concluida BOOLEAN NOT NULL DEFAULT false,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON public.subtasks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_subtasks_task_id ON public.subtasks(task_id);
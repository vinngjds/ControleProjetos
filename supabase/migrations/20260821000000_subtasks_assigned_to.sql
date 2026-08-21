-- Permite ao coordenador distribuir subtarefas entre a equipe.
ALTER TABLE public.subtasks
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON public.subtasks(assigned_to);

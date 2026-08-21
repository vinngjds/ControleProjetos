
-- Renomear horas para dias em tasks
ALTER TABLE public.tasks RENAME COLUMN horas_estimadas TO dias_estimados;
ALTER TABLE public.tasks RENAME COLUMN horas_trabalhadas TO dias_trabalhados;

-- Adicionar peso em stages
ALTER TABLE public.stages ADD COLUMN peso integer NOT NULL DEFAULT 0;

-- Tabela de anexos (imagens) para etapas
CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL,
  nome text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_all" ON public.attachments
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_attachments_stage ON public.attachments(stage_id);

-- Bucket público para mockups
INSERT INTO storage.buckets (id, name, public) VALUES ('mockups', 'mockups', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "mockups_read" ON storage.objects FOR SELECT USING (bucket_id = 'mockups');
CREATE POLICY "mockups_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'mockups');
CREATE POLICY "mockups_update" ON storage.objects FOR UPDATE USING (bucket_id = 'mockups');
CREATE POLICY "mockups_delete" ON storage.objects FOR DELETE USING (bucket_id = 'mockups');

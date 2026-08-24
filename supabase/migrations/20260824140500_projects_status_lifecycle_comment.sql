-- Documenta o novo ciclo de vida do projeto. A coluna 'status' continua sendo
-- texto livre (sem CHECK constraint), então não é necessária nenhuma alteração
-- estrutural — só passam a existir dois novos valores possíveis em uso pela
-- aplicação: 'classificacao' e 'finalizado'.
COMMENT ON COLUMN public.projects.status IS
  'Ciclo de vida: backlog -> classificacao (Esforço x Impacto + Cronograma) -> ativo (Em Andamento) -> finalizado (automático quando todas as tarefas ficam feito).';

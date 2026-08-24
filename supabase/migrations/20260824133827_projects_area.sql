-- Adiciona a área/departamento solicitante do projeto, usada na Visão Geral
-- para agrupar volume de projetos por área.
ALTER TABLE public.projects ADD COLUMN area text;

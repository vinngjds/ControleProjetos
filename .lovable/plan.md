# Corrigir colunas faltantes no banco

## Diagnóstico (verificado)

A verificação de tipos aponta exatamente duas colunas que o código novo usa e que não existem no banco deste projeto:

- `projects.area` — usada na Visão Geral (gráfico "Volume por área") e no cadastro de Backlog.
- `stages.duracao_dias` — usada no Gantt (arrastar a duração de cada etapa) e na aprovação do cronograma.

Nenhuma outra coluna está faltando: fora esses dois nomes, a verificação não acusa mais erros. As colunas de contagem de dias das tarefas (`dias_estimados`, `dias_trabalhados`, `data_inicio_real`, `data_conclusao`) já existem.

As duas migrations correspondentes já vieram do GitHub e estão na pasta do projeto, apenas nunca foram aplicadas neste banco novo:
`20260821205125_stages_duracao_dias.sql` e `20260824133827_projects_area.sql`.

## O que farei

1. Aplicar a migration de `stages.duracao_dias` (inteiro, padrão 5, com preenchimento das etapas existentes a partir das datas previstas), exatamente como está no repositório.
2. Aplicar a migration de `projects.area` (texto opcional), exatamente como está no repositório.
3. Rodar a verificação de tipos para confirmar que os erros do Gantt, da Visão Geral e do Backlog desapareceram.
4. Abrir a Visão Geral e a tela de um projeto no preview para conferir que os gráficos e o cronograma carregam sem erro.

## Detalhes técnicos

- As duas migrations alteram tabelas já existentes, então não precisam de novos GRANT nem novas políticas de acesso — herdam as regras atuais (coordenador vê tudo; analista vê os próprios projetos).
- Após aplicar, o arquivo de tipos do banco é regenerado automaticamente, o que é o que faz os erros de compilação sumirem.
- Nenhum arquivo de código-fonte precisa ser alterado.

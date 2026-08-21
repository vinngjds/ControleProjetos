# Importar o projeto Projetos.app do GitHub

Trazer todo o código do repositório público `vinngjds/Projetos.app` (branch `main`) para este projeto e recriar o backend do zero no Lovable Cloud.

## O que o repositório contém

- Mesma stack deste projeto (TanStack Start + React + Tailwind + shadcn/ui), então o código entra praticamente sem adaptação.
- App "Controle de projetos do departamento de seminovos" com login, cadastro, recuperação de senha e uma área autenticada com: painel inicial, projetos (novo/detalhe), backlog, matriz esforço x impacto, minhas tarefas, equipe, desempenho e modo apresentação.
- Componentes próprios: Kanban, Backlog, Gantt, matriz e classificador de esforço/impacto, editor de etapas, distribuição de subtarefas.
- Backend Supabase com 9 migrations e integração de auth já pronta.

## Etapas

1. **Copiar o código**: baixar todos os arquivos do repositório e escrever em disco — `src/components`, `src/components/ui`, `src/routes` (públicas e `_authenticated`), `src/lib`, `src/hooks`, `src/styles.css`, `src/router.tsx`, `src/start.ts`, `src/server.ts`, além de `package.json`, `components.json`, configs e `vite.config.ts`.
2. **Não copiar**: `.env` do repositório (contém credenciais do backend antigo), `bun.lock`, `src/routeTree.gen.ts` (regenerado), `.lovable/*` e o `src/integrations/supabase/*` antigo — este último é regerado pelo Lovable Cloud com as credenciais novas.
3. **Ativar o Lovable Cloud** neste projeto, gerando banco, auth e as variáveis de ambiente próprias.
4. **Reaplicar o schema**: consolidar as 9 migrations do repositório em migrations aplicadas aqui (tabelas, enums, RLS, policies, grants, triggers e funções). Ajustar qualquer policy/grant faltante conforme as regras atuais do Data API.
5. **Reinstalar dependências** do `package.json` importado (Recharts, dnd, date-fns, react-hook-form/zod, etc.).
6. **Conferir o app**: rota `/` sem o placeholder, login/cadastro funcionando, navegação da área autenticada, meta tags de cada rota de conteúdo, build e typecheck limpos.

## Detalhes técnicos

- O `_authenticated` do repositório usa um layout em `src/routes/_authenticated.tsx`; na convenção atual o gate fica em `src/routes/_authenticated/route.tsx` gerenciado pela integração — o layout visual (sidebar/nav) do repositório é preservado como componente dentro desse subtree.
- `src/lib/api.ts` (camada de acesso ao Supabase) e `src/lib/auth.tsx` são reaproveitados, apontando para o client gerado pelo Cloud novo.
- `src/integrations/supabase/types.ts` será regerado a partir do schema aplicado aqui.
- `wrangler.jsonc` e `supabase/config.toml` do repositório não são necessários — a configuração de deploy e do backend é gerenciada pelo Lovable.

## Fora do escopo

- Dados existentes: as tabelas nascem vazias. Se depois quiser trazer os registros, é só exportar do projeto antigo e importar aqui.
- Contas de usuário do backend antigo não são migradas; será preciso criar login novamente.

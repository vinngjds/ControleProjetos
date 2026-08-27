# Novos projetos entram como Backlog + criação de usuários pelo coordenador

## 1. Novo projeto sempre nasce no Backlog

Tela **+ Novo Projeto** (`/projetos/novo`) passa a criar o item já com status `backlog`:

- Remover os campos **Data de início** e **Data de entrega**.
- Remover a opção de template de etapas (as etapas e o cronograma são definidos depois, na promoção para Classificação).
- Campos que permanecem: Nome, Categoria, Área solicitante, Analista responsável, Descrição.
- **Analista responsável** passa a incluir também coordenadores na lista, para que você possa se atribuir. Botão rápido "Atribuir a mim".
- Ao salvar, o usuário é levado para o Backlog, na aba da categoria escolhida.

O caminho de início de projeto de verdade continua sendo o já existente: abrir o item no Backlog e usar "Mover para Em Classificação", onde a data de início é informada.

## 2. Backlog sem botão "+ Novo"

Remover o botão "+ Novo" e o diálogo de criação do Backlog. A criação passa a ocorrer só pelo "+ Novo Projeto" do topo. Edição, exclusão e promoção do item continuam iguais.

## 3. Descrição gerada automaticamente

Ao digitar o nome (e sair do campo), a descrição é preenchida com uma frase padrão montada a partir de nome, categoria e área — por exemplo:

> "Projeto de dashboard solicitado pela área Comercial para atender à demanda de Painel de Vendas, com o objetivo de organizar e disponibilizar as informações necessárias para acompanhamento e tomada de decisão."

Regras: só preenche enquanto a descrição estiver vazia ou ainda for um texto gerado (não sobrescreve texto escrito por você); o campo continua totalmente editável.

## 4. Coordenador cria usuários na página Equipe

Na página **Equipe**, botão "+ Novo usuário" (visível só para coordenador) com nome, e-mail, senha e papel (coordenador/analista). O usuário é criado já confirmado e aparece na lista imediatamente.

Se o e-mail já existir, mensagem clara em vez de erro genérico.

---

## Detalhes técnicos

- `src/routes/_authenticated/projetos.novo.tsx`: remover datas/template, chamar `createProject({ status: "backlog", ... })`, listar analistas + coordenadores, navegar para `/backlog`.
- `src/lib/api.ts`: `listAssignableUsers()` (todos os membros) e helper `gerarDescricao({ nome, categoria, area })`; manter `createBacklogItem` apenas se ainda usado.
- `src/components/BacklogBoard.tsx`: remover botão "+ Novo" e `CreateBacklogDialog`.
- Criação de usuário: server function em `src/lib/admin-users.functions.ts` com `.middleware([requireSupabaseAuth])`, verificando `has_role(caller, 'coordenador')` via `context.supabase`, e só então `await import("@/integrations/supabase/client.server")` para `supabaseAdmin.auth.admin.createUser({ email_confirm: true, user_metadata: { nome } })`; em seguida grava o papel escolhido em `user_roles` (o trigger `handle_new_user` já cria o perfil).
- `src/routes/_authenticated/equipe.tsx`: diálogo de criação + invalidação da query `team`.
- Sem migrations: o schema atual já suporta tudo (`status`, `categoria`, `area`, `analista_id`).

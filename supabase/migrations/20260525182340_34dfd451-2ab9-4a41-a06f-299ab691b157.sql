
-- ============ Enum + tabelas ============
do $$ begin
  create type public.app_role as enum ('coordenador','analista');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

alter table public.projects add column if not exists analista_id uuid references auth.users(id) on delete set null;
alter table public.tasks
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists data_inicio_real date,
  add column if not exists data_conclusao date;

-- ============ Funções ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_project_analyst(_user_id uuid, _project_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.projects where id = _project_id and analista_id = _user_id);
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  insert into public.profiles (id, nome) values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)));
  select count(*) = 0 into is_first from public.user_roles;
  insert into public.user_roles (user_id, role) values (new.id, case when is_first then 'coordenador'::public.app_role else 'analista'::public.app_role end);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Recalcula dias_trabalhados (dias úteis) para tarefas em andamento
create or replace function public.tick_task_progress()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.tasks t
  set dias_trabalhados = (
    select count(*) from generate_series(t.data_inicio_real, current_date, interval '1 day') d
    where extract(isodow from d) < 6
  )
  where t.data_inicio_real is not null and t.data_conclusao is null and t.status <> 'feito';
end $$;

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Limpa policies antigas abertas
drop policy if exists open_all on public.projects;
drop policy if exists open_all on public.stages;
drop policy if exists open_all on public.tasks;
drop policy if exists open_all on public.subtasks;
drop policy if exists open_all on public.attachments;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'coordenador'));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'coordenador'));

-- user_roles
drop policy if exists roles_select on public.user_roles;
create policy roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'coordenador'));
drop policy if exists roles_write on public.user_roles;
create policy roles_write on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'coordenador'))
  with check (public.has_role(auth.uid(),'coordenador'));

-- projects
create policy projects_select on public.projects for select to authenticated
  using (public.has_role(auth.uid(),'coordenador') or analista_id = auth.uid());
create policy projects_write on public.projects for all to authenticated
  using (public.has_role(auth.uid(),'coordenador'))
  with check (public.has_role(auth.uid(),'coordenador'));

-- stages
create policy stages_select on public.stages for select to authenticated
  using (public.has_role(auth.uid(),'coordenador') or public.is_project_analyst(auth.uid(), project_id));
create policy stages_write on public.stages for all to authenticated
  using (public.has_role(auth.uid(),'coordenador'))
  with check (public.has_role(auth.uid(),'coordenador'));

-- tasks: analista pode SELECT/UPDATE das tarefas dos próprios projetos; coordenador tudo
create policy tasks_select on public.tasks for select to authenticated
  using (
    public.has_role(auth.uid(),'coordenador')
    or exists (select 1 from public.stages s join public.projects p on p.id = s.project_id
               where s.id = tasks.stage_id and p.analista_id = auth.uid())
  );
create policy tasks_update on public.tasks for update to authenticated
  using (
    public.has_role(auth.uid(),'coordenador')
    or exists (select 1 from public.stages s join public.projects p on p.id = s.project_id
               where s.id = tasks.stage_id and p.analista_id = auth.uid())
  );
create policy tasks_write_coord on public.tasks for insert to authenticated
  with check (public.has_role(auth.uid(),'coordenador'));
create policy tasks_delete_coord on public.tasks for delete to authenticated
  using (public.has_role(auth.uid(),'coordenador'));

-- subtasks
create policy subtasks_select on public.subtasks for select to authenticated
  using (
    public.has_role(auth.uid(),'coordenador')
    or exists (
      select 1 from public.tasks t join public.stages s on s.id = t.stage_id join public.projects p on p.id = s.project_id
      where t.id = subtasks.task_id and p.analista_id = auth.uid()
    )
  );
create policy subtasks_write on public.subtasks for all to authenticated
  using (
    public.has_role(auth.uid(),'coordenador')
    or exists (
      select 1 from public.tasks t join public.stages s on s.id = t.stage_id join public.projects p on p.id = s.project_id
      where t.id = subtasks.task_id and p.analista_id = auth.uid()
    )
  )
  with check (
    public.has_role(auth.uid(),'coordenador')
    or exists (
      select 1 from public.tasks t join public.stages s on s.id = t.stage_id join public.projects p on p.id = s.project_id
      where t.id = subtasks.task_id and p.analista_id = auth.uid()
    )
  );

-- attachments
create policy attachments_select on public.attachments for select to authenticated
  using (
    public.has_role(auth.uid(),'coordenador')
    or exists (select 1 from public.stages s join public.projects p on p.id = s.project_id
               where s.id = attachments.stage_id and p.analista_id = auth.uid())
  );
create policy attachments_write on public.attachments for all to authenticated
  using (
    public.has_role(auth.uid(),'coordenador')
    or exists (select 1 from public.stages s join public.projects p on p.id = s.project_id
               where s.id = attachments.stage_id and p.analista_id = auth.uid())
  )
  with check (
    public.has_role(auth.uid(),'coordenador')
    or exists (select 1 from public.stages s join public.projects p on p.id = s.project_id
               where s.id = attachments.stage_id and p.analista_id = auth.uid())
  );

-- ============ pg_cron ============
create extension if not exists pg_cron;
select cron.unschedule('tick-task-progress') where exists (select 1 from cron.job where jobname = 'tick-task-progress');
select cron.schedule('tick-task-progress','0 3 * * *', $$ select public.tick_task_progress(); $$);

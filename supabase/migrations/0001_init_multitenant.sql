-- =====================================================================
-- empresa-os · Esquema multi-tenant con RLS por tenant_id
-- Relación: Organization → Department → Agent → Task → Event
--                        → Approval → Budget → Result
--
-- Tenancy: tenant_id = ID de organización de Clerk (claim "org_id" del JWT).
--          Clerk incluye org_id automáticamente cuando el usuario tiene una
--          organización activa, así que el RLS funciona sin plantillas de JWT.
--
-- Cómo correrlo:
--   Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--   Es idempotente (IF NOT EXISTS / OR REPLACE): se puede correr varias veces.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1) Resolver de tenant: devuelve el org_id de Clerk desde el JWT.
--    (Si algún día usas Supabase Auth en vez de Clerk, cambia por el claim
--     que corresponda.)
-- ---------------------------------------------------------------------
create or replace function public.current_tenant_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'org_id', '')
$$;

-- ---------------------------------------------------------------------
-- 2) Guardia de "append-only" (para events): bloquea UPDATE y DELETE.
--    Funciona incluso con service_role, porque los triggers no se saltan.
-- ---------------------------------------------------------------------
create or replace function public.prevent_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'La tabla "%" es append-only: no se permite UPDATE/DELETE.', tg_table_name;
end;
$$;

-- ---------------------------------------------------------------------
-- 3) Trigger genérico para mantener updated_at.
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- TABLAS
-- tenant_id (text) = org_id de Clerk. Cada tabla lleva UNIQUE(id, tenant_id)
-- para encadenar las FKs por (padre_id, tenant_id) e impedir que un registro
-- apunte a un padre de OTRO tenant.
-- =====================================================================

-- organizations (raíz del tenant) --------------------------------------
create table if not exists public.organizations (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  text not null,                 -- = Clerk org_id (p.ej. 'org_2ab...')
  name       text not null,
  slug       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id),
  unique (id, tenant_id)
);

-- departments ----------------------------------------------------------
create table if not exists public.departments (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       text not null,
  organization_id uuid not null,
  name            text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (organization_id, tenant_id)
    references public.organizations (id, tenant_id) on delete cascade
);

-- agents ---------------------------------------------------------------
create table if not exists public.agents (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     text not null,
  department_id uuid not null,
  name          text not null,
  role          text,
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (department_id, tenant_id)
    references public.departments (id, tenant_id) on delete cascade
);

-- tasks ----------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text not null,
  agent_id    uuid not null,
  title       text not null,
  description text,
  status      text not null default 'pending',
  priority    int  not null default 0,
  due_at      timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (agent_id, tenant_id)
    references public.agents (id, tenant_id) on delete cascade
);

-- events (APPEND-ONLY: sin updated_at, sin UPDATE/DELETE) ---------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  text not null,
  task_id    uuid not null,
  type       text not null,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (task_id, tenant_id)
    references public.tasks (id, tenant_id) on delete cascade
);

-- approvals ------------------------------------------------------------
create table if not exists public.approvals (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  text not null,
  event_id   uuid not null,
  status     text not null default 'pending',  -- pending | approved | rejected
  approver   text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (event_id, tenant_id)
    references public.events (id, tenant_id) on delete cascade
);

-- budgets --------------------------------------------------------------
create table if not exists public.budgets (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   text not null,
  approval_id uuid not null,
  amount      numeric(14,2) not null default 0,
  currency    text not null default 'COP',
  period      text,                            -- p.ej. '2026-11' o 'Q4-2026'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (approval_id, tenant_id)
    references public.approvals (id, tenant_id) on delete cascade
);

-- results --------------------------------------------------------------
create table if not exists public.results (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  text not null,
  budget_id  uuid not null,
  outcome    text,
  metrics    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (budget_id, tenant_id)
    references public.budgets (id, tenant_id) on delete cascade
);

-- =====================================================================
-- ÍNDICES (tenant_id + claves foráneas)
-- =====================================================================
create index if not exists idx_departments_tenant on public.departments (tenant_id);
create index if not exists idx_departments_org     on public.departments (organization_id);

create index if not exists idx_agents_tenant on public.agents (tenant_id);
create index if not exists idx_agents_dept   on public.agents (department_id);

create index if not exists idx_tasks_tenant on public.tasks (tenant_id);
create index if not exists idx_tasks_agent  on public.tasks (agent_id);

create index if not exists idx_events_tenant on public.events (tenant_id);
create index if not exists idx_events_task   on public.events (task_id);

create index if not exists idx_approvals_tenant on public.approvals (tenant_id);
create index if not exists idx_approvals_event  on public.approvals (event_id);

create index if not exists idx_budgets_tenant   on public.budgets (tenant_id);
create index if not exists idx_budgets_approval on public.budgets (approval_id);

create index if not exists idx_results_tenant on public.results (tenant_id);
create index if not exists idx_results_budget on public.results (budget_id);

-- =====================================================================
-- TRIGGERS updated_at (todas menos events, que es inmutable)
-- =====================================================================
drop trigger if exists set_updated_at on public.organizations;
create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.departments;
create trigger set_updated_at before update on public.departments
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.agents;
create trigger set_updated_at before update on public.agents
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.tasks;
create trigger set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.approvals;
create trigger set_updated_at before update on public.approvals
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.budgets;
create trigger set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.results;
create trigger set_updated_at before update on public.results
  for each row execute function public.set_updated_at();

-- events: bloquear UPDATE y DELETE (append-only) -----------------------
drop trigger if exists events_no_update on public.events;
create trigger events_no_update before update on public.events
  for each row execute function public.prevent_mutation();

drop trigger if exists events_no_delete on public.events;
create trigger events_no_delete before delete on public.events
  for each row execute function public.prevent_mutation();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.organizations enable row level security;
alter table public.departments   enable row level security;
alter table public.agents        enable row level security;
alter table public.tasks         enable row level security;
alter table public.events        enable row level security;
alter table public.approvals     enable row level security;
alter table public.budgets       enable row level security;
alter table public.results       enable row level security;

grant usage on schema public to anon, authenticated;
grant execute on function public.current_tenant_id() to anon, authenticated;

grant select, insert, update, delete on
  public.organizations, public.departments, public.agents,
  public.tasks, public.approvals, public.budgets, public.results
  to authenticated;

-- events: solo lectura e inserción (append-only).
grant select, insert on public.events to authenticated;

-- --- Políticas: tablas normales (SELECT/INSERT/UPDATE/DELETE por tenant) ---
-- organizations
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations
  for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists organizations_insert on public.organizations;
create policy organizations_insert on public.organizations
  for insert to authenticated with check (tenant_id = public.current_tenant_id());
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists organizations_delete on public.organizations;
create policy organizations_delete on public.organizations
  for delete to authenticated using (tenant_id = public.current_tenant_id());

-- departments
drop policy if exists departments_select on public.departments;
create policy departments_select on public.departments
  for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists departments_insert on public.departments;
create policy departments_insert on public.departments
  for insert to authenticated with check (tenant_id = public.current_tenant_id());
drop policy if exists departments_update on public.departments;
create policy departments_update on public.departments
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists departments_delete on public.departments;
create policy departments_delete on public.departments
  for delete to authenticated using (tenant_id = public.current_tenant_id());

-- agents
drop policy if exists agents_select on public.agents;
create policy agents_select on public.agents
  for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists agents_insert on public.agents;
create policy agents_insert on public.agents
  for insert to authenticated with check (tenant_id = public.current_tenant_id());
drop policy if exists agents_update on public.agents;
create policy agents_update on public.agents
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists agents_delete on public.agents;
create policy agents_delete on public.agents
  for delete to authenticated using (tenant_id = public.current_tenant_id());

-- tasks
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert to authenticated with check (tenant_id = public.current_tenant_id());
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete to authenticated using (tenant_id = public.current_tenant_id());

-- approvals
drop policy if exists approvals_select on public.approvals;
create policy approvals_select on public.approvals
  for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists approvals_insert on public.approvals;
create policy approvals_insert on public.approvals
  for insert to authenticated with check (tenant_id = public.current_tenant_id());
drop policy if exists approvals_update on public.approvals;
create policy approvals_update on public.approvals
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists approvals_delete on public.approvals;
create policy approvals_delete on public.approvals
  for delete to authenticated using (tenant_id = public.current_tenant_id());

-- budgets
drop policy if exists budgets_select on public.budgets;
create policy budgets_select on public.budgets
  for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists budgets_insert on public.budgets;
create policy budgets_insert on public.budgets
  for insert to authenticated with check (tenant_id = public.current_tenant_id());
drop policy if exists budgets_update on public.budgets;
create policy budgets_update on public.budgets
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists budgets_delete on public.budgets;
create policy budgets_delete on public.budgets
  for delete to authenticated using (tenant_id = public.current_tenant_id());

-- results
drop policy if exists results_select on public.results;
create policy results_select on public.results
  for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists results_insert on public.results;
create policy results_insert on public.results
  for insert to authenticated with check (tenant_id = public.current_tenant_id());
drop policy if exists results_update on public.results;
create policy results_update on public.results
  for update to authenticated
  using (tenant_id = public.current_tenant_id())
  with check (tenant_id = public.current_tenant_id());
drop policy if exists results_delete on public.results;
create policy results_delete on public.results
  for delete to authenticated using (tenant_id = public.current_tenant_id());

-- --- Políticas: events (append-only → solo SELECT e INSERT) ---
drop policy if exists events_select on public.events;
create policy events_select on public.events
  for select to authenticated using (tenant_id = public.current_tenant_id());
drop policy if exists events_insert on public.events;
create policy events_insert on public.events
  for insert to authenticated with check (tenant_id = public.current_tenant_id());

-- =====================================================================
-- FIN
-- =====================================================================

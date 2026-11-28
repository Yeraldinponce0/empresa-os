-- =====================================================================
-- empresa-os / Orkesta · 0003 · CRUD de Agentes y Departamentos
--
-- Agrega los campos configurables de la ficha del agente y del departamento.
-- Autonomía y permisos SOLO se guardan por ahora; su enforcement real llega
-- con el motor de políticas (fase de seguridad).
--
-- Cómo correrlo:
--   Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--   Idempotente (ADD COLUMN IF NOT EXISTS).
-- =====================================================================

-- Agentes: cerebro ya existe (definition). Agregamos:
alter table public.agents add column if not exists autonomy     smallint     not null default 1;  -- 0..4
alter table public.agents add column if not exists budget       numeric(14,2);                     -- tope de gasto (COP)
alter table public.agents add column if not exists tools        jsonb        not null default '[]'::jsonb;  -- claves de herramientas
alter table public.agents add column if not exists permissions  jsonb        not null default '[]'::jsonb;  -- claves de permisos

-- Departamentos:
alter table public.departments add column if not exists objective text;
alter table public.departments add column if not exists budget    numeric(14,2);

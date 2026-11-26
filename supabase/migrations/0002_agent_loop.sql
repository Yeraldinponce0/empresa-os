-- =====================================================================
-- empresa-os · 0002 · Primer bucle del agente (vertical slice)
--
-- Agrega dos campos que el bucle necesita, sin tocar nada más:
--   · agents.definition  → el "cerebro"/rol del agente (system prompt).
--                           Vive en la tabla agents, como la fuente de verdad.
--   · tasks.input_data    → el texto que Y M pega a mano en la tarea
--                           (los números de la semana). NO se conecta Meta/Shopify.
--
-- Cómo correrlo:
--   Supabase → SQL Editor → New query → pega TODO este archivo → Run.
--   Es idempotente (ADD COLUMN IF NOT EXISTS): se puede correr varias veces.
-- =====================================================================

alter table public.agents add column if not exists definition text;
alter table public.tasks  add column if not exists input_data text;

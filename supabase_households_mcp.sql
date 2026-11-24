-- Script SQL à exécuter dans Supabase (SQL Editor) pour activer
-- les Maisons Familiales, la Matrice de Compétences et le Serveur MCP en production (Vercel).

create table if not exists public.households (
  id text primary key,
  nom text not null,
  code_invitation text unique not null,
  createur_user_id text not null,
  date_creation timestamptz not null default now(),
  role_competences_preset jsonb not null default '{}'::jsonb,
  membres jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_households_code_invitation
  on public.households (upper(code_invitation));

create table if not exists public.household_mcp_secrets (
  household_id text primary key references public.households(id) on delete cascade,
  token_hash text not null default '',
  token_preview text not null default '',
  enabled boolean not null default false,
  bound_user_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_mcp_mirrors (
  household_id text primary key references public.households(id) on delete cascade,
  recettes jsonb not null default '[]'::jsonb,
  planning jsonb not null default '[]'::jsonb,
  courses jsonb not null default '[]'::jsonb,
  pending_mutations jsonb not null default '[]'::jsonb,
  last_synced_at bigint not null default 0
);

alter table public.households enable row level security;
alter table public.household_mcp_secrets enable row level security;
alter table public.household_mcp_mirrors enable row level security;

drop policy if exists "Authenticated users manage households" on public.households;
create policy "Authenticated users manage households"
  on public.households for all to authenticated
  using (true) with check (true);

drop policy if exists "Authenticated users manage mcp secrets" on public.household_mcp_secrets;
create policy "Authenticated users manage mcp secrets"
  on public.household_mcp_secrets for all to authenticated
  using (true) with check (true);

drop policy if exists "Authenticated users manage mcp mirrors" on public.household_mcp_mirrors;
create policy "Authenticated users manage mcp mirrors"
  on public.household_mcp_mirrors for all to authenticated
  using (true) with check (true);

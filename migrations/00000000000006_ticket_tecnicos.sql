-- =========================================
-- Migración 006: Asignación de técnicos a tickets (N a N)
-- =========================================

create table ticket_tecnicos (
  ticket_id uuid not null references tickets(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  es_responsable_principal boolean not null default false,
  asignado_at timestamptz not null default now(),
  primary key (ticket_id, profile_id)
);

create index idx_ticket_tecnicos_profile on ticket_tecnicos(profile_id);

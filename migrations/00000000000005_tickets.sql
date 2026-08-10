-- =========================================
-- Migración 005: Tickets
-- =========================================

create table tickets (
  id uuid primary key default gen_random_uuid(),
  numero serial unique,
  codigo text generated always as
    ('JCG-' || lpad(numero::text, 4, '0')) stored,
  cliente_id uuid not null references clientes(id) on delete restrict,
  titulo text not null,
  descripcion text,
  categoria text,
  origen ticket_origen not null default 'manual',
  estado ticket_estado not null default 'nuevo',
  prioridad ticket_prioridad not null default 'media',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index idx_tickets_codigo on tickets(codigo);
create index idx_tickets_cliente on tickets(cliente_id);
create index idx_tickets_estado on tickets(estado);

create trigger trg_tickets_updated_at
before update on tickets
for each row execute function set_updated_at();

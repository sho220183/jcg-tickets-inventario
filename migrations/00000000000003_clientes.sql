-- =========================================
-- Migración 003: Clientes
-- (preparada para un futuro portal: portal_user_id nullable hoy)
-- =========================================

create table clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  contacto_nombre text,
  telefono text,
  email text,
  direccion text,
  notas text,
  portal_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on column clientes.portal_user_id is
  'Se completa a futuro si el cliente tiene login propio en un portal de clientes';

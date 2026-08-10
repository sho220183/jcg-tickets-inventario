-- =========================================
-- Migración 012: Vínculo directo ticket <-> inventario
-- (ej. "se instaló cámara X en cliente Y")
-- =========================================

create table ticket_inventario (
  ticket_id uuid not null references tickets(id) on delete cascade,
  item_id uuid not null references inventario_items(id) on delete cascade,
  cantidad int not null default 1,
  created_at timestamptz not null default now(),
  primary key (ticket_id, item_id)
);

-- =========================================
-- Migración 010: Ítems de inventario
-- =========================================

create table inventario_items (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  marca text,
  modelo text,
  categoria_id uuid references inventario_categorias(id),
  cantidad_stock int not null default 0,
  cantidad_minima int not null default 0,
  ubicacion text,
  cliente_asignado_id uuid references clientes(id) on delete set null,
  estado item_estado not null default 'disponible',
  created_at timestamptz not null default now()
);

create index idx_inventario_cliente on inventario_items(cliente_asignado_id);
create index idx_inventario_categoria on inventario_items(categoria_id);

-- =========================================
-- Migración 011: Movimientos de inventario
-- =========================================

create table inventario_movimientos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references inventario_items(id) on delete cascade,
  tipo movimiento_tipo not null,
  cantidad int not null,
  usuario_id uuid references profiles(id),
  ticket_id uuid references tickets(id) on delete set null,
  notas text,
  created_at timestamptz not null default now()
);

create index idx_movimientos_item on inventario_movimientos(item_id);
create index idx_movimientos_ticket on inventario_movimientos(ticket_id);

-- Mantiene cantidad_stock de inventario_items sincronizada con los movimientos
create or replace function aplicar_movimiento_inventario()
returns trigger as $$
begin
  if new.tipo in ('entrada', 'devolucion') then
    update inventario_items set cantidad_stock = cantidad_stock + new.cantidad
    where id = new.item_id;
  elsif new.tipo in ('salida', 'asignacion') then
    update inventario_items set cantidad_stock = cantidad_stock - new.cantidad
    where id = new.item_id;
  end if;
  -- 'ajuste' no modifica automáticamente: se usa para correcciones manuales
  return new;
end;
$$ language plpgsql;

create trigger trg_aplicar_movimiento
after insert on inventario_movimientos
for each row execute function aplicar_movimiento_inventario();

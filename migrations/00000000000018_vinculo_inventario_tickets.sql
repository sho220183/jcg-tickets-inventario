-- =========================================
-- Migración 018: Vínculo de inventario a tickets — permisos y validación
-- =========================================

-- ---------- 1. Faltaba la policy de DELETE en ticket_inventario ----------
-- (la 013 solo tenía SELECT e INSERT; hace falta para poder "quitar" un
-- ítem usado en un ticket desde la UI)

create policy "quitar_ticket_inventario_con_acceso" on ticket_inventario
  for delete using (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

-- ---------- 2. Evitar que un movimiento deje stock negativo ----------
-- Antes, una salida/asignación por más cantidad de la disponible dejaba
-- cantidad_stock en negativo sin avisar. Ahora se rechaza con un mensaje
-- claro, tanto si se usa desde la pantalla de inventario como desde el
-- nuevo flujo de "inventario usado en el ticket".

create or replace function aplicar_movimiento_inventario()
returns trigger as $$
declare
  stock_actual int;
begin
  if new.tipo in ('salida', 'asignacion') then
    select cantidad_stock into stock_actual from inventario_items where id = new.item_id;

    if stock_actual < new.cantidad then
      raise exception 'Stock insuficiente: hay % unidades disponibles y se pidieron %.',
        stock_actual, new.cantidad;
    end if;

    update inventario_items set cantidad_stock = cantidad_stock - new.cantidad
    where id = new.item_id;

  elsif new.tipo in ('entrada', 'devolucion') then
    update inventario_items set cantidad_stock = cantidad_stock + new.cantidad
    where id = new.item_id;
  end if;
  -- 'ajuste' no modifica automáticamente: se usa para correcciones manuales
  return new;
end;
$$ language plpgsql;

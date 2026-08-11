-- =========================================
-- Migración 023: Fix — no se podía cerrar un ticket de reparación
--
-- Causa: al pasar un ticket a "cerrado", el trigger que completa
-- fecha_entrega_real en equipos_reparacion se disparaba DESPUÉS
-- (AFTER UPDATE) de que el ticket ya figurara como cerrado. Ese UPDATE
-- interno a equipos_reparacion quedaba atrapado por el trigger de
-- bloqueo (que existe para impedir ediciones humanas en tickets
-- cerrados), y el sistema terminaba bloqueándose a sí mismo.
--
-- Solución: mover el trigger a BEFORE UPDATE. Así, en el momento en
-- que se actualiza equipos_reparacion, el ticket todavía figura con su
-- estado ANTERIOR (la fila no se escribió todavía), por lo tanto pasa
-- el chequeo de bloqueo sin problema. El comportamiento para ediciones
-- humanas normales no cambia en nada.
-- =========================================

drop trigger if exists trg_completar_fecha_entrega on tickets;

create trigger trg_completar_fecha_entrega
before update on tickets
for each row execute function completar_fecha_entrega_reparacion();

-- =========================================
-- Migración 019: Bloqueo de tickets cerrados
-- Un ticket "cerrado" no debe poder recibir más cambios de inventario,
-- notas, ni reasignación de técnicos — salvo que primero se reabra
-- (cambiando su estado a otro distinto de "cerrado").
--
-- Se implementa a nivel de base de datos (no solo en el frontend) para
-- que quede protegido sin importar desde dónde se intente modificar.
-- =========================================

create or replace function bloquear_si_ticket_cerrado()
returns trigger as $$
declare
  v_ticket_id uuid;
  estado_ticket ticket_estado;
begin
  if TG_OP = 'DELETE' then
    v_ticket_id := old.ticket_id;
  else
    v_ticket_id := new.ticket_id;
  end if;

  -- inventario_movimientos permite ticket_id nulo (movimientos generales
  -- de depósito, no ligados a un ticket) — esos siempre están permitidos.
  if v_ticket_id is null then
    return coalesce(new, old);
  end if;

  select estado into estado_ticket from tickets where id = v_ticket_id;

  if estado_ticket = 'cerrado' then
    raise exception 'Este ticket está cerrado. Reabrilo (cambiando su estado) antes de modificarlo.';
  end if;

  return coalesce(new, old);
end;
$$ language plpgsql;

-- ---------- Historial / notas ----------
create trigger trg_bloquear_eventos_cerrado
before insert on ticket_eventos
for each row execute function bloquear_si_ticket_cerrado();

-- ---------- Técnicos asignados ----------
create trigger trg_bloquear_tecnicos_insert_cerrado
before insert on ticket_tecnicos
for each row execute function bloquear_si_ticket_cerrado();

create trigger trg_bloquear_tecnicos_update_cerrado
before update on ticket_tecnicos
for each row execute function bloquear_si_ticket_cerrado();

create trigger trg_bloquear_tecnicos_delete_cerrado
before delete on ticket_tecnicos
for each row execute function bloquear_si_ticket_cerrado();

-- ---------- Inventario vinculado al ticket ----------
create trigger trg_bloquear_ticket_inventario_insert_cerrado
before insert on ticket_inventario
for each row execute function bloquear_si_ticket_cerrado();

create trigger trg_bloquear_ticket_inventario_delete_cerrado
before delete on ticket_inventario
for each row execute function bloquear_si_ticket_cerrado();

-- ---------- Movimientos de stock ligados a un ticket ----------
create trigger trg_bloquear_movimientos_cerrado
before insert on inventario_movimientos
for each row execute function bloquear_si_ticket_cerrado();

-- Nota: el cambio de ESTADO del ticket (tabla "tickets") no está bloqueado
-- por ninguno de estos triggers — es justamente el mecanismo para reabrirlo.

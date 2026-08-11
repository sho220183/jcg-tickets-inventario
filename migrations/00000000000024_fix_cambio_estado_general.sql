-- =========================================
-- Migración 024: Fix de fondo — cambiar CUALQUIER ticket a "cerrado"
-- fallaba, no solo los de reparación
--
-- Causa: el trigger que registra el cambio de estado en el historial
-- (ticket_eventos) existe desde el sprint 1 y corre DESPUÉS (AFTER
-- UPDATE) de aplicarse el cambio de estado. Cuando el nuevo estado es
-- "cerrado", en el momento en que este trigger intenta escribir el
-- evento en el historial, el ticket YA figura como cerrado — y el
-- trigger de bloqueo (agregado después, en un fix posterior) lo
-- interpreta como una edición no autorizada sobre un ticket cerrado.
--
-- Es el mismo problema que ya habíamos resuelto para la fecha de
-- entrega de reparaciones (migración 023), pero en este trigger más
-- viejo y de alcance general — afecta a CUALQUIER ticket, no solo a
-- los de reparación, por eso se repetía en ambos casos.
--
-- Solución: mismo approach — mover a BEFORE UPDATE, para que el
-- registro del evento ocurra mientras el ticket todavía figura con su
-- estado anterior (no escrito todavía), pasando el chequeo de bloqueo
-- sin problema.
-- =========================================

drop trigger if exists trg_ticket_evento_estado on tickets;

create trigger trg_ticket_evento_estado
before update on tickets
for each row execute function registrar_evento_cambio_estado();

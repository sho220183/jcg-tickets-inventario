-- =========================================
-- Migración 001: Extensiones y tipos enumerados
-- =========================================

-- gen_random_uuid() la necesitan casi todas las tablas
create extension if not exists pgcrypto;

create type user_role as enum ('admin', 'tecnico');

create type ticket_estado as enum (
  'nuevo', 'en_progreso', 'esperando_cliente', 'resuelto', 'cerrado'
);

create type ticket_prioridad as enum ('baja', 'media', 'alta', 'urgente');

create type ticket_origen as enum ('manual', 'portal', 'whatsapp', 'web');

create type evento_tipo as enum ('nota', 'cambio_estado', 'sistema');

create type item_estado as enum (
  'disponible', 'asignado', 'en_prestamo', 'dado_de_baja'
);

create type movimiento_tipo as enum (
  'entrada', 'salida', 'asignacion', 'devolucion', 'ajuste'
);

create type email_estado as enum ('pendiente', 'enviado', 'error');

-- Función helper reutilizable en varios triggers
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

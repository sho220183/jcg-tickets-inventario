-- =========================================
-- Migración 016: Email en técnicos + notificaciones multicanal
-- (email y WhatsApp, tanto para clientes como para técnicos)
-- =========================================

-- ---------- 1. Email en profiles ----------
-- El email de login ya vive en auth.users, pero lo espejamos en profiles
-- para poder leerlo desde el frontend sin permisos especiales, y para
-- poder armar las notificaciones sin joins contra auth.users.

alter table profiles
  add column email text;

-- Backfill de los perfiles que ya existen
update profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- El trigger de alta automática ahora también guarda el email
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombre_completo, rol, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre_completo', new.email), 'tecnico', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- ---------- 2. Preferencias de notificación ----------
alter table profiles
  add column notificar_email boolean not null default true,
  add column notificar_whatsapp boolean not null default false;

alter table clientes
  add column notificar_email boolean not null default true,
  add column notificar_whatsapp boolean not null default false;

comment on column profiles.notificar_whatsapp is
  'Si es true, se le notifica al teléfono guardado en profiles.telefono';
comment on column clientes.notificar_whatsapp is
  'Si es true, se le notifica al teléfono guardado en clientes.telefono';

-- ---------- 3. Tabla generalizada de notificaciones ----------
-- Reemplaza a "notificaciones_email" (que solo cubría email → cliente).
-- Ahora cubre email y WhatsApp, tanto para clientes como para técnicos.

create type canal_notificacion as enum ('email', 'whatsapp');
create type destinatario_tipo as enum ('cliente', 'tecnico');

create table notificaciones (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  canal canal_notificacion not null,
  destinatario_tipo destinatario_tipo not null,
  destinatario_id uuid not null,          -- id de clientes.id o profiles.id según destinatario_tipo
  destinatario_contacto text not null,     -- email o número de teléfono, ya resuelto
  asunto text,
  mensaje text not null,
  estado email_estado not null default 'pendiente',  -- reutiliza el enum pendiente/enviado/error
  error_detalle text,
  created_at timestamptz not null default now(),
  enviado_at timestamptz
);

create index idx_notificaciones_ticket on notificaciones(ticket_id);
create index idx_notificaciones_v2_estado on notificaciones(estado);

-- Deja de usarse: el envío se maneja desde la tabla "notificaciones" nueva.
-- Se conserva la tabla vieja por compatibilidad con datos de prueba ya
-- cargados, pero el trigger que la alimentaba se reemplaza abajo.
drop trigger if exists trg_ticket_notificacion on tickets;
drop function if exists encolar_notificacion_estado();

-- ---------- 4. Encolar notificaciones al cliente por cambio de estado ----------
create or replace function encolar_notificaciones_estado()
returns trigger as $$
declare
  c record;
begin
  if new.estado is distinct from old.estado then
    select * into c from clientes where id = new.cliente_id;

    if c.notificar_email and c.email is not null then
      insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, asunto, mensaje)
      values (new.id, 'email', 'cliente', c.id, c.email,
              'Actualización de tu ticket ' || new.codigo,
              'Tu ticket ' || new.codigo || ' cambió de estado a: ' || new.estado);
    end if;

    if c.notificar_whatsapp and c.telefono is not null then
      insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, mensaje)
      values (new.id, 'whatsapp', 'cliente', c.id, c.telefono,
              'Tu ticket ' || new.codigo || ' cambió de estado a: ' || new.estado);
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_notificaciones_estado
after update on tickets
for each row execute function encolar_notificaciones_estado();

-- ---------- 5. Encolar notificación al técnico cuando se lo asigna a un ticket ----------
create or replace function encolar_notificacion_asignacion()
returns trigger as $$
declare
  t record;
  tk record;
begin
  select * into t from profiles where id = new.profile_id;
  select * into tk from tickets where id = new.ticket_id;

  if t.notificar_email and t.email is not null then
    insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, asunto, mensaje)
    values (new.ticket_id, 'email', 'tecnico', t.id, t.email,
            'Te asignaron el ticket ' || tk.codigo,
            'Se te asignó el ticket ' || tk.codigo || ': ' || tk.titulo);
  end if;

  if t.notificar_whatsapp and t.telefono is not null then
    insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, mensaje)
    values (new.ticket_id, 'whatsapp', 'tecnico', t.id, t.telefono,
            'Se te asignó el ticket ' || tk.codigo || ': ' || tk.titulo);
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_notificacion_asignacion
after insert on ticket_tecnicos
for each row execute function encolar_notificacion_asignacion();

-- ---------- 6. RLS de la nueva tabla ----------
alter table notificaciones enable row level security;

create policy "admin_ve_notificaciones_v2" on notificaciones
  for select using (auth_rol() = 'admin');

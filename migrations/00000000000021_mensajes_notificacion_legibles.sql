-- =========================================
-- Migración 021: Mensajes de notificación más naturales
-- - Los estados se muestran legibles ("En progreso") en vez del valor
--   crudo de la base ("en_progreso").
-- - Se agrega un saludo personalizado con el nombre del destinatario.
-- =========================================

create or replace function estado_legible(e ticket_estado)
returns text as $$
  select case e
    when 'nuevo' then 'Nuevo'
    when 'en_progreso' then 'En progreso'
    when 'esperando_cliente' then 'Esperando al cliente'
    when 'resuelto' then 'Resuelto'
    when 'cerrado' then 'Cerrado'
    else e::text
  end;
$$ language sql immutable;

create or replace function encolar_notificaciones_estado()
returns trigger as $$
declare
  c record;
  nombre_saludo text;
begin
  if new.estado is distinct from old.estado then
    select * into c from clientes where id = new.cliente_id;
    nombre_saludo := coalesce(nullif(c.contacto_nombre, ''), c.nombre);

    if c.notificar_email and c.email is not null then
      insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, asunto, mensaje)
      values (new.id, 'email', 'cliente', c.id, c.email,
              'Actualización de tu ticket ' || new.codigo,
              'Hola ' || nombre_saludo || ', tu ticket ' || new.codigo ||
                ' cambió de estado a: ' || estado_legible(new.estado) || '.');
    end if;

    if c.notificar_whatsapp and c.telefono is not null then
      insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, mensaje)
      values (new.id, 'whatsapp', 'cliente', c.id, c.telefono,
              'Hola ' || nombre_saludo || ', tu ticket ' || new.codigo ||
                ' cambió de estado a: ' || estado_legible(new.estado) || '.');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

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
            'Hola ' || t.nombre_completo || ', se te asignó el ticket ' || tk.codigo ||
              ': ' || tk.titulo || '.');
  end if;

  if t.notificar_whatsapp and t.telefono is not null then
    insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, mensaje)
    values (new.ticket_id, 'whatsapp', 'tecnico', t.id, t.telefono,
            'Hola ' || t.nombre_completo || ', se te asignó el ticket ' || tk.codigo ||
              ': ' || tk.titulo || '.');
  end if;

  return new;
end;
$$ language plpgsql security definer;

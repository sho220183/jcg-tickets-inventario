-- =========================================
-- Migración 017: Fix — los triggers de notificaciones no podían insertar
-- Los triggers corren con los permisos del usuario que dispara la acción
-- (ej. el admin asignando un técnico). Como "notificaciones" tiene RLS
-- activado y no había ninguna policy de INSERT, la inserción del trigger
-- quedaba bloqueada y hacía fallar toda la operación (asignar técnico,
-- cambiar estado, etc.).
--
-- Se marcan ambas funciones como SECURITY DEFINER para que inserten con
-- privilegios propios, sin depender de las policies del usuario que
-- disparó la acción — mismo patrón que ya usa handle_new_user().
-- =========================================

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
            'Se te asignó el ticket ' || tk.codigo || ': ' || tk.titulo);
  end if;

  if t.notificar_whatsapp and t.telefono is not null then
    insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, mensaje)
    values (new.ticket_id, 'whatsapp', 'tecnico', t.id, t.telefono,
            'Se te asignó el ticket ' || tk.codigo || ': ' || tk.titulo);
  end if;

  return new;
end;
$$ language plpgsql security definer;

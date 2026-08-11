-- =========================================
-- Migración 022: Módulo de Reparaciones (taller)
-- No se crea un sistema paralelo: un ticket de reparación sigue siendo
-- un ticket normal (mismo historial, técnicos, notificaciones, bloqueo
-- al cerrar, e inventario usado para repuestos). Se le agrega:
--   1) un campo "tipo" en tickets (soporte | reparacion), para separar
--      los menús sin duplicar tablas.
--   2) una tabla "equipos_reparacion" 1 a 1 con el ticket, con los datos
--      propios de un equipo recibido para reparar.
-- =========================================

-- ---------- 1. Tipo de ticket ----------
create type ticket_tipo as enum ('soporte', 'reparacion');

alter table tickets
  add column tipo ticket_tipo not null default 'soporte';

create index idx_tickets_tipo on tickets(tipo);

-- ---------- 2. Ficha de equipo recibido ----------
create type tipo_equipo as enum ('notebook', 'computadora', 'impresora', 'celular', 'tablet', 'otro');

create table equipos_reparacion (
  ticket_id uuid primary key references tickets(id) on delete cascade,
  tipo_equipo tipo_equipo not null default 'otro',
  marca text,
  modelo text,
  numero_serie text,
  accesorios_entregados text,       -- ej: "cargador, mouse, funda"
  estado_al_recibir text,           -- descripción del estado físico/funcional al ingresar
  presupuesto_estimado numeric(12,2),
  presupuesto_aprobado boolean,     -- null = todavía no se le consultó al cliente
  fecha_estimada_entrega date,
  garantia_dias int not null default 30,
  fecha_entrega_real timestamptz,   -- se completa sola cuando el ticket pasa a "cerrado"
  created_at timestamptz not null default now()
);

comment on column equipos_reparacion.presupuesto_aprobado is
  'null = pendiente de respuesta del cliente, true = aprobado, false = rechazado';

-- ---------- 3. RLS: mismo criterio de acceso que el ticket asociado ----------
alter table equipos_reparacion enable row level security;

create policy "admin_full_access_equipos" on equipos_reparacion
  for all using (auth_rol() = 'admin');

create policy "staff_ve_equipos_con_acceso" on equipos_reparacion
  for select using (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

create policy "staff_crea_equipos_con_acceso" on equipos_reparacion
  for insert with check (
    auth_rol() in ('admin', 'tecnico')
  );

create policy "staff_edita_equipos_con_acceso" on equipos_reparacion
  for update using (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

-- ---------- 4. Bloqueo si el ticket está cerrado (reutiliza el trigger genérico) ----------
create trigger trg_bloquear_equipo_update_cerrado
before update on equipos_reparacion
for each row execute function bloquear_si_ticket_cerrado();

-- ---------- 5. Fecha de entrega automática al cerrar el ticket ----------
create or replace function completar_fecha_entrega_reparacion()
returns trigger as $$
begin
  if new.tipo = 'reparacion' and new.estado = 'cerrado' and old.estado is distinct from 'cerrado' then
    update equipos_reparacion
    set fecha_entrega_real = now()
    where ticket_id = new.id and fecha_entrega_real is null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_completar_fecha_entrega
after update on tickets
for each row execute function completar_fecha_entrega_reparacion();

-- ---------- 6. Mensajes de notificación adaptados a reparaciones ----------
create or replace function estado_legible_ticket(p_tipo ticket_tipo, e ticket_estado)
returns text as $$
  select case
    when p_tipo = 'reparacion' then
      case e
        when 'nuevo' then 'Recibido'
        when 'en_progreso' then 'En diagnóstico / reparación'
        when 'esperando_cliente' then 'Esperando tu aprobación de presupuesto'
        when 'resuelto' then 'Reparado, listo para retirar'
        when 'cerrado' then 'Entregado'
        else e::text
      end
    else
      estado_legible(e)
  end;
$$ language sql stable;

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
                ' cambió de estado a: ' || estado_legible_ticket(new.tipo, new.estado) || '.');
    end if;

    if c.notificar_whatsapp and c.telefono is not null then
      insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id, destinatario_contacto, mensaje)
      values (new.id, 'whatsapp', 'cliente', c.id, c.telefono,
              'Hola ' || nombre_saludo || ', tu ticket ' || new.codigo ||
                ' cambió de estado a: ' || estado_legible_ticket(new.tipo, new.estado) || '.');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

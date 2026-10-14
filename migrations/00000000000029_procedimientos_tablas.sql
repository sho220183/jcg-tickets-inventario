-- =====================================================================
-- Sprint "Altas y Bajas" (PRO-TI-001) · Migración 029
-- Tablas, funciones, triggers, RLS y bucket de evidencias.
--
-- Diseño (resumen, detalle en LEEME.md):
--   checklist_plantillas / checklist_plantilla_items
--       Plantillas VERSIONADAS del procedimiento (una activa por tipo).
--   ticket_procedimientos
--       Extensión 1:1 del ticket, igual que equipos_reparacion.
--   ticket_checklist_items
--       COPIA (snapshot) de los ítems al crear el ticket: si la plantilla
--       cambia a v1.1, los tickets ya creados conservan su versión.
--   seguimientos_programados
--       Acciones diferidas (eliminación definitiva tras la retención).
--
-- Regla de oro heredada del sistema: los efectos del CIERRE corren en un
-- trigger BEFORE UPDATE sobre tickets, porque bloquear_si_ticket_cerrado()
-- rechaza inserts en ticket_eventos cuando el ticket YA figura cerrado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.procedimiento_tipo as enum
  ('alta_equipo', 'alta_usuario', 'baja_usuario', 'baja_equipo');

create type public.checklist_item_estado as enum
  ('pendiente', 'completado', 'no_aplica');

create type public.destino_equipo as enum
  ('reasignacion', 'garantia', 'venta_donacion', 'desecho');

-- ---------------------------------------------------------------------
-- 2. Plantillas versionadas
-- ---------------------------------------------------------------------
create table public.checklist_plantillas (
  id          uuid primary key default gen_random_uuid(),
  codigo      text not null,                 -- 'PRO-TI-001'
  version     text not null,                 -- '1.0'
  tipo        public.procedimiento_tipo not null,
  titulo      text not null,
  activa      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (codigo, version, tipo)
);
comment on table public.checklist_plantillas is
  'Plantillas versionadas de checklist por tipo de procedimiento. Solo una activa por tipo.';

create unique index checklist_plantillas_una_activa_por_tipo
  on public.checklist_plantillas (tipo) where activa;

create table public.checklist_plantilla_items (
  id            uuid primary key default gen_random_uuid(),
  plantilla_id  uuid not null references public.checklist_plantillas(id) on delete cascade,
  seccion       text not null,
  orden         int  not null,
  texto         text not null,
  critico       boolean not null default false,  -- exige evidencia para cerrar
  solo_ad       boolean not null default false,  -- se omite en clientes sin dominio
  unique (plantilla_id, orden)
);

-- ---------------------------------------------------------------------
-- 3. Extensión 1:1 del ticket
-- ---------------------------------------------------------------------
create table public.ticket_procedimientos (
  ticket_id           uuid primary key references public.tickets(id) on delete cascade,
  plantilla_id        uuid not null references public.checklist_plantillas(id),
  tipo                public.procedimiento_tipo not null,
  cliente_tiene_ad    boolean not null default true,
  baja_inmediata      boolean not null default false,
  fecha_efectiva      timestamptz,
  persona_nombre      text,          -- usuario que entra o sale
  persona_usuario     text,          -- sAMAccountName / correo
  equipo_nombre       text,          -- p. ej. ONYX-NB-007
  equipo_serie        text,
  inventario_item_id  uuid references public.inventario_items(id),
  destino_equipo      public.destino_equipo,
  retencion_dias      int not null default 30 check (retencion_dias between 0 and 365),
  created_at          timestamptz not null default now(),
  constraint baja_inmediata_solo_en_baja_usuario
    check (not baja_inmediata or tipo = 'baja_usuario')
);
comment on table public.ticket_procedimientos is
  'Datos del procedimiento PRO-TI-001 asociados a un ticket de tipo procedimiento (1:1, como equipos_reparacion).';

-- ---------------------------------------------------------------------
-- 4. Ítems por ticket (snapshot de la plantilla)
-- ---------------------------------------------------------------------
create table public.ticket_checklist_items (
  id                 uuid primary key default gen_random_uuid(),
  ticket_id          uuid not null references public.tickets(id) on delete cascade,
  plantilla_item_id  uuid references public.checklist_plantilla_items(id) on delete set null,
  seccion            text not null,
  orden              int  not null,
  texto              text not null,
  critico            boolean not null default false,
  solo_ad            boolean not null default false,
  estado             public.checklist_item_estado not null default 'pendiente',
  motivo_no_aplica   text,
  evidencia_path     text,   -- archivo en el bucket ticket-evidencias: <ticket_id>/<archivo>
  evidencia_nota     text,   -- o un dato verificable (serie, ID de clave BitLocker, etc.)
  completado_por     uuid references public.profiles(id),
  completado_en      timestamptz,
  updated_at         timestamptz not null default now(),
  unique (ticket_id, orden)
);
create index ticket_checklist_items_ticket_idx on public.ticket_checklist_items (ticket_id);

-- ---------------------------------------------------------------------
-- 5. Seguimientos diferidos
-- ---------------------------------------------------------------------
create table public.seguimientos_programados (
  id                  uuid primary key default gen_random_uuid(),
  ticket_origen_id    uuid not null references public.tickets(id) on delete cascade,
  cliente_id          uuid not null references public.clientes(id),
  accion              text not null,     -- clave estable: 'eliminar_cuenta', 'eliminar_objeto_equipo'
  titulo              text not null,
  descripcion         text,
  fecha_programada    timestamptz not null,
  ticket_generado_id  uuid references public.tickets(id) on delete set null,
  created_at          timestamptz not null default now(),
  unique (ticket_origen_id, accion)       -- reabrir y recerrar no duplica
);
create index seguimientos_pendientes_idx
  on public.seguimientos_programados (fecha_programada) where ticket_generado_id is null;

-- ---------------------------------------------------------------------
-- 6. Etiquetas legibles (para mensajes y categoría del ticket)
-- ---------------------------------------------------------------------
create or replace function public.procedimiento_legible(p public.procedimiento_tipo)
returns text language sql immutable as $$
  select case p
    when 'alta_equipo'  then 'Alta de equipo'
    when 'alta_usuario' then 'Alta de usuario'
    when 'baja_usuario' then 'Baja de usuario'
    when 'baja_equipo'  then 'Baja de equipo'
  end;
$$;

-- ---------------------------------------------------------------------
-- 7. RPC: crear ticket de procedimiento (ticket + extensión + ítems)
--    Atómico: o se crea todo, o nada.
-- ---------------------------------------------------------------------
create or replace function public.crear_ticket_procedimiento(
  p_cliente_id          uuid,
  p_tipo                public.procedimiento_tipo,
  p_titulo              text default null,
  p_descripcion         text default null,
  p_cliente_tiene_ad    boolean default true,
  p_baja_inmediata      boolean default false,
  p_fecha_efectiva      timestamptz default null,
  p_persona_nombre      text default null,
  p_persona_usuario     text default null,
  p_equipo_nombre       text default null,
  p_equipo_serie        text default null,
  p_inventario_item_id  uuid default null,
  p_destino_equipo      public.destino_equipo default null,
  p_retencion_dias      int default 30,
  p_tecnicos            uuid[] default null      -- el primero queda como responsable principal
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol         user_role := auth_rol();
  v_plantilla   checklist_plantillas%rowtype;
  v_ticket_id   uuid;
  v_codigo      text;
  v_tecnicos    uuid[];
  v_total       int;
  v_criticos    int;
  v_omitidos    int;
  v_sujeto      text;
  v_admin       record;
  i             int;
begin
  if v_rol is null or v_rol not in ('admin', 'tecnico') then
    raise exception 'Solo el personal de JCG puede crear tickets de procedimiento.';
  end if;

  if p_baja_inmediata and p_tipo <> 'baja_usuario' then
    raise exception 'La baja inmediata solo aplica a bajas de usuario.';
  end if;

  select * into v_plantilla
  from checklist_plantillas where tipo = p_tipo and activa;
  if not found then
    raise exception 'No hay una plantilla activa para %.', procedimiento_legible(p_tipo);
  end if;

  v_sujeto := coalesce(nullif(trim(p_persona_nombre), ''), nullif(trim(p_equipo_nombre), ''), '');

  insert into tickets (cliente_id, titulo, descripcion, categoria, origen, prioridad, tipo, created_by)
  values (
    p_cliente_id,
    coalesce(nullif(trim(p_titulo), ''),
             procedimiento_legible(p_tipo) || case when v_sujeto <> '' then ': ' || v_sujeto else '' end),
    p_descripcion,
    procedimiento_legible(p_tipo),
    'manual',
    case when p_baja_inmediata then 'urgente'::ticket_prioridad else 'media'::ticket_prioridad end,
    'procedimiento',
    auth.uid()
  )
  returning id, codigo into v_ticket_id, v_codigo;

  insert into ticket_procedimientos (
    ticket_id, plantilla_id, tipo, cliente_tiene_ad, baja_inmediata, fecha_efectiva,
    persona_nombre, persona_usuario, equipo_nombre, equipo_serie,
    inventario_item_id, destino_equipo, retencion_dias)
  values (
    v_ticket_id, v_plantilla.id, p_tipo, coalesce(p_cliente_tiene_ad, true),
    coalesce(p_baja_inmediata, false), p_fecha_efectiva,
    p_persona_nombre, p_persona_usuario, p_equipo_nombre, p_equipo_serie,
    p_inventario_item_id, p_destino_equipo, coalesce(p_retencion_dias, 30));

  -- Snapshot de los ítems. En clientes sin AD, los [AD] nacen como "No aplica".
  insert into ticket_checklist_items
    (ticket_id, plantilla_item_id, seccion, orden, texto, critico, solo_ad, estado, motivo_no_aplica)
  select v_ticket_id, pi.id, pi.seccion, pi.orden, pi.texto, pi.critico, pi.solo_ad,
         case when pi.solo_ad and not coalesce(p_cliente_tiene_ad, true)
              then 'no_aplica'::checklist_item_estado else 'pendiente'::checklist_item_estado end,
         case when pi.solo_ad and not coalesce(p_cliente_tiene_ad, true)
              then 'Cliente sin dominio Active Directory' end
  from checklist_plantilla_items pi
  where pi.plantilla_id = v_plantilla.id;

  select count(*), count(*) filter (where critico), count(*) filter (where estado = 'no_aplica')
    into v_total, v_criticos, v_omitidos
  from ticket_checklist_items where ticket_id = v_ticket_id;

  insert into ticket_eventos (ticket_id, autor_id, tipo, contenido)
  values (v_ticket_id, auth.uid(), 'sistema',
          format('Procedimiento %s v%s iniciado: %s ítems (%s críticos)%s.',
                 v_plantilla.codigo, v_plantilla.version, v_total, v_criticos,
                 case when v_omitidos > 0 then format(', %s omitidos por cliente sin AD', v_omitidos) else '' end));

  -- Asignación: los técnicos indicados o, si crea un técnico, él mismo
  -- (sin asignación un técnico no vería su propio ticket por RLS).
  v_tecnicos := coalesce(p_tecnicos, '{}');
  if cardinality(v_tecnicos) = 0 and v_rol = 'tecnico' then
    v_tecnicos := array[auth.uid()];
  end if;
  for i in 1 .. coalesce(cardinality(v_tecnicos), 0) loop
    insert into ticket_tecnicos (ticket_id, profile_id, es_responsable_principal)
    values (v_ticket_id, v_tecnicos[i], i = 1)
    on conflict do nothing;
  end loop;

  -- Baja inmediata: aviso urgente a todos los administradores (supervisión).
  if p_baja_inmediata then
    for v_admin in
      select id, email, nombre_completo from profiles
      where rol = 'admin' and activo and notificar_email and email is not null
    loop
      insert into notificaciones (ticket_id, canal, destinatario_tipo, destinatario_id,
                                  destinatario_contacto, asunto, mensaje)
      values (v_ticket_id, 'email', 'tecnico', v_admin.id, v_admin.email,
              'URGENTE · Baja inmediata ' || v_codigo,
              'Hola ' || v_admin.nombre_completo || ', se abrió la baja inmediata ' || v_codigo ||
              case when v_sujeto <> '' then ' (' || v_sujeto || ')' else '' end ||
              coalesce('. Fecha y hora efectiva: ' ||
                       to_char(p_fecha_efectiva at time zone 'America/Asuncion', 'DD/MM/YYYY HH24:MI'), '') ||
              '. Los accesos deben cortarse durante la reunión de desvinculación (PRO-TI-001, 5.2).');
    end loop;
  end if;

  return v_ticket_id;
end;
$$;

revoke execute on function public.crear_ticket_procedimiento(
  uuid, public.procedimiento_tipo, text, text, boolean, boolean, timestamptz, text, text,
  text, text, uuid, public.destino_equipo, int, uuid[]) from public, anon;
grant execute on function public.crear_ticket_procedimiento(
  uuid, public.procedimiento_tipo, text, text, boolean, boolean, timestamptz, text, text,
  text, text, uuid, public.destino_equipo, int, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Protección de ítems: campos de la plantilla inmutables, sellado de
--    quién/cuándo, y "No aplica" con motivo (crítico: solo admin).
-- ---------------------------------------------------------------------
create or replace function public.proteger_item_checklist()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.ticket_id is distinct from old.ticket_id
     or new.plantilla_item_id is distinct from old.plantilla_item_id
     or new.seccion  is distinct from old.seccion
     or new.orden    is distinct from old.orden
     or new.texto    is distinct from old.texto
     or new.critico  is distinct from old.critico
     or new.solo_ad  is distinct from old.solo_ad then
    raise exception 'Los ítems del checklist provienen de la plantilla y no se pueden editar. Solo se registra su estado y evidencia.';
  end if;

  if new.estado = 'no_aplica' then
    if coalesce(trim(new.motivo_no_aplica), '') = '' then
      raise exception 'Para marcar un ítem como "No aplica" hay que indicar el motivo.';
    end if;
    if new.critico and old.estado <> 'no_aplica'
       and auth.uid() is not null and auth_rol() is distinct from 'admin' then
      raise exception 'Solo un administrador puede marcar un ítem crítico como "No aplica".';
    end if;
  else
    new.motivo_no_aplica := null;
  end if;

  if new.estado = 'completado' and old.estado <> 'completado' then
    new.completado_por := auth.uid();
    new.completado_en  := now();
  elsif new.estado <> 'completado' then
    new.completado_por := null;
    new.completado_en  := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_bloquear_checklist_cerrado
  before insert or update or delete on public.ticket_checklist_items
  for each row execute function public.bloquear_si_ticket_cerrado();

create trigger trg_proteger_item_checklist
  before update on public.ticket_checklist_items
  for each row execute function public.proteger_item_checklist();

-- Extensión del ticket: tipo y plantilla inmutables; bloqueo si está cerrado.
create or replace function public.proteger_ticket_procedimiento()
returns trigger language plpgsql as $$
begin
  if new.ticket_id is distinct from old.ticket_id
     or new.tipo is distinct from old.tipo
     or new.plantilla_id is distinct from old.plantilla_id then
    raise exception 'El tipo de procedimiento y su plantilla no se pueden cambiar una vez creado el ticket.';
  end if;
  return new;
end;
$$;

create trigger trg_bloquear_procedimiento_cerrado
  before update on public.ticket_procedimientos
  for each row execute function public.bloquear_si_ticket_cerrado();

create trigger trg_proteger_ticket_procedimiento
  before update on public.ticket_procedimientos
  for each row execute function public.proteger_ticket_procedimiento();

-- ---------------------------------------------------------------------
-- 9. Cierre: valida el checklist y aplica efectos (BEFORE UPDATE)
-- ---------------------------------------------------------------------
create or replace function public.validar_y_aplicar_cierre_procedimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pr              ticket_procedimientos%rowtype;
  v_pendientes    int;
  v_sin_evidencia int;
  v_ejemplo       text;
  v_problemas     text[] := '{}';
  v_efectos       text[] := '{}';
  v_fecha         timestamptz;
  v_sujeto        text;
begin
  if not (new.estado = 'cerrado' and old.estado is distinct from 'cerrado') then
    return new;
  end if;

  select * into pr from ticket_procedimientos where ticket_id = new.id;
  if not found then
    return new;   -- ticket común: nada que validar
  end if;

  -- 9.1 Validación ---------------------------------------------------
  select count(*), (array_agg(texto order by orden))[1] into v_pendientes, v_ejemplo
  from ticket_checklist_items where ticket_id = new.id and estado = 'pendiente';
  if v_pendientes > 0 then
    v_problemas := v_problemas || format('%s ítem(s) pendiente(s), p. ej. "%s"', v_pendientes, v_ejemplo);
  end if;

  select count(*), (array_agg(texto order by orden))[1] into v_sin_evidencia, v_ejemplo
  from ticket_checklist_items
  where ticket_id = new.id and critico and estado = 'completado'
    and coalesce(trim(evidencia_path), '') = '' and coalesce(trim(evidencia_nota), '') = '';
  if v_sin_evidencia > 0 then
    v_problemas := v_problemas || format('%s ítem(s) crítico(s) sin evidencia, p. ej. "%s"', v_sin_evidencia, v_ejemplo);
  end if;

  if pr.tipo = 'baja_equipo' and pr.destino_equipo is null then
    v_problemas := v_problemas || 'falta indicar el destino del equipo'::text;
  end if;

  if cardinality(v_problemas) > 0 then
    -- old.codigo: en BEFORE UPDATE las columnas generadas de NEW todavía son NULL.
    raise exception 'No se puede cerrar el ticket %: %.', old.codigo, array_to_string(v_problemas, '; ')
      using hint = 'PRO-TI-001: "evidencia o no pasó". Completá los ítems, adjuntá evidencia o marcalos como "No aplica" con motivo.';
  end if;

  -- 9.2 Efectos -------------------------------------------------------
  v_sujeto := coalesce(nullif(trim(pr.persona_nombre), ''), nullif(trim(pr.equipo_nombre), ''), new.titulo);
  v_fecha  := now() + make_interval(days => pr.retencion_dias);

  if pr.inventario_item_id is not null and pr.tipo in ('alta_equipo', 'baja_equipo') then
    update inventario_items
       set estado = case pr.tipo when 'alta_equipo' then 'asignado'::item_estado
                                 else 'dado_de_baja'::item_estado end,
           cliente_asignado_id = case pr.tipo when 'alta_equipo' then new.cliente_id
                                              else cliente_asignado_id end
     where id = pr.inventario_item_id;
    v_efectos := v_efectos || (case pr.tipo when 'alta_equipo' then 'inventario pasó a Asignado'
                                            else 'inventario pasó a Dado de baja' end)::text;
  end if;

  if pr.tipo = 'baja_usuario' then
    insert into seguimientos_programados
      (ticket_origen_id, cliente_id, accion, titulo, descripcion, fecha_programada)
    values (new.id, new.cliente_id, 'eliminar_cuenta',
            'Eliminación definitiva de cuenta: ' || v_sujeto,
            format('Vence la retención de %s días de la baja %s. Verificar que el buzón y los datos fueron transferidos y eliminar definitivamente la cuenta (AD / Microsoft 365).',
                   pr.retencion_dias, old.codigo),
            v_fecha)
    on conflict (ticket_origen_id, accion) do nothing;
    v_efectos := v_efectos || ('seguimiento de eliminación programado para el ' ||
                               to_char(v_fecha at time zone 'America/Asuncion', 'DD/MM/YYYY'));
  elsif pr.tipo = 'baja_equipo' and pr.cliente_tiene_ad then
    insert into seguimientos_programados
      (ticket_origen_id, cliente_id, accion, titulo, descripcion, fecha_programada)
    values (new.id, new.cliente_id, 'eliminar_objeto_equipo',
            'Eliminar objeto de equipo en AD: ' || v_sujeto,
            format('Vence la retención de %s días de la baja %s. Eliminar el objeto de equipo de la OU "Equipos de baja".',
                   pr.retencion_dias, old.codigo),
            v_fecha)
    on conflict (ticket_origen_id, accion) do nothing;
    v_efectos := v_efectos || ('seguimiento de eliminación en AD programado para el ' ||
                               to_char(v_fecha at time zone 'America/Asuncion', 'DD/MM/YYYY'));
  end if;

  -- En BEFORE UPDATE el ticket todavía no figura cerrado, así que el
  -- trigger de bloqueo de ticket_eventos deja pasar este insert.
  insert into ticket_eventos (ticket_id, autor_id, tipo, contenido)
  values (new.id, auth.uid(), 'sistema',
          'Checklist PRO-TI-001 verificado al cierre' ||
          case when cardinality(v_efectos) > 0 then ': ' || array_to_string(v_efectos, '; ') else '' end || '.');

  return new;
end;
$$;

create trigger trg_procedimiento_cierre
  before update on public.tickets
  for each row execute function public.validar_y_aplicar_cierre_procedimiento();

-- ---------------------------------------------------------------------
-- 10. Generar los tickets de seguimiento vencidos
--     La llama pg_cron a diario (migración 4) o un admin desde la app.
-- ---------------------------------------------------------------------
create or replace function public.generar_seguimientos_vencidos()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  s          record;
  v_nuevo    uuid;
  v_codigo   text;
  v_cuenta   int := 0;
begin
  -- Sin sesión (pg_cron / service_role) o admin. Un técnico no puede dispararla.
  if auth.uid() is not null and auth_rol() is distinct from 'admin' then
    raise exception 'Solo un administrador puede generar los seguimientos.';
  end if;

  for s in
    select sp.*, t.codigo as codigo_origen
    from seguimientos_programados sp
    join tickets t on t.id = sp.ticket_origen_id
    where sp.ticket_generado_id is null and sp.fecha_programada <= now()
    order by sp.fecha_programada
    for update of sp skip locked
  loop
    insert into tickets (cliente_id, titulo, descripcion, categoria, origen, prioridad, tipo)
    values (s.cliente_id, s.titulo, s.descripcion, 'Seguimiento PRO-TI-001', 'manual', 'media', 'soporte')
    returning id, codigo into v_nuevo, v_codigo;

    insert into ticket_eventos (ticket_id, tipo, contenido)
    values (v_nuevo, 'sistema', 'Seguimiento automático generado desde ' || s.codigo_origen || '.');

    -- Mismos técnicos que el ticket de origen (esto dispara su notificación).
    insert into ticket_tecnicos (ticket_id, profile_id, es_responsable_principal)
    select v_nuevo, tt.profile_id, tt.es_responsable_principal
    from ticket_tecnicos tt where tt.ticket_id = s.ticket_origen_id;

    update seguimientos_programados set ticket_generado_id = v_nuevo where id = s.id;
    v_cuenta := v_cuenta + 1;
  end loop;

  return v_cuenta;
end;
$$;

revoke execute on function public.generar_seguimientos_vencidos() from public, anon;
grant execute on function public.generar_seguimientos_vencidos() to authenticated;

-- ---------------------------------------------------------------------
-- 11. RLS (mismo patrón que el resto del sistema)
-- ---------------------------------------------------------------------
alter table public.checklist_plantillas       enable row level security;
alter table public.checklist_plantilla_items  enable row level security;
alter table public.ticket_procedimientos      enable row level security;
alter table public.ticket_checklist_items     enable row level security;
alter table public.seguimientos_programados   enable row level security;

create policy staff_ve_plantillas on public.checklist_plantillas
  for select using (auth_rol() in ('admin', 'tecnico'));
create policy admin_gestiona_plantillas on public.checklist_plantillas
  for all using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

create policy staff_ve_plantilla_items on public.checklist_plantilla_items
  for select using (auth_rol() in ('admin', 'tecnico'));
create policy admin_gestiona_plantilla_items on public.checklist_plantilla_items
  for all using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

-- Altas solo por la RPC (security definer); lectura y edición con acceso al ticket.
create policy ver_procedimiento_con_acceso on public.ticket_procedimientos
  for select using (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id));
create policy editar_procedimiento_con_acceso on public.ticket_procedimientos
  for update using (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id))
  with check (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id));
create policy admin_elimina_procedimiento on public.ticket_procedimientos
  for delete using (auth_rol() = 'admin');

create policy ver_checklist_con_acceso on public.ticket_checklist_items
  for select using (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id));
create policy editar_checklist_con_acceso on public.ticket_checklist_items
  for update using (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id))
  with check (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id));
create policy admin_elimina_checklist on public.ticket_checklist_items
  for delete using (auth_rol() = 'admin');

create policy ver_seguimientos_con_acceso on public.seguimientos_programados
  for select using (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_origen_id));
create policy admin_gestiona_seguimientos on public.seguimientos_programados
  for all using (auth_rol() = 'admin') with check (auth_rol() = 'admin');

-- ---------------------------------------------------------------------
-- 12. Bucket de evidencias (imágenes y PDF; ticket-fotos solo acepta imágenes)
--     Ruta obligatoria: <ticket_id>/<archivo>, igual que ticket-fotos.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-evidencias', 'ticket-evidencias', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do nothing;

create policy ver_evidencias_bucket_con_acceso on storage.objects
  for select using (
    bucket_id = 'ticket-evidencias'
    and (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(((storage.foldername(name))[1])::uuid)));

create policy subir_evidencias_bucket_con_acceso on storage.objects
  for insert with check (
    bucket_id = 'ticket-evidencias'
    and (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(((storage.foldername(name))[1])::uuid)));

create policy eliminar_evidencias_bucket_con_acceso on storage.objects
  for delete using (
    bucket_id = 'ticket-evidencias'
    and (auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(((storage.foldername(name))[1])::uuid)));

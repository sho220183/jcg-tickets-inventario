-- =========================================
-- Migración 013: Row Level Security (RLS)
-- Regla general: admin ve/edita todo.
-- Técnico ve un ticket si está asignado directamente,
-- o si pertenece a un grupo de trabajo con acceso al cliente.
-- =========================================

alter table profiles enable row level security;
alter table clientes enable row level security;
alter table grupos_trabajo enable row level security;
alter table grupo_miembros enable row level security;
alter table grupo_clientes enable row level security;
alter table tickets enable row level security;
alter table ticket_tecnicos enable row level security;
alter table ticket_eventos enable row level security;
alter table notificaciones_email enable row level security;
alter table inventario_categorias enable row level security;
alter table inventario_items enable row level security;
alter table inventario_movimientos enable row level security;
alter table ticket_inventario enable row level security;

-- Función helper: rol del usuario actual
create or replace function auth_rol()
returns user_role as $$
  select rol from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Función helper: ¿el técnico actual tiene acceso a este ticket?
create or replace function tecnico_tiene_acceso_ticket(p_ticket_id uuid)
returns boolean as $$
  select exists (
    select 1 from ticket_tecnicos tt
    where tt.ticket_id = p_ticket_id and tt.profile_id = auth.uid()
  )
  or exists (
    select 1
    from grupo_miembros gm
    join grupo_clientes gc on gc.grupo_id = gm.grupo_id
    join tickets t on t.cliente_id = gc.cliente_id
    where gm.profile_id = auth.uid() and t.id = p_ticket_id
  );
$$ language sql stable security definer;

-- ---------- profiles ----------
create policy "ver_propio_perfil" on profiles
  for select using (id = auth.uid() or auth_rol() = 'admin');

create policy "admin_gestiona_perfiles" on profiles
  for all using (auth_rol() = 'admin');

-- ---------- clientes ----------
create policy "staff_ve_clientes" on clientes
  for select using (auth_rol() in ('admin', 'tecnico'));

create policy "admin_gestiona_clientes" on clientes
  for insert with check (auth_rol() = 'admin');

create policy "admin_edita_clientes" on clientes
  for update using (auth_rol() = 'admin');

-- ---------- grupos_trabajo / grupo_miembros / grupo_clientes ----------
create policy "staff_ve_grupos" on grupos_trabajo
  for select using (auth_rol() in ('admin', 'tecnico'));

create policy "admin_gestiona_grupos" on grupos_trabajo
  for all using (auth_rol() = 'admin');

create policy "staff_ve_grupo_miembros" on grupo_miembros
  for select using (auth_rol() in ('admin', 'tecnico'));

create policy "admin_gestiona_grupo_miembros" on grupo_miembros
  for all using (auth_rol() = 'admin');

create policy "staff_ve_grupo_clientes" on grupo_clientes
  for select using (auth_rol() in ('admin', 'tecnico'));

create policy "admin_gestiona_grupo_clientes" on grupo_clientes
  for all using (auth_rol() = 'admin');

-- ---------- tickets ----------
create policy "admin_full_access_tickets" on tickets
  for all using (auth_rol() = 'admin');

create policy "tecnico_ve_tickets_con_acceso" on tickets
  for select using (
    auth_rol() = 'tecnico' and tecnico_tiene_acceso_ticket(id)
  );

create policy "tecnico_crea_tickets" on tickets
  for insert with check (auth_rol() = 'tecnico');

create policy "tecnico_edita_tickets_con_acceso" on tickets
  for update using (
    auth_rol() = 'tecnico' and tecnico_tiene_acceso_ticket(id)
  );

-- ---------- ticket_tecnicos ----------
create policy "staff_ve_ticket_tecnicos" on ticket_tecnicos
  for select using (auth_rol() in ('admin', 'tecnico'));

create policy "admin_gestiona_ticket_tecnicos" on ticket_tecnicos
  for all using (auth_rol() = 'admin');

-- ---------- ticket_eventos ----------
create policy "ver_eventos_con_acceso" on ticket_eventos
  for select using (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

create policy "crear_eventos_con_acceso" on ticket_eventos
  for insert with check (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

-- ---------- notificaciones_email ----------
create policy "admin_ve_notificaciones" on notificaciones_email
  for select using (auth_rol() = 'admin');

-- ---------- inventario_categorias ----------
create policy "staff_ve_categorias" on inventario_categorias
  for select using (auth_rol() in ('admin', 'tecnico'));

create policy "admin_gestiona_categorias" on inventario_categorias
  for all using (auth_rol() = 'admin');

-- ---------- inventario_items ----------
create policy "staff_ve_inventario" on inventario_items
  for select using (auth_rol() in ('admin', 'tecnico'));

create policy "staff_gestiona_inventario" on inventario_items
  for all using (auth_rol() in ('admin', 'tecnico'));

-- ---------- inventario_movimientos ----------
create policy "staff_ve_movimientos" on inventario_movimientos
  for select using (auth_rol() in ('admin', 'tecnico'));

create policy "staff_crea_movimientos" on inventario_movimientos
  for insert with check (auth_rol() in ('admin', 'tecnico'));

-- ---------- ticket_inventario ----------
create policy "ver_ticket_inventario_con_acceso" on ticket_inventario
  for select using (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

create policy "crear_ticket_inventario_con_acceso" on ticket_inventario
  for insert with check (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

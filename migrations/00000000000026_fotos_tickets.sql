-- =========================================
-- Migración 026: Fotos en tickets y reparaciones
-- Permite adjuntar fotos a cualquier ticket (soporte o reparación) —
-- típicamente "estado del equipo al recibir", "daño detectado",
-- "trabajo terminado", etc. Reutiliza exactamente el mismo criterio de
-- acceso y el mismo trigger de bloqueo que ya usan ticket_inventario y
-- ticket_eventos, para no introducir un criterio de seguridad nuevo.
-- =========================================

-- ---------- 1. Metadata de cada foto ----------
create table ticket_fotos (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  storage_path text not null unique,       -- ruta dentro del bucket "ticket-fotos"
  nombre_archivo text,                     -- nombre original, solo para mostrarlo
  descripcion text,                        -- ej: "Antes de reparar", "Daño en pantalla"
  subido_por uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_ticket_fotos_ticket on ticket_fotos(ticket_id);

comment on table ticket_fotos is
  'Metadata de las fotos adjuntas a un ticket. El archivo en sí vive en el bucket de Storage "ticket-fotos", bajo la ruta "<ticket_id>/<archivo>" — por eso storage_path siempre empieza con el mismo uuid que ticket_id.';

-- ---------- 2. RLS de la tabla — mismo criterio que ticket_inventario ----------
alter table ticket_fotos enable row level security;

create policy "ver_ticket_fotos_con_acceso" on ticket_fotos
  for select using (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

create policy "crear_ticket_fotos_con_acceso" on ticket_fotos
  for insert with check (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

create policy "eliminar_ticket_fotos_con_acceso" on ticket_fotos
  for delete using (
    auth_rol() = 'admin' or tecnico_tiene_acceso_ticket(ticket_id)
  );

-- ---------- 3. Bloqueo si el ticket está cerrado ----------
-- Reutiliza la función de la migración 019 (bloquear_si_ticket_cerrado):
-- funciona sin cambios porque ticket_fotos ya tiene una columna ticket_id.
create trigger trg_bloquear_fotos_insert_cerrado
before insert on ticket_fotos
for each row execute function bloquear_si_ticket_cerrado();

create trigger trg_bloquear_fotos_delete_cerrado
before delete on ticket_fotos
for each row execute function bloquear_si_ticket_cerrado();

-- ---------- 4. Bucket de Storage ----------
-- Privado (no público): las fotos de un cliente no deben quedar accesibles
-- por URL directa sin sesión. El frontend las muestra con URLs firmadas
-- de corta duración (supabase.storage.from(...).createSignedUrls(...)).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ticket-fotos',
  'ticket-fotos',
  false,
  15728640, -- 15 MB, alcanza de sobra para una foto de celular
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- ---------- 5. RLS del bucket ----------
-- Convención de nombres: "<ticket_id>/<archivo>" — el primer segmento de
-- la ruta (storage.foldername) es el ticket_id, así que se puede aplicar
-- exactamente la misma función tecnico_tiene_acceso_ticket() que ya usa
-- el resto del sistema, sin duplicar lógica de permisos.
create policy "ver_fotos_bucket_con_acceso" on storage.objects
  for select using (
    bucket_id = 'ticket-fotos'
    and (
      auth_rol() = 'admin'
      or tecnico_tiene_acceso_ticket(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "subir_fotos_bucket_con_acceso" on storage.objects
  for insert with check (
    bucket_id = 'ticket-fotos'
    and (
      auth_rol() = 'admin'
      or tecnico_tiene_acceso_ticket(((storage.foldername(name))[1])::uuid)
    )
  );

create policy "eliminar_fotos_bucket_con_acceso" on storage.objects
  for delete using (
    bucket_id = 'ticket-fotos'
    and (
      auth_rol() = 'admin'
      or tecnico_tiene_acceso_ticket(((storage.foldername(name))[1])::uuid)
    )
  );

-- Nota: a diferencia de la tabla ticket_fotos, el bucket en sí no tiene
-- forma de aplicar el trigger de "ticket cerrado" (storage.objects no
-- tiene columna ticket_id). Por eso el orden que sigue el frontend
-- importa: primero sube el archivo, después inserta la fila en
-- ticket_fotos (ahí sí se aplica el bloqueo) y si esa segunda parte
-- falla, borra el archivo recién subido para no dejarlo huérfano.

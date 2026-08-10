-- =========================================
-- Migración 008: Notificaciones por email
-- El envío real lo hace una Edge Function (ej. con Resend),
-- disparada por un Database Webhook sobre el insert en esta tabla.
-- =========================================

create table notificaciones_email (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  destinatario text not null,
  estado email_estado not null default 'pendiente',
  asunto text,
  error_detalle text,
  created_at timestamptz not null default now(),
  enviado_at timestamptz
);

create index idx_notificaciones_estado on notificaciones_email(estado);

create or replace function encolar_notificacion_estado()
returns trigger as $$
begin
  if new.estado is distinct from old.estado then
    insert into notificaciones_email (ticket_id, destinatario, asunto)
    select new.id, c.email,
           'Actualización de tu ticket ' || new.codigo || ': ' || new.estado
    from clientes c
    where c.id = new.cliente_id and c.email is not null;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_ticket_notificacion
after update on tickets
for each row execute function encolar_notificacion_estado();

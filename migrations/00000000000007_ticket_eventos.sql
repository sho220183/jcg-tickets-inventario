-- =========================================
-- Migración 007: Historial de eventos por ticket
-- =========================================

create table ticket_eventos (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  autor_id uuid references profiles(id),
  tipo evento_tipo not null default 'nota',
  contenido text not null,
  estado_anterior ticket_estado,
  estado_nuevo ticket_estado,
  created_at timestamptz not null default now()
);

create index idx_eventos_ticket on ticket_eventos(ticket_id);

-- Registra automáticamente cada cambio de estado como evento del sistema
create or replace function registrar_evento_cambio_estado()
returns trigger as $$
begin
  if new.estado is distinct from old.estado then
    insert into ticket_eventos (ticket_id, tipo, contenido, estado_anterior, estado_nuevo)
    values (
      new.id, 'cambio_estado',
      'Estado cambiado de ' || old.estado || ' a ' || new.estado,
      old.estado, new.estado
    );
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_ticket_evento_estado
after update on tickets
for each row execute function registrar_evento_cambio_estado();

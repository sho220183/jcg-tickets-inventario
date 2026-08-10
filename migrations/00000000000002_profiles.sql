-- =========================================
-- Migración 002: Perfiles (extiende auth.users)
-- =========================================

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null,
  telefono text,
  rol user_role not null default 'tecnico',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table profiles is 'Datos adicionales de cada usuario (técnico o admin), 1 a 1 con auth.users';

-- Trigger opcional: crear automáticamente un profile cuando se registra un usuario
-- (útil si el alta de técnicos se hace por invitación de Supabase Auth)
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombre_completo, rol)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre_completo', new.email), 'tecnico');
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

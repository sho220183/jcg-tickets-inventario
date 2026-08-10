-- =========================================
-- Migración 004: Grupos de trabajo
-- Permiten que un equipo de técnicos vea todos los tickets
-- de un cliente específico, sin asignación individual.
-- =========================================

create table grupos_trabajo (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

create table grupo_miembros (
  grupo_id uuid not null references grupos_trabajo(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (grupo_id, profile_id)
);

create table grupo_clientes (
  grupo_id uuid not null references grupos_trabajo(id) on delete cascade,
  cliente_id uuid not null references clientes(id) on delete cascade,
  primary key (grupo_id, cliente_id)
);

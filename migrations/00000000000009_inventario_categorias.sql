-- =========================================
-- Migración 009: Categorías de inventario
-- Lista fija para arrancar, pero editable (no un enum hardcodeado)
-- =========================================

create table inventario_categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

insert into inventario_categorias (nombre) values
  ('CCTV'), ('Networking'), ('Licencias'), ('Servidores'), ('Otro');

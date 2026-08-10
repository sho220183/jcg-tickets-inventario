-- =========================================
-- Migración 014: RUC en clientes
-- Identificador único paraguayo, formato "3769383-2".
-- Se deja nullable porque los clientes ya cargados no lo tienen todavía;
-- se puede volver "not null" más adelante una vez completada la carga.
-- =========================================

alter table clientes
  add column ruc varchar(15);

alter table clientes
  add constraint clientes_ruc_unique unique (ruc);

comment on column clientes.ruc is
  'Registro Único de Contribuyente, formato "3769383-2", máx. 15 caracteres';

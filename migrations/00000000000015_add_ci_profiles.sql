-- =========================================
-- Migración 015: Cédula (CI) en profiles
-- Identificador único de cada técnico/admin, formato libre pero único,
-- hasta 15 caracteres (mismo criterio que el RUC de clientes).
-- Nullable porque los perfiles ya creados por el trigger de alta
-- automática no lo tienen todavía; se completa después desde la pantalla
-- de Técnicos.
-- =========================================

alter table profiles
  add column ci varchar(15);

alter table profiles
  add constraint profiles_ci_unique unique (ci);

comment on column profiles.ci is
  'Cédula de identidad, identificador único del técnico/admin, máx. 15 caracteres';

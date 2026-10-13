-- =====================================================================
-- Sprint "Altas y Bajas" (PRO-TI-001) · Migración 028
-- Agrega el valor 'procedimiento' al enum ticket_tipo.
--
-- Va en su propio archivo a propósito: Postgres no permite USAR un valor
-- de enum recién agregado dentro de la misma transacción en que se creó,
-- y la CLI de Supabase ejecuta cada archivo de migración en una transacción.
-- =====================================================================

alter type public.ticket_tipo add value if not exists 'procedimiento';

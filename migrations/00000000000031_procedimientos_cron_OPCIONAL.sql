-- =====================================================================
-- Sprint "Altas y Bajas" (PRO-TI-001) · Migración 031 (OPCIONAL)
-- Ejecuta a diario la generación de tickets de seguimiento vencidos.
--
-- pg_cron NO está habilitado hoy en el proyecto: esta migración lo activa.
-- Horario: 11:00 UTC = 08:00 en Asunción (UTC-3), de lunes a domingo.
-- Si preferís no usar pg_cron, simplemente no ejecutes este archivo:
-- un admin puede generar los seguimientos desde la app (Altas y bajas →
-- "Generar vencidos ahora").
-- =====================================================================

create extension if not exists pg_cron;

-- cron.schedule con nombre actualiza el job si ya existe (idempotente).
select cron.schedule(
  'jcg-seguimientos-pro-ti-001',
  '0 11 * * *',
  $$ select public.generar_seguimientos_vencidos(); $$
);

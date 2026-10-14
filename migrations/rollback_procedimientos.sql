-- =====================================================================
-- REVERSIÓN del sprint "Altas y Bajas" (PRO-TI-001)
-- NO es una migración numerada: se ejecuta a mano en el SQL Editor
-- solo si hay que deshacer el sprint. BORRA los datos de checklist.
--
-- Limitación de Postgres: un valor de enum no se puede eliminar, así que
-- 'procedimiento' queda en ticket_tipo (sin uso). Los tickets que ya se
-- crearon como 'procedimiento' se pasan a 'soporte' para no perderlos.
-- Los archivos del bucket ticket-evidencias se borran desde el panel de
-- Storage antes de correr esto (Supabase no permite borrar un bucket con objetos).
-- =====================================================================
begin;

-- SQL dinámico: si pg_cron no está instalado, el esquema cron no existe.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $q$select cron.unschedule(jobid) from cron.job where jobname = 'jcg-seguimientos-pro-ti-001'$q$;
  end if;
end;
$$;

drop trigger if exists trg_procedimiento_cierre on public.tickets;

drop policy if exists ver_evidencias_bucket_con_acceso      on storage.objects;
drop policy if exists subir_evidencias_bucket_con_acceso    on storage.objects;
drop policy if exists eliminar_evidencias_bucket_con_acceso on storage.objects;
-- Las versiones recientes de Supabase bloquean borrar directamente en las
-- tablas de storage; en ese caso se avisa y el bucket se elimina desde el panel.
do $$
begin
  delete from storage.buckets where id = 'ticket-evidencias';
exception when others then
  raise notice 'No se pudo borrar el bucket por SQL (%). Eliminalo desde Storage en el panel.', sqlerrm;
end;
$$;

drop table if exists public.seguimientos_programados;
drop table if exists public.ticket_checklist_items;
drop table if exists public.ticket_procedimientos;
drop table if exists public.checklist_plantilla_items;
drop table if exists public.checklist_plantillas;

drop function if exists public.generar_seguimientos_vencidos();
drop function if exists public.validar_y_aplicar_cierre_procedimiento();
drop function if exists public.proteger_ticket_procedimiento();
drop function if exists public.proteger_item_checklist();
drop function if exists public.crear_ticket_procedimiento(
  uuid, public.procedimiento_tipo, text, text, boolean, boolean, timestamptz, text, text,
  text, text, uuid, public.destino_equipo, int, uuid[]);
drop function if exists public.procedimiento_legible(public.procedimiento_tipo);

drop type if exists public.destino_equipo;
drop type if exists public.checklist_item_estado;
drop type if exists public.procedimiento_tipo;

update public.tickets set tipo = 'soporte' where tipo = 'procedimiento';

commit;

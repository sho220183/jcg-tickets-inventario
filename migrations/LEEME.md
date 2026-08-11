# Fix — RLS bloqueaba los triggers de notificaciones

## Síntoma
Al asignar un técnico a un ticket (o al cambiar el estado):
  "new row violates row-level security policy for table notificaciones"

## Causa
Los triggers que encolan notificaciones corren con los permisos del
usuario que hizo la acción. La tabla `notificaciones` tiene RLS activado
pero solo tenía policy de SELECT para admin — ninguna de INSERT. El
trigger intentaba insertar y RLS lo bloqueaba, lo que hacía fallar toda
la operación (no solo la notificación).

## Solución
Un solo archivo SQL: marca ambas funciones de trigger como
SECURITY DEFINER, para que inserten con privilegios propios sin
depender de las policies del usuario que disparó la acción — mismo
patrón que ya usa handle_new_user() desde el sprint 1.

## Cómo aplicar
Corré en el SQL Editor de Supabase:
  → 00000000000017_fix_rls_notificaciones.sql

No requiere cambios en el frontend. No hay que hacer redeploy en Netlify.

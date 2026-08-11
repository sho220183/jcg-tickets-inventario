-- =========================================
-- Migración 020: Permite al admin reintentar notificaciones
-- Hasta ahora solo los triggers (que corren con SECURITY DEFINER, sin
-- pasar por RLS) podían insertar en "notificaciones". Para poder
-- reintentar una que falló desde la nueva pantalla de Notificaciones,
-- el admin también necesita poder insertar directamente.
-- =========================================

create policy "admin_reintenta_notificaciones" on notificaciones
  for insert with check (auth_rol() = 'admin');

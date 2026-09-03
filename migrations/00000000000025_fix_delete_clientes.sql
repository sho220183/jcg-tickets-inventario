-- =========================================
-- Migración 025: Fix — el botón "Eliminar" de Clientes no funcionaba
--
-- Síntoma: un admin hacía clic en "Eliminar" sobre un cliente sin
-- tickets ni inventario asociado, y la fila nunca desaparecía (o
-- Supabase devolvía un error de política de seguridad), a pesar de que
-- el frontend (src/pages/Clientes.jsx) sí llama a
-- supabase.from('clientes').delete().
--
-- Causa: la migración 013 (rls_policies.sql) le dio a la tabla
-- "clientes" políticas de SELECT, INSERT y UPDATE para el admin, pero
-- nunca de DELETE. Con RLS activado, cualquier operación sin una
-- política que la permita explícitamente queda bloqueada — así que el
-- borrado nunca pasaba, sin importar el rol de quien lo intentara.
--
-- Solución: agregar la política de DELETE que faltaba, con el mismo
-- criterio (solo admin) que ya usan las de insert/update.
-- =========================================

create policy "admin_elimina_clientes" on clientes
  for delete using (auth_rol() = 'admin');

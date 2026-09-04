-- =========================================
-- Migración 027: Portal de clientes (solo consulta)
-- =========================================
-- Primera versión, acordada con el cliente: el portal es de solo lectura.
-- El cliente entra con su propio usuario de Supabase Auth, vinculado a su
-- fila de "clientes" mediante portal_user_id (columna reservada desde la
-- migración 003, hasta ahora sin usar). El acceso a cada cliente lo crea
-- un admin desde el dashboard de Supabase (Authentication → Users), y
-- después vincula ese usuario con "update clientes set portal_user_id = ...".
--
-- Alcance deliberadamente acotado (decisión del cliente, 2026-09):
--   - Ve sus propios tickets: código, título, categoría, tipo, prioridad,
--     estado y fechas.
--   - NO ve notas internas (ticket_eventos), fotos (ticket_fotos), técnico
--     asignado (ticket_tecnicos) ni presupuesto de reparación
--     (equipos_reparacion) — no se agregan policies para esas tablas, así
--     que quedan bloqueadas por RLS por defecto para este usuario.
--   - No puede crear ni editar tickets desde el portal (solo policies de
--     SELECT).
-- Cualquier ampliación de este alcance (fotos, comentarios, aprobar
-- presupuesto) es un cambio de funcionalidad nuevo y debe consultarse.

comment on column clientes.portal_user_id is
  'Usuario de Supabase Auth con el que el cliente entra al portal de autoconsulta (solo lectura). Lo vincula un admin manualmente.';

-- ---------- clientes: el cliente ve su propia ficha ----------
create policy "cliente_ve_su_propio_registro" on clientes
  for select using (portal_user_id = auth.uid());

-- ---------- tickets: el cliente ve sus propios tickets ----------
create policy "cliente_ve_sus_tickets" on tickets
  for select using (
    cliente_id in (select id from clientes where portal_user_id = auth.uid())
  );

-- Nota: a diferencia de tecnico_tiene_acceso_ticket(), acá no se creó una
-- función helper porque hoy solo una tabla (tickets) necesita este chequeo.
-- Si en el futuro el portal suma más tablas (por ejemplo fotos), conviene
-- extraer esto a una función cliente_tiene_acceso_ticket(ticket_id) igual
-- que se hizo para los técnicos, para no repetir el subquery.

-- =========================================
-- Datos de prueba (solo para desarrollo local, NO correr en producción)
-- =========================================

insert into clientes (nombre, contacto_nombre, telefono, email) values
  ('Farmacia San Roque', 'Marta Duarte', '0981123456', 'marta@farmaciasanroque.com.py'),
  ('Ferretería Central', 'Luis Gómez', '0982654321', 'luis@ferreteriacentral.com.py');

insert into grupos_trabajo (nombre, descripcion) values
  ('Equipo Redes', 'Encargado de soporte de red y conectividad'),
  ('Equipo CCTV', 'Instalaciones y soporte de cámaras');

-- Nota: los insert de profiles dependen de usuarios reales creados en
-- Supabase Auth (no se pueden precargar acá porque requieren auth.users).
-- Crear los técnicos/admin desde el dashboard de Supabase Auth primero,
-- y luego actualizar su rol manualmente:
--   update profiles set rol = 'admin' where id = '<uuid-del-usuario>';

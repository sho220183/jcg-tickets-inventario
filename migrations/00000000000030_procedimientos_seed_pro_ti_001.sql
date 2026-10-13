-- =====================================================================
-- Sprint "Altas y Bajas" (PRO-TI-001) · Migración 030
-- Carga PRO-TI-001 v1.0 como plantillas activas.
--
-- critico = true  → para cerrar el ticket exige evidencia (archivo o dato)
-- solo_ad = true  → en clientes sin dominio nace como "No aplica"
--
-- Ajustes respecto del documento aprobado (ver LEEME.md, sección 6):
--   * BitLocker, Defender y "usuario no admin local" NO se marcan solo_ad:
--     también aplican en clientes sin dominio.
--   * Los pasos que ahora hace el sistema solo (inventario a "Asignado"/
--     "Dado de baja", agendar la eliminación definitiva) se reemplazaron
--     por el ítem de confirmación correspondiente.
-- =====================================================================

do $$
declare
  p uuid;
begin
  ---------------------------------------------------------------------
  -- ALTA DE EQUIPO (sección 3)
  ---------------------------------------------------------------------
  insert into checklist_plantillas (codigo, version, tipo, titulo, activa)
  values ('PRO-TI-001', '1.0', 'alta_equipo', 'Alta de equipo', true)
  returning id into p;

  insert into checklist_plantilla_items (plantilla_id, seccion, orden, texto, critico, solo_ad) values
  (p, '3.1 Recepción e inventario', 1,  'Verificar estado físico, accesorios y garantía; fotografiar la etiqueta de serie', true,  false),
  (p, '3.1 Recepción e inventario', 2,  'Vincular el equipo al ítem de inventario (serie, modelo, cliente, ubicación, usuario)', false, false),
  (p, '3.1 Recepción e inventario', 3,  'Asignar nombre de equipo según la nomenclatura del Anexo A', false, false),
  (p, '3.1 Recepción e inventario', 4,  'Actualizar BIOS/UEFI; activar Secure Boot y TPM 2.0; poner contraseña de BIOS', false, false),
  (p, '3.2 Sistema operativo',      5,  'Instalar o restaurar Windows 11 Pro/Enterprise con imagen limpia', false, false),
  (p, '3.2 Sistema operativo',      6,  'Instalar drivers del fabricante (Dell Command Update, Lenovo System Update o HP Support Assistant)', false, false),
  (p, '3.2 Sistema operativo',      7,  'Aplicar todas las actualizaciones de Windows hasta que no queden pendientes', false, false),
  (p, '3.2 Sistema operativo',      8,  'Verificar la activación de Windows', false, false),
  (p, '3.3 Dominio y seguridad',    9,  'Unir al dominio y mover el objeto de equipo a la OU correcta', true,  true),
  (p, '3.3 Dominio y seguridad',    10, 'Ejecutar gpupdate /force y validar con gpresult /r las GPO esperadas', false, true),
  (p, '3.3 Dominio y seguridad',    11, 'Confirmar Windows LAPS: la contraseña del admin local aparece en AD', true,  true),
  (p, '3.3 Dominio y seguridad',    12, 'Activar BitLocker y verificar la clave de recuperación respaldada (AD o ubicación acordada con el cliente)', true,  false),
  (p, '3.3 Dominio y seguridad',    13, 'Confirmar Microsoft Defender activo y actualizado', false, false),
  (p, '3.3 Dominio y seguridad',    14, 'Verificar que el usuario final no es administrador local', true,  false),
  (p, '3.4 Software base',          15, 'Runtimes: Visual C++ 2015-2022 (x64 y x86) y .NET Desktop Runtime LTS', false, false),
  (p, '3.4 Software base',          16, 'Microsoft 365 Apps (Office Deployment Tool) o la suite que use el cliente', false, false),
  (p, '3.4 Software base',          17, 'Navegador corporativo (Edge y/o Chrome Enterprise) con políticas aplicadas', false, false),
  (p, '3.4 Software base',          18, 'Lector PDF, 7-Zip y reproductor multimedia (VLC)', false, false),
  (p, '3.4 Software base',          19, 'Aplicaciones de comunicación del cliente (Teams, Zoom)', false, false),
  (p, '3.4 Software base',          20, 'Software de línea de negocio del cliente (ERP, contable, etc.)', false, false),
  (p, '3.4 Software base',          21, 'Herramienta de soporte remoto autorizada', false, false),
  (p, '3.4 Software base',          22, 'Agente Zabbix 2 instalado y equipo visible en el monitoreo', true,  false),
  (p, '3.5 Verificación y entrega', 23, 'Probar red cableada y Wi-Fi, impresión y acceso a recursos compartidos', false, false),
  (p, '3.5 Verificación y entrega', 24, 'Limpiar perfiles temporales usados durante la preparación', false, false),
  (p, '3.5 Verificación y entrega', 25, 'Registrar serie, nombre de equipo, OU y capturas de BitLocker y Zabbix', true,  false),
  (p, '3.5 Verificación y entrega', 26, 'Entregar con acta firmada (Anexo C); el inventario pasa a "Asignado" al cerrar el ticket', true,  false);

  ---------------------------------------------------------------------
  -- ALTA DE USUARIO (sección 4)
  ---------------------------------------------------------------------
  insert into checklist_plantillas (codigo, version, tipo, titulo, activa)
  values ('PRO-TI-001', '1.0', 'alta_usuario', 'Alta de usuario', true)
  returning id into p;

  insert into checklist_plantilla_items (plantilla_id, seccion, orden, texto, critico, solo_ad) values
  (p, '4.1 Validación',                1,  'Formulario completo y firmado por el autorizante del cliente', true,  false),
  (p, '4.1 Validación',                2,  'Verificar que no exista ya una cuenta para la misma persona', false, false),
  (p, '4.1 Validación',                3,  'Definir nombre de usuario y correo según la nomenclatura del Anexo A', false, false),
  (p, '4.2 Cuenta e identidad',        4,  'Crear la cuenta en la OU del área con nombre, cargo, departamento, jefe y teléfono', true,  true),
  (p, '4.2 Cuenta e identidad',        5,  'Contraseña temporal robusta y "cambiar en el próximo inicio de sesión"', false, false),
  (p, '4.2 Cuenta e identidad',        6,  'Agregar a los grupos de seguridad del rol (nunca permisos directos sobre carpetas)', true,  true),
  (p, '4.2 Cuenta e identidad',        7,  'Asignar licencia de Microsoft 365 / correo y verificar el buzón creado', false, false),
  (p, '4.2 Cuenta e identidad',        8,  'Activar MFA (Microsoft Authenticator) con el usuario presente', true,  false),
  (p, '4.2 Cuenta e identidad',        9,  'Si es personal temporal: configurar fecha de vencimiento de la cuenta', false, false),
  (p, '4.3 Accesos de aplicaciones',   10, 'Unidades mapeadas y carpetas compartidas según grupo', false, false),
  (p, '4.3 Accesos de aplicaciones',   11, 'Impresoras del área', false, false),
  (p, '4.3 Accesos de aplicaciones',   12, 'Usuarios en aplicaciones de negocio (ERP, contable, sistemas propios)', false, false),
  (p, '4.3 Accesos de aplicaciones',   13, 'VPN, Wi-Fi corporativo y control de acceso físico, si el formulario lo indica', false, false),
  (p, '4.4 Primer inicio de sesión',   14, 'Iniciar sesión en el equipo asignado y forzar el cambio de contraseña', false, false),
  (p, '4.4 Primer inicio de sesión',   15, 'Verificar OneDrive con Known Folder Move activo y sincronizando', false, false),
  (p, '4.4 Primer inicio de sesión',   16, 'Perfil de Outlook configurado y firma corporativa aplicada', false, false),
  (p, '4.4 Primer inicio de sesión',   17, 'Confirmar unidades, impresoras y aplicaciones funcionando', false, false),
  (p, '4.5 Cierre',                    18, 'Entregar la política de uso aceptable y obtener la firma del usuario', true,  false),
  (p, '4.5 Cierre',                    19, 'Inducción breve: cómo pedir soporte, reconocer phishing y dónde guardar archivos', false, false),
  (p, '4.5 Cierre',                    20, 'Registrar la lista de grupos asignados y la conformidad firmada', true,  false);

  ---------------------------------------------------------------------
  -- BAJA DE USUARIO (sección 5)
  ---------------------------------------------------------------------
  insert into checklist_plantillas (codigo, version, tipo, titulo, activa)
  values ('PRO-TI-001', '1.0', 'baja_usuario', 'Baja de usuario', true)
  returning id into p;

  insert into checklist_plantilla_items (plantilla_id, seccion, orden, texto, critico, solo_ad) values
  (p, '5.1 Validación',             1,  'Solicitud firmada por RR.HH. o el autorizante, con fecha y hora efectiva', true,  false),
  (p, '5.1 Validación',             2,  'Definir con el cliente quién recibe correo, OneDrive y archivos, y por cuánto tiempo', false, false),
  (p, '5.2 Corte de accesos',       3,  'Deshabilitar la cuenta en AD y restablecer la contraseña a una aleatoria', true,  true),
  (p, '5.2 Corte de accesos',       4,  'Revocar sesiones activas de Microsoft 365 y bloquear el inicio de sesión', true,  false),
  (p, '5.2 Corte de accesos',       5,  'Eliminar métodos de MFA y dispositivos móviles registrados (borrado corporativo si hay MDM)', false, false),
  (p, '5.2 Corte de accesos',       6,  'Deshabilitar VPN, Wi-Fi con certificado, control de acceso físico y tarjetas', true,  false),
  (p, '5.2 Corte de accesos',       7,  'Desactivar usuarios en aplicaciones de negocio (ERP, contable, sistemas propios)', false, false),
  (p, '5.2 Corte de accesos',       8,  'Cambiar contraseñas compartidas que la persona conocía', true,  false),
  (p, '5.3 Preservación de datos',  9,  'Convertir el buzón en compartido o delegarlo al responsable designado', false, false),
  (p, '5.3 Preservación de datos',  10, 'Configurar respuesta automática o reenvío según indique el cliente', false, false),
  (p, '5.3 Preservación de datos',  11, 'Transferir o respaldar OneDrive y carpetas personales al responsable designado', true,  false),
  (p, '5.3 Preservación de datos',  12, 'Liberar la licencia de Microsoft 365 una vez convertido el buzón', false, false),
  (p, '5.4 Limpieza en AD',         13, 'Quitar la cuenta de todos los grupos (registrar antes la lista en la evidencia)', true,  true),
  (p, '5.4 Limpieza en AD',         14, 'Mover la cuenta a la OU "Usuarios deshabilitados" con fecha, ticket y técnico en la descripción', false, true),
  (p, '5.4 Limpieza en AD',         15, 'Confirmar con el cliente los días de retención (el seguimiento se agenda solo al cerrar)', false, false),
  (p, '5.5 Cierre',                 16, 'Recibir equipos asignados (laptop, celular, tokens, tarjetas) y abrir la baja de equipo si corresponde', true,  false),
  (p, '5.5 Cierre',                 17, 'Adjuntar evidencia de cada corte y la firma de recepción de activos', true,  false);

  ---------------------------------------------------------------------
  -- BAJA DE EQUIPO (sección 6)
  ---------------------------------------------------------------------
  insert into checklist_plantillas (codigo, version, tipo, titulo, activa)
  values ('PRO-TI-001', '1.0', 'baja_equipo', 'Baja de equipo', true)
  returning id into p;

  insert into checklist_plantilla_items (plantilla_id, seccion, orden, texto, critico, solo_ad) values
  (p, '6.1 Respaldo',             1,  'Confirmar que la baja del usuario anterior está hecha o que sus datos ya fueron transferidos', true,  false),
  (p, '6.1 Respaldo',             2,  'Verificar que OneDrive terminó de sincronizar y respaldar datos locales fuera de él', false, false),
  (p, '6.1 Respaldo',             3,  'Obtener confirmación escrita del cliente de que no queda nada por recuperar', true,  false),
  (p, '6.2 Retiro de sistemas',   4,  'Desinstalar o liberar licencias por equipo (antivirus, ERP, soporte remoto)', false, false),
  (p, '6.2 Retiro de sistemas',   5,  'Quitar el equipo del monitoreo de Zabbix y de la consola de soporte remoto', false, false),
  (p, '6.2 Retiro de sistemas',   6,  'Quitar el equipo de Intune/MDM si aplica', false, false),
  (p, '6.2 Retiro de sistemas',   7,  'Deshabilitar el objeto de equipo en AD y moverlo a la OU "Equipos de baja"', false, true),
  (p, '6.2 Retiro de sistemas',   8,  'Liberar la reserva DHCP o IP fija y las reglas de firewall asociadas', false, false),
  (p, '6.3 Borrado de datos',     9,  'Ejecutar el borrado que exige el destino y registrar herramienta, fecha y resultado', true,  false),
  (p, '6.3 Borrado de datos',     10, 'Retirar contraseña de BIOS y etiquetas de activo si el equipo sale del cliente', false, false),
  (p, '6.4 Cierre',               11, 'Emitir certificado de borrado y acta de entrega o destrucción firmada (Anexo C)', true,  false);
end;
$$;

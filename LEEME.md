# Fix — Email en técnicos + notificaciones por Email y WhatsApp

## 1. Base de datos
Corré en el SQL Editor de Supabase:
  → migrations/00000000000016_notificaciones_multicanal.sql

Qué hace:
- Agrega `email` a `profiles`, tomado automáticamente de la cuenta de login
  (se completa solo para los técnicos ya existentes, y para los nuevos vía
  el trigger de alta).
- Agrega `notificar_email` y `notificar_whatsapp` (booleanos) tanto a
  `profiles` como a `clientes`.
- Reemplaza la tabla `notificaciones_email` (que solo cubría email→cliente)
  por una tabla `notificaciones` generalizada: cubre email y WhatsApp,
  tanto para clientes como para técnicos.
- Nuevo trigger: cuando cambia el estado de un ticket, encola notificación
  al cliente por cada canal que tenga habilitado.
- Nuevo trigger: cuando se asigna un técnico a un ticket (ticket_tecnicos),
  encola notificación a ese técnico por cada canal que tenga habilitado.

## 2. Frontend — archivos a reemplazar en tu repo
  src/pages/Tecnicos.jsx   → muestra el email (solo lectura, viene de la
                               cuenta) y agrega checkboxes "Notificar por
                               Email / WhatsApp"
  src/pages/Clientes.jsx   → agrega los mismos checkboxes de notificación

## 3. Importante: el envío real todavía no está conectado
Esta migración arma la COLA de notificaciones (tabla `notificaciones`,
con estado pendiente/enviado/error) tanto para email como WhatsApp, y las
pantallas ya permiten elegir el canal preferido. Pero el envío real
requiere:

- Email: una Edge Function + servicio como Resend (ya lo habíamos
  conversado en sprints anteriores).
- WhatsApp: una Edge Function + la API de WhatsApp Business (por ejemplo
  vía Twilio o Meta Cloud API), que requiere una cuenta de WhatsApp
  Business verificada — esto lleva más papeleo que el email, conviene
  planearlo aparte.

Ambos quedan como tarea del próximo sprint dedicado a notificaciones.

## 4. Deploy
git add . && git commit -m "Fix: email en técnicos + notificaciones multicanal" && git push

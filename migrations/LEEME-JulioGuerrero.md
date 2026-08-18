# Fix — Mensajes de notificación más naturales

## No requiere cambios en el frontend, solo base de datos

Corré en el SQL Editor de Supabase:
  → 00000000000021_mensajes_notificacion_legibles.sql

## Qué cambia
Antes:
  "Tu ticket JCG-0002 cambió de estado a: en_progreso"

Ahora:
  "Hola María, tu ticket JCG-0002 cambió de estado a: En progreso."

- Los 5 estados ahora se traducen a texto natural (Nuevo, En progreso,
  Esperando al cliente, Resuelto, Cerrado) tanto para email como
  WhatsApp.
- El saludo usa el nombre de la persona de contacto del cliente si está
  cargado; si no, usa el nombre del cliente/razón social.
- Lo mismo se aplica al mensaje que reciben los técnicos cuando se les
  asigna un ticket: ahora empieza con "Hola [nombre del técnico],".

## No hace falta recargar la Edge Function
Este cambio vive en los triggers de la base de datos (los que arman el
texto del mensaje), no en la función send-notification — así que no
hace falta ningún npx supabase functions deploy, ni tocar Resend.

## Cómo probar
Cambiá el estado de un ticket de prueba de nuevo y mirá el email que
llega — debería verse con el saludo y el estado en español natural.

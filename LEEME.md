# Sprint 8 — Notificaciones reales por Email (WhatsApp queda para después)

Esto tiene más pasos que los sprints anteriores porque, por primera vez,
tocamos infraestructura fuera de la base de datos: una Edge Function
(código que corre en los servidores de Supabase) y un servicio externo de
envío de emails (Resend).

## Resumen del flujo
1. Cambia el estado de un ticket (o se asigna un técnico) → un trigger de
   la base (ya lo tenías desde el sprint 5) encola una fila en
   `notificaciones` con estado "pendiente".
2. Un **Database Webhook** de Supabase detecta esa fila nueva y llama a
   la **Edge Function** `send-notification`.
3. La función llama a la API de **Resend** para mandar el email de
   verdad, y actualiza la fila a "enviado" o "error".
4. Vos podés ver toda la cola (y reintentar los que fallaron) desde la
   nueva pantalla **Notificaciones** en el menú (solo admin).

## Paso 1 — Base de datos
Corré en el SQL Editor de Supabase:
  → migrations/00000000000020_admin_reintenta_notificaciones.sql

(Un solo permiso nuevo: que el admin pueda reintentar notificaciones
fallidas desde la pantalla.)

## Paso 2 — Cuenta de Resend
1. Creá una cuenta gratis en https://resend.com (el plan free alcanza
   perfectamente para el volumen de JCG Infotech).
2. Generá una **API Key** desde el dashboard de Resend (API Keys → Create).
3. Para arrancar SIN verificar un dominio propio, podés usar el remitente
   de pruebas `onboarding@resend.dev` — ya viene configurado por defecto
   en la función. Ojo: con este remitente de pruebas, Resend solo entrega
   a la casilla con la que te registraste en Resend, así que para mandar
   a clientes reales vas a necesitar verificar tu propio dominio
   (ej. notificaciones@jcginfotech.net.py) más adelante — es gratis, solo
   hay que agregar unos registros DNS. Instrucciones en:
   https://resend.com/docs/dashboard/domains/introduction

## Paso 3 — Desplegar la Edge Function
Necesitás la Supabase CLI (si no la instalaste en un paso anterior):

```bash
npm install -g supabase

# Desde la raíz de tu repo (donde ya está la carpeta supabase/):
supabase login
supabase link --project-ref <tu-project-ref>

# Configurá el secreto de Resend (y opcionalmente el remitente)
supabase secrets set RESEND_API_KEY=re_tu_api_key_aca
supabase secrets set RESEND_FROM_EMAIL="JCG Infotech <onboarding@resend.dev>"

# Desplegá la función
supabase functions deploy send-notification
```

No hace falta configurar `SUPABASE_URL` ni `SUPABASE_SERVICE_ROLE_KEY` —
Supabase se los inyecta automáticamente a la función.

## Paso 4 — Conectar el Database Webhook
Esto es lo que hace que la función se dispare sola cuando se encola una
notificación. Se configura desde el dashboard (más simple que por SQL):

1. Dashboard de Supabase → **Database → Webhooks → Create a new hook**
2. Nombre: `notificar-nueva-notificacion` (o el que prefieras)
3. Tabla: `notificaciones`
4. Eventos: marcá solo **Insert**
5. Tipo: **Supabase Edge Functions**
6. Función: `send-notification`
7. Guardar

## Paso 5 — Frontend
Reemplazá en tu repo:
  src/App.jsx
  src/components/Layout.jsx
Y agregá:
  src/pages/Notificaciones.jsx
  supabase/functions/send-notification/index.ts   (ya lo copiaste en el Paso 3)

## Paso 6 — Probar
1. `git add . && git commit -m "Sprint 8: notificaciones reales por email" && git push`
2. Cambiá el estado de un ticket de un cliente que tenga email cargado y
   "Notificar por Email" activado.
3. Entrá a la pantalla **Notificaciones** del sistema — la fila debería
   pasar de "pendiente" a "enviado" en pocos segundos.
4. Si usás el remitente de pruebas de Resend, revisá la casilla con la
   que te registraste en Resend (no la del cliente).

## Sobre WhatsApp
La función ya reconoce el canal "whatsapp" pero lo deja en "pendiente" a
propósito — no se pierde el registro de que había que avisar por ahí,
simplemente no lo envía todavía. Conectarlo requiere una cuenta de
WhatsApp Business verificada (vía Twilio o Meta Cloud API), que lleva más
trámite que Resend. Cuando quieras encararlo, ya tenemos toda la cola y
las preferencias de cliente/técnico resueltas — solo falta esa pieza.

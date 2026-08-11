<<<<<<< HEAD
# Sprint 9 — Módulo de Reparaciones (taller)

## Cómo está pensado
No se creó un sistema paralelo. Un ticket de reparación sigue siendo un
ticket normal por dentro — mismo historial, técnicos asignados,
notificaciones al cliente, inventario para repuestos, y el bloqueo
automático al cerrarse. Lo único nuevo es:

1. Un campo "tipo" en tickets (soporte | reparacion) que separa los
   menús sin duplicar tablas.
2. Una tabla "equipos_reparacion", enganchada 1 a 1 con el ticket, con
   los datos propios de un equipo recibido: tipo, marca, modelo, N° de
   serie, accesorios entregados, estado al recibir, presupuesto
   estimado/aprobado, fecha estimada de entrega, y garantía.

Los mismos 5 estados de siempre (nuevo → en_progreso → esperando_cliente
→ resuelto → cerrado) ahora se muestran con otro texto cuando el ticket
es de reparación:
  Recibido → En diagnóstico/reparación → Esperando aprobación de
  presupuesto → Reparado, listo para retirar → Entregado

## 1. Base de datos
Corré en el SQL Editor de Supabase:
  → migrations/00000000000022_modulo_reparaciones.sql

Qué hace, en resumen:
- Agrega el tipo de ticket y la tabla equipos_reparacion, con RLS
  espejando el acceso del ticket asociado (mismo criterio admin/técnico
  con acceso que ya usás en todos lados).
- Reutiliza el trigger de "ticket cerrado = bloqueado" que ya tenías,
  aplicado también a la ficha del equipo.
- Agrega un trigger que completa fecha_entrega_real SOLO cuando el
  ticket pasa a "cerrado" (Entregado) — no hay que cargarla a mano.
- Actualiza el mensaje de notificación al cliente para que diga
  "Recibido"/"Reparado, listo para retirar"/etc. en vez de los estados
  de soporte, cuando corresponde a una reparación.

## 2. Frontend — archivo nuevo
  src/pages/Reparaciones.jsx    → listado + formulario de "Recibir equipo"
  src/lib/estados.js            → helper compartido de etiquetas de estado

## 3. Frontend — archivos a reemplazar en tu repo
  src/pages/TicketDetail.jsx    → agrega la "Ficha del equipo" cuando el
                                    ticket es de reparación (editable,
                                    con el mismo bloqueo que el resto si
                                    el ticket está cerrado)
  src/pages/Tickets.jsx         → ahora solo muestra tickets de soporte
                                    (los de reparación quedan en su
                                    propio menú)
  src/App.jsx                   → ruta /reparaciones
  src/components/Layout.jsx     → "Reparaciones" en el menú (visible
                                    para todo el staff, no solo admin)

## 4. Cómo se usa
1. Menú → Reparaciones → "+ Recibir equipo"
2. Cargás cliente, problema reportado, y los datos del equipo (tipo,
   marca, modelo, N° de serie, accesorios, estado al recibir, y
   opcionalmente presupuesto estimado / fecha de entrega / garantía)
3. Se crea un ticket igual que cualquier otro — podés asignarle
   técnicos, agregar notas, y vincular repuestos usados desde el mismo
   bloque "Inventario utilizado" que ya conocés
4. Cuando el cliente aprueba o rechaza el presupuesto, lo marcás en la
   ficha del equipo (editable desde el detalle)
5. Al pasar el ticket a "Entregado" (cerrado), la fecha de entrega real
   se completa sola y queda como referencia para calcular la garantía

## 5. Deploy
git add . && git commit -m "Sprint 9: módulo de Reparaciones" && git push
=======
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
>>>>>>> 74f222197bef9a6243873008c2ebd87d10ac0cc4

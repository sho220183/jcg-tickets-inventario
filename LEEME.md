# Fix — Bloqueo de tickets cerrados

## Contexto
Se detectaron 2 puntos a corregir:
1. Las notificaciones de cambio de estado (ej. "esperando_cliente")
   quedan ENCOLADAS pero todavía no se envían de verdad — falta la
   Edge Function de email/WhatsApp (pendiente, sprint aparte). Esto no
   se corrige acá, solo se documenta.
2. Un ticket "cerrado" seguía totalmente editable: se podía devolver
   stock, agregar notas, reasignar técnicos. Esto SÍ se corrige en este
   fix, con bloqueo total salvo reabrir el estado.

## 1. Base de datos
Corré en el SQL Editor de Supabase:
  → migrations/00000000000019_bloqueo_ticket_cerrado.sql

Qué hace:
- Agrega triggers BEFORE INSERT/UPDATE/DELETE en ticket_eventos,
  ticket_tecnicos, ticket_inventario e inventario_movimientos.
- Cada uno chequea el estado del ticket relacionado: si está "cerrado",
  RECHAZA la operación con el mensaje "Este ticket está cerrado.
  Reabrilo (cambiando su estado) antes de modificarlo."
- El cambio de ESTADO del ticket en sí (tabla tickets) NO está
  bloqueado — es el mecanismo para reabrirlo.
- Esto protege a nivel de base de datos, no solo en la pantalla: aunque
  alguien intente modificar por fuera de la interfaz, la base lo va a
  rechazar igual.

## 2. Frontend
Reemplazá src/pages/TicketDetail.jsx en tu repo por el de este zip.

Qué cambia visualmente:
- Si el ticket está cerrado, aparece un aviso: "Este ticket está
  cerrado. El inventario, las notas y los técnicos asignados quedaron
  congelados. Para volver a editarlo, cambiá el estado arriba."
- Se ocultan los formularios y botones de: agregar/quitar técnicos,
  marcar responsable principal, agregar/quitar inventario, agregar
  notas.
- El selector de estado (arriba a la derecha) sigue siempre visible y
  habilitado — es la única forma de "reabrir" el ticket.

## 3. Deploy
git add . && git commit -m "Fix: bloquear edición de tickets cerrados" && git push

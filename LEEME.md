# Sprint 6 — Vínculo de inventario a tickets

## 1. Base de datos
Corré en el SQL Editor de Supabase:
  → migrations/00000000000018_vinculo_inventario_tickets.sql

Qué hace:
- Agrega la policy de DELETE que faltaba en `ticket_inventario` (sin
  esto, no se podía "quitar" un ítem ya vinculado a un ticket).
- Endurece el trigger que descuenta stock: si se intenta usar más
  cantidad de la que hay disponible, ahora RECHAZA la operación con un
  mensaje claro ("Stock insuficiente: hay X unidades y se pidieron Y"),
  en vez de dejar el stock en negativo silenciosamente.

## 2. Frontend
Reemplazá src/pages/TicketDetail.jsx en tu repo por el de este zip.

## 3. Cómo funciona la nueva sección
Dentro del detalle de cada ticket aparece un bloque colapsable
"Inventario utilizado" — cerrado por defecto, tal como pediste, para
que los tickets que se resuelven solo con asistencia/conocimiento no
tengan que interactuar con esto.

Al abrirlo:
- Se ve qué ítems ya están vinculados a este ticket, con su cantidad.
- Se puede agregar un ítem nuevo: el dropdown solo muestra ítems con
  stock disponible (los que están en 0 aparecen deshabilitados) y
  excluye los que ya están vinculados a este ticket.
- Al confirmar "Usar en este ticket": se descuenta el stock general
  automáticamente (vía el trigger que ya existía desde el sprint 1) y
  queda el vínculo directo ticket ↔ ítem.
- "Quitar (devuelve stock)" hace el camino inverso: repone el stock y
  borra el vínculo. Útil si se cargó un ítem por error.

Todo movimiento (uso o devolución) queda también registrado en
`inventario_movimientos`, así que el historial de stock de cada ítem
es trazable incluso sin abrir el ticket.

## 4. Deploy
git add . && git commit -m "Sprint 6: vínculo de inventario a tickets" && git push

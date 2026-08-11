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

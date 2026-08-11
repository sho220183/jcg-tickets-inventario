# Fix de fondo — Cambiar cualquier ticket a "Cerrado"/"Entregado" fallaba

## Síntoma
Al pasar CUALQUIER ticket (soporte o reparación) a su estado final
("Cerrado" / "Entregado"):
  "No se pudo cambiar el estado: Este ticket está cerrado. Reabrilo
  (cambiando su estado) antes de modificarlo."

## Causa real (más de fondo que el fix anterior)
El fix de ayer (migración 023) resolvió el conflicto para el trigger
de fecha de entrega de reparaciones, pero había OTRO trigger con el
mismo problema: el que registra el cambio de estado en el historial
del ticket (ticket_eventos), que existe desde el sprint 1 y aplica a
TODOS los tickets, no solo reparaciones. Por eso el bug persistía en
ambos tipos.

Mecanismo exacto: ese trigger corre DESPUÉS de aplicarse el cambio de
estado (AFTER UPDATE). Cuando el nuevo estado es "cerrado", en el
momento en que intenta anotar el evento en el historial, el ticket YA
figura como cerrado en la base — y el trigger de bloqueo (agregado en
un fix posterior a este trigger viejo) lo frena pensando que es una
edición no autorizada.

## Solución
Mismo approach que ayer: mover el trigger a BEFORE UPDATE, para que
registre el evento mientras el ticket todavía figura con su estado
anterior. El comportamiento de bloqueo real (impedir que alguien EDITE
un ticket ya cerrado) no cambia en nada.

## Cómo aplicar
Corré en el SQL Editor de Supabase:
  → 00000000000024_fix_cambio_estado_general.sql

No requiere cambios en el frontend.

## Cómo probar
Probá cerrar un ticket de soporte normal Y uno de reparación — ambos
deberían cambiar de estado sin error esta vez. Revisá también que el
historial del ticket muestre el evento de cambio de estado
correctamente.

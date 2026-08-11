# Fix — No se podía cerrar (entregar) un ticket de reparación

## Síntoma
Al cambiar el estado a "Entregado" (cerrado):
  "No se pudo cambiar el estado: Este ticket está cerrado. Reabrilo
  (cambiando su estado) antes de modificarlo."

## Causa
Dos triggers que no se habían probado juntos:
1. El que completa fecha_entrega_real cuando el ticket pasa a cerrado
   (sprint 9).
2. El que bloquea ediciones en tickets cerrados (fix anterior).

El primero se disparaba DESPUÉS de que el ticket ya figurara como
cerrado, y el segundo lo interceptaba pensando que era una edición
humana no autorizada.

## Solución
Un solo archivo SQL, sin tocar el frontend. Cambia el trigger de
"AFTER UPDATE" a "BEFORE UPDATE" — con eso, en el momento justo en que
se completa la fecha de entrega, el ticket todavía figura con su estado
anterior, así que pasa el chequeo de bloqueo sin problema. Nada cambia
para el bloqueo real cuando alguien intenta editar un ticket ya cerrado.

## Cómo aplicar
Corré en el SQL Editor de Supabase:
  → 00000000000023_fix_cerrar_reparacion.sql

## Cómo probar
Volvé a intentar lo mismo que te falló: pasá el mismo ticket de
reparación (u otro nuevo) a "Entregado". Debería cambiar sin error, y
la ficha del equipo debería mostrar la fecha de entrega completada
sola.

# Fix — Reponer stock + reporte de uso por ítem

## No requiere cambios en la base de datos
La tabla inventario_movimientos ya soportaba el tipo "entrada" desde el
sprint 1 (y el trigger que ajusta cantidad_stock automáticamente ya lo
sabía sumar). Faltaba únicamente la pantalla para usarlo.

## Qué cambia
Cada ítem del listado de Inventario ahora es expandible (clic en
"Reponer / historial"). Al abrirlo aparecen dos cosas:

1. **Reponer stock** — cantidad + notas opcionales (ej. "compra a
   proveedor XYZ, factura 001-234") → genera un movimiento tipo
   "entrada" y suma directo al stock. Ya no hace falta crear el ítem
   de nuevo cuando llega a cero.

2. **Historial de movimientos (reporte de uso)** — tabla con todos los
   movimientos de ese ítem: fecha, tipo (entrada/salida/asignación/
   devolución/ajuste, con color: verde lo que suma, rojo lo que resta),
   cantidad, a qué ticket quedó vinculado (si aplica), quién lo hizo, y
   las notas. Esto te da trazabilidad completa de cada ítem sin tener
   que ir a mirar cada ticket por separado.

## Cómo aplicar
Reemplazá src/pages/Inventario.jsx en tu repo por el de este zip.

git add . && git commit -m "Fix: reponer stock y reporte de uso por ítem" && git push

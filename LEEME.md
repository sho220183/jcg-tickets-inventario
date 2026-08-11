# Fix — Reparaciones en el Dashboard

## No requiere cambios en la base de datos
Solo un archivo de frontend.

## Qué cambia
El Dashboard ahora muestra DOS filas de conteos separadas, cada una con
sus propias etiquetas de estado:

  Tickets de soporte
    Nuevo · En progreso · Esperando al cliente · Resuelto · Cerrado

  Reparaciones (taller)
    Recibido · En diagnóstico/reparación · Esperando aprobación de
    presupuesto · Reparado, listo para retirar · Entregado

Cada sección tiene su link "Ver todos/todas →" al listado
correspondiente. Las alertas de stock bajo quedan igual que antes,
abajo de todo.

## Cómo aplicar
Reemplazá src/pages/Dashboard.jsx en tu repo por el de este zip.

git add . && git commit -m "Fix: separar reparaciones en el Dashboard" && git push

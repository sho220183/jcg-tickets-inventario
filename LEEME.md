# Sprint — Altas y bajas de usuarios y equipos (PRO-TI-001)

Convierte el procedimiento aprobado PRO-TI-001 en tickets con checklist
obligatorio. El técnico abre un "Alta/baja", el sistema le carga el
checklist de la versión vigente del procedimiento, va tildando y
adjuntando evidencia, y la base **no deja cerrar el ticket** hasta que
todo esté resuelto. Al cerrar, el inventario se actualiza solo y la
eliminación definitiva de la cuenta o del equipo queda agendada.

## Qué incluye
1. **Checklist versionado**: PRO-TI-001 v1.0 cargado con 74 ítems
   (alta de equipo 26, alta de usuario 20, baja de usuario 17, baja de
   equipo 11). Cada ticket guarda su propia copia: si mañana publicás
   una v1.1, los tickets viejos no cambian.
2. **Bloqueo de cierre**: no se puede pasar a "Cerrado" con ítems
   pendientes, con ítems críticos sin evidencia (foto, PDF o un dato
   verificable) ni con una baja de equipo sin destino.
3. **Inventario automático**: al cerrar un alta de equipo, el ítem
   vinculado pasa a "Asignado" al cliente; al cerrar una baja, a
   "Dado de baja".
4. **Seguimiento a N días** (30 por defecto): al cerrar una baja se
   agenda la eliminación definitiva; al vencer se crea un ticket de
   soporte con los mismos técnicos.
5. **Baja inmediata** (despido o riesgo): el ticket nace urgente y se
   avisa por email a todos los admins.

## Paso 1 — Respaldo
Antes de tocar la base, en la terminal del proyecto:

```bash
npx supabase db dump -f respaldo_antes_altas_bajas.sql
```

## Paso 2 — Migraciones (SQL Editor, en orden, una por ejecución)
  → 00000000000028_procedimientos_enum.sql
  → 00000000000029_procedimientos_tablas.sql
  → 00000000000030_procedimientos_seed_pro_ti_001.sql
  → 00000000000031_procedimientos_cron_OPCIONAL.sql  (ver abajo)

La 028 va sola a propósito: Postgres no deja usar un valor nuevo de un
enum en la misma ejecución en que se creó.

**031 es opcional.** Activa pg_cron (hoy no está activado en el
proyecto) para generar los seguimientos vencidos todos los días a las
08:00 de Asunción. Si no la corrés, un admin los genera con el botón
"Generar vencidos ahora" en Altas y bajas.

Para verificar que quedó bien:

```sql
select tipo, version, activa,
       (select count(*) from checklist_plantilla_items i where i.plantilla_id = p.id) as items
from checklist_plantillas p order by tipo;
-- Esperado: alta_equipo 26 · alta_usuario 20 · baja_equipo 11 · baja_usuario 17, todas activas v1.0
```

## Paso 3 — Frontend
Ya está todo en el repo (rama `feature-altas-bajas`):
- `src/pages/AltasBajas.jsx` — listado, filtros, formulario nuevo y
  seguimientos (estos últimos solo para admin). Menú → "Altas y bajas".
- `src/components/procedimientos/ChecklistProcedimiento.jsx` — el
  checklist dentro del detalle del ticket.
- `src/lib/procedimientos.js` — etiquetas, reglas y acceso a datos.
- Cambios chicos: ruta y menú, detalle del ticket (badge, volver,
  checklist, y el error de cierre ahora muestra qué falta), bloque nuevo
  en el Dashboard y la etiqueta "Alta / baja" en el portal de clientes.

## Cómo funciona
1. Menú → Altas y bajas → "+ Nueva alta/baja".
2. Elegís el procedimiento y el cliente, si tiene dominio AD, la
   persona o el equipo, y (si sos admin) los técnicos. Si lo crea un
   técnico, queda asignado a él.
3. En clientes sin AD, los ítems de dominio nacen como "No aplica".
4. En el detalle del ticket se tilda cada ítem. Los críticos piden
   evidencia: un archivo (foto o PDF, bucket privado
   `ticket-evidencias`) o un dato (serie, ID de clave BitLocker, lista
   de grupos…). "No aplica" exige motivo, y en un crítico solo lo
   puede marcar un admin.
5. Al intentar cerrar con algo faltante, el aviso dice exactamente qué.

## Ajustes respecto del documento aprobado
Para no contradecir la seguridad, el checklist difiere del Word en dos
puntos (conviene reflejarlos en una PRO-TI-001 v1.1):
- BitLocker, Defender y "usuario no admin local" también se exigen en
  clientes sin dominio (en el Word estaban marcados [AD]).
- Los pasos que ahora hace el sistema solo (actualizar inventario,
  agendar la eliminación definitiva) se reemplazaron por el ítem de
  confirmación correspondiente.

## Cómo probar
- Como técnico: crear una baja inmediata de un cliente de prueba sin
  AD → ticket urgente, 3 ítems "No aplica", email "URGENTE" a admins.
- Intentar cerrarlo → aviso con lo que falta.
- Intentar "No aplica" en un ítem crítico → no aparece el botón (y la
  base lo rechaza igual).
- Completar todo, adjuntar una foto y un PDF a dos críticos y un dato al
  resto → cierra. En Altas y bajas aparece el seguimiento a 30 días.
- Alta de equipo vinculada a un ítem de inventario → al cerrar, el ítem
  queda "Asignado" al cliente.
- Con un técnico sin acceso a ese cliente → no ve el ticket ni el
  checklist.

## Qué se verificó antes de subir
- Las 27 migraciones del repo + las 3 nuevas aplicadas en un Postgres
  local, con 8 escenarios usando roles y RLS reales (creación,
  visibilidad entre técnicos, reglas de ítems, bloqueo de cierre,
  evidencia, inventario, seguimientos sin duplicados, permisos). Las
  pruebas encontraron y corrigieron dos errores antes de esta entrega:
  el código del ticket salía vacío en el mensaje (en un BEFORE UPDATE
  la columna generada todavía es NULL) y la validación del destino del
  equipo fallaba.
- Las pantallas reales renderizadas con un Supabase simulado: 22
  verificaciones (listado, filtros, formulario, detalle, checklist,
  error de cierre, dashboard).
- `npm run lint` y `npm run build` sin errores.
- **No probado**: la migración 031 (pg_cron) y la subida real de
  archivos al bucket. Ambas quedan en "Cómo probar".

## Pendiente (para decidir)
- **Reportes** sigue contando las altas/bajas como "soporte" en tickets
  por mes y tiempo de resolución. Separarlas implica cambiar los
  gráficos y las exportaciones a Excel/PDF.
- Los tickets de alta/baja se ven en el **portal del cliente** (solo
  título y estado, nunca el checklist), igual que soporte y
  reparaciones, y el cliente recibe el email de cambio de estado. Si
  preferís ocultarlos del portal, es una policy de RLS más.

## Revertir
Borrá los archivos del bucket `ticket-evidencias` desde Storage y
ejecutá `migrations/rollback_procedimientos.sql` en el SQL Editor. Los
tickets de alta/baja pasan a soporte; el valor `procedimiento` queda en
el enum sin uso (Postgres no permite quitarlo).

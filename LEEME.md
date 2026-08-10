# Sprint 4 — Asignación de técnicos y grupos de trabajo

## 1. Base de datos
Corré en el SQL Editor de Supabase:
  → migrations/00000000000015_add_ci_profiles.sql

Agrega la columna `ci` (Cédula, varchar 15, única) a `profiles`. Nullable,
porque los técnicos que ya iniciaron sesión no la tienen todavía — se
completa desde la nueva pantalla de Técnicos.

## 2. Frontend — archivos nuevos
  src/pages/Tecnicos.jsx        → admin edita CI, teléfono, rol y estado de cada técnico
  src/pages/GruposTrabajo.jsx   → admin crea grupos y gestiona miembros/clientes

## 3. Frontend — archivos modificados (reemplazar en tu repo)
  src/pages/TicketDetail.jsx    → nueva sección "Técnicos asignados"
                                    (admin asigna/quita, marca responsable principal)
  src/App.jsx                   → rutas /tecnicos y /grupos
  src/components/Layout.jsx     → "Técnicos" y "Grupos de trabajo" en el menú
                                    (solo visibles para admin)

## 4. Cómo queda el flujo
- Un ticket puede tener varios técnicos asignados directamente (ticket_tecnicos),
  y uno de ellos puede marcarse "responsable principal".
- Un grupo de trabajo le da a TODOS sus miembros visibilidad de TODOS los
  tickets de los clientes que el grupo tenga asociados — sin asignación
  individual. Esto ya estaba soportado por el RLS desde el sprint 1.
- La gestión de asignaciones y grupos es solo para admin, siguiendo las
  policies de RLS ya aplicadas (los técnicos pueden VER pero no modificar
  asignaciones).

## 5. Deploy
git add . && git commit -m "Sprint 4: asignación de técnicos, grupos de trabajo, CI en técnicos" && git push

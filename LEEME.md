# Fix Sprint 3 — Campo RUC en clientes

## 1. Base de datos
Corré en el SQL Editor de Supabase, en tu proyecto:
  → 00000000000014_add_ruc_clientes.sql

Esto agrega la columna `ruc` (varchar 15, única, nullable) a la tabla `clientes`.
Nullable porque los clientes ya cargados no lo tienen todavía — podés
completarlo editándolos desde la app.

## 2. Frontend
Reemplazá src/pages/Clientes.jsx en tu repo por el de este zip.
Incluye: campo RUC en el formulario (alta y edición), columna RUC en el
listado, y búsqueda que ahora también matchea por RUC.

## 3. Deploy
git add . && git commit -m "Sprint 3: agrega RUC a clientes" && git push
Netlify redeploya solo.

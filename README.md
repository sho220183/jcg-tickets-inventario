# JCG Infotech — Tickets & Inventario

Esqueleto funcional del sistema interno de tickets de soporte + inventario/seguimiento.
Stack: **React + Vite + Tailwind + Supabase**, mismo esquema que "La Rueda".

## Qué incluye este esqueleto

- Login con Supabase Auth (sin registro público — los usuarios se crean desde el dashboard)
- Contexto de autenticación con el rol del usuario (`admin` / `tecnico`)
- **Dashboard**: conteo de tickets por estado + alertas de stock bajo
- **Tickets**: listado con filtro por estado, creación de tickets, detalle con historial y cambio de estado
- **Inventario**: listado con stock/mínimo, alta de nuevos ítems
- Row Level Security del lado de la base de datos (ya aplicado en las migraciones)

## 1. Instalar dependencias

```bash
npm install
```

## 2. Conectar con tu proyecto de Supabase

```bash
cp .env.example .env
```

Editá `.env` y completá:

```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aca
```

Ambos datos están en el dashboard de Supabase → **Settings → Data API** (URL) y
**Settings → API Keys** (buscá la clave `anon` / `public`, nunca la `service_role`).

> Este repo asume que ya corriste las 13 migraciones SQL en tu proyecto de Supabase.
> Si todavía no lo hiciste, son las que arman las tablas `tickets`, `clientes`,
> `inventario_items`, etc. — avisame y te las vuelvo a pasar.

## 3. Crear tu primer usuario admin

1. En el dashboard de Supabase, andá a **Authentication → Users → Add user**.
2. Creá el usuario con tu email y una contraseña.
3. El sistema le crea automáticamente un `profile` con rol `tecnico`.
4. Para promoverlo a `admin`, corré en el **SQL Editor**:
   ```sql
   update profiles set rol = 'admin' where id = '<uuid-del-usuario>';
   ```
   (el UUID lo ves en la misma pantalla de Authentication → Users)

## 4. Correr en desarrollo

```bash
npm run dev
```

Se abre en `http://localhost:5173`. Iniciá sesión con el usuario que creaste.

## 5. Deploy en Netlify

Mismo esquema que `app-rueda.netlify.app`:

1. Subí este repo a GitHub.
2. En Netlify: **Add new site → Import an existing project** y conectá el repo.
3. Build command: `npm run build` — Publish directory: `dist`
4. En **Site settings → Environment variables**, agregá `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY` con los mismos valores de tu `.env`.
5. Deploy.

## Estructura del proyecto

```
src/
  lib/supabaseClient.js     → conexión única a Supabase
  context/AuthContext.jsx   → sesión, perfil y rol del usuario
  components/
    Layout.jsx               → barra lateral + navegación
    ProtectedRoute.jsx        → bloquea rutas si no hay sesión
  pages/
    Login.jsx
    Dashboard.jsx
    Tickets.jsx               → listado + alta de tickets
    TicketDetail.jsx          → detalle, historial, cambio de estado
    Inventario.jsx            → listado + alta de ítems
```

## Próximos pasos sugeridos (no incluidos todavía en este esqueleto)

- Asignación de técnicos a tickets (`ticket_tecnicos`) y grupos de trabajo — la
  base de datos ya lo soporta, falta la pantalla.
- Vínculo de ítems de inventario a un ticket (`ticket_inventario`) — ej. "se
  instaló la cámara X en este ticket".
- Edge Function para el envío real de los emails de notificación (la tabla
  `notificaciones_email` ya se llena sola vía trigger, falta conectar el envío,
  por ejemplo con Resend).
- Reportes básicos (tickets por mes, tiempo de resolución).
- Roles y permisos más finos en la UI (ocultar acciones de admin a los técnicos).

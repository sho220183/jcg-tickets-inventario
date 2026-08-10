# Migraciones SQL — Sistema de Tickets + Inventario (JCG Infotech)

13 migraciones, en orden, que arman la base de datos completa en Supabase.

## Orden de las migraciones

| # | Archivo | Contenido |
|---|---|---|
| 01 | `extensions_and_types.sql` | Extensión `pgcrypto` + tipos enumerados + función `set_updated_at` |
| 02 | `profiles.sql` | Perfiles de usuario (admin/técnico) + trigger de alta automática |
| 03 | `clientes.sql` | Clientes |
| 04 | `grupos_trabajo.sql` | Grupos de trabajo (equipos de técnicos por cliente) |
| 05 | `tickets.sql` | Tickets, con código `JCG-0001` autogenerado |
| 06 | `ticket_tecnicos.sql` | Asignación N a N de técnicos a tickets |
| 07 | `ticket_eventos.sql` | Historial/notas + registro automático de cambios de estado |
| 08 | `notificaciones_email.sql` | Cola de notificaciones al cliente por cambio de estado |
| 09 | `inventario_categorias.sql` | Categorías de inventario (editable, sembrada con lista fija) |
| 10 | `inventario_items.sql` | Ítems de inventario |
| 11 | `inventario_movimientos.sql` | Movimientos + trigger que actualiza stock automáticamente |
| 12 | `ticket_inventario.sql` | Vínculo entre tickets e ítems de inventario usados/instalados |
| 13 | `rls_policies.sql` | Row Level Security completo para todas las tablas |

## Cómo aplicarlas

### Opción A — Supabase CLI (recomendado)

```bash
# 1. Instalar la CLI si no la tenés
npm install -g supabase

# 2. Iniciar sesión y linkear el proyecto
supabase login
supabase link --project-ref <tu-project-ref>

# 3. Copiar esta carpeta "migrations" dentro de supabase/migrations
#    en la raíz de tu repo (una vez armado el esqueleto del proyecto)

# 4. Aplicar las migraciones al proyecto remoto
supabase db push
```

### Opción B — SQL Editor del dashboard de Supabase (más rápido para arrancar ya)

1. Entrá a tu proyecto en https://supabase.com/dashboard
2. Andá a **SQL Editor**
3. Pegá y ejecutá cada archivo **en orden**, del 01 al 13
4. (Opcional) ejecutá `seed.sql` al final si querés datos de prueba

## Después de aplicar las migraciones

1. Creá los primeros usuarios (admin y técnicos) desde **Authentication → Users** en el dashboard de Supabase.
2. El trigger de `profiles.sql` les crea automáticamente su perfil con rol `tecnico` por defecto.
3. Para promover el primer admin, corré en el SQL Editor:
   ```sql
   update profiles set rol = 'admin' where id = '<uuid-del-usuario>';
   ```
4. Armá al menos un grupo de trabajo y asigná clientes/miembros si vas a usar visibilidad por equipo desde el día 1.

## Notas importantes

- **Emails de notificación**: las migraciones dejan lista la tabla `notificaciones_email` y el trigger que la encola, pero el envío real requiere una **Edge Function** conectada a un servicio como Resend — eso lo armamos en la Fase 2, junto con el módulo de tickets.
- **`seed.sql`** es solo para desarrollo local/pruebas — no correrlo en el proyecto de producción.
- Estas migraciones asumen un proyecto Supabase nuevo, sin tablas previas con estos mismos nombres.

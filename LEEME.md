# Sprint 10 — Alta de usuarios (técnicos/admin) desde la plataforma

## No requiere ninguna migración SQL
Todo esto usa infraestructura que ya existía: el trigger que crea el
"profile" automáticamente cuando se crea un usuario (desde el sprint
1), y las policies de RLS de siempre. Lo único nuevo es la forma de
crear el usuario en sí.

## Por qué hace falta una Edge Function
Crear un usuario nuevo en Supabase Auth requiere la "service_role key"
— la misma clave con privilegios totales que NUNCA puede vivir en el
código del navegador (cualquiera con acceso al código del sitio podría
verla e crear usuarios él mismo). Por eso se resuelve igual que el
envío de emails: una función que corre en los servidores de Supabase,
que primero valida que quien la llama sea admin, y recién ahí usa esa
clave para crear el usuario de verdad.

## Paso 1 — Desplegar la nueva función
Copiá la carpeta supabase/functions/create-user a tu repo (mismo lugar
donde ya tenés supabase/functions/send-notification), y corré:

```bash
npx supabase functions deploy create-user
```

No hace falta configurar ningún secreto nuevo — la función usa
SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY, que
Supabase ya inyecta automáticamente en cualquier Edge Function.

## Paso 2 — Frontend
Reemplazá src/pages/Tecnicos.jsx en tu repo por el de este zip.

## Cómo funciona
1. Menú → Técnicos → "+ Nuevo técnico"
2. Cargás nombre, email, rol (tecnico/admin), y una contraseña temporal
   (podés escribirla vos o usar el botón "Generar" para una segura al
   azar)
3. Al crear, aparece un aviso verde ÚNICA VEZ con el email y la
   contraseña — copialo antes de cerrarlo, porque no se vuelve a
   mostrar. Se lo pasás al técnico por el medio que prefieras
   (WhatsApp, en persona, etc.) para que inicie sesión.
4. El usuario ya queda funcionando de inmediato — no requiere
   confirmar el email ni ningún paso adicional.

## Limitación a tener en cuenta (posible mejora futura)
Hoy no hay una pantalla de "cambiar mi contraseña" dentro del sistema,
así que el técnico se queda con la contraseña temporal que le diste
salvo que vos se la vuelvas a generar. Si más adelante querés que cada
uno pueda cambiarla por su cuenta, hay dos caminos:
  a) Agregar una pantalla simple de "cambiar contraseña" (rápido de
     armar).
  b) Pasar a un flujo de invitación por email (el usuario recibe un
     link y define su propia contraseña la primera vez) — más prolijo,
     pero requiere configurar el redirect URL de Supabase Auth y una
     pantalla nueva para procesar ese link.
Avisame cuál preferís cuando quieras encararlo.

## Deploy del frontend
git add . && git commit -m "Sprint 10: alta de usuarios desde la plataforma" && git push

// Edge Function: create-user
//
// Se llama directamente desde el frontend (pantalla Técnicos → "+ Nuevo
// técnico"), a diferencia de send-notification que se dispara sola vía
// Database Webhook. Por eso acá SÍ hay que manejar CORS.
//
// Flujo de seguridad:
//   1) Verifica que quien llama tenga una sesión válida.
//   2) Chequea, vía RLS (con la sesión del que llama, no con privilegios
//      de admin), que su perfil tenga rol = 'admin'.
//   3) Recién ahí usa la SERVICE_ROLE_KEY para crear el usuario de verdad.
//
// Nunca se expone la SERVICE_ROLE_KEY al navegador — vive únicamente acá,
// inyectada automáticamente por Supabase en el entorno de la función.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ success: false, error: 'Falta autenticación.' })
    }

    // Cliente "como el usuario que llama" — usa su JWT, respeta RLS.
    // Sirve para confirmar de forma segura quién es y si es admin.
    const supabaseAsCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: userData, error: userError } = await supabaseAsCaller.auth.getUser()
    if (userError || !userData?.user) {
      return json({ success: false, error: 'No se pudo verificar tu sesión.' })
    }

    const { data: perfilCaller, error: perfilError } = await supabaseAsCaller
      .from('profiles')
      .select('rol')
      .eq('id', userData.user.id)
      .single()

    if (perfilError || perfilCaller?.rol !== 'admin') {
      return json({ success: false, error: 'Solo un administrador puede crear usuarios.' })
    }

    const { email, password, nombre_completo, rol } = await req.json()

    if (!email || !password || !nombre_completo) {
      return json({ success: false, error: 'Faltan datos obligatorios (email, contraseña, nombre).' })
    }

    if (password.length < 8) {
      return json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres.' })
    }

    // Recién acá se usa la service_role key, con privilegios de administrador.
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: nuevoUsuario, error: errorCreacion } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nombre_completo },
    })

    if (errorCreacion) {
      return json({ success: false, error: errorCreacion.message })
    }

    // El trigger handle_new_user ya crea la fila en "profiles" automáticamente
    // (con rol "tecnico" por defecto). Si se pidió otro rol, se ajusta acá.
    if (rol && rol !== 'tecnico') {
      await supabaseAdmin.from('profiles').update({ rol }).eq('id', nuevoUsuario.user.id)
    }

    return json({ success: true, id: nuevoUsuario.user.id, email: nuevoUsuario.user.email })
  } catch (err) {
    return json({ success: false, error: 'Error interno: ' + err.message })
  }
})

// Edge Function: send-notification
//
// Se dispara vía Database Webhook cada vez que se inserta una fila en
// "notificaciones". Por ahora solo procesa el canal "email" (vía Resend).
// El canal "whatsapp" queda documentado pero sin enviar de verdad todavía
// — requiere una cuenta de WhatsApp Business verificada, ver LEEME.md.
//
// Variables de entorno que usa:
//   RESEND_API_KEY      → obligatoria, la das de alta en resend.com
//   RESEND_FROM_EMAIL    → opcional, por defecto usa el dominio de pruebas de Resend
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY → las inyecta Supabase automáticamente,
//                                               no hace falta configurarlas a mano.

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const RESEND_FROM_EMAIL =
  Deno.env.get('RESEND_FROM_EMAIL') ?? 'JCG Infotech <onboarding@resend.dev>'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record // fila insertada en "notificaciones"

    if (!record) {
      return new Response('Payload sin "record"', { status: 400 })
    }

    if (record.canal === 'whatsapp') {
      // Todavía no conectado. Se deja la fila en "pendiente" a propósito,
      // para no perder el registro de que había que avisar por acá.
      return new Response('Canal WhatsApp: pendiente de implementar', { status: 200 })
    }

    if (record.canal !== 'email') {
      return new Response('Canal desconocido: ' + record.canal, { status: 200 })
    }

    if (!RESEND_API_KEY) {
      await marcarError(record.id, 'Falta configurar RESEND_API_KEY en las variables de entorno de la función.')
      return new Response('Falta RESEND_API_KEY', { status: 200 })
    }

    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: record.destinatario_contacto,
        subject: record.asunto ?? 'Notificación de JCG Infotech',
        text: record.mensaje,
      }),
    })

    if (respuesta.ok) {
      await supabase
        .from('notificaciones')
        .update({ estado: 'enviado', enviado_at: new Date().toISOString() })
        .eq('id', record.id)
      return new Response('OK', { status: 200 })
    }

    const detalle = await respuesta.text()
    await marcarError(record.id, detalle)
    return new Response('Resend devolvió un error: ' + detalle, { status: 200 })
  } catch (err) {
    console.error(err)
    return new Response('Error interno: ' + err.message, { status: 500 })
  }
})

async function marcarError(notificacionId: string, detalle: string) {
  await supabase
    .from('notificaciones')
    .update({ estado: 'error', error_detalle: detalle.slice(0, 500) })
    .eq('id', notificacionId)
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const ESTADO_BADGE = {
  pendiente: 'bg-amber-100 text-amber-800',
  enviado: 'bg-emerald-100 text-emerald-800',
  error: 'bg-red-100 text-red-800',
}

const FILTROS = ['todos', 'pendiente', 'enviado', 'error']

export default function Notificaciones() {
  const { isAdmin } = useAuth()
  const [notificaciones, setNotificaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*, tickets ( codigo )')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) console.error(error)
    setNotificaciones(data ?? [])
    setLoading(false)
  }

  async function reintentar(n) {
    // Insertar una fila nueva (en vez de actualizar la existente) dispara
    // de nuevo el Database Webhook que llama a la Edge Function.
    const { error } = await supabase.from('notificaciones').insert({
      ticket_id: n.ticket_id,
      canal: n.canal,
      destinatario_tipo: n.destinatario_tipo,
      destinatario_id: n.destinatario_id,
      destinatario_contacto: n.destinatario_contacto,
      asunto: n.asunto,
      mensaje: n.mensaje,
    })

    if (error) {
      alert('No se pudo reintentar: ' + error.message)
      return
    }
    cargar()
  }

  if (!isAdmin) {
    return <p className="text-slate-500">Esta sección es solo para administradores.</p>
  }

  const filtradas = filtro === 'todos' ? notificaciones : notificaciones.filter((n) => n.estado === filtro)

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-navy-800">Notificaciones</h1>
      <p className="mb-6 text-sm text-slate-500">
        Cola de avisos por email y WhatsApp a clientes y técnicos. El canal WhatsApp todavía no
        envía de verdad — queda registrado como pendiente hasta que se conecte.
      </p>

      <div className="mb-4 flex gap-2">
        {FILTROS.map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              filtro === f ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-slate-500">No hay notificaciones para este filtro.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Ticket</th>
                <th className="px-4 py-3">Para</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Mensaje</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {new Date(n.created_at).toLocaleString('es-PY')}
                  </td>
                  <td className="px-4 py-3 text-cyan-700">{n.tickets?.codigo ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="capitalize">{n.destinatario_tipo}</span>
                    <br />
                    <span className="text-xs text-slate-400">{n.destinatario_contacto}</span>
                  </td>
                  <td className="px-4 py-3 uppercase text-slate-600">{n.canal}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-600" title={n.mensaje}>
                    {n.mensaje}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${ESTADO_BADGE[n.estado]}`}>
                      {n.estado}
                    </span>
                    {n.estado === 'error' && n.error_detalle && (
                      <p className="mt-1 max-w-xs truncate text-xs text-red-500" title={n.error_detalle}>
                        {n.error_detalle}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {n.estado === 'error' && (
                      <button
                        onClick={() => reintentar(n)}
                        className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                      >
                        Reintentar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

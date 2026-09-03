import { useEffect, useState } from 'react'
import { Bell, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import FilterPills from '../components/ui/FilterPills'
import Table, { Td, Th } from '../components/ui/Table'
import { PageLoading } from '../components/ui/Spinner'

const ESTADO_TONO = {
  pendiente: 'amber',
  enviado: 'emerald',
  error: 'red',
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
    return (
      <EmptyState
        icon={Bell}
        title="Sección solo para administradores"
        description="No tenés permisos para ver esta pantalla."
      />
    )
  }

  const filtradas = filtro === 'todos' ? notificaciones : notificaciones.filter((n) => n.estado === filtro)

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        subtitle="Cola de avisos por email y WhatsApp a clientes y técnicos. El canal WhatsApp todavía no envía de verdad — queda registrado como pendiente hasta que se conecte."
      />

      <FilterPills
        opciones={FILTROS.map((f) => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
        valor={filtro}
        onChange={setFiltro}
      />

      {loading ? (
        <PageLoading />
      ) : filtradas.length === 0 ? (
        <EmptyState icon={Bell} title="No hay notificaciones para este filtro" />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Fecha</Th>
              <Th>Ticket</Th>
              <Th>Para</Th>
              <Th>Canal</Th>
              <Th>Mensaje</Th>
              <Th>Estado</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtradas.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50">
                <Td className="whitespace-nowrap text-xs text-slate-500">
                  {new Date(n.created_at).toLocaleString('es-PY')}
                </Td>
                <Td className="text-cyan-700">{n.tickets?.codigo ?? '—'}</Td>
                <Td className="text-slate-600">
                  <span className="capitalize">{n.destinatario_tipo}</span>
                  <br />
                  <span className="text-xs text-slate-400">{n.destinatario_contacto}</span>
                </Td>
                <Td className="uppercase text-slate-600">{n.canal}</Td>
                <Td className="max-w-xs truncate text-slate-600" title={n.mensaje}>
                  {n.mensaje}
                </Td>
                <Td>
                  <Badge tono={ESTADO_TONO[n.estado]}>{n.estado}</Badge>
                  {n.estado === 'error' && n.error_detalle && (
                    <p className="mt-1 max-w-xs truncate text-xs text-red-500" title={n.error_detalle}>
                      {n.error_detalle}
                    </p>
                  )}
                </Td>
                <Td>
                  {n.estado === 'error' && (
                    <button
                      onClick={() => reintentar(n)}
                      className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reintentar
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}

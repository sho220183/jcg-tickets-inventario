import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Ticket as TicketIcon } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { estadoLabel } from '../../lib/estados'
import Badge from '../../components/ui/Badge'
import Card, { CardBody, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import { PageLoading } from '../../components/ui/Spinner'

const ESTADO_TONO = {
  nuevo: 'cyan',
  en_progreso: 'amber',
  esperando_cliente: 'purple',
  resuelto: 'emerald',
  cerrado: 'slate',
}

export default function PortalTicketDetail() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarTicket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function cargarTicket() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('id, codigo, titulo, descripcion, categoria, tipo, prioridad, estado, created_at, closed_at')
      .eq('id', id)
      .maybeSingle()

    if (error) console.error(error)
    setTicket(data ?? null)
    setLoading(false)
  }

  if (loading) return <PageLoading label="Cargando ticket…" />

  if (!ticket) {
    return (
      <EmptyState
        icon={TicketIcon}
        title="Ticket no encontrado"
        description="Puede que no exista o que no tengas acceso a él."
        action={
          <Link to="/portal" className="text-sm font-medium text-cyan-700 hover:text-cyan-800">
            Volver a mis tickets
          </Link>
        }
      />
    )
  }

  return (
    <div>
      <Link to="/portal" className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Volver a mis tickets
      </Link>

      <Card>
        <CardHeader
          title={`${ticket.codigo} — ${ticket.titulo}`}
          subtitle={ticket.tipo === 'reparacion' ? 'Reparación' : 'Soporte técnico'}
          action={<Badge tono={ESTADO_TONO[ticket.estado]}>{estadoLabel(ticket.tipo, ticket.estado)}</Badge>}
        />
        <CardBody>
          {ticket.descripcion && (
            <p className="mb-4 whitespace-pre-wrap text-sm text-slate-700">{ticket.descripcion}</p>
          )}

          <dl className="grid grid-cols-2 gap-4 text-sm">
            {ticket.categoria && (
              <div>
                <dt className="text-xs text-slate-400">Categoría</dt>
                <dd className="capitalize text-slate-700">{ticket.categoria}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-slate-400">Prioridad</dt>
              <dd className="capitalize text-slate-700">{ticket.prioridad}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar className="h-3 w-3" /> Creado
              </dt>
              <dd className="text-slate-700">{new Date(ticket.created_at).toLocaleDateString('es-PY')}</dd>
            </div>
            {ticket.closed_at && (
              <div>
                <dt className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar className="h-3 w-3" /> Cerrado
                </dt>
                <dd className="text-slate-700">{new Date(ticket.closed_at).toLocaleDateString('es-PY')}</dd>
              </div>
            )}
          </dl>
        </CardBody>
      </Card>
    </div>
  )
}

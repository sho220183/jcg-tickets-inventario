import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ticket as TicketIcon } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { estadoLabel } from '../../lib/estados'
import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import FilterPills from '../../components/ui/FilterPills'
import Table, { Td, Th } from '../../components/ui/Table'
import { PageLoading } from '../../components/ui/Spinner'

const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'soporte', label: 'Soporte' },
  { value: 'reparacion', label: 'Reparaciones' },
]

const ESTADO_TONO = {
  nuevo: 'cyan',
  en_progreso: 'amber',
  esperando_cliente: 'purple',
  resuelto: 'emerald',
  cerrado: 'slate',
}

export default function PortalTickets() {
  const [tickets, setTickets] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarTickets()
  }, [])

  async function cargarTickets() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('id, codigo, titulo, tipo, estado, created_at')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setTickets(data ?? [])
    setLoading(false)
  }

  const ticketsFiltrados = tickets.filter((t) => filtro === 'todos' || t.tipo === filtro)

  return (
    <div>
      <PageHeader title="Mis tickets" subtitle="Estado de tus solicitudes de soporte y reparaciones." />

      <FilterPills opciones={FILTROS} valor={filtro} onChange={setFiltro} />

      {loading ? (
        <PageLoading label="Cargando tus tickets…" />
      ) : ticketsFiltrados.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No hay tickets para mostrar"
          description="Cuando JCG Infotech cree un ticket a tu nombre, lo vas a ver acá."
        />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Código</Th>
              <Th>Título</Th>
              <Th>Tipo</Th>
              <Th>Estado</Th>
              <Th>Fecha</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ticketsFiltrados.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td>
                  <Link to={`/portal/tickets/${t.id}`} className="font-medium text-cyan-700 hover:text-cyan-800">
                    {t.codigo}
                  </Link>
                </Td>
                <Td>{t.titulo}</Td>
                <Td className="capitalize text-slate-600">{t.tipo === 'reparacion' ? 'Reparación' : 'Soporte'}</Td>
                <Td>
                  <Badge tono={ESTADO_TONO[t.estado]}>{estadoLabel(t.tipo, t.estado)}</Badge>
                </Td>
                <Td className="text-slate-500">{new Date(t.created_at).toLocaleDateString('es-PY')}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}

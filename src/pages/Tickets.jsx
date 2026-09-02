import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Ticket as TicketIcon, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ESTADOS, estadoLabel } from '../lib/estados'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import FilterPills from '../components/ui/FilterPills'
import Table, { Td, Th } from '../components/ui/Table'
import { PageLoading } from '../components/ui/Spinner'
import { FieldGroup, Input, Select, Textarea } from '../components/ui/Field'

const PRIORIDADES = ['baja', 'media', 'alta', 'urgente']

const ESTADO_TONO = {
  nuevo: 'cyan',
  en_progreso: 'amber',
  esperando_cliente: 'purple',
  resuelto: 'emerald',
  cerrado: 'slate',
}

export default function Tickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [clientes, setClientes] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [nuevoTicket, setNuevoTicket] = useState({
    cliente_id: '',
    titulo: '',
    descripcion: '',
    prioridad: 'media',
  })

  useEffect(() => {
    cargarTickets()
    cargarClientes()
  }, [])

  async function cargarTickets() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select('id, codigo, titulo, estado, prioridad, created_at, clientes ( nombre )')
      .eq('tipo', 'soporte')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setTickets(data ?? [])
    setLoading(false)
  }

  async function cargarClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre').order('nombre')
    setClientes(data ?? [])
  }

  async function crearTicket(e) {
    e.preventDefault()
    const { error } = await supabase.from('tickets').insert({
      ...nuevoTicket,
      tipo: 'soporte',
      created_by: user.id,
    })

    if (error) {
      alert('No se pudo crear el ticket: ' + error.message)
      return
    }

    setNuevoTicket({ cliente_id: '', titulo: '', descripcion: '', prioridad: 'media' })
    setMostrarForm(false)
    cargarTickets()
  }

  const ticketsFiltrados =
    filtroEstado === 'todos' ? tickets : tickets.filter((t) => t.estado === filtroEstado)

  return (
    <div>
      <PageHeader
        title="Tickets"
        subtitle="Soporte técnico en curso y su historial."
        action={
          <Button onClick={() => setMostrarForm((v) => !v)} variant={mostrarForm ? 'outline' : 'primary'}>
            {mostrarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {mostrarForm ? 'Cancelar' : 'Nuevo ticket'}
          </Button>
        }
      />

      {mostrarForm && clientes.length === 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Todavía no hay clientes cargados, así que no se puede crear un ticket.{' '}
          <Link to="/clientes" className="font-medium underline">
            Creá el primer cliente acá →
          </Link>
        </div>
      )}

      {mostrarForm && clientes.length > 0 && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crearTicket} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldGroup label="Cliente">
                <Select
                  required
                  value={nuevoTicket.cliente_id}
                  onChange={(e) => setNuevoTicket({ ...nuevoTicket, cliente_id: e.target.value })}
                >
                  <option value="">Seleccioná un cliente…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup label="Prioridad">
                <Select
                  value={nuevoTicket.prioridad}
                  onChange={(e) => setNuevoTicket({ ...nuevoTicket, prioridad: e.target.value })}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup label="Título" className="md:col-span-2">
                <Input
                  required
                  value={nuevoTicket.titulo}
                  onChange={(e) => setNuevoTicket({ ...nuevoTicket, titulo: e.target.value })}
                  placeholder="Ej: No conecta a internet"
                />
              </FieldGroup>

              <FieldGroup label="Descripción" className="md:col-span-2">
                <Textarea
                  value={nuevoTicket.descripcion}
                  onChange={(e) => setNuevoTicket({ ...nuevoTicket, descripcion: e.target.value })}
                  rows={3}
                />
              </FieldGroup>

              <div className="md:col-span-2">
                <Button type="submit" variant="accent">
                  Crear ticket
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <FilterPills
        opciones={[
          { value: 'todos', label: 'Todos' },
          ...ESTADOS.map((e) => ({ value: e, label: estadoLabel('soporte', e) })),
        ]}
        valor={filtroEstado}
        onChange={setFiltroEstado}
      />

      {loading ? (
        <PageLoading label="Cargando tickets…" />
      ) : ticketsFiltrados.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No hay tickets para este filtro"
          description="Probá con otro estado, o creá un ticket nuevo."
        />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Código</Th>
              <Th>Título</Th>
              <Th>Cliente</Th>
              <Th>Prioridad</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ticketsFiltrados.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <Td>
                  <Link to={`/tickets/${t.id}`} className="font-medium text-cyan-700 hover:text-cyan-800">
                    {t.codigo}
                  </Link>
                </Td>
                <Td>{t.titulo}</Td>
                <Td className="text-slate-600">{t.clientes?.nombre}</Td>
                <Td className="capitalize text-slate-600">{t.prioridad}</Td>
                <Td>
                  <Badge tono={ESTADO_TONO[t.estado]}>{estadoLabel('soporte', t.estado)}</Badge>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}

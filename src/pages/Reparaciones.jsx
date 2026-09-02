import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Wrench, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ESTADOS, estadoLabel, TIPO_EQUIPO_LABEL } from '../lib/estados'
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

const VACIO = {
  cliente_id: '',
  prioridad: 'media',
  problema_reportado: '',
  tipo_equipo: 'notebook',
  marca: '',
  modelo: '',
  numero_serie: '',
  accesorios_entregados: '',
  estado_al_recibir: '',
  presupuesto_estimado: '',
  fecha_estimada_entrega: '',
  garantia_dias: 30,
}

export default function Reparaciones() {
  const { user } = useAuth()
  const [reparaciones, setReparaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarReparaciones()
    cargarClientes()
  }, [])

  async function cargarReparaciones() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, codigo, titulo, estado, prioridad, created_at, clientes ( nombre ), equipos_reparacion ( tipo_equipo, marca, modelo, fecha_estimada_entrega )'
      )
      .eq('tipo', 'reparacion')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setReparaciones(data ?? [])
    setLoading(false)
  }

  async function cargarClientes() {
    const { data } = await supabase.from('clientes').select('id, nombre').order('nombre')
    setClientes(data ?? [])
  }

  async function crearReparacion(e) {
    e.preventDefault()
    setGuardando(true)

    const { data: ticket, error: errorTicket } = await supabase
      .from('tickets')
      .insert({
        cliente_id: form.cliente_id,
        titulo: `${TIPO_EQUIPO_LABEL[form.tipo_equipo]} — ${form.problema_reportado.slice(0, 60)}`,
        descripcion: form.problema_reportado,
        prioridad: form.prioridad,
        tipo: 'reparacion',
        created_by: user.id,
      })
      .select()
      .single()

    if (errorTicket) {
      alert('No se pudo crear la reparación: ' + errorTicket.message)
      setGuardando(false)
      return
    }

    const { error: errorEquipo } = await supabase.from('equipos_reparacion').insert({
      ticket_id: ticket.id,
      tipo_equipo: form.tipo_equipo,
      marca: form.marca || null,
      modelo: form.modelo || null,
      numero_serie: form.numero_serie || null,
      accesorios_entregados: form.accesorios_entregados || null,
      estado_al_recibir: form.estado_al_recibir || null,
      presupuesto_estimado: form.presupuesto_estimado ? Number(form.presupuesto_estimado) : null,
      fecha_estimada_entrega: form.fecha_estimada_entrega || null,
      garantia_dias: Number(form.garantia_dias) || 30,
    })

    if (errorEquipo) {
      alert('El ticket se creó, pero no se pudo guardar la ficha del equipo: ' + errorEquipo.message)
    }

    setForm(VACIO)
    setMostrarForm(false)
    setGuardando(false)
    cargarReparaciones()
  }

  const filtradas =
    filtroEstado === 'todos' ? reparaciones : reparaciones.filter((r) => r.estado === filtroEstado)

  return (
    <div>
      <PageHeader
        title="Reparaciones"
        subtitle="Equipos recibidos en el taller y su seguimiento."
        action={
          <Button onClick={() => setMostrarForm((v) => !v)} variant={mostrarForm ? 'outline' : 'primary'}>
            {mostrarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {mostrarForm ? 'Cancelar' : 'Recibir equipo'}
          </Button>
        }
      />

      {mostrarForm && clientes.length === 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Todavía no hay clientes cargados, así que no se puede recibir un equipo.{' '}
          <Link to="/clientes" className="font-medium underline">
            Creá el primer cliente acá →
          </Link>
        </div>
      )}

      {mostrarForm && clientes.length > 0 && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crearReparacion} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                Datos del cliente y del problema
              </p>

              <FieldGroup label="Cliente">
                <Select
                  required
                  value={form.cliente_id}
                  onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
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
                  value={form.prioridad}
                  onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                >
                  {PRIORIDADES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup label="Problema reportado por el cliente" className="md:col-span-2">
                <Textarea
                  required
                  value={form.problema_reportado}
                  onChange={(e) => setForm({ ...form, problema_reportado: e.target.value })}
                  rows={2}
                  placeholder="Ej: no enciende, pantalla rota, no imprime en color…"
                />
              </FieldGroup>

              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 md:col-span-2">
                Datos del equipo
              </p>

              <FieldGroup label="Tipo de equipo">
                <Select
                  value={form.tipo_equipo}
                  onChange={(e) => setForm({ ...form, tipo_equipo: e.target.value })}
                >
                  {Object.entries(TIPO_EQUIPO_LABEL).map(([valor, label]) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup label="N° de serie">
                <Input
                  value={form.numero_serie}
                  onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Marca">
                <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
              </FieldGroup>

              <FieldGroup label="Modelo">
                <Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
              </FieldGroup>

              <FieldGroup label="Accesorios entregados" className="md:col-span-2">
                <Input
                  value={form.accesorios_entregados}
                  onChange={(e) => setForm({ ...form, accesorios_entregados: e.target.value })}
                  placeholder="Ej: cargador, mouse, funda"
                />
              </FieldGroup>

              <FieldGroup label="Estado del equipo al recibirlo" className="md:col-span-2">
                <Textarea
                  value={form.estado_al_recibir}
                  onChange={(e) => setForm({ ...form, estado_al_recibir: e.target.value })}
                  rows={2}
                  placeholder="Ej: golpes en la tapa, pantalla con línea vertical, sin batería"
                />
              </FieldGroup>

              <FieldGroup label="Presupuesto estimado (Gs.)">
                <Input
                  type="number"
                  min="0"
                  value={form.presupuesto_estimado}
                  onChange={(e) => setForm({ ...form, presupuesto_estimado: e.target.value })}
                  placeholder="Opcional, se puede cargar después"
                />
              </FieldGroup>

              <FieldGroup label="Fecha estimada de entrega">
                <Input
                  type="date"
                  value={form.fecha_estimada_entrega}
                  onChange={(e) => setForm({ ...form, fecha_estimada_entrega: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Garantía (días tras la entrega)">
                <Input
                  type="number"
                  min="0"
                  value={form.garantia_dias}
                  onChange={(e) => setForm({ ...form, garantia_dias: e.target.value })}
                />
              </FieldGroup>

              <div className="md:col-span-2">
                <Button type="submit" variant="accent" loading={guardando}>
                  {guardando ? 'Guardando…' : 'Registrar ingreso del equipo'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <FilterPills
        opciones={[
          { value: 'todos', label: 'Todos' },
          ...ESTADOS.map((e) => ({ value: e, label: estadoLabel('reparacion', e) })),
        ]}
        valor={filtroEstado}
        onChange={setFiltroEstado}
      />

      {loading ? (
        <PageLoading label="Cargando reparaciones…" />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No hay equipos para este filtro"
          description="Probá con otro estado, o registrá el ingreso de un equipo nuevo."
        />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Código</Th>
              <Th>Equipo</Th>
              <Th>Cliente</Th>
              <Th>Entrega estimada</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtradas.map((r) => {
              const equipo = r.equipos_reparacion
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <Td>
                    <Link to={`/tickets/${r.id}`} className="font-medium text-cyan-700 hover:text-cyan-800">
                      {r.codigo}
                    </Link>
                  </Td>
                  <Td>
                    {equipo ? (
                      <>
                        {TIPO_EQUIPO_LABEL[equipo.tipo_equipo]}
                        {(equipo.marca || equipo.modelo) && (
                          <span className="text-slate-400"> — {equipo.marca} {equipo.modelo}</span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td className="text-slate-600">{r.clientes?.nombre}</Td>
                  <Td className="text-slate-600">
                    {equipo?.fecha_estimada_entrega
                      ? new Date(equipo.fecha_estimada_entrega).toLocaleDateString('es-PY')
                      : '—'}
                  </Td>
                  <Td>
                    <Badge tono={ESTADO_TONO[r.estado]}>{estadoLabel('reparacion', r.estado)}</Badge>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}
    </div>
  )
}

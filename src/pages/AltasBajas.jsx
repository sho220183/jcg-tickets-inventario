import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, ClipboardCheck, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ESTADOS, estadoLabel } from '../lib/estados'
import {
  DESTINOS_EQUIPO,
  TIPOS_PROCEDIMIENTO,
  crearTicketProcedimiento,
  esBaja,
  generarSeguimientosVencidos,
  listarSeguimientos,
  mensajeError,
  procedimientoLabel,
  usaEquipo,
  usaPersona,
} from '../lib/procedimientos'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import FilterPills from '../components/ui/FilterPills'
import Table, { Td, Th } from '../components/ui/Table'
import { PageLoading } from '../components/ui/Spinner'
import { FieldGroup, Input, Select, Textarea } from '../components/ui/Field'

const ESTADO_TONO = {
  nuevo: 'cyan',
  en_progreso: 'amber',
  esperando_cliente: 'purple',
  resuelto: 'emerald',
  cerrado: 'slate',
}

const TIPO_TONO = {
  alta_equipo: 'cyan',
  alta_usuario: 'emerald',
  baja_usuario: 'red',
  baja_equipo: 'amber',
}

const VACIO = {
  tipo: 'alta_usuario',
  cliente_id: '',
  cliente_tiene_ad: true,
  baja_inmediata: false,
  fecha_efectiva: '',
  persona_nombre: '',
  persona_usuario: '',
  equipo_nombre: '',
  equipo_serie: '',
  inventario_item_id: '',
  destino_equipo: '',
  retencion_dias: 30,
  titulo: '',
  descripcion: '',
  tecnicos: [],
}

export default function AltasBajas() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState([])
  const [clientes, setClientes] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [inventario, setInventario] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('abiertos')
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [form, setForm] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')

  useEffect(() => {
    cargarTickets()
    cargarOpciones()
  }, [])

  async function cargarTickets() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, codigo, titulo, estado, prioridad, created_at, clientes ( nombre ), ' +
          'ticket_procedimientos ( tipo, persona_nombre, equipo_nombre, baja_inmediata, fecha_efectiva )'
      )
      .eq('tipo', 'procedimiento')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setTickets(data ?? [])
    setLoading(false)
  }

  async function cargarOpciones() {
    const [c, i] = await Promise.all([
      supabase.from('clientes').select('id, nombre').order('nombre'),
      supabase.from('inventario_items').select('id, nombre, marca, modelo').neq('estado', 'dado_de_baja').order('nombre'),
    ])
    setClientes(c.data ?? [])
    setInventario(i.data ?? [])

    // Solo un admin asigna técnicos (igual que en el detalle del ticket); un
    // técnico que crea el procedimiento queda asignado automáticamente.
    if (isAdmin) {
      const { data } = await supabase.from('profiles').select('id, nombre_completo').eq('activo', true).order('nombre_completo')
      setTecnicos(data ?? [])
    }
  }

  function alternarTecnico(id) {
    setForm((f) => ({
      ...f,
      tecnicos: f.tecnicos.includes(id) ? f.tecnicos.filter((t) => t !== id) : [...f.tecnicos, id],
    }))
  }

  async function crearProcedimiento(e) {
    e.preventDefault()
    setErrorForm('')

    if (usaPersona(form.tipo) && !form.persona_nombre.trim()) {
      setErrorForm('Indicá el nombre de la persona.')
      return
    }
    if (usaEquipo(form.tipo) && !form.equipo_nombre.trim() && !form.inventario_item_id) {
      setErrorForm('Indicá el nombre del equipo o vinculalo a un ítem de inventario.')
      return
    }
    if (form.tipo === 'baja_usuario' && form.baja_inmediata && !form.fecha_efectiva) {
      setErrorForm('Una baja inmediata necesita la fecha y hora efectiva.')
      return
    }

    setGuardando(true)
    try {
      const ticketId = await crearTicketProcedimiento(form)
      navigate(`/tickets/${ticketId}`)
    } catch (err) {
      setErrorForm(mensajeError(err))
      setGuardando(false)
    }
  }

  const filtrados = tickets.filter((t) => {
    const tipoOk = filtroTipo === 'todos' || t.ticket_procedimientos?.tipo === filtroTipo
    const estadoOk =
      filtroEstado === 'todos' ||
      (filtroEstado === 'abiertos' ? t.estado !== 'cerrado' : t.estado === filtroEstado)
    return tipoOk && estadoOk
  })

  const set = (campo) => (e) =>
    setForm({ ...form, [campo]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  return (
    <div>
      <PageHeader
        title="Altas y bajas"
        subtitle="Usuarios y equipos que entran o salen de la red del cliente (procedimiento PRO-TI-001)."
        action={
          <Button
            onClick={() => {
              setMostrarForm((v) => !v)
              setErrorForm('')
            }}
            variant={mostrarForm ? 'outline' : 'primary'}
          >
            {mostrarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {mostrarForm ? 'Cancelar' : 'Nueva alta/baja'}
          </Button>
        }
      />

      {mostrarForm && clientes.length === 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Todavía no hay clientes cargados.{' '}
          <Link to="/clientes" className="font-medium underline">
            Creá el primer cliente acá →
          </Link>
        </div>
      )}

      {mostrarForm && clientes.length > 0 && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crearProcedimiento} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldGroup label="Procedimiento">
                <Select value={form.tipo} onChange={set('tipo')}>
                  {TIPOS_PROCEDIMIENTO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup label="Cliente">
                <Select required value={form.cliente_id} onChange={set('cliente_id')}>
                  <option value="">Seleccioná un cliente…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700 md:col-span-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.cliente_tiene_ad} onChange={set('cliente_tiene_ad')} />
                  El cliente tiene dominio Active Directory
                </label>
                {form.tipo === 'baja_usuario' && (
                  <label className="flex items-center gap-2 font-medium text-red-700">
                    <input type="checkbox" checked={form.baja_inmediata} onChange={set('baja_inmediata')} />
                    Baja inmediata (despido o riesgo): prioridad urgente y aviso a los admins
                  </label>
                )}
              </div>

              {usaPersona(form.tipo) && (
                <>
                  <FieldGroup label="Nombre completo de la persona">
                    <Input value={form.persona_nombre} onChange={set('persona_nombre')} />
                  </FieldGroup>
                  <FieldGroup label="Usuario o correo" hint="(opcional)">
                    <Input value={form.persona_usuario} onChange={set('persona_usuario')} placeholder="jperez" />
                  </FieldGroup>
                </>
              )}

              {usaEquipo(form.tipo) && (
                <>
                  <FieldGroup label="Nombre del equipo">
                    <Input value={form.equipo_nombre} onChange={set('equipo_nombre')} placeholder="ONYX-NB-007" />
                  </FieldGroup>
                  <FieldGroup label="N° de serie">
                    <Input value={form.equipo_serie} onChange={set('equipo_serie')} />
                  </FieldGroup>
                  <FieldGroup
                    label="Ítem de inventario"
                    hint={form.tipo === 'alta_equipo' ? '(pasa a Asignado al cerrar)' : '(pasa a Dado de baja al cerrar)'}
                    className="md:col-span-2"
                  >
                    <Select value={form.inventario_item_id} onChange={set('inventario_item_id')}>
                      <option value="">Sin vincular</option>
                      {inventario.map((i) => (
                        <option key={i.id} value={i.id}>
                          {[i.nombre, i.marca, i.modelo].filter(Boolean).join(' · ')}
                        </option>
                      ))}
                    </Select>
                  </FieldGroup>
                </>
              )}

              <FieldGroup label="Fecha y hora efectiva" hint={form.baja_inmediata ? '' : '(opcional)'}>
                <Input type="datetime-local" value={form.fecha_efectiva} onChange={set('fecha_efectiva')} />
              </FieldGroup>

              {esBaja(form.tipo) && (
                <FieldGroup label="Días de retención antes de eliminar">
                  <Input type="number" min="0" max="365" value={form.retencion_dias} onChange={set('retencion_dias')} />
                </FieldGroup>
              )}

              {form.tipo === 'baja_equipo' && (
                <FieldGroup label="Destino del equipo" hint="(se puede definir después)">
                  <Select value={form.destino_equipo} onChange={set('destino_equipo')}>
                    <option value="">Definir después</option>
                    {DESTINOS_EQUIPO.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>
              )}

              {isAdmin && tecnicos.length > 0 && (
                <FieldGroup label="Técnicos asignados" hint="(el primero marcado queda como responsable)" className="md:col-span-2">
                  <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm text-slate-700">
                    {tecnicos.map((t) => (
                      <label key={t.id} className="flex items-center gap-2">
                        <input type="checkbox" checked={form.tecnicos.includes(t.id)} onChange={() => alternarTecnico(t.id)} />
                        {t.nombre_completo}
                      </label>
                    ))}
                  </div>
                </FieldGroup>
              )}

              <FieldGroup label="Título" hint="(opcional, se genera solo)" className="md:col-span-2">
                <Input value={form.titulo} onChange={set('titulo')} placeholder={procedimientoLabel(form.tipo) + ': …'} />
              </FieldGroup>

              <FieldGroup label="Observaciones" hint="(opcional)" className="md:col-span-2">
                <Textarea rows={2} value={form.descripcion} onChange={set('descripcion')} />
              </FieldGroup>

              {errorForm && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{errorForm}</p>
              )}

              <div className="md:col-span-2">
                <Button type="submit" variant="accent" loading={guardando}>
                  {guardando ? 'Creando…' : 'Crear ticket con checklist'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <FilterPills
        opciones={[{ value: 'todos', label: 'Todos los procedimientos' }, ...TIPOS_PROCEDIMIENTO]}
        valor={filtroTipo}
        onChange={setFiltroTipo}
      />
      <FilterPills
        opciones={[
          { value: 'abiertos', label: 'Abiertos' },
          { value: 'todos', label: 'Todos los estados' },
          ...ESTADOS.map((e) => ({ value: e, label: estadoLabel('procedimiento', e) })),
        ]}
        valor={filtroEstado}
        onChange={setFiltroEstado}
      />

      {loading ? (
        <PageLoading label="Cargando altas y bajas…" />
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No hay procedimientos para este filtro"
          description="Probá con otro filtro, o abrí una nueva alta o baja."
        />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Código</Th>
              <Th>Procedimiento</Th>
              <Th>Persona / equipo</Th>
              <Th>Cliente</Th>
              <Th>Estado</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtrados.map((t) => {
              const p = t.ticket_procedimientos
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <Td>
                    <Link to={`/tickets/${t.id}`} className="font-medium text-cyan-700 hover:text-cyan-800">
                      {t.codigo}
                    </Link>
                  </Td>
                  <Td>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {p && <Badge tono={TIPO_TONO[p.tipo]}>{procedimientoLabel(p.tipo)}</Badge>}
                      {p?.baja_inmediata && <Badge tono="red">Inmediata</Badge>}
                    </span>
                  </Td>
                  <Td className="text-slate-700">{p?.persona_nombre || p?.equipo_nombre || '—'}</Td>
                  <Td className="text-slate-600">{t.clientes?.nombre}</Td>
                  <Td>
                    <Badge tono={ESTADO_TONO[t.estado]}>{estadoLabel('procedimiento', t.estado)}</Badge>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </Table>
      )}

      {isAdmin && <SeguimientosProgramados />}
    </div>
  )
}

// Eliminaciones definitivas agendadas al cerrar una baja. pg_cron las convierte
// en tickets cada mañana; el botón sirve si no se activó pg_cron (migración 031).
function SeguimientosProgramados() {
  const [filas, setFilas] = useState([])
  const [generando, setGenerando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    try {
      setFilas(await listarSeguimientos())
    } catch (e) {
      console.error(e)
    }
  }

  async function generar() {
    setGenerando(true)
    setMensaje('')
    try {
      const creados = await generarSeguimientosVencidos()
      setMensaje(creados ? `Se crearon ${creados} ticket(s) de seguimiento.` : 'No había seguimientos vencidos.')
      cargar()
    } catch (e) {
      setMensaje(mensajeError(e))
    } finally {
      setGenerando(false)
    }
  }

  const ahora = Date.now()

  return (
    <Card className="mt-8">
      <CardHeader
        title="Seguimientos programados"
        subtitle="Eliminación definitiva de cuentas y equipos al vencer la retención."
        action={
          <Button size="sm" variant="outline" onClick={generar} loading={generando}>
            <CalendarClock className="h-3.5 w-3.5" />
            Generar vencidos ahora
          </Button>
        }
      />
      <CardBody>
        {mensaje && <p className="mb-3 text-sm text-slate-600">{mensaje}</p>}
        {filas.length === 0 ? (
          <p className="text-sm text-slate-400">No hay seguimientos programados.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filas.map((f) => {
              const vencido = !f.ticket_generado_id && new Date(f.fecha_programada).getTime() <= ahora
              return (
                <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-slate-700">
                    {f.titulo}{' '}
                    <Link to={`/tickets/${f.ticket_origen_id}`} className="text-xs text-cyan-700 hover:text-cyan-800">
                      ({f.origen?.codigo})
                    </Link>
                  </span>
                  {f.ticket_generado_id ? (
                    <Link to={`/tickets/${f.ticket_generado_id}`} className="text-xs font-medium text-cyan-700 hover:text-cyan-800">
                      Ticket {f.generado?.codigo}
                    </Link>
                  ) : (
                    <Badge tono={vencido ? 'red' : 'slate'}>
                      {vencido ? 'Vencido' : 'Vence'} {new Date(f.fecha_programada).toLocaleDateString('es-PY')}
                    </Badge>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}

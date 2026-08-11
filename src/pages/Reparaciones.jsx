import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ESTADOS, estadoLabel, TIPO_EQUIPO_LABEL } from '../lib/estados'

const PRIORIDADES = ['baja', 'media', 'alta', 'urgente']

const ESTADO_BADGE = {
  nuevo: 'bg-cyan-100 text-cyan-800',
  en_progreso: 'bg-amber-100 text-amber-800',
  esperando_cliente: 'bg-purple-100 text-purple-800',
  resuelto: 'bg-emerald-100 text-emerald-800',
  cerrado: 'bg-slate-200 text-slate-600',
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

    // 1) El ticket en sí: mismo motor que soporte, con tipo "reparacion"
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

    // 2) La ficha del equipo, enganchada 1 a 1 con el ticket recién creado
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-800">Reparaciones</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          {mostrarForm ? 'Cancelar' : '+ Recibir equipo'}
        </button>
      </div>

      {mostrarForm && clientes.length === 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Todavía no hay clientes cargados, así que no se puede recibir un equipo.{' '}
          <Link to="/clientes" className="font-medium underline">
            Creá el primer cliente acá →
          </Link>
        </div>
      )}

      {mostrarForm && clientes.length > 0 && (
        <form
          onSubmit={crearReparacion}
          className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2"
        >
          <p className="text-xs font-semibold uppercase text-slate-500 md:col-span-2">
            Datos del cliente y del problema
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cliente</label>
            <select
              required
              value={form.cliente_id}
              onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccioná un cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Prioridad</label>
            <select
              value={form.prioridad}
              onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {PRIORIDADES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Problema reportado por el cliente
            </label>
            <textarea
              required
              value={form.problema_reportado}
              onChange={(e) => setForm({ ...form, problema_reportado: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Ej: no enciende, pantalla rota, no imprime en color…"
            />
          </div>

          <p className="mt-2 text-xs font-semibold uppercase text-slate-500 md:col-span-2">
            Datos del equipo
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de equipo</label>
            <select
              value={form.tipo_equipo}
              onChange={(e) => setForm({ ...form, tipo_equipo: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(TIPO_EQUIPO_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">N° de serie</label>
            <input
              value={form.numero_serie}
              onChange={(e) => setForm({ ...form, numero_serie: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Marca</label>
            <input
              value={form.marca}
              onChange={(e) => setForm({ ...form, marca: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Modelo</label>
            <input
              value={form.modelo}
              onChange={(e) => setForm({ ...form, modelo: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Accesorios entregados
            </label>
            <input
              value={form.accesorios_entregados}
              onChange={(e) => setForm({ ...form, accesorios_entregados: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ej: cargador, mouse, funda"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Estado del equipo al recibirlo
            </label>
            <textarea
              value={form.estado_al_recibir}
              onChange={(e) => setForm({ ...form, estado_al_recibir: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={2}
              placeholder="Ej: golpes en la tapa, pantalla con línea vertical, sin batería"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Presupuesto estimado (Gs.)
            </label>
            <input
              type="number"
              min="0"
              value={form.presupuesto_estimado}
              onChange={(e) => setForm({ ...form, presupuesto_estimado: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Opcional, se puede cargar después"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Fecha estimada de entrega
            </label>
            <input
              type="date"
              value={form.fecha_estimada_entrega}
              onChange={(e) => setForm({ ...form, fecha_estimada_entrega: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Garantía (días tras la entrega)
            </label>
            <input
              type="number"
              min="0"
              value={form.garantia_dias}
              onChange={(e) => setForm({ ...form, garantia_dias: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Registrar ingreso del equipo'}
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setFiltroEstado('todos')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            filtroEstado === 'todos' ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Todos
        </button>
        {ESTADOS.map((estado) => (
          <button
            key={estado}
            onClick={() => setFiltroEstado(estado)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filtroEstado === estado ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {estadoLabel('reparacion', estado)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando reparaciones…</p>
      ) : filtradas.length === 0 ? (
        <p className="text-slate-500">No hay equipos para este filtro.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Equipo</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Entrega estimada</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.map((r) => {
                const equipo = r.equipos_reparacion
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/tickets/${r.id}`} className="font-medium text-cyan-700">
                        {r.codigo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {equipo ? (
                        <>
                          {TIPO_EQUIPO_LABEL[equipo.tipo_equipo]}
                          {(equipo.marca || equipo.modelo) && (
                            <span className="text-slate-400">
                              {' '}
                              — {equipo.marca} {equipo.modelo}
                            </span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{r.clientes?.nombre}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {equipo?.fecha_estimada_entrega
                        ? new Date(equipo.fecha_estimada_entrega).toLocaleDateString('es-PY')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${ESTADO_BADGE[r.estado]}`}
                      >
                        {estadoLabel('reparacion', r.estado)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

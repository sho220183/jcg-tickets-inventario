import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const ESTADOS = ['nuevo', 'en_progreso', 'esperando_cliente', 'resuelto', 'cerrado']
const PRIORIDADES = ['baja', 'media', 'alta', 'urgente']

const ESTADO_BADGE = {
  nuevo: 'bg-cyan-100 text-cyan-800',
  en_progreso: 'bg-amber-100 text-amber-800',
  esperando_cliente: 'bg-purple-100 text-purple-800',
  resuelto: 'bg-emerald-100 text-emerald-800',
  cerrado: 'bg-slate-200 text-slate-600',
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-800">Tickets</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo ticket'}
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={crearTicket}
          className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cliente</label>
            <select
              required
              value={nuevoTicket.cliente_id}
              onChange={(e) => setNuevoTicket({ ...nuevoTicket, cliente_id: e.target.value })}
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
              value={nuevoTicket.prioridad}
              onChange={(e) => setNuevoTicket({ ...nuevoTicket, prioridad: e.target.value })}
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
            <input
              required
              value={nuevoTicket.titulo}
              onChange={(e) => setNuevoTicket({ ...nuevoTicket, titulo: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ej: No conecta a internet"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
            <textarea
              value={nuevoTicket.descripcion}
              onChange={(e) => setNuevoTicket({ ...nuevoTicket, descripcion: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Crear ticket
            </button>
          </div>
        </form>
      )}

      <div className="mb-4 flex gap-2">
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
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              filtroEstado === estado ? 'bg-navy-700 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {estado.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando tickets…</p>
      ) : ticketsFiltrados.length === 0 ? (
        <p className="text-slate-500">No hay tickets para este filtro.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Prioridad</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ticketsFiltrados.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/tickets/${t.id}`} className="font-medium text-cyan-700">
                      {t.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{t.titulo}</td>
                  <td className="px-4 py-3 text-slate-600">{t.clientes?.nombre}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{t.prioridad}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${ESTADO_BADGE[t.estado]}`}
                    >
                      {t.estado.replace('_', ' ')}
                    </span>
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

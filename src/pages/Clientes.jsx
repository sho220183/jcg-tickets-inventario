import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const VACIO = {
  nombre: '',
  contacto_nombre: '',
  telefono: '',
  email: '',
  direccion: '',
  notas: '',
}

export default function Clientes() {
  const { isAdmin } = useAuth()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(VACIO)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargarClientes()
  }, [])

  async function cargarClientes() {
    setLoading(true)
    const { data, error } = await supabase.from('clientes').select('*').order('nombre')
    if (error) console.error(error)
    setClientes(data ?? [])
    setLoading(false)
  }

  function abrirNuevo() {
    setForm(VACIO)
    setEditandoId(null)
    setMostrarForm(true)
  }

  function abrirEdicion(cliente) {
    setForm({
      nombre: cliente.nombre ?? '',
      contacto_nombre: cliente.contacto_nombre ?? '',
      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      direccion: cliente.direccion ?? '',
      notas: cliente.notas ?? '',
    })
    setEditandoId(cliente.id)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()

    if (editandoId) {
      const { error } = await supabase.from('clientes').update(form).eq('id', editandoId)
      if (error) {
        alert('No se pudo actualizar el cliente: ' + error.message)
        return
      }
    } else {
      const { error } = await supabase.from('clientes').insert(form)
      if (error) {
        alert('No se pudo crear el cliente: ' + error.message)
        return
      }
    }

    setMostrarForm(false)
    setForm(VACIO)
    setEditandoId(null)
    cargarClientes()
  }

  async function eliminar(cliente) {
    const confirmado = confirm(
      `¿Eliminar a "${cliente.nombre}"? Esto va a fallar si tiene tickets o inventario asociado.`
    )
    if (!confirmado) return

    const { error } = await supabase.from('clientes').delete().eq('id', cliente.id)
    if (error) {
      alert(
        'No se pudo eliminar: probablemente tiene tickets o inventario vinculado. Detalle: ' +
          error.message
      )
      return
    }
    cargarClientes()
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-800">Clientes</h1>
        <button
          onClick={mostrarForm ? () => setMostrarForm(false) : abrirNuevo}
          className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo cliente'}
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nombre / Razón social
            </label>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ej: Farmacia San Roque"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Persona de contacto
            </label>
            <input
              value={form.contacto_nombre}
              onChange={(e) => setForm({ ...form, contacto_nombre: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="0981123456"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email <span className="font-normal text-slate-400">(para notificaciones)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
            <input
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Notas</label>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              {editandoId ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </form>
      )}

      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar cliente por nombre…"
        className="mb-4 w-full max-w-sm rounded-md border border-slate-300 px-3 py-2 text-sm"
      />

      {loading ? (
        <p className="text-slate-500">Cargando clientes…</p>
      ) : clientesFiltrados.length === 0 ? (
        <p className="text-slate-500">
          {clientes.length === 0
            ? 'Todavía no hay clientes cargados. Creá el primero arriba.'
            : 'Ningún cliente coincide con la búsqueda.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientesFiltrados.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-navy-800">{c.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{c.contacto_nombre || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.telefono || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => abrirEdicion(c)}
                      className="mr-3 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                    >
                      Editar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => eliminar(c)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Eliminar
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

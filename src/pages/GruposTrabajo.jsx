import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function GruposTrabajo() {
  const { isAdmin } = useAuth()
  const [grupos, setGrupos] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [clientes, setClientes] = useState([])
  const [miembrosPorGrupo, setMiembrosPorGrupo] = useState({}) // { grupo_id: [profile_id, ...] }
  const [clientesPorGrupo, setClientesPorGrupo] = useState({}) // { grupo_id: [cliente_id, ...] }
  const [grupoAbierto, setGrupoAbierto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaDescripcion, setNuevaDescripcion] = useState('')

  useEffect(() => {
    cargarTodo()
  }, [])

  async function cargarTodo() {
    setLoading(true)
    const [{ data: g }, { data: p }, { data: c }, { data: gm }, { data: gc }] = await Promise.all([
      supabase.from('grupos_trabajo').select('*').order('nombre'),
      supabase.from('profiles').select('id, nombre_completo').order('nombre_completo'),
      supabase.from('clientes').select('id, nombre').order('nombre'),
      supabase.from('grupo_miembros').select('grupo_id, profile_id'),
      supabase.from('grupo_clientes').select('grupo_id, cliente_id'),
    ])

    setGrupos(g ?? [])
    setTecnicos(p ?? [])
    setClientes(c ?? [])

    const mPorGrupo = {}
    ;(gm ?? []).forEach((row) => {
      mPorGrupo[row.grupo_id] = [...(mPorGrupo[row.grupo_id] ?? []), row.profile_id]
    })
    setMiembrosPorGrupo(mPorGrupo)

    const cPorGrupo = {}
    ;(gc ?? []).forEach((row) => {
      cPorGrupo[row.grupo_id] = [...(cPorGrupo[row.grupo_id] ?? []), row.cliente_id]
    })
    setClientesPorGrupo(cPorGrupo)

    setLoading(false)
  }

  async function crearGrupo(e) {
    e.preventDefault()
    if (!nuevoNombre.trim()) return

    const { error } = await supabase
      .from('grupos_trabajo')
      .insert({ nombre: nuevoNombre.trim(), descripcion: nuevaDescripcion.trim() || null })

    if (error) {
      alert('No se pudo crear el grupo: ' + error.message)
      return
    }

    setNuevoNombre('')
    setNuevaDescripcion('')
    cargarTodo()
  }

  async function eliminarGrupo(grupo) {
    if (!confirm(`¿Eliminar el grupo "${grupo.nombre}"?`)) return
    const { error } = await supabase.from('grupos_trabajo').delete().eq('id', grupo.id)
    if (error) {
      alert('No se pudo eliminar: ' + error.message)
      return
    }
    cargarTodo()
  }

  async function toggleMiembro(grupoId, profileId) {
    const yaEsta = (miembrosPorGrupo[grupoId] ?? []).includes(profileId)

    if (yaEsta) {
      await supabase
        .from('grupo_miembros')
        .delete()
        .eq('grupo_id', grupoId)
        .eq('profile_id', profileId)
    } else {
      await supabase.from('grupo_miembros').insert({ grupo_id: grupoId, profile_id: profileId })
    }
    cargarTodo()
  }

  async function toggleCliente(grupoId, clienteId) {
    const yaEsta = (clientesPorGrupo[grupoId] ?? []).includes(clienteId)

    if (yaEsta) {
      await supabase
        .from('grupo_clientes')
        .delete()
        .eq('grupo_id', grupoId)
        .eq('cliente_id', clienteId)
    } else {
      await supabase.from('grupo_clientes').insert({ grupo_id: grupoId, cliente_id: clienteId })
    }
    cargarTodo()
  }

  if (!isAdmin) {
    return <p className="text-slate-500">Esta sección es solo para administradores.</p>
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-navy-800">Grupos de trabajo</h1>
      <p className="mb-6 text-sm text-slate-500">
        Un grupo le da a todos sus miembros (técnicos) visibilidad sobre todos los tickets de
        los clientes que tenga asignados, sin necesidad de asignación individual por ticket.
      </p>

      <form
        onSubmit={crearGrupo}
        className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-3"
      >
        <input
          required
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre del grupo (ej: Equipo Redes)"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-1"
        />
        <input
          value={nuevaDescripcion}
          onChange={(e) => setNuevaDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-1"
        />
        <button
          type="submit"
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 md:col-span-1"
        >
          + Crear grupo
        </button>
      </form>

      {loading ? (
        <p className="text-slate-500">Cargando grupos…</p>
      ) : grupos.length === 0 ? (
        <p className="text-slate-500">Todavía no hay grupos de trabajo creados.</p>
      ) : (
        <div className="space-y-3">
          {grupos.map((grupo) => {
            const abierto = grupoAbierto === grupo.id
            const miembros = miembrosPorGrupo[grupo.id] ?? []
            const clientesDelGrupo = clientesPorGrupo[grupo.id] ?? []

            return (
              <div key={grupo.id} className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between px-5 py-4">
                  <button
                    onClick={() => setGrupoAbierto(abierto ? null : grupo.id)}
                    className="text-left"
                  >
                    <p className="font-medium text-navy-800">{grupo.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {miembros.length} técnico(s) · {clientesDelGrupo.length} cliente(s)
                      {grupo.descripcion ? ` · ${grupo.descripcion}` : ''}
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGrupoAbierto(abierto ? null : grupo.id)}
                      className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                    >
                      {abierto ? 'Cerrar' : 'Gestionar'}
                    </button>
                    <button
                      onClick={() => eliminarGrupo(grupo)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {abierto && (
                  <div className="grid grid-cols-1 gap-6 border-t border-slate-100 p-5 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                        Técnicos del grupo
                      </p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {tecnicos.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={miembros.includes(t.id)}
                              onChange={() => toggleMiembro(grupo.id, t.id)}
                            />
                            {t.nombre_completo}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                        Clientes que ve este grupo
                      </p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {clientes.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={clientesDelGrupo.includes(c.id)}
                              onChange={() => toggleCliente(grupo.id, c.id)}
                            />
                            {c.nombre}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

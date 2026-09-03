import { useEffect, useState } from 'react'
import { ChevronDown, Plus, Trash2, Users2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { Input } from '../components/ui/Field'
import { cn } from '../lib/cn'

export default function GruposTrabajo() {
  const { isAdmin } = useAuth()
  const [grupos, setGrupos] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [clientes, setClientes] = useState([])
  const [miembrosPorGrupo, setMiembrosPorGrupo] = useState({})
  const [clientesPorGrupo, setClientesPorGrupo] = useState({})
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
      await supabase.from('grupo_miembros').delete().eq('grupo_id', grupoId).eq('profile_id', profileId)
    } else {
      await supabase.from('grupo_miembros').insert({ grupo_id: grupoId, profile_id: profileId })
    }
    cargarTodo()
  }

  async function toggleCliente(grupoId, clienteId) {
    const yaEsta = (clientesPorGrupo[grupoId] ?? []).includes(clienteId)

    if (yaEsta) {
      await supabase.from('grupo_clientes').delete().eq('grupo_id', grupoId).eq('cliente_id', clienteId)
    } else {
      await supabase.from('grupo_clientes').insert({ grupo_id: grupoId, cliente_id: clienteId })
    }
    cargarTodo()
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={Users2}
        title="Sección solo para administradores"
        description="No tenés permisos para ver esta pantalla."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Grupos de trabajo"
        subtitle="Un grupo le da a todos sus miembros (técnicos) visibilidad sobre todos los tickets de los clientes que tenga asignados, sin necesidad de asignación individual por ticket."
      />

      <Card className="mb-6">
        <CardBody>
          <form onSubmit={crearGrupo} className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              required
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre del grupo (ej: Equipo Redes)"
            />
            <Input
              value={nuevaDescripcion}
              onChange={(e) => setNuevaDescripcion(e.target.value)}
              placeholder="Descripción (opcional)"
            />
            <Button type="submit" variant="accent">
              <Plus className="h-4 w-4" />
              Crear grupo
            </Button>
          </form>
        </CardBody>
      </Card>

      {loading ? (
        <PageLoading label="Cargando grupos…" />
      ) : grupos.length === 0 ? (
        <EmptyState icon={Users2} title="Todavía no hay grupos de trabajo creados" />
      ) : (
        <div className="space-y-3">
          {grupos.map((grupo) => {
            const abierto = grupoAbierto === grupo.id
            const miembros = miembrosPorGrupo[grupo.id] ?? []
            const clientesDelGrupo = clientesPorGrupo[grupo.id] ?? []

            return (
              <Card key={grupo.id}>
                <div className="flex items-center justify-between px-5 py-4">
                  <button onClick={() => setGrupoAbierto(abierto ? null : grupo.id)} className="text-left">
                    <p className="font-medium text-navy-800">{grupo.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {miembros.length} técnico(s) · {clientesDelGrupo.length} cliente(s)
                      {grupo.descripcion ? ` · ${grupo.descripcion}` : ''}
                    </p>
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setGrupoAbierto(abierto ? null : grupo.id)}
                      className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                    >
                      {abierto ? 'Cerrar' : 'Gestionar'}
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-180')} />
                    </button>
                    <button
                      onClick={() => eliminarGrupo(grupo)}
                      className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </div>
                </div>

                {abierto && (
                  <div className="grid grid-cols-1 gap-6 border-t border-slate-100 p-5 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Técnicos del grupo
                      </p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {tecnicos.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 text-sm text-slate-600">
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
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Clientes que ve este grupo
                      </p>
                      <div className="max-h-48 space-y-1 overflow-y-auto">
                        {clientes.map((c) => (
                          <label key={c.id} className="flex items-center gap-2 text-sm text-slate-600">
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
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

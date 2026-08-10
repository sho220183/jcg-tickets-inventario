import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Tecnicos() {
  const { isAdmin } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({ nombre_completo: '', ci: '', telefono: '', rol: 'tecnico', activo: true })

  useEffect(() => {
    cargarPerfiles()
  }, [])

  async function cargarPerfiles() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('nombre_completo')
    if (error) console.error(error)
    setPerfiles(data ?? [])
    setLoading(false)
  }

  function abrirEdicion(perfil) {
    setForm({
      nombre_completo: perfil.nombre_completo ?? '',
      ci: perfil.ci ?? '',
      telefono: perfil.telefono ?? '',
      rol: perfil.rol,
      activo: perfil.activo,
    })
    setEditandoId(perfil.id)
  }

  async function guardar(e) {
    e.preventDefault()
    const payload = { ...form, ci: form.ci.trim() === '' ? null : form.ci.trim() }

    const { error } = await supabase.from('profiles').update(payload).eq('id', editandoId)
    if (error) {
      alert(
        error.code === '23505'
          ? 'Esa Cédula (CI) ya está registrada en otro técnico.'
          : 'No se pudo guardar: ' + error.message
      )
      return
    }
    setEditandoId(null)
    cargarPerfiles()
  }

  if (!isAdmin) {
    return <p className="text-slate-500">Esta sección es solo para administradores.</p>
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-navy-800">Técnicos</h1>
      <p className="mb-6 text-sm text-slate-500">
        Los usuarios se crean desde Supabase (Authentication → Users). Acá completás su Cédula
        (CI), rol y estado una vez que ya iniciaron sesión al menos una vez.
      </p>

      {loading ? (
        <p className="text-slate-500">Cargando técnicos…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">CI</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perfiles.map((p) =>
                editandoId === p.id ? (
                  <tr key={p.id} className="bg-cyan-50">
                    <td className="px-4 py-3">
                      <input
                        value={form.nombre_completo}
                        onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={form.ci}
                        maxLength={15}
                        placeholder="CI"
                        onChange={(e) => setForm({ ...form, ci: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={form.rol}
                        onChange={(e) => setForm({ ...form, rol: e.target.value })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="tecnico">tecnico</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={form.activo}
                          onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                        />
                        Activo
                      </label>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        onClick={guardar}
                        className="mr-3 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditandoId(null)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700"
                      >
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-navy-800">{p.nombre_completo}</td>
                    <td className="px-4 py-3 text-slate-600">{p.ci || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{p.telefono || '—'}</td>
                    <td className="px-4 py-3 capitalize text-slate-600">{p.rol}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          p.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => abrirEdicion(p)}
                        className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

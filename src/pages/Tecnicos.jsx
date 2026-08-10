import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const VACIO_FORM = {
  nombre_completo: '',
  ci: '',
  telefono: '',
  rol: 'tecnico',
  activo: true,
  notificar_email: true,
  notificar_whatsapp: false,
}

export default function Tecnicos() {
  const { isAdmin } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(VACIO_FORM)

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
      notificar_email: perfil.notificar_email ?? true,
      notificar_whatsapp: perfil.notificar_whatsapp ?? false,
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
        Los usuarios se crean desde Supabase (Authentication → Users). El email se toma
        automáticamente de su cuenta. Acá completás su Cédula (CI), teléfono, rol, y por qué
        medios querés que se les notifique cuando se les asigna un ticket o cambia de estado.
      </p>

      {loading ? (
        <p className="text-slate-500">Cargando técnicos…</p>
      ) : (
        <div className="space-y-3">
          {perfiles.map((p) =>
            editandoId === p.id ? (
              <form
                key={p.id}
                onSubmit={guardar}
                className="grid grid-cols-1 gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-5 md:grid-cols-2"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
                  <input
                    value={form.nombre_completo}
                    onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email <span className="font-normal text-slate-400">(de su cuenta, no editable)</span>
                  </label>
                  <input
                    value={p.email ?? ''}
                    disabled
                    className="w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">CI</label>
                  <input
                    value={form.ci}
                    maxLength={15}
                    placeholder="Cédula de identidad"
                    onChange={(e) => setForm({ ...form, ci: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Teléfono <span className="font-normal text-slate-400">(usado para WhatsApp)</span>
                  </label>
                  <input
                    value={form.telefono}
                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="0981123456"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Rol</label>
                  <select
                    value={form.rol}
                    onChange={(e) => setForm({ ...form, rol: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="tecnico">tecnico</option>
                    <option value="admin">admin</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.activo}
                      onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                    />
                    Activo
                  </label>
                </div>

                <div className="md:col-span-2">
                  <p className="mb-1 text-sm font-medium text-slate-700">Notificar por</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.notificar_email}
                        onChange={(e) => setForm({ ...form, notificar_email: e.target.checked })}
                      />
                      Email
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.notificar_whatsapp}
                        onChange={(e) => setForm({ ...form, notificar_whatsapp: e.target.checked })}
                      />
                      WhatsApp
                    </label>
                  </div>
                  {form.notificar_whatsapp && !form.telefono && (
                    <p className="mt-1 text-xs text-amber-600">
                      Falta cargar el teléfono para poder notificar por WhatsApp.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="mr-3 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditandoId(null)}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium text-navy-800">
                    {p.nombre_completo}{' '}
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className="ml-2 rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium capitalize text-navy-700">
                      {p.rol}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    CI: {p.ci || '—'} · {p.email || 'sin email'} · Tel: {p.telefono || '—'}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Notifica por:{' '}
                    {[p.notificar_email && 'Email', p.notificar_whatsapp && 'WhatsApp']
                      .filter(Boolean)
                      .join(' y ') || 'ninguno'}
                  </p>
                </div>
                <button
                  onClick={() => abrirEdicion(p)}
                  className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                >
                  Editar
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

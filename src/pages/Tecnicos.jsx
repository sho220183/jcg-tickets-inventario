import { useEffect, useState } from 'react'
import { CheckCircle2, Eye, EyeOff, Pencil, Plus, Shuffle, UserCog, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { FieldGroup, Input, Select } from '../components/ui/Field'

const VACIO_FORM = {
  nombre_completo: '',
  ci: '',
  telefono: '',
  rol: 'tecnico',
  activo: true,
  notificar_email: true,
  notificar_whatsapp: false,
}

const VACIO_ALTA = {
  nombre_completo: '',
  email: '',
  rol: 'tecnico',
  password: '',
}

function generarPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  let resultado = ''
  for (let i = 0; i < 12; i++) {
    resultado += chars[Math.floor(Math.random() * chars.length)]
  }
  return resultado
}

export default function Tecnicos() {
  const { isAdmin } = useAuth()
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState(VACIO_FORM)

  const [mostrarAlta, setMostrarAlta] = useState(false)
  const [alta, setAlta] = useState(VACIO_ALTA)
  const [creando, setCreando] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [usuarioCreado, setUsuarioCreado] = useState(null)

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

  async function crearUsuario(e) {
    e.preventDefault()
    setCreando(true)
    setUsuarioCreado(null)

    const { data, error } = await supabase.functions.invoke('create-user', {
      body: alta,
    })

    setCreando(false)

    if (error || !data?.success) {
      alert('No se pudo crear el usuario: ' + (data?.error ?? error?.message ?? 'error desconocido'))
      return
    }

    setUsuarioCreado({ email: alta.email, password: alta.password, nombre: alta.nombre_completo })
    setAlta(VACIO_ALTA)
    setMostrarAlta(false)
    cargarPerfiles()
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
    return (
      <EmptyState
        icon={UserCog}
        title="Sección solo para administradores"
        description="No tenés permisos para ver esta pantalla."
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Técnicos"
        subtitle="Creá el usuario acá abajo, o completá su Cédula (CI), teléfono y preferencias de notificación en cualquiera de los perfiles ya existentes."
        action={
          <Button onClick={() => setMostrarAlta((v) => !v)} variant={mostrarAlta ? 'outline' : 'primary'}>
            {mostrarAlta ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {mostrarAlta ? 'Cancelar' : 'Nuevo técnico'}
          </Button>
        }
      />

      {usuarioCreado && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="mb-2 flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Usuario creado para {usuarioCreado.nombre} — pasale estos datos para que inicie sesión:
          </p>
          <p>
            Email: <span className="font-mono">{usuarioCreado.email}</span>
          </p>
          <p>
            Contraseña temporal: <span className="font-mono">{usuarioCreado.password}</span>
          </p>
          <p className="mt-2 text-xs text-emerald-700">
            Este dato no se vuelve a mostrar — copialo ahora. Recomendale que la cambie apenas
            entre (todavía no hay pantalla de "cambiar contraseña" en el sistema, así que por
            ahora se la volvés a generar vos si la pierde).
          </p>
          <button
            onClick={() => setUsuarioCreado(null)}
            className="mt-2 text-xs font-medium text-emerald-700 underline"
          >
            Ocultar
          </button>
        </div>
      )}

      {mostrarAlta && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crearUsuario} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldGroup label="Nombre completo">
                <Input
                  required
                  value={alta.nombre_completo}
                  onChange={(e) => setAlta({ ...alta, nombre_completo: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Email">
                <Input
                  type="email"
                  required
                  value={alta.email}
                  onChange={(e) => setAlta({ ...alta, email: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Rol">
                <Select value={alta.rol} onChange={(e) => setAlta({ ...alta, rol: e.target.value })}>
                  <option value="tecnico">tecnico</option>
                  <option value="admin">admin</option>
                </Select>
              </FieldGroup>

              <FieldGroup label="Contraseña temporal">
                <div className="flex gap-2">
                  <Input
                    type={mostrarPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={alta.password}
                    onChange={(e) => setAlta({ ...alta, password: e.target.value })}
                    placeholder="Mínimo 8 caracteres"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setAlta({ ...alta, password: generarPassword() })}
                    title="Generar contraseña segura"
                  >
                    <Shuffle className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => setMostrarPassword((v) => !v)}
                    title={mostrarPassword ? 'Ocultar' : 'Ver'}
                  >
                    {mostrarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </FieldGroup>

              <div className="md:col-span-2">
                <Button type="submit" variant="accent" loading={creando}>
                  {creando ? 'Creando…' : 'Crear usuario'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <PageLoading label="Cargando técnicos…" />
      ) : (
        <div className="space-y-3">
          {perfiles.map((p) =>
            editandoId === p.id ? (
              <Card key={p.id} className="border-cyan-200 bg-cyan-50/40">
                <CardBody>
                  <form onSubmit={guardar} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldGroup label="Nombre">
                      <Input
                        value={form.nombre_completo}
                        onChange={(e) => setForm({ ...form, nombre_completo: e.target.value })}
                      />
                    </FieldGroup>

                    <FieldGroup label="Email" hint="(de su cuenta, no editable)">
                      <Input value={p.email ?? ''} disabled />
                    </FieldGroup>

                    <FieldGroup label="CI">
                      <Input
                        value={form.ci}
                        maxLength={15}
                        placeholder="Cédula de identidad"
                        onChange={(e) => setForm({ ...form, ci: e.target.value })}
                      />
                    </FieldGroup>

                    <FieldGroup label="Teléfono" hint="(usado para WhatsApp)">
                      <Input
                        value={form.telefono}
                        onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                        placeholder="0981123456"
                      />
                    </FieldGroup>

                    <FieldGroup label="Rol">
                      <Select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                        <option value="tecnico">tecnico</option>
                        <option value="admin">admin</option>
                      </Select>
                    </FieldGroup>

                    <div className="flex items-end">
                      <label className="flex items-center gap-2 text-sm text-slate-600">
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
                        <label className="flex items-center gap-2 text-sm text-slate-600">
                          <input
                            type="checkbox"
                            checked={form.notificar_email}
                            onChange={(e) => setForm({ ...form, notificar_email: e.target.checked })}
                          />
                          Email
                        </label>
                        <label className="flex items-center gap-2 text-sm text-slate-600">
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

                    <div className="flex items-center gap-3 md:col-span-2">
                      <Button type="submit" variant="accent">
                        Guardar
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setEditandoId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>
            ) : (
              <Card key={p.id}>
                <CardBody className="flex items-center justify-between">
                  <div>
                    <p className="flex flex-wrap items-center gap-2 font-medium text-navy-800">
                      {p.nombre_completo}
                      <Badge tono={p.activo ? 'emerald' : 'slate'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
                      <Badge tono="navy" className="capitalize">
                        {p.rol}
                      </Badge>
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
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                </CardBody>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  )
}

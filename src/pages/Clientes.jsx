import { useEffect, useState } from 'react'
import { Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Table, { Td, Th } from '../components/ui/Table'
import { PageLoading } from '../components/ui/Spinner'
import { FieldGroup, Input, Textarea } from '../components/ui/Field'

const VACIO = {
  nombre: '',
  ruc: '',
  contacto_nombre: '',
  telefono: '',
  email: '',
  direccion: '',
  notas: '',
  notificar_email: true,
  notificar_whatsapp: false,
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
      ruc: cliente.ruc ?? '',
      contacto_nombre: cliente.contacto_nombre ?? '',
      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      direccion: cliente.direccion ?? '',
      notas: cliente.notas ?? '',
      notificar_email: cliente.notificar_email ?? true,
      notificar_whatsapp: cliente.notificar_whatsapp ?? false,
    })
    setEditandoId(cliente.id)
    setMostrarForm(true)
  }

  async function guardar(e) {
    e.preventDefault()

    const payload = { ...form, ruc: form.ruc.trim() === '' ? null : form.ruc.trim() }

    if (editandoId) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', editandoId)
      if (error) {
        alert(
          error.code === '23505'
            ? 'Ese RUC ya está registrado en otro cliente.'
            : 'No se pudo actualizar el cliente: ' + error.message
        )
        return
      }
    } else {
      const { error } = await supabase.from('clientes').insert(payload)
      if (error) {
        alert(
          error.code === '23505'
            ? 'Ese RUC ya está registrado en otro cliente.'
            : 'No se pudo crear el cliente: ' + error.message
        )
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

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.ruc ?? '').toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Empresas y personas a las que les brindás soporte."
        action={
          <Button onClick={mostrarForm ? () => setMostrarForm(false) : abrirNuevo} variant={mostrarForm ? 'outline' : 'primary'}>
            {mostrarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {mostrarForm ? 'Cancelar' : 'Nuevo cliente'}
          </Button>
        }
      />

      {mostrarForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={guardar} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldGroup label="Nombre / Razón social">
                <Input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Farmacia San Roque"
                />
              </FieldGroup>

              <FieldGroup label="RUC" hint="(ej: 3769383-2)">
                <Input
                  value={form.ruc}
                  maxLength={15}
                  onChange={(e) => setForm({ ...form, ruc: e.target.value })}
                  placeholder="3769383-2"
                />
              </FieldGroup>

              <FieldGroup label="Persona de contacto">
                <Input
                  value={form.contacto_nombre}
                  onChange={(e) => setForm({ ...form, contacto_nombre: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Teléfono">
                <Input
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="0981123456"
                />
              </FieldGroup>

              <FieldGroup label="Email" hint="(para notificaciones)">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Dirección" className="md:col-span-2">
                <Input
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Notas" className="md:col-span-2">
                <Textarea
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={2}
                />
              </FieldGroup>

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

              <div className="md:col-span-2">
                <Button type="submit" variant="accent">
                  {editandoId ? 'Guardar cambios' : 'Crear cliente'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o RUC…"
          className="pl-9"
        />
      </div>

      {loading ? (
        <PageLoading label="Cargando clientes…" />
      ) : clientesFiltrados.length === 0 ? (
        <EmptyState
          icon={Users}
          title={clientes.length === 0 ? 'Todavía no hay clientes cargados' : 'Ningún cliente coincide con la búsqueda'}
          description={clientes.length === 0 ? 'Creá el primero con el botón de arriba.' : undefined}
        />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th>Nombre</Th>
              <Th>RUC</Th>
              <Th>Contacto</Th>
              <Th>Teléfono</Th>
              <Th>Email</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clientesFiltrados.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td className="font-medium text-navy-800">{c.nombre}</Td>
                <Td className="text-slate-600">{c.ruc || '—'}</Td>
                <Td className="text-slate-600">{c.contacto_nombre || '—'}</Td>
                <Td className="text-slate-600">{c.telefono || '—'}</Td>
                <Td className="text-slate-600">{c.email || '—'}</Td>
                <Td className="text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => abrirEdicion(c)}
                      className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => eliminar(c)}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  )
}

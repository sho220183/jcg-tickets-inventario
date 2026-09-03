import { useEffect, useState } from 'react'
import { ChevronDown, Package, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { PageLoading } from '../components/ui/Spinner'
import { FieldGroup, Input, Select } from '../components/ui/Field'
import { cn } from '../lib/cn'

const TIPO_LABEL = {
  entrada: 'Entrada (reposición)',
  salida: 'Salida (uso en ticket)',
  asignacion: 'Asignación',
  devolucion: 'Devolución',
  ajuste: 'Ajuste manual',
}

const TIPO_COLOR = {
  entrada: 'text-emerald-700',
  devolucion: 'text-emerald-700',
  salida: 'text-red-700',
  asignacion: 'text-red-700',
  ajuste: 'text-slate-600',
}

export default function Inventario() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [nuevoItem, setNuevoItem] = useState({
    nombre: '',
    marca: '',
    modelo: '',
    categoria_id: '',
    cantidad_stock: 0,
    cantidad_minima: 0,
    ubicacion: 'Depósito',
  })

  const [itemAbierto, setItemAbierto] = useState(null)
  const [movimientosPorItem, setMovimientosPorItem] = useState({})
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false)
  const [reponerCantidad, setReponerCantidad] = useState(1)
  const [reponerNotas, setReponerNotas] = useState('')

  useEffect(() => {
    cargarItems()
    cargarCategorias()
  }, [])

  async function cargarItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventario_items')
      .select('*, inventario_categorias ( nombre )')
      .order('nombre')

    if (error) console.error(error)
    setItems(data ?? [])
    setLoading(false)
  }

  async function cargarCategorias() {
    const { data } = await supabase.from('inventario_categorias').select('id, nombre').order('nombre')
    setCategorias(data ?? [])
  }

  async function crearItem(e) {
    e.preventDefault()
    const { error } = await supabase.from('inventario_items').insert({
      ...nuevoItem,
      cantidad_stock: Number(nuevoItem.cantidad_stock),
      cantidad_minima: Number(nuevoItem.cantidad_minima),
      categoria_id: nuevoItem.categoria_id || null,
    })

    if (error) {
      alert('No se pudo crear el ítem: ' + error.message)
      return
    }

    setNuevoItem({
      nombre: '',
      marca: '',
      modelo: '',
      categoria_id: '',
      cantidad_stock: 0,
      cantidad_minima: 0,
      ubicacion: 'Depósito',
    })
    setMostrarForm(false)
    cargarItems()
  }

  async function toggleItem(itemId) {
    if (itemAbierto === itemId) {
      setItemAbierto(null)
      return
    }
    setItemAbierto(itemId)
    setReponerCantidad(1)
    setReponerNotas('')
    if (!movimientosPorItem[itemId]) {
      await cargarMovimientos(itemId)
    }
  }

  async function cargarMovimientos(itemId) {
    setCargandoMovimientos(true)
    const { data, error } = await supabase
      .from('inventario_movimientos')
      .select('id, tipo, cantidad, notas, created_at, profiles ( nombre_completo ), tickets ( codigo )')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    setMovimientosPorItem((prev) => ({ ...prev, [itemId]: data ?? [] }))
    setCargandoMovimientos(false)
  }

  async function reponerStock(itemId) {
    if (reponerCantidad < 1) return

    const { error } = await supabase.from('inventario_movimientos').insert({
      item_id: itemId,
      tipo: 'entrada',
      cantidad: reponerCantidad,
      usuario_id: user.id,
      notas: reponerNotas.trim() || 'Reposición de stock',
    })

    if (error) {
      alert('No se pudo reponer el stock: ' + error.message)
      return
    }

    setReponerCantidad(1)
    setReponerNotas('')
    await cargarItems()
    await cargarMovimientos(itemId)
  }

  return (
    <div>
      <PageHeader
        title="Inventario"
        subtitle="Stock de equipos e insumos disponibles."
        action={
          <Button onClick={() => setMostrarForm((v) => !v)} variant={mostrarForm ? 'outline' : 'primary'}>
            {mostrarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {mostrarForm ? 'Cancelar' : 'Nuevo ítem'}
          </Button>
        }
      />

      {mostrarForm && (
        <Card className="mb-6">
          <CardBody>
            <form onSubmit={crearItem} className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FieldGroup label="Nombre" className="md:col-span-2">
                <Input
                  required
                  value={nuevoItem.nombre}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, nombre: e.target.value })}
                  placeholder="Ej: Cámara IP exterior 4MP"
                />
              </FieldGroup>

              <FieldGroup label="Categoría">
                <Select
                  value={nuevoItem.categoria_id}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, categoria_id: e.target.value })}
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </FieldGroup>

              <FieldGroup label="Marca">
                <Input value={nuevoItem.marca} onChange={(e) => setNuevoItem({ ...nuevoItem, marca: e.target.value })} />
              </FieldGroup>

              <FieldGroup label="Modelo">
                <Input value={nuevoItem.modelo} onChange={(e) => setNuevoItem({ ...nuevoItem, modelo: e.target.value })} />
              </FieldGroup>

              <FieldGroup label="Stock inicial">
                <Input
                  type="number"
                  min="0"
                  value={nuevoItem.cantidad_stock}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad_stock: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Stock mínimo">
                <Input
                  type="number"
                  min="0"
                  value={nuevoItem.cantidad_minima}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad_minima: e.target.value })}
                />
              </FieldGroup>

              <FieldGroup label="Ubicación">
                <Input
                  value={nuevoItem.ubicacion}
                  onChange={(e) => setNuevoItem({ ...nuevoItem, ubicacion: e.target.value })}
                />
              </FieldGroup>

              <div className="md:col-span-3">
                <Button type="submit" variant="accent">
                  Guardar ítem
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <PageLoading label="Cargando inventario…" />
      ) : items.length === 0 ? (
        <EmptyState icon={Package} title="Todavía no hay ítems en el inventario" />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const bajo = item.cantidad_stock <= item.cantidad_minima
            const abierto = itemAbierto === item.id
            const movimientos = movimientosPorItem[item.id] ?? []

            return (
              <Card key={item.id} className="overflow-hidden">
                <button
                  onClick={() => toggleItem(item.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-medium text-navy-800">{item.nombre}</p>
                    <p className="text-xs text-slate-400">
                      {item.inventario_categorias?.nombre ?? 'Sin categoría'} · {item.ubicacion}
                      {(item.marca || item.modelo) && ` · ${item.marca ?? ''} ${item.modelo ?? ''}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn('text-sm font-medium', bajo ? 'text-red-600' : 'text-slate-700')}>
                      {item.cantidad_stock} / mín. {item.cantidad_minima}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-cyan-700">
                      {abierto ? 'Ocultar' : 'Reponer / historial'}
                      <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', abierto && 'rotate-180')} />
                    </span>
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <div className="mb-4 flex flex-wrap items-end gap-2">
                      <FieldGroup label="Reponer cantidad">
                        <Input
                          type="number"
                          min={1}
                          value={reponerCantidad}
                          onChange={(e) => setReponerCantidad(Number(e.target.value))}
                          className="w-28"
                        />
                      </FieldGroup>
                      <FieldGroup label="Notas" hint="(opcional)" className="flex-1">
                        <Input
                          value={reponerNotas}
                          onChange={(e) => setReponerNotas(e.target.value)}
                          placeholder="Ej: compra a proveedor XYZ, factura 001-234"
                        />
                      </FieldGroup>
                      <Button onClick={() => reponerStock(item.id)} variant="accent">
                        <Plus className="h-4 w-4" />
                        Reponer stock
                      </Button>
                    </div>

                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Historial de movimientos (reporte de uso)
                    </p>

                    {cargandoMovimientos ? (
                      <p className="text-sm text-slate-400">Cargando historial…</p>
                    ) : movimientos.length === 0 ? (
                      <p className="text-sm text-slate-400">Todavía no hay movimientos registrados.</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full min-w-[560px] text-xs">
                          <thead className="bg-slate-50 text-left uppercase text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Fecha</th>
                              <th className="px-3 py-2">Tipo</th>
                              <th className="px-3 py-2">Cantidad</th>
                              <th className="px-3 py-2">Ticket</th>
                              <th className="px-3 py-2">Usuario</th>
                              <th className="px-3 py-2">Notas</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {movimientos.map((m) => (
                              <tr key={m.id}>
                                <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                                  {new Date(m.created_at).toLocaleString('es-PY')}
                                </td>
                                <td className={cn('px-3 py-2 font-medium', TIPO_COLOR[m.tipo])}>
                                  {TIPO_LABEL[m.tipo] ?? m.tipo}
                                </td>
                                <td className="px-3 py-2">{m.cantidad}</td>
                                <td className="px-3 py-2 text-cyan-700">{m.tickets?.codigo ?? '—'}</td>
                                <td className="px-3 py-2 text-slate-600">{m.profiles?.nombre_completo ?? '—'}</td>
                                <td className="px-3 py-2 text-slate-500">{m.notas ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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

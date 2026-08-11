import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

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
  const [movimientosPorItem, setMovimientosPorItem] = useState({}) // { item_id: [...] }
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-navy-800">Inventario</h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo ítem'}
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={crearItem}
          className="mb-6 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-3"
        >
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              required
              value={nuevoItem.nombre}
              onChange={(e) => setNuevoItem({ ...nuevoItem, nombre: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ej: Cámara IP exterior 4MP"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Categoría</label>
            <select
              value={nuevoItem.categoria_id}
              onChange={(e) => setNuevoItem({ ...nuevoItem, categoria_id: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Sin categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Marca</label>
            <input
              value={nuevoItem.marca}
              onChange={(e) => setNuevoItem({ ...nuevoItem, marca: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Modelo</label>
            <input
              value={nuevoItem.modelo}
              onChange={(e) => setNuevoItem({ ...nuevoItem, modelo: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Stock inicial</label>
            <input
              type="number"
              min="0"
              value={nuevoItem.cantidad_stock}
              onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad_stock: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Stock mínimo</label>
            <input
              type="number"
              min="0"
              value={nuevoItem.cantidad_minima}
              onChange={(e) => setNuevoItem({ ...nuevoItem, cantidad_minima: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ubicación</label>
            <input
              value={nuevoItem.ubicacion}
              onChange={(e) => setNuevoItem({ ...nuevoItem, ubicacion: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
            >
              Guardar ítem
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-slate-500">Cargando inventario…</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const bajo = item.cantidad_stock <= item.cantidad_minima
            const abierto = itemAbierto === item.id
            const movimientos = movimientosPorItem[item.id] ?? []

            return (
              <div key={item.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
                    <span className={`text-sm font-medium ${bajo ? 'text-red-600' : 'text-slate-700'}`}>
                      {item.cantidad_stock} / mín. {item.cantidad_minima}
                    </span>
                    <span className="text-xs font-medium text-cyan-700">
                      {abierto ? 'Ocultar' : 'Reponer / historial'}
                    </span>
                  </div>
                </button>

                {abierto && (
                  <div className="border-t border-slate-100 bg-slate-50 p-4">
                    <div className="mb-4 flex flex-wrap items-end gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Reponer cantidad
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={reponerCantidad}
                          onChange={(e) => setReponerCantidad(Number(e.target.value))}
                          className="w-28 rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-xs font-medium text-slate-700">
                          Notas <span className="font-normal text-slate-400">(opcional)</span>
                        </label>
                        <input
                          value={reponerNotas}
                          onChange={(e) => setReponerNotas(e.target.value)}
                          placeholder="Ej: compra a proveedor XYZ, factura 001-234"
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        onClick={() => reponerStock(item.id)}
                        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        + Reponer stock
                      </button>
                    </div>

                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      Historial de movimientos (reporte de uso)
                    </p>

                    {cargandoMovimientos ? (
                      <p className="text-sm text-slate-400">Cargando historial…</p>
                    ) : movimientos.length === 0 ? (
                      <p className="text-sm text-slate-400">Todavía no hay movimientos registrados.</p>
                    ) : (
                      <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 bg-white">
                        <table className="w-full text-xs">
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
                                <td className={`px-3 py-2 font-medium ${TIPO_COLOR[m.tipo]}`}>
                                  {TIPO_LABEL[m.tipo] ?? m.tipo}
                                </td>
                                <td className="px-3 py-2">{m.cantidad}</td>
                                <td className="px-3 py-2 text-cyan-700">{m.tickets?.codigo ?? '—'}</td>
                                <td className="px-3 py-2 text-slate-600">
                                  {m.profiles?.nombre_completo ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-slate-500">{m.notas ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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

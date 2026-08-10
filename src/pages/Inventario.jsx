import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Inventario() {
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
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Ubicación</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const bajo = item.cantidad_stock <= item.cantidad_minima
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-navy-800">{item.nombre}</p>
                      {(item.marca || item.modelo) && (
                        <p className="text-xs text-slate-400">
                          {item.marca} {item.modelo}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.inventario_categorias?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.ubicacion}</td>
                    <td className={`px-4 py-3 font-medium ${bajo ? 'text-red-600' : 'text-slate-700'}`}>
                      {item.cantidad_stock} / mín. {item.cantidad_minima}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {item.estado.replace('_', ' ')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

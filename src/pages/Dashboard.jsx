import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { ESTADOS, estadoLabel } from '../lib/estados'

export default function Dashboard() {
  const [conteosSoporte, setConteosSoporte] = useState({})
  const [conteosReparacion, setConteosReparacion] = useState({})
  const [stockBajo, setStockBajo] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarResumen()
  }, [])

  async function cargarResumen() {
    setLoading(true)

    const { data: tickets } = await supabase.from('tickets').select('estado, tipo')

    const soporte = Object.fromEntries(ESTADOS.map((e) => [e, 0]))
    const reparacion = Object.fromEntries(ESTADOS.map((e) => [e, 0]))

    tickets?.forEach((t) => {
      const destino = t.tipo === 'reparacion' ? reparacion : soporte
      destino[t.estado] = (destino[t.estado] ?? 0) + 1
    })

    setConteosSoporte(soporte)
    setConteosReparacion(reparacion)

    // Ítems por debajo de su cantidad mínima
    const { data: items } = await supabase
      .from('inventario_items')
      .select('id, nombre, cantidad_stock, cantidad_minima')
    setStockBajo((items ?? []).filter((i) => i.cantidad_stock <= i.cantidad_minima))

    setLoading(false)
  }

  if (loading) return <p className="text-slate-500">Cargando resumen…</p>

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-navy-800">Dashboard</h1>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-800">Tickets de soporte</h2>
          <Link to="/tickets" className="text-xs font-medium text-cyan-700 hover:text-cyan-800">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {ESTADOS.map((estado) => (
            <div key={estado} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-2xl font-semibold text-navy-700">{conteosSoporte[estado] ?? 0}</p>
              <p className="text-xs text-slate-500">{estadoLabel('soporte', estado)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy-800">Reparaciones (taller)</h2>
          <Link to="/reparaciones" className="text-xs font-medium text-cyan-700 hover:text-cyan-800">
            Ver todas →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {ESTADOS.map((estado) => (
            <div key={estado} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-2xl font-semibold text-navy-700">{conteosReparacion[estado] ?? 0}</p>
              <p className="text-xs text-slate-500">{estadoLabel('reparacion', estado)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-navy-800">Alertas de stock bajo</h2>
        {stockBajo.length === 0 ? (
          <p className="text-sm text-slate-500">Todo el inventario está por encima del mínimo.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {stockBajo.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span>{item.nombre}</span>
                <span className="font-medium text-red-600">
                  {item.cantidad_stock} / mín. {item.cantidad_minima}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/inventario"
          className="mt-3 inline-block text-xs font-medium text-cyan-700 hover:text-cyan-800"
        >
          Ver inventario completo →
        </Link>
      </div>
    </div>
  )
}

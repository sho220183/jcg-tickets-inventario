import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, PackageCheck, Ticket, Wrench } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { ESTADOS, estadoLabel } from '../lib/estados'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import StatCard from '../components/ui/StatCard'
import { PageLoading } from '../components/ui/Spinner'
import Button from '../components/ui/Button'

const TONO_ESTADO = {
  nuevo: 'cyan',
  en_progreso: 'amber',
  esperando_cliente: 'purple',
  resuelto: 'emerald',
  cerrado: 'slate',
}

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

    const { data: items } = await supabase
      .from('inventario_items')
      .select('id, nombre, cantidad_stock, cantidad_minima')
    setStockBajo((items ?? []).filter((i) => i.cantidad_stock <= i.cantidad_minima))

    setLoading(false)
  }

  if (loading) return <PageLoading label="Cargando resumen…" />

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general de soporte, reparaciones e inventario." />

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Ticket className="h-4 w-4 text-slate-400" />
            Tickets de soporte
          </h2>
          <Link to="/tickets" className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {ESTADOS.map((estado) => (
            <StatCard
              key={estado}
              value={conteosSoporte[estado] ?? 0}
              label={estadoLabel('soporte', estado)}
              tono={TONO_ESTADO[estado]}
            />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
            <Wrench className="h-4 w-4 text-slate-400" />
            Reparaciones (taller)
          </h2>
          <Link to="/reparaciones" className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {ESTADOS.map((estado) => (
            <StatCard
              key={estado}
              value={conteosReparacion[estado] ?? 0}
              label={estadoLabel('reparacion', estado)}
              tono={TONO_ESTADO[estado]}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader
          title="Alertas de stock bajo"
          subtitle={stockBajo.length > 0 ? `${stockBajo.length} ítem(s) por debajo del mínimo` : undefined}
        />
        <CardBody>
          {stockBajo.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Todo el inventario está por encima del mínimo.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {stockBajo.map((item) => (
                <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {item.nombre}
                  </span>
                  <span className="font-medium text-red-600">
                    {item.cantidad_stock} / mín. {item.cantidad_minima}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Button as={Link} to="/inventario" variant="link" size="sm" className="mt-3">
            <PackageCheck className="h-3.5 w-3.5" />
            Ver inventario completo
          </Button>
        </CardBody>
      </Card>
    </div>
  )
}

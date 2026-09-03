import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Clock, FileDown, FileSpreadsheet, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import { PageLoading } from '../components/ui/Spinner'
import Table, { Th, Td } from '../components/ui/Table'
import EmptyState from '../components/ui/EmptyState'
import FilterPills from '../components/ui/FilterPills'
import Button from '../components/ui/Button'
import { cn } from '../lib/cn'

const RANGOS = [
  { value: 3, label: 'Últimos 3 meses' },
  { value: 6, label: 'Últimos 6 meses' },
  { value: 12, label: 'Últimos 12 meses' },
]

// Redondea a un texto legible: "2 h", "1 día 4 h", "3 días"
function formatearDuracion(horas) {
  if (horas == null) return '—'
  if (horas < 1) return '< 1 h'
  if (horas < 24) return `${Math.round(horas)} h`
  const dias = Math.floor(horas / 24)
  const resto = Math.round(horas % 24)
  return resto > 0 ? `${dias} día${dias === 1 ? '' : 's'} ${resto} h` : `${dias} día${dias === 1 ? '' : 's'}`
}

function calcularPorMes(tickets, meses) {
  const bloques = []
  const hoy = new Date()
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    bloques.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('es-PY', { month: 'short', year: '2-digit' }),
      soporte: 0,
      reparacion: 0,
    })
  }
  const mapa = Object.fromEntries(bloques.map((b) => [b.key, b]))
  tickets.forEach((t) => {
    const d = new Date(t.created_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bloque = mapa[key]
    if (!bloque) return
    if (t.tipo === 'reparacion') bloque.reparacion += 1
    else bloque.soporte += 1
  })
  return bloques
}

function calcularTiempoResolucion(tickets, eventos) {
  const primerResuelto = {}
  eventos
    .filter((e) => e.estado_nuevo === 'resuelto')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((e) => {
      if (!(e.ticket_id in primerResuelto)) primerResuelto[e.ticket_id] = e.created_at
    })

  const horasPorTipo = { soporte: [], reparacion: [] }
  tickets.forEach((t) => {
    const resueltoEn = primerResuelto[t.id]
    if (!resueltoEn) return
    const horas = (new Date(resueltoEn) - new Date(t.created_at)) / 36e5
    if (horas < 0) return
    horasPorTipo[t.tipo === 'reparacion' ? 'reparacion' : 'soporte'].push(horas)
  })

  const promedio = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
  return {
    soporte: { promedioHoras: promedio(horasPorTipo.soporte), cantidad: horasPorTipo.soporte.length },
    reparacion: { promedioHoras: promedio(horasPorTipo.reparacion), cantidad: horasPorTipo.reparacion.length },
  }
}

function calcularRankingTecnicos(tickets, asignaciones, perfiles) {
  const ticketsPorId = Object.fromEntries(tickets.map((t) => [t.id, t]))
  const nombrePorId = Object.fromEntries(perfiles.map((p) => [p.id, p.nombre_completo]))

  const conteo = {}
  asignaciones.forEach((a) => {
    const t = ticketsPorId[a.ticket_id]
    if (!t) return
    if (t.estado === 'resuelto' || t.estado === 'cerrado') {
      conteo[a.profile_id] = (conteo[a.profile_id] ?? 0) + 1
    }
  })

  return Object.entries(conteo)
    .map(([profileId, cantidad]) => ({
      profileId,
      nombre: nombrePorId[profileId] ?? 'Técnico eliminado',
      cantidad,
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

function fechaArchivo() {
  return new Date().toISOString().slice(0, 10)
}

export default function Reportes() {
  const { isAdmin } = useAuth()
  const [rangoMeses, setRangoMeses] = useState(6)
  const [tickets, setTickets] = useState([])
  const [eventos, setEventos] = useState([])
  const [asignaciones, setAsignaciones] = useState([])
  const [perfiles, setPerfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(null) // 'excel' | 'pdf' | null

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    const [ticketsRes, eventosRes, asignacionesRes, perfilesRes] = await Promise.all([
      supabase.from('tickets').select('id, tipo, estado, created_at, closed_at'),
      supabase.from('ticket_eventos').select('ticket_id, estado_nuevo, created_at').eq('tipo', 'cambio_estado'),
      supabase.from('ticket_tecnicos').select('ticket_id, profile_id'),
      supabase.from('profiles').select('id, nombre_completo, rol'),
    ])
    setTickets(ticketsRes.data ?? [])
    setEventos(eventosRes.data ?? [])
    setAsignaciones(asignacionesRes.data ?? [])
    setPerfiles(perfilesRes.data ?? [])
    setLoading(false)
  }

  const porMes = useMemo(() => calcularPorMes(tickets, rangoMeses), [tickets, rangoMeses])
  const tiempoResolucion = useMemo(() => calcularTiempoResolucion(tickets, eventos), [tickets, eventos])
  const ranking = useMemo(() => calcularRankingTecnicos(tickets, asignaciones, perfiles), [tickets, asignaciones, perfiles])

  const maxMes = Math.max(1, ...porMes.map((b) => b.soporte + b.reparacion))
  const maxRanking = Math.max(1, ...ranking.map((r) => r.cantidad))

  async function exportarExcel() {
    setExportando('excel')
    try {
      const writeExcelFile = (await import('write-excel-file/browser')).default
      const negrita = { fontWeight: 'bold', backgroundColor: '#eef2f7' }

      const sheets = [
        {
          sheet: 'Tickets por mes',
          data: [
            [{ value: 'Mes', ...negrita }, { value: 'Soporte', ...negrita }, { value: 'Reparación', ...negrita }, { value: 'Total', ...negrita }],
            ...porMes.map((b) => [
              { value: b.label },
              { value: b.soporte, type: Number },
              { value: b.reparacion, type: Number },
              { value: b.soporte + b.reparacion, type: Number },
            ]),
          ],
        },
        {
          sheet: 'Tiempo de resolución',
          data: [
            [{ value: 'Tipo', ...negrita }, { value: 'Tickets resueltos', ...negrita }, { value: 'Promedio', ...negrita }],
            [
              { value: 'Soporte' },
              { value: tiempoResolucion.soporte.cantidad, type: Number },
              { value: formatearDuracion(tiempoResolucion.soporte.promedioHoras) },
            ],
            [
              { value: 'Reparación' },
              { value: tiempoResolucion.reparacion.cantidad, type: Number },
              { value: formatearDuracion(tiempoResolucion.reparacion.promedioHoras) },
            ],
          ],
        },
        {
          sheet: 'Técnicos',
          data: [
            [{ value: '#', ...negrita }, { value: 'Técnico', ...negrita }, { value: 'Tickets resueltos/cerrados', ...negrita }],
            ...ranking.map((r, i) => [{ value: i + 1, type: Number }, { value: r.nombre }, { value: r.cantidad, type: Number }]),
          ],
        },
      ]

      await writeExcelFile(sheets).toFile(`reporte-jcg-${fechaArchivo()}.xlsx`)
    } catch (err) {
      console.error('Error exportando a Excel:', err)
      alert('No se pudo generar el archivo Excel. Intentá de nuevo.')
    } finally {
      setExportando(null)
    }
  }

  async function exportarPDF() {
    setExportando('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      const { autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF()
      doc.setFontSize(16)
      doc.text('JCG Infotech — Reporte', 14, 16)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Generado el ${new Date().toLocaleDateString('es-PY')}`, 14, 22)

      autoTable(doc, {
        startY: 28,
        head: [['Mes', 'Soporte', 'Reparación', 'Total']],
        body: porMes.map((b) => [b.label, b.soporte, b.reparacion, b.soporte + b.reparacion]),
        headStyles: { fillColor: [30, 58, 84] },
      })

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Tiempo de resolución', 'Tickets resueltos', 'Promedio']],
        body: [
          ['Soporte', tiempoResolucion.soporte.cantidad, formatearDuracion(tiempoResolucion.soporte.promedioHoras)],
          ['Reparación', tiempoResolucion.reparacion.cantidad, formatearDuracion(tiempoResolucion.reparacion.promedioHoras)],
        ],
        headStyles: { fillColor: [30, 58, 84] },
      })

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['#', 'Técnico', 'Tickets resueltos/cerrados']],
        body: ranking.map((r, i) => [i + 1, r.nombre, r.cantidad]),
        headStyles: { fillColor: [30, 58, 84] },
      })

      doc.save(`reporte-jcg-${fechaArchivo()}.pdf`)
    } catch (err) {
      console.error('Error exportando a PDF:', err)
      alert('No se pudo generar el archivo PDF. Intentá de nuevo.')
    } finally {
      setExportando(null)
    }
  }

  if (!isAdmin) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sección solo para administradores"
        description="No tenés permisos para ver esta pantalla."
      />
    )
  }

  if (loading) return <PageLoading label="Cargando reportes…" />

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Tickets por mes, tiempo de resolución y desempeño del equipo técnico."
        action={
          <>
            <Button variant="outline" size="sm" onClick={exportarExcel} loading={exportando === 'excel'}>
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={exportarPDF} loading={exportando === 'pdf'}>
              <FileDown className="h-3.5 w-3.5" />
              PDF
            </Button>
          </>
        }
      />

      <FilterPills opciones={RANGOS} valor={rangoMeses} onChange={setRangoMeses} />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tickets por mes" subtitle="Soporte vs. reparaciones creados por mes" />
          <CardBody>
            {tickets.length === 0 ? (
              <EmptyState icon={BarChart3} title="Todavía no hay tickets" description="Los reportes van a aparecer a medida que se creen tickets." />
            ) : (
              <div className="space-y-3">
                {porMes.map((b) => (
                  <div key={b.key}>
                    <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-medium capitalize text-slate-700">{b.label}</span>
                      <span>{b.soporte + b.reparacion} ticket(s)</span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
                      {b.soporte > 0 && (
                        <div
                          className="h-full bg-cyan-500"
                          style={{ width: `${(b.soporte / maxMes) * 100}%` }}
                          title={`Soporte: ${b.soporte}`}
                        />
                      )}
                      {b.reparacion > 0 && (
                        <div
                          className="h-full bg-navy-500"
                          style={{ width: `${(b.reparacion / maxMes) * 100}%` }}
                          title={`Reparación: ${b.reparacion}`}
                        />
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-4 pt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" /> Soporte
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-navy-500" /> Reparación
                  </span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tiempo de resolución" subtitle="Desde la creación hasta el primer cambio a “resuelto”" />
          <CardBody>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4 text-center">
                <Clock className="mx-auto h-4 w-4 text-cyan-500" />
                <p className="mt-2 text-xl font-semibold text-navy-800">
                  {formatearDuracion(tiempoResolucion.soporte.promedioHoras)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Soporte · {tiempoResolucion.soporte.cantidad} resuelto(s)
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4 text-center">
                <Clock className="mx-auto h-4 w-4 text-navy-500" />
                <p className="mt-2 text-xl font-semibold text-navy-800">
                  {formatearDuracion(tiempoResolucion.reparacion.promedioHoras)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Reparación · {tiempoResolucion.reparacion.cantidad} resuelto(s)
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Solo se cuentan los tickets que ya pasaron por el estado “resuelto” al menos una vez.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-navy-800">
          <Trophy className="h-4 w-4 text-slate-400" />
          Técnico más productivo
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">Tickets resueltos o cerrados por técnico asignado</p>
      </div>

      {ranking.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Todavía no hay datos"
          description="Vas a ver el ranking apenas se resuelvan o cierren tickets con técnico asignado."
        />
      ) : (
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <Th className="w-12">#</Th>
              <Th>Técnico</Th>
              <Th>Tickets resueltos/cerrados</Th>
              <Th className="w-40" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ranking.map((r, i) => (
              <tr key={r.profileId}>
                <Td className="font-medium text-slate-400">{i + 1}</Td>
                <Td className={cn('font-medium', i === 0 && 'text-navy-800')}>
                  {i === 0 && <Trophy className="mr-1.5 inline h-3.5 w-3.5 text-amber-500" />}
                  {r.nombre}
                </Td>
                <Td>{r.cantidad}</Td>
                <Td>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${(r.cantidad / maxRanking) * 100}%` }}
                    />
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

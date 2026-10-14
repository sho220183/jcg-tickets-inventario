import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ClipboardCheck, FileText, Paperclip, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/cn'
import {
  DESTINOS_EQUIPO,
  actualizarItem,
  actualizarProcedimiento,
  bloqueosDeCierre,
  cargarProcedimiento,
  esBaja,
  faltaEvidencia,
  mensajeError,
  procedimientoLabel,
  subirEvidencia,
  urlEvidencia,
} from '../../lib/procedimientos'
import Card, { CardBody, CardHeader } from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { FieldGroup, Input, Select, Textarea } from '../ui/Field'

// Checklist PRO-TI-001 dentro del detalle de un ticket de tipo "procedimiento".
// La base decide si se puede cerrar; este panel solo registra el avance y avisa antes.
export default function ChecklistProcedimiento({ ticketId, bloqueado }) {
  const { isAdmin } = useAuth()
  const [procedimiento, setProcedimiento] = useState(null)
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [guardandoId, setGuardandoId] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const datos = await cargarProcedimiento(ticketId)
      setProcedimiento(datos.procedimiento)
      setItems(datos.items)
      setError('')
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [ticketId])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function guardar(item, accion) {
    setGuardandoId(item.id)
    setError('')
    try {
      const actualizado = await accion()
      setItems((prev) => prev.map((i) => (i.id === actualizado.id ? actualizado : i)))
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setGuardandoId(null)
    }
  }

  async function guardarDestino(destino) {
    setError('')
    try {
      setProcedimiento(await actualizarProcedimiento(ticketId, { destino_equipo: destino || null }))
    } catch (e) {
      setError(mensajeError(e))
    }
  }

  const secciones = useMemo(() => {
    const mapa = new Map()
    items.forEach((item) => {
      if (!mapa.has(item.seccion)) mapa.set(item.seccion, [])
      mapa.get(item.seccion).push(item)
    })
    return [...mapa.entries()]
  }, [items])

  if (cargando) {
    return (
      <Card className="mb-6">
        <CardBody className="text-sm text-slate-400">Cargando checklist…</CardBody>
      </Card>
    )
  }
  if (!procedimiento) return null

  const resueltos = items.filter((i) => i.estado !== 'pendiente').length
  const porcentaje = items.length ? Math.round((resueltos / items.length) * 100) : 0
  const bloqueos = bloqueosDeCierre(procedimiento, items)
  const plantilla = procedimiento.checklist_plantillas

  return (
    <Card className="mb-6">
      <CardHeader
        title={`Checklist · ${procedimientoLabel(procedimiento.tipo)}`}
        subtitle={`${plantilla?.codigo} v${plantilla?.version} · ${resueltos} de ${items.length} ítems resueltos`}
        action={
          <div className="flex flex-wrap justify-end gap-1.5">
            {procedimiento.baja_inmediata && <Badge tono="red">Baja inmediata</Badge>}
            {!procedimiento.cliente_tiene_ad && <Badge tono="amber">Cliente sin AD</Badge>}
          </div>
        }
      />
      <CardBody className="space-y-5">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={cn('h-full transition-all', bloqueos.length ? 'bg-cyan-500' : 'bg-emerald-500')}
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        <DatosProcedimiento procedimiento={procedimiento} />

        {procedimiento.tipo === 'baja_equipo' && (
          <DestinoEquipo procedimiento={procedimiento} bloqueado={bloqueado} onGuardar={guardarDestino} />
        )}

        {!bloqueado &&
          (bloqueos.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Todavía no se puede cerrar el ticket: {bloqueos.join('; ')}.</span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Checklist completo: ya se puede cerrar el ticket.</span>
            </div>
          ))}

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {secciones.map(([seccion, lista]) => (
          <div key={seccion}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{seccion}</p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {lista.map((item) => (
                <ItemChecklist
                  key={item.id}
                  item={item}
                  bloqueado={bloqueado}
                  isAdmin={isAdmin}
                  guardando={guardandoId === item.id}
                  onGuardar={(cambios) => guardar(item, () => actualizarItem(item.id, cambios))}
                  onSubir={(archivo) => guardar(item, () => subirEvidencia(item, archivo))}
                  onError={setError}
                />
              ))}
            </ul>
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

function DatosProcedimiento({ procedimiento: p }) {
  const inventario = p.inventario_items
  const datos = [
    ['Persona', p.persona_nombre],
    ['Usuario', p.persona_usuario],
    ['Equipo', p.equipo_nombre],
    ['N° de serie', p.equipo_serie],
    ['Inventario', inventario && [inventario.nombre, inventario.marca, inventario.modelo].filter(Boolean).join(' ')],
    ['Fecha efectiva', p.fecha_efectiva && new Date(p.fecha_efectiva).toLocaleString('es-PY')],
    ['Retención', esBaja(p.tipo) ? `${p.retencion_dias} días` : null],
  ].filter(([, valor]) => valor)

  if (datos.length === 0) return null
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-3">
      {datos.map(([etiqueta, valor]) => (
        <p key={etiqueta}>
          <span className="text-slate-400">{etiqueta}:</span> {valor}
        </p>
      ))}
    </div>
  )
}

function DestinoEquipo({ procedimiento, bloqueado, onGuardar }) {
  const actual = DESTINOS_EQUIPO.find((d) => d.value === procedimiento.destino_equipo)
  return (
    <FieldGroup label="Destino del equipo" hint="(define el método mínimo de borrado)">
      <Select value={procedimiento.destino_equipo ?? ''} disabled={bloqueado} onChange={(e) => onGuardar(e.target.value)}>
        <option value="">Seleccioná el destino…</option>
        {DESTINOS_EQUIPO.map((d) => (
          <option key={d.value} value={d.value}>
            {d.label}
          </option>
        ))}
      </Select>
      {actual && <p className="mt-1.5 text-xs text-slate-500">Método mínimo de borrado: {actual.borrado}</p>}
    </FieldGroup>
  )
}

function ItemChecklist({ item, bloqueado, isAdmin, guardando, onGuardar, onSubir, onError }) {
  const [abierto, setAbierto] = useState(false)
  const [nota, setNota] = useState(item.evidencia_nota ?? '')
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false)
  const [motivo, setMotivo] = useState('')

  useEffect(() => setNota(item.evidencia_nota ?? ''), [item.evidencia_nota])

  const completado = item.estado === 'completado'
  const noAplica = item.estado === 'no_aplica'
  const sinEvidencia = faltaEvidencia(item)
  const tieneEvidencia = Boolean(item.evidencia_path || item.evidencia_nota)
  // Un crítico solo lo puede marcar "No aplica" un admin (la base también lo exige).
  const puedeNoAplica = !item.critico || isAdmin
  const deshabilitado = bloqueado || guardando

  async function abrirArchivo() {
    try {
      window.open(await urlEvidencia(item.evidencia_path), '_blank', 'noopener')
    } catch (e) {
      onError(mensajeError(e))
    }
  }

  return (
    <li className={cn('px-3 py-2.5', noAplica && 'bg-slate-50')}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          checked={completado}
          disabled={deshabilitado || noAplica}
          onChange={() => onGuardar({ estado: completado ? 'pendiente' : 'completado' })}
          aria-label={item.texto}
        />
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm', noAplica ? 'text-slate-400 line-through' : 'text-slate-800')}>{item.texto}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {item.critico && <Badge tono="navy">Crítico</Badge>}
            {item.solo_ad && <Badge>AD</Badge>}
            {sinEvidencia && <Badge tono="amber">Falta evidencia</Badge>}
            {noAplica && <span className="text-slate-500">No aplica: {item.motivo_no_aplica}</span>}
            {completado && item.completado_en && (
              <span className="text-slate-400">{new Date(item.completado_en).toLocaleString('es-PY')}</span>
            )}
            {!noAplica && (!bloqueado || tieneEvidencia) && (
              <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                className="flex items-center gap-1 font-medium text-cyan-700 hover:text-cyan-800"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {abierto ? 'Ocultar evidencia' : tieneEvidencia ? 'Ver evidencia' : 'Agregar evidencia'}
              </button>
            )}
            {!bloqueado && !noAplica && !completado && puedeNoAplica && (
              <button type="button" onClick={() => setPidiendoMotivo(true)} className="font-medium text-slate-500 hover:text-slate-700">
                No aplica
              </button>
            )}
            {!bloqueado && noAplica && puedeNoAplica && (
              <button
                type="button"
                onClick={() => onGuardar({ estado: 'pendiente' })}
                className="font-medium text-slate-500 hover:text-slate-700"
              >
                Volver a pendiente
              </button>
            )}
            {guardando && <span className="text-slate-400">Guardando…</span>}
          </div>

          {pidiendoMotivo && (
            <form
              className="mt-2 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!motivo.trim()) return
                onGuardar({ estado: 'no_aplica', motivo_no_aplica: motivo.trim() })
                setPidiendoMotivo(false)
                setMotivo('')
              }}
            >
              <Input
                className="min-w-[200px] flex-1"
                placeholder="Motivo (obligatorio)"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                autoFocus
              />
              <Button type="submit" size="sm">
                Guardar
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setPidiendoMotivo(false)}>
                Cancelar
              </Button>
            </form>
          )}

          {abierto && !noAplica && (
            <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
              <FieldGroup label="Dato verificable" hint="(serie, ID de clave BitLocker, lista de grupos…)">
                <Textarea
                  rows={2}
                  value={nota}
                  disabled={deshabilitado}
                  onChange={(e) => setNota(e.target.value)}
                  onBlur={() => nota !== (item.evidencia_nota ?? '') && onGuardar({ evidencia_nota: nota.trim() || null })}
                />
              </FieldGroup>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {item.evidencia_path && (
                  <button
                    type="button"
                    onClick={abrirArchivo}
                    className="flex items-center gap-1 font-medium text-cyan-700 hover:text-cyan-800"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Abrir archivo adjunto
                  </button>
                )}
                {!bloqueado && (
                  <label className="flex cursor-pointer items-center gap-1 font-medium text-cyan-700 hover:text-cyan-800">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    {item.evidencia_path ? 'Reemplazar archivo' : 'Adjuntar foto o PDF'}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                      disabled={deshabilitado}
                      onChange={(e) => {
                        const archivo = e.target.files?.[0]
                        e.target.value = ''
                        if (archivo) onSubir(archivo)
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

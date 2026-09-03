import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Images, Lock, Package, Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { ESTADOS, estadoLabel, TIPO_EQUIPO_LABEL } from '../lib/estados'
import Card, { CardBody, CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { FieldGroup, Input, Select, Textarea } from '../components/ui/Field'
import { PageLoading } from '../components/ui/Spinner'

const ESTADO_TONO = {
  nuevo: 'cyan',
  en_progreso: 'amber',
  esperando_cliente: 'purple',
  resuelto: 'emerald',
  cerrado: 'slate',
}

const BUCKET_FOTOS = 'ticket-fotos'
const FOTO_TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const FOTO_TAMANO_MAXIMO = 15 * 1024 * 1024 // 15 MB, igual que el límite del bucket en Supabase

export default function TicketDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [eventos, setEventos] = useState([])
  const [nota, setNota] = useState('')
  const [loading, setLoading] = useState(true)

  const [tecnicosAsignados, setTecnicosAsignados] = useState([])
  const [todosTecnicos, setTodosTecnicos] = useState([])
  const [agregandoTecnico, setAgregandoTecnico] = useState('')

  const [inventarioUsado, setInventarioUsado] = useState([])
  const [itemsDisponibles, setItemsDisponibles] = useState([])
  const [mostrarInventario, setMostrarInventario] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState('')
  const [cantidadUsar, setCantidadUsar] = useState(1)
  const [carritoInventario, setCarritoInventario] = useState([])
  const [guardandoCarrito, setGuardandoCarrito] = useState(false)

  const [equipo, setEquipo] = useState(null)
  const [editandoEquipo, setEditandoEquipo] = useState(false)
  const [formEquipo, setFormEquipo] = useState(null)
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)

  const [fotos, setFotos] = useState([])
  const [mostrarFotos, setMostrarFotos] = useState(false)
  const [descripcionFoto, setDescripcionFoto] = useState('')
  const [subiendoFotos, setSubiendoFotos] = useState(false)
  const [fotoAmpliada, setFotoAmpliada] = useState(null)

  useEffect(() => {
    cargarTicket()
    cargarEventos()
    cargarTecnicosAsignados()
    cargarInventarioUsado()
    cargarItemsDisponibles()
    cargarFotos()
    if (isAdmin) cargarTodosTecnicos()
  }, [id])

  async function cargarTicket() {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, clientes ( nombre, telefono, email )')
      .eq('id', id)
      .single()

    if (error) console.error(error)
    setTicket(data)
    setLoading(false)

    if (data?.tipo === 'reparacion') {
      cargarEquipo()
    }
  }

  async function cargarEquipo() {
    const { data, error } = await supabase
      .from('equipos_reparacion')
      .select('*')
      .eq('ticket_id', id)
      .maybeSingle()

    if (error) console.error(error)
    setEquipo(data)
  }

  function abrirEdicionEquipo() {
    setFormEquipo({
      tipo_equipo: equipo.tipo_equipo,
      marca: equipo.marca ?? '',
      modelo: equipo.modelo ?? '',
      numero_serie: equipo.numero_serie ?? '',
      accesorios_entregados: equipo.accesorios_entregados ?? '',
      estado_al_recibir: equipo.estado_al_recibir ?? '',
      presupuesto_estimado: equipo.presupuesto_estimado ?? '',
      presupuesto_aprobado:
        equipo.presupuesto_aprobado === null ? '' : String(equipo.presupuesto_aprobado),
      fecha_estimada_entrega: equipo.fecha_estimada_entrega ?? '',
      garantia_dias: equipo.garantia_dias,
    })
    setEditandoEquipo(true)
  }

  async function guardarEquipo(e) {
    e.preventDefault()
    setGuardandoEquipo(true)

    const payload = {
      ...formEquipo,
      presupuesto_estimado: formEquipo.presupuesto_estimado
        ? Number(formEquipo.presupuesto_estimado)
        : null,
      presupuesto_aprobado:
        formEquipo.presupuesto_aprobado === '' ? null : formEquipo.presupuesto_aprobado === 'true',
      fecha_estimada_entrega: formEquipo.fecha_estimada_entrega || null,
      garantia_dias: Number(formEquipo.garantia_dias) || 0,
    }

    const { error } = await supabase.from('equipos_reparacion').update(payload).eq('ticket_id', id)

    setGuardandoEquipo(false)

    if (error) {
      alert('No se pudo guardar la ficha del equipo: ' + error.message)
      return
    }

    setEditandoEquipo(false)
    cargarEquipo()
  }

  async function cargarEventos() {
    const { data } = await supabase
      .from('ticket_eventos')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })
    setEventos(data ?? [])
  }

  async function cargarTecnicosAsignados() {
    const { data } = await supabase
      .from('ticket_tecnicos')
      .select('profile_id, es_responsable_principal, profiles ( id, nombre_completo )')
      .eq('ticket_id', id)
    setTecnicosAsignados(data ?? [])
  }

  async function cargarTodosTecnicos() {
    const { data } = await supabase
      .from('profiles')
      .select('id, nombre_completo')
      .eq('activo', true)
      .order('nombre_completo')
    setTodosTecnicos(data ?? [])
  }

  async function asignarTecnico(e) {
    e.preventDefault()
    if (!agregandoTecnico) return

    const { error } = await supabase
      .from('ticket_tecnicos')
      .insert({ ticket_id: id, profile_id: agregandoTecnico })

    if (error) {
      alert('No se pudo asignar: ' + error.message)
      return
    }
    setAgregandoTecnico('')
    cargarTecnicosAsignados()
  }

  async function quitarTecnico(profileId) {
    const { error } = await supabase
      .from('ticket_tecnicos')
      .delete()
      .eq('ticket_id', id)
      .eq('profile_id', profileId)

    if (error) {
      alert('No se pudo quitar al técnico: ' + error.message)
      return
    }
    cargarTecnicosAsignados()
  }

  async function marcarResponsablePrincipal(profileId) {
    await supabase.from('ticket_tecnicos').update({ es_responsable_principal: false }).eq('ticket_id', id)
    await supabase
      .from('ticket_tecnicos')
      .update({ es_responsable_principal: true })
      .eq('ticket_id', id)
      .eq('profile_id', profileId)
    cargarTecnicosAsignados()
  }

  async function cargarInventarioUsado() {
    const { data } = await supabase
      .from('ticket_inventario')
      .select('item_id, cantidad, inventario_items ( nombre, cantidad_stock )')
      .eq('ticket_id', id)
    setInventarioUsado(data ?? [])
  }

  async function cargarItemsDisponibles() {
    const { data } = await supabase
      .from('inventario_items')
      .select('id, nombre, cantidad_stock')
      .neq('estado', 'dado_de_baja')
      .order('nombre')
    setItemsDisponibles(data ?? [])
  }

  async function cargarFotos() {
    const { data, error } = await supabase
      .from('ticket_fotos')
      .select('id, storage_path, nombre_archivo, descripcion, created_at, profiles ( nombre_completo )')
      .eq('ticket_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setFotos([])
      return
    }

    if (!data || data.length === 0) {
      setFotos([])
      return
    }

    // URLs firmadas de corta duración — el bucket es privado, así que no
    // hay una URL pública fija para cada foto.
    const { data: firmadas, error: errorFirma } = await supabase.storage
      .from(BUCKET_FOTOS)
      .createSignedUrls(
        data.map((f) => f.storage_path),
        3600
      )

    if (errorFirma) console.error(errorFirma)

    setFotos(
      data.map((f, i) => ({
        ...f,
        url: firmadas?.[i]?.signedUrl ?? null,
      }))
    )
  }

  async function subirFotos(fileList) {
    const archivos = Array.from(fileList ?? [])
    if (archivos.length === 0) return

    for (const archivo of archivos) {
      if (!FOTO_TIPOS_PERMITIDOS.includes(archivo.type)) {
        alert(`"${archivo.name}" no es un formato de imagen permitido (JPG, PNG, WEBP o HEIC).`)
        continue
      }
      if (archivo.size > FOTO_TAMANO_MAXIMO) {
        alert(`"${archivo.name}" pesa más de 15 MB. Achicala antes de subirla.`)
        continue
      }
    }

    const validos = archivos.filter(
      (a) => FOTO_TIPOS_PERMITIDOS.includes(a.type) && a.size <= FOTO_TAMANO_MAXIMO
    )
    if (validos.length === 0) return

    setSubiendoFotos(true)

    for (const archivo of validos) {
      const extension = archivo.name.includes('.') ? archivo.name.split('.').pop() : 'jpg'
      const path = `${id}/${crypto.randomUUID()}.${extension}`

      const { error: errorSubida } = await supabase.storage.from(BUCKET_FOTOS).upload(path, archivo, {
        contentType: archivo.type,
      })

      if (errorSubida) {
        alert(`No se pudo subir "${archivo.name}": ` + errorSubida.message)
        continue
      }

      const { error: errorFila } = await supabase.from('ticket_fotos').insert({
        ticket_id: id,
        storage_path: path,
        nombre_archivo: archivo.name,
        descripcion: descripcionFoto.trim() || null,
        subido_por: user.id,
      })

      if (errorFila) {
        // El archivo ya se subió pero no se pudo registrar (ej. ticket
        // cerrado) — lo borramos para no dejar un huérfano en el bucket.
        await supabase.storage.from(BUCKET_FOTOS).remove([path])
        alert(`No se pudo guardar "${archivo.name}": ` + errorFila.message)
      }
    }

    setDescripcionFoto('')
    setSubiendoFotos(false)
    cargarFotos()
  }

  async function eliminarFoto(foto) {
    if (!confirm('¿Eliminar esta foto? No se puede deshacer.')) return

    const { error } = await supabase.from('ticket_fotos').delete().eq('id', foto.id)
    if (error) {
      alert('No se pudo eliminar la foto: ' + error.message)
      return
    }

    await supabase.storage.from(BUCKET_FOTOS).remove([foto.storage_path])
    setFotos((prev) => prev.filter((f) => f.id !== foto.id))
  }

  function agregarAlCarrito(e) {
    e.preventDefault()
    if (!itemSeleccionado || cantidadUsar < 1) return

    const item = itemsDisponibles.find((it) => it.id === itemSeleccionado)
    if (!item) return

    if (cantidadUsar > item.cantidad_stock) {
      alert(`Solo hay ${item.cantidad_stock} unidades disponibles de "${item.nombre}".`)
      return
    }

    setCarritoInventario((prev) => [
      ...prev,
      { item_id: item.id, nombre: item.nombre, cantidad: cantidadUsar },
    ])
    setItemSeleccionado('')
    setCantidadUsar(1)
  }

  function quitarDelCarrito(itemId) {
    setCarritoInventario((prev) => prev.filter((row) => row.item_id !== itemId))
  }

  async function confirmarCarritoInventario() {
    if (carritoInventario.length === 0) return
    setGuardandoCarrito(true)

    for (const row of carritoInventario) {
      const { error: errorMovimiento } = await supabase.from('inventario_movimientos').insert({
        item_id: row.item_id,
        tipo: 'salida',
        cantidad: row.cantidad,
        ticket_id: id,
        usuario_id: user.id,
        notas: 'Usado para resolver el ticket',
      })

      if (errorMovimiento) {
        alert(`No se pudo registrar "${row.nombre}": ` + errorMovimiento.message)
        continue
      }

      const { error: errorVinculo } = await supabase
        .from('ticket_inventario')
        .insert({ ticket_id: id, item_id: row.item_id, cantidad: row.cantidad })

      if (errorVinculo) {
        alert(`El stock de "${row.nombre}" se descontó, pero no se pudo vincular: ` + errorVinculo.message)
      }
    }

    setCarritoInventario([])
    setGuardandoCarrito(false)
    cargarInventarioUsado()
    cargarItemsDisponibles()
  }

  async function quitarItemInventario(itemId, cantidad) {
    if (!confirm('¿Quitar este ítem del ticket? El stock se va a devolver al inventario.')) return

    await supabase.from('inventario_movimientos').insert({
      item_id: itemId,
      tipo: 'devolucion',
      cantidad,
      ticket_id: id,
      usuario_id: user.id,
      notas: 'Se quitó del ticket',
    })

    await supabase.from('ticket_inventario').delete().eq('ticket_id', id).eq('item_id', itemId)

    cargarInventarioUsado()
    cargarItemsDisponibles()
  }

  async function cambiarEstado(nuevoEstado) {
    const { error } = await supabase.from('tickets').update({ estado: nuevoEstado }).eq('id', id)

    if (error) {
      alert('No se pudo cambiar el estado: ' + error.message)
      return
    }
    cargarTicket()
    cargarEventos()
  }

  async function agregarNota(e) {
    e.preventDefault()
    if (!nota.trim()) return

    const { error } = await supabase.from('ticket_eventos').insert({
      ticket_id: id,
      autor_id: user.id,
      tipo: 'nota',
      contenido: nota,
    })

    if (error) {
      alert('No se pudo agregar la nota: ' + error.message)
      return
    }
    setNota('')
    cargarEventos()
  }

  if (loading) return <PageLoading label="Cargando ticket…" />
  if (!ticket) return <p className="text-slate-500">Ticket no encontrado.</p>

  const bloqueado = ticket.estado === 'cerrado'

  return (
    <div>
      <Link
        to={ticket.tipo === 'reparacion' ? '/reparaciones' : '/tickets'}
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a {ticket.tipo === 'reparacion' ? 'reparaciones' : 'tickets'}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-slate-400">
            {ticket.codigo}
            {ticket.tipo === 'reparacion' && <Badge tono="navy">Reparación</Badge>}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-800">{ticket.titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cliente: {ticket.clientes?.nombre} · Prioridad: <span className="capitalize">{ticket.prioridad}</span>
          </p>
        </div>

        <Select value={ticket.estado} onChange={(e) => cambiarEstado(e.target.value)} className="w-auto">
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {estadoLabel(ticket.tipo, estado)}
            </option>
          ))}
        </Select>
      </div>

      {ticket.descripcion && (
        <Card className="mb-6">
          <CardBody className="text-sm text-slate-700">{ticket.descripcion}</CardBody>
        </Card>
      )}

      {bloqueado && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-slate-300 bg-slate-100 p-4 text-sm text-slate-600">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          Este ticket está <strong>&nbsp;cerrado&nbsp;</strong>. El inventario, las notas y los técnicos
          asignados quedaron congelados. Para volver a editarlo, cambiá el estado arriba.
        </div>
      )}

      {ticket.tipo === 'reparacion' && (
        <Card className="mb-6">
          <CardHeader
            title="Ficha del equipo"
            action={
              equipo &&
              !bloqueado &&
              !editandoEquipo && (
                <button
                  onClick={abrirEdicionEquipo}
                  className="flex items-center gap-1 text-xs font-medium text-cyan-700 hover:text-cyan-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
              )
            }
          />
          <CardBody>
            {!equipo ? (
              <p className="text-sm text-slate-400">Cargando ficha del equipo…</p>
            ) : editandoEquipo ? (
              <form onSubmit={guardarEquipo} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldGroup label="Tipo de equipo">
                  <Select
                    value={formEquipo.tipo_equipo}
                    onChange={(e) => setFormEquipo({ ...formEquipo, tipo_equipo: e.target.value })}
                  >
                    {Object.entries(TIPO_EQUIPO_LABEL).map(([valor, label]) => (
                      <option key={valor} value={valor}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FieldGroup>

                <FieldGroup label="N° de serie">
                  <Input
                    value={formEquipo.numero_serie}
                    onChange={(e) => setFormEquipo({ ...formEquipo, numero_serie: e.target.value })}
                  />
                </FieldGroup>

                <FieldGroup label="Marca">
                  <Input
                    value={formEquipo.marca}
                    onChange={(e) => setFormEquipo({ ...formEquipo, marca: e.target.value })}
                  />
                </FieldGroup>

                <FieldGroup label="Modelo">
                  <Input
                    value={formEquipo.modelo}
                    onChange={(e) => setFormEquipo({ ...formEquipo, modelo: e.target.value })}
                  />
                </FieldGroup>

                <FieldGroup label="Accesorios entregados" className="md:col-span-2">
                  <Input
                    value={formEquipo.accesorios_entregados}
                    onChange={(e) => setFormEquipo({ ...formEquipo, accesorios_entregados: e.target.value })}
                  />
                </FieldGroup>

                <FieldGroup label="Estado del equipo al recibirlo" className="md:col-span-2">
                  <Textarea
                    value={formEquipo.estado_al_recibir}
                    onChange={(e) => setFormEquipo({ ...formEquipo, estado_al_recibir: e.target.value })}
                    rows={2}
                  />
                </FieldGroup>

                <FieldGroup label="Presupuesto estimado (Gs.)">
                  <Input
                    type="number"
                    min="0"
                    value={formEquipo.presupuesto_estimado}
                    onChange={(e) => setFormEquipo({ ...formEquipo, presupuesto_estimado: e.target.value })}
                  />
                </FieldGroup>

                <FieldGroup label="¿Cliente aprobó el presupuesto?">
                  <Select
                    value={formEquipo.presupuesto_aprobado}
                    onChange={(e) => setFormEquipo({ ...formEquipo, presupuesto_aprobado: e.target.value })}
                  >
                    <option value="">Todavía sin respuesta</option>
                    <option value="true">Sí, aprobado</option>
                    <option value="false">No, rechazado</option>
                  </Select>
                </FieldGroup>

                <FieldGroup label="Fecha estimada de entrega">
                  <Input
                    type="date"
                    value={formEquipo.fecha_estimada_entrega}
                    onChange={(e) => setFormEquipo({ ...formEquipo, fecha_estimada_entrega: e.target.value })}
                  />
                </FieldGroup>

                <FieldGroup label="Garantía (días)">
                  <Input
                    type="number"
                    min="0"
                    value={formEquipo.garantia_dias}
                    onChange={(e) => setFormEquipo({ ...formEquipo, garantia_dias: e.target.value })}
                  />
                </FieldGroup>

                <div className="flex items-end gap-3 md:col-span-2">
                  <Button type="submit" variant="accent" loading={guardandoEquipo}>
                    {guardandoEquipo ? 'Guardando…' : 'Guardar ficha'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditandoEquipo(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
                <p>
                  <span className="text-slate-400">Equipo:</span> {TIPO_EQUIPO_LABEL[equipo.tipo_equipo]}{' '}
                  {equipo.marca} {equipo.modelo}
                </p>
                <p>
                  <span className="text-slate-400">N° de serie:</span> {equipo.numero_serie || '—'}
                </p>
                <p className="md:col-span-2">
                  <span className="text-slate-400">Accesorios entregados:</span>{' '}
                  {equipo.accesorios_entregados || '—'}
                </p>
                <p className="md:col-span-2">
                  <span className="text-slate-400">Estado al recibir:</span> {equipo.estado_al_recibir || '—'}
                </p>
                <p>
                  <span className="text-slate-400">Presupuesto estimado:</span>{' '}
                  {equipo.presupuesto_estimado ? `Gs. ${equipo.presupuesto_estimado.toLocaleString('es-PY')}` : '—'}
                </p>
                <p>
                  <span className="text-slate-400">Presupuesto aprobado:</span>{' '}
                  {equipo.presupuesto_aprobado === null
                    ? 'Sin respuesta todavía'
                    : equipo.presupuesto_aprobado
                      ? 'Sí ✓'
                      : 'No ✗'}
                </p>
                <p>
                  <span className="text-slate-400">Entrega estimada:</span>{' '}
                  {equipo.fecha_estimada_entrega
                    ? new Date(equipo.fecha_estimada_entrega).toLocaleDateString('es-PY')
                    : '—'}
                </p>
                <p>
                  <span className="text-slate-400">Garantía:</span> {equipo.garantia_dias} días
                  {equipo.fecha_entrega_real &&
                    ` (desde ${new Date(equipo.fecha_entrega_real).toLocaleDateString('es-PY')})`}
                </p>
                {equipo.fecha_entrega_real && (
                  <p>
                    <span className="text-slate-400">Entregado el:</span>{' '}
                    {new Date(equipo.fecha_entrega_real).toLocaleDateString('es-PY')}
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader title="Técnicos asignados" />
        <CardBody>
          {tecnicosAsignados.length === 0 ? (
            <p className="mb-3 text-sm text-slate-400">Todavía no hay técnicos asignados.</p>
          ) : (
            <ul className="mb-3 space-y-2">
              {tecnicosAsignados.map((t) => (
                <li
                  key={t.profile_id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    {t.profiles?.nombre_completo}
                    {t.es_responsable_principal && <Badge tono="cyan">Responsable principal</Badge>}
                  </span>
                  {isAdmin && !bloqueado && (
                    <span className="flex gap-3">
                      {!t.es_responsable_principal && (
                        <button
                          onClick={() => marcarResponsablePrincipal(t.profile_id)}
                          className="text-xs font-medium text-cyan-700 hover:text-cyan-800"
                        >
                          Marcar responsable
                        </button>
                      )}
                      <button
                        onClick={() => quitarTecnico(t.profile_id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Quitar
                      </button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isAdmin && !bloqueado && (
            <form onSubmit={asignarTecnico} className="flex gap-2">
              <Select
                value={agregandoTecnico}
                onChange={(e) => setAgregandoTecnico(e.target.value)}
                className="flex-1"
              >
                <option value="">Seleccioná un técnico para asignar…</option>
                {todosTecnicos
                  .filter((t) => !tecnicosAsignados.some((ta) => ta.profile_id === t.id))
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre_completo}
                    </option>
                  ))}
              </Select>
              <Button type="submit">
                <UserPlus className="h-4 w-4" />
                Asignar
              </Button>
            </form>
          )}
        </CardBody>
      </Card>

      <Card className="mb-6">
        <button
          onClick={() => setMostrarInventario((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="flex items-center gap-3">
            <Package className="h-4 w-4 text-slate-400" />
            <span>
              <span className="block text-sm font-semibold text-navy-800">Inventario utilizado</span>
              <span className="block text-xs text-slate-400">
                Opcional — solo si este ticket requirió instalar o consumir algún ítem del inventario (
                {inventarioUsado.length} ítem{inventarioUsado.length !== 1 && 's'})
              </span>
            </span>
          </span>
          <span className="text-xs font-medium text-cyan-700">{mostrarInventario ? 'Ocultar' : 'Ver / agregar'}</span>
        </button>

        {mostrarInventario && (
          <CardBody className="border-t border-slate-100 pt-4">
            {inventarioUsado.length === 0 ? (
              <p className="mb-3 text-sm text-slate-400">Este ticket todavía no tiene inventario vinculado.</p>
            ) : (
              <ul className="mb-3 space-y-2">
                {inventarioUsado.map((iu) => (
                  <li
                    key={iu.item_id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {iu.inventario_items?.nombre} × {iu.cantidad}
                    </span>
                    {!bloqueado && (
                      <button
                        onClick={() => quitarItemInventario(iu.item_id, iu.cantidad)}
                        className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Quitar (devuelve stock)
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!bloqueado && (
              <form onSubmit={agregarAlCarrito} className="mb-4 flex flex-wrap items-end gap-2">
                <FieldGroup label="Ítem" className="flex-1">
                  <Select value={itemSeleccionado} onChange={(e) => setItemSeleccionado(e.target.value)}>
                    <option value="">Seleccioná un ítem…</option>
                    {itemsDisponibles
                      .filter(
                        (it) =>
                          !inventarioUsado.some((iu) => iu.item_id === it.id) &&
                          !carritoInventario.some((c) => c.item_id === it.id)
                      )
                      .map((it) => (
                        <option key={it.id} value={it.id} disabled={it.cantidad_stock <= 0}>
                          {it.nombre} ({it.cantidad_stock} disponibles)
                        </option>
                      ))}
                  </Select>
                </FieldGroup>

                <FieldGroup label="Cantidad">
                  <Input
                    type="number"
                    min={1}
                    value={cantidadUsar}
                    onChange={(e) => setCantidadUsar(Number(e.target.value))}
                    className="w-24"
                  />
                </FieldGroup>

                <Button type="submit" variant="outline" disabled={!itemSeleccionado}>
                  <Plus className="h-4 w-4" />
                  Agregar a la lista
                </Button>
              </form>
            )}

            {!bloqueado && carritoInventario.length > 0 && (
              <div className="mb-4 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-cyan-800">
                  Por confirmar ({carritoInventario.length} ítem{carritoInventario.length !== 1 && 's'})
                </p>
                <ul className="mb-3 space-y-1">
                  {carritoInventario.map((row) => (
                    <li key={row.item_id} className="flex items-center justify-between text-sm">
                      <span>
                        {row.nombre} × {row.cantidad}
                      </span>
                      <button
                        onClick={() => quitarDelCarrito(row.item_id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
                <Button onClick={confirmarCarritoInventario} loading={guardandoCarrito}>
                  {guardandoCarrito
                    ? 'Guardando…'
                    : `Confirmar uso de ${carritoInventario.length} ítem${carritoInventario.length !== 1 ? 's' : ''} en este ticket`}
                </Button>
              </div>
            )}
          </CardBody>
        )}
      </Card>

      <Card className="mb-6">
        <button
          onClick={() => setMostrarFotos((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="flex items-center gap-3">
            <Images className="h-4 w-4 text-slate-400" />
            <span>
              <span className="block text-sm font-semibold text-navy-800">Fotos</span>
              <span className="block text-xs text-slate-400">
                Antes/después, daños detectados, evidencia del trabajo ({fotos.length} foto
                {fotos.length !== 1 && 's'})
              </span>
            </span>
          </span>
          <span className="text-xs font-medium text-cyan-700">{mostrarFotos ? 'Ocultar' : 'Ver / agregar'}</span>
        </button>

        {mostrarFotos && (
          <CardBody className="border-t border-slate-100 pt-4">
            {!bloqueado && (
              <div className="mb-4 flex flex-wrap items-end gap-2">
                <FieldGroup label="Descripción" hint="(opcional, se aplica a las fotos que subas ahora)" className="flex-1">
                  <Input
                    value={descripcionFoto}
                    onChange={(e) => setDescripcionFoto(e.target.value)}
                    placeholder="Ej: Estado al recibir, daño en la pantalla…"
                  />
                </FieldGroup>
                <Button as="label" variant="outline" loading={subiendoFotos} className="cursor-pointer">
                  {!subiendoFotos && <Plus className="h-4 w-4" />}
                  {subiendoFotos ? 'Subiendo…' : 'Agregar fotos'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={subiendoFotos}
                    onChange={(e) => {
                      subirFotos(e.target.files)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </Button>
              </div>
            )}

            {fotos.length === 0 ? (
              <p className="text-sm text-slate-400">Este ticket todavía no tiene fotos.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {fotos.map((foto) => (
                  <div key={foto.id} className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                    <button
                      type="button"
                      onClick={() => foto.url && setFotoAmpliada(foto)}
                      className="block aspect-square w-full"
                    >
                      {foto.url ? (
                        <img
                          src={foto.url}
                          alt={foto.descripcion || foto.nombre_archivo || 'Foto del ticket'}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                          No se pudo cargar
                        </div>
                      )}
                    </button>
                    {!bloqueado && (
                      <button
                        onClick={() => eliminarFoto(foto)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        title="Eliminar foto"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {foto.descripcion && (
                      <p className="truncate bg-white px-2 py-1 text-xs text-slate-600" title={foto.descripcion}>
                        {foto.descripcion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        )}
      </Card>

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-6"
          onClick={() => setFotoAmpliada(null)}
        >
          <button
            onClick={() => setFotoAmpliada(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={fotoAmpliada.url}
            alt={fotoAmpliada.descripcion || fotoAmpliada.nombre_archivo || 'Foto del ticket'}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          {fotoAmpliada.descripcion && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/70 px-4 py-1.5 text-sm text-white">
              {fotoAmpliada.descripcion}
            </p>
          )}
        </div>
      )}

      <Card>
        <CardHeader title="Historial" />
        <CardBody>
          {!bloqueado && (
            <form onSubmit={agregarNota} className="mb-4 flex gap-2">
              <Input
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Agregar una nota…"
                className="flex-1"
              />
              <Button type="submit">Agregar</Button>
            </form>
          )}

          <ul className="space-y-3">
            {eventos.map((ev) => (
              <li key={ev.id} className="border-l-2 border-cyan-200 pl-3 text-sm">
                <p className="text-slate-700">{ev.contenido}</p>
                <p className="text-xs text-slate-400">
                  {new Date(ev.created_at).toLocaleString('es-PY')} ·{' '}
                  <span className="capitalize">{ev.tipo.replace('_', ' ')}</span>
                </p>
              </li>
            ))}
            {eventos.length === 0 && <p className="text-sm text-slate-400">Todavía no hay actividad en este ticket.</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}

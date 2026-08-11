import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const ESTADOS = ['nuevo', 'en_progreso', 'esperando_cliente', 'resuelto', 'cerrado']

export default function TicketDetail() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [eventos, setEventos] = useState([])
  const [nota, setNota] = useState('')
  const [loading, setLoading] = useState(true)

  const [tecnicosAsignados, setTecnicosAsignados] = useState([]) // filas de ticket_tecnicos + profile
  const [todosTecnicos, setTodosTecnicos] = useState([])
  const [agregandoTecnico, setAgregandoTecnico] = useState('')

  const [inventarioUsado, setInventarioUsado] = useState([]) // filas de ticket_inventario + item
  const [itemsDisponibles, setItemsDisponibles] = useState([])
  const [mostrarInventario, setMostrarInventario] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState('')
  const [cantidadUsar, setCantidadUsar] = useState(1)
  const [carritoInventario, setCarritoInventario] = useState([]) // varios ítems antes de confirmar
  const [guardandoCarrito, setGuardandoCarrito] = useState(false)

  useEffect(() => {
    cargarTicket()
    cargarEventos()
    cargarTecnicosAsignados()
    cargarInventarioUsado()
    cargarItemsDisponibles()
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
    // Solo puede haber un responsable principal por ticket: primero desmarca a todos
    await supabase
      .from('ticket_tecnicos')
      .update({ es_responsable_principal: false })
      .eq('ticket_id', id)
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
      // 1) Movimiento de salida: el trigger de la base descuenta el stock
      //    automáticamente (y rechaza si no alcanza).
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

      // 2) Vínculo directo ticket <-> ítem, para verlo en el detalle
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

    // Devuelve el stock (el trigger lo suma de nuevo) y borra el vínculo
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
    const { error } = await supabase
      .from('tickets')
      .update({ estado: nuevoEstado })
      .eq('id', id)

    if (error) {
      alert('No se pudo cambiar el estado: ' + error.message)
      return
    }
    // El trigger de la base de datos ya registra el evento de cambio de estado
    // y encola la notificación por email al cliente.
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

  if (loading) return <p className="text-slate-500">Cargando ticket…</p>
  if (!ticket) return <p className="text-slate-500">Ticket no encontrado.</p>

  const bloqueado = ticket.estado === 'cerrado'

  return (
    <div>
      <Link to="/tickets" className="mb-4 inline-block text-xs text-cyan-700 hover:text-cyan-800">
        ← Volver a tickets
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{ticket.codigo}</p>
          <h1 className="text-2xl font-semibold text-navy-800">{ticket.titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cliente: {ticket.clientes?.nombre} · Prioridad:{' '}
            <span className="capitalize">{ticket.prioridad}</span>
          </p>
        </div>

        <select
          value={ticket.estado}
          onChange={(e) => cambiarEstado(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm capitalize"
        >
          {ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {estado.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      {ticket.descripcion && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          {ticket.descripcion}
        </div>
      )}

      {bloqueado && (
        <div className="mb-6 rounded-lg border border-slate-300 bg-slate-100 p-4 text-sm text-slate-600">
          Este ticket está <strong>cerrado</strong>. El inventario, las notas y los técnicos
          asignados quedaron congelados. Para volver a editarlo, cambiá el estado arriba.
        </div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-navy-800">Técnicos asignados</h2>

        {tecnicosAsignados.length === 0 ? (
          <p className="mb-3 text-sm text-slate-400">Todavía no hay técnicos asignados.</p>
        ) : (
          <ul className="mb-3 space-y-2">
            {tecnicosAsignados.map((t) => (
              <li
                key={t.profile_id}
                className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
              >
                <span>
                  {t.profiles?.nombre_completo}
                  {t.es_responsable_principal && (
                    <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-medium text-cyan-800">
                      Responsable principal
                    </span>
                  )}
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
            <select
              value={agregandoTecnico}
              onChange={(e) => setAgregandoTecnico(e.target.value)}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seleccioná un técnico para asignar…</option>
              {todosTecnicos
                .filter((t) => !tecnicosAsignados.some((ta) => ta.profile_id === t.id))
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre_completo}
                  </option>
                ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
            >
              Asignar
            </button>
          </form>
        )}
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <button
          onClick={() => setMostrarInventario((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span>
            <h2 className="text-sm font-semibold text-navy-800">Inventario utilizado</h2>
            <p className="text-xs text-slate-400">
              Opcional — solo si este ticket requirió instalar o consumir algún ítem del
              inventario ({inventarioUsado.length} ítem{inventarioUsado.length !== 1 && 's'})
            </p>
          </span>
          <span className="text-xs font-medium text-cyan-700">
            {mostrarInventario ? 'Ocultar' : 'Ver / agregar'}
          </span>
        </button>

        {mostrarInventario && (
          <div className="mt-4">
            {inventarioUsado.length === 0 ? (
              <p className="mb-3 text-sm text-slate-400">
                Este ticket todavía no tiene inventario vinculado.
              </p>
            ) : (
              <ul className="mb-3 space-y-2">
                {inventarioUsado.map((iu) => (
                  <li
                    key={iu.item_id}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {iu.inventario_items?.nombre} × {iu.cantidad}
                    </span>
                    {!bloqueado && (
                      <button
                        onClick={() => quitarItemInventario(iu.item_id, iu.cantidad)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Quitar (devuelve stock)
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!bloqueado && (
              <form onSubmit={agregarAlCarrito} className="mb-4 flex flex-wrap items-end gap-2">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Ítem</label>
                  <select
                    value={itemSeleccionado}
                    onChange={(e) => setItemSeleccionado(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  >
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
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">Cantidad</label>
                  <input
                    type="number"
                    min={1}
                    value={cantidadUsar}
                    onChange={(e) => setCantidadUsar(Number(e.target.value))}
                    className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!itemSeleccionado}
                  className="rounded-md border border-navy-700 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-navy-50 disabled:opacity-50"
                >
                  + Agregar a la lista
                </button>
              </form>
            )}

            {!bloqueado && carritoInventario.length > 0 && (
              <div className="mb-4 rounded-md border border-cyan-200 bg-cyan-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase text-cyan-800">
                  Por confirmar ({carritoInventario.length} ítem
                  {carritoInventario.length !== 1 && 's'})
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
                <button
                  onClick={confirmarCarritoInventario}
                  disabled={guardandoCarrito}
                  className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600 disabled:opacity-60"
                >
                  {guardandoCarrito
                    ? 'Guardando…'
                    : `Confirmar uso de ${carritoInventario.length} ítem${carritoInventario.length !== 1 ? 's' : ''} en este ticket`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-navy-800">Historial</h2>

        {!bloqueado && (
          <form onSubmit={agregarNota} className="mb-4 flex gap-2">
            <input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Agregar una nota…"
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
            >
              Agregar
            </button>
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
          {eventos.length === 0 && (
            <p className="text-sm text-slate-400">Todavía no hay actividad en este ticket.</p>
          )}
        </ul>
      </div>
    </div>
  )
}

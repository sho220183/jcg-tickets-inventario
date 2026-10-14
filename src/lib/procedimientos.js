// Altas y bajas (procedimiento PRO-TI-001): etiquetas, reglas y acceso a datos.
// Las reglas de cierre se validan en la base (trigger trg_procedimiento_cierre);
// acá se repiten solo para avisar en pantalla antes de que la base lo rechace.
import { supabase } from './supabaseClient'

export const BUCKET_EVIDENCIAS = 'ticket-evidencias'
export const EVIDENCIA_TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
export const EVIDENCIA_TAMANO_MAXIMO = 15 * 1024 * 1024 // 15 MB, igual que el límite del bucket

export const TIPOS_PROCEDIMIENTO = [
  { value: 'alta_equipo', label: 'Alta de equipo' },
  { value: 'alta_usuario', label: 'Alta de usuario' },
  { value: 'baja_usuario', label: 'Baja de usuario' },
  { value: 'baja_equipo', label: 'Baja de equipo' },
]

export const DESTINOS_EQUIPO = [
  {
    value: 'reasignacion',
    label: 'Reasignación dentro del cliente',
    borrado: 'Restablecer Windows con limpieza de unidad o reinstalar imagen limpia',
  },
  {
    value: 'garantia',
    label: 'Garantía o reparación externa',
    borrado: 'Retirar el disco si es posible; si no, borrado completo y BitLocker activo',
  },
  {
    value: 'venta_donacion',
    label: 'Venta, donación o devolución de leasing',
    borrado: 'Borrado seguro: Secure Erase / Sanitize del SSD o NVMe',
  },
  { value: 'desecho', label: 'Desecho', borrado: 'Borrado seguro y destrucción física del disco' },
]

export const procedimientoLabel = (tipo) => TIPOS_PROCEDIMIENTO.find((t) => t.value === tipo)?.label ?? tipo
export const esBaja = (tipo) => tipo === 'baja_usuario' || tipo === 'baja_equipo'
export const usaEquipo = (tipo) => tipo === 'alta_equipo' || tipo === 'baja_equipo'
export const usaPersona = (tipo) => tipo === 'alta_usuario' || tipo === 'baja_usuario'

// Un ítem crítico completado necesita evidencia (archivo o dato) para poder cerrar.
export const faltaEvidencia = (item) =>
  item.critico && item.estado === 'completado' && !item.evidencia_path?.trim() && !item.evidencia_nota?.trim()

// Mismo criterio que el trigger de cierre.
export function bloqueosDeCierre(procedimiento, items) {
  const bloqueos = []
  const pendientes = items.filter((i) => i.estado === 'pendiente').length
  const sinEvidencia = items.filter(faltaEvidencia).length
  if (pendientes) bloqueos.push(`${pendientes} ítem(s) pendiente(s)`)
  if (sinEvidencia) bloqueos.push(`${sinEvidencia} ítem(s) crítico(s) sin evidencia`)
  if (procedimiento?.tipo === 'baja_equipo' && !procedimiento.destino_equipo) {
    bloqueos.push('falta el destino del equipo')
  }
  return bloqueos
}

// Mensaje legible de un error de Supabase/Postgres, incluido el "hint" que
// devuelven los triggers (ej. qué falta para poder cerrar).
export const mensajeError = (error) =>
  [error?.message, error?.hint].filter(Boolean).join(' ') || 'Ocurrió un error inesperado.'

const SELECT_PROCEDIMIENTO = '*, checklist_plantillas ( codigo, version ), inventario_items ( nombre, marca, modelo )'

export async function cargarProcedimiento(ticketId) {
  const [proc, items] = await Promise.all([
    supabase.from('ticket_procedimientos').select(SELECT_PROCEDIMIENTO).eq('ticket_id', ticketId).maybeSingle(),
    supabase.from('ticket_checklist_items').select('*').eq('ticket_id', ticketId).order('orden'),
  ])
  if (proc.error) throw proc.error
  if (items.error) throw items.error
  return { procedimiento: proc.data, items: items.data ?? [] }
}

export async function actualizarItem(id, cambios) {
  const { data, error } = await supabase.from('ticket_checklist_items').update(cambios).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function actualizarProcedimiento(ticketId, cambios) {
  const { data, error } = await supabase
    .from('ticket_procedimientos')
    .update(cambios)
    .eq('ticket_id', ticketId)
    .select(SELECT_PROCEDIMIENTO)
    .single()
  if (error) throw error
  return data
}

// Sube a <ticket_id>/<item_id>-<uuid>.<ext>: la RLS del bucket valida el
// primer segmento de la ruta contra el acceso al ticket, igual que en ticket-fotos.
export async function subirEvidencia(item, archivo) {
  if (!EVIDENCIA_TIPOS_PERMITIDOS.includes(archivo.type)) {
    throw new Error(`"${archivo.name}" no es un formato permitido (JPG, PNG, WEBP, HEIC o PDF).`)
  }
  if (archivo.size > EVIDENCIA_TAMANO_MAXIMO) {
    throw new Error(`"${archivo.name}" pesa más de 15 MB.`)
  }
  const extension = archivo.name.includes('.') ? archivo.name.split('.').pop().toLowerCase() : 'bin'
  const path = `${item.ticket_id}/${item.id}-${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage.from(BUCKET_EVIDENCIAS).upload(path, archivo, { contentType: archivo.type })
  if (error) throw error

  try {
    const actualizado = await actualizarItem(item.id, { evidencia_path: path })
    // El archivo anterior (si se reemplazó) ya no lo referencia nadie.
    if (item.evidencia_path) await supabase.storage.from(BUCKET_EVIDENCIAS).remove([item.evidencia_path])
    return actualizado
  } catch (e) {
    // No se pudo vincular (ej. ticket cerrado): no dejamos el archivo huérfano.
    await supabase.storage.from(BUCKET_EVIDENCIAS).remove([path])
    throw e
  }
}

export async function urlEvidencia(path) {
  const { data, error } = await supabase.storage.from(BUCKET_EVIDENCIAS).createSignedUrl(path, 300)
  if (error) throw error
  return data.signedUrl
}

export async function crearTicketProcedimiento(form) {
  const { data, error } = await supabase.rpc('crear_ticket_procedimiento', {
    p_cliente_id: form.cliente_id,
    p_tipo: form.tipo,
    p_titulo: form.titulo.trim() || null,
    p_descripcion: form.descripcion.trim() || null,
    p_cliente_tiene_ad: form.cliente_tiene_ad,
    p_baja_inmediata: form.tipo === 'baja_usuario' && form.baja_inmediata,
    p_fecha_efectiva: form.fecha_efectiva ? new Date(form.fecha_efectiva).toISOString() : null,
    p_persona_nombre: form.persona_nombre.trim() || null,
    p_persona_usuario: form.persona_usuario.trim() || null,
    p_equipo_nombre: form.equipo_nombre.trim() || null,
    p_equipo_serie: form.equipo_serie.trim() || null,
    p_inventario_item_id: form.inventario_item_id || null,
    p_destino_equipo: form.destino_equipo || null,
    // Campo vacío → 30 días (el default de la base), no 0: un 0 agendaría la eliminación para ya.
    p_retencion_dias: form.retencion_dias === '' ? 30 : Number(form.retencion_dias),
    p_tecnicos: form.tecnicos.length ? form.tecnicos : null,
  })
  if (error) throw error
  return data // id del ticket creado
}

export async function generarSeguimientosVencidos() {
  const { data, error } = await supabase.rpc('generar_seguimientos_vencidos')
  if (error) throw error
  return data // cantidad de tickets creados
}

export async function listarSeguimientos() {
  const { data, error } = await supabase
    .from('seguimientos_programados')
    .select(
      'id, titulo, fecha_programada, ticket_generado_id, ticket_origen_id, ' +
        'origen:tickets!seguimientos_programados_ticket_origen_id_fkey ( codigo ), ' +
        'generado:tickets!seguimientos_programados_ticket_generado_id_fkey ( codigo )'
    )
    .order('fecha_programada')
  if (error) throw error
  return data ?? []
}

export const ESTADOS = ['nuevo', 'en_progreso', 'esperando_cliente', 'resuelto', 'cerrado']

const LABELS_SOPORTE = {
  nuevo: 'Nuevo',
  en_progreso: 'En progreso',
  esperando_cliente: 'Esperando al cliente',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

const LABELS_REPARACION = {
  nuevo: 'Recibido',
  en_progreso: 'En diagnóstico / reparación',
  esperando_cliente: 'Esperando aprobación de presupuesto',
  resuelto: 'Reparado, listo para retirar',
  cerrado: 'Entregado',
}

export function estadoLabel(tipo, estado) {
  const mapa = tipo === 'reparacion' ? LABELS_REPARACION : LABELS_SOPORTE
  return mapa[estado] ?? estado
}

export const TIPO_EQUIPO_LABEL = {
  notebook: 'Notebook',
  computadora: 'Computadora de escritorio',
  impresora: 'Impresora',
  celular: 'Celular',
  tablet: 'Tablet',
  otro: 'Otro',
}

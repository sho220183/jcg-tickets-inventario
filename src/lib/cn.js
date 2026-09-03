// Combina clases condicionalmente, ignorando valores falsy.
// Uso: cn('base', condicion && 'extra', otraCondicion ? 'a' : 'b')
export function cn(...clases) {
  return clases.filter(Boolean).join(' ')
}

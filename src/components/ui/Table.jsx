import { cn } from '../../lib/cn'

// Envoltorio con scroll horizontal propio: las tablas nunca deben
// desbordar la página en pantallas angostas (tablet/celular).
export default function Table({ children, className }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50">
      <div className="overflow-x-auto">
        <table className={cn('w-full min-w-[640px] text-sm', className)}>{children}</table>
      </div>
    </div>
  )
}

export function Th({ children, className }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }) {
  return <td className={cn('px-4 py-3', className)}>{children}</td>
}

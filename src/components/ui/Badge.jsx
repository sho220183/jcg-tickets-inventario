import { cn } from '../../lib/cn'

const TONOS = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-600/10',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  purple: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/10',
  navy: 'bg-navy-50 text-navy-700 ring-navy-600/10',
}

export default function Badge({ tono = 'slate', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
        TONOS[tono] ?? TONOS.slate,
        className
      )}
    >
      {children}
    </span>
  )
}

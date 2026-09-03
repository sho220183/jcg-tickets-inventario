import { cn } from '../../lib/cn'

const BARRAS = {
  slate: 'bg-slate-300',
  cyan: 'bg-cyan-400',
  amber: 'bg-amber-400',
  purple: 'bg-purple-400',
  emerald: 'bg-emerald-400',
  red: 'bg-red-400',
  navy: 'bg-navy-500',
}

export default function StatCard({ label, value, tono = 'slate', icon: Icon }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <span className={cn('absolute inset-y-0 left-0 w-1', BARRAS[tono] ?? BARRAS.slate)} />
      <div className="flex items-start justify-between pl-2">
        <div>
          <p className="text-2xl font-semibold text-navy-800">{value}</p>
          <p className="mt-0.5 text-xs text-slate-500">{label}</p>
        </div>
        {Icon && <Icon className="h-4 w-4 text-slate-300" />}
      </div>
    </div>
  )
}

import { cn } from '../../lib/cn'

export default function FilterPills({ opciones, valor, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {opciones.map((op) => (
        <button
          key={op.value}
          onClick={() => onChange(op.value)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
            valor === op.value
              ? 'bg-navy-700 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}

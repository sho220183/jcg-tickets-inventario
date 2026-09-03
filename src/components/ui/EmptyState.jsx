import { cn } from '../../lib/cn'

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-12 text-center', className)}>
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
          <Icon className="h-5 w-5" />
        </div>
      )}
      {title && <p className="text-sm font-medium text-slate-700">{title}</p>}
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

export default function Spinner({ className }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin text-slate-400', className)} />
}

export function PageLoading({ label = 'Cargando…' }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
      <Spinner className="h-5 w-5" />
      {label}
    </div>
  )
}

import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/cn'

const VARIANTES = {
  primary:
    'bg-navy-700 text-white hover:bg-navy-600 focus-visible:ring-navy-400 shadow-sm',
  accent:
    'bg-cyan-600 text-white hover:bg-cyan-700 focus-visible:ring-cyan-400 shadow-sm',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400 shadow-sm',
  outline:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-navy-300',
  ghost:
    'text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-navy-300',
  link: 'text-cyan-700 hover:text-cyan-800 underline-offset-2 hover:underline p-0 h-auto',
}

const TAMANOS = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
}

const Button = forwardRef(function Button(
  { as: Comp = 'button', variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props },
  ref
) {
  const esLink = variant === 'link'
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        !esLink && TAMANOS[size],
        VARIANTES[variant],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </Comp>
  )
})

export default Button

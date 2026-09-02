import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

const estiloControl =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:bg-slate-50 disabled:text-slate-400'

export function Label({ children, hint, className }) {
  return (
    <label className={cn('mb-1 block text-sm font-medium text-slate-700', className)}>
      {children} {hint && <span className="font-normal text-slate-400">{hint}</span>}
    </label>
  )
}

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(estiloControl, className)} {...props} />
})

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(estiloControl, 'pr-8', className)} {...props}>
      {children}
    </select>
  )
})

export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(estiloControl, className)} {...props} />
})

export function FieldGroup({ label, hint, children, className }) {
  return (
    <div className={className}>
      {label && <Label hint={hint}>{label}</Label>}
      {children}
    </div>
  )
}

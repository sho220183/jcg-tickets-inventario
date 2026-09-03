import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { AlertCircle, Lock, Mail, Ticket } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Button from '../components/ui/Button'
import { Input, Label } from '../components/ui/Field'

export default function Login() {
  const { session, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError('Email o contraseña incorrectos.')
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen bg-navy-900">
      {/* Panel de marca — oculto en mobile */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-navy-800 p-12 text-navy-50 lg:flex">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-32 left-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500 font-bold text-navy-900">
            J
          </div>
          <span className="font-semibold tracking-tight">JCG Infotech</span>
        </div>

        <div className="relative max-w-sm">
          <Ticket className="mb-4 h-9 w-9 text-cyan-400" />
          <h1 className="text-2xl font-semibold leading-snug">
            Tickets, reparaciones e inventario en un solo lugar.
          </h1>
          <p className="mt-3 text-sm text-navy-200">
            Seguimiento de soporte técnico, control de stock y comunicación con tus
            clientes, todo conectado.
          </p>
        </div>

        <p className="relative text-xs text-navy-400">
          © {new Date().getFullYear()} JCG Infotech
        </p>
      </div>

      {/* Formulario */}
      <div className="flex w-full flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl shadow-slate-900/5">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 font-bold text-cyan-400">
              J
            </div>
            <span className="font-semibold text-navy-800">JCG Infotech</span>
          </div>

          <h2 className="text-xl font-semibold text-navy-800">Iniciar sesión</h2>
          <p className="mb-6 text-sm text-slate-500">Accedé a tu panel de tickets e inventario.</p>

          <div className="mb-4">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9"
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <div className="mb-2">
            <Label>Contraseña</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" loading={submitting} className="mt-4 w-full" size="lg">
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </Button>

          <p className="mt-5 text-center text-xs text-slate-400">
            Los usuarios se crean desde el panel de administración. No hay registro público.
          </p>
        </form>
      </div>
    </div>
  )
}

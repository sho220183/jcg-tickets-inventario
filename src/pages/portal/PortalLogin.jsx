import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { AlertCircle, Lock, Mail, UserCircle } from 'lucide-react'
import { useClientAuth } from '../../context/ClientAuthContext'
import Button from '../../components/ui/Button'
import { Input, Label } from '../../components/ui/Field'

export default function PortalLogin() {
  const { session, signIn } = useClientAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(location.state?.error ?? null)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/portal" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error } = await signIn(email, password)
    if (error) setError('Email o contraseña incorrectos.')
    setSubmitting(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-800 font-bold text-cyan-400">
            J
          </div>
          <span className="font-semibold text-navy-800">JCG Infotech</span>
        </div>

        <h2 className="flex items-center gap-2 text-xl font-semibold text-navy-800">
          <UserCircle className="h-5 w-5 text-cyan-600" />
          Portal de clientes
        </h2>
        <p className="mb-6 text-sm text-slate-500">Consultá el estado de tus tickets y reparaciones.</p>

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
          El acceso lo crea JCG Infotech. Si todavía no tenés usuario, comunicate con nosotros.
        </p>
        <p className="mt-2 text-center text-xs text-slate-400">
          ¿Sos parte del equipo? <Link to="/login" className="font-medium text-cyan-700 hover:text-cyan-800">Entrá acá</Link>
        </p>
      </form>
    </div>
  )
}

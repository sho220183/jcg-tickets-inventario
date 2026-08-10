import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
    <div className="flex h-screen items-center justify-center bg-navy-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-xl"
      >
        <h1 className="text-xl font-semibold text-navy-800">JCG Infotech</h1>
        <p className="mb-6 text-sm text-slate-500">Tickets & Inventario</p>

        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-navy-700 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-600 disabled:opacity-60"
        >
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </button>

        <p className="mt-4 text-xs text-slate-400">
          Los usuarios se crean desde el panel de Supabase (Authentication → Users). No hay
          registro público.
        </p>
      </form>
    </div>
  )
}

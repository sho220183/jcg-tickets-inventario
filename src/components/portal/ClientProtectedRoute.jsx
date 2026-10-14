import { Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useClientAuth } from '../../context/ClientAuthContext'

export const SIN_VINCULO = 'Tu usuario todavía no está vinculado a ningún cliente. Comunicate con JCG Infotech.'

export default function ClientProtectedRoute({ children }) {
  const { session, cliente, errorCliente, loading } = useClientAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-navy-400">
        Cargando…
      </div>
    )
  }

  if (!session) return <Navigate to="/portal/login" replace />

  if (errorCliente) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-sm rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-amber-500" />
          <p className="text-sm font-medium text-slate-800">No se pudieron cargar tus datos.</p>
          <p className="mt-1 text-sm text-slate-500">Revisá la conexión y volvé a intentar.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-navy-700 px-4 py-2 text-sm font-medium text-white hover:bg-navy-600"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Sesión válida pero sin vínculo a un cliente (todavía no lo vinculó un
  // admin, o es un usuario de staff que llegó acá por error). El login del
  // portal cierra esa sesión una sola vez y avisa; acá solo se redirige.
  if (!cliente) return <Navigate to="/portal/login" replace />

  return children
}

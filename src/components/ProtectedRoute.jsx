import { Navigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export const SIN_ACCESO = 'Esta cuenta no tiene acceso al panel interno. Si sos cliente, entrá por el portal de clientes.'

export default function ProtectedRoute({ children }) {
  const { session, profile, errorPerfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-navy-400">
        Cargando…
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (errorPerfil) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 px-6">
        <div className="max-w-sm rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-6 w-6 text-amber-500" />
          <p className="text-sm font-medium text-slate-800">No se pudo cargar tu perfil.</p>
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

  // Cuenta autenticada sin fila en "profiles": no es staff (por ejemplo, un
  // cliente que entró por acá en vez de por /portal/login). La pantalla de
  // login cierra esa sesión una sola vez y muestra el aviso; acá solo se
  // redirige. Antes se cerraba la sesión durante el render, en cada render.
  if (!profile) return <Navigate to="/login" replace />

  return children
}

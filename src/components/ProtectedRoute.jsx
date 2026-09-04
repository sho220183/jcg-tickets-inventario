import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function ProtectedRoute({ children }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-navy-400">
        Cargando…
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  // Una cuenta autenticada pero sin fila en "profiles" no es staff (por
  // ejemplo, un cliente que entró por acá en vez de por /portal/login).
  // No tiene sentido dejarla "adentro" viendo pantallas vacías por RLS.
  if (!profile) {
    supabase.auth.signOut()
    return (
      <Navigate
        to="/login"
        replace
        state={{ error: 'Esta cuenta no tiene acceso al panel interno. Si sos cliente, entrá por el portal de clientes.' }}
      />
    )
  }

  return children
}

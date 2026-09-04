import { Navigate } from 'react-router-dom'
import { useClientAuth } from '../../context/ClientAuthContext'
import { supabase } from '../../lib/supabaseClient'

export default function ClientProtectedRoute({ children }) {
  const { session, cliente, loading } = useClientAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-navy-400">
        Cargando…
      </div>
    )
  }

  if (!session) return <Navigate to="/portal/login" replace />

  // Sesión válida pero sin vínculo a un cliente (todavía no lo vinculó un
  // admin, o es un usuario de staff que llegó acá por error).
  if (!cliente) {
    supabase.auth.signOut()
    return (
      <Navigate
        to="/portal/login"
        replace
        state={{ error: 'Tu usuario todavía no está vinculado a ningún cliente. Comunicate con JCG Infotech.' }}
      />
    )
  }

  return children
}

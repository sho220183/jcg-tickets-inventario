import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Contexto de autenticación separado del de staff (AuthContext.jsx): un
// cliente del portal no tiene fila en "profiles", tiene fila en "clientes"
// (vinculada por portal_user_id). Mantenerlo aparte evita mezclar "rol de
// staff" con "identidad de cliente".
const ClientAuthContext = createContext(null)

export function ClientAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [cliente, setCliente] = useState(null) // fila de "clientes" vinculada a este usuario
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchCliente(session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchCliente(session.user.id)
      else {
        setCliente(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function fetchCliente(userId) {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, email, telefono')
      .eq('portal_user_id', userId)
      .maybeSingle()

    if (error) console.error('Error cargando los datos del cliente:', error.message)
    setCliente(data ?? null)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = { session, cliente, loading, signIn, signOut }

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext)
  if (!ctx) throw new Error('useClientAuth debe usarse dentro de <ClientAuthProvider>')
  return ctx
}

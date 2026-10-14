import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Contexto de autenticación separado del de staff (AuthContext.jsx): un
// cliente del portal no tiene fila en "profiles", tiene fila en "clientes"
// (vinculada por portal_user_id). Mantenerlo aparte evita mezclar "rol de
// staff" con "identidad de cliente".
const ClientAuthContext = createContext(null)

export function ClientAuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [iniciando, setIniciando] = useState(true)
  const [cliente, setCliente] = useState(null) // fila de "clientes" vinculada a este usuario
  const [clienteDe, setClienteDe] = useState(null) // id del usuario cuyo cliente ya se consultó
  const [errorCliente, setErrorCliente] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIniciando(false)
    })

    // También se dispara al renovar el token: el cliente depende del id del
    // usuario, no de la sesión, para no volver a pedirlo en cada renovación.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) {
      setCliente(null)
      setClienteDe(null)
      setErrorCliente(null)
      return
    }

    let vigente = true
    supabase
      .from('clientes')
      .select('id, nombre, email, telefono')
      .eq('portal_user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) console.error('Error cargando los datos del cliente:', error.message)
        setErrorCliente(error ?? null)
        setCliente(data ?? null)
        setClienteDe(userId)
      })

    return () => {
      vigente = false
    }
  }, [userId])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Sigue "cargando" hasta tener el cliente del usuario ACTUAL (misma
  // corrección que en AuthContext: evita cerrar la sesión recién iniciada).
  const loading = iniciando || (userId !== null && clienteDe !== userId)

  const value = { session, cliente, errorCliente, loading, signIn, signOut }

  return <ClientAuthContext.Provider value={value}>{children}</ClientAuthContext.Provider>
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext)
  if (!ctx) throw new Error('useClientAuth debe usarse dentro de <ClientAuthProvider>')
  return ctx
}

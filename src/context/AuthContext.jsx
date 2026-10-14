import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [iniciando, setIniciando] = useState(true) // todavía no sabemos si hay sesión guardada
  const [profile, setProfile] = useState(null) // fila de la tabla "profiles" (incluye el rol)
  const [perfilDe, setPerfilDe] = useState(null) // id del usuario cuyo perfil ya se consultó
  const [errorPerfil, setErrorPerfil] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIniciando(false)
    })

    // Reacciona a login/logout en cualquier parte de la app. También se dispara
    // al renovar el token (cada ~1 h): por eso el perfil depende del id del
    // usuario y no de la sesión, así no se vuelve a pedir en cada renovación.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id ?? null

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setPerfilDe(null)
      setErrorPerfil(null)
      return
    }

    let vigente = true
    // maybeSingle (no single): un usuario autenticado que entra por el
    // portal de clientes no tiene fila en "profiles" (no es staff), y eso
    // no es un error — simplemente session sin profile ni rol de staff.
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return // llegó tarde: ya hay otro usuario o se cerró la sesión
        if (error) console.error('Error cargando el perfil:', error.message)
        setErrorPerfil(error ?? null)
        setProfile(data ?? null)
        setPerfilDe(userId)
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

  // Sigue "cargando" hasta tener el perfil del usuario ACTUAL. Antes, entre el
  // login y la llegada del perfil había un instante con sesión y sin perfil, y
  // ProtectedRoute lo tomaba como "no es staff" y cerraba la sesión.
  const loading = iniciando || (userId !== null && perfilDe !== userId)

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    errorPerfil,
    isAdmin: profile?.rol === 'admin',
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

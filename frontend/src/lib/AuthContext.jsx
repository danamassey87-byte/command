import { createContext, useContext, useState, useEffect } from 'react'
import supabase from './supabase'

const AuthContext = createContext({ user: null, session: null, loading: true })

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

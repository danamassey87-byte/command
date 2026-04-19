import { createContext, useContext, useState, useEffect } from 'react'
import supabase from './supabase'

const AuthContext = createContext({ user: null, session: null, loading: true, demoMode: false })

export function useAuth() {
  return useContext(AuthContext)
}

const DEMO_USER = {
  id: 'demo-user',
  email: 'demo@example.com',
  user_metadata: { full_name: 'Demo User' },
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem('demo_mode') === 'true'
  })

  useEffect(() => {
    if (demoMode) {
      window.__DEMO_MODE__ = true
      setLoading(false)
      return
    }
    window.__DEMO_MODE__ = false

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
  }, [demoMode])

  function enterDemoMode() {
    localStorage.setItem('demo_mode', 'true')
    window.__DEMO_MODE__ = true
    setDemoMode(true)
  }

  function exitDemoMode() {
    localStorage.removeItem('demo_mode')
    window.__DEMO_MODE__ = false
    setDemoMode(false)
    setLoading(true)
    // Re-check real session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
  }

  const value = {
    session: demoMode ? { user: DEMO_USER } : session,
    user: demoMode ? DEMO_USER : (session?.user ?? null),
    loading,
    demoMode,
    enterDemoMode,
    exitDemoMode,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

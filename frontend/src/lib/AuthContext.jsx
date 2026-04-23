import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import supabase from './supabase'
import { getUserSetting } from './supabase.js'

const AuthContext = createContext({ user: null, session: null, loading: true, demoMode: false, onboardingComplete: null })

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
  const [onboardingComplete, setOnboardingComplete] = useState(null) // null=loading, true/false=resolved
  const [demoMode, setDemoMode] = useState(() => {
    return localStorage.getItem('demo_mode') === 'true'
  })

  // Check onboarding status for real (non-demo) authenticated users
  const checkOnboarding = useCallback(async (sess) => {
    if (!sess?.user) {
      setOnboardingComplete(null)
      return
    }
    try {
      const { data } = await getUserSetting('onboarding_complete')
      setOnboardingComplete(data?.value?.completed_at ? true : false)
    } catch {
      // If the query fails (e.g. table doesn't exist yet), don't block the app
      setOnboardingComplete(true)
    }
  }, [])

  /** Called from the Onboarding page after saving the flag to DB */
  const markOnboardingComplete = useCallback(() => {
    setOnboardingComplete(true)
  }, [])

  useEffect(() => {
    if (demoMode) {
      window.__DEMO_MODE__ = true
      setOnboardingComplete(true) // demo users skip onboarding
      setLoading(false)
      return
    }
    window.__DEMO_MODE__ = false

    // Get initial session — with timeout so the app never hangs on a broken Supabase connection
    const timeout = setTimeout(() => {
      setOnboardingComplete(true)
      setLoading(false)
    }, 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      checkOnboarding(session).then(() => {
        clearTimeout(timeout)
        setLoading(false)
      })
    }).catch(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        checkOnboarding(session)
      }
    )

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [demoMode, checkOnboarding])

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
    onboardingComplete,
    markOnboardingComplete,
    enterDemoMode,
    exitDemoMode,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

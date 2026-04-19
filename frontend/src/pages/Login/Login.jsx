import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import supabase from '../../lib/supabase'
import './Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { enterDemoMode } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email for a confirmation link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__header">
          <h1 className="login__title">Command Center</h1>
        </div>

        <form className="login__form" onSubmit={handleSubmit}>
          <label className="login__label">
            Email
            <input
              className="login__input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </label>

          <label className="login__label">
            Password
            <input
              className="login__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              minLength={6}
            />
          </label>

          {error && <p className="login__error">{error}</p>}
          {message && <p className="login__message">{message}</p>}

          <button className="login__btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="login__divider">
          <span>or</span>
        </div>

        <button
          className="login__demo-btn"
          onClick={() => { enterDemoMode(); navigate('/') }}
        >
          Explore Demo
        </button>
        <p className="login__demo-hint">Browse the full app with sample data — no account needed</p>

        <p className="login__toggle">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            className="login__toggle-btn"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null) }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}

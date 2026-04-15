import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import supabase from '../../lib/supabase'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('connecting')
  const [error, setError] = useState(null)

  useEffect(() => {
    const code = searchParams.get('code')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setStatus('error')
      setError(`Google returned an error: ${errorParam}`)
      return
    }

    if (!code) {
      setStatus('error')
      setError('No authorization code received from Google.')
      return
    }

    exchangeCode(code)
  }, [])

  async function exchangeCode(code) {
    try {
      setStatus('connecting')

      const redirectUri = `${window.location.origin}/auth/google/callback`

      const { data, error: fnError } = await supabase.functions.invoke('google-auth', {
        body: { action: 'exchange_code', code, redirect_uri: redirectUri },
      })

      if (fnError) {
        // supabase.functions.invoke wraps non-2xx in FunctionsHttpError
        let detail = fnError.message
        try {
          const ctx = fnError.context
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json()
            detail = body.error || body.detail || detail
          }
        } catch (_) {}
        throw new Error(detail)
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      setStatus('success')

      // Redirect to settings after a brief success message
      setTimeout(() => {
        navigate('/settings', { state: { googleConnected: true, googleEmail: data.email || '' } })
      }, 1500)

    } catch (err) {
      setStatus('error')
      setError(err.message || 'Failed to connect Google account.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#faf8f5',
      fontFamily: 'var(--font-body, system-ui, sans-serif)',
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e8e3de',
        borderRadius: 16,
        padding: '48px 40px',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {status === 'connecting' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>
              <span style={{ display: 'inline-block', animation: 'spin 1.5s linear infinite' }}>
                &#x21BB;
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.3rem', color: 'var(--brown-dark, #3e2723)', margin: '0 0 8px' }}>
              Connecting Google...
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #888)', margin: 0 }}>
              Exchanging authorization with Google. This will only take a moment.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 16, color: '#137333' }}>
              &#x2713;
            </div>
            <h2 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.3rem', color: 'var(--brown-dark, #3e2723)', margin: '0 0 8px' }}>
              Connected!
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted, #888)', margin: 0 }}>
              Google account linked successfully. Redirecting to Settings...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 16, color: '#c5221f' }}>
              &#x2717;
            </div>
            <h2 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.3rem', color: 'var(--brown-dark, #3e2723)', margin: '0 0 8px' }}>
              Connection Failed
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#c5221f', margin: '0 0 16px' }}>
              {error}
            </p>
            <button
              onClick={() => navigate('/settings')}
              style={{
                padding: '8px 24px',
                borderRadius: 8,
                border: '1px solid #e0dbd6',
                background: '#fff',
                color: 'var(--brown-dark, #3e2723)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Back to Settings
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

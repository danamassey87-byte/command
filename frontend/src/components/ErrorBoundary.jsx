// Global ErrorBoundary — catches any uncaught render error in the route tree
// and shows a copy-pasteable message instead of a blank white page.
//
// Mounted in App.jsx just inside <Suspense> so it covers every lazy route.
// Resetting on navigation: parent passes the current pathname as `resetKey`,
// changing it remounts the boundary (clears the error) when the user
// navigates away.

import React from 'react'

export default class ErrorBoundary extends React.Component {
  state = { error: null, info: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    // Also log so console copy-paste catches it.
    console.error('[ErrorBoundary]', error, info)
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, info: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children

    const err = this.state.error
    const stack = err?.stack || String(err)
    const compStack = this.state.info?.componentStack || ''

    return (
      <div style={{
        padding: '40px 32px', maxWidth: 920, margin: '40px auto',
        background: '#fff', border: '1px solid #f3d1c8', borderRadius: 12,
        boxShadow: '0 4px 18px rgba(0,0,0,0.06)',
        fontFamily: 'Nunito Sans, system-ui, sans-serif',
      }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a8401f', marginBottom: 6 }}>
          Something broke on this page
        </div>
        <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 600, color: '#3a2a1e', fontSize: '1.55rem', margin: '0 0 8px' }}>
          {err?.message || 'Unexpected error'}
        </h2>
        <p style={{ color: '#6a5a4d', fontSize: '0.92rem', marginBottom: 18 }}>
          The page crashed before it could render. Try the buttons below — and if it keeps happening, copy the details below into a message so it can be fixed.
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          <button
            onClick={() => { this.setState({ error: null, info: null }) }}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #3a2a1e', background: '#3a2a1e', color: '#fff', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}
          >Try again</button>
          <button
            onClick={() => { window.location.href = '/' }}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #3a2a1e', background: '#fff', color: '#3a2a1e', cursor: 'pointer', fontSize: '0.86rem', fontWeight: 600 }}
          >Back to Dashboard</button>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d3c8bd', background: '#fff', color: '#6a5a4d', cursor: 'pointer', fontSize: '0.86rem' }}
          >Hard refresh</button>
          <button
            onClick={() => {
              const blob = `${err?.message || ''}\n\n${stack}\n\n--- Component Stack ---\n${compStack}`
              navigator.clipboard?.writeText(blob).catch(() => {})
            }}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d3c8bd', background: '#fff', color: '#6a5a4d', cursor: 'pointer', fontSize: '0.86rem' }}
          >Copy error details</button>
        </div>

        <details style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', color: '#8a7263', fontSize: '0.82rem', fontWeight: 600 }}>Show technical details</summary>
          <pre style={{
            marginTop: 12, padding: 14, borderRadius: 8,
            background: '#faf6f1', border: '1px solid #ece4d8',
            fontSize: '0.74rem', color: '#3a2a1e', lineHeight: 1.5,
            overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
{stack}
{compStack ? `\n--- Component Stack ---${compStack}` : ''}
          </pre>
        </details>
      </div>
    )
  }
}

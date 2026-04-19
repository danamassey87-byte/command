import { useAuth } from '../lib/AuthContext'

export default function DemoBanner() {
  const { demoMode, exitDemoMode } = useAuth()
  if (!demoMode) return null

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '8px 16px',
      background: 'var(--brown-dark)',
      color: 'var(--white)',
      fontSize: '0.82rem',
      fontWeight: 600,
      letterSpacing: '0.02em',
    }}>
      <span>Demo Mode — browsing with sample data</span>
      <button
        onClick={exitDemoMode}
        style={{
          padding: '4px 14px',
          border: '1.5px solid var(--white)',
          borderRadius: 6,
          background: 'transparent',
          color: 'var(--white)',
          fontSize: '0.78rem',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Exit Demo
      </button>
    </div>
  )
}

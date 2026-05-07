// ─────────────────────────────────────────────────────────────────────────────
// HomeValueComingSoon — placeholder for the Home Valuation feature.
//
// Queued way down the road (Dana's call 2026-05-07). The full HomeValue.jsx
// implementation is parked in this folder and can be wired back into the
// route when the feature is ready to ship.
// ─────────────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'

export default function HomeValueComingSoon() {
  return (
    <div style={{ maxWidth: 720, margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 12 }}>🏡</div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 400, fontStyle: 'italic', color: 'var(--brown-dark)', margin: '0 0 12px' }}>
        Home Valuation
      </h1>
      <div style={{
        display: 'inline-block', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--brown-warm, #8b6f53)',
        background: 'var(--cream, #faf8f5)', border: '1px solid var(--color-border)',
        padding: '4px 12px', borderRadius: 999, marginBottom: 24,
      }}>
        Coming Soon
      </div>
      <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
        A public "What's my home worth?" landing page that captures seller leads,
        plus an internal valuation tool for quick listing-appointment estimates.
      </p>
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 32 }}>
        Parked until later — needs a non-MLS comp data source decision (manual entry, ATTOM, etc).
        Without it, valuations would be too rough to surface to clients.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          to="/sellers"
          style={{
            padding: '10px 20px', borderRadius: 8, background: 'var(--brown-dark)',
            color: '#fff', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 500,
          }}
        >
          ← Back to Sellers
        </Link>
        <Link
          to="/crm/sellers"
          style={{
            padding: '10px 20px', borderRadius: 8, background: 'transparent',
            color: 'var(--brown-dark)', textDecoration: 'none',
            border: '1px solid var(--color-border)',
            fontSize: '0.88rem', fontWeight: 500,
          }}
        >
          Listings dashboard
        </Link>
      </div>
    </div>
  )
}

import { useCostLedger } from '../lib/hooks.js'
import { useMemo } from 'react'

export default function CostMiniWidget() {
  const { data: ledger } = useCostLedger()
  const entries = ledger ?? []

  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentEntries = entries.filter(e => e.month?.startsWith(currentMonth))
  const total = currentEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
  const budget = Math.max(...currentEntries.map(e => Number(e.budget_cap || 0)), 0) || 150
  const pct = budget > 0 ? Math.round((total / budget) * 100) : 0

  const topServices = useMemo(() =>
    currentEntries.filter(e => Number(e.amount) > 0).sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 3),
    [currentEntries]
  )

  if (entries.length === 0) return null

  return (
    <div style={{
      background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border, #C8C3B9)',
      borderRadius: 8, padding: 16,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono, monospace)', fontSize: '0.62rem',
        textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--color-text-muted, #B79782)',
        marginBottom: 8,
      }}>
        Monthly Spend
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
          fontSize: '1.8rem', lineHeight: 1, color: 'var(--brown-dark)',
        }}>
          ${total.toFixed(0)}
        </span>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
          / ${budget} ({pct}%)
        </span>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 4, background: 'var(--color-border)', borderRadius: 2, marginBottom: 8, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%', borderRadius: 2, transition: 'width 0.3s',
          width: `${Math.min(pct, 100)}%`,
          background: pct > 95 ? '#c0604a' : pct > 80 ? '#c99a2e' : 'var(--sage-green, #8B9A7B)',
        }} />
      </div>

      {topServices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {topServices.map(e => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--brown-warm)' }}>{e.service}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--brown-dark)', fontWeight: 500 }}>${Number(e.amount).toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Button, Badge } from './ui/index.jsx'
import * as DB from '../lib/supabase.js'

const VERDICT_STYLE = {
  pass:  { bg: 'rgba(139,154,123,.08)', border: 'var(--sage-green, #8B9A7B)', color: '#566b4a', icon: '✓', label: 'Pass' },
  warn:  { bg: 'rgba(201,154,46,.08)', border: '#c99a2e', color: '#c99a2e', icon: '⚠', label: 'Warning' },
  block: { bg: 'rgba(192,96,74,.08)', border: '#c0604a', color: '#c0604a', icon: '✕', label: 'Blocked' },
}

export default function ComplianceCheck({ targetKind, targetId, content, onOverride }) {
  const [result, setResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')
  const [showOverride, setShowOverride] = useState(false)

  const runCheck = async () => {
    if (!content?.trim()) return
    setChecking(true)
    try {
      // Client-side rule check (basic patterns)
      // In production, this would call Claude via an edge function
      const rules = []
      const contentLower = content.toLowerCase()

      // Fair Housing checks
      const fairHousingTerms = ['family-friendly', 'perfect for families', 'no children', 'adults only', 'christian neighborhood', 'church nearby', 'walking distance to synagogue', 'ethnic', 'minorities']
      for (const term of fairHousingTerms) {
        if (contentLower.includes(term)) {
          rules.push({ source: 'Fair Housing Act', chunk: `Contains potentially discriminatory language: "${term}"`, severity: 'block' })
        }
      }

      // ADRE checks
      if (!contentLower.includes('real brokerage') && !contentLower.includes('brokered by')) {
        // Only flag for listing descriptions, not social posts
        if (targetKind === 'listing-description' || targetKind === 'email') {
          rules.push({ source: 'ADRE R4-28-1101', chunk: 'Brokerage disclosure missing — Arizona requires brokerage name in advertising', severity: 'warn' })
        }
      }

      // Guaranteed language
      const guaranteeTerms = ['guaranteed sale', 'guarantee your home', 'we guarantee', 'guaranteed to sell']
      for (const term of guaranteeTerms) {
        if (contentLower.includes(term)) {
          rules.push({ source: 'NAR Code of Ethics', chunk: `Avoid guarantee language: "${term}" — could be interpreted as a binding promise`, severity: 'warn' })
        }
      }

      // Determine verdict
      const hasBlock = rules.some(r => r.severity === 'block')
      const hasWarn = rules.some(r => r.severity === 'warn')
      const verdict = hasBlock ? 'block' : hasWarn ? 'warn' : 'pass'

      const check = await DB.createComplianceCheck({
        target_kind: targetKind,
        target_id: targetId,
        verdict,
        rules_cited: rules,
      })

      setResult({ verdict, rules, id: check.id })
    } catch (e) {
      alert(e.message)
    } finally {
      setChecking(false)
    }
  }

  const handleOverride = async () => {
    if (!overrideReason.trim() || !result?.id) return
    try {
      // Log the override
      await DB.createComplianceCheck({
        target_kind: targetKind,
        target_id: targetId,
        verdict: 'pass',
        rules_cited: result.rules,
        override_reason: overrideReason.trim(),
      })
      setResult(prev => ({ ...prev, verdict: 'pass', overridden: true }))
      setShowOverride(false)
      onOverride?.()
    } catch (e) { alert(e.message) }
  }

  // Not yet checked
  if (!result) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: 'var(--cream, #EFEDE8)', borderRadius: 6,
        border: '1px solid var(--color-border, #C8C3B9)',
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--brown-warm)', flex: 1 }}>
          Compliance check required before publishing
        </span>
        <Button size="sm" onClick={runCheck} disabled={checking || !content?.trim()}>
          {checking ? 'Checking...' : 'Run Check'}
        </Button>
      </div>
    )
  }

  const style = VERDICT_STYLE[result.verdict] || VERDICT_STYLE.pass

  return (
    <div style={{
      background: style.bg, borderRadius: 8,
      border: `1px solid ${style.border}`, overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8,
        borderBottom: result.rules.length ? `1px solid ${style.border}` : 'none',
      }}>
        <span style={{ fontSize: '1.1rem' }}>{style.icon}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: style.color, flex: 1 }}>
          Compliance: {style.label}
          {result.overridden && <span style={{ fontWeight: 400, marginLeft: 6 }}>(overridden)</span>}
        </span>
        {result.rules.length > 0 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            {result.rules.length} rule{result.rules.length > 1 ? 's' : ''} cited
          </span>
        )}
        <Button size="sm" variant="ghost" onClick={runCheck} disabled={checking}>
          {checking ? '...' : 'Re-check'}
        </Button>
      </div>

      {/* Rules */}
      {result.rules.length > 0 && (
        <div style={{ padding: '8px 12px' }}>
          {result.rules.map((rule, i) => (
            <div key={i} style={{
              padding: '6px 8px', marginBottom: 4, borderRadius: 4,
              borderLeft: `3px solid ${rule.severity === 'block' ? '#c0604a' : '#c99a2e'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Badge variant={rule.severity === 'block' ? 'danger' : 'warning'} size="sm">
                  {rule.severity}
                </Badge>
                <span style={{
                  fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)',
                }}>
                  {rule.source}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--brown-warm)', margin: '3px 0 0', lineHeight: 1.4 }}>
                {rule.chunk}
              </p>
            </div>
          ))}

          {/* Override option for blocks/warns */}
          {result.verdict !== 'pass' && !result.overridden && (
            <div style={{ marginTop: 8 }}>
              {!showOverride ? (
                <button
                  onClick={() => setShowOverride(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.72rem', color: 'var(--brown-mid)', textDecoration: 'underline',
                    textUnderlineOffset: 3,
                  }}
                >
                  Override with reason (logged to audit trail)
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                    placeholder="Reason for override..."
                    style={{
                      flex: 1, padding: '5px 10px', fontSize: '0.78rem', border: '1px solid var(--color-border)',
                      borderRadius: 4, fontFamily: 'inherit',
                    }}
                  />
                  <Button size="sm" onClick={handleOverride} disabled={!overrideReason.trim()}>Override</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowOverride(false)}>Cancel</Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

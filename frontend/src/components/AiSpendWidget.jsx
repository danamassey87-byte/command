// ─────────────────────────────────────────────────────────────────────────────
// AiSpendWidget — month-to-date AI spend across all services in one place.
//
// Reads from `ai_generation_log` (every Replicate call writes one row) and
// groups by service + kind for a quick scan.
//
// Future: when ai-bill.ts is wired into our Anthropic edge functions
// (generate-content, cma-parse, host-report-followup), Anthropic costs
// will populate automatically — they all write to the same log table.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import supabase from '../lib/supabase'

const KIND_META = {
  virtual_staging:        { icon: '🪑', label: 'Virtual Staging' },
  generate_image:         { icon: '🎨', label: 'Generate Image' },
  content_generation:     { icon: '✨', label: 'Content Generation' },
  cma_parse:              { icon: '📊', label: 'CMA Parse' },
  host_report_followup:   { icon: '🔥', label: 'Host Report Cascade' },
  other:                  { icon: '🤖', label: 'Other' },
}

function fmtUsd(cents) {
  if (!cents) return '$0.00'
  return '$' + (cents / 100).toFixed(2)
}

function startOfMonthIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString()
}
function startOfPriorMonthIso() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString()
}

export default function AiSpendWidget() {
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [thisMonth, setThisMonth] = useState([])
  const [lastMonth, setLastMonth] = useState([])

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const thisStart = startOfMonthIso()
      const lastStart = startOfPriorMonthIso()
      const [{ data: tm }, { data: lm }] = await Promise.all([
        supabase.from('ai_generation_log')
          .select('service, kind, model, cost_cents, created_at')
          .gte('created_at', thisStart)
          .eq('succeeded', true),
        supabase.from('ai_generation_log')
          .select('cost_cents')
          .gte('created_at', lastStart)
          .lt('created_at', thisStart)
          .eq('succeeded', true),
      ])
      setThisMonth(tm || [])
      setLastMonth(lm || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const totals = useMemo(() => {
    const byKind = {}
    let total = 0
    for (const r of thisMonth) {
      const k = r.kind || 'other'
      const c = Number(r.cost_cents) || 0
      total += c
      if (!byKind[k]) byKind[k] = { kind: k, cents: 0, calls: 0 }
      byKind[k].cents += c
      byKind[k].calls++
    }
    const lmTotal = lastMonth.reduce((s, r) => s + (Number(r.cost_cents) || 0), 0)
    return {
      total,
      lmTotal,
      byKind: Object.values(byKind).sort((a, b) => b.cents - a.cents),
    }
  }, [thisMonth, lastMonth])

  if (loading) {
    return <div className="widget" style={{ padding: 14, color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Tallying AI spend…</div>
  }
  if (error) {
    return <div className="widget" style={{ padding: 14, color: 'var(--color-danger)', fontSize: '0.82rem' }}>AI Spend: {error}</div>
  }
  if (totals.total === 0 && totals.lmTotal === 0) {
    // Hide entirely if there's been no AI activity at all yet
    return null
  }

  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long' })
  const change = totals.lmTotal > 0
    ? Math.round(((totals.total - totals.lmTotal) / totals.lmTotal) * 100)
    : null

  return (
    <div className="widget" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-light, #f0ece6)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
              🤖 AI Spend · {monthLabel} MTD
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--brown-dark)', marginTop: 2 }}>
              {fmtUsd(totals.total)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Last month</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
              {fmtUsd(totals.lmTotal)}
              {change !== null && (
                <span style={{ marginLeft: 6, fontSize: '0.74rem', color: change >= 0 ? 'var(--color-warning, #c8a05a)' : 'var(--color-success)', fontWeight: 600 }}>
                  {change >= 0 ? '+' : ''}{change}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {totals.byKind.length > 0 && (
        <div style={{ padding: '4px 0' }}>
          {totals.byKind.map(b => {
            const meta = KIND_META[b.kind] || KIND_META.other
            return (
              <div key={b.kind} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--color-border-light, #f0ece6)' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.84rem', color: 'var(--brown-dark)', fontWeight: 500 }}>{meta.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{b.calls} call{b.calls === 1 ? '' : 's'}</div>
                </div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(b.cents)}</span>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ padding: '8px 16px', fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Replicate, Anthropic & friends</span>
        <a href="https://replicate.com/account/billing" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brown-warm)', textDecoration: 'none' }}>
          ↗ Replicate billing
        </a>
      </div>
    </div>
  )
}

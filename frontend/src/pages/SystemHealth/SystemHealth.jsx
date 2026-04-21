import { useState, useMemo } from 'react'
import { Button, Badge, Input, Select, SectionHeader, Card } from '../../components/ui/index.jsx'
import { useCostLedger, useSystemEvents, useBackgroundJobs, useIsMobile } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'

// ─── Cost Ledger ─────────────────────────────────────────────────────────────
function CostLedgerPanel({ isMobile }) {
  const { data: ledger, refetch } = useCostLedger()
  const entries = ledger ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    service: '',
    month: new Date().toISOString().slice(0, 7) + '-01',
    amount: '',
    budget_cap: '',
  })

  // Group by month, sum totals
  const byMonth = useMemo(() => {
    const groups = {}
    for (const e of entries) {
      const m = e.month?.slice(0, 7) || 'unknown'
      if (!groups[m]) groups[m] = { entries: [], total: 0 }
      groups[m].entries.push(e)
      groups[m].total += Number(e.amount || 0)
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  // Current month summary
  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentEntries = entries.filter(e => e.month?.startsWith(currentMonth))
  const currentTotal = currentEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
  const currentBudget = Math.max(...currentEntries.map(e => Number(e.budget_cap || 0)), 600)
  const pct = currentBudget > 0 ? Math.round((currentTotal / currentBudget) * 100) : 0

  const handleAdd = async () => {
    if (!draft.service || !draft.amount) return
    setSaving(true)
    try {
      await DB.upsertCostEntry({
        service: draft.service.trim(),
        month: draft.month,
        amount: Number(draft.amount),
        budget_cap: draft.budget_cap ? Number(draft.budget_cap) : null,
        source: 'manual',
      })
      setShowAdd(false)
      setDraft({ service: '', month: new Date().toISOString().slice(0, 7) + '-01', amount: '', budget_cap: '' })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      {/* Current month card */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 20,
      }}>
        <div style={{
          background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border, #C8C3B9)',
          borderRadius: 8, padding: 18,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono, monospace)', fontSize: '0.65rem',
            textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--color-text-muted, #B79782)',
            marginBottom: 6,
          }}>This Month</div>
          <div style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontSize: '2.2rem', lineHeight: 1, color: 'var(--brown-dark, #3A2A1E)',
          }}>
            ${currentTotal.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
            of ${currentBudget.toFixed(0)} budget · {pct}%
          </div>
          {/* Progress bar */}
          <div style={{
            height: 6, background: 'var(--color-border, #C8C3B9)', borderRadius: 3, marginTop: 10, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 3, transition: 'width 0.3s',
              width: `${Math.min(pct, 100)}%`,
              background: pct > 95 ? '#c0604a' : pct > 80 ? '#c99a2e' : 'var(--sage-green, #8B9A7B)',
            }} />
          </div>
        </div>

        <div style={{
          background: pct > 80 ? 'rgba(201,154,46,.06)' : 'var(--cream-3, #F6F4EE)',
          border: `1px solid ${pct > 80 ? 'rgba(201,154,46,.3)' : 'var(--color-border, #C8C3B9)'}`,
          borderRadius: 8, padding: 18,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono, monospace)', fontSize: '0.65rem',
            textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--color-text-muted)',
            marginBottom: 6,
          }}>Watch List</div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--brown-warm, #5A4136)' }}>
            {currentEntries.length === 0 ? (
              <span>No costs logged this month yet.</span>
            ) : (
              currentEntries
                .sort((a, b) => Number(b.amount) - Number(a.amount))
                .slice(0, 4)
                .map(e => (
                  <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{e.service}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${Number(e.amount).toFixed(2)}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Add entry */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontFamily: 'var(--font-display, "Cormorant Garamond", serif)', fontWeight: 500, fontSize: '1.2rem', margin: 0 }}>
          Ledger
        </h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Entry</Button>
      </div>

      {showAdd && (
        <div style={{
          padding: 14, background: 'var(--cream, #EFEDE8)', borderRadius: 8, marginBottom: 12,
          border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
            <Select label="Service" value={draft.service} onChange={e => setDraft(d => ({ ...d, service: e.target.value }))} style={{ flex: 1 }}>
              <option value="">Select...</option>
              <option value="Supabase">Supabase</option>
              <option value="Anthropic">Anthropic (Claude)</option>
              <option value="OpenAI">OpenAI (Embeddings)</option>
              <option value="Resend">Resend</option>
              <option value="Vercel">Vercel</option>
              <option value="Google APIs">Google APIs</option>
              <option value="OpenWeatherMap">OpenWeatherMap</option>
              <option value="Blotato">Blotato</option>
              <option value="Other">Other</option>
            </Select>
            <Input label="Month" type="date" value={draft.month} onChange={e => setDraft(d => ({ ...d, month: e.target.value }))} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
            <Input label="Amount ($)" type="number" step="0.01" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} style={{ flex: 1 }} />
            <Input label="Budget Cap ($)" type="number" step="1" value={draft.budget_cap} onChange={e => setDraft(d => ({ ...d, budget_cap: e.target.value }))} placeholder="600" style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || !draft.service || !draft.amount}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Monthly breakdown */}
      {byMonth.map(([month, data]) => (
        <div key={month} style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 0', borderBottom: '1px solid var(--color-border, #C8C3B9)',
            marginBottom: 6,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 600,
              color: 'var(--brown-dark)', textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              {new Date(month + '-02').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 600 }}>
              ${data.total.toFixed(2)}
            </span>
          </div>
          {data.entries.sort((a, b) => Number(b.amount) - Number(a.amount)).map(e => (
            <div key={e.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '5px 12px', fontSize: '0.8rem', color: 'var(--brown-warm)',
            }}>
              <span>{e.service}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>${Number(e.amount).toFixed(2)}</span>
                <Badge variant={e.source === 'api' ? 'success' : 'default'} size="sm">{e.source}</Badge>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── System Events ───────────────────────────────────────────────────────────
function SystemEventsPanel() {
  const { data: events } = useSystemEvents(50)
  const entries = events ?? []

  const severityStyle = {
    info: { color: 'var(--brown-warm)', dot: 'var(--sage-green, #8B9A7B)' },
    warn: { color: '#c99a2e', dot: '#c99a2e' },
    err:  { color: '#c0604a', dot: '#c0604a' },
  }

  if (entries.length === 0) {
    return <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '12px 0' }}>No system events recorded yet. Events will appear here as integrations run.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {entries.map(e => {
        const sev = severityStyle[e.severity] || severityStyle.info
        return (
          <div key={e.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 12px',
            borderLeft: `3px solid ${sev.dot}`, borderRadius: 4,
            background: e.severity === 'err' ? 'rgba(192,96,74,.04)' : 'transparent',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%', background: sev.dot,
              flexShrink: 0, marginTop: 6,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: sev.color }}>{e.kind}</span>
                {e.source && (
                  <span style={{
                    fontSize: '0.62rem', padding: '1px 6px', borderRadius: 999,
                    border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {e.source}
                  </span>
                )}
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                  {new Date(e.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              {e.body && <p style={{ fontSize: '0.75rem', color: 'var(--brown-warm)', margin: '2px 0 0' }}>{e.body}</p>}
              {e.auto_recovered && <Badge variant="success" size="sm">auto-recovered</Badge>}
              {e.resolved_at && <Badge variant="success" size="sm">resolved</Badge>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Background Jobs ─────────────────────────────────────────────────────────
function BackgroundJobsPanel() {
  const { data: jobs } = useBackgroundJobs()
  const entries = jobs ?? []

  const statusDot = { ok: '#8B9A7B', warn: '#c99a2e', err: '#c0604a', syncing: '#B79782' }

  if (entries.length === 0) {
    return <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '12px 0' }}>No background jobs configured yet. Jobs will appear here as integrations are set up.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {entries.map(j => (
        <div key={j.id} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
          background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6,
          border: j.status === 'err' ? '1px solid rgba(192,96,74,.3)' : '1px solid transparent',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: statusDot[j.status] || statusDot.ok, flexShrink: 0,
          }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{j.name}</div>
            {j.schedule && (
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {j.schedule}
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <Badge variant={j.status === 'ok' ? 'success' : j.status === 'err' ? 'danger' : 'warning'} size="sm">
              {j.status}
            </Badge>
            {j.last_run && (
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Last: {new Date(j.last_run).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'costs',  label: 'Costs' },
  { id: 'events', label: 'Events' },
  { id: 'jobs',   label: 'Jobs' },
]

export default function SystemHealth() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('costs')

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <SectionHeader title="System Health" subtitle="Usage, costs, events & background jobs" />

      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px', fontSize: '0.8rem', borderRadius: 6,
              border: `1px solid ${tab === t.id ? 'var(--brown-dark, #3A2A1E)' : 'var(--color-border, #C8C3B9)'}`,
              background: tab === t.id ? 'var(--brown-dark, #3A2A1E)' : 'transparent',
              color: tab === t.id ? 'var(--cream, #EFEDE8)' : 'var(--brown-warm, #5A4136)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'costs'  && <CostLedgerPanel isMobile={isMobile} />}
      {tab === 'events' && <SystemEventsPanel />}
      {tab === 'jobs'   && <BackgroundJobsPanel />}
    </div>
  )
}

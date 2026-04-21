import { useState } from 'react'
import { Button, Badge, Input, Select, Textarea } from './ui/index.jsx'
import { useNotificationRules } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

const SOURCES = [
  { value: 'transact',     label: 'Transact' },
  { value: 'oh-kiosk',     label: 'OH Kiosk' },
  { value: 'compliance',   label: 'Compliance' },
  { value: 'cost-guard',   label: 'Cost Guard' },
  { value: 'kpi',          label: 'KPI Alert' },
  { value: 'lofty',        label: 'Lofty Sync' },
  { value: 'weather',      label: 'Weather' },
  { value: 'studio',       label: 'Content Studio' },
  { value: 'bio-link',     label: 'Bio Link' },
  { value: 'resend',       label: 'Resend Email' },
]

const SAMPLE_EVENTS = {
  transact:   ['bba_signed', 'offer_accepted', 'inspection_complete', 'clear_to_close', 'deal_closed'],
  'oh-kiosk': ['new_signin', 'hot_lead_detected'],
  compliance: ['block_flagged', 'override_used'],
  'cost-guard': ['budget_80pct', 'budget_95pct', 'budget_exceeded'],
  kpi:        ['weekly_summary', 'goal_met', 'metric_drop'],
  lofty:      ['sync_conflict', 'new_contact_pulled', 'sync_failed'],
  weather:    ['heat_advisory', 'storm_warning'],
  studio:     ['draft_approved', 'published', 'performance_milestone'],
  'bio-link': ['new_lead_captured'],
  resend:     ['bounce_detected', 'reply_received'],
}

export default function NotificationRulesEditor() {
  const { data: rules, refetch } = useNotificationRules()
  const entries = rules ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({
    source: 'transact',
    event: '',
    destination: '#daily-brief',
    is_active: true,
  })

  const handleSave = async () => {
    if (!draft.source || !draft.event || !draft.destination) return
    setSaving(true)
    try {
      await DB.upsertNotificationRule({
        source: draft.source,
        event: draft.event.trim(),
        destination: draft.destination.trim(),
        is_active: draft.is_active,
        payload_template: {},
        interactive_actions: [],
      })
      setShowAdd(false)
      setDraft({ source: 'transact', event: '', destination: '#daily-brief', is_active: true })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const toggleActive = async (rule) => {
    try {
      await DB.upsertNotificationRule({ ...rule, is_active: !rule.is_active })
      refetch()
    } catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>
            Notification Rules
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            Route events from integrations to Slack channels
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Rule</Button>
      </div>

      {showAdd && (
        <div style={{
          padding: 14, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)',
          marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select label="Source" value={draft.source} onChange={e => setDraft(d => ({ ...d, source: e.target.value, event: '' }))} style={{ flex: 1 }}>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
            <Select label="Event" value={draft.event} onChange={e => setDraft(d => ({ ...d, event: e.target.value }))} style={{ flex: 1 }}>
              <option value="">Select event...</option>
              {(SAMPLE_EVENTS[draft.source] ?? []).map(ev => <option key={ev} value={ev}>{ev}</option>)}
              <option value="__custom__">Custom...</option>
            </Select>
          </div>
          {draft.event === '__custom__' && (
            <Input label="Custom event name" value="" onChange={e => setDraft(d => ({ ...d, event: e.target.value }))} placeholder="e.g., my_custom_event" />
          )}
          <Input label="Destination (Slack channel)" value={draft.destination} onChange={e => setDraft(d => ({ ...d, destination: e.target.value }))} placeholder="#channel-name or #buyer_{slug}" />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--brown-warm)', cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.is_active} onChange={e => setDraft(d => ({ ...d, is_active: e.target.checked }))} />
            Active
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleSave} disabled={saving || !draft.event || !draft.destination}>
              {saving ? 'Saving...' : 'Save Rule'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {entries.length === 0 && !showAdd ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '16px 0' }}>
          No notification rules configured. Add rules to route integration events to Slack channels.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.map(rule => {
            const sourceMeta = SOURCES.find(s => s.value === rule.source) || { label: rule.source }
            return (
              <div key={rule.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6,
                opacity: rule.is_active ? 1 : 0.5,
              }}>
                <button
                  onClick={() => toggleActive(rule)}
                  title={rule.is_active ? 'Disable' : 'Enable'}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: 'pointer',
                    background: rule.is_active ? 'var(--sage-green, #8B9A7B)' : 'var(--color-border)',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      fontSize: '0.68rem', padding: '2px 8px', borderRadius: 999,
                      border: '1px solid var(--color-border)', background: '#fff',
                      fontFamily: 'var(--font-mono)', color: 'var(--brown-warm)',
                    }}>
                      {sourceMeta.label}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                      {rule.event}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
                  → {rule.destination}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Badge } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'

// ─── Settings ▸ Checklists ───────────────────────────────────────────────────
// Edit the ONE workflow checklist template per side (Buyer / Listing / Open
// House). These are the exact step lists surfaced on the Buyers page, Sellers
// page, Pipeline deal detail and the SOP pages — all reading checklist_runs off
// these templates, so an edit here updates the checklist everywhere.

const CATEGORY_META = [
  { category: 'listing', label: 'Seller / Listing Checklist', hint: 'Shown on every seller listing (e.g. 9603 E Theia Dr).' },
  { category: 'buyer',   label: 'Buyer Checklist',            hint: 'Shown on every buyer contact.' },
  { category: 'oh',      label: 'Open House Checklist',        hint: 'Shown on each open house.' },
]

const ROLES = ['Agent', 'TC']

const emptyStep = (order) => ({
  id: 'step_' + Math.abs(order) + '_' + (order + 1) + '_' + (order * 7 + 3),
  label: '', section: 'General', order, role: 'Agent', system: 'command', offset_days: null, notes: '', arizona: false,
})

export default function ChecklistsTab() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState('listing')
  const [steps, setSteps] = useState([])       // working copy of the active template's steps
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    DB.getChecklistTemplates().then(({ data }) => {
      setTemplates(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const activeTemplate = useMemo(
    () => templates.find(t => t.category === activeCat) || null,
    [templates, activeCat]
  )

  // Load working steps when the active template changes
  useEffect(() => {
    const s = Array.isArray(activeTemplate?.steps) ? activeTemplate.steps : []
    // Sort by order so display matches stored order
    setSteps([...s].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)))
    setDirty(false)
    setEditingId(null)
  }, [activeTemplate])

  // Group steps by section (preserving order)
  const sections = useMemo(() => {
    const out = []
    const byName = {}
    for (const step of steps) {
      const name = step.section || 'General'
      if (!byName[name]) { byName[name] = { name, items: [] }; out.push(byName[name]) }
      byName[name].items.push(step)
    }
    return out
  }, [steps])

  const mutate = useCallback((fn) => {
    setSteps(prev => { const next = fn([...prev]); return next })
    setDirty(true)
  }, [])

  const updateStep = (id, patch) => mutate(list => list.map(s => s.id === id ? { ...s, ...patch } : s))
  const deleteStep = (id) => { if (confirm('Delete this step?')) mutate(list => list.filter(s => s.id !== id)) }

  const moveStep = (id, dir) => mutate(list => {
    const i = list.findIndex(s => s.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return list
    const copy = [...list];[copy[i], copy[j]] = [copy[j], copy[i]]; return copy
  })

  const addStep = (sectionName) => {
    const order = (steps.reduce((m, s) => Math.max(m, s.order ?? 0), 0)) + 1
    const step = { ...emptyStep(order), section: sectionName, id: 'custom_' + order + '_' + steps.length }
    // Insert after the last step of that section
    mutate(list => {
      let lastIdx = -1
      list.forEach((s, idx) => { if ((s.section || 'General') === sectionName) lastIdx = idx })
      const copy = [...list]
      copy.splice(lastIdx + 1, 0, step)
      return copy
    })
    setEditingId(step.id)
  }

  const save = async () => {
    if (!activeTemplate) return
    setSaving(true)
    try {
      // Re-index order to reflect current display order
      const reindexed = steps.map((s, i) => ({ ...s, order: (i + 1) * 10 }))
      await DB.updateChecklistTemplate(activeTemplate.id, { steps: reindexed })
      setDirty(false)
      setEditingId(null)
      load()
    } catch (e) { alert('Save failed: ' + e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <p style={{ padding: 16 }}>Loading checklists…</p>

  return (
    <div className="settings-section">
      <div style={{ marginBottom: 12 }}>
        <h2 className="settings-section-title">Workflow Checklists</h2>
        <p className="settings-section-desc">
          One checklist per side. Edits here update the checklist shown on the Buyers page, Sellers page,
          Pipeline and SOP views — everywhere that client's checklist appears.
        </p>
      </div>

      {/* Category picker */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORY_META.map(c => {
          const tmpl = templates.find(t => t.category === c.category)
          const count = Array.isArray(tmpl?.steps) ? tmpl.steps.length : 0
          return (
            <button
              key={c.category}
              className={`settings-tab${activeCat === c.category ? ' settings-tab--active' : ''}`}
              onClick={() => {
                if (dirty && !confirm('Discard unsaved changes to this checklist?')) return
                setActiveCat(c.category)
              }}
            >
              {c.label} ({count})
            </button>
          )
        })}
      </div>

      {!activeTemplate ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No template found for this category.</p>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              {CATEGORY_META.find(c => c.category === activeCat)?.hint} · {steps.length} steps
            </span>
            <Button variant="primary" size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
            </Button>
          </div>

          {sections.map(section => (
            <div key={section.name} style={{ marginBottom: 18 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-border)', paddingBottom: 4, marginBottom: 6,
              }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--brown-warm)', margin: 0 }}>
                  {section.name}
                </h3>
                <button className="settings-link-btn" onClick={() => addStep(section.name)} style={{ fontSize: '0.72rem' }}>
                  + Add step
                </button>
              </div>

              {section.items.map(step => (
                <div key={step.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--color-bg-subtle, #f0ece6)' }}>
                  {editingId === step.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input
                        className="settings-input" value={step.label} autoFocus
                        placeholder="Step label"
                        onChange={e => updateStep(step.id, { label: e.target.value })}
                      />
                      <input
                        className="settings-input" value={step.section || ''}
                        placeholder="Section / module"
                        onChange={e => updateStep(step.id, { section: e.target.value })}
                      />
                      <input
                        className="settings-input" value={step.notes || ''}
                        placeholder="Notes (optional)"
                        onChange={e => updateStep(step.id, { notes: e.target.value })}
                      />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ fontSize: '0.75rem' }}>
                          Role:{' '}
                          <select value={step.role || 'Agent'} onChange={e => updateStep(step.id, { role: e.target.value })}>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </label>
                        <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input type="checkbox" checked={!!step.arizona} onChange={e => updateStep(step.id, { arizona: e.target.checked })} />
                          Arizona-specific
                        </label>
                        <label style={{ fontSize: '0.75rem' }}>
                          Offset days:{' '}
                          <input
                            type="number" style={{ width: 60 }}
                            value={step.offset_days ?? ''}
                            onChange={e => updateStep(step.id, { offset_days: e.target.value === '' ? null : Number(e.target.value) })}
                          />
                        </label>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <Button variant="primary" size="sm" onClick={() => setEditingId(null)}>Done</Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontSize: '0.84rem' }}>
                        {step.label || <em style={{ color: 'var(--color-text-muted)' }}>(empty)</em>}
                        {step.role === 'TC' && <Badge variant="warning" size="sm" style={{ marginLeft: 6 }}>TC</Badge>}
                        {step.arizona && <Badge variant="info" size="sm" style={{ marginLeft: 6 }}>AZ</Badge>}
                        {step.notes && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--color-text-muted)' }} title={step.notes}>ⓘ</span>}
                      </span>
                      <button className="settings-icon-btn" title="Move up" onClick={() => moveStep(step.id, -1)}>↑</button>
                      <button className="settings-icon-btn" title="Move down" onClick={() => moveStep(step.id, 1)}>↓</button>
                      <button className="settings-icon-btn" title="Edit" onClick={() => setEditingId(step.id)}>✎</button>
                      <button className="settings-icon-btn" title="Delete" onClick={() => deleteStep(step.id)}>🗑</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button variant="primary" size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? 'Saving…' : dirty ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

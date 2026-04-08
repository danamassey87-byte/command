import { useState, useEffect } from 'react'
import { Button, Textarea, Input, Badge } from '../../components/ui/index.jsx'
import { STAGE_EMAILS } from '../Pipeline/Pipeline'
import { DEFAULT_TEMPLATES as BUYER_DEFAULTS } from '../Pipeline/BuyerSOP'
import { DEFAULT_TEMPLATES as SELLER_DEFAULTS } from '../Pipeline/SellerSOP'

// ─── Constants ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'pipeline',   label: 'Pipeline Emails' },
  { key: 'buyer_sop',  label: 'Buyer Workflow' },
  { key: 'seller_sop', label: 'Seller Workflow' },
  { key: 'ai_plans',   label: 'AI Plan Prompts' },
  { key: 'scripts',    label: 'My Scripts' },
]

// ─── AI Plan prompt templates (used by Sellers → Generate Plan with AI) ─────
// These mirror the defaults in Sellers.jsx but are editable here so Dana can
// manage all four scenarios (new / my expired / takeover / FSBO) in one place.
const AI_PLAN_STORAGE_PREFIX = 'ai_plan_template_v2_'
const AI_PLAN_SCENARIOS = [
  {
    key: 'new',
    label: 'New Listing',
    desc: 'Fresh listing, never been on the market.',
    default: `Generate a complete launch plan for this new listing:

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Create a step-by-step checklist organized by phase.
Phases: "prep" (listing preparation), "launch" (MLS & go-live), "postlaunch" (promotion & follow-up)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable, specific tasks. Include 12-18 items total.`,
  },
  {
    key: 'my_expired',
    label: 'Relaunch — My Prior Expired',
    desc: 'I had this listing before — I have full history on showings, feedback, and what worked/didn\'t.',
    default: `Generate a relaunch plan for a previously-expired listing that I (Dana) had the first time around.

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Context: I have full history on this listing — prior showings, buyer feedback, marketing performance. Reference what worked and what didn't. Positioning: "we learned, here's the fix."

Create a step-by-step checklist organized by phase.
Phases: "analysis" (review prior data & adjust strategy), "refresh" (property + presentation improvements), "relaunch" (re-activation & promotion)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable, specific tasks that leverage prior data. Include 12-18 items total.`,
  },
  {
    key: 'taken_over',
    label: 'Relaunch — Takeover from Another Agent',
    desc: 'Listing expired under a different agent. I do NOT have access to prior showing/feedback data.',
    default: `Generate a relaunch plan for a listing I'm TAKING OVER from a previous agent.

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Context: This listing expired under a different agent. I do NOT have access to prior showings, buyer feedback, or marketing data. Start from a clean slate — do NOT reference any prior agent effort I wouldn't actually know about. Positioning: "fresh eyes, new team, new strategy."

Create a step-by-step checklist organized by phase.
Phases: "analysis" (fresh market review & competitive audit), "refresh" (property + presentation from scratch), "relaunch" (new-team reintroduction & promotion)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable tasks a new-agent-with-new-approach would do. Include 12-18 items total.`,
  },
  {
    key: 'fsbo',
    label: 'FSBO Conversion',
    desc: 'Seller tried it themselves first and is now listing with me.',
    default: `Generate a launch plan for a seller who was previously FSBO (For Sale By Owner) and is now listing with me.

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Context: Seller tried it themselves first. Positioning: "professional marketing + agent network you didn't have before." Acknowledge their effort, then show what agent representation unlocks.

Create a step-by-step checklist organized by phase.
Phases: "prep" (re-presenting the property professionally), "launch" (MLS + wide syndication), "postlaunch" (agent-network outreach & promotion)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable, specific tasks. Include 12-18 items total.`,
  },
]

const AI_PLAN_MERGE_TAGS = ['{clientName}', '{address}', '{city}', '{zip}', '{price}', '{dom}', '{status}', '{type}']

const SCRIPT_TYPES = [
  { value: 'call_script',    label: 'Call Script' },
  { value: 'objection',      label: 'Objection Handler' },
  { value: 'talking_points', label: 'Talking Points' },
  { value: 'sms_template',   label: 'SMS Template' },
  { value: 'email_snippet',  label: 'Email Snippet' },
  { value: 'other',          label: 'Other' },
]

const MERGE_TAGS = {
  pipeline:   ['{contact}', '{property}', '{price}', '{financing}', '{lender}', '{title}', '{closing}', '{contract_date}', '{agent_name}', '{brokerage}', '{agent_phone}'],
  buyer_sop:  ['{contact_name}', '{property_address}', '{sale_price}', '{closing_date}', '{title_company}', '{lender_name}', '{agent_name}', '{brokerage}', '{agent_phone}'],
  seller_sop: ['{contact_name}', '{property_address}', '{sale_price}', '{closing_date}', '{title_company}', '{agent_name}', '{brokerage}', '{agent_phone}'],
  scripts:    ['{first_name}', '{last_name}', '{property_address}', '{agent_name}', '{brokerage}', '{agent_phone}'],
}

// ─── localStorage helpers ───────────────────────────────────────────────────
const PIPELINE_KEY = 'pipeline_email_templates'
const BUYER_KEY    = 'buyer_sop_templates'
const SELLER_KEY   = 'seller_sop_templates'
const SCRIPTS_KEY  = 'user_scripts'

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback }
  catch { return fallback }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

// ─── Build flat template lists from source data ─────────────────────────────
function getPipelineList(overrides) {
  return Object.entries(STAGE_EMAILS).map(([key, tmpl]) => {
    const merged = overrides[key] ? { ...tmpl, ...overrides[key] } : tmpl
    return { key, name: merged.label, type: 'email', subject: merged.subject, body: merged.body, modified: !!overrides[key] }
  })
}

function getSOPList(saved, defaults) {
  return Object.entries(saved).filter(([, t]) => t.type === 'email').map(([key, t]) => ({
    key,
    name: t.name,
    type: 'email',
    subject: t.subject ?? '',
    body: t.body ?? '',
    modified: defaults[key] ? (t.subject !== defaults[key].subject || t.body !== defaults[key].body) : false,
  }))
}

// ═════════════════════════════════════════════════════════════════════════════
// Component
// ═════════════════════════════════════════════════════════════════════════════
export default function TemplatesTab() {
  const [category, setCategory]   = useState('pipeline')
  const [editing, setEditing]     = useState(null)
  const [draft, setDraft]         = useState({ subject: '', body: '' })
  const [search, setSearch]       = useState('')

  // ── Pipeline overrides ──
  const [pipelineOvr, setPipelineOvr] = useState(() => loadJSON(PIPELINE_KEY, {}))
  useEffect(() => saveJSON(PIPELINE_KEY, pipelineOvr), [pipelineOvr])

  // ── Buyer SOP ──
  const [buyerTpls, setBuyerTpls] = useState(() => loadJSON(BUYER_KEY, null) || BUYER_DEFAULTS)
  useEffect(() => saveJSON(BUYER_KEY, buyerTpls), [buyerTpls])

  // ── Seller SOP ──
  const [sellerTpls, setSellerTpls] = useState(() => loadJSON(SELLER_KEY, null) || SELLER_DEFAULTS)
  useEffect(() => saveJSON(SELLER_KEY, sellerTpls), [sellerTpls])

  // ── Scripts ──
  const [scripts, setScripts] = useState(() => loadJSON(SCRIPTS_KEY, []))
  useEffect(() => saveJSON(SCRIPTS_KEY, scripts), [scripts])
  const [newScript, setNewScript] = useState(null)

  // ── Derived template list ──
  const templates = (() => {
    if (category === 'pipeline')   return getPipelineList(pipelineOvr)
    if (category === 'buyer_sop')  return getSOPList(buyerTpls, BUYER_DEFAULTS)
    if (category === 'seller_sop') return getSOPList(sellerTpls, SELLER_DEFAULTS)
    return []
  })()

  const filtered = search
    ? templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.subject?.toLowerCase().includes(search.toLowerCase()))
    : templates

  const filteredScripts = search
    ? scripts.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.body?.toLowerCase().includes(search.toLowerCase()))
    : scripts

  // ── Handlers ──
  function startEdit(t) {
    setEditing(t.key)
    setDraft({ subject: t.subject, body: t.body })
  }

  function cancelEdit() { setEditing(null); setDraft({ subject: '', body: '' }) }

  function saveEdit(key) {
    if (category === 'pipeline') {
      setPipelineOvr(prev => ({ ...prev, [key]: { subject: draft.subject, body: draft.body } }))
    } else if (category === 'buyer_sop') {
      setBuyerTpls(prev => ({ ...prev, [key]: { ...prev[key], subject: draft.subject, body: draft.body } }))
    } else if (category === 'seller_sop') {
      setSellerTpls(prev => ({ ...prev, [key]: { ...prev[key], subject: draft.subject, body: draft.body } }))
    }
    setEditing(null)
  }

  function resetTemplate(key) {
    if (category === 'pipeline') {
      setPipelineOvr(prev => { const next = { ...prev }; delete next[key]; return next })
    } else if (category === 'buyer_sop') {
      if (BUYER_DEFAULTS[key]) setBuyerTpls(prev => ({ ...prev, [key]: BUYER_DEFAULTS[key] }))
    } else if (category === 'seller_sop') {
      if (SELLER_DEFAULTS[key]) setSellerTpls(prev => ({ ...prev, [key]: SELLER_DEFAULTS[key] }))
    }
    setEditing(null)
  }

  function addScript() {
    setNewScript({ name: '', type: 'call_script', body: '' })
  }

  function saveNewScript() {
    if (!newScript?.name?.trim()) return
    setScripts(prev => [...prev, { ...newScript, id: crypto.randomUUID(), created_at: new Date().toISOString() }])
    setNewScript(null)
  }

  function updateScript(id, updates) {
    setScripts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  function deleteScript(id) {
    setScripts(prev => prev.filter(s => s.id !== id))
    if (editing === id) setEditing(null)
  }

  function startEditScript(s) {
    setEditing(s.id)
    setDraft({ name: s.name, type: s.type, body: s.body })
  }

  function saveEditScript(id) {
    updateScript(id, { name: draft.name, type: draft.type, body: draft.body })
    setEditing(null)
  }

  const tags = MERGE_TAGS[category] || []

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h3 className="settings-section__title">Templates & Scripts</h3>
        <p className="settings-section__desc">
          Edit email templates, SMS messages, and reusable scripts across your entire workflow. Changes here update everywhere.
        </p>
      </div>

      {/* ── Category pills ── */}
      <div className="tpl-categories">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            className={`tpl-cat-btn${category === c.key ? ' tpl-cat-btn--active' : ''}`}
            onClick={() => { setCategory(c.key); setEditing(null); setSearch(''); setNewScript(null) }}
          >
            {c.label}
            {c.key === 'scripts' && scripts.length > 0 && <span className="tpl-cat-count">{scripts.length}</span>}
          </button>
        ))}
      </div>

      {/* ── Search + actions bar ── */}
      <div className="tpl-toolbar">
        <input
          className="tpl-search"
          placeholder={category === 'scripts' ? 'Search scripts...' : 'Search templates...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {category === 'scripts' && (
          <Button size="sm" onClick={addScript}>+ New Script</Button>
        )}
      </div>

      {/* ── New script form ── */}
      {newScript && (
        <div className="tpl-card tpl-card--editing">
          <div className="tpl-edit-form">
            <div className="tpl-edit-row">
              <Input label="Script Name" value={newScript.name} onChange={e => setNewScript(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Cold Call — Expired Listing" />
              <div className="tpl-edit-field">
                <label className="settings-label">Type</label>
                <select className="tpl-select" value={newScript.type} onChange={e => setNewScript(prev => ({ ...prev, type: e.target.value }))}>
                  {SCRIPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <Textarea label="Content" value={newScript.body} onChange={e => setNewScript(prev => ({ ...prev, body: e.target.value }))} rows={8} placeholder="Write your script, talking points, or template content here..." />
            {tags.length > 0 && (
              <div className="tpl-merge-tags">
                <span className="tpl-merge-label">Variables:</span>
                {tags.map(t => <span key={t} className="tpl-merge-chip" onClick={() => setNewScript(prev => ({ ...prev, body: prev.body + t }))}>{t}</span>)}
              </div>
            )}
            <div className="tpl-edit-actions">
              <Button size="sm" onClick={saveNewScript}>Save Script</Button>
              <Button size="sm" variant="ghost" onClick={() => setNewScript(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Plan Prompts (four scenarios, localStorage-backed) ── */}
      {category === 'ai_plans' && (
        <AIPlanPromptsEditor search={search} />
      )}

      {/* ── Template list ── */}
      {category !== 'scripts' && category !== 'ai_plans' && filtered.map(t => (
        <div key={t.key} className={`tpl-card${editing === t.key ? ' tpl-card--editing' : ''}`}>
          {editing === t.key ? (
            <div className="tpl-edit-form">
              <Input label="Subject Line" value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} />
              <Textarea label="Body" value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} rows={12} />
              {tags.length > 0 && (
                <div className="tpl-merge-tags">
                  <span className="tpl-merge-label">Variables:</span>
                  {tags.map(tag => <span key={tag} className="tpl-merge-chip" onClick={() => setDraft(d => ({ ...d, body: d.body + tag }))}>{tag}</span>)}
                </div>
              )}
              <div className="tpl-edit-actions">
                <Button size="sm" onClick={() => saveEdit(t.key)}>Save Changes</Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                {t.modified && <Button size="sm" variant="ghost" onClick={() => resetTemplate(t.key)}>Reset to Default</Button>}
              </div>
            </div>
          ) : (
            <>
              <div className="tpl-card__header">
                <div className="tpl-card__title-row">
                  <span className="tpl-card__name">{t.name}</span>
                  <span className="tpl-type-badge tpl-type-badge--email">Email</span>
                  {t.modified && <span className="tpl-modified-badge">Modified</span>}
                </div>
                <div className="tpl-card__actions">
                  <button className="tpl-action-btn" onClick={() => startEdit(t)}>Edit</button>
                  <button className="tpl-action-btn" onClick={() => navigator.clipboard.writeText(t.body)}>Copy</button>
                  {t.modified && <button className="tpl-action-btn tpl-action-btn--reset" onClick={() => resetTemplate(t.key)}>Reset</button>}
                </div>
              </div>
              {t.subject && <p className="tpl-card__subject">Subject: {t.subject}</p>}
              <p className="tpl-card__preview">{(t.body || '').slice(0, 160).replace(/\\n/g, ' ')}...</p>
            </>
          )}
        </div>
      ))}

      {/* ── Scripts list ── */}
      {category === 'scripts' && filteredScripts.length === 0 && !newScript && (
        <div className="tpl-empty">
          <p className="tpl-empty__title">No scripts yet</p>
          <p className="tpl-empty__desc">Create reusable scripts, talking points, objection handlers, and snippets you can pull into emails, campaigns, and more.</p>
          <Button size="sm" onClick={addScript}>+ Create Your First Script</Button>
        </div>
      )}

      {category === 'scripts' && filteredScripts.map(s => (
        <div key={s.id} className={`tpl-card${editing === s.id ? ' tpl-card--editing' : ''}`}>
          {editing === s.id ? (
            <div className="tpl-edit-form">
              <div className="tpl-edit-row">
                <Input label="Script Name" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
                <div className="tpl-edit-field">
                  <label className="settings-label">Type</label>
                  <select className="tpl-select" value={draft.type} onChange={e => setDraft(d => ({ ...d, type: e.target.value }))}>
                    {SCRIPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <Textarea label="Content" value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} rows={10} />
              {tags.length > 0 && (
                <div className="tpl-merge-tags">
                  <span className="tpl-merge-label">Variables:</span>
                  {tags.map(tag => <span key={tag} className="tpl-merge-chip" onClick={() => setDraft(d => ({ ...d, body: d.body + tag }))}>{tag}</span>)}
                </div>
              )}
              <div className="tpl-edit-actions">
                <Button size="sm" onClick={() => saveEditScript(s.id)}>Save Changes</Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="tpl-card__header">
                <div className="tpl-card__title-row">
                  <span className="tpl-card__name">{s.name}</span>
                  <span className={`tpl-type-badge tpl-type-badge--${s.type}`}>{SCRIPT_TYPES.find(t => t.value === s.type)?.label || s.type}</span>
                </div>
                <div className="tpl-card__actions">
                  <button className="tpl-action-btn" onClick={() => startEditScript(s)}>Edit</button>
                  <button className="tpl-action-btn" onClick={() => navigator.clipboard.writeText(s.body)}>Copy</button>
                  <button className="tpl-action-btn tpl-action-btn--delete" onClick={() => deleteScript(s.id)}>Delete</button>
                </div>
              </div>
              <p className="tpl-card__preview">{(s.body || '').slice(0, 160).replace(/\\n/g, ' ')}...</p>
            </>
          )}
        </div>
      ))}

      {/* ── Empty search state ── */}
      {category !== 'scripts' && category !== 'ai_plans' && filtered.length === 0 && search && (
        <p className="tpl-empty__desc" style={{ textAlign: 'center', padding: 24 }}>No templates match "{search}"</p>
      )}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// AI Plan Prompts editor — manages the four localStorage-backed scenario
// templates used by Sellers → Generate Plan with AI. Editing any scenario
// here also updates the inline editor in the Sellers modal (same storage).
// ═════════════════════════════════════════════════════════════════════════════
function AIPlanPromptsEditor({ search }) {
  const [editingKey, setEditingKey] = useState(null)
  const [draftBody, setDraftBody] = useState('')
  const [savedTick, setSavedTick] = useState(null)
  const [versionTick, setVersionTick] = useState(0) // force re-read after save

  const getSaved = (key) => {
    const stored = localStorage.getItem(AI_PLAN_STORAGE_PREFIX + key)
    return stored ?? AI_PLAN_SCENARIOS.find(s => s.key === key).default
  }

  const startEdit = (scenario) => {
    setEditingKey(scenario.key)
    setDraftBody(getSaved(scenario.key))
  }
  const cancelEdit = () => {
    setEditingKey(null)
    setDraftBody('')
  }
  const saveEdit = (scenario) => {
    localStorage.setItem(AI_PLAN_STORAGE_PREFIX + scenario.key, draftBody)
    setEditingKey(null)
    setDraftBody('')
    setSavedTick(scenario.key)
    setVersionTick(v => v + 1)
    setTimeout(() => setSavedTick(null), 1600)
  }
  const resetToDefault = (scenario) => {
    if (!confirm(`Reset "${scenario.label}" to the default prompt?\n\nYour customizations will be lost.`)) return
    localStorage.removeItem(AI_PLAN_STORAGE_PREFIX + scenario.key)
    if (editingKey === scenario.key) setDraftBody(scenario.default)
    setVersionTick(v => v + 1)
  }
  const insertTag = (tag) => {
    setDraftBody(prev => prev + tag)
  }

  const q = (search || '').toLowerCase().trim()
  const visible = AI_PLAN_SCENARIOS.filter(s =>
    !q || s.label.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q)
  )

  return (
    <>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
        Each scenario has its own prompt. When you click <strong>Generate Plan with AI</strong> on a listing, the prompt for that listing's <strong>Source</strong> is used. Edits here apply to every future generation for that scenario.
      </p>
      {visible.map(scenario => {
        const stored = localStorage.getItem(AI_PLAN_STORAGE_PREFIX + scenario.key)
        const modified = stored !== null && stored !== scenario.default
        // versionTick is read to force re-render when we mutate localStorage.
        void versionTick
        return (
          <div key={scenario.key} className={`tpl-card${editingKey === scenario.key ? ' tpl-card--editing' : ''}`}>
            {editingKey === scenario.key ? (
              <div className="tpl-edit-form">
                <div className="tpl-card__title-row" style={{ marginBottom: 4 }}>
                  <span className="tpl-card__name">{scenario.label}</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>{scenario.desc}</p>
                <Textarea
                  label="Prompt"
                  value={draftBody}
                  onChange={e => setDraftBody(e.target.value)}
                  rows={16}
                />
                <div className="tpl-merge-tags">
                  <span className="tpl-merge-label">Variables:</span>
                  {AI_PLAN_MERGE_TAGS.map(tag => (
                    <span key={tag} className="tpl-merge-chip" onClick={() => insertTag(tag)}>{tag}</span>
                  ))}
                </div>
                <div className="tpl-edit-actions">
                  <Button size="sm" onClick={() => saveEdit(scenario)}>Save Changes</Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                  {modified && (
                    <Button size="sm" variant="ghost" onClick={() => resetToDefault(scenario)}>Reset to Default</Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="tpl-card__header">
                  <div className="tpl-card__title-row">
                    <span className="tpl-card__name">{scenario.label}</span>
                    <span className="tpl-type-badge">AI Prompt</span>
                    {modified && <span className="tpl-modified-badge">Modified</span>}
                    {savedTick === scenario.key && <span className="tpl-modified-badge" style={{ background: '#d6ebd6', color: '#2d5c2d' }}>Saved</span>}
                  </div>
                  <div className="tpl-card__actions">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(scenario)}>Edit</Button>
                    {modified && (
                      <Button size="sm" variant="ghost" onClick={() => resetToDefault(scenario)}>Reset</Button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>{scenario.desc}</p>
                <pre
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-text-muted)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'inherit',
                    margin: 0,
                    maxHeight: 120,
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  {getSaved(scenario.key).slice(0, 300)}{getSaved(scenario.key).length > 300 ? '…' : ''}
                </pre>
              </>
            )}
          </div>
        )
      })}
      {visible.length === 0 && (
        <p className="tpl-empty__desc" style={{ textAlign: 'center', padding: 24 }}>No scenarios match "{search}"</p>
      )}
    </>
  )
}

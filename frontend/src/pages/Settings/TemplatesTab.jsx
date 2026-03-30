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
  { key: 'scripts',    label: 'My Scripts' },
]

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

      {/* ── Template list ── */}
      {category !== 'scripts' && filtered.map(t => (
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
      {category !== 'scripts' && filtered.length === 0 && search && (
        <p className="tpl-empty__desc" style={{ textAlign: 'center', padding: 24 }}>No templates match "{search}"</p>
      )}
    </div>
  )
}

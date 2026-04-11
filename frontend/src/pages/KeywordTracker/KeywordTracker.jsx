import { useState, useMemo } from 'react'
import { Button, Input, Select, Textarea, SlidePanel } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import { useSeoKeywords } from '../../lib/hooks.js'
import './KeywordTracker.css'

const CATEGORIES = ['all', 'seo', 'aeo', 'local', 'long_tail']
const PRIORITIES = ['high', 'medium', 'low']

export default function KeywordTracker() {
  const { data: keywords, refetch } = useSeoKeywords()
  const [filterCat, setFilterCat] = useState('all')
  const [filterPri, setFilterPri] = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ keyword: '', category: 'seo', priority: 'medium', target_pages: [], notes: '' })
  const [saving, setSaving] = useState(false)
  const [pageInput, setPageInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const kwList = keywords ?? []

  const filtered = useMemo(() => {
    let list = kwList
    if (filterCat !== 'all') list = list.filter(k => k.category === filterCat)
    if (filterPri !== 'all') list = list.filter(k => k.priority === filterPri)
    return list
  }, [kwList, filterCat, filterPri])

  // Stats
  const stats = useMemo(() => ({
    total: kwList.length,
    seo: kwList.filter(k => k.category === 'seo').length,
    aeo: kwList.filter(k => k.category === 'aeo').length,
    high: kwList.filter(k => k.priority === 'high').length,
  }), [kwList])

  // ─── Panel helpers ──────────────────────────────────────────────────────
  function openNew() {
    setEditing(null)
    setDraft({ keyword: '', category: 'seo', priority: 'medium', target_pages: [], notes: '' })
    setPageInput('')
    setPanelOpen(true)
  }

  function openEdit(kw) {
    setEditing(kw)
    setDraft({
      keyword: kw.keyword, category: kw.category, priority: kw.priority,
      target_pages: kw.target_pages || [], notes: kw.notes || '',
    })
    setPageInput('')
    setPanelOpen(true)
  }

  function addPage() {
    const val = pageInput.trim()
    if (!val || draft.target_pages.includes(val)) return
    setDraft(d => ({ ...d, target_pages: [...d.target_pages, val] }))
    setPageInput('')
  }

  function removePage(idx) {
    setDraft(d => ({ ...d, target_pages: d.target_pages.filter((_, i) => i !== idx) }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!draft.keyword.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await DB.updateSeoKeyword(editing.id, draft)
      } else {
        await DB.createSeoKeyword(draft)
      }
      await refetch()
      setPanelOpen(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing || !confirm('Delete this keyword?')) return
    await DB.deleteSeoKeyword(editing.id)
    await refetch()
    setPanelOpen(false)
  }

  // ─── AI Suggest ─────────────────────────────────────────────────────────
  async function aiSuggestKeywords() {
    setAiLoading(true)
    try {
      const result = await DB.generateContent({
        type: 'suggest_keywords',
        prompt: 'Real estate in Gilbert, Mesa, Queen Creek, Chandler, East Valley AZ. Agent: Dana Massey, REAL Broker. Target buyers, sellers, investors.',
      })
      const suggested = result.keywords || []
      if (suggested.length) {
        for (const kw of suggested) {
          if (typeof kw === 'object' && kw.keyword) {
            const exists = kwList.some(k => k.keyword.toLowerCase() === kw.keyword.toLowerCase())
            if (!exists) {
              await DB.createSeoKeyword({
                keyword: kw.keyword,
                category: kw.category || 'seo',
                priority: 'medium',
                notes: kw.rationale || '',
              })
            }
          }
        }
        await refetch()
      }
    } catch (err) {
      console.error('AI suggest error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="kt-page">
      <div className="kt-header">
        <div>
          <h1 className="kt-header__title">SEO / AEO Keyword Tracker</h1>
          <p className="kt-header__sub">Track target keywords for search engines and answer engines across your content.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="pc-ai-btn"
            onClick={aiSuggestKeywords}
            disabled={aiLoading}
            style={{ whiteSpace: 'nowrap' }}
          >
            <span className="pc-ai-btn__icon">✦</span>
            {aiLoading ? 'Suggesting...' : 'AI Suggest'}
          </button>
          <Button size="sm" onClick={openNew}>+ Add Keyword</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="kt-stats">
        <div className="kt-stat">
          <div className="kt-stat__val">{stats.total}</div>
          <div className="kt-stat__label">Total Keywords</div>
        </div>
        <div className="kt-stat">
          <div className="kt-stat__val">{stats.seo}</div>
          <div className="kt-stat__label">SEO</div>
        </div>
        <div className="kt-stat">
          <div className="kt-stat__val">{stats.aeo}</div>
          <div className="kt-stat__label">AEO</div>
        </div>
        <div className="kt-stat">
          <div className="kt-stat__val">{stats.high}</div>
          <div className="kt-stat__label">High Priority</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>Category</div>
          <div className="kt-filters">
            {CATEGORIES.map(cat => (
              <button key={cat} className={`kt-chip ${filterCat === cat ? 'kt-chip--active' : ''}`} onClick={() => setFilterCat(cat)}>
                {cat === 'long_tail' ? 'Long Tail' : cat}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>Priority</div>
          <div className="kt-filters">
            <button className={`kt-chip ${filterPri === 'all' ? 'kt-chip--active' : ''}`} onClick={() => setFilterPri('all')}>All</button>
            {PRIORITIES.map(p => (
              <button key={p} className={`kt-chip ${filterPri === p ? 'kt-chip--active' : ''}`} onClick={() => setFilterPri(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Keywords table */}
      {filtered.length > 0 ? (
        <table className="kt-table">
          <thead>
            <tr>
              <th>Keyword</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Used</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(kw => (
              <tr key={kw.id} onClick={() => openEdit(kw)}>
                <td className="kt-table__kw">{kw.keyword}</td>
                <td><span className={`kt-cat kt-cat--${kw.category}`}>{kw.category === 'long_tail' ? 'Long Tail' : kw.category}</span></td>
                <td><span className={`kt-priority kt-priority--${kw.priority}`}>{kw.priority}</span></td>
                <td>{kw.times_used || 0}</td>
                <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kw.notes || '—'}</td>
                <td>
                  <div className="kt-table__actions">
                    <button onClick={e => { e.stopPropagation(); openEdit(kw) }}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0', fontSize: '0.85rem' }}>
          No keywords match your filters. Click "+ Add Keyword" or "AI Suggest" to get started.
        </p>
      )}

      {/* ─── Add / Edit Panel ─── */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? 'Edit Keyword' : 'Add Keyword'}
      >
        <form className="kt-form" onSubmit={handleSave}>
          <div className="kt-form-field">
            <label>Keyword / Phrase *</label>
            <Input value={draft.keyword} onChange={e => setDraft(d => ({ ...d, keyword: e.target.value }))} placeholder='e.g. "homes for sale in Gilbert AZ"' required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="kt-form-field">
              <label>Category</label>
              <Select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
                <option value="seo">SEO</option>
                <option value="aeo">AEO (Answer Engine)</option>
                <option value="local">Local</option>
                <option value="long_tail">Long Tail</option>
              </Select>
            </div>
            <div className="kt-form-field">
              <label>Priority</label>
              <Select value={draft.priority} onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </div>
          </div>

          <div className="kt-form-field">
            <label>Target Pages / URLs</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {(draft.target_pages || []).map((page, i) => (
                <span key={i} onClick={() => removePage(i)} style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: '0.78rem',
                  background: '#f0ece7', color: 'var(--brown-dark)', cursor: 'pointer',
                }}>
                  {page} &times;
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Input
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                placeholder="Add a URL or page name..."
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPage())}
                style={{ flex: 1 }}
              />
              <Button type="button" size="sm" variant="ghost" onClick={addPage}>Add</Button>
            </div>
          </div>

          <div className="kt-form-field">
            <label>Notes</label>
            <Textarea value={draft.notes} onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))} placeholder="Strategy notes, target audience, search intent..." rows={3} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button type="submit" disabled={saving || !draft.keyword.trim()}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Keyword'}
            </Button>
            {editing && (
              <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>
            )}
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}

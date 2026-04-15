import { useState, useMemo } from 'react'
import { Button, Input, Select, SlidePanel, Badge } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import { useHashtagGroups, useHashtagPerf } from '../../lib/hooks.js'
import './HashtagBank.css'

const CATEGORIES = ['all', 'niche', 'location', 'listing', 'general', 'trending', 'seasonal']
const CAT_COLORS = {
  niche: '#6a9e72', location: 'var(--brown-mid)', listing: '#c99a2e',
  general: '#b79782', trending: '#c0604a', seasonal: '#9b72aa',
}

const PLATFORM_LIMITS = {
  instagram: { max: 30, recommended: 20 },
  tiktok: { max: 15, recommended: 5 },
  linkedin: { max: 10, recommended: 5 },
  facebook: { max: 30, recommended: 10 },
  youtube: { max: 15, recommended: 8 },
  twitter: { max: 10, recommended: 3 },
}

export default function HashtagBank() {
  const { data: groups, refetch } = useHashtagGroups()
  const [tab, setTab] = useState('groups') // groups | performance
  const [filterCat, setFilterCat] = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ name: '', category: 'general', color: '#b79782', hashtags: [] })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Performance tab
  const [perfPlatform, setPerfPlatform] = useState(null)
  const { data: perfData } = useHashtagPerf(perfPlatform)

  const groupList = groups ?? []
  const filtered = useMemo(() =>
    filterCat === 'all' ? groupList : groupList.filter(g => g.category === filterCat),
    [groupList, filterCat]
  )

  // ─── Panel helpers ──────────────────────────────────────────────────────
  function openNew() {
    setEditing(null)
    setDraft({ name: '', category: 'general', color: '#b79782', hashtags: [] })
    setTagInput('')
    setPanelOpen(true)
  }

  function openEdit(group) {
    setEditing(group)
    setDraft({ name: group.name, category: group.category, color: group.color, hashtags: [...(group.hashtags || [])] })
    setTagInput('')
    setPanelOpen(true)
  }

  function addTag() {
    const raw = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (!raw || draft.hashtags.includes(raw)) return
    setDraft(d => ({ ...d, hashtags: [...d.hashtags, raw] }))
    setTagInput('')
  }

  function removeTag(idx) {
    setDraft(d => ({ ...d, hashtags: d.hashtags.filter((_, i) => i !== idx) }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await DB.updateHashtagGroup(editing.id, draft)
      } else {
        await DB.createHashtagGroup({ ...draft, sort_order: groupList.length })
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
    if (!editing || !confirm('Delete this hashtag group?')) return
    await DB.deleteHashtagGroup(editing.id)
    await refetch()
    setPanelOpen(false)
  }

  function copyGroup(group) {
    const text = (group.hashtags || []).map(h => `#${h}`).join(' ')
    navigator.clipboard.writeText(text)
    setCopied(group.id)
    setTimeout(() => setCopied(null), 2000)
  }

  // ─── AI Suggest hashtags ─────────────────────────────────────────────────
  async function aiSuggestHashtags() {
    setAiLoading(true)
    try {
      const result = await DB.generateContent({
        type: 'suggest_hashtags',
        prompt: draft.name || 'real estate content',
        platform: 'instagram',
      })
      const suggested = result.hashtags || result.text?.match(/#?\w+/g) || []
      const cleaned = suggested.map(h => h.replace(/^#/, '').toLowerCase()).filter(h => h && !draft.hashtags.includes(h))
      if (cleaned.length) {
        setDraft(d => ({ ...d, hashtags: [...d.hashtags, ...cleaned.slice(0, 15)] }))
      }
    } catch (err) {
      console.error('AI suggest error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  // ─── Inline add to existing group ────────────────────────────────────────
  const [inlineInput, setInlineInput] = useState({})

  async function addInlineTag(groupId) {
    const raw = (inlineInput[groupId] || '').trim().replace(/^#/, '').toLowerCase()
    if (!raw) return
    const group = groupList.find(g => g.id === groupId)
    if (!group || group.hashtags?.includes(raw)) return
    await DB.updateHashtagGroup(groupId, { hashtags: [...(group.hashtags || []), raw] })
    setInlineInput(prev => ({ ...prev, [groupId]: '' }))
    await refetch()
  }

  return (
    <div className="hb-page">
      <div className="hb-header">
        <h1 className="hb-header__title">Hashtag Bank</h1>
        <Button size="sm" onClick={openNew}>+ New Group</Button>
      </div>

      {/* Tabs */}
      <div className="hb-tabs">
        <button className={`hb-tab ${tab === 'groups' ? 'hb-tab--active' : ''}`} onClick={() => setTab('groups')}>
          Groups ({groupList.length})
        </button>
        <button className={`hb-tab ${tab === 'performance' ? 'hb-tab--active' : ''}`} onClick={() => setTab('performance')}>
          Performance
        </button>
      </div>

      {/* ─── Groups Tab ─── */}
      {tab === 'groups' && (
        <>
          <div className="hb-filters">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`hb-filter-chip ${filterCat === cat ? 'hb-filter-chip--active' : ''}`}
                onClick={() => setFilterCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="hb-groups">
            {filtered.map(group => {
              const tags = group.hashtags || []
              const tagStr = tags.map(h => `#${h}`).join(' ')
              return (
                <div key={group.id} className="hb-group" style={{ borderLeftColor: group.color || 'var(--brown-mid)' }}>
                  <div className="hb-group__header">
                    <span className="hb-group__name">{group.name}</span>
                    <span className="hb-group__cat" style={{ background: CAT_COLORS[group.category] || '#999' }}>
                      {group.category}
                    </span>
                    <span className="hb-group__count">{tags.length} tags</span>
                    <div className="hb-group__actions">
                      <button onClick={() => copyGroup(group)}>
                        {copied === group.id ? '✓ Copied' : 'Copy'}
                      </button>
                      <button onClick={() => openEdit(group)}>Edit</button>
                    </div>
                  </div>
                  <div className="hb-tags">
                    {tags.map((h, i) => (
                      <span key={i} className="hb-tag">#{h}</span>
                    ))}
                  </div>
                  <div className="hb-add-row">
                    <input
                      className="hb-add-input"
                      value={inlineInput[group.id] || ''}
                      onChange={e => setInlineInput(prev => ({ ...prev, [group.id]: e.target.value }))}
                      placeholder="+ add hashtag..."
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addInlineTag(group.id))}
                    />
                  </div>
                  {tagStr && (
                    <div className="hb-copy-bar">
                      <span className="hb-copy-bar__text">{tagStr}</span>
                    </div>
                  )}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0', fontSize: '0.85rem' }}>
                No hashtag groups {filterCat !== 'all' ? `in "${filterCat}"` : 'yet'}. Click "+ New Group" to create one.
              </p>
            )}
          </div>
        </>
      )}

      {/* ─── Performance Tab ─── */}
      {tab === 'performance' && (
        <>
          <div className="hb-filters" style={{ marginBottom: 16 }}>
            <button className={`hb-filter-chip ${!perfPlatform ? 'hb-filter-chip--active' : ''}`} onClick={() => setPerfPlatform(null)}>All</button>
            {['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube'].map(p => (
              <button key={p} className={`hb-filter-chip ${perfPlatform === p ? 'hb-filter-chip--active' : ''}`} onClick={() => setPerfPlatform(p)}>
                {p}
              </button>
            ))}
          </div>

          {(perfData ?? []).length > 0 ? (
            <table className="hb-perf-table">
              <thead>
                <tr>
                  <th>Hashtag</th>
                  <th>Platform</th>
                  <th>Used</th>
                  <th>Avg Reach</th>
                  <th>Avg Engagement</th>
                  <th>Last Used</th>
                </tr>
              </thead>
              <tbody>
                {(perfData ?? []).map(row => (
                  <tr key={row.id}>
                    <td><span className="hb-perf-tag">#{row.hashtag}</span></td>
                    <td>{row.platform}</td>
                    <td>{row.times_used}</td>
                    <td>{Number(row.avg_reach || 0).toLocaleString()}</td>
                    <td>{Number(row.avg_engagement || 0).toFixed(1)}%</td>
                    <td>{row.last_used_at ? new Date(row.last_used_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0', fontSize: '0.85rem' }}>
              No performance data yet. Hashtag stats populate as you publish content and track engagement.
            </p>
          )}

          <div style={{ marginTop: 16, padding: '12px 16px', background: '#faf8f5', borderRadius: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
            <strong>Platform limits:</strong>{' '}
            {Object.entries(PLATFORM_LIMITS).map(([p, l]) => `${p}: ${l.recommended} recommended (max ${l.max})`).join(' · ')}
          </div>
        </>
      )}

      {/* ─── Add / Edit Panel ─── */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? 'Edit Hashtag Group' : 'New Hashtag Group'}
      >
        <form className="hb-form" onSubmit={handleSave}>
          <div className="hb-form-field">
            <label>Group Name *</label>
            <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. East Valley AZ, Listing Posts..." required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="hb-form-field">
              <label>Category</label>
              <Select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div className="hb-form-field">
              <label>Color</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="color" value={draft.color} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))} style={{ width: 36, height: 32, border: 'none', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{draft.color}</span>
              </div>
            </div>
          </div>

          <div className="hb-form-field">
            <label>Hashtags ({draft.hashtags.length})</label>
            <div className="hb-tags" style={{ marginBottom: 8 }}>
              {draft.hashtags.map((h, i) => (
                <span key={i} className="hb-tag hb-tag--removable" onClick={() => removeTag(i)}>
                  #{h} &times;
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="Type a hashtag and press Enter..."
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                style={{ flex: 1 }}
              />
              <Button type="button" size="sm" variant="ghost" onClick={addTag}>Add</Button>
            </div>
            <button
              type="button"
              className="pc-ai-btn"
              style={{ marginTop: 8 }}
              onClick={aiSuggestHashtags}
              disabled={aiLoading}
            >
              <span className="pc-ai-btn__icon">✦</span>
              {aiLoading ? 'Suggesting...' : 'AI Suggest Hashtags'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button type="submit" disabled={saving || !draft.name.trim()}>
              {saving ? 'Saving...' : editing ? 'Update Group' : 'Create Group'}
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

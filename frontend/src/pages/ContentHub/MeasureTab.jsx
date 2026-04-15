import { useState, useEffect } from 'react'
import { Button, Input, Textarea } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import HashtagBank from '../HashtagBank/HashtagBank.jsx'
import KeywordTracker from '../KeywordTracker/KeywordTracker.jsx'

const SUB_TABS = [
  { id: 'analytics',    label: 'Analytics',     icon: '📈' },
  { id: 'hashtags',     label: 'Hashtags',      icon: '#' },
  { id: 'seo',          label: 'SEO / AEO',     icon: '🔍' },
  { id: 'keyword_sets', label: 'Keyword Banks',  icon: '🏷️' },
]

export default function MeasureTab() {
  const [sub, setSub] = useState('analytics')

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e8e3de', marginBottom: 16 }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            style={{
              padding: '8px 16px', fontSize: '0.8rem',
              color: sub === t.id ? 'var(--brown-dark)' : 'var(--color-text-muted)',
              fontWeight: sub === t.id ? 600 : 400,
              borderBottom: sub === t.id ? '2px solid var(--brown-dark)' : '2px solid transparent',
              background: 'none', border: 'none', borderBottomStyle: 'solid',
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {sub === 'analytics'    && <AnalyticsDashboard />}
      {sub === 'hashtags'     && <HashtagBank embedded />}
      {sub === 'seo'          && <KeywordTracker embedded />}
      {sub === 'keyword_sets' && <KeywordSetsManager />}
    </div>
  )
}

/* ─── Analytics Dashboard ─── */
function AnalyticsDashboard() {
  // Placeholder — will connect to Blotato analytics API when available
  const stats = [
    { label: 'Posts This Month', value: '—', icon: '📱' },
    { label: 'Total Engagement', value: '—', icon: '❤️' },
    { label: 'Avg Engagement Rate', value: '—', icon: '📊' },
    { label: 'Top Platform', value: '—', icon: '🏆' },
  ]

  const platformStats = [
    { platform: 'Instagram', icon: '📸', posts: '—', reach: '—', engagement: '—' },
    { platform: 'Facebook', icon: '📘', posts: '—', reach: '—', engagement: '—' },
    { platform: 'TikTok', icon: '🎵', posts: '—', reach: '—', engagement: '—' },
    { platform: 'LinkedIn', icon: '💼', posts: '—', reach: '—', engagement: '—' },
  ]

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: '#fff', border: '1px solid #e8e3de', borderRadius: 10,
            padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--brown-dark)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Platform breakdown */}
      <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8e3de' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--brown-dark)', margin: 0 }}>
            Platform Performance
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0ece6' }}>
              <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Platform</th>
              <th style={{ padding: '10px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Posts</th>
              <th style={{ padding: '10px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Reach</th>
              <th style={{ padding: '10px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Engagement</th>
            </tr>
          </thead>
          <tbody>
            {platformStats.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0ece6' }}>
                <td style={{ padding: '12px 18px', color: 'var(--brown-dark)', fontWeight: 500 }}>
                  {p.icon} {p.platform}
                </td>
                <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{p.posts}</td>
                <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{p.reach}</td>
                <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{p.engagement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 16, padding: '14px 18px', background: '#faf8f5',
        borderRadius: 8, fontSize: '0.82rem', color: 'var(--color-text-muted)',
        textAlign: 'center',
      }}>
        Analytics will populate once you start publishing via Blotato and connect platform APIs.
        Data flows in automatically from your connected accounts.
      </div>
    </div>
  )
}

/* ─── SEO Keyword Sets Manager ─── */
function KeywordSetsManager() {
  const [sets, setSets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', category: 'general', keywords: '' })
  const [saving, setSaving] = useState(false)

  const CATEGORIES = ['general', 'city', 'buyer_type', 'seller_type', 'content_topic']

  useEffect(() => { loadSets() }, [])

  async function loadSets() {
    setLoading(true)
    try {
      const { data } = await DB.getSeoKeywordSets()
      setSets(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  function startEdit(set) {
    setEditingId(set?.id || 'new')
    setForm({
      name: set?.name || '',
      description: set?.description || '',
      category: set?.category || 'general',
      keywords: Array.isArray(set?.keywords) ? set.keywords.join(', ') : '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm({ name: '', description: '', category: 'general', keywords: '' })
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const keywordsArr = form.keywords.split(',').map(k => k.trim()).filter(Boolean)
      const payload = { name: form.name.trim(), description: form.description.trim(), category: form.category, keywords: keywordsArr }

      if (editingId === 'new') {
        await DB.createSeoKeywordSet(payload)
      } else {
        await DB.updateSeoKeywordSet(editingId, payload)
      }
      cancelEdit()
      loadSets()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this keyword set?')) return
    await DB.deleteSeoKeywordSet(id)
    setSets(prev => prev.filter(s => s.id !== id))
  }

  const grouped = {}
  for (const s of sets) {
    const cat = s.category || 'general'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--brown-dark)', margin: 0 }}>
            SEO Keyword Banks
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            Labeled sets of keywords — pick a set when creating content to guide AI + track SEO targets
          </p>
        </div>
        <Button size="sm" onClick={() => startEdit(null)}>+ New Set</Button>
      </div>

      {/* Edit/Create form */}
      {editingId && (
        <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Name</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Gilbert Buyers" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                style={{ width: '100%', padding: '7px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem' }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Description</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What this set targets" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Keywords (comma-separated)</label>
            <Textarea
              value={form.keywords}
              onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))}
              placeholder="homes for sale Gilbert AZ, Gilbert real estate agent, best neighborhoods Gilbert..."
              rows={3}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
              {saving ? 'Saving...' : editingId === 'new' ? 'Create Set' : 'Save Changes'}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 40 }}>Loading...</p>
      ) : sets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏷️</div>
          <p style={{ fontSize: '0.85rem' }}>No keyword sets yet. Create your first set to start targeting SEO keywords in your content.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, catSets]) => (
          <div key={category} style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 8,
              borderBottom: '1px solid #e8e3de', paddingBottom: 4,
            }}>
              {category.replace(/_/g, ' ')}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
              {catSets.map(s => {
                const kws = Array.isArray(s.keywords) ? s.keywords : []
                return (
                  <div key={s.id} style={{
                    background: '#fff', border: '1px solid #e8e3de', borderRadius: 10,
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--brown-dark)' }}>{s.name}</div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => startEdit(s)} style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: 'var(--brown-mid)', cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => handleDelete(s.id)} style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: '#c5221f', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                    {s.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>{s.description}</div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {kws.map((kw, i) => (
                        <span key={i} style={{
                          padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem',
                          background: '#edf4ee', color: 'var(--sage-green)', fontWeight: 500,
                        }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

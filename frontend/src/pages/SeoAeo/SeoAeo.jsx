import { useState, useEffect, useMemo } from 'react'
import { Button, Badge, SectionHeader, Input, Select } from '../../components/ui/index.jsx'
import supabase from '../../lib/supabase.js'

const TABS = [
  { id: 'keywords',  label: 'Keywords' },
  { id: 'citations', label: 'AI Citations' },
  { id: 'hubs',      label: 'Hub & Spoke' },
  { id: 'audits',    label: 'Audits' },
]

const AI_ENGINES = [
  { value: 'chatgpt',    label: 'ChatGPT',    color: '#10a37f' },
  { value: 'claude',     label: 'Claude',      color: '#d4a27f' },
  { value: 'perplexity', label: 'Perplexity',  color: '#20b2aa' },
  { value: 'gemini',     label: 'Gemini',      color: '#4285f4' },
]

const INTENT_COLORS = {
  informational: 'var(--sage-green, #8B9A7B)',
  transactional: 'var(--brown-mid, #B79782)',
  local: '#c99a2e',
}

// ─── Keywords Tab ────────────────────────────────────────────────────────────
function KeywordsTab() {
  const [keywords, setKeywords] = useState([])
  const [snapshots, setSnapshots] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ keyword: '', category: '', intent: 'local', volume: '', difficulty: '' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const { data: kw } = await supabase.from('seo_keywords').select('*').order('keyword')
    setKeywords(kw ?? [])
    // Load latest snapshot per keyword
    if (kw?.length) {
      const { data: snaps } = await supabase.from('ranking_snapshots').select('*')
        .in('keyword_id', kw.map(k => k.id))
        .order('at', { ascending: false })
      const byKw = {}
      for (const s of (snaps ?? [])) {
        if (!byKw[s.keyword_id]) byKw[s.keyword_id] = s
      }
      setSnapshots(byKw)
    }
    setLoading(false)
  }

  const handleAdd = async () => {
    if (!draft.keyword.trim()) return
    setSaving(true)
    try {
      await supabase.from('seo_keywords').insert({
        keyword: draft.keyword.trim(),
        category: draft.category.trim() || null,
        intent: draft.intent,
        volume: draft.volume ? Number(draft.volume) : null,
        difficulty: draft.difficulty ? Number(draft.difficulty) : null,
      })
      setShowAdd(false)
      setDraft({ keyword: '', category: '', intent: 'local', volume: '', difficulty: '' })
      await load()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleAddSnapshot = async (kwId) => {
    const rank = prompt('Current rank (leave blank if not in top 100):')
    if (rank === null) return
    await supabase.from('ranking_snapshots').insert({
      keyword_id: kwId,
      rank: rank?.trim() ? Number(rank) : null,
    })
    await load()
  }

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 20 }}>Loading...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Keyword</Button>
      </div>
      {showAdd && (
        <div style={{ padding: 12, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input label="Keyword" value={draft.keyword} onChange={e => setDraft(d => ({ ...d, keyword: e.target.value }))} placeholder="gilbert az real estate agent" style={{ flex: 2 }} />
            <Input label="Category" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))} placeholder="brand" style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Select label="Intent" value={draft.intent} onChange={e => setDraft(d => ({ ...d, intent: e.target.value }))} style={{ flex: 1 }}>
              <option value="local">Local</option>
              <option value="informational">Informational</option>
              <option value="transactional">Transactional</option>
            </Select>
            <Input label="Volume" type="number" value={draft.volume} onChange={e => setDraft(d => ({ ...d, volume: e.target.value }))} placeholder="320" style={{ flex: 1 }} />
            <Input label="Difficulty" type="number" value={draft.difficulty} onChange={e => setDraft(d => ({ ...d, difficulty: e.target.value }))} placeholder="45" style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || !draft.keyword.trim()}>{saving ? 'Saving...' : 'Add'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {keywords.map(kw => {
          const snap = snapshots[kw.id]
          return (
            <div key={kw.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'var(--color-bg-subtle)', borderRadius: 6,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{kw.keyword}</span>
                  {kw.intent && (
                    <span style={{
                      fontSize: '0.58rem', padding: '1px 6px', borderRadius: 999,
                      border: `1px solid ${INTENT_COLORS[kw.intent] || 'var(--color-border)'}`,
                      color: INTENT_COLORS[kw.intent] || 'var(--color-text-muted)',
                    }}>{kw.intent}</span>
                  )}
                  {kw.category && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)' }}>{kw.category}</span>
                  )}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {kw.volume ? `${kw.volume} vol` : ''}{kw.volume && kw.difficulty ? ' · ' : ''}{kw.difficulty ? `${kw.difficulty} KD` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', minWidth: 70 }}>
                {snap ? (
                  <>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1,
                      color: snap.rank && snap.rank <= 10 ? 'var(--sage-green)' : snap.rank && snap.rank <= 30 ? '#c99a2e' : 'var(--brown-warm)',
                    }}>
                      {snap.rank ? `#${snap.rank}` : '—'}
                    </div>
                    <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)' }}>
                      {new Date(snap.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>No data</span>
                )}
              </div>
              <button onClick={() => handleAddSnapshot(kw.id)} style={{
                background: 'none', border: '1px solid var(--color-border)', borderRadius: 4,
                padding: '3px 8px', fontSize: '0.68rem', cursor: 'pointer', color: 'var(--brown-warm)',
              }}>+ Rank</button>
            </div>
          )
        })}
        {keywords.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>No keywords tracked yet.</p>}
      </div>
    </div>
  )
}

// ─── AI Citations Tab ────────────────────────────────────────────────────────
function CitationsTab() {
  const [citations, setCitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ query: '', ai: 'chatgpt', cited: false, citation_url: '', sample_text: '' })

  useEffect(() => {
    supabase.from('ai_citations').select('*').order('measured_at', { ascending: false }).limit(100)
      .then(({ data }) => { setCitations(data ?? []); setLoading(false) })
  }, [])

  const handleAdd = async () => {
    if (!draft.query.trim()) return
    setSaving(true)
    try {
      await supabase.from('ai_citations').insert({
        query: draft.query.trim(), ai: draft.ai,
        cited: draft.cited, citation_url: draft.citation_url.trim() || null,
        sample_text: draft.sample_text.trim() || null,
      })
      setDraft({ query: '', ai: 'chatgpt', cited: false, citation_url: '', sample_text: '' })
      setShowAdd(false)
      const { data } = await supabase.from('ai_citations').select('*').order('measured_at', { ascending: false }).limit(100)
      setCitations(data ?? [])
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  // Share-of-voice stats
  const stats = useMemo(() => {
    const byAi = {}
    for (const c of citations) {
      if (!byAi[c.ai]) byAi[c.ai] = { total: 0, cited: 0 }
      byAi[c.ai].total++
      if (c.cited) byAi[c.ai].cited++
    }
    return byAi
  }, [citations])

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 20 }}>Loading...</p>

  return (
    <div>
      {/* Share-of-voice cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {AI_ENGINES.map(eng => {
          const s = stats[eng.value] || { total: 0, cited: 0 }
          const pct = s.total > 0 ? Math.round((s.cited / s.total) * 100) : 0
          return (
            <div key={eng.value} style={{
              background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8,
              padding: 12, textAlign: 'center', borderTop: `3px solid ${eng.color}`,
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--brown-dark)' }}>{pct}%</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{eng.label}</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{s.cited}/{s.total} cited</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Log Citation</Button>
      </div>

      {showAdd && (
        <div style={{ padding: 12, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Input label="Query" value={draft.query} onChange={e => setDraft(d => ({ ...d, query: e.target.value }))} placeholder="best real estate agent gilbert az" style={{ flex: 2 }} />
            <Select label="AI" value={draft.ai} onChange={e => setDraft(d => ({ ...d, ai: e.target.value }))} style={{ flex: 1 }}>
              {AI_ENGINES.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </Select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--brown-warm)', cursor: 'pointer' }}>
            <input type="checkbox" checked={draft.cited} onChange={e => setDraft(d => ({ ...d, cited: e.target.checked }))} />
            Dana was cited / mentioned
          </label>
          {draft.cited && <Input label="Citation URL" value={draft.citation_url} onChange={e => setDraft(d => ({ ...d, citation_url: e.target.value }))} placeholder="https://..." />}
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || !draft.query.trim()}>{saving ? 'Saving...' : 'Log'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {citations.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>No AI citation checks logged yet. Track whether Dana appears in AI search results.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {citations.map(c => {
            const eng = AI_ENGINES.find(e => e.value === c.ai) || { label: c.ai, color: '#999' }
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                borderRadius: 6, background: c.cited ? 'rgba(139,154,123,.06)' : 'transparent',
                borderLeft: `3px solid ${c.cited ? 'var(--sage-green)' : 'var(--color-border)'}`,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: c.cited ? 'var(--sage-green)' : 'var(--color-border)',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--brown-dark)' }}>"{c.query}"</span>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                    <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 999, border: `1px solid ${eng.color}`, color: eng.color }}>{eng.label}</span>
                    <Badge variant={c.cited ? 'success' : 'default'} size="sm">{c.cited ? 'Cited' : 'Not cited'}</Badge>
                  </div>
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                  {new Date(c.measured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Hub & Spoke Tab ─────────────────────────────────────────────────────────
function HubSpokeTab() {
  const [hubs, setHubs] = useState([])
  const [spokes, setSpokes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ title: '', slug: '', theme: '' })

  useEffect(() => {
    Promise.all([
      supabase.from('hub_pages').select('*').order('title'),
      supabase.from('spoke_pages').select('*').order('title'),
    ]).then(([{ data: h }, { data: s }]) => {
      setHubs(h ?? [])
      setSpokes(s ?? [])
      setLoading(false)
    })
  }, [])

  const handleAddHub = async () => {
    if (!draft.title.trim() || !draft.slug.trim()) return
    setSaving(true)
    try {
      await supabase.from('hub_pages').insert({ title: draft.title.trim(), slug: draft.slug.trim(), theme: draft.theme.trim() || null })
      setDraft({ title: '', slug: '', theme: '' })
      setShowAdd(false)
      const { data: h } = await supabase.from('hub_pages').select('*').order('title')
      setHubs(h ?? [])
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 20 }}>Loading...</p>

  return (
    <div>
      <p style={{ fontSize: '0.82rem', color: 'var(--brown-warm)', marginBottom: 12 }}>
        Hub-and-spoke topical authority. Each hub is a pillar topic with linked spoke articles building cluster authority.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Hub</Button>
      </div>

      {showAdd && (
        <div style={{ padding: 12, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12, display: 'flex', gap: 6 }}>
          <Input label="Title" value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} placeholder="Gilbert AZ Real Estate" style={{ flex: 2 }} />
          <Input label="Slug" value={draft.slug} onChange={e => setDraft(d => ({ ...d, slug: e.target.value }))} placeholder="gilbert-real-estate" style={{ flex: 1 }} />
          <Input label="Theme" value={draft.theme} onChange={e => setDraft(d => ({ ...d, theme: e.target.value }))} placeholder="buyer-guide" style={{ flex: 1 }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 4 }}>
            <Button size="sm" onClick={handleAddHub} disabled={saving}>{saving ? '...' : 'Add'}</Button>
          </div>
        </div>
      )}

      {hubs.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>No hub pages yet. Create your first topical pillar.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hubs.map(hub => {
            const hubSpokes = spokes.filter(s => s.hub_id === hub.id)
            return (
              <div key={hub.id} style={{
                background: 'var(--color-bg-subtle)', borderRadius: 8, padding: 16,
                border: '1px solid var(--color-border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: 'var(--brown-dark)',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-display)',
                  }}>H</div>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--font-display)', color: 'var(--brown-dark)' }}>{hub.title}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>/{hub.slug} · {hubSpokes.length} spokes</div>
                  </div>
                </div>
                {hubSpokes.length > 0 && (
                  <div style={{ paddingLeft: 20, borderLeft: '2px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {hubSpokes.map(spoke => (
                      <div key={spoke.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                        <span style={{ color: 'var(--brown-mid)' }}>└</span>
                        <span style={{ color: 'var(--brown-dark)' }}>{spoke.title}</span>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>/{spoke.slug}</span>
                        {spoke.internal_links_out > 0 && <span style={{ fontSize: '0.58rem', color: 'var(--sage-green)' }}>{spoke.internal_links_out} out</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Audits Tab ──────────────────────────────────────────────────────────────
function AuditsTab() {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('seo_audits').select('*').order('ran_at', { ascending: false }).limit(10)
      .then(({ data }) => { setAudits(data ?? []); setLoading(false) })
  }, [])

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 20 }}>Loading...</p>

  return (
    <div>
      <p style={{ fontSize: '0.82rem', color: 'var(--brown-warm)', marginBottom: 12 }}>
        Weekly "Hey Tony" SEO audits. Issues ranked by impact/effort.
      </p>
      {audits.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>No audits run yet. Audits will appear here once the weekly SEO check is configured.</p>
      ) : (
        audits.map(audit => (
          <div key={audit.id} style={{
            background: 'var(--color-bg-subtle)', borderRadius: 8, padding: 14, marginBottom: 8,
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                {new Date(audit.ran_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <Badge variant={audit.issue_count === 0 ? 'success' : 'warning'} size="sm">{audit.issue_count} issues</Badge>
            </div>
            {(audit.issues ?? []).map((issue, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: '0.78rem' }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: issue.severity === 'high' ? '#c0604a' : issue.severity === 'medium' ? '#c99a2e' : 'var(--color-border)',
                }} />
                <span style={{ flex: 1, color: 'var(--brown-dark)' }}>{issue.kind}</span>
                {issue.auto_fixable && <Badge variant="success" size="sm">auto-fix</Badge>}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function SeoAeo() {
  const [tab, setTab] = useState('keywords')

  return (
    <div style={{ maxWidth: 950, margin: '0 auto' }}>
      <SectionHeader title="SEO & AEO" subtitle="Search rankings, AI citation share-of-voice, and topical authority" />

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '6px 16px', fontSize: '0.8rem', borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-sans)',
            border: `1px solid ${tab === t.id ? 'var(--brown-dark)' : 'var(--color-border)'}`,
            background: tab === t.id ? 'var(--brown-dark)' : 'transparent',
            color: tab === t.id ? 'var(--cream)' : 'var(--brown-warm)',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'keywords'  && <KeywordsTab />}
      {tab === 'citations' && <CitationsTab />}
      {tab === 'hubs'      && <HubSpokeTab />}
      {tab === 'audits'    && <AuditsTab />}
    </div>
  )
}

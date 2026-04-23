import { useState, useEffect } from 'react'
import { Button, Input, Select, Textarea, SlidePanel } from '../../components/ui/index.jsx'
import { useContentPillars, useClientAvatars, useAiPrompts } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'

/* ─── Constants ─── */
const SUB_TABS = [
  { id: 'rules',       label: 'Content Rules',  icon: '⚙️' },
  { id: 'pillars',     label: 'Pillars',         icon: '🎯' },
  { id: 'avatars',     label: 'Avatars',         icon: '👤' },
  { id: 'auto',        label: 'Auto-Content',    icon: '🤖' },
  { id: 'prompts',     label: 'AI Prompts',      icon: '✦' },
]

const PILLAR_TEMPLATES = {
  authority: { name: 'Authority', description: 'Position yourself as the go-to expert', color: '#8B6F5C', topics: ['Market updates', 'Buyer tips', 'Seller strategies', 'Real estate FAQs', 'Myth busting'] },
  lifestyle: { name: 'Lifestyle', description: 'Show the human side', color: '#A3B18A', topics: ['Day in the life', 'Hobbies/fitness', 'Home design inspo', 'Weekend fun'] },
  local:     { name: 'Local',     description: 'Spotlight your community', color: '#C99A2E', topics: ['Neighborhood spotlights', 'Local business shoutouts', 'Community events', 'Restaurant reviews'] },
  personal:  { name: 'Personal',  description: 'Authentic behind-the-scenes', color: '#D4A574', topics: ['Behind the scenes', 'Coffee & contracts', 'Personal milestones', 'Why I love real estate'] },
  education: { name: 'Education', description: 'Teach and add value', color: '#6A9E72', topics: ['First-time buyer guide', 'Closing costs explained', 'Home inspection tips', 'Mortgage types'] },
  social_proof: { name: 'Social Proof', description: 'Showcase results and wins', color: '#D4A574', topics: ['Client testimonials', 'Just sold', 'Before & after', 'Reviews'] },
}

const AVATAR_AGE_RANGES    = ['18-25', '26-34', '35-44', '45-54', '55-64', '65+']
const AVATAR_INCOME_RANGES = ['Under $50K', '$50K-$75K', '$75K-$100K', '$100K-$150K', '$150K-$250K', '$250K+']
const AVATAR_FAMILY_STATUS = ['Single', 'Couple (no kids)', 'Young Family', 'Growing Family', 'Empty Nesters', 'Retirees']
const AVATAR_PROP_TYPES    = ['Single Family', 'Townhome', 'Condo', 'Multi-Family', 'Land/Lot', 'New Build']
const BUYER_MOTIVATIONS    = ['First-Time Buyer', 'Upgrading', 'Downsizing', 'Relocating', 'Investing', 'Second Home']
const SELLER_MOTIVATIONS   = ['Upgrading', 'Downsizing', 'Relocating', 'Divorce', 'Estate/Probate', 'Investment Sale', 'Retirement']
const ONLINE_PLATFORMS     = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Zillow', 'Realtor.com', 'Nextdoor', 'Google', 'Email']

const ALL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram' }, { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' }, { id: 'linkedin', label: 'LinkedIn' },
  { id: 'youtube', label: 'YouTube' }, { id: 'threads', label: 'Threads' },
  { id: 'twitter', label: 'Twitter/X' }, { id: 'pinterest', label: 'Pinterest' },
  { id: 'gmb', label: 'Google Biz' }, { id: 'nextdoor', label: 'Nextdoor' },
]

export default function ContentSettingsTab() {
  const [sub, setSub] = useState('rules')

  return (
    <div>
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

      {sub === 'rules'   && <ContentRulesSection />}
      {sub === 'pillars' && <PillarsSection />}
      {sub === 'avatars' && <AvatarsSection />}
      {sub === 'auto'    && <AutoContentSection />}
      {sub === 'prompts' && <AiPromptsSection />}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONTENT RULES — hard rules injected into every AI call
   ═══════════════════════════════════════════════════════════════════════════ */
function ContentRulesSection() {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [newRule, setNewRule] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    DB.getContentRules().then(r => { setRules(r); setLoading(false) })
  }, [])

  async function addRule() {
    if (!newRule.trim()) return
    const updated = [...rules, newRule.trim()]
    setSaving(true)
    await DB.saveContentRules(updated)
    setRules(updated)
    setNewRule('')
    setSaving(false)
  }

  async function removeRule(idx) {
    const updated = rules.filter((_, i) => i !== idx)
    setSaving(true)
    await DB.saveContentRules(updated)
    setRules(updated)
    setSaving(false)
  }

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 20 }}>Loading...</p>

  return (
    <div style={{ maxWidth: 700 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--brown-dark)', margin: '0 0 4px' }}>
        Content Rules
      </h3>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
        Hard rules applied to ALL AI-generated content. These are injected into every prompt — no exceptions.
      </p>

      {rules.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {rules.map((rule, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', background: '#fff', border: '1px solid #e8e3de',
              borderRadius: 8, fontSize: '0.85rem', color: 'var(--brown-dark)',
            }}>
              <span style={{ flex: 1 }}>{rule}</span>
              <button
                onClick={() => removeRule(i)}
                disabled={saving}
                style={{ background: 'none', border: 'none', color: '#c5221f', cursor: 'pointer', fontSize: '0.9rem', padding: '0 4px' }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={newRule}
          onChange={e => setNewRule(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRule() } }}
          placeholder={'e.g. "Never use em-dashes", "Always include a CTA", "Don\'t say dream home"'}
          style={{
            flex: 1, padding: '8px 12px', border: '1px solid #e0dbd6', borderRadius: 8,
            fontSize: '0.85rem', fontFamily: 'inherit', color: 'var(--brown-dark)', outline: 'none',
          }}
        />
        <Button size="sm" onClick={addRule} disabled={saving || !newRule.trim()}>
          + Add Rule
        </Button>
      </div>

      {rules.length === 0 && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: '#faf8f5', borderRadius: 8, fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
          No rules yet. Add rules like "Never use dashes", "Don't use the word guaranteed", or "Always end with a question" — they'll apply to every AI-generated post, caption, email, and blog.
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PILLARS — content strategy pillars
   ═══════════════════════════════════════════════════════════════════════════ */
function PillarsSection() {
  const { data: pillars, refetch } = useContentPillars()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ name: '', description: '', color: '#b79782', topics: [] })
  const [topicInput, setTopicInput] = useState('')
  const [saving, setSaving] = useState(false)

  const list = pillars ?? []
  const existingNames = new Set(list.map(p => p.name.toLowerCase()))

  function openNew() {
    setEditing(null)
    setDraft({ name: '', description: '', color: '#b79782', topics: [] })
    setTopicInput('')
    setPanelOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setDraft({ name: p.name, description: p.description || '', color: p.color || '#b79782', topics: [...(p.topics || [])] })
    setTopicInput('')
    setPanelOpen(true)
  }

  function addTopic() {
    const t = topicInput.trim()
    if (!t || draft.topics.includes(t)) return
    setDraft(d => ({ ...d, topics: [...d.topics, t] }))
    setTopicInput('')
  }

  function useTemplate(key) {
    const tpl = PILLAR_TEMPLATES[key]
    setEditing(null)
    setDraft({ name: tpl.name, description: tpl.description, color: tpl.color, topics: [...tpl.topics] })
    setPanelOpen(true)
  }

  async function handleSave() {
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await DB.updateContentPillar(editing.id, draft)
      } else {
        await DB.createContentPillar({ ...draft, sort_order: list.length })
      }
      await refetch()
      setPanelOpen(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editing || !confirm('Delete this pillar?')) return
    await DB.deleteContentPillar(editing.id)
    await refetch()
    setPanelOpen(false)
  }

  const availableTemplates = Object.entries(PILLAR_TEMPLATES).filter(([, t]) => !existingNames.has(t.name.toLowerCase()))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--brown-dark)', margin: 0 }}>Content Pillars</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Your content strategy categories. AI uses these to stay on-brand.</p>
        </div>
        <Button size="sm" onClick={openNew}>+ New Pillar</Button>
      </div>

      {/* Quick-add templates */}
      {availableTemplates.length > 0 && (
        <div style={{ marginBottom: 16, padding: '10px 14px', background: '#faf8f5', borderRadius: 8 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Quick-add from templates
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {availableTemplates.map(([key, tpl]) => (
              <button key={key} onClick={() => useTemplate(key)} style={{
                padding: '5px 12px', borderRadius: 6, border: '1px solid #e0dbd6',
                background: '#fff', fontSize: '0.78rem', cursor: 'pointer', color: 'var(--brown-dark)',
              }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: tpl.color, marginRight: 6 }} />
                {tpl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pillar cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {list.map(p => (
          <div key={p.id} onClick={() => openEdit(p)} style={{
            background: '#fff', border: '1px solid #e8e3de', borderRadius: 10,
            borderLeft: `4px solid ${p.color || '#b79782'}`, padding: '14px 16px', cursor: 'pointer',
          }}>
            <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--brown-dark)', marginBottom: 4 }}>{p.name}</div>
            {p.description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>{p.description}</div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(p.topics || []).slice(0, 5).map((t, i) => (
                <span key={i} style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', background: '#f5f0eb', color: 'var(--brown-dark)' }}>{t}</span>
              ))}
              {(p.topics || []).length > 5 && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', padding: '2px 4px' }}>+{p.topics.length - 5}</span>}
            </div>
          </div>
        ))}
      </div>

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editing ? 'Edit Pillar' : 'New Pillar'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Name *</label>
            <Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="e.g. Authority" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Description</label>
            <Input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="What this pillar is about" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Color</label>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="color" value={draft.color} onChange={e => setDraft(d => ({ ...d, color: e.target.value }))} style={{ width: 36, height: 32, border: 'none', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{draft.color}</span>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Topics ({draft.topics.length})</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
              {draft.topics.map((t, i) => (
                <span key={i} onClick={() => setDraft(d => ({ ...d, topics: d.topics.filter((_, j) => j !== i) }))} style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: '0.72rem', background: '#f5f0eb', color: 'var(--brown-dark)', cursor: 'pointer',
                }}>{t} &times;</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Input value={topicInput} onChange={e => setTopicInput(e.target.value)} placeholder="Add a topic..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())} style={{ flex: 1 }} />
              <Button size="sm" variant="ghost" onClick={addTopic}>Add</Button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={handleSave} disabled={saving || !draft.name.trim()}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
            {editing && <Button variant="ghost" style={{ color: '#c5221f' }} onClick={handleDelete}>Delete</Button>}
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AVATARS — buyer/seller audience personas
   ═══════════════════════════════════════════════════════════════════════════ */
function AvatarsSection() {
  const { data: avatars, refetch } = useClientAvatars()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ type: 'buyer' })
  const [saving, setSaving] = useState(false)

  const list = avatars ?? []
  const setAv = (k, v) => setDraft(d => ({ ...d, [k]: v }))

  function openNew(type = 'buyer') {
    setEditing(null)
    setDraft({ type, name: '', online_platforms: [] })
    setPanelOpen(true)
  }

  function openEdit(a) {
    setEditing(a)
    setDraft({ ...a })
    setPanelOpen(true)
  }

  async function handleSave() {
    if (!draft.name?.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...draft,
        price_range_min: draft.price_range_min ? Number(draft.price_range_min) : null,
        price_range_max: draft.price_range_max ? Number(draft.price_range_max) : null,
        locations: typeof draft.locations === 'string' ? draft.locations.split(',').map(s => s.trim()).filter(Boolean) : draft.locations,
      }
      if (editing) {
        await DB.updateClientAvatar(editing.id, payload)
      } else {
        await DB.createClientAvatar(payload)
      }
      await refetch()
      setPanelOpen(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!editing || !confirm('Delete this avatar?')) return
    await DB.deleteClientAvatar(editing.id)
    await refetch()
    setPanelOpen(false)
  }

  const motivations = draft.type === 'seller' ? SELLER_MOTIVATIONS : BUYER_MOTIVATIONS

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--brown-dark)', margin: 0 }}>Client Avatars</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Target audience personas. AI tailors content to resonate with each avatar.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" onClick={() => openNew('buyer')}>+ Buyer</Button>
          <Button size="sm" variant="ghost" onClick={() => openNew('seller')}>+ Seller</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {list.map(a => (
          <div key={a.id} onClick={() => openEdit(a)} style={{
            background: '#fff', border: '1px solid #e8e3de', borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--brown-dark)' }}>{a.name}</span>
              <span style={{
                padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.03em',
                background: a.type === 'buyer' ? '#edf4ee' : '#fef7e0',
                color: a.type === 'buyer' ? 'var(--sage-green)' : '#b8860b',
              }}>{a.type}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              {[a.age_range, a.family_status, a.motivation].filter(Boolean).join(' / ')}
            </div>
            {a.pain_points && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>{a.pain_points.slice(0, 80)}...</div>}
          </div>
        ))}
      </div>

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editing ? `Edit ${draft.type === 'buyer' ? 'Buyer' : 'Seller'} Avatar` : `New ${draft.type === 'buyer' ? 'Buyer' : 'Seller'} Avatar`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Name *</label>
            <Input value={draft.name ?? ''} onChange={e => setAv('name', e.target.value)} placeholder="e.g. First-Time Millennial Buyer" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Age Range</label>
              <Select value={draft.age_range ?? ''} onChange={e => setAv('age_range', e.target.value)}>
                <option value="">—</option>
                {AVATAR_AGE_RANGES.map(a => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Income</label>
              <Select value={draft.income_range ?? ''} onChange={e => setAv('income_range', e.target.value)}>
                <option value="">—</option>
                {AVATAR_INCOME_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Family</label>
              <Select value={draft.family_status ?? ''} onChange={e => setAv('family_status', e.target.value)}>
                <option value="">—</option>
                {AVATAR_FAMILY_STATUS.map(f => <option key={f} value={f}>{f}</option>)}
              </Select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Motivation</label>
              <Select value={draft.motivation ?? ''} onChange={e => setAv('motivation', e.target.value)}>
                <option value="">—</option>
                {motivations.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Property Type</label>
              <Select value={draft.property_type ?? ''} onChange={e => setAv('property_type', e.target.value)}>
                <option value="">—</option>
                {AVATAR_PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Locations (comma-separated)</label>
            <Input value={Array.isArray(draft.locations) ? draft.locations.join(', ') : draft.locations ?? ''} onChange={e => setAv('locations', e.target.value)} placeholder="Gilbert, Mesa, Queen Creek..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Price Min</label>
              <Input type="number" value={draft.price_range_min ?? ''} onChange={e => setAv('price_range_min', e.target.value)} placeholder="250000" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Price Max</label>
              <Input type="number" value={draft.price_range_max ?? ''} onChange={e => setAv('price_range_max', e.target.value)} placeholder="500000" />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Pain Points</label>
            <Textarea value={draft.pain_points ?? ''} onChange={e => setAv('pain_points', e.target.value)} placeholder="What keeps them up at night?" rows={2} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Content That Resonates</label>
            <Textarea value={draft.content_resonates ?? ''} onChange={e => setAv('content_resonates', e.target.value)} placeholder="What type of content grabs their attention?" rows={2} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Found On</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ONLINE_PLATFORMS.map(plat => (
                <label key={plat} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={(draft.online_platforms ?? []).includes(plat)}
                    onChange={e => {
                      const cur = draft.online_platforms ?? []
                      setAv('online_platforms', e.target.checked ? [...cur, plat] : cur.filter(p => p !== plat))
                    }}
                  />
                  {plat}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={handleSave} disabled={saving || !draft.name?.trim()}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
            {editing && <Button variant="ghost" style={{ color: '#c5221f' }} onClick={handleDelete}>Delete</Button>}
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTO-CONTENT — configure daily auto-generation
   ═══════════════════════════════════════════════════════════════════════════ */
function AutoContentSection() {
  const { data: avatars } = useClientAvatars()
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    DB.getAutoContentConfig().then(c => { setConfig(c); setLoading(false) })
  }, [])

  async function save(updated) {
    setSaving(true)
    setConfig(updated)
    await DB.saveAutoContentConfig(updated)
    setSaving(false)
  }

  if (loading || !config) return <p style={{ color: 'var(--color-text-muted)', padding: 20 }}>Loading...</p>

  const avatarList = avatars ?? []

  return (
    <div style={{ maxWidth: 700 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--brown-dark)', margin: '0 0 4px' }}>
        Auto-Content Generation
      </h3>
      <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 16px' }}>
        AI will automatically generate daily content for each selected avatar, targeting IG and FB first, then adapting for all other platforms.
      </p>

      {/* Enable toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, padding: '12px 16px', background: config.enabled ? '#edf4ee' : '#faf8f5', borderRadius: 8, border: '1px solid #e8e3de' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500, color: 'var(--brown-dark)' }}>
          <input type="checkbox" checked={config.enabled} onChange={e => save({ ...config, enabled: e.target.checked })} style={{ width: 18, height: 18 }} />
          {config.enabled ? 'Auto-content is ON' : 'Auto-content is OFF'}
        </label>
      </div>

      {config.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Time */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>Generate at (AZ time)</label>
            <input type="time" value={config.time || '05:00'} onChange={e => save({ ...config, time: e.target.value })} style={{ padding: '6px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.85rem' }} />
          </div>

          {/* Platforms */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Platforms to generate for</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {ALL_PLATFORMS.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', cursor: 'pointer', padding: '4px 10px', borderRadius: 6, background: (config.platforms || []).includes(p.id) ? '#edf4ee' : '#faf8f5', border: '1px solid #e0dbd6' }}>
                  <input type="checkbox" checked={(config.platforms || []).includes(p.id)} onChange={e => {
                    const cur = config.platforms || []
                    save({ ...config, platforms: e.target.checked ? [...cur, p.id] : cur.filter(x => x !== p.id) })
                  }} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {/* Avatars */}
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Avatars to generate for</label>
            {avatarList.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No avatars yet. Create avatars in the Avatars tab first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer', marginBottom: 4 }}>
                  <input type="checkbox" checked={!config.avatar_ids?.length} onChange={() => save({ ...config, avatar_ids: [] })} />
                  <strong>All avatars</strong>
                </label>
                {avatarList.map(a => (
                  <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', cursor: 'pointer', paddingLeft: 12 }}>
                    <input type="checkbox" checked={!config.avatar_ids?.length || (config.avatar_ids || []).includes(a.id)} onChange={e => {
                      let ids = config.avatar_ids?.length ? [...config.avatar_ids] : avatarList.map(x => x.id)
                      ids = e.target.checked ? [...ids, a.id] : ids.filter(x => x !== a.id)
                      save({ ...config, avatar_ids: ids.length === avatarList.length ? [] : ids })
                    }} />
                    {a.name} <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>({a.type})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Auto-publish toggle */}
          <div style={{ padding: '12px 16px', background: '#faf8f5', borderRadius: 8, border: '1px solid #e8e3de' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.85rem', color: 'var(--brown-dark)' }}>
              <input type="checkbox" checked={config.auto_publish || false} onChange={e => save({ ...config, auto_publish: e.target.checked })} style={{ width: 16, height: 16 }} />
              Auto-publish (skip review, post immediately)
            </label>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '4px 0 0 26px' }}>
              {config.auto_publish ? 'Content will be published via Blotato automatically. Make sure your rules are dialed in.' : 'Content will be saved as drafts for you to review and publish manually.'}
            </p>
          </div>
        </div>
      )}

      {saving && <p style={{ fontSize: '0.78rem', color: 'var(--sage-green)', marginTop: 8 }}>Saved</p>}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI PROMPTS — edit system and framework prompts
   ═══════════════════════════════════════════════════════════════════════════ */
function AiPromptsSection() {
  const { data: prompts, refetch } = useAiPrompts()
  const [editing, setEditing] = useState(null)
  const [draftText, setDraftText] = useState('')
  const [saving, setSaving] = useState(false)

  const list = prompts ?? []

  function startEdit(p) {
    setEditing(p)
    setDraftText(p.prompt_text || '')
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      await DB.updateAiPrompt(editing.prompt_key, draftText)
      await refetch()
      setEditing(null)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', color: 'var(--brown-dark)', margin: 0 }}>AI Prompts</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Customize the prompts used by AI for each copywriting framework and content type.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.map(p => (
          <div key={p.prompt_key} style={{
            background: '#fff', border: '1px solid #e8e3de', borderRadius: 10, padding: '12px 16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--brown-dark)' }}>{p.prompt_key}</span>
                {p.description && <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>{p.description}</span>}
              </div>
              <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>Edit</Button>
            </div>
            {editing?.prompt_key === p.prompt_key ? (
              <div>
                <textarea
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  rows={8}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'hidden' }}>
                {p.prompt_text?.slice(0, 200)}{p.prompt_text?.length > 200 ? '...' : ''}
              </div>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '20px 0' }}>
            No AI prompts configured yet. Framework prompts (PAS, AIDA, etc.) will appear here once you add them.
          </p>
        )}
      </div>
    </div>
  )
}

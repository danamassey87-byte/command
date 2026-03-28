import { useState, useMemo } from 'react'
import * as DB from '../../lib/supabase'
import { useContentPillars, useContentPieces, useContentSettings, useClientAvatars } from '../../lib/hooks'
import { Button, SlidePanel, Input, Select, Textarea, InfoTip } from '../../components/ui'
import './ContentCalendar.css'

// ─── Constants ────────────────────────────────────────────────────────────────
const PLATFORMS = [
  { key: 'instagram', label: 'Instagram',  icon: '📷', hint: 'Caption up to 2,200 chars. Use emojis & hashtags.' },
  { key: 'facebook',  label: 'Facebook',   icon: '👥', hint: 'Conversational tone. Great for longer stories.' },
  { key: 'tiktok',    label: 'TikTok',     icon: '🎵', hint: 'Hook first sentence. Short, punchy, trending sounds.' },
  { key: 'youtube',   label: 'YouTube',    icon: '▶️', hint: 'Script or description for Shorts / long-form video.' },
  { key: 'linkedin',  label: 'LinkedIn',   icon: '💼', hint: 'Professional tone. Great for market insights.' },
  { key: 'email',     label: 'Email',      icon: '📧', hint: 'Subject line + body. Personal and direct.' },
  { key: 'twitter',   label: 'Twitter/X',  icon: '🐦', hint: 'Under 280 chars per tweet. Thread-friendly.' },
  { key: 'stories',   label: 'Stories',    icon: '📱', hint: 'IG/FB Stories — short, visual, 24-hour content.' },
  { key: 'blog',      label: 'Blog',       icon: '✍️', hint: 'Long-form SEO content. 800-1,500 words with keywords.' },
  { key: 'gmb',       label: 'GMB',        icon: '📍', hint: 'Google My Business post. Short, local, with a CTA.' },
]

const STATUSES = ['idea', 'draft', 'scheduled', 'published']

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
function toISO(date) { return date.toISOString().slice(0, 10) }
function fmtDay(date) { return date.toLocaleDateString('en-US', { weekday: 'short' }) }
function fmtMonthYear(date) { return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const [tab, setTab]             = useState('calendar')
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelPiece, setPanelPiece] = useState(null)  // existing piece or null for new
  const [panelDate, setPanelDate]   = useState(null)  // pre-fill date for new
  const [saving, setSaving]         = useState(false)

  const weekEnd = addDays(weekStart, 6)
  const { data: pieces,   refetch: refetchPieces   } = useContentPieces(toISO(weekStart), toISO(weekEnd))
  const { data: pillars,  refetch: refetchPillars  } = useContentPillars()
  const { data: settings, refetch: refetchSettings } = useContentSettings()
  const { data: avatars,  refetch: refetchAvatars  } = useClientAvatars()

  const activePlatforms = useMemo(() =>
    settings?.value?.active_platforms ?? ['instagram', 'facebook'],
    [settings]
  )
  const businessBrainUrl = settings?.value?.business_brain_url ?? ''

  const pillarMap = useMemo(() => {
    const m = {}
    for (const p of (pillars ?? [])) m[p.id] = p
    return m
  }, [pillars])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      return { date: d, iso: toISO(d) }
    }), [weekStart]
  )

  const piecesByDate = useMemo(() => {
    const m = {}
    for (const p of (pieces ?? [])) {
      if (!m[p.content_date]) m[p.content_date] = []
      m[p.content_date].push(p)
    }
    return m
  }, [pieces])

  function openNew(date) {
    setPanelPiece(null)
    setPanelDate(date ?? toISO(new Date()))
    setPanelOpen(true)
  }

  function openPiece(piece) {
    setPanelPiece(piece)
    setPanelDate(null)
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setPanelPiece(null)
    setPanelDate(null)
  }

  async function handleSavePiece(draft, platformDrafts) {
    setSaving(true)
    try {
      let piece
      if (draft.id) {
        piece = await DB.updateContentPiece(draft.id, {
          title: draft.title, pillar_id: draft.pillar_id || null,
          content_date: draft.content_date, status: draft.status,
          body_text: draft.body_text, notes: draft.notes,
        })
      } else {
        piece = await DB.createContentPiece({
          title: draft.title, pillar_id: draft.pillar_id || null,
          content_date: draft.content_date, status: draft.status || 'idea',
          body_text: draft.body_text, notes: draft.notes,
        })
      }
      for (const [platform, adapted_text] of Object.entries(platformDrafts)) {
        if (adapted_text.trim()) {
          await DB.upsertContentPlatformPost({ content_id: piece.id, platform, adapted_text })
        }
      }
      await refetchPieces()
      closePanel()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePiece(id) {
    if (!confirm('Delete this content piece?')) return
    await DB.deleteContentPiece(id)
    await refetchPieces()
    closePanel()
  }

  return (
    <div className="cc-page">
      {/* Header */}
      <div className="cc-page-header">
        <div>
          <h1>Content Calendar</h1>
          <p className="cc-page-sub">Plan, write, and repurpose content across every platform</p>
        </div>
        <div className="cc-page-actions">
          {businessBrainUrl && (
            <a href={businessBrainUrl} target="_blank" rel="noreferrer" className="cc-brain-btn">
              📄 Business Brain
            </a>
          )}
          <Button onClick={() => openNew(toISO(new Date()))}>+ New Post</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="cc-tabs">
        {['calendar', 'pillars', 'avatars', 'settings'].map(t => (
          <button
            key={t}
            className={`cc-tab${tab === t ? ' cc-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'calendar' && (
        <CalendarTab
          weekDays={weekDays}
          weekStart={weekStart}
          piecesByDate={piecesByDate}
          pillarMap={pillarMap}
          activePlatforms={activePlatforms}
          onPrev={() => setWeekStart(d => addDays(d, -7))}
          onNext={() => setWeekStart(d => addDays(d, 7))}
          onToday={() => setWeekStart(getWeekStart(new Date()))}
          onAdd={openNew}
          onOpen={openPiece}
        />
      )}

      {tab === 'pillars' && (
        <PillarsTab pillars={pillars ?? []} reload={refetchPillars} />
      )}

      {tab === 'avatars' && (
        <AvatarsTab avatars={avatars ?? []} reload={refetchAvatars} />
      )}

      {tab === 'settings' && (
        <SettingsTab
          settings={settings}
          activePlatforms={activePlatforms}
          businessBrainUrl={businessBrainUrl}
          reload={refetchSettings}
        />
      )}

      {/* Content Piece Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={panelPiece ? 'Edit Content' : 'New Content'}
        width={520}
      >
        {panelOpen && (
          <PieceForm
            piece={panelPiece}
            defaultDate={panelDate}
            pillars={pillars ?? []}
            activePlatforms={activePlatforms}
            saving={saving}
            onSave={handleSavePiece}
            onDelete={panelPiece ? () => handleDeletePiece(panelPiece.id) : null}
          />
        )}
      </SlidePanel>
    </div>
  )
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────
function CalendarTab({ weekDays, weekStart, piecesByDate, pillarMap, activePlatforms, onPrev, onNext, onToday, onAdd, onOpen }) {
  const today = toISO(new Date())
  const totalPieces = Object.values(piecesByDate).flat().length

  return (
    <div className="cc-calendar">
      {/* Week nav */}
      <div className="cc-week-nav">
        <button className="cc-nav-btn" onClick={onPrev}>‹</button>
        <span className="cc-week-label">{fmtMonthYear(weekStart)}</span>
        <button className="cc-nav-btn cc-nav-today" onClick={onToday}>Today</button>
        <button className="cc-nav-btn" onClick={onNext}>›</button>
        {totalPieces > 0 && (
          <span className="cc-week-count">{totalPieces} piece{totalPieces !== 1 ? 's' : ''} this week</span>
        )}
      </div>

      {/* 7-col grid */}
      <div className="cc-week-grid">
        {weekDays.map(({ date, iso }) => {
          const dayPieces = piecesByDate[iso] ?? []
          const isToday = iso === today
          return (
            <div key={iso} className={`cc-day${isToday ? ' cc-day--today' : ''}`}>
              <div className="cc-day-head">
                <div className="cc-day-label">
                  <span className="cc-day-name">{fmtDay(date)}</span>
                  <span className={`cc-day-num${isToday ? ' cc-day-num--today' : ''}`}>{date.getDate()}</span>
                </div>
                <button className="cc-add-btn" onClick={() => onAdd(iso)} title="Add post">+</button>
              </div>
              <div className="cc-day-body">
                {dayPieces.map(p => {
                  const pillar = pillarMap[p.pillar_id]
                  return (
                    <button
                      key={p.id}
                      className="cc-piece-pill"
                      style={{ borderLeftColor: pillar?.color ?? 'var(--color-muted)' }}
                      onClick={() => onOpen(p)}
                    >
                      <span className="cc-pill-title">{p.title}</span>
                      <span className={`cc-pill-dot cc-pill-dot--${p.status}`} />
                    </button>
                  )
                })}
                {dayPieces.length === 0 && (
                  <button className="cc-day-empty" onClick={() => onAdd(iso)}>+ post</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Status legend + platforms */}
      <div className="cc-legends">
        <div className="cc-status-legend">
          {['idea','draft','scheduled','published'].map(s => (
            <span key={s} className="cc-legend-item">
              <span className={`cc-pill-dot cc-pill-dot--${s}`} /> {s}
            </span>
          ))}
        </div>
        {activePlatforms.length > 0 && (
          <div className="cc-platform-legend">
            <span className="cc-legend-label">Platforms:</span>
            {activePlatforms.map(pk => {
              const pl = PLATFORMS.find(x => x.key === pk)
              return pl ? <span key={pk} className="cc-legend-platform">{pl.icon} {pl.label}</span> : null
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Piece Form (inside SlidePanel) ──────────────────────────────────────────
function PieceForm({ piece, defaultDate, pillars, activePlatforms, saving, onSave, onDelete }) {
  const [draft, setDraft] = useState({
    id:           piece?.id           ?? null,
    title:        piece?.title        ?? '',
    pillar_id:    piece?.pillar_id    ?? '',
    content_date: piece?.content_date ?? defaultDate ?? toISO(new Date()),
    status:       piece?.status       ?? 'idea',
    body_text:    piece?.body_text    ?? '',
    notes:        piece?.notes        ?? '',
  })

  const [platTexts, setPlatTexts] = useState(() => {
    const m = {}
    for (const pp of (piece?.platform_posts ?? [])) {
      m[pp.platform] = pp.adapted_text ?? ''
    }
    return m
  })

  const [openPlat, setOpenPlat]   = useState(null)
  const [aiPrompt, setAiPrompt]   = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [repurposing, setRepurposing] = useState(false)
  const [adaptingPlat, setAdaptingPlat] = useState(null)

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  // Generate main copy from short prompt
  async function handleGenerate() {
    if (!aiPrompt.trim()) return
    const pillar = pillars.find(p => p.id === draft.pillar_id)
    setAiLoading(true)
    try {
      const { text } = await DB.generateContent({
        type: 'write',
        pillar: pillar?.name ?? '',
        prompt: aiPrompt,
      })
      set('body_text', text)
      if (!draft.title.trim()) set('title', aiPrompt)
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // Repurpose main copy across all active platforms at once
  async function handleRepurposeAll() {
    if (!draft.body_text.trim()) return
    setRepurposing(true)
    try {
      const { platforms } = await DB.generateContent({
        type: 'repurpose',
        body_text: draft.body_text,
        active_platforms: activePlatforms,
      })
      setPlatTexts(prev => ({ ...prev, ...platforms }))
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setRepurposing(false)
    }
  }

  // Adapt main copy for one platform
  async function handleAdaptOne(pk) {
    if (!draft.body_text.trim()) return
    setAdaptingPlat(pk)
    try {
      const { text } = await DB.generateContent({
        type: 'adapt',
        platform: pk,
        body_text: draft.body_text,
      })
      setPlatTexts(prev => ({ ...prev, [pk]: text }))
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setAdaptingPlat(null)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!draft.title.trim()) return
    onSave(draft, platTexts)
  }

  return (
    <form className="cc-form" onSubmit={handleSubmit}>
      {/* AI Write section */}
      <div className="cc-ai-box">
        <div className="cc-ai-label">✦ Write with Claude <InfoTip text="Describe what you want to write and Claude will draft it in your voice as a Gilbert/East Valley agent. You can edit it after. Use 'Repurpose for All Platforms' to adapt the body copy for every platform at once." position="bottom" /></div>
        <div className="cc-ai-row">
          <input
            className="cc-ai-input"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="e.g. Why now is a great time to sell in Gilbert…"
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleGenerate())}
          />
          <button
            type="button"
            className="cc-ai-btn"
            onClick={handleGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
          >
            {aiLoading ? '…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="cc-form-field">
        <label className="cc-label">Title *</label>
        <Input
          value={draft.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Post title or topic idea"
          required
        />
      </div>

      {/* Date + Status */}
      <div className="cc-form-row">
        <div className="cc-form-field">
          <label className="cc-label">Date</label>
          <Input type="date" value={draft.content_date} onChange={e => set('content_date', e.target.value)} />
        </div>
        <div className="cc-form-field">
          <label className="cc-label">Status</label>
          <Select value={draft.status} onChange={e => set('status', e.target.value)}>
            {STATUSES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </Select>
        </div>
      </div>

      {/* Pillar */}
      <div className="cc-form-field">
        <label className="cc-label">Content Pillar</label>
        <Select value={draft.pillar_id} onChange={e => set('pillar_id', e.target.value)}>
          <option value="">— No Pillar —</option>
          {pillars.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>

      {/* Main copy */}
      <div className="cc-form-field">
        <div className="cc-label-row">
          <label className="cc-label">Main Copy</label>
          {draft.body_text.trim() && activePlatforms.length > 0 && (
            <button
              type="button"
              className="cc-repurpose-btn"
              onClick={handleRepurposeAll}
              disabled={repurposing}
            >
              {repurposing ? '✦ Repurposing…' : '✦ Repurpose for all platforms'}
            </button>
          )}
        </div>
        <Textarea
          value={draft.body_text}
          onChange={e => set('body_text', e.target.value)}
          placeholder="Write your core message here — or generate it with Claude above"
          rows={5}
        />
      </div>

      {/* Notes */}
      <div className="cc-form-field">
        <label className="cc-label">Notes / Hashtags</label>
        <Textarea
          value={draft.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Hashtags, visual ideas, links, CTA..."
          rows={2}
        />
      </div>

      {/* Platform adaptations */}
      {activePlatforms.length > 0 && (
        <div className="cc-adapt-section">
          <div className="cc-adapt-header">Platform Adaptations <InfoTip text="Each platform gets its own version of your content, adapted for tone and character limits. Write them manually, use 'Adapt' on each one, or hit 'Repurpose All Platforms' above to fill them all at once with Claude." position="left" /></div>
          <p className="cc-adapt-hint">Repurpose your main copy for each active platform.</p>
          {activePlatforms.map(pk => {
            const pl = PLATFORMS.find(x => x.key === pk)
            if (!pl) return null
            const isOpen = openPlat === pk
            const text   = platTexts[pk] ?? ''
            const isAdapting = adaptingPlat === pk
            return (
              <div key={pk} className={`cc-plat-row${isOpen ? ' cc-plat-row--open' : ''}`}>
                <button
                  type="button"
                  className="cc-plat-toggle"
                  onClick={() => setOpenPlat(isOpen ? null : pk)}
                >
                  <span className="cc-plat-name">{pl.icon} {pl.label}</span>
                  <span className="cc-plat-preview">
                    {text ? text.slice(0, 45) + (text.length > 45 ? '…' : '') : 'tap to write adaptation'}
                  </span>
                  <span className="cc-plat-chevron">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="cc-plat-body">
                    <div className="cc-plat-top">
                      <p className="cc-plat-hint">{pl.hint}</p>
                      {draft.body_text.trim() && (
                        <button
                          type="button"
                          className="cc-adapt-one-btn"
                          onClick={() => handleAdaptOne(pk)}
                          disabled={isAdapting}
                        >
                          {isAdapting ? '✦ Writing…' : '✦ Adapt with Claude'}
                        </button>
                      )}
                    </div>
                    <Textarea
                      value={text}
                      onChange={e => setPlatTexts(d => ({ ...d, [pk]: e.target.value }))}
                      placeholder={`${pl.label} copy…`}
                      rows={4}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Actions */}
      <div className="cc-form-actions">
        {onDelete && (
          <button type="button" className="cc-del-btn" onClick={onDelete}>Delete</button>
        )}
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  )
}

// ─── Pillars Tab (with topics) ────────────────────────────────────────────────
function PillarsTab({ pillars, reload }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [draft, setDraft]         = useState({ name: '', description: '', color: '#b79782', topics: [] })
  const [saving, setSaving]       = useState(false)
  const [topicInput, setTopicInput] = useState('')

  function openNew() {
    setEditing(null)
    setDraft({ name: '', description: '', color: '#b79782', topics: [] })
    setTopicInput('')
    setPanelOpen(true)
  }

  function openEdit(p) {
    setEditing(p)
    setDraft({ name: p.name, description: p.description ?? '', color: p.color, topics: p.topics ?? [] })
    setTopicInput('')
    setPanelOpen(true)
  }

  function addTopic() {
    const t = topicInput.trim()
    if (!t || draft.topics.includes(t)) return
    setDraft(d => ({ ...d, topics: [...d.topics, t] }))
    setTopicInput('')
  }

  function removeTopic(i) {
    setDraft(d => ({ ...d, topics: d.topics.filter((_, idx) => idx !== i) }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await DB.updateContentPillar(editing.id, draft)
      } else {
        await DB.createContentPillar({ ...draft, sort_order: pillars.length })
      }
      await reload()
      setPanelOpen(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this pillar? Existing content pieces will become unassigned.')) return
    await DB.deleteContentPillar(id)
    await reload()
    setPanelOpen(false)
  }

  return (
    <div className="cc-pillars">
      <div className="cc-pillars-topbar">
        <p className="cc-pillars-sub">Content pillars are the backbone of your feed. These recurring themes create familiarity and trust while keeping you consistent.</p>
        <Button onClick={openNew}>+ Add Pillar</Button>
      </div>

      <div className="cc-pillars-grid">
        {pillars.map(p => {
          const topics = p.topics ?? []
          return (
            <div key={p.id} className="cc-pillar-card" style={{ borderLeftColor: p.color }}>
              <div className="cc-pillar-swatch" style={{ background: p.color }} />
              <div className="cc-pillar-body">
                <div className="cc-pillar-name">{p.name}</div>
                {p.description && <div className="cc-pillar-desc">{p.description}</div>}
                {topics.length > 0 && (
                  <div className="cc-pillar-topics">
                    {topics.map((t, i) => (
                      <span key={i} className="cc-pillar-topic" style={{ borderColor: p.color + '44' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <button className="cc-pillar-edit-btn" onClick={() => openEdit(p)}>Edit</button>
            </div>
          )
        })}
      </div>

      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? 'Edit Pillar' : 'New Pillar'}
      >
        <form className="cc-form" onSubmit={handleSave}>
          <div className="cc-form-field">
            <label className="cc-label">Name *</label>
            <Input
              value={draft.name}
              onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Authority, Lifestyle, Local, Personal"
              required
            />
          </div>
          <div className="cc-form-field">
            <label className="cc-label">Description</label>
            <Textarea
              value={draft.description}
              onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
              placeholder="What kind of content belongs here?"
              rows={2}
            />
          </div>
          <div className="cc-form-field">
            <label className="cc-label">Color</label>
            <div className="cc-color-row">
              <input
                type="color"
                value={draft.color}
                onChange={e => setDraft(d => ({ ...d, color: e.target.value }))}
                className="cc-color-input"
              />
              <span className="cc-color-preview" style={{ background: draft.color }} />
              <span className="cc-color-hex">{draft.color}</span>
            </div>
          </div>

          {/* Topics */}
          <div className="cc-form-field">
            <label className="cc-label">Topics ({draft.topics.length})</label>
            <p className="cc-field-hint">Add 5-10 recurring content ideas for this pillar.</p>
            <div className="cc-topic-input-row">
              <input
                className="cc-topic-input"
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                placeholder="e.g. Market updates"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTopic() } }}
              />
              <button type="button" className="cc-topic-add-btn" onClick={addTopic}>+</button>
            </div>
            {draft.topics.length > 0 && (
              <div className="cc-topic-list">
                {draft.topics.map((t, i) => (
                  <span key={i} className="cc-topic-chip">
                    {t}
                    <button type="button" className="cc-topic-remove" onClick={() => removeTopic(i)}>&times;</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="cc-form-actions">
            {editing && (
              <button type="button" className="cc-del-btn" onClick={() => handleDelete(editing.id)}>Delete</button>
            )}
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Pillar'}</Button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}

// ─── Client Avatars Tab ──────────────────────────────────────────────────────
const AVATAR_AGE_RANGES     = ['18-25', '26-34', '35-44', '45-54', '55-64', '65+']
const AVATAR_INCOME_RANGES  = ['Under $50K', '$50K-$75K', '$75K-$100K', '$100K-$150K', '$150K-$250K', '$250K+']
const AVATAR_FAMILY_STATUS  = ['Single', 'Couple (no kids)', 'Young Family', 'Growing Family', 'Empty Nesters', 'Retirees']
const AVATAR_PROP_TYPES     = ['Single Family', 'Townhome', 'Condo', 'Multi-Family', 'Land/Lot', 'New Build']
const BUYER_MOTIVATIONS     = ['First-Time Buyer', 'Upgrading', 'Downsizing', 'Relocating', 'Investing', 'Second Home']
const SELLER_MOTIVATIONS    = ['Upgrading', 'Downsizing', 'Relocating', 'Divorce', 'Estate/Probate', 'Investment Sale', 'Retirement']
const ONLINE_PLATFORMS      = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Zillow', 'Realtor.com', 'Nextdoor', 'Google', 'Email']

function AvatarsTab({ avatars, reload }) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [saving, setSaving]       = useState(false)
  const [draft, setDraft]         = useState({})

  const buyerAvatars  = avatars.filter(a => a.type === 'buyer')
  const sellerAvatars = avatars.filter(a => a.type === 'seller')

  function openNew(type) {
    setEditing(null)
    setDraft({
      type, name: '', age_range: '', income_range: '', family_status: '',
      motivation: '', property_type: '', price_range_min: '', price_range_max: '',
      locations: [], pain_points: '', online_platforms: [], content_resonates: '', notes: '',
    })
    setPanelOpen(true)
  }

  function openEdit(a) {
    setEditing(a)
    setDraft({
      type:              a.type,
      name:              a.name ?? '',
      age_range:         a.age_range ?? '',
      income_range:      a.income_range ?? '',
      family_status:     a.family_status ?? '',
      motivation:        a.motivation ?? '',
      property_type:     a.property_type ?? '',
      price_range_min:   a.price_range_min ?? '',
      price_range_max:   a.price_range_max ?? '',
      locations:         a.locations ?? [],
      pain_points:       a.pain_points ?? '',
      online_platforms:  a.online_platforms ?? [],
      content_resonates: a.content_resonates ?? '',
      notes:             a.notes ?? '',
    })
    setPanelOpen(true)
  }

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  function togglePlatform(p) {
    setDraft(d => ({
      ...d,
      online_platforms: d.online_platforms.includes(p)
        ? d.online_platforms.filter(x => x !== p)
        : [...d.online_platforms, p],
    }))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!draft.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...draft,
        price_range_min: draft.price_range_min ? Number(draft.price_range_min) : null,
        price_range_max: draft.price_range_max ? Number(draft.price_range_max) : null,
        locations: typeof draft.locations === 'string'
          ? draft.locations.split(',').map(s => s.trim()).filter(Boolean)
          : draft.locations,
      }
      if (editing) {
        await DB.updateClientAvatar(editing.id, payload)
      } else {
        await DB.createClientAvatar(payload)
      }
      await reload()
      setPanelOpen(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!editing || !confirm('Delete this avatar?')) return
    await DB.deleteClientAvatar(editing.id)
    await reload()
    setPanelOpen(false)
  }

  const motivations = draft.type === 'seller' ? SELLER_MOTIVATIONS : BUYER_MOTIVATIONS

  function AvatarCard({ a }) {
    return (
      <div className="avatar-card" onClick={() => openEdit(a)}>
        <div className="avatar-card__header">
          <div className="avatar-card__icon">{a.type === 'buyer' ? '🏠' : '📋'}</div>
          <div>
            <div className="avatar-card__name">{a.name}</div>
            <div className="avatar-card__meta">
              {[a.age_range, a.family_status, a.motivation].filter(Boolean).join(' · ') || 'Click to edit'}
            </div>
          </div>
        </div>
        {a.property_type && <span className="avatar-card__tag">{a.property_type}</span>}
        {(a.price_range_min || a.price_range_max) && (
          <span className="avatar-card__tag">
            {a.price_range_min ? `$${Number(a.price_range_min).toLocaleString()}` : '?'}
            {' – '}
            {a.price_range_max ? `$${Number(a.price_range_max).toLocaleString()}` : '?'}
          </span>
        )}
        {(a.online_platforms ?? []).length > 0 && (
          <div className="avatar-card__platforms">
            {a.online_platforms.map(p => <span key={p} className="avatar-card__plat">{p}</span>)}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="cc-avatars">
      <p className="cc-pillars-sub">Define your ideal client profiles to guide content strategy and messaging. Who are you creating content for?</p>

      {/* Buyer Avatars */}
      <div className="avatar-section">
        <div className="avatar-section__header">
          <h3 className="avatar-section__title">Buyer Avatars</h3>
          <Button onClick={() => openNew('buyer')}>+ Add Buyer Avatar</Button>
        </div>
        {buyerAvatars.length === 0 ? (
          <p className="avatar-empty">No buyer avatars yet. Add one to define your ideal buyer client.</p>
        ) : (
          <div className="avatar-grid">
            {buyerAvatars.map(a => <AvatarCard key={a.id} a={a} />)}
          </div>
        )}
      </div>

      {/* Seller Avatars */}
      <div className="avatar-section">
        <div className="avatar-section__header">
          <h3 className="avatar-section__title">Seller Avatars</h3>
          <Button onClick={() => openNew('seller')}>+ Add Seller Avatar</Button>
        </div>
        {sellerAvatars.length === 0 ? (
          <p className="avatar-empty">No seller avatars yet. Add one to define your ideal seller client.</p>
        ) : (
          <div className="avatar-grid">
            {sellerAvatars.map(a => <AvatarCard key={a.id} a={a} />)}
          </div>
        )}
      </div>

      {/* Edit Panel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editing ? `Edit ${draft.type === 'buyer' ? 'Buyer' : 'Seller'} Avatar` : `New ${draft.type === 'buyer' ? 'Buyer' : 'Seller'} Avatar`}
        width={480}
      >
        <form className="cc-form" onSubmit={handleSave}>
          <div className="cc-form-field">
            <label className="cc-label">Avatar Name *</label>
            <Input value={draft.name} onChange={e => set('name', e.target.value)} placeholder="e.g. First-Time Millennial Buyer" required />
          </div>

          <div className="cc-form-row">
            <div className="cc-form-field">
              <label className="cc-label">Age Range</label>
              <Select value={draft.age_range} onChange={e => set('age_range', e.target.value)}>
                <option value="">—</option>
                {AVATAR_AGE_RANGES.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div className="cc-form-field">
              <label className="cc-label">Household Income</label>
              <Select value={draft.income_range} onChange={e => set('income_range', e.target.value)}>
                <option value="">—</option>
                {AVATAR_INCOME_RANGES.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          <div className="cc-form-row">
            <div className="cc-form-field">
              <label className="cc-label">Family Status</label>
              <Select value={draft.family_status} onChange={e => set('family_status', e.target.value)}>
                <option value="">—</option>
                {AVATAR_FAMILY_STATUS.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div className="cc-form-field">
              <label className="cc-label">Motivation</label>
              <Select value={draft.motivation} onChange={e => set('motivation', e.target.value)}>
                <option value="">—</option>
                {motivations.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          <div className="cc-form-row">
            <div className="cc-form-field">
              <label className="cc-label">Property Type</label>
              <Select value={draft.property_type} onChange={e => set('property_type', e.target.value)}>
                <option value="">—</option>
                {AVATAR_PROP_TYPES.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          <div className="cc-form-row">
            <div className="cc-form-field">
              <label className="cc-label">Price Min ($)</label>
              <Input type="number" value={draft.price_range_min} onChange={e => set('price_range_min', e.target.value)} placeholder="350000" />
            </div>
            <div className="cc-form-field">
              <label className="cc-label">Price Max ($)</label>
              <Input type="number" value={draft.price_range_max} onChange={e => set('price_range_max', e.target.value)} placeholder="550000" />
            </div>
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Target Locations (comma-separated)</label>
            <Input
              value={Array.isArray(draft.locations) ? draft.locations.join(', ') : draft.locations}
              onChange={e => set('locations', e.target.value)}
              placeholder="Gilbert, Chandler, Mesa, Queen Creek"
            />
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Where They Hang Out Online</label>
            <div className="cc-platform-checks">
              {ONLINE_PLATFORMS.map(p => (
                <label key={p} className="cc-plat-check">
                  <input type="checkbox" checked={(draft.online_platforms ?? []).includes(p)} onChange={() => togglePlatform(p)} />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Pain Points</label>
            <Textarea value={draft.pain_points} onChange={e => set('pain_points', e.target.value)} placeholder="What keeps them up at night? What frustrates them about real estate?" rows={3} />
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Content That Resonates</label>
            <Textarea value={draft.content_resonates} onChange={e => set('content_resonates', e.target.value)} placeholder="What kind of posts, topics, or formats get their attention?" rows={3} />
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Notes</label>
            <Textarea value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes about this avatar..." rows={2} />
          </div>

          <div className="cc-form-actions">
            {editing && <button type="button" className="cc-del-btn" onClick={handleDelete}>Delete</button>}
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Avatar'}</Button>
          </div>
        </form>
      </SlidePanel>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab({ settings, activePlatforms, businessBrainUrl, reload }) {
  const [url, setPlatformsUrl]   = useState(businessBrainUrl)
  const [platforms, setPlatforms] = useState(activePlatforms)
  const [saving, setSaving]       = useState(false)

  function toggle(key) {
    setPlatforms(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await DB.updateContentSettings({ business_brain_url: url, active_platforms: platforms })
      await reload()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cc-settings">
      <form className="cc-form" onSubmit={handleSave}>

        {/* Business Brain */}
        <div className="cc-form-field">
          <label className="cc-label">Business Brain / Brand Doc URL</label>
          <p className="cc-field-hint">
            Your Google Doc, Notion page, or any URL with your brand voice, scripts, and content strategy.
            This link appears on every page of your content calendar for quick access.
          </p>
          <Input
            value={url}
            onChange={e => setPlatformsUrl(e.target.value)}
            placeholder="https://docs.google.com/..."
            type="url"
          />
          {url && (
            <a href={url} target="_blank" rel="noreferrer" className="cc-open-link">
              Open Document →
            </a>
          )}
        </div>

        {/* Active Platforms */}
        <div className="cc-form-field">
          <label className="cc-label">Active Platforms</label>
          <p className="cc-field-hint">
            Select the platforms you post to. Each platform gets its own adaptation section in every content piece.
          </p>
          <div className="cc-platform-checks">
            {PLATFORMS.map(p => (
              <label key={p.key} className="cc-plat-check">
                <input
                  type="checkbox"
                  checked={platforms.includes(p.key)}
                  onChange={() => toggle(p.key)}
                />
                <span>{p.icon} {p.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="cc-form-actions">
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
        </div>
      </form>
    </div>
  )
}

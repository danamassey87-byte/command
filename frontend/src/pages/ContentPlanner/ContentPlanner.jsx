import { useState, useMemo } from 'react'
import { Button } from '../../components/ui/index.jsx'
import { generateContent } from '../../lib/supabase'
import { useContentPillars, useClientAvatars } from '../../lib/hooks'
import './ContentPlanner.css'

// ─── Storage ───
const STORAGE_KEY = 'content_planner'
const FORMAT_KEY = 'content_weekly_format'
const INSPO_KEY = 'content_inspo_bank'

// ─── Default weekly format ───
const DEFAULT_FORMAT = [
  { day: 'Monday',    emoji: '🏡', format: 'CAROUSEL',     topic: 'Area spotlight — bars, restaurants, things to do', niche: 'COMMUNITY' },
  { day: 'Tuesday',   emoji: '🎬', format: 'REEL',         topic: 'House For Sale / Listing showcase', niche: 'LISTINGS' },
  { day: 'Wednesday', emoji: '🎯', format: 'REEL / CAROUSEL', topic: 'Me as Expert — market stats, tips, listing tips', niche: 'AUTHORITY' },
  { day: 'Thursday',  emoji: '☕', format: 'STORY / TIP',   topic: 'Coffee & Contracts — Q&A, behind the scenes', niche: 'PERSONAL' },
  { day: 'Friday',    emoji: '🏠', format: 'CAROUSEL',     topic: 'Houses I\'d Send My Buyers — curated picks', niche: 'LISTINGS' },
  { day: 'Saturday',  emoji: '🌿', format: 'STORY / REEL', topic: 'Life Lately / Day in the Life — personal, family', niche: 'PERSONAL' },
  { day: 'Sunday',    emoji: '❤️', format: 'STORY / REEL', topic: 'Coffee & Contracts Random — casual tips, weekly wrap', niche: 'COMMUNITY' },
]

const NICHE_COLORS = {
  COMMUNITY: '#6a9e72',
  LISTINGS: '#c99a2e',
  AUTHORITY: '#5a87b4',
  PERSONAL: '#b79782',
  LOCAL: '#c0604a',
}

const HOOK_IDEAS = [
  { text: "If you're moving to [Area] and don't know where to eat…", niche: 'COMMUNITY' },
  { text: "I grew up in [Area] and these are the only spots I'd take my out-of-town friends.", niche: 'LOCAL' },
  { text: "The honest guide to [Area] that no one talks about.", niche: 'COMMUNITY' },
  { text: "3 things I'd do my first weekend moving to [Area].", niche: 'COMMUNITY' },
  { text: "Stop scrolling — this house just hit the market.", niche: 'LISTINGS' },
  { text: "This is the house your Pinterest board has been manifesting.", niche: 'LISTINGS' },
  { text: "POV: You just got the keys to your dream home.", niche: 'LISTINGS' },
  { text: "The market is doing something weird right now. Let me explain.", niche: 'AUTHORITY' },
  { text: "Here's what I wish every buyer knew before making an offer.", niche: 'AUTHORITY' },
  { text: "Nobody talks about this part of buying a home.", niche: 'AUTHORITY' },
  { text: "A day in my life as a REALTOR® in the East Valley.", niche: 'PERSONAL' },
  { text: "The reality of being a real estate agent that nobody shows you.", niche: 'PERSONAL' },
]

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + (offset * 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmtDate(d) { return d.toISOString().slice(0, 10) }
function fmtShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function dayName(d) { return d.toLocaleDateString('en-US', { weekday: 'long' }) }
function dayAbbr(d) { return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() }

function loadPlanner() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}
function savePlanner(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
function loadFormat() {
  try { return JSON.parse(localStorage.getItem(FORMAT_KEY)) || DEFAULT_FORMAT } catch { return DEFAULT_FORMAT }
}
function saveFormat(data) { localStorage.setItem(FORMAT_KEY, JSON.stringify(data)) }
function loadInspo() {
  try { return JSON.parse(localStorage.getItem(INSPO_KEY)) || [] } catch { return [] }
}
function saveInspo(data) { localStorage.setItem(INSPO_KEY, JSON.stringify(data)) }

// ─── Main Component ───
/* ─── Pre-stored prompt templates ─── */
const PROMPT_TEMPLATES = [
  { id: 'just_listed',    label: 'Just Listed',            prompt: 'Write an engaging social media post announcing a new listing. Highlight the best features, create urgency, and include a call to action.' },
  { id: 'just_sold',      label: 'Just Sold',              prompt: 'Write a celebratory post about a recently sold property. Thank the clients and subtly encourage other potential sellers to reach out.' },
  { id: 'market_update',  label: 'Market Update',          prompt: 'Write a concise market update post that breaks down current trends in simple terms. Include actionable takeaways.' },
  { id: 'buyer_tip',      label: 'Buyer Tip',              prompt: 'Write a helpful tip post for home buyers. Break down a common misconception or share insider knowledge.' },
  { id: 'seller_tip',     label: 'Seller Tip',             prompt: 'Write a practical tip for home sellers. Focus on maximizing value or navigating the selling process.' },
  { id: 'neighborhood',   label: 'Neighborhood Spotlight', prompt: 'Write a post highlighting what makes a specific neighborhood special. Cover the vibe, amenities, schools, dining.' },
  { id: 'local_biz',      label: 'Local Biz Shoutout',     prompt: 'Write a warm shoutout post for a local business. Highlight what makes them special and encourage your audience to check them out.' },
  { id: 'behind_scenes',  label: 'Behind the Scenes',      prompt: 'Write a relatable behind-the-scenes post about a day in your life as a real estate agent. Be authentic.' },
  { id: 'client_story',   label: 'Client Success Story',   prompt: 'Write a story post about helping a client find their perfect home. Focus on the journey and the happy ending.' },
  { id: 'open_house',     label: 'Open House Invite',      prompt: 'Write an inviting open house announcement. Create excitement about the property and make people want to come see it.' },
]

export default function ContentPlanner() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [planner, setPlanner] = useState(loadPlanner)
  const [format, setFormat] = useState(loadFormat)
  const [inspoBank, setInspoBank] = useState(loadInspo)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingFormat, setEditingFormat] = useState(false)

  const [aiLoading, setAiLoading] = useState(false)
  const [aiHooksLoading, setAiHooksLoading] = useState(false)
  const [aiHooks, setAiHooks] = useState([])
  const [aiTopicsLoading, setAiTopicsLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState('')

  // Content strategy data
  const { data: pillars } = useContentPillars()
  const { data: avatars } = useClientAvatars()
  const pillarList = pillars ?? []
  const avatarList = avatars ?? []

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const today = fmtDate(new Date())

  const weekLabel = `Week of ${fmtShort(weekDates[0])} - ${fmtShort(weekDates[6])}`

  // Get or create day entry
  const getDayEntry = (dateStr) => {
    const dayOfWeek = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    const fmt = format.find(f => f.day === dayOfWeek) || {}
    return {
      topic: '',
      format: fmt.format || '',
      emoji: fmt.emoji || '📝',
      niche: fmt.niche || '',
      hook: '',
      caption: '',
      manychatKeyword: '',
      notes: '',
      canvaLink: '',
      pillar_id: '',
      avatar_id: '',
      neighborhood: '',
      planned: false,
      ...planner[dateStr],
    }
  }

  const updateDay = (dateStr, updates) => {
    const newPlanner = { ...planner, [dateStr]: { ...getDayEntry(dateStr), ...updates } }
    setPlanner(newPlanner)
    savePlanner(newPlanner)
  }

  const updateFormat = (idx, updates) => {
    const newFormat = [...format]
    newFormat[idx] = { ...newFormat[idx], ...updates }
    setFormat(newFormat)
    saveFormat(newFormat)
  }

  const handleInspoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const updated = [...inspoBank, { id: crypto.randomUUID(), imageUrl: reader.result, addedAt: new Date().toISOString() }]
      setInspoBank(updated)
      saveInspo(updated)
    }
    reader.readAsDataURL(file)
  }

  const removeInspo = (id) => {
    const updated = inspoBank.filter(i => i.id !== id)
    setInspoBank(updated)
    saveInspo(updated)
  }

  // ─── AI: Generate caption from hook + topic context ───
  const handleGenerateCaption = async () => {
    if (!selectedDate) return
    const entry = getDayEntry(selectedDate)
    const dayOfWeek = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    const fmt = format.find(f => f.day === dayOfWeek)

    // Use prompt template if selected, otherwise freeform
    const templatePrompt = selectedPromptTemplate
      ? PROMPT_TEMPLATES.find(t => t.id === selectedPromptTemplate)?.prompt
      : null
    const prompt = templatePrompt || aiPrompt.trim() || entry.hook || entry.topic || fmt?.topic || 'Real estate content'

    // Build pillar context
    const pillar = pillarList.find(p => p.id === entry.pillar_id)
    const pillarName = pillar?.name || entry.niche || fmt?.niche || 'Real Estate'

    // Build avatar context
    const avatar = avatarList.find(a => a.id === entry.avatar_id)
    let avatarContext = ''
    if (avatar) {
      avatarContext = `\n\nTarget audience: ${avatar.name}`
      if (avatar.age_range) avatarContext += `, age ${avatar.age_range}`
      if (avatar.family_status) avatarContext += `, ${avatar.family_status}`
      if (avatar.motivation) avatarContext += `, motivation: ${avatar.motivation}`
      if (avatar.pain_points) avatarContext += `\nPain points: ${avatar.pain_points}`
      if (avatar.content_resonates) avatarContext += `\nContent they respond to: ${avatar.content_resonates}`
    }

    // Neighborhood context
    let neighborhoodContext = ''
    if (entry.neighborhood) {
      neighborhoodContext = `\nNeighborhood/Area focus: ${entry.neighborhood}`
    }

    setAiLoading(true)
    try {
      const { text } = await generateContent({
        type: 'write',
        pillar: pillarName,
        prompt: `${prompt}\n\nFormat: ${entry.format || fmt?.format || 'social media post'}${entry.hook ? `\nHook to use: "${entry.hook}"` : ''}${avatarContext}${neighborhoodContext}`,
      })
      updateDay(selectedDate, { caption: text })
      setAiPrompt('')
      setSelectedPromptTemplate('')
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ─── AI: Suggest hooks for the selected day's niche ───
  const handleSuggestHooks = async () => {
    if (!selectedDate) return
    const entry = getDayEntry(selectedDate)
    const dayOfWeek = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    const fmt = format.find(f => f.day === dayOfWeek)
    setAiHooksLoading(true)
    try {
      const { hooks } = await generateContent({
        type: 'suggest_hooks',
        pillar: entry.niche || fmt?.niche || 'Real Estate',
        prompt: entry.topic || fmt?.topic || 'real estate',
        body_text: entry.format || fmt?.format || 'Instagram post',
      })
      setAiHooks(hooks || [])
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setAiHooksLoading(false)
    }
  }

  // ─── AI: Suggest topic ideas for the whole week ───
  const handleSuggestTopics = async () => {
    const weekSummary = format.map(f => `${f.day}: ${f.format} — ${f.topic} (${f.niche})`).join('\n')
    setAiTopicsLoading(true)
    try {
      const { topics } = await generateContent({
        type: 'suggest_topics',
        prompt: weekSummary,
      })
      if (topics?.length) {
        const newPlanner = { ...planner }
        weekDates.forEach((date, i) => {
          const dateStr = fmtDate(date)
          const suggestion = topics[i]
          if (suggestion?.idea) {
            newPlanner[dateStr] = { ...getDayEntry(dateStr), topic: suggestion.idea }
          }
        })
        setPlanner(newPlanner)
        savePlanner(newPlanner)
      }
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setAiTopicsLoading(false)
    }
  }

  const sel = selectedDate ? getDayEntry(selectedDate) : null
  const selDayName = selectedDate ? dayName(new Date(selectedDate + 'T12:00:00')) : ''
  const selDayNum = selectedDate ? new Date(selectedDate + 'T12:00:00').getDate() : ''

  return (
    <div className="cp">
      {/* ─── Header ─── */}
      <div className="cp__header">
        <div>
          <p className="cp__bestie">YOUR CONTENT BESTIE</p>
          <h2 className="cp__title">Content <em>Planner</em></h2>
        </div>
        <div className="cp__week-nav">
          <button className="cp__nav-btn" onClick={() => setWeekOffset(w => w - 1)}>‹</button>
          <span className="cp__week-label">{weekLabel}</span>
          <button className="cp__nav-btn" onClick={() => setWeekOffset(w => w + 1)}>›</button>
          {weekOffset !== 0 && <button className="cp__today-btn" onClick={() => setWeekOffset(0)}>Today</button>}
          <button
            className="cp__ai-topics-btn"
            onClick={handleSuggestTopics}
            disabled={aiTopicsLoading}
          >
            {aiTopicsLoading ? '✦ Thinking…' : '✦ AI: Fill Week Ideas'}
          </button>
        </div>
      </div>

      {/* ─── Weekly Calendar Strip ─── */}
      <div className="cp__strip">
        {weekDates.map(date => {
          const dateStr = fmtDate(date)
          const entry = getDayEntry(dateStr)
          const dayFmt = format.find(f => f.day === dayName(date))
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate

          return (
            <div
              key={dateStr}
              className={`cp__day ${isToday ? 'cp__day--today' : ''} ${isSelected ? 'cp__day--selected' : ''} ${entry.planned ? 'cp__day--planned' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
            >
              <p className="cp__day-abbr">{dayAbbr(date)}</p>
              <p className="cp__day-num">{date.getDate()}</p>
              <span className="cp__day-emoji">{dayFmt?.emoji || '📝'}</span>
              <p className="cp__day-topic">{entry.topic || dayFmt?.topic?.split('—')[0]?.trim() || ''}</p>
              <p className="cp__day-format">{entry.format || dayFmt?.format || ''}</p>
              <button className="cp__plan-btn" onClick={(e) => { e.stopPropagation(); setSelectedDate(dateStr) }}>
                {entry.planned ? '✓ PLANNED' : '+ PLAN IT'}
              </button>
            </div>
          )
        })}
      </div>

      {/* ─── Bottom Section: Detail + Inspo + Weekly Format ─── */}
      <div className="cp__bottom">
        {/* Selected Day Detail */}
        <div className="cp__detail">
          {sel ? (
            <>
              <div className="cp__detail-card">
                <p className="cp__detail-label">SELECTED DAY</p>
                <h3 className="cp__detail-day">{selDayName} {selDayNum}</h3>
                <p className="cp__detail-topic">
                  {sel.emoji} {sel.topic || format.find(f => f.day === selDayName)?.topic || 'No topic set'}
                </p>
                <span className="cp__detail-format">{sel.format || format.find(f => f.day === selDayName)?.format}</span>
                {sel.niche && <span className="cp__detail-niche" style={{ background: NICHE_COLORS[sel.niche] || 'var(--brown-mid)' }}>{sel.niche}</span>}
              </div>

              {/* ─── Content Strategy Selectors ─── */}
              <div className="cp__strategy-row">
                <div className="cp__strategy-field">
                  <label className="cp__field-label">PILLAR</label>
                  <select
                    className="cp__select"
                    value={sel.pillar_id || ''}
                    onChange={e => updateDay(selectedDate, { pillar_id: e.target.value })}
                  >
                    <option value="">-- Select Pillar --</option>
                    {pillarList.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="cp__strategy-field">
                  <label className="cp__field-label">TARGET AVATAR</label>
                  <select
                    className="cp__select"
                    value={sel.avatar_id || ''}
                    onChange={e => updateDay(selectedDate, { avatar_id: e.target.value })}
                  >
                    <option value="">-- Select Avatar --</option>
                    {avatarList.map(a => (
                      <option key={a.id} value={a.id}>{a.type === 'buyer' ? '🏠' : '📋'} {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cp__strategy-row">
                <div className="cp__strategy-field">
                  <label className="cp__field-label">NEIGHBORHOOD / AREA</label>
                  <input
                    className="cp__input"
                    value={sel.neighborhood || ''}
                    onChange={e => updateDay(selectedDate, { neighborhood: e.target.value })}
                    placeholder="e.g. Power Ranch, Downtown Gilbert..."
                  />
                </div>
                <div className="cp__strategy-field">
                  <label className="cp__field-label">PROMPT TEMPLATE</label>
                  <select
                    className="cp__select"
                    value={selectedPromptTemplate}
                    onChange={e => setSelectedPromptTemplate(e.target.value)}
                  >
                    <option value="">-- Freeform --</option>
                    {PROMPT_TEMPLATES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">YOUR HOOK</label>
                <textarea
                  className="cp__textarea"
                  value={sel.hook}
                  onChange={e => updateDay(selectedDate, { hook: e.target.value })}
                  placeholder="Write or pick a hook above..."
                  rows={2}
                />
              </div>

              <div className="cp__hook-ideas">
                <div className="cp__hook-ideas-header">
                  <p className="cp__field-label">HOOK IDEAS — CLICK TO USE</p>
                  <button
                    className="cp__ai-suggest-btn"
                    onClick={handleSuggestHooks}
                    disabled={aiHooksLoading}
                  >
                    {aiHooksLoading ? '✦ Thinking…' : '✦ AI Hooks'}
                  </button>
                </div>
                <div className="cp__hooks-list">
                  {/* Show AI-generated hooks if available, otherwise show static ones */}
                  {(aiHooks.length > 0 ? aiHooks : HOOK_IDEAS.filter(h => !sel.niche || h.niche === sel.niche || h.niche === 'COMMUNITY').slice(0, 5).map(h => h.text)).map((hookText, i) => (
                    <button key={i} className={`cp__hook-pill ${aiHooks.length > 0 ? 'cp__hook-pill--ai' : ''}`} onClick={() => updateDay(selectedDate, { hook: hookText })}>
                      {hookText}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">CAPTION DRAFT</label>
                <div className="cp__ai-write-box">
                  <div className="cp__ai-write-label">✦ Write with Claude</div>
                  <div className="cp__ai-write-row">
                    <input
                      className="cp__ai-write-input"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="Describe what you want (or leave blank to use hook + topic)…"
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleGenerateCaption())}
                    />
                    <button
                      className="cp__ai-write-btn"
                      onClick={handleGenerateCaption}
                      disabled={aiLoading}
                    >
                      {aiLoading ? '✦ Writing…' : '✦ Generate'}
                    </button>
                  </div>
                </div>
                <textarea
                  className="cp__textarea cp__textarea--lg"
                  value={sel.caption}
                  onChange={e => updateDay(selectedDate, { caption: e.target.value })}
                  placeholder="Your caption will appear here — write it yourself or let Claude draft it for you"
                  rows={5}
                />
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">MANYCHAT KEYWORD</label>
                <input
                  className="cp__input"
                  value={sel.manychatKeyword}
                  onChange={e => updateDay(selectedDate, { manychatKeyword: e.target.value })}
                  placeholder="e.g. ARCADIA, GUIDE, TIPS"
                />
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">CANVA LINK</label>
                <input
                  className="cp__input"
                  value={sel.canvaLink}
                  onChange={e => updateDay(selectedDate, { canvaLink: e.target.value })}
                  placeholder="https://canva.com/design/..."
                />
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">NOTES</label>
                <textarea
                  className="cp__textarea"
                  value={sel.notes}
                  onChange={e => updateDay(selectedDate, { notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="cp__detail-actions">
                <Button size="sm" variant={sel.planned ? 'ghost' : 'accent'} onClick={() => updateDay(selectedDate, { planned: !sel.planned })}>
                  {sel.planned ? '↩ Unmark Planned' : '✓ Mark as Planned'}
                </Button>
              </div>
            </>
          ) : (
            <div className="cp__detail-empty">
              <p>👈 Select a day to start planning</p>
            </div>
          )}
        </div>

        {/* Right column: Inspo Bank + Weekly Format */}
        <div className="cp__right-col">
          {/* Inspo Bank */}
          <div className="cp__inspo">
            <h4 className="cp__section-title">INSPO BANK</h4>
            <p className="cp__section-sub">Screenshots of posts that performed well</p>
            <div className="cp__inspo-grid">
              {inspoBank.map(item => (
                <div key={item.id} className="cp__inspo-item">
                  <img src={item.imageUrl} alt="" />
                  <button className="cp__inspo-remove" onClick={() => removeInspo(item.id)}>×</button>
                </div>
              ))}
              <label className="cp__inspo-upload">
                <span>📲</span>
                <span>Drop inspo screenshots here</span>
                <input type="file" accept="image/*" onChange={handleInspoUpload} hidden />
              </label>
            </div>
          </div>

          {/* Weekly Format */}
          <div className="cp__weekly-format">
            <div className="cp__format-header">
              <h4 className="cp__section-title">YOUR WEEKLY FORMAT</h4>
              <button className="cp__edit-format-btn" onClick={() => setEditingFormat(e => !e)}>
                {editingFormat ? '✓ Done' : '✏️ Edit'}
              </button>
            </div>
            {format.map((f, idx) => (
              <div key={f.day} className="cp__format-row">
                <span className="cp__format-emoji">{f.emoji}</span>
                <div className="cp__format-info">
                  {editingFormat ? (
                    <>
                      <div className="cp__format-edit-row">
                        <strong>{f.day}</strong>
                        <input value={f.emoji} onChange={e => updateFormat(idx, { emoji: e.target.value })} className="cp__format-input cp__format-input--sm" placeholder="emoji" />
                      </div>
                      <input value={f.format} onChange={e => updateFormat(idx, { format: e.target.value })} className="cp__format-input" placeholder="CAROUSEL, REEL, STORY..." />
                      <input value={f.topic} onChange={e => updateFormat(idx, { topic: e.target.value })} className="cp__format-input" placeholder="Topic description..." />
                      <select value={f.niche} onChange={e => updateFormat(idx, { niche: e.target.value })} className="cp__format-input">
                        <option value="">Niche...</option>
                        <option value="COMMUNITY">COMMUNITY</option>
                        <option value="LISTINGS">LISTINGS</option>
                        <option value="AUTHORITY">AUTHORITY</option>
                        <option value="PERSONAL">PERSONAL</option>
                        <option value="LOCAL">LOCAL</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <p className="cp__format-day">
                        <strong>{f.day}</strong>
                        <span className="cp__format-badge" style={{ background: NICHE_COLORS[f.niche] || 'var(--brown-mid)' }}>{f.format}</span>
                      </p>
                      <p className="cp__format-topic">{f.topic}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

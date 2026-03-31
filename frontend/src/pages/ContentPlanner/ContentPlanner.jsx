import { useState, useMemo, useCallback } from 'react'
import { Button } from '../../components/ui/index.jsx'
import { generateContent } from '../../lib/supabase'
import { useContentPillars, useClientAvatars, useProperties } from '../../lib/hooks'
import './ContentPlanner.css'

// ─── Storage ───
const STORAGE_KEY = 'content_planner_v2'
const FORMAT_KEY = 'content_weekly_format'
const INSPO_KEY = 'content_inspo_bank'

// ─── Content slot types (daily) ───
const SLOT_TYPES = [
  { id: 'story',    label: 'Story',    icon: '📱', desc: 'Daily IG Story' },
  { id: 'reel',     label: 'Reel',     icon: '🎬', desc: 'Daily IG Reel' },
  { id: 'carousel', label: 'Carousel', icon: '📸', desc: 'Daily IG Carousel' },
]

// ─── Repurpose platforms ───
const PLATFORMS = [
  { id: 'instagram',   label: 'Instagram',         icon: '📸', hasHashtags: true,  hasSeo: false, hasLink: true  },
  { id: 'facebook',    label: 'Facebook',           icon: '📘', hasHashtags: true,  hasSeo: false, hasLink: true  },
  { id: 'tiktok',      label: 'TikTok',             icon: '🎵', hasHashtags: true,  hasSeo: false, hasLink: false },
  { id: 'linkedin',    label: 'LinkedIn',           icon: '💼', hasHashtags: true,  hasSeo: false, hasLink: true  },
  { id: 'youtube',     label: 'YouTube',            icon: '▶️',  hasHashtags: true,  hasSeo: true,  hasLink: true  },
  { id: 'gmb',         label: 'Google My Business', icon: '📍', hasHashtags: false, hasSeo: true,  hasLink: true  },
  { id: 'blog',        label: 'Blog Post',          icon: '✍️',  hasHashtags: false, hasSeo: true,  hasLink: true  },
  { id: 'pinterest',   label: 'Pinterest',          icon: '📌', hasHashtags: true,  hasSeo: true,  hasLink: true  },
  { id: 'threads',     label: 'Threads',            icon: '🧵', hasHashtags: true,  hasSeo: false, hasLink: false },
  { id: 'nextdoor',    label: 'Nextdoor',           icon: '🏘️',  hasHashtags: false, hasSeo: false, hasLink: true  },
  { id: 'email',       label: 'Email Newsletter',   icon: '📧', hasHashtags: false, hasSeo: false, hasLink: true  },
]

// ─── Default weekly format ───
const DEFAULT_FORMAT = [
  { day: 'Monday',    emoji: '🏡', format: 'CAROUSEL',        topic: 'Area spotlight — bars, restaurants, things to do', niche: 'COMMUNITY' },
  { day: 'Tuesday',   emoji: '🎬', format: 'REEL',            topic: 'House For Sale / Listing showcase', niche: 'LISTINGS' },
  { day: 'Wednesday', emoji: '🎯', format: 'REEL / CAROUSEL', topic: 'Me as Expert — market stats, tips, listing tips', niche: 'AUTHORITY' },
  { day: 'Thursday',  emoji: '☕', format: 'STORY / TIP',      topic: 'Coffee & Contracts — Q&A, behind the scenes', niche: 'PERSONAL' },
  { day: 'Friday',    emoji: '🏠', format: 'CAROUSEL',        topic: 'Houses I\'d Send My Buyers — curated picks', niche: 'LISTINGS' },
  { day: 'Saturday',  emoji: '🌿', format: 'STORY / REEL',    topic: 'Life Lately / Day in the Life — personal, family', niche: 'PERSONAL' },
  { day: 'Sunday',    emoji: '❤️', format: 'STORY / REEL',     topic: 'Coffee & Contracts Random — casual tips, weekly wrap', niche: 'COMMUNITY' },
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

// ─── Empty slot template ───
function emptySlot() {
  return {
    topic: '', hook: '', caption: '', hashtags: '', keywords: '', link: '',
    manychatKeyword: '', canvaLink: '', notes: '',
    pillar_id: '', avatar_id: '', property_id: '', neighborhood: '',
    repurpose: {},  // { platformId: { caption, hashtags, keywords, link, cta } }
  }
}

// ─── Build full caption string for copy ───
function buildCopyText(slot, platformId) {
  const parts = []
  const data = platformId ? (slot.repurpose?.[platformId] || {}) : slot
  const caption = data.caption || slot.caption || ''
  const hashtags = data.hashtags || slot.hashtags || ''
  const keywords = data.keywords || ''
  const link = data.link || slot.link || ''
  const cta = data.cta || ''

  if (caption) parts.push(caption)
  if (cta) parts.push('\n' + cta)
  if (link) parts.push('\n' + link)
  if (hashtags) parts.push('\n' + hashtags)
  if (keywords) parts.push('\nKeywords: ' + keywords)

  return parts.join('\n')
}

// ─── Main Component ───
export default function ContentPlanner() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [planner, setPlanner] = useState(loadPlanner)
  const [format, setFormat] = useState(loadFormat)
  const [inspoBank, setInspoBank] = useState(loadInspo)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState('story')
  const [activeTab, setActiveTab] = useState('compose')   // compose | repurpose
  const [activePlatform, setActivePlatform] = useState(null)
  const [editingFormat, setEditingFormat] = useState(false)
  const [copiedId, setCopiedId] = useState(null)

  const [aiLoading, setAiLoading] = useState(false)
  const [aiHooksLoading, setAiHooksLoading] = useState(false)
  const [aiHooks, setAiHooks] = useState([])
  const [aiTopicsLoading, setAiTopicsLoading] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [selectedPromptTemplate, setSelectedPromptTemplate] = useState('')
  const [aiRepurposeLoading, setAiRepurposeLoading] = useState(false)

  const { data: pillars } = useContentPillars()
  const { data: avatars } = useClientAvatars()
  const { data: properties } = useProperties()
  const pillarList = pillars ?? []
  const avatarList = avatars ?? []
  const propertyList = properties ?? []

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const today = fmtDate(new Date())
  const weekLabel = `Week of ${fmtShort(weekDates[0])} - ${fmtShort(weekDates[6])}`

  // ─── Slot data access ───
  const getSlot = (dateStr, slotType) => {
    return { ...emptySlot(), ...(planner[dateStr]?.slots?.[slotType] || {}) }
  }

  const getDayMeta = (dateStr) => {
    const dayOfWeek = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    const fmt = format.find(f => f.day === dayOfWeek) || {}
    return { ...fmt, ...(planner[dateStr]?.meta || {}) }
  }

  const updateSlot = (dateStr, slotType, updates) => {
    const day = planner[dateStr] || { meta: {}, slots: {} }
    const slot = { ...emptySlot(), ...(day.slots?.[slotType] || {}), ...updates }
    const newPlanner = {
      ...planner,
      [dateStr]: {
        ...day,
        slots: { ...day.slots, [slotType]: slot },
      },
    }
    setPlanner(newPlanner)
    savePlanner(newPlanner)
  }

  const updateDayMeta = (dateStr, updates) => {
    const day = planner[dateStr] || { meta: {}, slots: {} }
    const newPlanner = {
      ...planner,
      [dateStr]: { ...day, meta: { ...day.meta, ...updates } },
    }
    setPlanner(newPlanner)
    savePlanner(newPlanner)
  }

  const updateRepurpose = (dateStr, slotType, platformId, updates) => {
    const slot = getSlot(dateStr, slotType)
    const repurpose = { ...slot.repurpose, [platformId]: { ...(slot.repurpose?.[platformId] || {}), ...updates } }
    updateSlot(dateStr, slotType, { repurpose })
  }

  const toggleRepurposePlatform = (dateStr, slotType, platformId) => {
    const slot = getSlot(dateStr, slotType)
    const repurpose = { ...slot.repurpose }
    if (repurpose[platformId]) {
      delete repurpose[platformId]
      if (activePlatform === platformId) setActivePlatform(null)
    } else {
      repurpose[platformId] = { caption: '', hashtags: '', keywords: '', link: '', cta: '' }
      setActivePlatform(platformId)
    }
    updateSlot(dateStr, slotType, { repurpose })
  }

  // ─── Copy to clipboard ───
  const handleCopy = useCallback(async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch { /* fallback */ }
  }, [])

  // ─── Format / Inspo helpers ───
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

  // ─── AI: Generate caption ───
  const handleGenerateCaption = async () => {
    if (!selectedDate) return
    const slot = getSlot(selectedDate, selectedSlot)
    const dayOfWeek = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    const fmt = format.find(f => f.day === dayOfWeek)

    const templatePrompt = selectedPromptTemplate
      ? PROMPT_TEMPLATES.find(t => t.id === selectedPromptTemplate)?.prompt
      : null
    const prompt = templatePrompt || aiPrompt.trim() || slot.hook || slot.topic || fmt?.topic || 'Real estate content'

    const pillar = pillarList.find(p => p.id === slot.pillar_id)
    const pillarName = pillar?.name || fmt?.niche || 'Real Estate'

    const avatar = avatarList.find(a => a.id === slot.avatar_id)
    let avatarContext = ''
    if (avatar) {
      avatarContext = `\n\nTarget audience: ${avatar.name}`
      if (avatar.age_range) avatarContext += `, age ${avatar.age_range}`
      if (avatar.family_status) avatarContext += `, ${avatar.family_status}`
      if (avatar.motivation) avatarContext += `, motivation: ${avatar.motivation}`
      if (avatar.pain_points) avatarContext += `\nPain points: ${avatar.pain_points}`
      if (avatar.content_resonates) avatarContext += `\nContent they respond to: ${avatar.content_resonates}`
    }

    let neighborhoodContext = ''
    if (slot.neighborhood) neighborhoodContext = `\nNeighborhood/Area focus: ${slot.neighborhood}`

    const slotLabel = SLOT_TYPES.find(s => s.id === selectedSlot)?.label || 'post'

    setAiLoading(true)
    try {
      const { text } = await generateContent({
        type: 'write',
        pillar: pillarName,
        prompt: `${prompt}\n\nFormat: Instagram ${slotLabel}${slot.hook ? `\nHook to use: "${slot.hook}"` : ''}${avatarContext}${neighborhoodContext}\n\nAlso suggest 15-20 relevant hashtags at the end.`,
      })
      // Split caption and hashtags if AI included them
      const hashIdx = text.lastIndexOf('\n#')
      if (hashIdx > 0) {
        updateSlot(selectedDate, selectedSlot, {
          caption: text.slice(0, hashIdx).trim(),
          hashtags: text.slice(hashIdx).trim(),
        })
      } else {
        updateSlot(selectedDate, selectedSlot, { caption: text })
      }
      setAiPrompt('')
      setSelectedPromptTemplate('')
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ─── AI: Repurpose caption for a platform ───
  const handleRepurpose = async (platformId) => {
    if (!selectedDate) return
    const slot = getSlot(selectedDate, selectedSlot)
    if (!slot.caption) { alert('Write or generate an Instagram caption first.'); return }

    const platform = PLATFORMS.find(p => p.id === platformId)
    setAiRepurposeLoading(true)
    try {
      const { text } = await generateContent({
        type: 'write',
        pillar: 'Content Repurposing',
        prompt: `Repurpose this Instagram caption for ${platform.label}. Adjust the tone, length, and style to match ${platform.label}'s best practices.\n\nOriginal caption:\n${slot.caption}\n\n${platform.hasHashtags ? 'Include relevant hashtags for ' + platform.label + '.' : 'Do NOT include hashtags.'}\n${platform.hasSeo ? 'Include SEO keywords and meta description.' : ''}\nFormat the output as:\nCAPTION:\n[the repurposed caption]\n${platform.hasHashtags ? 'HASHTAGS:\n[hashtags]' : ''}\n${platform.hasSeo ? 'KEYWORDS:\n[comma-separated keywords]' : ''}\nCTA:\n[call to action]`,
      })
      // Parse the AI response
      const parsed = {}
      const captionMatch = text.match(/CAPTION:\n?([\s\S]*?)(?=\n(?:HASHTAGS|KEYWORDS|CTA):|$)/i)
      const hashtagMatch = text.match(/HASHTAGS:\n?([\s\S]*?)(?=\n(?:KEYWORDS|CTA):|$)/i)
      const keywordMatch = text.match(/KEYWORDS:\n?([\s\S]*?)(?=\n(?:CTA):|$)/i)
      const ctaMatch = text.match(/CTA:\n?([\s\S]*?)$/i)

      if (captionMatch) parsed.caption = captionMatch[1].trim()
      else parsed.caption = text
      if (hashtagMatch) parsed.hashtags = hashtagMatch[1].trim()
      if (keywordMatch) parsed.keywords = keywordMatch[1].trim()
      if (ctaMatch) parsed.cta = ctaMatch[1].trim()

      updateRepurpose(selectedDate, selectedSlot, platformId, parsed)
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setAiRepurposeLoading(false)
    }
  }

  // ─── AI: Suggest hooks ───
  const handleSuggestHooks = async () => {
    if (!selectedDate) return
    const slot = getSlot(selectedDate, selectedSlot)
    const dayOfWeek = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    const fmt = format.find(f => f.day === dayOfWeek)
    setAiHooksLoading(true)
    try {
      const { hooks } = await generateContent({
        type: 'suggest_hooks',
        pillar: fmt?.niche || 'Real Estate',
        prompt: slot.topic || fmt?.topic || 'real estate',
        body_text: SLOT_TYPES.find(s => s.id === selectedSlot)?.label || 'Instagram post',
      })
      setAiHooks(hooks || [])
    } catch (e) {
      alert('Claude error: ' + e.message)
    } finally {
      setAiHooksLoading(false)
    }
  }

  // ─── AI: Suggest weekly topics ───
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
            const day = newPlanner[dateStr] || { meta: {}, slots: {} }
            // Apply topic to all slots
            const slots = { ...day.slots }
            SLOT_TYPES.forEach(st => {
              slots[st.id] = { ...emptySlot(), ...(slots[st.id] || {}), topic: suggestion.idea }
            })
            newPlanner[dateStr] = { ...day, slots }
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

  // Current selection
  const sel = selectedDate ? getSlot(selectedDate, selectedSlot) : null
  const selMeta = selectedDate ? getDayMeta(selectedDate) : null
  const selDayName = selectedDate ? dayName(new Date(selectedDate + 'T12:00:00')) : ''
  const selDayNum = selectedDate ? new Date(selectedDate + 'T12:00:00').getDate() : ''

  // Count filled slots per day
  const getSlotCount = (dateStr) => {
    const slots = planner[dateStr]?.slots || {}
    return SLOT_TYPES.filter(st => slots[st.id]?.caption || slots[st.id]?.topic).length
  }

  // Repurposed platforms for current slot
  const repurposedPlatforms = sel ? Object.keys(sel.repurpose || {}) : []

  return (
    <div className="cp">
      {/* ─── Header ─── */}
      <div className="cp__header">
        <div>
          <p className="cp__bestie">YOUR CONTENT BESTIE</p>
          <h2 className="cp__title">Content <em>Planner</em></h2>
        </div>
        <div className="cp__week-nav">
          <button className="cp__nav-btn" onClick={() => setWeekOffset(w => w - 1)}>&#8249;</button>
          <span className="cp__week-label">{weekLabel}</span>
          <button className="cp__nav-btn" onClick={() => setWeekOffset(w => w + 1)}>&#8250;</button>
          {weekOffset !== 0 && <button className="cp__today-btn" onClick={() => setWeekOffset(0)}>Today</button>}
          <button className="cp__ai-topics-btn" onClick={handleSuggestTopics} disabled={aiTopicsLoading}>
            {aiTopicsLoading ? '✦ Thinking...' : '✦ AI: Fill Week Ideas'}
          </button>
        </div>
      </div>

      {/* ─── Weekly Calendar Strip ─── */}
      <div className="cp__strip">
        {weekDates.map(date => {
          const dateStr = fmtDate(date)
          const dayFmt = format.find(f => f.day === dayName(date))
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate
          const slotCount = getSlotCount(dateStr)
          const meta = getDayMeta(dateStr)

          return (
            <div
              key={dateStr}
              className={`cp__day ${isToday ? 'cp__day--today' : ''} ${isSelected ? 'cp__day--selected' : ''} ${slotCount === 3 ? 'cp__day--planned' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
            >
              <p className="cp__day-abbr">{dayAbbr(date)}</p>
              <p className="cp__day-num">{date.getDate()}</p>
              <span className="cp__day-emoji">{dayFmt?.emoji || '📝'}</span>
              <div className="cp__day-slots">
                {SLOT_TYPES.map(st => {
                  const s = planner[dateStr]?.slots?.[st.id]
                  const filled = s?.caption || s?.topic
                  return <span key={st.id} className={`cp__day-slot-dot${filled ? ' cp__day-slot-dot--filled' : ''}`} title={st.label}>{st.icon}</span>
                })}
              </div>
              <p className="cp__day-format">{dayFmt?.format || ''}</p>
            </div>
          )
        })}
      </div>

      {/* ─── Bottom Section ─── */}
      <div className="cp__bottom">
        <div className="cp__detail">
          {sel ? (
            <>
              {/* Day header */}
              <div className="cp__detail-card">
                <p className="cp__detail-label">SELECTED DAY</p>
                <h3 className="cp__detail-day">{selDayName} {selDayNum}</h3>
                {selMeta?.niche && <span className="cp__detail-niche" style={{ background: NICHE_COLORS[selMeta.niche] || 'var(--brown-mid)' }}>{selMeta.niche}</span>}
              </div>

              {/* Slot type tabs: Story / Reel / Carousel */}
              <div className="cp__slot-tabs">
                {SLOT_TYPES.map(st => {
                  const s = planner[selectedDate]?.slots?.[st.id]
                  const filled = s?.caption || s?.topic
                  return (
                    <button
                      key={st.id}
                      className={`cp__slot-tab${selectedSlot === st.id ? ' cp__slot-tab--active' : ''}${filled ? ' cp__slot-tab--filled' : ''}`}
                      onClick={() => { setSelectedSlot(st.id); setActiveTab('compose'); setActivePlatform(null) }}
                    >
                      <span>{st.icon}</span>
                      <span>{st.label}</span>
                      {filled && <span className="cp__slot-tab-check">&#10003;</span>}
                    </button>
                  )
                })}
              </div>

              {/* Compose / Repurpose tab toggle */}
              <div className="cp__mode-tabs">
                <button className={`cp__mode-tab${activeTab === 'compose' ? ' cp__mode-tab--active' : ''}`} onClick={() => setActiveTab('compose')}>
                  Compose
                </button>
                <button className={`cp__mode-tab${activeTab === 'repurpose' ? ' cp__mode-tab--active' : ''}`} onClick={() => setActiveTab('repurpose')}>
                  Repurpose ({repurposedPlatforms.length})
                </button>
              </div>

              {/* ─── COMPOSE TAB ─── */}
              {activeTab === 'compose' && (
                <>
                  {/* Strategy selectors */}
                  <div className="cp__strategy-row">
                    <div className="cp__strategy-field">
                      <label className="cp__field-label">PILLAR</label>
                      <select className="cp__select" value={sel.pillar_id || ''} onChange={e => updateSlot(selectedDate, selectedSlot, { pillar_id: e.target.value })}>
                        <option value="">-- Select Pillar --</option>
                        {pillarList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="cp__strategy-field">
                      <label className="cp__field-label">TARGET AVATAR</label>
                      <select className="cp__select" value={sel.avatar_id || ''} onChange={e => updateSlot(selectedDate, selectedSlot, { avatar_id: e.target.value })}>
                        <option value="">-- Select Avatar --</option>
                        {avatarList.map(a => <option key={a.id} value={a.id}>{a.type === 'buyer' ? '🏠' : '📋'} {a.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="cp__strategy-row">
                    <div className="cp__strategy-field">
                      <label className="cp__field-label">LINKED PROPERTY</label>
                      <select className="cp__select" value={sel.property_id || ''} onChange={e => updateSlot(selectedDate, selectedSlot, { property_id: e.target.value })}>
                        <option value="">-- No Property --</option>
                        {propertyList.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.address}{p.city ? `, ${p.city}` : ''}{p.price ? ` — $${Number(p.price).toLocaleString()}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="cp__strategy-field">
                      <label className="cp__field-label">NEIGHBORHOOD / AREA</label>
                      <input className="cp__input" value={sel.neighborhood || ''} onChange={e => updateSlot(selectedDate, selectedSlot, { neighborhood: e.target.value })} placeholder="e.g. Power Ranch, Downtown Gilbert..." />
                    </div>
                  </div>

                  <div className="cp__strategy-row">
                    <div className="cp__strategy-field">
                      <label className="cp__field-label">PROMPT TEMPLATE</label>
                      <select className="cp__select" value={selectedPromptTemplate} onChange={e => setSelectedPromptTemplate(e.target.value)}>
                        <option value="">-- Freeform --</option>
                        {PROMPT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="cp__strategy-field">
                      <label className="cp__field-label">MANYCHAT KEYWORD</label>
                      <input className="cp__input" value={sel.manychatKeyword} onChange={e => updateSlot(selectedDate, selectedSlot, { manychatKeyword: e.target.value })} placeholder="e.g. ARCADIA" />
                    </div>
                  </div>

                  {/* Topic */}
                  <div className="cp__field-group">
                    <label className="cp__field-label">TOPIC</label>
                    <input className="cp__input" value={sel.topic} onChange={e => updateSlot(selectedDate, selectedSlot, { topic: e.target.value })} placeholder="What's this post about?" />
                  </div>

                  {/* Hook */}
                  <div className="cp__field-group">
                    <label className="cp__field-label">YOUR HOOK</label>
                    <textarea className="cp__textarea" value={sel.hook} onChange={e => updateSlot(selectedDate, selectedSlot, { hook: e.target.value })} placeholder="Write or pick a hook below..." rows={2} />
                  </div>

                  <div className="cp__hook-ideas">
                    <div className="cp__hook-ideas-header">
                      <p className="cp__field-label">HOOK IDEAS</p>
                      <button className="cp__ai-suggest-btn" onClick={handleSuggestHooks} disabled={aiHooksLoading}>
                        {aiHooksLoading ? '✦ Thinking...' : '✦ AI Hooks'}
                      </button>
                    </div>
                    <div className="cp__hooks-list">
                      {(aiHooks.length > 0 ? aiHooks : HOOK_IDEAS.filter(h => !selMeta?.niche || h.niche === selMeta.niche || h.niche === 'COMMUNITY').slice(0, 5).map(h => h.text)).map((hookText, i) => (
                        <button key={i} className={`cp__hook-pill ${aiHooks.length > 0 ? 'cp__hook-pill--ai' : ''}`} onClick={() => updateSlot(selectedDate, selectedSlot, { hook: hookText })}>
                          {hookText}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI + Caption */}
                  <div className="cp__field-group">
                    <label className="cp__field-label">CAPTION</label>
                    <div className="cp__ai-write-box">
                      <div className="cp__ai-write-label">✦ Write with Claude</div>
                      <div className="cp__ai-write-row">
                        <input className="cp__ai-write-input" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Describe what you want (or leave blank to use hook + topic)..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleGenerateCaption())} />
                        <button className="cp__ai-write-btn" onClick={handleGenerateCaption} disabled={aiLoading}>
                          {aiLoading ? '✦ Writing...' : '✦ Generate'}
                        </button>
                      </div>
                    </div>
                    <textarea className="cp__textarea cp__textarea--lg" value={sel.caption} onChange={e => updateSlot(selectedDate, selectedSlot, { caption: e.target.value })} placeholder="Your caption will appear here..." rows={5} />
                  </div>

                  {/* Hashtags */}
                  <div className="cp__field-group">
                    <label className="cp__field-label">HASHTAGS</label>
                    <textarea className="cp__textarea" value={sel.hashtags} onChange={e => updateSlot(selectedDate, selectedSlot, { hashtags: e.target.value })} placeholder="#realestate #gilbertaz #eastvalley #justlisted..." rows={2} />
                  </div>

                  {/* Link / Canva */}
                  <div className="cp__strategy-row">
                    <div className="cp__strategy-field">
                      <label className="cp__field-label">LINK</label>
                      <input className="cp__input" value={sel.link} onChange={e => updateSlot(selectedDate, selectedSlot, { link: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="cp__strategy-field">
                      <label className="cp__field-label">CANVA LINK</label>
                      <input className="cp__input" value={sel.canvaLink} onChange={e => updateSlot(selectedDate, selectedSlot, { canvaLink: e.target.value })} placeholder="https://canva.com/design/..." />
                    </div>
                  </div>

                  <div className="cp__field-group">
                    <label className="cp__field-label">NOTES</label>
                    <textarea className="cp__textarea" value={sel.notes} onChange={e => updateSlot(selectedDate, selectedSlot, { notes: e.target.value })} placeholder="Additional notes..." rows={2} />
                  </div>

                  {/* Copy + Actions */}
                  <div className="cp__detail-actions">
                    <button
                      className={`cp__copy-btn${copiedId === 'main' ? ' cp__copy-btn--copied' : ''}`}
                      onClick={() => handleCopy(buildCopyText(sel), 'main')}
                    >
                      {copiedId === 'main' ? '✓ Copied!' : '📋 Copy Full Caption'}
                    </button>
                    <Button size="sm" variant="accent" onClick={() => setActiveTab('repurpose')}>
                      Repurpose to Other Platforms &#8250;
                    </Button>
                  </div>
                </>
              )}

              {/* ─── REPURPOSE TAB ─── */}
              {activeTab === 'repurpose' && (
                <>
                  <p className="cp__repurpose-intro">
                    Select platforms to repurpose your IG {SLOT_TYPES.find(s => s.id === selectedSlot)?.label} content. Each gets a tailored caption, hashtags, SEO, and links.
                  </p>

                  {/* Platform toggle chips */}
                  <div className="cp__platform-chips">
                    {PLATFORMS.filter(p => p.id !== 'instagram').map(p => {
                      const isOn = repurposedPlatforms.includes(p.id)
                      return (
                        <button
                          key={p.id}
                          className={`cp__platform-chip${isOn ? ' cp__platform-chip--on' : ''}`}
                          onClick={() => toggleRepurposePlatform(selectedDate, selectedSlot, p.id)}
                        >
                          <span>{p.icon}</span>
                          <span>{p.label}</span>
                          {isOn && <span className="cp__platform-chip-check">&#10003;</span>}
                        </button>
                      )
                    })}
                  </div>

                  {/* Platform detail tabs */}
                  {repurposedPlatforms.length > 0 && (
                    <>
                      <div className="cp__rp-tabs">
                        {repurposedPlatforms.map(pid => {
                          const p = PLATFORMS.find(pl => pl.id === pid)
                          return (
                            <button
                              key={pid}
                              className={`cp__rp-tab${activePlatform === pid ? ' cp__rp-tab--active' : ''}`}
                              onClick={() => setActivePlatform(pid)}
                            >
                              {p?.icon} {p?.label}
                            </button>
                          )
                        })}
                      </div>

                      {activePlatform && (() => {
                        const p = PLATFORMS.find(pl => pl.id === activePlatform)
                        const rpData = sel.repurpose?.[activePlatform] || {}
                        return (
                          <div className="cp__rp-detail">
                            <div className="cp__rp-detail-header">
                              <h4 className="cp__rp-detail-title">{p?.icon} {p?.label}</h4>
                              <button
                                className="cp__ai-suggest-btn"
                                onClick={() => handleRepurpose(activePlatform)}
                                disabled={aiRepurposeLoading || !sel.caption}
                              >
                                {aiRepurposeLoading ? '✦ Repurposing...' : '✦ AI: Auto-Repurpose'}
                              </button>
                            </div>

                            <div className="cp__field-group">
                              <label className="cp__field-label">{p?.label.toUpperCase()} CAPTION</label>
                              <textarea
                                className="cp__textarea cp__textarea--lg"
                                value={rpData.caption || ''}
                                onChange={e => updateRepurpose(selectedDate, selectedSlot, activePlatform, { caption: e.target.value })}
                                placeholder={`Tailored caption for ${p?.label}...`}
                                rows={5}
                              />
                            </div>

                            {p?.hasHashtags && (
                              <div className="cp__field-group">
                                <label className="cp__field-label">HASHTAGS</label>
                                <textarea
                                  className="cp__textarea"
                                  value={rpData.hashtags || ''}
                                  onChange={e => updateRepurpose(selectedDate, selectedSlot, activePlatform, { hashtags: e.target.value })}
                                  placeholder={`#hashtags for ${p?.label}...`}
                                  rows={2}
                                />
                              </div>
                            )}

                            {p?.hasSeo && (
                              <div className="cp__field-group">
                                <label className="cp__field-label">SEO KEYWORDS</label>
                                <input
                                  className="cp__input"
                                  value={rpData.keywords || ''}
                                  onChange={e => updateRepurpose(selectedDate, selectedSlot, activePlatform, { keywords: e.target.value })}
                                  placeholder="real estate gilbert az, homes for sale east valley..."
                                />
                              </div>
                            )}

                            <div className="cp__field-group">
                              <label className="cp__field-label">CALL TO ACTION</label>
                              <input
                                className="cp__input"
                                value={rpData.cta || ''}
                                onChange={e => updateRepurpose(selectedDate, selectedSlot, activePlatform, { cta: e.target.value })}
                                placeholder="e.g. DM me 'HOMES' for a free consultation..."
                              />
                            </div>

                            {p?.hasLink && (
                              <div className="cp__field-group">
                                <label className="cp__field-label">LINK</label>
                                <input
                                  className="cp__input"
                                  value={rpData.link || ''}
                                  onChange={e => updateRepurpose(selectedDate, selectedSlot, activePlatform, { link: e.target.value })}
                                  placeholder="https://..."
                                />
                              </div>
                            )}

                            <div className="cp__detail-actions">
                              <button
                                className={`cp__copy-btn${copiedId === activePlatform ? ' cp__copy-btn--copied' : ''}`}
                                onClick={() => handleCopy(buildCopyText(sel, activePlatform), activePlatform)}
                              >
                                {copiedId === activePlatform ? '✓ Copied!' : `📋 Copy ${p?.label} Caption`}
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )}

                  {repurposedPlatforms.length === 0 && (
                    <p className="cp__repurpose-empty">Select platforms above to start repurposing your content.</p>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="cp__detail-empty">
              <p>👈 Select a day to start planning</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="cp__right-col">
          <div className="cp__inspo">
            <h4 className="cp__section-title">INSPO BANK</h4>
            <p className="cp__section-sub">Screenshots of posts that performed well</p>
            <div className="cp__inspo-grid">
              {inspoBank.map(item => (
                <div key={item.id} className="cp__inspo-item">
                  <img src={item.imageUrl} alt="" />
                  <button className="cp__inspo-remove" onClick={() => removeInspo(item.id)}>x</button>
                </div>
              ))}
              <label className="cp__inspo-upload">
                <span>📲</span>
                <span>Drop inspo screenshots here</span>
                <input type="file" accept="image/*" onChange={handleInspoUpload} hidden />
              </label>
            </div>
          </div>

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

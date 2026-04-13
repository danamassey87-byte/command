import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatCard, Badge, Button, SlidePanel, Input, Select, Textarea } from '../../components/ui/index.jsx'
import { useContentPillars, useContentPieces, useClientAvatars } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './ContentDashboard.css'

/* ─── Pre-defined pillar templates from the $25M Instagram Framework ─── */
const PILLAR_TEMPLATES = {
  authority: {
    name: 'Authority',
    description: 'Position yourself as the go-to expert in real estate',
    color: '#8B6F5C',
    topics: [
      'Market updates', 'Buyer tips', 'Seller strategies', 'Real estate FAQs',
      'Financing insights', 'Process breakdowns', 'Myth busting', 'Case studies',
      'Step-by-step tutorials', 'Industry trends',
    ],
  },
  lifestyle: {
    name: 'Lifestyle',
    description: 'Show the human side — your interests, routines, and passions',
    color: '#A3B18A',
    topics: [
      'Day in the life', 'Hobbies/fitness', 'Travel/adventures', 'Home design inspo',
      'Healthy eats', 'Sports/outdoors', 'Weekend fun', 'Home projects',
      'Self-care habits', 'Seasonal activities',
    ],
  },
  local: {
    name: 'Local',
    description: 'Highlight your market area — become the neighborhood expert',
    color: '#5B8FA8',
    topics: [
      'Neighborhood tours', 'Local business shoutouts', 'Community events',
      'Local hotspots', 'Farmers markets', 'Local charities', 'Local schools',
      'Restaurant reviews', 'Neighborhood history', 'City growth news',
    ],
  },
  personal: {
    name: 'Personal',
    description: 'Build connection through authenticity and relatability',
    color: '#C4956A',
    topics: [
      'Family/pets moments', 'Behind the scenes', 'Morning routine',
      'Wins & challenges', 'Client stories', 'Personal milestones',
      'Favorite books/podcasts', 'Holiday traditions', 'Throwback stories',
      'Lessons learned',
    ],
  },
  education: {
    name: 'Education',
    description: 'Teach your audience and simplify the buying/selling process',
    color: '#9B72AA',
    topics: [
      'First-time buyer guide', 'Closing costs explained', 'Home inspection tips',
      'Credit score basics', 'HOA pros & cons', 'Investment property 101',
      'Appraisal vs market value', 'Negotiation strategies', 'Moving checklist',
      'Mortgage types explained',
    ],
  },
  social_proof: {
    name: 'Social Proof',
    description: 'Showcase results, reviews, and wins to build trust',
    color: '#D4A574',
    topics: [
      'Client testimonials', 'Just sold celebrations', 'Before & after staging',
      'Offer accepted stories', 'Google/Zillow reviews', 'Year-in-review stats',
      'Awards & recognition', 'Referral shoutouts', 'Closing day photos',
      'Client anniversary check-ins',
    ],
  },
}

/* ─── Avatar form constants ─── */
const AVATAR_AGE_RANGES    = ['18-25', '26-34', '35-44', '45-54', '55-64', '65+']
const AVATAR_INCOME_RANGES = ['Under $50K', '$50K-$75K', '$75K-$100K', '$100K-$150K', '$150K-$250K', '$250K+']
const AVATAR_FAMILY_STATUS = ['Single', 'Couple (no kids)', 'Young Family', 'Growing Family', 'Empty Nesters', 'Retirees']
const AVATAR_PROP_TYPES    = ['Single Family', 'Townhome', 'Condo', 'Multi-Family', 'Land/Lot', 'New Build']
const BUYER_MOTIVATIONS    = ['First-Time Buyer', 'Upgrading', 'Downsizing', 'Relocating', 'Investing', 'Second Home']
const SELLER_MOTIVATIONS   = ['Upgrading', 'Downsizing', 'Relocating', 'Divorce', 'Estate/Probate', 'Investment Sale', 'Retirement']
const ONLINE_PLATFORMS     = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Zillow', 'Realtor.com', 'Nextdoor', 'Google', 'Email']

/* ─── Pre-stored prompt templates for AI content generation ─── */
const PROMPT_TEMPLATES = [
  { id: 'just_listed',      label: 'Just Listed',              pillar: 'Authority',     prompt: 'Write an engaging social media post announcing a new listing. Highlight the best features, create urgency, and include a call to action. Make it feel exciting but professional.' },
  { id: 'just_sold',        label: 'Just Sold',                pillar: 'Social Proof',  prompt: 'Write a celebratory post about a recently sold property. Thank the clients, highlight any challenges overcome, and subtly encourage other potential sellers to reach out.' },
  { id: 'market_update',    label: 'Market Update',            pillar: 'Authority',     prompt: 'Write a concise market update post that breaks down current trends in simple terms. Include actionable takeaways for buyers and sellers. Keep it informative but approachable.' },
  { id: 'buyer_tip',        label: 'Buyer Tip',                pillar: 'Education',     prompt: 'Write a helpful tip post for home buyers. Break down a common misconception or share insider knowledge. Make it feel like friendly advice from a trusted expert.' },
  { id: 'seller_tip',       label: 'Seller Tip',               pillar: 'Education',     prompt: 'Write a practical tip for home sellers. Focus on maximizing value, preparing for showings, or navigating the selling process. Keep it actionable and encouraging.' },
  { id: 'neighborhood',     label: 'Neighborhood Spotlight',   pillar: 'Local',         prompt: 'Write a post highlighting what makes a specific neighborhood special. Cover the vibe, amenities, schools, dining, and who it is best for. Paint a picture of the lifestyle.' },
  { id: 'local_business',   label: 'Local Business Shoutout',  pillar: 'Local',         prompt: 'Write a warm shoutout post for a local business. Highlight what makes them special, why you love them, and encourage your audience to check them out. Keep it genuine.' },
  { id: 'behind_scenes',    label: 'Behind the Scenes',        pillar: 'Personal',      prompt: 'Write a relatable behind-the-scenes post about a day in your life as a real estate agent. Show the real work, the hustle, and the rewarding moments. Be authentic.' },
  { id: 'client_story',     label: 'Client Success Story',     pillar: 'Social Proof',  prompt: 'Write a story post about helping a client find their perfect home or sell their property. Focus on the journey, the emotions, and the happy ending. Make it inspiring.' },
  { id: 'myth_buster',      label: 'Myth Buster',              pillar: 'Authority',     prompt: 'Write a post that busts a common real estate myth. Start with the myth, explain the reality, and provide your expert take. Make it feel eye-opening.' },
  { id: 'community_event',  label: 'Community Event',          pillar: 'Local',         prompt: 'Write an enthusiastic post promoting a local community event. Include what, when, where, and why your audience should attend. Make it feel like a personal invitation.' },
  { id: 'personal_story',   label: 'Personal Milestone',       pillar: 'Personal',      prompt: 'Write a personal milestone post — could be a work anniversary, goal reached, or life moment. Be genuine, grateful, and connect it back to why you love what you do.' },
  { id: 'open_house',       label: 'Open House Invite',        pillar: 'Authority',     prompt: 'Write an inviting open house announcement. Create excitement about the property, highlight key features, and make people want to come see it in person.' },
  { id: 'home_inspo',       label: 'Home Design Inspo',        pillar: 'Lifestyle',     prompt: 'Write a post sharing home design inspiration or a trending interior style. Give tips on how to achieve the look. Make it aspirational yet achievable.' },
  { id: 'weekend_guide',    label: 'Weekend Guide',            pillar: 'Local',         prompt: 'Write a fun weekend guide post for your local area. Include a mix of activities — outdoor, dining, family-friendly, and date night options. Make it feel curated.' },
]

/* ─── Local content bank storage (neighborhoods, businesses, cities) ─── */
const LOCAL_STORAGE_KEY = 'content_local_bank'
function loadLocalBank() {
  try { return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || { neighborhoods: [], businesses: [], cities: [] } }
  catch { return { neighborhoods: [], businesses: [], cities: [] } }
}
function saveLocalBank(data) { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)) }

/* ─── ManyChat keyword library ─── */
const MANYCHAT_STORAGE_KEY = 'manychat_keywords'
function loadKeywords() {
  try { return JSON.parse(localStorage.getItem(MANYCHAT_STORAGE_KEY)) || [] }
  catch { return [] }
}
function saveKeywords(data) { localStorage.setItem(MANYCHAT_STORAGE_KEY, JSON.stringify(data)) }

function DashCard({ title, children, className = '', action }) {
  return (
    <div className={`sd-card ${className}`}>
      <div className="sd-card__header">
        <h3 className="sd-card__title">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ContentDashboard() {
  const now = new Date()
  const yr = now.getFullYear()
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const fromDate = `${yr}-${mo}-01`
  const toDate = `${yr}-${mo}-${new Date(yr, now.getMonth() + 1, 0).getDate()}`

  const { data: pillars, loading, refetch: refetchPillars } = useContentPillars()
  const { data: pieces } = useContentPieces(fromDate, toDate)
  const { data: avatars, refetch: refetchAvatars } = useClientAvatars()

  // Pillar panel state
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState('menu') // 'menu' | 'template' | 'custom' | 'edit'
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ name: '', description: '', color: '#b79782', topics: [] })
  const [saving, setSaving] = useState(false)
  const [topicInput, setTopicInput] = useState('')

  // Avatar panel state
  const [avatarPanelOpen, setAvatarPanelOpen] = useState(false)
  const [editingAvatar, setEditingAvatar] = useState(null)
  const [avatarDraft, setAvatarDraft] = useState({})
  const [avatarSaving, setAvatarSaving] = useState(false)

  // Local content bank state
  const [localBank, setLocalBank] = useState(loadLocalBank)
  const [localInput, setLocalInput] = useState('')
  const [localCategory, setLocalCategory] = useState('neighborhoods')

  // Prompt templates panel
  const [promptPanelOpen, setPromptPanelOpen] = useState(false)

  // ManyChat keyword library
  const [keywords, setKeywords] = useState(loadKeywords)
  const [kwInput, setKwInput] = useState('')
  const [kwDesc, setKwDesc] = useState('')
  const [kwLinkedTo, setKwLinkedTo] = useState('')

  const p = pillars ?? []
  const pc = pieces ?? []

  // Stats
  const published = pc.filter(x => x.status === 'published')
  const scheduled = pc.filter(x => x.status === 'scheduled')
  const draftPieces = pc.filter(x => x.status === 'draft')

  // Platform breakdown
  const platformMap = {}
  pc.forEach(x => {
    (x.platform_posts ?? []).forEach(pp => {
      platformMap[pp.platform] = (platformMap[pp.platform] || 0) + 1
    })
  })
  const platforms = Object.entries(platformMap).sort((a, b) => b[1] - a[1])
  const maxPlatform = platforms[0]?.[1] || 1

  // Upcoming content (next 7 days)
  const in7 = new Date(now); in7.setDate(now.getDate() + 7)
  const upcoming = pc.filter(x => {
    if (!x.content_date) return false
    const d = new Date(x.content_date)
    return d >= now && d <= in7
  }).sort((a, b) => new Date(a.content_date) - new Date(b.content_date)).slice(0, 5)

  // Pillar usage
  const pillarUsage = {}
  pc.forEach(x => {
    const pId = x.pillar_id
    if (pId) pillarUsage[pId] = (pillarUsage[pId] || 0) + 1
  })

  // Which templates are already added (by name match)
  const existingNames = new Set(p.map(x => x.name.toLowerCase()))
  const availableTemplates = Object.entries(PILLAR_TEMPLATES).filter(
    ([, tpl]) => !existingNames.has(tpl.name.toLowerCase())
  )

  /* ─── Panel helpers ─── */
  function openAddMenu() {
    setPanelMode('menu')
    setEditing(null)
    setDraft({ name: '', description: '', color: '#b79782', topics: [] })
    setTopicInput('')
    setPanelOpen(true)
  }

  function selectTemplate(key) {
    const tpl = PILLAR_TEMPLATES[key]
    setDraft({ name: tpl.name, description: tpl.description, color: tpl.color, topics: [...tpl.topics] })
    setPanelMode('template')
  }

  function openCustom() {
    setDraft({ name: '', description: '', color: '#b79782', topics: [] })
    setTopicInput('')
    setPanelMode('custom')
  }

  function openEdit(pillar) {
    setEditing(pillar)
    setDraft({ name: pillar.name, description: pillar.description ?? '', color: pillar.color, topics: pillar.topics ?? [] })
    setTopicInput('')
    setPanelMode('edit')
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
        await DB.createContentPillar({ ...draft, sort_order: p.length })
      }
      await refetchPillars()
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
    await refetchPillars()
    setPanelOpen(false)
  }

  /* ─── Avatar helpers ─── */
  const avatarList = avatars ?? []
  const buyerAvatars  = avatarList.filter(a => a.type === 'buyer')
  const sellerAvatars = avatarList.filter(a => a.type === 'seller')

  function openNewAvatar(type) {
    setEditingAvatar(null)
    setAvatarDraft({
      type, name: '', age_range: '', income_range: '', family_status: '',
      motivation: '', property_type: '', price_range_min: '', price_range_max: '',
      locations: [], pain_points: '', online_platforms: [], content_resonates: '', notes: '',
    })
    setAvatarPanelOpen(true)
  }

  function openEditAvatar(a) {
    setEditingAvatar(a)
    setAvatarDraft({
      type: a.type, name: a.name ?? '', age_range: a.age_range ?? '',
      income_range: a.income_range ?? '', family_status: a.family_status ?? '',
      motivation: a.motivation ?? '', property_type: a.property_type ?? '',
      price_range_min: a.price_range_min ?? '', price_range_max: a.price_range_max ?? '',
      locations: a.locations ?? [], pain_points: a.pain_points ?? '',
      online_platforms: a.online_platforms ?? [], content_resonates: a.content_resonates ?? '',
      notes: a.notes ?? '',
    })
    setAvatarPanelOpen(true)
  }

  function setAv(k, v) { setAvatarDraft(d => ({ ...d, [k]: v })) }
  function toggleAvatarPlatform(plat) {
    setAvatarDraft(d => ({
      ...d,
      online_platforms: d.online_platforms.includes(plat)
        ? d.online_platforms.filter(x => x !== plat)
        : [...d.online_platforms, plat],
    }))
  }

  async function handleSaveAvatar(e) {
    e.preventDefault()
    if (!avatarDraft.name.trim()) return
    setAvatarSaving(true)
    try {
      const payload = {
        ...avatarDraft,
        price_range_min: avatarDraft.price_range_min ? Number(avatarDraft.price_range_min) : null,
        price_range_max: avatarDraft.price_range_max ? Number(avatarDraft.price_range_max) : null,
        locations: typeof avatarDraft.locations === 'string'
          ? avatarDraft.locations.split(',').map(s => s.trim()).filter(Boolean)
          : avatarDraft.locations,
      }
      if (editingAvatar) {
        await DB.updateClientAvatar(editingAvatar.id, payload)
      } else {
        await DB.createClientAvatar(payload)
      }
      await refetchAvatars()
      setAvatarPanelOpen(false)
    } catch (err) {
      alert(err.message)
    } finally {
      setAvatarSaving(false)
    }
  }

  async function handleDeleteAvatar() {
    if (!editingAvatar || !confirm('Delete this avatar?')) return
    await DB.deleteClientAvatar(editingAvatar.id)
    await refetchAvatars()
    setAvatarPanelOpen(false)
  }

  const avatarMotivations = avatarDraft.type === 'seller' ? SELLER_MOTIVATIONS : BUYER_MOTIVATIONS

  /* ─── Local content bank helpers ─── */
  function addLocalItem() {
    const val = localInput.trim()
    if (!val || localBank[localCategory]?.includes(val)) return
    const updated = { ...localBank, [localCategory]: [...(localBank[localCategory] || []), val] }
    setLocalBank(updated)
    saveLocalBank(updated)
    setLocalInput('')
  }

  function removeLocalItem(cat, idx) {
    const updated = { ...localBank, [cat]: localBank[cat].filter((_, i) => i !== idx) }
    setLocalBank(updated)
    saveLocalBank(updated)
  }

  /* ─── ManyChat keyword helpers ─── */
  function addKeyword() {
    const kw = kwInput.trim().toUpperCase()
    if (!kw || keywords.some(k => k.keyword === kw)) return
    const updated = [...keywords, { keyword: kw, description: kwDesc.trim(), linkedTo: kwLinkedTo.trim(), createdAt: new Date().toISOString() }]
    setKeywords(updated)
    saveKeywords(updated)
    setKwInput('')
    setKwDesc('')
    setKwLinkedTo('')
  }

  function removeKeyword(idx) {
    const updated = keywords.filter((_, i) => i !== idx)
    setKeywords(updated)
    saveKeywords(updated)
  }

  if (loading) return <div className="section-dash"><div className="sd-loading">Loading content data...</div></div>

  return (
    <div className="section-dash content-dash">

      <div className="section-dash__kpis">
        <StatCard label="Content Pillars" value={p.length} accent />
        <StatCard label="Published This Month" value={published.length} />
        <StatCard label="Scheduled" value={scheduled.length} />
        <StatCard label="Drafts" value={draftPieces.length} />
        <StatCard label="Total This Month" value={pc.length} />
      </div>

      {/* ─── Content Pillars (full management) ─── */}
      <DashCard
        title="Content Pillars"
        className="ct-pillars-card"
        action={<Button size="sm" onClick={openAddMenu}>+ Add Pillar</Button>}
      >
        <p className="ct-pillars-intro">
          Your content pillars are the backbone of your feed. These recurring themes create familiarity
          and trust while keeping you consistent.
        </p>
        {p.length > 0 ? (
          <div className="ct-pillars-grid">
            {p.map(pillar => {
              const count = pillarUsage[pillar.id] || 0
              const topics = pillar.topics ?? []
              return (
                <div key={pillar.id} className="ct-pillar-card" style={{ borderLeftColor: pillar.color }}>
                  <div className="ct-pillar-card__top">
                    <div className="ct-pillar-card__left">
                      <span className="ct-pillar-card__swatch" style={{ background: pillar.color }} />
                      <div>
                        <span className="ct-pillar-card__name">{pillar.name}</span>
                        {pillar.description && <span className="ct-pillar-card__desc">{pillar.description}</span>}
                      </div>
                    </div>
                    <div className="ct-pillar-card__right">
                      <Badge variant="accent" size="sm">{count} piece{count !== 1 ? 's' : ''}</Badge>
                      <button className="ct-pillar-card__edit" onClick={() => openEdit(pillar)}>Edit</button>
                    </div>
                  </div>
                  {topics.length > 0 && (
                    <div className="ct-pillar-card__topics">
                      {topics.map((t, i) => (
                        <span key={i} className="ct-pillar-card__topic" style={{ borderColor: pillar.color + '44' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="ct-empty-pillars">
            <p className="sd-empty">No content pillars set up yet</p>
            <p className="ct-empty-hint">Click "+ Add Pillar" to get started with pre-built templates or create your own.</p>
          </div>
        )}
      </DashCard>

      <div className="sd-row sd-row--50-50">
        <DashCard title="Platform Breakdown">
          {platforms.length > 0 ? (
            <div className="ct-platforms">
              {platforms.map(([platform, count]) => (
                <div key={platform} className="ct-platform-row">
                  <span className="ct-platform-row__label">{platform}</span>
                  <div className="ct-platform-row__track">
                    <div className="ct-platform-row__fill" style={{ width: `${Math.round(count / maxPlatform * 100)}%` }} />
                  </div>
                  <span className="ct-platform-row__count">{count}</span>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No platform data this month</p>}
        </DashCard>

        <DashCard title="Upcoming This Week">
          {upcoming.length > 0 ? (
            <div className="ct-upcoming">
              {upcoming.map(x => (
                <div key={x.id} className="ct-upcoming-row">
                  <div className="ct-upcoming-row__left">
                    <span className="ct-upcoming-row__title">{x.title || 'Untitled'}</span>
                    <span className="ct-upcoming-row__date">{fmtDate(x.content_date)}</span>
                  </div>
                  <Badge variant={x.status === 'published' ? 'success' : x.status === 'scheduled' ? 'info' : 'warning'} size="sm">{x.status}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">Nothing scheduled this week</p>}
        </DashCard>
      </div>

      <div className="sd-row sd-row--50-50">
        <DashCard title="Monthly Overview">
          <div className="ct-monthly">
            <div className="ct-monthly__stat ct-monthly__stat--published">
              <span className="ct-monthly__val">{published.length}</span>
              <span className="ct-monthly__label">Published</span>
            </div>
            <div className="ct-monthly__stat ct-monthly__stat--scheduled">
              <span className="ct-monthly__val">{scheduled.length}</span>
              <span className="ct-monthly__label">Scheduled</span>
            </div>
            <div className="ct-monthly__stat ct-monthly__stat--draft">
              <span className="ct-monthly__val">{draftPieces.length}</span>
              <span className="ct-monthly__label">Drafts</span>
            </div>
          </div>
        </DashCard>

        <DashCard title="Quick Links">
          <div className="ct-quick-links-row">
            <Link to="/content/calendar" className="ct-quick-link ct-quick-link--compact">
              <span className="ct-quick-link__icon">📅</span>
              <span>Calendar</span>
            </Link>
            <Link to="/content/social" className="ct-quick-link ct-quick-link--compact">
              <span className="ct-quick-link__icon">📱</span>
              <span>Social</span>
            </Link>
            <Link to="/content/ai-studio" className="ct-quick-link ct-quick-link--compact">
              <span className="ct-quick-link__icon">⚡</span>
              <span>Content Studio</span>
            </Link>
            <Link to="/content/composer" className="ct-quick-link ct-quick-link--compact">
              <span className="ct-quick-link__icon">🚀</span>
              <span>Composer</span>
            </Link>
            <Link to="/content/hashtags" className="ct-quick-link ct-quick-link--compact">
              <span className="ct-quick-link__icon">#</span>
              <span>Hashtags</span>
            </Link>
            <Link to="/content/seo" className="ct-quick-link ct-quick-link--compact">
              <span className="ct-quick-link__icon">🔍</span>
              <span>SEO/AEO</span>
            </Link>
            <Link to="/content/inspo" className="ct-quick-link ct-quick-link--compact">
              <span className="ct-quick-link__icon">✨</span>
              <span>Inspo</span>
            </Link>
            <Link to="/content/gamma" className="ct-quick-link ct-quick-link--compact">
              <span className="ct-quick-link__icon">🎯</span>
              <span>Gamma</span>
            </Link>
          </div>
        </DashCard>
      </div>

      {/* ─── Add / Edit Pillar Panel ─── */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={panelMode === 'menu' ? 'Add Content Pillar' : panelMode === 'edit' ? 'Edit Pillar' : panelMode === 'template' ? `Add: ${draft.name}` : 'Custom Pillar'}
      >
        {/* ─── Menu: choose template or custom ─── */}
        {panelMode === 'menu' && (
          <div className="ct-add-menu">
            <p className="ct-add-menu__intro">Choose a pre-built template or create your own from scratch.</p>

            {availableTemplates.length > 0 && (
              <div className="ct-template-section">
                <h4 className="ct-template-section__title">Pre-built Templates</h4>
                <div className="ct-template-list">
                  {availableTemplates.map(([key, tpl]) => (
                    <button
                      key={key}
                      className="ct-template-option"
                      onClick={() => selectTemplate(key)}
                    >
                      <span className="ct-template-option__swatch" style={{ background: tpl.color }} />
                      <div className="ct-template-option__body">
                        <span className="ct-template-option__name">{tpl.name}</span>
                        <span className="ct-template-option__desc">{tpl.description}</span>
                        <span className="ct-template-option__count">{tpl.topics.length} topics included</span>
                      </div>
                      <span className="ct-template-option__arrow">&#8250;</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableTemplates.length === 0 && (
              <p className="ct-add-menu__all-added">All pre-built templates have been added.</p>
            )}

            <div className="ct-template-section">
              <h4 className="ct-template-section__title">Or Start from Scratch</h4>
              <button className="ct-template-option ct-template-option--custom" onClick={openCustom}>
                <span className="ct-template-option__swatch ct-template-option__swatch--custom">+</span>
                <div className="ct-template-option__body">
                  <span className="ct-template-option__name">Custom Pillar</span>
                  <span className="ct-template-option__desc">Create your own pillar with custom name, color, and topics</span>
                </div>
                <span className="ct-template-option__arrow">&#8250;</span>
              </button>
            </div>
          </div>
        )}

        {/* ─── Template preview / Custom form / Edit form ─── */}
        {(panelMode === 'template' || panelMode === 'custom' || panelMode === 'edit') && (
          <form className="cc-form" onSubmit={handleSave}>
            {panelMode !== 'edit' && (
              <button type="button" className="ct-back-btn" onClick={() => setPanelMode('menu')}>
                &#8249; Back to templates
              </button>
            )}

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
              {panelMode === 'edit' && editing && (
                <button type="button" className="cc-del-btn" onClick={() => handleDelete(editing.id)}>Delete</button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : panelMode === 'edit' ? 'Update Pillar' : 'Add Pillar'}
              </Button>
            </div>
          </form>
        )}
      </SlidePanel>

      {/* ─── Ideal Client Avatars ─── */}
      <DashCard
        title={`Ideal Client Avatars (${avatarList.length})`}
        className="ct-avatars-card"
        action={
          <div className="ct-avatar-actions">
            <Button size="sm" onClick={() => openNewAvatar('buyer')}>+ Buyer</Button>
            <Button size="sm" variant="ghost" onClick={() => openNewAvatar('seller')}>+ Seller</Button>
          </div>
        }
      >
        <p className="ct-pillars-intro">
          Define your ideal client profiles to guide content strategy. When you create content, choose which avatar you're speaking to so messaging stays aligned.
        </p>
        {avatarList.length > 0 ? (
          <div className="ct-avatar-sections">
            {buyerAvatars.length > 0 && (
              <div className="ct-avatar-group">
                <h4 className="ct-avatar-group__title">Buyer Avatars</h4>
                <div className="ct-avatar-grid">
                  {buyerAvatars.map(a => (
                    <div key={a.id} className="ct-avatar-card" onClick={() => openEditAvatar(a)}>
                      <div className="ct-avatar-card__icon">🏠</div>
                      <div className="ct-avatar-card__body">
                        <span className="ct-avatar-card__name">{a.name}</span>
                        <span className="ct-avatar-card__meta">
                          {[a.age_range, a.family_status, a.motivation].filter(Boolean).join(' · ') || 'Click to edit'}
                        </span>
                      </div>
                      {a.property_type && <span className="ct-avatar-card__tag">{a.property_type}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {sellerAvatars.length > 0 && (
              <div className="ct-avatar-group">
                <h4 className="ct-avatar-group__title">Seller Avatars</h4>
                <div className="ct-avatar-grid">
                  {sellerAvatars.map(a => (
                    <div key={a.id} className="ct-avatar-card" onClick={() => openEditAvatar(a)}>
                      <div className="ct-avatar-card__icon">📋</div>
                      <div className="ct-avatar-card__body">
                        <span className="ct-avatar-card__name">{a.name}</span>
                        <span className="ct-avatar-card__meta">
                          {[a.age_range, a.family_status, a.motivation].filter(Boolean).join(' · ') || 'Click to edit'}
                        </span>
                      </div>
                      {a.property_type && <span className="ct-avatar-card__tag">{a.property_type}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="ct-empty-pillars">
            <p className="sd-empty">No client avatars defined yet</p>
            <p className="ct-empty-hint">Add buyer and seller avatars so your content speaks directly to your ideal clients.</p>
          </div>
        )}
      </DashCard>

      {/* ─── Prompt Templates ─── */}
      <DashCard
        title="AI Prompt Templates"
        className="ct-prompts-card"
        action={
          <Button size="sm" variant="ghost" onClick={() => setPromptPanelOpen(true)}>
            View All ({PROMPT_TEMPLATES.length})
          </Button>
        }
      >
        <p className="ct-pillars-intro">
          Pre-stored prompts for quick content generation. Select a template when creating content to get perfectly structured posts.
        </p>
        <div className="ct-prompt-preview">
          {PROMPT_TEMPLATES.slice(0, 6).map(tpl => (
            <div key={tpl.id} className="ct-prompt-chip" onClick={() => setPromptPanelOpen(true)}>
              <span className="ct-prompt-chip__label">{tpl.label}</span>
              <span className="ct-prompt-chip__pillar">{tpl.pillar}</span>
            </div>
          ))}
          {PROMPT_TEMPLATES.length > 6 && (
            <button className="ct-prompt-chip ct-prompt-chip--more" onClick={() => setPromptPanelOpen(true)}>
              +{PROMPT_TEMPLATES.length - 6} more
            </button>
          )}
        </div>
      </DashCard>

      {/* ─── Local Content Bank (Neighborhoods, Businesses, Cities) ─── */}
      <DashCard title="Local Content Bank" className="ct-local-card">
        <p className="ct-pillars-intro">
          Save neighborhoods, businesses, and cities you want to spotlight in your content. These will be available when planning posts.
        </p>
        <div className="ct-local-tabs">
          {[
            { key: 'neighborhoods', label: 'Neighborhoods', icon: '🏘️' },
            { key: 'businesses',    label: 'New Businesses', icon: '🏪' },
            { key: 'cities',        label: 'Cities / Areas', icon: '🌆' },
          ].map(tab => (
            <button
              key={tab.key}
              className={`ct-local-tab${localCategory === tab.key ? ' ct-local-tab--active' : ''}`}
              onClick={() => setLocalCategory(tab.key)}
            >
              <span>{tab.icon}</span> {tab.label} ({localBank[tab.key]?.length || 0})
            </button>
          ))}
        </div>

        <div className="ct-local-add-row">
          <input
            className="cc-topic-input"
            value={localInput}
            onChange={e => setLocalInput(e.target.value)}
            placeholder={
              localCategory === 'neighborhoods' ? 'e.g. Power Ranch, Val Vista Lakes, Agritopia...' :
              localCategory === 'businesses' ? 'e.g. New coffee shop on Gilbert Rd, Brewery opening...' :
              'e.g. Gilbert, Mesa, Chandler, Queen Creek...'
            }
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLocalItem() } }}
          />
          <button type="button" className="cc-topic-add-btn" onClick={addLocalItem}>+</button>
        </div>

        {(localBank[localCategory]?.length || 0) > 0 ? (
          <div className="ct-local-items">
            {localBank[localCategory].map((item, i) => (
              <span key={i} className="ct-local-item">
                {item}
                <button className="cc-topic-remove" onClick={() => removeLocalItem(localCategory, i)}>&times;</button>
              </span>
            ))}
          </div>
        ) : (
          <p className="sd-empty" style={{ marginTop: 'var(--space-md)' }}>
            No {localCategory} added yet. Start building your local content library.
          </p>
        )}
      </DashCard>

      {/* ─── ManyChat Keyword Library ─── */}
      <DashCard title={`ManyChat Keywords (${keywords.length})`} className="ct-kw-card">
        <p className="ct-pillars-intro">
          Track all your ManyChat automation keywords. Link each keyword to a property, open house, or lead gen campaign so you can map engagement stats.
        </p>

        <div className="ct-kw-add">
          <div className="ct-kw-add-row">
            <input
              className="cc-topic-input"
              value={kwInput}
              onChange={e => setKwInput(e.target.value.toUpperCase())}
              placeholder="KEYWORD (e.g. ARCADIA)"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword() } }}
            />
            <input
              className="cc-topic-input"
              value={kwDesc}
              onChange={e => setKwDesc(e.target.value)}
              placeholder="Description (e.g. Gilbert open house)"
            />
            <input
              className="cc-topic-input"
              value={kwLinkedTo}
              onChange={e => setKwLinkedTo(e.target.value)}
              placeholder="Linked to (property, client, campaign...)"
            />
            <button type="button" className="cc-topic-add-btn" onClick={addKeyword}>+</button>
          </div>
        </div>

        {keywords.length > 0 ? (
          <div className="ct-kw-table">
            <div className="ct-kw-header">
              <span>Keyword</span>
              <span>Description</span>
              <span>Linked To</span>
              <span></span>
            </div>
            {keywords.map((kw, i) => (
              <div key={i} className="ct-kw-row">
                <span className="ct-kw-keyword">{kw.keyword}</span>
                <span className="ct-kw-desc">{kw.description || '--'}</span>
                <span className="ct-kw-linked">{kw.linkedTo || '--'}</span>
                <button className="cc-topic-remove" onClick={() => removeKeyword(i)}>&times;</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="sd-empty" style={{ marginTop: 'var(--space-md)' }}>
            No keywords added yet. Add your ManyChat automation keywords to track usage.
          </p>
        )}
      </DashCard>

      {/* ─── Avatar Edit Panel ─── */}
      <SlidePanel
        open={avatarPanelOpen}
        onClose={() => setAvatarPanelOpen(false)}
        title={editingAvatar ? `Edit ${avatarDraft.type === 'buyer' ? 'Buyer' : 'Seller'} Avatar` : `New ${avatarDraft.type === 'buyer' ? 'Buyer' : 'Seller'} Avatar`}
        width={480}
      >
        <form className="cc-form" onSubmit={handleSaveAvatar}>
          <div className="cc-form-field">
            <label className="cc-label">Avatar Name *</label>
            <Input value={avatarDraft.name ?? ''} onChange={e => setAv('name', e.target.value)} placeholder="e.g. First-Time Millennial Buyer" required />
          </div>

          <div className="cc-form-row-2">
            <div className="cc-form-field">
              <label className="cc-label">Age Range</label>
              <Select value={avatarDraft.age_range ?? ''} onChange={e => setAv('age_range', e.target.value)}>
                <option value="">--</option>
                {AVATAR_AGE_RANGES.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div className="cc-form-field">
              <label className="cc-label">Household Income</label>
              <Select value={avatarDraft.income_range ?? ''} onChange={e => setAv('income_range', e.target.value)}>
                <option value="">--</option>
                {AVATAR_INCOME_RANGES.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          <div className="cc-form-row-2">
            <div className="cc-form-field">
              <label className="cc-label">Family Status</label>
              <Select value={avatarDraft.family_status ?? ''} onChange={e => setAv('family_status', e.target.value)}>
                <option value="">--</option>
                {AVATAR_FAMILY_STATUS.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div className="cc-form-field">
              <label className="cc-label">Motivation</label>
              <Select value={avatarDraft.motivation ?? ''} onChange={e => setAv('motivation', e.target.value)}>
                <option value="">--</option>
                {avatarMotivations.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
          </div>

          <div className="cc-form-row-2">
            <div className="cc-form-field">
              <label className="cc-label">Property Type</label>
              <Select value={avatarDraft.property_type ?? ''} onChange={e => setAv('property_type', e.target.value)}>
                <option value="">--</option>
                {AVATAR_PROP_TYPES.map(o => <option key={o}>{o}</option>)}
              </Select>
            </div>
            <div className="cc-form-field">
              <label className="cc-label">Locations</label>
              <Input
                value={Array.isArray(avatarDraft.locations) ? avatarDraft.locations.join(', ') : avatarDraft.locations ?? ''}
                onChange={e => setAv('locations', e.target.value)}
                placeholder="Gilbert, Mesa, Chandler..."
              />
            </div>
          </div>

          <div className="cc-form-row-2">
            <div className="cc-form-field">
              <label className="cc-label">Min Price</label>
              <Input type="number" value={avatarDraft.price_range_min ?? ''} onChange={e => setAv('price_range_min', e.target.value)} placeholder="250000" />
            </div>
            <div className="cc-form-field">
              <label className="cc-label">Max Price</label>
              <Input type="number" value={avatarDraft.price_range_max ?? ''} onChange={e => setAv('price_range_max', e.target.value)} placeholder="500000" />
            </div>
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Pain Points</label>
            <Textarea value={avatarDraft.pain_points ?? ''} onChange={e => setAv('pain_points', e.target.value)} placeholder="What keeps them up at night about buying/selling?" rows={2} />
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Content That Resonates</label>
            <Textarea value={avatarDraft.content_resonates ?? ''} onChange={e => setAv('content_resonates', e.target.value)} placeholder="What type of content would grab their attention?" rows={2} />
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Where They Hang Out Online</label>
            <div className="ct-platform-checks">
              {ONLINE_PLATFORMS.map(plat => (
                <label key={plat} className="ct-platform-check">
                  <input
                    type="checkbox"
                    checked={(avatarDraft.online_platforms ?? []).includes(plat)}
                    onChange={() => toggleAvatarPlatform(plat)}
                  />
                  {plat}
                </label>
              ))}
            </div>
          </div>

          <div className="cc-form-field">
            <label className="cc-label">Notes</label>
            <Textarea value={avatarDraft.notes ?? ''} onChange={e => setAv('notes', e.target.value)} placeholder="Additional notes..." rows={2} />
          </div>

          <div className="cc-form-actions">
            {editingAvatar && (
              <button type="button" className="cc-del-btn" onClick={handleDeleteAvatar}>Delete</button>
            )}
            <Button type="submit" disabled={avatarSaving}>
              {avatarSaving ? 'Saving...' : editingAvatar ? 'Update Avatar' : 'Add Avatar'}
            </Button>
          </div>
        </form>
      </SlidePanel>

      {/* ─── Prompt Templates Panel ─── */}
      <SlidePanel
        open={promptPanelOpen}
        onClose={() => setPromptPanelOpen(false)}
        title="AI Prompt Templates"
        width={520}
      >
        <p className="ct-add-menu__intro">
          These pre-built prompts are available whenever you generate content. They ensure your AI-generated posts stay on-brand and aligned with your pillars.
        </p>
        <div className="ct-prompt-full-list">
          {PROMPT_TEMPLATES.map(tpl => (
            <div key={tpl.id} className="ct-prompt-full-item">
              <div className="ct-prompt-full-item__header">
                <span className="ct-prompt-full-item__label">{tpl.label}</span>
                <span className="ct-prompt-full-item__pillar">{tpl.pillar}</span>
              </div>
              <p className="ct-prompt-full-item__text">{tpl.prompt}</p>
            </div>
          ))}
        </div>
      </SlidePanel>
    </div>
  )
}

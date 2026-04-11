import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import * as DB from '../../lib/supabase'
import {
  useContentPieces, useContentPillars, useOpenHouses, useListings, useProperties,
} from '../../lib/hooks'
import { SlidePanel, Input, Select } from '../../components/ui'
import { ChannelIcon, channelMeta, CHANNEL_META } from './channelIcons'
import './ContentCalendar.css'

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function toISO(date)      { return date.toISOString().slice(0, 10) }
function fmtDay(date)     { return date.toLocaleDateString('en-US', { weekday: 'short' }) }
function fmtLong(date)    { return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function fmtMonthYear(date) { return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ContentCalendar() {
  const [tab, setTab]             = useState('calendar') // 'calendar' | 'stats'
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [rangeMode, setRangeMode] = useState('week')     // 'week' | 'month' (stats tab)
  const [selected, setSelected]   = useState(null)       // selected content piece
  const [dragOverDay, setDragOverDay] = useState(null)
  const [syncing, setSyncing]     = useState(false)
  const [syncResult, setSyncResult] = useState(null)     // { matched, created_at, platforms }

  // Range boundaries
  const weekEnd = addDays(weekStart, 6)
  const statsStart = useMemo(() => {
    if (rangeMode === 'week') return weekStart
    const d = new Date(weekStart); d.setDate(1); d.setHours(0,0,0,0)
    return d
  }, [weekStart, rangeMode])
  const statsEnd = useMemo(() => {
    if (rangeMode === 'week') return weekEnd
    const d = new Date(statsStart); d.setMonth(d.getMonth() + 1); d.setDate(0)
    return d
  }, [statsStart, rangeMode, weekEnd])

  const fetchFrom = tab === 'stats' ? toISO(statsStart) : toISO(weekStart)
  const fetchTo   = tab === 'stats' ? toISO(statsEnd)   : toISO(weekEnd)

  const { data: pieces,     refetch: refetchPieces } = useContentPieces(fetchFrom, fetchTo)
  const { data: pillars }                            = useContentPillars()
  const { data: openHouses }                         = useOpenHouses()
  const { data: listings }                           = useListings()
  const { data: properties }                         = useProperties()

  const pillarMap = useMemo(() => {
    const m = {}
    for (const p of (pillars ?? [])) m[p.id] = p
    return m
  }, [pillars])

  // Filter open houses into the week grid (always based on visible week, not stats range)
  const weekStartISO = toISO(weekStart)
  const weekEndISO   = toISO(weekEnd)
  const openHousesThisWeek = useMemo(() => {
    if (!openHouses) return {}
    const m = {}
    for (const oh of openHouses) {
      if (!oh.date) continue
      if (oh.date < weekStartISO || oh.date > weekEndISO) continue
      if (!m[oh.date]) m[oh.date] = []
      m[oh.date].push(oh)
    }
    return m
  }, [openHouses, weekStartISO, weekEndISO])

  // Group content pieces by date (week grid uses only the 7-day window)
  const piecesByDate = useMemo(() => {
    const m = {}
    const source = (pieces ?? []).filter(p => p.content_date >= weekStartISO && p.content_date <= weekEndISO)
    for (const p of source) {
      if (!m[p.content_date]) m[p.content_date] = []
      m[p.content_date].push(p)
    }
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => {
        const aListing = a.listing_id ? 0 : 1
        const bListing = b.listing_id ? 0 : 1
        if (aListing !== bListing) return aListing - bListing
        return (a.channel || '').localeCompare(b.channel || '')
      })
    }
    return m
  }, [pieces, weekStartISO, weekEndISO])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      return { date: d, iso: toISO(d) }
    }), [weekStart]
  )

  const totalPieces = Object.values(piecesByDate).flat().length
  const totalOH     = Object.values(openHousesThisWeek).flat().length

  // ─── Drag and drop ──────────────────────────────────────────────────────────
  function handleDragStart(e, piece) {
    e.dataTransfer.setData('text/plain', piece.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOverDay(e, iso) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverDay !== iso) setDragOverDay(iso)
  }
  function handleDragLeaveDay(iso) {
    if (dragOverDay === iso) setDragOverDay(null)
  }
  async function handleDropDay(e, iso) {
    e.preventDefault()
    setDragOverDay(null)
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    const piece = (pieces ?? []).find(p => p.id === id)
    if (!piece || piece.content_date === iso) return
    await DB.updateContentPiece(id, { content_date: iso })
    await refetchPieces()
  }

  // ─── Mutation helpers passed to detail panel ────────────────────────────────
  async function handleUpdatePiece(patch) {
    if (!selected) return
    const updated = await DB.updateContentPiece(selected.id, patch)
    await refetchPieces()
    setSelected(s => ({ ...s, ...updated, ...patch }))
  }

  async function handleSyncNow() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const config = await DB.getSocialDashboardConfig().catch(() => null)
      const cfg = config?.value || {}
      const apifyKey = cfg.apify_key
      const platformCfg = cfg.platform_config || {}

      if (!apifyKey) {
        throw new Error('No Apify key configured. Add one in Content → Social Media → Manage.')
      }

      const enabled = Object.entries(platformCfg).filter(([, v]) =>
        v?.enabled && v?.connection === 'apify' && v?.handle
      )
      if (enabled.length === 0) {
        throw new Error('No platforms enabled for Apify sync. Enable Instagram or Facebook in Social Dashboard → Manage.')
      }

      const results = []
      for (const [platform, pc] of enabled) {
        if (platform !== 'instagram' && platform !== 'facebook') continue
        try {
          const r = await DB.syncSocialPlatform({ platform, handle: pc.handle, apifyKey })
          results.push(r)
        } catch (e) {
          results.push({ platform, error: e.message })
        }
      }
      setSyncResult({
        at: new Date(),
        platforms: results,
        totalMatched: results.reduce((s, r) => s + (r.matched || 0), 0),
      })
      await refetchPieces()
    } catch (e) {
      setSyncResult({ at: new Date(), error: e.message })
    } finally {
      setSyncing(false)
    }
  }

  async function handleSavePlatformStats(platform, stats) {
    if (!selected) return
    // find or create platform_post row
    let row = (selected.platform_posts ?? []).find(pp => pp.platform === platform)
    if (!row) {
      row = await DB.upsertContentPlatformPost({ content_id: selected.id, platform })
    }
    await DB.updateContentPostStats(row.id, stats)
    await refetchPieces()
    setSelected(s => {
      if (!s) return s
      const others = (s.platform_posts ?? []).filter(pp => pp.platform !== platform)
      return { ...s, platform_posts: [...others, { ...row, ...stats }] }
    })
  }

  return (
    <div className="cc-page">
      <div className="cc-page-header">
        <div>
          <h1>Content Calendar</h1>
          <p className="cc-page-sub">
            Every post, open house, and listing campaign in one tracked place.
          </p>
        </div>
        <div className="cc-page-actions">
          <Link to="/content/planning" className="cc-brain-btn">Planning</Link>
          <Link to="/content/ai-studio" className="cc-brain-btn">Content Studio</Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="cc-tabs">
        <button
          className={`cc-tab${tab === 'calendar' ? ' cc-tab--active' : ''}`}
          onClick={() => setTab('calendar')}
        >
          Calendar
        </button>
        <button
          className={`cc-tab${tab === 'stats' ? ' cc-tab--active' : ''}`}
          onClick={() => setTab('stats')}
        >
          Stats
        </button>
      </div>

      {tab === 'calendar' && (
        <>
          <div className="cc-week-nav">
            <button className="cc-nav-btn" onClick={() => setWeekStart(d => addDays(d, -7))}>‹</button>
            <span className="cc-week-label">
              {fmtMonthYear(weekStart)} — {fmtLong(weekStart)} to {fmtLong(weekEnd)}
            </span>
            <button className="cc-nav-btn cc-nav-today" onClick={() => setWeekStart(getWeekStart(new Date()))}>
              Today
            </button>
            <button className="cc-nav-btn" onClick={() => setWeekStart(d => addDays(d, 7))}>›</button>
            <span className="cc-week-count">
              {totalPieces} post{totalPieces !== 1 ? 's' : ''}
              {totalOH > 0 && ` · ${totalOH} open house${totalOH !== 1 ? 's' : ''}`}
            </span>
          </div>

          {/* 7-column week grid */}
          <div className="cc-week-grid">
            {weekDays.map(({ date, iso }) => {
              const dayPieces = piecesByDate[iso] ?? []
              const dayOH     = openHousesThisWeek[iso] ?? []
              const isToday   = iso === toISO(new Date())
              const isDragOver = dragOverDay === iso
              return (
                <div
                  key={iso}
                  className={`cc-day${isToday ? ' cc-day--today' : ''}${isDragOver ? ' cc-day--drag-over' : ''}`}
                  onDragOver={(e) => handleDragOverDay(e, iso)}
                  onDragLeave={() => handleDragLeaveDay(iso)}
                  onDrop={(e) => handleDropDay(e, iso)}
                >
                  <div className="cc-day-head">
                    <div className="cc-day-label">
                      <span className="cc-day-name">{fmtDay(date)}</span>
                      <span className={`cc-day-num${isToday ? ' cc-day-num--today' : ''}`}>
                        {date.getDate()}
                      </span>
                    </div>
                  </div>

                  <div className="cc-day-body">
                    {dayOH.map(oh => (
                      <div key={oh.id} className="cc-oh-card">
                        <div className="cc-oh-card-head">Open House</div>
                        <div className="cc-oh-card-addr">
                          {oh.property?.address || 'Property'}
                        </div>
                        {(oh.start_time || oh.end_time) && (
                          <div className="cc-oh-card-time">
                            {oh.start_time} {oh.end_time && `– ${oh.end_time}`}
                          </div>
                        )}
                        <Link to="/open-houses" className="cc-oh-card-link">Manage →</Link>
                      </div>
                    ))}

                    {dayPieces.map(p => {
                      const pillar = pillarMap[p.pillar_id]
                      const isListing = !!p.listing_id
                      return (
                        <button
                          key={p.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, p)}
                          className={`cc-piece-pill${isListing ? ' cc-piece-pill--listing' : ''}`}
                          style={{ borderLeftColor: pillar?.color ?? (isListing ? 'var(--brown-mid)' : 'var(--color-muted)') }}
                          onClick={() => setSelected(p)}
                          title={p.notes || p.title}
                        >
                          <span className="cc-pill-icon">
                            <ChannelIcon channel={p.channel} size={14} />
                          </span>
                          <span className="cc-pill-title">{p.title}</span>
                          <span className={`cc-pill-dot cc-pill-dot--${p.status}`} />
                        </button>
                      )
                    })}

                    {dayPieces.length === 0 && dayOH.length === 0 && (
                      <div className="cc-day-empty-state">Drop content here</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="cc-legends">
            <div className="cc-status-legend">
              {['idea', 'draft', 'scheduled', 'published'].map(s => (
                <span key={s} className="cc-legend-item">
                  <span className={`cc-pill-dot cc-pill-dot--${s}`} /> {s}
                </span>
              ))}
            </div>
            <div className="cc-dnd-hint">Drag posts between days to reschedule</div>
          </div>
        </>
      )}

      {tab === 'stats' && (
        <StatsView
          pieces={pieces ?? []}
          pillars={pillars ?? []}
          pillarMap={pillarMap}
          openHouses={openHouses ?? []}
          listings={listings ?? []}
          rangeMode={rangeMode}
          setRangeMode={setRangeMode}
          statsStart={statsStart}
          statsEnd={statsEnd}
          setWeekStart={setWeekStart}
          weekStart={weekStart}
          onSync={handleSyncNow}
          syncing={syncing}
          syncResult={syncResult}
        />
      )}

      {/* Detail panel */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? 'Post Details' : ''}
        width={560}
      >
        {selected && (
          <PieceDetail
            piece={selected}
            pillars={pillars ?? []}
            listings={listings ?? []}
            properties={properties ?? []}
            openHouses={openHouses ?? []}
            onUpdate={handleUpdatePiece}
            onSaveStats={handleSavePlatformStats}
          />
        )}
      </SlidePanel>
    </div>
  )
}

// ─── Piece Detail Panel ──────────────────────────────────────────────────────
function PieceDetail({ piece, pillars, listings, properties, openHouses, onUpdate, onSaveStats }) {
  const ch = channelMeta(piece.channel)
  const [copied, setCopied] = useState(null)

  function copy(text, key) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const channels = Object.keys(CHANNEL_META)
  const platformPosts = piece.platform_posts ?? []

  return (
    <div className="cc-detail">
      <div className="cc-detail-head">
        <div className="cc-detail-channel">
          <span className="cc-detail-icon">
            <ChannelIcon channel={piece.channel} size={28} />
          </span>
          <div>
            <div className="cc-detail-channel-label">{ch.label}</div>
            <div className="cc-detail-date">{piece.content_date}</div>
          </div>
        </div>
        <span className={`cc-pill-dot cc-pill-dot--${piece.status}`} />
      </div>

      <h3 className="cc-detail-title">{piece.title}</h3>

      {/* Tracking selectors ───────────────────────────────────────────────── */}
      <div className="cc-detail-grid">
        <div>
          <div className="cc-detail-label">Pillar</div>
          <Select value={piece.pillar_id || ''} onChange={(e) => onUpdate({ pillar_id: e.target.value || null })}>
            <option value="">— None —</option>
            {pillars.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <div className="cc-detail-label">Channel</div>
          <Select value={piece.channel || ''} onChange={(e) => onUpdate({ channel: e.target.value || null })}>
            <option value="">— None —</option>
            {channels.map(k => (
              <option key={k} value={k}>{CHANNEL_META[k].label}</option>
            ))}
          </Select>
        </div>
        <div>
          <div className="cc-detail-label">Client Listing</div>
          <Select value={piece.listing_id || ''} onChange={(e) => onUpdate({ listing_id: e.target.value || null })}>
            <option value="">— None —</option>
            {listings.map(l => (
              <option key={l.id} value={l.id}>{l.property?.address || '(no address)'}</option>
            ))}
          </Select>
        </div>
        <div>
          <div className="cc-detail-label">Property</div>
          <Select value={piece.property_id || ''} onChange={(e) => onUpdate({ property_id: e.target.value || null })}>
            <option value="">— None —</option>
            {properties.map(p => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </Select>
        </div>
        <div className="cc-detail-grid-full">
          <div className="cc-detail-label">Open House</div>
          <Select value={piece.open_house_id || ''} onChange={(e) => onUpdate({ open_house_id: e.target.value || null })}>
            <option value="">— None —</option>
            {openHouses.map(oh => (
              <option key={oh.id} value={oh.id}>
                {oh.date} · {oh.property?.address || 'Property'}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {piece.notes && (
        <div className="cc-detail-notes">
          <div className="cc-detail-label">Direction</div>
          <p>{piece.notes}</p>
        </div>
      )}

      {piece.body_text && (
        <div className="cc-detail-body">
          <div className="cc-detail-label">
            Caption
            <button className="cc-copy-btn" onClick={() => copy(piece.body_text, 'body')}>
              {copied === 'body' ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre className="cc-detail-text">{piece.body_text}</pre>
        </div>
      )}

      {/* Per-platform adapted text + stats ───────────────────────────────── */}
      <div className="cc-detail-platforms">
        <div className="cc-detail-label">Platform versions &amp; stats</div>
        {platformPosts.length === 0 && (
          <div className="cc-detail-empty">No platform versions yet. Use Planning or Content Studio to adapt this post.</div>
        )}
        {platformPosts.map(pp => (
          <PlatformStatsRow
            key={pp.id || pp.platform}
            post={pp}
            copied={copied}
            onCopy={copy}
            onSaveStats={(stats) => onSaveStats(pp.platform, stats)}
          />
        ))}
      </div>

      {/* Action links ─────────────────────────────────────────────────────── */}
      <div className="cc-detail-actions">
        <div className="cc-detail-label">Post it</div>
        <div className="cc-detail-action-grid">
          <Link to={`/content/composer/${piece.id}`} className="cc-action-btn cc-action-btn--primary">
            🚀 Compose &amp; Publish
          </Link>
          {ch.postUrl && (
            <a href={ch.postUrl} target="_blank" rel="noreferrer" className="cc-action-btn">
              <ChannelIcon channel={piece.channel} size={14} /> Open {ch.label}
            </a>
          )}
          {ch.internal && (
            <Link to={ch.internal} className="cc-action-btn">
              <ChannelIcon channel={piece.channel} size={14} /> Open {ch.label}
            </Link>
          )}
          <Link to="/content/ai-studio" className="cc-action-btn">Content Studio</Link>
          <a href="https://www.canva.com/" target="_blank" rel="noreferrer" className="cc-action-btn">Canva</a>
          <Link to="/content/planning" className="cc-action-btn">Edit in Planning</Link>
        </div>
      </div>

      {/* Status quick toggles ─────────────────────────────────────────────── */}
      <div className="cc-detail-status">
        <div className="cc-detail-label">Mark as</div>
        <div className="cc-detail-status-row">
          {['idea', 'draft', 'scheduled', 'published'].map(s => (
            <button
              key={s}
              className={`cc-status-btn${piece.status === s ? ' cc-status-btn--active' : ''}`}
              onClick={() => onUpdate({ status: s })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Per-platform stats row ──────────────────────────────────────────────────
function PlatformStatsRow({ post, copied, onCopy, onSaveStats }) {
  const meta = channelMeta(post.platform)
  const [expanded, setExpanded] = useState(false)
  const [postUrl, setPostUrl] = useState(post.post_url || '')
  const [stats, setStats] = useState({
    views:       post.views       || 0,
    reach:       post.reach       || 0,
    impressions: post.impressions || 0,
    likes:       post.likes       || 0,
    comments:    post.comments    || 0,
    shares:      post.shares      || 0,
    saves:       post.saves       || 0,
    clicks:      post.clicks      || 0,
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) {
    setStats(s => ({ ...s, [k]: Number(v) || 0 }))
  }

  async function save() {
    setSaving(true)
    try {
      const patch = { ...stats }
      if (postUrl !== (post.post_url || '')) patch.post_url = postUrl || null
      await onSaveStats(patch)
    }
    finally { setSaving(false) }
  }

  const totalEng = stats.likes + stats.comments + stats.shares + stats.saves
  const isAutoSynced = post.stats_source === 'apify'
  const lastSynced = post.stats_updated_at
    ? new Date(post.stats_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div className="cc-detail-platform">
      <button className="cc-detail-platform-head" onClick={() => setExpanded(v => !v)}>
        <span className="cc-detail-platform-name">
          <ChannelIcon channel={post.platform} size={14} /> {meta.label}
          {isAutoSynced && <span className="cc-sync-badge" title={`Auto-synced ${lastSynced}`}>auto</span>}
        </span>
        <span className="cc-detail-platform-summary">
          {stats.views > 0 && <span>{stats.views.toLocaleString()} views</span>}
          {totalEng > 0 && <span>{totalEng.toLocaleString()} eng</span>}
          <span className="cc-detail-platform-expand">{expanded ? '−' : '+'}</span>
        </span>
      </button>

      {expanded && (
        <div className="cc-detail-platform-body">
          {post.adapted_text && (
            <>
              <div className="cc-detail-label">
                Caption
                <button className="cc-copy-btn" onClick={() => onCopy(post.adapted_text, post.platform)}>
                  {copied === post.platform ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre className="cc-detail-text">{post.adapted_text}</pre>
            </>
          )}

          <div className="cc-detail-label">
            Post URL
            <span className="cc-detail-label-hint">required for auto-sync</span>
          </div>
          <Input
            type="url"
            placeholder="https://www.instagram.com/p/..."
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
          />

          <div className="cc-detail-label">
            Stats
            {isAutoSynced && <span className="cc-detail-label-hint">last synced {lastSynced}</span>}
          </div>
          <div className="cc-stats-grid">
            {[
              ['views', 'Views'],
              ['reach', 'Reach'],
              ['impressions', 'Impr.'],
              ['likes', 'Likes'],
              ['comments', 'Comments'],
              ['shares', 'Shares'],
              ['saves', 'Saves'],
              ['clicks', 'Clicks'],
            ].map(([k, label]) => (
              <label key={k} className="cc-stat-field">
                <span>{label}</span>
                <Input
                  type="number"
                  min="0"
                  value={stats[k]}
                  onChange={(e) => set(k, e.target.value)}
                />
              </label>
            ))}
          </div>
          <button className="cc-action-btn cc-action-btn--primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save stats'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Stats View ──────────────────────────────────────────────────────────────
function StatsView({ pieces, pillarMap, listings, rangeMode, setRangeMode, statsStart, statsEnd, setWeekStart, weekStart, onSync, syncing, syncResult }) {
  // Aggregates across the selected range
  const agg = useMemo(() => {
    const byPillar  = {}  // pillar_id -> { count, views, reach, likes, comments, shares, saves, clicks }
    const byChannel = {}
    const byListing = {}
    const byProperty = {}
    const byOH      = {}
    let totals = { count: 0, views: 0, reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 }

    function bucket(map, key) {
      if (!map[key]) map[key] = { count: 0, views: 0, reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 }
      return map[key]
    }

    for (const p of pieces) {
      totals.count++
      // Sum platform stats
      const sum = { views: 0, reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0 }
      for (const pp of (p.platform_posts ?? [])) {
        sum.views       += pp.views       || 0
        sum.reach       += pp.reach       || 0
        sum.impressions += pp.impressions || 0
        sum.likes       += pp.likes       || 0
        sum.comments    += pp.comments    || 0
        sum.shares      += pp.shares      || 0
        sum.saves       += pp.saves       || 0
        sum.clicks      += pp.clicks      || 0
      }
      for (const k of Object.keys(sum)) totals[k] += sum[k]

      const pKey = p.pillar_id || 'none'
      const pb = bucket(byPillar, pKey); pb.count++
      for (const k of Object.keys(sum)) pb[k] += sum[k]

      const cKey = p.channel || 'none'
      const cb = bucket(byChannel, cKey); cb.count++
      for (const k of Object.keys(sum)) cb[k] += sum[k]

      if (p.listing_id) {
        const lb = bucket(byListing, p.listing_id); lb.count++
        for (const k of Object.keys(sum)) lb[k] += sum[k]
      }
      if (p.property_id) {
        const pb2 = bucket(byProperty, p.property_id); pb2.count++
        for (const k of Object.keys(sum)) pb2[k] += sum[k]
      }
      if (p.open_house_id) {
        const oh = bucket(byOH, p.open_house_id); oh.count++
        for (const k of Object.keys(sum)) oh[k] += sum[k]
      }
    }
    return { totals, byPillar, byChannel, byListing, byProperty, byOH }
  }, [pieces])

  const listingMap = useMemo(() => {
    const m = {}
    for (const l of listings) m[l.id] = l
    return m
  }, [listings])

  const shiftRange = (dir) => {
    if (rangeMode === 'week') {
      setWeekStart(d => addDays(d, dir * 7))
    } else {
      const d = new Date(weekStart)
      d.setMonth(d.getMonth() + dir)
      setWeekStart(getWeekStart(d))
    }
  }

  return (
    <div className="cc-stats">
      <div className="cc-stats-header">
        <div className="cc-stats-range-switch">
          <button
            className={`cc-tab${rangeMode === 'week' ? ' cc-tab--active' : ''}`}
            onClick={() => setRangeMode('week')}
          >
            Week
          </button>
          <button
            className={`cc-tab${rangeMode === 'month' ? ' cc-tab--active' : ''}`}
            onClick={() => setRangeMode('month')}
          >
            Month
          </button>
        </div>
        <div className="cc-week-nav">
          <button className="cc-nav-btn" onClick={() => shiftRange(-1)}>‹</button>
          <span className="cc-week-label">
            {fmtLong(statsStart)} – {fmtLong(statsEnd)}
          </span>
          <button className="cc-nav-btn" onClick={() => shiftRange(1)}>›</button>
        </div>
        <button
          className="cc-action-btn cc-action-btn--primary cc-sync-btn"
          onClick={onSync}
          disabled={syncing}
        >
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>

      {syncResult && (
        <div className={`cc-sync-result${syncResult.error ? ' cc-sync-result--error' : ''}`}>
          {syncResult.error && <span>Sync failed: {syncResult.error}</span>}
          {!syncResult.error && (
            <>
              <strong>Synced {syncResult.at.toLocaleTimeString()}</strong>
              <span>· {syncResult.totalMatched} post{syncResult.totalMatched !== 1 ? 's' : ''} matched</span>
              {(syncResult.platforms || []).map((r) => (
                <span key={r.platform}>
                  · {r.platform}: {r.error ? `error — ${r.error}` : `${r.posts_count || 0} scraped, ${r.matched || 0} matched`}
                </span>
              ))}
            </>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="cc-stats-totals">
        <StatCard label="Posts created" value={agg.totals.count} accent />
        <StatCard label="Views"         value={agg.totals.views} />
        <StatCard label="Reach"         value={agg.totals.reach} />
        <StatCard label="Impressions"   value={agg.totals.impressions} />
        <StatCard label="Likes"         value={agg.totals.likes} />
        <StatCard label="Comments"      value={agg.totals.comments} />
        <StatCard label="Shares"        value={agg.totals.shares} />
        <StatCard label="Saves"         value={agg.totals.saves} />
      </div>

      {/* By pillar */}
      <StatsGroup title="By content pillar">
        {Object.entries(agg.byPillar)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([k, v]) => {
            const pillar = pillarMap[k]
            return (
              <StatRow
                key={k}
                label={pillar?.name || 'Unassigned'}
                color={pillar?.color}
                data={v}
              />
            )
          })}
      </StatsGroup>

      {/* By channel */}
      <StatsGroup title="By channel">
        {Object.entries(agg.byChannel)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([k, v]) => (
            <StatRow
              key={k}
              label={CHANNEL_META[k]?.label || k}
              icon={k !== 'none' ? <ChannelIcon channel={k} size={14} /> : null}
              data={v}
            />
          ))}
      </StatsGroup>

      {/* By client listing */}
      {Object.keys(agg.byListing).length > 0 && (
        <StatsGroup title="By client listing">
          {Object.entries(agg.byListing)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([k, v]) => {
              const l = listingMap[k]
              return (
                <StatRow
                  key={k}
                  label={l?.property?.address || 'Listing'}
                  data={v}
                />
              )
            })}
        </StatsGroup>
      )}

      {/* By open house */}
      {Object.keys(agg.byOH).length > 0 && (
        <StatsGroup title="By open house">
          {Object.entries(agg.byOH)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([k, v]) => (
              <StatRow key={k} label={`Open House ${k.slice(0, 8)}`} data={v} />
            ))}
        </StatsGroup>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`cc-stat-card${accent ? ' cc-stat-card--accent' : ''}`}>
      <div className="cc-stat-value">{(value || 0).toLocaleString()}</div>
      <div className="cc-stat-label">{label}</div>
    </div>
  )
}

function StatsGroup({ title, children }) {
  return (
    <div className="cc-stats-group">
      <h3 className="cc-stats-group-title">{title}</h3>
      <div className="cc-stats-rows">{children}</div>
    </div>
  )
}

function StatRow({ label, color, icon, data }) {
  return (
    <div className="cc-stat-row">
      <div className="cc-stat-row-label">
        {color && <span className="cc-stat-row-dot" style={{ background: color }} />}
        {icon && <span className="cc-stat-row-icon">{icon}</span>}
        <span>{label}</span>
      </div>
      <div className="cc-stat-row-metrics">
        <span><b>{data.count}</b> posts</span>
        <span>{(data.views || 0).toLocaleString()} views</span>
        <span>{(data.likes + data.comments + data.shares + data.saves).toLocaleString()} eng</span>
      </div>
    </div>
  )
}

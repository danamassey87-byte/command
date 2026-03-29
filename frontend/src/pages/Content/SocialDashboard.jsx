import { useState, useEffect, useCallback } from 'react'
import { SectionHeader, Card, TabBar, Button, SlidePanel } from '../../components/ui/index.jsx'
import { useBrand } from '../../lib/BrandContext'
import * as DB from '../../lib/supabase'
import './SocialDashboard.css'

// ─── Platform Registry ───────────────────────────────────────────────────────
const ALL_PLATFORMS = [
  { key: 'instagram',    label: 'Instagram',       icon: '📷', color: '#E1306C', group: 'social', defaultHandle: '@yourhandle' },
  { key: 'facebook',     label: 'Facebook',        icon: '👥', color: '#1877F2', group: 'social', defaultHandle: 'Your Page' },
  { key: 'tiktok',       label: 'TikTok',         icon: '🎵', color: '#010101', group: 'social', defaultHandle: '@yourhandle' },
  { key: 'youtube',      label: 'YouTube',         icon: '▶️',  color: '#FF0000', group: 'social', defaultHandle: '@yourchannel' },
  { key: 'linkedin',     label: 'LinkedIn',        icon: '💼', color: '#0A66C2', group: 'social', defaultHandle: 'Your Name' },
  { key: 'twitter',      label: 'Twitter / X',     icon: '🐦', color: '#1DA1F2', group: 'social', defaultHandle: '@yourhandle' },
  { key: 'gmb',          label: 'Google Business', icon: '📍', color: '#4285F4', group: 'reviews', defaultHandle: 'Your Business' },
  { key: 'zillow',       label: 'Zillow',          icon: '🏠', color: '#006AFF', group: 'reviews', defaultHandle: 'Your Profile' },
  { key: 'realtor_com',  label: 'Realtor.com',     icon: '🔑', color: '#D92228', group: 'reviews', defaultHandle: 'Your Profile' },
  { key: 'blog',         label: 'Blog',            icon: '✍️',  color: '#524136', group: 'web', defaultHandle: 'yourblog.com' },
  { key: 'website',      label: 'Website',         icon: '🌐', color: '#524136', group: 'web', defaultHandle: 'yoursite.com' },
  { key: 'linktree',     label: 'Linktree / Bio',  icon: '🔗', color: '#43E660', group: 'web', defaultHandle: 'linktr.ee/you' },
]

const PLATFORM_MAP = Object.fromEntries(ALL_PLATFORMS.map(p => [p.key, p]))

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function MiniSparkline({ data, color }) {
  if (!data?.length || data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120, h = 32
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
  ).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sd-sparkline">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MetricPill({ label, value, icon }) {
  return (
    <div className="sd-metric-pill">
      {icon && <span className="sd-metric-pill__icon">{icon}</span>}
      <span className="sd-metric-pill__value">{value}</span>
      <span className="sd-metric-pill__label">{label}</span>
    </div>
  )
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
const TAB_GROUPS = [
  { value: 'overview', label: 'Overview' },
  { value: 'social',   label: 'Social Media' },
  { value: 'reviews',  label: 'Reviews & SEO' },
  { value: 'web',      label: 'Web & Links' },
]

// ─── Channel Manager Panel ───────────────────────────────────────────────────
function ChannelManager({ open, onClose, config, onSave }) {
  const [draft, setDraft] = useState({ platforms: {} })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    // Initialize draft from config
    const platforms = {}
    for (const p of ALL_PLATFORMS) {
      const existing = config?.platform_config?.[p.key]
      platforms[p.key] = {
        enabled: existing?.enabled ?? false,
        handle: existing?.handle ?? '',
      }
    }
    setDraft({ platforms })
  }, [open, config])

  function togglePlatform(key) {
    setDraft(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: { ...prev.platforms[key], enabled: !prev.platforms[key].enabled },
      },
    }))
  }

  function setHandle(key, handle) {
    setDraft(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: { ...prev.platforms[key], handle },
      },
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const platform_config = {}
      const enabled_platforms = []
      for (const [key, val] of Object.entries(draft.platforms)) {
        platform_config[key] = val
        if (val.enabled) enabled_platforms.push(key)
      }
      await onSave({ enabled_platforms, platform_config })
      onClose()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const groups = [
    { label: 'Social Media', keys: ALL_PLATFORMS.filter(p => p.group === 'social') },
    { label: 'Reviews & SEO', keys: ALL_PLATFORMS.filter(p => p.group === 'reviews') },
    { label: 'Web & Links', keys: ALL_PLATFORMS.filter(p => p.group === 'web') },
  ]

  return (
    <SlidePanel open={open} onClose={onClose} title="Manage Channels" subtitle="Choose which platforms to track and set your handles" width={480}>
      <div className="sd-manager">
        {groups.map(group => (
          <div key={group.label} className="sd-manager__group">
            <h4 className="sd-manager__group-title">{group.label}</h4>
            {group.keys.map(p => {
              const state = draft.platforms[p.key] ?? { enabled: false, handle: '' }
              return (
                <div key={p.key} className={`sd-manager__row ${state.enabled ? 'sd-manager__row--on' : ''}`}>
                  <button
                    type="button"
                    className={`sd-manager__toggle ${state.enabled ? 'sd-manager__toggle--on' : ''}`}
                    onClick={() => togglePlatform(p.key)}
                    aria-label={`Toggle ${p.label}`}
                  >
                    <span className="sd-manager__toggle-track">
                      <span className="sd-manager__toggle-thumb" />
                    </span>
                  </button>
                  <span className="sd-manager__icon">{p.icon}</span>
                  <div className="sd-manager__info">
                    <span className="sd-manager__label">{p.label}</span>
                    {state.enabled && (
                      <input
                        className="sd-manager__handle-input"
                        value={state.handle}
                        onChange={e => setHandle(p.key, e.target.value)}
                        placeholder={p.defaultHandle}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div className="sd-manager__actions">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Channels'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </SlidePanel>
  )
}

// ─── Channel Detail Card ─────────────────────────────────────────────────────
function ChannelCard({ platformKey, metrics, config }) {
  const platform = PLATFORM_MAP[platformKey]
  if (!platform) return null

  const handle = config?.platform_config?.[platformKey]?.handle || platform.defaultHandle
  const m = metrics ?? {}
  const extra = m.extra ?? {}
  const topPosts = m.top_posts ?? []
  const hasMetrics = m.week_of != null

  return (
    <div className="sd-channel-detail" style={{ '--platform-color': platform.color }}>
      <div className="sd-channel-detail__header">
        <span className="sd-channel-detail__icon">{platform.icon}</span>
        <div>
          <h3 className="sd-channel-detail__name">{platform.label}</h3>
          <span className="sd-channel-detail__handle">{handle}</span>
        </div>
        {m.engagement_rate > 0 && (
          <div className="sd-channel-detail__badge">
            <span className="sd-channel-detail__eng">{m.engagement_rate}%</span>
            <span className="sd-channel-detail__eng-label">engagement</span>
          </div>
        )}
      </div>

      {!hasMetrics ? (
        <div className="sd-empty-metrics">
          <p>No metrics recorded yet.</p>
          <p className="sd-empty-metrics__hint">Metrics will appear here once data is synced (Apify, API, or manual entry).</p>
        </div>
      ) : (
        <>
          {/* Core metrics */}
          <div className="sd-metrics-row">
            {m.followers > 0 && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{fmtNum(m.followers)}</span>
                <span className="sd-metric-card__label">Followers</span>
                {m.followers_change > 0 && (
                  <span className="sd-metric-card__delta sd-metric-card__delta--up">+{m.followers_change}</span>
                )}
                {m.followers_change < 0 && (
                  <span className="sd-metric-card__delta sd-metric-card__delta--down">{m.followers_change}</span>
                )}
              </div>
            )}
            {m.reach > 0 && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{fmtNum(m.reach)}</span>
                <span className="sd-metric-card__label">Reach</span>
              </div>
            )}
            {m.impressions > 0 && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{fmtNum(m.impressions)}</span>
                <span className="sd-metric-card__label">Impressions</span>
              </div>
            )}
            {m.posts_count > 0 && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{m.posts_count}</span>
                <span className="sd-metric-card__label">Posts This Week</span>
              </div>
            )}
            {/* Review platforms */}
            {extra.reviews != null && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{extra.reviews}</span>
                <span className="sd-metric-card__label">Total Reviews</span>
              </div>
            )}
            {extra.avg_rating != null && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{extra.avg_rating}</span>
                <span className="sd-metric-card__label">Avg Rating</span>
              </div>
            )}
            {/* Web platforms */}
            {extra.page_views != null && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{fmtNum(extra.page_views)}</span>
                <span className="sd-metric-card__label">Page Views</span>
              </div>
            )}
            {extra.unique_visitors != null && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{fmtNum(extra.unique_visitors)}</span>
                <span className="sd-metric-card__label">Unique Visitors</span>
              </div>
            )}
            {extra.total_clicks != null && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{fmtNum(extra.total_clicks)}</span>
                <span className="sd-metric-card__label">Total Clicks</span>
              </div>
            )}
          </div>

          {/* Engagement breakdown */}
          {(m.likes > 0 || m.comments > 0 || m.shares > 0) && (
            <div className="sd-engagement-row">
              {m.likes > 0 && <div className="sd-eng-stat"><span className="sd-eng-stat__icon">❤️</span> <strong>{m.likes}</strong> likes</div>}
              {m.comments > 0 && <div className="sd-eng-stat"><span className="sd-eng-stat__icon">💬</span> <strong>{m.comments}</strong> comments</div>}
              {m.shares > 0 && <div className="sd-eng-stat"><span className="sd-eng-stat__icon">🔄</span> <strong>{m.shares}</strong> shares</div>}
              {m.saves > 0 && <div className="sd-eng-stat"><span className="sd-eng-stat__icon">🔖</span> <strong>{m.saves}</strong> saves</div>}
            </div>
          )}

          {/* Platform-specific extras */}
          {(extra.stories_views || extra.reels_plays) && (
            <div className="sd-extras-row">
              {extra.stories_views && <MetricPill label="stories views" value={fmtNum(extra.stories_views)} icon="📱" />}
              {extra.reels_plays && <MetricPill label="reels plays" value={fmtNum(extra.reels_plays)} icon="🎬" />}
            </div>
          )}

          {(extra.search_appearances || extra.website_clicks || extra.phone_calls) && (
            <div className="sd-extras-row">
              {extra.search_appearances && <MetricPill label="search appearances" value={fmtNum(extra.search_appearances)} icon="🔍" />}
              {extra.website_clicks && <MetricPill label="website clicks" value={extra.website_clicks} icon="🖱️" />}
              {extra.phone_calls && <MetricPill label="calls" value={extra.phone_calls} icon="📞" />}
              {extra.direction_requests && <MetricPill label="directions" value={extra.direction_requests} icon="📍" />}
            </div>
          )}

          {/* Linktree top links */}
          {extra.top_links?.length > 0 && (
            <div className="sd-top-posts">
              <h4 className="sd-top-posts__title">Top Links</h4>
              {extra.top_links.map((link, i) => (
                <div key={i} className="sd-post-row">
                  <span className="sd-post-row__rank">#{i + 1}</span>
                  <span className="sd-post-row__caption">{link.label}</span>
                  <div className="sd-post-row__stats"><span>{link.clicks} clicks</span></div>
                </div>
              ))}
            </div>
          )}

          {/* Best posting time */}
          {m.best_time && (
            <div className="sd-best-time">
              <span className="sd-best-time__icon">🕐</span>
              <span>Best posting time: <strong>{m.best_time}</strong></span>
            </div>
          )}

          {/* Top Posts */}
          {topPosts.length > 0 && (
            <div className="sd-top-posts">
              <h4 className="sd-top-posts__title">Top Performing Posts</h4>
              {topPosts.map((post, i) => (
                <div key={i} className="sd-post-row">
                  <span className="sd-post-row__rank">#{i + 1}</span>
                  {post.type && <span className="sd-post-row__type">{post.type}</span>}
                  <span className="sd-post-row__caption">{post.caption}</span>
                  <div className="sd-post-row__stats">
                    {post.likes > 0 && <span>❤️ {post.likes}</span>}
                    {post.comments > 0 && <span>💬 {post.comments}</span>}
                    {post.shares > 0 && <span>🔄 {post.shares}</span>}
                    {post.saves > 0 && <span>🔖 {post.saves}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sd-week-label">Week of {fmtDate(m.week_of)} {m.source && <span className="sd-source-tag">via {m.source}</span>}</div>
        </>
      )}
    </div>
  )
}

// ─── Overview Summary ────────────────────────────────────────────────────────
function OverviewSummary({ enabledPlatforms, metricsMap, config, historyMap }) {
  const socialKeys = enabledPlatforms.filter(k => PLATFORM_MAP[k]?.group === 'social')
  const reviewKeys = enabledPlatforms.filter(k => PLATFORM_MAP[k]?.group === 'reviews')

  const totalFollowers = socialKeys.reduce((s, k) => s + (metricsMap[k]?.followers || 0), 0)
  const totalGrowth = socialKeys.reduce((s, k) => s + (metricsMap[k]?.followers_change || 0), 0)
  const totalReach = socialKeys.reduce((s, k) => s + (metricsMap[k]?.reach || 0), 0)
  const totalEngagement = socialKeys.reduce((s, k) => {
    const m = metricsMap[k]
    return s + (m?.likes || 0) + (m?.comments || 0) + (m?.shares || 0)
  }, 0)

  const engRates = socialKeys.map(k => metricsMap[k]?.engagement_rate || 0).filter(r => r > 0)
  const avgEngRate = engRates.length > 0 ? (engRates.reduce((s, r) => s + r, 0) / engRates.length).toFixed(1) : '—'

  const totalReviews = reviewKeys.reduce((s, k) => s + (metricsMap[k]?.extra?.reviews || 0), 0)
  const ratings = reviewKeys.map(k => metricsMap[k]?.extra?.avg_rating).filter(Boolean)
  const avgRating = ratings.length > 0 ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : '—'

  // Best performing platform
  const bestPlatform = socialKeys.reduce((best, k) => {
    const rate = metricsMap[k]?.engagement_rate || 0
    return rate > (metricsMap[best]?.engagement_rate || 0) ? k : best
  }, socialKeys[0])

  // Fastest growing
  const fastestGrowing = socialKeys.reduce((best, k) => {
    const change = metricsMap[k]?.followers_change || 0
    return change > (metricsMap[best]?.followers_change || 0) ? k : best
  }, socialKeys[0])

  const hasAnyData = enabledPlatforms.some(k => metricsMap[k]?.week_of)

  return (
    <div className="sd-overview">
      {/* Hero Stats */}
      <div className="sd-hero-stats">
        <div className="sd-hero-stat">
          <span className="sd-hero-stat__value">{fmtNum(totalFollowers)}</span>
          <span className="sd-hero-stat__label">Total Followers</span>
          {totalGrowth > 0 && <span className="sd-hero-stat__delta sd-hero-stat__delta--up">+{fmtNum(totalGrowth)} this week</span>}
        </div>
        <div className="sd-hero-stat">
          <span className="sd-hero-stat__value">{fmtNum(totalReach)}</span>
          <span className="sd-hero-stat__label">Weekly Reach</span>
        </div>
        <div className="sd-hero-stat">
          <span className="sd-hero-stat__value">{fmtNum(totalEngagement)}</span>
          <span className="sd-hero-stat__label">Total Engagements</span>
        </div>
        <div className="sd-hero-stat">
          <span className="sd-hero-stat__value">{avgEngRate}{avgEngRate !== '—' ? '%' : ''}</span>
          <span className="sd-hero-stat__label">Avg Engagement Rate</span>
        </div>
        {reviewKeys.length > 0 && (
          <div className="sd-hero-stat">
            <span className="sd-hero-stat__value">{totalReviews || '—'}</span>
            <span className="sd-hero-stat__label">Total Reviews</span>
            {avgRating !== '—' && <span className="sd-hero-stat__delta sd-hero-stat__delta--up">{avgRating} avg rating</span>}
          </div>
        )}
      </div>

      {/* Strategy Insights — only if we have data */}
      {hasAnyData && bestPlatform && (
        <Card className="sd-insights-card">
          <h3 className="sd-insights-card__title">Weekly Content Strategy Insights</h3>
          <div className="sd-insights-grid">
            {bestPlatform && metricsMap[bestPlatform]?.engagement_rate > 0 && (
              <div className="sd-insight">
                <span className="sd-insight__icon">🏆</span>
                <div><strong>Best Performing:</strong> {PLATFORM_MAP[bestPlatform]?.label} at {metricsMap[bestPlatform]?.engagement_rate}% engagement</div>
              </div>
            )}
            {fastestGrowing && metricsMap[fastestGrowing]?.followers_change > 0 && (
              <div className="sd-insight">
                <span className="sd-insight__icon">🚀</span>
                <div><strong>Fastest Growing:</strong> {PLATFORM_MAP[fastestGrowing]?.label} (+{metricsMap[fastestGrowing]?.followers_change} this week)</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {!hasAnyData && (
        <Card className="sd-insights-card">
          <h3 className="sd-insights-card__title">Getting Started</h3>
          <div className="sd-insights-grid">
            <div className="sd-insight">
              <span className="sd-insight__icon">📊</span>
              <div>Your channels are connected! Metrics will populate automatically each week via your Apify scheduled task, or you can add data manually.</div>
            </div>
          </div>
        </Card>
      )}

      {/* Platform Grid */}
      <h3 className="sd-section-title">All Connected Channels</h3>
      <div className="sd-platform-grid">
        {enabledPlatforms.map(key => {
          const platform = PLATFORM_MAP[key]
          if (!platform) return null
          const m = metricsMap[key] ?? {}
          const extra = m.extra ?? {}
          const handle = config?.platform_config?.[key]?.handle || platform.defaultHandle
          const history = historyMap[key] ?? []

          return (
            <div key={key} className="sd-platform-mini" style={{ '--platform-color': platform.color }}>
              <div className="sd-platform-mini__header">
                <span className="sd-platform-mini__icon">{platform.icon}</span>
                <div>
                  <span className="sd-platform-mini__name">{platform.label}</span>
                  <span className="sd-platform-mini__handle">{handle}</span>
                </div>
              </div>
              <div className="sd-platform-mini__stats">
                {platform.group === 'social' && (
                  <>
                    <MetricPill label="followers" value={fmtNum(m.followers)} />
                    {m.engagement_rate > 0 && <MetricPill label="eng. rate" value={`${m.engagement_rate}%`} />}
                    {m.reach > 0 && <MetricPill label="reach" value={fmtNum(m.reach)} />}
                  </>
                )}
                {platform.group === 'reviews' && (
                  <>
                    {extra.reviews != null && <MetricPill label="reviews" value={extra.reviews} />}
                    {extra.avg_rating != null && <MetricPill label="rating" value={extra.avg_rating} icon="⭐" />}
                  </>
                )}
                {platform.group === 'web' && (
                  <>
                    {extra.page_views != null && <MetricPill label="views" value={fmtNum(extra.page_views)} />}
                    {extra.total_clicks != null && <MetricPill label="clicks" value={fmtNum(extra.total_clicks)} />}
                    {extra.unique_visitors != null && <MetricPill label="visitors" value={fmtNum(extra.unique_visitors)} />}
                  </>
                )}
                {!m.week_of && <MetricPill label="" value="awaiting data" />}
              </div>
              {history.length > 1 && (
                <MiniSparkline data={history.map(h => h.followers)} color={platform.color} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function SocialDashboard() {
  const { brand } = useBrand()
  const [tab, setTab] = useState('overview')
  const [managerOpen, setManagerOpen] = useState(false)
  const [config, setConfig] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [historyMap, setHistoryMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [configLoading, setConfigLoading] = useState(true)

  // Load dashboard config
  const loadConfig = useCallback(async () => {
    try {
      const result = await DB.getSocialDashboardConfig()
      setConfig(result?.value ?? null)
    } catch {
      // First time — no config yet, that's fine
      setConfig(null)
    } finally {
      setConfigLoading(false)
    }
  }, [])

  // Load metrics
  const loadMetrics = useCallback(async () => {
    try {
      const data = await DB.getLatestSocialMetrics()
      setMetrics(data)
    } catch {
      setMetrics([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])
  useEffect(() => { loadMetrics() }, [loadMetrics])

  // Load history for sparklines when config changes
  useEffect(() => {
    if (!config?.enabled_platforms?.length) return
    async function loadHistory() {
      const map = {}
      await Promise.all(
        config.enabled_platforms.map(async (platform) => {
          try {
            const data = await DB.getSocialMetricsHistory(platform, 12)
            map[platform] = data
          } catch { map[platform] = [] }
        })
      )
      setHistoryMap(map)
    }
    loadHistory()
  }, [config?.enabled_platforms])

  // Build metrics lookup
  const metricsMap = {}
  for (const m of metrics) {
    metricsMap[m.platform] = m
  }

  // Enabled platforms
  const enabledPlatforms = config?.enabled_platforms ?? []
  const hasConfig = enabledPlatforms.length > 0

  // Auto-initialize from brand social channels if no config exists
  useEffect(() => {
    if (configLoading || config != null) return
    const channels = brand?.social_channels ?? {}
    const autoEnabled = []
    const platformConfig = {}
    for (const p of ALL_PLATFORMS) {
      const url = channels[p.key]?.trim()
      if (url) {
        autoEnabled.push(p.key)
        // Extract handle from URL
        let handle = ''
        try {
          const u = new URL(url)
          const path = u.pathname.replace(/\/$/, '')
          handle = path.split('/').pop() || ''
          if (handle && !handle.startsWith('@') && ['instagram', 'tiktok', 'twitter'].includes(p.key)) {
            handle = '@' + handle
          }
        } catch { handle = '' }
        platformConfig[p.key] = { enabled: true, handle }
      }
    }
    if (autoEnabled.length > 0) {
      const newConfig = { enabled_platforms: autoEnabled, platform_config: platformConfig }
      setConfig(newConfig)
      // Save it silently
      DB.updateSocialDashboardConfig(newConfig).catch(() => {})
    }
  }, [configLoading, config, brand?.social_channels])

  async function handleSaveConfig(newConfig) {
    await DB.updateSocialDashboardConfig(newConfig)
    setConfig(newConfig)
  }

  // Filter platforms by tab group
  const socialPlatforms = enabledPlatforms.filter(k => PLATFORM_MAP[k]?.group === 'social')
  const reviewPlatforms = enabledPlatforms.filter(k => PLATFORM_MAP[k]?.group === 'reviews')
  const webPlatforms = enabledPlatforms.filter(k => PLATFORM_MAP[k]?.group === 'web')

  // Find latest week date for "last updated" display
  const latestWeek = metrics.reduce((latest, m) => {
    if (!latest || m.week_of > latest) return m.week_of
    return latest
  }, null)

  if (configLoading) {
    return (
      <div className="social-dashboard">
        <SectionHeader title="Social Media Dashboard" subtitle="Loading..." />
      </div>
    )
  }

  return (
    <div className="social-dashboard">
      <SectionHeader
        title="Social Media Dashboard"
        subtitle="Performance metrics across all your connected channels"
        actions={
          <Button variant="secondary" onClick={() => setManagerOpen(true)}>
            Manage Channels
          </Button>
        }
      />

      {latestWeek && (
        <div className="sd-last-updated">
          Last data: week of {fmtDate(latestWeek)} — updates every Sunday via your scheduled task
        </div>
      )}

      {!hasConfig ? (
        <Card className="sd-setup-card">
          <div className="sd-setup">
            <h3>Connect Your Channels</h3>
            <p>Choose which social platforms, review sites, and web properties you want to track on your dashboard.</p>
            <Button onClick={() => setManagerOpen(true)}>Set Up Channels</Button>
          </div>
        </Card>
      ) : (
        <>
          <TabBar tabs={TAB_GROUPS} active={tab} onChange={setTab} />

          {tab === 'overview' && (
            <OverviewSummary
              enabledPlatforms={enabledPlatforms}
              metricsMap={metricsMap}
              config={config}
              historyMap={historyMap}
            />
          )}

          {tab === 'social' && (
            <div className="sd-channels-list">
              {socialPlatforms.length === 0 ? (
                <Card className="sd-empty-tab">No social media channels connected. Click "Manage Channels" to add some.</Card>
              ) : (
                socialPlatforms.map(key => (
                  <ChannelCard key={key} platformKey={key} metrics={metricsMap[key]} config={config} />
                ))
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className="sd-channels-list">
              {reviewPlatforms.length === 0 ? (
                <Card className="sd-empty-tab">No review platforms connected. Click "Manage Channels" to add some.</Card>
              ) : (
                reviewPlatforms.map(key => (
                  <ChannelCard key={key} platformKey={key} metrics={metricsMap[key]} config={config} />
                ))
              )}
            </div>
          )}

          {tab === 'web' && (
            <div className="sd-channels-list">
              {webPlatforms.length === 0 ? (
                <Card className="sd-empty-tab">No web channels connected. Click "Manage Channels" to add some.</Card>
              ) : (
                webPlatforms.map(key => (
                  <ChannelCard key={key} platformKey={key} metrics={metricsMap[key]} config={config} />
                ))
              )}
            </div>
          )}
        </>
      )}

      <ChannelManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        config={config}
        onSave={handleSaveConfig}
      />
    </div>
  )
}

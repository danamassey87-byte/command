import { useState, useEffect, useCallback } from 'react'
import { SectionHeader, Card, TabBar, Button, SlidePanel } from '../../components/ui/index.jsx'
import { useBrand } from '../../lib/BrandContext'
import * as DB from '../../lib/supabase'
import './SocialDashboard.css'

// ─── Platform Registry ───────────────────────────────────────────────────────
const ALL_PLATFORMS = [
  { key: 'instagram',    label: 'Instagram',       icon: '📷', color: '#E1306C', group: 'social', defaultHandle: '@yourhandle',
    nativeSupport: true, nativeLabel: 'Connect with Meta', apifyActor: 'apify/instagram-scraper' },
  { key: 'facebook',     label: 'Facebook',        icon: '👥', color: '#1877F2', group: 'social', defaultHandle: 'Your Page',
    nativeSupport: true, nativeLabel: 'Connect with Meta', apifyActor: 'apify/facebook-scraper' },
  { key: 'tiktok',       label: 'TikTok',         icon: '🎵', color: '#010101', group: 'social', defaultHandle: '@yourhandle',
    nativeSupport: false, apifyActor: 'clockworks/tiktok-scraper' },
  { key: 'youtube',      label: 'YouTube',         icon: '▶️',  color: '#FF0000', group: 'social', defaultHandle: '@yourchannel',
    nativeSupport: true, nativeLabel: 'Connect with Google', apifyActor: 'bernardo/youtube-scraper' },
  { key: 'linkedin',     label: 'LinkedIn',        icon: '💼', color: '#0A66C2', group: 'social', defaultHandle: 'Your Name',
    nativeSupport: false, apifyActor: 'anchor/linkedin-scraper' },
  { key: 'twitter',      label: 'Twitter / X',     icon: '🐦', color: '#1DA1F2', group: 'social', defaultHandle: '@yourhandle',
    nativeSupport: false, apifyActor: 'apify/twitter-scraper' },
  { key: 'gmb',          label: 'Google Business', icon: '📍', color: '#4285F4', group: 'reviews', defaultHandle: 'Your Business',
    nativeSupport: true, nativeLabel: 'Connect with Google', apifyActor: null },
  { key: 'zillow',       label: 'Zillow',          icon: '🏠', color: '#006AFF', group: 'reviews', defaultHandle: 'Your Profile',
    nativeSupport: false, apifyActor: null },
  { key: 'realtor_com',  label: 'Realtor.com',     icon: '🔑', color: '#D92228', group: 'reviews', defaultHandle: 'Your Profile',
    nativeSupport: false, apifyActor: null },
  { key: 'blog',         label: 'Blog',            icon: '✍️',  color: '#524136', group: 'web', defaultHandle: 'yourblog.com',
    nativeSupport: false, apifyActor: null },
  { key: 'website',      label: 'Website',         icon: '🌐', color: '#524136', group: 'web', defaultHandle: 'yoursite.com',
    nativeSupport: false, apifyActor: null },
  { key: 'linktree',     label: 'Linktree / Bio',  icon: '🔗', color: '#43E660', group: 'web', defaultHandle: 'linktr.ee/you',
    nativeSupport: false, apifyActor: null },
]

const PLATFORM_MAP = Object.fromEntries(ALL_PLATFORMS.map(p => [p.key, p]))

// Which connection methods are available per platform
function getConnectionOptions(platformKey) {
  const p = PLATFORM_MAP[platformKey]
  if (!p) return ['manual']
  const opts = ['manual']
  if (p.apifyActor) opts.unshift('apify')
  if (p.nativeSupport) opts.unshift('native')
  return opts
}

const CONNECTION_LABELS = {
  native: { label: 'Native API', desc: 'Official OAuth — free, reliable', icon: '🔗' },
  apify:  { label: 'Apify',      desc: 'Web scraper — needs API key',    icon: '🤖' },
  manual: { label: 'Manual',     desc: 'Enter your numbers weekly',       icon: '✏️' },
}

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

function getSunday() {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
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

// ─── Manual Entry Panel ──────────────────────────────────────────────────────
const SOCIAL_FIELDS = [
  { key: 'followers',      label: 'Followers',      type: 'number' },
  { key: 'followers_change', label: '+/- This Week', type: 'number' },
  { key: 'reach',           label: 'Reach',          type: 'number' },
  { key: 'impressions',     label: 'Impressions',    type: 'number' },
  { key: 'engagement_rate', label: 'Engagement Rate %', type: 'number', step: '0.1' },
  { key: 'likes',           label: 'Likes',          type: 'number' },
  { key: 'comments',        label: 'Comments',       type: 'number' },
  { key: 'shares',          label: 'Shares',         type: 'number' },
  { key: 'saves',           label: 'Saves',          type: 'number' },
  { key: 'posts_count',     label: 'Posts This Week', type: 'number' },
]

const REVIEW_FIELDS = [
  { key: 'extra.reviews',        label: 'Total Reviews',   type: 'number' },
  { key: 'extra.avg_rating',     label: 'Avg Rating',      type: 'number', step: '0.1' },
  { key: 'extra.reviews_this_month', label: 'Reviews This Month', type: 'number' },
  { key: 'extra.profile_views',  label: 'Profile Views',   type: 'number' },
  { key: 'extra.website_clicks', label: 'Website Clicks',  type: 'number' },
  { key: 'extra.phone_calls',    label: 'Phone Calls',     type: 'number' },
]

const WEB_FIELDS = [
  { key: 'extra.page_views',       label: 'Page Views',       type: 'number' },
  { key: 'extra.unique_visitors',  label: 'Unique Visitors',  type: 'number' },
  { key: 'extra.total_clicks',     label: 'Total Clicks',     type: 'number' },
  { key: 'extra.bounce_rate',      label: 'Bounce Rate %',    type: 'number', step: '0.1' },
  { key: 'extra.avg_time',         label: 'Avg Time on Page', type: 'text' },
]

function ManualEntryPanel({ open, onClose, platformKey, existingMetrics, onSaved }) {
  const platform = PLATFORM_MAP[platformKey]
  const group = platform?.group
  const fields = group === 'social' ? SOCIAL_FIELDS : group === 'reviews' ? REVIEW_FIELDS : WEB_FIELDS
  const [weekOf, setWeekOf] = useState(getSunday)
  const [values, setValues] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    // Pre-fill from existing metrics
    const init = {}
    if (existingMetrics) {
      for (const f of fields) {
        if (f.key.startsWith('extra.')) {
          const extraKey = f.key.split('.')[1]
          init[f.key] = existingMetrics.extra?.[extraKey] ?? ''
        } else {
          init[f.key] = existingMetrics[f.key] ?? ''
        }
      }
      if (existingMetrics.best_time) init.best_time = existingMetrics.best_time
    }
    setValues(init)
    setWeekOf(existingMetrics?.week_of ?? getSunday())
  }, [open, existingMetrics, platformKey])

  function set(key, val) {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      // Build the row
      const extra = {}
      const row = { platform: platformKey, week_of: weekOf, source: 'manual', updated_at: new Date().toISOString() }
      for (const [key, val] of Object.entries(values)) {
        if (key === 'best_time') {
          row.best_time = val
        } else if (key.startsWith('extra.')) {
          const extraKey = key.split('.')[1]
          if (val !== '' && val != null) extra[extraKey] = Number(val) || val
        } else {
          if (val !== '' && val != null) row[key] = Number(val) || 0
        }
      }
      row.extra = extra
      await DB.upsertSocialMetric(row)
      await onSaved()
      onClose()
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!platform) return null

  return (
    <SlidePanel open={open} onClose={onClose} title={`${platform.icon} ${platform.label}`} subtitle="Enter weekly metrics" width={420}>
      <div className="sd-manual">
        <div className="sd-manual__field">
          <label className="sd-manual__label">Week of (Sunday)</label>
          <input type="date" className="sd-manual__input" value={weekOf} onChange={e => setWeekOf(e.target.value)} />
        </div>

        <div className="sd-manual__divider" />

        {fields.map(f => (
          <div key={f.key} className="sd-manual__field">
            <label className="sd-manual__label">{f.label}</label>
            <input
              type={f.type}
              step={f.step}
              className="sd-manual__input"
              value={values[f.key] ?? ''}
              onChange={e => set(f.key, e.target.value)}
              placeholder="0"
            />
          </div>
        ))}

        <div className="sd-manual__field">
          <label className="sd-manual__label">Best Posting Time</label>
          <input
            type="text"
            className="sd-manual__input"
            value={values.best_time ?? ''}
            onChange={e => set('best_time', e.target.value)}
            placeholder="e.g. Tue & Thu, 6-8 PM"
          />
        </div>

        <div className="sd-manual__actions">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Metrics'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </SlidePanel>
  )
}

// ─── Channel Manager Panel ───────────────────────────────────────────────────
function ChannelManager({ open, onClose, config, onSave }) {
  const [draft, setDraft] = useState({ platforms: {}, apify_key: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const platforms = {}
    for (const p of ALL_PLATFORMS) {
      const existing = config?.platform_config?.[p.key]
      platforms[p.key] = {
        enabled: existing?.enabled ?? false,
        handle: existing?.handle ?? '',
        connection: existing?.connection ?? 'manual',
      }
    }
    setDraft({ platforms, apify_key: config?.apify_key ?? '' })
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

  function setField(key, field, value) {
    setDraft(prev => ({
      ...prev,
      platforms: {
        ...prev.platforms,
        [key]: { ...prev.platforms[key], [field]: value },
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
      await onSave({ enabled_platforms, platform_config, apify_key: draft.apify_key })
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

  const anyApify = Object.values(draft.platforms).some(p => p.enabled && p.connection === 'apify')

  return (
    <SlidePanel open={open} onClose={onClose} title="Manage Channels" subtitle="Choose platforms, connection method, and handles" width={520}>
      <div className="sd-manager">
        {/* Global Apify key */}
        {anyApify && (
          <div className="sd-manager__apify-key">
            <label className="sd-manager__label">Apify API Key</label>
            <p className="sd-manager__hint">One key for all Apify-connected platforms. Find it at apify.com &rarr; Settings &rarr; Integrations.</p>
            <input
              type="password"
              className="sd-manager__handle-input sd-manager__handle-input--wide"
              value={draft.apify_key}
              onChange={e => setDraft(prev => ({ ...prev, apify_key: e.target.value }))}
              placeholder="apify_api_xxxxxxxxxxxxxxx"
            />
          </div>
        )}

        {groups.map(group => (
          <div key={group.label} className="sd-manager__group">
            <h4 className="sd-manager__group-title">{group.label}</h4>
            {group.keys.map(p => {
              const state = draft.platforms[p.key] ?? { enabled: false, handle: '', connection: 'manual' }
              const options = getConnectionOptions(p.key)

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
                      <>
                        {/* Connection type selector */}
                        <div className="sd-manager__connection-picker">
                          {options.map(opt => {
                            const c = CONNECTION_LABELS[opt]
                            return (
                              <button
                                key={opt}
                                type="button"
                                className={`sd-conn-btn ${state.connection === opt ? 'sd-conn-btn--active' : ''}`}
                                onClick={() => setField(p.key, 'connection', opt)}
                                title={c.desc}
                              >
                                <span className="sd-conn-btn__icon">{c.icon}</span>
                                <span className="sd-conn-btn__label">{c.label}</span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Handle input */}
                        <input
                          className="sd-manager__handle-input"
                          value={state.handle}
                          onChange={e => setField(p.key, 'handle', e.target.value)}
                          placeholder={p.defaultHandle}
                        />

                        {/* Connection-specific hints */}
                        {state.connection === 'native' && (
                          <span className="sd-manager__conn-hint sd-manager__conn-hint--native">
                            OAuth integration — coming soon! Using manual entry in the meantime.
                          </span>
                        )}
                        {state.connection === 'apify' && (
                          <span className="sd-manager__conn-hint sd-manager__conn-hint--apify">
                            Uses {p.apifyActor || 'Apify actor'} — runs weekly via scheduled task
                          </span>
                        )}
                        {state.connection === 'manual' && (
                          <span className="sd-manager__conn-hint">
                            Enter your numbers each week from the dashboard
                          </span>
                        )}
                      </>
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
function ChannelCard({ platformKey, metrics, config, onManualEntry }) {
  const platform = PLATFORM_MAP[platformKey]
  if (!platform) return null

  const pConfig = config?.platform_config?.[platformKey] ?? {}
  const handle = pConfig.handle || platform.defaultHandle
  const connection = pConfig.connection || 'manual'
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
        <div className="sd-channel-detail__header-right">
          <span className={`sd-conn-badge sd-conn-badge--${connection}`}>
            {CONNECTION_LABELS[connection]?.icon} {CONNECTION_LABELS[connection]?.label}
          </span>
          {m.engagement_rate > 0 && (
            <div className="sd-channel-detail__badge">
              <span className="sd-channel-detail__eng">{m.engagement_rate}%</span>
              <span className="sd-channel-detail__eng-label">engagement</span>
            </div>
          )}
        </div>
      </div>

      {!hasMetrics ? (
        <div className="sd-empty-metrics">
          <p>No metrics recorded yet.</p>
          {connection === 'manual' && (
            <Button variant="secondary" size="sm" onClick={() => onManualEntry(platformKey)}>
              Enter This Week's Metrics
            </Button>
          )}
          {connection === 'apify' && (
            <p className="sd-empty-metrics__hint">Metrics will appear after your next scheduled Apify run.</p>
          )}
          {connection === 'native' && (
            <p className="sd-empty-metrics__hint">Native OAuth coming soon — use manual entry for now.</p>
          )}
        </div>
      ) : (
        <>
          {/* Core metrics */}
          <div className="sd-metrics-row">
            {m.followers > 0 && (
              <div className="sd-metric-card">
                <span className="sd-metric-card__value">{fmtNum(m.followers)}</span>
                <span className="sd-metric-card__label">Followers</span>
                {m.followers_change > 0 && <span className="sd-metric-card__delta sd-metric-card__delta--up">+{m.followers_change}</span>}
                {m.followers_change < 0 && <span className="sd-metric-card__delta sd-metric-card__delta--down">{m.followers_change}</span>}
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

          {m.best_time && (
            <div className="sd-best-time">
              <span className="sd-best-time__icon">🕐</span>
              <span>Best posting time: <strong>{m.best_time}</strong></span>
            </div>
          )}

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

          <div className="sd-channel-detail__footer">
            <span className="sd-week-label">Week of {fmtDate(m.week_of)} <span className="sd-source-tag">via {m.source}</span></span>
            <button className="sd-update-btn" onClick={() => onManualEntry(platformKey)}>Update Metrics</button>
          </div>
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

  const bestPlatform = socialKeys.reduce((best, k) => {
    const rate = metricsMap[k]?.engagement_rate || 0
    return rate > (metricsMap[best]?.engagement_rate || 0) ? k : best
  }, socialKeys[0])

  const fastestGrowing = socialKeys.reduce((best, k) => {
    const change = metricsMap[k]?.followers_change || 0
    return change > (metricsMap[best]?.followers_change || 0) ? k : best
  }, socialKeys[0])

  const hasAnyData = enabledPlatforms.some(k => metricsMap[k]?.week_of)

  return (
    <div className="sd-overview">
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
              <div>Your channels are connected! Enter metrics manually, connect Apify for automation, or wait for your scheduled task to run.</div>
            </div>
          </div>
        </Card>
      )}

      <h3 className="sd-section-title">All Connected Channels</h3>
      <div className="sd-platform-grid">
        {enabledPlatforms.map(key => {
          const platform = PLATFORM_MAP[key]
          if (!platform) return null
          const m = metricsMap[key] ?? {}
          const extra = m.extra ?? {}
          const pConfig = config?.platform_config?.[key] ?? {}
          const handle = pConfig.handle || platform.defaultHandle
          const connection = pConfig.connection || 'manual'
          const history = historyMap[key] ?? []

          return (
            <div key={key} className="sd-platform-mini" style={{ '--platform-color': platform.color }}>
              <div className="sd-platform-mini__header">
                <span className="sd-platform-mini__icon">{platform.icon}</span>
                <div>
                  <span className="sd-platform-mini__name">{platform.label}</span>
                  <span className="sd-platform-mini__handle">{handle}</span>
                </div>
                <span className={`sd-conn-badge sd-conn-badge--${connection} sd-conn-badge--mini`}>
                  {CONNECTION_LABELS[connection]?.icon}
                </span>
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
  const [manualEntry, setManualEntry] = useState({ open: false, platform: null })
  const [config, setConfig] = useState(null)
  const [metrics, setMetrics] = useState([])
  const [historyMap, setHistoryMap] = useState({})
  const [configLoading, setConfigLoading] = useState(true)

  const loadConfig = useCallback(async () => {
    try {
      const result = await DB.getSocialDashboardConfig()
      setConfig(result?.value ?? null)
    } catch {
      setConfig(null)
    } finally {
      setConfigLoading(false)
    }
  }, [])

  const loadMetrics = useCallback(async () => {
    try {
      const data = await DB.getLatestSocialMetrics()
      setMetrics(data)
    } catch {
      setMetrics([])
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])
  useEffect(() => { loadMetrics() }, [loadMetrics])

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

  const metricsMap = {}
  for (const m of metrics) metricsMap[m.platform] = m

  const enabledPlatforms = config?.enabled_platforms ?? []
  const hasConfig = enabledPlatforms.length > 0

  // Auto-init from brand social channels
  useEffect(() => {
    if (configLoading || config != null) return
    const channels = brand?.social_channels ?? {}
    const autoEnabled = []
    const platformConfig = {}
    for (const p of ALL_PLATFORMS) {
      const url = channels[p.key]?.trim()
      if (url) {
        autoEnabled.push(p.key)
        let handle = ''
        try {
          const u = new URL(url)
          const path = u.pathname.replace(/\/$/, '')
          handle = path.split('/').pop() || ''
          if (handle && !handle.startsWith('@') && ['instagram', 'tiktok', 'twitter'].includes(p.key)) {
            handle = '@' + handle
          }
        } catch { handle = '' }
        platformConfig[p.key] = { enabled: true, handle, connection: 'manual' }
      }
    }
    if (autoEnabled.length > 0) {
      const newConfig = { enabled_platforms: autoEnabled, platform_config: platformConfig }
      setConfig(newConfig)
      DB.updateSocialDashboardConfig(newConfig).catch(() => {})
    }
  }, [configLoading, config, brand?.social_channels])

  async function handleSaveConfig(newConfig) {
    await DB.updateSocialDashboardConfig(newConfig)
    setConfig(newConfig)
  }

  function openManualEntry(platformKey) {
    setManualEntry({ open: true, platform: platformKey })
  }

  async function handleMetricsSaved() {
    await loadMetrics()
  }

  const socialPlatforms = enabledPlatforms.filter(k => PLATFORM_MAP[k]?.group === 'social')
  const reviewPlatforms = enabledPlatforms.filter(k => PLATFORM_MAP[k]?.group === 'reviews')
  const webPlatforms = enabledPlatforms.filter(k => PLATFORM_MAP[k]?.group === 'web')

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
          Last data: week of {fmtDate(latestWeek)}
        </div>
      )}

      {!hasConfig ? (
        <Card className="sd-setup-card">
          <div className="sd-setup">
            <h3>Connect Your Channels</h3>
            <p>Choose which platforms to track, pick your connection method (Native API, Apify, or Manual), and set your handles.</p>
            <Button onClick={() => setManagerOpen(true)}>Set Up Channels</Button>
          </div>
        </Card>
      ) : (
        <>
          <TabBar tabs={TAB_GROUPS} active={tab} onChange={setTab} />

          {tab === 'overview' && (
            <OverviewSummary enabledPlatforms={enabledPlatforms} metricsMap={metricsMap} config={config} historyMap={historyMap} />
          )}

          {tab === 'social' && (
            <div className="sd-channels-list">
              {socialPlatforms.length === 0 ? (
                <Card className="sd-empty-tab">No social media channels connected. Click "Manage Channels" to add some.</Card>
              ) : (
                socialPlatforms.map(key => (
                  <ChannelCard key={key} platformKey={key} metrics={metricsMap[key]} config={config} onManualEntry={openManualEntry} />
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
                  <ChannelCard key={key} platformKey={key} metrics={metricsMap[key]} config={config} onManualEntry={openManualEntry} />
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
                  <ChannelCard key={key} platformKey={key} metrics={metricsMap[key]} config={config} onManualEntry={openManualEntry} />
                ))
              )}
            </div>
          )}
        </>
      )}

      <ChannelManager open={managerOpen} onClose={() => setManagerOpen(false)} config={config} onSave={handleSaveConfig} />
      <ManualEntryPanel
        open={manualEntry.open}
        onClose={() => setManualEntry({ open: false, platform: null })}
        platformKey={manualEntry.platform}
        existingMetrics={metricsMap[manualEntry.platform]}
        onSaved={handleMetricsSaved}
      />
    </div>
  )
}

import { useState, useMemo } from 'react'
import { SectionHeader, Card, TabBar } from '../../components/ui/index.jsx'
import { useSocialChannels } from '../../lib/BrandContext'
import './SocialDashboard.css'

// ─── Platform Configs ────────────────────────────────────────────────────────
const PLATFORMS = {
  instagram:   { label: 'Instagram',       icon: '📷', color: '#E1306C', handle: '@wright_mode' },
  facebook:    { label: 'Facebook',        icon: '👥', color: '#1877F2', handle: 'Wright Mode RE' },
  tiktok:      { label: 'TikTok',         icon: '🎵', color: '#010101', handle: '@wright_mode' },
  youtube:     { label: 'YouTube',         icon: '▶️',  color: '#FF0000', handle: '@wright_mode' },
  linkedin:    { label: 'LinkedIn',        icon: '💼', color: '#0A66C2', handle: 'Dana Massey' },
  twitter:     { label: 'Twitter / X',     icon: '🐦', color: '#1DA1F2', handle: '@wright_mode' },
  gmb:         { label: 'Google Business', icon: '📍', color: '#4285F4', handle: 'Antigravity RE' },
  zillow:      { label: 'Zillow',          icon: '🏠', color: '#006AFF', handle: 'Dana Massey' },
  realtor_com: { label: 'Realtor.com',     icon: '🔑', color: '#D92228', handle: 'Dana Massey' },
  blog:        { label: 'Blog',            icon: '✍️',  color: '#524136', handle: 'antigravityre.com/blog' },
  website:     { label: 'Website',         icon: '🌐', color: '#524136', handle: 'antigravityre.com' },
  linktree:    { label: 'Linktree / Bio',  icon: '🔗', color: '#43E660', handle: 'linktr.ee/wright_mode' },
}

// ─── Demo Metrics (replace with real API data) ───────────────────────────────
const DEMO_METRICS = {
  instagram: {
    followers: 2847, followersChange: 124, followingCount: 891,
    postsThisWeek: 5, reachThisWeek: 8420, impressions: 12650,
    engagementRate: 4.2, engagementChange: 0.8,
    likesThisWeek: 342, commentsThisWeek: 48, sharesThisWeek: 67, savesThisWeek: 89,
    storiesViews: 1240, reelsPlays: 4580,
    topPosts: [
      { type: 'Reel', caption: 'Gilbert market update — median prices...', likes: 128, comments: 18, shares: 24, saves: 31 },
      { type: 'Carousel', caption: 'First-time buyer tips: 5 things your...', likes: 95, comments: 12, shares: 19, saves: 28 },
      { type: 'Reel', caption: 'Day in the life — showing 6 homes in...', likes: 87, comments: 14, shares: 11, saves: 15 },
    ],
    bestPostingTime: 'Tue & Thu, 6–8 PM',
    audienceGrowth: [2203, 2290, 2380, 2456, 2530, 2610, 2680, 2723, 2847],
  },
  facebook: {
    followers: 1650, followersChange: 42,
    postsThisWeek: 4, reachThisWeek: 3200, impressions: 5100,
    engagementRate: 2.8, engagementChange: 0.3,
    likesThisWeek: 156, commentsThisWeek: 28, sharesThisWeek: 34, savesThisWeek: 0,
    topPosts: [
      { type: 'Photo', caption: 'Just closed! Congrats to the Johnsons...', likes: 72, comments: 15, shares: 18, saves: 0 },
      { type: 'Link', caption: 'New blog: Why East Valley is still the...', likes: 45, comments: 8, shares: 12, saves: 0 },
    ],
    bestPostingTime: 'Wed & Sat, 10 AM–12 PM',
    audienceGrowth: [1420, 1450, 1490, 1520, 1558, 1580, 1610, 1630, 1650],
  },
  tiktok: {
    followers: 4120, followersChange: 380,
    postsThisWeek: 3, reachThisWeek: 18400, impressions: 28900,
    engagementRate: 6.1, engagementChange: 1.2,
    likesThisWeek: 890, commentsThisWeek: 124, sharesThisWeek: 210, savesThisWeek: 156,
    topPosts: [
      { type: 'Video', caption: 'POV: you find your dream home but...', likes: 420, comments: 56, shares: 98, saves: 72 },
      { type: 'Video', caption: 'Things your agent won\'t tell you...', likes: 310, comments: 42, shares: 67, saves: 48 },
    ],
    bestPostingTime: 'Mon & Fri, 7–9 PM',
    audienceGrowth: [2800, 3000, 3180, 3380, 3520, 3700, 3840, 3980, 4120],
  },
  youtube: {
    followers: 812, followersChange: 58,
    postsThisWeek: 1, reachThisWeek: 2400, impressions: 3800,
    engagementRate: 3.5, engagementChange: 0.5,
    likesThisWeek: 64, commentsThisWeek: 12, sharesThisWeek: 8, savesThisWeek: 0,
    topPosts: [
      { type: 'Video', caption: 'Full Gilbert neighborhood tour — which...', likes: 64, comments: 12, shares: 8, saves: 0 },
    ],
    bestPostingTime: 'Sunday, 2 PM',
    audienceGrowth: [580, 610, 640, 670, 700, 720, 750, 785, 812],
  },
  linkedin: {
    followers: 1230, followersChange: 35,
    postsThisWeek: 2, reachThisWeek: 1800, impressions: 2400,
    engagementRate: 3.1, engagementChange: 0.2,
    likesThisWeek: 42, commentsThisWeek: 8, sharesThisWeek: 5, savesThisWeek: 0,
    topPosts: [
      { type: 'Article', caption: 'The investor mindset shift happening in...', likes: 28, comments: 6, shares: 4, saves: 0 },
    ],
    bestPostingTime: 'Tue & Thu, 8–10 AM',
    audienceGrowth: [1050, 1070, 1090, 1120, 1140, 1165, 1185, 1210, 1230],
  },
  twitter: {
    followers: 540, followersChange: 18,
    postsThisWeek: 6, reachThisWeek: 1200, impressions: 2100,
    engagementRate: 1.9, engagementChange: -0.1,
    likesThisWeek: 38, commentsThisWeek: 6, sharesThisWeek: 12, savesThisWeek: 0,
    topPosts: [
      { type: 'Tweet', caption: 'Hot take: the best time to buy in AZ is...', likes: 22, comments: 4, shares: 8, saves: 0 },
    ],
    bestPostingTime: 'Weekdays, 12–1 PM',
    audienceGrowth: [440, 450, 462, 478, 490, 505, 515, 528, 540],
  },
  gmb: {
    followers: 0, followersChange: 0,
    reviews: 47, avgRating: 4.9, reviewsThisMonth: 3,
    searchAppearances: 1240, directSearches: 680, discoverySearches: 560,
    websiteClicks: 89, phoneCallClicks: 34, directionRequests: 22,
    topPosts: [],
    bestPostingTime: 'N/A',
    audienceGrowth: [],
  },
  zillow: {
    followers: 0, followersChange: 0,
    reviews: 28, avgRating: 5.0, profileViews: 340,
    listingsViewed: 12, contactRequests: 4,
    topPosts: [],
    bestPostingTime: 'N/A',
    audienceGrowth: [],
  },
  realtor_com: {
    followers: 0, followersChange: 0,
    reviews: 15, avgRating: 4.8, profileViews: 180,
    listingsViewed: 8, contactRequests: 2,
    topPosts: [],
    bestPostingTime: 'N/A',
    audienceGrowth: [],
  },
  blog: {
    followers: 0, followersChange: 0,
    postsThisWeek: 1, pageViews: 620, uniqueVisitors: 410,
    avgTimeOnPage: '2:45', bounceRate: 42,
    topPosts: [
      { type: 'Article', caption: 'Gilbert vs Mesa: Which East Valley city...', likes: 0, comments: 3, shares: 12, saves: 0 },
    ],
    bestPostingTime: 'Tuesday mornings',
    audienceGrowth: [],
  },
  website: {
    followers: 0, followersChange: 0,
    monthlyVisitors: 1850, uniqueVisitors: 1240,
    avgSessionDuration: '1:52', bounceRate: 55, pagesPerSession: 2.8,
    topPages: ['Home', 'Listings', 'About', 'Blog', 'Contact'],
    topPosts: [],
    bestPostingTime: 'N/A',
    audienceGrowth: [],
  },
  linktree: {
    followers: 0, followersChange: 0,
    totalClicks: 890, uniqueVisitors: 620,
    topLinks: [
      { label: 'Schedule a Call', clicks: 180 },
      { label: 'Featured Listings', clicks: 156 },
      { label: 'Buyer Guide PDF', clicks: 134 },
      { label: 'Instagram', clicks: 120 },
    ],
    topPosts: [],
    bestPostingTime: 'N/A',
    audienceGrowth: [],
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtNum(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function MiniSparkline({ data, color }) {
  if (!data?.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const h = 32
  const points = data.map((v, i) =>
    `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`
  ).join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sd-sparkline" style={{ '--spark-color': color }}>
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

// ─── Channel Tabs ────────────────────────────────────────────────────────────
const TAB_GROUPS = [
  { value: 'overview', label: 'Overview' },
  { value: 'social',   label: 'Social Media' },
  { value: 'reviews',  label: 'Reviews & SEO' },
  { value: 'web',      label: 'Web & Links' },
]

const SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'twitter']
const REVIEW_KEYS = ['gmb', 'zillow', 'realtor_com']
const WEB_KEYS    = ['blog', 'website', 'linktree']

// ─── Components ──────────────────────────────────────────────────────────────

function OverviewSummary() {
  const totalFollowers = SOCIAL_KEYS.reduce((s, k) => s + (DEMO_METRICS[k]?.followers || 0), 0)
  const totalGrowth = SOCIAL_KEYS.reduce((s, k) => s + (DEMO_METRICS[k]?.followersChange || 0), 0)
  const totalReach = SOCIAL_KEYS.reduce((s, k) => s + (DEMO_METRICS[k]?.reachThisWeek || 0), 0)
  const totalEngagement = SOCIAL_KEYS.reduce((s, k) => s + (DEMO_METRICS[k]?.likesThisWeek || 0) + (DEMO_METRICS[k]?.commentsThisWeek || 0) + (DEMO_METRICS[k]?.sharesThisWeek || 0), 0)
  const avgEngRate = (SOCIAL_KEYS.reduce((s, k) => s + (DEMO_METRICS[k]?.engagementRate || 0), 0) / SOCIAL_KEYS.length).toFixed(1)
  const totalReviews = REVIEW_KEYS.reduce((s, k) => s + (DEMO_METRICS[k]?.reviews || 0), 0)
  const avgRating = (REVIEW_KEYS.reduce((s, k) => s + (DEMO_METRICS[k]?.avgRating || 0), 0) / REVIEW_KEYS.length).toFixed(1)

  // Find best performing platform
  const bestPlatform = SOCIAL_KEYS.reduce((best, k) => {
    const m = DEMO_METRICS[k]
    return m.engagementRate > (DEMO_METRICS[best]?.engagementRate || 0) ? k : best
  }, SOCIAL_KEYS[0])

  // Find fastest growing
  const fastestGrowing = SOCIAL_KEYS.reduce((best, k) => {
    const m = DEMO_METRICS[k]
    return m.followersChange > (DEMO_METRICS[best]?.followersChange || 0) ? k : best
  }, SOCIAL_KEYS[0])

  return (
    <div className="sd-overview">
      {/* Hero Stats Row */}
      <div className="sd-hero-stats">
        <div className="sd-hero-stat">
          <span className="sd-hero-stat__value">{fmtNum(totalFollowers)}</span>
          <span className="sd-hero-stat__label">Total Followers</span>
          <span className="sd-hero-stat__delta sd-hero-stat__delta--up">+{fmtNum(totalGrowth)} this week</span>
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
          <span className="sd-hero-stat__value">{avgEngRate}%</span>
          <span className="sd-hero-stat__label">Avg Engagement Rate</span>
        </div>
        <div className="sd-hero-stat">
          <span className="sd-hero-stat__value">{totalReviews}</span>
          <span className="sd-hero-stat__label">Total Reviews</span>
          <span className="sd-hero-stat__delta sd-hero-stat__delta--up">{avgRating} avg rating</span>
        </div>
      </div>

      {/* Strategy Insights */}
      <Card className="sd-insights-card">
        <h3 className="sd-insights-card__title">Weekly Content Strategy Insights</h3>
        <div className="sd-insights-grid">
          <div className="sd-insight">
            <span className="sd-insight__icon">🏆</span>
            <div>
              <strong>Best Performing:</strong> {PLATFORMS[bestPlatform]?.label} at {DEMO_METRICS[bestPlatform]?.engagementRate}% engagement
            </div>
          </div>
          <div className="sd-insight">
            <span className="sd-insight__icon">🚀</span>
            <div>
              <strong>Fastest Growing:</strong> {PLATFORMS[fastestGrowing]?.label} (+{DEMO_METRICS[fastestGrowing]?.followersChange} this week)
            </div>
          </div>
          <div className="sd-insight">
            <span className="sd-insight__icon">📊</span>
            <div>
              <strong>Top Content Type:</strong> Short-form video (Reels + TikTok) driving 3x more shares than static posts
            </div>
          </div>
          <div className="sd-insight">
            <span className="sd-insight__icon">💡</span>
            <div>
              <strong>Recommendation:</strong> Market update posts + day-in-the-life Reels are your top performers. Double down on behind-the-scenes content this week.
            </div>
          </div>
        </div>
      </Card>

      {/* Platform Summary Cards */}
      <h3 className="sd-section-title">All Channels at a Glance</h3>
      <div className="sd-platform-grid">
        {Object.entries(PLATFORMS).map(([key, platform]) => {
          const m = DEMO_METRICS[key]
          if (!m) return null
          const isSocial = SOCIAL_KEYS.includes(key)
          const isReview = REVIEW_KEYS.includes(key)

          return (
            <div key={key} className="sd-platform-mini" style={{ '--platform-color': platform.color }}>
              <div className="sd-platform-mini__header">
                <span className="sd-platform-mini__icon">{platform.icon}</span>
                <div>
                  <span className="sd-platform-mini__name">{platform.label}</span>
                  <span className="sd-platform-mini__handle">{platform.handle}</span>
                </div>
              </div>
              <div className="sd-platform-mini__stats">
                {isSocial && (
                  <>
                    <MetricPill label="followers" value={fmtNum(m.followers)} />
                    <MetricPill label="eng. rate" value={`${m.engagementRate}%`} />
                    <MetricPill label="reach" value={fmtNum(m.reachThisWeek)} />
                  </>
                )}
                {isReview && (
                  <>
                    <MetricPill label="reviews" value={m.reviews} />
                    <MetricPill label="rating" value={`${m.avgRating}`} icon="⭐" />
                  </>
                )}
                {key === 'blog' && (
                  <>
                    <MetricPill label="page views" value={fmtNum(m.pageViews)} />
                    <MetricPill label="avg time" value={m.avgTimeOnPage} />
                  </>
                )}
                {key === 'website' && (
                  <>
                    <MetricPill label="monthly visitors" value={fmtNum(m.monthlyVisitors)} />
                    <MetricPill label="pages/session" value={m.pagesPerSession} />
                  </>
                )}
                {key === 'linktree' && (
                  <>
                    <MetricPill label="total clicks" value={fmtNum(m.totalClicks)} />
                    <MetricPill label="visitors" value={fmtNum(m.uniqueVisitors)} />
                  </>
                )}
              </div>
              {m.audienceGrowth?.length > 0 && (
                <MiniSparkline data={m.audienceGrowth} color={platform.color} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SocialChannelDetail({ platformKey }) {
  const platform = PLATFORMS[platformKey]
  const m = DEMO_METRICS[platformKey]
  if (!platform || !m) return null

  return (
    <div className="sd-channel-detail" style={{ '--platform-color': platform.color }}>
      <div className="sd-channel-detail__header">
        <span className="sd-channel-detail__icon">{platform.icon}</span>
        <div>
          <h3 className="sd-channel-detail__name">{platform.label}</h3>
          <span className="sd-channel-detail__handle">{platform.handle}</span>
        </div>
        <div className="sd-channel-detail__badge">
          <span className="sd-channel-detail__eng">{m.engagementRate}%</span>
          <span className="sd-channel-detail__eng-label">engagement</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="sd-metrics-row">
        <div className="sd-metric-card">
          <span className="sd-metric-card__value">{fmtNum(m.followers)}</span>
          <span className="sd-metric-card__label">Followers</span>
          {m.followersChange > 0 && (
            <span className="sd-metric-card__delta sd-metric-card__delta--up">+{m.followersChange}</span>
          )}
        </div>
        <div className="sd-metric-card">
          <span className="sd-metric-card__value">{fmtNum(m.reachThisWeek)}</span>
          <span className="sd-metric-card__label">Reach</span>
        </div>
        <div className="sd-metric-card">
          <span className="sd-metric-card__value">{fmtNum(m.impressions)}</span>
          <span className="sd-metric-card__label">Impressions</span>
        </div>
        <div className="sd-metric-card">
          <span className="sd-metric-card__value">{m.postsThisWeek}</span>
          <span className="sd-metric-card__label">Posts This Week</span>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="sd-engagement-row">
        <div className="sd-eng-stat"><span className="sd-eng-stat__icon">❤️</span> <strong>{m.likesThisWeek}</strong> likes</div>
        <div className="sd-eng-stat"><span className="sd-eng-stat__icon">💬</span> <strong>{m.commentsThisWeek}</strong> comments</div>
        <div className="sd-eng-stat"><span className="sd-eng-stat__icon">🔄</span> <strong>{m.sharesThisWeek}</strong> shares</div>
        {m.savesThisWeek > 0 && (
          <div className="sd-eng-stat"><span className="sd-eng-stat__icon">🔖</span> <strong>{m.savesThisWeek}</strong> saves</div>
        )}
      </div>

      {/* Platform-specific extras */}
      {platformKey === 'instagram' && (
        <div className="sd-extras-row">
          <MetricPill label="stories views" value={fmtNum(m.storiesViews)} icon="📱" />
          <MetricPill label="reels plays" value={fmtNum(m.reelsPlays)} icon="🎬" />
        </div>
      )}

      {/* Audience Growth Sparkline */}
      {m.audienceGrowth?.length > 0 && (
        <div className="sd-growth-section">
          <span className="sd-growth-section__label">Audience Growth (9 weeks)</span>
          <MiniSparkline data={m.audienceGrowth} color={platform.color} />
        </div>
      )}

      {/* Best Posting Time */}
      {m.bestPostingTime && m.bestPostingTime !== 'N/A' && (
        <div className="sd-best-time">
          <span className="sd-best-time__icon">🕐</span>
          <span>Best posting time: <strong>{m.bestPostingTime}</strong></span>
        </div>
      )}

      {/* Top Posts */}
      {m.topPosts?.length > 0 && (
        <div className="sd-top-posts">
          <h4 className="sd-top-posts__title">Top Performing Posts</h4>
          {m.topPosts.map((post, i) => (
            <div key={i} className="sd-post-row">
              <span className="sd-post-row__rank">#{i + 1}</span>
              <span className="sd-post-row__type">{post.type}</span>
              <span className="sd-post-row__caption">{post.caption}</span>
              <div className="sd-post-row__stats">
                <span>❤️ {post.likes}</span>
                <span>💬 {post.comments}</span>
                <span>🔄 {post.shares}</span>
                {post.saves > 0 && <span>🔖 {post.saves}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ReviewsDetail({ platformKey }) {
  const platform = PLATFORMS[platformKey]
  const m = DEMO_METRICS[platformKey]
  if (!platform || !m) return null

  return (
    <div className="sd-channel-detail" style={{ '--platform-color': platform.color }}>
      <div className="sd-channel-detail__header">
        <span className="sd-channel-detail__icon">{platform.icon}</span>
        <div>
          <h3 className="sd-channel-detail__name">{platform.label}</h3>
          <span className="sd-channel-detail__handle">{platform.handle}</span>
        </div>
        {m.avgRating && (
          <div className="sd-channel-detail__badge">
            <span className="sd-channel-detail__eng">{m.avgRating}</span>
            <span className="sd-channel-detail__eng-label">avg rating</span>
          </div>
        )}
      </div>
      <div className="sd-metrics-row">
        <div className="sd-metric-card">
          <span className="sd-metric-card__value">{m.reviews}</span>
          <span className="sd-metric-card__label">Total Reviews</span>
        </div>
        {m.reviewsThisMonth !== undefined && (
          <div className="sd-metric-card">
            <span className="sd-metric-card__value">{m.reviewsThisMonth}</span>
            <span className="sd-metric-card__label">This Month</span>
          </div>
        )}
        {m.searchAppearances && (
          <div className="sd-metric-card">
            <span className="sd-metric-card__value">{fmtNum(m.searchAppearances)}</span>
            <span className="sd-metric-card__label">Search Appearances</span>
          </div>
        )}
        {m.profileViews && (
          <div className="sd-metric-card">
            <span className="sd-metric-card__value">{m.profileViews}</span>
            <span className="sd-metric-card__label">Profile Views</span>
          </div>
        )}
        {m.websiteClicks && (
          <div className="sd-metric-card">
            <span className="sd-metric-card__value">{m.websiteClicks}</span>
            <span className="sd-metric-card__label">Website Clicks</span>
          </div>
        )}
        {m.phoneCallClicks && (
          <div className="sd-metric-card">
            <span className="sd-metric-card__value">{m.phoneCallClicks}</span>
            <span className="sd-metric-card__label">Phone Calls</span>
          </div>
        )}
        {m.contactRequests && (
          <div className="sd-metric-card">
            <span className="sd-metric-card__value">{m.contactRequests}</span>
            <span className="sd-metric-card__label">Contact Requests</span>
          </div>
        )}
      </div>
      {platformKey === 'gmb' && (
        <div className="sd-extras-row">
          <MetricPill label="direct searches" value={fmtNum(m.directSearches)} icon="🔍" />
          <MetricPill label="discovery" value={fmtNum(m.discoverySearches)} icon="🗺️" />
          <MetricPill label="directions" value={m.directionRequests} icon="📍" />
        </div>
      )}
    </div>
  )
}

function WebDetail({ platformKey }) {
  const platform = PLATFORMS[platformKey]
  const m = DEMO_METRICS[platformKey]
  if (!platform || !m) return null

  return (
    <div className="sd-channel-detail" style={{ '--platform-color': platform.color }}>
      <div className="sd-channel-detail__header">
        <span className="sd-channel-detail__icon">{platform.icon}</span>
        <div>
          <h3 className="sd-channel-detail__name">{platform.label}</h3>
          <span className="sd-channel-detail__handle">{platform.handle}</span>
        </div>
      </div>
      <div className="sd-metrics-row">
        {platformKey === 'blog' && (
          <>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{m.postsThisWeek}</span>
              <span className="sd-metric-card__label">Posts This Week</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{fmtNum(m.pageViews)}</span>
              <span className="sd-metric-card__label">Page Views</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{fmtNum(m.uniqueVisitors)}</span>
              <span className="sd-metric-card__label">Unique Visitors</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{m.avgTimeOnPage}</span>
              <span className="sd-metric-card__label">Avg Time on Page</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{m.bounceRate}%</span>
              <span className="sd-metric-card__label">Bounce Rate</span>
            </div>
          </>
        )}
        {platformKey === 'website' && (
          <>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{fmtNum(m.monthlyVisitors)}</span>
              <span className="sd-metric-card__label">Monthly Visitors</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{fmtNum(m.uniqueVisitors)}</span>
              <span className="sd-metric-card__label">Unique Visitors</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{m.avgSessionDuration}</span>
              <span className="sd-metric-card__label">Avg Session</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{m.pagesPerSession}</span>
              <span className="sd-metric-card__label">Pages / Session</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{m.bounceRate}%</span>
              <span className="sd-metric-card__label">Bounce Rate</span>
            </div>
          </>
        )}
        {platformKey === 'linktree' && (
          <>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{fmtNum(m.totalClicks)}</span>
              <span className="sd-metric-card__label">Total Clicks</span>
            </div>
            <div className="sd-metric-card">
              <span className="sd-metric-card__value">{fmtNum(m.uniqueVisitors)}</span>
              <span className="sd-metric-card__label">Unique Visitors</span>
            </div>
          </>
        )}
      </div>

      {/* Linktree top links */}
      {platformKey === 'linktree' && m.topLinks?.length > 0 && (
        <div className="sd-top-posts">
          <h4 className="sd-top-posts__title">Top Links</h4>
          {m.topLinks.map((link, i) => (
            <div key={i} className="sd-post-row">
              <span className="sd-post-row__rank">#{i + 1}</span>
              <span className="sd-post-row__caption">{link.label}</span>
              <div className="sd-post-row__stats">
                <span>{link.clicks} clicks</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Website top pages */}
      {platformKey === 'website' && m.topPages?.length > 0 && (
        <div className="sd-top-posts">
          <h4 className="sd-top-posts__title">Top Pages</h4>
          {m.topPages.map((page, i) => (
            <div key={i} className="sd-post-row">
              <span className="sd-post-row__rank">#{i + 1}</span>
              <span className="sd-post-row__caption">{page}</span>
            </div>
          ))}
        </div>
      )}

      {/* Blog top posts */}
      {platformKey === 'blog' && m.topPosts?.length > 0 && (
        <div className="sd-top-posts">
          <h4 className="sd-top-posts__title">Top Posts</h4>
          {m.topPosts.map((post, i) => (
            <div key={i} className="sd-post-row">
              <span className="sd-post-row__rank">#{i + 1}</span>
              <span className="sd-post-row__type">{post.type}</span>
              <span className="sd-post-row__caption">{post.caption}</span>
              <div className="sd-post-row__stats">
                <span>💬 {post.comments}</span>
                <span>🔄 {post.shares}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function SocialDashboard() {
  const [tab, setTab] = useState('overview')
  const channels = useSocialChannels()

  return (
    <div className="social-dashboard">
      <SectionHeader
        title="Social Media Dashboard"
        subtitle="Performance metrics across all your channels — updated weekly"
      />

      <div className="sd-last-updated">
        Last updated: Mar 22, 2026 at 9:06 PM (auto-updates every Sunday)
      </div>

      <TabBar tabs={TAB_GROUPS} active={tab} onChange={setTab} />

      {tab === 'overview' && <OverviewSummary />}

      {tab === 'social' && (
        <div className="sd-channels-list">
          {SOCIAL_KEYS.map(key => (
            <SocialChannelDetail key={key} platformKey={key} />
          ))}
        </div>
      )}

      {tab === 'reviews' && (
        <div className="sd-channels-list">
          {REVIEW_KEYS.map(key => (
            <ReviewsDetail key={key} platformKey={key} />
          ))}
        </div>
      )}

      {tab === 'web' && (
        <div className="sd-channels-list">
          {WEB_KEYS.map(key => (
            <WebDetail key={key} platformKey={key} />
          ))}
        </div>
      )}
    </div>
  )
}

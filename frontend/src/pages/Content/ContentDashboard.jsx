import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { StatCard, Badge } from '../../components/ui/index.jsx'
import { useContentPillars, useContentPieces } from '../../lib/hooks.js'
import './ContentDashboard.css'

function DashCard({ title, children, className = '' }) {
  return (
    <div className={`sd-card ${className}`}>
      <h3 className="sd-card__title">{title}</h3>
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

  const { data: pillars, loading } = useContentPillars()
  const { data: pieces } = useContentPieces(fromDate, toDate)

  const p = pillars ?? []
  const pc = pieces ?? []

  // Stats
  const published = pc.filter(x => x.status === 'published')
  const scheduled = pc.filter(x => x.status === 'scheduled')
  const draft = pc.filter(x => x.status === 'draft')

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
  const pillarMap = {}
  pc.forEach(x => {
    const pId = x.pillar_id
    if (pId) pillarMap[pId] = (pillarMap[pId] || 0) + 1
  })

  if (loading) return <div className="section-dash"><div className="sd-loading">Loading content data...</div></div>

  return (
    <div className="section-dash content-dash">

      <div className="section-dash__kpis">
        <StatCard label="Content Pillars" value={p.length} accent />
        <StatCard label="Published This Month" value={published.length} />
        <StatCard label="Scheduled" value={scheduled.length} />
        <StatCard label="Drafts" value={draft.length} />
        <StatCard label="Total This Month" value={pc.length} />
      </div>

      <div className="sd-row sd-row--60-40">
        <DashCard title="Content Pillars">
          {p.length > 0 ? (
            <div className="ct-pillars">
              {p.map(pillar => {
                const count = pillarMap[pillar.id] || 0
                return (
                  <div key={pillar.id} className="ct-pillar-row">
                    <div className="ct-pillar-row__left">
                      <span className="ct-pillar-row__color" style={{ background: pillar.color || 'var(--brown-mid)' }} />
                      <span className="ct-pillar-row__name">{pillar.name}</span>
                    </div>
                    <Badge variant="accent" size="sm">{count} piece{count !== 1 ? 's' : ''}</Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="ct-empty-pillars">
              <p className="sd-empty">No content pillars set up yet</p>
              <Link to="/content/calendar" className="ct-setup-link">Set up pillars in Content Calendar</Link>
            </div>
          )}
        </DashCard>

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
      </div>

      <div className="sd-row sd-row--50-50">
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
              <span className="ct-monthly__val">{draft.length}</span>
              <span className="ct-monthly__label">Drafts</span>
            </div>
          </div>
        </DashCard>
      </div>

      <div className="sd-row sd-row--33-33-33">
        <Link to="/content/calendar" className="ct-quick-link">
          <span className="ct-quick-link__icon">📅</span>
          <span>Calendar</span>
        </Link>
        <Link to="/content/social" className="ct-quick-link">
          <span className="ct-quick-link__icon">📱</span>
          <span>Social Media</span>
        </Link>
        <Link to="/content/ai-studio" className="ct-quick-link">
          <span className="ct-quick-link__icon">⚡</span>
          <span>AI Studio</span>
        </Link>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { StatCard, Badge } from '../../components/ui/index.jsx'
import * as campaignsApi from '../../lib/campaigns'
import './CampaignsDashboard.css'

function DashCard({ title, children, className = '' }) {
  return (
    <div className={`sd-card ${className}`}>
      <h3 className="sd-card__title">{title}</h3>
      {children}
    </div>
  )
}

const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString('en-US', {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
}) : ''

export default function CampaignsDashboard() {
  const [campaigns, setCampaigns] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cs, es, hs] = await Promise.all([
          campaignsApi.listCampaigns(),
          campaignsApi.listEnrollments(),
          campaignsApi.listAuditLog({ limit: 10 }),
        ])
        if (cancelled) return
        setCampaigns(cs)
        setEnrollments(es)
        setHistory(hs)
      } catch (err) {
        console.error('[CampaignsDashboard] load failed:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const active    = campaigns.filter(c => c.status === 'active')
  const paused    = campaigns.filter(c => c.status === 'paused')
  const completed = campaigns.filter(c => c.status === 'completed')

  const activeEnrollments    = enrollments.filter(e => e.status === 'active')
  const completedEnrollments = enrollments.filter(e => e.status === 'completed')

  // Messages due today: active enrollments with next_send_at <= end of today
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  const dueToday = enrollments.filter(e =>
    e.status === 'active' &&
    e.next_send_at &&
    new Date(e.next_send_at) <= endOfToday
  )

  const recentHistory = history.slice(0, 6)

  if (loading) {
    return <div className="section-dash camp-dash" style={{ padding: 40, textAlign: 'center', color: '#888' }}>
      Loading campaigns…
    </div>
  }

  return (
    <div className="section-dash camp-dash">

      <div className="section-dash__kpis">
        <StatCard label="Active Campaigns" value={active.length} accent />
        <StatCard label="Paused" value={paused.length} />
        <StatCard label="Enrollments" value={activeEnrollments.length} />
        <StatCard label="Due Today" value={dueToday.length} />
        <StatCard label="Completed" value={completedEnrollments.length} />
      </div>

      <div className="sd-row sd-row--60-40">
        <DashCard title="Active Campaigns">
          {active.length > 0 ? (
            <div className="camp-list">
              {active.map(c => (
                <div key={c.id} className="camp-row">
                  <div className="camp-row__left">
                    <span className="camp-row__name">{c.name}</span>
                    <span className="camp-row__meta">{c.steps?.length ?? 0} steps · {enrollments.filter(e => e.campaign_id === c.id && e.status === 'active').length} enrolled</span>
                  </div>
                  <Badge variant="success" size="sm">Active</Badge>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No active campaigns — create one to get started</p>}
        </DashCard>

        <DashCard title="Send Queue">
          {dueToday.length > 0 ? (
            <div className="camp-queue">
              {dueToday.slice(0, 5).map((e) => (
                <div key={e.id} className="camp-queue-row">
                  <span className="camp-queue-row__name">Enrollment {e.id.slice(0, 8)}</span>
                  <Badge variant="warning" size="sm">Due Today</Badge>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No messages due today</p>}
        </DashCard>
      </div>

      <div className="sd-row sd-row--50-50">
        <DashCard title="Campaign Overview">
          <div className="camp-overview">
            <div className="camp-overview__stat camp-overview__stat--active">
              <span className="camp-overview__val">{active.length}</span>
              <span className="camp-overview__label">Active</span>
            </div>
            <div className="camp-overview__stat camp-overview__stat--paused">
              <span className="camp-overview__val">{paused.length}</span>
              <span className="camp-overview__label">Paused</span>
            </div>
            <div className="camp-overview__stat camp-overview__stat--done">
              <span className="camp-overview__val">{completed.length}</span>
              <span className="camp-overview__label">Completed</span>
            </div>
            <div className="camp-overview__stat camp-overview__stat--total">
              <span className="camp-overview__val">{campaigns.length}</span>
              <span className="camp-overview__label">Total</span>
            </div>
          </div>
        </DashCard>

        <DashCard title="Recent Activity">
          {recentHistory.length > 0 ? (
            <div className="camp-history">
              {recentHistory.map((h) => (
                <div key={h.id} className="camp-history-row">
                  <span className="camp-history-row__text">{h.detail ?? h.action ?? 'Activity'}</span>
                  <span className="camp-history-row__date">{fmtDateTime(h.created_at)}</span>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No campaign activity yet</p>}
        </DashCard>
      </div>

      <div className="sd-row sd-row--33-33-33">
        <Link to="/campaigns/manage" className="camp-quick-link">
          <span className="camp-quick-link__icon">🚀</span>
          <span>Manage Campaigns</span>
        </Link>
        <Link to="/campaigns/enrollments" className="camp-quick-link">
          <span className="camp-quick-link__icon">👥</span>
          <span>Enrollments</span>
        </Link>
        <Link to="/campaigns/templates" className="camp-quick-link">
          <span className="camp-quick-link__icon">📋</span>
          <span>Templates</span>
        </Link>
      </div>
    </div>
  )
}

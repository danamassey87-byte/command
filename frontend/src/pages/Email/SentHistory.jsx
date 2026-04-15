import { useState, useEffect, useMemo } from 'react'
import { SectionHeader, Badge } from '../../components/ui/index.jsx'
import supabase from '../../lib/supabase'
import './SentHistory.css'

const PAGE_SIZE = 25

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const STATUS_MAP = {
  sent: { label: 'Sent', variant: 'info' },
  delivered: { label: 'Delivered', variant: 'success' },
  opened: { label: 'Opened', variant: 'success' },
  clicked: { label: 'Clicked', variant: 'accent' },
  bounced: { label: 'Bounced', variant: 'danger' },
  failed: { label: 'Failed', variant: 'danger' },
  complained: { label: 'Spam', variant: 'danger' },
  unsubscribed: { label: 'Unsub', variant: 'warning' },
  replied: { label: 'Replied', variant: 'success' },
}

export default function SentHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  // Load campaign step history
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Get step history with enrollment → contact info
        const { data: steps } = await supabase
          .from('campaign_step_history')
          .select(`
            id, enrollment_id, step_index, step_type, subject, sent_at,
            sent_via, resend_email_id, delivery_status, error_message,
            opened_at, clicked_at, bounced_at, replied_at, reply_detected
          `)
          .order('sent_at', { ascending: false })
          .limit(200)

        if (!steps?.length) {
          setHistory([])
          setLoading(false)
          return
        }

        // Fetch enrollment data to get contact names
        const enrollmentIds = [...new Set(steps.map(s => s.enrollment_id).filter(Boolean))]
        let enrollmentMap = {}
        if (enrollmentIds.length) {
          const { data: enrollments } = await supabase
            .from('campaign_enrollments')
            .select('id, campaign_id, contact_id')
            .in('id', enrollmentIds)

          if (enrollments?.length) {
            // Get campaign names
            const campaignIds = [...new Set(enrollments.map(e => e.campaign_id).filter(Boolean))]
            const { data: campaigns } = await supabase
              .from('campaigns')
              .select('id, name')
              .in('id', campaignIds)
            const campMap = Object.fromEntries((campaigns || []).map(c => [c.id, c.name]))

            // Get contact names
            const contactIds = [...new Set(enrollments.map(e => e.contact_id).filter(Boolean))]
            const { data: contacts } = await supabase
              .from('contacts')
              .select('id, name, email')
              .in('id', contactIds)
            const contactMap = Object.fromEntries((contacts || []).map(c => [c.id, c]))

            for (const e of enrollments) {
              enrollmentMap[e.id] = {
                campaignName: campMap[e.campaign_id] || 'Unknown Campaign',
                contact: contactMap[e.contact_id] || { name: 'Unknown', email: '' },
              }
            }
          }
        }

        // Merge
        const enriched = steps.map(s => ({
          ...s,
          campaignName: enrollmentMap[s.enrollment_id]?.campaignName || '—',
          contactName: enrollmentMap[s.enrollment_id]?.contact?.name || '—',
          contactEmail: enrollmentMap[s.enrollment_id]?.contact?.email || '',
          // Derive effective status
          effectiveStatus: s.bounced_at ? 'bounced'
            : s.clicked_at ? 'clicked'
            : s.opened_at ? 'opened'
            : s.delivery_status || 'sent',
        }))

        setHistory(enriched)
      } catch (err) {
        console.error('Failed to load sent history:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Stats
  const stats = useMemo(() => {
    const total = history.length
    const delivered = history.filter(h => ['delivered', 'opened', 'clicked'].includes(h.effectiveStatus)).length
    const opened = history.filter(h => h.opened_at).length
    const clicked = history.filter(h => h.clicked_at).length
    const bounced = history.filter(h => h.effectiveStatus === 'bounced' || h.effectiveStatus === 'failed').length
    const replied = history.filter(h => h.reply_detected).length
    return {
      total,
      delivered,
      opened,
      clicked,
      bounced,
      replied,
      openRate: total > 0 ? ((opened / total) * 100).toFixed(1) : '0.0',
      clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : '0.0',
    }
  }, [history])

  // Filter + search
  const filtered = useMemo(() => {
    let list = history
    if (filter === 'replied') {
      list = list.filter(h => h.reply_detected)
    } else if (filter !== 'all') {
      list = list.filter(h => h.effectiveStatus === filter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(h =>
        (h.subject || '').toLowerCase().includes(q) ||
        (h.contactName || '').toLowerCase().includes(q) ||
        (h.campaignName || '').toLowerCase().includes(q) ||
        (h.contactEmail || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [history, filter, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="sent-history">
      <SectionHeader
        title="Sent History"
        subtitle="Track and review all sent emails"
      />

      {/* Stats Row */}
      <div className="sh__stats-row">
        <div className="sh__stat">
          <span className="sh__stat-val">{stats.total}</span>
          <span className="sh__stat-label">Total Sent</span>
        </div>
        <div className="sh__stat">
          <span className="sh__stat-val" style={{ color: 'var(--color-success)' }}>{stats.delivered}</span>
          <span className="sh__stat-label">Delivered</span>
        </div>
        <div className="sh__stat">
          <span className="sh__stat-val" style={{ color: 'var(--color-info)' }}>{stats.openRate}%</span>
          <span className="sh__stat-label">Open Rate</span>
        </div>
        <div className="sh__stat">
          <span className="sh__stat-val" style={{ color: '#8b7ec8' }}>{stats.clickRate}%</span>
          <span className="sh__stat-label">Click Rate</span>
        </div>
        <div className="sh__stat">
          <span className="sh__stat-val" style={{ color: 'var(--color-danger)' }}>{stats.bounced}</span>
          <span className="sh__stat-label">Bounced</span>
        </div>
        <div className="sh__stat">
          <span className="sh__stat-val" style={{ color: '#7a93b7' }}>{stats.replied}</span>
          <span className="sh__stat-label">Replied</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sh__toolbar">
        <input
          className="sh__search"
          placeholder="Search by subject, contact, or campaign..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
        />
        <div className="sh__filters">
          {['all', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed'].map(f => (
            <button
              key={f}
              className={`sh__filter-btn ${filter === f ? 'sh__filter-btn--active' : ''}`}
              onClick={() => { setFilter(f); setPage(0) }}
            >
              {f === 'all' ? 'All' : STATUS_MAP[f]?.label || f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="sh__loading">Loading sent history...</div>
      ) : filtered.length === 0 ? (
        <div className="sh__empty">
          <p className="sh__empty-title">No sent emails found</p>
          <p className="sh__empty-sub">
            {history.length === 0
              ? 'Emails sent from Smart Campaigns will appear here. Start a campaign to see results.'
              : 'No emails match your current filter.'}
          </p>
        </div>
      ) : (
        <>
          <div className="sh__table-wrap">
            <table className="sh__table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Contact</th>
                  <th>Subject</th>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Sent</th>
                  <th>Engagement</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map(row => {
                  const s = STATUS_MAP[row.effectiveStatus] || { label: row.effectiveStatus, variant: 'info' }
                  return (
                    <tr key={row.id}>
                      <td><Badge variant={s.variant} size="sm">{s.label}</Badge></td>
                      <td>
                        <span className="sh__contact-name">{row.contactName}</span>
                        {row.contactEmail && <span className="sh__contact-email">{row.contactEmail}</span>}
                      </td>
                      <td className="sh__subject">{row.subject || '(no subject)'}</td>
                      <td className="sh__campaign">{row.campaignName}</td>
                      <td><Badge variant={row.step_type === 'sms' ? 'warning' : 'info'} size="sm">{row.step_type || 'email'}</Badge></td>
                      <td className="sh__date">{fmtDateTime(row.sent_at)}</td>
                      <td className="sh__engagement">
                        {row.reply_detected && <span className="sh__eng-pill sh__eng-pill--replied" title={`Replied ${fmtDateTime(row.replied_at)}`}>Replied</span>}
                        {row.opened_at && <span className="sh__eng-pill sh__eng-pill--opened" title={`Opened ${fmtDateTime(row.opened_at)}`}>Opened</span>}
                        {row.clicked_at && <span className="sh__eng-pill sh__eng-pill--clicked" title={`Clicked ${fmtDateTime(row.clicked_at)}`}>Clicked</span>}
                        {row.error_message && <span className="sh__eng-pill sh__eng-pill--error" title={row.error_message}>Error</span>}
                        {!row.opened_at && !row.clicked_at && !row.error_message && !row.reply_detected && <span className="sh__eng-pill sh__eng-pill--none">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="sh__pagination">
              <button className="sh__page-btn" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span className="sh__page-info">Page {page + 1} of {totalPages} · {filtered.length} emails</span>
              <button className="sh__page-btn" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

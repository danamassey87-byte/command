import { useState, useEffect, useMemo } from 'react'
import { SectionHeader, Card, TabBar, Badge } from '../../components/ui/index.jsx'
import supabase from '../../lib/supabase'
import './SentHistory.css'

const fmt = v => v?.toLocaleString() ?? '0'
const pct = (n, d) => d > 0 ? `${Math.round((n / d) * 100)}%` : '—'

export default function EmailReporting() {
  const [data, setData] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [contacts, setContacts] = useState({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [contactSearch, setContactSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [{ data: steps }, { data: camps }, { data: enrollments }, { data: ctcts }] = await Promise.all([
          supabase.from('campaign_step_history').select('*').order('sent_at', { ascending: false }).limit(500),
          supabase.from('campaigns').select('id, name, status, type').is('deleted_at', null),
          supabase.from('campaign_enrollments').select('id, campaign_id, contact_id, status'),
          supabase.from('contacts').select('id, name, email, type'),
        ])
        setData(steps ?? [])
        setCampaigns(camps ?? [])
        const contactMap = {}
        for (const c of (ctcts ?? [])) contactMap[c.id] = c
        // Map enrollment_id → contact
        const enrollMap = {}
        for (const e of (enrollments ?? [])) enrollMap[e.id] = e
        setContacts({ contactMap, enrollMap })
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Aggregate stats
  const stats = useMemo(() => {
    const total = data.length
    const delivered = data.filter(d => d.delivery_status === 'delivered' || d.opened_at).length
    const opened = data.filter(d => d.opened_at).length
    const clicked = data.filter(d => d.clicked_at).length
    const bounced = data.filter(d => d.bounced_at || d.delivery_status === 'bounced').length
    const replied = data.filter(d => d.replied_at || d.reply_detected).length
    return { total, delivered, opened, clicked, bounced, replied }
  }, [data])

  // Per-campaign stats
  const campaignStats = useMemo(() => {
    const byEnrollment = {}
    for (const d of data) {
      if (!d.enrollment_id) continue
      if (!byEnrollment[d.enrollment_id]) byEnrollment[d.enrollment_id] = []
      byEnrollment[d.enrollment_id].push(d)
    }

    const byCampaign = {}
    for (const [eid, steps] of Object.entries(byEnrollment)) {
      const enrollment = contacts.enrollMap?.[eid]
      if (!enrollment) continue
      const cid = enrollment.campaign_id
      if (!byCampaign[cid]) byCampaign[cid] = { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, enrollments: new Set() }
      byCampaign[cid].enrollments.add(enrollment.id)
      for (const s of steps) {
        byCampaign[cid].sent++
        if (s.opened_at) byCampaign[cid].opened++
        if (s.clicked_at) byCampaign[cid].clicked++
        if (s.replied_at || s.reply_detected) byCampaign[cid].replied++
        if (s.bounced_at) byCampaign[cid].bounced++
      }
    }

    return campaigns.map(c => ({
      ...c,
      ...(byCampaign[c.id] || { sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, enrollments: new Set() }),
      enrollmentCount: (byCampaign[c.id]?.enrollments?.size ?? 0),
    })).sort((a, b) => b.sent - a.sent)
  }, [data, campaigns, contacts])

  // Per-contact email history
  const contactHistory = useMemo(() => {
    const byContact = {}
    for (const d of data) {
      const enrollment = contacts.enrollMap?.[d.enrollment_id]
      if (!enrollment) continue
      const cid = enrollment.contact_id
      if (!byContact[cid]) byContact[cid] = []
      byContact[cid].push({ ...d, campaignId: enrollment.campaign_id })
    }
    let result = Object.entries(byContact).map(([cid, msgs]) => {
      const contact = contacts.contactMap?.[cid]
      return {
        contactId: cid,
        name: contact?.name ?? 'Unknown',
        email: contact?.email ?? '',
        type: contact?.type ?? '',
        total: msgs.length,
        opened: msgs.filter(m => m.opened_at).length,
        replied: msgs.filter(m => m.replied_at || m.reply_detected).length,
        messages: msgs.sort((a, b) => (b.sent_at ?? '').localeCompare(a.sent_at ?? '')),
      }
    }).sort((a, b) => b.total - a.total)

    if (contactSearch) {
      const q = contactSearch.toLowerCase()
      result = result.filter(r => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))
    }
    return result
  }, [data, contacts, contactSearch])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--brown-light)' }}>Loading reporting data...</div>

  return (
    <div>
      <SectionHeader title="Email Reporting" subtitle="Campaign performance and client email history" />

      <TabBar
        tabs={[
          { label: 'Overview', value: 'overview' },
          { label: `By Campaign (${campaignStats.length})`, value: 'campaigns' },
          { label: `By Client (${contactHistory.length})`, value: 'clients' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Total Sent', value: fmt(stats.total), color: 'var(--brown-dark)' },
            { label: 'Delivered', value: fmt(stats.delivered), color: 'var(--color-success)' },
            { label: 'Open Rate', value: pct(stats.opened, stats.total), color: 'var(--color-info, #5b9bd5)' },
            { label: 'Click Rate', value: pct(stats.clicked, stats.total), color: 'var(--brown-mid)' },
            { label: 'Reply Rate', value: pct(stats.replied, stats.total), color: 'var(--color-success)' },
            { label: 'Bounce Rate', value: pct(stats.bounced, stats.total), color: 'var(--color-danger)' },
          ].map(kpi => (
            <Card key={kpi.label} style={{ padding: 16, textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: kpi.color, margin: 0 }}>{kpi.value}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: 1 }}>{kpi.label}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'campaigns' && (
        <Card padding={false} style={{ marginTop: 16 }}>
          {campaignStats.length === 0 ? (
            <p style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>No campaign data yet</p>
          ) : (
            <table className="pnl-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Enrolled</th>
                  <th>Sent</th>
                  <th>Opened</th>
                  <th>Clicked</th>
                  <th>Replied</th>
                  <th>Bounced</th>
                  <th>Open Rate</th>
                </tr>
              </thead>
              <tbody>
                {campaignStats.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td><Badge variant="default" size="sm">{c.type || '—'}</Badge></td>
                    <td>{c.enrollmentCount}</td>
                    <td>{c.sent}</td>
                    <td>{c.opened}</td>
                    <td>{c.clicked}</td>
                    <td>{c.replied}</td>
                    <td>{c.bounced}</td>
                    <td style={{ fontWeight: 600 }}>{pct(c.opened, c.sent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'clients' && (
        <div style={{ marginTop: 16 }}>
          <input
            value={contactSearch}
            onChange={e => setContactSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ width: '100%', maxWidth: 320, padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontFamily: 'inherit', marginBottom: 12 }}
          />
          {contactHistory.length === 0 ? (
            <Card><p style={{ padding: 30, textAlign: 'center', color: 'var(--color-text-muted)' }}>No email history for contacts</p></Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contactHistory.map(ch => (
                <details key={ch.contactId} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <summary style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--brown-dark)' }}>{ch.name}</span>
                      {ch.email && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', marginLeft: 8 }}>{ch.email}</span>}
                      {ch.type && <Badge variant="default" size="sm" style={{ marginLeft: 6 }}>{ch.type}</Badge>}
                    </div>
                    <Badge variant="info" size="sm">{ch.total} sent</Badge>
                    {ch.opened > 0 && <Badge variant="success" size="sm">{ch.opened} opened</Badge>}
                    {ch.replied > 0 && <Badge variant="success" size="sm">{ch.replied} replied</Badge>}
                  </summary>
                  <div style={{ padding: '0 16px 12px', maxHeight: 300, overflowY: 'auto' }}>
                    {ch.messages.map(m => {
                      const campaign = campaigns.find(c => c.id === m.campaignId)
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--color-border-light, #f0ece6)', fontSize: '0.78rem' }}>
                          <span style={{ color: 'var(--color-text-muted)', minWidth: 80 }}>
                            {m.sent_at ? new Date(m.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                          </span>
                          <span style={{ flex: 1, fontWeight: 500 }}>{m.subject || '(no subject)'}</span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{campaign?.name || ''}</span>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {m.opened_at && <Badge variant="success" size="sm">Opened</Badge>}
                            {m.clicked_at && <Badge variant="accent" size="sm">Clicked</Badge>}
                            {(m.replied_at || m.reply_detected) && <Badge variant="success" size="sm">Replied</Badge>}
                            {m.bounced_at && <Badge variant="danger" size="sm">Bounced</Badge>}
                            {!m.opened_at && !m.bounced_at && <Badge variant="default" size="sm">Sent</Badge>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useEffect, useState, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import supabase from '../../lib/supabase.js'

const INTEREST_LABEL = { high: 'High', medium: 'Medium', low: 'Low', none: 'None' }
const PRICE_LABEL = { too_high: 'Too high', fair: 'Fair', great_deal: 'Great deal' }
const SHOW_LABEL = { yes: 'Yes', maybe: 'Maybe', no: 'No' }
const STATUS_LABEL = { requested: 'Awaiting reply', submitted: 'Submitted', expired: 'Expired' }
const STATUS_COLOR = {
  requested: { bg: '#fff4d6', fg: '#9a7700' },
  submitted: { bg: '#dff2e0', fg: '#2d5a2d' },
  expired:   { bg: '#f1ddd9', fg: '#8a3b2c' },
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}
function fmtDateShort(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  const ampm = hr >= 12 ? 'pm' : 'am'
  const h12 = hr % 12 === 0 ? 12 : hr % 12
  return `${h12}:${m}${ampm}`
}

export default function OHFeedbackInbox() {
  const { feedbackId } = useParams()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [copyHint, setCopyHint] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('oh_feedback')
        .select(`
          id, status, request_sent_at, submitted_at, hosting_agent_name, hosting_agent_email,
          buyer_count, buyer_interest_level, price_feedback, would_show_again,
          overall_impression, liked, concerns, general_comments,
          listing_id, contact_id,
          open_house:open_houses(id, date, start_time, end_time, property:properties(address, city)),
          listing:listings(id, list_price, contact:contacts(id, name)),
          contact:contacts(id, name, email)
        `)
        .order('submitted_at', { ascending: false, nullsFirst: false })
        .order('request_sent_at', { ascending: false, nullsFirst: false })
      if (cancelled) return
      if (error) { console.error(error); setItems([]); setLoading(false); return }
      setItems(data || [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let list = items
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(r => {
        const addr = r.open_house?.property?.address || ''
        const agent = r.hosting_agent_name || r.hosting_agent_email || ''
        const seller = r.contact?.name || r.listing?.contact?.name || ''
        return addr.toLowerCase().includes(q) || agent.toLowerCase().includes(q) || seller.toLowerCase().includes(q)
      })
    }
    return list
  }, [items, statusFilter, search])

  const grouped = useMemo(() => {
    const groups = new Map()
    for (const r of filtered) {
      const ohDate = r.open_house?.date || ''
      if (!groups.has(ohDate)) groups.set(ohDate, [])
      groups.get(ohDate).push(r)
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const selected = feedbackId ? items.find(r => r.id === feedbackId) : null

  function copyForEmail(r) {
    if (!r) return
    const lines = []
    const addr = r.open_house?.property?.address || ''
    const host = r.hosting_agent_name || r.hosting_agent_email || 'Hosting agent'
    lines.push(`Feedback from ${host}${r.open_house?.date ? ` (${fmtDateShort(r.open_house.date)} open house)` : ''}:`)
    if (r.buyer_count != null) lines.push(`• Buyers attended: ${r.buyer_count}`)
    if (r.buyer_interest_level) lines.push(`• Interest level: ${INTEREST_LABEL[r.buyer_interest_level] || r.buyer_interest_level}`)
    if (r.price_feedback) lines.push(`• Price feedback: ${PRICE_LABEL[r.price_feedback] || r.price_feedback}`)
    if (r.would_show_again) lines.push(`• Would show buyers again: ${SHOW_LABEL[r.would_show_again] || r.would_show_again}`)
    if (r.overall_impression) lines.push(`• Overall: ${r.overall_impression}`)
    if (r.liked) lines.push(`• Buyers liked: ${r.liked}`)
    if (r.concerns) lines.push(`• Concerns: ${r.concerns}`)
    if (r.general_comments) lines.push(`• Other: ${r.general_comments}`)
    navigator.clipboard.writeText(lines.join('\n'))
    setCopyHint('Copied!')
    setTimeout(() => setCopyHint(''), 2000)
  }

  return (
    <div style={{ padding: '20px 24px', maxWidth: 1280, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 400, margin: 0, color: 'var(--brown-dark)' }}>
          Open House Feedback
        </h1>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          {filtered.length} of {items.length} {items.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search address, hosting agent, or seller…"
          style={{ flex: '1 1 240px', padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.88rem' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.88rem', background: '#fff' }}
        >
          <option value="all">All statuses</option>
          <option value="submitted">Submitted</option>
          <option value="requested">Awaiting reply</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '360px 1fr' : '1fr', gap: 16, alignItems: 'flex-start' }}>
        {/* List */}
        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
          {loading && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading…</div>
          )}
          {!loading && grouped.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.88rem' }}>
              No feedback yet. Add a hosting agent email on an open house to start collecting.
            </div>
          )}
          {!loading && grouped.map(([date, rows]) => (
            <div key={date}>
              <div style={{
                padding: '8px 14px', background: '#f6f4ee', borderTop: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)', fontSize: '0.74rem', fontWeight: 600,
                color: '#8b7a68', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                {date ? fmtDate(date) : 'Unknown date'}
              </div>
              {rows.map(r => {
                const isActive = selected?.id === r.id
                const addr = r.open_house?.property?.address || '—'
                const host = r.hosting_agent_name || r.hosting_agent_email || 'Hosting agent'
                const color = STATUS_COLOR[r.status] || STATUS_COLOR.requested
                return (
                  <Link
                    key={r.id}
                    to={`/oh-feedback-inbox/${r.id}`}
                    style={{
                      display: 'block', padding: '10px 14px',
                      borderBottom: '1px solid var(--color-border)',
                      textDecoration: 'none', color: 'inherit',
                      background: isActive ? '#faf6ee' : '#fff',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--brown-dark)' }}>{addr}</strong>
                      <span style={{ fontSize: '0.66rem', padding: '2px 6px', borderRadius: 4, background: color.bg, color: color.fg, fontWeight: 600 }}>
                        {STATUS_LABEL[r.status] || r.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {host}
                      {r.open_house?.start_time && ` · ${fmtTime(r.open_house.start_time)}`}
                    </div>
                    {r.status === 'submitted' && r.submitted_at && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        Submitted {new Date(r.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && <DetailPanel item={selected} onClose={() => navigate('/oh-feedback-inbox')} onCopy={() => copyForEmail(selected)} copyHint={copyHint} />}
      </div>
    </div>
  )
}

function DetailPanel({ item, onClose, onCopy, copyHint }) {
  const addr = item.open_house?.property?.address || '—'
  const date = item.open_house?.date ? fmtDate(item.open_house.date) : ''
  const time = item.open_house?.start_time ? `${fmtTime(item.open_house.start_time)}${item.open_house.end_time ? ' – ' + fmtTime(item.open_house.end_time) : ''}` : ''
  const seller = item.contact?.name || item.listing?.contact?.name

  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, padding: 18, position: 'sticky', top: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, margin: 0, color: 'var(--brown-dark)' }}>{addr}</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{date}{time ? ` · ${time}` : ''}</p>
          {seller && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>Seller: <Link to={`/contact/${item.contact_id || item.listing?.contact?.id}`}>{seller}</Link></p>}
        </div>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#8b7a68' }} title="Close">×</button>
      </div>

      <div style={{ background: '#faf8f5', borderRadius: 6, padding: '8px 12px', fontSize: '0.82rem', marginBottom: 14 }}>
        <strong style={{ color: 'var(--brown-dark)' }}>From:</strong> {item.hosting_agent_name || '—'}
        {item.hosting_agent_email && <span style={{ color: 'var(--color-text-muted)' }}> · {item.hosting_agent_email}</span>}
      </div>

      {item.status !== 'submitted' && (
        <div style={{ background: '#fff4d6', color: '#9a7700', padding: '10px 12px', borderRadius: 6, fontSize: '0.82rem', marginBottom: 12 }}>
          {item.status === 'requested' ? 'Awaiting reply.' : 'No response received.'}
          {item.request_sent_at && <> Request sent {new Date(item.request_sent_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.</>}
        </div>
      )}

      <FeedbackBody item={item} />

      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
        <button
          onClick={onCopy}
          style={{ background: 'var(--brown-dark)', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500 }}
        >{copyHint || 'Copy for Email'}</button>
        {item.open_house?.id && (
          <Link to={`/open-houses?oh=${item.open_house.id}`} style={{ textDecoration: 'none' }}>
            <button style={{ background: 'none', border: '1px solid var(--color-border)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
              View OH →
            </button>
          </Link>
        )}
      </div>
    </div>
  )
}

function FeedbackBody({ item }) {
  const rows = []
  if (item.buyer_count != null) rows.push(['Buyers attended', item.buyer_count])
  if (item.buyer_interest_level) rows.push(['Interest level', INTEREST_LABEL[item.buyer_interest_level] || item.buyer_interest_level])
  if (item.price_feedback) rows.push(['Price feedback', PRICE_LABEL[item.price_feedback] || item.price_feedback])
  if (item.would_show_again) rows.push(['Would show again', SHOW_LABEL[item.would_show_again] || item.would_show_again])

  const blocks = []
  if (item.overall_impression) blocks.push(['Overall impression', item.overall_impression])
  if (item.liked) blocks.push(['What buyers liked', item.liked])
  if (item.concerns) blocks.push(['Concerns', item.concerns])
  if (item.general_comments) blocks.push(['Other comments', item.general_comments])

  if (rows.length === 0 && blocks.length === 0) {
    return <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No content submitted yet.</p>
  }

  return (
    <>
      {rows.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 12 }}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: '4px 12px 4px 0', color: '#8b7a68', fontSize: '0.78rem', width: 140 }}>{k}</td>
                <td style={{ padding: '4px 0', color: 'var(--brown-dark)', fontSize: '0.88rem', fontWeight: 500 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {blocks.map(([k, v]) => (
        <div key={k} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: '0.74rem', color: '#8b7a68', marginBottom: 3 }}>{k}</div>
          <div style={{ background: '#faf8f5', padding: '8px 10px', borderRadius: 6, fontSize: '0.85rem', color: 'var(--brown-dark)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{v}</div>
        </div>
      ))}
    </>
  )
}

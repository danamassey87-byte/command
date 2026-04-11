import { useMemo } from 'react'
import { Badge, Card, EmptyState, AddressLink } from '../../components/ui/index.jsx'
import { useShowingSessions, useOpenHouses, useListingAppointments } from '../../lib/hooks.js'
import './TodayShowings.css'

function parseDate(d) {
  if (!d) return null
  const dt = new Date(d + 'T12:00:00')
  return isNaN(dt) ? null : dt
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function fmtTime(t) {
  if (!t) return ''
  return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function TodayShowings() {
  const { data: sessions, loading: l1 } = useShowingSessions()
  const { data: openHouses, loading: l2 } = useOpenHouses()
  const { data: listingAppts, loading: l3 } = useListingAppointments()

  const today = new Date()

  const todaySessions = useMemo(() =>
    (sessions ?? []).filter(s => {
      const d = parseDate(s.date)
      return d && isSameDay(d, today)
    }).sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''))
  , [sessions])

  const todayOH = useMemo(() =>
    (openHouses ?? []).filter(oh => {
      const d = parseDate(oh.date)
      return d && isSameDay(d, today)
    })
  , [openHouses])

  const todayAppts = useMemo(() =>
    (listingAppts ?? []).filter(a => {
      const dt = a.scheduled_at
      if (!dt) return false
      const d = parseDate(dt.slice(0, 10))
      return d && isSameDay(d, today)
    }).sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
  , [listingAppts])

  const totalEvents = todaySessions.length + todayOH.length + todayAppts.length
  const loading = l1 || l2 || l3

  if (loading) return <div className="today-loading">Loading today's schedule...</div>

  if (totalEvents === 0) {
    return (
      <EmptyState
        icon="📅"
        title="Nothing on the books today"
        description="No showings, open houses, or appointments scheduled for today."
      />
    )
  }

  return (
    <div className="today">
      {/* Summary */}
      <div className="today__summary">
        <div className="today__stat">
          <span className="today__stat-num">{todaySessions.length}</span>
          <span className="today__stat-label">Showing{todaySessions.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="today__stat">
          <span className="today__stat-num">{todayOH.length}</span>
          <span className="today__stat-label">Open House{todayOH.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="today__stat">
          <span className="today__stat-num">{todayAppts.length}</span>
          <span className="today__stat-label">Listing Appt{todayAppts.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Buyer Showings */}
      {todaySessions.length > 0 && (
        <section className="today__section">
          <h3 className="today__section-title">
            <span className="today__section-dot" style={{ background: 'var(--color-info)' }} />
            Buyer Showings
          </h3>
          <div className="today__cards">
            {todaySessions.map(session => (
              <Card key={session.id} padding hover>
                <div className="today__card-header">
                  <span className="today__card-time">{fmtTime(session.start_time)}</span>
                  <span className="today__card-buyer">{session.contact?.name ?? 'Unknown Buyer'}</span>
                  <Badge variant="info" size="sm">{(session.showings ?? []).length} propert{(session.showings ?? []).length !== 1 ? 'ies' : 'y'}</Badge>
                </div>
                <div className="today__properties">
                  {(session.showings ?? []).map(sh => (
                    <div key={sh.id} className="today__prop">
                      <AddressLink address={sh.property?.address} city={sh.property?.city} className="today__prop-addr">
                        {sh.property?.address ?? '—'}
                      </AddressLink>
                      <div className="today__prop-meta">
                        {sh.property?.price && <span className="today__prop-price">${Number(sh.property.price).toLocaleString()}</span>}
                        {sh.interest_level && (
                          <Badge variant={sh.interest_level === 'high' ? 'success' : sh.interest_level === 'medium' ? 'warning' : 'danger'} size="sm">
                            {sh.interest_level}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Open Houses */}
      {todayOH.length > 0 && (
        <section className="today__section">
          <h3 className="today__section-title">
            <span className="today__section-dot" style={{ background: 'var(--color-warning)' }} />
            Open Houses
          </h3>
          <div className="today__cards">
            {todayOH.map(oh => (
              <Card key={oh.id} padding hover>
                <div className="today__card-header">
                  <span className="today__card-time">{fmtTime(oh.start_time)}{oh.end_time ? ` – ${fmtTime(oh.end_time)}` : ''}</span>
                  <span className="today__card-buyer">{oh.property?.address ?? 'Unknown Property'}</span>
                  <Badge variant="warning" size="sm">Open House</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Listing Appointments */}
      {todayAppts.length > 0 && (
        <section className="today__section">
          <h3 className="today__section-title">
            <span className="today__section-dot" style={{ background: 'var(--color-success)' }} />
            Listing Appointments
          </h3>
          <div className="today__cards">
            {todayAppts.map(appt => (
              <Card key={appt.id} padding hover>
                <div className="today__card-header">
                  <span className="today__card-time">{appt.scheduled_at ? new Date(appt.scheduled_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }) : '—'}</span>
                  <span className="today__card-buyer">{appt.contact?.name ?? '—'}</span>
                  <Badge variant="success" size="sm">Listing Appt</Badge>
                </div>
                {(appt.contact?.phone || appt.contact?.email) && (
                  <div className="today__contact-links">
                    {appt.contact.phone && <a href={`tel:${appt.contact.phone}`} className="today__contact-link">📞 {appt.contact.phone}</a>}
                    {appt.contact.email && <a href={`mailto:${appt.contact.email}`} className="today__contact-link">✉️ {appt.contact.email}</a>}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

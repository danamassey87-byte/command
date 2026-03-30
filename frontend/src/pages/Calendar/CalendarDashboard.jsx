import { Link } from 'react-router-dom'
import { StatCard, Badge } from '../../components/ui/index.jsx'
import { useShowingSessions, useListingAppointments, useOpenHouses } from '../../lib/hooks.js'
import './CalendarDashboard.css'

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
  return new Date(str).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(str) {
  if (!str) return ''
  try {
    const [h, m] = str.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  } catch { return str }
}

export default function CalendarDashboard() {
  const { data: sessions, loading } = useShowingSessions()
  const { data: appts } = useListingAppointments()
  const { data: openHouses } = useOpenHouses()

  const ss = sessions ?? []
  const ap = appts ?? []
  const oh = openHouses ?? []
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  // Today's showings
  const todayShowings = ss.filter(s => s.date === today)
  const todayAppts = ap.filter(a => a.appointment_date === today)

  // This week
  const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7)
  const weekShowings = ss.filter(s => {
    if (!s.date) return false
    const d = new Date(s.date)
    return d >= now && d <= weekEnd
  })
  const weekAppts = ap.filter(a => {
    if (!a.appointment_date) return false
    const d = new Date(a.appointment_date)
    return d >= now && d <= weekEnd
  })
  const weekOH = oh.filter(o => {
    if (!o.date) return false
    const d = new Date(o.date)
    return d >= now && d <= weekEnd
  })

  // Upcoming events (all types merged, sorted by date)
  const upcoming = [
    ...weekShowings.map(s => ({ id: `s-${s.id}`, type: 'Showing', name: s.contact?.name ?? '—', date: s.date, count: (s.showings ?? []).length + ' properties' })),
    ...weekAppts.map(a => ({ id: `a-${a.id}`, type: 'Listing Appt', name: a.contact?.name ?? '—', date: a.appointment_date, time: a.appointment_time })),
    ...weekOH.map(o => ({ id: `o-${o.id}`, type: 'Open House', name: o.property?.address ?? '—', date: o.date, time: o.start_time })),
  ].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')).slice(0, 8)

  // This month count
  const monthShowings = ss.filter(s => {
    if (!s.date) return false
    const d = new Date(s.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  if (loading) return <div className="section-dash"><div className="sd-loading">Loading calendar...</div></div>

  return (
    <div className="section-dash cal-dash">

      <div className="section-dash__kpis">
        <StatCard label="Today's Showings" value={todayShowings.length} accent />
        <StatCard label="Today's Appts" value={todayAppts.length} />
        <StatCard label="This Week" value={weekShowings.length + weekAppts.length + weekOH.length} />
        <StatCard label="Month Showings" value={monthShowings.length} />
        <StatCard label="Upcoming OH" value={weekOH.length} />
      </div>

      <div className="sd-row sd-row--60-40">
        <DashCard title="This Week's Schedule">
          {upcoming.length > 0 ? (
            <div className="cal-schedule">
              {upcoming.map(ev => (
                <div key={ev.id} className="cal-event-row">
                  <div className="cal-event-row__left">
                    <span className="cal-event-row__name">{ev.name}</span>
                    <span className="cal-event-row__meta">
                      {fmtDate(ev.date)}{ev.time ? ` · ${fmtTime(ev.time)}` : ''}{ev.count ? ` · ${ev.count}` : ''}
                    </span>
                  </div>
                  <Badge variant={ev.type === 'Showing' ? 'info' : ev.type === 'Listing Appt' ? 'warning' : 'success'} size="sm">{ev.type}</Badge>
                </div>
              ))}
            </div>
          ) : <p className="sd-empty">No events this week</p>}
        </DashCard>

        <DashCard title="Today at a Glance">
          <div className="cal-today">
            <div className="cal-today__stat">
              <span className="cal-today__val">{todayShowings.length}</span>
              <span className="cal-today__label">Showings</span>
            </div>
            <div className="cal-today__stat">
              <span className="cal-today__val">{todayAppts.length}</span>
              <span className="cal-today__label">Appointments</span>
            </div>
            <div className="cal-today__stat">
              <span className="cal-today__val">{todayShowings.reduce((s, x) => s + (x.showings ?? []).length, 0)}</span>
              <span className="cal-today__label">Properties</span>
            </div>
          </div>
          {todayShowings.length === 0 && todayAppts.length === 0 && (
            <p className="sd-empty">Nothing scheduled today</p>
          )}
        </DashCard>
      </div>

      <div className="sd-row sd-row--33-33-33">
        <Link to="/calendar/today" className="cal-quick-link">
          <span className="cal-quick-link__icon">👁</span>
          <span>Today's Showings</span>
        </Link>
        <Link to="/calendar/tasks" className="cal-quick-link">
          <span className="cal-quick-link__icon">✅</span>
          <span>Tasks</span>
        </Link>
        <Link to="/calendar" className="cal-quick-link cal-quick-link--full">
          <span className="cal-quick-link__icon">📅</span>
          <span>Full Calendar</span>
        </Link>
      </div>
    </div>
  )
}

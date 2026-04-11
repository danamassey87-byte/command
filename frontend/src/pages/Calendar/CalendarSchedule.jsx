import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Card, SlidePanel, TabBar } from '../../components/ui/index.jsx'
import { useShowingSessions, useOpenHouses, useListingAppointments } from '../../lib/hooks.js'
import './CalendarSchedule.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const VIEWS = [
  { value: 'month', label: 'Month' },
  { value: 'week',  label: 'Week' },
  { value: 'day',   label: 'Day' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function parseDate(d) {
  if (!d) return null
  const dt = new Date(d + 'T12:00:00')
  return isNaN(dt) ? null : dt
}

function fmtTime(t) {
  if (!t) return ''
  return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function getWeekDays(date) {
  const d = new Date(date)
  const day = d.getDay()
  const sun = new Date(d); sun.setDate(d.getDate() - day)
  const days = []
  for (let i = 0; i < 7; i++) {
    const dt = new Date(sun)
    dt.setDate(sun.getDate() + i)
    days.push(dt)
  }
  return days
}

// ─── Task Storage (localStorage) ─────────────────────────────────────────────
const TASK_KEY = 'cal_tasks'
function loadTasks() {
  try { return JSON.parse(localStorage.getItem(TASK_KEY) || '[]') } catch { return [] }
}

// ─── Unified event builder ───────────────────────────────────────────────────
function buildEvents(sessions, openHouses, listingAppts, tasks) {
  const events = []

  // Showing sessions
  ;(sessions ?? []).forEach(s => {
    const d = parseDate(s.date)
    if (!d) return
    events.push({
      id: `showing-${s.id}`,
      type: 'showing',
      date: d,
      time: s.start_time,
      title: s.contact?.name ?? 'Buyer Showing',
      subtitle: (s.showings ?? []).map(sh => sh.property?.address).filter(Boolean).join(', '),
      color: 'var(--color-info)',
      raw: s,
      link: '/calendar/today',
    })
  })

  // Open houses
  ;(openHouses ?? []).forEach(oh => {
    const d = parseDate(oh.date)
    if (!d) return
    events.push({
      id: `oh-${oh.id}`,
      type: 'open-house',
      date: d,
      time: oh.start_time,
      title: oh.property?.address ? `Open House` : 'Open House',
      subtitle: [oh.property?.address, oh.property?.city].filter(Boolean).join(', '),
      color: 'var(--color-warning)',
      raw: oh,
      link: '/calendar/today',
    })
  })

  // Listing appointments
  ;(listingAppts ?? []).forEach(a => {
    const dt = a.scheduled_at
    const d = dt ? parseDate(dt.slice(0, 10)) : null
    if (!d) return
    const name = a.contact?.name || 'Listing Appt'
    const addr = [a.property?.address, a.property?.city].filter(Boolean).join(', ')
    events.push({
      id: `appt-${a.id}`,
      type: 'listing-appt',
      date: d,
      time: dt ? new Date(dt).toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit', hour12: false }) : null,
      title: name,
      subtitle: addr || 'Listing Appointment',
      color: 'var(--color-success)',
      raw: a,
      link: '/dashboard/appts',
    })
  })

  // Tasks from localStorage
  ;(tasks ?? []).forEach(t => {
    if (t.is_recurring) return // recurring shown on Tasks page
    const d = parseDate(t.date)
    if (!d) return
    events.push({
      id: `task-${t.id}`,
      type: 'task',
      date: d,
      time: t.time || null,
      title: t.title,
      subtitle: t.category || '',
      color: t.completed ? 'var(--brown-light)' : 'var(--color-danger)',
      raw: t,
    })
  })

  return events
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function CalendarSchedule() {
  const navigate = useNavigate()
  const { data: sessions, loading: loadSessions }   = useShowingSessions()
  const { data: openHouses, loading: loadOH }        = useOpenHouses()
  const { data: listingAppts, loading: loadAppts }   = useListingAppointments()

  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
  const [selectedDate, setSelectedDate] = useState(today)
  const [view, setView] = useState('month')
  const [detailEvent, setDetailEvent] = useState(null)

  const tasks = useMemo(() => loadTasks(), [])

  const events = useMemo(
    () => buildEvents(sessions, openHouses, listingAppts, tasks),
    [sessions, openHouses, listingAppts, tasks]
  )

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(e => {
      const key = e.date.toDateString()
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    // Sort each day's events by time
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')))
    return map
  }, [events])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // Navigation
  const prev = () => {
    if (view === 'month') setViewDate(new Date(year, month - 1, 1))
    else if (view === 'week') {
      const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d)
    } else {
      const d = new Date(viewDate); d.setDate(d.getDate() - 1); setViewDate(d)
    }
  }
  const next = () => {
    if (view === 'month') setViewDate(new Date(year, month + 1, 1))
    else if (view === 'week') {
      const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d)
    } else {
      const d = new Date(viewDate); d.setDate(d.getDate() + 1); setViewDate(d)
    }
  }
  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    setSelectedDate(today)
  }

  // Calendar grid for month view
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))
    return days
  }, [year, month])

  // Week days for week view
  const weekDays = useMemo(() => getWeekDays(viewDate), [viewDate])

  // Events for selected day
  const selectedEvents = selectedDate ? (eventsByDate[selectedDate.toDateString()] ?? []) : []

  const loading = loadSessions || loadOH || loadAppts

  // View label
  const viewLabel = view === 'month'
    ? viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'week'
    ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : viewDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  if (loading) return <div className="cal-loading">Loading calendar...</div>

  return (
    <div className="cal">
      {/* ─── Header ─── */}
      <div className="cal__header">
        <div className="cal__header-left">
          <h3 className="cal__title">{viewLabel}</h3>
          <button className="cal__today-btn" onClick={goToday}>Today</button>
        </div>
        <div className="cal__header-right">
          <div className="cal__view-tabs">
            {VIEWS.map(v => (
              <button
                key={v.value}
                className={`cal__view-tab ${view === v.value ? 'cal__view-tab--active' : ''}`}
                onClick={() => setView(v.value)}
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="cal__nav">
            <button className="cal__nav-btn" onClick={prev} aria-label="Previous">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button className="cal__nav-btn" onClick={next} aria-label="Next">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><polyline points="9 6 15 12 9 18" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="cal__body">
        {/* ─── Month View ─── */}
        {view === 'month' && (
          <div className="cal__month">
            <div className="cal__grid">
              {DAYS.map(d => <div key={d} className="cal__day-header">{d}</div>)}
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`blank-${i}`} className="cal__cell cal__cell--blank" />
                const key = day.toDateString()
                const isToday = isSameDay(day, today)
                const isSelected = selectedDate && isSameDay(day, selectedDate)
                const dayEvents = eventsByDate[key] ?? []

                return (
                  <button
                    key={key}
                    className={[
                      'cal__cell',
                      isToday ? 'cal__cell--today' : '',
                      isSelected ? 'cal__cell--selected' : '',
                      dayEvents.length > 0 ? 'cal__cell--has-events' : '',
                    ].join(' ')}
                    onClick={() => setSelectedDate(day)}
                  >
                    <span className="cal__cell-num">{day.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <div className="cal__cell-dots">
                        {dayEvents.slice(0, 4).map((e, j) => (
                          <span key={j} className="cal__cell-dot" style={{ background: e.color }} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Day detail panel */}
            <div className="cal__day-panel">
              <div className="cal__day-panel-header">
                <h4 className="cal__day-panel-date">
                  {selectedDate
                    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                    : 'Select a day'}
                </h4>
                {selectedEvents.length > 0 && (
                  <Badge variant="accent" size="sm">{selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}</Badge>
                )}
              </div>
              {selectedEvents.length === 0 ? (
                <p className="cal__empty">Nothing scheduled.</p>
              ) : (
                <div className="cal__event-list">
                  {selectedEvents.map(ev => (
                    <button key={ev.id} className="cal__event-card" onClick={() => setDetailEvent(ev)}>
                      <span className="cal__event-dot" style={{ background: ev.color }} />
                      <div className="cal__event-info">
                        <span className="cal__event-title">{ev.title}</span>
                        {ev.subtitle && <span className="cal__event-sub">{ev.subtitle}</span>}
                      </div>
                      <span className="cal__event-time">{fmtTime(ev.time)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Week View ─── */}
        {view === 'week' && (
          <div className="cal__week">
            {weekDays.map(day => {
              const key = day.toDateString()
              const isToday = isSameDay(day, today)
              const dayEvents = eventsByDate[key] ?? []

              return (
                <div key={key} className={`cal__week-col ${isToday ? 'cal__week-col--today' : ''}`}>
                  <div className="cal__week-header">
                    <span className="cal__week-day-name">{DAYS[day.getDay()]}</span>
                    <span className={`cal__week-day-num ${isToday ? 'cal__week-day-num--today' : ''}`}>{day.getDate()}</span>
                  </div>
                  <div className="cal__week-events">
                    {dayEvents.length === 0 && <span className="cal__week-empty">—</span>}
                    {dayEvents.map(ev => (
                      <button key={ev.id} className="cal__week-event" onClick={() => setDetailEvent(ev)}>
                        <span className="cal__event-dot" style={{ background: ev.color }} />
                        <div className="cal__week-event-info">
                          <span className="cal__week-event-title">{ev.title}</span>
                          {ev.subtitle && <span className="cal__week-event-sub">{ev.subtitle}</span>}
                        </div>
                        {ev.time && <span className="cal__week-event-time">{fmtTime(ev.time)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Day View ─── */}
        {view === 'day' && (() => {
          const dayEvents = eventsByDate[viewDate.toDateString()] ?? []
          return (
            <div className="cal__day-view">
              {dayEvents.length === 0 ? (
                <p className="cal__empty">Nothing scheduled for this day.</p>
              ) : (
                <div className="cal__day-events">
                  {dayEvents.map(ev => (
                    <button key={ev.id} className="cal__day-event-card" onClick={() => setDetailEvent(ev)}>
                      <span className="cal__event-dot cal__event-dot--lg" style={{ background: ev.color }} />
                      <div className="cal__day-event-body">
                        <div className="cal__day-event-top">
                          <span className="cal__day-event-title">{ev.title}</span>
                          <Badge variant={ev.type === 'showing' ? 'info' : ev.type === 'open-house' ? 'warning' : ev.type === 'listing-appt' ? 'success' : 'default'} size="sm">
                            {ev.type === 'showing' ? 'Showing' : ev.type === 'open-house' ? 'Open House' : ev.type === 'listing-appt' ? 'Listing Appt' : 'Task'}
                          </Badge>
                        </div>
                        {ev.subtitle && <span className="cal__day-event-sub">{ev.subtitle}</span>}
                      </div>
                      <span className="cal__day-event-time">{fmtTime(ev.time) || 'All day'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* ─── Legend ─── */}
      <div className="cal__legend">
        <span className="cal__legend-item"><span className="cal__legend-dot" style={{ background: 'var(--color-info)' }} />Showings</span>
        <span className="cal__legend-item"><span className="cal__legend-dot" style={{ background: 'var(--color-warning)' }} />Open Houses</span>
        <span className="cal__legend-item"><span className="cal__legend-dot" style={{ background: 'var(--color-success)' }} />Listing Appts</span>
        <span className="cal__legend-item"><span className="cal__legend-dot" style={{ background: 'var(--color-danger)' }} />Tasks</span>
      </div>

      {/* ─── Event Detail Panel ─── */}
      <SlidePanel open={!!detailEvent} onClose={() => setDetailEvent(null)} title={detailEvent?.title ?? ''} subtitle={detailEvent?.type?.replace('-', ' ')?.replace(/\b\w/g, c => c.toUpperCase())}>
        {detailEvent && (
          <div className="cal__detail">
            {detailEvent.time && (
              <div className="cal__detail-row">
                <span className="cal__detail-label">Time</span>
                <span>{fmtTime(detailEvent.time)}</span>
              </div>
            )}
            <div className="cal__detail-row">
              <span className="cal__detail-label">Date</span>
              <span>{detailEvent.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            {detailEvent.subtitle && (
              <div className="cal__detail-row">
                <span className="cal__detail-label">{detailEvent.type === 'showing' ? 'Properties' : 'Details'}</span>
                <span>{detailEvent.subtitle}</span>
              </div>
            )}

            {/* Showing-specific details */}
            {detailEvent.type === 'showing' && detailEvent.raw && (
              <>
                <div className="cal__detail-row">
                  <span className="cal__detail-label">Buyer</span>
                  <span>{detailEvent.raw.contact?.name ?? '—'}</span>
                </div>
                {(detailEvent.raw.showings ?? []).map(sh => (
                  <div key={sh.id} className="cal__detail-showing">
                    <span className="cal__detail-addr">{sh.property?.address ?? '—'}, {sh.property?.city ?? ''}</span>
                    <div className="cal__detail-meta">
                      {sh.property?.price && <span>${Number(sh.property.price).toLocaleString()}</span>}
                      {sh.interest_level && <Badge variant={sh.interest_level === 'high' ? 'success' : sh.interest_level === 'medium' ? 'warning' : 'danger'} size="sm">{sh.interest_level}</Badge>}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Open house details */}
            {detailEvent.type === 'open-house' && detailEvent.raw && (
              <div className="cal__detail-row">
                <span className="cal__detail-label">Property</span>
                <span>{detailEvent.raw.property?.address ?? '—'}, {detailEvent.raw.property?.city ?? ''}</span>
              </div>
            )}

            {/* Listing appt details */}
            {detailEvent.type === 'listing-appt' && detailEvent.raw && (
              <>
                <div className="cal__detail-row">
                  <span className="cal__detail-label">Seller</span>
                  <span>{detailEvent.raw.contact?.name || '—'}</span>
                </div>
                {detailEvent.raw.property?.address && (
                  <div className="cal__detail-row">
                    <span className="cal__detail-label">Property</span>
                    <span>{[detailEvent.raw.property.address, detailEvent.raw.property.city].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {detailEvent.raw.contact?.phone && (
                  <div className="cal__detail-row">
                    <span className="cal__detail-label">Phone</span>
                    <a href={`tel:${detailEvent.raw.contact.phone}`}>{detailEvent.raw.contact.phone}</a>
                  </div>
                )}
                {detailEvent.raw.contact?.email && (
                  <div className="cal__detail-row">
                    <span className="cal__detail-label">Email</span>
                    <a href={`mailto:${detailEvent.raw.contact.email}`}>{detailEvent.raw.contact.email}</a>
                  </div>
                )}
              </>
            )}

            {/* Navigate to full page */}
            {detailEvent.link && (
              <button
                className="cal__detail-go-btn"
                onClick={() => { navigate(detailEvent.link); setDetailEvent(null) }}
              >
                Open in {detailEvent.type === 'listing-appt' ? 'Listing Appts' : detailEvent.type === 'showing' ? 'Showings' : detailEvent.type === 'open-house' ? 'Open Houses' : 'Tasks'} →
              </button>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  )
}

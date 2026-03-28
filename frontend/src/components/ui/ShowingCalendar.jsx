import { useState, useMemo } from 'react'
import { AddressLink, Badge } from './index.jsx'
import './ShowingCalendar.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

export default function ShowingCalendar({ sessions = [], onSelectSession }) {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1))
  const goToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setSelectedDate(today)
  }

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days = []

    // Leading blanks
    for (let i = 0; i < firstDay; i++) days.push(null)
    // Days
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))

    return days
  }, [year, month])

  // Map dates to sessions
  const sessionsByDate = useMemo(() => {
    const map = {}
    sessions.forEach(s => {
      const d = parseDate(s.date)
      if (!d) return
      const key = d.toDateString()
      if (!map[key]) map[key] = []
      map[key].push(s)
    })
    return map
  }, [sessions])

  // Sessions for selected date
  const selectedSessions = selectedDate ? (sessionsByDate[selectedDate.toDateString()] ?? []) : []

  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="sc-wrap">
      {/* Calendar header */}
      <div className="sc-header">
        <div className="sc-header__left">
          <h3 className="sc-month-label">{monthLabel}</h3>
          <button className="sc-today-btn" onClick={goToday}>Today</button>
        </div>
        <div className="sc-nav">
          <button className="sc-nav-btn" onClick={prevMonth} aria-label="Previous month">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button className="sc-nav-btn" onClick={nextMonth} aria-label="Next month">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="sc-grid">
        {DAYS.map(d => (
          <div key={d} className="sc-day-header">{d}</div>
        ))}
        {calendarDays.map((day, i) => {
          if (!day) return <div key={`blank-${i}`} className="sc-cell sc-cell--blank" />
          const key = day.toDateString()
          const isToday = isSameDay(day, today)
          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const daySessions = sessionsByDate[key] ?? []
          const hasShowings = daySessions.length > 0

          return (
            <button
              key={key}
              className={[
                'sc-cell',
                isToday ? 'sc-cell--today' : '',
                isSelected ? 'sc-cell--selected' : '',
                hasShowings ? 'sc-cell--has-events' : '',
              ].join(' ')}
              onClick={() => setSelectedDate(day)}
            >
              <span className="sc-cell__num">{day.getDate()}</span>
              {hasShowings && (
                <div className="sc-cell__dots">
                  {daySessions.slice(0, 3).map((_, j) => (
                    <span key={j} className="sc-cell__dot" />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Day schedule */}
      <div className="sc-schedule">
        <div className="sc-schedule__header">
          <h4 className="sc-schedule__date">
            {selectedDate
              ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : 'Select a day'}
          </h4>
          {selectedSessions.length > 0 && (
            <Badge variant="accent" size="sm">
              {selectedSessions.length} session{selectedSessions.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        {selectedSessions.length === 0 ? (
          <p className="sc-schedule__empty">No showings scheduled for this day.</p>
        ) : (
          <div className="sc-schedule__list">
            {selectedSessions.map(session => (
              <div
                key={session.id}
                className="sc-session-card"
                onClick={() => onSelectSession?.(session)}
              >
                <div className="sc-session-card__time">
                  {session.start_time
                    ? new Date(`2000-01-01T${session.start_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : '—'}
                </div>
                <div className="sc-session-card__body">
                  <p className="sc-session-card__buyer">
                    {session.contact?.name ?? 'Unknown Buyer'}
                  </p>
                  <div className="sc-session-card__properties">
                    {(session.showings ?? []).map(sh => (
                      <div key={sh.id} className="sc-session-card__prop">
                        <AddressLink
                          address={sh.property?.address}
                          city={sh.property?.city}
                          className="sc-session-card__address"
                        >
                          {sh.property?.address ?? '—'}
                        </AddressLink>
                        {sh.property?.price && (
                          <span className="sc-session-card__price">
                            ${Number(sh.property.price).toLocaleString()}
                          </span>
                        )}
                        {sh.interest_level && (
                          <Badge
                            variant={sh.interest_level === 'high' ? 'success' : sh.interest_level === 'medium' ? 'warning' : 'danger'}
                            size="sm"
                          >
                            {sh.interest_level}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <svg className="sc-session-card__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                  <polyline points="9 6 15 12 9 18" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

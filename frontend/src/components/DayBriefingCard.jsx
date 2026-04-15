import { useMemo } from 'react'
import { useWeatherForecast, useWeatherAlerts } from '../lib/hooks.js'
import './DayBriefingCard.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

const TYPE_LABELS = {
  showing: 'Showing',
  open_house: 'Open House',
  photoshoot: 'Photoshoot',
  listing_appt: 'Listing Appt',
  closing: 'Closing',
}

function weatherIcon(forecast) {
  if (!forecast) return '\u2600\uFE0F'
  const short = (forecast.shortForecast || '').toLowerCase()
  if (short.includes('thunder') || short.includes('storm')) return '\u26C8\uFE0F'
  if (short.includes('rain') || short.includes('shower')) return '\u{1F327}\uFE0F'
  if (short.includes('cloud') && short.includes('partly')) return '\u26C5'
  if (short.includes('cloud') || short.includes('overcast')) return '\u2601\uFE0F'
  if (short.includes('fog') || short.includes('haze')) return '\u{1F32B}\uFE0F'
  if (short.includes('wind')) return '\u{1F4A8}'
  if (short.includes('dust') || short.includes('sand')) return '\u{1F32A}\uFE0F'
  return '\u2600\uFE0F'
}

function fmtTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function parseEventTime(event) {
  // Try time, start_time, scheduled_at, date fields
  const raw = event.time || event.start_time || event.scheduled_at || event.date || ''
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

/**
 * DayBriefingCard — Morning briefing card for today's events.
 *
 * Props:
 *   date         — Date object (defaults to today)
 *   showings     — array of showing events
 *   openHouses   — array of open house events
 *   appointments — array of other appointments (listing appts, closings, photoshoots)
 */
export default function DayBriefingCard({
  date,
  showings = [],
  openHouses = [],
  appointments = [],
}) {
  const today = date || new Date()
  const todayStr = today.toISOString().slice(0, 10)

  // Gilbert, AZ coordinates
  const { data: weather, loading: weatherLoading } = useWeatherForecast(33.3528, -111.789)
  const { data: alerts } = useWeatherAlerts(33.3528, -111.789)

  // Merge and sort all events by time
  const allEvents = useMemo(() => {
    const events = []

    // Filter to today's events
    const isToday = (event) => {
      const d = event.date || event.scheduled_at || event.start_time || ''
      if (!d) return true // if no date, show it (assume today)
      return String(d).startsWith(todayStr)
    }

    showings.filter(isToday).forEach(s => {
      events.push({
        ...s,
        _type: 'showing',
        _time: parseEventTime(s),
        _address: s.property?.address || s.address || '',
        _contact: s.contact?.name || s.client_name || '',
        _lockbox: s.lockbox_code || s.property?.lockbox_code || '',
        _accessNotes: s.access_notes || s.property?.access_notes || '',
      })
    })

    openHouses.filter(isToday).forEach(oh => {
      events.push({
        ...oh,
        _type: 'open_house',
        _time: parseEventTime(oh),
        _address: oh.property?.address || oh.address || '',
        _contact: oh.host_agent || oh.contact?.name || '',
        _lockbox: oh.lockbox_code || oh.property?.lockbox_code || '',
        _accessNotes: oh.access_notes || '',
      })
    })

    appointments.filter(isToday).forEach(a => {
      const type = (a.type || a.event_type || 'listing_appt').toLowerCase().replace(/\s+/g, '_')
      events.push({
        ...a,
        _type: type,
        _time: parseEventTime(a),
        _address: a.property?.address || a.address || '',
        _contact: a.contact?.name || a.client_name || '',
        _lockbox: a.lockbox_code || '',
        _accessNotes: a.access_notes || a.notes || '',
      })
    })

    // Sort by time (events without time go to end)
    events.sort((a, b) => {
      if (!a._time && !b._time) return 0
      if (!a._time) return 1
      if (!b._time) return -1
      return a._time - b._time
    })

    return events
  }, [showings, openHouses, appointments, todayStr])

  // Extract today's forecast
  const todayForecast = useMemo(() => {
    if (!weather?.periods?.length) return null
    // First period is current / today's daytime forecast
    return weather.periods[0]
  }, [weather])

  const temp = todayForecast?.temperature
  const isHeatWarning = temp && temp > 105
  const isSevereHeat = temp && temp > 115

  // Active NWS alerts
  const activeAlerts = useMemo(() => {
    if (!alerts?.length) return []
    return alerts.filter(a => {
      const event = (a.properties?.event || '').toLowerCase()
      return event.includes('heat') || event.includes('dust') || event.includes('wind')
        || event.includes('storm') || event.includes('monsoon') || event.includes('flood')
    }).slice(0, 3)
  }, [alerts])

  const dayName = DAYS[today.getDay()]
  const dateDisplay = `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`

  return (
    <div className="briefing">
      {/* Header */}
      <div className="briefing__header">
        <div className="briefing__date-block">
          <span className="briefing__day">{dayName}</span>
          <span className="briefing__date">{dateDisplay}</span>
        </div>
        <span className="briefing__label">Day Briefing</span>
      </div>

      {/* Weather */}
      {weatherLoading ? (
        <div className="briefing__weather briefing__weather--loading">
          Loading weather...
        </div>
      ) : todayForecast ? (
        <div className="briefing__weather">
          <span className="briefing__weather-icon">{weatherIcon(todayForecast)}</span>
          <div className="briefing__weather-main">
            <span className="briefing__temp">{temp}&deg;F</span>
            <p className="briefing__conditions">{todayForecast.shortForecast}</p>
          </div>
          <div className="briefing__weather-details">
            {todayForecast.relativeHumidity?.value != null && (
              <div className="briefing__weather-stat">
                <span className="briefing__weather-stat-label">Humidity</span>
                <span className="briefing__weather-stat-value">{todayForecast.relativeHumidity.value}%</span>
              </div>
            )}
            {todayForecast.windSpeed && (
              <div className="briefing__weather-stat">
                <span className="briefing__weather-stat-label">Wind</span>
                <span className="briefing__weather-stat-value">{todayForecast.windSpeed}</span>
              </div>
            )}
            {todayForecast.probabilityOfPrecipitation?.value != null && (
              <div className="briefing__weather-stat">
                <span className="briefing__weather-stat-label">Rain</span>
                <span className="briefing__weather-stat-value">{todayForecast.probabilityOfPrecipitation.value}%</span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Heat warning */}
      {isHeatWarning && (
        <div className={`briefing__heat-warn ${isSevereHeat ? 'briefing__heat-warn--severe' : ''}`}>
          <span className="briefing__heat-icon">{'\u{1F321}\uFE0F'}</span>
          {isSevereHeat
            ? `Extreme heat: ${temp}\u00B0F \u2014 strongly consider rescheduling outdoor events. Bring extra water.`
            : `Heat advisory: ${temp}\u00B0F \u2014 bring water for clients, allow extra time for outdoor lockboxes.`
          }
        </div>
      )}

      {/* NWS Alerts */}
      {activeAlerts.length > 0 && (
        <div className="briefing__alerts">
          {activeAlerts.map((alert, i) => (
            <div key={i} className="briefing__alert">
              {'\u26A0\uFE0F'} {alert.properties?.event || 'Weather Alert'}
              {alert.properties?.headline ? ` \u2014 ${alert.properties.headline.slice(0, 80)}` : ''}
            </div>
          ))}
        </div>
      )}

      {/* Schedule */}
      <div className="briefing__schedule">
        <p className="briefing__schedule-title">
          {allEvents.length > 0 ? `Today\u2019s Schedule (${allEvents.length})` : 'Schedule'}
        </p>

        {allEvents.length > 0 ? (
          <div className="briefing__timeline">
            {allEvents.map((event, i) => {
              const type = event._type || 'default'
              const dotClass = `briefing__event-dot briefing__event-dot--${type}`
              const badgeClass = `briefing__event-badge briefing__event-badge--${type}`
              const timeStr = event._time ? fmtTime(event._time.toISOString()) : 'TBD'

              return (
                <div key={i} className="briefing__event">
                  <div className={dotClass} />
                  <div className="briefing__event-content">
                    <div className="briefing__event-top">
                      <span className="briefing__event-time">{timeStr}</span>
                      <span className={badgeClass}>{TYPE_LABELS[type] || type}</span>
                    </div>
                    {event._address && (
                      <p className="briefing__event-address">{event._address}</p>
                    )}
                    {event._contact && (
                      <p className="briefing__event-contact">{event._contact}</p>
                    )}
                    <div className="briefing__event-meta">
                      {event._lockbox && (
                        <span className="briefing__event-meta-item">
                          <span className="briefing__event-meta-icon">{'\u{1F510}'}</span>
                          {event._lockbox}
                        </span>
                      )}
                      {event._accessNotes && (
                        <span className="briefing__event-meta-item">
                          <span className="briefing__event-meta-icon">{'\u{1F4DD}'}</span>
                          {event._accessNotes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="briefing__empty">
            <span className="briefing__empty-icon">{'\u2615'}</span>
            No events scheduled today. Enjoy the clear calendar!
          </div>
        )}
      </div>

      {/* Traffic link */}
      {allEvents.length > 0 && (
        <div className="briefing__traffic">
          <a
            className="briefing__traffic-link"
            href="https://www.google.com/maps/@33.3528,-111.789,12z/data=!5m1!1e1"
            target="_blank"
            rel="noopener noreferrer"
          >
            {'\u{1F697}'} Check Google Maps for current traffic
          </a>
        </div>
      )}
    </div>
  )
}

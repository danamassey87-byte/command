import { Link } from 'react-router-dom'
import { useUpcomingLifeEvents } from '../lib/hooks.js'

const EVENT_ICONS = {
  birthday: '🎂', anniversary: '💍', 'closing-anniv': '🏠',
  'kid-milestone': '👶', 'job-change': '💼', baby: '🍼',
  move: '📦', other: '📅',
}

function daysUntil(dateStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target - today) / 86400000)
}

export default function UpcomingEventsWidget({ days = 30, limit = 6 }) {
  const { data: events } = useUpcomingLifeEvents(days)
  const entries = (events ?? []).slice(0, limit)

  if (entries.length === 0) return null

  return (
    <div style={{
      background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border, #C8C3B9)',
      borderRadius: 8, padding: 16,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono, monospace)', fontSize: '0.62rem',
        textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--color-text-muted, #B79782)',
        marginBottom: 10,
      }}>
        Upcoming Events
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(event => {
          const d = daysUntil(event.occurs_on)
          const icon = EVENT_ICONS[event.kind] || EVENT_ICONS.other
          const contactName = event.contact?.first_name || event.contact?.name || '—'

          return (
            <div key={event.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: '0.9rem', width: 20, textAlign: 'center' }}>{icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {event.contact?.id ? (
                  <Link to={`/contact/${event.contact.id}`} style={{
                    fontSize: '0.78rem', fontWeight: 600, color: 'var(--brown-dark, #3A2A1E)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                    textDecoration: 'none',
                  }}>
                    {contactName}
                  </Link>
                ) : (
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 600, color: 'var(--brown-dark, #3A2A1E)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                  }}>
                    {contactName}
                  </span>
                )}
                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                  {event.kind.replace('-', ' ')}
                </span>
              </div>
              <span style={{
                fontSize: '0.72rem', fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: d <= 3 ? '#c0604a' : d <= 7 ? '#c99a2e' : 'var(--brown-warm, #5A4136)',
              }}>
                {d === 0 ? 'Today' : d === 1 ? 'Tmrw' : `${d}d`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

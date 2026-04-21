import { Link } from 'react-router-dom'
import { useRecentInteractions } from '../lib/hooks.js'

const KIND_META = {
  call:              { icon: '���', label: 'Call' },
  text:              { icon: '💬', label: 'Text' },
  'email-sent':      { icon: '����', label: 'Email' },
  'email-open':      { icon: '👁', label: 'Opened' },
  'email-click':     { icon: '🔗', label: 'Clicked' },
  showing:           { icon: '🏠', label: 'Showing' },
  'oh-signin':       { icon: '📋', label: 'OH Sign-In' },
  'form-fill':       { icon: '📝', label: 'Form' },
  note:              { icon: '📌', label: 'Note' },
  meeting:           { icon: '🤝', label: 'Meeting' },
  other:             { icon: '•',  label: 'Activity' },
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function RecentActivityFeed({ limit = 8 }) {
  const { data: interactions } = useRecentInteractions(limit)
  const entries = interactions ?? []

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
        Recent Activity
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(entry => {
          const meta = KIND_META[entry.kind] || KIND_META.other
          const contactName = entry.contact?.first_name || entry.contact?.name || ''

          return (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', width: 18, textAlign: 'center', flexShrink: 0 }}>{meta.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '0.75rem', color: 'var(--brown-dark)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {contactName ? (
                    entry.contact?.id
                      ? <Link to={`/contact/${entry.contact.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }}>{contactName}</Link>
                      : <span style={{ fontWeight: 600 }}>{contactName}</span>
                  ) : null}
                  {contactName ? ' · ' : ''}{meta.label}
                </div>
                {entry.body && (
                  <div style={{
                    fontSize: '0.65rem', color: 'var(--color-text-muted)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {entry.body.slice(0, 60)}
                  </div>
                )}
              </div>
              <span style={{
                fontSize: '0.62rem', color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-mono)', flexShrink: 0,
              }}>
                {timeAgo(entry.at)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

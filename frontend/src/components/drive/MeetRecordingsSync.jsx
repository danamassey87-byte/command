// ─────────────────────────────────────────────────────────────────────────────
// MeetRecordingsSync — list recent Google Meet recordings from Drive and let
// Dana link each one to a contact, creating an `interactions` row.
//
// Renders as an expandable section inside the Drive card on Settings →
// Connected Accounts. Calls google-drive's list_meet_recordings and
// link_meet_recording actions.
//
// Auto-attendee-matching (by email from Calendar API) is intentionally
// deferred — false positives on the wrong contact are worse than a manual
// pick. This is the spec's explicit recommendation.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useRef } from 'react'
import supabase from '../../lib/supabase'
import * as DB from '../../lib/supabase.js'

function fmtDuration(ms) {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  const mins = Math.floor(s / 60)
  if (mins < 1) return `${s}s`
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  return `${h}h ${mins % 60}m`
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Inline mini contact picker — text input that filters down a list.
function ContactPicker({ contacts, selectedId, onSelect, placeholder = 'Search contacts…' }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef(null)

  const selected = useMemo(
    () => contacts.find(c => c.id === selectedId) || null,
    [contacts, selectedId]
  )

  const matches = useMemo(() => {
    const norm = q.trim().toLowerCase()
    if (!norm) return contacts.slice(0, 20)
    return contacts.filter(c => {
      const hay = `${c.name || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase()
      return hay.includes(norm)
    }).slice(0, 20)
  }, [contacts, q])

  useEffect(() => {
    const h = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false) }
    if (open) { window.addEventListener('mousedown', h); return () => window.removeEventListener('mousedown', h) }
  }, [open])

  return (
    <div style={{ position: 'relative', minWidth: 200 }} ref={wrapRef}>
      <input
        type="text"
        value={open ? q : (selected?.name || '')}
        onChange={e => { setQ(e.target.value); setOpen(true) }}
        onFocus={() => { setOpen(true); setQ('') }}
        placeholder={placeholder}
        style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: `1px solid ${selected ? 'var(--color-success)' : 'var(--color-border)'}`, background: '#fff', fontSize: '0.82rem' }}
      />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid var(--color-border)', borderRadius: 6, maxHeight: 220, overflowY: 'auto', zIndex: 30, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          {matches.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onSelect(c.id); setOpen(false); setQ('') }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.82rem', borderBottom: '1px solid var(--color-border-light, #f0ece6)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--cream, #faf8f5)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 500, color: 'var(--brown-dark)' }}>{c.name || '(unnamed)'}</div>
              {(c.email || c.phone) && (
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{c.email || c.phone}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MeetRecordingsSync() {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recordings, setRecordings] = useState([])
  const [note, setNote] = useState(null)
  const [sinceDays, setSinceDays] = useState(90)
  const [contacts, setContacts] = useState([])
  const [picks, setPicks] = useState({}) // { drive_file_id: contact_id }
  const [linking, setLinking] = useState({}) // { drive_file_id: bool }

  // Lazy-load contacts when the panel first expands.
  useEffect(() => {
    if (!expanded || contacts.length) return
    DB.getContacts().then(setContacts).catch(() => {})
  }, [expanded])

  async function scan() {
    setLoading(true); setError(null); setNote(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('google-drive', {
        body: { action: 'list_meet_recordings', since_days: Number(sinceDays) },
      })
      if (fnErr) throw fnErr
      if (data?.error) throw new Error(data.error)
      setRecordings(data.recordings || [])
      if (data.note) setNote(data.note)
    } catch (err) {
      setError(err.message || 'Could not list recordings')
    } finally {
      setLoading(false)
    }
  }

  async function linkOne(rec) {
    const contactId = picks[rec.drive_file_id]
    if (!contactId) return
    setLinking(s => ({ ...s, [rec.drive_file_id]: true }))
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('google-drive', {
        body: {
          action: 'link_meet_recording',
          drive_file_id: rec.drive_file_id,
          name: rec.name,
          web_view_link: rec.web_view_link,
          thumbnail_link: rec.thumbnail_link,
          created_at: rec.created_at,
          duration_ms: rec.duration_ms,
          contact_id: contactId,
        },
      })
      if (fnErr) throw fnErr
      if (data?.error) throw new Error(data.error)
      setRecordings(prev => prev.map(r => r.drive_file_id === rec.drive_file_id ? { ...r, imported: true, linked_contact_id: contactId } : r))
    } catch (err) {
      alert(`Link failed: ${err.message}`)
    } finally {
      setLinking(s => ({ ...s, [rec.drive_file_id]: false }))
    }
  }

  const newCount = recordings.filter(r => !r.imported).length

  return (
    <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--cream, #faf8f5)', borderRadius: 8 }}>
      <button
        type="button"
        onClick={() => setExpanded(p => !p)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
      >
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
          🎥 Meet Recordings
          <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.78rem', marginLeft: 8 }}>
            link Google Meet videos to client interactions
          </span>
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Look back</label>
            <select
              value={sinceDays}
              onChange={e => setSinceDays(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.82rem' }}
            >
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
            </select>
            <button
              type="button"
              onClick={scan}
              disabled={loading}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brown-warm)', background: 'var(--brown-dark)', color: '#fff', fontSize: '0.82rem', cursor: loading ? 'wait' : 'pointer' }}
            >
              {loading ? 'Scanning…' : 'Scan recordings'}
            </button>
            {recordings.length > 0 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                {recordings.length} found · {newCount} unlinked
              </span>
            )}
          </div>

          {error && <div style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#8a1c0e', padding: '8px 10px', borderRadius: 6, fontSize: '0.82rem', marginBottom: 10 }}>{error}</div>}
          {note && !error && recordings.length === 0 && (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '10px 0' }}>{note}</div>
          )}

          {recordings.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
              {recordings.map(rec => (
                <div key={rec.drive_file_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--color-border-light, #f0ece6)' }}>
                  {rec.thumbnail_link
                    ? <img src={rec.thumbnail_link} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                    : <div style={{ width: 60, height: 40, background: 'var(--cream)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🎥</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--brown-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <a href={rec.web_view_link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>{rec.name}</a>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      {fmtDate(rec.created_at)} · {fmtDuration(rec.duration_ms)}
                    </div>
                  </div>
                  {rec.imported ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#137333', background: '#e6f4ea', padding: '3px 8px', borderRadius: 6 }}>
                      ✓ Linked
                    </span>
                  ) : (
                    <>
                      <ContactPicker
                        contacts={contacts}
                        selectedId={picks[rec.drive_file_id] || null}
                        onSelect={(id) => setPicks(p => ({ ...p, [rec.drive_file_id]: id }))}
                      />
                      <button
                        type="button"
                        onClick={() => linkOne(rec)}
                        disabled={!picks[rec.drive_file_id] || linking[rec.drive_file_id]}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--brown-warm)', background: picks[rec.drive_file_id] ? 'var(--brown-dark)' : '#ccc', color: '#fff', fontSize: '0.78rem', cursor: picks[rec.drive_file_id] ? 'pointer' : 'not-allowed' }}
                      >
                        {linking[rec.drive_file_id] ? '…' : 'Link'}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 10, lineHeight: 1.4 }}>
            Linked recordings show on the contact's interactions timeline as <code style={{ background: '#fff', padding: '1px 5px', borderRadius: 3 }}>kind=meet_recording</code> with a link back to Drive.
            Auto-attendee-matching is deferred — manual picks are safer.
          </p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ListingEmailBlastModal — bulk email blast for a single listing.
//
// Pre-fills subject + body from the most recent banked email-channel
// content_piece for the listing (if any). Lets Dana pick a recipient
// segment (defaulting to Sphere of Influence), edit the subject + body,
// then sends one-off emails sequentially via send-one-off-email.
//
// Props:
//   open       — boolean
//   onClose    — () => void
//   listing    — { id, address, city, list_price/listPrice, ... }
//   propertyId — optional, only used for filtering downstream
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import { CONTACT_SEGMENTS, applySegment } from '../../lib/contactSegments'
import './SendEmailModal.css'

const SEND_DOMAINS = [
  { value: 'primary',   label: 'danamassey.com (warm — best for sphere)' },
  { value: 'subdomain', label: 'mail.danamassey.com (cold/bulk)' },
]

// Curated subset for blast (skips no_email and no_recent_activity).
const BLAST_SEGMENTS = CONTACT_SEGMENTS.filter(s =>
  !['no_email', 'no_recent_activity'].includes(s.key)
)

const DEFAULT_SEGMENT = 'soi'

// Build a clean, readable HTML wrapper around plain-text body.
function buildHtml(bodyText) {
  const escaped = (bodyText || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<div style="font-family:'Nunito Sans',Arial,sans-serif;color:#333;line-height:1.65;max-width:600px;margin:0 auto;padding:24px;">${escaped.replace(/\n/g, '<br>')}</div>`
}

// Default scaffold when no banked email content exists.
function defaultScaffold(listing) {
  const addr = listing?.address || 'this new listing'
  const city = listing?.city ? `, ${listing.city}` : ''
  const price = listing?.list_price || listing?.listPrice || listing?.current_price
  const priceLine = price ? ` · listed at ${typeof price === 'number' ? '$' + price.toLocaleString() : price}` : ''
  return {
    subject: `New Listing — ${addr}${city}`,
    body: [
      `Hi {{first_name}} —`,
      ``,
      `Wanted to put this on your radar before it hits the open market.`,
      ``,
      `${addr}${city}${priceLine}.`,
      ``,
      `Happy to send the full listing sheet, walk you through the property, or set up a private showing if you (or anyone in your circle) is interested.`,
      ``,
      `— Dana`,
    ].join('\n'),
  }
}

// Replace simple {{first_name}} merge tags with the recipient's first name.
function mergeForRecipient(text, recipient) {
  const first = (recipient?.name || '').trim().split(/\s+/)[0] || 'there'
  return (text || '').replace(/\{\{\s*first_name\s*\}\}/gi, first)
}

export default function ListingEmailBlastModal({ open, onClose, listing }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [allContacts, setAllContacts] = useState([])
  const [segmentKey, setSegmentKey] = useState(DEFAULT_SEGMENT)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [fromDomain, setFromDomain] = useState('primary')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null) // {sent, suppressed, failed}
  const [step, setStep] = useState('compose') // 'compose' | 'review' | 'done'
  const [excludedIds, setExcludedIds] = useState(new Set())

  // ── Load on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setResult(null)
    setStep('compose')
    setExcludedIds(new Set())
    Promise.all([
      DB.getContacts(),
      listing?.id ? DB.getLatestEmailDraftForListing(listing.id) : Promise.resolve(null),
    ])
      .then(([contacts, draft]) => {
        if (cancelled) return
        setAllContacts(contacts || [])
        if (draft?.body_text) {
          setSubject(draft.title || defaultScaffold(listing).subject)
          setBody(draft.body_text)
        } else {
          const scaffold = defaultScaffold(listing)
          setSubject(scaffold.subject)
          setBody(scaffold.body)
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not load contacts')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, listing?.id])

  // ── Compute matched recipients for the chosen segment ────────────────────
  const matchedRecipients = useMemo(() => {
    const seg = applySegment(segmentKey, allContacts)
    return seg
      .filter(c => c.email && c.email.trim())
      .map(c => ({ id: c.id, name: c.name, email: c.email.trim().toLowerCase() }))
  }, [allContacts, segmentKey])

  const finalRecipients = useMemo(
    () => matchedRecipients.filter(r => !excludedIds.has(r.id)),
    [matchedRecipients, excludedIds]
  )

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required.')
      return
    }
    if (!finalRecipients.length) {
      setError('No recipients selected.')
      return
    }
    if (!confirm(`Send to ${finalRecipients.length} recipient${finalRecipients.length === 1 ? '' : 's'}? This cannot be undone.`)) return

    setSending(true)
    setError(null)

    // Group identical bodies together — only differs when {{first_name}} is used.
    const hasMerge = /\{\{\s*first_name\s*\}\}/i.test(body) || /\{\{\s*first_name\s*\}\}/i.test(subject)

    let aggregate = { sent: 0, suppressed: 0, failed: [] }
    if (hasMerge) {
      // Send each recipient with their personalized body.
      for (const r of finalRecipients) {
        const merged = mergeForRecipient(body, r)
        const mergedSubject = mergeForRecipient(subject, r)
        const partial = await DB.sendListingEmailBlast({
          recipients: [r],
          subject: mergedSubject,
          html: buildHtml(merged),
          fromDomain,
        })
        aggregate.sent += partial.sent
        aggregate.suppressed += partial.suppressed
        aggregate.failed.push(...partial.failed)
      }
    } else {
      aggregate = await DB.sendListingEmailBlast({
        recipients: finalRecipients,
        subject: subject.trim(),
        html: buildHtml(body),
        fromDomain,
      })
    }

    setResult(aggregate)
    setStep('done')
    setSending(false)

    // Log activity for the audit trail.
    try {
      const segLabel = CONTACT_SEGMENTS.find(s => s.key === segmentKey)?.label || segmentKey
      await DB.logActivity?.(
        'email_blast_sent',
        `Listing email blast — ${listing?.address || ''} → ${segLabel} (sent ${aggregate.sent}/${finalRecipients.length})`
      )
    } catch { /* logActivity is best-effort */ }
  }

  if (!open) return null

  const segObj = CONTACT_SEGMENTS.find(s => s.key === segmentKey)

  return (
    <div className="sem-overlay" onClick={e => { if (e.target === e.currentTarget && !sending) onClose() }}>
      <div className="sem-modal" style={{ maxWidth: 760 }}>
        <div className="sem-modal__header">
          <div>
            <h2 className="sem-modal__title">📧 Email Blast</h2>
            <p className="sem-modal__to">
              {listing?.address ? `${listing.address}${listing.city ? ', ' + listing.city : ''}` : 'Listing'}
            </p>
          </div>
          <div className="sem-modal__actions">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={sending}>Close</Button>
          </div>
        </div>

        <div className="sem-modal__body">
          {loading && <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>Loading contacts…</p>}

          {!loading && step === 'compose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Recipients segment */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Recipients
                </label>
                <select
                  value={segmentKey}
                  onChange={e => { setSegmentKey(e.target.value); setExcludedIds(new Set()) }}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.9rem' }}
                >
                  {BLAST_SEGMENTS.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  <span>{segObj?.description}</span>
                  <span style={{ fontWeight: 600, color: matchedRecipients.length ? 'var(--brown-dark)' : 'var(--color-warning)' }}>
                    {matchedRecipients.length} match{matchedRecipients.length === 1 ? '' : 'es'} with email
                  </span>
                </div>
              </div>

              {/* From domain */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  From
                </label>
                <select
                  value={fromDomain}
                  onChange={e => setFromDomain(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.9rem' }}
                >
                  {SEND_DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              {/* Subject */}
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.92rem' }}
                />
              </div>

              {/* Body */}
              <div>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  <span>Body</span>
                  <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400, fontSize: '0.72rem' }}>
                    Use <code style={{ background: 'var(--cream, #faf8f5)', padding: '1px 6px', borderRadius: 4 }}>{`{{first_name}}`}</code> to personalize
                  </span>
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={12}
                  style={{ width: '100%', marginTop: 6, padding: '12px', borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.9rem', lineHeight: 1.5, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {error && <div style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#8a1c0e', padding: '10px 12px', borderRadius: 8, fontSize: '0.85rem' }}>{error}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  Will send to <strong style={{ color: 'var(--brown-dark)' }}>{finalRecipients.length}</strong> recipient{finalRecipients.length === 1 ? '' : 's'}.
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button variant="ghost" size="sm" onClick={() => setStep('review')} disabled={!matchedRecipients.length}>
                    Review Recipients
                  </Button>
                  <Button variant="primary" size="md" onClick={handleSend} disabled={sending || !finalRecipients.length}>
                    {sending ? 'Sending…' : `Send to ${finalRecipients.length}`}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!loading && step === 'review' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--brown-dark)', margin: 0 }}>
                  Recipients ({finalRecipients.length} of {matchedRecipients.length})
                </h3>
                <Button variant="ghost" size="sm" onClick={() => setStep('compose')}>← Back to compose</Button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 10 }}>
                Click to exclude. Suppressed addresses (unsubscribed) are skipped automatically.
              </p>
              <div style={{ maxHeight: '50vh', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                {matchedRecipients.map(r => {
                  const isExcluded = excludedIds.has(r.id)
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        const next = new Set(excludedIds)
                        if (isExcluded) next.delete(r.id); else next.add(r.id)
                        setExcludedIds(next)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '8px 12px', border: 'none',
                        background: isExcluded ? '#fdecea' : '#fff',
                        borderBottom: '1px solid var(--color-border-light, #f0ece6)',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <span>
                        <span style={{ fontSize: '0.86rem', fontWeight: 500, color: isExcluded ? '#8a1c0e' : 'var(--brown-dark)', textDecoration: isExcluded ? 'line-through' : 'none' }}>
                          {r.name || '(unnamed)'}
                        </span>
                        <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{r.email}</span>
                      </span>
                      <span style={{ fontSize: '0.7rem', color: isExcluded ? '#8a1c0e' : 'var(--color-success)', fontWeight: 600 }}>
                        {isExcluded ? 'Excluded' : 'Included'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!loading && step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" width="56" height="56" style={{ marginBottom: 12 }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="9 12 12 15 16 10"/>
              </svg>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--brown-dark)', margin: '8px 0' }}>
                Sent {result.sent} of {result.sent + result.suppressed + result.failed.length}
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
                {result.suppressed > 0 && <div>{result.suppressed} suppressed (previously unsubscribed)</div>}
                {result.failed.length > 0 && (
                  <div style={{ marginTop: 8, textAlign: 'left', background: '#fdecea', border: '1px solid #f5c6c0', padding: '10px 12px', borderRadius: 8 }}>
                    <strong>Failed ({result.failed.length}):</strong>
                    <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      {result.failed.slice(0, 8).map((f, i) => (
                        <li key={i} style={{ fontSize: '0.78rem', color: '#8a1c0e' }}>{f.email} — {f.error}</li>
                      ))}
                      {result.failed.length > 8 && <li style={{ fontSize: '0.78rem' }}>…and {result.failed.length - 8} more</li>}
                    </ul>
                  </div>
                )}
              </div>
              <Button variant="primary" size="md" onClick={onClose}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ClosingRecapModal — pre-filled "thank you / recap" email to the client
// after a deal closes.
//
// Auto-fills subject + body from the deal facts (price, closing date,
// lender, title co, deal type). Editable, then sends via send-one-off-email
// to the contact's email.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { Button } from '../ui/index.jsx'
import supabase from '../../lib/supabase'
import '../email/SendEmailModal.css'

function fmtDollarNum(v) {
  if (!v && v !== 0) return '—'
  return '$' + Number(v).toLocaleString()
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildDefaultRecap(deal) {
  const firstName = (deal.contact?.name || '').trim().split(/\s+/)[0] || 'there'
  const addr = deal.property?.address || 'your new home'
  const city = deal.property?.city ? `, ${deal.property.city}` : ''
  const closing = fmtDate(deal.closing_date)
  const price = fmtDollarNum(deal.actual_price || deal.property?.price || deal.offer_price)
  const isBuyer = (deal.deal_type === 'buyer' || deal.deal_type === 'both')

  const subject = isBuyer
    ? `🎉 Closed on ${addr} — quick recap & a few next steps`
    : `🎉 Sold on ${addr} — quick recap & a few next steps`

  const body = isBuyer
    ? [
        `Hi ${firstName} —`,
        ``,
        `Officially yours: ${addr}${city}, closed ${closing} at ${price}. 🥂`,
        ``,
        `A few things from my side as we wrap up:`,
        ``,
        `• Final settlement statement is in your Drive folder${deal.title_company ? ` (handed off from ${deal.title_company})` : ''}.`,
        deal.lender ? `• Mortgage docs from ${deal.lender} should hit your portal within a week.` : null,
        `• Keep your closing disclosures + settlement statement for tax season — write-offs depend on them.`,
        `• Update your address with USPS, your insurance carrier, and any subscriptions.`,
        ``,
        `If anything comes up over the next 90 days — a contractor question, a maintenance hiccup, a thought on what to do with the back yard — text me. I'm in your corner past close.`,
        ``,
        `And honest ask: if the experience was solid, I'd love a quick Google review and any referrals you'd be willing to send my way. They're how I keep working with great people like you.`,
        ``,
        `Welcome home, ${firstName}.`,
        ``,
        `— Dana`,
      ]
    : [
        `Hi ${firstName} —`,
        ``,
        `Sold and closed: ${addr}${city} on ${closing} at ${price}. 🥂`,
        ``,
        `A few things from my side:`,
        ``,
        deal.title_company ? `• Final settlement statement from ${deal.title_company} is in your Drive folder.` : `• Final settlement statement is in your Drive folder.`,
        `• Keep that statement + the closing disclosure for tax time — capital-gains math runs through them.`,
        `• If you're rolling proceeds into another property, let me know now so we can structure the timing well.`,
        ``,
        `If anything pops up after close — a question from the buyer's side, a paperwork loose end — text me. I'm here past closing.`,
        ``,
        `And honest ask: if the experience was solid, I'd love a quick Google review and any referrals. They're how I keep working with great people like you.`,
        ``,
        `Thanks for trusting me with the sale, ${firstName}.`,
        ``,
        `— Dana`,
      ]

  return { subject, body: body.filter(line => line !== null).join('\n') }
}

function buildHtml(bodyText) {
  const escaped = (bodyText || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<div style="font-family:'Nunito Sans',Arial,sans-serif;color:#333;line-height:1.65;max-width:600px;margin:0 auto;padding:24px;">${escaped.replace(/\n/g, '<br>')}</div>`
}

export default function ClosingRecapModal({ open, onClose, deal }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  // X5: per-modal-mount idempotency key; rotates after each successful send.
  const idemKeyRef = useRef(crypto.randomUUID())

  useEffect(() => {
    if (!open || !deal) return
    const draft = buildDefaultRecap(deal)
    setSubject(draft.subject)
    setBody(draft.body)
    setSent(false)
    setError(null)
  }, [open, deal])

  if (!open || !deal) return null
  const recipientEmail = (deal.contact?.email || '').trim()

  async function handleSend() {
    if (!recipientEmail) { setError('Contact has no email on file.'); return }
    if (!subject.trim() || !body.trim()) { setError('Subject and body are required.'); return }
    setSending(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-one-off-email', {
        body: {
          to_email: recipientEmail,
          to_name: deal.contact?.name || '',
          subject: subject.trim(),
          html: buildHtml(body),
          from_domain: 'primary',
          contact_id: deal.contact_id || null,
          // X5: double-click on Send becomes a no-op at Resend.
          idempotency_key: idemKeyRef.current,
        },
      })
      if (fnErr) throw fnErr
      if (data?.error) throw new Error(data.error)
      setSent(true)
      idemKeyRef.current = crypto.randomUUID()
    } catch (err) {
      setError(err.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="sem-overlay" onClick={e => { if (e.target === e.currentTarget && !sending) onClose() }}>
      <div className="sem-modal" style={{ maxWidth: 720 }}>
        <div className="sem-modal__header">
          <div>
            <h2 className="sem-modal__title">📧 Closing Recap</h2>
            <p className="sem-modal__to">
              To: {deal.contact?.name || '(no name)'}{recipientEmail ? ` <${recipientEmail}>` : ' — no email on file'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={sending}>Close</Button>
        </div>

        <div className="sem-modal__body">
          {sent ? (
            <div style={{ textAlign: 'center', padding: '36px 12px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" width="56" height="56" style={{ marginBottom: 12 }}>
                <circle cx="12" cy="12" r="10"/>
                <polyline points="9 12 12 15 16 10"/>
              </svg>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--brown-dark)', margin: '8px 0' }}>Recap sent</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {deal.contact?.name} should see it within a minute or two.
              </p>
              <Button variant="primary" size="md" onClick={onClose} style={{ marginTop: 16 }}>Done</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.92rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Body</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={16}
                  style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.9rem', lineHeight: 1.55, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {error && <div style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#8a1c0e', padding: '10px 12px', borderRadius: 8, fontSize: '0.85rem' }}>{error}</div>}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 4 }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  Edit anything before sending. The defaults are deal-aware (buyer vs seller language).
                </span>
                <Button variant="primary" size="md" onClick={handleSend} disabled={sending || !recipientEmail || !subject.trim() || !body.trim()}>
                  {sending ? 'Sending…' : 'Send Recap'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

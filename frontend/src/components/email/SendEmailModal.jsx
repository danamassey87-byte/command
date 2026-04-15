// ─────────────────────────────────────────────────────────────────────────────
// SendEmailModal — Entry point for sending a one-off email to a contact.
//
// Props:
//   open        — boolean
//   onClose     — () => void
//   contact     — { id, name, email, type? }
//   contactType — 'seller' | 'buyer' | 'lead' | 'both' (auto-selects template tab)
//
// Three modes:
//   1. Template picker → opens OneOffEmailComposer with template blocks
//   2. Blank branded   → opens OneOffEmailComposer with default blocks
//   3. Plain text      → simple subject + body form, sends in-app via Resend
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { Button } from '../ui/index.jsx'
import { CAMPAIGN_EMAIL_TEMPLATES, blocksToHtml } from '../../lib/emailHtml'
import { newBlock, fillSigBlock } from '../../pages/EmailBuilder/EmailBuilder.jsx'
import { useBrand } from '../../lib/BrandContext'
import OneOffEmailComposer from './OneOffEmailComposer'
import supabase from '../../lib/supabase'
import './SendEmailModal.css'

const SEND_DOMAINS = [
  { value: 'primary', label: 'danamassey.com (warm)' },
  { value: 'subdomain', label: 'mail.danamassey.com (cold/bulk)' },
]

const TEMPLATE_TABS = [
  { value: 'seller', label: 'Seller' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'general', label: 'General' },
]

export default function SendEmailModal({ open, onClose, contact, contactType }) {
  const { brand } = useBrand()
  const sig = brand?.signature ?? {}

  // Auto-select the right template tab based on contact type
  const defaultTab = contactType === 'buyer' ? 'buyer' : contactType === 'seller' ? 'seller' : (contact?.type === 'buyer' ? 'buyer' : contact?.type === 'seller' ? 'seller' : 'seller')
  const [mode, setMode] = useState('pick') // 'pick' | 'compose' | 'plain'
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templateTab, setTemplateTab] = useState(defaultTab)

  // Plain email state
  const [plainSubject, setPlainSubject] = useState('')
  const [plainBody, setPlainBody] = useState('')
  const [plainDomain, setPlainDomain] = useState('primary')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const resetAndClose = () => {
    setMode('pick')
    setSelectedTemplate(null)
    setPlainSubject('')
    setPlainBody('')
    setSending(false)
    setSent(false)
    setError(null)
    onClose()
  }

  const handlePickTemplate = (template) => {
    setSelectedTemplate(template)
    setMode('compose')
  }

  const handleBlankBranded = () => {
    const defaultBlocks = [
      fillSigBlock(newBlock('header'), sig),
      fillSigBlock(newBlock('greeting'), sig),
      fillSigBlock(newBlock('text'), sig),
      fillSigBlock(newBlock('cta'), sig),
      fillSigBlock(newBlock('signature'), sig),
    ]
    setSelectedTemplate({ blocks: defaultBlocks, settings: { bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 } })
    setMode('compose')
  }

  const handlePlainSend = async () => {
    if (!plainSubject.trim() || !plainBody.trim()) {
      setError('Subject and body are required.')
      return
    }
    setSending(true)
    setError(null)
    try {
      const html = `<div style="font-family: 'Nunito Sans', Arial, sans-serif; color: #333; line-height: 1.65; max-width: 600px; margin: 0 auto; padding: 24px;">${plainBody.replace(/\n/g, '<br>')}</div>`

      const { data, error: fnErr } = await supabase.functions.invoke('send-one-off-email', {
        body: {
          to_email: contact.email,
          to_name: contact.name,
          subject: plainSubject.trim(),
          html,
          from_domain: plainDomain,
          contact_id: contact.id || null,
        },
      })

      if (fnErr) throw fnErr
      if (data?.error) throw new Error(data.error)

      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send email')
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  // ─── Compose mode — full block editor ──────────────────────────────────────
  if (mode === 'compose' && selectedTemplate) {
    return (
      <OneOffEmailComposer
        open
        onClose={() => { setMode('pick'); setSelectedTemplate(null) }}
        onDone={resetAndClose}
        contact={contact}
        initialBlocks={selectedTemplate.blocks}
        initialSettings={selectedTemplate.settings}
      />
    )
  }

  // ─── Pick mode — template grid + plain option ─────────────────────────────
  return (
    <div className="sem-overlay" onClick={e => { if (e.target === e.currentTarget) resetAndClose() }}>
      <div className="sem-modal">
        <div className="sem-modal__header">
          <div>
            <h2 className="sem-modal__title">
              {mode === 'plain' ? 'Plain Text Email' : 'Send Email'}
            </h2>
            <p className="sem-modal__to">To: {contact.name} &lt;{contact.email}&gt;</p>
          </div>
          <div className="sem-modal__actions">
            {mode === 'plain' && (
              <Button variant="ghost" size="sm" onClick={() => { setMode('pick'); setError(null); setSent(false) }}>Back</Button>
            )}
            <Button variant="ghost" size="sm" onClick={resetAndClose}>Close</Button>
          </div>
        </div>

        {mode === 'pick' && (
          <div className="sem-modal__body">
            {/* Quick options */}
            <div className="sem-options">
              <button className="sem-option-card" onClick={handleBlankBranded}>
                <span className="sem-option-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>
                </span>
                <span className="sem-option-card__label">Blank Branded Email</span>
                <span className="sem-option-card__desc">Start from scratch with your brand styling</span>
              </button>
              <button className="sem-option-card" onClick={() => setMode('plain')}>
                <span className="sem-option-card__icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <span className="sem-option-card__label">Plain Text Email</span>
                <span className="sem-option-card__desc">Simple email — like opening Gmail</span>
              </button>
            </div>

            {/* Template grid with category tabs */}
            <div className="sem-templates-section">
              <div className="sem-templates-section__header">
                <h3 className="sem-templates-section__title">Or choose a template</h3>
                <div className="sem-template-tabs">
                  {TEMPLATE_TABS.map(tab => (
                    <button
                      key={tab.value}
                      className={`sem-template-tab ${templateTab === tab.value ? 'sem-template-tab--active' : ''}`}
                      onClick={() => setTemplateTab(tab.value)}
                    >{tab.label}</button>
                  ))}
                </div>
              </div>
              <div className="sem-templates-grid">
                {CAMPAIGN_EMAIL_TEMPLATES.filter(t => t.category === templateTab).map(t => (
                  <button key={t.id} className="sem-template-card" onClick={() => handlePickTemplate(t)}>
                    <span className="sem-template-card__emoji">{t.emoji}</span>
                    <span className="sem-template-card__name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'plain' && (
          <div className="sem-modal__body sem-plain">
            {sent ? (
              <div className="sem-sent-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" width="48" height="48"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>
                <p>Email sent successfully!</p>
                <Button variant="ghost" size="sm" onClick={resetAndClose}>Done</Button>
              </div>
            ) : (
              <>
                <div className="sem-plain__field">
                  <label className="sem-plain__label">FROM DOMAIN</label>
                  <select className="sem-plain__select" value={plainDomain} onChange={e => setPlainDomain(e.target.value)}>
                    {SEND_DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
                <div className="sem-plain__field">
                  <label className="sem-plain__label">SUBJECT</label>
                  <input className="sem-plain__input" value={plainSubject} onChange={e => setPlainSubject(e.target.value)} placeholder="Email subject..." />
                </div>
                <div className="sem-plain__field sem-plain__field--grow">
                  <label className="sem-plain__label">MESSAGE</label>
                  <textarea className="sem-plain__textarea" value={plainBody} onChange={e => setPlainBody(e.target.value)} placeholder="Write your message..." rows={10} />
                </div>
                {error && <div className="sem-error">{error}</div>}
                <div className="sem-plain__actions">
                  <Button variant="primary" size="md" onClick={handlePlainSend} disabled={sending}>
                    {sending ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

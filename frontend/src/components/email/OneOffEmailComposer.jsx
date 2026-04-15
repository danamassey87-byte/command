// ─────────────────────────────────────────────────────────────────────────────
// OneOffEmailComposer — Full block editor for composing + sending one-off emails.
//
// Similar to EmailStepComposer but sends directly via Resend instead of
// saving to a campaign step.
//
// Props:
//   open            — boolean
//   onClose         — () => void (back to SendEmailModal)
//   onDone          — () => void (close everything after successful send)
//   contact         — { id, name, email }
//   initialBlocks   — block array from template
//   initialSettings — email settings from template
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { Button } from '../ui/index.jsx'
import BlockComposer from './BlockComposer'
import { blocksToHtml } from '../../lib/emailHtml'
import { newBlock, fillSigBlock } from '../../pages/EmailBuilder/EmailBuilder.jsx'
import { useBrand } from '../../lib/BrandContext'
import supabase from '../../lib/supabase'
import './EmailStepComposer.css'

const SEND_DOMAINS = [
  { value: 'primary', label: 'danamassey.com (warm)' },
  { value: 'subdomain', label: 'mail.danamassey.com (cold/bulk)' },
]

const TEMPLATE_VARS = [
  '{first_name}', '{last_name}', '{full_name}', '{email}', '{phone}',
  '{property_address}', '{agent_name}', '{agent_first_name}',
  '{brokerage}', '{agent_email}', '{agent_phone}',
]

export default function OneOffEmailComposer({ open, onClose, onDone, contact, initialBlocks, initialSettings }) {
  const { brand } = useBrand()
  const sig = brand?.signature ?? {}

  const [blocks, setBlocks] = useState(() => {
    if (initialBlocks?.length) return initialBlocks.map(b => fillSigBlock({ ...b }, sig))
    return [
      fillSigBlock(newBlock('header'), sig),
      fillSigBlock(newBlock('greeting'), sig),
      fillSigBlock(newBlock('text'), sig),
      fillSigBlock(newBlock('cta'), sig),
      fillSigBlock(newBlock('signature'), sig),
    ]
  })
  const [settings, setSettings] = useState(initialSettings ?? { bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 })
  const [subject, setSubject] = useState('')
  const [domain, setDomain] = useState('primary')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  // Attachments
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const handleUploadPDF = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { alert('Only PDF files are supported.'); return }
    if (file.size > 10 * 1024 * 1024) { alert('File must be under 10 MB.'); return }
    setUploading(true)
    try {
      const filename = `${crypto.randomUUID()}_${file.name}`
      const { error: upErr } = await supabase.storage
        .from('campaign-attachments')
        .upload(filename, file, { contentType: 'application/pdf' })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('campaign-attachments').getPublicUrl(filename)
      setAttachments(prev => [...prev, { name: file.name, url: urlData.publicUrl, size: file.size }])
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Unknown error'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if (!subject.trim()) { setError('Please add a subject line.'); return }
    setSending(true)
    setError(null)

    try {
      // Resolve template variables for HTML rendering
      const firstName = (contact.name || '').split(' ')[0] || ''
      const vars = {
        first_name: firstName,
        last_name: (contact.name || '').split(' ').slice(1).join(' '),
        full_name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        property_address: '',
        agent_name: sig.full_name || 'Dana Massey',
        agent_first_name: (sig.full_name || 'Dana').split(' ')[0],
        brokerage: sig.brokerage || 'REAL Broker',
        agent_email: sig.email || 'dana@danamassey.com',
        agent_phone: sig.phone || '',
      }

      const html = blocksToHtml(blocks, settings, vars)

      const { data, error: fnErr } = await supabase.functions.invoke('send-one-off-email', {
        body: {
          to_email: contact.email,
          to_name: contact.name,
          subject: subject.trim(),
          html,
          from_domain: domain,
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

  if (sent) {
    return (
      <div className="esc-overlay">
        <div className="esc-modal" style={{ maxWidth: 480 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 24px', textAlign: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" width="48" height="48"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brown-dark)', margin: 0 }}>Email sent to {contact.name}!</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>Logged to their contact notes.</p>
            <Button variant="primary" size="sm" onClick={onDone}>Done</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="esc-overlay">
      <div className="esc-modal">
        <div className="esc-modal__header">
          <div>
            <h2 className="esc-modal__title">Compose Email</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
              To: {contact.name} &lt;{contact.email}&gt;
            </p>
          </div>
          <div className="esc-modal__actions">
            <select value={domain} onChange={e => setDomain(e.target.value)} style={{ fontSize: '0.78rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border)' }}>
              {SEND_DOMAINS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
            <Button variant="ghost" size="sm" onClick={onClose}>Back</Button>
            <Button variant="primary" size="sm" onClick={handleSend} disabled={sending}>
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '8px 20px', background: 'var(--color-danger-bg)', fontSize: '0.78rem', color: 'var(--color-danger)' }}>
            {error}
          </div>
        )}

        <BlockComposer
          blocks={blocks}
          settings={settings}
          onChangeBlocks={setBlocks}
          onChangeSettings={setSettings}
          subject={subject}
          onChangeSubject={setSubject}
          showPropertyFill
          compact
        />

        {/* Variables + Attachments footer */}
        <div className="esc-modal__footer">
          <div className="esc-footer__section">
            <span className="esc-footer__label">Variables:</span>
            <div className="esc-footer__vars">
              {TEMPLATE_VARS.map(v => (
                <button key={v} className="sc-var-tag" onClick={() => {
                  const lastTextIdx = blocks.map((b, i) => b.type === 'text' ? i : -1).filter(i => i >= 0).pop()
                  if (lastTextIdx !== undefined) {
                    const next = [...blocks]
                    next[lastTextIdx] = { ...next[lastTextIdx], content: (next[lastTextIdx].content || '') + ` ${v}` }
                    setBlocks(next)
                  }
                }}>{v}</button>
              ))}
            </div>
          </div>

          <div className="esc-footer__section">
            <span className="esc-footer__label">Attachments:</span>
            <div className="esc-footer__attachments">
              {attachments.map((a, i) => (
                <div key={i} className="esc-attachment">
                  <span className="esc-attachment__icon">📎</span>
                  <span className="esc-attachment__name">{a.name}</span>
                  <span className="esc-attachment__size">({Math.round(a.size / 1024)}KB)</span>
                  <button className="esc-attachment__remove" onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleUploadPDF} style={{ display: 'none' }} />
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : '+ Attach PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

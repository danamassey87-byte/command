// ─────────────────────────────────────────────────────────────────────────────
// EmailStepComposer — modal wrapper around BlockComposer for campaign steps.
//
// Opens a full-screen modal with the block editor + live preview.
// On save, passes blocks + settings back to the campaign step.
// Also supports PDF attachment upload.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { Button } from '../ui/index.jsx'
import BlockComposer from './BlockComposer'
import './EmailStepComposer.css'
import { newBlock, fillSigBlock } from '../../pages/EmailBuilder/EmailBuilder.jsx'
import { useBrand } from '../../lib/BrandContext'
import supabase from '../../lib/supabase'

const TEMPLATE_VARS = [
  '{first_name}', '{last_name}', '{full_name}', '{email}', '{phone}',
  '{property_address}', '{agent_name}', '{agent_first_name}',
  '{brokerage}', '{agent_email}', '{agent_phone}',
]

export default function EmailStepComposer({ open, onClose, onSave, initialBlocks, initialSettings, initialSubject, stepAttachments }) {
  const { brand } = useBrand()
  const sig = brand?.signature ?? {}

  const [blocks, setBlocks] = useState(() => {
    if (initialBlocks?.length) return initialBlocks.map(b => ({ ...b }))
    // Default starter blocks
    return [
      fillSigBlock(newBlock('header'), sig),
      fillSigBlock(newBlock('greeting'), sig),
      fillSigBlock(newBlock('text'), sig),
      fillSigBlock(newBlock('cta'), sig),
      fillSigBlock(newBlock('signature'), sig),
    ]
  })
  const [settings, setSettings] = useState(initialSettings ?? { bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 })
  const [subject, setSubject] = useState(initialSubject ?? '')
  const [attachments, setAttachments] = useState(stepAttachments ?? [])
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
      const { error } = await supabase.storage
        .from('campaign-attachments')
        .upload(filename, file, { contentType: 'application/pdf' })

      if (error) throw error

      const { data: urlData } = supabase.storage
        .from('campaign-attachments')
        .getPublicUrl(filename)

      setAttachments(prev => [...prev, { name: file.name, url: urlData.publicUrl, size: file.size }])
    } catch (err) {
      console.error('PDF upload failed:', err)
      alert('Upload failed: ' + (err.message || 'Unknown error'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = () => {
    onSave({
      subject,
      email_blocks: blocks,
      email_settings: settings,
      attachments,
    })
    onClose()
  }

  if (!open) return null

  return (
    <div className="esc-overlay">
      <div className="esc-modal">
        <div className="esc-modal__header">
          <h2 className="esc-modal__title">Email Step Composer</h2>
          <div className="esc-modal__actions">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>Save & Close</Button>
          </div>
        </div>

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

        {/* Variable insert + PDF attachments */}
        <div className="esc-modal__footer">
          <div className="esc-footer__section">
            <span className="esc-footer__label">Variables:</span>
            <div className="esc-footer__vars">
              {TEMPLATE_VARS.map(v => (
                <button key={v} className="sc-var-tag" onClick={() => {
                  // Insert into last text block's content
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
                  <button className="esc-attachment__remove" onClick={() => removeAttachment(i)}>×</button>
                </div>
              ))}
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleUploadPDF} style={{ display: 'none' }} />
              <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : '+ Attach PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

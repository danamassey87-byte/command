// ─────────────────────────────────────────────────────────────────────────────
// BlockComposer — Reusable email block editor + live preview.
//
// Props:
//   blocks          — Array of block objects
//   settings        — { bgColor, emailBgColor, fontFamily, borderRadius }
//   onChangeBlocks  — (blocks) => void
//   onChangeSettings— (settings) => void
//   subject         — optional subject line
//   onChangeSubject — (subject) => void (omit to hide subject bar)
//   showPropertyFill— bool (show quick-fill from property)
//   compact         — bool (smaller for modals)
//
// Used by: EmailBuilder page, EmailStepComposer modal (campaign steps)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { Button } from '../ui/index.jsx'
import { useBrand } from '../../lib/BrandContext'
import { BrandColorPicker, BorderRadiusControl, FontPicker } from '../ui/StyleControls'
import { PropertyPicker } from '../ui/PropertyPicker'

// Re-export from EmailBuilder's existing internals so we don't duplicate
// the massive BlockEditor / PreviewBlock / etc.
// We import them lazily from the EmailBuilder module.
import {
  BLOCK_PALETTE,
  newBlock,
  fillSigBlock as _fillSigBlock,
  BlockEditor,
  PreviewBlock,
  StyleSection,
  EMAIL_SOCIAL_CHANNELS,
} from '../../pages/EmailBuilder/EmailBuilder.jsx'

export default function BlockComposer({
  blocks,
  settings,
  onChangeBlocks,
  onChangeSettings,
  subject,
  onChangeSubject,
  showPropertyFill = false,
  compact = false,
}) {
  const { brand } = useBrand()
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(null)
  const [addingBlock, setAddingBlock] = useState(false)
  const previewRef = useRef(null)

  const socialChannels = brand?.social_channels ?? {}
  const connectedSocials = EMAIL_SOCIAL_CHANNELS.filter(c => socialChannels[c.key]?.trim())
  const sig = brand?.signature ?? {}

  const fillSigBlock = (b) => _fillSigBlock(b, sig)

  const updateBlock = (idx, updated) => {
    const next = [...blocks]
    next[idx] = updated
    onChangeBlocks(next)
  }

  const deleteBlock = (idx) => {
    onChangeBlocks(blocks.filter((_, i) => i !== idx))
    setSelectedBlockIdx(null)
  }

  const moveBlock = (idx, dir) => {
    const next = [...blocks]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    onChangeBlocks(next)
    setSelectedBlockIdx(target)
  }

  const addBlock = (type) => {
    const block = fillSigBlock(newBlock(type))
    onChangeBlocks([...blocks, block])
    setSelectedBlockIdx(blocks.length)
    setAddingBlock(false)
  }

  const handlePropertyFill = (p) => {
    const next = blocks.map(b => {
      if (b.type === 'property-card') {
        return {
          ...b,
          address: [p.address, p.city, 'AZ', p.zip].filter(Boolean).join(', '),
          price: p.price ? `$${Number(p.price).toLocaleString()}` : b.price,
          beds: p.bedrooms ? String(p.bedrooms) : b.beds,
          baths: p.bathrooms ? String(p.bathrooms) : b.baths,
          sqft: p.sqft ? Number(p.sqft).toLocaleString() : b.sqft,
          description: p.marketing_remarks || p.description || b.description,
        }
      }
      if (b.type === 'event-card') {
        return { ...b, address: [p.address, p.city, 'AZ', p.zip].filter(Boolean).join(', ') }
      }
      return b
    })
    onChangeBlocks(next)
    if (onChangeSubject && subject?.includes('{address}')) {
      onChangeSubject(subject.replace('{address}', p.address))
    }
  }

  return (
    <div className={`eb__workspace${compact ? ' eb__workspace--compact' : ''}`}>
      {/* Block List + Editor */}
      <div className="eb__editor-col">
        {/* Subject line (optional) */}
        {onChangeSubject && (
          <div className="eb__subject-bar">
            <label className="eb__field-label">SUBJECT LINE</label>
            <input
              className="eb__subject-input"
              value={subject || ''}
              onChange={e => onChangeSubject(e.target.value)}
              placeholder="Write your subject line..."
            />
          </div>
        )}

        {/* Quick-fill from property */}
        {showPropertyFill && (
          <div className="eb__email-settings">
            <PropertyPicker label="QUICK-FILL FROM A PROPERTY" onSelect={handlePropertyFill} />
          </div>
        )}

        {/* Email-level settings */}
        <div className="eb__email-settings">
          <StyleSection title="Email Settings" defaultOpen={!compact}>
            <BrandColorPicker label="Email Background" value={settings.emailBgColor || '#ffffff'} onChange={v => onChangeSettings({ ...settings, emailBgColor: v })} />
            <BrandColorPicker label="Outer Background" value={settings.bgColor || '#e8e4de'} onChange={v => onChangeSettings({ ...settings, bgColor: v })} showMixes />
            <FontPicker label="Default Font" value={settings.fontFamily} onChange={v => onChangeSettings({ ...settings, fontFamily: v })} />
            <BorderRadiusControl label="Email Container Radius" value={settings.borderRadius ?? 6} onChange={v => onChangeSettings({ ...settings, borderRadius: v })} showPill={false} />
          </StyleSection>
        </div>

        <div className="eb__blocks-list">
          {blocks.map((block, idx) => (
            <div
              key={block.id}
              className={`eb__block-item ${selectedBlockIdx === idx ? 'eb__block-item--selected' : ''}`}
              onClick={() => setSelectedBlockIdx(idx)}
            >
              <span className="eb__block-item-type">{block.type}</span>
              <span className="eb__block-item-preview">
                {block.type === 'text' && (block.content?.slice(0, 50) || 'Empty text')}
                {block.type === 'cta' && block.label}
                {block.type === 'greeting' && block.text}
                {block.type === 'header' && 'Email header'}
                {block.type === 'signature' && block.name}
                {block.type === 'image' && `${block.layout || 'full'} · ${block.shape || 'box'} · ${(block.images || []).filter(u => u).length} img`}
                {block.type === 'property-card' && (block.address || 'Property card')}
                {block.type === 'event-card' && (block.title || 'Event card')}
                {block.type === 'stats-row' && 'Stats row'}
                {block.type === 'divider' && '—'}
              </span>
            </div>
          ))}
        </div>

        {addingBlock ? (
          <div className="eb__add-palette">
            <p className="eb__field-label">ADD A BLOCK</p>
            <div className="eb__palette-grid">
              {BLOCK_PALETTE.map(bp => (
                <button key={bp.type} className="eb__palette-btn" onClick={() => addBlock(bp.type)}>
                  <span>{bp.emoji}</span>
                  <span>{bp.label}</span>
                </button>
              ))}
            </div>
            <button className="eb__cancel-add" onClick={() => setAddingBlock(false)}>Cancel</button>
          </div>
        ) : (
          <button className="eb__add-block-btn" onClick={() => setAddingBlock(true)}>+ Add Block</button>
        )}

        {selectedBlockIdx !== null && blocks[selectedBlockIdx] && (
          <BlockEditor
            block={blocks[selectedBlockIdx]}
            onChange={updated => updateBlock(selectedBlockIdx, updated)}
            onDelete={() => deleteBlock(selectedBlockIdx)}
            onMoveUp={() => moveBlock(selectedBlockIdx, -1)}
            onMoveDown={() => moveBlock(selectedBlockIdx, 1)}
            isFirst={selectedBlockIdx === 0}
            isLast={selectedBlockIdx === blocks.length - 1}
            connectedSocials={connectedSocials}
            socialChannels={socialChannels}
          />
        )}
      </div>

      {/* Live Preview */}
      <div className="eb__preview-col">
        <p className="eb__field-label">LIVE PREVIEW — click any text to edit</p>
        <div className="eb__preview-frame" style={{ background: settings.bgColor || '#e8e4de' }} onClick={() => setSelectedBlockIdx(null)}>
          <div className="eb__preview-email" ref={previewRef} style={{
            background: settings.emailBgColor || '#ffffff',
            fontFamily: settings.fontFamily || "'Poppins', Arial, sans-serif",
            borderRadius: settings.borderRadius ?? 6,
          }}>
            {blocks.map((block, idx) => (
              <PreviewBlock
                key={block.id}
                block={block}
                onChange={updated => updateBlock(idx, updated)}
                isSelected={selectedBlockIdx === idx}
                onSelect={() => setSelectedBlockIdx(idx)}
                socialChannels={socialChannels}
                emailSettings={settings}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

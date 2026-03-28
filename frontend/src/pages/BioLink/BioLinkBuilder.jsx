import { useState, useRef, useCallback } from 'react'
import { Button } from '../../components/ui/index.jsx'
import './BioLinkBuilder.css'

// ─── Default brand colors from the app ───
const BRAND = {
  dark: '#524136',
  mid: '#b79782',
  cream: '#efede8',
  white: '#ffffff',
}

const STORAGE_KEY = 'biolink_page'
const CUSTOM_FONTS_KEY = 'biolink_custom_fonts'

const BUILT_IN_FONTS = [
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Playfair Display', value: "'Playfair Display', Georgia, serif" },
  { name: 'Cormorant Garamond', value: "'Cormorant Garamond', Georgia, serif" },
  { name: 'Georgia', value: "Georgia, serif" },
  { name: 'Arial', value: "Arial, sans-serif" },
  { name: 'Times New Roman', value: "'Times New Roman', serif" },
  { name: 'Courier New', value: "'Courier New', monospace" },
]

function loadCustomFonts() {
  try {
    const saved = localStorage.getItem(CUSTOM_FONTS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function registerCustomFont(name, dataUrl) {
  const font = new FontFace(name, `url(${dataUrl})`)
  font.load().then(loaded => document.fonts.add(loaded)).catch(() => {})
}

// ─── Block templates ───
function newBlock(type) {
  const id = crypto.randomUUID()
  switch (type) {
    case 'header':
      return { id, type, name: 'Dana Massey', subtitle: 'REALTOR® | East Valley AZ', imageUrl: '', bgColor: BRAND.dark, textColor: BRAND.white }
    case 'link':
      return { id, type, label: 'New Link', url: '', icon: '🔗', bgColor: BRAND.mid, textColor: BRAND.white, style: 'filled' }
    case 'form':
      return { id, type, title: 'Download My Free Guide', buttonText: 'Get It Now', guideType: 'buyer', bgColor: BRAND.dark, textColor: BRAND.white }
    case 'divider':
      return { id, type, color: BRAND.mid, thickness: 1 }
    case 'text':
      return { id, type, content: 'Your text here...', fontSize: 14, color: BRAND.dark, align: 'center' }
    case 'image':
      return { id, type, imageUrl: '', alt: '', borderRadius: 12 }
    case 'social':
      return { id, type, instagram: '', facebook: '', tiktok: '', youtube: '', iconColor: BRAND.dark }
    default:
      return { id, type: 'text', content: '' }
  }
}

function loadPage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    bgColor: BRAND.cream,
    maxWidth: 480,
    fontFamily: "'Poppins', sans-serif",
    blocks: [
      newBlock('header'),
      { ...newBlock('link'), label: '🏠 Buyer Guide', url: '#', icon: '📖' },
      { ...newBlock('link'), label: '💰 Seller Guide', url: '#', icon: '📊' },
      { ...newBlock('link'), label: '📋 Home Valuation', url: '#', icon: '🏡' },
      { ...newBlock('form'), title: 'Get My Free Relocation Guide', guideType: 'relocation' },
      newBlock('divider'),
      { ...newBlock('social'), instagram: 'antigravityre', facebook: 'antigravityre' },
    ],
  }
}

// ─── Block add palette ───
const BLOCK_TYPES = [
  { type: 'header', label: 'Profile Header', emoji: '👤' },
  { type: 'link', label: 'Link Button', emoji: '🔗' },
  { type: 'form', label: 'Lead Capture', emoji: '📝' },
  { type: 'text', label: 'Text', emoji: '📄' },
  { type: 'image', label: 'Image', emoji: '🖼️' },
  { type: 'divider', label: 'Divider', emoji: '➖' },
  { type: 'social', label: 'Social Icons', emoji: '📱' },
]

// ─── Block Editor Panel ───
function BlockEditor({ block, onChange, onDelete }) {
  const set = (key, val) => onChange({ ...block, [key]: val })

  const handleImageUpload = (e, key = 'imageUrl') => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set(key, reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="bio-editor__panel">
      <div className="bio-editor__panel-header">
        <span className="bio-editor__panel-type">
          {BLOCK_TYPES.find(b => b.type === block.type)?.emoji} {BLOCK_TYPES.find(b => b.type === block.type)?.label}
        </span>
        <button className="bio-editor__delete-btn" onClick={onDelete}>🗑️</button>
      </div>

      {block.type === 'header' && (
        <>
          <label className="bio-field">
            <span>Name</span>
            <input value={block.name} onChange={e => set('name', e.target.value)} />
          </label>
          <label className="bio-field">
            <span>Subtitle</span>
            <input value={block.subtitle} onChange={e => set('subtitle', e.target.value)} />
          </label>
          <label className="bio-field">
            <span>Profile Photo</span>
            <input type="file" accept="image/*" onChange={e => handleImageUpload(e)} />
          </label>
          <div className="bio-field-row">
            <label className="bio-field"><span>Name Size</span><input type="number" value={block.nameSize || 22} onChange={e => set('nameSize', +e.target.value)} min={12} max={48} /></label>
            <label className="bio-field"><span>Subtitle Size</span><input type="number" value={block.subtitleSize || 13} onChange={e => set('subtitleSize', +e.target.value)} min={10} max={32} /></label>
          </div>
          <div className="bio-field-row">
            <label className="bio-field"><span>Bg Color</span><input type="color" value={block.bgColor} onChange={e => set('bgColor', e.target.value)} /></label>
            <label className="bio-field"><span>Text Color</span><input type="color" value={block.textColor} onChange={e => set('textColor', e.target.value)} /></label>
          </div>
        </>
      )}

      {block.type === 'link' && (
        <>
          <label className="bio-field">
            <span>Label</span>
            <input value={block.label} onChange={e => set('label', e.target.value)} />
          </label>
          <label className="bio-field">
            <span>URL</span>
            <input value={block.url} onChange={e => set('url', e.target.value)} placeholder="https://..." />
          </label>
          <div className="bio-field-row">
            <label className="bio-field"><span>Bg Color</span><input type="color" value={block.bgColor} onChange={e => set('bgColor', e.target.value)} /></label>
            <label className="bio-field"><span>Text Color</span><input type="color" value={block.textColor} onChange={e => set('textColor', e.target.value)} /></label>
          </div>
          <div className="bio-field-row">
            <label className="bio-field">
              <span>Style</span>
              <select value={block.style} onChange={e => set('style', e.target.value)}>
                <option value="filled">Filled</option>
                <option value="outline">Outline</option>
                <option value="ghost">Ghost</option>
              </select>
            </label>
          </div>
        </>
      )}

      {block.type === 'form' && (
        <>
          <label className="bio-field">
            <span>Title</span>
            <input value={block.title} onChange={e => set('title', e.target.value)} />
          </label>
          <label className="bio-field">
            <span>Button Text</span>
            <input value={block.buttonText} onChange={e => set('buttonText', e.target.value)} />
          </label>
          <label className="bio-field">
            <span>Guide Type</span>
            <select value={block.guideType} onChange={e => set('guideType', e.target.value)}>
              <option value="buyer">Buyer Guide</option>
              <option value="seller">Seller Guide</option>
              <option value="valuation">Home Valuation</option>
              <option value="relocation">Relocation Guide</option>
              <option value="open-house">Open House Sign-up</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          <div className="bio-field-row">
            <label className="bio-field"><span>Bg Color</span><input type="color" value={block.bgColor} onChange={e => set('bgColor', e.target.value)} /></label>
            <label className="bio-field"><span>Text Color</span><input type="color" value={block.textColor} onChange={e => set('textColor', e.target.value)} /></label>
          </div>
        </>
      )}

      {block.type === 'text' && (
        <>
          <label className="bio-field">
            <span>Text</span>
            <textarea value={block.content} onChange={e => set('content', e.target.value)} rows={3} />
          </label>
          <div className="bio-field-row">
            <label className="bio-field"><span>Size</span><input type="number" value={block.fontSize} onChange={e => set('fontSize', +e.target.value)} min={10} max={48} /></label>
            <label className="bio-field"><span>Color</span><input type="color" value={block.color} onChange={e => set('color', e.target.value)} /></label>
            <label className="bio-field">
              <span>Align</span>
              <select value={block.align} onChange={e => set('align', e.target.value)}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>
        </>
      )}

      {block.type === 'image' && (
        <>
          <label className="bio-field">
            <span>Upload Image</span>
            <input type="file" accept="image/*" onChange={e => handleImageUpload(e)} />
          </label>
          <label className="bio-field">
            <span>Border Radius</span>
            <input type="range" min={0} max={50} value={block.borderRadius} onChange={e => set('borderRadius', +e.target.value)} />
          </label>
        </>
      )}

      {block.type === 'social' && (
        <>
          <label className="bio-field"><span>Instagram handle</span><input value={block.instagram} onChange={e => set('instagram', e.target.value)} placeholder="username" /></label>
          <label className="bio-field"><span>Facebook</span><input value={block.facebook} onChange={e => set('facebook', e.target.value)} placeholder="page-name" /></label>
          <label className="bio-field"><span>TikTok</span><input value={block.tiktok} onChange={e => set('tiktok', e.target.value)} placeholder="username" /></label>
          <label className="bio-field"><span>YouTube</span><input value={block.youtube} onChange={e => set('youtube', e.target.value)} placeholder="channel" /></label>
          <label className="bio-field"><span>Icon Color</span><input type="color" value={block.iconColor} onChange={e => set('iconColor', e.target.value)} /></label>
        </>
      )}

      {block.type === 'divider' && (
        <div className="bio-field-row">
          <label className="bio-field"><span>Color</span><input type="color" value={block.color} onChange={e => set('color', e.target.value)} /></label>
          <label className="bio-field"><span>Thickness</span><input type="number" value={block.thickness} onChange={e => set('thickness', +e.target.value)} min={1} max={8} /></label>
        </div>
      )}
    </div>
  )
}

// ─── Live Preview Block ───
function PreviewBlock({ block }) {
  if (block.type === 'header') {
    return (
      <div className="bio-preview-header" style={{ background: block.bgColor, color: block.textColor }}>
        {block.imageUrl && <img className="bio-preview-avatar" src={block.imageUrl} alt="" />}
        {!block.imageUrl && <div className="bio-preview-avatar-placeholder" style={{ borderColor: block.textColor }}>{block.name?.[0] || 'D'}</div>}
        <p className="bio-preview-name" style={{ fontSize: block.nameSize || 22 }}>{block.name}</p>
        <p className="bio-preview-subtitle" style={{ fontSize: block.subtitleSize || 13 }}>{block.subtitle}</p>
      </div>
    )
  }
  if (block.type === 'link') {
    const base = { borderRadius: 9999, padding: '14px 24px', textAlign: 'center', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'transform 0.15s', width: '100%', textDecoration: 'none', display: 'block' }
    const styles = {
      filled: { ...base, background: block.bgColor, color: block.textColor, border: 'none' },
      outline: { ...base, background: 'transparent', color: block.bgColor, border: `2px solid ${block.bgColor}` },
      ghost: { ...base, background: 'transparent', color: block.bgColor, border: 'none', textDecoration: 'underline' },
    }
    return <a href={block.url || '#'} style={styles[block.style] || styles.filled} target="_blank" rel="noopener noreferrer">{block.label}</a>
  }
  if (block.type === 'form') {
    return (
      <div className="bio-preview-form" style={{ background: block.bgColor, color: block.textColor }}>
        <p className="bio-preview-form-title">{block.title}</p>
        <div className="bio-preview-form-fields">
          <input placeholder="Name" readOnly style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', padding: '10px 12px', background: 'rgba(255,255,255,0.15)', color: block.textColor, fontSize: 13 }} />
          <input placeholder="Email" readOnly style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', padding: '10px 12px', background: 'rgba(255,255,255,0.15)', color: block.textColor, fontSize: 13 }} />
          <input placeholder="Phone" readOnly style={{ borderRadius: 8, border: '1px solid rgba(255,255,255,0.3)', padding: '10px 12px', background: 'rgba(255,255,255,0.15)', color: block.textColor, fontSize: 13 }} />
        </div>
        <button className="bio-preview-form-btn" style={{ background: block.textColor, color: block.bgColor }}>{block.buttonText}</button>
      </div>
    )
  }
  if (block.type === 'text') {
    return <p style={{ fontSize: block.fontSize, color: block.color, textAlign: block.align, lineHeight: 1.5 }}>{block.content}</p>
  }
  if (block.type === 'image') {
    if (!block.imageUrl) return <div className="bio-preview-img-placeholder">🖼️ Upload an image</div>
    return <img src={block.imageUrl} alt={block.alt} style={{ width: '100%', borderRadius: block.borderRadius, display: 'block' }} />
  }
  if (block.type === 'divider') {
    return <hr style={{ border: 'none', borderTop: `${block.thickness}px solid ${block.color}`, margin: '8px 0' }} />
  }
  if (block.type === 'social') {
    const links = [
      block.instagram && { label: 'IG', url: `https://instagram.com/${block.instagram}` },
      block.facebook && { label: 'FB', url: `https://facebook.com/${block.facebook}` },
      block.tiktok && { label: 'TT', url: `https://tiktok.com/@${block.tiktok}` },
      block.youtube && { label: 'YT', url: `https://youtube.com/@${block.youtube}` },
    ].filter(Boolean)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        {links.map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
            style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${block.iconColor}`, color: block.iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            {l.label}
          </a>
        ))}
      </div>
    )
  }
  return null
}

// ─── Main Builder ───
export default function BioLinkBuilder() {
  const [page, setPage] = useState(loadPage)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const [previewMode, setPreviewMode] = useState('desktop')
  const [customFonts, setCustomFonts] = useState(() => {
    const fonts = loadCustomFonts()
    fonts.forEach(f => registerCustomFont(f.name, f.dataUrl))
    return fonts
  })

  const savePage = (newPage) => {
    setPage(newPage)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPage))
  }

  const handleFontUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const name = file.name.replace(/\.(ttf|otf|woff2?)/i, '')
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      registerCustomFont(name, dataUrl)
      const updated = [...customFonts, { name, dataUrl }]
      setCustomFonts(updated)
      localStorage.setItem(CUSTOM_FONTS_KEY, JSON.stringify(updated))
    }
    reader.readAsDataURL(file)
  }

  const updateBlock = (idx, updated) => {
    const blocks = [...page.blocks]
    blocks[idx] = updated
    savePage({ ...page, blocks })
  }

  const deleteBlock = (idx) => {
    const blocks = page.blocks.filter((_, i) => i !== idx)
    savePage({ ...page, blocks })
    setSelectedIdx(null)
  }

  const addBlock = (type) => {
    const block = newBlock(type)
    const blocks = [...page.blocks, block]
    savePage({ ...page, blocks })
    setSelectedIdx(blocks.length - 1)
  }

  // Drag and drop
  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    setOverIdx(idx)
  }

  const handleDrop = (e, dropIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    const blocks = [...page.blocks]
    const [moved] = blocks.splice(dragIdx, 1)
    blocks.splice(dropIdx, 0, moved)
    savePage({ ...page, blocks })
    setSelectedIdx(dropIdx)
    setDragIdx(null)
    setOverIdx(null)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <div className="bio-builder">
      {/* ─── Left: Block palette + editor ─── */}
      <div className="bio-builder__sidebar">
        <div className="bio-builder__palette">
          <h4 className="bio-builder__palette-title">Add Block</h4>
          <div className="bio-builder__palette-grid">
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} className="bio-builder__add-btn" onClick={() => addBlock(bt.type)}>
                <span>{bt.emoji}</span>
                <span>{bt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bio-builder__page-settings">
          <h4 className="bio-builder__palette-title">Page Settings</h4>
          <label className="bio-field"><span>Background</span><input type="color" value={page.bgColor} onChange={e => savePage({ ...page, bgColor: e.target.value })} /></label>
          <label className="bio-field">
            <span>Font</span>
            <select value={page.fontFamily} onChange={e => savePage({ ...page, fontFamily: e.target.value })}>
              {BUILT_IN_FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
              {customFonts.map(f => <option key={f.name} value={`'${f.name}', sans-serif`}>{f.name} (custom)</option>)}
            </select>
          </label>
          <label className="bio-field">
            <span>Heading Font</span>
            <select value={page.headingFont || page.fontFamily} onChange={e => savePage({ ...page, headingFont: e.target.value })}>
              {BUILT_IN_FONTS.map(f => <option key={f.name} value={f.value}>{f.name}</option>)}
              {customFonts.map(f => <option key={f.name} value={`'${f.name}', sans-serif`}>{f.name} (custom)</option>)}
            </select>
          </label>
          <div className="bio-upload-font">
            <span className="bio-field-label-sm">Upload Custom Font</span>
            <input type="file" accept=".ttf,.otf,.woff,.woff2" onChange={handleFontUpload} style={{ fontSize: '0.72rem' }} />
          </div>
        </div>

        {selectedIdx !== null && page.blocks[selectedIdx] && (
          <BlockEditor
            block={page.blocks[selectedIdx]}
            onChange={(updated) => updateBlock(selectedIdx, updated)}
            onDelete={() => deleteBlock(selectedIdx)}
          />
        )}
      </div>

      {/* ─── Right: Live preview ─── */}
      <div className="bio-builder__preview-wrap">
        <div className="bio-builder__preview-toolbar">
          <div className="bio-builder__preview-tabs">
            <button className={`bio-preview-tab ${previewMode === 'desktop' ? 'bio-preview-tab--active' : ''}`} onClick={() => setPreviewMode('desktop')}>🖥️ Desktop</button>
            <button className={`bio-preview-tab ${previewMode === 'mobile' ? 'bio-preview-tab--active' : ''}`} onClick={() => setPreviewMode('mobile')}>📱 Mobile</button>
          </div>
          <Button size="sm" variant="primary" onClick={() => { /* TODO: publish */ }}>Publish</Button>
        </div>

        <div className={`bio-builder__preview-device ${previewMode === 'mobile' ? 'bio-builder__preview-device--mobile' : ''}`}>
          <div className="bio-builder__preview-page" style={{ background: page.bgColor, fontFamily: page.fontFamily, '--bio-heading-font': page.headingFont || page.fontFamily }}>
            {page.blocks.map((block, idx) => (
              <div
                key={block.id}
                className={`bio-builder__preview-block ${selectedIdx === idx ? 'bio-builder__preview-block--selected' : ''} ${overIdx === idx && dragIdx !== idx ? 'bio-builder__preview-block--drop' : ''} ${dragIdx === idx ? 'bio-builder__preview-block--dragging' : ''}`}
                onClick={() => setSelectedIdx(idx)}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
              >
                <div className="bio-builder__block-handle">⠿</div>
                <PreviewBlock block={block} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

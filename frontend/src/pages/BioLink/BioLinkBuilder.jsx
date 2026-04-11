import { useState, useRef, useCallback } from 'react'
import { Button } from '../../components/ui/index.jsx'
import { BrandColorPicker, BorderRadiusControl, FontPicker, FontSizeControl, SpacingControl } from '../../components/ui/StyleControls'
import { PropertyPicker } from '../../components/ui/PropertyPicker'
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
      return { id, type, name: 'Dana Massey', subtitle: 'REALTOR® | East Valley AZ', imageUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, nameSize: 22, subtitleSize: 13, borderRadius: 12, fontFamily: '', padding: 24 }
    case 'link':
      return { id, type, label: 'New Link', url: '', icon: '🔗', bgColor: BRAND.mid, textColor: BRAND.white, style: 'filled', borderRadius: 9999, fontSize: 14, fontFamily: '', padding: 14 }
    case 'form':
      return { id, type, title: 'Download My Free Guide', buttonText: 'Get It Now', guideType: 'buyer', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 12, buttonRadius: 9999, titleSize: 16, fontFamily: '', padding: 20 }
    case 'divider':
      return { id, type, color: BRAND.mid, thickness: 1, style: 'solid', spacing: 8 }
    case 'text':
      return { id, type, content: 'Your text here...', fontSize: 14, color: BRAND.dark, align: 'center', fontFamily: '', lineHeight: 1.5, letterSpacing: 0 }
    case 'image':
      return { id, type, imageUrl: '', alt: '', borderRadius: 12, shadow: false }
    case 'social':
      return { id, type, instagram: '', facebook: '', tiktok: '', youtube: '', iconColor: BRAND.dark, iconBgColor: 'transparent', iconSize: 40, iconRadius: 9999, iconStyle: 'outline' }
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
    headingFont: '',
    pageRadius: 20,
    pagePadding: 24,
    blockGap: 12,
    blocks: [
      newBlock('header'),
      { ...newBlock('link'), label: '🏠 Buyer Guide', url: '#', icon: '📖' },
      { ...newBlock('link'), label: '💰 Seller Guide', url: '#', icon: '📊' },
      { ...newBlock('link'), label: '📋 Home Valuation', url: '#', icon: '🏡' },
      { ...newBlock('form'), title: 'Get My Free Relocation Guide', guideType: 'relocation' },
      newBlock('divider'),
      { ...newBlock('social'), instagram: 'danamassey', facebook: 'danamassey' },
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

// ─── Collapsible style section ───
function StyleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bio-style-section">
      <button className="bio-style-section__toggle" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="bio-style-section__body">{children}</div>}
    </div>
  )
}

// ─── Block Editor Panel ───
function BlockEditor({ block, onChange, onDelete, customFonts }) {
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

      {/* ─── HEADER ─── */}
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

          <StyleSection title="Colors" defaultOpen>
            <BrandColorPicker label="Background" value={block.bgColor} onChange={v => set('bgColor', v)} showMixes />
            <BrandColorPicker label="Text" value={block.textColor} onChange={v => set('textColor', v)} />
          </StyleSection>

          <StyleSection title="Typography">
            <FontPicker label="Font" value={block.fontFamily} onChange={v => set('fontFamily', v)} customFonts={customFonts} />
            <FontSizeControl label="Name Size" value={block.nameSize || 22} onChange={v => set('nameSize', v)} min={14} max={48} />
            <FontSizeControl label="Subtitle Size" value={block.subtitleSize || 13} onChange={v => set('subtitleSize', v)} min={10} max={32} />
          </StyleSection>

          <StyleSection title="Shape & Spacing">
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius ?? 12} onChange={v => set('borderRadius', v)} showPill={false} />
            <SpacingControl label="Padding" value={block.padding ?? 24} onChange={v => set('padding', v)} max={60} />
          </StyleSection>
        </>
      )}

      {/* ─── LINK ─── */}
      {block.type === 'link' && (
        <>
          <PropertyPicker
            label="Link to a property"
            compact
            onSelect={(p) => {
              const label = p.address || block.label
              const url = p.listing_url || block.url
              onChange({ ...block, label: `🏠 ${label}`, url })
            }}
          />
          <label className="bio-field">
            <span>Label</span>
            <input value={block.label} onChange={e => set('label', e.target.value)} />
          </label>
          <label className="bio-field">
            <span>URL</span>
            <input value={block.url} onChange={e => set('url', e.target.value)} placeholder="https://..." />
          </label>
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

          <StyleSection title="Colors" defaultOpen>
            <BrandColorPicker label="Button Color" value={block.bgColor} onChange={v => set('bgColor', v)} showMixes />
            <BrandColorPicker label="Text Color" value={block.textColor} onChange={v => set('textColor', v)} />
          </StyleSection>

          <StyleSection title="Typography">
            <FontPicker label="Font" value={block.fontFamily} onChange={v => set('fontFamily', v)} customFonts={customFonts} />
            <FontSizeControl label="Font Size" value={block.fontSize || 14} onChange={v => set('fontSize', v)} min={11} max={24} />
          </StyleSection>

          <StyleSection title="Shape & Spacing">
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius ?? 9999} onChange={v => set('borderRadius', v)} />
            <SpacingControl label="Padding" value={block.padding ?? 14} onChange={v => set('padding', v)} max={30} />
          </StyleSection>
        </>
      )}

      {/* ─── FORM ─── */}
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

          <StyleSection title="Colors" defaultOpen>
            <BrandColorPicker label="Background" value={block.bgColor} onChange={v => set('bgColor', v)} showMixes />
            <BrandColorPicker label="Text / Button" value={block.textColor} onChange={v => set('textColor', v)} />
          </StyleSection>

          <StyleSection title="Typography">
            <FontPicker label="Font" value={block.fontFamily} onChange={v => set('fontFamily', v)} customFonts={customFonts} />
            <FontSizeControl label="Title Size" value={block.titleSize || 16} onChange={v => set('titleSize', v)} min={12} max={28} />
          </StyleSection>

          <StyleSection title="Shape & Spacing">
            <BorderRadiusControl label="Card Radius" value={block.borderRadius ?? 12} onChange={v => set('borderRadius', v)} showPill={false} />
            <BorderRadiusControl label="Button Radius" value={block.buttonRadius ?? 9999} onChange={v => set('buttonRadius', v)} />
            <SpacingControl label="Padding" value={block.padding ?? 20} onChange={v => set('padding', v)} max={40} />
          </StyleSection>
        </>
      )}

      {/* ─── TEXT ─── */}
      {block.type === 'text' && (
        <>
          <label className="bio-field">
            <span>Text</span>
            <textarea value={block.content} onChange={e => set('content', e.target.value)} rows={3} />
          </label>
          <div className="bio-field-row">
            <label className="bio-field">
              <span>Align</span>
              <select value={block.align} onChange={e => set('align', e.target.value)}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
          </div>

          <StyleSection title="Color" defaultOpen>
            <BrandColorPicker label="Text Color" value={block.color} onChange={v => set('color', v)} />
          </StyleSection>

          <StyleSection title="Typography">
            <FontPicker label="Font" value={block.fontFamily} onChange={v => set('fontFamily', v)} customFonts={customFonts} />
            <FontSizeControl label="Font Size" value={block.fontSize} onChange={v => set('fontSize', v)} />
            <div className="bio-field-row">
              <label className="bio-field">
                <span>Line Height</span>
                <input type="number" value={block.lineHeight ?? 1.5} onChange={e => set('lineHeight', +e.target.value)} min={1} max={3} step={0.1} />
              </label>
              <label className="bio-field">
                <span>Letter Spacing</span>
                <input type="number" value={block.letterSpacing ?? 0} onChange={e => set('letterSpacing', +e.target.value)} min={-2} max={10} step={0.5} />
              </label>
            </div>
          </StyleSection>
        </>
      )}

      {/* ─── IMAGE ─── */}
      {block.type === 'image' && (
        <>
          <label className="bio-field">
            <span>Upload Image</span>
            <input type="file" accept="image/*" onChange={e => handleImageUpload(e)} />
          </label>
          <StyleSection title="Shape" defaultOpen>
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius} onChange={v => set('borderRadius', v)} max={50} />
            <label className="bio-field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={block.shadow || false} onChange={e => set('shadow', e.target.checked)} />
              <span style={{ textTransform: 'none', letterSpacing: 0 }}>Drop shadow</span>
            </label>
          </StyleSection>
        </>
      )}

      {/* ─── SOCIAL ─── */}
      {block.type === 'social' && (
        <>
          <label className="bio-field"><span>Instagram handle</span><input value={block.instagram} onChange={e => set('instagram', e.target.value)} placeholder="username" /></label>
          <label className="bio-field"><span>Facebook</span><input value={block.facebook} onChange={e => set('facebook', e.target.value)} placeholder="page-name" /></label>
          <label className="bio-field"><span>TikTok</span><input value={block.tiktok} onChange={e => set('tiktok', e.target.value)} placeholder="username" /></label>
          <label className="bio-field"><span>YouTube</span><input value={block.youtube} onChange={e => set('youtube', e.target.value)} placeholder="channel" /></label>

          <StyleSection title="Icon Style" defaultOpen>
            <BrandColorPicker label="Icon Color" value={block.iconColor} onChange={v => set('iconColor', v)} />
            <BrandColorPicker label="Icon Background" value={block.iconBgColor || 'transparent'} onChange={v => set('iconBgColor', v)} />
            <div className="bio-field-row">
              <label className="bio-field">
                <span>Style</span>
                <select value={block.iconStyle || 'outline'} onChange={e => set('iconStyle', e.target.value)}>
                  <option value="outline">Outline</option>
                  <option value="filled">Filled</option>
                  <option value="plain">Plain (no border)</option>
                </select>
              </label>
              <label className="bio-field">
                <span>Icon Size</span>
                <input type="number" value={block.iconSize || 40} onChange={e => set('iconSize', +e.target.value)} min={24} max={64} />
              </label>
            </div>
            <BorderRadiusControl label="Icon Shape" value={block.iconRadius ?? 9999} onChange={v => set('iconRadius', v)} max={32} />
          </StyleSection>
        </>
      )}

      {/* ─── DIVIDER ─── */}
      {block.type === 'divider' && (
        <>
          <StyleSection title="Style" defaultOpen>
            <BrandColorPicker label="Color" value={block.color} onChange={v => set('color', v)} />
            <div className="bio-field-row">
              <label className="bio-field">
                <span>Thickness</span>
                <input type="number" value={block.thickness} onChange={e => set('thickness', +e.target.value)} min={1} max={8} />
              </label>
              <label className="bio-field">
                <span>Style</span>
                <select value={block.style || 'solid'} onChange={e => set('style', e.target.value)}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </label>
            </div>
            <SpacingControl label="Vertical Spacing" value={block.spacing ?? 8} onChange={v => set('spacing', v)} max={40} />
          </StyleSection>
        </>
      )}
    </div>
  )
}

// ─── Live Preview Block ───
function PreviewBlock({ block, pageFont }) {
  if (block.type === 'header') {
    const font = block.fontFamily || pageFont
    return (
      <div className="bio-preview-header" style={{
        background: block.bgColor,
        color: block.textColor,
        borderRadius: block.borderRadius ?? 12,
        padding: block.padding ?? 24,
        fontFamily: font || undefined,
      }}>
        {block.imageUrl && <img className="bio-preview-avatar" src={block.imageUrl} alt="" />}
        {!block.imageUrl && <div className="bio-preview-avatar-placeholder" style={{ borderColor: block.textColor }}>{block.name?.[0] || 'D'}</div>}
        <p className="bio-preview-name" style={{ fontSize: block.nameSize || 22, fontFamily: font || undefined }}>{block.name}</p>
        <p className="bio-preview-subtitle" style={{ fontSize: block.subtitleSize || 13 }}>{block.subtitle}</p>
      </div>
    )
  }
  if (block.type === 'link') {
    const font = block.fontFamily || pageFont
    const base = {
      borderRadius: block.borderRadius ?? 9999,
      padding: `${block.padding ?? 14}px 24px`,
      textAlign: 'center',
      fontWeight: 600,
      fontSize: block.fontSize || 14,
      fontFamily: font || undefined,
      cursor: 'pointer',
      transition: 'transform 0.15s',
      width: '100%',
      textDecoration: 'none',
      display: 'block',
    }
    const styles = {
      filled: { ...base, background: block.bgColor, color: block.textColor, border: 'none' },
      outline: { ...base, background: 'transparent', color: block.bgColor, border: `2px solid ${block.bgColor}` },
      ghost: { ...base, background: 'transparent', color: block.bgColor, border: 'none', textDecoration: 'underline' },
    }
    return <a href={block.url || '#'} style={styles[block.style] || styles.filled} target="_blank" rel="noopener noreferrer">{block.label}</a>
  }
  if (block.type === 'form') {
    const font = block.fontFamily || pageFont
    const inputRadius = Math.min(block.borderRadius ?? 12, 20)
    return (
      <div className="bio-preview-form" style={{
        background: block.bgColor,
        color: block.textColor,
        borderRadius: block.borderRadius ?? 12,
        padding: block.padding ?? 20,
        fontFamily: font || undefined,
      }}>
        <p className="bio-preview-form-title" style={{ fontSize: block.titleSize || 16 }}>{block.title}</p>
        <div className="bio-preview-form-fields">
          <input placeholder="Name" readOnly style={{ borderRadius: inputRadius, border: '1px solid rgba(255,255,255,0.3)', padding: '10px 12px', background: 'rgba(255,255,255,0.15)', color: block.textColor, fontSize: 13 }} />
          <input placeholder="Email" readOnly style={{ borderRadius: inputRadius, border: '1px solid rgba(255,255,255,0.3)', padding: '10px 12px', background: 'rgba(255,255,255,0.15)', color: block.textColor, fontSize: 13 }} />
          <input placeholder="Phone" readOnly style={{ borderRadius: inputRadius, border: '1px solid rgba(255,255,255,0.3)', padding: '10px 12px', background: 'rgba(255,255,255,0.15)', color: block.textColor, fontSize: 13 }} />
        </div>
        <button className="bio-preview-form-btn" style={{ background: block.textColor, color: block.bgColor, borderRadius: block.buttonRadius ?? 9999 }}>{block.buttonText}</button>
      </div>
    )
  }
  if (block.type === 'text') {
    const font = block.fontFamily || pageFont
    return <p style={{
      fontSize: block.fontSize,
      color: block.color,
      textAlign: block.align,
      lineHeight: block.lineHeight ?? 1.5,
      letterSpacing: block.letterSpacing ? `${block.letterSpacing}px` : undefined,
      fontFamily: font || undefined,
    }}>{block.content}</p>
  }
  if (block.type === 'image') {
    if (!block.imageUrl) return <div className="bio-preview-img-placeholder">🖼️ Upload an image</div>
    return <img src={block.imageUrl} alt={block.alt} style={{
      width: '100%',
      borderRadius: block.borderRadius,
      display: 'block',
      boxShadow: block.shadow ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
    }} />
  }
  if (block.type === 'divider') {
    return <hr style={{
      border: 'none',
      borderTop: `${block.thickness}px ${block.style || 'solid'} ${block.color}`,
      margin: `${block.spacing ?? 8}px 0`,
    }} />
  }
  if (block.type === 'social') {
    const links = [
      block.instagram && { label: 'IG', url: `https://instagram.com/${block.instagram}` },
      block.facebook && { label: 'FB', url: `https://facebook.com/${block.facebook}` },
      block.tiktok && { label: 'TT', url: `https://tiktok.com/@${block.tiktok}` },
      block.youtube && { label: 'YT', url: `https://youtube.com/@${block.youtube}` },
    ].filter(Boolean)

    const iconStyle = block.iconStyle || 'outline'
    const size = block.iconSize || 40
    const radius = block.iconRadius ?? 9999

    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
        {links.map(l => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer"
            style={{
              width: size,
              height: size,
              borderRadius: radius,
              border: iconStyle === 'outline' ? `2px solid ${block.iconColor}` : 'none',
              background: iconStyle === 'filled' ? (block.iconBgColor && block.iconBgColor !== 'transparent' ? block.iconBgColor : block.iconColor) : 'transparent',
              color: iconStyle === 'filled' ? (block.iconBgColor && block.iconBgColor !== 'transparent' ? block.iconColor : '#fff') : block.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.round(size * 0.3),
              fontWeight: 700,
              textDecoration: 'none',
            }}>
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

          <BrandColorPicker label="Page Background" value={page.bgColor} onChange={v => savePage({ ...page, bgColor: v })} showMixes />

          <FontPicker label="Body Font" value={page.fontFamily} onChange={v => savePage({ ...page, fontFamily: v })} customFonts={customFonts} />
          <FontPicker label="Heading Font" value={page.headingFont || page.fontFamily} onChange={v => savePage({ ...page, headingFont: v })} customFonts={customFonts} />

          <BorderRadiusControl label="Page Corner Radius" value={page.pageRadius ?? 20} onChange={v => savePage({ ...page, pageRadius: v })} max={40} showPill={false} />
          <SpacingControl label="Page Padding" value={page.pagePadding ?? 24} onChange={v => savePage({ ...page, pagePadding: v })} max={48} />
          <SpacingControl label="Block Gap" value={page.blockGap ?? 12} onChange={v => savePage({ ...page, blockGap: v })} max={32} />

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
            customFonts={customFonts}
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
          <div className="bio-builder__preview-page" style={{
            background: page.bgColor,
            fontFamily: page.fontFamily,
            '--bio-heading-font': page.headingFont || page.fontFamily,
            borderRadius: page.pageRadius ?? 20,
            padding: `${page.pagePadding ?? 24}px`,
            gap: page.blockGap ?? 12,
          }}>
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
                <PreviewBlock block={block} pageFont={page.fontFamily} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

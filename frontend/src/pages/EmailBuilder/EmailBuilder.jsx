import { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/ui/index.jsx'
import './EmailBuilder.css'

// ─── Storage ───
const STORAGE_KEY = 'email_builder_drafts'
const TEMPLATES_KEY = 'email_saved_templates'

// ─── Brand ───
const BRAND = {
  dark: '#524136',
  mid: '#b79782',
  cream: '#efede8',
  white: '#ffffff',
}

// ─── Email templates for real estate ───
const STARTER_TEMPLATES = [
  {
    id: 'buyer-followup',
    name: 'Buyer Follow-Up',
    emoji: '🏡',
    category: 'NURTURE',
    subject: 'Great chatting with you — next steps!',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '2', type: 'greeting', text: 'Hi {first_name},' },
      { id: '3', type: 'text', content: "It was so great connecting with you! I know the home search can feel overwhelming, but I'm here to make it as smooth and exciting as possible.\n\nBased on what you shared, I've already started keeping an eye out for homes that match your wishlist. I'll send over some options soon!" },
      { id: '4', type: 'cta', label: 'View My Latest Picks', url: '#', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '5', type: 'text', content: "In the meantime, don't hesitate to reach out if anything comes to mind — budget questions, neighborhood vibes, timeline, anything at all." },
      { id: '6', type: 'signature', name: 'Dana Massey', title: 'REALTOR® | Antigravity Real Estate', phone: '', email: '' },
    ],
  },
  {
    id: 'new-listing',
    name: 'New Listing Announcement',
    emoji: '🏠',
    category: 'LISTINGS',
    subject: 'Just Listed — {address}',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '2', type: 'greeting', text: 'Hi {first_name},' },
      { id: '3', type: 'text', content: "I'm excited to share a brand new listing that just hit the market!" },
      { id: '4', type: 'image', images: [''], alt: 'Property photo', layout: 'full', shape: 'rounded' },
      { id: '5', type: 'property-card', address: '123 Main St, Gilbert AZ 85234', price: '$450,000', beds: '4', baths: '2.5', sqft: '2,100', description: 'Gorgeous updated home with a sparkling pool, open floor plan, and modern finishes throughout.' },
      { id: '6', type: 'cta', label: 'Schedule a Showing', url: '#', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '7', type: 'text', content: 'Know someone who might be interested? I appreciate referrals more than you know!' },
      { id: '8', type: 'signature', name: 'Dana Massey', title: 'REALTOR® | Antigravity Real Estate', phone: '', email: '' },
    ],
  },
  {
    id: 'open-house-invite',
    name: 'Open House Invite',
    emoji: '🎉',
    category: 'EVENTS',
    subject: "You're Invited — Open House this {day}!",
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '2', type: 'greeting', text: 'Hi {first_name},' },
      { id: '3', type: 'text', content: "I'd love for you to stop by my upcoming open house! Whether you're actively looking or just curious about the market, it's a great chance to tour a beautiful home and chat." },
      { id: '4', type: 'event-card', title: 'Open House', date: 'Saturday, April 5', time: '11:00 AM — 2:00 PM', address: '456 Oak Ave, Gilbert AZ 85234' },
      { id: '5', type: 'image', images: [''], alt: 'Open house property', layout: 'full', shape: 'rounded' },
      { id: '6', type: 'cta', label: 'RSVP / Get Directions', url: '#', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '7', type: 'text', content: 'Feel free to bring friends and family. See you there!' },
      { id: '8', type: 'signature', name: 'Dana Massey', title: 'REALTOR® | Antigravity Real Estate', phone: '', email: '' },
    ],
  },
  {
    id: 'market-update',
    name: 'Market Update',
    emoji: '📊',
    category: 'AUTHORITY',
    subject: '{month} Market Update — East Valley',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '2', type: 'greeting', text: 'Hi {first_name},' },
      { id: '3', type: 'text', content: "Here's your quick snapshot of what's happening in the East Valley real estate market this month:" },
      { id: '4', type: 'stats-row', stats: [
        { label: 'Median Price', value: '$485,000', delta: '+3.2%' },
        { label: 'Days on Market', value: '28', delta: '-5 days' },
        { label: 'Active Listings', value: '1,240', delta: '+12%' },
      ]},
      { id: '5', type: 'text', content: "What does this mean for you?\n\nIf you're a seller: Homes are still moving, but pricing right from the start is more important than ever.\n\nIf you're a buyer: More inventory means more options and a bit more negotiating power." },
      { id: '6', type: 'cta', label: 'Get Your Home Value', url: '#', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '7', type: 'text', content: "Questions about your specific neighborhood? Just hit reply — I'm always happy to pull the numbers for you." },
      { id: '8', type: 'signature', name: 'Dana Massey', title: 'REALTOR® | Antigravity Real Estate', phone: '', email: '' },
    ],
  },
  {
    id: 'just-sold',
    name: 'Just Sold',
    emoji: '🎊',
    category: 'LISTINGS',
    subject: 'Just Sold — {address}',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '2', type: 'greeting', text: 'Hi {first_name},' },
      { id: '3', type: 'text', content: "Another one closed! I'm thrilled to share that this beautiful home has officially SOLD." },
      { id: '4', type: 'image', images: [''], alt: 'Sold property', layout: 'full', shape: 'rounded' },
      { id: '5', type: 'property-card', address: '789 Elm Dr, Mesa AZ 85213', price: '$525,000', beds: '4', baths: '3', sqft: '2,400', description: 'Sold in just 6 days with multiple offers!' },
      { id: '6', type: 'text', content: "Curious what your home could sell for in today's market? I'd love to run the numbers for you — no pressure, just helpful info." },
      { id: '7', type: 'cta', label: "What's My Home Worth?", url: '#', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '8', type: 'signature', name: 'Dana Massey', title: 'REALTOR® | Antigravity Real Estate', phone: '', email: '' },
    ],
  },
  {
    id: 'blank',
    name: 'Start from Scratch',
    emoji: '✏️',
    category: 'CUSTOM',
    subject: '',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white },
      { id: '2', type: 'greeting', text: 'Hi {first_name},' },
      { id: '3', type: 'text', content: '' },
      { id: '4', type: 'signature', name: 'Dana Massey', title: 'REALTOR® | Antigravity Real Estate', phone: '', email: '' },
    ],
  },
]

const CATEGORY_COLORS = {
  NURTURE: '#6a9e72',
  LISTINGS: '#c99a2e',
  EVENTS: '#c0604a',
  AUTHORITY: '#5a87b4',
  CUSTOM: '#b79782',
}

const IMAGE_LAYOUTS = [
  { value: 'full', label: 'Full Width', emoji: '▬', slots: 1 },
  { value: '2-row', label: '2 in a Row', emoji: '◫', slots: 2 },
  { value: '3-row', label: '3 in a Row', emoji: '☰', slots: 3 },
  { value: '4-row', label: '4 in a Row', emoji: '⊞', slots: 4 },
  { value: '2x2', label: '2×2 Grid', emoji: '⊞', slots: 4 },
  { value: '1-2', label: '1 + 2 Below', emoji: '⊟', slots: 3 },
]

const IMAGE_SHAPES = [
  { value: 'box', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
  { value: 'arch', label: 'Arch' },
]

const BLOCK_PALETTE = [
  { type: 'text', label: 'Text Block', emoji: '📝' },
  { type: 'image', label: 'Image', emoji: '🖼️' },
  { type: 'cta', label: 'Button / CTA', emoji: '🔘' },
  { type: 'property-card', label: 'Property Card', emoji: '🏠' },
  { type: 'event-card', label: 'Event Card', emoji: '📅' },
  { type: 'stats-row', label: 'Stats Row', emoji: '📊' },
  { type: 'divider', label: 'Divider', emoji: '➖' },
  { type: 'greeting', label: 'Greeting', emoji: '👋' },
  { type: 'signature', label: 'Signature', emoji: '✍️' },
]

function newBlock(type) {
  const id = crypto.randomUUID()
  switch (type) {
    case 'header':
      return { id, type, logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white }
    case 'greeting':
      return { id, type, text: 'Hi {first_name},' }
    case 'text':
      return { id, type, content: '' }
    case 'image':
      return { id, type, images: [''], alt: '', layout: 'full', shape: 'box' }
    case 'cta':
      return { id, type, label: 'Learn More', url: '', bgColor: BRAND.dark, textColor: BRAND.white }
    case 'property-card':
      return { id, type, address: '', price: '', beds: '', baths: '', sqft: '', description: '' }
    case 'event-card':
      return { id, type, title: 'Open House', date: '', time: '', address: '' }
    case 'stats-row':
      return { id, type, stats: [
        { label: 'Stat 1', value: '—', delta: '' },
        { label: 'Stat 2', value: '—', delta: '' },
        { label: 'Stat 3', value: '—', delta: '' },
      ]}
    case 'divider':
      return { id, type, color: BRAND.mid }
    case 'signature':
      return { id, type, name: 'Dana Massey', title: 'REALTOR® | Antigravity Real Estate', phone: '', email: '' }
    default:
      return { id, type: 'text', content: '' }
  }
}

// ─── Persistence ───
function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveDrafts(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) }
function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY)) || [] } catch { return [] }
}
function saveTemplates(t) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)) }

// ─── Block Editor Fields ───
function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  const set = (key, val) => onChange({ ...block, [key]: val })

  const handleImageUpload = (e, key = 'imageUrl') => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set(key, reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="eb__block-editor">
      <div className="eb__block-editor-header">
        <span className="eb__block-type-badge">{block.type.toUpperCase()}</span>
        <div className="eb__block-actions">
          {!isFirst && <button className="eb__block-action-btn" onClick={onMoveUp} title="Move up">↑</button>}
          {!isLast && <button className="eb__block-action-btn" onClick={onMoveDown} title="Move down">↓</button>}
          <button className="eb__block-action-btn eb__block-action-btn--danger" onClick={onDelete} title="Remove">×</button>
        </div>
      </div>

      {block.type === 'header' && (
        <div className="eb__block-fields">
          <div className="eb__field-row">
            <label className="eb__field-label">BACKGROUND</label>
            <input type="color" value={block.bgColor} onChange={e => set('bgColor', e.target.value)} className="eb__color-input" />
          </div>
          <label className="eb__field-label">LOGO IMAGE</label>
          <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logoUrl')} className="eb__file-input" />
        </div>
      )}

      {block.type === 'greeting' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">GREETING TEXT</label>
          <input className="eb__input" value={block.text} onChange={e => set('text', e.target.value)} placeholder="Hi {first_name}," />
          <p className="eb__field-hint">Use {'{first_name}'} to personalize</p>
        </div>
      )}

      {block.type === 'text' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">CONTENT</label>
          <textarea className="eb__textarea" value={block.content} onChange={e => set('content', e.target.value)} placeholder="Write your email text here..." rows={4} />
        </div>
      )}

      {block.type === 'image' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">LAYOUT</label>
          <div className="eb__layout-picker">
            {IMAGE_LAYOUTS.map(l => (
              <button
                key={l.value}
                className={`eb__layout-opt ${block.layout === l.value ? 'eb__layout-opt--active' : ''}`}
                onClick={() => {
                  const images = block.images || ['']
                  const padded = Array.from({ length: l.slots }, (_, i) => images[i] || '')
                  set('images', padded); set('layout', l.value)
                }}
              >
                <span>{l.emoji}</span>
                <span>{l.label}</span>
              </button>
            ))}
          </div>
          <label className="eb__field-label">SHAPE</label>
          <div className="eb__shape-picker">
            {IMAGE_SHAPES.map(s => (
              <button
                key={s.value}
                className={`eb__shape-opt ${block.shape === s.value ? 'eb__shape-opt--active' : ''}`}
                onClick={() => set('shape', s.value)}
              >
                <span className={`eb__shape-preview eb__shape-preview--${s.value}`} />
                <span>{s.label}</span>
              </button>
            ))}
          </div>
          <label className="eb__field-label">IMAGES ({(block.images || ['']).length} slot{(block.images || ['']).length > 1 ? 's' : ''})</label>
          {(block.images || ['']).map((img, i) => (
            <div key={i} className="eb__image-slot">
              <span className="eb__image-slot-num">{i + 1}</span>
              <input
                type="file"
                accept="image/*"
                className="eb__file-input"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => {
                    const imgs = [...(block.images || [''])]
                    imgs[i] = reader.result
                    set('images', imgs)
                  }
                  reader.readAsDataURL(file)
                }}
              />
              {img && <img src={img} alt="" className="eb__image-thumb" />}
            </div>
          ))}
          <label className="eb__field-label">ALT TEXT</label>
          <input className="eb__input" value={block.alt} onChange={e => set('alt', e.target.value)} placeholder="Describe the images..." />
        </div>
      )}

      {block.type === 'cta' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">BUTTON TEXT</label>
          <input className="eb__input" value={block.label} onChange={e => set('label', e.target.value)} placeholder="Schedule a Showing" />
          <label className="eb__field-label">LINK URL</label>
          <input className="eb__input" value={block.url} onChange={e => set('url', e.target.value)} placeholder="https://..." />
          <div className="eb__field-row">
            <div>
              <label className="eb__field-label">BG COLOR</label>
              <input type="color" value={block.bgColor} onChange={e => set('bgColor', e.target.value)} className="eb__color-input" />
            </div>
            <div>
              <label className="eb__field-label">TEXT COLOR</label>
              <input type="color" value={block.textColor} onChange={e => set('textColor', e.target.value)} className="eb__color-input" />
            </div>
          </div>
        </div>
      )}

      {block.type === 'property-card' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">ADDRESS</label>
          <input className="eb__input" value={block.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St, Gilbert AZ" />
          <label className="eb__field-label">PRICE</label>
          <input className="eb__input" value={block.price} onChange={e => set('price', e.target.value)} placeholder="$450,000" />
          <div className="eb__field-row-3">
            <div>
              <label className="eb__field-label">BEDS</label>
              <input className="eb__input" value={block.beds} onChange={e => set('beds', e.target.value)} placeholder="4" />
            </div>
            <div>
              <label className="eb__field-label">BATHS</label>
              <input className="eb__input" value={block.baths} onChange={e => set('baths', e.target.value)} placeholder="2.5" />
            </div>
            <div>
              <label className="eb__field-label">SQFT</label>
              <input className="eb__input" value={block.sqft} onChange={e => set('sqft', e.target.value)} placeholder="2,100" />
            </div>
          </div>
          <label className="eb__field-label">DESCRIPTION</label>
          <textarea className="eb__textarea" value={block.description} onChange={e => set('description', e.target.value)} placeholder="Property highlights..." rows={2} />
        </div>
      )}

      {block.type === 'event-card' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">EVENT TITLE</label>
          <input className="eb__input" value={block.title} onChange={e => set('title', e.target.value)} placeholder="Open House" />
          <label className="eb__field-label">DATE</label>
          <input className="eb__input" value={block.date} onChange={e => set('date', e.target.value)} placeholder="Saturday, April 5" />
          <label className="eb__field-label">TIME</label>
          <input className="eb__input" value={block.time} onChange={e => set('time', e.target.value)} placeholder="11:00 AM — 2:00 PM" />
          <label className="eb__field-label">ADDRESS</label>
          <input className="eb__input" value={block.address} onChange={e => set('address', e.target.value)} placeholder="456 Oak Ave, Gilbert AZ" />
        </div>
      )}

      {block.type === 'stats-row' && (
        <div className="eb__block-fields">
          {block.stats.map((stat, i) => (
            <div key={i} className="eb__stat-editor">
              <p className="eb__field-label">STAT {i + 1}</p>
              <div className="eb__field-row-3">
                <input className="eb__input" value={stat.label} onChange={e => {
                  const s = [...block.stats]; s[i] = { ...s[i], label: e.target.value }; set('stats', s)
                }} placeholder="Label" />
                <input className="eb__input" value={stat.value} onChange={e => {
                  const s = [...block.stats]; s[i] = { ...s[i], value: e.target.value }; set('stats', s)
                }} placeholder="Value" />
                <input className="eb__input" value={stat.delta} onChange={e => {
                  const s = [...block.stats]; s[i] = { ...s[i], delta: e.target.value }; set('stats', s)
                }} placeholder="+3%" />
              </div>
            </div>
          ))}
        </div>
      )}

      {block.type === 'divider' && (
        <div className="eb__block-fields">
          <div className="eb__field-row">
            <label className="eb__field-label">LINE COLOR</label>
            <input type="color" value={block.color} onChange={e => set('color', e.target.value)} className="eb__color-input" />
          </div>
        </div>
      )}

      {block.type === 'signature' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">NAME</label>
          <input className="eb__input" value={block.name} onChange={e => set('name', e.target.value)} />
          <label className="eb__field-label">TITLE</label>
          <input className="eb__input" value={block.title} onChange={e => set('title', e.target.value)} />
          <label className="eb__field-label">PHONE</label>
          <input className="eb__input" value={block.phone} onChange={e => set('phone', e.target.value)} placeholder="(480) 555-1234" />
          <label className="eb__field-label">EMAIL</label>
          <input className="eb__input" value={block.email} onChange={e => set('email', e.target.value)} placeholder="dana@antigravityre.com" />
        </div>
      )}
    </div>
  )
}

// ─── Inline-editable text helper ───
function InlineEdit({ value, onChange, className, style, tag: Tag = 'p', placeholder, multiline }) {
  const ref = useRef(null)
  const lastValue = useRef(value)

  // Only sync DOM when value changes externally (not from our own edits)
  useEffect(() => {
    if (ref.current && ref.current.innerText !== value && document.activeElement !== ref.current) {
      ref.current.innerText = value || ''
    }
    lastValue.current = value
  }, [value])

  const handleBlur = () => {
    const text = ref.current?.innerText || ''
    if (text !== lastValue.current) {
      lastValue.current = text
      onChange(text)
    }
  }

  const handleKeyDown = (e) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      ref.current?.blur()
    }
  }

  return (
    <Tag
      ref={ref}
      className={`${className || ''} ep__inline-editable`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      data-placeholder={placeholder}
    >
      {value}
    </Tag>
  )
}

// ─── Preview Renderer (inline-editable) ───
function PreviewBlock({ block, onChange, isSelected, onSelect }) {
  const set = (key, val) => onChange({ ...block, [key]: val })

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => set('imageUrl', reader.result)
    reader.readAsDataURL(file)
  }

  const inner = (() => {
    switch (block.type) {
      case 'header':
        return (
          <div className="ep__header" style={{ background: block.bgColor, color: block.textColor }}>
            {block.logoUrl ? (
              <img src={block.logoUrl} alt="Logo" className="ep__logo" />
            ) : (
              <p className="ep__brand">ANTIGRAVITY REAL ESTATE</p>
            )}
          </div>
        )
      case 'greeting':
        return (
          <InlineEdit
            className="ep__greeting"
            value={block.text}
            onChange={v => set('text', v)}
            placeholder="Hi {first_name},"
          />
        )
      case 'text':
        return (
          <InlineEdit
            tag="div"
            className="ep__text ep__text--editable"
            value={block.content}
            onChange={v => set('content', v)}
            placeholder="Click to type..."
            multiline
          />
        )
      case 'image': {
        const images = block.images || [block.imageUrl || '']
        const layout = block.layout || 'full'
        const shape = block.shape || 'box'
        const hasAny = images.some(u => u)

        const gridClass = `ep__image-grid ep__image-grid--${layout}`
        const shapeClass = `ep__img--${shape}`

        const handleSlotUpload = (slotIdx) => (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            const imgs = [...images]
            imgs[slotIdx] = reader.result
            onChange({ ...block, images: imgs })
          }
          reader.readAsDataURL(file)
        }

        return (
          <div className={gridClass}>
            {images.map((url, i) => (
              url ? (
                <div key={i} className={`ep__img-slot ${shapeClass}`}>
                  <img src={url} alt={block.alt} className="ep__grid-img" />
                  {isSelected && (
                    <label className="ep__image-replace">
                      Replace
                      <input type="file" accept="image/*" onChange={handleSlotUpload(i)} hidden />
                    </label>
                  )}
                </div>
              ) : (
                <label key={i} className={`ep__img-slot ep__img-slot--empty ${shapeClass}`}>
                  <span>+</span>
                  <input type="file" accept="image/*" onChange={handleSlotUpload(i)} hidden />
                </label>
              )
            ))}
          </div>
        )
      }
      case 'cta':
        return (
          <div className="ep__cta-wrap">
            <span className="ep__cta ep__cta--editable" style={{ background: block.bgColor, color: block.textColor }}>
              <InlineEdit
                tag="span"
                value={block.label}
                onChange={v => set('label', v)}
                placeholder="Button text"
              />
            </span>
          </div>
        )
      case 'property-card':
        return (
          <div className="ep__property">
            <InlineEdit className="ep__property-price" value={block.price} onChange={v => set('price', v)} placeholder="$000,000" />
            <InlineEdit className="ep__property-address" value={block.address} onChange={v => set('address', v)} placeholder="123 Main St, City AZ" />
            <div className="ep__property-specs">
              <InlineEdit tag="span" value={block.beds} onChange={v => set('beds', v)} placeholder="—" />
              <span> bd</span>
              <InlineEdit tag="span" value={block.baths} onChange={v => set('baths', v)} placeholder="—" />
              <span> ba</span>
              <InlineEdit tag="span" value={block.sqft} onChange={v => set('sqft', v)} placeholder="—" />
              <span> sqft</span>
            </div>
            <InlineEdit className="ep__property-desc" value={block.description} onChange={v => set('description', v)} placeholder="Property description..." multiline />
          </div>
        )
      case 'event-card':
        return (
          <div className="ep__event">
            <InlineEdit className="ep__event-title" value={block.title} onChange={v => set('title', v)} placeholder="Event Title" />
            <InlineEdit className="ep__event-detail" value={block.date} onChange={v => set('date', v)} placeholder="Date" />
            <InlineEdit className="ep__event-detail" value={block.time} onChange={v => set('time', v)} placeholder="Time" />
            <InlineEdit className="ep__event-detail" value={block.address} onChange={v => set('address', v)} placeholder="Address" />
          </div>
        )
      case 'stats-row':
        return (
          <div className="ep__stats">
            {block.stats.map((s, i) => (
              <div key={i} className="ep__stat">
                <InlineEdit className="ep__stat-value" value={s.value} onChange={v => {
                  const stats = [...block.stats]; stats[i] = { ...stats[i], value: v }; set('stats', stats)
                }} placeholder="—" />
                <InlineEdit className="ep__stat-label" value={s.label} onChange={v => {
                  const stats = [...block.stats]; stats[i] = { ...stats[i], label: v }; set('stats', stats)
                }} placeholder="Label" />
                <InlineEdit className="ep__stat-delta" value={s.delta} onChange={v => {
                  const stats = [...block.stats]; stats[i] = { ...stats[i], delta: v }; set('stats', stats)
                }} placeholder="+0%" />
              </div>
            ))}
          </div>
        )
      case 'divider':
        return <hr className="ep__divider" style={{ borderColor: block.color }} />
      case 'signature':
        return (
          <div className="ep__signature">
            <InlineEdit className="ep__sig-name" value={block.name} onChange={v => set('name', v)} placeholder="Your Name" />
            <InlineEdit className="ep__sig-title" value={block.title} onChange={v => set('title', v)} placeholder="Title" />
            <InlineEdit className="ep__sig-contact" value={block.phone} onChange={v => set('phone', v)} placeholder="Phone" />
            <InlineEdit className="ep__sig-contact" value={block.email} onChange={v => set('email', v)} placeholder="Email" />
          </div>
        )
      default:
        return null
    }
  })()

  return (
    <div
      className={`ep__block-wrap ${isSelected ? 'ep__block-wrap--selected' : ''}`}
      onClick={(e) => { e.stopPropagation(); onSelect() }}
    >
      {inner}
      {isSelected && (
        <div className="ep__block-toolbar">
          <span className="ep__block-toolbar-label">{block.type}</span>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───
export default function EmailBuilder() {
  const [view, setView] = useState('templates') // templates | editor
  const [drafts, setDrafts] = useState(loadDrafts)
  const [savedTemplates, setSavedTemplates] = useState(loadTemplates)
  const [activeEmail, setActiveEmail] = useState(null) // { subject, blocks, templateId, draftId }
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(null)
  const [addingBlock, setAddingBlock] = useState(false)
  const previewRef = useRef(null)

  // ─── Template selection ───
  const handleSelectTemplate = (template) => {
    const email = {
      draftId: crypto.randomUUID(),
      templateId: template.id,
      subject: template.subject,
      blocks: template.blocks.map(b => ({ ...b, id: crypto.randomUUID() })),
      createdAt: new Date().toISOString(),
    }
    setActiveEmail(email)
    setSelectedBlockIdx(null)
    setView('editor')
  }

  // ─── Block operations ───
  const updateBlock = (idx, updated) => {
    const blocks = [...activeEmail.blocks]
    blocks[idx] = updated
    setActiveEmail({ ...activeEmail, blocks })
  }

  const deleteBlock = (idx) => {
    const blocks = activeEmail.blocks.filter((_, i) => i !== idx)
    setActiveEmail({ ...activeEmail, blocks })
    setSelectedBlockIdx(null)
  }

  const moveBlock = (idx, dir) => {
    const blocks = [...activeEmail.blocks]
    const target = idx + dir
    if (target < 0 || target >= blocks.length) return
    ;[blocks[idx], blocks[target]] = [blocks[target], blocks[idx]]
    setActiveEmail({ ...activeEmail, blocks })
    setSelectedBlockIdx(target)
  }

  const addBlock = (type) => {
    const block = newBlock(type)
    const blocks = [...activeEmail.blocks, block]
    setActiveEmail({ ...activeEmail, blocks })
    setSelectedBlockIdx(blocks.length - 1)
    setAddingBlock(false)
  }

  // ─── Save draft ───
  const saveDraft = () => {
    const existing = drafts.filter(d => d.draftId !== activeEmail.draftId)
    const updated = [{ ...activeEmail, updatedAt: new Date().toISOString() }, ...existing]
    setDrafts(updated)
    saveDrafts(updated)
  }

  // ─── Save as template ───
  const saveAsTemplate = () => {
    const tpl = {
      id: crypto.randomUUID(),
      name: activeEmail.subject || 'Untitled Template',
      emoji: '⭐',
      category: 'CUSTOM',
      subject: activeEmail.subject,
      blocks: activeEmail.blocks,
      createdAt: new Date().toISOString(),
    }
    const updated = [tpl, ...savedTemplates]
    setSavedTemplates(updated)
    saveTemplates(updated)
  }

  const deleteDraft = (draftId) => {
    const updated = drafts.filter(d => d.draftId !== draftId)
    setDrafts(updated)
    saveDrafts(updated)
  }

  const deleteTemplate = (tplId) => {
    const updated = savedTemplates.filter(t => t.id !== tplId)
    setSavedTemplates(updated)
    saveTemplates(updated)
  }

  const loadDraft = (draft) => {
    setActiveEmail(draft)
    setSelectedBlockIdx(null)
    setView('editor')
  }

  const copyHtml = () => {
    if (!previewRef.current) return
    const html = previewRef.current.innerHTML
    navigator.clipboard.writeText(html)
  }

  // ─── Templates View ───
  if (view === 'templates') {
    return (
      <div className="eb">
        <div className="eb__header">
          <div>
            <p className="eb__tag">EMAIL MARKETING</p>
            <h2 className="eb__title">Email <em>Builder</em></h2>
          </div>
        </div>

        {/* Drafts */}
        {drafts.length > 0 && (
          <div className="eb__section">
            <h3 className="eb__section-title">YOUR DRAFTS</h3>
            <div className="eb__drafts-grid">
              {drafts.map(d => (
                <div key={d.draftId} className="eb__draft-card" onClick={() => loadDraft(d)}>
                  <p className="eb__draft-subject">{d.subject || 'Untitled'}</p>
                  <p className="eb__draft-meta">{d.blocks.length} blocks · {new Date(d.updatedAt || d.createdAt).toLocaleDateString()}</p>
                  <button className="eb__draft-delete" onClick={e => { e.stopPropagation(); deleteDraft(d.draftId) }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved Templates */}
        {savedTemplates.length > 0 && (
          <div className="eb__section">
            <h3 className="eb__section-title">SAVED TEMPLATES</h3>
            <div className="eb__templates-grid">
              {savedTemplates.map(t => (
                <div key={t.id} className="eb__template-card" onClick={() => handleSelectTemplate(t)}>
                  <span className="eb__template-emoji">{t.emoji}</span>
                  <p className="eb__template-name">{t.name}</p>
                  <span className="eb__template-cat" style={{ background: CATEGORY_COLORS[t.category] || BRAND.mid }}>{t.category}</span>
                  <button className="eb__draft-delete" onClick={e => { e.stopPropagation(); deleteTemplate(t.id) }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Starter Templates */}
        <div className="eb__section">
          <h3 className="eb__section-title">START WITH A TEMPLATE</h3>
          <p className="eb__section-sub">Pick a starting point — you can customize everything</p>
          <div className="eb__templates-grid">
            {STARTER_TEMPLATES.map(t => (
              <div key={t.id} className="eb__template-card" onClick={() => handleSelectTemplate(t)}>
                <span className="eb__template-emoji">{t.emoji}</span>
                <p className="eb__template-name">{t.name}</p>
                <span className="eb__template-cat" style={{ background: CATEGORY_COLORS[t.category] || BRAND.mid }}>{t.category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── Editor View ───
  return (
    <div className="eb">
      {/* Editor Header */}
      <div className="eb__header">
        <div>
          <p className="eb__tag">EMAIL MARKETING</p>
          <h2 className="eb__title">Email <em>Builder</em></h2>
        </div>
        <div className="eb__header-actions">
          <Button size="sm" variant="secondary" onClick={() => setView('templates')}>← Templates</Button>
          <Button size="sm" variant="secondary" onClick={saveDraft}>Save Draft</Button>
          <Button size="sm" variant="secondary" onClick={saveAsTemplate}>Save as Template</Button>
          <Button size="sm" variant="secondary" onClick={copyHtml}>Copy HTML</Button>
        </div>
      </div>

      {/* Subject Line */}
      <div className="eb__subject-bar">
        <label className="eb__field-label">SUBJECT LINE</label>
        <input
          className="eb__subject-input"
          value={activeEmail.subject}
          onChange={e => setActiveEmail({ ...activeEmail, subject: e.target.value })}
          placeholder="Write your subject line..."
        />
      </div>

      {/* Two-column: Editor + Preview */}
      <div className="eb__workspace">
        {/* Block List + Editor */}
        <div className="eb__editor-col">
          <div className="eb__blocks-list">
            {activeEmail.blocks.map((block, idx) => (
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

          {/* Add Block */}
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

          {/* Selected Block Editor */}
          {selectedBlockIdx !== null && activeEmail.blocks[selectedBlockIdx] && (
            <BlockEditor
              block={activeEmail.blocks[selectedBlockIdx]}
              onChange={updated => updateBlock(selectedBlockIdx, updated)}
              onDelete={() => deleteBlock(selectedBlockIdx)}
              onMoveUp={() => moveBlock(selectedBlockIdx, -1)}
              onMoveDown={() => moveBlock(selectedBlockIdx, 1)}
              isFirst={selectedBlockIdx === 0}
              isLast={selectedBlockIdx === activeEmail.blocks.length - 1}
            />
          )}
        </div>

        {/* Live Preview */}
        <div className="eb__preview-col">
          <p className="eb__field-label">LIVE PREVIEW — click any text to edit</p>
          <div className="eb__preview-frame" onClick={() => setSelectedBlockIdx(null)}>
            <div className="eb__preview-email" ref={previewRef}>
              {activeEmail.blocks.map((block, idx) => (
                <PreviewBlock
                  key={block.id}
                  block={block}
                  onChange={updated => updateBlock(idx, updated)}
                  isSelected={selectedBlockIdx === idx}
                  onSelect={() => setSelectedBlockIdx(idx)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

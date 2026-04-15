import { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/ui/index.jsx'
import { useBrand } from '../../lib/BrandContext'
import { BrandColorPicker, BorderRadiusControl, FontPicker, FontSizeControl, SpacingControl } from '../../components/ui/StyleControls'
import { PropertyPicker } from '../../components/ui/PropertyPicker'
import './EmailBuilder.css'

// ─── Storage ───
const STORAGE_KEY = 'email_builder_drafts'
const TEMPLATES_KEY = 'email_saved_templates'

// ─── Brand ───
const BRAND = {
  dark: '#3A2A1E',
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
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "It was so great connecting with you! I know the home search can feel overwhelming, but I'm here to make it as smooth and exciting as possible.\n\nBased on what you shared, I've already started keeping an eye out for homes that match your wishlist. I'll send over some options soon!", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'cta', label: 'View My Latest Picks', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '5', type: 'text', content: "In the meantime, don't hesitate to reach out if anything comes to mind — budget questions, neighborhood vibes, timeline, anything at all.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '6', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'new-listing',
    name: 'New Listing Announcement',
    emoji: '🏠',
    category: 'LISTINGS',
    subject: 'Just Listed — {address}',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "I'm excited to share a brand new listing that just hit the market!", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'image', images: [''], alt: 'Property photo', layout: 'full', shape: 'rounded', borderRadius: 12 },
      { id: '5', type: 'property-card', address: '123 Main St, Gilbert AZ 85234', price: '$450,000', beds: '4', baths: '2.5', sqft: '2,100', description: 'Gorgeous updated home with a sparkling pool, open floor plan, and modern finishes throughout.', borderRadius: 8, bgColor: '#faf9f7' },
      { id: '6', type: 'cta', label: 'Schedule a Showing', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '7', type: 'text', content: 'Know someone who might be interested? I appreciate referrals more than you know!', fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '8', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'open-house-invite',
    name: 'Open House Invite',
    emoji: '🎉',
    category: 'EVENTS',
    subject: "You're Invited — Open House this {day}!",
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "I'd love for you to stop by my upcoming open house! Whether you're actively looking or just curious about the market, it's a great chance to tour a beautiful home and chat.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'event-card', title: 'Open House', date: 'Saturday, April 5', time: '11:00 AM — 2:00 PM', address: '456 Oak Ave, Gilbert AZ 85234', borderRadius: 8, accentColor: BRAND.dark },
      { id: '5', type: 'image', images: [''], alt: 'Open house property', layout: 'full', shape: 'rounded', borderRadius: 12 },
      { id: '6', type: 'cta', label: 'RSVP / Get Directions', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '7', type: 'text', content: 'Feel free to bring friends and family. See you there!', fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '8', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'market-update',
    name: 'Market Update',
    emoji: '📊',
    category: 'AUTHORITY',
    subject: '{month} Market Update — East Valley',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "Here's your quick snapshot of what's happening in the East Valley real estate market this month:", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'stats-row', stats: [
        { label: 'Median Price', value: '$485,000', delta: '+3.2%' },
        { label: 'Days on Market', value: '28', delta: '-5 days' },
        { label: 'Active Listings', value: '1,240', delta: '+12%' },
      ], borderRadius: 8 },
      { id: '5', type: 'text', content: "What does this mean for you?\n\nIf you're a seller: Homes are still moving, but pricing right from the start is more important than ever.\n\nIf you're a buyer: More inventory means more options and a bit more negotiating power.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '6', type: 'cta', label: 'Get Your Home Value', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '7', type: 'text', content: "Questions about your specific neighborhood? Just hit reply — I'm always happy to pull the numbers for you.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '8', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'just-sold',
    name: 'Just Sold',
    emoji: '🎊',
    category: 'LISTINGS',
    subject: 'Just Sold — {address}',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "Another one closed! I'm thrilled to share that this beautiful home has officially SOLD.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'image', images: [''], alt: 'Sold property', layout: 'full', shape: 'rounded', borderRadius: 12 },
      { id: '5', type: 'property-card', address: '789 Elm Dr, Mesa AZ 85213', price: '$525,000', beds: '4', baths: '3', sqft: '2,400', description: 'Sold in just 6 days with multiple offers!', borderRadius: 8, bgColor: '#faf9f7' },
      { id: '6', type: 'text', content: "Curious what your home could sell for in today's market? I'd love to run the numbers for you — no pressure, just helpful info.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '7', type: 'cta', label: "What's My Home Worth?", url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '8', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'blank',
    name: 'Start from Scratch',
    emoji: '✏️',
    category: 'CUSTOM',
    subject: '',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: '', fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
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

export const BLOCK_PALETTE = [
  { type: 'text', label: 'Text Block', emoji: '📝' },
  { type: 'image', label: 'Image', emoji: '🖼️' },
  { type: 'cta', label: 'Button / CTA', emoji: '🔘' },
  { type: 'property-card', label: 'Property Card', emoji: '🏠' },
  { type: 'event-card', label: 'Event Card', emoji: '📅' },
  { type: 'stats-row', label: 'Stats Row', emoji: '📊' },
  { type: 'video', label: 'Video', emoji: '🎬' },
  { type: 'divider', label: 'Divider', emoji: '➖' },
  { type: 'greeting', label: 'Greeting', emoji: '👋' },
  { type: 'signature', label: 'Signature', emoji: '✍️' },
]

export function newBlock(type) {
  const id = crypto.randomUUID()
  switch (type) {
    case 'header':
      return { id, type, logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 }
    case 'greeting':
      return { id, type, text: 'Hi {first_name},', fontSize: 15, fontFamily: '' }
    case 'text':
      return { id, type, content: '', fontSize: 14, fontFamily: '', lineHeight: 1.65, color: '#444' }
    case 'image':
      return { id, type, images: [''], alt: '', layout: 'full', shape: 'box', borderRadius: 0 }
    case 'cta':
      return { id, type, label: 'Learn More', url: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 }
    case 'property-card':
      return { id, type, address: '', price: '', beds: '', baths: '', sqft: '', description: '', borderRadius: 8, bgColor: '#faf9f7' }
    case 'event-card':
      return { id, type, title: 'Open House', date: '', time: '', address: '', borderRadius: 8, accentColor: BRAND.dark }
    case 'stats-row':
      return { id, type, stats: [
        { label: 'Stat 1', value: '—', delta: '' },
        { label: 'Stat 2', value: '—', delta: '' },
        { label: 'Stat 3', value: '—', delta: '' },
      ], borderRadius: 8 }
    case 'video':
      return { id, type, videoUrl: '', thumbnailUrl: '', caption: '', alt: 'Video', borderRadius: 8 }
    case 'divider':
      return { id, type, color: BRAND.mid, thickness: 1, dividerStyle: 'solid' }
    case 'signature':
      return { id, type, name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '', socials: [] }
    default:
      return { id, type: 'text', content: '' }
  }
}

// ─── Persistence ───
export function fillSigBlock(b, sig = {}) {
  if (b.type !== 'signature') return b
  return {
    ...b,
    name: b.name || sig.full_name || '',
    title: b.title || (sig.title ? `${sig.title} | ${sig.brokerage || ''}` : sig.brokerage || ''),
    phone: b.phone || sig.phone || '',
    email: b.email || sig.email || '',
  }
}

function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveDrafts(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) }
function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY)) || [] } catch { return [] }
}
function saveTemplates(t) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)) }

// ─── Collapsible style section ───
export function StyleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="eb__style-section">
      <button className="eb__style-section__toggle" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="eb__style-section__body">{children}</div>}
    </div>
  )
}

// ─── Block Editor Fields ───
export function BlockEditor({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, connectedSocials = [], socialChannels = {} }) {
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
          <label className="eb__field-label">LOGO IMAGE</label>
          <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'logoUrl')} className="eb__file-input" />

          <StyleSection title="Colors" defaultOpen>
            <BrandColorPicker label="Background" value={block.bgColor} onChange={v => set('bgColor', v)} showMixes />
            <BrandColorPicker label="Text Color" value={block.textColor} onChange={v => set('textColor', v)} />
          </StyleSection>

          <StyleSection title="Shape & Spacing">
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius ?? 0} onChange={v => set('borderRadius', v)} showPill={false} />
            <SpacingControl label="Padding" value={block.padding ?? 28} onChange={v => set('padding', v)} max={60} />
          </StyleSection>
        </div>
      )}

      {block.type === 'greeting' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">GREETING TEXT</label>
          <input className="eb__input" value={block.text} onChange={e => set('text', e.target.value)} placeholder="Hi {first_name}," />
          <p className="eb__field-hint">Use {'{first_name}'} to personalize</p>

          <StyleSection title="Typography">
            <FontPicker label="Font" value={block.fontFamily} onChange={v => set('fontFamily', v)} />
            <FontSizeControl label="Font Size" value={block.fontSize || 15} onChange={v => set('fontSize', v)} min={12} max={24} />
          </StyleSection>
        </div>
      )}

      {block.type === 'text' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">CONTENT</label>
          <textarea className="eb__textarea" value={block.content} onChange={e => set('content', e.target.value)} placeholder="Write your email text here..." rows={4} />

          <StyleSection title="Typography">
            <FontPicker label="Font" value={block.fontFamily} onChange={v => set('fontFamily', v)} />
            <FontSizeControl label="Font Size" value={block.fontSize || 14} onChange={v => set('fontSize', v)} />
            <BrandColorPicker label="Text Color" value={block.color || '#444'} onChange={v => set('color', v)} />
            <div className="eb__field-row">
              <div>
                <label className="eb__field-label">LINE HEIGHT</label>
                <input className="eb__input" type="number" value={block.lineHeight ?? 1.65} onChange={e => set('lineHeight', +e.target.value)} min={1} max={3} step={0.1} style={{ width: 70 }} />
              </div>
              <div>
                <label className="eb__field-label">ALIGNMENT</label>
                <select className="eb__input" value={block.textAlign || 'left'} onChange={e => set('textAlign', e.target.value)} style={{ width: 90 }}>
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
            <div className="eb__field-row">
              <div>
                <label className="eb__field-label">STYLE</label>
                <select className="eb__input" value={block.fontStyle || 'normal'} onChange={e => set('fontStyle', e.target.value)} style={{ width: 90 }}>
                  <option value="normal">Normal</option>
                  <option value="italic">Italic</option>
                </select>
              </div>
              <div>
                <label className="eb__field-label">WEIGHT</label>
                <select className="eb__input" value={block.fontWeight || ''} onChange={e => set('fontWeight', e.target.value)} style={{ width: 90 }}>
                  <option value="">Default</option>
                  <option value="300">Light</option>
                  <option value="400">Regular</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi-Bold</option>
                  <option value="700">Bold</option>
                </select>
              </div>
            </div>
          </StyleSection>
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
                  onChange({ ...block, images: padded, layout: l.value })
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

          <StyleSection title="Corner Radius">
            <BorderRadiusControl value={block.borderRadius ?? 0} onChange={v => set('borderRadius', v)} max={40} showPill={false} />
          </StyleSection>

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

          <StyleSection title="Colors" defaultOpen>
            <BrandColorPicker label="Button Color" value={block.bgColor} onChange={v => set('bgColor', v)} showMixes />
            <BrandColorPicker label="Text Color" value={block.textColor} onChange={v => set('textColor', v)} />
            <BrandColorPicker label="Border Color (outline style)" value={block.borderColor || ''} onChange={v => set('borderColor', v)} />
          </StyleSection>

          <StyleSection title="Typography">
            <FontPicker label="Font" value={block.fontFamily} onChange={v => set('fontFamily', v)} />
            <FontSizeControl label="Font Size" value={block.fontSize || 14} onChange={v => set('fontSize', v)} min={11} max={22} />
          </StyleSection>

          <StyleSection title="Shape & Spacing">
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius ?? 6} onChange={v => set('borderRadius', v)} />
            <SpacingControl label="Padding" value={block.padding ?? 12} onChange={v => set('padding', v)} max={24} />
          </StyleSection>
        </div>
      )}

      {block.type === 'property-card' && (
        <div className="eb__block-fields">
          <PropertyPicker
            label="POPULATE FROM MY PROPERTIES"
            compact
            onSelect={(p) => {
              onChange({
                ...block,
                address: [p.address, p.city, 'AZ', p.zip].filter(Boolean).join(', '),
                price: p.price ? `$${Number(p.price).toLocaleString()}` : block.price,
                beds: p.bedrooms ? String(p.bedrooms) : block.beds,
                baths: p.bathrooms ? String(p.bathrooms) : block.baths,
                sqft: p.sqft ? Number(p.sqft).toLocaleString() : block.sqft,
                description: p.marketing_remarks || p.description || block.description,
              })
            }}
          />
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

          <StyleSection title="Style">
            <BrandColorPicker label="Card Background" value={block.bgColor || '#faf9f7'} onChange={v => set('bgColor', v)} />
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius ?? 8} onChange={v => set('borderRadius', v)} showPill={false} />
          </StyleSection>
        </div>
      )}

      {block.type === 'event-card' && (
        <div className="eb__block-fields">
          <PropertyPicker
            label="POPULATE FROM MY PROPERTIES"
            compact
            onSelect={(p) => {
              onChange({
                ...block,
                address: [p.address, p.city, 'AZ', p.zip].filter(Boolean).join(', '),
              })
            }}
          />
          <label className="eb__field-label">EVENT TITLE</label>
          <input className="eb__input" value={block.title} onChange={e => set('title', e.target.value)} placeholder="Open House" />
          <label className="eb__field-label">DATE</label>
          <input className="eb__input" value={block.date} onChange={e => set('date', e.target.value)} placeholder="Saturday, April 5" />
          <label className="eb__field-label">TIME</label>
          <input className="eb__input" value={block.time} onChange={e => set('time', e.target.value)} placeholder="11:00 AM — 2:00 PM" />
          <label className="eb__field-label">ADDRESS</label>
          <input className="eb__input" value={block.address} onChange={e => set('address', e.target.value)} placeholder="456 Oak Ave, Gilbert AZ" />

          <StyleSection title="Style">
            <BrandColorPicker label="Accent Color" value={block.accentColor || BRAND.dark} onChange={v => set('accentColor', v)} showMixes />
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius ?? 8} onChange={v => set('borderRadius', v)} showPill={false} />
          </StyleSection>
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

          <StyleSection title="Style">
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius ?? 8} onChange={v => set('borderRadius', v)} showPill={false} />
          </StyleSection>
        </div>
      )}

      {block.type === 'video' && (
        <div className="eb__block-fields">
          <label className="eb__field-label">VIDEO URL</label>
          <input className="eb__input" value={block.videoUrl || ''} onChange={e => set('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=... or Vimeo link" />
          <p className="eb__field-hint">YouTube, Vimeo, or any video link — clicking the thumbnail opens it</p>

          <label className="eb__field-label">THUMBNAIL IMAGE</label>
          <input type="file" accept="image/*" className="eb__file-input" onChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => set('thumbnailUrl', reader.result)
            reader.readAsDataURL(file)
          }} />
          {block.thumbnailUrl && <img src={block.thumbnailUrl} alt="" className="eb__image-thumb" style={{ marginTop: 4 }} />}

          <label className="eb__field-label">CAPTION</label>
          <input className="eb__input" value={block.caption || ''} onChange={e => set('caption', e.target.value)} placeholder="Here is our video marketing" />

          <label className="eb__field-label">ALT TEXT</label>
          <input className="eb__input" value={block.alt || ''} onChange={e => set('alt', e.target.value)} placeholder="Listing video tour" />

          <StyleSection title="Style">
            <BorderRadiusControl label="Corner Radius" value={block.borderRadius ?? 8} onChange={v => set('borderRadius', v)} showPill={false} />
          </StyleSection>
        </div>
      )}

      {block.type === 'divider' && (
        <div className="eb__block-fields">
          <StyleSection title="Style" defaultOpen>
            <BrandColorPicker label="Line Color" value={block.color} onChange={v => set('color', v)} />
            <div className="eb__field-row">
              <div>
                <label className="eb__field-label">THICKNESS</label>
                <input className="eb__input" type="number" value={block.thickness ?? 1} onChange={e => set('thickness', +e.target.value)} min={1} max={8} style={{ width: 60 }} />
              </div>
              <div>
                <label className="eb__field-label">STYLE</label>
                <select className="eb__input" value={block.dividerStyle || 'solid'} onChange={e => set('dividerStyle', e.target.value)} style={{ width: 90 }}>
                  <option value="solid">Solid</option>
                  <option value="dashed">Dashed</option>
                  <option value="dotted">Dotted</option>
                </select>
              </div>
            </div>
          </StyleSection>
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
          <input className="eb__input" value={block.email} onChange={e => set('email', e.target.value)} placeholder="dana@danamassey.com" />
          <label className="eb__field-label">WEBSITE</label>
          <input className="eb__input" value={block.website || ''} onChange={e => set('website', e.target.value)} placeholder="danamassey.com" />

          {/* Social links from Settings */}
          <label className="eb__field-label" style={{ marginTop: 8 }}>SOCIAL LINKS</label>
          {connectedSocials.length > 0 ? (
            <div className="eb__social-picks">
              {connectedSocials.map(ch => {
                const active = (block.socials || []).includes(ch.key)
                return (
                  <label key={ch.key} className={`eb__social-pick${active ? ' eb__social-pick--active' : ''}`}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => {
                        const current = block.socials || []
                        const next = active ? current.filter(k => k !== ch.key) : [...current, ch.key]
                        set('socials', next)
                      }}
                    />
                    <span>{ch.icon} {ch.label}</span>
                  </label>
                )
              })}
              <p className="eb__social-hint">Toggle which social links appear in this email signature. Manage links in Settings.</p>
            </div>
          ) : (
            <p className="eb__social-hint">No social channels connected yet. Add them in Settings &rarr; Social Channels.</p>
          )}

          {/* Legacy manual fields */}
          <div className="eb__field-row" style={{ marginTop: 4 }}>
            <div style={{ flex: 1 }}>
              <label className="eb__field-label">INSTAGRAM (manual)</label>
              <input className="eb__input" value={block.instagram || ''} onChange={e => set('instagram', e.target.value)} placeholder="@handle" />
            </div>
            <div style={{ flex: 1 }}>
              <label className="eb__field-label">FACEBOOK (manual)</label>
              <input className="eb__input" value={block.facebook || ''} onChange={e => set('facebook', e.target.value)} placeholder="page name" />
            </div>
          </div>

          <label className="eb__field-label">YOUR LOGO / HEADSHOT</label>
          <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'agentLogoUrl')} className="eb__file-input" />
          {block.agentLogoUrl && <img src={block.agentLogoUrl} alt="" className="eb__image-thumb" />}
          <label className="eb__field-label">BROKERAGE LOGO</label>
          <input type="file" accept="image/*" onChange={e => handleImageUpload(e, 'brokerageLogoUrl')} className="eb__file-input" />
          {block.brokerageLogoUrl && <img src={block.brokerageLogoUrl} alt="" className="eb__image-thumb" />}
        </div>
      )}
    </div>
  )
}

// ─── Inline-editable text helper ───
function InlineEdit({ value, onChange, className, style, tag: Tag = 'p', placeholder, multiline }) {
  const ref = useRef(null)
  const lastValue = useRef(value)

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
export function PreviewBlock({ block, onChange, isSelected, onSelect, socialChannels = {}, emailSettings = {} }) {
  const set = (key, val) => onChange({ ...block, [key]: val })

  const inner = (() => {
    switch (block.type) {
      case 'header':
        return (
          <div className="ep__header" style={{
            background: block.bgColor,
            color: block.textColor,
            borderRadius: block.borderRadius ?? 0,
            padding: block.padding ?? 28,
          }}>
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
            style={{
              fontSize: block.fontSize || 15,
              fontFamily: block.fontFamily || emailSettings.fontFamily || undefined,
            }}
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
            style={{
              fontSize: block.fontSize || 14,
              fontFamily: block.fontFamily || emailSettings.fontFamily || undefined,
              lineHeight: block.lineHeight ?? 1.65,
              color: block.color || '#444',
              textAlign: block.textAlign || 'left',
              fontStyle: block.fontStyle || undefined,
              fontWeight: block.fontWeight || undefined,
            }}
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

        const imgRadius = block.borderRadius ?? (shape === 'rounded' ? 12 : shape === 'circle' ? 9999 : 0)

        return (
          <div className={gridClass}>
            {images.map((url, i) => (
              url ? (
                <div key={i} className={`ep__img-slot ${shapeClass}`} style={{ borderRadius: imgRadius }}>
                  <img src={url} alt={block.alt} className="ep__grid-img" style={{ borderRadius: imgRadius }} />
                  {isSelected && (
                    <label className="ep__image-replace">
                      Replace
                      <input type="file" accept="image/*" onChange={handleSlotUpload(i)} hidden />
                    </label>
                  )}
                </div>
              ) : (
                <label key={i} className={`ep__img-slot ep__img-slot--empty ${shapeClass}`} style={{ borderRadius: imgRadius }}>
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
            <span className="ep__cta ep__cta--editable" style={{
              background: block.bgColor,
              color: block.textColor,
              borderRadius: block.borderRadius ?? 6,
              fontSize: block.fontSize || 14,
              fontFamily: block.fontFamily || emailSettings.fontFamily || undefined,
              padding: `${block.padding ?? 12}px ${(block.padding ?? 12) * 2.5}px`,
              border: block.borderColor ? `2px solid ${block.borderColor}` : undefined,
            }}>
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
          <div className="ep__property" style={{
            borderRadius: block.borderRadius ?? 8,
            background: block.bgColor || '#faf9f7',
          }}>
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
          <div className="ep__event" style={{
            borderRadius: `0 ${block.borderRadius ?? 8}px ${block.borderRadius ?? 8}px 0`,
            borderLeftColor: block.accentColor || BRAND.dark,
          }}>
            <InlineEdit className="ep__event-title" value={block.title} onChange={v => set('title', v)} placeholder="Event Title" />
            <InlineEdit className="ep__event-detail" value={block.date} onChange={v => set('date', v)} placeholder="Date" />
            <InlineEdit className="ep__event-detail" value={block.time} onChange={v => set('time', v)} placeholder="Time" />
            <InlineEdit className="ep__event-detail" value={block.address} onChange={v => set('address', v)} placeholder="Address" />
          </div>
        )
      case 'stats-row':
        return (
          <div className="ep__stats" style={{ borderRadius: block.borderRadius ?? 8 }}>
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
      case 'video': {
        const hasThumb = block.thumbnailUrl && block.thumbnailUrl.trim()

        const handleThumbUpload = (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => onChange({ ...block, thumbnailUrl: reader.result })
          reader.readAsDataURL(file)
        }

        return (
          <div className="ep__video-wrap">
            {hasThumb ? (
              <div className="ep__video-thumb" style={{ borderRadius: block.borderRadius ?? 8 }}>
                <img src={block.thumbnailUrl} alt={block.alt || 'Video'} className="ep__video-img" style={{ borderRadius: block.borderRadius ?? 8 }} />
                <div className="ep__video-play">
                  <svg viewBox="0 0 24 24" fill="white" width="32" height="32"><polygon points="8,5 19,12 8,19" /></svg>
                </div>
                {isSelected && (
                  <label className="ep__image-replace">
                    Replace
                    <input type="file" accept="image/*" onChange={handleThumbUpload} hidden />
                  </label>
                )}
              </div>
            ) : (
              <label className="ep__video-empty" style={{ borderRadius: block.borderRadius ?? 8 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" width="32" height="32"><polygon points="8,5 19,12 8,19" /></svg>
                <span>Drop video thumbnail here</span>
                <input type="file" accept="image/*" onChange={handleThumbUpload} hidden />
              </label>
            )}
            {(block.caption || isSelected) && (
              <InlineEdit
                className="ep__video-caption"
                value={block.caption || ''}
                onChange={v => set('caption', v)}
                placeholder="Video caption..."
              />
            )}
          </div>
        )
      }
      case 'divider':
        return <hr className="ep__divider" style={{
          borderColor: block.color,
          borderTopWidth: block.thickness ?? 1,
          borderTopStyle: block.dividerStyle || 'solid',
        }} />
      case 'signature':
        return (
          <div className="ep__signature">
            <div className="ep__sig-top">
              <div className="ep__sig-logos">
                {block.agentLogoUrl && <img src={block.agentLogoUrl} alt="Agent logo" className="ep__sig-logo" />}
                {block.brokerageLogoUrl && <img src={block.brokerageLogoUrl} alt="Brokerage logo" className="ep__sig-brokerage-logo" />}
                {!block.agentLogoUrl && !block.brokerageLogoUrl && isSelected && (
                  <span className="ep__sig-logo-hint">Upload logos in the editor panel</span>
                )}
              </div>
              <div className="ep__sig-info">
                <InlineEdit className="ep__sig-name" value={block.name} onChange={v => set('name', v)} placeholder="Your Name" />
                <InlineEdit className="ep__sig-title" value={block.title} onChange={v => set('title', v)} placeholder="Title" />
              </div>
            </div>
            <div className="ep__sig-details">
              {(block.phone || isSelected) && <InlineEdit className="ep__sig-contact" value={block.phone} onChange={v => set('phone', v)} placeholder="Phone" />}
              {(block.email || isSelected) && <InlineEdit className="ep__sig-contact" value={block.email} onChange={v => set('email', v)} placeholder="Email" />}
              {(block.website || isSelected) && <InlineEdit className="ep__sig-contact ep__sig-contact--link" value={block.website || ''} onChange={v => set('website', v)} placeholder="Website" />}
            </div>
            {(block.socials || []).length > 0 && (
              <div className="ep__sig-social">
                {(block.socials || []).map(key => {
                  const ch = EMAIL_SOCIAL_CHANNELS.find(c => c.key === key)
                  const url = socialChannels[key]
                  if (!ch || !url) return null
                  return (
                    <a key={key} href={url} target="_blank" rel="noreferrer" className="ep__sig-social-item ep__sig-social-item--link">
                      <span>{ch.icon}</span> <span>{ch.label}</span>
                    </a>
                  )
                })}
              </div>
            )}
            {(block.instagram || block.facebook || isSelected) && (
              <div className="ep__sig-social">
                {(block.instagram || isSelected) && (
                  <span className="ep__sig-social-item">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" /><circle cx="12" cy="12" r="5" /><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" /></svg>
                    <InlineEdit tag="span" value={block.instagram || ''} onChange={v => set('instagram', v)} placeholder="@handle" />
                  </span>
                )}
                {(block.facebook || isSelected) && (
                  <span className="ep__sig-social-item">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    <InlineEdit tag="span" value={block.facebook || ''} onChange={v => set('facebook', v)} placeholder="page" />
                  </span>
                )}
              </div>
            )}
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
export const EMAIL_SOCIAL_CHANNELS = [
  { key: 'instagram',   label: 'Instagram',       icon: '📷' },
  { key: 'facebook',    label: 'Facebook',        icon: '👥' },
  { key: 'tiktok',      label: 'TikTok',          icon: '🎵' },
  { key: 'youtube',     label: 'YouTube',         icon: '▶️' },
  { key: 'linkedin',    label: 'LinkedIn',        icon: '💼' },
  { key: 'twitter',     label: 'Twitter / X',     icon: '🐦' },
  { key: 'gmb',         label: 'Google Business', icon: '📍' },
  { key: 'zillow',      label: 'Zillow',          icon: '🏠' },
  { key: 'realtor_com', label: 'Realtor.com',     icon: '🔑' },
  { key: 'blog',        label: 'Blog',            icon: '✍️' },
  { key: 'website',     label: 'Website',         icon: '🌐' },
  { key: 'linktree',    label: 'Linktree / Bio',  icon: '🔗' },
]

export default function EmailBuilder() {
  const { brand } = useBrand()
  const [view, setView] = useState('templates')
  const [drafts, setDrafts] = useState(loadDrafts)
  const [savedTemplates, setSavedTemplates] = useState(loadTemplates)
  const [activeEmail, setActiveEmail] = useState(null)
  const [selectedBlockIdx, setSelectedBlockIdx] = useState(null)
  const [addingBlock, setAddingBlock] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [showWarnings, setShowWarnings] = useState(false)
  const [emailSettings, setEmailSettings] = useState({ bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 })
  const previewRef = useRef(null)

  const socialChannels = brand?.social_channels ?? {}
  const connectedSocials = EMAIL_SOCIAL_CHANNELS.filter(c => socialChannels[c.key]?.trim())

  // ─── Validation ───
  const validateEmail = () => {
    const issues = []
    if (!activeEmail.subject?.trim()) issues.push('Subject line is empty')
    activeEmail.blocks.forEach((b, i) => {
      if (b.type === 'cta' && (!b.url || b.url === '#' || !b.url.trim())) {
        issues.push(`Button "${b.label || 'Untitled'}" has no link URL`)
      }
      if (b.type === 'image') {
        const imgs = b.images || []
        const missing = imgs.filter(u => !u).length
        if (missing > 0) issues.push(`Image block has ${missing} empty slot${missing > 1 ? 's' : ''}`)
      }
      if (b.type === 'signature' && !b.phone && !b.email) {
        issues.push('Signature has no phone or email')
      }
    })
    return issues
  }

  const sig = brand?.signature ?? {}
  const _fillSig = (b) => fillSigBlock(b, sig)

  const handleSelectTemplate = (template) => {
    const email = {
      draftId: crypto.randomUUID(),
      templateId: template.id,
      subject: template.subject,
      blocks: template.blocks.map(b => _fillSig({ ...b, id: crypto.randomUUID() })),
      createdAt: new Date().toISOString(),
    }
    setActiveEmail(email)
    setSelectedBlockIdx(null)
    setView('editor')
  }

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
    const block = _fillSig(newBlock(type))
    const blocks = [...activeEmail.blocks, block]
    setActiveEmail({ ...activeEmail, blocks })
    setSelectedBlockIdx(blocks.length - 1)
    setAddingBlock(false)
  }

  const saveDraft = () => {
    const existing = drafts.filter(d => d.draftId !== activeEmail.draftId)
    const updated = [{ ...activeEmail, emailSettings, updatedAt: new Date().toISOString() }, ...existing]
    setDrafts(updated)
    saveDrafts(updated)
  }

  const saveAsTemplate = () => {
    const tpl = {
      id: crypto.randomUUID(),
      name: activeEmail.subject || 'Untitled Template',
      emoji: '⭐',
      category: 'CUSTOM',
      subject: activeEmail.subject,
      blocks: activeEmail.blocks,
      emailSettings,
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
    if (draft.emailSettings) setEmailSettings(draft.emailSettings)
    setSelectedBlockIdx(null)
    setView('editor')
  }

  const handleExport = (action) => {
    const issues = validateEmail()
    if (issues.length > 0) {
      setWarnings(issues)
      setShowWarnings(true)
      return
    }
    setShowWarnings(false)
    setWarnings([])
    if (action === 'copy') {
      if (!previewRef.current) return
      navigator.clipboard.writeText(previewRef.current.innerHTML)
    }
  }

  const forceExport = () => {
    setShowWarnings(false)
    if (!previewRef.current) return
    navigator.clipboard.writeText(previewRef.current.innerHTML)
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
      <div className="eb__header">
        <div>
          <p className="eb__tag">EMAIL MARKETING</p>
          <h2 className="eb__title">Email <em>Builder</em></h2>
        </div>
        <div className="eb__header-actions">
          <Button size="sm" variant="secondary" onClick={() => setView('templates')}>← Templates</Button>
          <Button size="sm" variant="secondary" onClick={saveDraft}>Save Draft</Button>
          <Button size="sm" variant="secondary" onClick={saveAsTemplate}>Save as Template</Button>
          <Button size="sm" variant="secondary" onClick={() => handleExport('copy')}>Copy HTML</Button>
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

      {/* Validation Warnings */}
      {showWarnings && warnings.length > 0 && (
        <div className="eb__warnings">
          <div className="eb__warnings-header">
            <span className="eb__warnings-icon">!</span>
            <strong>Hold on — fix these before exporting:</strong>
            <button className="eb__warnings-close" onClick={() => setShowWarnings(false)}>×</button>
          </div>
          <ul className="eb__warnings-list">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
          <div className="eb__warnings-actions">
            <Button size="sm" variant="secondary" onClick={forceExport}>Copy Anyway</Button>
          </div>
        </div>
      )}

      {/* Two-column: Editor + Preview */}
      <div className="eb__workspace">
        {/* Block List + Editor */}
        <div className="eb__editor-col">
          {/* Quick-fill from property */}
          <div className="eb__email-settings">
            <PropertyPicker
              label="QUICK-FILL FROM A PROPERTY"
              onSelect={(p) => {
                // Find and populate property-card blocks
                const blocks = activeEmail.blocks.map(b => {
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
                // Also update subject line if it has {address} placeholder
                const subject = activeEmail.subject.includes('{address}')
                  ? activeEmail.subject.replace('{address}', p.address)
                  : activeEmail.subject
                setActiveEmail({ ...activeEmail, blocks, subject })
              }}
            />
          </div>

          {/* Email-level settings */}
          <div className="eb__email-settings">
            <StyleSection title="Email Settings" defaultOpen>
              <BrandColorPicker label="Email Background" value={emailSettings.emailBgColor || '#ffffff'} onChange={v => setEmailSettings({ ...emailSettings, emailBgColor: v })} />
              <BrandColorPicker label="Outer Background" value={emailSettings.bgColor || '#e8e4de'} onChange={v => setEmailSettings({ ...emailSettings, bgColor: v })} showMixes />
              <FontPicker label="Default Font" value={emailSettings.fontFamily} onChange={v => setEmailSettings({ ...emailSettings, fontFamily: v })} />
              <BorderRadiusControl label="Email Container Radius" value={emailSettings.borderRadius ?? 6} onChange={v => setEmailSettings({ ...emailSettings, borderRadius: v })} showPill={false} />
            </StyleSection>
          </div>

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

          {selectedBlockIdx !== null && activeEmail.blocks[selectedBlockIdx] && (
            <BlockEditor
              block={activeEmail.blocks[selectedBlockIdx]}
              onChange={updated => updateBlock(selectedBlockIdx, updated)}
              onDelete={() => deleteBlock(selectedBlockIdx)}
              onMoveUp={() => moveBlock(selectedBlockIdx, -1)}
              onMoveDown={() => moveBlock(selectedBlockIdx, 1)}
              isFirst={selectedBlockIdx === 0}
              isLast={selectedBlockIdx === activeEmail.blocks.length - 1}
              connectedSocials={connectedSocials}
              socialChannels={socialChannels}
            />
          )}
        </div>

        {/* Live Preview */}
        <div className="eb__preview-col">
          <p className="eb__field-label">LIVE PREVIEW — click any text to edit</p>
          <div className="eb__preview-frame" style={{ background: emailSettings.bgColor || '#e8e4de' }} onClick={() => setSelectedBlockIdx(null)}>
            <div className="eb__preview-email" ref={previewRef} style={{
              background: emailSettings.emailBgColor || '#ffffff',
              fontFamily: emailSettings.fontFamily || "'Poppins', Arial, sans-serif",
              borderRadius: emailSettings.borderRadius ?? 6,
            }}>
              {activeEmail.blocks.map((block, idx) => (
                <PreviewBlock
                  key={block.id}
                  block={block}
                  onChange={updated => updateBlock(idx, updated)}
                  isSelected={selectedBlockIdx === idx}
                  onSelect={() => setSelectedBlockIdx(idx)}
                  socialChannels={socialChannels}
                  emailSettings={emailSettings}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

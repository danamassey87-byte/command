// ─── Email HTML Generator ───
// Converts Email Builder blocks to inline-styled HTML for Gmail/email clients

const BRAND = {
  dark: '#3A2A1E',
  mid: '#b79782',
  cream: '#efede8',
  white: '#ffffff',
}

export function blocksToHtml(blocks, settings = {}, vars = {}) {
  const font = settings.fontFamily || "'Poppins', Arial, sans-serif"
  const emailBg = settings.emailBgColor || '#ffffff'
  const outerBg = settings.bgColor || '#e8e4de'
  const radius = settings.borderRadius ?? 6

  const resolveVars = (text) => {
    if (!text) return ''
    return Object.entries(vars).reduce((t, [k, v]) => t.replace(new RegExp(`\\{${k}\\}`, 'g'), v || ''), text)
  }

  const nl2br = (text) => resolveVars(text || '').replace(/\n/g, '<br/>')

  const renderBlock = (block) => {
    switch (block.type) {
      case 'header':
        return `<div style="background:${block.bgColor || BRAND.dark};color:${block.textColor || BRAND.white};padding:${block.padding ?? 28}px;text-align:center;border-radius:${block.borderRadius ?? 0}px ${block.borderRadius ?? 0}px 0 0;">
          ${block.logoUrl
            ? `<img src="${block.logoUrl}" alt="Logo" style="max-height:48px;max-width:200px;" />`
            : `<p style="margin:0;font-family:${font};font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">ANTIGRAVITY REAL ESTATE</p>`
          }
        </div>`

      case 'greeting':
        return `<p style="font-family:${block.fontFamily || font};font-size:${block.fontSize || 15}px;color:#333;margin:0;padding:0 0 4px;">${resolveVars(block.text)}</p>`

      case 'text':
        return `<div style="font-family:${block.fontFamily || font};font-size:${block.fontSize || 14}px;line-height:${block.lineHeight ?? 1.65};color:${block.color || '#444'};">${nl2br(block.content)}</div>`

      case 'cta':
        return `<div style="text-align:center;padding:8px 0;">
          <a href="${block.url || '#'}" style="display:inline-block;background:${block.bgColor || BRAND.dark};color:${block.textColor || '#fff'};padding:${block.padding ?? 12}px ${(block.padding ?? 12) * 2.5}px;border-radius:${block.borderRadius ?? 6}px;font-family:${block.fontFamily || font};font-size:${block.fontSize || 14}px;font-weight:600;text-decoration:none;letter-spacing:0.3px;">${resolveVars(block.label)}</a>
        </div>`

      case 'property-card':
        return `<div style="background:${block.bgColor || '#faf9f7'};border-radius:${block.borderRadius ?? 8}px;padding:20px;margin:8px 0;">
          ${block.price ? `<p style="font-family:${font};font-size:22px;font-weight:700;color:${BRAND.dark};margin:0 0 4px;">${resolveVars(block.price)}</p>` : ''}
          ${block.address ? `<p style="font-family:${font};font-size:13px;color:${BRAND.mid};margin:0 0 8px;">${resolveVars(block.address)}</p>` : ''}
          <p style="font-family:${font};font-size:13px;color:#666;margin:0 0 8px;">
            ${[block.beds && `${block.beds} bd`, block.baths && `${block.baths} ba`, block.sqft && `${block.sqft} sqft`].filter(Boolean).join(' &middot; ')}
          </p>
          ${block.description ? `<p style="font-family:${font};font-size:13px;color:#555;line-height:1.5;margin:0;">${resolveVars(block.description)}</p>` : ''}
        </div>`

      case 'event-card':
        return `<div style="border-left:4px solid ${block.accentColor || BRAND.dark};border-radius:0 ${block.borderRadius ?? 8}px ${block.borderRadius ?? 8}px 0;padding:16px 20px;background:#faf9f7;margin:8px 0;">
          ${block.title ? `<p style="font-family:${font};font-size:16px;font-weight:700;color:${BRAND.dark};margin:0 0 6px;">${resolveVars(block.title)}</p>` : ''}
          ${block.date ? `<p style="font-family:${font};font-size:13px;color:#555;margin:0 0 2px;">${resolveVars(block.date)}</p>` : ''}
          ${block.time ? `<p style="font-family:${font};font-size:13px;color:#555;margin:0 0 2px;">${resolveVars(block.time)}</p>` : ''}
          ${block.address ? `<p style="font-family:${font};font-size:13px;color:${BRAND.mid};margin:0;">${resolveVars(block.address)}</p>` : ''}
        </div>`

      case 'stats-row':
        return `<div style="display:flex;gap:12px;padding:12px 0;">
          ${(block.stats || []).map(s => `
            <div style="flex:1;text-align:center;background:${BRAND.cream};border-radius:${block.borderRadius ?? 8}px;padding:14px 8px;">
              <p style="font-family:${font};font-size:20px;font-weight:700;color:${BRAND.dark};margin:0;">${s.value}</p>
              <p style="font-family:${font};font-size:11px;color:${BRAND.mid};margin:2px 0 0;text-transform:uppercase;letter-spacing:0.5px;">${s.label}</p>
              ${s.delta ? `<p style="font-family:${font};font-size:11px;color:#6a9e72;margin:2px 0 0;">${s.delta}</p>` : ''}
            </div>
          `).join('')}
        </div>`

      case 'divider':
        return `<hr style="border:none;border-top:${block.thickness ?? 1}px ${block.dividerStyle || 'solid'} ${block.color || BRAND.mid};margin:12px 0;" />`

      case 'image': {
        const images = block.images || []
        const filled = images.filter(u => u)
        if (!filled.length) return ''
        if (filled.length === 1) {
          return `<div style="padding:4px 0;"><img src="${filled[0]}" alt="${block.alt || ''}" style="width:100%;border-radius:${block.borderRadius ?? 0}px;display:block;" /></div>`
        }
        return `<div style="display:flex;gap:8px;padding:4px 0;">
          ${filled.map(url => `<img src="${url}" alt="${block.alt || ''}" style="flex:1;max-width:${Math.floor(100/filled.length)}%;border-radius:${block.borderRadius ?? 0}px;object-fit:cover;" />`).join('')}
        </div>`
      }

      case 'signature': {
        const parts = []
        if (block.name) parts.push(`<p style="font-family:${font};font-size:14px;font-weight:700;color:${BRAND.dark};margin:0;">${block.name}</p>`)
        if (block.title) parts.push(`<p style="font-family:${font};font-size:12px;color:${BRAND.mid};margin:2px 0 0;">${block.title}</p>`)
        const contacts = [block.phone, block.email, block.website].filter(Boolean)
        if (contacts.length) {
          parts.push(`<p style="font-family:${font};font-size:12px;color:#666;margin:6px 0 0;">${contacts.join(' &middot; ')}</p>`)
        }
        const socials = []
        if (block.instagram) socials.push(`IG: ${block.instagram}`)
        if (block.facebook) socials.push(`FB: ${block.facebook}`)
        if (socials.length) {
          parts.push(`<p style="font-family:${font};font-size:11px;color:${BRAND.mid};margin:4px 0 0;">${socials.join(' &middot; ')}</p>`)
        }
        const logos = []
        if (block.agentLogoUrl) logos.push(`<img src="${block.agentLogoUrl}" alt="Agent" style="max-height:40px;max-width:80px;" />`)
        if (block.brokerageLogoUrl) logos.push(`<img src="${block.brokerageLogoUrl}" alt="Brokerage" style="max-height:32px;max-width:100px;" />`)
        if (logos.length) parts.unshift(`<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px;">${logos.join('')}</div>`)

        return `<div style="border-top:1px solid ${BRAND.cream};padding-top:16px;margin-top:12px;">${parts.join('')}</div>`
      }

      default:
        return ''
    }
  }

  const blocksHtml = blocks.map(renderBlock).filter(Boolean).join('')

  return `<div style="background:${outerBg};padding:32px 16px;">
  <div style="max-width:600px;margin:0 auto;background:${emailBg};border-radius:${radius}px;padding:0;overflow:hidden;">
    <div style="padding:${blocks[0]?.type === 'header' ? '0' : '28px'} 28px 28px;font-family:${font};">
      ${blocksHtml}
    </div>
  </div>
</div>`
}

// Get email builder templates (starter + saved)
export function getEmailTemplates() {
  const STORAGE_KEY = 'email_saved_templates'
  let saved = []
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { /* */ }
  return { saved }
}

// Get starter templates (imported from EmailBuilder)
export const CAMPAIGN_EMAIL_TEMPLATES = [
  {
    id: 'campaign_clean',
    name: 'Clean & Simple',
    emoji: '✨',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: '#3A2A1E', textColor: '#ffffff', borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: '', fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'cta', label: 'Learn More', url: '#', bgColor: '#3A2A1E', textColor: '#ffffff', borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '5', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 },
  },
  {
    id: 'campaign_warm',
    name: 'Warm & Personal',
    emoji: '🤝',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: '#b79782', textColor: '#ffffff', borderRadius: 0, padding: 24 },
      { id: '2', type: 'greeting', text: 'Hey {first_name}!', fontSize: 16, fontFamily: '' },
      { id: '3', type: 'text', content: '', fontSize: 14, fontFamily: '', lineHeight: 1.7, color: '#555' },
      { id: '4', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: '#efede8', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 12 },
  },
  {
    id: 'campaign_listing',
    name: 'Property Showcase',
    emoji: '🏠',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: '#3A2A1E', textColor: '#ffffff', borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: '', fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'property-card', address: '', price: '', beds: '', baths: '', sqft: '', description: '', borderRadius: 8, bgColor: '#faf9f7' },
      { id: '5', type: 'cta', label: 'Schedule a Showing', url: '#', bgColor: '#3A2A1E', textColor: '#ffffff', borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '6', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 },
  },
  {
    id: 'campaign_market',
    name: 'Market Update',
    emoji: '📊',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: '#3A2A1E', textColor: '#ffffff', borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: '', fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'stats-row', stats: [
        { label: 'Median Price', value: '$—', delta: '' },
        { label: 'Days on Market', value: '—', delta: '' },
        { label: 'Active Listings', value: '—', delta: '' },
      ], borderRadius: 8 },
      { id: '5', type: 'text', content: '', fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '6', type: 'cta', label: "Get Your Home's Value", url: '#', bgColor: '#3A2A1E', textColor: '#ffffff', borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 },
  },
]

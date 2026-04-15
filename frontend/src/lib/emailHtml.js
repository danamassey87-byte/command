// ─── Email HTML Generator ───
// Converts Email Builder blocks to inline-styled HTML for Gmail/email clients

const BRAND = {
  dark: '#3A2A1E',
  warm: '#5A4136',
  mid: '#b79782',
  stone: '#C8C3B9',
  cream: '#efede8',
  sage: '#8B9A7B',
  white: '#ffffff',
}

// Brand fonts — mirrored from index.css CSS custom properties
const FONT = {
  body:    "'Nunito Sans', system-ui, sans-serif",
  display: "'Cormorant Garamond', Georgia, serif",
  script:  "'Cormorant', 'Cormorant Garamond', Georgia, serif",
}

export function blocksToHtml(blocks, settings = {}, vars = {}) {
  const font = settings.fontFamily || "'Nunito Sans', 'Poppins', Arial, sans-serif"
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
        return `<div style="font-family:${block.fontFamily || font};font-size:${block.fontSize || 14}px;line-height:${block.lineHeight ?? 1.65};color:${block.color || '#444'};${block.textAlign ? `text-align:${block.textAlign};` : ''}${block.fontStyle ? `font-style:${block.fontStyle};` : ''}${block.fontWeight ? `font-weight:${block.fontWeight};` : ''}">${nl2br(block.content)}</div>`

      case 'cta':
        return `<div style="text-align:center;padding:8px 0;">
          <a href="${block.url || '#'}" style="display:inline-block;background:${block.bgColor || BRAND.dark};color:${block.textColor || '#fff'};padding:${block.padding ?? 12}px ${(block.padding ?? 12) * 2.5}px;border-radius:${block.borderRadius ?? 6}px;font-family:${block.fontFamily || font};font-size:${block.fontSize || 14}px;font-weight:600;text-decoration:none;letter-spacing:0.3px;${block.borderColor ? `border:2px solid ${block.borderColor};` : ''}">${resolveVars(block.label)}</a>
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

      case 'video': {
        const thumb = block.thumbnailUrl
        const hasThumb = thumb && thumb.trim()
        return `<div style="text-align:center;padding:8px 0;">
          <a href="${block.videoUrl || '#'}" target="_blank" rel="noopener noreferrer" style="display:inline-block;text-decoration:none;position:relative;width:100%;">
            ${hasThumb
              ? `<img src="${thumb}" alt="${resolveVars(block.alt || 'Video')}" style="width:100%;border-radius:${block.borderRadius ?? 8}px;display:block;" />`
              : `<div style="background:#f0ede8;border-radius:${block.borderRadius ?? 8}px;padding:60px 20px;text-align:center;">
                  <p style="font-family:${font};font-size:14px;color:#888;margin:0;">Video thumbnail</p>
                </div>`
            }
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;background:rgba(0,0,0,0.6);border-radius:50%;display:flex;align-items:center;justify-content:center;">
              <div style="width:0;height:0;border-style:solid;border-width:12px 0 12px 22px;border-color:transparent transparent transparent #ffffff;margin-left:4px;"></div>
            </div>
          </a>
          ${block.caption ? `<p style="font-family:${font};font-size:13px;color:${BRAND.mid};margin:8px 0 0;text-align:center;">${resolveVars(block.caption)}</p>` : ''}
        </div>`
      }

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

  // Google Fonts link for email clients (Gmail, Apple Mail, etc. support <link> in <head>)
  const fontsLink = `<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Cormorant:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Nunito+Sans:opsz,wght@6..12,300;6..12,400;6..12,500;6..12,600;6..12,700&display=swap" rel="stylesheet" />`

  return `${fontsLink}
<div style="background:${outerBg};padding:32px 16px;">
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
  {
    id: 'campaign_were_live',
    name: "We're Live — Seller Listing Launch",
    emoji: '🏡',
    blocks: [
      // Logo header — REAL brokerage white logo on dark espresso
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Script headline — "We're live..." in Cormorant italic (matches Flodesk hero)
      { id: '2', type: 'text', content: "We're\nlive...", fontSize: 48, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.1, color: BRAND.dark, textAlign: 'left' },
      // Hero listing photo — drop in your main listing image
      { id: '3', type: 'image', images: [''], alt: 'Listing hero photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // Body copy — Nunito Sans
      { id: '4', type: 'text', content: "We're officially live on your beautiful home! I've attached our listing below for you to review! Please let me know if you see anything you'd like updated or changed!\n\nYou will receive weekly listing updates from me every Wednesday and I will share feedback as it comes in!", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // CTA — review listing (pill button, brand dark)
      { id: '5', type: 'cta', label: 'REVIEW OUR LISTING HERE', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.dark, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Divider
      { id: '6', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Video marketing — thumbnail + play button overlay
      { id: '7', type: 'video', videoUrl: '', thumbnailUrl: '', caption: '', alt: 'Listing video tour', borderRadius: 0 },
      // "HERE IS OUR VIDEO MARKETING" label — spaced uppercase Cormorant Garamond
      { id: '8', type: 'text', content: 'HERE IS OUR VIDEO MARKETING', fontSize: 16, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.4, color: BRAND.stone, textAlign: 'center' },
      // Divider
      { id: '9', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Coming-up schedule — bold day labels
      { id: '10', type: 'text', content: "Thursday — Launch listing\nFriday — Flyers for open house go out\nSaturday — Open House 11 - 2", fontSize: 14, fontFamily: FONT.body, lineHeight: 2.0, color: BRAND.warm },
      // Signature — auto-fills from Settings
      { id: '11', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.cream, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_offer_received',
    name: 'Offer Received — Seller Notification',
    emoji: '📩',
    blocks: [
      // Logo header — REAL brokerage white logo on dark espresso
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Hero script headline — "An offer... for you to review!" in Cormorant italic
      { id: '2', type: 'text', content: 'An offer...\nfor you to\nreview!', fontSize: 42, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.15, color: BRAND.dark, textAlign: 'center' },
      // Body copy
      { id: '3', type: 'text', content: "Congratulations — we officially have an offer on your home! I am going to list the details of the offer for you to review and have the full offer attached below!\n\nPlease call me once you've reviewed to discuss!!", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Divider
      { id: '4', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "Offer terms:" script header
      { id: '5', type: 'text', content: 'Offer terms:', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark },
      // Offer details — checkmark list, spaced uppercase Cormorant Garamond
      { id: '6', type: 'text', content: "\u2713  SALES PRICE — $000,000\n\n\u2713  EARNEST MONEY — $0,000\n\n\u2713  CLOSE OF ESCROW — 00/00/0000\n\n\u2713  SELLER CONCESSIONS — $0\n\n\u2713  HOME WARRANTY — Yes / No", fontSize: 14, fontFamily: FONT.display, fontWeight: '500', lineHeight: 2.2, color: BRAND.warm },
      // Divider
      { id: '7', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "RESPONSE TIME" label — spaced uppercase
      { id: '8', type: 'text', content: 'RESPONSE TIME', fontSize: 13, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.4, color: BRAND.mid, textAlign: 'center' },
      // Big deadline date — large Cormorant Garamond, muted stone color
      { id: '9', type: 'text', content: 'MONTH 00TH, AT\n0:00', fontSize: 42, fontFamily: FONT.display, fontWeight: '300', lineHeight: 1.2, color: BRAND.stone, textAlign: 'center' },
      // CTA — outlined pill button to view the offer document
      { id: '10', type: 'cta', label: 'YOUR OFFER HERE', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Divider
      { id: '11', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "Talk soon!" script closing
      { id: '12', type: 'text', content: 'Talk soon!', fontSize: 36, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark },
      // Image slot — drop in your headshot or personal photo
      { id: '13', type: 'image', images: [''], alt: 'Agent photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // Signature — auto-fills from Settings
      { id: '14', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.cream, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_post_listing_appt',
    name: 'Post Listing Appointment — Next Steps',
    emoji: '📋',
    blocks: [
      // Hero section — side-by-side: image left, script text right
      // (Using image block for the property photo, then the script headline)
      { id: '1', type: 'image', images: [''], alt: 'Property photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // Script headline — "Thank you for having us by your beautiful home"
      { id: '2', type: 'text', content: 'Thank you for\nhaving us\nby your\nbeautiful\nhome', fontSize: 38, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.2, color: BRAND.dark, textAlign: 'right' },
      // Divider
      { id: '3', type: 'divider', color: BRAND.mid, thickness: 1, dividerStyle: 'solid' },
      // Greeting
      { id: '4', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: FONT.body },
      // Body intro
      { id: '5', type: 'text', content: "Thank you so much for trusting in me to help you with the sale of your home! I look forward to working with you! I wanted to send over a quick email to go over next steps!\n\nWould you please fill out the listing questionnaire below when you have a second?", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // CTA — listing questionnaire
      { id: '6', type: 'cta', label: 'CLICK HERE FOR LISTING QUESTIONNAIRE', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Divider
      { id: '7', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Suggested list price — large display font
      { id: '8', type: 'text', content: 'Suggested List Price — $000,000 - $000,000', fontSize: 24, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Divider
      { id: '9', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Step 01 — Listing Documents
      { id: '10', type: 'text', content: '01 — Listing Documents and\nCommission Agreement', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark },
      { id: '11', type: 'text', content: "Should you decide you're ready to move forward with listing, our first step would be to set up a time to go over listing documents, agreements, commission amounts and all signed documents. We can use this time to answer any questions you have in regards to the listing process. I can send over a closing cost estimate and cash to seller figures so you know what you will walk away with at different price points once we have this finalized.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Step 02 — Home Prep
      { id: '12', type: 'text', content: '02 — Home Prep', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark },
      { id: '13', type: 'text', content: "Prior to photos we recommend having your house cleaned, clutter put away and landscape maintenance done.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Step 03 — Schedule Photos & Videos
      { id: '14', type: 'text', content: '03 — Schedule Photos & Videos', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark },
      { id: '15', type: 'text', content: "High end photos are key to presenting your home in the best light and are the first step to getting eyes on your property. We will also have drone photos scheduled for the outside of your home. We schedule and film professional videos for all of our listings. We use these to showcase your home on different social platforms including YouTube & Instagram.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Step 04 — Finalize Marketing Package
      { id: '16', type: 'text', content: '04 — Finalize Marketing Package', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark },
      { id: '17', type: 'text', content: "We do a full marketing package including print, mail, email and social marketing for your home. We send out mailers to your closest 500 neighbors letting them know about our listing and inviting them to our open house.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // CTA — full marketing guide
      { id: '18', type: 'cta', label: 'SEE OUR FULL LISTING MARKETING GUIDE HERE', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Step 05 — Schedule List Date & Open House
      { id: '19', type: 'text', content: '05 — Schedule List Date &\nOpen House', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark },
      { id: '20', type: 'text', content: "Depending on when we decide to list we will schedule our launch date and mega open house first weekend on market.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Step 06 — Go Coming Soon / Lockbox & Sign Install
      { id: '21', type: 'text', content: '06 — Go Coming Soon Status /\nLockbox and Sign Install', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark },
      { id: '22', type: 'text', content: "Depending on if we'd like to go coming soon status or just go straight to market we will finalize dates and get sign and lockbox installation scheduled.\n\nDue by: TBD depending on list date", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Divider
      { id: '23', type: 'divider', color: BRAND.mid, thickness: 1, dividerStyle: 'solid' },
      // Closing
      { id: '24', type: 'text', content: "Have any questions? Please reach out via phone call or text. I'm here to help!", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // Script sign-off with agent name
      { id: '25', type: 'text', content: '{agent_first_name}', fontSize: 42, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Signature — auto-fills from Settings
      { id: '26', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.white, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_weekly_activity',
    name: 'Weekly Listing Activity Update',
    emoji: '📊',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Hero card — script "Listing Activity" + subtitle on cream bg
      { id: '2', type: 'text', content: 'Listing Activity', fontSize: 42, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark, textAlign: 'center' },
      { id: '3', type: 'text', content: 'YOUR WEEKLY LISTING\nACTIVITY UPDATE', fontSize: 16, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.4, color: BRAND.warm, textAlign: 'center' },
      // Divider
      { id: '4', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Weekly note — personal touch
      { id: '5', type: 'text', content: "Happy Friday!! I just wanted to send a quick note to thank you for being so flexible and easy going with showings. I know it's a ton of work to keep your home show ready and also know how much work it is to get out of the house with work, kids and dogs. I appreciate you!", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Market commentary — editable per week
      { id: '6', type: 'text', content: "I am super happy with our activity and feel like we're right on track with what's happening in the market. I am happy with where we sit in regards to our active competition and think we're close to an offer.\n\nI am going to link our active competition below in case you'd like to see how we compare.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // CTA — competition link
      { id: '7', type: 'cta', label: 'Our Competition Here', url: '#', bgColor: BRAND.white, textColor: BRAND.mid, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Divider
      { id: '8', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "our social media insights" — script header
      { id: '9', type: 'text', content: 'our social media insights', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.stone, textAlign: 'center' },
      // Social screenshots — drop in Instagram Insights screenshots
      { id: '10', type: 'image', images: ['', ''], alt: 'Social media insights screenshots', layout: '2col', shape: 'box', borderRadius: 8 },
      // Divider
      { id: '11', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "our stats" — script header
      { id: '12', type: 'text', content: 'our stats', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.stone, textAlign: 'center' },
      // Stats block — fill in each week
      { id: '13', type: 'text', content: "WE'RE CURRENTLY — 00 days on market\nZIP CODE AVERAGE DOM — 00\nSHOWINGS — 0 agent showings\nOUR FEEDBACK — Edit with showing feedback\nOUR EMAIL — Went to hundreds of agents and clients\nOUR VIDEOS — See details above", fontSize: 14, fontFamily: FONT.display, fontWeight: '500', lineHeight: 2.0, color: BRAND.warm },
      // Divider
      { id: '14', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "recommended next steps" — script header
      { id: '15', type: 'text', content: 'recommended next steps', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.stone, textAlign: 'center' },
      // Next steps recommendation — editable per week
      { id: '16', type: 'text', content: "Edit this section with your recommended next steps — price adjustment, new open house, staging changes, etc.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // Divider
      { id: '17', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Script sign-off with agent name
      { id: '18', type: 'text', content: '{agent_first_name}', fontSize: 42, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Signature — auto-fills from Settings
      { id: '19', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.cream, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_buyer_under_contract',
    name: 'Buyer Under Contract — Next Steps',
    emoji: '🎉',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Script hero — "Congratulations"
      { id: '2', type: 'text', content: 'Congratulations', fontSize: 48, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.1, color: BRAND.dark, textAlign: 'center' },
      // Subtitle — "YOU'RE OFFICIALLY UNDER CONTRACT!"
      { id: '3', type: 'text', content: "YOU'RE OFFICIALLY\nUNDER CONTRACT!", fontSize: 28, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Property hero image drop zone
      { id: '4', type: 'image', images: [''], alt: 'Property photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // Divider
      { id: '5', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "YOUR CLOSE DATE" label
      { id: '6', type: 'text', content: 'YOUR CLOSE DATE', fontSize: 13, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.4, color: BRAND.mid, textAlign: 'center' },
      // Big close date
      { id: '7', type: 'text', content: 'MONTH 00 0000', fontSize: 42, fontFamily: FONT.display, fontWeight: '300', lineHeight: 1.2, color: BRAND.stone, textAlign: 'center' },
      // Divider
      { id: '8', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "Next Steps" script header on cream card
      { id: '9', type: 'text', content: 'Next Steps', fontSize: 36, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Checklist — open escrow, earnest money, inspections
      { id: '10', type: 'text', content: "\u2713  OPEN ESCROW\n\n\u2713  DEPOSIT EARNEST MONEY\n\n\u2713  SCHEDULE INSPECTIONS", fontSize: 14, fontFamily: FONT.display, fontWeight: '500', lineHeight: 2.2, color: BRAND.warm },
      // Divider
      { id: '11', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Body copy — congratulations + next steps explanation
      { id: '12', type: 'text', content: "Congratulations on your accepted offer on the __________ property! We are so excited for you and really think this is a great offer. I wanted to send you over a quick email to go over our next steps.\n\nBoth the title company and the buyer's lender have the necessary docs to start their side of the process! Title will be reaching out to schedule the earnest money pick up or drop off and I will let you know once it's received.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // Divider
      { id: '13', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Title company label
      { id: '14', type: 'text', content: 'YOUR TITLE COMPANY', fontSize: 13, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.4, color: BRAND.mid, textAlign: 'center' },
      // Title company name — fill in per deal
      { id: '15', type: 'text', content: 'Title Company Name', fontSize: 24, fontFamily: FONT.display, fontWeight: '300', lineHeight: 1.3, color: BRAND.stone, textAlign: 'center' },
      // Divider
      { id: '16', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "Inspections" script header
      { id: '17', type: 'text', content: 'Inspections', fontSize: 36, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark },
      // Inspection details — editable per deal
      { id: '18', type: 'text', content: "The buyer's inspection is scheduled for __________ and the review will take place at __________ and should last about 1 hour.\n\nThe buyer will have until __________ to submit their repair requests, back out or move forward as is.\n\nThe appraisal will likely be ordered once we're through with repair negotiations.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // Divider
      { id: '19', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Closing excitement + image
      { id: '20', type: 'text', content: "I'm sooo excited for you and can't wait to get you into your new home!", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Script sign-off — "Love, {agent_name}"
      { id: '21', type: 'text', content: 'Love, {agent_first_name}', fontSize: 36, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark },
      // Agent photo drop zone
      { id: '22', type: 'image', images: [''], alt: 'Agent photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // Signature — auto-fills from Settings
      { id: '23', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.cream, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_seller_pre_close',
    name: 'Seller Pre-Close — Week Before Closing',
    emoji: '🔑',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Property photo drop zone
      { id: '2', type: 'image', images: [''], alt: 'Property photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // Script hero — "We're getting close.."
      { id: '3', type: 'text', content: "We're getting\nclose..", fontSize: 42, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.15, color: BRAND.dark },
      // Intro
      { id: '4', type: 'text', content: "Your home sale is right around the corner and I wanted to send a quick email to go over the last steps of the process.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // "Here's what happens next...." display heading
      { id: '5', type: 'text', content: "Here's what happens next....", fontSize: 24, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Divider
      { id: '6', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Loan docs explanation
      { id: '7', type: 'text', content: "The lender and the title company will work on balancing figures and coordinating getting loan documents to title, once we have the buyer's mortgage final approval. The buyer will then get scheduled to sign.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // Divider
      { id: '8', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "Signing" script header
      { id: '9', type: 'text', content: 'Signing', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Signing details
      { id: '10', type: 'text', content: "Title will reach out to you to schedule signing this week. I've attached the estimated settlement statement for your review.\n\nI'd love to be there to assist with your closing in case you have any questions but if we're on a tight timeline we can always have a notary come to you directly to sign.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // CTA — settlement statement
      { id: '11', type: 'cta', label: 'SEE SETTLEMENT STATEMENT HERE', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // "final walk through" script header
      { id: '12', type: 'text', content: 'final walk through', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Walk through details — editable date/time
      { id: '13', type: 'text', content: "The buyer will conduct their final walk through at _____ on __/__/____.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // "closing" script header
      { id: '14', type: 'text', content: 'closing', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Closing funds details
      { id: '15', type: 'text', content: "The title company will let you know final figures for closing funds and you can bring a cashier's check to signing.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // Wire fraud warning
      { id: '16', type: 'text', content: "If you choose to wire closing funds\n\nPlease verify instructions with me prior to sending. Wire fraud is on the rise and I want to make sure your funds are protected.", fontSize: 14, fontFamily: FONT.body, fontWeight: '600', lineHeight: 1.7, color: BRAND.dark, textAlign: 'center' },
      // Divider
      { id: '17', type: 'divider', color: BRAND.mid, thickness: 1, dividerStyle: 'solid' },
      // Script sign-off
      { id: '18', type: 'text', content: '- {agent_first_name}', fontSize: 28, fontFamily: FONT.display, fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Signature
      { id: '19', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.cream, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_pre_listing_appt',
    name: 'Pre-Listing Appointment — What to Expect',
    emoji: '🤝',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Script hero — "We look forward to meeting you..."
      { id: '2', type: 'text', content: 'I look forward to\nmeeting you...', fontSize: 42, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.15, color: BRAND.dark, textAlign: 'center' },
      // Subtitle — "AND WE WANT TO BE PREPARED...."
      { id: '3', type: 'text', content: 'AND I WANT TO BE\nPREPARED....', fontSize: 22, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Property / agent photo drop zone
      { id: '4', type: 'image', images: [''], alt: 'Property or agent photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // Divider
      { id: '5', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Questionnaire ask
      { id: '6', type: 'text', content: 'WOULD YOU PLEASE FILL OUT THE QUESTIONNAIRE\nBELOW PRIOR TO OUR MEETING?', fontSize: 13, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.5, color: BRAND.mid, textAlign: 'center' },
      // CTA — questionnaire link
      { id: '7', type: 'cta', label: 'FILL OUT HERE', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Divider
      { id: '8', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "WHAT TO EXPECT AT OUR WALK THROUGH" heading
      { id: '9', type: 'text', content: 'WHAT TO EXPECT AT OUR\nWALK THROUGH', fontSize: 22, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.3, color: BRAND.dark },
      // Walk through checklist
      { id: '10', type: 'text', content: "\u2713  Discuss upgrades of the home; you can share with me anything you think I should know about the property\n\n\u2713  Review comps and pricing — discuss neighborhood comps used and market data\n\n\u2713  Review next steps to list — go over next steps for getting ready to list\n\n\u2713  Chat about commissions, process — finalize commission amount and process after listing\n\n\u2713  Review our marketing plan — I've attached a copy below!", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.8, color: BRAND.warm },
      // Divider
      { id: '11', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "I will come prepared with.." script header
      { id: '12', type: 'text', content: 'I will come prepared with..', fontSize: 36, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark },
      // What agent brings
      { id: '13', type: 'text', content: "Comps used, suggested list price, marketing plan and listing documents should we need them!", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Divider
      { id: '14', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Script sign-off
      { id: '15', type: 'text', content: 'Love, {agent_first_name}', fontSize: 36, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Signature
      { id: '16', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.cream, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_post_close_thankyou_buyer',
    name: 'Post Close Thank You + Gift — Buyer',
    emoji: '☕',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Big hero image — "A LITTLE GIFT TO THANK YOU..." text overlaid on gift photo
      { id: '2', type: 'image', images: [''], alt: 'Thank you gift card hero', layout: 'full', shape: 'box', borderRadius: 0 },
      // Headline text overlay — spaced uppercase on cream bg
      { id: '3', type: 'text', content: 'A LITTLE\nGIFT TO\nTHANK\nYOU\nFOR BEING\nA HUGE\nPART OF\nWHAT WE\nDO.', fontSize: 22, fontFamily: FONT.display, fontWeight: '300', lineHeight: 1.6, color: BRAND.stone, textAlign: 'center' },
      // Divider
      { id: '4', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "just wanted to send a quick note.." script
      { id: '5', type: 'text', content: 'just wanted to send a quick note..', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.stone },
      // Body copy
      { id: '6', type: 'text', content: "to remind you how grateful I am for you.\n\nThank you for letting me be a part of your journey.\n\nPlease enjoy a coffee on me tomorrow morning <3\n\n**Scan this code at your local Starbucks at the checkout window.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.8, color: BRAND.warm },
      // Gift card barcode image — drop in Starbucks barcode screenshot
      { id: '7', type: 'image', images: [''], alt: 'Gift card barcode', layout: 'full', shape: 'box', borderRadius: 8 },
      // Divider
      { id: '8', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Script sign-off — large agent name
      { id: '9', type: 'text', content: '{agent_first_name}', fontSize: 48, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Signature
      { id: '10', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.white, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_post_close_thankyou_seller',
    name: 'Post Close Thank You + Gift — Seller',
    emoji: '☕',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Big hero image — "A LITTLE GIFT TO THANK YOU..." text overlaid on gift photo
      { id: '2', type: 'image', images: [''], alt: 'Thank you gift card hero', layout: 'full', shape: 'box', borderRadius: 0 },
      // Headline text — spaced uppercase on cream bg
      { id: '3', type: 'text', content: 'A LITTLE\nGIFT TO\nTHANK\nYOU\nFOR BEING\nA HUGE\nPART OF\nWHAT WE\nDO.', fontSize: 22, fontFamily: FONT.display, fontWeight: '300', lineHeight: 1.6, color: BRAND.stone, textAlign: 'center' },
      // Divider
      { id: '4', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "just wanted to send a quick note.." script
      { id: '5', type: 'text', content: 'just wanted to send a quick note..', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.stone },
      // Body copy — seller version
      { id: '6', type: 'text', content: "to remind you how grateful I am for you.\n\nThank you for trusting me with the sale of your home — it was truly a pleasure working with you.\n\nPlease enjoy a coffee on me tomorrow morning <3\n\n**Scan this code at your local Starbucks at the checkout window.", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.8, color: BRAND.warm },
      // Gift card barcode image — drop in Starbucks barcode screenshot
      { id: '7', type: 'image', images: [''], alt: 'Gift card barcode', layout: 'full', shape: 'box', borderRadius: 8 },
      // Divider
      { id: '8', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Script sign-off — large agent name
      { id: '9', type: 'text', content: '{agent_first_name}', fontSize: 48, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Signature
      { id: '10', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.white, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_reverse_prospecting',
    name: 'Open House — Reverse Prospecting / SOI',
    emoji: '📣',
    blocks: [
      // Property hero image
      { id: '1', type: 'image', images: [''], alt: 'Listing hero photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // "just listed in 85___" script
      { id: '2', type: 'text', content: 'just listed in 85___', fontSize: 36, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.2, color: BRAND.dark },
      // Divider
      { id: '3', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Big display headline
      { id: '4', type: 'text', content: 'I LISTED A REALLY\nCOOL HOUSE: IN AREA!', fontSize: 24, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Subtitle
      { id: '5', type: 'text', content: '(see the full video walk through below)', fontSize: 13, fontFamily: FONT.body, lineHeight: 1.5, color: BRAND.mid, textAlign: 'center' },
      // Divider
      { id: '6', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "And I kinda need your help..." script
      { id: '7', type: 'text', content: 'And I kinda need your help.......', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Body — forward request
      { id: '8', type: 'text', content: "I listed this really amazing home in _______ and I am pulling out all of my marketing stops to get it sold. If you have any friends or family looking to purchase a home in the area would you do me a HUGE favor and forward this email to them?", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm, textAlign: 'center' },
      // Open house details — bold, editable
      { id: '9', type: 'text', content: "Address here\nOpen House Saturday\n9:00 - 1:00", fontSize: 16, fontFamily: FONT.body, fontWeight: '700', lineHeight: 1.8, color: BRAND.dark, textAlign: 'center' },
      // CTA — full listing
      { id: '10', type: 'cta', label: 'CLICK HERE FOR THE FULL LISTING', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Video walkthrough
      { id: '11', type: 'video', videoUrl: '', thumbnailUrl: '', caption: 'Full video walk through', alt: 'Listing video tour', borderRadius: 0 },
      // Signature
      { id: '12', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.white, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_price_drop_open_house',
    name: 'Price Drop + Open House Announcement',
    emoji: '💰',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // Property photo
      { id: '2', type: 'image', images: [''], alt: 'Listing photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // "THAT ONE TIME" display
      { id: '3', type: 'text', content: 'THAT ONE TIME', fontSize: 16, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.4, color: BRAND.dark, textAlign: 'right' },
      // "the price got even better...." script
      { id: '4', type: 'text', content: 'the price got\neven better....', fontSize: 36, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.15, color: BRAND.dark, textAlign: 'right' },
      // CTA — view listing
      { id: '5', type: 'cta', label: 'VIEW THE LISTING HERE', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Divider
      { id: '6', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Body — price improvement announcement
      { id: '7', type: 'text', content: "The house you've had your eye on just got even better.....We've made a price improvement on this beautiful home and I wanted you to be the first to know....", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Countdown placeholder — editable days/hours
      { id: '8', type: 'text', content: 'DAYS : HOURS : MINUTES : SECONDS\nuntil our open house!', fontSize: 18, fontFamily: FONT.display, fontWeight: '300', lineHeight: 1.5, color: BRAND.stone, textAlign: 'center' },
      // Open house CTA — big bold
      { id: '9', type: 'text', content: "COME CHECK IT OUT AT OUR OPEN HOUSE THIS\nSATURDAY AT 9:00. MARK YOUR CALENDARS!!", fontSize: 16, fontFamily: FONT.display, fontWeight: '600', lineHeight: 1.4, color: BRAND.dark, textAlign: 'center' },
      // Signature
      { id: '10', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.cream, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_newest_listing',
    name: 'Our Newest Listing — Property Showcase',
    emoji: '🏠',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // "The home you've been waiting for..." script hero
      { id: '2', type: 'text', content: "The home you've been waiting for...", fontSize: 42, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.15, color: BRAND.dark },
      // Property photo
      { id: '3', type: 'image', images: [''], alt: 'Listing photo', layout: 'full', shape: 'box', borderRadius: 0 },
      // City / location
      { id: '4', type: 'text', content: 'City', fontSize: 14, fontFamily: FONT.body, lineHeight: 1.4, color: BRAND.mid, textAlign: 'right' },
      // Specs — beds, baths, sqft
      { id: '5', type: 'text', content: '0 Bed, 0 Bath,\n0,000 Sq. Ft.', fontSize: 24, fontFamily: FONT.display, fontWeight: '400', lineHeight: 1.3, color: BRAND.dark, textAlign: 'right' },
      // CTA — view listing
      { id: '6', type: 'cta', label: 'VIEW LISTING', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Divider
      { id: '7', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Listing description — editable
      { id: '8', type: 'text', content: "Add your listing description and listing details here!", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.7, color: BRAND.warm },
      // Divider
      { id: '9', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // "Here for you every step of the way!" script closing
      { id: '10', type: 'text', content: 'Here for you every step of the way!', fontSize: 32, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Signature
      { id: '11', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.white, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
  {
    id: 'campaign_review_request',
    name: 'Post Close — Review Request',
    emoji: '⭐',
    blocks: [
      // Logo header
      { id: '1', type: 'header', logoUrl: '/assets/branding/real-logo-white.png', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      // "Can you help us out?" script
      { id: '2', type: 'text', content: 'Can you help me out?', fontSize: 42, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.15, color: BRAND.dark, textAlign: 'center' },
      // Body — review ask
      { id: '3', type: 'text', content: "Thank you so much for working with me on the sale of your home!\n\nI would so appreciate it if you took time to leave me a quick review with how your experience was!\n\nClick the link below if you're feeling awesome....", fontSize: 14, fontFamily: FONT.body, lineHeight: 1.8, color: BRAND.warm, textAlign: 'center' },
      // Divider
      { id: '4', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // CTA — Google review
      { id: '5', type: 'cta', label: 'CLICK HERE TO LEAVE ME A GOOGLE REVIEW', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // CTA — Zillow review
      { id: '6', type: 'cta', label: 'CLICK HERE TO LEAVE ME A ZILLOW REVIEW', url: '#', bgColor: BRAND.white, textColor: BRAND.dark, borderColor: BRAND.mid, borderRadius: 30, fontSize: 13, fontFamily: FONT.body, padding: 14 },
      // Divider
      { id: '7', type: 'divider', color: BRAND.cream, thickness: 1, dividerStyle: 'solid' },
      // Script sign-off — large agent name
      { id: '8', type: 'text', content: '{agent_name}', fontSize: 48, fontFamily: FONT.script, fontStyle: 'italic', fontWeight: '300', lineHeight: 1.3, color: BRAND.dark, textAlign: 'center' },
      // Divider
      { id: '9', type: 'divider', color: BRAND.mid, thickness: 1, dividerStyle: 'solid' },
      // Signature
      { id: '10', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
    settings: { bgColor: BRAND.white, emailBgColor: BRAND.white, fontFamily: FONT.body, borderRadius: 0 },
  },
]

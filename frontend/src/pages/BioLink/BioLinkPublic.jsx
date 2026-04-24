import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getPublicPage, submitLead } from '../../lib/biolink'
import './BioLinkPublic.css'

const BRAND = {
  dark: '#3A2A1E',
  mid: '#b79782',
  cream: '#efede8',
  white: '#ffffff',
}

// ─── Public Form Modal ───
function LeadFormModal({ block, pageId, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) { setError('Email is required'); return }
    setSubmitting(true)
    setError('')
    try {
      await submitLead({
        pageId,
        blockId: block.id,
        name,
        email,
        phone,
        guideType: block.guideType || block.type,
        campaignId: block.campaignId || null,
      })
      onSuccess()
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  return (
    <div className="bpl-modal-overlay" onClick={onClose}>
      <form className="bpl-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="bpl-modal__close" onClick={onClose} aria-label="Close">&times;</button>
        <h3 className="bpl-modal__title">{block.title || 'Get Your Free Guide'}</h3>
        <p className="bpl-modal__sub">Enter your info and we'll send it right over.</p>
        <input className="bpl-input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
        <input className="bpl-input" type="email" placeholder="Email *" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="bpl-input" type="tel" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        {error && <p className="bpl-error">{error}</p>}
        <button className="bpl-submit-btn" type="submit" disabled={submitting} style={{
          background: block.accentColor || block.textColor || BRAND.mid,
          borderRadius: block.buttonRadius ?? 9999,
        }}>
          {submitting ? 'Submitting...' : (block.buttonText || 'Get It Now')}
        </button>
      </form>
    </div>
  )
}

// ─── Thank You Screen (after form submit) ───
function ThankYou({ block, fileUrl, onDismiss }) {
  return (
    <div className="bpl-modal-overlay" onClick={onDismiss}>
      <div className="bpl-modal bpl-modal--thanks" onClick={e => e.stopPropagation()}>
        <h3 className="bpl-modal__title">Thank you!</h3>
        <p className="bpl-modal__sub">Check your email — we'll follow up shortly.</p>
        {fileUrl && (
          <a className="bpl-download-btn" href={fileUrl} download target="_blank" rel="noopener noreferrer">
            Download Now
          </a>
        )}
        <button className="bpl-dismiss-btn" onClick={onDismiss}>Close</button>
      </div>
    </div>
  )
}

// ─── Public Block Renderer ───
function PublicBlock({ block, pageFont, onFormClick }) {
  if (block.type === 'header') {
    const font = block.fontFamily || pageFont
    return (
      <div className="bpl-header" style={{
        background: block.bgColor,
        color: block.textColor,
        borderRadius: block.borderRadius ?? 12,
        padding: block.padding ?? 24,
        fontFamily: font || undefined,
      }}>
        {block.imageUrl
          ? <img className="bpl-avatar" src={block.imageUrl} alt="" />
          : <div className="bpl-avatar-placeholder" style={{ borderColor: block.textColor }}>{block.name?.[0] || 'D'}</div>
        }
        <p className="bpl-name" style={{ fontSize: block.nameSize || 22, fontFamily: font || undefined }}>{block.name}</p>
        <p className="bpl-subtitle" style={{ fontSize: block.subtitleSize || 13 }}>{block.subtitle}</p>
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
      transition: 'transform 0.15s, box-shadow 0.15s',
      width: '100%',
      textDecoration: 'none',
      display: 'block',
    }
    const styles = {
      filled: { ...base, background: block.bgColor, color: block.textColor, border: 'none' },
      outline: { ...base, background: 'transparent', color: block.bgColor, border: `2px solid ${block.bgColor}` },
      ghost: { ...base, background: 'transparent', color: block.bgColor, border: 'none', textDecoration: 'underline' },
    }
    return <a href={block.url || '#'} style={styles[block.style] || styles.filled} target="_blank" rel="noopener noreferrer" className="bpl-link-btn">{block.label}</a>
  }

  if (block.type === 'form') {
    const font = block.fontFamily || pageFont
    return (
      <div className="bpl-form-card" style={{
        background: block.bgColor,
        color: block.textColor,
        borderRadius: block.borderRadius ?? 12,
        padding: block.padding ?? 20,
        fontFamily: font || undefined,
        cursor: 'pointer',
      }} onClick={() => onFormClick(block)}>
        <p className="bpl-form-title" style={{ fontSize: block.titleSize || 16 }}>{block.title}</p>
        <button className="bpl-form-btn" style={{
          background: block.textColor,
          color: block.bgColor,
          borderRadius: block.buttonRadius ?? 9999,
        }}>{block.buttonText || 'Get It Now'}</button>
      </div>
    )
  }

  if (block.type === 'guide') {
    const font = block.fontFamily || pageFont
    return (
      <div className="bpl-guide" style={{
        background: block.bgColor,
        color: block.textColor,
        borderRadius: block.borderRadius ?? 12,
        padding: block.padding ?? 16,
        fontFamily: font || undefined,
        cursor: 'pointer',
      }} onClick={() => onFormClick(block)}>
        <div className="bpl-guide__image">
          {block.imageUrl
            ? <img src={block.imageUrl} alt={block.title} />
            : <div className="bpl-guide__image-ph">PDF</div>
          }
        </div>
        <div className="bpl-guide__content">
          <p className="bpl-guide__title" style={{ fontSize: block.titleSize || 16 }}>{block.title}</p>
          <p className="bpl-guide__desc" style={{ fontSize: block.descSize || 13 }}>{block.description}</p>
          <button className="bpl-guide__btn" style={{
            background: block.accentColor || BRAND.mid,
            color: block.bgColor,
            borderRadius: block.buttonRadius ?? 9999,
          }}>{block.buttonText || 'Get the Guide'}</button>
        </div>
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
    if (!block.imageUrl) return null
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
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" style={{
            width: size, height: size, borderRadius: radius,
            border: iconStyle === 'outline' ? `2px solid ${block.iconColor}` : 'none',
            background: iconStyle === 'filled' ? (block.iconBgColor && block.iconBgColor !== 'transparent' ? block.iconBgColor : block.iconColor) : 'transparent',
            color: iconStyle === 'filled' ? (block.iconBgColor && block.iconBgColor !== 'transparent' ? block.iconColor : '#fff') : block.iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(size * 0.3), fontWeight: 700, textDecoration: 'none',
          }}>{l.label}</a>
        ))}
      </div>
    )
  }

  return null
}

// ─── Main Public Page ───
export default function BioLinkPublic() {
  const { slug } = useParams()
  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeBlock, setActiveBlock] = useState(null)  // block for form modal
  const [showThanks, setShowThanks] = useState(false)

  useEffect(() => {
    getPublicPage(slug)
      .then(row => {
        if (!row) { setNotFound(true); setLoading(false); return }
        setPageData(row)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [slug])

  if (loading) {
    return <div className="bpl-loading"><div className="bpl-spinner" /></div>
  }

  if (notFound) {
    return (
      <div className="bpl-not-found">
        <h2>Page not found</h2>
        <p>This link doesn't exist or has been unpublished.</p>
      </div>
    )
  }

  const page = pageData.page_json
  const pageId = pageData.id

  const handleFormClick = (block) => {
    setActiveBlock(block)
    setShowThanks(false)
  }

  const handleFormSuccess = () => {
    setShowThanks(true)
  }

  const handleDismiss = () => {
    setActiveBlock(null)
    setShowThanks(false)
  }

  return (
    <div className="bpl-wrap" style={{ background: page.bgColor }}>
      <div className="bpl-page" style={{
        fontFamily: page.fontFamily,
        '--bio-heading-font': page.headingFont || page.fontFamily,
        maxWidth: page.maxWidth || 480,
        borderRadius: page.pageRadius ?? 20,
        padding: `${page.pagePadding ?? 24}px`,
        gap: page.blockGap ?? 12,
      }}>
        {page.blocks?.map(block => (
          <PublicBlock
            key={block.id}
            block={block}
            pageFont={page.fontFamily}
            onFormClick={handleFormClick}
          />
        ))}
      </div>

      <p className="bpl-footer">Powered by Antigravity</p>

      {/* Form Modal */}
      {activeBlock && !showThanks && (
        <LeadFormModal
          block={activeBlock}
          pageId={pageId}
          onClose={handleDismiss}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Thank You + Download */}
      {activeBlock && showThanks && (
        <ThankYou
          block={activeBlock}
          fileUrl={activeBlock.fileUrl || null}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  )
}

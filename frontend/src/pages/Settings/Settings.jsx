import { useState, useEffect } from 'react'
import { SectionHeader, Button, Input, Textarea } from '../../components/ui/index.jsx'
import { useBrand } from '../../lib/BrandContext'
import * as DB from '../../lib/supabase'
import TemplatesTab from './TemplatesTab'
import './Settings.css'

// ─── Constants ──────────────────────────────────────────────────────────────
const ASSET_SLOTS = [
  { key: 'logo_dark',          label: 'Logo (Dark)',         folder: 'logos',     category: 'Logos' },
  { key: 'logo_light',         label: 'Logo (Light)',        folder: 'logos',     category: 'Logos' },
  { key: 'brokerage_logo',     label: 'Brokerage Logo',      folder: 'logos',     category: 'Logos' },
  { key: 'certification_logo', label: 'Certification / Badge', folder: 'logos',   category: 'Logos' },
  { key: 'headshot_primary',   label: 'Headshot (Primary)',   folder: 'headshots', category: 'Headshots' },
  { key: 'headshot_secondary', label: 'Headshot (Alternate)', folder: 'headshots', category: 'Headshots' },
  { key: 'headshot_casual',    label: 'Headshot (Casual)',    folder: 'headshots', category: 'Headshots' },
  { key: 'facebook_banner',    label: 'Facebook Banner',     folder: 'marketing', category: 'Marketing' },
  { key: 'ig_highlight',       label: 'IG Highlight Cover',  folder: 'marketing', category: 'Marketing' },
  { key: 'email_banner',       label: 'Email Header Banner', folder: 'marketing', category: 'Marketing' },
  { key: 'oh_sign',            label: 'Open House Sign',     folder: 'marketing', category: 'Marketing' },
]

const SOCIAL_CHANNELS = [
  { key: 'instagram',    label: 'Instagram',      icon: '📷', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook',     label: 'Facebook',       icon: '👥', placeholder: 'https://facebook.com/yourpage' },
  { key: 'tiktok',       label: 'TikTok',         icon: '🎵', placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'youtube',      label: 'YouTube',        icon: '▶️',  placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'linkedin',     label: 'LinkedIn',       icon: '💼', placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'twitter',      label: 'Twitter / X',    icon: '🐦', placeholder: 'https://x.com/yourhandle' },
  { key: 'gmb',          label: 'Google Business', icon: '📍', placeholder: 'https://g.page/yourbusiness' },
  { key: 'zillow',       label: 'Zillow',         icon: '🏠', placeholder: 'https://zillow.com/profile/...' },
  { key: 'realtor_com',  label: 'Realtor.com',    icon: '🔑', placeholder: 'https://realtor.com/...' },
  { key: 'blog',         label: 'Blog',           icon: '✍️',  placeholder: 'https://yourblog.com' },
  { key: 'website',      label: 'Website',        icon: '🌐', placeholder: 'https://yoursite.com' },
  { key: 'linktree',     label: 'Linktree / Bio', icon: '🔗', placeholder: 'https://linktr.ee/yourlink' },
]

const TABS = ['signature', 'templates', 'guidelines', 'assets', 'social']

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function Settings() {
  const { brand, refetch } = useBrand()
  const [tab, setTab] = useState('signature')

  return (
    <div className="settings">
      <SectionHeader
        title="Settings"
        subtitle="Your brand identity, signature, assets, and connected accounts"
      />

      <div className="settings-tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`settings-tab${tab === t ? ' settings-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'signature' ? 'Signature' : t === 'templates' ? 'Templates & Scripts' : t === 'guidelines' ? 'Brand Guidelines' : t === 'assets' ? 'Logos & Headshots' : 'Social Channels'}
          </button>
        ))}
      </div>

      {tab === 'signature'  && <SignatureTab  brand={brand} refetch={refetch} />}
      {tab === 'templates'  && <TemplatesTab />}
      {tab === 'guidelines' && <GuidelinesTab brand={brand} refetch={refetch} />}
      {tab === 'assets'     && <AssetsTab     brand={brand} refetch={refetch} />}
      {tab === 'social'     && <SocialTab     brand={brand} refetch={refetch} />}
    </div>
  )
}

// ─── Signature Tab ──────────────────────────────────────────────────────────
function SignatureTab({ brand, refetch }) {
  const sig = brand?.signature ?? {}
  const [draft, setDraft] = useState({
    full_name:        sig.full_name ?? '',
    title:            sig.title ?? '',
    phone:            sig.phone ?? '',
    email:            sig.email ?? '',
    brokerage:        sig.brokerage ?? '',
    license_number:   sig.license_number ?? '',
    tagline:          sig.tagline ?? '',
    home_address:     sig.home_address ?? '',
    show_socials:     sig.show_socials ?? true,
  })
  const [saving, setSaving] = useState(false)

  const channels = brand?.social_channels ?? {}
  const connectedChannels = SOCIAL_CHANNELS.filter(c => channels[c.key]?.trim())

  useEffect(() => {
    if (!brand?.signature) return
    const s = brand.signature
    setDraft({
      full_name: s.full_name ?? '', title: s.title ?? '', phone: s.phone ?? '',
      email: s.email ?? '', brokerage: s.brokerage ?? '',
      license_number: s.license_number ?? '', tagline: s.tagline ?? '',
      home_address: s.home_address ?? '',
      show_socials: s.show_socials ?? true,
    })
  }, [brand?.signature])

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await DB.updateBrandProfile({ ...brand, signature: draft })
      await refetch()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <form className="settings-section" onSubmit={handleSave}>
      <div className="settings-section__header">
        <h3 className="settings-section__title">Email & Document Signature</h3>
        <p className="settings-section__desc">This info powers your signature block across emails, content, and generated materials.</p>
      </div>

      <div className="settings-form-grid">
        <div className="settings-field">
          <label className="settings-label">Full Name</label>
          <Input value={draft.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Dana Massey" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Title</label>
          <Input value={draft.title} onChange={e => set('title', e.target.value)} placeholder="Realtor | Pricing Strategy Advisor" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Phone</label>
          <Input value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="(480) 555-1234" type="tel" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Email</label>
          <Input value={draft.email} onChange={e => set('email', e.target.value)} placeholder="dana@example.com" type="email" />
        </div>
        <div className="settings-field">
          <label className="settings-label">Brokerage</label>
          <Input value={draft.brokerage} onChange={e => set('brokerage', e.target.value)} placeholder="REAL Broker" />
        </div>
        <div className="settings-field">
          <label className="settings-label">License #</label>
          <Input value={draft.license_number} onChange={e => set('license_number', e.target.value)} placeholder="SA123456789" />
        </div>
      </div>

      <div className="settings-field settings-field--full">
        <label className="settings-label">Home Address (for mileage tracking)</label>
        <Input value={draft.home_address} onChange={e => set('home_address', e.target.value)} placeholder="1234 E Main St, Gilbert, AZ 85234" />
        <p className="settings-field-hint">Used as the default start/end point when auto-calculating mileage for showings.</p>
      </div>

      <div className="settings-field settings-field--full">
        <label className="settings-label">Tagline</label>
        <Input value={draft.tagline} onChange={e => set('tagline', e.target.value)} placeholder="Helping East Valley families find home." />
      </div>

      {/* Social links toggle */}
      <div className="settings-field settings-field--full">
        <label className="sig-socials-toggle">
          <input
            type="checkbox"
            checked={draft.show_socials}
            onChange={e => set('show_socials', e.target.checked)}
          />
          <span className="settings-label">Include social links in signature</span>
        </label>
        {draft.show_socials && connectedChannels.length === 0 && (
          <p className="sig-socials-hint">No channels connected yet — add them in the Social Channels tab.</p>
        )}
      </div>

      {/* Live Preview */}
      <div className="sig-preview">
        <div className="sig-preview__label">Signature Preview</div>
        <div className="sig-preview__block">
          {draft.full_name && <div className="sig-preview__name">{draft.full_name}</div>}
          {draft.title && <div className="sig-preview__title">{draft.title}</div>}
          {(draft.phone || draft.email) && (
            <div className="sig-preview__contact">
              {draft.phone}{draft.phone && draft.email ? '  |  ' : ''}{draft.email}
            </div>
          )}
          {draft.brokerage && <div className="sig-preview__brokerage">{draft.brokerage}{draft.license_number ? ` | Lic# ${draft.license_number}` : ''}</div>}
          {draft.tagline && <div className="sig-preview__tagline">{draft.tagline}</div>}
          {draft.show_socials && connectedChannels.length > 0 && (
            <div className="sig-preview__socials">
              {connectedChannels.map(ch => (
                <a key={ch.key} href={channels[ch.key]} target="_blank" rel="noreferrer" className="sig-preview__social-link">
                  {ch.icon} {ch.label}
                </a>
              ))}
            </div>
          )}
          {!draft.full_name && <div className="sig-preview__empty">Fill out the fields above to see your signature preview</div>}
        </div>
      </div>

      <div className="settings-actions">
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Signature'}</Button>
      </div>
    </form>
  )
}

// ─── Brand Guidelines Tab ───────────────────────────────────────────────────
function GuidelinesTab({ brand, refetch }) {
  const gl = brand?.guidelines ?? {}
  const [draft, setDraft] = useState({
    primary_color:   gl.primary_color ?? '#524136',
    secondary_color: gl.secondary_color ?? '#b79782',
    accent_color:    gl.accent_color ?? '#c9b99a',
    tagline:         gl.tagline ?? '',
    tone_of_voice:   gl.tone_of_voice ?? '',
    fonts:           gl.fonts ?? '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!brand?.guidelines) return
    const g = brand.guidelines
    setDraft({
      primary_color: g.primary_color ?? '#524136', secondary_color: g.secondary_color ?? '#b79782',
      accent_color: g.accent_color ?? '#c9b99a', tagline: g.tagline ?? '',
      tone_of_voice: g.tone_of_voice ?? '', fonts: g.fonts ?? '',
    })
  }, [brand?.guidelines])

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await DB.updateBrandProfile({ ...brand, guidelines: draft })
      await refetch()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  return (
    <form className="settings-section" onSubmit={handleSave}>
      <div className="settings-section__header">
        <h3 className="settings-section__title">Brand Guidelines</h3>
        <p className="settings-section__desc">Define your brand colors, tone of voice, and visual identity. These are used across content generation and templates.</p>
      </div>

      {/* Colors */}
      <div className="settings-subsection">
        <h4 className="settings-subsection__title">Brand Colors</h4>
        <div className="brand-colors-row">
          {[
            { key: 'primary_color', label: 'Primary' },
            { key: 'secondary_color', label: 'Secondary' },
            { key: 'accent_color', label: 'Accent' },
          ].map(c => (
            <div key={c.key} className="brand-color-picker">
              <input
                type="color"
                value={draft[c.key]}
                onChange={e => set(c.key, e.target.value)}
                className="brand-color-input"
              />
              <div>
                <div className="brand-color-label">{c.label}</div>
                <div className="brand-color-hex">{draft[c.key]}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="brand-palette-preview">
          <div className="brand-palette-swatch" style={{ background: draft.primary_color }} />
          <div className="brand-palette-swatch" style={{ background: draft.secondary_color }} />
          <div className="brand-palette-swatch" style={{ background: draft.accent_color }} />
        </div>
      </div>

      {/* Tagline */}
      <div className="settings-field settings-field--full">
        <label className="settings-label">Brand Tagline</label>
        <Input value={draft.tagline} onChange={e => set('tagline', e.target.value)} placeholder="e.g. Your East Valley real estate expert" />
      </div>

      {/* Tone of Voice */}
      <div className="settings-field settings-field--full">
        <label className="settings-label">Tone of Voice</label>
        <Textarea
          value={draft.tone_of_voice}
          onChange={e => set('tone_of_voice', e.target.value)}
          placeholder="Describe your brand voice: e.g. Warm, professional, knowledgeable but approachable. Use local references to Gilbert/East Valley. Conversational, not salesy."
          rows={3}
        />
      </div>

      {/* Fonts */}
      <div className="settings-field settings-field--full">
        <label className="settings-label">Preferred Fonts</label>
        <Input value={draft.fonts} onChange={e => set('fonts', e.target.value)} placeholder="e.g. Raleway for headings, Poppins for body" />
      </div>

      <div className="settings-actions">
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Guidelines'}</Button>
      </div>
    </form>
  )
}

// ─── Assets Tab (Logos & Headshots) ─────────────────────────────────────────
function AssetsTab({ brand, refetch }) {
  const assets = brand?.assets ?? {}
  const [uploading, setUploading] = useState(null)

  const categories = [...new Set(ASSET_SLOTS.map(a => a.category))]

  async function handleUpload(slot, file) {
    if (!file) return
    setUploading(slot.key)
    try {
      // Delete old file if exists
      if (assets[slot.key]?.path) {
        try { await DB.deleteBrandAsset(assets[slot.key].path) } catch {}
      }
      const { path, publicUrl } = await DB.uploadBrandAsset(file, slot.folder)
      const updated = {
        ...brand,
        assets: {
          ...assets,
          [slot.key]: { path, url: publicUrl, name: file.name },
        },
      }
      await DB.updateBrandProfile(updated)
      await refetch()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(null)
    }
  }

  async function handleRemove(slotKey) {
    if (!confirm('Remove this asset?')) return
    try {
      if (assets[slotKey]?.path) {
        await DB.deleteBrandAsset(assets[slotKey].path)
      }
      const updated = { ...brand, assets: { ...assets } }
      delete updated.assets[slotKey]
      await DB.updateBrandProfile(updated)
      await refetch()
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h3 className="settings-section__title">Logos & Headshots</h3>
        <p className="settings-section__desc">Upload your brand assets here. They'll be available across email templates, content generation, bio link, and more.</p>
      </div>

      {categories.map(cat => (
        <div key={cat} className="settings-asset-group">
          <h4 className="settings-asset-group__title">{cat}</h4>
          <div className="settings-asset-grid">
            {ASSET_SLOTS.filter(s => s.category === cat).map(slot => {
              const asset = assets[slot.key]
              const isUploading = uploading === slot.key
              return (
                <div key={slot.key} className="asset-card">
                  <div className="asset-card__preview">
                    {asset?.url ? (
                      <img src={asset.url} alt={slot.label} />
                    ) : (
                      <div className="asset-card__placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span>Drop or click to upload</span>
                      </div>
                    )}
                    <label className="asset-card__upload-overlay">
                      <input
                        type="file"
                        accept="image/*"
                        className="asset-card__file-input"
                        onChange={e => handleUpload(slot, e.target.files?.[0])}
                        disabled={isUploading}
                      />
                      {isUploading ? 'Uploading...' : asset?.url ? 'Replace' : 'Upload'}
                    </label>
                  </div>
                  <div className="asset-card__info">
                    <span className="asset-card__name">{slot.label}</span>
                    {asset?.url && (
                      <button className="asset-card__remove" onClick={() => handleRemove(slot.key)} title="Remove">
                        &times;
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Social Channels Tab ────────────────────────────────────────────────────
function SocialTab({ brand, refetch }) {
  const channels = brand?.social_channels ?? {}
  const [draft, setDraft] = useState(() => {
    const d = {}
    for (const ch of SOCIAL_CHANNELS) d[ch.key] = channels[ch.key] ?? ''
    return d
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!brand?.social_channels) return
    const ch = brand.social_channels
    setDraft(prev => {
      const next = {}
      for (const c of SOCIAL_CHANNELS) next[c.key] = ch[c.key] ?? prev[c.key] ?? ''
      return next
    })
  }, [brand?.social_channels])

  function set(k, v) { setDraft(d => ({ ...d, [k]: v })) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await DB.updateBrandProfile({ ...brand, social_channels: draft })
      await refetch()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  const connected = SOCIAL_CHANNELS.filter(c => draft[c.key]?.trim())
  const notConnected = SOCIAL_CHANNELS.filter(c => !draft[c.key]?.trim())

  return (
    <form className="settings-section" onSubmit={handleSave}>
      <div className="settings-section__header">
        <h3 className="settings-section__title">Social Channels</h3>
        <p className="settings-section__desc">Connect your profiles so links are available across content, bio link, email signatures, and everywhere in the platform.</p>
      </div>

      {connected.length > 0 && (
        <div className="social-connected-bar">
          {connected.map(c => (
            <span key={c.key} className="social-connected-chip">{c.icon} {c.label}</span>
          ))}
        </div>
      )}

      <div className="social-channels-grid">
        {SOCIAL_CHANNELS.map(ch => (
          <div key={ch.key} className={`social-channel-row${draft[ch.key]?.trim() ? ' social-channel-row--connected' : ''}`}>
            <div className="social-channel-icon">{ch.icon}</div>
            <div className="social-channel-body">
              <label className="social-channel-label">{ch.label}</label>
              <input
                className="social-channel-input"
                value={draft[ch.key]}
                onChange={e => set(ch.key, e.target.value)}
                placeholder={ch.placeholder}
                type="url"
              />
            </div>
            {draft[ch.key]?.trim() && (
              <a
                href={draft[ch.key]}
                target="_blank"
                rel="noreferrer"
                className="social-channel-link"
                title={`Open ${ch.label}`}
              >
                ↗
              </a>
            )}
          </div>
        ))}
      </div>

      {notConnected.length > 0 && (
        <p className="social-hint">{notConnected.length} channel{notConnected.length !== 1 ? 's' : ''} not connected yet</p>
      )}

      <div className="settings-actions">
        <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Channels'}</Button>
      </div>
    </form>
  )
}

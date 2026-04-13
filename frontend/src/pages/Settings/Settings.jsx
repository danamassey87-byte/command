import { useState, useEffect } from 'react'
import { SectionHeader, Button, Input, Textarea } from '../../components/ui/index.jsx'
import { useBrand } from '../../lib/BrandContext'
import * as DB from '../../lib/supabase'
import TemplatesTab from './TemplatesTab'
import Recovery from '../Recovery/Recovery'
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

const TABS = ['signature', 'templates', 'guidelines', 'assets', 'social', 'connected', 'ai_prompts', 'lists', 'notifications', 'recovery']

// Each entry = one user-managed dropdown list shown in the Lists tab.
const DROPDOWN_LISTS_META = [
  {
    key: 'lead_sources',
    label: 'Lead Sources',
    desc: 'Where leads come from. Used in the New Lead form.',
  },
  {
    key: 'appointment_sources',
    label: 'Listing Appointment Sources',
    desc: 'Where listing appointments originate. Used in the New Listing Appointment form.',
  },
  {
    key: 'appointment_locations',
    label: 'Appointment Locations',
    desc: 'Where appointments take place (on-site, video, office, etc.).',
  },
]

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
            {{ signature: 'Signature', templates: 'Templates & Scripts', guidelines: 'Brand Guidelines', assets: 'Logos & Headshots', social: 'Social Channels', connected: 'Connected Accounts', ai_prompts: 'AI Prompts', lists: 'Lists & Tags', notifications: 'Notifications', recovery: 'Trash & Archive' }[t] || t}
          </button>
        ))}
      </div>

      {tab === 'signature'  && <SignatureTab  brand={brand} refetch={refetch} />}
      {tab === 'templates'  && <TemplatesTab />}
      {tab === 'guidelines' && <GuidelinesTab brand={brand} refetch={refetch} />}
      {tab === 'assets'     && <AssetsTab     brand={brand} refetch={refetch} />}
      {tab === 'social'     && <SocialTab     brand={brand} refetch={refetch} />}
      {tab === 'connected'  && <ConnectedAccountsTab />}
      {tab === 'ai_prompts' && <AiPromptsTab />}
      {tab === 'lists'      && <ListsTab />}
      {tab === 'notifications' && <NotificationsTab />}
      {tab === 'recovery'   && <Recovery />}
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

// ─── Lists & Tags Tab ───────────────────────────────────────────────────────
function ListsTab() {
  const [lists, setLists] = useState({})
  const [loading, setLoading] = useState(true)
  const [tags, setTags] = useState([])
  const [tagsLoading, setTagsLoading] = useState(true)
  const [newItemDraft, setNewItemDraft] = useState({}) // { listKey: 'value' }
  const [newTag, setNewTag] = useState({ name: '', color: '#b79782', category: 'custom' })

  async function loadLists() {
    setLoading(true)
    try {
      const data = await DB.getDropdownLists()
      setLists(data || {})
    } catch (err) {
      alert('Failed to load lists: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadTags() {
    setTagsLoading(true)
    try {
      setTags(await DB.getTags())
    } catch (err) {
      console.error(err)
    } finally {
      setTagsLoading(false)
    }
  }

  useEffect(() => { loadLists(); loadTags() }, [])

  async function saveLists(next) {
    setLists(next)
    try { await DB.updateDropdownLists(next) }
    catch (err) { alert('Save failed: ' + err.message); loadLists() }
  }

  async function addItem(listKey) {
    const v = (newItemDraft[listKey] || '').trim()
    if (!v) return
    const current = Array.isArray(lists[listKey]) ? lists[listKey] : []
    if (current.some(x => x.toLowerCase() === v.toLowerCase())) {
      setNewItemDraft(d => ({ ...d, [listKey]: '' }))
      return
    }
    const next = { ...lists, [listKey]: [...current, v] }
    setNewItemDraft(d => ({ ...d, [listKey]: '' }))
    await saveLists(next)
  }

  async function removeItem(listKey, item) {
    if (!confirm(`Remove "${item}" from this list?`)) return
    const current = Array.isArray(lists[listKey]) ? lists[listKey] : []
    const next = { ...lists, [listKey]: current.filter(x => x !== item) }
    await saveLists(next)
  }

  async function renameItem(listKey, oldVal) {
    const next = prompt(`Rename "${oldVal}" to:`, oldVal)
    if (next == null) return
    const trimmed = next.trim()
    if (!trimmed || trimmed === oldVal) return
    const current = Array.isArray(lists[listKey]) ? lists[listKey] : []
    const updated = { ...lists, [listKey]: current.map(x => (x === oldVal ? trimmed : x)) }
    await saveLists(updated)
  }

  // ─── Tags ───
  async function handleCreateTag(e) {
    e.preventDefault()
    if (!newTag.name.trim()) return
    try {
      await DB.createTag({
        name: newTag.name.trim(),
        color: newTag.color,
        category: newTag.category,
      })
      setNewTag({ name: '', color: '#b79782', category: 'custom' })
      loadTags()
    } catch (err) {
      alert('Could not create tag: ' + err.message)
    }
  }

  async function handleRenameTag(tag) {
    const next = prompt(`Rename "${tag.name}" to:`, tag.name)
    if (next == null) return
    const trimmed = next.trim()
    if (!trimmed || trimmed === tag.name) return
    try { await DB.updateTag(tag.id, { name: trimmed }); loadTags() }
    catch (err) { alert('Rename failed: ' + err.message) }
  }

  async function handleRecolorTag(tag, color) {
    try { await DB.updateTag(tag.id, { color }); loadTags() }
    catch (err) { alert('Update failed: ' + err.message) }
  }

  async function handleDeleteTag(tag) {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from any contacts that have it.`)) return
    try { await DB.deleteTag(tag.id); loadTags() }
    catch (err) { alert('Delete failed: ' + err.message) }
  }

  // Group tags by category
  const tagsByCategory = tags.reduce((acc, t) => {
    const cat = t.category || 'custom'
    ;(acc[cat] ||= []).push(t)
    return acc
  }, {})

  return (
    <div className="settings-section">
      <div className="settings-section__header">
        <h3 className="settings-section__title">Lists & Tags</h3>
        <p className="settings-section__desc">
          Manage the dropdown options used across the app — sources, locations, tags, and more.
          Anything you add here shows up everywhere it's used.
        </p>
      </div>

      {loading ? (
        <p className="settings-field-hint">Loading lists…</p>
      ) : (
        DROPDOWN_LISTS_META.map(meta => {
          const items = Array.isArray(lists[meta.key]) ? lists[meta.key] : []
          return (
            <div key={meta.key} className="settings-subsection">
              <h4 className="settings-subsection__title">{meta.label}</h4>
              <p className="settings-field-hint" style={{ marginBottom: 8 }}>{meta.desc}</p>

              <div className="lists-chip-grid">
                {items.length === 0 && (
                  <div className="lists-empty">No options yet — add one below.</div>
                )}
                {items.map(item => (
                  <div key={item} className="lists-chip">
                    <span className="lists-chip__label" onClick={() => renameItem(meta.key, item)} title="Click to rename">
                      {item}
                    </span>
                    <button
                      type="button"
                      className="lists-chip__remove"
                      onClick={() => removeItem(meta.key, item)}
                      aria-label={`Remove ${item}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="lists-add-row">
                <Input
                  value={newItemDraft[meta.key] || ''}
                  onChange={e => setNewItemDraft(d => ({ ...d, [meta.key]: e.target.value }))}
                  placeholder={`Add a new ${meta.label.toLowerCase().replace(/s$/, '')}…`}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(meta.key) } }}
                />
                <Button type="button" onClick={() => addItem(meta.key)} disabled={!(newItemDraft[meta.key] || '').trim()}>
                  Add
                </Button>
              </div>
            </div>
          )
        })
      )}

      {/* ─── Tags ─── */}
      <div className="settings-subsection">
        <h4 className="settings-subsection__title">Tags</h4>
        <p className="settings-field-hint" style={{ marginBottom: 8 }}>
          Tags can be assigned to contacts, prospects, and notes. Click a tag name to rename it.
        </p>

        {tagsLoading ? (
          <p className="settings-field-hint">Loading tags…</p>
        ) : (
          Object.keys(tagsByCategory).sort().map(cat => (
            <div key={cat} className="lists-tag-group">
              <div className="lists-tag-group__title">{cat}</div>
              <div className="lists-chip-grid">
                {tagsByCategory[cat].map(tag => (
                  <div key={tag.id} className="lists-chip lists-chip--tag" style={{ '--tag-color': tag.color }}>
                    <input
                      type="color"
                      className="lists-chip__color"
                      value={tag.color}
                      onChange={e => handleRecolorTag(tag, e.target.value)}
                      title="Change color"
                    />
                    <span className="lists-chip__label" onClick={() => handleRenameTag(tag)} title="Click to rename">
                      {tag.name}
                    </span>
                    <button
                      type="button"
                      className="lists-chip__remove"
                      onClick={() => handleDeleteTag(tag)}
                      aria-label={`Delete ${tag.name}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        <form className="lists-add-row lists-add-row--tag" onSubmit={handleCreateTag}>
          <Input
            value={newTag.name}
            onChange={e => setNewTag(t => ({ ...t, name: e.target.value }))}
            placeholder="New tag name…"
          />
          <input
            type="color"
            className="lists-tag-color-input"
            value={newTag.color}
            onChange={e => setNewTag(t => ({ ...t, color: e.target.value }))}
            title="Tag color"
          />
          <select
            className="field__input field__select lists-tag-cat"
            value={newTag.category}
            onChange={e => setNewTag(t => ({ ...t, category: e.target.value }))}
          >
            <option value="status">status</option>
            <option value="pipeline">pipeline</option>
            <option value="relationship">relationship</option>
            <option value="email">email</option>
            <option value="interest">interest</option>
            <option value="priority">priority</option>
            <option value="custom">custom</option>
          </select>
          <Button type="submit" disabled={!newTag.name.trim()}>Add Tag</Button>
        </form>
      </div>
    </div>
  )
}

// ─── Notifications Tab ─────────────────────────────────────────────────────
const DEFAULT_NOTIF_PREFS = {
  oh_followup_sent:  true,
  oh_briefing_sent:  true,
  oh_reminder_sent:  true,
  oh_report_overdue: true,
}

const NOTIF_PREF_LABELS = {
  oh_followup_sent:  { label: 'Post-OH follow-up sent',         description: 'When a follow-up email is sent to the hosting agent 30 min after the open house ends' },
  oh_briefing_sent:  { label: 'Day-before briefing sent',       description: 'When a briefing email is sent to the hosting agent the morning before an open house' },
  oh_reminder_sent:  { label: 'Host report reminder sent',      description: 'When a reminder is sent the next day if the host report hasn\'t been submitted' },
  oh_report_overdue: { label: 'Host report overdue escalation', description: 'When a host report is still missing 24 hours after the reminder' },
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState(DEFAULT_NOTIF_PREFS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    DB.getNotificationPreferences().then(row => {
      if (row?.value) setPrefs(p => ({ ...DEFAULT_NOTIF_PREFS, ...row.value }))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggle = async (key) => {
    const updated = { ...prefs, [key]: !prefs[key] }
    setPrefs(updated)
    setSaving(true)
    try {
      await DB.updateNotificationPreferences(updated)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  if (loading) return <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: 16 }}>Loading preferences…</p>

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Open House Notifications</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
        Control which in-app notifications you receive when the system sends automated open house emails.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(NOTIF_PREF_LABELS).map(([key, { label, description }]) => (
          <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={prefs[key] ?? true}
              onChange={() => toggle(key)}
              style={{ marginTop: 3, accentColor: 'var(--brown-mid)' }}
            />
            <div>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)', margin: 0 }}>{label}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{description}</p>
            </div>
          </label>
        ))}
      </div>
      {saving && <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 8 }}>Saving…</p>}
    </div>
  )
}

// ─── Connected Accounts Tab ─────────────────────────────────────────────────
function ConnectedAccountsTab() {
  const [blotatoKey, setBlotatoKey] = useState('')
  const [blotatoConfig, setBlotatoConfig] = useState(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editingKey, setEditingKey] = useState(false)
  const [hasSavedKey, setHasSavedKey] = useState(false)

  useEffect(() => {
    DB.getBlotatoConfig().then(({ data }) => {
      if (data?.value) {
        setBlotatoConfig(data.value)
        if (data.value.api_key) {
          setBlotatoKey(data.value.api_key)
          setHasSavedKey(true)
        }
      }
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const value = { ...blotatoConfig, api_key: blotatoKey }
      await DB.updateBlotatoConfig(value)
      setBlotatoConfig(value)
      setTestResult({ ok: true, message: 'Saved!' })
    } catch (err) {
      setTestResult({ ok: false, message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleTestConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      if (!blotatoKey.trim()) {
        setTestResult({ ok: false, message: 'Enter an API key first' })
        return
      }
      // Test by listing accounts
      const resp = await fetch('https://api.blotato.com/v2/accounts', {
        headers: { 'Authorization': `Bearer ${blotatoKey}` },
      })
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '')
        setTestResult({ ok: false, message: `API returned ${resp.status}: ${errText.slice(0, 200)}` })
        return
      }
      const data = await resp.json()
      const accounts = data.accounts || data.data || []
      const connectedPlatforms = accounts.map(a => ({
        platform: a.platform || a.type || 'unknown',
        account_id: a.id || a.account_id,
        account_name: a.name || a.username || a.handle || '',
      }))
      const updated = { api_key: blotatoKey, connected_platforms: connectedPlatforms }
      await DB.updateBlotatoConfig(updated)
      setBlotatoConfig(updated)
      setTestResult({ ok: true, message: `Connected! Found ${connectedPlatforms.length} account(s).`, accounts: connectedPlatforms })
    } catch (err) {
      setTestResult({ ok: false, message: err.message })
    } finally {
      setTesting(false)
    }
  }

  const connectedPlatforms = blotatoConfig?.connected_platforms || []

  return (
    <div className="settings-section">
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--brown-dark)', margin: '0 0 4px' }}>Connected Accounts</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
        Connect external services for publishing and automation.
      </p>

      {/* Blotato */}
      <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: '1.3rem' }}>🍌</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.95rem' }}>Blotato</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>AI content engine &amp; multi-platform publisher</div>
          </div>
          {connectedPlatforms.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, color: '#137333', background: '#e6f4ea', padding: '3px 10px', borderRadius: 6 }}>
              Connected
            </span>
          )}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>API Key</label>
          {hasSavedKey && !editingKey ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ flex: 1, padding: '7px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.85rem', color: 'var(--color-text-muted)', background: '#faf8f5', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                {'•'.repeat(Math.max(0, blotatoKey.length - 4))}{blotatoKey.slice(-4)}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditingKey(true)}>Change</Button>
              <Button size="sm" variant="ghost" onClick={handleTestConnection} disabled={testing}>
                {testing ? 'Testing...' : 'Test'}
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <Input
                type="password"
                value={editingKey ? '' : blotatoKey}
                onChange={e => setBlotatoKey(e.target.value)}
                placeholder="Paste your Blotato API key..."
                style={{ flex: 1 }}
                autoFocus={editingKey}
              />
              {editingKey && (
                <Button size="sm" variant="ghost" onClick={() => { setEditingKey(false); setBlotatoKey(blotatoConfig?.api_key || '') }}>Cancel</Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleTestConnection} disabled={testing || !blotatoKey.trim()}>
                {testing ? 'Testing...' : 'Test'}
              </Button>
              <Button size="sm" onClick={() => { handleSave(); setEditingKey(false); setHasSavedKey(true) }} disabled={saving || !blotatoKey.trim()}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>

        {testResult && (
          <div style={{
            padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginTop: 8,
            background: testResult.ok ? '#e6f4ea' : '#fce8e6',
            color: testResult.ok ? '#137333' : '#c5221f',
          }}>
            {testResult.message}
          </div>
        )}

        {connectedPlatforms.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Connected Platforms</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {connectedPlatforms.map((cp, i) => (
                <span key={i} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #e0dbd6', fontSize: '0.78rem', color: 'var(--brown-dark)', background: '#faf8f5' }}>
                  {cp.platform} {cp.account_name ? `(${cp.account_name})` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Gamma */}
      <GammaConfigCard />

      {/* Canva */}
      <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 12, padding: '18px 20px', marginBottom: 16, opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>🎨</span>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.95rem' }}>Canva Connect</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Design generation &amp; brand kit integration</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 500, color: 'var(--color-text-muted)', background: '#f5f0eb', padding: '3px 10px', borderRadius: 6 }}>
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Gamma Config Card (inside Connected Accounts) ──────────────────────────
function GammaConfigCard() {
  const [gammaKey, setGammaKey] = useState('')
  const [hasSavedKey, setHasSavedKey] = useState(false)
  const [editingKey, setEditingKey] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    DB.getGammaConfig().then(({ data }) => {
      if (data?.value?.api_key) {
        setGammaKey(data.value.api_key)
        setHasSavedKey(true)
      }
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await DB.updateGammaConfig({ api_key: gammaKey })
      setTestResult({ ok: true, message: 'Saved!' })
      setHasSavedKey(true)
      setEditingKey(false)
    } catch (err) {
      setTestResult({ ok: false, message: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      if (!gammaKey.trim()) {
        setTestResult({ ok: false, message: 'Enter an API key first' })
        return
      }
      const resp = await fetch('https://public-api.gamma.app/v1.0/themes', {
        headers: { 'X-API-KEY': gammaKey },
      })
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '')
        setTestResult({ ok: false, message: `API returned ${resp.status}: ${errText.slice(0, 200)}` })
        return
      }
      setTestResult({ ok: true, message: 'Connected! Gamma API is working.' })
    } catch (err) {
      setTestResult({ ok: false, message: err.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: '1.3rem' }}>🎯</span>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--brown-dark)', fontSize: '0.95rem' }}>Gamma Pro</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>AI listing presentations &amp; property websites</div>
        </div>
        {hasSavedKey && !editingKey && (
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 600, color: '#137333', background: '#e6f4ea', padding: '3px 10px', borderRadius: 6 }}>
            Connected
          </span>
        )}
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>API Key</label>
        {hasSavedKey && !editingKey ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ flex: 1, padding: '7px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.85rem', color: 'var(--color-text-muted)', background: '#faf8f5', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {'•'.repeat(Math.max(0, gammaKey.length - 4))}{gammaKey.slice(-4)}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditingKey(true)}>Change</Button>
            <Button size="sm" variant="ghost" onClick={handleTest} disabled={testing}>
              {testing ? 'Testing...' : 'Test'}
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              type="password"
              value={editingKey ? '' : gammaKey}
              onChange={e => setGammaKey(e.target.value)}
              placeholder="Paste your Gamma API key..."
              style={{ flex: 1 }}
              autoFocus={editingKey}
            />
            {editingKey && (
              <Button size="sm" variant="ghost" onClick={() => { setEditingKey(false); }}>Cancel</Button>
            )}
            <Button size="sm" variant="ghost" onClick={handleTest} disabled={testing || !gammaKey.trim()}>
              {testing ? 'Testing...' : 'Test'}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !gammaKey.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      {testResult && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', marginTop: 8,
          background: testResult.ok ? '#e6f4ea' : '#fce8e6',
          color: testResult.ok ? '#137333' : '#c5221f',
        }}>
          {testResult.message}
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        Get your API key from <strong>gamma.app</strong> → Account Settings → API Keys (Pro plan required)
      </div>
    </div>
  )
}

// ─── AI Prompts Tab ─────────────────────────────────────────────────────────
function AiPromptsTab() {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    DB.getAiPrompts().then(({ data }) => {
      setPrompts(data || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function startEdit(prompt) {
    setEditingId(prompt.id)
    setEditText(prompt.prompt_text)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditText('')
  }

  async function handleSave(prompt) {
    setSaving(true)
    try {
      const { data } = await DB.updateAiPrompt(prompt.id, { prompt_text: editText })
      setPrompts(prev => prev.map(p => p.id === prompt.id ? { ...p, ...data, prompt_text: editText, is_default: false } : p))
      setEditingId(null)
    } catch (err) {
      alert('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="settings-section"><p style={{ color: 'var(--color-text-muted)' }}>Loading prompts...</p></div>

  return (
    <div className="settings-section">
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--brown-dark)', margin: '0 0 4px' }}>AI Prompts</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 20px' }}>
        Customize the prompts Claude uses when generating content, hashtags, keywords, and more. Edit any prompt to change the tone, instructions, or format.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {prompts.map(prompt => (
          <div key={prompt.id} style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <code style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brown-dark)', background: '#f5f0eb', padding: '2px 8px', borderRadius: 4 }}>
                {prompt.prompt_key}
              </code>
              {prompt.is_default && (
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#137333', background: '#e6f4ea', padding: '2px 6px', borderRadius: 4 }}>Default</span>
              )}
              {!prompt.is_default && (
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#e65100', background: '#fff3e0', padding: '2px 6px', borderRadius: 4 }}>Customized</span>
              )}
            </div>
            {prompt.description && (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>{prompt.description}</p>
            )}

            {editingId === prompt.id ? (
              <div>
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  rows={8}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid #e0dbd6', borderRadius: 8,
                    fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.5, color: 'var(--brown-dark)',
                    resize: 'vertical', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button size="sm" onClick={() => handleSave(prompt)} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                <pre style={{
                  fontSize: '0.78rem', lineHeight: 1.5, color: '#555', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  background: '#faf8f5', padding: '10px 12px', borderRadius: 8, margin: 0,
                  maxHeight: 150, overflow: 'hidden',
                }}>
                  {prompt.prompt_text}
                </pre>
                <button
                  onClick={() => startEdit(prompt)}
                  style={{
                    marginTop: 8, fontSize: '0.75rem', padding: '4px 12px', borderRadius: 5,
                    border: '1px solid #e0dbd6', background: '#faf8f5', color: 'var(--brown-dark)',
                    cursor: 'pointer',
                  }}
                >
                  Edit Prompt
                </button>
              </div>
            )}
          </div>
        ))}

        {prompts.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0', fontSize: '0.85rem' }}>
            No AI prompts configured yet. Run the migration to seed defaults.
          </p>
        )}
      </div>
    </div>
  )
}

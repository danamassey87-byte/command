import { useState } from 'react'
import { Button, Card } from '../ui/index.jsx'
import * as DB from '../../lib/supabase.js'

// One reusable modal — opens from listing detail OR open-house detail.
// On listing: variant defaults to 'just_listed' but Dana can switch.
// On OH: variant is locked to 'oh_promo'.
// Generates one draft per channel via generate-content edge function,
// shows them, lets Dana edit, then saves to content_pieces (banked).

const ALL_VARIANTS = [
  { key: 'just_listed', label: 'Just Listed',   icon: '🏡', desc: 'Live on the market today' },
  { key: 'coming_soon', label: 'Coming Soon',   icon: '👀', desc: 'Tease before launch' },
  { key: 'price_drop',  label: 'Price Drop',    icon: '📉', desc: 'Price improvement' },
  { key: 'just_sold',   label: 'Just Sold',     icon: '🎉', desc: 'Closing celebration' },
  { key: 'oh_promo',    label: 'Open House',    icon: '🚪', desc: 'Promote OH attendance' },
]

const DEFAULT_CHANNELS = [
  { key: 'instagram:post',          label: 'Instagram Post',  pickedDefault: true },
  { key: 'instagram:story',         label: 'Instagram Story', pickedDefault: true },
  { key: 'instagram:reel',          label: 'Instagram Reel',  pickedDefault: false },
  { key: 'facebook:post',           label: 'Facebook Post',   pickedDefault: true },
  { key: 'facebook:event',          label: 'Facebook Event',  pickedDefault: false },
  { key: 'email:announcement',      label: 'Email Blast',     pickedDefault: true },
  { key: 'gmb:post',                label: 'Google Biz Post', pickedDefault: false },
  { key: 'tiktok:post',             label: 'TikTok',          pickedDefault: false },
]

export default function ListingContentModal({
  open,
  onClose,
  context,        // 'listing' | 'oh'
  listingId,
  ohId,
  propertyId,
  addressLabel,
  defaultVariant,
}) {
  const initialVariant = defaultVariant
    || (context === 'oh' ? 'oh_promo' : 'just_listed')

  const [variant, setVariant] = useState(initialVariant)
  const [picked, setPicked] = useState(() => {
    const p = {}
    for (const c of DEFAULT_CHANNELS) p[c.key] = c.pickedDefault
    return p
  })
  const [generating, setGenerating] = useState(false)
  const [drafts, setDrafts] = useState(null)  // [{channel, format, title, body_text, hashtags}] | null
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedCount, setSavedCount] = useState(0)

  if (!open) return null

  const variantsToShow = context === 'oh' ? ALL_VARIANTS.filter(v => v.key === 'oh_promo') : ALL_VARIANTS

  const togglePicked = (key) => setPicked(p => ({ ...p, [key]: !p[key] }))

  const handleGenerate = async () => {
    setError(null)
    setDrafts(null)
    setSavedCount(0)
    const channels = Object.keys(picked).filter(k => picked[k])
    if (!channels.length) {
      setError('Pick at least one channel.')
      return
    }
    setGenerating(true)
    try {
      const result = await DB.generateListingContent({
        variant,
        listingId: listingId || null,
        ohId: ohId || null,
        channels,
      })
      setDrafts(result?.drafts || [])
    } catch (err) {
      setError(err.message || 'Generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const updateDraft = (idx, field, value) => {
    setDrafts(arr => arr.map((d, i) => i === idx ? { ...d, [field]: value } : d))
  }

  const handleSaveAll = async () => {
    if (!drafts?.length) return
    setSaving(true)
    setError(null)
    try {
      const saved = await DB.saveListingContentDrafts({
        drafts,
        listingId: listingId || null,
        openHouseId: ohId || null,
        propertyId: propertyId || null,
      })
      setSavedCount(Array.isArray(saved) ? saved.length : drafts.length)
    } catch (err) {
      setError(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 720,
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)', marginTop: 32, marginBottom: 32,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontStyle: 'italic', color: 'var(--brown-dark)', margin: 0 }}>
              ✨ Generate Content
            </h3>
            {addressLabel && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4, marginBottom: 0 }}>{addressLabel}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: 'var(--color-text-muted)', padding: 4 }}>×</button>
        </div>

        {/* Variant picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brown-dark)', display: 'block', marginBottom: 6 }}>What kind of post?</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {variantsToShow.map(v => (
              <button
                key={v.key}
                onClick={() => setVariant(v.key)}
                disabled={context === 'oh' && v.key !== 'oh_promo'}
                style={{
                  padding: '8px 12px',
                  border: variant === v.key ? '1.5px solid var(--brown-dark)' : '1px solid var(--color-border)',
                  background: variant === v.key ? 'var(--cream, #faf8f5)' : '#fff',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: variant === v.key ? 600 : 400,
                  color: 'var(--brown-dark)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Channel picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brown-dark)', display: 'block', marginBottom: 6 }}>Channels</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DEFAULT_CHANNELS.map(c => (
              <button
                key={c.key}
                onClick={() => togglePicked(c.key)}
                style={{
                  padding: '6px 10px',
                  border: picked[c.key] ? '1.5px solid var(--brown-dark)' : '1px solid var(--color-border)',
                  background: picked[c.key] ? 'var(--brown-dark)' : '#fff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                  color: picked[c.key] ? '#fff' : 'var(--brown-dark)',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : (drafts ? 'Regenerate' : 'Generate Drafts')}
          </Button>
          {drafts && drafts.length > 0 && savedCount === 0 && (
            <Button variant="ghost" onClick={handleSaveAll} disabled={saving}>
              {saving ? 'Saving…' : `Save ${drafts.length} to Content Bank`}
            </Button>
          )}
          {savedCount > 0 && (
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--sage-green, #7a9b76)', fontWeight: 600 }}>
              ✓ Saved {savedCount} draft{savedCount === 1 ? '' : 's'} to Content Bank
            </span>
          )}
        </div>

        {error && (
          <div style={{ padding: '10px 12px', background: '#fce8e6', color: '#c5221f', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Drafts */}
        {drafts && drafts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {drafts.map((d, idx) => (
              <Card key={idx} style={{ padding: 14 }}>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                  {d.channel} · {d.format}
                </div>
                <input
                  type="text"
                  value={d.title}
                  onChange={e => updateDraft(idx, 'title', e.target.value)}
                  placeholder="Title / headline"
                  style={{
                    width: '100%', border: 'none', borderBottom: '1px solid var(--color-border)',
                    padding: '4px 0', fontSize: '1rem', fontWeight: 600, color: 'var(--brown-dark)',
                    fontFamily: 'inherit', marginBottom: 8, outline: 'none', background: 'transparent',
                  }}
                />
                <textarea
                  value={d.body_text}
                  onChange={e => updateDraft(idx, 'body_text', e.target.value)}
                  rows={Math.max(4, Math.min(14, Math.ceil((d.body_text || '').length / 60)))}
                  style={{
                    width: '100%', border: '1px solid var(--color-border)', borderRadius: 6,
                    padding: 8, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5,
                  }}
                />
                {Array.isArray(d.hashtags) && d.hashtags.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {d.hashtags.join(' ')}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}

        {drafts && drafts.length === 0 && !error && (
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No drafts returned. Try again or pick different channels.</p>
        )}
      </div>
    </div>
  )
}

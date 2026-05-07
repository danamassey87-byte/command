// ─────────────────────────────────────────────────────────────────────────────
// VirtualStagingModal — upload an empty-room photo (or pick one already on
// the listing), choose a style + room type, generate a staged version via
// Replicate, see before/after, save the staged version as a new media_asset.
//
// The original photo is NEVER overwritten — staging produces a NEW row in
// media_assets with `staged_from_id` pointing back at the original.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/index.jsx'
import * as DB from '../../lib/supabase.js'

const STYLES = [
  { v: 'modern',        l: 'Modern',          desc: 'Clean lines, neutral palette, light oak' },
  { v: 'scandinavian',  l: 'Scandinavian',    desc: 'Light pine, white walls, hygge cozy' },
  { v: 'luxury',        l: 'Luxury',          desc: 'Marble, velvet, brushed gold accents' },
  { v: 'mid_century',   l: 'Mid-Century',     desc: 'Walnut, tapered legs, mustard + teal' },
  { v: 'coastal',       l: 'Coastal',         desc: 'Shiplap, weathered wood, soft blues' },
  { v: 'farmhouse',     l: 'Farmhouse',       desc: 'Reclaimed wood, black metal, linens' },
]

const ROOMS = [
  { v: 'living',  l: 'Living Room' },
  { v: 'bedroom', l: 'Bedroom' },
  { v: 'kitchen', l: 'Kitchen' },
  { v: 'dining',  l: 'Dining Room' },
  { v: 'office',  l: 'Home Office' },
  { v: 'outdoor', l: 'Outdoor / Patio' },
]

function fmtCents(cents) {
  if (cents == null) return '—'
  if (cents < 100) return `${cents}¢`
  return `$${(cents / 100).toFixed(2)}`
}

export default function VirtualStagingModal({ open, onClose, listingId, propertyId, addressLabel = '', existingPhotos = [] }) {
  const [step, setStep] = useState('source')   // source | configure | generating | result
  const [sourceMode, setSourceMode] = useState('upload') // 'upload' | 'existing'
  const [sourceFile, setSourceFile] = useState(null)
  const [sourcePreview, setSourcePreview] = useState(null) // local blob URL
  const [sourcePublicUrl, setSourcePublicUrl] = useState(null)
  const [sourceAssetId, setSourceAssetId] = useState(null) // when picking from existingPhotos
  const [style, setStyle] = useState('modern')
  const [roomType, setRoomType] = useState('living')
  const [customPrompt, setCustomPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null) // { staged_url, prompt_used, cost_cents, ... }
  const [savedAsset, setSavedAsset] = useState(null)
  const fileInputRef = useRef(null)

  // Reset when reopened.
  useEffect(() => {
    if (!open) return
    setStep('source')
    setSourceMode(existingPhotos.length > 0 ? 'existing' : 'upload')
    setSourceFile(null); setSourcePreview(null); setSourcePublicUrl(null); setSourceAssetId(null)
    setStyle('modern'); setRoomType('living'); setCustomPrompt('')
    setError(null); setResult(null); setSavedAsset(null)
  }, [open, existingPhotos.length])

  if (!open) return null

  function pickExisting(asset) {
    setSourceFile(null); setSourcePreview(null)
    setSourcePublicUrl(asset.storage_url)
    setSourceAssetId(asset.id)
    setStep('configure')
  }

  function pickFile(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Pick an image file (JPEG, PNG, or WebP).')
      return
    }
    setSourceFile(file)
    setSourcePreview(URL.createObjectURL(file))
    setSourcePublicUrl(null)
    setSourceAssetId(null)
    setError(null)
    setStep('configure')
  }

  async function handleGenerate() {
    setBusy(true); setError(null); setStep('generating')
    try {
      // Get a publicly fetchable URL for the source.
      let publicUrl = sourcePublicUrl
      if (sourceFile && !publicUrl) {
        const { publicUrl: up } = await DB.uploadStagingSourcePhoto(sourceFile, listingId)
        publicUrl = up
        setSourcePublicUrl(up)
      } else if (publicUrl && !/staging-photos\//.test(publicUrl)) {
        // Re-host external URLs (Drive etc.) so Replicate can fetch them.
        const { publicUrl: up } = await DB.copyToStagingBucket(publicUrl, listingId)
        publicUrl = up
      }
      if (!publicUrl) throw new Error('No source photo URL — pick or upload one.')

      const res = await DB.generateStaging({
        photo_url: publicUrl,
        style,
        room_type: roomType,
        custom_prompt: customPrompt || undefined,
        listing_id: listingId,
        property_id: propertyId,
        staged_from_id: sourceAssetId || null,
      })
      setResult(res)
      setStep('result')
    } catch (e) {
      setError(e.message || 'Staging failed')
      setStep('configure')
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!result?.staged_url) return
    setBusy(true); setError(null)
    try {
      const { publicUrl } = await DB.persistStagedOutput(result.staged_url, listingId, sourceAssetId)
      const saved = await DB.saveStagedMediaAsset({
        publicUrl,
        propertyId,
        listingId,
        stagedFromId: sourceAssetId,
        style,
        roomType,
        prompt: result.prompt_used,
        costCents: result.cost_cents,
        model: result.model,
      })
      setSavedAsset(saved)
    } catch (e) {
      setError(`Save failed: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sem-overlay" onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="sem-modal" style={{ maxWidth: 880, maxHeight: '90vh' }}>
        <div className="sem-modal__header">
          <div>
            <h2 className="sem-modal__title">🪑 Stage a Room</h2>
            <p className="sem-modal__to">{addressLabel || 'Listing'}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Close</Button>
        </div>

        <div className="sem-modal__body">
          {error && <div style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#8a1c0e', padding: '8px 12px', borderRadius: 8, fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>}

          {/* ─── Step 1: Source ─── */}
          {step === 'source' && (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <button onClick={() => setSourceMode('existing')} disabled={existingPhotos.length === 0} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${sourceMode === 'existing' ? 'var(--brown-dark)' : 'var(--color-border)'}`, background: sourceMode === 'existing' ? 'var(--brown-dark)' : 'transparent', color: sourceMode === 'existing' ? '#fff' : 'var(--brown-dark)', cursor: existingPhotos.length === 0 ? 'not-allowed' : 'pointer', opacity: existingPhotos.length === 0 ? 0.5 : 1, fontSize: '0.85rem' }}>
                  Pick from listing photos ({existingPhotos.length})
                </button>
                <button onClick={() => setSourceMode('upload')} style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: `1px solid ${sourceMode === 'upload' ? 'var(--brown-dark)' : 'var(--color-border)'}`, background: sourceMode === 'upload' ? 'var(--brown-dark)' : 'transparent', color: sourceMode === 'upload' ? '#fff' : 'var(--brown-dark)', cursor: 'pointer', fontSize: '0.85rem' }}>
                  Upload new photo
                </button>
              </div>

              {sourceMode === 'existing' && existingPhotos.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: '50vh', overflowY: 'auto' }}>
                  {existingPhotos.map(p => (
                    <button key={p.id} type="button" onClick={() => pickExisting(p)}
                      style={{ position: 'relative', padding: 0, border: '1px solid var(--color-border)', borderRadius: 6, overflow: 'hidden', background: '#fff', cursor: 'pointer', aspectRatio: '4/3' }}>
                      <img src={p.thumbnail_url || p.storage_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {p.staged_from_id && (
                        <span style={{ position: 'absolute', top: 4, right: 4, background: 'var(--color-success)', color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: '0.65rem', fontWeight: 600 }}>STAGED</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {sourceMode === 'upload' && (
                <div style={{ padding: 24, border: '2px dashed var(--color-border)', borderRadius: 8, textAlign: 'center', background: 'var(--cream, #faf8f5)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 6 }}>📷</div>
                  <p style={{ fontSize: '0.92rem', color: 'var(--brown-dark)', margin: '0 0 12px', fontWeight: 500 }}>
                    Upload an empty-room photo
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 16px', lineHeight: 1.5 }}>
                    Best results: well-lit, taken with a phone or camera at standing height,
                    showing the room from a corner so all walls are visible. Avoid blurry or angled shots.
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }} />
                  <Button variant="primary" size="md" onClick={() => fileInputRef.current?.click()}>Choose photo</Button>
                </div>
              )}
            </div>
          )}

          {/* ─── Step 2: Configure ─── */}
          {step === 'configure' && (
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>
              {/* Source preview */}
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>Source</div>
                <img src={sourcePreview || sourcePublicUrl} alt="" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--color-border)' }} />
                <button type="button" onClick={() => setStep('source')} style={{ marginTop: 6, padding: '4px 10px', fontSize: '0.74rem', border: 'none', background: 'transparent', color: 'var(--brown-warm)', cursor: 'pointer' }}>← change source</button>
              </div>

              {/* Configuration */}
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>Style</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {STYLES.map(s => (
                      <button key={s.v} type="button" onClick={() => setStyle(s.v)} style={{ padding: '8px 10px', borderRadius: 6, border: `1px solid ${style === s.v ? 'var(--brown-dark)' : 'var(--color-border)'}`, background: style === s.v ? 'var(--brown-dark)' : '#fff', color: style === s.v ? '#fff' : 'var(--brown-dark)', textAlign: 'left', cursor: 'pointer' }}>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{s.l}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: 1 }}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>Room Type</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ROOMS.map(r => (
                      <button key={r.v} type="button" onClick={() => setRoomType(r.v)} style={{ padding: '6px 12px', borderRadius: 999, border: `1px solid ${roomType === r.v ? 'var(--brown-dark)' : 'var(--color-border)'}`, background: roomType === r.v ? 'var(--brown-dark)' : '#fff', color: roomType === r.v ? '#fff' : 'var(--brown-dark)', fontSize: '0.78rem', cursor: 'pointer' }}>{r.l}</button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>Custom additions <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: '0.7rem' }}>(optional — appended to the prompt)</span></div>
                  <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="e.g. add a baby grand piano, dark hardwood floors, vaulted ceilings…" rows={2} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.84rem', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>Typical generation: 15–30 sec · ~3¢ per stage</span>
                  <Button variant="primary" size="md" onClick={handleGenerate} disabled={busy}>
                    {busy ? 'Working…' : '✨ Generate Staging'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 3: Generating (loading) ─── */}
          {step === 'generating' && (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div className="staging-spinner" style={{ width: 56, height: 56, border: '4px solid var(--color-border)', borderTopColor: 'var(--brown-dark)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--brown-dark)', margin: '0 0 6px' }}>Staging your room…</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>Replicate is rendering. Usually 15-30 seconds.</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* ─── Step 4: Result ─── */}
          {step === 'result' && result && (
            <div>
              {savedAsset ? (
                <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2" width="56" height="56" style={{ marginBottom: 12 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="9 12 12 15 16 10"/>
                  </svg>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--brown-dark)', margin: '8px 0' }}>Saved to listing photos</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>The staged version is now in this listing's gallery alongside the original.</p>
                  <Button variant="primary" size="md" onClick={onClose} style={{ marginTop: 16 }}>Done</Button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 6 }}>Before</div>
                      <img src={sourcePreview || sourcePublicUrl} alt="" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--color-border)' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-success)', marginBottom: 6 }}>After ({STYLES.find(s => s.v === style)?.l})</div>
                      <img src={result.staged_url} alt="" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--color-success)' }} />
                    </div>
                  </div>
                  <div style={{ background: 'var(--cream, #faf8f5)', padding: '8px 12px', borderRadius: 6, fontSize: '0.74rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    <strong>Cost:</strong> {fmtCents(result.cost_cents)} ({result.predict_time_sec?.toFixed(1)}s render) · <strong>Model:</strong> {result.model}
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <Button variant="ghost" size="sm" onClick={() => setStep('configure')}>← Try different style</Button>
                    <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={busy}>↻ Regenerate</Button>
                    <Button variant="primary" size="md" onClick={handleSave} disabled={busy}>
                      {busy ? 'Saving…' : 'Save to listing photos'}
                    </Button>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
                    Saving applies a "Virtually Staged" watermark automatically (ARMLS-compliant for syndicated listings). Original photo stays untouched.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CinematicAIModal — Higgsfield-powered cinematic image + video generation.
//
// Two modes via the `mode` prop (or `defaultKind`):
//   • 'image'  → text-to-image (Flux Pro Kontext) for premium fresh visuals
//   • 'video'  → image-to-video (DoP) — pass `sourceImageUrl` to animate
//                an existing photo with a cinematic camera move
//
// Usage:
//   <CinematicAIModal open={open} onClose={...} onGenerated={(out) => ...} />
//   <CinematicAIModal open={open} onClose={...} defaultKind="video"
//     sourceImageUrl={photoUrl} listingId={listingId} propertyId={propertyId}
//     onGenerated={...} />
//
// onGenerated payload:
//   { kind: 'image'|'video', url, prompt, model, cost_cents, request_id }
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { Button } from '../ui/index.jsx'
import supabase from '../../lib/supabase'
import { useBrief, withBrief } from '../../lib/creativeBrief'

const IMAGE_STYLES = [
  { v: 'photography', l: 'Photography', desc: 'Realistic, magazine-quality' },
  { v: 'lifestyle',   l: 'Lifestyle',   desc: 'Aspirational, warm light' },
  { v: 'cinematic',   l: 'Cinematic',   desc: 'Anamorphic, color graded' },
  { v: 'editorial',   l: 'Editorial',   desc: 'Bold magazine composition' },
  { v: 'minimalist',  l: 'Minimalist',  desc: 'Clean negative space' },
]

const VIDEO_MOTIONS = [
  { v: 'push_in',        l: 'Push in',         desc: 'Slow dolly forward toward subject' },
  { v: 'orbit',          l: 'Orbit',           desc: 'Smooth arc around subject' },
  { v: 'pull_out',       l: 'Pull out',        desc: 'Reveal — expand the scale' },
  { v: 'crane_up',       l: 'Crane up',        desc: 'Drone-style ascent' },
  { v: 'pan_right',      l: 'Pan right',       desc: 'Gentle horizontal sweep' },
  { v: 'static_living',  l: 'Living photo',    desc: 'Subtle ambient motion only' },
]

const ASPECTS = [
  { v: 'square',    l: 'Square (1:1)',     hint: 'Feed' },
  { v: 'portrait',  l: 'Portrait (4:5)',   hint: 'IG portrait' },
  { v: 'vertical',  l: 'Vertical (9:16)',  hint: 'Reels / Stories' },
  { v: 'landscape', l: 'Landscape (16:9)', hint: 'YouTube / hero' },
]

const IMAGE_STARTERS = [
  'Luxury East Valley home exterior at golden hour, manicured desert landscape, palm trees',
  'Editorial real estate hero shot: modern Gilbert home, sweeping driveway, sunset',
  'Cinematic interior — bright open kitchen, warm wood, late-afternoon light, magazine quality',
  'Aerial-style hero of a master-planned Queen Creek community, glowing pool, dusk',
]

const VIDEO_STARTERS = [
  'Slow cinematic push in toward the front door, magazine-quality, warm golden hour',
  'Smooth orbit highlighting the kitchen island and natural light',
  'Crane up over the pool revealing the backyard and mountain view',
  'Subtle living-photo motion — leaves moving, light shifting, no camera move',
]

export default function CinematicAIModal({
  open,
  onClose,
  onGenerated,
  defaultKind = 'image',     // 'image' | 'video'
  sourceImageUrl = null,     // video mode: photo to animate
  listingId = null,
  propertyId = null,
  lockKind = false,          // hide the toggle when caller wants only one mode
}) {
  const [kind, setKind] = useState(defaultKind)
  const [prompt, setPrompt] = useState('')
  const [imageStyle, setImageStyle] = useState('cinematic')
  const [motion, setMotion] = useState('push_in')
  const [aspect, setAspect] = useState('vertical')
  const [videoModel, setVideoModel] = useState('turbo') // 'turbo' | 'standard'
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(null) // { request_id } if it timed out
  const textareaRef = useRef(null)
  const brief = useBrief()

  if (!open) return null

  const isVideo = kind === 'video'
  const starters = isVideo ? VIDEO_STARTERS : IMAGE_STARTERS

  function pickStarter(s) {
    setPrompt(s)
    setError(null)
    textareaRef.current?.focus()
  }

  async function handleGenerate() {
    if (!prompt.trim()) { setError('Write a prompt first.'); return }
    if (isVideo && !sourceImageUrl) {
      setError('Video mode needs a source image. Pass sourceImageUrl when opening the modal.')
      return
    }
    setBusy(true); setError(null); setResult(null); setPending(null)
    try {
      const payload = {
        kind,
        prompt: withBrief(brief, prompt.trim()),
        brand_brief: brief,
        aspect,
        listing_id: listingId,
        property_id: propertyId,
        ...(isVideo
          ? { motion, input_image_url: sourceImageUrl, video_model: videoModel }
          : { style: imageStyle }),
      }
      const { data, error: fnErr } = await supabase.functions.invoke('higgsfield-generate', { body: payload })

      if (fnErr) {
        let detail = fnErr.message
        try {
          if (fnErr.context && typeof fnErr.context.json === 'function') {
            const b = await fnErr.context.json()
            detail = b?.detail || b?.error || detail
          }
        } catch { /* ignore */ }
        throw new Error(detail)
      }
      if (data?.error) throw new Error(data.detail || data.error)
      if (data?.pending) { setPending(data); return }
      setResult(data)
    } catch (err) {
      setError(err.message || 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  function handleAddToPost() {
    const url = result?.media_url || result?.image_url || result?.video_url
    if (!url) return
    onGenerated?.({
      kind: result.kind,
      url,
      prompt: result.prompt_used,
      model: result.model,
      cost_cents: result.cost_cents,
      request_id: result.request_id,
    })
    setResult(null); setPrompt(''); onClose()
  }

  const lowCredit = error && /credit|quota/i.test(error)
  const authErr = error && /auth|key/i.test(error)

  return (
    <div className="sem-overlay" onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="sem-modal" style={{ maxWidth: 780, maxHeight: '92vh' }}>
        <div className="sem-modal__header">
          <div>
            <h2 className="sem-modal__title">🎬 Cinematic AI {isVideo ? 'Video' : 'Image'}</h2>
            <p className="sem-modal__to">
              {isVideo
                ? 'Animate a photo with a cinematic camera move (Higgsfield DoP)'
                : 'Premium fresh image with editorial / cinematic feel (Higgsfield Flux Kontext)'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Close</Button>
        </div>

        <div className="sem-modal__body">
          {/* Mode toggle */}
          {!lockKind && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[{ v: 'image', l: '🖼️ Image' }, { v: 'video', l: '🎞️ Video' }].map(m => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => { setKind(m.v); setResult(null); setError(null); setPending(null) }}
                  style={{
                    padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                    border: `1px solid ${kind === m.v ? 'var(--brown-dark)' : 'var(--color-border)'}`,
                    background: kind === m.v ? 'var(--brown-dark)' : '#fff',
                    color: kind === m.v ? '#fff' : 'var(--brown-dark)',
                  }}
                >{m.l}</button>
              ))}
            </div>
          )}

          {error && (
            <div style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#8a1c0e', padding: '10px 12px', borderRadius: 8, fontSize: '0.84rem', marginBottom: 12 }}>
              {error}
              {lowCredit && (
                <div style={{ marginTop: 6, fontSize: '0.78rem' }}>
                  Top up credits at <a href="https://higgsfield.ai/pricing" target="_blank" rel="noopener noreferrer" style={{ color: '#8a1c0e', textDecoration: 'underline' }}>higgsfield.ai/pricing</a>.
                </div>
              )}
              {authErr && (
                <div style={{ marginTop: 6, fontSize: '0.78rem' }}>
                  Re-check HIGGSFIELD_KEY_ID + HIGGSFIELD_KEY_SECRET in Supabase secrets.
                </div>
              )}
            </div>
          )}

          {pending && (
            <div style={{ background: '#fff8e6', border: '1px solid #f3d77a', color: '#7a5a0e', padding: '10px 12px', borderRadius: 8, fontSize: '0.84rem', marginBottom: 12 }}>
              Still rendering. Higgsfield job <code>{pending.request_id}</code> is queued — refresh in 30–60s.
            </div>
          )}

          {isVideo && sourceImageUrl && !result && (
            <div style={{ marginBottom: 12, padding: 10, background: 'var(--cream, #faf8f5)', borderRadius: 6, display: 'flex', gap: 10, alignItems: 'center' }}>
              <img src={sourceImageUrl} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--color-border)' }} />
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                <strong style={{ color: 'var(--brown-dark)' }}>Source photo</strong>
                <div>Will animate this image with the camera move below.</div>
              </div>
            </div>
          )}

          {!result ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  {isVideo ? 'What should the camera do? (prompt)' : 'Prompt — describe the image'}
                </label>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder={isVideo
                    ? 'e.g. slow cinematic push in toward the front door, magazine-quality, golden hour'
                    : 'e.g. cinematic exterior of a modern Gilbert home, golden hour, premium magazine feel'}
                  rows={3}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.92rem', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', alignSelf: 'center', marginRight: 4 }}>Try:</span>
                  {starters.map((s, i) => (
                    <button key={i} type="button" onClick={() => pickStarter(s)} style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 999, border: '1px solid var(--color-border)', background: '#fff', color: 'var(--brown-warm)', cursor: 'pointer' }}>
                      {s.length > 50 ? s.slice(0, 47) + '…' : s}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                    {isVideo ? 'Camera move' : 'Style'}
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, marginTop: 6 }}>
                    {(isVideo ? VIDEO_MOTIONS : IMAGE_STYLES).map(o => {
                      const selected = isVideo ? motion === o.v : imageStyle === o.v
                      return (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => (isVideo ? setMotion(o.v) : setImageStyle(o.v))}
                          style={{
                            padding: '6px 10px', borderRadius: 6, textAlign: 'left', cursor: 'pointer',
                            border: `1px solid ${selected ? 'var(--brown-dark)' : 'var(--color-border)'}`,
                            background: selected ? 'var(--brown-dark)' : '#fff',
                            color: selected ? '#fff' : 'var(--brown-dark)',
                          }}
                        >
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{o.l}</div>
                          <div style={{ fontSize: '0.66rem', opacity: 0.85, marginTop: 1 }}>{o.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                    {isVideo ? 'Output aspect (DoP)' : 'Aspect'}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                    {ASPECTS.map(a => (
                      <button
                        key={a.v}
                        type="button"
                        onClick={() => setAspect(a.v)}
                        style={{
                          padding: '6px 10px', borderRadius: 6, textAlign: 'left', cursor: 'pointer', fontSize: '0.78rem',
                          border: `1px solid ${aspect === a.v ? 'var(--brown-dark)' : 'var(--color-border)'}`,
                          background: aspect === a.v ? 'var(--brown-dark)' : '#fff',
                          color: aspect === a.v ? '#fff' : 'var(--brown-dark)',
                        }}
                      >
                        <strong>{a.l}</strong> <span style={{ opacity: 0.7, fontWeight: 400 }}>· {a.hint}</span>
                      </button>
                    ))}
                  </div>

                  {isVideo && (
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '8px 10px', background: 'var(--cream, #faf8f5)', borderRadius: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={videoModel === 'standard'} onChange={e => setVideoModel(e.target.checked ? 'standard' : 'turbo')} style={{ marginTop: 2 }} />
                      <span style={{ fontSize: '0.78rem' }}>
                        <strong style={{ color: 'var(--brown-dark)' }}>DoP Standard (higher quality)</strong>
                        <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: 1 }}>
                          ~$1.00 vs ~$0.33 for Turbo. Sharper detail, smoother motion. Use for property-site heroes.
                        </span>
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  {isVideo
                    ? (videoModel === 'standard' ? '~$1.00 · 60–90s render' : '~$0.33 · 30–45s render')
                    : '~$0.10 · 5–15s render'}
                </span>
                <Button variant="primary" size="md" onClick={handleGenerate} disabled={busy || !prompt.trim()}>
                  {busy ? (isVideo ? 'Rendering…' : 'Generating…') : (isVideo ? '🎞️ Render video' : '✨ Generate')}
                </Button>
              </div>
            </>
          ) : (
            <div>
              {result.kind === 'video' ? (
                <video
                  src={result.media_url || result.video_url}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', maxHeight: '60vh', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12, background: '#000' }}
                />
              ) : (
                <img
                  src={result.media_url || result.image_url}
                  alt=""
                  style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12 }}
                />
              )}
              <div style={{ background: 'var(--cream, #faf8f5)', padding: '8px 12px', borderRadius: 6, fontSize: '0.74rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                <strong>Cost:</strong> ~${(result.cost_cents / 100).toFixed(2)} · <strong>Model:</strong> {result.model?.split('/').pop()}
                {result.duration_ms && <> · <strong>Render:</strong> {(result.duration_ms / 1000).toFixed(1)}s</>}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" onClick={() => setResult(null)}>← Try different prompt</Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={busy}>↻ Regenerate</Button>
                <a
                  href={result.media_url || result.image_url || result.video_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#fff', color: 'var(--brown-dark)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}
                >↓ Download</a>
                <Button variant="primary" size="md" onClick={handleAddToPost}>Add to post</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

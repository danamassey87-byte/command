// ─────────────────────────────────────────────────────────────────────────────
// GenerateImageModal — text-to-image generation via Replicate FLUX.
//
// Different from VirtualStagingModal: that one stages an existing room
// photo. This one generates a brand-new image from a text prompt — for
// social post backgrounds, flyer art, brand visuals, etc.
//
// Usage: rendered inline in PostComposer's media section. Click "🎨
// Generate" → write a prompt → pick style + aspect → generate → image
// auto-adds to the post's mediaFiles.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef } from 'react'
import { Button } from '../ui/index.jsx'
import supabase from '../../lib/supabase'

const STYLES = [
  { v: 'photography',  l: 'Photography',   desc: 'Realistic photo, magazine-quality' },
  { v: 'lifestyle',    l: 'Lifestyle',     desc: 'Aspirational warm-light marketing feel' },
  { v: 'illustration', l: 'Illustration',  desc: 'Modern flat illustration, vibrant' },
  { v: 'minimalist',   l: 'Minimalist',    desc: 'Clean negative space, brand-friendly' },
  { v: 'bold_graphic', l: 'Bold Graphic',  desc: 'High contrast, scroll-stopping' },
  { v: 'three_d',      l: '3D Render',     desc: 'Stylized 3D, soft global lighting' },
]

const ASPECTS = [
  { v: 'square',    l: 'Square (1:1)',     hint: 'Instagram feed' },
  { v: 'portrait',  l: 'Portrait (4:5)',   hint: 'IG feed portrait' },
  { v: 'vertical',  l: 'Vertical (9:16)',  hint: 'Stories / Reels / TikTok' },
  { v: 'landscape', l: 'Landscape (16:9)', hint: 'YouTube / blog hero' },
]

const PROMPT_STARTERS = [
  'modern luxury home exterior at golden hour, manicured Arizona desert landscape',
  'cozy living room with warm lighting, fireplace, large windows, neutral palette',
  'happy family moving into new home, packing boxes, candid joyful moment',
  'aerial view of new master-planned community in Arizona, palm trees, blue sky',
  'sold sign in front of suburban home, warm late-afternoon light',
  'first-time homebuyer holding keys, smiling, in front of new front door',
  'cozy reading nook with a book and coffee, big window with desert view',
  'real estate open house event, balloons, welcoming entrance, late afternoon',
]

export default function GenerateImageModal({ open, onClose, onGenerated }) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState('photography')
  const [aspect, setAspect] = useState('square')
  const [quality, setQuality] = useState(false) // false = fast/cheap, true = quality
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const textareaRef = useRef(null)

  if (!open) return null

  function pickStarter(s) {
    setPrompt(s)
    setError(null)
    textareaRef.current?.focus()
  }

  async function handleGenerate() {
    if (!prompt.trim()) { setError('Write a prompt first.'); return }
    setBusy(true); setError(null); setResult(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim(), style, aspect, quality },
      })
      if (fnErr) {
        let detail = fnErr.message
        try {
          if (fnErr.context && typeof fnErr.context.json === 'function') {
            const body = await fnErr.context.json()
            detail = body?.detail || body?.error || detail
          }
        } catch { /* ignore */ }
        throw new Error(detail)
      }
      if (data?.error) throw new Error(data.detail || data.error)
      setResult(data)
    } catch (err) {
      setError(err.message || 'Generation failed')
    } finally {
      setBusy(false)
    }
  }

  function handleAddToPost() {
    if (!result?.image_url) return
    onGenerated?.({
      url: result.image_url,
      prompt: result.prompt_used,
      model: result.model,
      cost_cents: result.cost_cents,
    })
    // Reset for next generation.
    setResult(null)
    setPrompt('')
    onClose()
  }

  return (
    <div className="sem-overlay" onClick={e => { if (e.target === e.currentTarget && !busy) onClose() }}>
      <div className="sem-modal" style={{ maxWidth: 760, maxHeight: '90vh' }}>
        <div className="sem-modal__header">
          <div>
            <h2 className="sem-modal__title">🎨 Generate Fresh Image</h2>
            <p className="sem-modal__to">Brand-new image from a text prompt — no source photo needed</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>Close</Button>
        </div>

        <div className="sem-modal__body">
          {error && (
            <div style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#8a1c0e', padding: '10px 12px', borderRadius: 8, fontSize: '0.84rem', marginBottom: 12 }}>
              {error}
              {/insufficient credit/i.test(error) && (
                <div style={{ marginTop: 6, fontSize: '0.78rem' }}>
                  Add a payment method at <a href="https://replicate.com/account/billing" target="_blank" rel="noopener noreferrer" style={{ color: '#8a1c0e', textDecoration: 'underline' }}>replicate.com/account/billing</a>. FLUX is pay-per-use — no monthly fee, ~⅓¢ per fast image.
                </div>
              )}
            </div>
          )}

          {!result ? (
            <>
              {/* Prompt */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Prompt — describe the image
                </label>
                <textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="e.g. modern luxury home exterior at golden hour, AZ desert landscape, professional photo"
                  rows={3}
                  style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.92rem', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', alignSelf: 'center', marginRight: 4 }}>Try:</span>
                  {PROMPT_STARTERS.slice(0, 4).map((s, i) => (
                    <button key={i} type="button" onClick={() => pickStarter(s)} style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: 999, border: '1px solid var(--color-border)', background: '#fff', color: 'var(--brown-warm)', cursor: 'pointer' }}>
                      {s.length > 50 ? s.slice(0, 47) + '…' : s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style + aspect */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Style</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 6 }}>
                    {STYLES.map(s => (
                      <button key={s.v} type="button" onClick={() => setStyle(s.v)} style={{ padding: '6px 8px', borderRadius: 6, border: `1px solid ${style === s.v ? 'var(--brown-dark)' : 'var(--color-border)'}`, background: style === s.v ? 'var(--brown-dark)' : '#fff', color: style === s.v ? '#fff' : 'var(--brown-dark)', textAlign: 'left', cursor: 'pointer' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.l}</div>
                        <div style={{ fontSize: '0.66rem', opacity: 0.85, marginTop: 1 }}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Aspect</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
                    {ASPECTS.map(a => (
                      <button key={a.v} type="button" onClick={() => setAspect(a.v)} style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${aspect === a.v ? 'var(--brown-dark)' : 'var(--color-border)'}`, background: aspect === a.v ? 'var(--brown-dark)' : '#fff', color: aspect === a.v ? '#fff' : 'var(--brown-dark)', textAlign: 'left', cursor: 'pointer', fontSize: '0.78rem' }}>
                        <strong>{a.l}</strong> <span style={{ opacity: 0.7, fontWeight: 400 }}>· {a.hint}</span>
                      </button>
                    ))}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '8px 10px', background: 'var(--cream, #faf8f5)', borderRadius: 6, cursor: 'pointer' }}>
                    <input type="checkbox" checked={quality} onChange={e => setQuality(e.target.checked)} style={{ marginTop: 2 }} />
                    <span style={{ fontSize: '0.78rem' }}>
                      <strong style={{ color: 'var(--brown-dark)' }}>Quality mode</strong>
                      <span style={{ display: 'block', color: 'var(--color-text-muted)', fontSize: '0.7rem', marginTop: 1 }}>
                        Use FLUX 1.1 Pro instead of Schnell. ~4¢/img vs ⅓¢. Sharper detail for hero / print.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                  {quality ? '~4¢ per image · 10–20s' : '~⅓¢ per image · 3–8s'}
                </span>
                <Button variant="primary" size="md" onClick={handleGenerate} disabled={busy || !prompt.trim()}>
                  {busy ? 'Generating…' : '✨ Generate'}
                </Button>
              </div>
            </>
          ) : (
            // Result view
            <div>
              <img src={result.image_url} alt="" style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', borderRadius: 8, border: '1px solid var(--color-border)', marginBottom: 12 }} />
              <div style={{ background: 'var(--cream, #faf8f5)', padding: '8px 12px', borderRadius: 6, fontSize: '0.74rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                <strong>Cost:</strong> ~{result.cost_cents}¢ · <strong>Model:</strong> {result.model.split('/').pop()}
                {result.predict_time_sec && <> · <strong>Render:</strong> {result.predict_time_sec.toFixed(1)}s</>}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" onClick={() => setResult(null)}>← Try a different prompt</Button>
                <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={busy}>↻ Regenerate</Button>
                <a href={result.image_url} download target="_blank" rel="noopener noreferrer" style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#fff', color: 'var(--brown-dark)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
                  ↓ Download
                </a>
                <Button variant="primary" size="md" onClick={handleAddToPost}>Add to post</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Button, Card } from '../ui/index.jsx'
import * as DB from '../../lib/supabase.js'

// One reusable modal — opens from listing detail OR open-house detail.
// On listing: variant defaults to 'just_listed' but Dana can switch.
// On OH: variant is locked to 'oh_promo'.
// Generates one draft per channel via generate-content edge function,
// shows them, lets Dana edit, then EITHER:
//   • Saves drafts to Content Bank (manual scheduling later in PostComposer)
//   • Auto-schedules a 7d / 24h / live cadence to Blotato (OH context only)
//   • Generates Canva flyer + IG post + IG story design candidates
//
// Auto-schedule + Canva are OH-only for now. Listing flow keeps the
// existing "save to bank" workflow until we generalize it.

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

function fmtScheduledFor(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    })
  } catch { return iso }
}

export default function ListingContentModal({
  open,
  onClose,
  context,        // 'listing' | 'oh'
  listingId,
  ohId,
  propertyId,
  ohDate,         // 'YYYY-MM-DD' — required for OH auto-schedule
  ohStartTime,    // 'HH:MM' or 'HH:MM:SS' — used for the live (30m out) window
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

  // Auto-schedule state
  const [scheduling, setScheduling] = useState(false)
  const [scheduleResults, setScheduleResults] = useState(null)

  // Canva state
  const [canvaLoading, setCanvaLoading] = useState(false)
  const [canvaResults, setCanvaResults] = useState(null)
  const [canvaError, setCanvaError] = useState(null)
  // Per-candidate export+attach state — keyed by candidate id
  const [exporting, setExporting] = useState({})       // { [candidateId]: true }
  const [exportResult, setExportResult] = useState({}) // { [candidateId]: { url, attached, total } }
  const [exportError, setExportError] = useState({})   // { [candidateId]: 'msg' }

  if (!open) return null

  const isOH = context === 'oh'
  const canAutoSchedule = isOH && !!ohId && !!ohDate
  const variantsToShow = isOH ? ALL_VARIANTS.filter(v => v.key === 'oh_promo') : ALL_VARIANTS

  const togglePicked = (key) => setPicked(p => ({ ...p, [key]: !p[key] }))

  const handleGenerate = async () => {
    setError(null)
    setDrafts(null)
    setSavedCount(0)
    setScheduleResults(null)
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
        // For OH: bank under the OH date so it appears on the right day in
        // the content planner. For listing: default to today (helper default).
        contentDate: isOH ? ohDate : null,
      })
      setSavedCount(Array.isArray(saved) ? saved.length : drafts.length)
    } catch (err) {
      setError(err.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleAutoSchedule = async () => {
    if (!canAutoSchedule || !drafts?.length) return
    setScheduling(true)
    setError(null)
    setScheduleResults(null)
    try {
      const result = await DB.autoScheduleOHPromo({
        ohId,
        listingId: listingId || null,
        propertyId: propertyId || null,
        ohDate,
        ohStartTime: ohStartTime || null,
        drafts,
      })
      setScheduleResults(result)
      if (result?.errors?.length && !result?.windows?.length) {
        setError(result.errors.join('\n'))
      }
    } catch (err) {
      setError(err.message || 'Auto-schedule failed.')
    } finally {
      setScheduling(false)
    }
  }

  const handleCanva = async () => {
    setCanvaError(null)
    setCanvaResults(null)
    setExportResult({})
    setExportError({})
    setCanvaLoading(true)
    try {
      const propLine = (addressLabel || 'Open House').split(' · ')[0]
      const prompt = `Open House promo for ${propLine}. Brand: Dana Massey, REAL Broker. Warm cream/brown palette. Include "OPEN HOUSE" headline, the address, the date and time, and a "Scan to sign in" call-to-action.`
      const result = await DB.generateCanvaDesignsForOH({ prompt })
      setCanvaResults(result?.results || [])
    } catch (err) {
      setCanvaError(err.message || 'Canva generation failed.')
    } finally {
      setCanvaLoading(false)
    }
  }

  // Export a chosen Canva candidate to a PNG on Supabase storage and attach
  // it to every pending_approval platform_post for this OH. Polls Canva
  // /exports for up to ~90s server-side; UI shows a spinner per candidate.
  const handleExportAttach = async (candidate) => {
    if (!candidate?.id || !ohId) return
    const cid = candidate.id
    setExporting(p => ({ ...p, [cid]: true }))
    setExportError(p => ({ ...p, [cid]: null }))
    try {
      const exp = await DB.exportCanvaDesign(cid)
      if (!exp?.url) throw new Error('Canva export returned no URL')
      const att = await DB.attachMediaToOHPlatformPosts(ohId, exp.url)
      setExportResult(p => ({ ...p, [cid]: { url: exp.url, attached: att.attached, total: att.total } }))
    } catch (err) {
      setExportError(p => ({ ...p, [cid]: err.message || 'Export failed' }))
    } finally {
      setExporting(p => ({ ...p, [cid]: false }))
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
                disabled={isOH && v.key !== 'oh_promo'}
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

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <Button onClick={handleGenerate} disabled={generating || scheduling}>
            {generating ? 'Generating…' : (drafts ? 'Regenerate Copy' : 'Generate Drafts')}
          </Button>

          {drafts && drafts.length > 0 && savedCount === 0 && !scheduleResults && (
            <Button variant="ghost" onClick={handleSaveAll} disabled={saving || scheduling}>
              {saving ? 'Saving…' : `Save ${drafts.length} to Bank`}
            </Button>
          )}

          {canAutoSchedule && drafts && drafts.length > 0 && !scheduleResults && (
            <Button
              onClick={handleAutoSchedule}
              disabled={scheduling || saving}
              style={{ background: 'var(--sage-green, #7a9b76)', color: '#fff' }}
              title="Queue a 7-day / 24-hour / live cadence as pending approval. Nothing publishes until you approve each post."
            >
              {scheduling ? 'Queueing…' : '⚡ Queue for Approval (7d / 24h / Live)'}
            </Button>
          )}

          {isOH && (
            <Button
              variant="ghost"
              onClick={handleCanva}
              disabled={canvaLoading}
              title="Generate flyer + IG post + IG story design candidates in Canva"
            >
              {canvaLoading ? 'Canva…' : '🎨 Generate Canva Designs'}
            </Button>
          )}

          {savedCount > 0 && (
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--sage-green, #7a9b76)', fontWeight: 600 }}>
              ✓ Saved {savedCount} draft{savedCount === 1 ? '' : 's'} to Content Bank
            </span>
          )}
        </div>

        {error && (
          <div style={{ padding: '10px 12px', background: '#fce8e6', color: '#c5221f', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
            {error}
          </div>
        )}

        {/* Auto-schedule results */}
        {scheduleResults && scheduleResults.windows && scheduleResults.windows.length > 0 && (
          <Card style={{ padding: 14, marginBottom: 12, background: 'var(--cream, #faf8f5)', border: '1px solid var(--sage-green, #7a9b76)' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 8 }}>
              ⚡ Queued — awaiting your approval
            </div>
            <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Compliance check is running. A Slack message will land in the listing channel with a link to approve each post.
              Nothing publishes to Blotato until you approve.
              {scheduleResults.approval_gate?.slack_posted === false && ' (Slack message did not send — check the OH detail page directly.)'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {scheduleResults.windows.map(w => {
                const ok = w.platform_posts.filter(p => p.status !== 'error').length
                const fail = w.platform_posts.length - ok
                return (
                  <div key={w.key} style={{ fontSize: '0.78rem', color: 'var(--brown-dark)' }}>
                    <strong>{w.label}</strong> · {fmtScheduledFor(w.scheduled_for)}
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {ok > 0 && <span>✓ {ok} scheduled</span>}
                      {fail > 0 && <span style={{ color: '#c5221f', marginLeft: 8 }}>✗ {fail} failed</span>}
                      <span style={{ marginLeft: 8 }}>· {w.platform_posts.map(p => p.platform).join(', ')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            {scheduleResults.errors && scheduleResults.errors.length > 0 && (
              <div style={{ marginTop: 8, padding: 8, background: '#fce8e6', borderRadius: 6, fontSize: '0.72rem', color: '#c5221f', whiteSpace: 'pre-wrap' }}>
                {scheduleResults.errors.join('\n')}
              </div>
            )}
          </Card>
        )}

        {/* Canva results */}
        {canvaError && (
          <div style={{ padding: '10px 12px', background: '#fce8e6', color: '#c5221f', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12 }}>
            Canva: {canvaError}
          </div>
        )}
        {canvaResults && canvaResults.length > 0 && (
          <Card style={{ padding: 14, marginBottom: 12 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 8 }}>
              🎨 Canva Design Candidates
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {canvaResults.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 4 }}>
                      {r.design_type}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(r.candidates || []).slice(0, 4).map(c => {
                        const isExporting = !!exporting[c.id]
                        const result = exportResult[c.id]
                        const err = exportError[c.id]
                        return (
                          <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <a
                              href={c.preview_url || '#'}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 8px', border: '1px solid var(--color-border)',
                                borderRadius: 6, textDecoration: 'none', fontSize: '0.72rem',
                                color: 'var(--brown-dark)',
                              }}
                            >
                              {c.thumbnail_url
                                ? <img src={c.thumbnail_url} alt="thumb" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
                                : <span>📄</span>}
                              Open in Canva ↗
                            </a>
                            {isOH && ohId && (
                              <button
                                onClick={() => handleExportAttach(c)}
                                disabled={isExporting || !!result}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 6,
                                  border: '1px solid var(--brown-dark)',
                                  background: result ? '#e8f5e9' : (isExporting ? 'var(--color-bg-subtle, #faf8f5)' : 'var(--brown-dark)'),
                                  color: result ? '#1b5e20' : (isExporting ? 'var(--color-text-muted)' : '#fff'),
                                  fontSize: '0.72rem',
                                  cursor: isExporting || result ? 'default' : 'pointer',
                                }}
                                title={result ? `Attached to ${result.attached}/${result.total} pending posts` : 'Export PNG and attach to pending posts'}
                              >
                                {isExporting ? '⏳ Exporting…' : result ? `✓ Attached (${result.attached}/${result.total})` : '📎 Export & attach'}
                              </button>
                            )}
                            {err && (
                              <span style={{ fontSize: '0.7rem', color: '#c5221f' }}>⚠ {err}</span>
                            )}
                          </div>
                        )
                      })}
                      {(!r.candidates || r.candidates.length === 0) && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>No candidates returned.</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ marginTop: 8, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              Open in Canva to fine-tune. <strong>Export &amp; attach</strong> exports the PNG, uploads it to Supabase storage, and attaches it to every pending_approval post for this OH so Blotato gets a media_id at publish time.
            </p>
          </Card>
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

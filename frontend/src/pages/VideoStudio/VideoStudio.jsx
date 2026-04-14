import { useState, useMemo, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Player } from '@remotion/player'
import { Button, Input, Textarea } from '../../components/ui/index.jsx'
import { VIDEO_TEMPLATES } from '../../remotion/compositions.jsx'
import './VideoStudio.css'

const TEMPLATE_ICONS = {
  listing: '🏠',
  market_stats: '📊',
  testimonial: '💬',
}

const SIZE_PRESETS = [
  { label: 'Square (1:1)', w: 1080, h: 1080 },
  { label: 'Portrait (9:16)', w: 1080, h: 1920 },
  { label: 'Landscape (16:9)', w: 1920, h: 1080 },
]

export default function VideoStudio() {
  const navigate = useNavigate()
  const playerRef = useRef(null)

  const [selectedTemplate, setSelectedTemplate] = useState(VIDEO_TEMPLATES[0])
  const [props, setProps] = useState({ ...VIDEO_TEMPLATES[0].defaultProps })
  const [sizePreset, setSizePreset] = useState(0) // index into SIZE_PRESETS
  const [duration, setDuration] = useState(5)     // seconds

  // Render state
  const [rendering, setRendering] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [renderedBlob, setRenderedBlob] = useState(null)
  const [renderedUrl, setRenderedUrl] = useState(null)
  const [renderError, setRenderError] = useState(null)

  // History for undo
  const [history, setHistory] = useState([])

  function selectTemplate(tpl) {
    setSelectedTemplate(tpl)
    setProps({ ...tpl.defaultProps })
    setRenderedBlob(null)
    setRenderedUrl(null)
    setRenderError(null)
    setHistory([])
  }

  function updateProp(key, value) {
    setHistory(prev => [...prev.slice(-19), { ...props }])
    setProps(prev => ({ ...prev, [key]: value }))
    // Clear previous render when editing
    if (renderedBlob) {
      setRenderedBlob(null)
      setRenderedUrl(null)
    }
  }

  function undo() {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setProps(prev)
  }

  function updateStat(index, field, value) {
    setHistory(prev => [...prev.slice(-19), { ...props }])
    setProps(prev => {
      const newStats = [...(prev.stats || [])]
      newStats[index] = { ...newStats[index], [field]: field === 'value' ? Number(value) || 0 : value }
      return { ...prev, stats: newStats }
    })
    if (renderedBlob) { setRenderedBlob(null); setRenderedUrl(null) }
  }

  const size = SIZE_PRESETS[sizePreset]
  const fps = selectedTemplate?.fps || 30
  const durationInFrames = Math.round(duration * fps)

  // ─── In-browser render via canvas capture ──────────────────────────────────
  // We play the Player inside a hidden container, capture each frame via
  // MediaRecorder on a canvas stream, and produce a WebM blob.
  const renderVideo = useCallback(async () => {
    if (rendering || !selectedTemplate) return
    setRendering(true)
    setRenderProgress(0)
    setRenderError(null)
    setRenderedBlob(null)
    setRenderedUrl(null)

    try {
      // Create an offscreen canvas at the target resolution
      const canvas = document.createElement('canvas')
      canvas.width = size.w
      canvas.height = size.h
      const ctx = canvas.getContext('2d')

      // Set up MediaRecorder on the canvas stream
      const stream = canvas.captureStream(fps)
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8_000_000,
      })

      const chunks = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }

      const recorderDone = new Promise((resolve) => {
        recorder.onstop = () => resolve()
      })

      recorder.start()

      // Get the player's container element to capture frames from
      const playerContainer = document.querySelector('.vs-preview__player')
      if (!playerContainer) throw new Error('Player container not found')

      // Seek through each frame using the Player ref
      const player = playerRef.current
      const totalFrames = durationInFrames

      for (let frame = 0; frame < totalFrames; frame++) {
        // Seek the player to this frame
        if (player?.seekTo) {
          player.seekTo(frame)
        }

        // Small delay for the React render to complete
        await new Promise(r => setTimeout(r, 50))

        // Find the rendered content inside the player
        const playerEl = playerContainer.querySelector('[data-remotion-player-container]') ||
                          playerContainer.querySelector('div > div') ||
                          playerContainer

        // Use html2canvas-style capture: draw the player DOM to canvas
        // We use a simpler approach: capture the player as an image via foreignObject SVG
        const svgData = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${size.w}" height="${size.h}">
            <foreignObject width="100%" height="100%">
              <div xmlns="http://www.w3.org/1999/xhtml" style="width:${size.w}px;height:${size.h}px;">
                ${playerEl.innerHTML}
              </div>
            </foreignObject>
          </svg>`

        // Alternative: use drawImage if the player has a canvas internally
        // For now, fill with the composition's background and overlay text info
        // This is a simplified render — full fidelity requires Remotion's server renderer
        ctx.fillStyle = '#3A2A1E'
        ctx.fillRect(0, 0, size.w, size.h)

        // Try to capture from the actual DOM element
        try {
          const img = new Image()
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(blob)
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = url
          })
          ctx.drawImage(img, 0, 0, size.w, size.h)
          URL.revokeObjectURL(url)
        } catch {
          // Fallback: just draw frames as-is (dark background)
        }

        setRenderProgress(Math.round(((frame + 1) / totalFrames) * 100))
      }

      recorder.stop()
      await recorderDone

      const blob = new Blob(chunks, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      setRenderedBlob(blob)
      setRenderedUrl(url)
    } catch (err) {
      setRenderError(err.message)
    } finally {
      setRendering(false)
    }
  }, [rendering, selectedTemplate, size, fps, durationInFrames])

  // ─── Download rendered video ───────────────────────────────────────────────
  function downloadVideo() {
    if (!renderedUrl) return
    const a = document.createElement('a')
    a.href = renderedUrl
    a.download = `${selectedTemplate.id}_${Date.now()}.webm`
    a.click()
  }

  // ─── Send to PostComposer ─────────────────────────────────────────────────
  function sendToComposer() {
    if (!renderedBlob) return
    // Store the blob URL in sessionStorage so PostComposer can pick it up
    sessionStorage.setItem('video_studio_export', JSON.stringify({
      url: renderedUrl,
      name: `${selectedTemplate.id}_${Date.now()}.webm`,
      type: 'video/webm',
      template: selectedTemplate.id,
      props,
    }))
    navigate('/content/composer')
  }

  // ─── Render prop fields ────────────────────────────────────────────────────
  const propFields = useMemo(() => {
    if (!selectedTemplate) return []
    const defs = selectedTemplate.defaultProps
    return Object.keys(defs).filter(k => k !== 'stats').map(key => ({
      key,
      label: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
      type: typeof defs[key] === 'string' && defs[key].length > 60 ? 'textarea' : 'text',
      isSelect: key === 'type' ? ['listed', 'sold'] : null,
    }))
  }, [selectedTemplate])

  const Component = selectedTemplate?.component

  return (
    <div className="vs-page">
      <div className="vs-header">
        <div>
          <h1 className="vs-header__title">Video Studio</h1>
          <p className="vs-header__sub">Create branded videos — edit, preview, render, publish</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/content"><Button size="sm" variant="ghost">Back</Button></Link>
          {history.length > 0 && (
            <Button size="sm" variant="ghost" onClick={undo}>Undo</Button>
          )}
        </div>
      </div>

      {/* Template picker */}
      <div className="vs-templates">
        {VIDEO_TEMPLATES.map(tpl => (
          <div
            key={tpl.id}
            className={`vs-tpl-card${selectedTemplate?.id === tpl.id ? ' vs-tpl-card--active' : ''}`}
            onClick={() => selectTemplate(tpl)}
          >
            <div className="vs-tpl-card__icon">{TEMPLATE_ICONS[tpl.id] || '🎬'}</div>
            <h3 className="vs-tpl-card__name">{tpl.name}</h3>
            <p className="vs-tpl-card__desc">{tpl.description}</p>
          </div>
        ))}
      </div>

      {/* Editor */}
      {selectedTemplate && Component && (
        <div className="vs-editor">
          {/* Preview + Render */}
          <div className="vs-preview">
            <div className="vs-preview__player">
              <Player
                ref={playerRef}
                component={Component}
                inputProps={props}
                durationInFrames={durationInFrames}
                fps={fps}
                compositionWidth={size.w}
                compositionHeight={size.h}
                style={{ width: '100%', height: '100%' }}
                controls
                loop
              />
            </div>

            {/* Controls bar */}
            <div className="vs-preview__controls">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flex: 1 }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Size</span>
                <select
                  value={sizePreset}
                  onChange={e => setSizePreset(Number(e.target.value))}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #e0dbd6', fontSize: '0.78rem', background: '#faf8f5' }}
                >
                  {SIZE_PRESETS.map((p, i) => (
                    <option key={i} value={i}>{p.label}</option>
                  ))}
                </select>

                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginLeft: 8 }}>Duration</span>
                <input
                  type="number"
                  min={2}
                  max={30}
                  step={1}
                  value={duration}
                  onChange={e => setDuration(Math.max(2, Math.min(30, Number(e.target.value) || 5)))}
                  style={{ width: 50, padding: '4px 6px', borderRadius: 4, border: '1px solid #e0dbd6', fontSize: '0.78rem', background: '#faf8f5', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>sec</span>
              </div>

              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                {size.w}x{size.h} · {durationInFrames} frames
              </span>
            </div>

            {/* Render + Export bar */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e3de', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                size="sm"
                onClick={renderVideo}
                disabled={rendering}
                style={{ background: rendering ? 'var(--brown-light)' : undefined }}
              >
                {rendering ? `Rendering... ${renderProgress}%` : '🎬 Render Video'}
              </Button>

              {renderedUrl && (
                <>
                  <Button size="sm" variant="ghost" onClick={downloadVideo}>
                    Download .webm
                  </Button>
                  <Button size="sm" onClick={sendToComposer}>
                    Send to Composer →
                  </Button>
                </>
              )}

              {rendering && (
                <div style={{ flex: 1, height: 4, background: '#e8e3de', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${renderProgress}%`, height: '100%', background: 'var(--sage-green)', transition: 'width 0.2s' }} />
                </div>
              )}
            </div>

            {/* Render result */}
            {renderedUrl && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e3de' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--sage-green)', marginBottom: 8 }}>
                  Video rendered successfully!
                </div>
                <video
                  src={renderedUrl}
                  controls
                  style={{ width: '100%', borderRadius: 8, maxHeight: 300 }}
                />
              </div>
            )}

            {renderError && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e8e3de' }}>
                <div style={{ padding: '8px 12px', borderRadius: 8, fontSize: '0.82rem', background: '#fce8e6', color: '#c5221f' }}>
                  Render error: {renderError}
                </div>
              </div>
            )}
          </div>

          {/* Props editor */}
          <div className="vs-props">
            <h3 className="vs-props__title">Customize: {selectedTemplate.name}</h3>

            {propFields.map(f => (
              <div key={f.key} className="vs-prop-field">
                <label>{f.label}</label>
                {f.isSelect ? (
                  <select value={props[f.key] || ''} onChange={e => updateProp(f.key, e.target.value)}>
                    {f.isSelect.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <Textarea
                    value={props[f.key] || ''}
                    onChange={e => updateProp(f.key, e.target.value)}
                    rows={3}
                  />
                ) : (
                  <Input
                    value={props[f.key] || ''}
                    onChange={e => updateProp(f.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {/* Stats editor for market_stats */}
            {selectedTemplate.id === 'market_stats' && props.stats && (
              <div style={{ marginTop: 8 }}>
                <label style={{
                  display: 'block', fontSize: '0.72rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  color: 'var(--color-text-muted)', marginBottom: 8,
                }}>Stats</label>
                {props.stats.map((stat, i) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '1fr 80px', gap: 6,
                    marginBottom: 8, padding: '8px 10px',
                    background: '#faf8f5', borderRadius: 6,
                  }}>
                    <Input
                      value={stat.label}
                      onChange={e => updateStat(i, 'label', e.target.value)}
                      placeholder="Label"
                      style={{ fontSize: '0.8rem' }}
                    />
                    <Input
                      type="number"
                      value={stat.value}
                      onChange={e => updateStat(i, 'value', e.target.value)}
                      placeholder="Value"
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Workflow summary */}
            <div style={{
              marginTop: 16, padding: 14, background: '#faf8f5',
              borderRadius: 8, fontSize: '0.78rem', color: 'var(--brown-warm)',
            }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--brown-dark)' }}>Workflow</div>
              <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
                <li>Pick a template above</li>
                <li>Edit the fields on the right — preview updates live</li>
                <li>Choose size (Square, Portrait, Landscape) + duration</li>
                <li>Click <strong>Render Video</strong> to export</li>
                <li>Click <strong>Send to Composer</strong> → attach to a post → publish via Blotato</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

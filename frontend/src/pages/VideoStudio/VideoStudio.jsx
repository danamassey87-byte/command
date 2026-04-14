import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Player } from '@remotion/player'
import { Button, Input, Textarea } from '../../components/ui/index.jsx'
import { VIDEO_TEMPLATES } from '../../remotion/compositions.jsx'
import * as DB from '../../lib/supabase.js'
import './VideoStudio.css'

const TEMPLATE_ICONS = {
  listing: '🏠',
  market_stats: '📊',
  testimonial: '💬',
}

export default function VideoStudio() {
  const [tab, setTab] = useState('create')      // create | blotato
  const [selectedTemplate, setSelectedTemplate] = useState(VIDEO_TEMPLATES[0])
  const [props, setProps] = useState({ ...VIDEO_TEMPLATES[0].defaultProps })
  const [playing, setPlaying] = useState(false)

  // Blotato video generation
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoGenerating, setVideoGenerating] = useState(false)
  const [videoResult, setVideoResult] = useState(null)

  function selectTemplate(tpl) {
    setSelectedTemplate(tpl)
    setProps({ ...tpl.defaultProps })
    setPlaying(false)
  }

  function updateProp(key, value) {
    setProps(prev => ({ ...prev, [key]: value }))
  }

  // For nested stats array in market_stats template
  function updateStat(index, field, value) {
    setProps(prev => {
      const newStats = [...(prev.stats || [])]
      newStats[index] = { ...newStats[index], [field]: field === 'value' ? Number(value) || 0 : value }
      return { ...prev, stats: newStats }
    })
  }

  // Blotato AI video generation
  async function handleBlotatoGenerate() {
    if (videoGenerating || !videoPrompt.trim()) return
    setVideoGenerating(true)
    setVideoResult(null)
    try {
      const data = await DB.generateBlotatoVideo(videoPrompt, [])
      setVideoResult(data)
    } catch (err) {
      setVideoResult({ error: err.message })
    } finally {
      setVideoGenerating(false)
    }
  }

  // Render prop fields based on template
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
          <p className="vs-header__sub">Create branded videos with Remotion templates or generate AI videos with Blotato</p>
        </div>
        <Link to="/content"><Button size="sm" variant="ghost">Back to Content</Button></Link>
      </div>

      {/* Tabs */}
      <div className="vs-tabs">
        <button className={`vs-tab${tab === 'create' ? ' vs-tab--active' : ''}`} onClick={() => setTab('create')}>
          Remotion Templates
        </button>
        <button className={`vs-tab${tab === 'blotato' ? ' vs-tab--active' : ''}`} onClick={() => setTab('blotato')}>
          Blotato AI Video
        </button>
      </div>

      {/* ─── Remotion Templates Tab ─── */}
      {tab === 'create' && (
        <>
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
              {/* Preview */}
              <div className="vs-preview">
                <div className="vs-preview__player">
                  <Player
                    component={Component}
                    inputProps={props}
                    durationInFrames={selectedTemplate.durationInFrames}
                    fps={selectedTemplate.fps}
                    compositionWidth={selectedTemplate.width}
                    compositionHeight={selectedTemplate.height}
                    style={{ width: '100%', height: '100%' }}
                    controls
                    autoPlay={playing}
                    loop
                  />
                </div>
                <div className="vs-preview__controls">
                  <Button size="sm" onClick={() => setPlaying(!playing)}>
                    {playing ? 'Pause' : 'Play Preview'}
                  </Button>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {selectedTemplate.width}x{selectedTemplate.height} · {(selectedTemplate.durationInFrames / selectedTemplate.fps).toFixed(1)}s
                  </span>
                </div>
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

                {/* Stats editor for market_stats template */}
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

                <div className="vs-export">
                  <p className="vs-export__info">
                    To render as MP4, run: <code style={{ background: '#f5f0eb', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem' }}>npx remotion render</code> from the frontend directory.
                    Server-side rendering coming soon.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Blotato AI Video Tab ─── */}
      {tab === 'blotato' && (
        <div className="vs-blotato">
          <h3 className="vs-blotato__title">Generate AI Video with Blotato</h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Describe the video you want and Blotato's AI will generate it. Great for faceless TikToks, Instagram Reels, and YouTube Shorts.
          </p>

          <div className="vs-prop-field">
            <label>Video Prompt</label>
            <Textarea
              value={videoPrompt}
              onChange={e => setVideoPrompt(e.target.value)}
              placeholder="Example: Create a 30-second video about the top 5 reasons to move to Gilbert, AZ. Use warm, inviting visuals with text overlays for each reason. End with Dana Massey contact info."
              rows={4}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button onClick={handleBlotatoGenerate} disabled={videoGenerating || !videoPrompt.trim()}>
              {videoGenerating ? 'Generating...' : '🎬 Generate Video'}
            </Button>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Generation can take 30-90 seconds
            </span>
          </div>

          {videoResult && (
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem',
              background: videoResult.error ? '#fce8e6' : '#e6f4ea',
              color: videoResult.error ? '#c5221f' : '#137333',
            }}>
              {videoResult.error ? (
                <span>{videoResult.error}</span>
              ) : videoResult.video_url ? (
                <div>
                  Video ready!{' '}
                  <a href={videoResult.video_url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>
                    Download / Preview →
                  </a>
                </div>
              ) : videoResult.status === 'generating' ? (
                <span>Video is generating in the background. Check back in a minute or visit your Blotato dashboard.</span>
              ) : (
                <span>Request sent! Check your Blotato dashboard for the result.</span>
              )}
            </div>
          )}

          <div style={{ marginTop: 20, padding: 16, background: '#faf8f5', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--brown-dark)', marginBottom: 8 }}>Prompt Ideas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                'Just Listed property tour for 1234 E Main St',
                '5 reasons to buy in Gilbert AZ',
                'Market stats update for East Valley April 2026',
                'Client testimonial animation',
                'First-time buyer tips in 30 seconds',
                'Day in the life of a real estate agent',
              ].map((idea, i) => (
                <button
                  key={i}
                  onClick={() => setVideoPrompt(idea)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: '0.75rem',
                    border: '1px solid #e0dbd6', background: '#fff',
                    color: 'var(--brown-dark)', cursor: 'pointer',
                  }}
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

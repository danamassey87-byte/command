import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import { useClientAvatars, useContentPillars, useInspoBank } from '../../lib/hooks.js'
import './InspoRecreator.css'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook',  label: 'Facebook' },
  { id: 'tiktok',    label: 'TikTok' },
  { id: 'linkedin',  label: 'LinkedIn' },
  { id: 'youtube',   label: 'YouTube' },
  { id: 'threads',   label: 'Threads' },
  { id: 'twitter',   label: 'Twitter/X' },
  { id: 'blog',      label: 'Blog' },
]

export default function InspoRecreator() {
  const navigate = useNavigate()
  const { data: avatars } = useClientAvatars()
  const { data: pillars } = useContentPillars()
  const { data: inspoItems, refetch: refetchInspo } = useInspoBank()

  const [tab, setTab] = useState('create') // create | library

  // Input state
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceCaption, setSourceCaption] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('instagram')
  const [targetPlatform, setTargetPlatform] = useState('instagram')
  const [avatarId, setAvatarId] = useState('')
  const [pillarId, setPillarId] = useState('')

  // Result state
  const [aiLoading, setAiLoading] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [recreated, setRecreated] = useState('')
  const [suggestedHashtags, setSuggestedHashtags] = useState('')
  const [suggestedHook, setSuggestedHook] = useState('')
  const [copied, setCopied] = useState(null)

  const avatarList = avatars ?? []
  const pillarList = pillars ?? []
  const library = inspoItems ?? []

  // ─── Analyze & Recreate ─────────────────────────────────────────────────
  async function handleRecreate() {
    if (!sourceCaption.trim() && !sourceUrl.trim()) return
    setAiLoading(true)
    setAnalysis('')
    setRecreated('')
    setSuggestedHashtags('')
    setSuggestedHook('')
    try {
      const result = await DB.generateContent({
        type: 'recreate_inspo',
        prompt: sourceCaption || sourceUrl,
        platform: targetPlatform,
        avatar_id: avatarId || undefined,
        pillar: pillarList.find(p => p.id === pillarId)?.name || undefined,
      })

      if (result.text) {
        // Try to parse structured response
        try {
          const parsed = JSON.parse(result.text)
          setAnalysis(parsed.analysis || '')
          setRecreated(parsed.recreated_text || parsed.recreated || '')
          setSuggestedHashtags(Array.isArray(parsed.suggested_hashtags) ? parsed.suggested_hashtags.map(h => `#${h}`).join(' ') : (parsed.suggested_hashtags || ''))
          setSuggestedHook(parsed.suggested_hook || '')
        } catch {
          // Not JSON, treat as plain text recreation
          setRecreated(result.text)
        }
      }
    } catch (err) {
      console.error('Recreate error:', err)
      alert('Error: ' + err.message)
    } finally {
      setAiLoading(false)
    }
  }

  // ─── Save to bank ──────────────────────────────────────────────────────
  async function saveToBank() {
    if (!recreated) return
    try {
      await DB.createInspoEntry({
        source_url: sourceUrl || null,
        source_platform: sourcePlatform,
        source_caption: sourceCaption || null,
        ai_analysis: analysis || null,
        recreated_text: recreated,
        target_platform: targetPlatform,
        avatar_id: avatarId || null,
        pillar_id: pillarId || null,
      })
      await refetchInspo()
      setCopied('saved')
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      alert('Save error: ' + err.message)
    }
  }

  // ─── Send to Composer ──────────────────────────────────────────────────
  async function sendToComposer() {
    if (!recreated) return
    try {
      const { data: piece } = await DB.createContentPiece({
        title: (suggestedHook || recreated).slice(0, 80),
        body_text: recreated,
        content_date: new Date().toISOString().slice(0, 10),
        pillar_id: pillarId || null,
        avatar_id: avatarId || null,
        status: 'draft',
        notes: suggestedHashtags || '',
        channel: targetPlatform,
      })
      if (piece?.id) navigate(`/content/composer/${piece.id}`)
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  // ─── Load from library ──────────────────────────────────────────────────
  function loadFromLibrary(item) {
    setSourceUrl(item.source_url || '')
    setSourceCaption(item.source_caption || '')
    setSourcePlatform(item.source_platform || 'instagram')
    setTargetPlatform(item.target_platform || 'instagram')
    setAvatarId(item.avatar_id || '')
    setPillarId(item.pillar_id || '')
    setAnalysis(item.ai_analysis || '')
    setRecreated(item.recreated_text || '')
    setTab('create')
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div className="ir-page">
      <div className="ir-header">
        <h1 className="ir-header__title">Inspo Recreator</h1>
      </div>

      {/* Tabs */}
      <div className="ir-tabs">
        <button className={`ir-tab ${tab === 'create' ? 'ir-tab--active' : ''}`} onClick={() => setTab('create')}>
          Create
        </button>
        <button className={`ir-tab ${tab === 'library' ? 'ir-tab--active' : ''}`} onClick={() => setTab('library')}>
          Library ({library.length})
        </button>
      </div>

      {/* ─── Create Tab ─── */}
      {tab === 'create' && (
        <>
          <div className="ir-input-zone">
            <div className="ir-input-zone__label">Drop your inspiration</div>

            <div className="ir-input-row">
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  Source URL (optional)
                </label>
                <input
                  className="ir-url-input"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="Paste an Instagram, TikTok, or other post URL..."
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  Source Platform
                </label>
                <select
                  className="ir-url-input"
                  value={sourcePlatform}
                  onChange={e => setSourcePlatform(e.target.value)}
                >
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                Caption / Content to Recreate *
              </label>
              <textarea
                className="ir-caption-input"
                value={sourceCaption}
                onChange={e => setSourceCaption(e.target.value)}
                placeholder="Paste the caption or content you want to recreate in your voice..."
              />
            </div>

            {/* Targeting selectors */}
            <div className="ir-selectors">
              <div className="ir-selector">
                <label>Target Platform</label>
                <select value={targetPlatform} onChange={e => setTargetPlatform(e.target.value)}>
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div className="ir-selector">
                <label>Target Avatar</label>
                <select value={avatarId} onChange={e => setAvatarId(e.target.value)}>
                  <option value="">All audiences</option>
                  {avatarList.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.type})</option>
                  ))}
                </select>
              </div>
              <div className="ir-selector">
                <label>Content Pillar</label>
                <select value={pillarId} onChange={e => setPillarId(e.target.value)}>
                  <option value="">None</option>
                  {pillarList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="ir-actions">
              <Button onClick={handleRecreate} disabled={aiLoading || (!sourceCaption.trim() && !sourceUrl.trim())}>
                {aiLoading ? '✦ Recreating...' : '✦ Recreate in My Voice'}
              </Button>
            </div>
          </div>

          {/* Results */}
          {(analysis || recreated) && (
            <>
              <div className="ir-results">
                {analysis && (
                  <div className="ir-result-card">
                    <div className="ir-result-card__title">Structure Analysis</div>
                    <div className="ir-result-card__body">{analysis}</div>
                  </div>
                )}
                <div className="ir-result-card">
                  <div className="ir-result-card__title" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Recreated ({targetPlatform})
                    <button
                      onClick={() => copy(recreated, 'recreated')}
                      style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 4, border: '1px solid #e0dbd6', background: '#faf8f5', cursor: 'pointer' }}
                    >
                      {copied === 'recreated' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="ir-result-card__body">{recreated}</div>
                  {suggestedHashtags && (
                    <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#5b8fa8' }}>{suggestedHashtags}</div>
                  )}
                  {suggestedHook && (
                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: 'var(--brown-mid)', fontStyle: 'italic' }}>
                      Hook: {suggestedHook}
                    </div>
                  )}
                </div>
              </div>

              <div className="ir-actions">
                <Button size="sm" variant="ghost" onClick={saveToBank}>
                  {copied === 'saved' ? '✓ Saved!' : 'Save to Inspo Bank'}
                </Button>
                <Button size="sm" onClick={sendToComposer}>
                  🚀 Send to Composer
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* ─── Library Tab ─── */}
      {tab === 'library' && (
        <>
          {library.length > 0 ? (
            <div className="ir-library">
              {library.map(item => (
                <div key={item.id} className="ir-lib-card" onClick={() => loadFromLibrary(item)}>
                  <div className="ir-lib-card__platform">{item.source_platform || 'unknown'} → {item.target_platform || '?'}</div>
                  <div className="ir-lib-card__caption">
                    {item.recreated_text || item.source_caption || 'No caption'}
                  </div>
                  <div className="ir-lib-card__footer">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    {item.used && <span className="ir-lib-card__used">Used</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0', fontSize: '0.85rem' }}>
              No saved inspiration yet. Use the Create tab to recreate content and save it here.
            </p>
          )}
        </>
      )}
    </div>
  )
}

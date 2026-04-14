import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button, Badge, Select } from '../../components/ui/index.jsx'
import { PropertyPicker } from '../../components/ui/PropertyPicker.jsx'
import { HashtagPicker } from '../../components/ui/HashtagPicker.jsx'
import * as DB from '../../lib/supabase.js'
import {
  useContentPillars, useClientAvatars, useProperties,
} from '../../lib/hooks.js'
import './PostComposer.css'

/* ─── Platform definitions ─── */
const PLATFORMS = [
  { id: 'instagram',  icon: '📸', label: 'Instagram',  limit: 2200  },
  { id: 'facebook',   icon: '📘', label: 'Facebook',   limit: 63206 },
  { id: 'tiktok',     icon: '🎵', label: 'TikTok',     limit: 2200  },
  { id: 'linkedin',   icon: '💼', label: 'LinkedIn',   limit: 3000  },
  { id: 'youtube',    icon: '▶️',  label: 'YouTube',    limit: 5000  },
  { id: 'gmb',        icon: '📍', label: 'Google Biz',  limit: 1500  },
  { id: 'pinterest',  icon: '📌', label: 'Pinterest',  limit: 500   },
  { id: 'threads',    icon: '🧵', label: 'Threads',    limit: 500   },
  { id: 'twitter',    icon: '𝕏',  label: 'Twitter/X',  limit: 280   },
  { id: 'blog',       icon: '✍️',  label: 'Blog',       limit: null  },
  { id: 'nextdoor',   icon: '🏘️',  label: 'Nextdoor',   limit: null  },
  { id: 'email',      icon: '📧', label: 'Email',      limit: null  },
  { id: 'stories',    icon: '📱', label: 'Stories',    limit: 2200  },
]

const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.id, p]))

/* ─── Main component ─── */
export default function PostComposer() {
  const { pieceId } = useParams()
  const navigate = useNavigate()

  // Data hooks
  const { data: pillars }  = useContentPillars()
  const { data: avatars }  = useClientAvatars()

  // Core state
  const [piece, setPiece]                 = useState(null)
  const [loading, setLoading]             = useState(!!pieceId)
  const [saving, setSaving]               = useState(false)
  const [selectedPlatforms, setSelected]  = useState(['instagram', 'facebook'])
  const [activeTab, setActiveTab]         = useState('main') // 'main' | platformId
  const [mainCaption, setMainCaption]     = useState('')
  const [platformTexts, setPlatformTexts] = useState({}) // { platformId: adaptedText }
  const [hashtags, setHashtags]           = useState('')
  const [mediaFiles, setMediaFiles]       = useState([]) // [{ file, preview, url }]
  const [dragOver, setDragOver]           = useState(false)

  // Metadata
  const [pillarId, setPillarId]     = useState('')
  const [avatarId, setAvatarId]     = useState('')
  const [framework, setFramework]   = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [property, setProperty]     = useState(null)
  const [contentDate, setContentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [scheduleTime, setScheduleTime] = useState('09:00')

  // Publish state
  const [publishStatus, setPublishStatus] = useState('draft') // draft|scheduled|publishing|published|failed
  const [publishError, setPublishError]   = useState('')

  // AI state
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiAdapting, setAiAdapting]   = useState(null) // platformId being adapted
  const [videoGenerating, setVideoGenerating] = useState(false)
  const [videoResult, setVideoResult] = useState(null)

  const fileInputRef = useRef(null)

  // ─── Load existing piece ─────────────────────────────────────────────────
  useEffect(() => {
    if (!pieceId) return
    setLoading(true)
    ;(async () => {
      try {
        const { data } = await DB.getContentPieces(
          '1900-01-01', '2099-12-31'
        )
        const found = (data ?? []).find(p => p.id === pieceId)
        if (!found) { setLoading(false); return }

        setPiece(found)
        setMainCaption(found.body_text || found.title || '')
        setContentDate(found.content_date || new Date().toISOString().slice(0, 10))
        setPillarId(found.pillar_id || '')
        setAvatarId(found.avatar_id || '')
        setPropertyId(found.property_id || '')
        setPublishStatus(found.status === 'published' ? 'published' : found.status === 'scheduled' ? 'scheduled' : 'draft')

        // Populate platform texts from existing platform_posts
        const posts = found.platform_posts ?? []
        if (posts.length > 0) {
          const platIds = posts.map(pp => pp.platform)
          setSelected(platIds)
          const texts = {}
          for (const pp of posts) {
            if (pp.adapted_text) texts[pp.platform] = pp.adapted_text
            if (pp.hashtags) setHashtags(pp.hashtags)
          }
          setPlatformTexts(texts)
        }

        setHashtags(found.notes || '')
      } catch (err) {
        console.error('Failed to load piece:', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [pieceId])

  // ─── Pick up video export from Video Studio ────────────────────────────────
  useEffect(() => {
    const exported = sessionStorage.getItem('video_studio_export')
    if (exported) {
      try {
        const data = JSON.parse(exported)
        if (data.url) {
          setMediaFiles(prev => [...prev, {
            file: null,
            preview: data.url,
            url: data.url,
            name: data.name || 'video.webm',
            type: data.type || 'video/webm',
            fromVideoStudio: true,
          }])
        }
      } catch { /* ignore */ }
      sessionStorage.removeItem('video_studio_export')
    }
  }, [])

  // ─── Derived ──────────────────────────────────────────────────────────────
  const pillarList = pillars ?? []
  const avatarList = avatars ?? []
  const activePlatformDefs = useMemo(
    () => selectedPlatforms.map(id => PLATFORM_MAP[id]).filter(Boolean),
    [selectedPlatforms]
  )

  // Get text for the current tab
  const getTextForPlatform = useCallback((pid) => {
    return platformTexts[pid] ?? mainCaption
  }, [platformTexts, mainCaption])

  // Character count helper
  const getCharInfo = useCallback((pid) => {
    const text = getTextForPlatform(pid)
    const len = text.length
    const plat = PLATFORM_MAP[pid]
    if (!plat?.limit) return { count: len, status: 'ok' }
    const pct = len / plat.limit
    const status = pct > 1 ? 'over' : pct > 0.9 ? 'warn' : 'ok'
    return { count: len, limit: plat.limit, status }
  }, [getTextForPlatform])

  // ─── Platform toggle ──────────────────────────────────────────────────────
  function togglePlatform(pid) {
    setSelected(prev =>
      prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]
    )
  }

  // ─── Media handling ───────────────────────────────────────────────────────
  function handleFileAdd(files) {
    const newFiles = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      url: null,
    }))
    setMediaFiles(prev => [...prev, ...newFiles])
  }

  function removeMedia(idx) {
    setMediaFiles(prev => {
      const next = [...prev]
      if (next[idx]?.preview) URL.revokeObjectURL(next[idx].preview)
      next.splice(idx, 1)
      return next
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) handleFileAdd(e.dataTransfer.files)
  }

  // ─── AI: Write caption ────────────────────────────────────────────────────
  async function aiWrite() {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const pillar = pillarList.find(p => p.id === pillarId)
      const avatar = avatarList.find(a => a.id === avatarId)
      const prompt = mainCaption || 'Write an engaging social media post about real estate in the East Valley, AZ area.'

      const result = await DB.generateContent({
        type: 'write',
        pillar: pillar?.name || 'Real Estate',
        prompt,
        avatar_id: avatarId || undefined,
        framework: framework || undefined,
      })
      if (result.text) setMainCaption(result.text)
    } catch (err) {
      console.error('AI write error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  // ─── AI: Adapt for specific platform ──────────────────────────────────────
  async function aiAdapt(platformId) {
    if (aiAdapting) return
    if (!mainCaption.trim()) return
    setAiAdapting(platformId)
    try {
      const result = await DB.generateContent({
        type: 'adapt',
        platform: platformId,
        body_text: mainCaption,
        avatar_id: avatarId || undefined,
        framework: framework || undefined,
      })
      if (result.text) {
        setPlatformTexts(prev => ({ ...prev, [platformId]: result.text }))
      }
    } catch (err) {
      console.error('AI adapt error:', err)
    } finally {
      setAiAdapting(null)
    }
  }

  // ─── AI: Adapt ALL selected platforms at once ─────────────────────────────
  async function aiAdaptAll() {
    if (aiLoading || !mainCaption.trim()) return
    setAiLoading(true)
    try {
      const result = await DB.generateContent({
        type: 'repurpose',
        body_text: mainCaption,
        active_platforms: selectedPlatforms,
        avatar_id: avatarId || undefined,
        framework: framework || undefined,
      })
      if (result.text) {
        try {
          const parsed = typeof result.text === 'string' ? JSON.parse(result.text) : result.text
          if (typeof parsed === 'object') {
            setPlatformTexts(prev => ({ ...prev, ...parsed }))
          }
        } catch {
          // If it's not JSON, ignore
        }
      }
    } catch (err) {
      console.error('AI repurpose error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  // ─── AI: Suggest hooks ────────────────────────────────────────────────────
  async function aiSuggestHooks() {
    if (aiLoading) return
    setAiLoading(true)
    try {
      const pillar = pillarList.find(p => p.id === pillarId)
      const result = await DB.generateContent({
        type: 'suggest_hooks',
        pillar: pillar?.name || 'Real Estate',
        prompt: mainCaption || 'real estate content',
        body_text: activeTab === 'main' ? 'Instagram post' : activeTab,
        avatar_id: avatarId || undefined,
        framework: framework || undefined,
      })
      if (result.hooks?.length) {
        const hookText = result.hooks.join('\n\n---\n\n')
        setMainCaption(prev => prev ? prev + '\n\n---\nHook Ideas:\n' + hookText : hookText)
      }
    } catch (err) {
      console.error('AI hooks error:', err)
    } finally {
      setAiLoading(false)
    }
  }

  // ─── Save draft / update piece ────────────────────────────────────────────
  async function saveDraft() {
    setSaving(true)
    try {
      let currentPiece = piece
      const pieceData = {
        title: mainCaption.slice(0, 80) || 'Untitled Post',
        body_text: mainCaption,
        content_date: contentDate,
        pillar_id: pillarId || null,
        avatar_id: avatarId || null,
        property_id: propertyId || null,
        status: 'draft',
        notes: hashtags,
      }

      if (currentPiece) {
        const { data } = await DB.updateContentPiece(currentPiece.id, pieceData)
        currentPiece = data
      } else {
        const { data } = await DB.createContentPiece(pieceData)
        currentPiece = data
        // Navigate to the piece URL so subsequent saves update
        if (currentPiece?.id) navigate(`/content/composer/${currentPiece.id}`, { replace: true })
      }
      setPiece(currentPiece)

      // Upsert platform posts
      for (const pid of selectedPlatforms) {
        const text = getTextForPlatform(pid)
        const charInfo = getCharInfo(pid)
        await DB.upsertContentPlatformPost({
          content_id: currentPiece.id,
          platform: pid,
          adapted_text: platformTexts[pid] || null,
          hashtags: hashtags || null,
          char_count: charInfo.count,
          status: 'draft',
        })
      }

      setPublishStatus('draft')
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Schedule post ────────────────────────────────────────────────────────
  async function schedulePost() {
    setSaving(true)
    try {
      // Save first
      await saveDraft()
      if (!piece?.id) { setSaving(false); return }

      const scheduledFor = new Date(`${contentDate}T${scheduleTime}:00`).toISOString()

      // Update each platform post to scheduled
      for (const pid of selectedPlatforms) {
        const text = getTextForPlatform(pid)
        const charInfo = getCharInfo(pid)
        await DB.upsertContentPlatformPost({
          content_id: piece.id,
          platform: pid,
          adapted_text: platformTexts[pid] || null,
          hashtags: hashtags || null,
          char_count: charInfo.count,
          status: 'scheduled',
          scheduled_for: scheduledFor,
        })
      }

      // Update the content piece status
      await DB.updateContentPiece(piece.id, { status: 'scheduled' })
      setPublishStatus('scheduled')
    } catch (err) {
      console.error('Schedule error:', err)
      alert('Failed to schedule: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Publish now via Blotato ──────────────────────────────────────────────
  async function publishNow() {
    setSaving(true)
    setPublishError('')
    try {
      // Save first
      await saveDraft()
      if (!piece?.id) { setSaving(false); return }

      setPublishStatus('publishing')

      // Call publish-content edge function for each platform
      for (const pid of selectedPlatforms) {
        // Get the platform_post record
        const { data: posts } = await DB.getContentPieces(contentDate, contentDate)
        const currentPiece = (posts ?? []).find(p => p.id === piece.id)
        const platformPost = (currentPiece?.platform_posts ?? []).find(pp => pp.platform === pid)

        if (platformPost) {
          try {
            await DB.publishContent(platformPost.id, 'publish_now')
          } catch (err) {
            console.error(`Publish failed for ${pid}:`, err)
            setPublishError(prev => prev + `${pid}: ${err.message}\n`)
          }
        }
      }

      // Check final status
      const anyFailed = publishError.length > 0
      setPublishStatus(anyFailed ? 'failed' : 'published')

      if (!anyFailed) {
        await DB.updateContentPiece(piece.id, { status: 'published' })
      }
    } catch (err) {
      console.error('Publish error:', err)
      setPublishStatus('failed')
      setPublishError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ─── Generate video via Blotato ────────────────────────────────────────
  const VIDEO_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'stories']
  const hasVideoPlatform = selectedPlatforms.some(p => VIDEO_PLATFORMS.includes(p))

  async function generateVideo() {
    if (videoGenerating || !mainCaption.trim()) return
    setVideoGenerating(true)
    setVideoResult(null)
    try {
      const data = await DB.generateBlotatoVideo(
        mainCaption,
        mediaFiles.filter(m => m.url).map(m => m.url)
      )
      setVideoResult(data)
    } catch (err) {
      setVideoResult({ error: err.message })
    } finally {
      setVideoGenerating(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pc-page">
        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '60px 0' }}>
          Loading...
        </p>
      </div>
    )
  }

  const currentTabText = activeTab === 'main'
    ? mainCaption
    : getTextForPlatform(activeTab)

  const currentCharInfo = activeTab !== 'main'
    ? getCharInfo(activeTab)
    : { count: mainCaption.length, status: 'ok' }

  return (
    <div className="pc-page">
      {/* ─── Header ─── */}
      <div className="pc-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to="/content/calendar" style={{ color: 'var(--brown-mid)', fontSize: '0.82rem', textDecoration: 'none' }}>
            &larr; Calendar
          </Link>
          <h1 className="pc-header__title">
            {piece ? 'Edit Post' : 'New Post'}
          </h1>
          <span className={`pc-status pc-status--${publishStatus}`}>
            <span className="pc-status__dot" />
            {publishStatus}
          </span>
        </div>
        <div className="pc-header__actions">
          <Button size="sm" variant="ghost" onClick={saveDraft} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* ─── Platform selector ─── */}
      <div className="pc-platforms" style={{ marginBottom: 16 }}>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            className={`pc-platform-chip ${selectedPlatforms.includes(p.id) ? 'pc-platform-chip--active' : ''}`}
            onClick={() => togglePlatform(p.id)}
            type="button"
          >
            <span className="pc-platform-chip__icon">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>

      <div className="pc-layout">
        {/* ─── Left: Editor ─── */}
        <div className="pc-editor">
          {/* Compose card with platform tabs */}
          <div className="pc-compose-card">
            <div className="pc-compose-tabs">
              <button
                className={`pc-compose-tab ${activeTab === 'main' ? 'pc-compose-tab--active' : ''}`}
                onClick={() => setActiveTab('main')}
              >
                Main Copy
              </button>
              {activePlatformDefs.map(p => {
                const info = getCharInfo(p.id)
                return (
                  <button
                    key={p.id}
                    className={`pc-compose-tab ${activeTab === p.id ? 'pc-compose-tab--active' : ''}`}
                    onClick={() => setActiveTab(p.id)}
                  >
                    {p.icon} {p.label}
                    {platformTexts[p.id] && (
                      <span className="pc-compose-tab__count">
                        {info.count}{p.limit ? `/${p.limit}` : ''}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="pc-compose-body">
              {activeTab === 'main' ? (
                <textarea
                  className="pc-compose-textarea"
                  value={mainCaption}
                  onChange={e => setMainCaption(e.target.value)}
                  placeholder="Write your post here... or click AI Write to generate one."
                />
              ) : (
                <textarea
                  className="pc-compose-textarea"
                  value={platformTexts[activeTab] ?? mainCaption}
                  onChange={e => setPlatformTexts(prev => ({ ...prev, [activeTab]: e.target.value }))}
                  placeholder={`Adapted text for ${PLATFORM_MAP[activeTab]?.label ?? activeTab}. Leave empty to use main copy.`}
                />
              )}
            </div>

            <div className="pc-compose-footer">
              <span className={`pc-char-count pc-char-count--${currentCharInfo.status}`}>
                {currentCharInfo.count}{currentCharInfo.limit ? ` / ${currentCharInfo.limit}` : ''} chars
              </span>
              <div className="pc-compose-actions">
                {activeTab !== 'main' && (
                  <button
                    className={`pc-ai-btn ${aiAdapting === activeTab ? 'pc-ai-btn--loading' : ''}`}
                    onClick={() => aiAdapt(activeTab)}
                    disabled={!!aiAdapting}
                  >
                    <span className="pc-ai-btn__icon">✦</span>
                    {aiAdapting === activeTab ? 'Adapting...' : 'AI Adapt'}
                  </button>
                )}
                {activeTab === 'main' && platformTexts[activeTab] && (
                  <button
                    className="pc-ai-btn"
                    onClick={() => setPlatformTexts(prev => { const n = { ...prev }; delete n[activeTab]; return n })}
                  >
                    Clear override
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI action bar */}
          <div className="pc-ai-bar">
            <button className={`pc-ai-btn ${aiLoading ? 'pc-ai-btn--loading' : ''}`} onClick={aiWrite} disabled={aiLoading}>
              <span className="pc-ai-btn__icon">✦</span> AI Write
            </button>
            <button className={`pc-ai-btn ${aiLoading ? 'pc-ai-btn--loading' : ''}`} onClick={aiAdaptAll} disabled={aiLoading || !mainCaption.trim()}>
              <span className="pc-ai-btn__icon">✦</span> Adapt All Platforms
            </button>
            <button className={`pc-ai-btn ${aiLoading ? 'pc-ai-btn--loading' : ''}`} onClick={aiSuggestHooks} disabled={aiLoading}>
              <span className="pc-ai-btn__icon">✦</span> Suggest Hooks
            </button>
            {hasVideoPlatform && (
              <button className={`pc-ai-btn ${videoGenerating ? 'pc-ai-btn--loading' : ''}`} onClick={generateVideo} disabled={videoGenerating || !mainCaption.trim()}>
                <span className="pc-ai-btn__icon">🎬</span> {videoGenerating ? 'Generating...' : 'Generate Video'}
              </button>
            )}
          </div>

          {videoResult && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem',
              background: videoResult.error ? '#fce8e6' : '#e6f4ea',
              color: videoResult.error ? '#c5221f' : '#137333',
            }}>
              {videoResult.error
                ? `Video generation failed: ${videoResult.error}`
                : `Video created! ${videoResult.url ? '' : 'Processing — check Blotato dashboard for status.'}`}
              {videoResult.url && (
                <a href={videoResult.url} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontWeight: 600, color: '#137333' }}>
                  View Video &rarr;
                </a>
              )}
            </div>
          )}

          {/* Hashtags */}
          <div className="pc-hashtag-section">
            <div className="pc-hashtag-section__label">
              Hashtags
              {activeTab !== 'main' && PLATFORM_MAP[activeTab] && (
                <span style={{ fontWeight: 400, fontSize: '0.7rem', marginLeft: 6, color: 'var(--color-text-muted)' }}>
                  ({activeTab})
                </span>
              )}
            </div>
            <HashtagPicker
              value={hashtags}
              onChange={setHashtags}
              platform={activeTab !== 'main' ? activeTab : 'instagram'}
            />
          </div>

          {/* Media upload */}
          <div className="pc-media">
            <div className="pc-media__label">Media</div>
            <div
              className={`pc-media-drop ${dragOver ? 'pc-media-drop--dragover' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <p className="pc-media-drop__text">
                <strong>Click or drag</strong> to add images or video
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.length) handleFileAdd(e.target.files); e.target.value = '' }}
              />
            </div>
            {mediaFiles.length > 0 && (
              <div className="pc-media-thumbs">
                {mediaFiles.map((m, i) => (
                  <div key={i} className="pc-media-thumb">
                    <img src={m.preview || m.url} alt="" />
                    <button className="pc-media-thumb__remove" onClick={() => removeMedia(i)} type="button">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Schedule / Publish bar */}
          <div className="pc-schedule">
            <div className="pc-schedule__datetime">
              <input
                type="date"
                value={contentDate}
                onChange={e => setContentDate(e.target.value)}
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
              />
            </div>
            <div className="pc-schedule__buttons">
              <Button size="sm" variant="ghost" onClick={schedulePost} disabled={saving || !selectedPlatforms.length}>
                Schedule
              </Button>
              <Button size="sm" onClick={publishNow} disabled={saving || !selectedPlatforms.length || !mainCaption.trim()}>
                {saving && publishStatus === 'publishing' ? 'Publishing...' : 'Publish Now'}
              </Button>
            </div>
          </div>

          {publishError && (
            <div style={{ padding: '10px 14px', background: '#fce8e6', borderRadius: 8, fontSize: '0.82rem', color: '#c5221f', whiteSpace: 'pre-wrap' }}>
              {publishError}
            </div>
          )}
        </div>

        {/* ─── Right: Sidebar ─── */}
        <div className="pc-sidebar">
          {/* Avatar & Pillar pickers */}
          <div className="pc-sidebar-card">
            <div className="pc-sidebar-card__title">Targeting</div>
            <div className="pc-picker-row">
              <div className="pc-picker-field">
                <label>Avatar</label>
                <select value={avatarId} onChange={e => setAvatarId(e.target.value)}>
                  <option value="">All audiences</option>
                  {avatarList.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="pc-picker-field">
                <label>Pillar</label>
                <select value={pillarId} onChange={e => setPillarId(e.target.value)}>
                  <option value="">None</option>
                  {pillarList.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="pc-picker-row" style={{ marginTop: 8 }}>
              <div className="pc-picker-field" style={{ flex: '1 1 100%' }}>
                <label>Framework</label>
                <select value={framework} onChange={e => setFramework(e.target.value)}>
                  <option value="">Auto (no framework)</option>
                  <option value="pas">PAS — Problem · Agitate · Solution</option>
                  <option value="pastor">PASTOR — Problem · Amplify · Story · Transform · Offer · Response</option>
                  <option value="aida">AIDA — Attention · Interest · Desire · Action</option>
                  <option value="bab">BAB — Before · After · Bridge</option>
                  <option value="4ps">4Ps — Picture · Promise · Proof · Push</option>
                  <option value="storybrand">StoryBrand — Hero · Problem · Guide · Plan · CTA</option>
                  <option value="fab">FAB — Features · Advantages · Benefits</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <PropertyPicker
                label="Property"
                compact
                onSelect={p => { setProperty(p); setPropertyId(p?.id || '') }}
              />
              {property && (
                <div style={{ fontSize: '0.78rem', color: 'var(--brown-mid)', marginTop: 4 }}>
                  {property.address}, {property.city}
                </div>
              )}
            </div>
          </div>

          {/* Platform previews */}
          <div className="pc-sidebar-card">
            <div className="pc-sidebar-card__title">Live Previews</div>
            <div className="pc-previews">
              {activePlatformDefs.map(p => {
                const text = getTextForPlatform(p.id)
                const info = getCharInfo(p.id)
                const truncated = p.limit && text.length > p.limit
                return (
                  <div key={p.id} className="pc-preview-card">
                    <div className="pc-preview-card__header">
                      <span className="pc-preview-card__icon">{p.icon}</span>
                      {p.label}
                      <span className={`pc-char-count pc-char-count--${info.status}`} style={{ marginLeft: 'auto', fontSize: '0.72rem' }}>
                        {info.count}{p.limit ? `/${p.limit}` : ''}
                      </span>
                    </div>
                    <div className="pc-preview-card__body">
                      {truncated ? text.slice(0, p.limit) + '...' : text || 'No content yet'}
                    </div>
                    {hashtags && (
                      <div className="pc-preview-card__hashtags">
                        {hashtags.slice(0, 120)}{hashtags.length > 120 ? '...' : ''}
                      </div>
                    )}
                    {truncated && (
                      <div className="pc-preview-card__truncated">
                        Over limit by {text.length - p.limit} chars
                      </div>
                    )}
                  </div>
                )
              })}
              {activePlatformDefs.length === 0 && (
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Select platforms above to see previews
                </p>
              )}
            </div>
          </div>

          {/* Avatar context preview */}
          {avatarId && (() => {
            const av = avatarList.find(a => a.id === avatarId)
            if (!av) return null
            return (
              <div className="pc-sidebar-card">
                <div className="pc-sidebar-card__title">Avatar: {av.name}</div>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.5, color: '#666' }}>
                  <div><strong>Type:</strong> {av.type}</div>
                  {av.age_range && <div><strong>Age:</strong> {av.age_range}</div>}
                  {av.family_status && <div><strong>Family:</strong> {av.family_status}</div>}
                  {av.motivation && <div><strong>Motivation:</strong> {av.motivation}</div>}
                  {av.pain_points && <div><strong>Pain points:</strong> {av.pain_points}</div>}
                  {av.content_resonates && <div><strong>Responds to:</strong> {av.content_resonates}</div>}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

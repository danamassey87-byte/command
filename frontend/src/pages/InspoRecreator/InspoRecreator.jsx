import { useState, useMemo } from 'react'
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

const CONTENT_TYPES = [
  { id: 'reel',        label: 'Reel / Video' },
  { id: 'carousel',    label: 'Carousel' },
  { id: 'single_post', label: 'Single Post' },
  { id: 'story',       label: 'Story' },
  { id: 'blog',        label: 'Blog / Article' },
  { id: 'tiktok',      label: 'TikTok' },
  { id: 'other',       label: 'Other' },
]

export default function InspoRecreator() {
  const navigate = useNavigate()
  const { data: avatars } = useClientAvatars()
  const { data: pillars } = useContentPillars()
  const { data: inspoItems, refetch: refetchInspo } = useInspoBank()

  const [tab, setTab] = useState('library') // save | library | recreate

  // ─── SAVE form state ──────────────────────────────────────────────────────
  const [saveTitle, setSaveTitle] = useState('')
  const [saveUrl, setSaveUrl] = useState('')
  const [saveCaption, setSaveCaption] = useState('')
  const [savePlatform, setSavePlatform] = useState('instagram')
  const [saveContentType, setSaveContentType] = useState('single_post')
  const [saveNotes, setSaveNotes] = useState('')
  const [saveTags, setSaveTags] = useState('')
  const [saveMedia, setSaveMedia] = useState([]) // array of { url, type }
  const [newMediaUrl, setNewMediaUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ─── LIBRARY state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [filterPlatform, setFilterPlatform] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterFav, setFilterFav] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  // ─── RECREATE state (existing AI flow) ────────────────────────────────────
  const [sourceUrl, setSourceUrl] = useState('')
  const [sourceCaption, setSourceCaption] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('instagram')
  const [targetPlatform, setTargetPlatform] = useState('instagram')
  const [avatarId, setAvatarId] = useState('')
  const [pillarId, setPillarId] = useState('')
  const [loadedInspoNotes, setLoadedInspoNotes] = useState('') // notes from the library item being recreated
  const [aiLoading, setAiLoading] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [recreated, setRecreated] = useState('')
  const [suggestedHashtags, setSuggestedHashtags] = useState('')
  const [suggestedHook, setSuggestedHook] = useState('')
  const [copied, setCopied] = useState(null)

  const avatarList = avatars ?? []
  const pillarList = pillars ?? []
  const library = inspoItems ?? []

  // ─── Filtered library ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let items = library
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        (i.title || '').toLowerCase().includes(q) ||
        (i.source_caption || '').toLowerCase().includes(q) ||
        (i.notes || '').toLowerCase().includes(q) ||
        (i.tags || []).some(t => t.toLowerCase().includes(q))
      )
    }
    if (filterPlatform) items = items.filter(i => i.source_platform === filterPlatform)
    if (filterType) items = items.filter(i => i.content_type === filterType)
    if (filterFav) items = items.filter(i => i.favorited)
    return items
  }, [library, search, filterPlatform, filterType, filterFav])

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE handlers
  // ═══════════════════════════════════════════════════════════════════════════
  function addMediaUrl() {
    if (!newMediaUrl.trim()) return
    const isVideo = /\.(mp4|mov|webm)/i.test(newMediaUrl) || /reel|tiktok|shorts/i.test(newMediaUrl)
    setSaveMedia(prev => [...prev, { url: newMediaUrl.trim(), type: isVideo ? 'video' : 'image' }])
    setNewMediaUrl('')
  }

  function removeMedia(idx) {
    setSaveMedia(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleSave() {
    if (!saveCaption.trim() && !saveUrl.trim() && saveMedia.length === 0) return
    setSaving(true)
    try {
      await DB.createInspoEntry({
        title: saveTitle.trim() || null,
        source_url: saveUrl.trim() || null,
        source_platform: savePlatform,
        source_caption: saveCaption.trim() || null,
        content_type: saveContentType,
        source_media: saveMedia.length > 0 ? saveMedia : [],
        notes: saveNotes.trim() || null,
        tags: saveTags.trim() ? saveTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
      await refetchInspo()
      // Reset form
      setSaveTitle(''); setSaveUrl(''); setSaveCaption(''); setSavePlatform('instagram')
      setSaveContentType('single_post'); setSaveNotes(''); setSaveTags('')
      setSaveMedia([]); setNewMediaUrl('')
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      alert('Save error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LIBRARY handlers
  // ═══════════════════════════════════════════════════════════════════════════
  async function toggleFavorite(e, item) {
    e.stopPropagation()
    try {
      await DB.updateInspoEntry(item.id, { favorited: !item.favorited })
      await refetchInspo()
      if (detailItem?.id === item.id) setDetailItem({ ...detailItem, favorited: !item.favorited })
    } catch (err) { console.error(err) }
  }

  async function deleteItem(item) {
    if (!confirm('Delete this inspo?')) return
    try {
      await DB.deleteInspoEntry(item.id)
      await refetchInspo()
      if (detailItem?.id === item.id) setDetailItem(null)
    } catch (err) { alert('Error: ' + err.message) }
  }

  function loadToRecreate(item) {
    setSourceUrl(item.source_url || '')
    setSourceCaption(item.source_caption || '')
    setSourcePlatform(item.source_platform || 'instagram')
    setTargetPlatform(item.target_platform || 'instagram')
    setAvatarId(item.avatar_id || '')
    setPillarId(item.pillar_id || '')
    setAnalysis(item.ai_analysis || '')
    setRecreated(item.recreated_text || '')
    setLoadedInspoNotes(item.notes || '')
    setDetailItem(null)
    setTab('recreate')
  }

  // One-click recreate directly from library card or detail panel
  const [quickRecreating, setQuickRecreating] = useState(null) // item id being recreated
  const [quickResult, setQuickResult] = useState(null) // { analysis, recreated_text, suggested_hashtags, suggested_hook }

  async function recreateForMe(e, item) {
    if (e) e.stopPropagation()
    const caption = item.source_caption || item.source_url || ''
    if (!caption.trim()) { alert('This inspo has no caption or URL to recreate from.'); return }
    setQuickRecreating(item.id)
    setQuickResult(null)
    try {
      const pillarName = item.pillar_id ? pillarList.find(p => p.id === item.pillar_id)?.name : undefined
      const result = await DB.generateContent({
        type: 'recreate_inspo',
        prompt: caption,
        platform: item.source_platform || 'instagram',
        avatar_id: item.avatar_id || undefined,
        pillar: pillarName || undefined,
        inspo_notes: item.notes || undefined,
      })
      // Parse result
      let parsed = {}
      if (result.text) {
        try { parsed = JSON.parse(result.text) } catch { parsed = { recreated_text: result.text } }
      } else if (result.recreated_text) {
        parsed = result
      }
      setQuickResult({
        analysis: parsed.analysis || '',
        recreated_text: parsed.recreated_text || parsed.recreated || '',
        suggested_hashtags: Array.isArray(parsed.suggested_hashtags) ? parsed.suggested_hashtags.map(h => `#${h}`).join(' ') : (parsed.suggested_hashtags || ''),
        suggested_hook: parsed.suggested_hook || '',
      })
      // Update the item in the bank as "used"
      await DB.updateInspoEntry(item.id, { used: true, recreated_text: parsed.recreated_text || parsed.recreated || '' })
      await refetchInspo()
    } catch (err) {
      console.error('Quick recreate error:', err)
      alert('Error: ' + err.message)
      setQuickResult(null)
    } finally {
      setQuickRecreating(null)
    }
  }

  function copyQuickResult(text) {
    navigator.clipboard.writeText(text)
    setCopied('quick')
    setTimeout(() => setCopied(null), 1500)
  }

  async function quickResultToComposer() {
    if (!quickResult?.recreated_text) return
    try {
      const { data: piece } = await DB.createContentPiece({
        title: (quickResult.suggested_hook || quickResult.recreated_text).slice(0, 80),
        body_text: quickResult.recreated_text,
        content_date: new Date().toISOString().slice(0, 10),
        status: 'draft',
        notes: quickResult.suggested_hashtags || '',
      })
      if (piece?.id) navigate(`/content/composer/${piece.id}`)
    } catch (err) { alert('Error: ' + err.message) }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECREATE handlers (preserved from original)
  // ═══════════════════════════════════════════════════════════════════════════
  async function handleRecreate() {
    if (!sourceCaption.trim() && !sourceUrl.trim()) return
    setAiLoading(true)
    setAnalysis(''); setRecreated(''); setSuggestedHashtags(''); setSuggestedHook('')
    try {
      const result = await DB.generateContent({
        type: 'recreate_inspo',
        prompt: sourceCaption || sourceUrl,
        platform: targetPlatform,
        avatar_id: avatarId || undefined,
        pillar: pillarList.find(p => p.id === pillarId)?.name || undefined,
        inspo_notes: loadedInspoNotes || undefined,
      })
      if (result.text) {
        try {
          const parsed = JSON.parse(result.text)
          setAnalysis(parsed.analysis || '')
          setRecreated(parsed.recreated_text || parsed.recreated || '')
          setSuggestedHashtags(Array.isArray(parsed.suggested_hashtags) ? parsed.suggested_hashtags.map(h => `#${h}`).join(' ') : (parsed.suggested_hashtags || ''))
          setSuggestedHook(parsed.suggested_hook || '')
        } catch {
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

  async function saveRecreationToBank() {
    if (!recreated) return
    try {
      await DB.createInspoEntry({
        title: (suggestedHook || sourceCaption || '').slice(0, 80) || null,
        source_url: sourceUrl || null,
        source_platform: sourcePlatform,
        source_caption: sourceCaption || null,
        ai_analysis: analysis || null,
        recreated_text: recreated,
        target_platform: targetPlatform,
        avatar_id: avatarId || null,
        pillar_id: pillarId || null,
        content_type: 'single_post',
      })
      await refetchInspo()
      setCopied('saved')
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      alert('Save error: ' + err.message)
    }
  }

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

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="ir-page">
      <div className="ir-header">
        <h1 className="ir-header__title">Inspo Library</h1>
        <Button size="sm" onClick={() => setTab('save')}>+ Save Inspo</Button>
      </div>

      {/* Tabs */}
      <div className="ir-tabs">
        <button className={`ir-tab ${tab === 'save' ? 'ir-tab--active' : ''}`} onClick={() => setTab('save')}>
          Save
        </button>
        <button className={`ir-tab ${tab === 'library' ? 'ir-tab--active' : ''}`} onClick={() => setTab('library')}>
          Library ({library.length})
        </button>
        <button className={`ir-tab ${tab === 'recreate' ? 'ir-tab--active' : ''}`} onClick={() => setTab('recreate')}>
          Recreate
        </button>
      </div>

      {/* ═══ SAVE TAB ═══ */}
      {tab === 'save' && (
        <div className="ir-save-form">
          <div className="ir-input-zone">
            <div className="ir-input-zone__label">Drop your inspiration</div>

            {/* Title */}
            <div style={{ marginBottom: 12 }}>
              <label className="ir-field-label">Title (optional — for quick reference)</label>
              <input
                className="ir-url-input"
                value={saveTitle}
                onChange={e => setSaveTitle(e.target.value)}
                placeholder="e.g. 'That Reel about staging on a budget'"
              />
            </div>

            {/* URL + Platform */}
            <div className="ir-input-row">
              <div>
                <label className="ir-field-label">Link / URL</label>
                <input
                  className="ir-url-input"
                  value={saveUrl}
                  onChange={e => setSaveUrl(e.target.value)}
                  placeholder="Paste Instagram, TikTok, YouTube link..."
                />
              </div>
              <div className="ir-input-row__half">
                <div>
                  <label className="ir-field-label">Platform</label>
                  <select className="ir-url-input" value={savePlatform} onChange={e => setSavePlatform(e.target.value)}>
                    {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="ir-field-label">Content Type</label>
                  <select className="ir-url-input" value={saveContentType} onChange={e => setSaveContentType(e.target.value)}>
                    {CONTENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Caption */}
            <div style={{ marginBottom: 12 }}>
              <label className="ir-field-label">Caption / Text</label>
              <textarea
                className="ir-caption-input"
                value={saveCaption}
                onChange={e => setSaveCaption(e.target.value)}
                placeholder="Paste the caption, script, or any text from the original..."
              />
            </div>

            {/* Multi-slide media URLs */}
            <div style={{ marginBottom: 12 }}>
              <label className="ir-field-label">Slides / Media (paste image or video URLs)</label>
              <div className="ir-media-add">
                <input
                  className="ir-url-input"
                  value={newMediaUrl}
                  onChange={e => setNewMediaUrl(e.target.value)}
                  placeholder="Paste image or video URL, then click Add"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addMediaUrl())}
                />
                <Button size="sm" variant="ghost" onClick={addMediaUrl} disabled={!newMediaUrl.trim()}>Add</Button>
              </div>
              {saveMedia.length > 0 && (
                <div className="ir-media-list">
                  {saveMedia.map((m, i) => (
                    <div key={i} className="ir-media-item">
                      <span className="ir-media-item__type">{m.type}</span>
                      <span className="ir-media-item__url">{m.url}</span>
                      <button className="ir-media-item__remove" onClick={() => removeMedia(i)}>&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes + Tags */}
            <div className="ir-input-row">
              <div>
                <label className="ir-field-label">Notes (why you saved it)</label>
                <textarea
                  className="ir-caption-input"
                  style={{ minHeight: 60 }}
                  value={saveNotes}
                  onChange={e => setSaveNotes(e.target.value)}
                  placeholder="What caught your eye? What would you do differently?"
                />
              </div>
              <div>
                <label className="ir-field-label">Tags (comma-separated)</label>
                <input
                  className="ir-url-input"
                  value={saveTags}
                  onChange={e => setSaveTags(e.target.value)}
                  placeholder="staging, luxury, hooks, trending..."
                />
              </div>
            </div>

            <div className="ir-actions" style={{ marginTop: 16 }}>
              <Button onClick={handleSave} disabled={saving || (!saveCaption.trim() && !saveUrl.trim() && saveMedia.length === 0)}>
                {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save to Library'}
              </Button>
              {saveSuccess && <span className="ir-save-success">Added to your inspo library</span>}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LIBRARY TAB ═══ */}
      {tab === 'library' && (
        <>
          {/* Filters */}
          <div className="ir-filters">
            <input
              className="ir-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search inspo..."
            />
            <select className="ir-filter-select" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
              <option value="">All Platforms</option>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <select className="ir-filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {CONTENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <button
              className={`ir-fav-toggle ${filterFav ? 'ir-fav-toggle--active' : ''}`}
              onClick={() => setFilterFav(!filterFav)}
              title="Show favorites only"
            >
              {filterFav ? '\u2605' : '\u2606'}
            </button>
          </div>

          {filtered.length > 0 ? (
            <div className="ir-library">
              {filtered.map(item => (
                <div key={item.id} className="ir-lib-card" onClick={() => setDetailItem(item)}>
                  {/* Media preview */}
                  {(item.source_media?.length > 0 || item.source_image_url) && (
                    <div className="ir-lib-card__media">
                      {item.source_media?.length > 0 ? (
                        item.source_media[0].type === 'video' ? (
                          <div className="ir-lib-card__video-badge">Video</div>
                        ) : (
                          <img src={item.source_media[0].url} alt="" className="ir-lib-card__img" />
                        )
                      ) : item.source_image_url ? (
                        <img src={item.source_image_url} alt="" className="ir-lib-card__img" />
                      ) : null}
                      {item.source_media?.length > 1 && (
                        <span className="ir-lib-card__slide-count">{item.source_media.length} slides</span>
                      )}
                    </div>
                  )}

                  <div className="ir-lib-card__body">
                    <div className="ir-lib-card__top-row">
                      <span className="ir-lib-card__platform">{item.source_platform || 'unknown'}</span>
                      {item.content_type && item.content_type !== 'single_post' && (
                        <span className="ir-lib-card__type-badge">{CONTENT_TYPES.find(t => t.id === item.content_type)?.label || item.content_type}</span>
                      )}
                      <button className="ir-lib-card__fav" onClick={e => toggleFavorite(e, item)}>
                        {item.favorited ? '\u2605' : '\u2606'}
                      </button>
                    </div>

                    {item.title && <div className="ir-lib-card__title">{item.title}</div>}

                    <div className="ir-lib-card__caption">
                      {item.source_caption || item.recreated_text || 'No caption'}
                    </div>

                    {item.tags?.length > 0 && (
                      <div className="ir-lib-card__tags">
                        {item.tags.slice(0, 4).map((t, i) => <span key={i} className="ir-tag">{t}</span>)}
                        {item.tags.length > 4 && <span className="ir-tag ir-tag--more">+{item.tags.length - 4}</span>}
                      </div>
                    )}

                    <div className="ir-lib-card__footer">
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {item.used && <span className="ir-lib-card__used">Used</span>}
                        <button
                          className="ir-recreate-btn"
                          onClick={e => recreateForMe(e, item)}
                          disabled={quickRecreating === item.id}
                        >
                          {quickRecreating === item.id ? 'Working...' : 'Recreate for Me'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ir-empty">
              {library.length === 0
                ? 'No inspiration saved yet. Hit the Save tab to start collecting!'
                : 'No results match your filters.'}
            </div>
          )}

          {/* ─── Detail / Preview Panel ─── */}
          {detailItem && (
            <div className="ir-detail-overlay" onClick={() => setDetailItem(null)}>
              <div className="ir-detail-panel" onClick={e => e.stopPropagation()}>
                <div className="ir-detail-header">
                  <h2 className="ir-detail-title">{detailItem.title || 'Inspo Detail'}</h2>
                  <button className="ir-detail-close" onClick={() => setDetailItem(null)}>&times;</button>
                </div>

                <div className="ir-detail-meta">
                  <span className="ir-lib-card__platform">{detailItem.source_platform}</span>
                  {detailItem.content_type && (
                    <span className="ir-lib-card__type-badge">{CONTENT_TYPES.find(t => t.id === detailItem.content_type)?.label || detailItem.content_type}</span>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {new Date(detailItem.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Source URL */}
                {detailItem.source_url && (
                  <div className="ir-detail-section">
                    <div className="ir-detail-section__label">Source Link</div>
                    <a href={detailItem.source_url} target="_blank" rel="noopener noreferrer" className="ir-detail-link">
                      {detailItem.source_url}
                    </a>
                  </div>
                )}

                {/* Media slides */}
                {(detailItem.source_media?.length > 0 || detailItem.source_image_url) && (
                  <div className="ir-detail-section">
                    <div className="ir-detail-section__label">Media ({detailItem.source_media?.length || 1} slide{(detailItem.source_media?.length || 1) > 1 ? 's' : ''})</div>
                    <div className="ir-detail-media-grid">
                      {detailItem.source_media?.length > 0 ? (
                        detailItem.source_media.map((m, i) => (
                          <div key={i} className="ir-detail-media-item">
                            {m.type === 'video' ? (
                              <div className="ir-detail-media-video">
                                <span>Video {i + 1}</span>
                                <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem' }}>Open</a>
                              </div>
                            ) : (
                              <img src={m.url} alt={`Slide ${i + 1}`} className="ir-detail-media-img" />
                            )}
                            {m.caption && <div className="ir-detail-media-caption">{m.caption}</div>}
                          </div>
                        ))
                      ) : detailItem.source_image_url ? (
                        <img src={detailItem.source_image_url} alt="" className="ir-detail-media-img" />
                      ) : null}
                    </div>
                  </div>
                )}

                {/* Caption */}
                {detailItem.source_caption && (
                  <div className="ir-detail-section">
                    <div className="ir-detail-section__label">Caption</div>
                    <div className="ir-detail-text">{detailItem.source_caption}</div>
                  </div>
                )}

                {/* AI recreation (if exists) */}
                {detailItem.recreated_text && (
                  <div className="ir-detail-section">
                    <div className="ir-detail-section__label">Recreated Version</div>
                    <div className="ir-detail-text" style={{ background: '#edf4ee', borderRadius: 8, padding: '10px 14px' }}>
                      {detailItem.recreated_text}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {detailItem.notes && (
                  <div className="ir-detail-section">
                    <div className="ir-detail-section__label">Notes</div>
                    <div className="ir-detail-text" style={{ fontStyle: 'italic' }}>{detailItem.notes}</div>
                  </div>
                )}

                {/* Tags */}
                {detailItem.tags?.length > 0 && (
                  <div className="ir-detail-section">
                    <div className="ir-lib-card__tags">
                      {detailItem.tags.map((t, i) => <span key={i} className="ir-tag">{t}</span>)}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="ir-detail-actions">
                  <Button size="sm" onClick={e => recreateForMe(e, detailItem)} disabled={quickRecreating === detailItem.id}>
                    {quickRecreating === detailItem.id ? 'Recreating...' : 'Recreate for Me'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => loadToRecreate(detailItem)}>
                    Customize & Recreate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={e => toggleFavorite(e, detailItem)}>
                    {detailItem.favorited ? '\u2605 Favorited' : '\u2606 Favorite'}
                  </Button>
                  <Button size="sm" variant="ghost" style={{ color: '#c5221f' }} onClick={() => deleteItem(detailItem)}>
                    Delete
                  </Button>
                </div>

                {/* Quick recreate result */}
                {quickResult && (
                  <div className="ir-quick-result">
                    {quickResult.suggested_hook && (
                      <div className="ir-quick-result__hook">{quickResult.suggested_hook}</div>
                    )}
                    <div className="ir-quick-result__text">{quickResult.recreated_text}</div>
                    {quickResult.suggested_hashtags && (
                      <div className="ir-quick-result__hashtags">{quickResult.suggested_hashtags}</div>
                    )}
                    {quickResult.analysis && (
                      <details className="ir-quick-result__analysis">
                        <summary>Structure Analysis</summary>
                        <div>{quickResult.analysis}</div>
                      </details>
                    )}
                    <div className="ir-quick-result__actions">
                      <Button size="sm" onClick={quickResultToComposer}>
                        Send to Composer
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copyQuickResult(quickResult.recreated_text)}>
                        {copied === 'quick' ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══ RECREATE TAB (original AI flow) ═══ */}
      {tab === 'recreate' && (
        <>
          <div className="ir-input-zone">
            <div className="ir-input-zone__label">Recreate inspiration in your voice</div>

            <div className="ir-input-row">
              <div>
                <label className="ir-field-label">Source URL (optional)</label>
                <input
                  className="ir-url-input"
                  value={sourceUrl}
                  onChange={e => setSourceUrl(e.target.value)}
                  placeholder="Paste an Instagram, TikTok, or other post URL..."
                />
              </div>
              <div>
                <label className="ir-field-label">Source Platform</label>
                <select className="ir-url-input" value={sourcePlatform} onChange={e => setSourcePlatform(e.target.value)}>
                  {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="ir-field-label">Caption / Content to Recreate *</label>
              <textarea
                className="ir-caption-input"
                value={sourceCaption}
                onChange={e => setSourceCaption(e.target.value)}
                placeholder="Paste the caption or content you want to recreate in your voice..."
              />
            </div>

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
                {aiLoading ? 'Recreating...' : 'Recreate in My Voice'}
              </Button>
            </div>
          </div>

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
                      {copied === 'recreated' ? 'Copied' : 'Copy'}
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
                <Button size="sm" variant="ghost" onClick={saveRecreationToBank}>
                  {copied === 'saved' ? 'Saved!' : 'Save to Library'}
                </Button>
                <Button size="sm" onClick={sendToComposer}>
                  Send to Composer
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

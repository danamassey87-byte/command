import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Button, Badge, SectionHeader, Input, Select } from '../../components/ui/index.jsx'
import { useMediaAssets, useIsMobile } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import supabase from '../../lib/supabase.js'

/* ── Tag Input with autocomplete ─────────────────────────────── */
function TagInput({ selectedTags, onChange, allTags }) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = useMemo(() => {
    if (!input.trim()) return allTags.filter(t => !selectedTags.includes(t)).slice(0, 12)
    const q = input.trim().toLowerCase()
    return allTags
      .filter(t => t.toLowerCase().includes(q) && !selectedTags.includes(t))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1
        const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1
        return aStarts - bStarts || a.localeCompare(b)
      })
      .slice(0, 12)
  }, [input, allTags, selectedTags])

  const exactMatch = input.trim() && allTags.some(t => t.toLowerCase() === input.trim().toLowerCase())
  const alreadySelected = input.trim() && selectedTags.some(t => t.toLowerCase() === input.trim().toLowerCase())
  const showCreateOption = input.trim() && !exactMatch && !alreadySelected

  const addTag = useCallback((tag) => {
    const trimmed = tag.trim()
    if (!trimmed || selectedTags.some(t => t.toLowerCase() === trimmed.toLowerCase())) return
    onChange([...selectedTags, trimmed])
    setInput('')
    setHighlightIdx(-1)
    inputRef.current?.focus()
  }, [selectedTags, onChange])

  const removeTag = (tag) => onChange(selectedTags.filter(t => t !== tag))

  const handleKeyDown = (e) => {
    const totalItems = suggestions.length + (showCreateOption ? 1 : 0)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setShowSuggestions(true)
      setHighlightIdx(i => (i + 1) % totalItems)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIdx(i => (i - 1 + totalItems) % totalItems)
    } else if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (highlightIdx >= 0 && highlightIdx < suggestions.length) {
        addTag(suggestions[highlightIdx])
      } else if (highlightIdx === suggestions.length && showCreateOption) {
        addTag(input.trim())
      } else if (input.trim()) {
        addTag(input.trim())
      }
    } else if (e.key === 'Backspace' && !input && selectedTags.length) {
      removeTag(selectedTags[selectedTags.length - 1])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--brown-warm)', marginBottom: 3 }}>
        Tags
      </label>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 4, padding: '5px 8px',
          border: '1px solid var(--color-border)', borderRadius: 6,
          background: '#fff', minHeight: 34, alignItems: 'center', cursor: 'text',
        }}
      >
        {selectedTags.map(t => (
          <span key={t} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: '0.7rem', padding: '2px 8px', borderRadius: 999,
            background: 'var(--cream)', border: '1px solid var(--color-border)',
            color: 'var(--brown-warm)', whiteSpace: 'nowrap',
          }}>
            {t}
            <span onClick={(e) => { e.stopPropagation(); removeTag(t) }}
              style={{ cursor: 'pointer', opacity: 0.6, fontWeight: 700, fontSize: '0.8rem', lineHeight: 1 }}>
              ×
            </span>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); setHighlightIdx(-1) }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length ? '' : 'Type to add tags...'}
          style={{
            flex: 1, minWidth: 80, border: 'none', outline: 'none',
            fontSize: '0.82rem', fontFamily: 'inherit', background: 'transparent',
            padding: '2px 0',
          }}
        />
      </div>
      {showSuggestions && (suggestions.length > 0 || showCreateOption) && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: '#fff', border: '1px solid var(--color-border)',
          borderRadius: 6, marginTop: 2, maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 4px 12px rgba(0,0,0,.08)',
        }}>
          {suggestions.map((tag, i) => (
            <div
              key={tag}
              onMouseDown={(e) => { e.preventDefault(); addTag(tag) }}
              onMouseEnter={() => setHighlightIdx(i)}
              style={{
                padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer',
                background: highlightIdx === i ? 'var(--cream-3, #F6F4EE)' : 'transparent',
                color: 'var(--brown-warm)',
              }}
            >
              {tag}
            </div>
          ))}
          {showCreateOption && (
            <div
              onMouseDown={(e) => { e.preventDefault(); addTag(input.trim()) }}
              onMouseEnter={() => setHighlightIdx(suggestions.length)}
              style={{
                padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer',
                background: highlightIdx === suggestions.length ? 'var(--cream-3, #F6F4EE)' : 'transparent',
                color: 'var(--brown-dark)', fontStyle: 'italic',
                borderTop: suggestions.length ? '1px solid var(--color-border)' : 'none',
              }}
            >
              + Create "{input.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const KIND_META = {
  photo:     { icon: '📷', label: 'Photo',     color: '#8B9A7B' },
  clip:      { icon: '🎬', label: 'Video Clip', color: '#B79782' },
  audio:     { icon: '🎙', label: 'Audio',      color: '#c99a2e' },
  graphic:   { icon: '🎨', label: 'Graphic',    color: '#5A4136' },
  voiceover: { icon: '🗣', label: 'Voiceover',  color: '#c0604a' },
}

const FILTERS = ['all', 'photo', 'clip', 'audio', 'graphic', 'voiceover']

export default function MediaLibrary() {
  const isMobile = useIsMobile()
  const { data: assets, refetch } = useMediaAssets()
  const entries = assets ?? []
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadDraft, setUploadDraft] = useState({ kind: 'photo', tags: [] })
  const fileRef = useRef(null)

  const filtered = useMemo(() => {
    let result = entries
    if (filter !== 'all') result = result.filter(a => a.kind === filter)
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        (a.tags ?? []).some(t => t.toLowerCase().includes(q)) ||
        (a.moods ?? []).some(m => m.toLowerCase().includes(q)) ||
        (a.storage_url ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [entries, filter, search])

  // Collect all unique tags across assets for autocomplete
  const allTags = useMemo(() => {
    const set = new Set()
    for (const a of entries) (a.tags ?? []).forEach(t => set.add(t))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [entries])

  // Stats
  const stats = useMemo(() => {
    const byKind = {}
    for (const a of entries) {
      byKind[a.kind] = (byKind[a.kind] || 0) + 1
    }
    const totalSize = entries.reduce((s, a) => s + (a.file_size || 0), 0)
    return { total: entries.length, byKind, totalSize }
  }, [entries])

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      // Upload to Supabase Storage
      const ext = file.name.split('.').pop()
      const path = `media/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('brand-assets').upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('brand-assets').getPublicUrl(path)
      const publicUrl = urlData?.publicUrl

      // Detect dimensions for images
      let width = null, height = null
      if (file.type.startsWith('image/')) {
        const img = new Image()
        await new Promise((resolve) => {
          img.onload = resolve
          img.src = URL.createObjectURL(file)
        })
        width = img.naturalWidth
        height = img.naturalHeight
      }

      await DB.createMediaAsset({
        kind: uploadDraft.kind,
        storage_url: publicUrl,
        width,
        height,
        file_size: file.size,
        tags: uploadDraft.tags,
      })

      setShowUpload(false)
      setUploadDraft({ kind: 'photo', tags: [] })
      if (fileRef.current) fileRef.current.value = ''
      refetch()
    } catch (e) { alert(e.message) }
    finally { setUploading(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Move this asset to trash?')) return
    try { await DB.deleteMediaAsset(id); refetch() } catch (e) { alert(e.message) }
  }

  const formatSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / 1048576).toFixed(1)}MB`
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <SectionHeader title="Media Library" subtitle="Photos, video clips, audio, and graphics for content creation" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(6, 1fr)', gap: 10, marginBottom: 16 }}>
        {Object.entries(KIND_META).map(([kind, meta]) => (
          <div key={kind} style={{
            background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: '10px 12px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.3rem' }}>{meta.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', lineHeight: 1 }}>
              {stats.byKind[kind] || 0}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {meta.label}
            </div>
          </div>
        ))}
        <div style={{
          background: 'var(--cream-3)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: '10px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '1.3rem' }}>💾</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', lineHeight: 1 }}>
            {formatSize(stats.totalSize)}
          </div>
          <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Total
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
        <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '4px 12px', fontSize: '0.72rem', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${filter === f ? 'var(--brown-dark)' : 'var(--color-border)'}`,
                background: filter === f ? 'var(--brown-dark)' : 'transparent',
                color: filter === f ? 'var(--cream)' : 'var(--brown-warm)',
              }}
            >
              {f === 'all' ? `All (${stats.total})` : `${KIND_META[f]?.icon || ''} ${stats.byKind[f] || 0}`}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tags..."
          style={{
            flex: 1, padding: '6px 12px', fontSize: '0.82rem', border: '1px solid var(--color-border)',
            borderRadius: 6, fontFamily: 'inherit', background: '#fff',
          }}
        />
        <Button onClick={() => setShowUpload(!showUpload)}>+ Upload</Button>
      </div>

      {/* Upload form */}
      {showUpload && (
        <div style={{
          padding: 14, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)',
          marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
            <Select label="Type" value={uploadDraft.kind} onChange={e => setUploadDraft(d => ({ ...d, kind: e.target.value }))} style={{ width: 140 }}>
              {Object.entries(KIND_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
            </Select>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--brown-warm)', marginBottom: 3 }}>File</label>
              <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" style={{ fontSize: '0.82rem' }} />
            </div>
          </div>
          <TagInput
            selectedTags={uploadDraft.tags}
            onChange={tags => setUploadDraft(d => ({ ...d, tags }))}
            allTags={allTags}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleUpload} disabled={uploading || !fileRef.current?.files?.length}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowUpload(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: '0.9rem' }}>{entries.length === 0 ? 'No media assets yet. Upload photos, clips, and graphics.' : 'No matches for this filter.'}</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}>
          {filtered.map(asset => {
            const meta = KIND_META[asset.kind] || KIND_META.photo
            const isImage = asset.kind === 'photo' || asset.kind === 'graphic'
            return (
              <div key={asset.id} style={{
                background: '#fff', borderRadius: 8, overflow: 'hidden',
                border: '1px solid var(--color-border)', position: 'relative',
              }}>
                {/* Thumbnail */}
                <div style={{
                  height: 140, background: 'var(--cream-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                  {isImage && asset.storage_url ? (
                    <img
                      src={asset.storage_url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <span style={{ fontSize: '2.5rem' }}>{meta.icon}</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span style={{
                      fontSize: '0.6rem', padding: '1px 6px', borderRadius: 999,
                      border: `1px solid ${meta.color}`, color: meta.color,
                      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                    }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                      {formatSize(asset.file_size)}
                    </span>
                  </div>
                  {asset.width && asset.height && (
                    <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {asset.width}×{asset.height}
                    </div>
                  )}
                  {(asset.tags ?? []).length > 0 && (
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginTop: 4 }}>
                      {asset.tags.slice(0, 3).map(t => (
                        <span key={t} style={{
                          fontSize: '0.58rem', padding: '1px 5px', borderRadius: 999,
                          background: 'var(--cream)', border: '1px solid var(--color-border)',
                          color: 'var(--brown-warm)',
                        }}>{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(asset.id)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'rgba(0,0,0,.4)', color: '#fff', border: 'none',
                    cursor: 'pointer', fontSize: '0.7rem', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', opacity: 0.7,
                  }}
                >×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

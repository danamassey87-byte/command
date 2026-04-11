import { useState, useMemo } from 'react'
import { useHashtagGroups } from '../../lib/hooks.js'

/**
 * HashtagPicker — chip-input that suggests from hashtag_groups.
 *
 * Props:
 *   value       string   — current hashtags text (space-separated #tags)
 *   onChange     fn(str)  — called with updated hashtag string
 *   platform    string?  — optional platform to show limit guidance
 *   compact     bool     — smaller variant for inline use
 */
const PLATFORM_LIMITS = {
  instagram: 30, tiktok: 15, facebook: 30, linkedin: 10,
  youtube: 15, twitter: 10, pinterest: 20, threads: 10,
}

export function HashtagPicker({ value = '', onChange, platform, compact }) {
  const { data: groups } = useHashtagGroups()
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const currentTags = useMemo(() => {
    return (value || '').split(/\s+/).filter(t => t.startsWith('#')).map(t => t.replace(/^#/, '').toLowerCase())
  }, [value])

  const allGroupTags = useMemo(() => {
    const all = []
    for (const g of (groups ?? [])) {
      for (const h of (g.hashtags || [])) {
        if (!all.includes(h)) all.push(h)
      }
    }
    return all
  }, [groups])

  const suggestions = useMemo(() => {
    const q = input.replace(/^#/, '').toLowerCase()
    if (!q) return allGroupTags.filter(h => !currentTags.includes(h)).slice(0, 15)
    return allGroupTags.filter(h => h.includes(q) && !currentTags.includes(h)).slice(0, 10)
  }, [input, allGroupTags, currentTags])

  const limit = platform ? PLATFORM_LIMITS[platform] : null
  const count = currentTags.length
  const atLimit = limit && count >= limit

  function addTag(tag) {
    const clean = tag.replace(/^#/, '').toLowerCase()
    if (!clean || currentTags.includes(clean)) return
    const updated = [...currentTags, clean].map(t => `#${t}`).join(' ')
    onChange(updated)
    setInput('')
  }

  function removeTag(tag) {
    const updated = currentTags.filter(t => t !== tag).map(t => `#${t}`).join(' ')
    onChange(updated)
  }

  function addGroupTags(group) {
    const newTags = (group.hashtags || []).filter(h => !currentTags.includes(h))
    const combined = [...currentTags, ...newTags]
    const limited = limit ? combined.slice(0, limit) : combined
    onChange(limited.map(t => `#${t}`).join(' '))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (input.trim()) addTag(input.trim())
    }
  }

  const fontSize = compact ? '0.75rem' : '0.82rem'
  const chipPad = compact ? '2px 7px' : '4px 10px'

  return (
    <div style={{ position: 'relative' }}>
      {/* Current tags */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {currentTags.map((t, i) => (
          <span
            key={i}
            onClick={() => removeTag(t)}
            style={{
              padding: chipPad, borderRadius: 5, fontSize,
              background: '#f0ece7', color: '#5b8fa8', cursor: 'pointer',
            }}
            title="Click to remove"
          >
            #{t} &times;
          </span>
        ))}
        {limit && (
          <span style={{ fontSize: '0.7rem', color: atLimit ? '#c5221f' : 'var(--color-text-muted)', alignSelf: 'center', marginLeft: 4 }}>
            {count}/{limit}
          </span>
        )}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 4 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={atLimit ? `Limit reached (${limit})` : 'Type to add or search...'}
          disabled={atLimit}
          style={{
            flex: 1, padding: '6px 10px', border: '1px solid #e0dbd6', borderRadius: 6,
            fontSize, fontFamily: 'inherit', color: 'var(--brown-dark)', outline: 'none',
          }}
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && !atLimit && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
          background: '#fff', border: '1px solid #e8e3de', borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: 200, overflowY: 'auto',
          marginTop: 4,
        }}>
          {/* Quick-add group buttons */}
          {(groups ?? []).length > 0 && !input && (
            <div style={{ padding: '6px 10px', borderBottom: '1px solid #f0ece7' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 4 }}>
                Add entire group
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(groups ?? []).map(g => (
                  <button
                    key={g.id}
                    onMouseDown={e => { e.preventDefault(); addGroupTags(g) }}
                    style={{
                      padding: '2px 8px', borderRadius: 4, border: '1px solid #e0dbd6',
                      background: '#faf8f5', fontSize: '0.72rem', cursor: 'pointer',
                      color: 'var(--brown-dark)',
                    }}
                  >
                    {g.name} ({(g.hashtags || []).length})
                  </button>
                ))}
              </div>
            </div>
          )}
          {suggestions.map((h, i) => (
            <div
              key={i}
              onMouseDown={e => { e.preventDefault(); addTag(h) }}
              style={{
                padding: '6px 12px', fontSize, cursor: 'pointer', color: '#5b8fa8',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#faf8f5'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              #{h}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

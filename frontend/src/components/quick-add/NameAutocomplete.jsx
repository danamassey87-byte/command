import { useState, useEffect, useRef, useMemo } from 'react'
import { useContacts } from '../../lib/hooks'
import { normalizeName, nameSimilarity } from '../../lib/duplicates'
import './quick-add.css'

const STRONG_MATCH = 0.78  // similarity at which we treat as a probable duplicate
const SHOW_IN_DROPDOWN = 0.45 // looser bar — show in suggestions

/**
 * Name combobox: typing filters saved contacts live and blocks save
 * if a strong match exists and the user hasn't either picked it or
 * explicitly chosen "create new anyway".
 *
 * Props:
 *  - value, onChange      — controlled input
 *  - selectedId           — id of an existing contact this input is linked to
 *  - onSelectExisting(c)  — fired when user picks from dropdown
 *  - forceNew             — parent state: user explicitly chose "create new"
 *  - onForceNew()         — fired when user clicks "create as new"
 *  - onDuplicateState(b)  — fired with true/false: parent should block save when true
 *  - excludeIds           — contact ids to omit from matching (e.g. when editing)
 */
export default function NameAutocomplete({
  label = 'Full name *',
  value,
  onChange,
  selectedId = null,
  onSelectExisting,
  forceNew = false,
  onForceNew,
  onDuplicateState,
  excludeIds = [],
  autoFocus = false,
  placeholder = 'Jane Smith',
}) {
  const { data: contacts } = useContacts()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Score every contact against the typed name
  const scored = useMemo(() => {
    if (!contacts) return []
    const q = normalizeName(value || '')
    if (q.length < 2) return []
    const exclude = new Set(excludeIds)
    return contacts
      .filter(c => !exclude.has(c.id))
      .map(c => ({ ...c, score: nameSimilarity(value, c.name) }))
      .filter(c => c.score >= SHOW_IN_DROPDOWN)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
  }, [contacts, value, excludeIds])

  const strongMatches = useMemo(
    () => scored.filter(c => c.score >= STRONG_MATCH),
    [scored]
  )

  // Tell parent whether save should be blocked
  const blocked = !selectedId && !forceNew && strongMatches.length > 0
  useEffect(() => {
    onDuplicateState?.(blocked)
  }, [blocked, onDuplicateState])

  useEffect(() => { setHighlight(0) }, [scored.length])

  const handleSelect = (c) => {
    onSelectExisting?.(c)
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && scored.length) {
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, scored.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && scored[highlight]) {
      e.preventDefault()
      handleSelect(scored[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const typeBadge = (t, intent) => {
    if (t === 'lead') return `lead${intent ? ` · ${intent}` : ''}`
    return t || 'contact'
  }

  return (
    <div className="ac" ref={wrapRef}>
      <label className="ac__label">{label}</label>
      <div className="ac__input-wrap">
        <input
          ref={inputRef}
          className={`ac__input ${selectedId ? 'ac__input--linked' : ''} ${blocked ? 'ac__input--blocked' : ''}`}
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {selectedId && (
          <span className="ac__linked-badge" title="Linked to existing contact">✓ linked</span>
        )}
      </div>

      {open && scored.length > 0 && (
        <ul className="ac__dropdown" role="listbox">
          {scored.map((c, idx) => (
            <li
              key={c.id}
              role="option"
              aria-selected={idx === highlight}
              className={`ac__option ${idx === highlight ? 'ac__option--active' : ''} ${c.id === selectedId ? 'ac__option--selected' : ''}`}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(c) }}
            >
              <div className="ac__option-main">
                <span className="ac__option-icon">👤</span>
                <div className="ac__option-body">
                  <div className="ac__option-address">{c.name}</div>
                  <div className="ac__option-meta">
                    {[c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                    <span className="ac__option-status">{typeBadge(c.type, c.lead_intent)}</span>
                    <span className="ac__option-status ac__option-score">{Math.round(c.score * 100)}%</span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Inline blocking warning when there's a strong match user hasn't acknowledged */}
      {blocked && (
        <div className="ac__block">
          <div className="ac__block-text">
            ⚠️ Looks like a possible duplicate. Pick the existing contact above, or:
          </div>
          <button
            type="button"
            className="ac__block-btn"
            onClick={() => onForceNew?.()}
          >
            Create as new contact anyway
          </button>
        </div>
      )}

      {forceNew && !selectedId && (
        <div className="ac__forced">
          Will create as a new contact.
          <button type="button" className="qa-pill__clear" onClick={() => onForceNew?.(false)}>Undo</button>
        </div>
      )}
    </div>
  )
}

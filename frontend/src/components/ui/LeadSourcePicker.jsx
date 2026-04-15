import { useState, useRef, useEffect, useCallback } from 'react'
import { getDropdownLists, addDropdownItem } from '../../lib/supabase.js'
import './LeadSourcePicker.css'

const DEFAULT_SOURCES = [
  'Referral', 'Open House', 'CertiLead', 'Expired Listing', 'Cannonball',
  'Zillow', 'Realtor.com', 'Sphere of Influence', 'Past Client', 'FSBO',
  'Door Knocking', 'Sign Call', 'Instagram', 'Facebook', 'Website',
  'Cold Call', 'Google', 'Walk-in', 'Client', 'Other',
]

export default function LeadSourcePicker({ label = 'Lead Source', value, onChange, placeholder = 'Type or select a source…' }) {
  const [options, setOptions] = useState(DEFAULT_SOURCES)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  // Load persisted sources
  useEffect(() => {
    getDropdownLists()
      .then(lists => {
        const saved = Array.isArray(lists?.lead_sources) ? lists.lead_sources : []
        // Merge: saved + defaults, deduplicated
        const merged = [...new Set([...saved, ...DEFAULT_SOURCES])]
        setOptions(merged.sort((a, b) => a.localeCompare(b)))
      })
      .catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options

  const exactMatch = options.some(o => o.toLowerCase() === query.trim().toLowerCase())
  const showAddNew = query.trim().length > 0 && !exactMatch

  const select = useCallback((val) => {
    onChange?.(val)
    setQuery('')
    setOpen(false)
  }, [onChange])

  const addNew = useCallback(async () => {
    const v = query.trim()
    if (!v) return
    setSaving(true)
    try {
      await addDropdownItem('lead_sources', v)
      setOptions(prev => [...new Set([...prev, v])].sort((a, b) => a.localeCompare(b)))
      select(v)
    } catch (err) {
      console.error('Failed to add source:', err)
    } finally {
      setSaving(false)
    }
  }, [query, select])

  const handleInputChange = (e) => {
    setQuery(e.target.value)
    if (!open) setOpen(true)
  }

  const handleFocus = () => setOpen(true)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length === 1) {
        select(filtered[0])
      } else if (showAddNew) {
        addNew()
      }
    }
    if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    }
  }

  const handleClear = () => {
    onChange?.('')
    setQuery('')
    inputRef.current?.focus()
  }

  return (
    <div className="field lsp" ref={wrapRef}>
      {label && <label className="field__label">{label}</label>}
      <div className="lsp__input-wrap">
        <input
          ref={inputRef}
          type="text"
          className="field__input"
          value={open ? query : (value || '')}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={value ? value : placeholder}
          autoComplete="off"
        />
        {value && !open && (
          <button type="button" className="lsp__clear" onClick={handleClear} title="Clear">×</button>
        )}
      </div>

      {open && (
        <div className="lsp__dropdown">
          {filtered.length === 0 && !showAddNew && (
            <div className="lsp__empty">No sources match</div>
          )}
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              className={`lsp__option ${opt === value ? 'lsp__option--selected' : ''}`}
              onClick={() => select(opt)}
            >
              {opt}
            </button>
          ))}
          {showAddNew && (
            <button
              type="button"
              className="lsp__option lsp__option--add"
              onClick={addNew}
              disabled={saving}
            >
              {saving ? 'Saving…' : `+ Add "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

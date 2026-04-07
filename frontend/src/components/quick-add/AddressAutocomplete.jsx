import { useState, useEffect, useRef, useMemo } from 'react'
import { useProperties } from '../../lib/hooks'
import { normalizeAddress } from '../../lib/duplicates'
import { validateAddress } from '../../lib/supabase'
import './quick-add.css'

/**
 * Address combobox: typing filters the user's saved properties live.
 * - onChange(value) fires for every keystroke
 * - onSelectExisting(property) fires when the user picks from the dropdown
 * - clearing the input or editing it resets onSelectExisting parent state
 */
export default function AddressAutocomplete({
  label = 'Address *',
  value,
  onChange,
  onSelectExisting,
  placeholder = '1234 N Main St',
  autoFocus = false,
  selectedId = null,
  // Optional sibling fields used to improve USPS validation accuracy
  city,
  state,
  zip,
  // Called when the user accepts a USPS-standardized address.
  // Receives { address, city, state, zip, zipPlus4, county }.
  onUspsAccepted,
}) {
  const { data: properties } = useProperties()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [verifying, setVerifying] = useState(false)
  const [uspsResult, setUspsResult] = useState(null) // { suggestion, deliverable } | null
  const [uspsError, setUspsError] = useState(null)
  const [verifiedKey, setVerifiedKey] = useState(null) // dedup signature so we don't re-verify
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Filter properties as the user types (normalized comparison)
  const matches = useMemo(() => {
    if (!properties) return []
    const q = normalizeAddress(value || '')
    if (q.length < 2) return properties.slice(0, 8) // show recents on focus
    return properties
      .map(p => ({ p, na: normalizeAddress(p.address) }))
      .filter(({ na }) => na.includes(q) || q.includes(na.split(' ')[0]))
      .sort((a, b) => {
        // Exact match → starts-with → includes
        const aExact = a.na === q ? 0 : a.na.startsWith(q) ? 1 : 2
        const bExact = b.na === q ? 0 : b.na.startsWith(q) ? 1 : 2
        return aExact - bExact
      })
      .slice(0, 8)
      .map(({ p }) => p)
  }, [properties, value])

  // Reset highlight when matches change
  useEffect(() => { setHighlight(0) }, [matches.length])

  const handleSelect = (p) => {
    onSelectExisting?.(p)
    setOpen(false)
    inputRef.current?.blur()
  }

  // ─── USPS verification ────────────────────────────────────────────────
  const canVerify = (value || '').trim().length >= 5 && (
    (zip || '').trim().length >= 5 || ((city || '').trim() && (state || '').trim())
  )

  const verifyKey = `${value}|${city || ''}|${state || ''}|${zip || ''}`

  const runVerify = async () => {
    if (!canVerify || verifying || selectedId) return
    if (verifyKey === verifiedKey) return
    setVerifying(true)
    setUspsError(null)
    try {
      const res = await validateAddress({ address: value, city, state, zip })
      setVerifiedKey(verifyKey)
      if (!res || res.valid === false) {
        setUspsResult(null)
        setUspsError(res?.reason || 'USPS could not match this address')
        return
      }
      const s = res.standardized || {}
      const fullStreet = [s.streetAddress, s.secondaryAddress].filter(Boolean).join(' ')
      const currentNorm = normalizeAddress(value)
      const suggestedNorm = normalizeAddress(fullStreet)
      const cityChanged = (city || '').trim().toLowerCase() !== (s.city || '').toLowerCase()
      const zipChanged = (zip || '').replace(/\D/g, '').slice(0, 5) !== (s.zip || '').slice(0, 5)
      const differs = currentNorm !== suggestedNorm || cityChanged || zipChanged
      if (!differs) {
        // Address already matches USPS — silent success
        setUspsResult({ deliverable: res.deliverable, exact: true, suggestion: { ...s, fullStreet } })
      } else {
        setUspsResult({ deliverable: res.deliverable, exact: false, suggestion: { ...s, fullStreet } })
      }
    } catch (err) {
      console.error('USPS verify failed:', err)
      setUspsError(err.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const acceptUspsSuggestion = () => {
    const s = uspsResult?.suggestion
    if (!s) return
    onChange?.(s.fullStreet)
    onUspsAccepted?.({
      address: s.fullStreet,
      city: s.city,
      state: s.state,
      zip: s.zip,
      zipPlus4: s.zipPlus4,
      county: s.county,
    })
    setUspsResult({ ...uspsResult, exact: true })
  }

  const dismissUspsSuggestion = () => {
    setUspsResult(null)
  }

  // Reset verification when input changes
  useEffect(() => {
    if (verifyKey !== verifiedKey) {
      setUspsResult(null)
      setUspsError(null)
    }
  }, [verifyKey, verifiedKey])

  const handleKey = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight(h => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && matches[highlight]) {
      e.preventDefault()
      handleSelect(matches[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="ac" ref={wrapRef}>
      <label className="ac__label">{label}</label>
      <div className="ac__input-wrap">
        <input
          ref={inputRef}
          className={`ac__input ${selectedId ? 'ac__input--linked' : ''}`}
          type="text"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => { setTimeout(runVerify, 150) }}
          onKeyDown={handleKey}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />
        {selectedId && (
          <span className="ac__linked-badge" title="Linked to existing property">✓ linked</span>
        )}
        {verifying && (
          <span className="ac__usps-pill ac__usps-pill--verifying">Checking USPS…</span>
        )}
        {!verifying && uspsResult?.exact && (
          <span className="ac__usps-pill ac__usps-pill--ok" title={uspsResult.deliverable ? 'USPS verified — deliverable' : 'USPS verified'}>
            ✓ USPS{uspsResult.deliverable ? '' : ' (no DPV)'}
          </span>
        )}
      </div>

      {!verifying && uspsResult && !uspsResult.exact && (
        <div className="ac__usps-suggest">
          <div className="ac__usps-suggest__head">USPS suggests:</div>
          <div className="ac__usps-suggest__body">
            <div className="ac__usps-suggest__addr">
              {uspsResult.suggestion.fullStreet}
            </div>
            <div className="ac__usps-suggest__meta">
              {[uspsResult.suggestion.city, uspsResult.suggestion.state].filter(Boolean).join(', ')}
              {' '}
              {uspsResult.suggestion.zip}
              {uspsResult.suggestion.zipPlus4 ? `-${uspsResult.suggestion.zipPlus4}` : ''}
            </div>
          </div>
          <div className="ac__usps-suggest__actions">
            <button type="button" className="ac__usps-btn ac__usps-btn--accept" onClick={acceptUspsSuggestion}>
              Use this
            </button>
            <button type="button" className="ac__usps-btn ac__usps-btn--keep" onClick={dismissUspsSuggestion}>
              Keep mine
            </button>
          </div>
        </div>
      )}
      {!verifying && uspsError && !uspsResult && (
        <div className="ac__usps-warn">⚠️ {uspsError}</div>
      )}

      {open && matches.length > 0 && (
        <ul className="ac__dropdown" role="listbox">
          {matches.map((p, idx) => (
            <li
              key={p.id}
              role="option"
              aria-selected={idx === highlight}
              className={`ac__option ${idx === highlight ? 'ac__option--active' : ''} ${p.id === selectedId ? 'ac__option--selected' : ''}`}
              onMouseEnter={() => setHighlight(idx)}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
            >
              <div className="ac__option-main">
                <span className="ac__option-icon">📍</span>
                <div className="ac__option-body">
                  <div className="ac__option-address">{p.address}</div>
                  <div className="ac__option-meta">
                    {[p.city, p.state, p.zip].filter(Boolean).join(', ') || '—'}
                    {p.status && <span className="ac__option-status">{p.status}</span>}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && matches.length === 0 && value.trim().length >= 2 && (
        <div className="ac__empty">
          No saved properties match — will create a new one.
        </div>
      )}
    </div>
  )
}

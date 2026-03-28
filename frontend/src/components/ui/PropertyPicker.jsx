import { useState, useEffect } from 'react'
import { useProperties } from '../../lib/hooks'
import './PropertyPicker.css'

/**
 * PropertyPicker — dropdown to select from your saved properties.
 * Returns the full property object to the caller via onSelect.
 *
 * Props:
 *  - onSelect(property)  — called when a property is chosen
 *  - label               — optional label text
 *  - placeholder         — optional placeholder
 *  - compact             — smaller version for inline use
 */
export function PropertyPicker({ onSelect, label, placeholder = 'Choose a property...', compact = false }) {
  const { data: properties, loading } = useProperties()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const list = (properties ?? []).filter(p => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      (p.address ?? '').toLowerCase().includes(q) ||
      (p.city ?? '').toLowerCase().includes(q) ||
      (p.mls_id ?? '').toLowerCase().includes(q)
    )
  })

  const handleSelect = (property) => {
    onSelect(property)
    setOpen(false)
    setSearch('')
  }

  if (loading) {
    return (
      <div className={`pp ${compact ? 'pp--compact' : ''}`}>
        {label && <span className="pp__label">{label}</span>}
        <div className="pp__trigger pp__trigger--loading">Loading properties...</div>
      </div>
    )
  }

  if (!properties?.length) {
    return (
      <div className={`pp ${compact ? 'pp--compact' : ''}`}>
        {label && <span className="pp__label">{label}</span>}
        <div className="pp__trigger pp__trigger--empty">No properties saved yet</div>
      </div>
    )
  }

  return (
    <div className={`pp ${compact ? 'pp--compact' : ''}`}>
      {label && <span className="pp__label">{label}</span>}
      <button className="pp__trigger" onClick={() => setOpen(!open)} type="button">
        <span>📍 {placeholder}</span>
        <span className="pp__arrow">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="pp__dropdown">
          <input
            className="pp__search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search address, city, MLS#..."
            autoFocus
          />
          <div className="pp__list">
            {list.length === 0 && (
              <div className="pp__empty">No matching properties</div>
            )}
            {list.map(p => (
              <button key={p.id} className="pp__item" onClick={() => handleSelect(p)} type="button">
                <div className="pp__item-main">
                  <span className="pp__item-address">{p.address}</span>
                  <span className="pp__item-city">{[p.city, 'AZ', p.zip].filter(Boolean).join(', ')}</span>
                </div>
                <div className="pp__item-meta">
                  {p.price && <span className="pp__item-price">${Number(p.price).toLocaleString()}</span>}
                  <span className="pp__item-specs">
                    {[
                      p.bedrooms && `${p.bedrooms}bd`,
                      p.bathrooms && `${p.bathrooms}ba`,
                      p.sqft && `${Number(p.sqft).toLocaleString()}sf`,
                    ].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

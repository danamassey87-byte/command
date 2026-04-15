import { useState, useRef } from 'react'
import './StyleControls.css'

// ─── Brand colors from the app ───
const BRAND_COLORS = [
  { name: 'Dark', value: '#3A2A1E' },
  { name: 'Mid', value: '#b79782' },
  { name: 'Cream', value: '#efede8' },
  { name: 'White', value: '#ffffff' },
]

// Pre-mixed brand combos
const BRAND_MIXES = [
  { name: 'Warm Blend', value: 'linear-gradient(135deg, #3A2A1E, #b79782)', flat: '#7a6c5c' },
  { name: 'Soft Fade', value: 'linear-gradient(135deg, #b79782, #efede8)', flat: '#d3c2b5' },
  { name: 'Deep Cream', value: 'linear-gradient(135deg, #3A2A1E, #efede8)', flat: '#a1978f' },
  { name: 'Espresso', value: 'linear-gradient(135deg, #3A2A1E, #7a5f48)', flat: '#664d40' },
  { name: 'Blush', value: 'linear-gradient(135deg, #b79782, #d4b8a6)', flat: '#c6a894' },
  { name: 'Latte', value: 'linear-gradient(135deg, #efede8, #d4c8be)', flat: '#e2dad3' },
]

// ─── Brand Color Picker ───
export function BrandColorPicker({ value, onChange, label, showMixes = false, showGradients = false }) {
  const [mode, setMode] = useState('brand') // brand | mix | custom

  return (
    <div className="sc-color">
      {label && <span className="sc-label">{label}</span>}
      <div className="sc-color__tabs">
        <button className={`sc-color__tab ${mode === 'brand' ? 'sc-color__tab--active' : ''}`} onClick={() => setMode('brand')}>Brand</button>
        {showMixes && <button className={`sc-color__tab ${mode === 'mix' ? 'sc-color__tab--active' : ''}`} onClick={() => setMode('mix')}>Mix</button>}
        <button className={`sc-color__tab ${mode === 'custom' ? 'sc-color__tab--active' : ''}`} onClick={() => setMode('custom')}>Custom</button>
      </div>

      {mode === 'brand' && (
        <div className="sc-color__swatches">
          {BRAND_COLORS.map(c => (
            <button
              key={c.value}
              className={`sc-color__swatch ${value === c.value ? 'sc-color__swatch--active' : ''}`}
              style={{ background: c.value, borderColor: c.value === '#ffffff' ? '#ddd' : c.value }}
              onClick={() => onChange(c.value)}
              title={c.name}
            />
          ))}
        </div>
      )}

      {mode === 'mix' && showMixes && (
        <div className="sc-color__mixes">
          {BRAND_MIXES.map(m => (
            <button
              key={m.name}
              className={`sc-color__mix-swatch ${value === m.flat ? 'sc-color__swatch--active' : ''}`}
              style={{ background: m.value }}
              onClick={() => onChange(showGradients ? m.value : m.flat)}
              title={m.name}
            >
              <span className="sc-color__mix-label">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {mode === 'custom' && (
        <div className="sc-color__custom">
          <input
            type="color"
            value={value?.startsWith('#') ? value : '#3A2A1E'}
            onChange={e => onChange(e.target.value)}
            className="sc-color__input"
          />
          <input
            type="text"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            className="sc-color__hex"
            placeholder="#3A2A1E"
            maxLength={7}
          />
        </div>
      )}
    </div>
  )
}

// ─── Border Radius Control ───
const RADIUS_PRESETS = [
  { name: 'Square', value: 0, icon: '◻' },
  { name: 'Slight', value: 6, icon: '▢' },
  { name: 'Rounded', value: 12, icon: '⬜' },
  { name: 'More', value: 20, icon: '⬜' },
  { name: 'Pill', value: 9999, icon: '💊' },
]

export function BorderRadiusControl({ value = 0, onChange, label, max = 50, showPill = true }) {
  const presets = showPill ? RADIUS_PRESETS : RADIUS_PRESETS.filter(p => p.value !== 9999)

  return (
    <div className="sc-radius">
      {label && <span className="sc-label">{label}</span>}
      <div className="sc-radius__presets">
        {presets.map(p => (
          <button
            key={p.name}
            className={`sc-radius__preset ${value === p.value ? 'sc-radius__preset--active' : ''}`}
            onClick={() => onChange(p.value)}
            title={p.name}
          >
            <span className="sc-radius__preview" style={{ borderRadius: p.value === 9999 ? 9999 : Math.min(p.value, 12) }} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      {value !== 9999 && (
        <div className="sc-radius__slider-row">
          <input
            type="range"
            min={0}
            max={max}
            value={Math.min(value, max)}
            onChange={e => onChange(+e.target.value)}
            className="sc-radius__slider"
          />
          <span className="sc-radius__val">{value}px</span>
        </div>
      )}
    </div>
  )
}

// ─── Font Picker ───
const BUILT_IN_FONTS = [
  { name: 'Nunito Sans', value: "'Nunito Sans', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Playfair Display', value: "'Playfair Display', Georgia, serif" },
  { name: 'Cormorant Garamond', value: "'Cormorant Garamond', Georgia, serif" },
  { name: 'Cormorant (Script)', value: "'Cormorant', 'Cormorant Garamond', Georgia, serif" },
  { name: 'Georgia', value: "Georgia, serif" },
  { name: 'Arial', value: "Arial, sans-serif" },
  { name: 'Helvetica', value: "Helvetica, Arial, sans-serif" },
  { name: 'Times New Roman', value: "'Times New Roman', serif" },
  { name: 'Courier New', value: "'Courier New', monospace" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'Raleway', value: "'Raleway', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
]

export function FontPicker({ value, onChange, label, customFonts = [] }) {
  return (
    <div className="sc-font">
      {label && <span className="sc-label">{label}</span>}
      <select value={value || ''} onChange={e => onChange(e.target.value)} className="sc-font__select">
        <option value="">Inherit / Default</option>
        {BUILT_IN_FONTS.map(f => (
          <option key={f.name} value={f.value} style={{ fontFamily: f.value }}>{f.name}</option>
        ))}
        {customFonts.length > 0 && (
          <>
            <option disabled>── Custom ──</option>
            {customFonts.map(f => (
              <option key={f.name} value={`'${f.name}', sans-serif`}>{f.name}</option>
            ))}
          </>
        )}
      </select>
    </div>
  )
}

// ─── Font Size Control ───
export function FontSizeControl({ value, onChange, label, min = 10, max = 48 }) {
  return (
    <div className="sc-fontsize">
      {label && <span className="sc-label">{label}</span>}
      <div className="sc-fontsize__row">
        <input
          type="range"
          min={min}
          max={max}
          value={value || 14}
          onChange={e => onChange(+e.target.value)}
          className="sc-fontsize__slider"
        />
        <span className="sc-fontsize__val">{value || 14}px</span>
      </div>
    </div>
  )
}

// ─── Spacing Control ───
export function SpacingControl({ value, onChange, label, min = 0, max = 40 }) {
  return (
    <div className="sc-spacing">
      {label && <span className="sc-label">{label}</span>}
      <div className="sc-spacing__row">
        <input
          type="range"
          min={min}
          max={max}
          value={value || 0}
          onChange={e => onChange(+e.target.value)}
          className="sc-spacing__slider"
        />
        <span className="sc-spacing__val">{value || 0}px</span>
      </div>
    </div>
  )
}

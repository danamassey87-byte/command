import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps, placeToProperty } from '../../lib/googleMaps.js'
import './AddressAutocomplete.css'

/**
 * AddressAutocomplete — a text input backed by Google Places Autocomplete.
 * Returns the normalized property shape via onSelect().
 *
 * Props:
 *  - value           — controlled string value
 *  - onChange(str)   — fires on every keystroke
 *  - onSelect(place) — fires when the user picks a suggestion; receives the
 *                       placeToProperty() output (address, city, zip, lat, lng, google_place_id, ...)
 *  - label           — optional field label
 *  - placeholder     — optional placeholder text
 *  - error           — optional error string to display
 *  - bias            — optional { lat, lng, radius_meters } to bias results
 *  - country         — ISO country code to restrict (default 'us')
 */
export function AddressAutocomplete({
  value = '',
  onChange,
  onSelect,
  label,
  id = 'address-autocomplete',
  placeholder = 'Start typing an address...',
  error,
  bias,
  country = 'us',
  className = '',
  disabled,
  autoFocus,
}) {
  const inputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !inputRef.current) return
        const options = {
          types: ['address'],
          componentRestrictions: { country },
          fields: ['place_id', 'formatted_address', 'address_components', 'geometry', 'name'],
        }
        if (bias) {
          options.bounds = new google.maps.Circle({
            center: { lat: bias.lat, lng: bias.lng },
            radius: bias.radius_meters || 50_000,
          }).getBounds()
          options.strictBounds = false
        }
        const ac = new google.maps.places.Autocomplete(inputRef.current, options)
        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (!place || !place.place_id) return
          const normalized = placeToProperty(place)
          if (normalized) {
            onSelect?.(normalized)
            onChange?.(normalized.formatted_address || normalized.address)
          }
        })
        autocompleteRef.current = ac
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        console.error('Google Maps load failed:', e)
        setLoadError(e.message)
        setLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`field ${className}`}>
      {label && <label className="field__label" htmlFor={id}>{label}</label>}
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={`field__input ${error ? 'field__input--error' : ''}`}
        placeholder={loading ? 'Loading address lookup...' : placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={disabled || loading}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {error && <p className="field__error">{error}</p>}
      {loadError && (
        <p className="field__error">
          Address lookup unavailable. Check VITE_GOOGLE_MAPS_API_KEY.
        </p>
      )}
    </div>
  )
}

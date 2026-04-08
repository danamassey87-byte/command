/**
 * Lightweight Google Maps JavaScript API loader.
 * Caches the promise so multiple callers share a single script load.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const LIBRARIES = ['places', 'geocoding', 'marker']

let loaderPromise = null

export function loadGoogleMaps() {
  if (!API_KEY) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'))
  }

  if (loaderPromise) return loaderPromise

  loaderPromise = new Promise((resolve, reject) => {
    // Already loaded
    if (typeof window.google !== 'undefined' && window.google.maps) {
      resolve(window.google)
      return
    }

    // Unique callback name so Google's script fires it when ready
    const callbackName = `__gmapsCallback_${Date.now()}`
    window[callbackName] = () => {
      resolve(window.google)
      try { delete window[callbackName] } catch { /* noop */ }
    }

    const script = document.createElement('script')
    const params = new URLSearchParams({
      key: API_KEY,
      libraries: LIBRARIES.join(','),
      callback: callbackName,
      v: 'weekly',
    })
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.async = true
    script.defer = true
    script.onerror = (e) => {
      loaderPromise = null
      reject(new Error('Failed to load Google Maps JavaScript API'))
    }
    document.head.appendChild(script)
  })

  return loaderPromise
}

/**
 * Geocode a free-form address string → { lat, lng, place_id, formatted_address, components }
 * Uses the client-side Geocoder (counts toward Geocoding API quota).
 */
export async function geocodeAddress(address) {
  const google = await loadGoogleMaps()
  const geocoder = new google.maps.Geocoder()
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status !== 'OK' || !results?.length) {
        reject(new Error(`Geocode failed: ${status}`))
        return
      }
      const r = results[0]
      const components = {}
      r.address_components.forEach(c => {
        c.types.forEach(t => { components[t] = c.short_name })
      })
      resolve({
        place_id: r.place_id,
        formatted_address: r.formatted_address,
        lat: r.geometry.location.lat(),
        lng: r.geometry.location.lng(),
        street_number: components.street_number || '',
        route: components.route || '',
        city: components.locality || components.sublocality || '',
        state: components.administrative_area_level_1 || '',
        zip: components.postal_code || '',
        country: components.country || '',
      })
    })
  })
}

/**
 * Normalize a Google Place result into our internal property shape.
 * Accepts either a PlaceResult from Autocomplete or a GeocoderResult from Geocoder.
 */
export function placeToProperty(place) {
  if (!place) return null
  const components = {}
  ;(place.address_components || []).forEach(c => {
    c.types.forEach(t => { components[t] = c.short_name })
  })

  const streetNumber = components.street_number || ''
  const route = components.route || ''
  const address = [streetNumber, route].filter(Boolean).join(' ').trim()

  // place.geometry.location can be a LatLng object or a plain { lat, lng }
  const loc = place.geometry?.location
  const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat
  const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng

  return {
    google_place_id:   place.place_id,
    formatted_address: place.formatted_address || '',
    address:           address || place.formatted_address || '',
    city:              components.locality || components.sublocality || '',
    state:             components.administrative_area_level_1 || 'AZ',
    zip:               components.postal_code || '',
    county:            components.administrative_area_level_2 || '',
    neighborhood:      components.neighborhood || '',
    subdivision:       components.sublocality_level_1 || '',
    latitude:          lat ?? null,
    longitude:         lng ?? null,
  }
}

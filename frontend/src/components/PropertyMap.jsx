import { useEffect, useRef, useState, useMemo } from 'react'
import { loadGoogleMaps, geocodeAddress } from '../lib/googleMaps.js'
import './PropertyMap.css'

const GILBERT_CENTER = { lat: 33.3528, lng: -111.789 }
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// ─── Brand-styled map theme ──────────────────────────────────────────────────
const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#f5f1eb' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5A4136' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#EFEDE8' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e8e3db' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d9d1c5' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c8bfb2' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d5e0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4dece' }] },
  { featureType: 'poi.school', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.business', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

// ─── Geocode cache ────────────────────────────────────────────────────────────
const geoCache = {}

async function geocodeCached(address) {
  if (!address) return null
  if (geoCache[address]) return geoCache[address]
  try {
    const result = await geocodeAddress(address)
    geoCache[address] = { lat: result.lat, lng: result.lng }
    return geoCache[address]
  } catch {
    return null
  }
}

// ─── Custom SVG pin path ──────────────────────────────────────────────────────
const PIN_PATH = 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z'

function fmtPrice(n) {
  if (!n) return ''
  const num = Number(n)
  if (isNaN(num)) return ''
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `$${Math.round(num / 1_000).toLocaleString()}K`
  return `$${num.toLocaleString()}`
}

/**
 * PropertyMap — Brand-styled Google Map for properties.
 *
 * Props:
 *   properties    — array of { address, city?, lat/latitude?, lng/longitude?, price?, type?, status? }
 *   title         — optional header title (default: "Properties")
 *   center        — { lat, lng } override (default: Gilbert, AZ)
 *   zoom          — initial zoom (default: auto-fit)
 *   height        — map height (default: "340px")
 *   singleMarker  — if true, renders a single property without header
 *   showHeader    — show/hide header (default: true unless singleMarker)
 *   onMarkerClick — callback(property) when marker is clicked
 */
export default function PropertyMap({
  properties = [],
  title = 'Properties',
  center,
  zoom,
  height = '340px',
  singleMarker = false,
  showHeader,
  onMarkerClick,
}) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const infoRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)
  const [mapType, setMapType] = useState('roadmap')

  const displayHeader = showHeader !== undefined ? showHeader : !singleMarker

  // Resolve lat/lng for each property (prefer stored, fallback to geocode)
  const resolvedProps = useMemo(() => properties.filter(p => p?.address), [properties])

  // ─── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    loadGoogleMaps().then(google => {
      if (cancelled || !mapRef.current) return

      const mapCenter = center || GILBERT_CENTER
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: mapCenter,
        zoom: zoom || (singleMarker ? 15 : 11),
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: MAP_STYLES,
        gestureHandling: singleMarker ? 'cooperative' : 'greedy',
      })

      infoRef.current = new google.maps.InfoWindow({ disableAutoPan: false })

      setReady(true)
    }).catch(e => setError(e.message))

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Place markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready || !mapInstance.current) return
    const google = window.google

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    if (resolvedProps.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    let placed = 0
    const expectedCount = resolvedProps.filter(p => p.address).length

    resolvedProps.forEach(async (prop) => {
      // Prefer stored lat/lng
      let pos = null
      const lat = Number(prop.lat ?? prop.latitude)
      const lng = Number(prop.lng ?? prop.longitude)
      if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
        pos = { lat, lng }
      } else {
        const city = prop.city || ''
        const fullAddr = city ? `${prop.address}, ${city}, AZ` : `${prop.address}, AZ`
        pos = await geocodeCached(fullAddr)
      }
      if (!pos || !mapInstance.current) return

      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        icon: {
          path: PIN_PATH,
          fillColor: '#3A2A1E',
          fillOpacity: 1,
          strokeColor: '#B79782',
          strokeWeight: 1.5,
          scale: singleMarker ? 1.8 : 1.4,
          anchor: new google.maps.Point(12, 22),
        },
        title: prop.address,
      })

      // Info window content
      const priceStr = fmtPrice(prop.price)
      const typeLabel = prop.type || prop.status || ''
      const cityStr = prop.city ? `, ${prop.city}` : ''
      const gmapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.address + cityStr + ', AZ')}`

      marker.addListener('click', () => {
        infoRef.current.setContent(`
          <div class="pmap-info">
            <p class="pmap-info__address">${prop.address}${cityStr}</p>
            ${priceStr ? `<p class="pmap-info__price">${priceStr}</p>` : ''}
            ${typeLabel ? `<p class="pmap-info__detail">${typeLabel}</p>` : ''}
            <div class="pmap-info__actions">
              <a class="pmap-info__link" href="${gmapsLink}" target="_blank" rel="noopener">Open in Maps</a>
              <a class="pmap-info__link" href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${pos.lat},${pos.lng}" target="_blank" rel="noopener">Street View</a>
            </div>
          </div>
        `)
        infoRef.current.open(mapInstance.current, marker)

        if (onMarkerClick) onMarkerClick(prop)
      })

      markersRef.current.push(marker)
      bounds.extend(pos)
      placed++

      // Fit bounds once all markers placed
      if (placed === expectedCount) {
        if (singleMarker || placed === 1) {
          mapInstance.current.setCenter(pos)
          if (!zoom) mapInstance.current.setZoom(15)
        } else if (placed > 1) {
          mapInstance.current.fitBounds(bounds, 50)
        }
      }
    })
  }, [ready, resolvedProps, singleMarker, zoom, onMarkerClick])

  // ─── Map type toggle ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstance.current) return
    mapInstance.current.setMapTypeId(mapType)
    // Re-apply brand styles only on roadmap
    if (mapType === 'roadmap') {
      mapInstance.current.setOptions({ styles: MAP_STYLES })
    } else {
      mapInstance.current.setOptions({ styles: [] })
    }
  }, [mapType])

  if (error) {
    return (
      <div className="pmap">
        <div className="pmap__error">Map unavailable: {error}</div>
      </div>
    )
  }

  if (resolvedProps.length === 0 && !singleMarker) {
    return (
      <div className="pmap">
        {displayHeader && (
          <div className="pmap__header">
            <h3 className="pmap__title">{title}</h3>
          </div>
        )}
        <div className="pmap__empty">
          <span className="pmap__empty-icon">{'\u{1F5FA}\uFE0F'}</span>
          <span className="pmap__empty-text">No properties to display</span>
        </div>
      </div>
    )
  }

  return (
    <div className="pmap">
      {displayHeader && (
        <div className="pmap__header">
          <h3 className="pmap__title">{title}</h3>
          <span className="pmap__count">
            {resolvedProps.length} propert{resolvedProps.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
      )}
      <div className="pmap__container" style={{ height }}>
        <div className="pmap__controls">
          <button
            className={`pmap__toggle ${mapType === 'roadmap' ? 'pmap__toggle--active' : ''}`}
            onClick={() => setMapType('roadmap')}
          >
            Map
          </button>
          <button
            className={`pmap__toggle ${mapType === 'hybrid' ? 'pmap__toggle--active' : ''}`}
            onClick={() => setMapType('hybrid')}
          >
            Satellite
          </button>
        </div>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  )
}

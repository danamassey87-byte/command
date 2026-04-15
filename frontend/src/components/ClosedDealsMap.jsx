import { useEffect, useRef, useState, useMemo } from 'react'
import { loadGoogleMaps, geocodeAddress } from '../lib/googleMaps.js'
import './ClosedDealsMap.css'

const GILBERT_CENTER = { lat: 33.3528, lng: -111.789 }
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Street View fallback when no image_url
function streetViewUrl(address) {
  return `https://maps.googleapis.com/maps/api/streetview?size=280x160&location=${encodeURIComponent(address)}&key=${API_KEY}`
}

// Geocode cache to avoid repeat calls
const geoCache = {}

async function geocodeCached(address) {
  if (geoCache[address]) return geoCache[address]
  try {
    const result = await geocodeAddress(address)
    geoCache[address] = { lat: result.lat, lng: result.lng }
    return geoCache[address]
  } catch {
    return null
  }
}

export default function ClosedDealsMap({ transactions = [] }) {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const infoRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(null)

  const closedDeals = useMemo(() =>
    transactions.filter(t => (t.status ?? '').toLowerCase().includes('closed'))
  , [transactions])

  // Init map
  useEffect(() => {
    let cancelled = false
    loadGoogleMaps().then(google => {
      if (cancelled || !mapRef.current) return

      mapInstance.current = new google.maps.Map(mapRef.current, {
        center: GILBERT_CENTER,
        zoom: 11,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f5f1eb' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#5A4136' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#EFEDE8' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#e8e3db' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#d9d1c5' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c5d5e0' }] },
          { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#d4dece' }] },
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        ],
      })

      infoRef.current = new google.maps.InfoWindow({ disableAutoPan: true })

      setReady(true)
    }).catch(e => setError(e.message))

    return () => { cancelled = true }
  }, [])

  // Place markers when map ready + deals change
  useEffect(() => {
    if (!ready || !mapInstance.current) return
    const google = window.google

    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []

    if (closedDeals.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    let placed = 0

    closedDeals.forEach(async (deal) => {
      const addr = deal.property?.address
      const city = deal.property?.city || ''
      const fullAddr = city ? `${addr}, ${city}, AZ` : `${addr}, AZ`
      if (!addr) return

      const pos = await geocodeCached(fullAddr)
      if (!pos || !mapInstance.current) return

      const marker = new google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3A2A1E',
          fillOpacity: 1,
          strokeColor: '#B79782',
          strokeWeight: 2.5,
        },
        title: addr,
      })

      const clientName = deal.contact?.name ?? 'Client'
      const closeDate = deal.closing_date
        ? new Date(deal.closing_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : ''
      const imgSrc = deal.property?.image_url || streetViewUrl(fullAddr)

      marker.addListener('mouseover', () => {
        infoRef.current.setContent(`
          <div class="cdm-tooltip">
            <img class="cdm-tooltip__img" src="${imgSrc}" alt="${addr}" />
            <p class="cdm-tooltip__name">${clientName}</p>
            <p class="cdm-tooltip__date">${closeDate}</p>
          </div>
        `)
        infoRef.current.open(mapInstance.current, marker)
      })

      marker.addListener('mouseout', () => {
        infoRef.current.close()
      })

      markersRef.current.push(marker)
      bounds.extend(pos)
      placed++

      // Fit bounds after all markers placed
      if (placed === closedDeals.filter(d => d.property?.address).length) {
        if (placed > 1) {
          mapInstance.current.fitBounds(bounds, 50)
        } else {
          mapInstance.current.setCenter(pos)
          mapInstance.current.setZoom(14)
        }
      }
    })
  }, [ready, closedDeals])

  if (error) return null

  return (
    <div className="cdm">
      <div className="cdm__header">
        <h3 className="cdm__title">Closed Deals</h3>
        <span className="cdm__count">{closedDeals.length} sale{closedDeals.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="cdm__map" ref={mapRef} />
    </div>
  )
}

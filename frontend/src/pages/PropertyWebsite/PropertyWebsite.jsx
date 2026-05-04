import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import PropertyMap from '../../components/PropertyMap.jsx'
import './PropertyWebsite.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

function fmtPrice(n) {
  if (!n) return null
  return `$${Number(n).toLocaleString()}`
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

export default function PropertyWebsite() {
  const { listingId } = useParams()
  const [listing, setListing] = useState(null)
  const [property, setProperty] = useState(null)
  const [photos, setPhotos] = useState([])
  const [openHouses, setOpenHouses] = useState([])
  const [loadError, setLoadError] = useState(null)

  // Lead capture state
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!listingId) return
    ;(async () => {
      try {
        const { data: l, error } = await supabase
          .from('listings')
          .select('*, property:properties(*)')
          .eq('id', listingId)
          .single()
        if (error || !l) { setLoadError('Listing not found'); return }
        setListing(l)
        setProperty(l.property)
        if (l.property?.id) {
          const now = new Date().toISOString().slice(0, 10)
          const [photoRes, ohRes] = await Promise.all([
            supabase.from('media_assets').select('id, url, type').eq('property_id', l.property.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(20),
            supabase.from('open_houses').select('id, date, start_time, end_time, status').eq('property_id', l.property.id).gte('date', now).order('date', { ascending: true }),
          ])
          setPhotos((photoRes.data ?? []).filter(p => !p.type || p.type.startsWith('image') || p.type === 'photo'))
          setOpenHouses(ohRes.data ?? [])
        }
      } catch (err) {
        setLoadError(err.message)
      }
    })()
  }, [listingId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || (!email.trim() && !phone.trim())) {
      setSubmitError('Please share your name plus an email or phone so we can follow up.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const slug = `property-${listingId}`
      const { data: row, error } = await supabase
        .from('public_form_submissions')
        .insert({
          form_id: null,
          form_slug: slug,
          client_name: name.trim(),
          data: {
            firstname: name.trim().split(' ')[0],
            lastname:  name.trim().split(' ').slice(1).join(' '),
            email:     email.trim() || null,
            phone:     phone.trim() || null,
            message:   message.trim() || null,
            property_address: property?.address || null,
            listing_id: listingId,
          },
          user_agent: navigator.userAgent,
        })
        .select('id')
        .single()
      if (error) throw error

      // Async merge into contacts + notify Dana
      if (row?.id) {
        supabase.functions.invoke('merge-form-submission', {
          body: { submission_id: row.id },
        }).catch(() => {})
      }
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="pweb">
        <div className="pweb__hero" style={{ minHeight: 320 }}>
          <h1 className="pweb__address">Listing not available</h1>
          <p className="pweb__sub">{loadError}</p>
        </div>
      </div>
    )
  }
  if (!listing) {
    return <div className="pweb"><div style={{ padding: 80, textAlign: 'center', color: '#5A4136' }}>Loading…</div></div>
  }

  const addr = property?.address || 'Property'
  const cityState = [property?.city, property?.state || 'AZ'].filter(Boolean).join(', ')
  const specs = [
    property?.bedrooms && `${property.bedrooms} bed`,
    property?.bathrooms && `${property.bathrooms} bath`,
    property?.sqft && `${Number(property.sqft).toLocaleString()} sqft`,
  ].filter(Boolean).join(' · ')
  const heroImage = photos[0]?.url

  return (
    <div className="pweb">
      <div className="pweb__hero" style={heroImage ? { backgroundImage: `linear-gradient(180deg, rgba(58,42,30,0.45) 0%, rgba(58,42,30,0.85) 100%), url(${heroImage})` } : undefined}>
        <div className="pweb__hero-inner">
          <span className="pweb__brand">Dana Massey · REAL Brokerage</span>
          <h1 className="pweb__address">{addr}</h1>
          {cityState && <p className="pweb__sub">{cityState}{specs ? ` · ${specs}` : ''}</p>}
          {fmtPrice(property?.price ?? listing.price) && (
            <p className="pweb__price">{fmtPrice(property?.price ?? listing.price)}</p>
          )}
          <button className="pweb__hero-cta" onClick={() => { setShowForm(true); setTimeout(() => document.getElementById('pweb-form')?.scrollIntoView({ behavior: 'smooth' }), 50) }}>
            Request More Info
          </button>
        </div>
      </div>

      <div className="pweb__body">
        {/* Photos strip */}
        {photos.length > 1 && (
          <section className="pweb__section pweb__section--photos">
            <div className="pweb__photos">
              {photos.slice(0, 12).map(p => (
                <div key={p.id} className="pweb__photo" style={{ backgroundImage: `url(${p.url})` }} />
              ))}
            </div>
          </section>
        )}

        {/* Description */}
        {(property?.description || property?.notes) && (
          <section className="pweb__section">
            <h2 className="pweb__h2">About This Home</h2>
            <p className="pweb__paragraph">{property.description || property.notes}</p>
          </section>
        )}

        {/* Map */}
        {property?.address && (
          <section className="pweb__section pweb__section--map">
            <h2 className="pweb__h2">Location</h2>
            <PropertyMap
              singleMarker
              height="320px"
              properties={[{
                address: property.address,
                city:    property.city,
                lat:     property.latitude,
                lng:     property.longitude,
                price:   property.price,
              }]}
            />
          </section>
        )}

        {/* Open House schedule */}
        {openHouses.length > 0 && (
          <section className="pweb__section">
            <h2 className="pweb__h2">Upcoming Open Houses</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {openHouses.map(oh => (
                <div key={oh.id} className="pweb__oh-row">
                  <span className="pweb__oh-date">{fmtDate(oh.date)}</span>
                  {oh.start_time && <span className="pweb__oh-time">{fmtTime(oh.start_time)}{oh.end_time ? ` – ${fmtTime(oh.end_time)}` : ''}</span>}
                </div>
              ))}
            </div>
            <p className="pweb__hint">No need to RSVP — just stop by.</p>
          </section>
        )}

        {/* Lead capture form */}
        <section id="pweb-form" className="pweb__section pweb__section--cta">
          <h2 className="pweb__h2">Want a closer look?</h2>
          {submitted ? (
            <div className="pweb__success">
              <div className="pweb__success-icon">🏡</div>
              <h3 className="pweb__success-title">Thanks, {name.split(' ')[0]}!</h3>
              <p className="pweb__success-text">Dana will be in touch shortly.</p>
            </div>
          ) : (
            <>
              <p className="pweb__paragraph">
                Send a quick note and Dana will reach out with photos, comps, financing options, or to set up a private showing.
              </p>
              {!showForm ? (
                <button className="pweb__cta-btn" onClick={() => setShowForm(true)}>
                  Get In Touch
                </button>
              ) : (
                <form className="pweb__form" onSubmit={handleSubmit}>
                  {submitError && <div className="pweb__error">{submitError}</div>}
                  <label className="pweb__label">
                    <span>Your Name *</span>
                    <input value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
                  </label>
                  <div className="pweb__row">
                    <label className="pweb__label">
                      <span>Email</span>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                    </label>
                    <label className="pweb__label">
                      <span>Phone</span>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" />
                    </label>
                  </div>
                  <label className="pweb__label">
                    <span>Anything specific?</span>
                    <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Curious about the lot, schools, financing options..." />
                  </label>
                  <button type="submit" className="pweb__cta-btn" disabled={submitting || !name.trim()}>
                    {submitting ? 'Sending…' : 'Send to Dana'}
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </div>

      <div className="pweb__footer">
        Dana Massey · REAL Brokerage · East Valley, Arizona ·
        <a href="mailto:dana@danamassey.com"> dana@danamassey.com</a>
      </div>
    </div>
  )
}

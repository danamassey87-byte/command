import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import './OHBriefing.css'

// Public Supabase client (anon key, no auth required — same pattern as OHSignIn)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

export default function OHBriefing() {
  const { openHouseId } = useParams()
  const [oh, setOh] = useState(null)
  const [property, setProperty] = useState(null)
  const [listing, setListing] = useState(null)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    if (!openHouseId) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('open_houses')
          .select('*, property:properties(*), listing:listings(id, property_id, contact_id, status)')
          .eq('id', openHouseId)
          .single()
        if (error || !data) {
          setLoadError('Open house not found')
          return
        }
        setOh(data)
        setProperty(data.property)
        setListing(data.listing)
      } catch (err) {
        setLoadError(err.message)
      }
    })()
  }, [openHouseId])

  if (loadError) {
    return (
      <div className="oh-brief">
        <div className="oh-brief__hero">
          <h1>Briefing not available</h1>
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  if (!oh) {
    return <div className="oh-brief"><div style={{ padding: 60, textAlign: 'center' }}>Loading…</div></div>
  }

  const addr = property?.address || 'Open House'
  const cityState = [property?.city, property?.state || 'AZ'].filter(Boolean).join(', ')
  const specs = [
    property?.bedrooms && `${property.bedrooms} bed`,
    property?.bathrooms && `${property.bathrooms} bath`,
    property?.sqft && `${Number(property.sqft).toLocaleString()} sqft`,
    property?.year_built && `Built ${property.year_built}`,
  ].filter(Boolean).join(' · ')

  const price = property?.price ?? listing?.price
  const priceStr = price ? `$${Number(price).toLocaleString()}` : null

  const signInUrl = typeof window !== 'undefined' ? `${window.location.origin}/oh-signin/${openHouseId}` : ''
  const hostReportUrl = typeof window !== 'undefined' ? `${window.location.origin}/oh/${openHouseId}/host-report` : ''
  const qrUrl = signInUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(signInUrl)}` : ''

  return (
    <div className="oh-brief">
      <div className="oh-brief__hero">
        <span className="oh-brief__welcome">Open House Briefing</span>
        <h1 className="oh-brief__address">{addr}</h1>
        {cityState && <p className="oh-brief__sub">{cityState}{specs ? ` · ${specs}` : ''}</p>}
        <p className="oh-brief__when">{fmtDate(oh.date)} · {fmtTime(oh.start_time)} – {fmtTime(oh.end_time)}</p>
        {priceStr && <p className="oh-brief__price">{priceStr}</p>}
      </div>

      <div className="oh-brief__body">
        {/* Hosting Agent */}
        {(oh.agent_name || oh.agent_phone || oh.agent_email) && (
          <section className="oh-brief__section">
            <h2 className="oh-brief__h2">Hosting Agent</h2>
            <p className="oh-brief__line">
              {oh.agent_name && <strong>{oh.agent_name}</strong>}
              {oh.agent_brokerage && <> · {oh.agent_brokerage}</>}
            </p>
            {oh.agent_phone && <p className="oh-brief__line"><a href={`tel:${oh.agent_phone}`}>{oh.agent_phone}</a></p>}
            {oh.agent_email && <p className="oh-brief__line"><a href={`mailto:${oh.agent_email}`}>{oh.agent_email}</a></p>}
          </section>
        )}

        {/* Property Description */}
        {(property?.description || property?.notes) && (
          <section className="oh-brief__section">
            <h2 className="oh-brief__h2">About the Property</h2>
            <p className="oh-brief__paragraph">{property.description || property.notes}</p>
          </section>
        )}

        {/* Talking Points (from oh.notes) */}
        {oh.notes && (
          <section className="oh-brief__section">
            <h2 className="oh-brief__h2">Key Talking Points</h2>
            <p className="oh-brief__paragraph">{oh.notes}</p>
          </section>
        )}

        {/* Sign-In Link + QR */}
        <section className="oh-brief__section">
          <h2 className="oh-brief__h2">Visitor Sign-In</h2>
          <p className="oh-brief__paragraph">
            Have every guest sign in. Open this link on the iPad/laptop at the door, or print the QR code below for guests to scan with their phone.
          </p>
          <div className="oh-brief__signin-row">
            {qrUrl && <img src={qrUrl} alt="Sign-in QR code" className="oh-brief__qr" />}
            <div>
              <p className="oh-brief__line">
                <a href={signInUrl} target="_blank" rel="noopener noreferrer" className="oh-brief__link">
                  {signInUrl}
                </a>
              </p>
              <p className="oh-brief__hint">
                The form captures contact info, qualification questions, and optional property feedback that flows directly to the listing agent.
              </p>
            </div>
          </div>
        </section>

        {/* Access Notes */}
        {(oh.lockbox_code || oh.access_notes) && (
          <section className="oh-brief__section">
            <h2 className="oh-brief__h2">Access</h2>
            {oh.lockbox_code && <p className="oh-brief__line"><strong>Lockbox:</strong> {oh.lockbox_code}</p>}
            {oh.access_notes && <p className="oh-brief__paragraph">{oh.access_notes}</p>}
          </section>
        )}

        {/* Listing Agent (Dana) */}
        <section className="oh-brief__section">
          <h2 className="oh-brief__h2">Listing Agent</h2>
          <p className="oh-brief__line"><strong>Dana Massey</strong> · REAL Brokerage</p>
          <p className="oh-brief__line"><a href="tel:+14805551234">Text or call for any questions during the open house</a></p>
          <p className="oh-brief__line"><a href="mailto:dana@danamassey.com">dana@danamassey.com</a></p>
        </section>

        {/* Wrap-Up: Host Report */}
        <section className="oh-brief__section oh-brief__section--cta">
          <h2 className="oh-brief__h2">After the Open House</h2>
          <p className="oh-brief__paragraph">
            When you're done, please take 2 minutes to fill in a quick recap — attendance, vibes, hot leads, and any feedback the seller should hear.
          </p>
          <a href={hostReportUrl} target="_blank" rel="noopener noreferrer" className="oh-brief__cta-btn">
            Fill in Host Report →
          </a>
        </section>
      </div>

      <div className="oh-brief__footer">
        Dana Massey · REAL Brokerage · East Valley, Arizona
      </div>
    </div>
  )
}

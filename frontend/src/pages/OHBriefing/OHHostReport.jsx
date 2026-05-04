import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import './OHBriefing.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

const PRICE_OPTIONS = [
  { v: 'too_high',   l: 'Too high' },
  { v: 'fair',       l: 'About right' },
  { v: 'great_deal', l: 'Great deal' },
]

const IMPRESSION_OPTIONS = [
  { v: 'strong',  l: 'Strong (lots of interest)' },
  { v: 'mixed',   l: 'Mixed' },
  { v: 'weak',    l: 'Weak' },
]

export default function OHHostReport() {
  const { openHouseId } = useParams()
  const [oh, setOh] = useState(null)
  const [property, setProperty] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // Form state
  const [hostName, setHostName] = useState('')
  const [hostBrokerage, setHostBrokerage] = useState('')
  const [hostPhone, setHostPhone] = useState('')
  const [hostEmail, setHostEmail] = useState('')
  const [groupsThrough, setGroupsThrough] = useState('')
  const [signInCount, setSignInCount] = useState('')
  const [leadsCount, setLeadsCount] = useState('')
  const [overallImpression, setOverallImpression] = useState('')
  const [pricePerception, setPricePerception] = useState('')
  const [overallFeedback, setOverallFeedback] = useState('')
  const [conditionNotes, setConditionNotes] = useState('')
  const [commonQuestions, setCommonQuestions] = useState('')
  const [offerInterest, setOfferInterest] = useState('')
  const [notes, setNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!openHouseId) return
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('open_houses')
          .select('*, property:properties(*), listing:listings(id)')
          .eq('id', openHouseId)
          .single()
        if (error || !data) {
          setLoadError('Open house not found')
          return
        }
        setOh(data)
        setProperty(data.property)
        // Pre-fill from existing OH data when available
        if (data.agent_name)      setHostName(data.agent_name)
        if (data.agent_brokerage) setHostBrokerage(data.agent_brokerage)
        if (data.agent_phone)     setHostPhone(data.agent_phone)
        if (data.agent_email)     setHostEmail(data.agent_email)
      } catch (err) {
        setLoadError(err.message)
      }
    })()
  }, [openHouseId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hostName.trim()) { setSubmitError('Your name is required'); return }
    setSubmitting(true)
    setSubmitError('')

    try {
      const row = {
        listing_id:         oh?.listing?.id || oh?.listing_id || null,
        oh_date:            oh?.date || null,
        start_time:         oh?.start_time || null,
        end_time:           oh?.end_time || null,
        agent_name:         hostName.trim(),
        agent_brokerage:    hostBrokerage.trim() || null,
        agent_phone:        hostPhone.trim() || null,
        agent_email:        hostEmail.trim() || null,
        groups_through:     groupsThrough ? Number(groupsThrough) : 0,
        sign_in_count:      signInCount   ? Number(signInCount)   : 0,
        leads_count:        leadsCount    ? Number(leadsCount)    : 0,
        overall_impression: overallImpression || null,
        price_perception:   pricePerception   || null,
        overall_feedback:   overallFeedback.trim()  || null,
        condition_notes:    conditionNotes.trim()   || null,
        common_questions:   commonQuestions.trim()  || null,
        offer_interest:     offerInterest.trim()    || null,
        notes:              notes.trim()            || null,
        leads_json:         [],
      }

      const { error } = await supabase.from('host_reports').insert(row)
      if (error) throw error

      // Notify Dana
      const guestName = hostName.trim()
      const propertyAddr = property?.address || 'an open house'
      await supabase.from('notifications').insert({
        type: 'host_report_received',
        title: `Host report from ${guestName}`,
        body: `${guestName} submitted a recap of the open house at ${propertyAddr}. ${groupsThrough ? `${groupsThrough} groups through.` : ''}${overallImpression ? ` Overall: ${overallImpression}.` : ''}`,
        link: `/open-houses`,
        source_table: 'host_reports',
        metadata: {
          open_house_id: openHouseId,
          property_address: propertyAddr,
          host_name: guestName,
          overall_impression: overallImpression,
          price_perception: pricePerception,
        },
      }).then(() => {}, () => {})

      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="oh-brief">
        <div className="oh-brief__hero">
          <h1>Host report unavailable</h1>
          <p>{loadError}</p>
        </div>
      </div>
    )
  }

  if (!oh) {
    return <div className="oh-brief"><div style={{ padding: 60, textAlign: 'center' }}>Loading…</div></div>
  }

  const addr = property?.address || 'Open House'

  if (submitted) {
    return (
      <div className="oh-brief">
        <div className="oh-brief__hero">
          <span className="oh-brief__welcome">Host Report</span>
          <h1 className="oh-brief__address">Thank you, {hostName.split(' ')[0]}!</h1>
          <p className="oh-brief__sub">Dana has been notified. Your recap is in her inbox.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="oh-brief">
      <div className="oh-brief__hero">
        <span className="oh-brief__welcome">Host Report</span>
        <h1 className="oh-brief__address">{addr}</h1>
        <p className="oh-brief__sub">A quick 2-minute recap so the seller can hear what happened.</p>
      </div>

      <form className="oh-brief__body" onSubmit={handleSubmit}>
        {submitError && (
          <div style={{ padding: 12, background: '#fce8e6', color: '#c5221f', borderRadius: 8, fontSize: 14 }}>
            {submitError}
          </div>
        )}

        <section className="oh-brief__section">
          <h2 className="oh-brief__h2">About You</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Field label="Your Name *" value={hostName} onChange={setHostName} required />
            <Field label="Brokerage"   value={hostBrokerage} onChange={setHostBrokerage} />
            <Field label="Phone" type="tel" value={hostPhone} onChange={setHostPhone} />
            <Field label="Email" type="email" value={hostEmail} onChange={setHostEmail} />
          </div>
        </section>

        <section className="oh-brief__section">
          <h2 className="oh-brief__h2">Attendance</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Groups Through" type="number" value={groupsThrough} onChange={setGroupsThrough} />
            <Field label="Sign-Ins" type="number" value={signInCount} onChange={setSignInCount} />
            <Field label="Hot Leads" type="number" value={leadsCount} onChange={setLeadsCount} />
          </div>
        </section>

        <section className="oh-brief__section">
          <h2 className="oh-brief__h2">Vibe</h2>
          <Pills label="Overall impression"
            value={overallImpression}
            onChange={setOverallImpression}
            options={IMPRESSION_OPTIONS}
          />
          <Pills label="Price feedback"
            value={pricePerception}
            onChange={setPricePerception}
            options={PRICE_OPTIONS}
          />
        </section>

        <section className="oh-brief__section">
          <h2 className="oh-brief__h2">Feedback</h2>
          <Field label="Overall buyer feedback (free text)" textarea rows={3} value={overallFeedback} onChange={setOverallFeedback} placeholder="What did people say overall?" />
          <Field label="Condition notes" textarea rows={2} value={conditionNotes} onChange={setConditionNotes} placeholder="Anything about the home's condition that came up..." />
          <Field label="Common questions / objections" textarea rows={2} value={commonQuestions} onChange={setCommonQuestions} placeholder="What kept coming up?" />
          <Field label="Offer interest" textarea rows={2} value={offerInterest} onChange={setOfferInterest} placeholder="Anyone hinted at making an offer? Any specifics?" />
          <Field label="Other notes" textarea rows={2} value={notes} onChange={setNotes} placeholder="Anything Dana should know..." />
        </section>

        <button type="submit" disabled={submitting || !hostName.trim()} className="oh-brief__cta-btn" style={{ alignSelf: 'center', minWidth: 200 }}>
          {submitting ? 'Sending…' : 'Send Report to Dana'}
        </button>
      </form>

      <div className="oh-brief__footer">
        Dana Massey · REAL Brokerage · East Valley, Arizona
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', textarea, rows = 2, required, placeholder }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#5A4136', letterSpacing: 0.3 }}>{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          style={{ padding: 10, fontSize: 14, fontFamily: 'inherit', border: '1px solid #E8DCC9', borderRadius: 6, resize: 'vertical', background: '#FFF8EE' }}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          style={{ padding: 10, fontSize: 14, fontFamily: 'inherit', border: '1px solid #E8DCC9', borderRadius: 6, background: '#FFF8EE' }}
        />
      )}
    </label>
  )
}

function Pills({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: '#5A4136', letterSpacing: 0.3, marginBottom: 6 }}>{label}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(value === opt.v ? '' : opt.v)}
            style={{
              padding: '10px 14px',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'inherit',
              borderRadius: 8,
              border: `1.5px solid ${value === opt.v ? '#5A4136' : '#E8DCC9'}`,
              background: value === opt.v ? '#5A4136' : '#FFF8EE',
              color: value === opt.v ? '#FFF8EE' : '#5A4136',
              cursor: 'pointer',
              flex: '1 1 auto',
              minWidth: 0,
            }}
          >
            {opt.l}
          </button>
        ))}
      </div>
    </div>
  )
}

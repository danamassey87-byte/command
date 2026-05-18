import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import '../OHSignIn/OHSignIn.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

function fmtTime(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  const ampm = hr >= 12 ? 'pm' : 'am'
  const h12 = hr % 12 === 0 ? 12 : hr % 12
  return `${h12}:${m}${ampm}`
}
function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

export default function OHFeedback() {
  const { feedbackId } = useParams()
  const [fb, setFb] = useState(null)
  const [oh, setOh] = useState(null)
  const [property, setProperty] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const [buyerCount, setBuyerCount] = useState('')
  const [interest, setInterest] = useState('')
  const [priceFb, setPriceFb] = useState('')
  const [showAgain, setShowAgain] = useState('')
  const [overall, setOverall] = useState('')
  const [liked, setLiked] = useState('')
  const [concerns, setConcerns] = useState('')
  const [comments, setComments] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!feedbackId) return
    ;(async () => {
      try {
        const { data: fbData, error: fbErr } = await supabase
          .from('oh_feedback')
          .select('*')
          .eq('id', feedbackId)
          .single()
        if (fbErr || !fbData) {
          setLoadError('This feedback link is invalid or has expired.')
          return
        }
        setFb(fbData)
        if (fbData.status === 'submitted') {
          setSubmitted(true)
        }

        const { data: ohData } = await supabase
          .from('open_houses')
          .select('*, property:properties(*)')
          .eq('id', fbData.open_house_id)
          .single()
        if (ohData) {
          setOh(ohData)
          setProperty(ohData.property)
        }
      } catch (err) {
        setLoadError(err.message)
      }
    })()
  }, [feedbackId])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    try {
      const { data, error } = await supabase.functions.invoke('submit-oh-feedback', {
        body: {
          feedback_id: feedbackId,
          buyer_count: buyerCount || null,
          buyer_interest_level: interest || null,
          price_feedback: priceFb || null,
          would_show_again: showAgain || null,
          overall_impression: overall.trim() || null,
          liked: liked.trim() || null,
          concerns: concerns.trim() || null,
          general_comments: comments.trim() || null,
        },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="oh-kiosk">
        <div className="oh-kiosk__hero">
          <div className="oh-kiosk__hero-inner">
            <div className="oh-kiosk__welcome">Open House Feedback</div>
            <h1 className="oh-kiosk__address">Link Not Found</h1>
            <p className="oh-kiosk__details">{loadError}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!fb) {
    return (
      <div className="oh-kiosk">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#5A4136' }}>Loading...</div>
      </div>
    )
  }

  const addr = property?.address || 'the open house'
  const cityState = [property?.city, 'AZ'].filter(Boolean).join(', ')
  const firstName = fb.hosting_agent_name ? fb.hosting_agent_name.split(' ')[0] : null

  return (
    <div className="oh-kiosk">
      <div className="oh-kiosk__hero">
        <div className="oh-kiosk__hero-inner">
          <div className="oh-kiosk__welcome">Open House Feedback</div>
          <h1 className="oh-kiosk__address">{addr}</h1>
          {cityState && <p className="oh-kiosk__details">{cityState}</p>}
          {oh?.date && <p className="oh-kiosk__details">{fmtDate(oh.date)}{oh.start_time && ` · ${fmtTime(oh.start_time)} – ${fmtTime(oh.end_time)}`}</p>}
          <p className="oh-kiosk__agent">Thanks for hosting · Dana Massey, REAL Broker</p>
        </div>
      </div>

      <div className="oh-kiosk__form-wrap">
        <div className="oh-kiosk__card">
          {submitted ? (
            <div className="oh-kiosk__success">
              <div className="oh-kiosk__success-icon">🙏</div>
              <h2 className="oh-kiosk__success-title">Thanks{firstName ? `, ${firstName}` : ''}!</h2>
              <p className="oh-kiosk__success-text">
                Feedback received — really appreciate you taking the time. I'll pass it along to the seller right away.
              </p>
            </div>
          ) : (
            <>
              <h2 className="oh-kiosk__card-title">Share Your Feedback</h2>
              <p className="oh-kiosk__card-sub">All fields optional — fill in what's useful.</p>

              {submitError && <div className="oh-kiosk__error">{submitError}</div>}

              <form onSubmit={handleSubmit}>
                <div className="oh-kiosk__field">
                  <label className="oh-kiosk__label">How many buyers came through?</label>
                  <input
                    className="oh-kiosk__input"
                    type="number"
                    inputMode="numeric"
                    value={buyerCount}
                    onChange={e => setBuyerCount(e.target.value)}
                    placeholder="e.g. 8"
                  />
                </div>

                <div className="oh-kiosk__field">
                  <label className="oh-kiosk__label">Overall buyer interest</label>
                  <div className="oh-kiosk__pill-row">
                    {[
                      { v: 'high',   l: 'High' },
                      { v: 'medium', l: 'Medium' },
                      { v: 'low',    l: 'Low' },
                      { v: 'none',   l: 'None' },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        className={`oh-kiosk__pill${interest === opt.v ? ' oh-kiosk__pill--on' : ''}`}
                        onClick={() => setInterest(interest === opt.v ? '' : opt.v)}
                      >{opt.l}</button>
                    ))}
                  </div>
                </div>

                <div className="oh-kiosk__field">
                  <label className="oh-kiosk__label">How did the price feel to buyers?</label>
                  <div className="oh-kiosk__pill-row">
                    {[
                      { v: 'too_high',   l: 'Too high' },
                      { v: 'fair',       l: 'About right' },
                      { v: 'great_deal', l: 'Great deal' },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        className={`oh-kiosk__pill${priceFb === opt.v ? ' oh-kiosk__pill--on' : ''}`}
                        onClick={() => setPriceFb(priceFb === opt.v ? '' : opt.v)}
                      >{opt.l}</button>
                    ))}
                  </div>
                </div>

                <div className="oh-kiosk__field">
                  <label className="oh-kiosk__label">Would you show this to your buyers?</label>
                  <div className="oh-kiosk__pill-row">
                    {[
                      { v: 'yes',   l: 'Yes' },
                      { v: 'maybe', l: 'Maybe' },
                      { v: 'no',    l: 'No' },
                    ].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        className={`oh-kiosk__pill${showAgain === opt.v ? ' oh-kiosk__pill--on' : ''}`}
                        onClick={() => setShowAgain(showAgain === opt.v ? '' : opt.v)}
                      >{opt.l}</button>
                    ))}
                  </div>
                </div>

                <div className="oh-kiosk__field">
                  <label className="oh-kiosk__label">Overall impression</label>
                  <textarea
                    className="oh-kiosk__input"
                    value={overall}
                    onChange={e => setOverall(e.target.value)}
                    placeholder="A quick gut check — show ready, presents well, needs paint, etc."
                    rows={2}
                    style={{ fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div className="oh-kiosk__field">
                  <label className="oh-kiosk__label">What buyers liked</label>
                  <textarea
                    className="oh-kiosk__input"
                    value={liked}
                    onChange={e => setLiked(e.target.value)}
                    placeholder="Kitchen, backyard, layout, neighborhood..."
                    rows={2}
                    style={{ fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div className="oh-kiosk__field">
                  <label className="oh-kiosk__label">Concerns / objections</label>
                  <textarea
                    className="oh-kiosk__input"
                    value={concerns}
                    onChange={e => setConcerns(e.target.value)}
                    placeholder="Price, location, condition, layout..."
                    rows={2}
                    style={{ fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div className="oh-kiosk__field">
                  <label className="oh-kiosk__label">Anything else?</label>
                  <textarea
                    className="oh-kiosk__input"
                    value={comments}
                    onChange={e => setComments(e.target.value)}
                    placeholder="Open notes..."
                    rows={2}
                    style={{ fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="oh-kiosk__submit" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="oh-kiosk__footer">Dana Massey · REAL Broker · East Valley, Arizona</div>
    </div>
  )
}

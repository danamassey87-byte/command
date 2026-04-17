import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'
import './OHSignIn.css'

// Public Supabase client (uses anon key, no auth needed)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

const TIMEFRAME_OPTIONS = [
  'Just browsing',
  '0-3 months',
  '3-6 months',
  '6-12 months',
  '12+ months',
]

export default function OHSignIn() {
  const { openHouseId } = useParams()

  // OH data
  const [oh, setOh] = useState(null)
  const [property, setProperty] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // Sign-in form config (per-OH field visibility)
  const cfg = oh?.sign_in_config ?? {}
  const show = (key) => cfg[key] !== false // default to visible

  // Form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [workingWithAgent, setWorkingWithAgent] = useState(false)
  const [agentName, setAgentName] = useState('')
  const [preApproved, setPreApproved] = useState(false)
  const [lenderName, setLenderName] = useState('')
  const [timeframe, setTimeframe] = useState('')
  const [needToSell, setNeedToSell] = useState(false)

  // Submit state
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [signInCount, setSignInCount] = useState(0)

  // Load OH data
  useEffect(() => {
    if (!openHouseId) return
    ;(async () => {
      try {
        const { data: ohData, error: ohErr } = await supabase
          .from('open_houses')
          .select('*, property:properties(*)')
          .eq('id', openHouseId)
          .single()

        if (ohErr || !ohData) {
          setLoadError('Open house not found')
          return
        }

        setOh(ohData)
        setProperty(ohData.property)

        // Get current sign-in count
        const { count } = await supabase
          .from('oh_sign_ins')
          .select('*', { count: 'exact', head: true })
          .eq('open_house_id', openHouseId)
        setSignInCount(count || 0)
      } catch (err) {
        setLoadError(err.message)
      }
    })()
  }, [openHouseId])

  // ─── Partial capture: save whatever they've typed if they abandon ─────────
  const partialSavedRef = useRef(null) // tracks the partial record ID

  async function savePartial() {
    // Only save if they've entered at least a first name and haven't submitted
    if (submitted || !firstName.trim() || partialSavedRef.current) return

    try {
      const hasEmail = !!email.trim()
      const hasPhone = !!phone.trim()
      const needsSkipTrace = !hasEmail && !hasPhone // name only = need to look them up

      const { data } = await supabase
        .from('oh_sign_ins')
        .insert({
          open_house_id: openHouseId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase() || null,
          phone: phone.trim() || null,
          working_with_agent: workingWithAgent,
          agent_name: workingWithAgent ? agentName.trim() : '',
          pre_approved: preApproved,
          lender_name: preApproved ? lenderName.trim() : '',
          timeframe: timeframe || null,
          need_to_sell: needToSell,
          source: 'kiosk',
          is_partial: true,
          skip_trace_needed: needsSkipTrace,
        })
        .select('id')
        .single()

      if (data?.id) {
        partialSavedRef.current = data.id
      }
    } catch {
      // Silent fail — don't interrupt the guest
    }
  }

  // Save partial on page unload (guest walks away mid-form)
  useEffect(() => {
    function handleBeforeUnload() {
      if (firstName.trim() && !submitted && !partialSavedRef.current) {
        // Use sendBeacon for reliable unload saves
        const body = JSON.stringify({
          open_house_id: openHouseId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase() || null,
          phone: phone.trim() || null,
          source: 'kiosk',
          is_partial: true,
          skip_trace_needed: !email.trim() && !phone.trim(),
        })
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/oh_sign_ins`
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [firstName, lastName, email, phone, submitted, openHouseId])

  // ─── Full submit ───────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!firstName.trim()) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const hasEmail = !!email.trim()
      const hasPhone = !!phone.trim()
      const needsSkipTrace = !hasEmail && !hasPhone

      // If we saved a partial earlier, upgrade it to full
      if (partialSavedRef.current) {
        const { error } = await supabase
          .from('oh_sign_ins')
          .update({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim().toLowerCase() || null,
            phone: phone.trim() || null,
            working_with_agent: workingWithAgent,
            agent_name: workingWithAgent ? agentName.trim() : '',
            pre_approved: preApproved,
            lender_name: preApproved ? lenderName.trim() : '',
            timeframe: timeframe || null,
            need_to_sell: needToSell,
            is_partial: false,
            skip_trace_needed: needsSkipTrace,
          })
          .eq('id', partialSavedRef.current)

        if (error) throw error

        // Merge into contacts
        supabase.functions.invoke('merge-oh-signin', {
          body: { sign_in_id: partialSavedRef.current },
        }).catch(() => {})

      } else {
        // Fresh insert
        const { data: inserted, error } = await supabase
          .from('oh_sign_ins')
          .insert({
            open_house_id: openHouseId,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email.trim().toLowerCase() || null,
            phone: phone.trim() || null,
            working_with_agent: workingWithAgent,
            agent_name: workingWithAgent ? agentName.trim() : '',
            pre_approved: preApproved,
            lender_name: preApproved ? lenderName.trim() : '',
            timeframe: timeframe || null,
            need_to_sell: needToSell,
            source: 'kiosk',
            is_partial: false,
            skip_trace_needed: needsSkipTrace,
          })
          .select('id')
          .single()

        if (error) throw error

        // Merge into contacts
        if (inserted?.id) {
          supabase.functions.invoke('merge-oh-signin', {
            body: { sign_in_id: inserted.id },
          }).catch(() => {})
        }
      }

      // Update sign-in count on the open house
      await supabase
        .from('open_houses')
        .update({ sign_in_count: (oh?.sign_in_count || 0) + 1 })
        .eq('id', openHouseId)

      setSubmitted(true)
      setSignInCount(prev => prev + 1)

      // Auto-reset after 8 seconds for next guest
      setTimeout(() => resetForm(), 8000)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setWorkingWithAgent(false)
    setAgentName('')
    setPreApproved(false)
    setLenderName('')
    setTimeframe('')
    setNeedToSell(false)
    setSubmitted(false)
    setSubmitError('')
    partialSavedRef.current = null
  }

  // Format time display
  function fmtTime(t) {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  function fmtDate(d) {
    if (!d) return ''
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Loading / error states
  if (loadError) {
    return (
      <div className="oh-kiosk">
        <div className="oh-kiosk__hero">
          <div className="oh-kiosk__hero-inner">
            <div className="oh-kiosk__welcome">Open House</div>
            <h1 className="oh-kiosk__address">Not Found</h1>
            <p className="oh-kiosk__details">This open house link is invalid or has expired.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!oh) {
    return (
      <div className="oh-kiosk">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#5A4136' }}>
          Loading...
        </div>
      </div>
    )
  }

  const addr = property?.address || 'Open House'
  const cityState = [property?.city, 'AZ'].filter(Boolean).join(', ')
  const specs = [
    property?.bedrooms && `${property.bedrooms} bed`,
    property?.bathrooms && `${property.bathrooms} bath`,
    property?.sqft && `${Number(property.sqft).toLocaleString()} sqft`,
  ].filter(Boolean).join(' · ')

  return (
    <div className="oh-kiosk">
      {/* Hero */}
      <div className="oh-kiosk__hero">
        <div className="oh-kiosk__hero-inner">
          <div className="oh-kiosk__welcome">Welcome to the Open House</div>
          <h1 className="oh-kiosk__address">{addr}</h1>
          {cityState && <p className="oh-kiosk__details">{cityState}{specs ? ` · ${specs}` : ''}</p>}
          <p className="oh-kiosk__details">{fmtDate(oh.date)} · {fmtTime(oh.start_time)} – {fmtTime(oh.end_time)}</p>
          <p className="oh-kiosk__agent">Dana Massey · REAL Broker</p>
        </div>
      </div>

      {/* Form */}
      <div className="oh-kiosk__form-wrap">
        <div className="oh-kiosk__card">
          {submitted ? (
            /* ─── Success ─── */
            <div className="oh-kiosk__success">
              <div className="oh-kiosk__success-icon">🏡</div>
              <h2 className="oh-kiosk__success-title">Thanks, {firstName}!</h2>
              <p className="oh-kiosk__success-text">
                You're signed in. Enjoy exploring the home!
                {!workingWithAgent && ' I\'ll follow up with you shortly.'}
              </p>
              <button className="oh-kiosk__success-reset" onClick={resetForm}>
                Next Guest →
              </button>
            </div>
          ) : (
            /* ─── Form ─── */
            <>
              <h2 className="oh-kiosk__card-title">Sign In</h2>
              <p className="oh-kiosk__card-sub">Please sign in so we can keep you informed</p>

              {submitError && <div className="oh-kiosk__error">{submitError}</div>}

              <form onSubmit={handleSubmit}>
                <div className="oh-kiosk__row">
                  <div className="oh-kiosk__field">
                    <label className="oh-kiosk__label">First Name *</label>
                    <input
                      className="oh-kiosk__input"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="First"
                      required
                      autoFocus
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="oh-kiosk__field">
                    <label className="oh-kiosk__label">Last Name</label>
                    <input
                      className="oh-kiosk__input"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Last"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {show('show_email') && (
                  <div className="oh-kiosk__field">
                    <label className="oh-kiosk__label">Email</label>
                    <input
                      className="oh-kiosk__input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onBlur={savePartial}
                      placeholder="email@example.com"
                      autoComplete="email"
                    />
                  </div>
                )}

                {show('show_phone') && (
                  <div className="oh-kiosk__field">
                    <label className="oh-kiosk__label">Phone</label>
                    <input
                      className="oh-kiosk__input"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      onBlur={savePartial}
                      placeholder="(480) 555-1234"
                      autoComplete="tel"
                    />
                  </div>
                )}

                {/* Qualification toggles — only show section if at least one toggle is enabled */}
                {(show('show_working_with_agent') || show('show_pre_approved') || show('show_need_to_sell')) && (
                  <div style={{ margin: '18px 0 6px' }}>
                    <div className="oh-kiosk__label" style={{ marginBottom: 8 }}>A Few Quick Questions</div>

                    {show('show_working_with_agent') && (
                      <>
                        <div className="oh-kiosk__toggle" onClick={() => setWorkingWithAgent(!workingWithAgent)}>
                          <span className="oh-kiosk__toggle-label">Working with an agent?</span>
                          <div className={`oh-kiosk__toggle-btn${workingWithAgent ? ' oh-kiosk__toggle-btn--on' : ''}`} />
                        </div>
                        {workingWithAgent && (
                          <div className="oh-kiosk__field" style={{ marginTop: 4 }}>
                            <input
                              className="oh-kiosk__input"
                              value={agentName}
                              onChange={e => setAgentName(e.target.value)}
                              placeholder="Agent's name"
                              style={{ fontSize: 14 }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {show('show_pre_approved') && (
                      <>
                        <div className="oh-kiosk__toggle" onClick={() => setPreApproved(!preApproved)}>
                          <span className="oh-kiosk__toggle-label">Pre-approved for financing?</span>
                          <div className={`oh-kiosk__toggle-btn${preApproved ? ' oh-kiosk__toggle-btn--on' : ''}`} />
                        </div>
                        {preApproved && (
                          <div className="oh-kiosk__field" style={{ marginTop: 4 }}>
                            <input
                              className="oh-kiosk__input"
                              value={lenderName}
                              onChange={e => setLenderName(e.target.value)}
                              placeholder="Lender name"
                              style={{ fontSize: 14 }}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {show('show_need_to_sell') && (
                      <div className="oh-kiosk__toggle" onClick={() => setNeedToSell(!needToSell)}>
                        <span className="oh-kiosk__toggle-label">Need to sell a home first?</span>
                        <div className={`oh-kiosk__toggle-btn${needToSell ? ' oh-kiosk__toggle-btn--on' : ''}`} />
                      </div>
                    )}
                  </div>
                )}

                {show('show_timeframe') && (
                  <div className="oh-kiosk__field">
                    <label className="oh-kiosk__label">Timeframe</label>
                    <select
                      className="oh-kiosk__input"
                      value={timeframe}
                      onChange={e => setTimeframe(e.target.value)}
                      style={{ fontSize: 14 }}
                    >
                      <option value="">Select...</option>
                      {TIMEFRAME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className="oh-kiosk__submit"
                  disabled={submitting || !firstName.trim()}
                >
                  {submitting ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            </>
          )}
        </div>

      </div>

      <div className="oh-kiosk__footer">
        Dana Massey · REAL Broker · East Valley, Arizona
      </div>
    </div>
  )
}

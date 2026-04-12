import { useState } from 'react'
import { SectionHeader, Input, Badge, SlidePanel, Button, Textarea } from '../../components/ui/index.jsx'
import { PropertyPicker } from '../../components/ui/PropertyPicker.jsx'
import { generateContent, pushListingPlanToCalendar, buildPresentation } from '../../lib/supabase.js'
import './ListingPlan.css'

// ─── AI Prompts ─────────────────────────────────────────────────────────────

const RELISTING_PROMPT = `You are to ONLY use these websites:

https://www.narrpr.com/home
https://armls.flexmls.com/
https://mymonsoon.com/
https://rapidstats.com/
https://curbview.com/

If I ever ask for a net sheet use:
https://wfgkeyapp.com/?r=app%2Fcalculators

---

You are Dana Massey's real estate listing strategist. Dana is a concierge agent with REAL Broker in Arizona's East Valley (Gilbert, Mesa, Queen Creek, Chandler, San Tan Valley, Apache Junction, Scottsdale). Her brand: "A marketing expert who happens to sell real estate." Voice: direct, warm, story-driven, no fluff, no clichés. Leads with emotion — not specs.

Dana's 5 client types: expired sellers, relocation buyers (CA/TX/CO), move-up buyers, investors, snowbirds/55+.
Brand: dark brown + cream. Fonts: Playfair Display (headers), Poppins (body).
Contact: 480.818.7554 · dana@danamassey.com · danamassey.com · Lic #147041161

---

WHEN DANA GIVES YOU AN ADDRESS, do the following automatically:

STEP 1 — RESEARCH THE PROPERTY
Search the web for the property using the address. Pull from Zillow, Realtor.com, Redfin, ARMLS syndication, and Maricopa County Assessor. Collect everything available:
- MLS # and current status
- Current and original list price
- Price per sq ft
- Beds / baths / sq ft / lot size / year built
- Builder and model name (if available)
- Garage details
- Pool (private and/or community)
- Original list date, DOM, CDOM
- Original purchase price and year
- Annual taxes
- HOA amount and name
- School district and schools
- All listed features and upgrades from the MLS description
- All listing photos descriptions if available
- Agent/brokerage on record

STEP 2 — RESEARCH THE NEIGHBORHOOD
Search for the subdivision name and city. Collect:
- Community character (master-planned, gated, age-restricted, etc.)
- Amenities (pools, parks, trails, clubhouse, etc.)
- Nearby employers, freeways, retail
- Neighborhood reputation and known selling points
- Any recent news or development (new schools, commercial, etc.)

STEP 3 — RESEARCH THE MARKET
Search for active listings in the same subdivision or zip code with similar bed/bath/sqft profile. Collect:
- Number of active competing listings
- Avg and median list price
- Avg and median price per sq ft
- Avg and median DOM
- 2–3 closest direct comps (recently sold)
- Sale-to-list ratio for those comps
- Any market trends (shifting buyer demand, price drops, etc.)

STEP 4 — DIAGNOSE WHY IT DIDN'T SELL
Based on everything you found, identify:
- Was it overpriced vs comps?
- Were the photos low quality or missing key angles?
- Was the description generic or misleading?
- Were there condition issues visible in photos?
- Was the DOM high enough to signal a stale listing?
- Was there a pricing strategy mismatch (e.g., no price drops)?
- Were there showing access issues?
- Was there agent responsiveness or marketing effort?

STEP 5 — GENERATE THE RELISTING PLAN
Using Dana's brand voice, create a complete relisting strategy:

1. PRICING STRATEGY
   - Recommended new list price with justification
   - Price position relative to active competition
   - Pricing psychology approach (e.g., just under a search bracket)

2. MARKETING OVERHAUL
   - New listing headline and MLS description (written in Dana's voice)
   - Photo strategy (what to reshoot, staging recs)
   - Social media launch plan (platforms, post types, timing)
   - Neighborhood story angle (what makes this location special)
   - Targeted buyer profile (who is most likely to buy this home)

3. FIRST 14 DAYS TIMELINE
   - Day-by-day action plan for the relaunch
   - Coming soon strategy, broker open, public open house
   - Price positioning check at day 7 and day 14

4. SELLER TALKING POINTS
   - What to tell the seller about why it didn't sell
   - How to present the new strategy with confidence
   - Objection handling for price reduction

5. COMPETITIVE EDGE TACTICS
   - What Dana can do differently than the previous agent
   - Unique value props to highlight
   - Any creative incentives to consider (rate buydowns, concessions)`

const NEW_LISTING_PROMPT = `You are to ONLY use these websites:

https://www.narrpr.com/home
https://armls.flexmls.com/
https://mymonsoon.com/
https://rapidstats.com/
https://curbview.com/

If I ever ask for a net sheet use:
https://wfgkeyapp.com/?r=app%2Fcalculators

---

You are Dana Massey's real estate listing strategist. Dana is a concierge agent with REAL Broker in Arizona's East Valley (Gilbert, Mesa, Queen Creek, Chandler, San Tan Valley, Apache Junction, Scottsdale). Her brand: "A marketing expert who happens to sell real estate." Voice: direct, warm, story-driven, no fluff, no clichés. Leads with emotion — not specs.

Dana's 5 client types: expired sellers, relocation buyers (CA/TX/CO), move-up buyers, investors, snowbirds/55+.
Brand: dark brown + cream. Fonts: Playfair Display (headers), Poppins (body).
Contact: 480.818.7554 · dana@danamassey.com · danamassey.com · Lic #147041161

---

WHEN DANA GIVES YOU AN ADDRESS, do the following automatically:

STEP 1 — RESEARCH THE PROPERTY
Search the web for the property using the address. Pull from Zillow, Realtor.com, Redfin, ARMLS syndication, and Maricopa County Assessor. Collect everything available:
- MLS # and current status (or off-market status)
- Current Zestimate / estimated value
- Price per sq ft for the area
- Beds / baths / sq ft / lot size / year built
- Builder and model name (if available)
- Garage details
- Pool (private and/or community)
- Original purchase price and year
- Annual taxes
- HOA amount and name
- School district and schools
- All available features, upgrades, and recent permits
- Any previous listing history and photos

STEP 2 — RESEARCH THE NEIGHBORHOOD
Search for the subdivision name and city. Collect:
- Community character (master-planned, gated, age-restricted, etc.)
- Amenities (pools, parks, trails, clubhouse, etc.)
- Nearby employers, freeways, retail
- Neighborhood reputation and known selling points
- Any recent news or development (new schools, commercial, etc.)

STEP 3 — RESEARCH THE MARKET
Search for active listings in the same subdivision or zip code with similar bed/bath/sqft profile. Collect:
- Number of active competing listings
- Avg and median list price
- Avg and median price per sq ft
- Avg and median DOM
- 3–5 closest direct comps (recently sold within 90 days)
- Sale-to-list ratio for those comps
- Current absorption rate and months of inventory
- Any market trends (shifting buyer demand, seasonal patterns, etc.)

STEP 4 — IDENTIFY THE HOME'S COMPETITIVE ADVANTAGES
Based on everything you found, identify:
- What makes this home stand out vs active competition?
- What are the top 3 emotional selling points (not just specs)?
- What buyer lifestyle does this home serve?
- Any unique features, views, location perks, or upgrades?
- What story can we tell about living here?

STEP 5 — GENERATE THE NEW LISTING LAUNCH PLAN
Using Dana's brand voice, create a complete listing strategy:

1. PRICING STRATEGY
   - Recommended list price with justification based on comps
   - Price position relative to active competition
   - Pricing psychology approach (e.g., just under a search bracket)
   - Price range the home should sell within (low/mid/high scenarios)

2. PRE-LAUNCH CHECKLIST
   - Recommended prep work (repairs, declutter, paint, landscaping)
   - Staging recommendations (full, partial, virtual, or none)
   - Photography shot list (must-have angles and features)
   - Videography / drone recommendations
   - Coming Soon strategy and timeline

3. MARKETING PLAN
   - New listing headline and MLS description (written in Dana's voice — story-driven, emotional, no clichés)
   - Social media launch plan (platforms, post types, timing over first 2 weeks)
   - Neighborhood story angle (what makes this location worth moving to)
   - Targeted buyer profile (who is most likely to buy this home and where are they coming from)
   - Just Listed postcard / mailer copy
   - Email blast copy for Dana's database

4. FIRST 21 DAYS TIMELINE
   - Day-by-day action plan from Coming Soon through Active
   - Broker open and public open house schedule
   - Social media content calendar for the launch
   - Price positioning check at day 7, 14, and 21
   - Showing feedback collection strategy

5. SELLER PREP TALKING POINTS
   - How to present the pricing strategy to the seller
   - Setting expectations for showings, feedback, and timeline
   - What to communicate about the current market
   - How Dana's marketing approach is different

6. COMPETITIVE EDGE TACTICS
   - How to position this listing above the competition
   - Dana's unique value props for this specific property
   - Creative incentives to consider (rate buydowns, concessions, home warranty)
   - Buyer agent outreach strategy`

// ─── Component ──────────────────────────────────────────────────────────────

export default function ListingPlan() {
  const [planType, setPlanType]       = useState('new')      // 'new' | 'expired'
  const [address, setAddress]         = useState('')
  const [linkedProperty, setLinkedProperty] = useState(null)
  const [generating, setGenerating]   = useState(false)
  const [output, setOutput]           = useState(null)
  const [showPrompt, setShowPrompt]   = useState(false)
  const [copied, setCopied]           = useState(false)
  const [error, setError]             = useState(null)
  const [pushing, setPushing]         = useState(false)
  const [pushedCount, setPushedCount] = useState(null)
  const [clientName, setClientName]   = useState('')
  const [modalOpen, setModalOpen]     = useState(false)
  const [launchDate, setLaunchDate]   = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14) // default: 14 days from today
    return d.toISOString().slice(0, 10)
  })
  const [planChanges, setPlanChanges] = useState('')
  const [savedPlans, setSavedPlans]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('listing_plans') || '[]') } catch { return [] }
  })
  const [generatingPres, setGeneratingPres] = useState(false)
  const [presResult, setPresResult] = useState(null)

  const activePrompt = planType === 'new' ? NEW_LISTING_PROMPT : RELISTING_PROMPT
  const promptWithAddress = `${activePrompt}\n\n---\n\nADDRESS: ${address}`

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptWithAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* silent */ }
  }

  const handleGenerate = async () => {
    if (!address.trim()) return
    setGenerating(true)
    setOutput(null)
    setError(null)

    try {
      const result = await generateContent({
        type: 'listing_plan',
        plan_type: planType,
        address: address.trim(),
        property: linkedProperty,
      })

      setOutput({
        address: address.trim(),
        type: planType,
        content: result?.text || null,
        prompt: promptWithAddress,
        property: linkedProperty,
        generatedAt: new Date().toISOString(),
      })
    } catch (e) {
      setError(e.message || 'Failed to generate plan. Check your Anthropic API key in Supabase.')
      // Fallback: copy prompt to clipboard
      try { await navigator.clipboard.writeText(promptWithAddress) } catch { /* silent */ }
    } finally {
      setGenerating(false)
    }
  }

  const handleSavePlan = () => {
    if (!output) return
    const plan = { ...output, id: Date.now() }
    const updated = [plan, ...savedPlans]
    setSavedPlans(updated)
    localStorage.setItem('listing_plans', JSON.stringify(updated))
  }

  const handleLoadPlan = (plan) => {
    setOutput(plan)
    setAddress(plan.address)
    setPlanType(plan.type)
  }

  // Minimum launch date is 7 days from today (pre-launch content needs lead time)
  const minLaunchDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })()

  const handleOpenModal = () => {
    if (!linkedProperty) {
      setError('Pick a property from your database first — required to push to calendar.')
      return
    }
    setError(null)
    setModalOpen(true)
  }

  const handleConfirmPush = async () => {
    // Guard: launch date must be at least 7 days out
    if (launchDate < minLaunchDate) {
      setError('Launch date must be at least 7 days from today so pre-launch content has lead time.')
      return
    }
    setPushing(true)
    setError(null)
    try {
      const { count } = await pushListingPlanToCalendar({
        property: linkedProperty,
        clientName: clientName.trim() || 'Client',
        launchDate,
        extraNotes: planChanges.trim(),
      })
      setPushedCount(count)
      setModalOpen(false)
      setPlanChanges('')
    } catch (e) {
      setError(e.message || 'Failed to push plan to calendar.')
    } finally {
      setPushing(false)
    }
  }

  const handleDeletePlan = (id) => {
    const updated = savedPlans.filter(p => p.id !== id)
    setSavedPlans(updated)
    localStorage.setItem('listing_plans', JSON.stringify(updated))
  }

  return (
    <div className="listing-plan">
      <SectionHeader
        title="Listing Plan"
        subtitle="AI-powered listing and relisting strategy generator"
      />

      {/* Plan type toggle */}
      <div className="listing-plan__form">
        <div className="listing-plan__type-toggle">
          <button
            className={`listing-plan__type-btn ${planType === 'new' ? 'listing-plan__type-btn--active' : ''}`}
            onClick={() => setPlanType('new')}
          >
            New Listing
          </button>
          <button
            className={`listing-plan__type-btn ${planType === 'expired' ? 'listing-plan__type-btn--active' : ''}`}
            onClick={() => setPlanType('expired')}
          >
            Expired / Relisting
          </button>
        </div>

        {/* Client name */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Input
            label="Client Name"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="e.g. Don Neves"
          />
        </div>

        {/* Property picker — auto-fills address from your DB */}
        <div style={{ marginBottom: 'var(--space-md)' }}>
          {linkedProperty ? (
            <div className="listing-plan__linked-property">
              <div>
                <strong>{linkedProperty.address}</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                  {[linkedProperty.city && `${linkedProperty.city}, AZ`, linkedProperty.beds && `${linkedProperty.beds}bd`, linkedProperty.baths && `${linkedProperty.baths}ba`, linkedProperty.sqft && `${Number(linkedProperty.sqft).toLocaleString()}sf`].filter(Boolean).join(' · ')}
                </span>
              </div>
              <button
                onClick={() => { setLinkedProperty(null); setAddress('') }}
                style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Remove
              </button>
            </div>
          ) : (
            <PropertyPicker
              label="Pick from your properties (optional)"
              onSelect={(p) => { setLinkedProperty(p); setAddress(`${p.address}, ${p.city || ''} AZ ${p.zip || ''}`.trim()) }}
              placeholder="Choose a property to auto-fill..."
            />
          )}
        </div>

        <div className="listing-plan__row">
          <Input
            label="Property Address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="e.g. 1234 E Guadalupe Rd, Gilbert AZ 85234"
          />
          <button
            className="listing-plan__generate-btn listing-plan__btn"
            onClick={handleGenerate}
            disabled={generating || !address.trim()}
          >
            {generating ? (
              <span className="listing-plan__spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            )}
            {generating ? 'Generating…' : 'Generate Plan'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.82rem', margin: '16px 0' }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.78rem' }}>Dismiss</button>
        </div>
      )}

      {/* Output area */}
      {output ? (
        <div className="listing-plan__output">
          <div className="listing-plan__output-header">
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <Badge variant={output.type === 'new' ? 'success' : 'warning'}>
                  {output.type === 'new' ? 'Launch Plan' : 'Relisting Plan'}
                </Badge>
              </div>
              <h3 className="listing-plan__output-title">{output.address}</h3>
            </div>
            <div className="listing-plan__output-actions">
              <button className="listing-plan__copy-btn" onClick={handleCopyPrompt}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {copied ? 'Copied!' : 'Copy Prompt'}
              </button>
              <button className="listing-plan__copy-btn" onClick={handleSavePlan}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                </svg>
                Save
              </button>
              <button
                className="listing-plan__copy-btn"
                onClick={handleOpenModal}
                disabled={!linkedProperty}
                title={!linkedProperty ? 'Pick a property from the dropdown above to enable' : 'Schedule this plan into your content calendar'}
                style={{ background: linkedProperty ? 'var(--brown-dark)' : undefined, color: linkedProperty ? '#fff' : undefined, borderColor: linkedProperty ? 'var(--brown-dark)' : undefined }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Auto-Generate Calendar
              </button>
              <button
                className="listing-plan__copy-btn"
                onClick={async () => {
                  if (!linkedProperty || !output?.content) return
                  setGeneratingPres(true)
                  setPresResult(null)
                  try {
                    const result = await buildPresentation(
                      linkedProperty.listing_id || linkedProperty.id,
                      output.content
                    )
                    setPresResult(result)
                  } catch (err) {
                    setPresResult({ error: err.message })
                  } finally {
                    setGeneratingPres(false)
                  }
                }}
                disabled={!linkedProperty || !output?.content || generatingPres}
                title={!output?.content ? 'Generate a listing plan first' : !linkedProperty ? 'Pick a property first' : 'Create a Gamma presentation from this plan'}
                style={{ background: linkedProperty && output?.content ? '#7627bb' : undefined, color: linkedProperty && output?.content ? '#fff' : undefined, borderColor: linkedProperty && output?.content ? '#7627bb' : undefined }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                {generatingPres ? 'Generating…' : 'Gamma Presentation'}
              </button>
            </div>
          </div>

          {presResult && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: presResult.error ? '#fce8e6' : '#f3e8fd', border: `1px solid ${presResult.error ? '#c5221f' : '#7627bb'}`, borderRadius: 'var(--radius-md)', color: presResult.error ? '#c5221f' : '#7627bb', fontSize: '0.82rem', margin: '12px 0' }}>
              {presResult.error ? (
                <span>Presentation generation failed: {presResult.error}</span>
              ) : (
                <span>
                  Presentation generated!{' '}
                  {presResult.url && <a href={presResult.url} target="_blank" rel="noreferrer" style={{ color: '#7627bb', fontWeight: 600 }}>Open in Gamma &rarr;</a>}
                </span>
              )}
              <button onClick={() => setPresResult(null)} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.78rem' }}>Dismiss</button>
            </div>
          )}

          {pushedCount !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)', color: 'var(--color-success)', fontSize: '0.82rem', margin: '12px 0' }}>
              <span><strong>{pushedCount}</strong> content slots added to your calendar across Blog, GMB, IG, FB, TikTok, Pinterest & Email</span>
              <button onClick={() => setPushedCount(null)} style={{ background: 'none', border: 'none', color: 'var(--color-success)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', fontSize: '0.78rem' }}>Dismiss</button>
            </div>
          )}

          {output.content ? (
            <div className="listing-plan__content" style={{ whiteSpace: 'pre-wrap' }}>{output.content}</div>
          ) : (
            <div className="listing-plan__empty">
              <div className="listing-plan__empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <p style={{ fontWeight: 500, marginBottom: 8, color: 'var(--brown-dark)' }}>
                AI returned no content
              </p>
              <p>
                The prompt was copied to your clipboard as a fallback. You can paste it into Claude manually.
              </p>
            </div>
          )}

          {/* Show/hide prompt preview */}
          <div className="listing-plan__prompt-preview">
            <button className="listing-plan__prompt-toggle" onClick={() => setShowPrompt(!showPrompt)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <polyline points={showPrompt ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
              </svg>
              {showPrompt ? 'Hide' : 'View'} prompt
            </button>
            {showPrompt && (
              <div className="listing-plan__prompt-text">{promptWithAddress}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="listing-plan__output">
          <div className="listing-plan__empty">
            <div className="listing-plan__empty-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <p>
              Enter a property address and select the plan type to generate an AI-powered
              {' '}{planType === 'new' ? 'listing launch' : 'relisting'} strategy.
            </p>
          </div>
        </div>
      )}

      {/* Saved plans */}
      {savedPlans.length > 0 && (
        <div className="listing-plan__saved">
          <h3 className="listing-plan__saved-title">Saved Plans</h3>
          {savedPlans.map(plan => (
            <div key={plan.id} className="listing-plan__saved-item">
              <div onClick={() => handleLoadPlan(plan)} style={{ flex: 1, cursor: 'pointer' }}>
                <span className="listing-plan__saved-address">{plan.address}</span>
                <span className="listing-plan__saved-meta">
                  {' '}&bull; <Badge variant={plan.type === 'new' ? 'success' : 'warning'} size="sm">
                    {plan.type === 'new' ? 'New' : 'Relisting'}
                  </Badge>
                  {' '}&bull; {new Date(plan.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <button
                className="listing-plan__copy-btn"
                onClick={() => handleDeletePlan(plan.id)}
                title="Remove"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ═══════ Auto-Generate Calendar Modal ═══════ */}
      <SlidePanel
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Auto-Generate Content Calendar"
        subtitle={linkedProperty ? `${clientName || 'Client'} — ${linkedProperty.address}` : ''}
        width={520}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

          {/* What's being scheduled */}
          <div style={{ padding: 'var(--space-md)', background: 'var(--cream)', borderRadius: 'var(--radius-md)' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--brown-dark)', fontWeight: 600, margin: 0, marginBottom: 6 }}>
              37 content pieces will be scheduled across:
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
              Blog · Google My Business · Instagram (post/story/reel) · Facebook (post/event) · TikTok · Pinterest · Email Blast
            </p>
          </div>

          {/* Launch date picker */}
          <div>
            <label className="field__label" htmlFor="launch-date">
              Listing Launch Date (Day 1)
            </label>
            <input
              id="launch-date"
              className="field__input"
              type="date"
              min={minLaunchDate}
              value={launchDate}
              onChange={e => setLaunchDate(e.target.value)}
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '6px 0 0' }}>
              Minimum 7 days from today. Coming Soon content will be scheduled 3 days before launch, so you need lead time.
            </p>
          </div>

          {/* Schedule preview */}
          <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-info)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--brown-dark)', margin: 0, lineHeight: 1.6 }}>
              <strong>Coming Soon:</strong> {(() => { const d = new Date(launchDate + 'T00:00:00'); d.setDate(d.getDate() - 3); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()}<br />
              <strong>Launch Day:</strong> {new Date(launchDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}<br />
              <strong>21-Day Check:</strong> {(() => { const d = new Date(launchDate + 'T00:00:00'); d.setDate(d.getDate() + 20); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) })()}
            </p>
          </div>

          {/* Plan adjustments */}
          <Textarea
            label="Any changes or notes to apply to the plan? (optional)"
            id="plan-changes"
            placeholder="e.g. Skip Pinterest this time, emphasize the pool in feature highlight, add a Saturday open house instead of Sunday..."
            value={planChanges}
            onChange={e => setPlanChanges(e.target.value)}
            rows={4}
          />

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-sm)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--color-border-light)' }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmPush} disabled={pushing || !launchDate || launchDate < minLaunchDate}>
              {pushing ? 'Generating…' : 'Generate Calendar'}
            </Button>
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}

import { useState } from 'react'
import { SectionHeader, Input, Badge } from '../../components/ui/index.jsx'
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
  const [generating, setGenerating]   = useState(false)
  const [output, setOutput]           = useState(null)
  const [showPrompt, setShowPrompt]   = useState(false)
  const [copied, setCopied]           = useState(false)
  const [savedPlans, setSavedPlans]   = useState(() => {
    try { return JSON.parse(localStorage.getItem('listing_plans') || '[]') } catch { return [] }
  })

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

    // For now, copy the prompt to clipboard and show a placeholder
    // This will be wired to Claude API / Supabase Edge Function
    try {
      await navigator.clipboard.writeText(promptWithAddress)
      setOutput({
        address: address.trim(),
        type: planType,
        content: null, // Will hold AI response when wired up
        prompt: promptWithAddress,
        generatedAt: new Date().toISOString(),
      })
    } catch {
      setOutput({
        address: address.trim(),
        type: planType,
        content: null,
        prompt: promptWithAddress,
        generatedAt: new Date().toISOString(),
      })
    }
    setGenerating(false)
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
            </div>
          </div>

          {output.content ? (
            <div className="listing-plan__content">{output.content}</div>
          ) : (
            <div className="listing-plan__empty">
              <div className="listing-plan__empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <p style={{ fontWeight: 500, marginBottom: 8, color: 'var(--brown-dark)' }}>
                Prompt copied to clipboard
              </p>
              <p>
                Paste this into Claude to generate your {output.type === 'new' ? 'listing launch' : 'relisting'} plan.
                Once AI integration is live, the plan will appear here automatically.
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
    </div>
  )
}

import { useState, useMemo } from 'react'
import { Button } from './ui/index.jsx'

/**
 * Generates a seller weekly update email auto-populated from this listing's
 * open houses, sign-ins, visitor feedback, and private showings.
 */
export default function SellerWeeklyUpdate({ listing, listingOHs = [], ohSignIns = [], ohFeedback = [], buyerFeedback = [], expenses = [] }) {
  const [copied, setCopied] = useState(false)
  const [editable, setEditable] = useState({ marketContext: '', nextSteps: '' })
  const [editing, setEditing] = useState(false)

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)

    // Activity in the last 7 days
    const recentOHs = listingOHs.filter(oh => {
      if (!oh.date) return false
      const d = new Date(oh.date + 'T12:00:00')
      return d >= weekStart && d <= now
    })
    const upcomingOHs = listingOHs.filter(oh => {
      if (!oh.date) return false
      return new Date(oh.date + 'T12:00:00') > now
    })
    const recentSignIns = ohSignIns.filter(si => si.created_at && new Date(si.created_at) >= weekStart)
    const recentShowings = buyerFeedback.filter(f => f.date && new Date(f.date + 'T12:00:00') >= weekStart)

    // Feedback themes (last 30 days)
    const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30)
    const recentFeedback = ohFeedback.filter(f => f.created_at && new Date(f.created_at) >= monthAgo)

    const interestTally = {}
    const priceTally = {}
    const offerTally = {}
    const likedThemes = []
    const concernThemes = []
    for (const f of recentFeedback) {
      if (f.interest_level)   interestTally[f.interest_level] = (interestTally[f.interest_level] || 0) + 1
      if (f.price_perception) priceTally[f.price_perception] = (priceTally[f.price_perception] || 0) + 1
      if (f.would_offer)      offerTally[f.would_offer]      = (offerTally[f.would_offer]      || 0) + 1
      if (f.liked)    likedThemes.push(f.liked)
      if (f.concerns) concernThemes.push(f.concerns)
    }
    for (const f of buyerFeedback) {
      if (f.feedback)     concernThemes.push(f.feedback)
      if (f.wouldOffer === 'yes') offerTally.yes = (offerTally.yes || 0) + 1
    }

    // Days on market
    const listedAt = listing.listed_at || listing.list_date || listing.created_at
    const dom = listedAt ? Math.floor((now - new Date(listedAt)) / 86400000) : null

    // Total marketing spend
    const totalSpend = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)

    return {
      weekStart,
      now,
      recentOHs,
      upcomingOHs,
      recentSignIns,
      recentShowings,
      recentFeedback,
      interestTally,
      priceTally,
      offerTally,
      likedThemes,
      concernThemes,
      dom,
      totalSpend,
    }
  }, [listing, listingOHs, ohSignIns, ohFeedback, buyerFeedback, expenses])

  const dateRange = `${stats.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${stats.now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  const PRICE_LABELS = { too_high: 'too high', fair: 'about right', great_deal: 'great deal' }

  function buildFeedbackSummary() {
    const parts = []
    const totalRecent = stats.recentFeedback.length + stats.recentShowings.length
    if (totalRecent === 0) return null
    const hot = (stats.interestTally.hot || 0) + stats.recentShowings.filter(f => f.interest === 'hot' || f.interest === 'high').length
    if (hot > 0) parts.push(`${hot} buyer${hot !== 1 ? 's' : ''} reported strong interest`)
    const yes = stats.offerTally.yes || 0
    if (yes > 0) parts.push(`${yes} said they'd consider an offer`)
    const tooHigh = stats.priceTally.too_high || 0
    const fair = stats.priceTally.fair || 0
    const greatDeal = stats.priceTally.great_deal || 0
    if (tooHigh + fair + greatDeal > 0) {
      const dominant = greatDeal >= fair && greatDeal >= tooHigh ? 'great_deal'
        : tooHigh > fair ? 'too_high'
        : 'fair'
      parts.push(`Most buyers said the price feels ${PRICE_LABELS[dominant]}`)
    }
    return parts.length ? parts.join(' · ') : null
  }

  const feedbackSummary = buildFeedbackSummary()

  const updateHtml = useMemo(() => {
    const ohLine = stats.recentOHs.length > 0
      ? `${stats.recentOHs.length} open house${stats.recentOHs.length !== 1 ? 's' : ''} this week`
      : (stats.upcomingOHs.length > 0
          ? `Next open house: ${new Date(stats.upcomingOHs[0].date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`
          : 'No open house scheduled this week')

    const signInLine = stats.recentSignIns.length > 0
      ? `${stats.recentSignIns.length} sign-in${stats.recentSignIns.length !== 1 ? 's' : ''} captured`
      : null

    const showingLine = stats.recentShowings.length > 0
      ? `${stats.recentShowings.length} private showing${stats.recentShowings.length !== 1 ? 's' : ''} this week`
      : null

    const liked = stats.likedThemes.slice(0, 3).filter(Boolean).join('; ')
    const concerns = stats.concernThemes.slice(0, 3).filter(Boolean).join('; ')

    const listPrice = listing.price ?? listing.list_price ?? listing.listPrice
    const priceStr = listPrice ? `$${Number(listPrice).toLocaleString()}` : 'Price TBD'
    const domStr = stats.dom != null ? `${stats.dom} Day${stats.dom !== 1 ? 's' : ''} on Market` : 'Just listed'

    const activityBullets = [
      showingLine && `<li><strong>Private Showings:</strong> ${showingLine}</li>`,
      `<li><strong>Open House:</strong> ${ohLine}</li>`,
      signInLine && `<li><strong>Sign-Ins:</strong> ${signInLine}</li>`,
      feedbackSummary && `<li><strong>Buyer Feedback:</strong> ${feedbackSummary}</li>`,
      liked && `<li><strong>What Buyers Liked:</strong> ${liked}</li>`,
      concerns && `<li><strong>Common Concerns:</strong> ${concerns}</li>`,
    ].filter(Boolean).join('\n      ')

    return `
<div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #3A2A1E;">
  <div style="padding: 24px 0; border-bottom: 1px solid #C8C3B9;">
    <h1 style="font-family: 'Georgia', serif; font-size: 28px; font-weight: 400; margin: 0;">Weekly Listing Update</h1>
    <p style="color: #5A4136; margin: 4px 0 0; font-size: 14px;">${dateRange}</p>
  </div>

  <div style="padding: 20px 0;">
    <h2 style="font-family: 'Georgia', serif; font-size: 20px; font-weight: 400; margin: 0 0 12px;">${listing.address || 'Your Property'}</h2>
    <p style="color: #5A4136; font-size: 14px; margin: 0;">${listing.city || ''}${listing.city ? ', AZ' : ''} · ${priceStr} · ${domStr}</p>
  </div>

  <div style="background: #F6F4EE; border: 1px solid #C8C3B9; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="font-family: 'Georgia', serif; font-size: 16px; font-weight: 400; margin: 0 0 8px;">This Week's Activity</h3>
    <ul style="color: #5A4136; font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
      ${activityBullets}
    </ul>
  </div>

  ${editable.marketContext.trim() ? `
  <div style="padding: 16px 0; border-bottom: 1px solid #C8C3B9;">
    <h3 style="font-family: 'Georgia', serif; font-size: 16px; font-weight: 400; margin: 0 0 8px;">Market Context</h3>
    <p style="color: #5A4136; font-size: 14px; line-height: 1.6;">${editable.marketContext}</p>
  </div>
  ` : ''}

  ${editable.nextSteps.trim() ? `
  <div style="padding: 16px 0;">
    <h3 style="font-family: 'Georgia', serif; font-size: 16px; font-weight: 400; margin: 0 0 8px;">Next Steps</h3>
    <p style="color: #5A4136; font-size: 14px; line-height: 1.6;">${editable.nextSteps}</p>
  </div>
  ` : ''}

  <div style="padding: 20px 0; border-top: 1px solid #C8C3B9; font-size: 13px; color: #B79782;">
    <p style="margin: 0;">Dana Massey · REAL Brokerage · Arizona</p>
    <p style="margin: 2px 0 0;">dana@danamassey.com</p>
  </div>
</div>`.trim()
  }, [listing, stats, dateRange, feedbackSummary, editable])

  const handleCopy = () => {
    navigator.clipboard.writeText(updateHtml)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8,
      border: '1px solid var(--color-border)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div>
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 500, margin: 0 }}>
            Weekly Seller Update
          </h4>
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
            Auto-filled from this week's activity — add market context + next steps then send
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" onClick={() => setEditing(e => !e)}>
            {editing ? 'Done' : 'Add Context'}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy HTML'}
          </Button>
          {listing?.contact_email && (
            <Button size="sm" onClick={() => {
              window.location.href = `mailto:${listing.contact_email}?subject=Weekly Update: ${listing.address || 'Your Listing'}`
            }}>Email Client</Button>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            value={editable.marketContext}
            onChange={e => setEditable(p => ({ ...p, marketContext: e.target.value }))}
            placeholder="Market context — comparable inventory, average DOM, your home's positioning..."
            rows={3}
            style={{ width: '100%', padding: 8, fontSize: '0.82rem', borderRadius: 4, border: '1px solid var(--color-border)', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <textarea
            value={editable.nextSteps}
            onChange={e => setEditable(p => ({ ...p, nextSteps: e.target.value }))}
            placeholder="Next steps — upcoming showings, marketing changes, price strategy..."
            rows={3}
            style={{ width: '100%', padding: 8, fontSize: '0.82rem', borderRadius: 4, border: '1px solid var(--color-border)', fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>
      )}

      {/* Preview */}
      <div style={{ padding: 16, maxHeight: 400, overflowY: 'auto' }}>
        <div dangerouslySetInnerHTML={{ __html: updateHtml }} />
      </div>
    </div>
  )
}

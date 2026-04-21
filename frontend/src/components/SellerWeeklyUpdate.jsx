import { useState, useMemo } from 'react'
import { Button, Badge } from './ui/index.jsx'

/**
 * Generates a seller weekly update email from listing data.
 * Designed to be embedded in the Sellers detail view.
 */
export default function SellerWeeklyUpdate({ listing }) {
  const [copied, setCopied] = useState(false)

  const updateHtml = useMemo(() => {
    if (!listing) return ''
    const now = new Date()
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
    const dateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

    return `
<div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #3A2A1E;">
  <div style="padding: 24px 0; border-bottom: 1px solid #C8C3B9;">
    <h1 style="font-family: 'Georgia', serif; font-size: 28px; font-weight: 400; margin: 0;">Weekly Listing Update</h1>
    <p style="color: #5A4136; margin: 4px 0 0; font-size: 14px;">${dateRange}</p>
  </div>

  <div style="padding: 20px 0;">
    <h2 style="font-family: 'Georgia', serif; font-size: 20px; font-weight: 400; margin: 0 0 12px;">${listing.address || 'Your Property'}</h2>
    <p style="color: #5A4136; font-size: 14px; margin: 0;">${listing.city || ''}${listing.city ? ', AZ' : ''} · ${listing.listPrice || 'Price TBD'} · ${listing.dom || 0} Days on Market</p>
  </div>

  <div style="background: #F6F4EE; border: 1px solid #C8C3B9; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <h3 style="font-family: 'Georgia', serif; font-size: 16px; font-weight: 400; margin: 0 0 8px;">This Week's Activity</h3>
    <ul style="color: #5A4136; font-size: 14px; line-height: 1.7; padding-left: 20px; margin: 0;">
      <li><strong>Showings:</strong> [X] showing requests this week</li>
      <li><strong>Online Views:</strong> [X] views across Zillow, Realtor.com, and MLS</li>
      <li><strong>Open House:</strong> [Scheduled for Saturday / None this week]</li>
      <li><strong>Feedback:</strong> [Summary of buyer agent feedback]</li>
    </ul>
  </div>

  <div style="padding: 16px 0; border-bottom: 1px solid #C8C3B9;">
    <h3 style="font-family: 'Georgia', serif; font-size: 16px; font-weight: 400; margin: 0 0 8px;">Market Context</h3>
    <p style="color: #5A4136; font-size: 14px; line-height: 1.6;">
      There are currently [X] active listings in ${listing.city || 'your area'} within a similar price range.
      Average days on market for comparable homes is [X] days. Your home is positioned [competitively / slightly above / at] the market average.
    </p>
  </div>

  <div style="padding: 16px 0;">
    <h3 style="font-family: 'Georgia', serif; font-size: 16px; font-weight: 400; margin: 0 0 8px;">Next Steps</h3>
    <p style="color: #5A4136; font-size: 14px; line-height: 1.6;">
      [Personalize this section — upcoming showings, marketing plan updates, price strategy notes]
    </p>
  </div>

  <div style="padding: 20px 0; border-top: 1px solid #C8C3B9; font-size: 13px; color: #B79782;">
    <p style="margin: 0;">Dana Massey · REAL Brokerage · Arizona</p>
    <p style="margin: 2px 0 0;">dana@danamassey.com</p>
  </div>
</div>`.trim()
  }, [listing])

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
            Pre-filled template — customize brackets then send
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
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

      {/* Preview */}
      <div style={{ padding: 16, maxHeight: 300, overflowY: 'auto' }}>
        <div dangerouslySetInnerHTML={{ __html: updateHtml }} />
      </div>
    </div>
  )
}

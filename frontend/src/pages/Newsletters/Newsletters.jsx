import { useState, useMemo } from 'react'
import { Button, Badge, SectionHeader, TabBar, Card, SlidePanel, Input, Select, Textarea } from '../../components/ui/index.jsx'
import { useNewsletters, useContacts, useTags } from '../../lib/hooks'
import { useBrand } from '../../lib/BrandContext'
import { blocksToHtml } from '../../lib/emailHtml'
import BlockComposer from '../../components/email/BlockComposer'
import { newBlock, fillSigBlock, BLOCK_PALETTE } from '../EmailBuilder/EmailBuilder.jsx'
import * as DB from '../../lib/supabase'
import ComplianceCheck from '../../components/ComplianceCheck.jsx'
import './Newsletters.css'

// ─── Newsletter Templates ────────────────────────────────────────────────────
const BRAND = { dark: '#3A2A1E', mid: '#b79782', cream: '#efede8', white: '#ffffff' }

const NEWSLETTER_TEMPLATES = [
  // ── 4 Weekly Rotating ──
  {
    id: 'market-monday', name: 'Market Monday', emoji: '📊', category: 'Weekly',
    subject: 'Market Monday — {month} East Valley Update',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "Here's your weekly market snapshot for the East Valley. Whether you're buying, selling, or just curious — these numbers tell the story.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'stats-row', stats: [{ label: 'Median Price', value: '$—', delta: '' }, { label: 'Days on Market', value: '—', delta: '' }, { label: 'Active Listings', value: '—', delta: '' }], borderRadius: 8 },
      { id: '5', type: 'text', content: "Neighborhood Spotlight: [Community Name] continues to see strong buyer demand this month...", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '6', type: 'cta', label: "What's My Home Worth?", url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'just-listed-sold', name: 'Just Listed / Just Sold', emoji: '🏠', category: 'Weekly',
    subject: 'New on the Market + Recent Closings',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "Check out what's new on the market and what just sold in the East Valley this week!", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'property-card', address: '', price: '', beds: '', baths: '', sqft: '', description: 'Just Listed!', borderRadius: 8, bgColor: '#faf9f7' },
      { id: '5', type: 'property-card', address: '', price: '', beds: '', baths: '', sqft: '', description: 'SOLD!', borderRadius: 8, bgColor: '#faf9f7' },
      { id: '6', type: 'cta', label: 'See All Listings', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'deal-of-week', name: 'Deal of the Week + Buyer Tips', emoji: '💰', category: 'Weekly',
    subject: 'This Week\'s Best Deal + Buyer Tips',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "Every week I hand-pick the best value listing in the East Valley. This week's gem:", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'image', images: [''], alt: 'Deal of the week', layout: 'full', shape: 'rounded', borderRadius: 12 },
      { id: '5', type: 'property-card', address: '', price: '', beds: '', baths: '', sqft: '', description: '', borderRadius: 8, bgColor: '#faf9f7' },
      { id: '6', type: 'text', content: "Buyer Tip: [Educational content — market timing, negotiation, inspection, etc.]", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '7', type: 'cta', label: 'Schedule a Showing', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '8', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'community-lifestyle', name: 'Community & Lifestyle', emoji: '☀️', category: 'Weekly',
    subject: 'What\'s Happening in the East Valley',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "Your East Valley community roundup — events, new spots, and things to do this week.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'image', images: [''], alt: 'Community event', layout: 'full', shape: 'rounded', borderRadius: 12 },
      { id: '5', type: 'text', content: "- [Event 1]\n- [New restaurant/shop]\n- [Home maintenance seasonal tip]\n- [Local spotlight]", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '6', type: 'cta', label: 'Follow Me on Instagram', url: '#', bgColor: BRAND.mid, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  // ── 14 Occasional ──
  {
    id: 'oh-weekend', name: 'Open House This Weekend', emoji: '🏡', category: 'Occasional',
    subject: 'Open House This Weekend — {address}',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'text', content: "You're invited! Stop by this weekend's open house:", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
      { id: '4', type: 'event-card', title: 'Open House', date: '', time: '', address: '', borderRadius: 8, accentColor: BRAND.dark },
      { id: '5', type: 'image', images: [''], alt: 'Property', layout: 'full', shape: 'rounded', borderRadius: 12 },
      { id: '6', type: 'cta', label: 'Get Directions', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  {
    id: 'new-listing', name: 'New Listing Announcement', emoji: '✨', category: 'Occasional',
    subject: 'Just Listed — {address}',
    blocks: [
      { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
      { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
      { id: '3', type: 'image', images: [''], alt: 'New listing', layout: 'full', shape: 'rounded', borderRadius: 12 },
      { id: '4', type: 'property-card', address: '', price: '', beds: '', baths: '', sqft: '', description: '', borderRadius: 8, bgColor: '#faf9f7' },
      { id: '5', type: 'cta', label: 'Schedule a Showing', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
      { id: '6', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
    ],
  },
  { id: 'price-improvement', name: 'Price Improvement', emoji: '📉', category: 'Occasional', subject: 'Price Reduced — {address}', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "Great news — the price just dropped! This home is now an even better value.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'property-card', address: '', price: '', beds: '', baths: '', sqft: '', description: 'New Price!', borderRadius: 8, bgColor: '#faf9f7' },
    { id: '5', type: 'cta', label: 'See Updated Listing', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '6', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'just-sold-standalone', name: 'Just Sold', emoji: '🎉', category: 'Occasional', subject: 'SOLD — {address}', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "Another one closed! Congratulations to my amazing clients.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'property-card', address: '', price: '', beds: '', baths: '', sqft: '', description: 'Sold!', borderRadius: 8, bgColor: '#faf9f7' },
    { id: '5', type: 'text', content: "Curious what your home is worth in today's market?", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '6', type: 'cta', label: "What's My Home Worth?", url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'monthly-market', name: 'Monthly Market Update', emoji: '📈', category: 'Occasional', subject: '{month} Market Update — East Valley', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "Here's your monthly deep-dive into the East Valley real estate market.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'stats-row', stats: [{ label: 'Median Price', value: '$—', delta: '' }, { label: 'Avg DOM', value: '—', delta: '' }, { label: 'Inventory', value: '—', delta: '' }], borderRadius: 8 },
    { id: '5', type: 'text', content: "What this means for you: [analysis paragraph]", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '6', type: 'cta', label: 'Get Your Home Value', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'deal-standalone', name: 'Deal of the Week (standalone)', emoji: '🏷️', category: 'Occasional', subject: 'This Week\'s Best Deal', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "I found an incredible deal this week that I had to share with you.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'property-card', address: '', price: '', beds: '', baths: '', sqft: '', description: '', borderRadius: 8, bgColor: '#faf9f7' },
    { id: '5', type: 'cta', label: 'See This Deal', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '6', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'seasonal-holiday', name: 'Seasonal / Holiday', emoji: '🎄', category: 'Occasional', subject: 'Happy [Holiday] from Dana Massey', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'image', images: [''], alt: 'Holiday', layout: 'full', shape: 'rounded', borderRadius: 12 },
    { id: '4', type: 'text', content: "Wishing you and your family a wonderful [holiday]. I'm so grateful to be part of this incredible community.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '5', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'buyers-guide', name: 'Buyer\'s Guide Drop', emoji: '📖', category: 'Occasional', subject: 'Your Free East Valley Buyer\'s Guide', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "I just updated my East Valley Buyer's Guide with the latest market data, top neighborhoods, and everything you need to know before buying.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'cta', label: 'Download the Guide', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '5', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'sellers-guide', name: 'Seller\'s Guide Drop', emoji: '📋', category: 'Occasional', subject: 'Your Free Home Seller\'s Guide', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "Thinking about selling? My updated Seller's Guide covers pricing strategy, staging tips, and what to expect in today's market.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'cta', label: 'Download the Guide', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '5', type: 'text', content: "Want a personalized home valuation? I'd love to help.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '6', type: 'cta', label: "What's My Home Worth?", url: '#', bgColor: BRAND.mid, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'client-appreciation', name: 'Client Appreciation', emoji: '❤️', category: 'Occasional', subject: 'Thank You — You Mean the World to Me', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "I just wanted to take a moment to say thank you. Whether we've worked together, chatted about the market, or you've simply been cheering me on — I appreciate you more than you know.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'text', content: "This business is built on relationships, and I'm so grateful for ours.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '5', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'referral-ask', name: 'Referral Ask', emoji: '🤝', category: 'Occasional', subject: 'Know Someone Buying or Selling?', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "The biggest compliment I can receive is a referral from someone I've worked with. If you know anyone thinking about buying or selling in the East Valley, I'd love the introduction!", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'cta', label: 'Refer a Friend', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '5', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'team-milestone', name: 'Team Milestone', emoji: '🏆', category: 'Occasional', subject: 'Exciting News!', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "I have some exciting news to share with you!", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'image', images: [''], alt: 'Milestone', layout: 'full', shape: 'rounded', borderRadius: 12 },
    { id: '5', type: 'text', content: "[Announcement details — new designation, award, team member, etc.]", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '6', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'charity-cause', name: 'Charity / Cause', emoji: '💛', category: 'Occasional', subject: 'Giving Back to Our Community', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "Real estate isn't just about homes — it's about community. I'm proud to support [cause/organization].", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'image', images: [''], alt: 'Community involvement', layout: 'full', shape: 'rounded', borderRadius: 12 },
    { id: '5', type: 'cta', label: 'Learn More', url: '#', bgColor: BRAND.mid, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '6', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
  { id: 'year-end-wrap', name: 'Year-End Wrap', emoji: '🎊', category: 'Occasional', subject: '{year} Year in Review — Dana Massey Real Estate', blocks: [
    { id: '1', type: 'header', logoUrl: '', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 0, padding: 28 },
    { id: '2', type: 'greeting', text: 'Hi {first_name},', fontSize: 15, fontFamily: '' },
    { id: '3', type: 'text', content: "What a year it's been! Here's a look back at everything we accomplished together.", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '4', type: 'stats-row', stats: [{ label: 'Homes Closed', value: '—', delta: '' }, { label: 'Happy Clients', value: '—', delta: '' }, { label: 'Avg Sale Price', value: '$—', delta: '' }], borderRadius: 8 },
    { id: '5', type: 'text', content: "Thank you for trusting me with one of the biggest decisions of your life. I'm so grateful and excited for what's ahead!", fontSize: 14, fontFamily: '', lineHeight: 1.65 },
    { id: '6', type: 'cta', label: 'Connect With Me', url: '#', bgColor: BRAND.dark, textColor: BRAND.white, borderRadius: 6, fontSize: 14, fontFamily: '', padding: 12 },
    { id: '7', type: 'signature', name: '', title: '', phone: '', email: '', website: '', agentLogoUrl: '', brokerageLogoUrl: '', instagram: '', facebook: '' },
  ]},
]

const CATEGORY_COLORS = { Weekly: '#6a9e72', Occasional: '#c99a2e' }

// ─── Segments ────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { key: 'all', label: 'Entire Database' },
  { key: 'buyers', label: 'Buyers' },
  { key: 'sellers', label: 'Sellers' },
  { key: 'leads', label: 'Leads' },
  { key: 'past_clients', label: 'Past Clients' },
  { key: 'investors', label: 'Investors' },
  { key: 'tagged', label: 'By Tag' },
]

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const statusVariant = { draft: 'info', scheduled: 'warning', sending: 'accent', sent: 'success', cancelled: 'danger' }

// ─── Recipient Picker ────────────────────────────────────────────────────────
function RecipientPicker({ contacts, tags, filter, onChange }) {
  const segment = filter?.segment || 'all'
  const selectedTags = filter?.tags || []

  const matchingCount = useMemo(() => {
    const list = contacts ?? []
    if (segment === 'all') return list.filter(c => c.email).length
    if (segment === 'buyers') return list.filter(c => c.email && (c.type === 'buyer' || c.type === 'both')).length
    if (segment === 'sellers') return list.filter(c => c.email && (c.type === 'seller' || c.type === 'both')).length
    if (segment === 'leads') return list.filter(c => c.email && c.type === 'lead').length
    if (segment === 'investors') return list.filter(c => c.email && c.type === 'investor').length
    if (segment === 'past_clients') return list.filter(c => c.email && c.stage === 'Closed').length
    return list.filter(c => c.email).length
  }, [contacts, segment])

  return (
    <div className="nl-recipient-picker">
      <p className="nl-recipient-picker__label">Send To</p>
      <div className="nl-recipient-picker__segments">
        {SEGMENTS.map(s => (
          <button
            key={s.key}
            className={`nl-segment-btn${segment === s.key ? ' nl-segment-btn--active' : ''}`}
            onClick={() => onChange({ ...filter, segment: s.key })}
          >
            {s.label}
          </button>
        ))}
      </div>
      {segment === 'tagged' && (
        <div className="nl-recipient-picker__tags">
          {(tags ?? []).map(t => (
            <button
              key={t.id}
              className={`nl-tag-btn${selectedTags.includes(t.name) ? ' nl-tag-btn--active' : ''}`}
              style={{ '--tag-color': t.color }}
              onClick={() => {
                const next = selectedTags.includes(t.name)
                  ? selectedTags.filter(n => n !== t.name)
                  : [...selectedTags, t.name]
                onChange({ ...filter, segment: 'tagged', tags: next })
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      <p className="nl-recipient-picker__count">{matchingCount} recipient{matchingCount !== 1 ? 's' : ''} with email addresses</p>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function Newsletters() {
  const { data: nlData, loading, refetch } = useNewsletters()
  const { data: contactsData } = useContacts()
  const { data: tagsData } = useTags()
  const { brand } = useBrand()
  const sig = brand?.signature ?? {}
  const newsletters = nlData ?? []
  const contacts = contactsData ?? []

  const [tab, setTab] = useState('drafts')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingNL, setEditingNL] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Editor state
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [blocks, setBlocks] = useState([])
  const [settings, setSettings] = useState({ bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 })
  const [recipientFilter, setRecipientFilter] = useState({ segment: 'all' })
  const [scheduledFor, setScheduledFor] = useState('')
  const [sendDomain, setSendDomain] = useState('primary')

  const drafts = newsletters.filter(n => n.status === 'draft')
  const scheduled = newsletters.filter(n => n.status === 'scheduled')
  const sent = newsletters.filter(n => n.status === 'sent' || n.status === 'sending')

  const openCreate = (template) => {
    const tplBlocks = template
      ? template.blocks.map(b => fillSigBlock({ ...b, id: crypto.randomUUID() }, sig))
      : [fillSigBlock(newBlock('header'), sig), fillSigBlock(newBlock('greeting'), sig), fillSigBlock(newBlock('text'), sig), fillSigBlock(newBlock('signature'), sig)]
    setEditingNL(null)
    setName(template?.name || '')
    setSubject(template?.subject || '')
    setBlocks(tplBlocks)
    setSettings({ bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 })
    setRecipientFilter({ segment: 'all' })
    setScheduledFor('')
    setSendDomain('primary')
    setEditorOpen(true)
  }

  const openEdit = (nl) => {
    setEditingNL(nl)
    setName(nl.name)
    setSubject(nl.subject || '')
    setBlocks(nl.email_blocks || [])
    setSettings(nl.email_settings || { bgColor: '#e8e4de', emailBgColor: '#ffffff', fontFamily: '', borderRadius: 6 })
    setRecipientFilter(nl.recipient_filter || { segment: 'all' })
    setScheduledFor(nl.scheduled_for ? new Date(nl.scheduled_for).toISOString().slice(0, 16) : '')
    setSendDomain(nl.send_via_domain || 'primary')
    setEditorOpen(true)
  }

  const handleSave = async (status = 'draft') => {
    setSaving(true); setError(null)
    try {
      const row = {
        name: name.trim() || 'Untitled Newsletter',
        subject: subject.trim(),
        email_blocks: blocks,
        email_settings: settings,
        recipient_filter: recipientFilter,
        send_via_domain: sendDomain,
        status,
        scheduled_for: status === 'scheduled' && scheduledFor ? new Date(scheduledFor).toISOString() : null,
      }
      if (editingNL?.id) {
        await DB.updateNewsletter(editingNL.id, row)
      } else {
        await DB.createNewsletter(row)
      }
      await refetch()
      setEditorOpen(false)
    } catch (e) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this newsletter?')) return
    await DB.deleteNewsletter(id)
    await refetch()
  }

  if (loading && !newsletters.length) return <div className="page-loading">Loading newsletters...</div>

  // ─── Editor View ───
  if (editorOpen) {
    return (
      <div className="nl-editor">
        <div className="nl-editor__topbar">
          <Button variant="ghost" size="sm" onClick={() => setEditorOpen(false)}>← Back</Button>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Newsletter name..."
            style={{ flex: 1, maxWidth: 400 }}
          />
          <div className="nl-editor__topbar-actions">
            <Button variant="secondary" size="sm" onClick={() => handleSave('draft')} disabled={saving}>Save Draft</Button>
            {scheduledFor && (
              <Button variant="primary" size="sm" onClick={() => handleSave('scheduled')} disabled={saving}>Schedule</Button>
            )}
          </div>
        </div>
        {/* Compliance gate */}
        <div style={{ margin: '8px 0' }}>
          <ComplianceCheck
            targetKind="newsletter"
            targetId={editing?.id || 'draft'}
            content={[subject, ...(blocks ?? []).filter(b => b.type === 'text' || b.type === 'heading').map(b => b.text || b.label || '')].join(' ')}
          />
        </div>

        {/* Recipient picker + schedule */}
        <div className="nl-editor__meta">
          <RecipientPicker contacts={contacts} tags={tagsData} filter={recipientFilter} onChange={setRecipientFilter} />
          <div className="nl-editor__schedule">
            <Input label="Schedule for (optional)" type="datetime-local" value={scheduledFor} onChange={e => setScheduledFor(e.target.value)} />
            <Select label="Send From" value={sendDomain} onChange={e => setSendDomain(e.target.value)}>
              <option value="primary">danamassey.com (warm)</option>
              <option value="subdomain">mail.danamassey.com (cold)</option>
            </Select>
          </div>
        </div>

        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem', padding: '0 16px' }}>{error}</p>}

        <BlockComposer
          blocks={blocks}
          settings={settings}
          onChangeBlocks={setBlocks}
          onChangeSettings={setSettings}
          subject={subject}
          onChangeSubject={setSubject}
          showPropertyFill
        />
      </div>
    )
  }

  // ─── List View ───
  return (
    <div className="newsletters">
      <SectionHeader
        title="Newsletters"
        subtitle="One-shot bulk emails to your database"
        actions={
          <Button variant="primary" size="md" onClick={() => openCreate(null)}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >New Newsletter</Button>
        }
      />

      <TabBar
        tabs={[
          { label: 'Drafts', value: 'drafts', count: drafts.length },
          { label: 'Scheduled', value: 'scheduled', count: scheduled.length },
          { label: 'Sent', value: 'sent', count: sent.length },
          { label: 'Templates', value: 'templates', count: NEWSLETTER_TEMPLATES.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Drafts */}
      {tab === 'drafts' && (
        drafts.length === 0
          ? <p className="nl-empty">No drafts yet. Create a newsletter or start from a template.</p>
          : <div className="nl-grid">
              {drafts.map(nl => (
                <Card key={nl.id} className="nl-card" hover onClick={() => openEdit(nl)}>
                  <div className="nl-card__header">
                    <h3 className="nl-card__name">{nl.name}</h3>
                    <Badge variant="info" size="sm">Draft</Badge>
                  </div>
                  <p className="nl-card__subject">{nl.subject || 'No subject'}</p>
                  <p className="nl-card__meta">Created {fmtDate(nl.created_at)}</p>
                  <div className="nl-card__actions" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(nl.id)}>Delete</Button>
                  </div>
                </Card>
              ))}
            </div>
      )}

      {/* Scheduled */}
      {tab === 'scheduled' && (
        scheduled.length === 0
          ? <p className="nl-empty">No newsletters scheduled.</p>
          : <div className="nl-grid">
              {scheduled.map(nl => (
                <Card key={nl.id} className="nl-card" hover onClick={() => openEdit(nl)}>
                  <div className="nl-card__header">
                    <h3 className="nl-card__name">{nl.name}</h3>
                    <Badge variant="warning" size="sm">Scheduled</Badge>
                  </div>
                  <p className="nl-card__subject">{nl.subject || 'No subject'}</p>
                  <p className="nl-card__meta">Sends {fmtDateTime(nl.scheduled_for)} · {nl.recipient_count || '—'} recipients</p>
                  <div className="nl-card__actions" onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={async () => { await DB.updateNewsletter(nl.id, { status: 'cancelled' }); refetch() }}>Cancel</Button>
                  </div>
                </Card>
              ))}
            </div>
      )}

      {/* Sent */}
      {tab === 'sent' && (
        sent.length === 0
          ? <p className="nl-empty">No newsletters sent yet.</p>
          : <div className="nl-grid">
              {sent.map(nl => (
                <Card key={nl.id} className="nl-card" hover>
                  <div className="nl-card__header">
                    <h3 className="nl-card__name">{nl.name}</h3>
                    <Badge variant="success" size="sm">Sent</Badge>
                  </div>
                  <p className="nl-card__subject">{nl.subject || 'No subject'}</p>
                  <p className="nl-card__meta">Sent {fmtDateTime(nl.sent_at)} · {nl.recipient_count || 0} recipients</p>
                  <div className="nl-card__stats">
                    <span>{nl.delivered_count || 0} delivered</span>
                    <span>{nl.opened_count || 0} opened</span>
                    <span>{nl.clicked_count || 0} clicked</span>
                    {nl.bounced_count > 0 && <span className="nl-stat--bad">{nl.bounced_count} bounced</span>}
                  </div>
                </Card>
              ))}
            </div>
      )}

      {/* Templates */}
      {tab === 'templates' && (
        <div className="nl-templates">
          {['Weekly', 'Occasional'].map(cat => (
            <div key={cat} className="nl-templates__section">
              <h3 className="nl-templates__cat" style={{ color: CATEGORY_COLORS[cat] }}>
                {cat} Templates ({NEWSLETTER_TEMPLATES.filter(t => t.category === cat).length})
              </h3>
              <div className="nl-templates__grid">
                {NEWSLETTER_TEMPLATES.filter(t => t.category === cat).map(tpl => (
                  <button key={tpl.id} className="nl-tpl-card" onClick={() => openCreate(tpl)}>
                    <span className="nl-tpl-card__emoji">{tpl.emoji}</span>
                    <span className="nl-tpl-card__name">{tpl.name}</span>
                    <span className="nl-tpl-card__blocks">{tpl.blocks.length} blocks</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

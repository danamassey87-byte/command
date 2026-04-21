import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, SectionHeader, TabBar, DataTable, Card, CheckItem, SlidePanel, Input, Select, Textarea, AddressLink } from '../../components/ui/index.jsx'
import LeadSourcePicker from '../../components/ui/LeadSourcePicker.jsx'
import PartiesSection from '../../components/parties/PartiesSection.jsx'
import RelatedPeopleSection, { cleanRelatedPeople, RelatedPeopleDisplay } from '../../components/related-people/RelatedPeopleSection.jsx'
import { TagPicker } from '../../components/ui/TagPicker.jsx'
import { useListings, useTasksForListing, useDeletedTasksForListing, useAllChecklistTasks, useContactTags, useNotesForContact, useDocumentsForListing, useOpenHouses, usePriceHistory, usePlatformStats, usePlatformTotals, useOffersForListing, useStatTasksForListing, useAdCampaignsForListing, useExpensesForListing, useExpenseCategories, useAllExpenses, useShowingSessions } from '../../lib/hooks.js'
import { useNotesContext } from '../../lib/NotesContext.jsx'
import FavoriteButton from '../../components/layout/FavoriteButton.jsx'
import * as DB from '../../lib/supabase.js'
import { emit as emitNotification, emitListingContentReminder } from '../../lib/notifications.js'
import SendEmailModal from '../../components/email/SendEmailModal'
import InteractionsTimeline from '../../components/InteractionsTimeline.jsx'
import SocialProfilesPanel from '../../components/SocialProfilesPanel.jsx'
import LifeEventsPanel from '../../components/LifeEventsPanel.jsx'
import FamilyLinksPanel from '../../components/FamilyLinksPanel.jsx'
import ChecklistRunner from '../../components/ChecklistRunner.jsx'
import SellerWeeklyUpdate from '../../components/SellerWeeklyUpdate.jsx'
import IntakeFormTracker from '../../components/IntakeFormTracker.jsx'
import './Sellers.css'

// ─── Checklist definitions ────────────────────────────────────────────────────
const launchChecklist = [
  { label: 'Pre-listing appointment email sent (what to expect)', phase: 'prep' },
  { label: 'Post listing appointment follow-up email sent', phase: 'prep' },
  { label: 'Professional photography scheduled',           phase: 'prep' },
  { label: 'Pre-listing walkthrough complete',             phase: 'prep' },
  { label: 'Comparable market analysis delivered',         phase: 'prep' },
  { label: 'Listing agreement signed',                     phase: 'prep' },
  { label: 'Disclosure package prepared',                  phase: 'prep' },
  { label: 'Coming Soon status activated in MLS',          phase: 'mls' },
  { label: 'Yard sign & lockbox installed',                phase: 'mls' },
  { label: 'Listing goes Active in MLS',                   phase: 'mls' },
  { label: "We're Live email sent to seller",               phase: 'mls' },
  { label: 'Syndication to Zillow, Realtor.com confirmed', phase: 'mls' },
  { label: 'Social media announcement posted',             phase: 'marketing' },
  { label: 'Just Listed postcards mailed to neighborhood', phase: 'marketing' },
  { label: 'Feature sheets printed for showings',          phase: 'marketing' },
  { label: 'First open house scheduled',                   phase: 'marketing' },
  { label: 'Showing feedback system enabled',              phase: 'marketing' },
]

const relaunchChecklist = [
  { label: 'Seller consultation — review market feedback',             phase: 'analysis' },
  { label: 'Pricing strategy re-evaluated with new comps',             phase: 'analysis' },
  { label: 'Identify reasons for no offers (price, condition, photos)', phase: 'analysis' },
  { label: 'New professional photos taken (if needed)',                phase: 'refresh' },
  { label: 'Property improvements / staging implemented',              phase: 'refresh' },
  { label: 'Listing description rewritten with new angle',             phase: 'refresh' },
  { label: 'Price reduced to competitive position',                    phase: 'relaunch' },
  { label: 'Status changed to Active again in MLS',                   phase: 'relaunch' },
  { label: 'Price Change announcement on social media',                phase: 'relaunch' },
  { label: 'Re-mail to neighborhood with new price',                  phase: 'relaunch' },
  { label: 'New open house scheduled within 2 weeks',                  phase: 'relaunch' },
  { label: 'Notify buyer-side agents with price change',               phase: 'relaunch' },
]

const phaseLabels = {
  prep:     { label: 'Preparation', color: 'var(--brown-mid)' },
  mls:      { label: 'MLS',         color: '#6a9e72' },
  marketing:{ label: 'Marketing',   color: '#b79782' },
  analysis: { label: 'Analysis',    color: 'var(--brown-warm)' },
  refresh:  { label: 'Refresh',     color: '#c99a2e' },
  relaunch: { label: 'Relaunch',    color: '#6a9e72' },
}

// Status vocabulary matches ARMLS / generic MLS states so you can mark a listing's
// real MLS status and have it reflected everywhere.
//
//   lead        — pre-sign, no paperwork (pipeline only — lives on Sellers page)
//   signed      — agreement signed but NOT yet entered in the MLS (graduates to
//                 Listings page but doesn't imply an MLS record yet)
//   coming_soon — actually entered in the MLS as Coming Soon
//   active      — MLS Active
//   pending     — MLS Pending (under contract, no contingencies)
//   contingent  — MLS Active Contingent / Pending-Contingent
//   closed      — MLS Closed / Sold
//   withdrawn   — MLS Withdrawn (temporarily off, agreement still active)
//   cancelled   — MLS Cancelled
//   expired     — MLS Expired
//   relaunching — internal — between campaigns
const STATUS_OPTIONS = [
  { value: 'lead',        label: 'Lead (Not Signed)' },
  { value: 'signed',      label: 'Signed (Not in MLS yet)' },
  { value: 'coming_soon', label: 'Coming Soon (MLS)' },
  { value: 'active',      label: 'Active (MLS)' },
  { value: 'pending',     label: 'Pending (MLS)' },
  { value: 'contingent',  label: 'Contingent (MLS)' },
  { value: 'closed',      label: 'Closed (MLS)' },
  { value: 'withdrawn',   label: 'Withdrawn (MLS)' },
  { value: 'cancelled',   label: 'Cancelled (MLS)' },
  { value: 'expired',     label: 'Expired (MLS)' },
  { value: 'relaunching', label: 'Relaunching' },
]
// Lookup for label + legacy value handling elsewhere in the file.
const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]))
// MLS-style statuses (vs. pre-sign / internal). Used to decide whether a listing
// represents a real MLS record you should be able to edit the MLS status on.
const MLS_STATUSES = ['coming_soon', 'active', 'pending', 'contingent', 'closed', 'withdrawn', 'cancelled', 'expired']
const TYPE_OPTIONS   = ['new', 'expired']

const CASH_OFFER_STATUSES = [
  { value: 'none',      label: 'None' },
  { value: 'requested', label: 'Requested' },
  { value: 'received',  label: 'Received' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'accepted',  label: 'Accepted' },
  { value: 'declined',  label: 'Declined' },
]
const SHOWING_ACCESS = [
  { value: 'lockbox',             label: 'Lockbox' },
  { value: 'appointment_only',    label: 'Appointment Only' },
  { value: 'occupied_flexible',   label: 'Occupied — Flexible' },
  { value: 'occupied_restricted', label: 'Occupied — Restricted' },
  { value: 'vacant',              label: 'Vacant' },
]
const STAGING_OPTIONS = [
  { value: 'none',    label: 'None' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'partial', label: 'Partial' },
  { value: 'full',    label: 'Full' },
]
const PHOTO_STATUSES = [
  { value: 'not_scheduled', label: 'Not Scheduled' },
  { value: 'scheduled',     label: 'Scheduled' },
  { value: 'completed',     label: 'Completed' },
]
const MOTIVATION_OPTIONS = [
  { value: 'high',   label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low',    label: 'Low' },
]
const CONCESSION_OPTIONS = [
  { value: 'none',          label: 'None' },
  { value: 'closing_costs', label: 'Closing Costs' },
  { value: 'rate_buydown',  label: 'Rate Buydown' },
  { value: 'home_warranty', label: 'Home Warranty' },
  { value: 'repairs',       label: 'Repairs' },
  { value: 'multiple',      label: 'Multiple' },
]
const CONDITION_OPTIONS = [
  { value: 'move_in_ready',     label: 'Move-In Ready' },
  { value: 'minor_updates',     label: 'Minor Updates' },
  { value: 'needs_work',        label: 'Needs Work' },
  { value: 'major_renovation',  label: 'Major Renovation' },
]

const statusVariant = {
  lead: 'default',
  signed: 'warning',      // signed but not yet in MLS — treat as a loud "get it live!" state
  coming_soon: 'info',
  active: 'success',
  pending: 'info',
  contingent: 'info',
  closed: 'default',
  withdrawn: 'warning',
  cancelled: 'danger',
  expired: 'danger',
  relaunching: 'warning',
}

// ─── Inline MLS Status Picker ─────────────────────────────────────────────────
// Shows the current status as a Badge, and on click reveals a native <select>
// so Dana can change the MLS state of any listing without opening the edit form.
// Stops click propagation so it doesn't trigger the row's onRowClick handler.
function InlineStatusPicker({ value, variant, onChange }) {
  const [editing, setEditing] = useState(false)
  if (editing) {
    return (
      <select
        autoFocus
        value={value || ''}
        onClick={e => e.stopPropagation()}
        onBlur={() => setEditing(false)}
        onChange={e => {
          e.stopPropagation()
          const next = e.target.value
          setEditing(false)
          onChange(next)
        }}
        style={{
          padding: '3px 6px', fontSize: '0.78rem', fontWeight: 600,
          border: '1px solid var(--color-border, #e5dfd7)', borderRadius: 6,
          background: '#fff', color: 'var(--brown-dark, #342922)', cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {STATUS_OPTIONS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    )
  }
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); setEditing(true) }}
      title="Click to change MLS status"
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
    >
      <Badge variant={variant}>{STATUS_LABEL[value] ?? value}</Badge>
    </button>
  )
}

// ─── Agreement expiration helpers ─────────────────────────────────────────────
function getAgreementStatus(expiresDate) {
  if (!expiresDate) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const exp = new Date(expiresDate)
  exp.setHours(0, 0, 0, 0)
  const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
  if (daysLeft < 0)  return { label: 'Expired', variant: 'danger', days: daysLeft }
  if (daysLeft === 0) return { label: 'Expires today', variant: 'danger', days: 0 }
  if (daysLeft <= 14) return { label: `${daysLeft}d left`, variant: 'warning', days: daysLeft }
  if (daysLeft <= 30) return { label: `${daysLeft}d left`, variant: 'info', days: daysLeft }
  return { label: `${daysLeft}d`, variant: 'default', days: daysLeft }
}

const cashOfferVariant = {
  none: 'default', requested: 'warning', received: 'info', reviewing: 'info', accepted: 'success', declined: 'danger',
}

// ─── Map Supabase listing row → local shape ───────────────────────────────────
function mapListing(row) {
  const p = row.property ?? {}
  return {
    id:           row.id,
    address:      p.address ?? '',
    city:         p.city    ?? '',
    zip:          p.zip     ?? '',
    listPrice:    row.list_price ? `$${Number(row.list_price).toLocaleString()}` : '—',
    listPriceRaw: row.list_price ?? '',
    currentPrice: row.current_price ? `$${Number(row.current_price).toLocaleString()}` : '',
    currentPriceRaw: row.current_price ?? '',
    closePrice:   row.close_price ?? '',
    listDate:     row.list_date  ?? '',
    status:       row.status     ?? 'active',
    type:         row.type       ?? 'new',
    source:       row.source     ?? (row.type === 'expired' ? 'my_expired' : 'new'),
    strategy:     row.strategy   ?? '',
    strategy_updated_at: row.strategy_updated_at ?? null,
    dom:          row.dom        ?? 0,
    offers:       row.offers_count ?? 0,
    notes:        row.notes      ?? '',
    contact_name: row.contact?.name  ?? '',
    contact_email:row.contact?.email ?? '',
    contact_phone:row.contact?.phone ?? '',
    property_id:  row.property_id,
    contact_id:   row.contact_id,
    contact:      row.contact ?? null,
    related_people: Array.isArray(row.related_people) ? row.related_people : [],
    created_at:   row.created_at,
    // Seller tracking fields
    cash_offer_requested:     row.cash_offer_requested ?? false,
    cash_offer_status:        row.cash_offer_status ?? 'none',
    showing_access:           row.showing_access ?? 'lockbox',
    staging:                  row.staging ?? 'none',
    photography_status:       row.photography_status ?? 'not_scheduled',
    seller_motivation:        row.seller_motivation ?? 'medium',
    concessions:              row.concessions ?? 'none',
    property_condition:       row.property_condition ?? 'move_in_ready',
    commission_rate:          row.commission_rate ?? '',
    listing_agreement_signed: row.listing_agreement_signed ?? false,
    agreement_signed_date:    row.agreement_signed_date ?? '',
    agreement_expires_date:   row.agreement_expires_date ?? '',
    pre_inspection_done:      row.pre_inspection_done ?? false,
    home_warranty_offered:    row.home_warranty_offered ?? false,
    // Property details (from properties table)
    bedrooms:         p.bedrooms ?? '',
    bathrooms:        p.bathrooms ?? '',
    sqft:             p.sqft ?? '',
    property_type:    p.property_type ?? '',
    year_built:       p.year_built ?? '',
    lot_sqft:         p.lot_sqft ?? '',
    lot_acres:        p.lot_acres ?? '',
    garage_spaces:    p.garage_spaces ?? '',
    stories:          p.stories ?? '1',
    pool:             p.pool ?? false,
    spa:              p.spa ?? false,
    hoa_monthly:      p.hoa_monthly ?? '',
    mls_id:           p.mls_id ?? '',
    subdivision:      p.subdivision ?? '',
    school_district:  p.school_district ?? '',
    elementary_school: p.elementary_school ?? '',
    middle_school:    p.middle_school ?? '',
    high_school:      p.high_school ?? '',
    construction:     p.construction ?? '',
    roof_type:        p.roof_type ?? '',
    cooling:          p.cooling ?? '',
    heating:          p.heating ?? '',
    flooring:         p.flooring ?? '',
    parking:          p.parking ?? '',
    landscaping:      p.landscaping ?? '',
    features:         p.features ?? [],
    tax_amount:       p.tax_amount ?? '',
    tax_year:         p.tax_year ?? '',
    apn:              p.apn ?? '',
    description:      p.description ?? '',
    marketing_remarks: p.marketing_remarks ?? '',
    agent_notes:      p.agent_notes ?? '',
    virtual_tour_url: p.virtual_tour_url ?? '',
    image_url:        p.image_url ?? '',
  }
}


// ─── Property Detail Options ───
const PROPERTY_TYPES = ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', 'Mobile Home', 'Land', 'Commercial']
const CONSTRUCTION_TYPES = ['Stucco', 'Block', 'Frame', 'Brick', 'Adobe', 'Stone', 'Other']
const ROOF_TYPES = ['Tile', 'Shingle', 'Flat/Built-Up', 'Metal', 'Foam', 'Other']
const COOLING_TYPES = ['Central A/C', 'Evaporative', 'Mini Split', 'None']
const HEATING_TYPES = ['Forced Air', 'Heat Pump', 'Electric', 'None']
const COMMON_FEATURES = [
  'Granite Counters', 'Quartz Counters', 'Stainless Appliances', 'Kitchen Island',
  'Open Floor Plan', 'Vaulted Ceilings', 'Fireplace', 'Primary Suite',
  'Walk-In Closet', 'Dual Sinks', 'Separate Tub/Shower', 'Ceiling Fans',
  'Covered Patio', 'Extended Patio', 'Built-In BBQ', 'Outdoor Kitchen',
  'RV Gate', 'Solar Panels', 'Solar Owned', 'Solar Leased',
  'Smart Home', 'Security System', 'Water Softener', 'Reverse Osmosis',
  'Epoxy Garage', 'Workshop', 'Guest House / Casita', 'Separate Guest Quarters',
  'Sparkling Pool', 'Heated Pool', 'Spa', 'Putting Green',
  'Community Pool', 'HOA Amenities', 'Tennis Courts', 'Playground',
  'Mountain Views', 'Golf Course Views', 'City/Light Views', 'No HOA',
]

// ─── Seller / Listing Form ────────────────────────────────────────────────────
function ListingForm({ listing, onSave, onDelete, onPutOnHold, onClose, saving, deleting }) {
  const isNew = !listing?.id || typeof listing.id === 'number'
  const contactId = listing?.contact_id
  const { data: tagData } = useContactTags(contactId)
  const [contactTags, setContactTags] = useState([])
  useEffect(() => {
    if (tagData) setContactTags((tagData ?? []).map(ct => ct.tag).filter(Boolean))
  }, [tagData])
  const [draft, setDraft] = useState({
    address:      listing?.address       ?? '',
    city:         listing?.city          ?? '',
    zip:          listing?.zip           ?? '',
    listPrice:    listing?.listPriceRaw  ?? '',
    currentPrice: listing?.currentPriceRaw ?? '',
    closePrice:   listing?.closePrice    ?? '',
    listDate:     listing?.listDate      ?? '',
    type:         listing?.type          ?? 'new',
    status:       listing?.status        ?? 'lead',
    source:       listing?.source        ?? (listing?.type === 'expired' ? 'my_expired' : 'new'),
    dom:          listing?.dom           ?? '',
    offers:       listing?.offers        ?? '',
    // Seller contact — hydrates from the joined contact row (listing.contact)
    // that getListings() returns, with fallbacks to any legacy flat columns.
    seller_name:  listing?.contact?.name  ?? listing?.contact_name  ?? '',
    seller_email: listing?.contact?.email ?? listing?.contact_email ?? '',
    seller_phone: listing?.contact?.phone ?? listing?.contact_phone ?? '',
    seller_lead_source: listing?.contact?.source ?? '',
    related_people: Array.isArray(listing?.related_people) ? listing.related_people : [],
    notes:        listing?.notes         ?? '',
    // Seller tracking
    cash_offer_requested:     listing?.cash_offer_requested ?? false,
    cash_offer_status:        listing?.cash_offer_status ?? 'none',
    showing_access:           listing?.showing_access ?? 'lockbox',
    staging:                  listing?.staging ?? 'none',
    photography_status:       listing?.photography_status ?? 'not_scheduled',
    seller_motivation:        listing?.seller_motivation ?? 'medium',
    concessions:              listing?.concessions ?? 'none',
    property_condition:       listing?.property_condition ?? 'move_in_ready',
    commission_rate:          listing?.commission_rate ?? '',
    listing_agreement_signed: listing?.listing_agreement_signed ?? false,
    agreement_signed_date:    listing?.agreement_signed_date ?? '',
    agreement_expires_date:   listing?.agreement_expires_date ?? '',
    pre_inspection_done:      listing?.pre_inspection_done ?? false,
    home_warranty_offered:    listing?.home_warranty_offered ?? false,
    // Property details
    bedrooms:        listing?.bedrooms         ?? '',
    bathrooms:       listing?.bathrooms        ?? '',
    sqft:            listing?.sqft             ?? '',
    property_type:   listing?.property_type    ?? '',
    year_built:      listing?.year_built       ?? '',
    lot_sqft:        listing?.lot_sqft         ?? '',
    lot_acres:       listing?.lot_acres        ?? '',
    garage_spaces:   listing?.garage_spaces    ?? '',
    stories:         listing?.stories          ?? '1',
    pool:            listing?.pool             ?? false,
    spa:             listing?.spa              ?? false,
    hoa_monthly:     listing?.hoa_monthly      ?? '',
    mls_id:          listing?.mls_id           ?? '',
    subdivision:     listing?.subdivision      ?? '',
    school_district: listing?.school_district  ?? '',
    elementary_school: listing?.elementary_school ?? '',
    middle_school:   listing?.middle_school    ?? '',
    high_school:     listing?.high_school      ?? '',
    construction:    listing?.construction     ?? '',
    roof_type:       listing?.roof_type        ?? '',
    cooling:         listing?.cooling          ?? '',
    heating:         listing?.heating          ?? '',
    flooring:        listing?.flooring         ?? '',
    parking:         listing?.parking          ?? '',
    landscaping:     listing?.landscaping      ?? '',
    features:        listing?.features         ?? [],
    tax_amount:      listing?.tax_amount       ?? '',
    tax_year:        listing?.tax_year         ?? '',
    apn:             listing?.apn              ?? '',
    description:     listing?.description      ?? '',
    marketing_remarks: listing?.marketing_remarks ?? '',
    agent_notes:     listing?.agent_notes      ?? '',
    virtual_tour_url: listing?.virtual_tour_url ?? '',
    image_url:       listing?.image_url        ?? '',
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))
  const [showDetails, setShowDetails] = useState(false)

  const handleSave = () => onSave(draft)

  return (
    <>
      <div className="panel-section">
        <p className="panel-section-label">Property</p>
        <Input label="Address *" value={draft.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
        <div className="panel-row">
          <Input label="City" value={draft.city} onChange={e => set('city', e.target.value)} placeholder="Gilbert" />
          <Input label="Zip" value={draft.zip} onChange={e => set('zip', e.target.value)} placeholder="85296" />
        </div>
        <div className="panel-row">
          <Input label="List Price ($)" type="number" value={draft.listPrice} onChange={e => set('listPrice', e.target.value)} placeholder="529000" />
          <Input label="List Date" type="date" value={draft.listDate} onChange={e => set('listDate', e.target.value)} />
        </div>
        <div className="panel-row">
          <Input label="Current Price ($)" type="number" value={draft.currentPrice} onChange={e => set('currentPrice', e.target.value)} placeholder={draft.listPrice || '529000'} />
          {(draft.status === 'closed' || draft.status === 'pending') && (
            <Input label="Close / Sale Price ($)" type="number" value={draft.closePrice} onChange={e => set('closePrice', e.target.value)} placeholder="515000" />
          )}
        </div>
        {draft.listPrice && draft.currentPrice && Number(draft.currentPrice) < Number(draft.listPrice) && (
          <div className="price-reduction-inline-badge">
            <Badge variant="warning" size="sm">
              Price reduced {((1 - Number(draft.currentPrice) / Number(draft.listPrice)) * 100).toFixed(1)}% from original
            </Badge>
          </div>
        )}
        <div className="panel-row">
          <Select label="Type" value={draft.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'new' ? 'New Listing' : 'Expired'}</option>)}
          </Select>
          <Select label="Status" value={draft.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Select label="Source" value={draft.source} onChange={e => set('source', e.target.value)}>
            <option value="new">Fresh new listing</option>
            <option value="my_expired">My prior expired listing</option>
            <option value="taken_over">Taken over from another agent</option>
            <option value="fsbo">Was FSBO (now my listing)</option>
          </Select>
          <div style={{ flex: 1, fontSize: '0.7rem', color: 'var(--color-text-muted)', alignSelf: 'flex-end', paddingBottom: 8 }}>
            {draft.source === 'taken_over' && 'No access to prior agent\'s data — AI will position as fresh start.'}
            {draft.source === 'my_expired' && 'AI will reference prior showings & feedback history.'}
            {draft.source === 'fsbo' && 'AI will position as "professional marketing + agent network".'}
            {draft.source === 'new' && 'Standard launch plan.'}
          </div>
        </div>
        <div className="panel-row">
          <Input label="DOM" type="number" min="0" value={draft.dom} onChange={e => set('dom', e.target.value)} placeholder="0" />
          <Input label="Offers Received" type="number" min="0" value={draft.offers} onChange={e => set('offers', e.target.value)} placeholder="0" />
        </div>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <button
          type="button"
          className="panel-section-toggle"
          onClick={() => setShowDetails(!showDetails)}
        >
          <p className="panel-section-label" style={{ margin: 0 }}>Property Details</p>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{showDetails ? '▾ Collapse' : '▸ Expand'}</span>
        </button>

        {showDetails && (
          <>
            <div className="panel-row">
              <Input label="Beds" type="number" min="0" value={draft.bedrooms} onChange={e => set('bedrooms', e.target.value)} placeholder="4" />
              <Input label="Baths" type="number" min="0" step="0.5" value={draft.bathrooms} onChange={e => set('bathrooms', e.target.value)} placeholder="2.5" />
              <Input label="Sqft" type="number" min="0" value={draft.sqft} onChange={e => set('sqft', e.target.value)} placeholder="2,100" />
            </div>
            <div className="panel-row">
              <Select label="Property Type" value={draft.property_type} onChange={e => set('property_type', e.target.value)}>
                <option value="">—</option>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Input label="Year Built" type="number" value={draft.year_built} onChange={e => set('year_built', e.target.value)} placeholder="2005" />
            </div>
            <div className="panel-row">
              <Input label="Lot (sqft)" type="number" value={draft.lot_sqft} onChange={e => set('lot_sqft', e.target.value)} placeholder="7,200" />
              <Input label="Lot (acres)" type="number" step="0.01" value={draft.lot_acres} onChange={e => set('lot_acres', e.target.value)} placeholder="0.17" />
            </div>
            <div className="panel-row">
              <Input label="Garage Spaces" type="number" min="0" value={draft.garage_spaces} onChange={e => set('garage_spaces', e.target.value)} placeholder="2" />
              <Input label="Stories" type="number" min="1" value={draft.stories} onChange={e => set('stories', e.target.value)} placeholder="1" />
            </div>
            <div className="panel-row">
              <Input label="MLS #" value={draft.mls_id} onChange={e => set('mls_id', e.target.value)} placeholder="6789012" />
              <Input label="HOA ($/mo)" type="number" min="0" value={draft.hoa_monthly} onChange={e => set('hoa_monthly', e.target.value)} placeholder="0" />
            </div>
            <div className="seller-checkboxes">
              <label className="buyer-checkbox-label">
                <input type="checkbox" checked={draft.pool} onChange={e => set('pool', e.target.checked)} />
                Pool
              </label>
              <label className="buyer-checkbox-label">
                <input type="checkbox" checked={draft.spa} onChange={e => set('spa', e.target.checked)} />
                Spa
              </label>
            </div>

            <hr className="panel-divider" />
            <p className="panel-section-label">Construction & Systems</p>
            <div className="panel-row">
              <Select label="Construction" value={draft.construction} onChange={e => set('construction', e.target.value)}>
                <option value="">—</option>
                {CONSTRUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select label="Roof" value={draft.roof_type} onChange={e => set('roof_type', e.target.value)}>
                <option value="">—</option>
                {ROOF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div className="panel-row">
              <Select label="Cooling" value={draft.cooling} onChange={e => set('cooling', e.target.value)}>
                <option value="">—</option>
                {COOLING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Select label="Heating" value={draft.heating} onChange={e => set('heating', e.target.value)}>
                <option value="">—</option>
                {HEATING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <Input label="Flooring" value={draft.flooring} onChange={e => set('flooring', e.target.value)} placeholder="Tile, Wood, Carpet" />
            <Input label="Parking" value={draft.parking} onChange={e => set('parking', e.target.value)} placeholder="2 Car Garage + RV Gate" />
            <Input label="Landscaping" value={draft.landscaping} onChange={e => set('landscaping', e.target.value)} placeholder="Desert Front, Grass Back" />

            <hr className="panel-divider" />
            <p className="panel-section-label">Location</p>
            <Input label="Subdivision" value={draft.subdivision} onChange={e => set('subdivision', e.target.value)} placeholder="Power Ranch" />
            <Input label="School District" value={draft.school_district} onChange={e => set('school_district', e.target.value)} placeholder="Gilbert Unified" />
            <div className="panel-row">
              <Input label="Elementary" value={draft.elementary_school} onChange={e => set('elementary_school', e.target.value)} />
              <Input label="Middle" value={draft.middle_school} onChange={e => set('middle_school', e.target.value)} />
            </div>
            <Input label="High School" value={draft.high_school} onChange={e => set('high_school', e.target.value)} />

            <hr className="panel-divider" />
            <p className="panel-section-label">Tax & ID</p>
            <div className="panel-row">
              <Input label="Tax Amount (annual)" type="number" value={draft.tax_amount} onChange={e => set('tax_amount', e.target.value)} placeholder="2,400" />
              <Input label="Tax Year" type="number" value={draft.tax_year} onChange={e => set('tax_year', e.target.value)} placeholder="2025" />
            </div>
            <Input label="APN (Parcel #)" value={draft.apn} onChange={e => set('apn', e.target.value)} placeholder="304-12-345" />

            <hr className="panel-divider" />
            <p className="panel-section-label">Features</p>
            <div className="seller-features-grid">
              {COMMON_FEATURES.map(feat => (
                <label key={feat} className="buyer-checkbox-label">
                  <input
                    type="checkbox"
                    checked={(draft.features || []).includes(feat)}
                    onChange={e => {
                      const current = draft.features || []
                      set('features', e.target.checked ? [...current, feat] : current.filter(f => f !== feat))
                    }}
                  />
                  {feat}
                </label>
              ))}
            </div>

            <hr className="panel-divider" />
            <p className="panel-section-label">Descriptions</p>
            <Textarea label="MLS Description" rows={3} value={draft.description} onChange={e => set('description', e.target.value)} placeholder="Property description for MLS..." />
            <Textarea label="Marketing Remarks" rows={3} value={draft.marketing_remarks} onChange={e => set('marketing_remarks', e.target.value)} placeholder="Public-facing marketing copy..." />
            <Input label="Virtual Tour URL" value={draft.virtual_tour_url} onChange={e => set('virtual_tour_url', e.target.value)} placeholder="https://..." />
            <Textarea label="Agent Notes (internal)" rows={2} value={draft.agent_notes} onChange={e => set('agent_notes', e.target.value)} placeholder="Notes not shown to clients..." />
          </>
        )}
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Seller Contact</p>
        <Input label="Seller Name" value={draft.seller_name} onChange={e => set('seller_name', e.target.value)} placeholder="First & Last Name" />
        <div className="panel-row">
          <Input label="Phone" value={draft.seller_phone} onChange={e => set('seller_phone', e.target.value)} placeholder="(480) 555-0000" />
          <Input label="Email" value={draft.seller_email} onChange={e => set('seller_email', e.target.value)} placeholder="email@example.com" />
        </div>
        <LeadSourcePicker label="Lead Source" value={draft.seller_lead_source} onChange={v => set('seller_lead_source', v)} />
        <RelatedPeopleSection
          value={draft.related_people}
          onChange={v => set('related_people', v)}
          title="Other Parties on This Transaction"
          subtitle="Co-seller, spouse, trustee, attorney, etc. — anyone else on the contract."
        />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Seller Tracking</p>
        <div className="panel-row">
          <Select label="Cash Offer Status" value={draft.cash_offer_status} onChange={e => set('cash_offer_status', e.target.value)}>
            {CASH_OFFER_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Showing Access" value={draft.showing_access} onChange={e => set('showing_access', e.target.value)}>
            {SHOWING_ACCESS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Select label="Staging" value={draft.staging} onChange={e => set('staging', e.target.value)}>
            {STAGING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Photography" value={draft.photography_status} onChange={e => set('photography_status', e.target.value)}>
            {PHOTO_STATUSES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Select label="Seller Motivation" value={draft.seller_motivation} onChange={e => set('seller_motivation', e.target.value)}>
            {MOTIVATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Property Condition" value={draft.property_condition} onChange={e => set('property_condition', e.target.value)}>
            {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div className="panel-row">
          <Select label="Concessions Offered" value={draft.concessions} onChange={e => set('concessions', e.target.value)}>
            {CONCESSION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="Commission (%)" type="number" step="0.1" min="0" max="10" value={draft.commission_rate} onChange={e => set('commission_rate', e.target.value)} placeholder="3.0" />
        </div>
        <hr className="panel-divider" />
        <p className="panel-section-label">Listing Agreement</p>
        <div className="panel-row">
          <Input label="Agreement Signed" type="date" value={draft.agreement_signed_date} onChange={e => { set('agreement_signed_date', e.target.value); if (e.target.value) set('listing_agreement_signed', true); else set('listing_agreement_signed', false) }} />
          <Input label="Agreement Expires" type="date" value={draft.agreement_expires_date} onChange={e => set('agreement_expires_date', e.target.value)} />
        </div>
        {draft.agreement_expires_date && (() => {
          const agr = getAgreementStatus(draft.agreement_expires_date)
          return agr ? (
            <div style={{ marginTop: 4 }}>
              <Badge variant={agr.variant} size="sm">{agr.label}</Badge>
            </div>
          ) : null
        })()}
        <div className="seller-checkboxes" style={{ marginTop: 'var(--space-sm)' }}>
          <label className="buyer-checkbox-label">
            <input type="checkbox" checked={draft.pre_inspection_done} onChange={e => set('pre_inspection_done', e.target.checked)} />
            Pre-Listing Inspection Done
          </label>
          <label className="buyer-checkbox-label">
            <input type="checkbox" checked={draft.home_warranty_offered} onChange={e => set('home_warranty_offered', e.target.checked)} />
            Home Warranty Offered
          </label>
        </div>
      </div>

      <hr className="panel-divider" />
      <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Key notes, seller goals, timeline…" />

      {!isNew && contactId && (
        <>
          <hr className="panel-divider" />
          <div className="panel-section">
            <p className="panel-section-label">Seller Tags</p>
            <TagPicker
              contactId={contactId}
              assignedTags={contactTags}
              onTagsChange={setContactTags}
            />
          </div>
        </>
      )}

      {listing?.created_at && (
        <p className="panel-timestamp">Added {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      )}

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !draft.address.trim()}>
          {saving ? 'Saving…' : isNew ? 'Add Listing' : 'Save Changes'}
        </Button>
        {!isNew && contactId && (
          <Button variant="warning" size="sm" onClick={onPutOnHold} disabled={saving}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>}
          >Put Seller on Hold</Button>
        )}
        {!isNew && (
          <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
            {deleting ? 'Removing…' : 'Delete'}
          </Button>
        )}
      </div>
    </>
  )
}

// ─── Document category helpers ───────────────────────────────────────────────
const DOC_CATEGORIES = [
  { value: 'general',     label: 'General' },
  { value: 'disclosure',  label: 'Disclosure' },
  { value: 'contract',    label: 'Contract' },
  { value: 'inspection',  label: 'Inspection' },
  { value: 'photo',       label: 'Photo' },
  { value: 'marketing',   label: 'Marketing' },
  { value: 'appraisal',   label: 'Appraisal' },
]

const fileIcon = (type) => {
  if (!type) return '📄'
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(type)) return '🖼'
  if (type === 'application/pdf' || type === 'pdf') return '📑'
  if (type.includes('word') || type === 'docx' || type === 'doc') return '📝'
  if (type.includes('sheet') || type === 'xlsx' || type === 'csv') return '📊'
  return '📄'
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Add Checklist Item Modal ────────────────────────────────────────────────
function AddTaskModal({ listing, onClose, onAdded }) {
  const [label, setLabel] = useState('')
  const [phase, setPhase] = useState(listing.type === 'new' ? 'prep' : 'analysis')
  const [scope, setScope] = useState('this')  // 'this' | 'all_current' | 'all_future' | 'all_both'
  const [saving, setSaving] = useState(false)

  const isNew = listing.type === 'new'
  const phaseOptions = isNew
    ? [{ value: 'prep', label: 'Preparation' }, { value: 'mls', label: 'MLS' }, { value: 'marketing', label: 'Marketing' }]
    : [{ value: 'analysis', label: 'Analysis' }, { value: 'refresh', label: 'Refresh' }, { value: 'relaunch', label: 'Relaunch' }]

  const handleAdd = async () => {
    if (!label.trim()) return
    setSaving(true)
    try {
      if (scope === 'this') {
        await DB.createTask({
          listing_id: listing.id,
          phase,
          label: label.trim(),
          sort_order: 99,
          completed: false,
        })
      } else {
        // Get all listings of same type
        const allListings = await DB.getListings()
        const targetListings = allListings.filter(l => l.type === listing.type)

        if (scope === 'all_current' || scope === 'all_both') {
          const taskRows = targetListings.map(l => ({
            listing_id: l.id,
            phase,
            label: label.trim(),
            sort_order: 99,
            completed: false,
          }))
          if (taskRows.length) await DB.bulkCreateTasks(taskRows)
        }

        if (scope === 'all_future' || scope === 'all_both') {
          // Add to the template checklist (stored in localStorage for persistence)
          const storageKey = isNew ? 'custom_launch_tasks' : 'custom_relaunch_tasks'
          const existing = JSON.parse(localStorage.getItem(storageKey) || '[]')
          existing.push({ label: label.trim(), phase })
          localStorage.setItem(storageKey, JSON.stringify(existing))
        }

        if (scope === 'this') {
          await DB.createTask({
            listing_id: listing.id,
            phase,
            label: label.trim(),
            sort_order: 99,
            completed: false,
          })
        }
      }
      await DB.logActivity('task_created', `Added checklist item: ${label.trim()}`)
      onAdded()
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="plan-modal__overlay" onClick={onClose}>
      <div className="plan-modal" onClick={e => e.stopPropagation()}>
        <div className="plan-modal__header">
          <h3>Add Checklist Item</h3>
          <button className="plan-modal__close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="plan-modal__body">
          <label className="plan-modal__label">
            Task
            <input
              className="plan-modal__input"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Schedule drone photography"
              autoFocus
            />
          </label>

          <label className="plan-modal__label">
            Phase
            <select className="plan-modal__select" value={phase} onChange={e => setPhase(e.target.value)}>
              {phaseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>

          <fieldset className="plan-modal__fieldset">
            <legend className="plan-modal__legend">Apply to</legend>
            <label className="plan-modal__radio-label">
              <input type="radio" name="scope" value="this" checked={scope === 'this'} onChange={() => setScope('this')} />
              This listing only
            </label>
            <label className="plan-modal__radio-label">
              <input type="radio" name="scope" value="all_current" checked={scope === 'all_current'} onChange={() => setScope('all_current')} />
              All current {isNew ? 'new' : 'expired'} listings
            </label>
            <label className="plan-modal__radio-label">
              <input type="radio" name="scope" value="all_future" checked={scope === 'all_future'} onChange={() => setScope('all_future')} />
              All new {isNew ? 'launch' : 'relaunch'} plans going forward
            </label>
            <label className="plan-modal__radio-label">
              <input type="radio" name="scope" value="all_both" checked={scope === 'all_both'} onChange={() => setScope('all_both')} />
              All current + all future
            </label>
          </fieldset>
        </div>

        <div className="plan-modal__footer">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleAdd} disabled={!label.trim() || saving}>
            {saving ? 'Adding…' : 'Add Item'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Price Reduction Modal ──────────────────────────────────────────────────
const REDUCTION_REASONS = [
  { value: 'market_feedback', label: 'Market Feedback — Showings but No Offers' },
  { value: 'low_traffic',     label: 'Low Traffic / Few Showings' },
  { value: 'comp_adjustment', label: 'New Comps Indicate Lower Value' },
  { value: 'dom_strategy',    label: 'DOM Strategy — Planned Reduction' },
  { value: 'appraisal',       label: 'Appraisal Came In Low' },
  { value: 'seller_motivated',label: 'Seller Wants Faster Sale' },
  { value: 'seasonal',        label: 'Seasonal Adjustment' },
  { value: 'condition',       label: 'Inspection / Condition Issue' },
  { value: 'other',           label: 'Other' },
]

function PriceReductionModal({ listing, onClose, onSaved }) {
  const currentPrice = Number(listing.currentPriceRaw || listing.listPriceRaw) || 0
  const originalPrice = Number(listing.listPriceRaw) || 0

  const [newPrice, setNewPrice] = useState('')
  const [reason, setReason] = useState('market_feedback')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [updateContent, setUpdateContent] = useState(true)
  const [unpublishedCount, setUnpublishedCount] = useState(0)

  // Check for unpublished content on mount
  useEffect(() => {
    if (listing.property_id) {
      DB.getUnpublishedContentForProperty(listing.property_id)
        .then(items => setUnpublishedCount(items?.length ?? 0))
        .catch(() => {})
    }
  }, [listing.property_id])

  const newPriceNum = Number(newPrice) || 0
  const reductionAmount = currentPrice - newPriceNum
  const reductionPct = currentPrice > 0 ? ((reductionAmount / currentPrice) * 100) : 0
  const cumulativePct = originalPrice > 0 ? (((originalPrice - newPriceNum) / originalPrice) * 100) : 0

  const handleSave = async () => {
    if (!newPriceNum || newPriceNum <= 0) return
    setSaving(true)
    setError(null)
    try {
      await DB.recordPriceReduction(listing.id, {
        newPrice: newPriceNum,
        reason,
        notes: notes.trim() || null,
      })
      await DB.logActivity('price_reduction', `Price reduced: ${listing.address} — $${currentPrice.toLocaleString()} → $${newPriceNum.toLocaleString()} (${reductionPct.toFixed(1)}%)`, {
        propertyId: listing.property_id,
      })

      // Emit notification
      emitNotification({
        type: 'price_change',
        title: `Price Reduction: ${listing.address}`,
        body: `$${currentPrice.toLocaleString()} → $${newPriceNum.toLocaleString()} (-${reductionPct.toFixed(1)}%)${unpublishedCount > 0 && updateContent ? ` · ${unpublishedCount} content piece(s) flagged for update` : ''}`,
        link: '/crm/sellers',
        source_table: 'listings',
        source_id: listing.id,
        metadata: { previousPrice: currentPrice, newPrice: newPriceNum, reason },
      }).catch(err => console.error('notification emit failed', err))

      onSaved()
      onClose()
    } catch (e) {
      setError(e.message || 'Failed to record price reduction')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="plan-modal__overlay" onClick={onClose}>
      <div className="plan-modal plan-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="plan-modal__header">
          <h3>Record Price Reduction</h3>
          <button className="plan-modal__close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="plan-modal__body">
          {/* Property context */}
          <div className="plan-modal__context-card">
            <div className="plan-modal__context-item">
              <span className="plan-modal__context-key">Property</span>
              <span>{listing.address}, {listing.city}</span>
            </div>
            <div className="plan-modal__context-item">
              <span className="plan-modal__context-key">Original List</span>
              <span>${originalPrice.toLocaleString()}</span>
            </div>
            <div className="plan-modal__context-item">
              <span className="plan-modal__context-key">Current Price</span>
              <span>${currentPrice.toLocaleString()}</span>
            </div>
            <div className="plan-modal__context-item">
              <span className="plan-modal__context-key">DOM</span>
              <span>{listing.dom || 0}</span>
            </div>
          </div>

          {/* New price input */}
          <label className="plan-modal__label">
            New Price ($)
            <input
              className="plan-modal__input"
              type="number"
              value={newPrice}
              onChange={e => setNewPrice(e.target.value)}
              placeholder={`e.g. ${Math.round(currentPrice * 0.95).toLocaleString()}`}
              autoFocus
            />
          </label>

          {/* Live calculation preview */}
          {newPriceNum > 0 && (
            <div className="price-reduction-preview">
              <div className="price-reduction-preview__row">
                <span>This reduction</span>
                <span className={reductionAmount > 0 ? 'price-reduction-preview__negative' : 'price-reduction-preview__positive'}>
                  {reductionAmount > 0 ? '-' : '+'}${Math.abs(reductionAmount).toLocaleString()} ({Math.abs(reductionPct).toFixed(1)}%)
                </span>
              </div>
              {originalPrice !== currentPrice && (
                <div className="price-reduction-preview__row">
                  <span>Total from original list</span>
                  <span className="price-reduction-preview__negative">
                    -${(originalPrice - newPriceNum).toLocaleString()} ({cumulativePct.toFixed(1)}%)
                  </span>
                </div>
              )}
              <div className="price-reduction-preview__row price-reduction-preview__row--highlight">
                <span>New price</span>
                <span>${newPriceNum.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Reason */}
          <label className="plan-modal__label">
            Reason
            <select className="plan-modal__select" value={reason} onChange={e => setReason(e.target.value)}>
              {REDUCTION_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>

          {/* Notes */}
          <label className="plan-modal__label">
            Notes (optional)
            <textarea
              className="plan-modal__textarea"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Market feedback, seller discussion notes, comp details..."
            />
          </label>

          {/* Content update toggle */}
          {unpublishedCount > 0 && (
            <div className="price-reduction-content-flag">
              <label className="buyer-checkbox-label">
                <input type="checkbox" checked={updateContent} onChange={e => setUpdateContent(e.target.checked)} />
                Flag {unpublishedCount} unpublished content piece{unpublishedCount !== 1 ? 's' : ''} for price update
              </label>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                Draft and scheduled posts referencing this property will be flagged for review.
              </p>
            </div>
          )}

          {error && <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>{error}</p>}
        </div>

        <div className="plan-modal__footer">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={!newPriceNum || newPriceNum <= 0 || saving}>
            {saving ? 'Saving…' : 'Record Price Reduction'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Price History Timeline ─────────────────────────────────────────────────
function PriceHistoryTimeline({ listingId, listPrice }) {
  const { data: history, loading } = usePriceHistory(listingId)
  if (loading || !history?.length) return null

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="price-history-timeline">
      <p className="panel-section-label" style={{ marginBottom: 8 }}>Price History</p>
      <div className="price-history-timeline__list">
        {/* Original list price */}
        <div className="price-history-timeline__item price-history-timeline__item--original">
          <div className="price-history-timeline__dot price-history-timeline__dot--original" />
          <div className="price-history-timeline__content">
            <span className="price-history-timeline__price">${Number(listPrice).toLocaleString()}</span>
            <span className="price-history-timeline__label">Original List Price</span>
          </div>
        </div>

        {/* Each price change (sorted newest first, but we reverse for timeline) */}
        {[...history].reverse().map((entry, i) => {
          const isReduction = entry.new_price < entry.previous_price
          return (
            <div key={entry.id} className={`price-history-timeline__item ${isReduction ? 'price-history-timeline__item--reduction' : 'price-history-timeline__item--increase'}`}>
              <div className={`price-history-timeline__dot ${isReduction ? 'price-history-timeline__dot--reduction' : 'price-history-timeline__dot--increase'}`} />
              <div className="price-history-timeline__content">
                <div className="price-history-timeline__header">
                  <span className="price-history-timeline__price">${Number(entry.new_price).toLocaleString()}</span>
                  <Badge variant={isReduction ? 'warning' : 'success'} size="sm">
                    {isReduction ? '-' : '+'}${Math.abs(entry.previous_price - entry.new_price).toLocaleString()}
                    {' '}({Math.abs(entry.reduction_pct || 0).toFixed(1)}%)
                  </Badge>
                </div>
                <div className="price-history-timeline__meta">
                  <span>{fmtDate(entry.changed_at)}</span>
                  {entry.reason && (
                    <span> · {REDUCTION_REASONS.find(r => r.value === entry.reason)?.label || entry.reason}</span>
                  )}
                </div>
                {entry.notes && (
                  <p className="price-history-timeline__notes">{entry.notes}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AI Plan Generator Modal ─────────────────────────────────────────────────
// Prompt templates are keyed by listing SOURCE so Dana can tune each scenario
// independently. All four are editable in Settings → Templates or inline from
// the Generate Plan modal.
const DEFAULT_TEMPLATES = {
  new: `Generate a complete launch plan for this new listing:

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Create a step-by-step checklist organized by phase.
Phases: "prep" (listing preparation), "launch" (MLS & go-live), "postlaunch" (promotion & follow-up)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable, specific tasks. Include 12-18 items total.`,

  my_expired: `Generate a relaunch plan for a previously-expired listing that I (Dana) had the first time around.

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Context: I have full history on this listing — prior showings, buyer feedback, marketing performance. Reference what worked and what didn't. Positioning: "we learned, here's the fix."

Create a step-by-step checklist organized by phase.
Phases: "analysis" (review prior data & adjust strategy), "refresh" (property + presentation improvements), "relaunch" (re-activation & promotion)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable, specific tasks that leverage prior data. Include 12-18 items total.`,

  taken_over: `Generate a relaunch plan for a listing I'm TAKING OVER from a previous agent.

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Context: This listing expired under a different agent. I do NOT have access to prior showings, buyer feedback, or marketing data. Start from a clean slate — do NOT reference any prior agent effort I wouldn't actually know about. Positioning: "fresh eyes, new team, new strategy."

Create a step-by-step checklist organized by phase.
Phases: "analysis" (fresh market review & competitive audit), "refresh" (property + presentation from scratch), "relaunch" (new-team reintroduction & promotion)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable tasks a new-agent-with-new-approach would do. Include 12-18 items total.`,

  fsbo: `Generate a launch plan for a seller who was previously FSBO (For Sale By Owner) and is now listing with me.

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Context: Seller tried it themselves first. Positioning: "professional marketing + agent network you didn't have before." Acknowledge their effort, then show what agent representation unlocks.

Create a step-by-step checklist organized by phase.
Phases: "prep" (re-presenting the property professionally), "launch" (MLS + wide syndication), "postlaunch" (agent-network outreach & promotion)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable, specific tasks. Include 12-18 items total.`,
}

const TEMPLATE_STORAGE_PREFIX = 'ai_plan_template_v2_'

function getSavedTemplate(source) {
  const key = source && DEFAULT_TEMPLATES[source] ? source : 'new'
  const saved = localStorage.getItem(TEMPLATE_STORAGE_PREFIX + key)
  return saved || DEFAULT_TEMPLATES[key]
}

function saveTemplate(source, template) {
  const key = source && DEFAULT_TEMPLATES[source] ? source : 'new'
  localStorage.setItem(TEMPLATE_STORAGE_PREFIX + key, template)
}

// Friendly label for each source used in the template editor + modal heading.
const SOURCE_TEMPLATE_LABEL = {
  new:        'New Listing',
  my_expired: 'Relaunch — My Prior Expired',
  taken_over: 'Relaunch — Taken Over from Another Agent',
  fsbo:       'FSBO Conversion',
}

function resolveTemplate(template, vars) {
  return template
    .replace(/\{clientName\}/g, vars.clientName || '')
    .replace(/\{address\}/g,    vars.address || '')
    .replace(/\{city\}/g,       vars.city || '')
    .replace(/\{zip\}/g,        vars.zip || '')
    .replace(/\{price\}/g,      vars.price || '')
    .replace(/\{dom\}/g,        vars.dom ?? '')
    .replace(/\{status\}/g,     vars.status || '')
    .replace(/\{type\}/g,       vars.type || '')
}

function AIPlanModal({ listing, allListings, onClose, onGenerated }) {
  const isNew = listing.type === 'new'

  // Which listing is selected (defaults to current)
  const [selectedListingId, setSelectedListingId] = useState(listing.id)
  const selectedListing = (allListings ?? []).find(l => l.id === selectedListingId) ?? listing

  // Effective source — falls back for old rows without the column set.
  const effectiveSource = selectedListing.source || (selectedListing.type === 'expired' ? 'my_expired' : 'new')

  // Template editing — keyed to the selected listing's source so there's a
  // separate prompt per scenario (new / my_expired / taken_over / fsbo).
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [template, setTemplate] = useState(() => getSavedTemplate(effectiveSource))
  const [templateDraft, setTemplateDraft] = useState(template)

  // Resolved prompt
  const resolvedPrompt = resolveTemplate(template, {
    clientName: selectedListing.contact_name,
    address:    selectedListing.address,
    city:       selectedListing.city,
    zip:        selectedListing.zip,
    price:      selectedListing.listPrice,
    dom:        selectedListing.dom,
    status:     selectedListing.status,
    type:       selectedListing.type,
  })

  const [prompt, setPrompt] = useState(resolvedPrompt)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Re-resolve prompt when listing selection changes (only if user hasn't manually edited)
  const [manuallyEdited, setManuallyEdited] = useState(false)
  useEffect(() => {
    if (!manuallyEdited) {
      setPrompt(resolveTemplate(template, {
        clientName: selectedListing.contact_name,
        address:    selectedListing.address,
        city:       selectedListing.city,
        zip:        selectedListing.zip,
        price:      selectedListing.listPrice,
        dom:        selectedListing.dom,
        status:     selectedListing.status,
        type:       selectedListing.type,
      }))
    }
  }, [selectedListingId, template])

  // When the selected listing's source changes (e.g. user picks a different
  // listing in the dropdown), reload the correct per-source template.
  useEffect(() => {
    const next = getSavedTemplate(effectiveSource)
    setTemplate(next)
    setTemplateDraft(next)
    setManuallyEdited(false)
  }, [effectiveSource])

  const handleSaveTemplate = () => {
    saveTemplate(effectiveSource, templateDraft)
    setTemplate(templateDraft)
    setEditingTemplate(false)
    setManuallyEdited(false)
  }

  // Track the generated strategy markdown so we can save it alongside tasks.
  const [generatedStrategy, setGeneratedStrategy] = useState('')

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const data = await DB.generateContent({
        type: 'listing_checklist',
        prompt,
        plan_type: isNew ? 'new' : 'relisting',
        source: selectedListing.source || (isNew ? 'new' : 'my_expired'),
      })
      const tasks = data?.tasks
      if (!Array.isArray(tasks) || tasks.length === 0) {
        throw new Error('AI returned no tasks. Try again or edit the prompt.')
      }
      setResult(tasks)
      setGeneratedStrategy(data?.strategy || '')
    } catch (e) {
      setError(e.message || 'Failed to generate plan')
    } finally {
      setGenerating(false)
    }
  }

  const handleApply = async () => {
    if (!result?.length) return
    setGenerating(true)
    try {
      // ── Preserve prior plan in localStorage history ──
      const existing = await DB.getTasksForListing(selectedListing.id)
      if (existing.length > 0) {
        const historyKey = `listing_plan_history_${selectedListing.id}`
        const prevHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
        prevHistory.unshift({
          date: new Date().toISOString(),
          strategy: selectedListing.strategy || null,
          tasks: existing.map(t => ({ phase: t.phase, label: t.label, completed: t.completed })),
        })
        // Keep last 10 plan versions
        localStorage.setItem(historyKey, JSON.stringify(prevHistory.slice(0, 10)))
      }

      for (const t of existing) await DB.hardDeleteTask(t.id)

      const taskRows = result.map((step, i) => ({
        listing_id: selectedListing.id,
        phase: step.phase,
        label: step.label,
        sort_order: i,
        completed: false,
      }))
      await DB.bulkCreateTasks(taskRows)

      // Persist the narrative strategy on the listing itself so it can be
      // reused in content, exports, and printable views.
      if (generatedStrategy) {
        try {
          await DB.updateListing(selectedListing.id, {
            strategy: generatedStrategy,
            strategy_updated_at: new Date().toISOString(),
          })
        } catch (e) { /* non-fatal — tasks are the main deliverable */ }
      }

      await DB.logActivity('plan_generated', `AI generated ${isNew ? 'launch' : 'relaunch'} plan for ${selectedListing.address}`)
      onGenerated()
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  // Template editor sub-view
  if (editingTemplate) {
    return (
      <div className="plan-modal__overlay" onClick={() => setEditingTemplate(false)}>
        <div className="plan-modal plan-modal--wide" onClick={e => e.stopPropagation()}>
          <div className="plan-modal__header">
            <h3>Edit Prompt Template — {SOURCE_TEMPLATE_LABEL[effectiveSource] || 'New Listing'}</h3>
            <button className="plan-modal__close" onClick={() => setEditingTemplate(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="plan-modal__body">
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
              This template is used for all future <strong>{SOURCE_TEMPLATE_LABEL[effectiveSource] || 'New Listing'}</strong> plan generations. Other scenarios (new, my expired, taken over, FSBO) each have their own separate template — change the listing's Source to edit a different one. Variables that auto-fill:
            </p>
            <div className="plan-modal__var-chips">
              {['{clientName}', '{address}', '{city}', '{zip}', '{price}', '{dom}', '{status}', '{type}'].map(v => (
                <span key={v} className="plan-modal__var-chip">{v}</span>
              ))}
            </div>
            <textarea
              className="plan-modal__textarea"
              value={templateDraft}
              onChange={e => setTemplateDraft(e.target.value)}
              rows={14}
            />
          </div>
          <div className="plan-modal__footer">
            <Button variant="ghost" size="sm" onClick={() => {
              setTemplateDraft(isNew ? DEFAULT_LAUNCH_TEMPLATE : DEFAULT_RELAUNCH_TEMPLATE)
            }}>Reset to Default</Button>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveTemplate}>Save Template</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="plan-modal__overlay" onClick={onClose}>
      <div className="plan-modal plan-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="plan-modal__header">
          <h3>Generate {isNew ? 'Launch' : 'Relaunch'} Plan with AI</h3>
          <button className="plan-modal__close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="plan-modal__body">
          {/* ── Client & Property Selector ── */}
          <div className="plan-modal__context-row">
            <label className="plan-modal__label plan-modal__label--inline">
              Client / Property
              <select
                className="plan-modal__select"
                value={selectedListingId}
                onChange={e => { setSelectedListingId(e.target.value); setManuallyEdited(false); setResult(null) }}
              >
                {(allListings ?? [listing]).map(l => (
                  <option key={l.id} value={l.id}>
                    {l.contact_name ? `${l.contact_name} — ` : ''}{l.address}{l.city ? `, ${l.city}` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* ── Auto-filled context card ── */}
          <div className="plan-modal__context-card">
            <div className="plan-modal__context-item">
              <span className="plan-modal__context-key">Client</span>
              <span>{selectedListing.contact_name || '—'}</span>
            </div>
            <div className="plan-modal__context-item">
              <span className="plan-modal__context-key">Property</span>
              <span>{selectedListing.address}, {selectedListing.city} {selectedListing.zip}</span>
            </div>
            <div className="plan-modal__context-item">
              <span className="plan-modal__context-key">Price</span>
              <span>{selectedListing.listPrice}</span>
            </div>
            <div className="plan-modal__context-item">
              <span className="plan-modal__context-key">DOM</span>
              <span>{selectedListing.dom}</span>
            </div>
          </div>

          {/* ── Prompt ── */}
          <div className="plan-modal__prompt-header">
            <span className="plan-modal__label" style={{ marginBottom: 0 }}>
              Prompt — {SOURCE_TEMPLATE_LABEL[effectiveSource] || 'New Listing'}
            </span>
            <button className="plan-modal__template-btn" onClick={() => { setTemplateDraft(template); setEditingTemplate(true) }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.32 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Edit Template
            </button>
          </div>
          <textarea
            className="plan-modal__textarea"
            value={prompt}
            onChange={e => { setPrompt(e.target.value); setManuallyEdited(true) }}
            rows={10}
          />
          <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Auto-filled from your saved {isNew ? 'launch' : 'relaunch'} template. Edit inline for this run, or click Edit Template to change for all future use.
          </p>

          {error && <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', marginTop: 8 }}>{error}</p>}

          {result && (
            <div className="ai-plan-preview">
              <h4 style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 8, color: 'var(--brown-dark)' }}>
                Generated Plan ({result.length} items)
              </h4>
              <div className="ai-plan-preview__list">
                {result.map((item, i) => (
                  <div key={i} className="ai-plan-preview__item">
                    <span className="ai-plan-preview__phase">{phaseLabels[item.phase]?.label ?? item.phase}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              {generatedStrategy && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--cream)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--brown-mid)' }}>
                  <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brown-dark)', margin: '0 0 4px 0' }}>
                    Strategy Narrative (saved to listing for reuse)
                  </p>
                  <pre style={{ fontSize: '0.7rem', lineHeight: 1.5, color: 'var(--color-text)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0, maxHeight: 160, overflow: 'auto' }}>
                    {generatedStrategy.slice(0, 500)}{generatedStrategy.length > 500 ? '…' : ''}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="plan-modal__footer">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          {result ? (
            <Button variant="primary" size="sm" onClick={handleApply} disabled={generating}>
              {generating ? 'Applying…' : 'Replace Current Plan'}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
              {generating ? 'Generating…' : 'Generate Plan'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Printable Plan ─────────────────────────────────────────────────────────
// Dedicated clean layout used by both the Print button (via @media print CSS
// that shows only this element) AND by Export PDF (html2pdf.js renders it
// directly). Uses inline styles so html2canvas captures everything faithfully
// and nothing is inherited from the dashboard.
const PrintablePlan = React.forwardRef(function PrintablePlan(
  { listing, tasks, hasTasks, plan, isNew },
  ref
) {
  const items = hasTasks ? (tasks || []) : (plan || [])
  const completed = items.filter(t => hasTasks ? t.completed : false).length
  const total = items.length
  const pct = total ? Math.round((completed / total) * 100) : 0

  const phaseOrder = [...new Set(items.map(i => i.phase))]

  const phaseLabel = {
    prep:       'Prep',
    launch:     'Launch',
    postlaunch: 'Post-Launch',
    analysis:   'Analysis',
    refresh:    'Refresh',
    relaunch:   'Relaunch',
  }

  const planTitle = isNew ? 'LAUNCH PLAN' : 'RELAUNCH PLAN'
  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  // Source context label — tells the reader whether this is Dana's prior
  // expired, a takeover from another agent, or a brand new listing.
  const sourceLabels = {
    new:        { label: 'New Listing',                      detail: 'Fresh to market' },
    my_expired: { label: 'Relaunching Prior Listing',         detail: 'Previously listed by Dana' },
    taken_over: { label: 'Takeover from Previous Agent',      detail: 'Fresh strategy, new team' },
    fsbo:       { label: 'FSBO Conversion',                   detail: 'Previously For Sale By Owner' },
  }
  const sourceMeta = sourceLabels[listing.source] || (isNew ? sourceLabels.new : sourceLabels.my_expired)

  // Brand palette (inline for html2canvas fidelity)
  const C = {
    cream:    '#faf7f0',
    brownDk:  '#2d2416',
    brownMd:  '#8B7355',
    brownLt:  '#c4b598',
    mute:     '#6b5d4c',
    soft:     '#e5d9c0',
    bodyBg:   '#ffffff',
    done:     '#a89d87',
  }

  return (
    <div
      ref={ref}
      className="printable-offscreen"
      style={{
        width: '8.5in',
        minHeight: '11in',
        padding: '0.55in 0.6in',
        background: C.bodyBg,
        color: C.brownDk,
        fontFamily: '"Helvetica Neue", "Helvetica", Arial, sans-serif',
        fontSize: '9.5pt',
        lineHeight: 1.4,
        boxSizing: 'border-box',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          borderBottom: `2px solid ${C.brownMd}`,
          paddingBottom: 10,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: '7pt',
            letterSpacing: '0.18em',
            color: C.brownMd,
            fontWeight: 700,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Dana Massey &nbsp;·&nbsp; REAL Broker
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <div
              style={{
                fontSize: '26pt',
                fontFamily: '"Instrument Serif", Georgia, "Times New Roman", serif',
                fontWeight: 400,
                color: C.brownDk,
                lineHeight: 1,
                letterSpacing: '0.01em',
              }}
            >
              {planTitle}
            </div>
            <div
              style={{
                display: 'inline-block',
                padding: '3px 9px',
                background: C.cream,
                border: `1px solid ${C.soft}`,
                borderRadius: 999,
                fontSize: '7pt',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: C.brownMd,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {sourceMeta.label}
            </div>
          </div>
          <div style={{ fontSize: '8pt', color: C.mute, whiteSpace: 'nowrap' }}>
            Generated {dateStr}
          </div>
        </div>
      </div>

      {/* ── Property + progress strip ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 18,
          paddingBottom: 12,
          borderBottom: `1px dashed ${C.soft}`,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '15pt',
              fontFamily: '"Instrument Serif", Georgia, "Times New Roman", serif',
              color: C.brownDk,
              lineHeight: 1.2,
              marginBottom: 2,
            }}
          >
            {listing.address || '—'}
          </div>
          <div style={{ fontSize: '8.5pt', color: C.mute }}>
            {listing.city ? `${listing.city}, AZ ${listing.zip || ''}` : ''}
            {listing.listPrice ? ` · ${listing.listPrice}` : ''}
            {typeof listing.dom !== 'undefined' ? ` · ${listing.dom} DOM` : ''}
            {listing.contact_name ? ` · ${listing.contact_name}` : ''}
          </div>
          <div
            style={{
              fontSize: '7.5pt',
              color: C.brownMd,
              fontStyle: 'italic',
              marginTop: 3,
            }}
          >
            {sourceMeta.detail}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: '20pt',
              fontFamily: '"Instrument Serif", Georgia, serif',
              color: C.brownMd,
              lineHeight: 1,
            }}
          >
            {pct}%
          </div>
          <div
            style={{
              fontSize: '7pt',
              letterSpacing: '0.1em',
              color: C.mute,
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            {completed} of {total} complete
          </div>
        </div>
      </div>

      {/* ── Phases in a balanced 2-column layout ── */}
      <div
        style={{
          columnCount: 2,
          columnGap: '0.35in',
          columnFill: 'balance',
        }}
      >
        {phaseOrder.map(phase => {
          const phaseItems = items.filter(i => i.phase === phase)
          const phaseCompleted = phaseItems.filter(i => hasTasks ? i.completed : false).length
          const label = phaseLabel[phase] || phase
          return (
            <div
              key={phase}
              style={{
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                WebkitColumnBreakInside: 'avoid',
                marginBottom: 14,
                paddingBottom: 2,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  borderBottom: `1px solid ${C.soft}`,
                  paddingBottom: 4,
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: '7.5pt',
                    letterSpacing: '0.14em',
                    color: C.brownMd,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </span>
                <span
                  style={{
                    fontSize: '7pt',
                    color: C.mute,
                    letterSpacing: '0.05em',
                  }}
                >
                  {phaseCompleted}/{phaseItems.length}
                </span>
              </div>
              {phaseItems.map((item, i) => {
                const done = hasTasks ? !!item.completed : false
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 7,
                      fontSize: '8.5pt',
                      marginBottom: 5,
                      color: done ? C.done : C.brownDk,
                      textDecoration: done ? 'line-through' : 'none',
                      breakInside: 'avoid',
                      pageBreakInside: 'avoid',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        border: done ? 'none' : `1px solid ${C.brownMd}`,
                        background: done ? C.brownMd : 'transparent',
                        borderRadius: 2,
                        marginTop: 2,
                        flexShrink: 0,
                        color: '#ffffff',
                        fontSize: '7pt',
                        lineHeight: '10px',
                        textAlign: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {done ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          position: 'absolute',
          left: '0.6in',
          right: '0.6in',
          bottom: '0.4in',
          borderTop: `1px solid ${C.soft}`,
          paddingTop: 8,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '7pt',
          color: C.mute,
          letterSpacing: '0.05em',
        }}
      >
        <span>DANA MASSEY · REAL BROKER · EAST VALLEY, AZ</span>
        <span>{listing.address || ''}</span>
      </div>
    </div>
  )
})

// ─── Plan View (real tasks from DB when available) ────────────────────────────
// ─── Platform Analytics Tab ──���───────────────────────────────────────────────
const PLATFORMS = [
  { key: 'zillow_views',    label: 'Zillow Views' },
  { key: 'zillow_saves',    label: 'Zillow Saves' },
  { key: 'realtor_views',   label: 'Realtor.com Views' },
  { key: 'realtor_leads',   label: 'Realtor.com Leads' },
  { key: 'redfin_views',    label: 'Redfin Views' },
  { key: 'redfin_favorites',label: 'Redfin Favorites' },
  { key: 'homes_views',     label: 'Homes.com Views' },
  { key: 'homes_leads',     label: 'Homes.com Leads' },
  { key: 'mls_views',       label: 'MLS Views' },
  { key: 'mls_inquiries',   label: 'MLS Inquiries' },
  { key: 'property_website_views', label: 'Property Website' },
  { key: 'showings_count',  label: 'Showings' },
]

function getMonday(d) {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(date.setDate(diff)).toISOString().slice(0, 10)
}

function PlatformAnalyticsTab({ listing }) {
  const { data: stats, refetch } = usePlatformStats(listing.id)
  const { data: totals, refetch: refetchTotals } = usePlatformTotals(listing.id)
  const { data: tasks, refetch: refetchTasks } = useStatTasksForListing(listing.id)
  const [weekOf, setWeekOf] = useState(getMonday(new Date()))
  const [draft, setDraft] = useState({})
  const [saving, setSaving] = useState(false)
  const [editingWeek, setEditingWeek] = useState(null)

  // Load existing data when selecting a week
  useEffect(() => {
    const existing = (stats ?? []).find(s => s.week_of === weekOf)
    if (existing) {
      const d = {}
      PLATFORMS.forEach(p => { d[p.key] = existing[p.key] ?? 0 })
      d.notes = existing.notes || ''
      setDraft(d)
    } else {
      const d = {}
      PLATFORMS.forEach(p => { d[p.key] = 0 })
      d.notes = ''
      setDraft(d)
    }
  }, [weekOf, stats])

  const handleSave = async () => {
    setSaving(true)
    try {
      await DB.upsertPlatformStats({ listing_id: listing.id, week_of: weekOf, ...draft })
      // Also mark the stat task as completed for this week
      await DB.upsertStatTask({ listing_id: listing.id, week_of: weekOf, status: 'completed', completed_at: new Date().toISOString() })
      await Promise.all([refetch(), refetchTotals(), refetchTasks()])
      setEditingWeek(null)
    } catch (e) {
      alert(e.message)
    } finally { setSaving(false) }
  }

  // Week-over-week delta
  const currentWeekStats = (stats ?? []).find(s => s.week_of === weekOf)
  const prevWeek = (stats ?? []).find(s => s.week_of < weekOf)
  const getWoW = (key) => {
    if (!currentWeekStats || !prevWeek) return null
    const cur = currentWeekStats[key] ?? 0
    const prev = prevWeek[key] ?? 0
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  return (
    <div className="platform-analytics">
      {/* ── Accumulated Totals ── */}
      <div className="pa__totals-grid">
        <div className="pa__total-card pa__total-card--highlight">
          <span className="pa__total-label">Total Views</span>
          <span className="pa__total-value">{(totals?.total_views ?? 0).toLocaleString()}</span>
        </div>
        <div className="pa__total-card pa__total-card--highlight">
          <span className="pa__total-label">Total Engagement</span>
          <span className="pa__total-value">{(totals?.total_engagement ?? 0).toLocaleString()}</span>
          <span className="pa__total-sub">saves + leads + favorites</span>
        </div>
        <div className="pa__total-card">
          <span className="pa__total-label">Showings</span>
          <span className="pa__total-value">{(totals?.showings_count ?? 0).toLocaleString()}</span>
        </div>
        <div className="pa__total-card">
          <span className="pa__total-label">Weeks Tracked</span>
          <span className="pa__total-value">{totals?.weeks ?? 0}</span>
        </div>
      </div>

      {/* ── Platform breakdown mini cards ── */}
      <div className="pa__platform-breakdown">
        {[
          { label: 'Zillow', views: totals?.zillow_views, engagement: totals?.zillow_saves, engLabel: 'saves' },
          { label: 'Realtor.com', views: totals?.realtor_views, engagement: totals?.realtor_leads, engLabel: 'leads' },
          { label: 'Redfin', views: totals?.redfin_views, engagement: totals?.redfin_favorites, engLabel: 'favorites' },
          { label: 'Homes.com', views: totals?.homes_views, engagement: totals?.homes_leads, engLabel: 'leads' },
          { label: 'MLS', views: totals?.mls_views, engagement: totals?.mls_inquiries, engLabel: 'inquiries' },
        ].map(p => (
          <div key={p.label} className="pa__platform-mini">
            <span className="pa__platform-name">{p.label}</span>
            <span className="pa__platform-stat">{(p.views ?? 0).toLocaleString()} views</span>
            <span className="pa__platform-stat pa__platform-stat--eng">{(p.engagement ?? 0).toLocaleString()} {p.engLabel}</span>
          </div>
        ))}
      </div>

      {/* ── Weekly Entry ── */}
      <Card className="pa__weekly-entry">
        <div className="pa__weekly-header">
          <h3 className="pa__section-title">Weekly Stats Entry</h3>
          <div className="pa__week-nav">
            <button className="pa__week-btn" onClick={() => {
              const d = new Date(weekOf + 'T12:00:00')
              d.setDate(d.getDate() - 7)
              setWeekOf(d.toISOString().slice(0, 10))
            }}>←</button>
            <input type="date" value={weekOf} onChange={e => setWeekOf(getMonday(new Date(e.target.value)))} className="pa__week-input" />
            <button className="pa__week-btn" onClick={() => {
              const d = new Date(weekOf + 'T12:00:00')
              d.setDate(d.getDate() + 7)
              const next = d.toISOString().slice(0, 10)
              if (next <= getMonday(new Date())) setWeekOf(next)
            }}>→</button>
          </div>
        </div>

        <div className="pa__stats-grid">
          {PLATFORMS.map(p => {
            const wow = getWoW(p.key)
            return (
              <div key={p.key} className="pa__stat-field">
                <label className="pa__stat-label">{p.label}</label>
                <div className="pa__stat-input-row">
                  <input
                    type="number"
                    min="0"
                    className="pa__stat-input"
                    value={draft[p.key] ?? 0}
                    onChange={e => setDraft(prev => ({ ...prev, [p.key]: Number(e.target.value) || 0 }))}
                  />
                  {wow !== null && wow !== 0 && (
                    <span className={`pa__wow ${wow > 0 ? 'pa__wow--up' : 'pa__wow--down'}`}>
                      {wow > 0 ? '↑' : '↓'}{Math.abs(wow)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <Textarea
          label="Notes for this week"
          value={draft.notes ?? ''}
          onChange={e => setDraft(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
          placeholder="e.g. Good showing feedback, multiple saves on Zillow..."
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Week'}</Button>
        </div>
      </Card>

      {/* ── History table ── */}
      {(stats ?? []).length > 0 && (
        <Card className="pa__history">
          <h3 className="pa__section-title">Weekly History</h3>
          <div className="pa__history-table-wrap">
            <table className="pa__history-table">
              <thead>
                <tr>
                  <th>Week</th>
                  <th>Zillow</th>
                  <th>Realtor</th>
                  <th>Redfin</th>
                  <th>Homes</th>
                  <th>MLS</th>
                  <th>Website</th>
                  <th>Showings</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(stats ?? []).map(s => {
                  const task = (tasks ?? []).find(t => t.week_of === s.week_of)
                  return (
                    <tr key={s.id} onClick={() => setWeekOf(s.week_of)} className="pa__history-row">
                      <td>{new Date(s.week_of + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td>{s.zillow_views}/{s.zillow_saves}</td>
                      <td>{s.realtor_views}/{s.realtor_leads}</td>
                      <td>{s.redfin_views}/{s.redfin_favorites}</td>
                      <td>{s.homes_views}/{s.homes_leads}</td>
                      <td>{s.mls_views}/{s.mls_inquiries}</td>
                      <td>{s.property_website_views}</td>
                      <td>{s.showings_count}</td>
                      <td><Badge variant={task?.status === 'completed' ? 'success' : 'default'} size="sm">{task?.status ?? 'logged'}</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Weekly Stat Tasks ── */}
      <Card className="pa__tasks">
        <h3 className="pa__section-title">Weekly Pull Tasks</h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
          Log into each platform weekly and enter stats above. Completed automatically when you save a week.
        </p>
        {(tasks ?? []).length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            No tasks yet — they'll be created as you save weekly stats.
          </p>
        ) : (
          <div className="pa__task-list">
            {(tasks ?? []).slice(0, 8).map(t => (
              <div key={t.id} className="pa__task-row">
                <span className={`pa__task-dot ${t.status === 'completed' ? 'pa__task-dot--done' : ''}`} />
                <span className="pa__task-week">
                  Week of {new Date(t.week_of + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <Badge variant={t.status === 'completed' ? 'success' : t.status === 'skipped' ? 'default' : 'warning'} size="sm">
                  {t.status}
                </Badge>
                {t.completed_at && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                    {new Date(t.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Meta Ad Campaigns ── */}
      <AdCampaignsSection listing={listing} />
    </div>
  )
}

// ─── Ad Campaigns Section (inside Platform Analytics) ────────────────────────
function AdCampaignsSection({ listing }) {
  const { data: campaigns, refetch } = useAdCampaignsForListing(listing.id)
  const [metaConfig, setMetaConfig] = useState(null)
  const [metaCampaigns, setMetaCampaigns] = useState(null) // fetched from Meta API
  const [syncing, setSyncing] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [manualDraft, setManualDraft] = useState({ audience_label: '', meta_campaign_name: '', impressions: '', reach: '', clicks: '', spend: '', leads: '', ctr: '' })

  useEffect(() => {
    DB.getMetaAdsConfig().then(row => {
      if (row?.value) setMetaConfig(row.value)
    }).catch(() => {})
  }, [])

  const isConnected = !!metaConfig?.access_token
  const reportStats = metaConfig?.report_stats || ['reach', 'clicks']

  // Sync stats from Meta for all attributed campaigns
  const syncStats = async () => {
    if (!isConnected) return
    setSyncing(true)
    try {
      for (const camp of (campaigns ?? []).filter(c => c.attributed)) {
        const objectId = camp.meta_adset_id || camp.meta_campaign_id
        const insights = await DB.fetchMetaInsights(metaConfig.access_token, objectId)
        await DB.updateAdCampaign(camp.id, {
          ...insights,
          last_synced_at: new Date().toISOString(),
        })
      }
      refetch()
    } catch (e) {
      alert('Sync failed: ' + e.message)
    } finally { setSyncing(false) }
  }

  // Fetch campaigns from Meta for the picker
  const loadMetaCampaigns = async () => {
    if (!isConnected) return
    try {
      const data = await DB.fetchMetaCampaigns(metaConfig.access_token, metaConfig.ad_account_id)
      setMetaCampaigns(data)
      setShowPicker(true)
    } catch (e) {
      alert('Could not load campaigns: ' + e.message)
    }
  }

  // Attribute a campaign/adset to this listing
  const attributeCampaign = async (camp, adset, audienceLabel) => {
    await DB.upsertAdCampaign({
      listing_id: listing.id,
      meta_campaign_id: camp.id,
      meta_campaign_name: camp.name,
      meta_adset_id: adset?.id || camp.id,
      meta_adset_name: adset?.name || null,
      audience_label: audienceLabel || adset?.name || camp.name,
      attributed: true,
    })
    refetch()
  }

  // Toggle attribution
  const toggleAttribution = async (camp) => {
    await DB.updateAdCampaign(camp.id, { attributed: !camp.attributed })
    refetch()
  }

  // Manual add (no Meta connection needed)
  const handleManualSave = async () => {
    if (!manualDraft.audience_label?.trim()) return alert('Audience label is required')
    await DB.upsertAdCampaign({
      listing_id: listing.id,
      meta_campaign_id: `manual_${Date.now()}`,
      meta_campaign_name: manualDraft.meta_campaign_name || manualDraft.audience_label,
      meta_adset_id: `manual_${Date.now()}_adset`,
      audience_label: manualDraft.audience_label,
      attributed: true,
      impressions: Number(manualDraft.impressions) || 0,
      reach: Number(manualDraft.reach) || 0,
      clicks: Number(manualDraft.clicks) || 0,
      spend: Number(manualDraft.spend) || 0,
      leads: Number(manualDraft.leads) || 0,
      ctr: Number(manualDraft.ctr) || 0,
      cpc: manualDraft.clicks > 0 ? (Number(manualDraft.spend) / Number(manualDraft.clicks)) : 0,
      cpl: manualDraft.leads > 0 ? (Number(manualDraft.spend) / Number(manualDraft.leads)) : 0,
      last_synced_at: new Date().toISOString(),
    })
    setManualDraft({ audience_label: '', meta_campaign_name: '', impressions: '', reach: '', clicks: '', spend: '', leads: '', ctr: '' })
    setShowManual(false)
    refetch()
  }

  const handleDeleteCampaign = async (camp) => {
    if (!confirm(`Remove "${camp.audience_label}" from this listing?`)) return
    await DB.deleteAdCampaign(camp.id)
    refetch()
  }

  // Aggregated totals for attributed campaigns only
  const attributed = (campaigns ?? []).filter(c => c.attributed)
  const adTotals = attributed.reduce((acc, c) => ({
    impressions: acc.impressions + (c.impressions || 0),
    reach: acc.reach + (c.reach || 0),
    clicks: acc.clicks + (c.clicks || 0),
    spend: acc.spend + Number(c.spend || 0),
    leads: acc.leads + (c.leads || 0),
  }), { impressions: 0, reach: 0, clicks: 0, spend: 0, leads: 0 })
  adTotals.ctr = adTotals.impressions > 0 ? ((adTotals.clicks / adTotals.impressions) * 100).toFixed(2) : 0

  // Stat labels for display
  const STAT_LABELS = {
    reach: 'Reach', impressions: 'Impressions', clicks: 'Clicks',
    ctr: 'CTR', leads: 'Leads', conversions: 'Conversions',
  }

  return (
    <Card className="pa__ads-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 className="pa__section-title" style={{ margin: 0 }}>Ad Performance</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={() => setShowManual(true)}>+ Manual Entry</Button>
          {isConnected && (
            <>
              <Button variant="ghost" size="sm" onClick={loadMetaCampaigns}>+ From Meta</Button>
              {attributed.length > 0 && (
                <Button variant="ghost" size="sm" onClick={syncStats} disabled={syncing}>
                  {syncing ? 'Syncing…' : 'Sync Stats'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {!isConnected && (campaigns ?? []).length === 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
          Add ad campaigns manually, or connect Meta Ads in Settings → Connected Accounts to auto-pull stats.
        </p>
      )}

      {/* Aggregated ad totals */}
      {attributed.length > 0 && (
        <div className="pa__totals-grid" style={{ marginBottom: 12 }}>
          {reportStats.map(stat => (
            <div key={stat} className="pa__total-card">
              <span className="pa__total-label">{STAT_LABELS[stat] || stat}</span>
              <span className="pa__total-value">
                {stat === 'ctr' ? adTotals.ctr + '%' :
                 stat === 'reach' || stat === 'impressions' ? (adTotals[stat] ?? 0).toLocaleString() :
                 (adTotals[stat] ?? 0).toLocaleString()}
              </span>
              <span className="pa__total-sub">across {attributed.length} campaign{attributed.length !== 1 ? 's' : ''}</span>
            </div>
          ))}
          {/* Always show spend to you (agent) but not in client reports */}
          <div className="pa__total-card">
            <span className="pa__total-label">Ad Spend (yours only)</span>
            <span className="pa__total-value">${adTotals.spend.toLocaleString()}</span>
            <span className="pa__total-sub">hidden from client reports</span>
          </div>
        </div>
      )}

      {/* Campaign cards */}
      {(campaigns ?? []).map(camp => (
        <div key={camp.id} className="pa__ad-campaign-card">
          <div className="pa__ad-campaign-header">
            <label className="offers__compare-check" title={camp.attributed ? 'Included in client report' : 'Excluded from client report'}>
              <input type="checkbox" checked={!!camp.attributed} onChange={() => toggleAttribution(camp)} />
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--brown-dark)' }}>{camp.audience_label || camp.meta_campaign_name}</span>
              {camp.meta_adset_name && camp.meta_adset_name !== camp.audience_label && (
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', display: 'block' }}>{camp.meta_campaign_name} → {camp.meta_adset_name}</span>
              )}
            </div>
            {camp.last_synced_at && (
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                Synced {new Date(camp.last_synced_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <Badge variant={camp.attributed ? 'success' : 'default'} size="sm">
              {camp.attributed ? 'In Report' : 'Hidden'}
            </Badge>
            <button onClick={() => handleDeleteCampaign(camp)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }} title="Remove">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="pa__ad-campaign-stats">
            <div className="pa__ad-stat"><span className="pa__stat-label">Reach</span><span>{(camp.reach || 0).toLocaleString()}</span></div>
            <div className="pa__ad-stat"><span className="pa__stat-label">Impressions</span><span>{(camp.impressions || 0).toLocaleString()}</span></div>
            <div className="pa__ad-stat"><span className="pa__stat-label">Clicks</span><span>{(camp.clicks || 0).toLocaleString()}</span></div>
            <div className="pa__ad-stat"><span className="pa__stat-label">CTR</span><span>{camp.ctr ? Number(camp.ctr).toFixed(2) + '%' : '—'}</span></div>
            <div className="pa__ad-stat"><span className="pa__stat-label">Leads</span><span>{camp.leads || 0}</span></div>
            <div className="pa__ad-stat"><span className="pa__stat-label">Spend</span><span>${Number(camp.spend || 0).toLocaleString()}</span></div>
          </div>
        </div>
      ))}

      {/* Manual Entry Form */}
      {showManual && (
        <Card style={{ marginTop: 12, padding: 16, background: 'var(--cream)' }}>
          <h4 className="properties-panel__section-title">Add Ad Campaign Manually</h4>
          <div className="properties-panel__grid">
            <Input label="Audience / Label *" value={manualDraft.audience_label} onChange={e => setManualDraft({ ...manualDraft, audience_label: e.target.value })} placeholder="e.g. Buyers 30-55 Gilbert 10mi" />
            <Input label="Campaign Name" value={manualDraft.meta_campaign_name} onChange={e => setManualDraft({ ...manualDraft, meta_campaign_name: e.target.value })} placeholder="e.g. 123 Main St - Just Listed" />
            <Input label="Reach" type="number" value={manualDraft.reach} onChange={e => setManualDraft({ ...manualDraft, reach: e.target.value })} />
            <Input label="Impressions" type="number" value={manualDraft.impressions} onChange={e => setManualDraft({ ...manualDraft, impressions: e.target.value })} />
            <Input label="Clicks" type="number" value={manualDraft.clicks} onChange={e => setManualDraft({ ...manualDraft, clicks: e.target.value })} />
            <Input label="Leads" type="number" value={manualDraft.leads} onChange={e => setManualDraft({ ...manualDraft, leads: e.target.value })} />
            <Input label="Spend $" type="number" value={manualDraft.spend} onChange={e => setManualDraft({ ...manualDraft, spend: e.target.value })} />
            <Input label="CTR %" type="number" step="0.01" value={manualDraft.ctr} onChange={e => setManualDraft({ ...manualDraft, ctr: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setShowManual(false)}>Cancel</Button>
            <Button size="sm" onClick={handleManualSave}>Add Campaign</Button>
          </div>
        </Card>
      )}

      {/* Meta Campaign Picker */}
      {showPicker && metaCampaigns && (
        <Card style={{ marginTop: 12, padding: 16, background: 'var(--cream)', maxHeight: 400, overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h4 className="properties-panel__section-title" style={{ margin: 0 }}>Select Campaigns to Attribute</h4>
            <Button variant="ghost" size="sm" onClick={() => setShowPicker(false)}>Close</Button>
          </div>
          {metaCampaigns.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>No campaigns found in your ad account.</p>
          ) : metaCampaigns.map(camp => (
            <div key={camp.id} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--brown-dark)', marginBottom: 4 }}>
                {camp.name}
                <Badge variant={camp.status === 'ACTIVE' ? 'success' : 'default'} size="sm" style={{ marginLeft: 6 }}>{camp.status}</Badge>
              </div>
              {camp.adsets?.length > 0 ? camp.adsets.map(adset => {
                const alreadyLinked = (campaigns ?? []).some(c => c.meta_campaign_id === camp.id && c.meta_adset_id === adset.id)
                return (
                  <div key={adset.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px 16px', fontSize: '0.82rem' }}>
                    <span style={{ flex: 1 }}>{adset.name}</span>
                    {alreadyLinked ? (
                      <Badge variant="success" size="sm">Linked</Badge>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => attributeCampaign(camp, adset)}>
                        + Attribute
                      </Button>
                    )}
                  </div>
                )
              }) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0 4px 16px', fontSize: '0.82rem' }}>
                  <span style={{ flex: 1, color: 'var(--color-text-muted)' }}>Campaign level (no ad sets)</span>
                  {(campaigns ?? []).some(c => c.meta_campaign_id === camp.id) ? (
                    <Badge variant="success" size="sm">Linked</Badge>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => attributeCampaign(camp, null)}>
                      + Attribute
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </Card>
  )
}

// ─── Offers Tab ──────────────────────────────────────────────────────────────
const OFFER_STATUS_OPTIONS = [
  { value: 'pending',    label: 'Pending',    color: 'var(--color-warning)' },
  { value: 'reviewing',  label: 'Reviewing',  color: 'var(--color-info)' },
  { value: 'countered',  label: 'Countered',  color: 'var(--brown-warm)' },
  { value: 'accepted',   label: 'Accepted',   color: 'var(--color-success)' },
  { value: 'declined',   label: 'Declined',   color: 'var(--color-danger)' },
  { value: 'withdrawn',  label: 'Withdrawn',  color: '#8b8b8b' },
  { value: 'expired',    label: 'Expired',    color: '#8b8b8b' },
]

const FINANCING_OPTS = [
  { value: 'conventional', label: 'Conventional' },
  { value: 'fha', label: 'FHA' },
  { value: 'va', label: 'VA' },
  { value: 'usda', label: 'USDA' },
  { value: 'cash', label: 'Cash' },
  { value: 'hard_money', label: 'Hard Money' },
  { value: 'other', label: 'Other' },
]

const EMPTY_OFFER = {
  buyer_name: '', buyer_agent: '', buyer_brokerage: '', buyer_phone: '', buyer_email: '',
  offer_price: '', earnest_money: '', down_payment_pct: '', financing_type: 'conventional',
  lender_name: '', pre_approval: false, close_of_escrow: '', inspection_days: '10',
  appraisal_contingency: true, financing_contingency: true, sale_contingency: false,
  seller_concessions: '', home_warranty: false, escalation_clause: '', personal_letter: '',
  other_terms: '', status: 'pending', notes: '', net_sheet_total: '',
}

// Title company net sheet calculator — opens in new tab
const NET_SHEET_CALCULATOR_URL = 'https://wfgkeyapp.com'

function OffersTab({ listing }) {
  const { data: offers, refetch } = useOffersForListing(listing.id)
  const [showForm, setShowForm] = useState(false)
  const [editingOffer, setEditingOffer] = useState(null)
  const [draft, setDraft] = useState(EMPTY_OFFER)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [comparing, setComparing] = useState(false)
  const [comparisonResult, setComparisonResult] = useState(null)
  const [selectedForCompare, setSelectedForCompare] = useState([])
  const [uploadingNetSheet, setUploadingNetSheet] = useState(null) // offer id being uploaded
  const netSheetInputRef = useRef(null)
  const [netSheetTargetId, setNetSheetTargetId] = useState(null)

  const listPrice = listing.currentPriceRaw || listing.listPriceRaw || listing.list_price || listing.current_price

  const openNew = () => {
    setEditingOffer(null)
    setDraft(EMPTY_OFFER)
    setShowForm(true)
  }

  const openEdit = (offer) => {
    setEditingOffer(offer)
    const d = {}
    Object.keys(EMPTY_OFFER).forEach(k => { d[k] = offer[k] ?? EMPTY_OFFER[k] })
    setDraft(d)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!draft.buyer_name?.trim()) return alert('Buyer name is required')
    setSaving(true)
    try {
      const payload = {
        ...draft,
        listing_id: listing.id,
        offer_price: draft.offer_price ? Number(draft.offer_price) : null,
        earnest_money: draft.earnest_money ? Number(draft.earnest_money) : null,
        down_payment_pct: draft.down_payment_pct ? Number(draft.down_payment_pct) : null,
        seller_concessions: draft.seller_concessions ? Number(draft.seller_concessions) : 0,
        inspection_days: draft.inspection_days ? Number(draft.inspection_days) : null,
        net_sheet_total: draft.net_sheet_total ? Number(draft.net_sheet_total) : null,
      }
      if (editingOffer) {
        await DB.updateOffer(editingOffer.id, payload)
      } else {
        await DB.createOffer(payload)
      }
      await refetch()
      setShowForm(false)
      setEditingOffer(null)
    } catch (e) {
      alert(e.message)
    } finally { setSaving(false) }
  }

  const handleDelete = async (offer) => {
    if (!confirm(`Delete offer from ${offer.buyer_name}?`)) return
    await DB.deleteOffer(offer.id)
    refetch()
  }

  // AI Analysis for single offer
  const analyzeOffer = async (offer) => {
    setAnalyzing(offer.id)
    try {
      const prompt = `Analyze this real estate offer for my seller. Be concise and actionable.

LISTING: ${listing.address}, ${listing.city} AZ — List Price: $${Number(listPrice).toLocaleString()}

OFFER:
- Buyer: ${offer.buyer_name} (Agent: ${offer.buyer_agent || 'N/A'})
- Offer Price: $${Number(offer.offer_price).toLocaleString()} (${listPrice ? ((offer.offer_price / listPrice * 100).toFixed(1) + '% of list') : 'N/A'})
- Financing: ${offer.financing_type}${offer.pre_approval ? ' (pre-approved)' : ''}${offer.lender_name ? ` via ${offer.lender_name}` : ''}
- Earnest Money: $${Number(offer.earnest_money || 0).toLocaleString()}
- Down Payment: ${offer.down_payment_pct || 'N/A'}%
- Close of Escrow: ${offer.close_of_escrow || 'N/A'}
- Inspection: ${offer.inspection_days || 10} days
- Contingencies: ${[offer.appraisal_contingency && 'Appraisal', offer.financing_contingency && 'Financing', offer.sale_contingency && 'Sale of home'].filter(Boolean).join(', ') || 'None'}
- Seller Concessions: $${Number(offer.seller_concessions || 0).toLocaleString()}
- Home Warranty: ${offer.home_warranty ? 'Yes' : 'No'}
${offer.net_sheet_total ? `- NET TO SELLER (from title company net sheet): $${Number(offer.net_sheet_total).toLocaleString()}` : ''}
${offer.escalation_clause ? `- Escalation: ${offer.escalation_clause}` : ''}
${offer.other_terms ? `- Other: ${offer.other_terms}` : ''}

Provide:
1. STRENGTH SCORE (1-10) and one-line summary
2. KEY STRENGTHS (2-3 bullets)
3. KEY CONCERNS (2-3 bullets)
4. NET TO SELLER — use the title company net sheet figure ($${offer.net_sheet_total ? Number(offer.net_sheet_total).toLocaleString() : 'not provided'}) if available, otherwise estimate (price minus concessions)
5. RECOMMENDATION for the seller (accept, counter, decline — with reasoning)`

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://kbbnsgkuqxfikvdzvhon.supabase.co'}/functions/v1/generate-content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ prompt, max_tokens: 800 }),
        }
      )
      const json = await res.json()
      const analysis = json.content || json.text || json.result || ''
      await DB.updateOffer(offer.id, { ai_analysis: analysis })
      refetch()
    } catch (e) {
      alert('AI analysis failed: ' + e.message)
    } finally { setAnalyzing(null) }
  }

  // Multi-offer comparison
  const compareOffers = async () => {
    const toCompare = (offers ?? []).filter(o => selectedForCompare.includes(o.id))
    if (toCompare.length < 2) return alert('Select at least 2 offers to compare')
    setComparing(true)
    try {
      const offerSummaries = toCompare.map((o, i) => `
OFFER ${i + 1}: ${o.buyer_name}
- Price: $${Number(o.offer_price).toLocaleString()} (${listPrice ? ((o.offer_price / listPrice * 100).toFixed(1) + '% of list') : 'N/A'})
- Financing: ${o.financing_type}${o.pre_approval ? ' (pre-approved)' : ''}
- Earnest: $${Number(o.earnest_money || 0).toLocaleString()}
- Close: ${o.close_of_escrow || 'TBD'}
- Inspection: ${o.inspection_days || 10} days
- Contingencies: ${[o.appraisal_contingency && 'Appraisal', o.financing_contingency && 'Financing', o.sale_contingency && 'Sale'].filter(Boolean).join(', ') || 'None'}
- Concessions: $${Number(o.seller_concessions || 0).toLocaleString()}
- Estimated Net: ~$${(Number(o.offer_price) - Number(o.seller_concessions || 0)).toLocaleString()}
${o.net_sheet_total ? `- NET TO SELLER (from title company net sheet): $${Number(o.net_sheet_total).toLocaleString()}` : ''}
${o.escalation_clause ? `- Escalation: ${o.escalation_clause}` : ''}
${o.other_terms ? `- Other: ${o.other_terms}` : ''}`)

      const prompt = `Compare these ${toCompare.length} offers for my seller on ${listing.address}, ${listing.city} AZ (List: $${Number(listPrice).toLocaleString()}).

${offerSummaries.join('\n')}

Provide a seller-friendly breakdown:
1. SIDE-BY-SIDE COMPARISON TABLE (price, net to seller from net sheet if available, financing strength, timeline, risk level)
2. RANKING from strongest to weakest with reasoning — use the title company net sheet figures when available as they are the most accurate net-to-seller numbers
3. KEY DIFFERENTIATORS between offers
4. RECOMMENDED STRATEGY (which to accept/counter, what counter terms to propose)
5. TALKING POINTS for the seller conversation

Format this so I can send it directly to my seller.`

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || 'https://kbbnsgkuqxfikvdzvhon.supabase.co'}/functions/v1/generate-content`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ prompt, max_tokens: 1500 }),
        }
      )
      const json = await res.json()
      const result = json.content || json.text || json.result || ''
      setComparisonResult(result)
      // Update ai_compared_at on all compared offers
      const now = new Date().toISOString()
      await Promise.all(toCompare.map(o => DB.updateOffer(o.id, { ai_compared_at: now })))
      refetch()
    } catch (e) {
      alert('Comparison failed: ' + e.message)
    } finally { setComparing(false) }
  }

  const toggleCompare = (id) => {
    setSelectedForCompare(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  // Net sheet upload
  const triggerNetSheetUpload = (offerId) => {
    setNetSheetTargetId(offerId)
    setTimeout(() => netSheetInputRef.current?.click(), 0)
  }

  const handleNetSheetUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !netSheetTargetId) return
    setUploadingNetSheet(netSheetTargetId)
    try {
      await DB.uploadOfferNetSheet(file, netSheetTargetId)
      refetch()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploadingNetSheet(null)
      setNetSheetTargetId(null)
      if (netSheetInputRef.current) netSheetInputRef.current.value = ''
    }
  }

  const offerCount = (offers ?? []).length
  const pendingCount = (offers ?? []).filter(o => ['pending', 'reviewing'].includes(o.status)).length

  return (
    <div className="offers-tab">
      {/* Hidden file input for net sheet uploads */}
      <input ref={netSheetInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" style={{ display: 'none' }} onChange={handleNetSheetUpload} />
      {/* ── Summary Stats ── */}
      <div className="offers__summary">
        <div className="pa__total-card">
          <span className="pa__total-label">Total Offers</span>
          <span className="pa__total-value">{offerCount}</span>
        </div>
        <div className="pa__total-card">
          <span className="pa__total-label">Active / Reviewing</span>
          <span className="pa__total-value">{pendingCount}</span>
        </div>
        <div className="pa__total-card">
          <span className="pa__total-label">Highest Offer</span>
          <span className="pa__total-value">
            {offerCount > 0 ? '$' + Math.max(...(offers ?? []).map(o => Number(o.offer_price) || 0)).toLocaleString() : '—'}
          </span>
        </div>
        <div className="pa__total-card">
          <span className="pa__total-label">List Price</span>
          <span className="pa__total-value">{listPrice ? '$' + Number(listPrice).toLocaleString() : '—'}</span>
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="offers__actions">
        <Button onClick={openNew}>+ New Offer</Button>
        <a href={NET_SHEET_CALCULATOR_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
          <Button variant="ghost" size="sm"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="16" y2="18"/></svg>}
          >Net Sheet Calculator</Button>
        </a>
        {selectedForCompare.length >= 2 && (
          <Button variant="ghost" onClick={compareOffers} disabled={comparing}>
            {comparing ? 'Comparing…' : `Compare ${selectedForCompare.length} Offers`}
          </Button>
        )}
        {selectedForCompare.length > 0 && selectedForCompare.length < 2 && (
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
            Select at least 2 to compare
          </span>
        )}
      </div>

      {/* ── Comparison Result ── */}
      {comparisonResult && (
        <Card className="offers__comparison-result">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h3 className="pa__section-title">Offer Comparison</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button variant="ghost" size="sm" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(comparisonResult)
                  alert('Copied to clipboard!')
                } catch {}
              }}>Copy</Button>
              <Button variant="ghost" size="sm" onClick={() => setComparisonResult(null)}>Dismiss</Button>
            </div>
          </div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--brown-dark)' }}>
            {comparisonResult}
          </div>
        </Card>
      )}

      {/* ── Offers List ── */}
      {offerCount === 0 && !showForm ? (
        <Card style={{ textAlign: 'center', padding: 32 }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>No offers yet for this listing.</p>
          <Button onClick={openNew}>+ Add First Offer</Button>
        </Card>
      ) : (
        <div className="offers__list">
          {(offers ?? []).map(offer => {
            const statusOpt = OFFER_STATUS_OPTIONS.find(s => s.value === offer.status)
            const pctOfList = listPrice && offer.offer_price ? ((offer.offer_price / listPrice) * 100).toFixed(1) : null
            const net = Number(offer.offer_price || 0) - Number(offer.seller_concessions || 0)
            return (
              <Card key={offer.id} className="offers__card" hover>
                <div className="offers__card-header">
                  <label className="offers__compare-check">
                    <input type="checkbox" checked={selectedForCompare.includes(offer.id)} onChange={() => toggleCompare(offer.id)} />
                  </label>
                  <div className="offers__card-buyer">
                    <span className="offers__buyer-name">{offer.buyer_name}</span>
                    {offer.buyer_agent && <span className="offers__buyer-agent">{offer.buyer_agent}{offer.buyer_brokerage ? ` · ${offer.buyer_brokerage}` : ''}</span>}
                  </div>
                  <Badge variant={
                    offer.status === 'accepted' ? 'success' :
                    offer.status === 'declined' ? 'danger' :
                    offer.status === 'countered' ? 'warning' : 'info'
                  } size="sm">{statusOpt?.label ?? offer.status}</Badge>
                </div>

                <div className="offers__card-terms">
                  <div className="offers__term">
                    <span className="offers__term-label">Offer</span>
                    <span className="offers__term-value">${Number(offer.offer_price || 0).toLocaleString()}</span>
                    {pctOfList && <span className="offers__term-pct">{pctOfList}% of list</span>}
                  </div>
                  <div className="offers__term">
                    <span className="offers__term-label">{offer.net_sheet_total ? 'Net (Net Sheet)' : 'Net (Est.)'}</span>
                    <span className="offers__term-value" style={offer.net_sheet_total ? { color: 'var(--color-success)' } : {}}>
                      ${offer.net_sheet_total ? Number(offer.net_sheet_total).toLocaleString() : net.toLocaleString()}
                    </span>
                    {offer.net_sheet_total && <span className="offers__term-pct">from title co.</span>}
                  </div>
                  <div className="offers__term">
                    <span className="offers__term-label">Financing</span>
                    <span className="offers__term-value">{offer.financing_type}{offer.pre_approval ? ' ✓' : ''}</span>
                  </div>
                  <div className="offers__term">
                    <span className="offers__term-label">Close</span>
                    <span className="offers__term-value">{offer.close_of_escrow ? new Date(offer.close_of_escrow + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</span>
                  </div>
                  <div className="offers__term">
                    <span className="offers__term-label">Earnest</span>
                    <span className="offers__term-value">${Number(offer.earnest_money || 0).toLocaleString()}</span>
                  </div>
                  <div className="offers__term">
                    <span className="offers__term-label">Contingencies</span>
                    <span className="offers__term-value">{[offer.appraisal_contingency && 'Appr', offer.financing_contingency && 'Fin', offer.sale_contingency && 'Sale'].filter(Boolean).join(', ') || 'None'}</span>
                  </div>
                </div>

                {offer.escalation_clause && (
                  <div className="offers__escalation">
                    <Badge variant="info" size="sm">Escalation</Badge>
                    <span>{offer.escalation_clause}</span>
                  </div>
                )}

                {offer.ai_analysis && (
                  <div className="offers__ai-analysis">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Badge variant="default" size="sm">AI Analysis</Badge>
                    </div>
                    <div style={{ fontSize: '0.78rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--brown-dark)' }}>
                      {offer.ai_analysis}
                    </div>
                  </div>
                )}

                {/* ── Net Sheet ── */}
                <div className="offers__net-sheet">
                  <div className="offers__net-sheet-row">
                    <span className="pa__stat-label">Net Sheet</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {offer.net_sheet_doc_url ? (
                        <a href={offer.net_sheet_doc_url} target="_blank" rel="noopener noreferrer" className="offers__net-sheet-link">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          {offer.net_sheet_doc_name || 'View Net Sheet'}
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No net sheet uploaded</span>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => triggerNetSheetUpload(offer.id)} disabled={uploadingNetSheet === offer.id}>
                        {uploadingNetSheet === offer.id ? 'Uploading…' : (offer.net_sheet_doc_url ? 'Replace' : 'Upload')}
                      </Button>
                    </div>
                  </div>
                  {offer.net_sheet_total && (
                    <div className="offers__net-sheet-row">
                      <span className="pa__stat-label">Net to Seller (from net sheet)</span>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--brown-dark)' }}>${Number(offer.net_sheet_total).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="offers__card-actions">
                  <Button variant="ghost" size="sm" onClick={() => analyzeOffer(offer)} disabled={analyzing === offer.id}>
                    {analyzing === offer.id ? 'Analyzing…' : (offer.ai_analysis ? 'Re-Analyze' : 'Analyze')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(offer)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(offer)} className="properties-panel__delete">Delete</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* ── Add / Edit Offer Form ── */}
      <SlidePanel
        open={showForm}
        onClose={() => { setShowForm(false); setEditingOffer(null) }}
        title={editingOffer ? 'Edit Offer' : 'New Offer'}
        subtitle={listing.address}
        width={520}
      >
        <div className="offers__form">
          <h4 className="properties-panel__section-title">Buyer Info</h4>
          <div className="properties-panel__grid">
            <Input label="Buyer Name *" value={draft.buyer_name} onChange={e => setDraft({ ...draft, buyer_name: e.target.value })} />
            <Input label="Buyer Agent" value={draft.buyer_agent} onChange={e => setDraft({ ...draft, buyer_agent: e.target.value })} />
            <Input label="Brokerage" value={draft.buyer_brokerage} onChange={e => setDraft({ ...draft, buyer_brokerage: e.target.value })} />
            <Input label="Phone" value={draft.buyer_phone} onChange={e => setDraft({ ...draft, buyer_phone: e.target.value })} />
            <Input label="Email" value={draft.buyer_email} onChange={e => setDraft({ ...draft, buyer_email: e.target.value })} />
          </div>

          <h4 className="properties-panel__section-title">Offer Terms</h4>
          <div className="properties-panel__grid">
            <Input label="Offer Price" type="number" value={draft.offer_price} onChange={e => setDraft({ ...draft, offer_price: e.target.value })} placeholder="e.g. 425000" />
            <Input label="Earnest Money" type="number" value={draft.earnest_money} onChange={e => setDraft({ ...draft, earnest_money: e.target.value })} />
            <Input label="Down Payment %" type="number" step="0.5" value={draft.down_payment_pct} onChange={e => setDraft({ ...draft, down_payment_pct: e.target.value })} />
            <Select label="Financing" value={draft.financing_type} onChange={e => setDraft({ ...draft, financing_type: e.target.value })}>
              {FINANCING_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
            <Input label="Lender" value={draft.lender_name} onChange={e => setDraft({ ...draft, lender_name: e.target.value })} />
            <Input label="Close of Escrow" type="date" value={draft.close_of_escrow} onChange={e => setDraft({ ...draft, close_of_escrow: e.target.value })} />
            <Input label="Inspection Days" type="number" value={draft.inspection_days} onChange={e => setDraft({ ...draft, inspection_days: e.target.value })} />
            <Input label="Seller Concessions $" type="number" value={draft.seller_concessions} onChange={e => setDraft({ ...draft, seller_concessions: e.target.value })} />
          </div>

          <label className="properties-panel__check">
            <input type="checkbox" checked={!!draft.pre_approval} onChange={e => setDraft({ ...draft, pre_approval: e.target.checked })} />
            <span>Pre-Approval Letter</span>
          </label>
          <label className="properties-panel__check">
            <input type="checkbox" checked={!!draft.appraisal_contingency} onChange={e => setDraft({ ...draft, appraisal_contingency: e.target.checked })} />
            <span>Appraisal Contingency</span>
          </label>
          <label className="properties-panel__check">
            <input type="checkbox" checked={!!draft.financing_contingency} onChange={e => setDraft({ ...draft, financing_contingency: e.target.checked })} />
            <span>Financing Contingency</span>
          </label>
          <label className="properties-panel__check">
            <input type="checkbox" checked={!!draft.sale_contingency} onChange={e => setDraft({ ...draft, sale_contingency: e.target.checked })} />
            <span>Sale of Home Contingency</span>
          </label>
          <label className="properties-panel__check">
            <input type="checkbox" checked={!!draft.home_warranty} onChange={e => setDraft({ ...draft, home_warranty: e.target.checked })} />
            <span>Home Warranty</span>
          </label>

          <Textarea label="Escalation Clause" value={draft.escalation_clause} onChange={e => setDraft({ ...draft, escalation_clause: e.target.value })} rows={2} placeholder="e.g. Will increase up to $435,000 in $2,000 increments..." />
          <Textarea label="Personal Letter / Other Terms" value={draft.other_terms} onChange={e => setDraft({ ...draft, other_terms: e.target.value })} rows={2} />

          <h4 className="properties-panel__section-title">Status</h4>
          <Select label="Offer Status" value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })}>
            {OFFER_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          {draft.status === 'countered' && (
            <div className="properties-panel__grid">
              <Input label="Counter Price" type="number" value={draft.counter_price ?? ''} onChange={e => setDraft({ ...draft, counter_price: e.target.value })} />
              <Textarea label="Counter Terms" value={draft.counter_terms ?? ''} onChange={e => setDraft({ ...draft, counter_terms: e.target.value })} rows={2} />
            </div>
          )}

          <h4 className="properties-panel__section-title">Net Sheet</h4>
          <Input label="Net to Seller $ (from title company net sheet)" type="number" value={draft.net_sheet_total ?? ''} onChange={e => setDraft({ ...draft, net_sheet_total: e.target.value })} placeholder="e.g. 385000" />
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: -4 }}>
            Enter the bottom-line net from your title company's net sheet. Upload the PDF on the offer card after saving.
          </p>

          <Textarea label="Notes" value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} rows={2} />

          <div className="properties-panel__actions">
            {editingOffer && (
              <Button variant="ghost" className="properties-panel__delete" onClick={() => { handleDelete(editingOffer); setShowForm(false) }}>Delete</Button>
            )}
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={() => { setShowForm(false); setEditingOffer(null) }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : (editingOffer ? 'Save Changes' : 'Add Offer')}</Button>
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}

// ─── Seller Email Engagement ─────────────────────────────────────────────────
function SellerEmailEngagement({ contactId }) {
  const [emails, setEmails] = React.useState([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!contactId) return
    async function load() {
      try {
        const { data: enrollments } = await DB.default
          ? await fetch('') // won't reach — supabase is imported via DB
          : { data: [] }
        // Use supabase directly since it's imported as DB.*
        const sup = (await import('../../lib/supabase.js')).default
        const { data: enr } = await sup.from('campaign_enrollments').select('id').eq('contact_id', contactId)
        if (!enr?.length) { setLoading(false); return }
        const { data: history } = await sup.from('campaign_step_history')
          .select('id, subject, sent_at, opened_at, clicked_at, replied_at, bounced_at')
          .in('enrollment_id', enr.map(e => e.id))
          .order('sent_at', { ascending: false }).limit(10)
        setEmails(history ?? [])
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [contactId])

  if (loading) return null
  if (emails.length === 0) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--brown-dark)', margin: 0 }}>Email Activity ({emails.length})</h3>
        <a href="/email/reporting" style={{ fontSize: '0.72rem', color: 'var(--brown-mid)' }}>Reporting</a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {emails.map(e => (
          <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem' }}>
            <span style={{ minWidth: 70, color: 'var(--color-text-muted)' }}>
              {e.sent_at ? new Date(e.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
            </span>
            <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject || '(no subject)'}</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {e.opened_at && <Badge variant="success" size="sm">Opened</Badge>}
              {e.clicked_at && <Badge variant="accent" size="sm">Clicked</Badge>}
              {e.replied_at && <Badge variant="success" size="sm">Replied</Badge>}
              {e.bounced_at && <Badge variant="danger" size="sm">Bounced</Badge>}
              {!e.opened_at && !e.bounced_at && <Badge variant="default" size="sm">Sent</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Listing Expenses Tab ────────────────────────────────────────────────────
const LISTING_EXPENSE_PRESETS = [
  'Sign Post Installation',
  'Photography',
  'Lockbox Installation',
  'Flyer Delivery / Printing',
  'Ad Spend (Meta/Google)',
  'Staging',
  'Virtual Tour / Video',
  'Cleaning / Prep',
  'Repairs / Touch-Ups',
  'Home Warranty',
]

function ListingExpensesTab({ listing }) {
  const { data: listingExpenses, refetch } = useExpensesForListing(listing.id)
  const { data: allExpData } = useAllExpenses()
  const expCats = useExpenseCategories('expense')
  const cats = expCats.data ?? []
  const dedupedCats = useMemo(() => {
    const seen = new Set()
    return cats.filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true })
  }, [cats])

  // Unique vendor names for autocomplete
  const vendorNames = useMemo(() => {
    const names = new Set()
    for (const e of (allExpData ?? [])) if (e.vendor) names.add(e.vendor)
    return [...names].sort()
  }, [allExpData])

  const expenses = listingExpenses ?? []
  const total = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const fmt = v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const [showAdd, setShowAdd] = useState(false)
  const [draft, setDraft] = useState({ date: new Date().toISOString().split('T')[0], vendor: '', description: '', amount: '', category_id: '' })
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    setSaving(true)
    try {
      await DB.createExpense({
        date: draft.date,
        vendor: draft.vendor || null,
        description: draft.description || null,
        amount: Number(draft.amount),
        category_id: draft.category_id || null,
        listing_id: listing.id,
        contact_id: listing.contact_id || null,
        is_deductible: true,
        is_split: false,
      })
      setShowAdd(false)
      setDraft({ date: new Date().toISOString().split('T')[0], vendor: '', description: '', amount: '', category_id: '' })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this expense?')) return
    try {
      await DB.deleteExpense(id)
      refetch()
    } catch (e) { alert(e.message) }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brown-dark)', margin: 0 }}>
            Listing Expenses
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} &middot; {fmt(total)} total
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>+ Add Expense</Button>
      </div>

      {/* Quick-add preset buttons */}
      {!showAdd && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {LISTING_EXPENSE_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => { setDraft(d => ({ ...d, description: preset })); setShowAdd(true) }}
              style={{
                padding: '4px 10px', fontSize: '0.72rem', borderRadius: 12,
                border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle, #faf8f5)',
                color: 'var(--brown-dark)', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              + {preset}
            </button>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <Card style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input label="Date" type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} style={{ flex: 1 }} />
            <Input label="Amount ($)" type="number" step="0.01" value={draft.amount} onChange={e => setDraft(d => ({ ...d, amount: e.target.value }))} style={{ flex: 1 }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 3 }}>Vendor / Payee</label>
            <input value={draft.vendor} onChange={e => setDraft(d => ({ ...d, vendor: e.target.value }))} placeholder="Start typing..." list="listing-vendor-list" style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', fontFamily: 'inherit' }} />
            <datalist id="listing-vendor-list">{vendorNames.map(n => <option key={n} value={n} />)}</datalist>
          </div>
          <Input label="Description" value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} placeholder="Sign post, photography, etc." />
          <Select label="Category" value={draft.category_id} onChange={e => setDraft(d => ({ ...d, category_id: e.target.value }))}>
            <option value="">— Select —</option>
            {dedupedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || !draft.amount}>
              {saving ? 'Saving...' : 'Add Expense'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Expense list */}
      {expenses.length === 0 ? (
        <Card>
          <p style={{ padding: 24, textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            No expenses recorded for this listing yet. Use the presets above to quickly add common costs like sign posts, photography, or lockboxes.
          </p>
        </Card>
      ) : (
        <Card padding={false}>
          <table className="pnl-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vendor</th>
                <th>Description</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td style={{ fontWeight: 500 }}>{e.vendor || '—'}</td>
                  <td>
                    <span style={{ fontSize: '0.82rem' }}>{e.description || '—'}</span>
                    {e.category?.name && <><br /><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{e.category.name}</span></>}
                  </td>
                  <td style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(e.amount)}</td>
                  <td>
                    <button onClick={() => handleDelete(e.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '0.9rem' }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td colSpan="3" style={{ textAlign: 'right', paddingRight: 12 }}>Total</td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </Card>
      )}
    </div>
  )
}

function PlanView({ listing, allListings, onBack, onEdit }) {
  const [detailTab, setDetailTab] = useState('plan')
  const isNew   = listing.type === 'new'
  const isDbRow = typeof listing.id === 'string'

  // Merge hardcoded + custom tasks from localStorage
  const customKey = isNew ? 'custom_launch_tasks' : 'custom_relaunch_tasks'
  const customTasks = JSON.parse(localStorage.getItem(customKey) || '[]')
  const plan = [...(isNew ? launchChecklist : relaunchChecklist), ...customTasks]

  // Try to load real checklist tasks when it's a DB listing
  const { data: dbTasks, refetch: refetchTasks } = useTasksForListing(isDbRow ? listing.id : null)
  const { data: deletedTasks, refetch: refetchDeletedTasks } = useDeletedTasksForListing(isDbRow ? listing.id : null)
  const contactId = listing.contact_id ?? listing.contact?.id
  const { data: linkedNotes, refetch: refetchNotes } = useNotesForContact(contactId)
  const { openNote, createAndOpen } = useNotesContext()
  const hasTasks = dbTasks && dbTasks.length > 0

  // Open house history for this listing
  const { data: allOHs } = useOpenHouses()
  const listingOHs = useMemo(() =>
    (allOHs ?? []).filter(oh => oh.listing_id === listing.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  , [allOHs, listing.id])

  // Buyer showing feedback for this listing's property
  const { data: allShowingSessions } = useShowingSessions()
  const buyerFeedback = useMemo(() => {
    if (!listing.property_id || !allShowingSessions) return []
    return allShowingSessions.flatMap(s =>
      (s.showings ?? [])
        .filter(sh => sh.property?.id === listing.property_id)
        .map(sh => ({
          date: s.date,
          buyer: s.contact?.name ?? '—',
          interest: sh.interest_level,
          price: sh.feedback_price,
          feedback: sh.buyer_feedback,
          wouldOffer: sh.would_offer,
        }))
    ).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  }, [allShowingSessions, listing.property_id])

  // Documents
  const { data: docs, refetch: refetchDocs } = useDocumentsForListing(isDbRow ? listing.id : null)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // Modals
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAIPlan, setShowAIPlan] = useState(false)
  const [showPriceReduction, setShowPriceReduction] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [copiedStrategy, setCopiedStrategy] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  // Collapsible phase sections — all expanded by default
  const [collapsedPhases, setCollapsedPhases] = useState({})
  const [showPlanHistory, setShowPlanHistory] = useState(false)
  const planHistory = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(`listing_plan_history_${listing.id}`) || '[]') } catch { return [] }
  }, [listing.id, detailTab])
  const navigate = useNavigate()

  // Ref on the printable region (plan + strategy) for window.print and PDF export.
  const printableRef = useRef(null)

  const handlePrint = () => {
    // CSS (@media print in Sellers.css) hides nav/buttons so the plan prints clean.
    window.print()
  }

  const handleExportPdf = async () => {
    const node = printableRef.current
    if (!node) return
    setExportingPdf(true)
    // Move the node into the viewport so html2canvas can measure and render it.
    // Use z-index: -9999 to keep it behind all content (visibility: hidden would
    // cause html2canvas to produce a blank page).
    const prev = {
      position: node.style.position,
      left: node.style.left,
      top: node.style.top,
      zIndex: node.style.zIndex,
    }
    node.style.position = 'fixed'
    node.style.left = '0'
    node.style.top = '0'
    node.style.zIndex = '-9999'
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const filename = `${(listing.contact_name || 'Client').replace(/[^\w-]+/g, '_')}_${(listing.address || 'Listing').replace(/[^\w-]+/g, '_')}_${isNew ? 'Launch' : 'Relaunch'}_Plan.pdf`
      await html2pdf()
        .set({
          margin:       0,
          filename,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: 1100 },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
          pagebreak:    { mode: ['css', 'legacy'] },
        })
        .from(node)
        .save()
    } catch (e) {
      console.error('PDF export failed:', e)
      alert('PDF export failed. Try using the Print button and "Save as PDF" from the print dialog.')
    } finally {
      node.style.position = prev.position
      node.style.left = prev.left
      node.style.top = prev.top
      node.style.zIndex = prev.zIndex
      setExportingPdf(false)
    }
  }

  // Fallback to listing.checklist for mock data
  const [localChecks, setLocalChecks] = useState(listing.checklist ?? {})

  // Use DB tasks when available, merge with plan for display
  const displayTasks = hasTasks ? dbTasks : plan
  const displayPhases = hasTasks
    ? [...new Set(dbTasks.map(t => t.phase))]
    : [...new Set(plan.map(s => s.phase))]

  const getChecked = (i) => {
    if (hasTasks) return dbTasks[i]?.completed ?? false
    return !!localChecks[i]
  }

  const getCompletedAt = (i) => {
    if (hasTasks) return dbTasks[i]?.completed_at ?? null
    return null
  }

  const toggle = async (i) => {
    if (hasTasks && dbTasks[i]) {
      const task = dbTasks[i]
      const nowCompleted = !task.completed
      try {
        await DB.updateTask(task.id, {
          completed:    nowCompleted,
          completed_at: nowCompleted ? new Date().toISOString() : null,
        })
        await DB.logActivity('task_completed', `${nowCompleted ? 'Completed' : 'Unchecked'}: ${task.label}`)
        refetchTasks()
      } catch (e) { /* silent */ }
    } else {
      const updated = { ...localChecks, [i]: !localChecks[i] }
      setLocalChecks(updated)
    }
  }

  // Inline edit: update a task's label.
  const editTaskLabel = async (taskId, nextLabel) => {
    try {
      await DB.updateTask(taskId, { label: nextLabel })
      refetchTasks()
    } catch (e) { console.error('Edit task failed:', e) }
  }

  // Soft-delete a task (recoverable via the trash drawer).
  const softDeleteTask = async (task) => {
    if (!confirm(`Delete "${task.label}"?\n\nYou can restore it from the deleted items drawer.`)) return
    try {
      await DB.deleteTask(task.id)
      await DB.logActivity('task_deleted', `Deleted: ${task.label}`)
      refetchTasks()
      refetchDeletedTasks()
    } catch (e) { console.error('Delete task failed:', e) }
  }

  // Restore a soft-deleted task.
  const restoreTask = async (task) => {
    try {
      await DB.restoreTask(task.id)
      await DB.logActivity('task_restored', `Restored: ${task.label}`)
      refetchTasks()
      refetchDeletedTasks()
    } catch (e) { console.error('Restore task failed:', e) }
  }

  // Permanently delete a soft-deleted task.
  const purgeTask = async (task) => {
    if (!confirm(`Permanently delete "${task.label}"?\n\nThis cannot be undone.`)) return
    try {
      await DB.hardDeleteTask(task.id)
      refetchDeletedTasks()
    } catch (e) { console.error('Purge task failed:', e) }
  }

  const checks = hasTasks
    ? Object.fromEntries(dbTasks.map((t, i) => [i, t.completed]))
    : localChecks

  const totalItems = hasTasks ? dbTasks.length : plan.length
  const completed = Object.values(checks).filter(Boolean).length
  const pct = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0

  // File upload handler
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !isDbRow) return
    setUploading(true)
    setUploadError(null)
    try {
      for (const file of files) {
        await DB.uploadListingDocument(file, listing.id)
      }
      await DB.logActivity('document_uploaded', `Uploaded ${files.length} document(s) to ${listing.address}`)
      refetchDocs()
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError(err.message || 'Upload failed — check that the storage bucket exists and has the correct policies.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteDoc = async (doc) => {
    if (!confirm(`Remove "${doc.name}"?`)) return
    try {
      await DB.deleteDocument(doc.id, doc.file_path)
      refetchDocs()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="sellers-plan">
      <div className="sellers-plan__nav">
        <button className="oh-detail__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Sellers
        </button>
        <Button variant="ghost" size="sm" onClick={onEdit}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        >Edit Listing</Button>
      </div>

      <div className="sellers-plan__header">
        <div>
          <div className="sellers-plan__type-badge">
            <Badge variant={isNew ? 'success' : 'warning'}>{isNew ? 'Launch Plan' : 'Relaunch Plan'}</Badge>
          </div>
          <h2 className="sellers-plan__address"><AddressLink address={listing.address} city={listing.city}>{listing.address}</AddressLink></h2>
          <p className="sellers-plan__meta">{listing.city}, AZ {listing.zip} &bull; {listing.listPrice} &bull; {listing.dom} DOM</p>
          {listing.created_at && (
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Added {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
        <div className="sellers-plan__progress-ring-wrap">
          <div className="sellers-plan__progress-ring">
            <svg viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="var(--color-border-light)" strokeWidth="5" />
              <circle cx="32" cy="32" r="28" fill="none"
                stroke={isNew ? 'var(--color-success)' : 'var(--color-warning)'}
                strokeWidth="5"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - pct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </svg>
            <span className="sellers-plan__progress-pct">{pct}%</span>
          </div>
          <p className="sellers-plan__progress-label">{completed}/{totalItems} steps</p>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      {isDbRow && (
        <div className="sellers-plan__actions">
          <Button variant="ghost" size="sm" onClick={() => setShowAIPlan(true)}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M12 2a4 4 0 014 4c0 1.95-1.4 3.58-3.25 3.93L12 22"/><path d="M8 6a4 4 0 010-8"/><circle cx="12" cy="6" r="4"/></svg>}
          >Generate Plan with AI</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowAddTask(true)}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
          >Add Checklist Item</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowPriceReduction(true)}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/></svg>}
          >Price Reduction</Button>
          <Button variant="ghost" size="sm" onClick={handlePrint}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>}
          >Print</Button>
          <Button variant="ghost" size="sm" onClick={handleExportPdf} disabled={exportingPdf}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>}
          >{exportingPdf ? 'Generating…' : 'Export PDF'}</Button>
          {planHistory.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowPlanHistory(!showPlanHistory)}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
            >{showPlanHistory ? 'Hide History' : `Plan History (${planHistory.length})`}</Button>
          )}
        </div>
      )}

      {/* ── Plan History ── */}
      {showPlanHistory && planHistory.length > 0 && (
        <Card style={{ marginTop: 12, padding: 16 }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brown-dark)', margin: '0 0 12px' }}>Prior Plans</h4>
          {planHistory.map((plan, pi) => (
            <details key={pi} style={{ marginBottom: 8, borderBottom: '1px solid var(--color-border-light, #f0ece6)', paddingBottom: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)', padding: '4px 0' }}>
                {new Date(plan.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8 }}>{plan.tasks.length} tasks</span>
              </summary>
              {plan.strategy && (
                <div style={{ padding: '8px 12px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6, margin: '6px 0', fontSize: '0.75rem', color: 'var(--color-text)', whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>
                  {plan.strategy}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                {plan.tasks.map((t, ti) => (
                  <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', padding: '2px 0' }}>
                    <span style={{ color: t.completed ? 'var(--color-success)' : 'var(--color-text-muted)' }}>{t.completed ? '✓' : '○'}</span>
                    <span style={{ color: t.completed ? 'var(--brown-dark)' : 'var(--color-text-muted)', textDecoration: t.completed ? 'line-through' : 'none' }}>{t.label}</span>
                    {t.phase && <Badge variant="default" size="sm">{t.phase}</Badge>}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </Card>
      )}

      {/* ── Detail Tabs ── */}
      {isDbRow && (
        <TabBar
          tabs={[
            { label: 'Plan', value: 'plan' },
            { label: 'Platform Analytics', value: 'analytics' },
            { label: 'Offers', value: 'offers' },
            { label: 'Expenses', value: 'expenses' },
            { label: 'Activity', value: 'activity' },
          ]}
          active={detailTab}
          onChange={setDetailTab}
        />
      )}

      {/* ── Analytics Tab ── */}
      {detailTab === 'analytics' && isDbRow && <PlatformAnalyticsTab listing={listing} />}

      {/* ── Offers Tab ── */}
      {detailTab === 'offers' && isDbRow && <OffersTab listing={listing} />}

      {/* ── Expenses Tab ── */}
      {detailTab === 'expenses' && isDbRow && <ListingExpensesTab listing={listing} />}

      {/* ── Activity Tab ── */}
      {detailTab === 'activity' && isDbRow && listing.contact_id && (
        <div style={{ marginTop: 16 }}>
          <SellerEmailEngagement contactId={listing.contact_id} />
          <IntakeFormTracker contactId={listing.contact_id} contactEmail={listing.contact_email || listing.contact?.email} contactName={listing.contact_name || listing.contact?.name} />
          <SocialProfilesPanel contactId={listing.contact_id} />
          <FamilyLinksPanel contactId={listing.contact_id} />
          <LifeEventsPanel contactId={listing.contact_id} />
          <InteractionsTimeline contactId={listing.contact_id} />

          {/* Seller weekly update */}
          <div style={{ marginTop: 12 }}>
            <SellerWeeklyUpdate listing={listing} />
          </div>

          {/* Listing checklist */}
          {typeof listing.id === 'string' && (
            <div style={{ marginTop: 12 }}>
              <ChecklistRunner parentKind="listing" parentId={listing.id} category="listing" />
            </div>
          )}
        </div>
      )}

      {/* ── Plan Tab (default) ── */}
      {detailTab === 'plan' && Array.isArray(listing.related_people) && listing.related_people.length > 0 && (
        <Card>
          <RelatedPeopleDisplay value={listing.related_people} title="Other Parties on This Transaction" />
        </Card>
      )}

      {/* ── Buyer Showing Feedback (on Plan tab) ── */}
      {detailTab === 'plan' && buyerFeedback.length > 0 && (
        <Card style={{ padding: 16, marginBottom: 12 }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--brown-dark)', margin: '0 0 8px' }}>
            Buyer Showing Feedback ({buyerFeedback.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {buyerFeedback.map((fb, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6 }}>
                <div style={{ minWidth: 60, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  {fb.date ? new Date(fb.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{fb.buyer}</span>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                    {fb.interest && <Badge variant={fb.interest === 'high' ? 'success' : fb.interest === 'medium' ? 'warning' : 'danger'} size="sm">{fb.interest} interest</Badge>}
                    {fb.price && <Badge variant={fb.price === 'fair' ? 'success' : fb.price === 'too_high' ? 'danger' : 'info'} size="sm">Price: {fb.price === 'too_high' ? 'Too High' : fb.price === 'fair' ? 'Fair' : 'Good Value'}</Badge>}
                    {fb.wouldOffer && <Badge variant="success" size="sm">Would Offer</Badge>}
                  </div>
                  {fb.feedback && <p style={{ fontSize: '0.78rem', color: 'var(--color-text)', margin: '4px 0 0', fontStyle: 'italic' }}>"{fb.feedback}"</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {detailTab === 'plan' && <>
      <div className="sellers-plan__body">
        {/* ── Left: Unified Checklist ── */}
        <div className="sellers-plan__checklist-col">
          <Card className="sellers-plan__checklist-card">
            {displayPhases.map(phase => {
              const phaseItems = hasTasks
                ? dbTasks.map((t, i) => ({ ...t, i })).filter(t => t.phase === phase)
                : plan.map((step, i) => ({ ...step, i })).filter(s => s.phase === phase)
              const phaseCompleted = phaseItems.filter(s => !!checks[s.i]).length
              const meta = phaseLabels[phase] ?? { label: phase, color: '#888' }
              const isCollapsed = !!collapsedPhases[phase]
              return (
                <div key={phase} className="sellers-plan__phase-section">
                  <button
                    type="button"
                    className="sellers-plan__phase-toggle"
                    onClick={() => setCollapsedPhases(p => ({ ...p, [phase]: !p[phase] }))}
                  >
                    <div className="sellers-plan__phase-dot" style={{ background: meta.color }} />
                    <h3 className="sellers-plan__phase-name">{meta.label}</h3>
                    <span className="sellers-plan__phase-count">{phaseCompleted}/{phaseItems.length}</span>
                    <svg
                      className={`sellers-plan__phase-chevron ${isCollapsed ? '' : 'sellers-plan__phase-chevron--open'}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {!isCollapsed && (
                    <div className="sellers-plan__phase-items">
                      {phaseItems.map(step => {
                        const completedAt = getCompletedAt(step.i)
                        const isDbTask = hasTasks && dbTasks[step.i]
                        return (
                          <CheckItem
                            key={step.i}
                            label={step.label}
                            checked={!!checks[step.i]}
                            onChange={() => toggle(step.i)}
                            note={completedAt ? new Date(completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined}
                            onEdit={isDbTask ? (nextLabel) => editTaskLabel(dbTasks[step.i].id, nextLabel) : undefined}
                            onDelete={isDbTask ? () => softDeleteTask(dbTasks[step.i]) : undefined}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        </div>

        {/* ── Right: Documents Sidebar ── */}
        {isDbRow && (
          <div className="sellers-plan__docs-col">
            <Card className="sellers-plan__docs-sidebar">
              <div className="sellers-plan__section-header">
                <h3 className="sellers-plan__section-title">Documents ({(docs ?? []).length})</h3>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                    icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>}
                  >{uploading ? 'Uploading...' : 'Attach'}</Button>
                </div>
              </div>

              {uploadError && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', background: 'rgba(220,50,50,0.06)', padding: '6px 10px', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                  {uploadError}
                </div>
              )}

              {(docs ?? []).length === 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No documents yet.</p>
              ) : (
                <div className="sellers-plan__docs-grid">
                  {(docs ?? []).map(doc => (
                    <div key={doc.id} className="sellers-plan__doc-card">
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="sellers-plan__doc-link">
                        <span className="sellers-plan__doc-icon">{fileIcon(doc.file_type)}</span>
                        <div className="sellers-plan__doc-info">
                          <span className="sellers-plan__doc-name">{doc.name}</span>
                          <span className="sellers-plan__doc-meta">
                            {formatFileSize(doc.file_size)}
                            {doc.category && doc.category !== 'general' && ` · ${doc.category}`}
                            {' · '}{new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </a>
                      <button className="sellers-plan__doc-delete" onClick={() => handleDeleteDoc(doc)} title="Remove">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* ── Price History Timeline ── */}
      {isDbRow && listing.listPriceRaw && (
        <Card style={{ marginTop: 16, padding: 16 }}>
          <PriceHistoryTimeline listingId={listing.id} listPrice={listing.listPriceRaw} />
          {/* Current price summary bar */}
          {listing.currentPriceRaw && Number(listing.currentPriceRaw) < Number(listing.listPriceRaw) && (
            <div className="price-summary-bar">
              <div className="price-summary-bar__item">
                <span className="price-summary-bar__label">Original</span>
                <span className="price-summary-bar__value">${Number(listing.listPriceRaw).toLocaleString()}</span>
              </div>
              <div className="price-summary-bar__arrow">→</div>
              <div className="price-summary-bar__item">
                <span className="price-summary-bar__label">Current</span>
                <span className="price-summary-bar__value price-summary-bar__value--current">${Number(listing.currentPriceRaw).toLocaleString()}</span>
              </div>
              <div className="price-summary-bar__item">
                <span className="price-summary-bar__label">Total Reduction</span>
                <Badge variant="warning" size="sm">
                  -${(Number(listing.listPriceRaw) - Number(listing.currentPriceRaw)).toLocaleString()}
                  {' '}({((1 - Number(listing.currentPriceRaw) / Number(listing.listPriceRaw)) * 100).toFixed(1)}%)
                </Badge>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── Strategy Narrative (reusable for content) ── */}
      {isDbRow && listing.strategy && (
        <Card className="sellers-plan__strategy" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <h3 className="sellers-plan__section-title" style={{ margin: 0 }}>Listing Strategy</h3>
              {listing.strategy_updated_at && (
                <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                  Generated {new Date(listing.strategy_updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(listing.strategy)
                    setCopiedStrategy(true)
                    setTimeout(() => setCopiedStrategy(false), 2000)
                  } catch (e) { console.error(e) }
                }}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                }
              >
                {copiedStrategy ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/content/ai-studio?listing=${listing.id}`)}
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
                    <path d="M22 2L11 13" />
                    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                }
              >
                Send to Content
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowStrategy(v => !v)}>
                {showStrategy ? 'Collapse' : 'Expand'}
              </Button>
            </div>
          </div>
          <div
            className="sellers-plan__strategy-body"
            style={{
              fontSize: '0.82rem',
              lineHeight: 1.6,
              color: 'var(--brown-dark)',
              whiteSpace: 'pre-wrap',
              maxHeight: showStrategy ? 'none' : 200,
              overflow: showStrategy ? 'visible' : 'hidden',
              position: 'relative',
            }}
          >
            {listing.strategy}
            {!showStrategy && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 40,
                background: 'linear-gradient(to bottom, transparent, var(--white))',
                pointerEvents: 'none',
              }} />
            )}
          </div>
        </Card>
      )}

      {/* ── Parties & Vendors (contract co-signers, agents, TC, vendors) ── */}
      {isDbRow && <PartiesSection listingId={listing.id} />}

      {/* ── Deleted Items Drawer ── */}
      {isDbRow && (deletedTasks ?? []).length > 0 && (
        <div className="sellers-plan__deleted" style={{ marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setShowDeleted(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '4px 0',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            </svg>
            {showDeleted ? 'Hide' : 'Show'} deleted items ({(deletedTasks ?? []).length})
          </button>
          {showDeleted && (
            <Card className="sellers-plan__deleted-card" style={{ marginTop: 6, padding: 12, background: 'rgba(0,0,0,0.02)' }}>
              {(deletedTasks ?? []).map(task => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 4px',
                    borderBottom: '1px dashed var(--color-border-light)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', textDecoration: 'line-through', margin: 0 }}>
                      {task.label}
                    </p>
                    <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: 0 }}>
                      {phaseLabels[task.phase]?.label ?? task.phase}
                      {task.deleted_at && ` · deleted ${new Date(task.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button variant="ghost" size="sm" onClick={() => restoreTask(task)}>Restore</Button>
                    <button
                      type="button"
                      onClick={() => purgeTask(task)}
                      title="Permanently delete"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                        borderRadius: 4,
                      }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}


      {/* ── Linked Notes ── */}
      {contactId && (
        <div className="sellers-plan__section">
          <div className="sellers-plan__section-header">
            <h3 className="sellers-plan__section-title">Notes ({(linkedNotes ?? []).length})</h3>
            <Button variant="ghost" size="sm" onClick={async () => { await createAndOpen({ contact_id: contactId }); refetchNotes() }}>+ Add Note</Button>
          </div>
          {(linkedNotes ?? []).length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No notes linked to this listing's seller yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(linkedNotes ?? []).map(n => (
                <div key={n.id} onClick={() => openNote(n)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--cream)', borderRadius: 'var(--radius-md)', cursor: 'pointer', borderLeft: n.color ? `3px solid ${n.color}` : '3px solid var(--brown-mid)' }}>
                  <div>
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{n.title || 'Untitled'}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{(n.body ?? '').slice(0, 80)}{(n.body ?? '').length > 80 ? '...' : ''}</p>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <FavoriteButton type="note" id={n.id} label={n.title || 'Untitled'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Open House History ── */}
      <div className="sellers-plan__section">
        <div className="sellers-plan__section-header">
          <h3 className="sellers-plan__section-title">Open Houses ({listingOHs.length})</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/open-houses')}>
            {listingOHs.length > 0 ? 'View All' : 'Schedule OH'}
          </Button>
        </div>
        {listingOHs.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No open houses linked to this listing yet.</p>
        ) : (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
              {listingOHs.length} open house{listingOHs.length !== 1 ? 's' : ''}, {listingOHs.reduce((sum, oh) => sum + (oh.sign_in_count ?? 0), 0)} total sign-ins
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {listingOHs.map(oh => {
                const isHosted = !!oh.agent_name
                const dateStr = oh.date ? new Date(oh.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'
                const timeStr = oh.start_time ? (oh.end_time ? `${oh.start_time} – ${oh.end_time}` : oh.start_time) : ''
                return (
                  <div key={oh.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--cream)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${isHosted ? '#6366f1' : 'var(--brown-mid)'}` }}>
                    <div>
                      <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                        {dateStr}{timeStr ? ` · ${timeStr}` : ''}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {isHosted ? `Hosted by ${oh.agent_name}` : 'You hosted'}
                        {oh.sign_in_count > 0 && ` · ${oh.sign_in_count} sign-ins`}
                        {oh.leads_count > 0 && ` · ${oh.leads_count} hot leads`}
                      </p>
                    </div>
                    <Badge variant={oh.status === 'completed' ? 'default' : oh.status === 'confirmed' ? 'success' : 'info'} size="sm">{oh.status}</Badge>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      </>}

      {/* ── Modals ── */}
      {showAddTask && (
        <AddTaskModal
          listing={listing}
          onClose={() => setShowAddTask(false)}
          onAdded={refetchTasks}
        />
      )}
      {showAIPlan && (
        <AIPlanModal
          listing={listing}
          allListings={allListings}
          onClose={() => setShowAIPlan(false)}
          onGenerated={refetchTasks}
        />
      )}
      {showPriceReduction && (
        <PriceReductionModal
          listing={listing}
          onClose={() => setShowPriceReduction(false)}
          onSaved={() => { refetchTasks(); onBack() }}
        />
      )}

      {/* Offscreen printable layout — used by both Print and Export PDF. */}
      <PrintablePlan
        ref={printableRef}
        listing={listing}
        tasks={dbTasks}
        hasTasks={hasTasks}
        plan={plan}
        isNew={isNew}
      />
    </div>
  )
}

// ─── Main Sellers Page ────────────────────────────────────────────────────────
export default function Sellers() {
  const { data: dbData, loading, refetch } = useListings()
  const { data: allOHsMain } = useOpenHouses()
  const { data: allTasks } = useAllChecklistTasks()
  const { data: allExpensesData } = useAllExpenses()
  const listings = useMemo(() => (dbData ?? []).map(mapListing), [dbData])

  // Expense totals per listing
  const expenseByListing = useMemo(() => {
    const map = {}
    for (const e of (allExpensesData ?? [])) {
      if (!e.listing_id) continue
      if (!map[e.listing_id]) map[e.listing_id] = 0
      map[e.listing_id] += Number(e.amount || 0)
    }
    return map
  }, [allExpensesData])

  // Build a map of listing_id → next upcoming open house
  const nextOHByListing = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const map = {}
    for (const oh of (allOHsMain ?? [])) {
      if (!oh.listing_id || !oh.date || oh.date < today) continue
      if (!map[oh.listing_id] || oh.date < map[oh.listing_id].date) {
        map[oh.listing_id] = oh
      }
    }
    return map
  }, [allOHsMain])

  // Build a map of listing_id → { total, done } from real checklist_tasks
  const taskProgressByListing = useMemo(() => {
    const map = {}
    for (const t of (allTasks ?? [])) {
      if (!t.listing_id) continue
      if (!map[t.listing_id]) map[t.listing_id] = { total: 0, done: 0 }
      map[t.listing_id].total++
      if (t.completed) map[t.listing_id].done++
    }
    return map
  }, [allTasks])

  const [filter, setFilter]               = useState('all')
  const [selectedListing, setSelectedListing] = useState(null)
  const [panelOpen, setPanelOpen]         = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [error, setError]                 = useState(null)
  const [emailContact, setEmailContact]   = useState(null)
  const [quickExpListing, setQuickExpListing] = useState(null) // listing to add expense to
  const [quickExpDraft, setQuickExpDraft] = useState({ date: '', vendor: '', description: '', amount: '' })
  const [quickExpSaving, setQuickExpSaving] = useState(false)

  const openCreate = () => { setEditingListing(null); setPanelOpen(true) }
  const openEdit   = (l) => { setEditingListing(l); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditingListing(null); setError(null) }

  const handleSave = async (draft) => {
    setSaving(true)
    setError(null)
    try {
      const property_id = await DB.ensureProperty({ address: draft.address, city: draft.city, zip: draft.zip, mls_id: draft.mls_id || null, price: draft.listPrice || null })

      // Update property with full details
      const propertyDetails = {}
      if (draft.bedrooms)       propertyDetails.bedrooms = Number(draft.bedrooms)
      if (draft.bathrooms)      propertyDetails.bathrooms = Number(draft.bathrooms)
      if (draft.sqft)           propertyDetails.sqft = Number(draft.sqft)
      if (draft.property_type)  propertyDetails.property_type = draft.property_type
      if (draft.year_built)     propertyDetails.year_built = Number(draft.year_built)
      if (draft.lot_sqft)       propertyDetails.lot_sqft = Number(draft.lot_sqft)
      if (draft.lot_acres)      propertyDetails.lot_acres = Number(draft.lot_acres)
      if (draft.garage_spaces !== '') propertyDetails.garage_spaces = Number(draft.garage_spaces)
      if (draft.stories)        propertyDetails.stories = Number(draft.stories)
      propertyDetails.pool = draft.pool
      propertyDetails.spa = draft.spa
      if (draft.hoa_monthly)    propertyDetails.hoa_monthly = Number(draft.hoa_monthly)
      if (draft.mls_id)         propertyDetails.mls_id = draft.mls_id
      if (draft.subdivision)    propertyDetails.subdivision = draft.subdivision
      if (draft.school_district) propertyDetails.school_district = draft.school_district
      if (draft.elementary_school) propertyDetails.elementary_school = draft.elementary_school
      if (draft.middle_school)  propertyDetails.middle_school = draft.middle_school
      if (draft.high_school)    propertyDetails.high_school = draft.high_school
      if (draft.construction)   propertyDetails.construction = draft.construction
      if (draft.roof_type)      propertyDetails.roof_type = draft.roof_type
      if (draft.cooling)        propertyDetails.cooling = draft.cooling
      if (draft.heating)        propertyDetails.heating = draft.heating
      if (draft.flooring)       propertyDetails.flooring = draft.flooring
      if (draft.parking)        propertyDetails.parking = draft.parking
      if (draft.landscaping)    propertyDetails.landscaping = draft.landscaping
      if (draft.features?.length) propertyDetails.features = draft.features
      if (draft.tax_amount)     propertyDetails.tax_amount = Number(draft.tax_amount)
      if (draft.tax_year)       propertyDetails.tax_year = Number(draft.tax_year)
      if (draft.apn)            propertyDetails.apn = draft.apn
      if (draft.description)    propertyDetails.description = draft.description
      if (draft.marketing_remarks) propertyDetails.marketing_remarks = draft.marketing_remarks
      if (draft.agent_notes)    propertyDetails.agent_notes = draft.agent_notes
      if (draft.virtual_tour_url) propertyDetails.virtual_tour_url = draft.virtual_tour_url
      if (draft.listPrice)      propertyDetails.price = Number(draft.listPrice)
      if (draft.city)           propertyDetails.city = draft.city
      if (draft.zip)            propertyDetails.zip = draft.zip

      if (Object.keys(propertyDetails).length > 0) {
        await DB.updateProperty(property_id, propertyDetails)
      }

      // Find or create seller contact
      let contact_id = editingListing?.contact_id ?? null
      if (draft.seller_name.trim() && !contact_id) {
        const contact = await DB.createContact({
          name: draft.seller_name.trim(),
          phone: draft.seller_phone.trim() || null,
          email: draft.seller_email.trim() || null,
          type: 'seller',
          source: draft.seller_lead_source || null,
        })
        contact_id = contact.id
      } else if (contact_id && draft.seller_lead_source) {
        // Update existing seller contact's lead source if changed
        await DB.updateContact(contact_id, { source: draft.seller_lead_source })
      }

      const dbRow = {
        property_id,
        contact_id,
        type:        draft.type,
        status:      draft.status,
        source:      draft.source,
        list_price:  draft.listPrice ? Number(draft.listPrice) : null,
        current_price: draft.currentPrice ? Number(draft.currentPrice) : (draft.listPrice ? Number(draft.listPrice) : null),
        close_price: draft.closePrice ? Number(draft.closePrice) : null,
        list_date:   draft.listDate || null,
        dom:         draft.dom ? Number(draft.dom) : null,
        offers_count: draft.offers ? Number(draft.offers) : 0,
        notes:       draft.notes.trim() || null,
        // Seller tracking
        cash_offer_requested:     draft.cash_offer_status !== 'none',
        cash_offer_status:        draft.cash_offer_status,
        showing_access:           draft.showing_access,
        staging:                  draft.staging,
        photography_status:       draft.photography_status,
        seller_motivation:        draft.seller_motivation,
        concessions:              draft.concessions,
        property_condition:       draft.property_condition,
        commission_rate:          draft.commission_rate ? Number(draft.commission_rate) : null,
        listing_agreement_signed: draft.listing_agreement_signed,
        agreement_signed_date:    draft.agreement_signed_date || null,
        agreement_expires_date:   draft.agreement_expires_date || null,
        pre_inspection_done:      draft.pre_inspection_done,
        home_warranty_offered:    draft.home_warranty_offered,
        related_people:           cleanRelatedPeople(draft.related_people),
      }

      let savedListingId = null
      let shouldTriggerMarketing = false

      if (editingListing && typeof editingListing.id === 'string') {
        const prevStatus = editingListing.status
        const wasActive = prevStatus === 'active'
        await DB.updateListing(editingListing.id, dbRow)
        await DB.logActivity('listing_updated', `Updated listing: ${draft.address}`, { propertyId: property_id })
        savedListingId = editingListing.id
        // Trigger marketing pipeline if newly went active
        if (!wasActive && draft.status === 'active') shouldTriggerMarketing = true
        // Notify on status change (e.g. coming_soon → active, active → pending, pending → closed)
        if (prevStatus && prevStatus !== draft.status) {
          const pretty = s => (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          emitNotification({
            type: 'phase_change',
            title: `${draft.address}: ${pretty(prevStatus)} → ${pretty(draft.status)}`,
            body: `Listing status changed.${draft.list_price ? ' List price: $' + Number(draft.listPrice || 0).toLocaleString() : ''}`,
            link: '/pipeline/board',
            source_table: 'listings',
            source_id: editingListing.id,
            metadata: { from: prevStatus, to: draft.status, address: draft.address },
          }).catch(err => console.error('notification emit failed', err))
        }
      } else {
        const newListing = await DB.createListing(dbRow)
        const customKey = draft.type === 'new' ? 'custom_launch_tasks' : 'custom_relaunch_tasks'
        const customItems = JSON.parse(localStorage.getItem(customKey) || '[]')
        const plan = [...(draft.type === 'new' ? launchChecklist : relaunchChecklist), ...customItems]
        const taskRows = plan.map((step, i) => ({
          listing_id: newListing.id,
          phase:      step.phase,
          label:      step.label,
          sort_order: i,
          completed:  false,
        }))
        await DB.bulkCreateTasks(taskRows)
        await DB.logActivity('listing_created', `New listing added: ${draft.address}`, { propertyId: property_id })
        savedListingId = newListing.id

        // Emit content-plan reminder notification (snoozeable, deduped).
        // Fires for EVERY new listing so it nags until you run the plan.
        emitListingContentReminder({
          listingId: newListing.id,
          address: draft.address,
          clientName: draft.seller_name?.trim() || '',
        }).catch(e => console.error('Failed to emit listing content reminder:', e))

        // Auto-create Slack channel for new listing
        DB.ensureSlackChannel({
          contactId: draft.contact_id,
          contactType: 'seller',
          listingId: newListing.id,
          propertyAddress: draft.address,
        }).catch(e => console.warn('Slack channel creation skipped:', e))

        // Trigger marketing pipeline if created as active
        if (draft.status === 'active') shouldTriggerMarketing = true
      }

      // Auto-trigger marketing pipeline (listing plan + 21-day content calendar)
      if (shouldTriggerMarketing && savedListingId) {
        // Fire-and-forget — don't block the UI
        DB.triggerListingMarketing({
          listingId: savedListingId,
          property: {
            address: draft.address,
            city: draft.city,
            zip: draft.zip,
            beds: draft.bedrooms ? Number(draft.bedrooms) : null,
            baths: draft.bathrooms ? Number(draft.bathrooms) : null,
            sqft: draft.sqft ? Number(draft.sqft) : null,
            year_built: draft.year_built ? Number(draft.year_built) : null,
            pool: draft.pool,
            subdivision: draft.subdivision,
            price: draft.listPrice ? Number(draft.listPrice) : null,
            notes: draft.marketing_remarks || draft.description,
          },
          clientName: draft.seller_name?.trim() || 'Client',
        }).then(({ contentSlotsCount }) => {
          DB.logActivity('marketing_pipeline_triggered',
            `Marketing pipeline started for ${draft.address} — ${contentSlotsCount} content slots created`,
            { propertyId: property_id })
        }).catch((e) => {
          console.error('Marketing pipeline failed:', e)
        })
      }

      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingListing || typeof editingListing.id !== 'string') return
    if (!confirm(`Remove listing at ${editingListing.address}?`)) return
    setDeleting(true)
    try {
      await DB.logActivity('listing_deleted', `Removed listing: ${editingListing.address}`)
      await DB.deleteListing(editingListing.id)
      await refetch()
      closePanel()
      if (selectedListing?.id === editingListing.id) setSelectedListing(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  // ─── Put seller on Hold ──
  const [onHoldModal, setOnHoldModal] = useState(false)
  const [onHoldReason, setOnHoldReason] = useState('')
  const handlePutOnHold = () => {
    if (!editingListing?.contact_id) return
    setOnHoldReason('')
    setOnHoldModal(true)
  }
  const confirmPutOnHold = async () => {
    try {
      await DB.putContactOnHold(editingListing.contact_id, onHoldReason.trim())
      await DB.logActivity('contact_on_hold', `Put seller on hold: ${editingListing.seller_name || editingListing.address}`, { contactId: editingListing.contact_id })
      await refetch()
      setOnHoldModal(false)
      closePanel()
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading && !listings.length) return <div className="page-loading">Loading listings…</div>

  if (selectedListing) {
    const listing = listings.find(l => l.id === selectedListing.id) ?? selectedListing
    return (
      <>
        <PlanView
          listing={listing}
          allListings={listings}
          onBack={() => setSelectedListing(null)}
          onEdit={() => openEdit(listing)}
        />
        <SlidePanel open={panelOpen} onClose={closePanel} title={editingListing ? 'Edit Listing' : 'Add Listing'} subtitle={editingListing?.address} width={460}>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
          <ListingForm key={editingListing?.id || 'new'} listing={editingListing} onSave={handleSave} onDelete={handleDelete} onPutOnHold={handlePutOnHold} onClose={closePanel} saving={saving} deleting={deleting} />
        </SlidePanel>
      </>
    )
  }

  // Expiring-soon alerts (within 14 days or already expired)
  const expiringListings = listings.filter(l => {
    if (!l.agreement_expires_date) return false
    const agr = getAgreementStatus(l.agreement_expires_date)
    return agr && agr.days <= 14
  })

  // Listings page is now "Signed Listings only" — unsigned leads live on the
  // Sellers page (People > Sellers > Sellers). A listing counts as "signed" if
  // listing_agreement_signed is true OR if the status has advanced past 'lead'.
  const signedListings = listings.filter(l =>
    l.listing_agreement_signed === true || (l.status && l.status !== 'lead')
  )

  const filtered = signedListings.filter(l => {
    if (filter === 'all') return true
    if (filter === 'new' || filter === 'expired') return l.type === filter
    return l.status === filter
  })
  const counts = {
    all:     signedListings.length,
    active:  signedListings.filter(l => l.status === 'active').length,
    pending: signedListings.filter(l => l.status === 'pending').length,
    closed:  signedListings.filter(l => l.status === 'closed').length,
    new:     signedListings.filter(l => l.type === 'new').length,
    expired: signedListings.filter(l => l.type === 'expired').length,
  }

  const columns = [
    {
      key: 'address', label: 'Property',
      render: (v, row) => (
        <div>
          <AddressLink address={v} city={row.city} className="lead-address">{v}</AddressLink>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.city}, AZ {row.zip}</p>
        </div>
      ),
    },
    {
      key: 'contact_name', label: 'Client',
      render: (v, row) => (
        v
          ? (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--brown-dark)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</p>
              {row.contact_phone && (
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', margin: 0 }}>{row.contact_phone}</p>
              )}
            </div>
          )
          : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
      ),
    },
    { key: 'listPrice', label: 'Price', render: (v, row) => {
      const hasReduction = row.currentPriceRaw && Number(row.currentPriceRaw) < Number(row.listPriceRaw)
      if (!hasReduction) return v
      return (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.currentPrice}</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>{v}</p>
        </div>
      )
    }},
    { key: 'type', label: 'Type', render: v => <Badge variant={v === 'new' ? 'success' : 'warning'} size="sm">{v === 'new' ? 'New' : 'Expired'}</Badge> },
    { key: 'dom', label: 'DOM', render: (v, row) => {
      const days = Number(v) || 0
      const isActive = row.status === 'active' || row.status === 'coming_soon'
      const variant = isActive && days > 60 ? 'danger' : isActive && days > 30 ? 'warning' : 'default'
      return <Badge variant={variant} size="sm">{days}d</Badge>
    }},
    { key: 'offers', label: 'Offers', render: v => v > 0 ? <Badge variant="success" size="sm">{v}</Badge> : '—' },
    {
      key: 'nextOH', label: 'Next OH',
      render: (_, row) => {
        const oh = nextOHByListing[row.id]
        if (!oh) return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
        const d = new Date(oh.date + 'T12:00:00')
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        const timeStr = oh.start_time ? oh.start_time.slice(0, 5) : ''
        const daysOut = Math.ceil((d - new Date()) / 86400000)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: daysOut <= 3 ? 'var(--color-danger)' : 'var(--brown-dark)' }}>{dateStr}</span>
            {timeStr && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{timeStr}</span>}
          </div>
        )
      },
    },
    {
      key: 'status', label: 'MLS Status',
      render: (v, row) => (
        <InlineStatusPicker
          value={v}
          variant={statusVariant[v]}
          onChange={async next => {
            if (!next || next === v) return
            try {
              await DB.updateListing(row.id, { status: next })
              // Ensure Slack channel when listing is signed or goes active
              if (['signed', 'active', 'coming_soon'].includes(next)) {
                DB.ensureSlackChannel({
                  contactId: row.contact_id,
                  contactType: 'seller',
                  listingId: row.id,
                  propertyAddress: row.address || row.property_address,
                }).catch(() => {})
              }
              refetch()
            } catch (err) {
              console.error('Failed to update listing status:', err)
              alert('Could not update status: ' + (err?.message || err))
            }
          }}
        />
      ),
    },
    {
      key: 'agreement_expires_date', label: 'Agreement',
      render: (v, row) => {
        if (!row.listing_agreement_signed && !row.agreement_signed_date) {
          return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>Not signed</span>
        }
        const agr = v ? getAgreementStatus(v) : null
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {row.agreement_signed_date && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                Signed {new Date(row.agreement_signed_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {agr ? (
              <Badge variant={agr.variant} size="sm">{agr.label}</Badge>
            ) : row.listing_agreement_signed ? (
              <Badge variant="success" size="sm">Signed</Badge>
            ) : null}
          </div>
        )
      },
    },
    {
      key: 'cash_offer_status', label: 'Cash Offer',
      render: v => v && v !== 'none'
        ? <Badge variant={cashOfferVariant[v]} size="sm">{CASH_OFFER_STATUSES.find(o => o.value === v)?.label ?? v}</Badge>
        : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>,
    },
    {
      key: 'expenses', label: 'Spend',
      render: (_, row) => {
        const total = expenseByListing[row.id]
        if (!total) return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
        return <span style={{ fontWeight: 600, fontSize: '0.82rem', fontVariantNumeric: 'tabular-nums' }}>${Number(total).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
      },
    },
    {
      key: 'roi', label: 'Est. ROI',
      render: (_, row) => {
        const price = Number(row.currentPriceRaw || row.listPriceRaw || 0)
        const rate = Number(row.commission_rate || 3)
        const commission = price * (rate / 100)
        const spend = expenseByListing[row.id] || 0
        if (!price) return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
        const net = commission - spend
        return (
          <div style={{ fontSize: '0.78rem', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ fontWeight: 600, color: net >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              ${Math.round(net).toLocaleString()}
            </span>
            <br /><span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{rate}% of ${(price/1000).toFixed(0)}K</span>
          </div>
        )
      },
    },
    {
      key: 'checklist', label: 'Plan Progress',
      render: (_, row) => {
        const progress = taskProgressByListing[row.id]
        if (!progress || progress.total === 0) {
          return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>No tasks</span>
        }
        const pct = Math.round((progress.done / progress.total) * 100)
        return (
          <div className="sellers-progress-cell">
            <div className="sellers-progress-bar">
              <div className="sellers-progress-bar__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="sellers-progress-cell__pct">{progress.done}/{progress.total}</span>
          </div>
        )
      },
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Button size="sm" variant="ghost" title="Add expense" onClick={e => { e.stopPropagation(); setQuickExpListing(row); setQuickExpDraft({ date: new Date().toISOString().split('T')[0], vendor: '', description: '', amount: '' }) }}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
          />
          {row.seller_email && (
            <Button size="sm" variant="ghost" title="Send email" onClick={e => { e.stopPropagation(); setEmailContact({ id: row.contact_id, name: row.contact_name, email: row.seller_email }) }}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            />
          )}
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setSelectedListing(row) }}>
            {row.type === 'new' ? 'Launch Plan' : 'Relaunch Plan'}
          </Button>
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row) }}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
          >Edit</Button>
        </div>
      ),
    },
  ]

  return (
    <div className="sellers">
      <SectionHeader
        title="Sellers"
        subtitle={(() => {
          const totalValue = signedListings.reduce((s, l) => s + Number(l.listPriceRaw || l.currentPriceRaw || 0), 0)
          const totalSpend = Object.values(expenseByListing).reduce((s, v) => s + v, 0)
          const totalCommission = signedListings.reduce((s, l) => {
            const price = Number(l.currentPriceRaw || l.listPriceRaw || 0)
            const rate = Number(l.commission_rate || 3)
            return s + (price * rate / 100)
          }, 0)
          const netROI = totalCommission - totalSpend
          return `${signedListings.length} listing${signedListings.length !== 1 ? 's' : ''} · $${Math.round(totalValue / 1000).toLocaleString()}K value · $${Math.round(totalSpend).toLocaleString()} spent · $${Math.round(netROI).toLocaleString()} est. net`
        })()}
        actions={
          <Button variant="primary" size="md" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          >Add Listing</Button>
        }
      />

      <TabBar
        tabs={[
          { label: 'All',      value: 'all',     count: counts.all },
          { label: 'Active',   value: 'active',  count: counts.active },
          { label: 'Pending',  value: 'pending', count: counts.pending },
          { label: 'Closed',   value: 'closed',  count: counts.closed },
          { label: 'Expired',  value: 'expired', count: counts.expired },
        ]}
        active={filter}
        onChange={setFilter}
      />

      {expiringListings.length > 0 && (
        <div className="sellers-expiry-alerts">
          <div className="sellers-expiry-alerts__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <strong>Agreement Alerts</strong>
            {expiringListings.map(l => {
              const agr = getAgreementStatus(l.agreement_expires_date)
              return (
                <div key={l.id} className="sellers-expiry-alerts__item">
                  <span>{l.address}</span>
                  <Badge variant={agr.variant} size="sm">{agr.days < 0 ? 'Agreement expired' : agr.label}</Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <DataTable columns={columns} rows={filtered} onRowClick={setSelectedListing} />

      <SlidePanel open={panelOpen} onClose={closePanel} title={editingListing ? 'Edit Listing' : 'Add Listing'} subtitle={editingListing?.address} width={460}>
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
        <ListingForm key={editingListing?.id || 'new'} listing={editingListing} onSave={handleSave} onDelete={handleDelete} onPutOnHold={handlePutOnHold} onClose={closePanel} saving={saving} deleting={deleting} />
      </SlidePanel>

      <SendEmailModal open={!!emailContact} onClose={() => setEmailContact(null)} contact={emailContact || {}} contactType="seller" />

      {/* Quick Add Expense Modal */}
      {quickExpListing && (
        <div className="on-hold-modal__overlay" onClick={() => setQuickExpListing(null)}>
          <div className="on-hold-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 style={{ margin: '0 0 4px' }}>Add Expense</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>{quickExpListing.address} — {quickExpListing.contact_name}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <label style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>Date</span>
                <input type="date" value={quickExpDraft.date} onChange={e => setQuickExpDraft(d => ({ ...d, date: e.target.value }))} style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
              </label>
              <label style={{ flex: 1 }}>
                <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>Amount ($)</span>
                <input type="number" step="0.01" value={quickExpDraft.amount} onChange={e => setQuickExpDraft(d => ({ ...d, amount: e.target.value }))} placeholder="0.00" style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
              </label>
            </div>
            <label style={{ display: 'block', marginBottom: 8 }}>
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>Vendor</span>
              <input value={quickExpDraft.vendor} onChange={e => setQuickExpDraft(d => ({ ...d, vendor: e.target.value }))} placeholder="e.g. AZ Sign Pro" style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
            </label>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, marginBottom: 2 }}>Description</span>
              <input value={quickExpDraft.description} onChange={e => setQuickExpDraft(d => ({ ...d, description: e.target.value }))} placeholder="Sign post, photography, etc." style={{ width: '100%', padding: '7px 8px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button size="sm" disabled={quickExpSaving || !quickExpDraft.amount} onClick={async () => {
                setQuickExpSaving(true)
                try {
                  await DB.createExpense({
                    date: quickExpDraft.date,
                    vendor: quickExpDraft.vendor || null,
                    description: quickExpDraft.description || null,
                    amount: Number(quickExpDraft.amount),
                    listing_id: quickExpListing.id,
                    contact_id: quickExpListing.contact_id || null,
                    is_deductible: true,
                    is_split: false,
                  })
                  setQuickExpListing(null)
                  refetch()
                } catch (e) { alert(e.message) }
                finally { setQuickExpSaving(false) }
              }}>
                {quickExpSaving ? 'Saving...' : 'Add Expense'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setQuickExpListing(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* On-Hold Reason Modal */}
      {onHoldModal && (
        <div className="on-hold-modal__overlay" onClick={() => setOnHoldModal(false)}>
          <div className="on-hold-modal" onClick={e => e.stopPropagation()}>
            <h3>Put Seller on Hold</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              {editingListing?.seller_name || editingListing?.address}
            </p>
            <div className="on-hold-modal__field">
              <label>Reason (optional)</label>
              <textarea
                value={onHoldReason}
                onChange={e => setOnHoldReason(e.target.value)}
                placeholder="e.g. Market conditions, personal reasons, repairs needed..."
                autoFocus
              />
            </div>
            <div className="on-hold-modal__actions">
              <Button variant="ghost" size="sm" onClick={() => setOnHoldModal(false)}>Cancel</Button>
              <Button variant="warning" size="sm" onClick={confirmPutOnHold}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

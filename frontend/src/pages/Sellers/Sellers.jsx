import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, SectionHeader, TabBar, DataTable, Card, CheckItem, SlidePanel, Input, Select, Textarea, AddressLink } from '../../components/ui/index.jsx'
import { TagPicker } from '../../components/ui/TagPicker.jsx'
import { useListings, useTasksForListing, useDeletedTasksForListing, useContactTags, useNotesForContact, useDocumentsForListing } from '../../lib/hooks.js'
import { useNotesContext } from '../../lib/NotesContext.jsx'
import FavoriteButton from '../../components/layout/FavoriteButton.jsx'
import * as DB from '../../lib/supabase.js'
import { emit as emitNotification, emitListingContentReminder } from '../../lib/notifications.js'
import './Sellers.css'

// ─── Checklist definitions ────────────────────────────────────────────────────
const launchChecklist = [
  { label: 'Professional photography scheduled',           phase: 'prep' },
  { label: 'Pre-listing walkthrough complete',             phase: 'prep' },
  { label: 'Comparable market analysis delivered',         phase: 'prep' },
  { label: 'Listing agreement signed',                     phase: 'prep' },
  { label: 'Disclosure package prepared',                  phase: 'prep' },
  { label: 'Coming Soon status activated in MLS',          phase: 'mls' },
  { label: 'Yard sign & lockbox installed',                phase: 'mls' },
  { label: 'Listing goes Active in MLS',                   phase: 'mls' },
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
  prep:     { label: 'Preparation', color: '#5a87b4' },
  mls:      { label: 'MLS',         color: '#6a9e72' },
  marketing:{ label: 'Marketing',   color: '#b79782' },
  analysis: { label: 'Analysis',    color: '#5a87b4' },
  refresh:  { label: 'Refresh',     color: '#c99a2e' },
  relaunch: { label: 'Relaunch',    color: '#6a9e72' },
}

const STATUS_OPTIONS = ['lead', 'active', 'pending', 'closed', 'expired', 'relaunching']
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
  lead: 'default', active: 'success', relaunching: 'warning', expired: 'danger', pending: 'info', closed: 'default',
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
function ListingForm({ listing, onSave, onDelete, onClose, saving, deleting }) {
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
    listDate:     listing?.listDate      ?? '',
    type:         listing?.type          ?? 'new',
    status:       listing?.status        ?? 'lead',
    source:       listing?.source        ?? (listing?.type === 'expired' ? 'my_expired' : 'new'),
    dom:          listing?.dom           ?? '',
    offers:       listing?.offers        ?? '',
    seller_name:  listing?.contact_name  ?? '',
    seller_email: listing?.contact_email ?? '',
    seller_phone: listing?.contact_phone ?? '',
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
          <Select label="Type" value={draft.type} onChange={e => set('type', e.target.value)}>
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t === 'new' ? 'New Listing' : 'Expired'}</option>)}
          </Select>
          <Select label="Status" value={draft.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'lead' ? 'Lead (Not Signed)' : s}</option>)}
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

// ─── AI Plan Generator Modal ─────────────────────────────────────────────────
const DEFAULT_LAUNCH_TEMPLATE = `Generate a complete launch plan for this listing:

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

Create a step-by-step checklist organized by phase.
Phases: "prep" (listing preparation), "mls" (MLS & syndication), "marketing" (promotion & outreach)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable, specific tasks. Include 12-18 items total.`

const DEFAULT_RELAUNCH_TEMPLATE = `Generate a complete relaunch plan for this expired/stale listing:

Client: {clientName}
Property: {address}
City/Zip: {city}, AZ {zip}
Price: {price}
DOM: {dom}
Status: {status}

This listing needs a fresh strategy. Create a step-by-step checklist organized by phase.
Phases: "analysis" (market review & strategy), "refresh" (property improvements), "relaunch" (re-activation & promotion)

For each item, return JSON: [{"label": "...", "phase": "..."}]
Focus on actionable, specific tasks. Include 12-18 items total.`

const TEMPLATE_STORAGE_KEY_LAUNCH   = 'ai_plan_template_launch'
const TEMPLATE_STORAGE_KEY_RELAUNCH = 'ai_plan_template_relaunch'

function getSavedTemplate(type) {
  const key = type === 'new' ? TEMPLATE_STORAGE_KEY_LAUNCH : TEMPLATE_STORAGE_KEY_RELAUNCH
  const saved = localStorage.getItem(key)
  return saved || (type === 'new' ? DEFAULT_LAUNCH_TEMPLATE : DEFAULT_RELAUNCH_TEMPLATE)
}

function saveTemplate(type, template) {
  const key = type === 'new' ? TEMPLATE_STORAGE_KEY_LAUNCH : TEMPLATE_STORAGE_KEY_RELAUNCH
  localStorage.setItem(key, template)
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

  // Template editing
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [template, setTemplate] = useState(getSavedTemplate(listing.type))
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

  const handleSaveTemplate = () => {
    saveTemplate(listing.type, templateDraft)
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
      const existing = await DB.getTasksForListing(selectedListing.id)
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
            <h3>Edit {isNew ? 'Launch' : 'Relaunch'} Prompt Template</h3>
            <button className="plan-modal__close" onClick={() => setEditingTemplate(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="plan-modal__body">
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>
              This template is used for all future <strong>{isNew ? 'launch' : 'relaunch'}</strong> plan generations. Use these variables and they will auto-fill:
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
              {isNew ? 'Launch' : 'Relaunch'} Prompt
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
function PlanView({ listing, allListings, onBack, onEdit }) {
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

  // Documents
  const { data: docs, refetch: refetchDocs } = useDocumentsForListing(isDbRow ? listing.id : null)
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  // Modals
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAIPlan, setShowAIPlan] = useState(false)
  const [showDeleted, setShowDeleted] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [copiedStrategy, setCopiedStrategy] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
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
    // Bring the node onscreen briefly so html2canvas can measure it.
    // It stays visually hidden by z-index / containment inside the offscreen
    // wrapper but becomes a real laid-out element with computed dimensions.
    const prev = {
      left: node.style.left,
      top: node.style.top,
      visibility: node.style.visibility,
    }
    node.style.left = '0'
    node.style.top = '0'
    node.style.visibility = 'hidden'
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
      node.style.left = prev.left
      node.style.top = prev.top
      node.style.visibility = prev.visibility
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
    try {
      for (const file of files) {
        await DB.uploadListingDocument(file, listing.id)
      }
      await DB.logActivity('document_uploaded', `Uploaded ${files.length} document(s) to ${listing.address}`)
      refetchDocs()
    } catch (err) {
      console.error('Upload failed:', err)
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
          <Button variant="ghost" size="sm" onClick={handlePrint}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>}
          >Print</Button>
          <Button variant="ghost" size="sm" onClick={handleExportPdf} disabled={exportingPdf}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>}
          >{exportingPdf ? 'Generating…' : 'Export PDF'}</Button>
        </div>
      )}

      <div className="sellers-plan__phases">
        {displayPhases.map(phase => {
          const phaseItems = hasTasks
            ? dbTasks.map((t, i) => ({ ...t, i })).filter(t => t.phase === phase)
            : plan.map((step, i) => ({ ...step, i })).filter(s => s.phase === phase)
          const phaseCompleted = phaseItems.filter(s => !!checks[s.i]).length
          const meta = phaseLabels[phase] ?? { label: phase, color: '#888' }
          return (
            <Card key={phase} className="sellers-plan__phase-card">
              <div className="sellers-plan__phase-header">
                <div className="sellers-plan__phase-dot" style={{ background: meta.color }} />
                <h3 className="sellers-plan__phase-name">{meta.label}</h3>
                <span className="sellers-plan__phase-count">{phaseCompleted}/{phaseItems.length}</span>
              </div>
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
            </Card>
          )
        })}
      </div>

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

      {/* ── Documents ── */}
      {isDbRow && (
        <div className="sellers-plan__section">
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
              >{uploading ? 'Uploading…' : 'Attach File'}</Button>
            </div>
          </div>

          {(docs ?? []).length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No documents attached yet. Upload disclosures, contracts, photos, or any listing files.</p>
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
  const listings = useMemo(() => (dbData ?? []).map(mapListing), [dbData])

  const [filter, setFilter]               = useState('all')
  const [selectedListing, setSelectedListing] = useState(null)
  const [panelOpen, setPanelOpen]         = useState(false)
  const [editingListing, setEditingListing] = useState(null)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [error, setError]                 = useState(null)

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
        })
        contact_id = contact.id
      }

      const dbRow = {
        property_id,
        contact_id,
        type:        draft.type,
        status:      draft.status,
        source:      draft.source,
        list_price:  draft.listPrice ? Number(draft.listPrice) : null,
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
          <ListingForm listing={editingListing} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
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

  const filtered = listings.filter(l => {
    if (filter === 'all') return true
    if (filter === 'lead') return l.status === 'lead'
    if (filter === 'new' || filter === 'expired') return l.type === filter
    return l.status === filter
  })
  const counts = {
    all:     listings.length,
    lead:    listings.filter(l => l.status === 'lead').length,
    new:     listings.filter(l => l.type === 'new').length,
    expired: listings.filter(l => l.type === 'expired').length,
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
    { key: 'listPrice', label: 'List Price' },
    { key: 'type', label: 'Type', render: v => <Badge variant={v === 'new' ? 'success' : 'warning'} size="sm">{v === 'new' ? 'New' : 'Expired'}</Badge> },
    { key: 'dom', label: 'DOM', render: v => `${v}d` },
    { key: 'offers', label: 'Offers', render: v => v > 0 ? <Badge variant="success" size="sm">{v}</Badge> : '—' },
    { key: 'status', label: 'Status', render: v => <Badge variant={statusVariant[v]}>{v === 'lead' ? 'Lead' : v}</Badge> },
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
      key: 'checklist', label: 'Plan Progress',
      render: (v, row) => {
        const plan = row.type === 'new' ? launchChecklist : relaunchChecklist
        const checks = v ?? {}
        const done = Object.values(checks).filter(Boolean).length
        const pct = Math.round((done / plan.length) * 100)
        return (
          <div className="sellers-progress-cell">
            <div className="sellers-progress-bar">
              <div className="sellers-progress-bar__fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="sellers-progress-cell__pct">{pct}%</span>
          </div>
        )
      },
    },
    {
      key: 'actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
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
        subtitle="Seller leads, listings, and expired property workflow tracking"
        actions={
          <Button variant="primary" size="md" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          >Add Listing</Button>
        }
      />

      <TabBar
        tabs={[
          { label: 'All', value: 'all', count: counts.all },
          { label: 'Leads', value: 'lead', count: counts.lead },
          { label: 'New', value: 'new', count: counts.new },
          { label: 'Expired', value: 'expired', count: counts.expired },
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
        <ListingForm listing={editingListing} onSave={handleSave} onDelete={handleDelete} onClose={closePanel} saving={saving} deleting={deleting} />
      </SlidePanel>
    </div>
  )
}

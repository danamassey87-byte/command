import { useState, useRef, useEffect } from 'react'
import { Button, Badge, SectionHeader, Card, Input, Select, Textarea } from '../../components/ui/index.jsx'
import { BrandColorPicker, BorderRadiusControl, FontPicker } from '../../components/ui/StyleControls'
import RelatedPeopleSection from '../../components/related-people/RelatedPeopleSection.jsx'
import {
  publishForm as publishFormToSupabase,
  unpublishForm as unpublishFormFromSupabase,
  buildSlug,
  publicFormUrl,
  fetchAllSubmissions,
} from '../../lib/publicForms'
import './IntakeForms.css'

// ─── Storage ───
const STORAGE_KEY = 'intake_forms'
const RESPONSES_KEY = 'intake_responses'

function loadForms() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveForms(forms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(forms))
    return true
  } catch (err) {
    // QuotaExceededError — usually triggered by large uploaded logos as data URLs
    const isQuota = err?.name === 'QuotaExceededError' || err?.code === 22
    alert(
      isQuota
        ? 'Storage full — your uploaded logo may be too large. Try a smaller image (under 500 KB), or use a REAL preset instead.'
        : `Could not save form: ${err?.message || 'unknown error'}`
    )
    return false
  }
}
function loadResponses() {
  try { return JSON.parse(localStorage.getItem(RESPONSES_KEY)) || [] } catch { return [] }
}
function saveResponses(r) { localStorage.setItem(RESPONSES_KEY, JSON.stringify(r)) }

// ─── Brand colors ───
const BRAND = {
  dark: '#3A2A1E',
  mid: '#b79782',
  cream: '#efede8',
  white: '#ffffff',
}

// ─── Default field libraries ───

/* ── Get In Touch (lead capture) ── */
const CONTACT_FIELDS = [
  { id: 'full_name',        label: 'Full Name',                                     type: 'text',     section: 'Contact',    required: false, enabled: true },
  { id: 'email',            label: 'Email Address',                                  type: 'email',    section: 'Contact',    required: true,  enabled: true },
  { id: 'phone',            label: 'Phone Number',                                   type: 'tel',      section: 'Contact',    required: true,  enabled: true },
  { id: 'related_people',   label: 'Anyone else joining you on this transaction? (spouse, co-buyer, parent, trustee, etc.)', type: 'related_people', section: 'About You', required: false, enabled: true },
  { id: 'buy_or_sell',      label: 'Are you thinking of Buying or Selling?',         type: 'radio',    section: 'About You',  required: false, enabled: true, options: ['Buyer', 'Seller'] },
  { id: 'timeline',         label: 'How soon will you be ready to begin?',           type: 'radio',    section: 'About You',  required: false, enabled: true, options: ['Ready', '60-90 Days', '3-6 Months', '6 Months-1 Year', 'Not ready > 1 Year'] },
  { id: 'has_agent',        label: 'Are you working with an Agent?',                 type: 'radio',    section: 'About You',  required: false, enabled: true, options: ['Yes', 'No'] },
  { id: 'how_heard',        label: 'How did you hear about us?',                     type: 'radio',    section: 'About You',  required: false, enabled: true, options: ['Past client referral', 'Past client', 'Open House', 'Website', 'Flyer/Mailer', 'Instagram', 'Other'] },
  { id: 'social_handles',   label: 'What are your social media handles?',            type: 'text',     section: 'Additional', required: false, enabled: true },
  { id: 'additional',       label: 'Is there anything else you\'d like to share?',   type: 'textarea', section: 'Additional', required: false, enabled: true },
]

/* ── Seller / Listing Intake ── */
const SELLER_FIELDS = [
  // Contact & Communication
  { id: 'related_people',   label: 'Other parties on the transaction (spouse, co-seller, trustee, attorney, etc.)', type: 'related_people', section: 'Contact & Communication', required: false, enabled: true },
  { id: 'ten_experience',   label: 'Anything you\'d like us to know about how we can make this a 10/10 experience?', type: 'textarea', section: 'Contact & Communication', required: false, enabled: true },
  { id: 'preferred_comm',   label: 'Preferred method of communication',              type: 'radio',    section: 'Contact & Communication', required: false, enabled: true, options: ['Email', 'Text/Call'] },
  { id: 'feedback_direct',  label: 'Do you want feedback sent to you directly?',     type: 'radio',    section: 'Contact & Communication', required: false, enabled: true, options: ['Yes', 'No'] },
  { id: 'activity_report',  label: 'Typically our team sends activity reports every Monday. Do you prefer an email or a call?', type: 'radio', section: 'Contact & Communication', required: false, enabled: true, options: ['Email', 'Call'] },

  // Access & Showings
  { id: 'key_or_code',      label: 'Do you have an extra key or door code for access?', type: 'text', section: 'Access & Showings', required: true, enabled: true },
  { id: 'gate_code',        label: 'Is there a gate code?',                          type: 'text',     section: 'Access & Showings', required: false, enabled: true },
  { id: 'no_showing_times', label: 'Any days or times that are not available for showings?', type: 'text', section: 'Access & Showings', required: false, enabled: true },
  { id: 'sign_install_date',label: 'Date you\'re ready for sign install? If no preference, sign will be installed within 48 hours of listing going live', type: 'text', section: 'Access & Showings', required: true, enabled: true },
  { id: 'vacant_notify',    label: 'If vacant, would you like to know when showings occur?', type: 'radio', section: 'Access & Showings', required: false, enabled: true, options: ['No', 'Yes'] },
  { id: 'showing_notify',   label: 'Would you like to be notified by text, email or both for all showings?', type: 'radio', section: 'Access & Showings', required: false, enabled: true, options: ['Text', 'Email', 'Both', 'Other'] },
  { id: 'open_house_pref',  label: 'Do you prefer Open Houses to be held at your home?', type: 'radio', section: 'Access & Showings', required: false, enabled: true, options: ['Yes', 'No', 'At agents discretion'] },

  // Utilities & HOA
  { id: 'electric',         label: 'Electric provider',                              type: 'text',     section: 'Utilities & HOA', required: false, enabled: true },
  { id: 'water_sewer_trash',label: 'Water, sewer and trash provider & date of pick up', type: 'text',  section: 'Utilities & HOA', required: false, enabled: true },
  { id: 'gas',              label: 'Do you have gas at the property? If so, please name all gas appliances', type: 'text', section: 'Utilities & HOA', required: false, enabled: true },
  { id: 'mailbox',          label: 'Mailbox location and mailbox number (if cluster mail)', type: 'text', section: 'Utilities & HOA', required: false, enabled: true },
  { id: 'hoa_info',         label: 'Is your home in an HOA? If so please list HOA info pertaining to the property', type: 'textarea', section: 'Utilities & HOA', required: false, enabled: true },

  // Home Highlights
  { id: 'fav_home',         label: 'Favorite thing about your home (this can be a space, upgrade, outdoor feature, anything you\'d want a buyer to know)', type: 'textarea', section: 'Home Highlights', required: false, enabled: true },
  { id: 'fav_neighborhood', label: 'Favorite thing about your neighborhood or community', type: 'textarea', section: 'Home Highlights', required: false, enabled: true },
  { id: 'upgrades',         label: 'Upgrades done to the home that you would like included in our listing', type: 'textarea', section: 'Home Highlights', required: false, enabled: true },

  // Home Systems
  { id: 'hvac_age',         label: 'Age of HVAC',                                    type: 'text',     section: 'Home Systems', required: false, enabled: true },
  { id: 'roof_age',         label: 'Age of Roof',                                    type: 'text',     section: 'Home Systems', required: false, enabled: true },
  { id: 'water_heater_age', label: 'Age of water heater',                            type: 'text',     section: 'Home Systems', required: false, enabled: true },
  { id: 'warranties',       label: 'Are there any warranties associated with your home?', type: 'textarea', section: 'Home Systems', required: false, enabled: true },

  // Closing & Additional
  { id: 'forwarding_address',label: 'Forwarding address after close (if applicable)', type: 'text',    section: 'Closing & Additional', required: false, enabled: true },
  { id: 'excluded_property', label: 'Any attached property you DO NOT want included in the sale?', type: 'text', section: 'Closing & Additional', required: false, enabled: true },
  { id: 'birthday',         label: 'When is your birthday?',                         type: 'text',     section: 'Closing & Additional', required: false, enabled: true },
  { id: 'closing_gift',     label: 'Do you prefer a non alcoholic gift at closing?', type: 'radio',    section: 'Closing & Additional', required: false, enabled: true, options: ['Non alcoholic please', 'Champagne is fine', 'Other'] },
  { id: 'additional_info',  label: 'Any additional info you\'d like to share with us!', type: 'textarea', section: 'Closing & Additional', required: false, enabled: true },
]

/* ── Buyer Intake (placeholder — queued for Dana's example) ── */
const BUYER_FIELDS = [
  { id: 'name',           label: 'Full Name',                type: 'text',     section: 'Contact Info',         required: true,  enabled: true },
  { id: 'email',          label: 'Email Address',            type: 'email',    section: 'Contact Info',         required: true,  enabled: true },
  { id: 'phone',          label: 'Phone Number',             type: 'tel',      section: 'Contact Info',         required: true,  enabled: true },
  { id: 'preferred_contact', label: 'Preferred Contact Method', type: 'select', section: 'Contact Info',        required: false, enabled: true, options: ['Call', 'Text', 'Email'] },
  { id: 'best_time',      label: 'Best Time to Reach You',   type: 'select',   section: 'Contact Info',         required: false, enabled: true, options: ['Morning', 'Afternoon', 'Evening', 'Any time'] },
  { id: 'related_people', label: 'Other people on the transaction (spouse, co-buyer, parent, etc.)', type: 'related_people', section: 'Contact Info', required: false, enabled: true },
  { id: 'timeline',       label: 'When Do You Want to Buy?',     type: 'select',   section: 'Timeline',         required: true,  enabled: true, options: ['ASAP', '1–3 months', '3–6 months', '6–12 months', 'Just exploring'] },
  { id: 'currently_renting', label: 'Currently Renting or Own?', type: 'select',   section: 'Timeline',         required: false, enabled: true, options: ['Renting', 'Own — need to sell first', 'Own — keeping current home', 'Living with family/friends'] },
  { id: 'lease_end',      label: 'Lease End Date (if renting)',  type: 'date',     section: 'Timeline',         required: false, enabled: true },
  { id: 'pre_approved',   label: 'Are You Pre-Approved?',        type: 'select',   section: 'Financing',        required: true,  enabled: true, options: ['Yes', 'No — not yet', 'No — paying cash'] },
  { id: 'lender_name',    label: 'Lender / Loan Officer Name',   type: 'text',     section: 'Financing',        required: false, enabled: true },
  { id: 'loan_type',      label: 'Loan Type',                    type: 'select',   section: 'Financing',        required: false, enabled: true, options: ['Conventional', 'FHA', 'VA', 'USDA', 'Cash', 'Other', 'Not sure'] },
  { id: 'budget_min',     label: 'Budget — Minimum',             type: 'number',   section: 'Financing',        required: false, enabled: true, placeholder: '350000' },
  { id: 'budget_max',     label: 'Budget — Maximum',             type: 'number',   section: 'Financing',        required: true,  enabled: true, placeholder: '500000' },
  { id: 'down_payment',   label: 'Estimated Down Payment',       type: 'text',     section: 'Financing',        required: false, enabled: true, placeholder: '$50,000 or 10%' },
  { id: 'areas',          label: 'Preferred Areas / Cities',     type: 'text',     section: 'Property Preferences', required: true,  enabled: true, placeholder: 'Gilbert, Chandler, Mesa' },
  { id: 'beds_min',       label: 'Minimum Bedrooms',             type: 'number',   section: 'Property Preferences', required: true,  enabled: true },
  { id: 'baths_min',      label: 'Minimum Bathrooms',            type: 'number',   section: 'Property Preferences', required: true,  enabled: true },
  { id: 'sqft_min',       label: 'Minimum Square Feet',          type: 'number',   section: 'Property Preferences', required: false, enabled: true },
  { id: 'property_type',  label: 'Property Type',                type: 'select',   section: 'Property Preferences', required: false, enabled: true, options: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', 'No preference'] },
  { id: 'garage',         label: 'Garage Required?',             type: 'select',   section: 'Property Preferences', required: false, enabled: true, options: ['Yes — 2+ car', 'Yes — any garage', 'No preference'] },
  { id: 'pool',           label: 'Pool Wanted?',                 type: 'select',   section: 'Property Preferences', required: false, enabled: true, options: ['Must have pool', 'Pool preferred', 'No preference', 'No pool'] },
  { id: 'school_pref',    label: 'School District Preference',   type: 'text',     section: 'Property Preferences', required: false, enabled: true },
  { id: 'commute_to',     label: 'Commute To (work address)',    type: 'text',     section: 'Property Preferences', required: false, enabled: true },
  { id: 'must_haves',     label: 'Must-Have Features',           type: 'textarea', section: 'Must-Haves & Dealbreakers', required: false, enabled: true, placeholder: 'RV gate, single story, open floor plan...' },
  { id: 'dealbreakers',   label: 'Dealbreakers',                 type: 'textarea', section: 'Must-Haves & Dealbreakers', required: false, enabled: true, placeholder: 'No HOA, no 2-story, no busy streets...' },
  { id: 'nice_to_haves',  label: 'Nice-to-Have (Not Required)',  type: 'textarea', section: 'Must-Haves & Dealbreakers', required: false, enabled: false, placeholder: 'Solar, casita, mountain views...' },
  { id: 'working_with_agent', label: 'Are You Currently Working with an Agent?', type: 'select', section: 'Additional', required: false, enabled: true, options: ['No', 'Yes — but not exclusively', 'Yes — signed agreement'] },
  { id: 'additional_notes', label: 'Anything Else I Should Know?', type: 'textarea', section: 'Additional',     required: false, enabled: true },
]

// ─── Descriptions ───
const FORM_DESCRIPTIONS = {
  contact: {
    name: 'Get In Touch',
    description: "I understand that every client has unique needs and expectations. That's why I offer multiple ways for you to reach me, ensuring seamless and efficient communication tailored to your preferences.",
    thankYou: 'Thanks so much, we will be in touch shortly! Dana Massey | AZ Realtor',
    badge: 'CONTACT',
    badgeVariant: 'success',
    icon: '👋',
  },
  seller: {
    name: 'Listing Intake Form',
    description: 'Gather all the important details about your seller\'s property, preferences, and logistics — from access codes to favorite features — so nothing gets missed from listing to close.',
    thankYou: 'Thank you! I\'ve received your property details and will prepare a personalized plan for you.',
    badge: 'SELLER',
    badgeVariant: 'warning',
    icon: '🏠',
  },
  buyer: {
    name: 'Buyer Intake Form',
    description: "Let's find your dream home! Fill this out so I can start searching for properties that match your needs.",
    thankYou: "Thank you! I've received your info and I'll be in touch soon with properties I think you'll love.",
    badge: 'BUYER',
    badgeVariant: 'info',
    icon: '🔑',
  },
}

function getFieldsForType(type) {
  if (type === 'contact') return CONTACT_FIELDS
  if (type === 'seller') return SELLER_FIELDS
  return BUYER_FIELDS
}

// ─── Default form configs ───
// ── Usage options for forms ──
// Where in the app a form is meant to be used. Drives the "Use for" picker on
// the create-form dialog and the badges shown on form cards.
export const FORM_USAGES = [
  { key: 'buyer_intake',  label: 'Buyer Intake',         icon: '🔑', description: 'Collected during buyer consultation' },
  { key: 'seller_intake', label: 'Seller / Listing Intake', icon: '🏠', description: 'Collected during listing appointment' },
  { key: 'lead_capture',  label: 'Lead Capture',         icon: '👋', description: 'Get in touch / contact form' },
  { key: 'link_in_bio',   label: 'Link in Bio',          icon: '🔗', description: 'Public lead form shared from social' },
  { key: 'open_house',    label: 'Open House Sign-In',   icon: '📋', description: 'Visitor sign-in at an open house' },
  { key: 'feedback',      label: 'Post-Showing Feedback',icon: '💬', description: 'Sent after a buyer showing' },
  { key: 'testimonial',   label: 'Testimonial Request',  icon: '⭐', description: 'Post-close testimonial collection' },
  { key: 'custom',        label: 'Custom',               icon: '✨', description: 'Anything else' },
]

export const USAGE_BY_KEY = Object.fromEntries(FORM_USAGES.map(u => [u.key, u]))

function createDefaultForm(formType, { usage, customName } = {}) {
  const meta = FORM_DESCRIPTIONS[formType] || FORM_DESCRIPTIONS.buyer
  // Default usage inferred from type; can be overridden
  const defaultUsage = formType === 'seller' ? 'seller_intake'
    : formType === 'buyer' ? 'buyer_intake'
    : formType === 'contact' ? 'lead_capture'
    : 'custom'
  return {
    id: crypto.randomUUID(),
    type: formType,
    usage: usage || defaultUsage,
    name: customName || meta.name,
    description: meta.description,
    fields: getFieldsForType(formType).map(f => ({ ...f })),
    logo: {
      url: '',
      position: 'top-center', // top-left | top-center | top-right
      size: 80, // px height
    },
    style: {
      bgColor: BRAND.white,
      accentColor: BRAND.dark,
      textColor: '#333333',
      buttonColor: BRAND.dark,
      buttonTextColor: BRAND.white,
      fontFamily: "'Poppins', sans-serif",
      borderRadius: 12,
      buttonRadius: 8,
    },
    thankYouMessage: meta.thankYou,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ═══════════════════════════════════════════════════
//  FORM FILLER — the live, fillable form for calls
// ═══════════════════════════════════════════════════

function FormFiller({ form, response, onSave, onBack, onDelete }) {
  const [data, setData] = useState(response?.data || {})
  const [clientName, setClientName] = useState(response?.clientName || '')
  const [activeSection, setActiveSection] = useState(null)
  const [saved, setSaved] = useState(false)
  const sectionRefs = useRef({})

  const enabledFields = form.fields.filter(f => f.enabled)
  const sections = [...new Set(enabledFields.map(f => f.section))]

  // Auto-set first section
  useEffect(() => {
    if (!activeSection && sections.length) setActiveSection(sections[0])
  }, [sections.length])

  const setField = (id, value) => {
    setData(prev => ({ ...prev, [id]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    const res = {
      id: response?.id || crypto.randomUUID(),
      formId: form.id,
      formType: form.type,
      clientName,
      data,
      createdAt: response?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    onSave(res)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const scrollToSection = (sec) => {
    setActiveSection(sec)
    sectionRefs.current[sec]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Count filled fields per section
  const sectionProgress = (sec) => {
    const fields = enabledFields.filter(f => f.section === sec)
    const filled = fields.filter(f => data[f.id] && String(data[f.id]).trim()).length
    return { filled, total: fields.length }
  }

  const totalFilled = enabledFields.filter(f => data[f.id] && String(data[f.id]).trim()).length
  const totalFields = enabledFields.length

  return (
    <div className="if-filler">
      {/* Top bar */}
      <div className="if-filler__topbar">
        <button className="if-builder__back" onClick={onBack}>← Back</button>
        <div className="if-filler__topbar-center">
          <Badge variant={FORM_DESCRIPTIONS[form.type]?.badgeVariant || 'default'} size="sm">
            {FORM_DESCRIPTIONS[form.type]?.badge || form.type.toUpperCase()}
          </Badge>
          <span className="if-filler__form-name">{form.name}</span>
          <span className="if-filler__progress-text">{totalFilled}/{totalFields} fields</span>
        </div>
        <div className="if-filler__topbar-right">
          {response?.id && (
            <Button size="sm" variant="ghost" onClick={() => { if (confirm('Delete this response?')) onDelete(response.id) }}>
              Delete
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={handleSave}>
            {saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="if-filler__body">
        {/* Section nav sidebar */}
        <div className="if-filler__nav">
          <div className="if-filler__client-input">
            <label className="if-filler__client-label">Client Name</label>
            <input
              className="if-filler__client-field"
              value={clientName}
              onChange={e => { setClientName(e.target.value); setSaved(false) }}
              placeholder="e.g. John & Jane Smith"
            />
          </div>

          <div className="if-filler__sections-nav">
            {sections.map(sec => {
              const prog = sectionProgress(sec)
              const isActive = activeSection === sec
              return (
                <button
                  key={sec}
                  className={`if-filler__nav-item ${isActive ? 'if-filler__nav-item--active' : ''}`}
                  onClick={() => scrollToSection(sec)}
                >
                  <span className="if-filler__nav-label">{sec}</span>
                  <span className={`if-filler__nav-count ${prog.filled === prog.total && prog.total > 0 ? 'if-filler__nav-count--done' : ''}`}>
                    {prog.filled}/{prog.total}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Form fields */}
        <div className="if-filler__form">
          <FormLogoHeader logo={form.logo} />
          {sections.map(sec => {
            const fields = enabledFields.filter(f => f.section === sec)
            return (
              <div
                key={sec}
                ref={el => sectionRefs.current[sec] = el}
                className="if-filler__section"
              >
                <h3 className="if-filler__section-title">{sec}</h3>
                <div className="if-filler__section-fields">
                  {fields.map(f => (
                    <div key={f.id} className="if-filler__field">
                      <label className="if-filler__label">
                        {f.label}
                        {f.required && <span className="if-filler__req">*</span>}
                      </label>

                      {f.type === 'related_people' ? (
                        <RelatedPeopleSection
                          value={Array.isArray(data[f.id]) ? data[f.id] : []}
                          onChange={v => setField(f.id, v)}
                          title=""
                          subtitle=""
                          compact
                        />
                      ) : f.type === 'radio' ? (
                        <div className="if-filler__radio-group">
                          {(f.options || []).map(opt => (
                            <label key={opt} className={`if-filler__radio-option ${data[f.id] === opt ? 'if-filler__radio-option--selected' : ''}`}>
                              <input
                                type="radio"
                                name={f.id}
                                value={opt}
                                checked={data[f.id] === opt}
                                onChange={() => setField(f.id, opt)}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                          {data[f.id] && (
                            <button className="if-filler__clear-btn" onClick={() => setField(f.id, '')}>Clear</button>
                          )}
                        </div>
                      ) : f.type === 'select' ? (
                        <select
                          className="if-filler__input"
                          value={data[f.id] || ''}
                          onChange={e => setField(f.id, e.target.value)}
                        >
                          <option value="">Select...</option>
                          {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          className="if-filler__input if-filler__textarea"
                          value={data[f.id] || ''}
                          onChange={e => setField(f.id, e.target.value)}
                          placeholder={f.placeholder || ''}
                          rows={3}
                        />
                      ) : (
                        <input
                          className="if-filler__input"
                          type={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          value={data[f.id] || ''}
                          onChange={e => setField(f.id, e.target.value)}
                          placeholder={f.placeholder || ''}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Bottom save */}
          <div className="if-filler__bottom-bar">
            <Button variant="primary" onClick={handleSave}>
              {saved ? 'Saved!' : 'Save Response'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════
//  FORM PREVIEW — read-only preview in builder
// ═══════════════════════════════════════════════════

function FormPreview({ form }) {
  const sections = [...new Set(form.fields.filter(f => f.enabled).map(f => f.section))]
  const s = form.style

  return (
    <div className="if-preview" style={{ background: s.bgColor, fontFamily: s.fontFamily, color: s.textColor, borderRadius: s.borderRadius }}>
      <FormLogoHeader logo={form.logo} />
      <div className="if-preview__header" style={{ borderBottomColor: s.accentColor + '22' }}>
        <h3 className="if-preview__title" style={{ color: s.accentColor }}>{form.name}</h3>
        <p className="if-preview__desc">{form.description}</p>
      </div>

      {sections.map(sec => {
        const fields = form.fields.filter(f => f.enabled && f.section === sec)
        if (!fields.length) return null
        return (
          <div key={sec} className="if-preview__section">
            <h4 className="if-preview__section-title" style={{ color: s.accentColor }}>{sec}</h4>
            <div className="if-preview__fields">
              {fields.map(f => (
                <div key={f.id} className="if-preview__field">
                  <label className="if-preview__label">
                    {f.label}
                    {f.required && <span className="if-preview__req">*</span>}
                  </label>
                  {f.type === 'radio' ? (
                    <div className="if-preview__radio-group">
                      {(f.options || []).map(o => (
                        <label key={o} className="if-preview__radio-opt">
                          <span className="if-preview__radio-circle" style={{ borderColor: s.accentColor + '55' }} />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  ) : f.type === 'select' ? (
                    <select className="if-preview__input" style={{ borderRadius: Math.min(s.borderRadius, 8), borderColor: s.accentColor + '33' }} disabled>
                      <option>Select...</option>
                      {(f.options || []).map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea className="if-preview__input if-preview__textarea" style={{ borderRadius: Math.min(s.borderRadius, 8), borderColor: s.accentColor + '33' }} placeholder={f.placeholder} readOnly rows={2} />
                  ) : (
                    <input className="if-preview__input" type={f.type} style={{ borderRadius: Math.min(s.borderRadius, 8), borderColor: s.accentColor + '33' }} placeholder={f.placeholder} readOnly />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <button className="if-preview__submit" style={{ background: s.buttonColor, color: s.buttonTextColor, borderRadius: s.buttonRadius }} disabled>
        Submit
      </button>
      <p className="if-preview__required-note">* Required fields</p>
    </div>
  )
}

// ─── Logo Editor ───
const LOGO_PRESETS = [
  { id: 'real-black', label: 'REAL (Black)', url: '/assets/branding/real-logo-black.png' },
  { id: 'real-white', label: 'REAL (White)', url: '/assets/branding/real-logo-white.png' },
]

function LogoEditor({ logo, onChange }) {
  const fileRef = useRef(null)
  const l = logo || { url: '', position: 'top-center', size: 80 }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo must be under 2 MB. Please use a smaller image.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange({ ...l, url: reader.result })
    reader.readAsDataURL(file)
  }

  return (
    <div className="if-logo-editor">
      <label className="if-logo-editor__label">Form Logo</label>

      {l.url ? (
        <div className="if-logo-editor__preview-row">
          <div className="if-logo-editor__preview">
            <img src={l.url} alt="Logo" style={{ height: l.size, maxWidth: 240, objectFit: 'contain' }} />
          </div>
          <div className="if-logo-editor__actions">
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>Replace</Button>
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...l, url: '' })}>Remove</Button>
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="if-logo-editor__upload"
            onClick={() => fileRef.current?.click()}
          >
            <span>📷 Upload Logo</span>
            <span className="if-logo-editor__hint">PNG, JPG, or SVG · Max 2 MB</span>
          </button>
          <div className="if-logo-editor__presets">
            <span className="if-logo-editor__sublabel">Or use a brand preset</span>
            <div className="if-logo-editor__preset-row">
              {LOGO_PRESETS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="if-logo-editor__preset-btn"
                  onClick={() => onChange({ ...l, url: p.url })}
                >
                  <img src={p.url} alt={p.label} />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        style={{ display: 'none' }}
        onChange={handleFile}
      />

      {l.url && (
        <>
          <div className="if-logo-editor__field">
            <label className="if-logo-editor__sublabel">Position</label>
            <div className="if-logo-editor__positions">
              {[
                { value: 'top-left', label: 'Left' },
                { value: 'top-center', label: 'Center' },
                { value: 'top-right', label: 'Right' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  className={`if-logo-editor__pos-btn ${l.position === opt.value ? 'if-logo-editor__pos-btn--active' : ''}`}
                  onClick={() => onChange({ ...l, position: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="if-logo-editor__field">
            <label className="if-logo-editor__sublabel">Size ({l.size}px)</label>
            <input
              type="range"
              min={40}
              max={160}
              step={4}
              value={l.size}
              onChange={e => onChange({ ...l, size: Number(e.target.value) })}
              className="if-logo-editor__slider"
            />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Form Logo Header (shared render) ───
function FormLogoHeader({ logo }) {
  if (!logo?.url) return null
  const justify = logo.position === 'top-left' ? 'flex-start'
    : logo.position === 'top-right' ? 'flex-end'
    : 'center'
  return (
    <div style={{ display: 'flex', justifyContent: justify, padding: '16px 0 8px' }}>
      <img src={logo.url} alt="Logo" style={{ height: logo.size || 80, maxWidth: '60%', objectFit: 'contain' }} />
    </div>
  )
}

// ─── Field Editor ───
function FieldEditor({ fields, onChange }) {
  const sections = [...new Set(fields.map(f => f.section))]

  const toggleField = (id) => {
    onChange(fields.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  }

  const toggleRequired = (id) => {
    onChange(fields.map(f => f.id === id ? { ...f, required: !f.required } : f))
  }

  const updateLabel = (id, label) => {
    onChange(fields.map(f => f.id === id ? { ...f, label } : f))
  }

  return (
    <div className="if-fields">
      {sections.map(sec => (
        <div key={sec} className="if-fields__section">
          <h4 className="if-fields__section-title">{sec}</h4>
          {fields.filter(f => f.section === sec).map(f => (
            <div key={f.id} className={`if-fields__item ${f.enabled ? '' : 'if-fields__item--disabled'}`}>
              <label className="if-fields__toggle">
                <input type="checkbox" checked={f.enabled} onChange={() => toggleField(f.id)} />
                <span className="if-fields__item-label">{f.label}</span>
              </label>
              {f.enabled && (
                <div className="if-fields__item-controls">
                  <input
                    className="if-fields__label-edit"
                    value={f.label}
                    onChange={e => updateLabel(f.id, e.target.value)}
                    placeholder="Field label"
                  />
                  <label className="if-fields__req-toggle">
                    <input type="checkbox" checked={f.required} onChange={() => toggleRequired(f.id)} />
                    <span>Required</span>
                  </label>
                  <span className="if-fields__type-badge">{f.type}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Style Editor ───
function StyleEditor({ style, onChange }) {
  const set = (k, v) => onChange({ ...style, [k]: v })
  return (
    <div className="if-style">
      <BrandColorPicker label="Background" value={style.bgColor} onChange={v => set('bgColor', v)} />
      <BrandColorPicker label="Accent Color" value={style.accentColor} onChange={v => set('accentColor', v)} showMixes />
      <BrandColorPicker label="Text Color" value={style.textColor} onChange={v => set('textColor', v)} />
      <BrandColorPicker label="Button Color" value={style.buttonColor} onChange={v => set('buttonColor', v)} showMixes />
      <BrandColorPicker label="Button Text" value={style.buttonTextColor} onChange={v => set('buttonTextColor', v)} />
      <FontPicker label="Font" value={style.fontFamily} onChange={v => set('fontFamily', v)} />
      <BorderRadiusControl label="Form Corners" value={style.borderRadius} onChange={v => set('borderRadius', v)} showPill={false} />
      <BorderRadiusControl label="Button Corners" value={style.buttonRadius} onChange={v => set('buttonRadius', v)} />
    </div>
  )
}

// ─── Form Builder ───
function FormBuilder({ form, onSave, onBack }) {
  const [draft, setDraft] = useState({ ...form })
  const [activeTab, setActiveTab] = useState('fields')
  const [publishing, setPublishing] = useState(false)
  const [copyHint, setCopyHint] = useState('')

  const isPublished = !!draft.publishedSlug
  const publicUrl = isPublished ? publicFormUrl(draft.publishedSlug) : ''

  const handleSave = () => {
    onSave({ ...draft, updatedAt: new Date().toISOString() })
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const { slug } = await publishFormToSupabase(draft)
      const updated = {
        ...draft,
        publishedSlug: slug,
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setDraft(updated)
      onSave(updated)
      setCopyHint('Published! Link is live.')
      setTimeout(() => setCopyHint(''), 2500)
    } catch (err) {
      alert(`Could not publish: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    if (!confirm('Unpublish this form? The shareable link will stop working.')) return
    setPublishing(true)
    try {
      await unpublishFormFromSupabase(draft.publishedSlug)
      const updated = { ...draft, publishedSlug: null, publishedAt: null, updatedAt: new Date().toISOString() }
      setDraft(updated)
      onSave(updated)
      setCopyHint('Unpublished.')
      setTimeout(() => setCopyHint(''), 2500)
    } catch (err) {
      alert(`Could not unpublish: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopyHint('Link copied!')
      setTimeout(() => setCopyHint(''), 2000)
    } catch {
      alert(publicUrl)
    }
  }

  return (
    <div className="if-builder">
      <div className="if-builder__header">
        <button className="if-builder__back" onClick={onBack}>← Back to Forms</button>
        <div className="if-builder__header-right">
          {copyHint && <span className="if-builder__copy-hint">{copyHint}</span>}
          {isPublished ? (
            <>
              <Button size="sm" variant="secondary" onClick={handleCopyLink}>Copy Link</Button>
              <Button size="sm" variant="ghost" onClick={handleUnpublish} disabled={publishing}>Unpublish</Button>
              <Button size="sm" variant="secondary" onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Updating…' : 'Re-publish'}
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing…' : '🌐 Publish'}
            </Button>
          )}
          <Button size="sm" variant="primary" onClick={handleSave}>Save Form</Button>
        </div>
      </div>

      {isPublished && (
        <div className="if-builder__published-bar">
          <span className="if-builder__published-dot">●</span>
          <span className="if-builder__published-label">Live at</span>
          <a className="if-builder__published-url" href={publicUrl} target="_blank" rel="noreferrer">{publicUrl}</a>
          <span className="if-builder__published-hint">Re-publish after changes to push updates.</span>
        </div>
      )}

      <div className="if-builder__workspace">
        <div className="if-builder__editor">
          <div className="if-builder__tabs">
            {['fields', 'style', 'settings'].map(tab => (
              <button
                key={tab}
                className={`if-builder__tab ${activeTab === tab ? 'if-builder__tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'fields' ? 'Fields' : tab === 'style' ? 'Style' : 'Settings'}
              </button>
            ))}
          </div>

          {activeTab === 'fields' && (
            <FieldEditor
              fields={draft.fields}
              onChange={fields => setDraft({ ...draft, fields })}
            />
          )}

          {activeTab === 'style' && (
            <StyleEditor
              style={draft.style}
              onChange={style => setDraft({ ...draft, style })}
            />
          )}

          {activeTab === 'settings' && (
            <div className="if-settings">
              <Input label="Form Name" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
              <Textarea label="Description / Intro Text" rows={3} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
              <Textarea label="Thank-You Message" rows={3} value={draft.thankYouMessage} onChange={e => setDraft({ ...draft, thankYouMessage: e.target.value })} />
              <LogoEditor
                logo={draft.logo}
                onChange={logo => setDraft({ ...draft, logo })}
              />
            </div>
          )}
        </div>

        <div className="if-builder__preview-wrap">
          <p className="if-builder__preview-label">LIVE PREVIEW</p>
          <div className="if-builder__preview-frame">
            <FormPreview form={draft} />
          </div>
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════

export default function IntakeForms() {
  const [forms, setForms] = useState(loadForms)
  const [responses, setResponses] = useState(loadResponses)
  const [remoteSubmissions, setRemoteSubmissions] = useState([])
  const [mode, setMode] = useState(null) // null | { type: 'fill', form, response? } | { type: 'build', form }
  const [showNewForm, setShowNewForm] = useState(false)

  // Auto-create default forms if none exist
  useEffect(() => {
    if (forms.length === 0) {
      const defaults = [
        createDefaultForm('seller'),
        createDefaultForm('contact'),
      ]
      setForms(defaults)
      saveForms(defaults)
    }
  }, [])

  // Pull client submissions from Supabase (for any form Dana has published)
  useEffect(() => {
    let cancelled = false
    fetchAllSubmissions()
      .then(rows => {
        if (cancelled) return
        // Convert Supabase rows into the same shape as local responses
        const mapped = rows.map(r => ({
          id: 'remote-' + r.id,
          formSlug: r.form_slug,
          clientName: r.client_name || '',
          data: r.data || {},
          createdAt: r.created_at,
          updatedAt: r.created_at,
          source: 'remote',
        }))
        setRemoteSubmissions(mapped)
      })
      .catch(() => { /* silent — Supabase unreachable just hides remote submissions */ })
    return () => { cancelled = true }
  }, [])

  // Ensure seller + contact forms always exist
  const sellerForm = forms.find(f => f.type === 'seller') || createDefaultForm('seller')
  const contactForm = forms.find(f => f.type === 'contact') || createDefaultForm('contact')
  const buyerForms = forms.filter(f => f.type === 'buyer')

  const createForm = (type) => {
    const form = createDefaultForm(type)
    const updated = [form, ...forms]
    setForms(updated)
    saveForms(updated)
    return form
  }

  // Create a custom form from the New Form dialog. `startFrom` is one of:
  //   'blank' | 'seller' | 'buyer' | 'contact'
  // The usage tag is saved on the form regardless.
  const createCustomForm = ({ name, usage, startFrom }) => {
    const baseType = startFrom === 'blank'
      ? (usage === 'seller_intake' ? 'seller' : usage === 'buyer_intake' ? 'buyer' : 'contact')
      : startFrom
    const form = createDefaultForm(baseType, { usage, customName: name || undefined })
    if (startFrom === 'blank') {
      // Clear all fields except the basic contact identifiers
      form.fields = form.fields.filter(f =>
        ['full_name', 'name', 'email', 'phone'].includes(f.id)
      ).map(f => ({ ...f, enabled: true }))
    }
    const updated = [form, ...forms]
    setForms(updated)
    saveForms(updated)
    setShowNewForm(false)
    // Jump straight into the builder so Dana can add fields
    setMode({ type: 'build', form })
  }

  const saveForm = (updated) => {
    let newForms
    if (forms.find(f => f.id === updated.id)) {
      newForms = forms.map(f => f.id === updated.id ? updated : f)
    } else {
      newForms = [updated, ...forms]
    }
    setForms(newForms)
    saveForms(newForms)
    setMode(null)
  }

  const saveResponse = (res) => {
    let updated
    if (responses.find(r => r.id === res.id)) {
      updated = responses.map(r => r.id === res.id ? res : r)
    } else {
      updated = [res, ...responses]
    }
    setResponses(updated)
    saveResponses(updated)
  }

  const deleteResponse = (id) => {
    const updated = responses.filter(r => r.id !== id)
    setResponses(updated)
    saveResponses(updated)
    setMode(null)
  }

  const duplicateForm = (form) => {
    const dup = { ...form, id: crypto.randomUUID(), name: form.name + ' (Copy)', createdAt: new Date().toISOString() }
    const updated = [dup, ...forms]
    setForms(updated)
    saveForms(updated)
  }

  const deleteForm = (id) => {
    if (!confirm('Delete this form?')) return
    const updated = forms.filter(f => f.id !== id)
    setForms(updated)
    saveForms(updated)
  }

  // ─── Render modes ───

  if (mode?.type === 'fill') {
    return (
      <FormFiller
        form={mode.form}
        response={mode.response || null}
        onSave={saveResponse}
        onBack={() => setMode(null)}
        onDelete={deleteResponse}
      />
    )
  }

  if (mode?.type === 'build') {
    return <FormBuilder form={mode.form} onSave={saveForm} onBack={() => setMode(null)} />
  }

  // ─── Main view ───
  // Resolve which local form a remote submission belongs to via its slug
  const formBySlug = (slug) => forms.find(f => buildSlug(f) === slug)
  const remoteForLocalForm = (form) => remoteSubmissions.filter(r => formBySlug(r.formSlug)?.id === form.id)

  // Build a unified, sorted list of responses (local + remote)
  const unifiedResponses = (() => {
    const local = responses.map(r => ({ ...r, source: r.source || 'local' }))
    // Tag remote with formId/formType so the existing card renderer keeps working
    const remote = remoteSubmissions.map(r => {
      const form = formBySlug(r.formSlug)
      return form
        ? { ...r, formId: form.id, formType: form.type }
        : null
    }).filter(Boolean)
    return [...remote, ...local].sort((a, b) =>
      new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
    )
  })()

  const getFormResponses = (formType) => unifiedResponses.filter(r => r.formType === formType)

  // Custom forms (anything not a default seller/contact/buyer triplet)
  const customForms = forms.filter(f =>
    f.type !== 'seller' && f.type !== 'contact' && f.type !== 'buyer'
  )

  return (
    <div className="if-page">
      <SectionHeader
        title="Intake Forms"
        subtitle="Fill out forms during client calls — or customize templates to match your brand"
        actions={<Button size="sm" onClick={() => setShowNewForm(true)}>+ New Form</Button>}
      />

      {showNewForm && (
        <NewFormDialog
          onCreate={createCustomForm}
          onClose={() => setShowNewForm(false)}
        />
      )}

      {/* ── Form Templates ── */}
      <div className="if-templates">
        {/* Seller Intake */}
        <div className="if-template-card">
          <div className="if-template-card__header">
            <div className="if-template-card__title-row">
              <span className="if-template-card__icon">🏠</span>
              <div>
                <h3 className="if-template-card__name">{sellerForm.name}</h3>
                <p className="if-template-card__desc">
                  {sellerForm.fields.filter(f => f.enabled).length} fields · {getFormResponses('seller').length} responses
                  {sellerForm.logo?.url && <span className="if-template-card__logo-flag"> · 🖼️ logo</span>}
                  {sellerForm.publishedSlug && <span className="if-template-card__live-flag"> · ● live link</span>}
                </p>
              </div>
            </div>
            <Badge variant="warning" size="sm">SELLER</Badge>
          </div>
          {sellerForm.logo?.url && (
            <div className="if-template-card__logo-preview">
              <img src={sellerForm.logo.url} alt="Form logo" />
            </div>
          )}
          <p className="if-template-card__subtitle">{sellerForm.description}</p>
          <div className="if-template-card__actions">
            <Button variant="primary" size="sm" onClick={() => setMode({ type: 'fill', form: sellerForm })}>
              Fill Out New
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMode({ type: 'build', form: sellerForm })}>
              Customize
            </Button>
          </div>
        </div>

        {/* Get In Touch */}
        <div className="if-template-card">
          <div className="if-template-card__header">
            <div className="if-template-card__title-row">
              <span className="if-template-card__icon">👋</span>
              <div>
                <h3 className="if-template-card__name">{contactForm.name}</h3>
                <p className="if-template-card__desc">
                  {contactForm.fields.filter(f => f.enabled).length} fields · {getFormResponses('contact').length} responses
                  {contactForm.logo?.url && <span className="if-template-card__logo-flag"> · 🖼️ logo</span>}
                  {contactForm.publishedSlug && <span className="if-template-card__live-flag"> · ● live link</span>}
                </p>
              </div>
            </div>
            <Badge variant="success" size="sm">CONTACT</Badge>
          </div>
          {contactForm.logo?.url && (
            <div className="if-template-card__logo-preview">
              <img src={contactForm.logo.url} alt="Form logo" />
            </div>
          )}
          <p className="if-template-card__subtitle">{contactForm.description}</p>
          <div className="if-template-card__actions">
            <Button variant="primary" size="sm" onClick={() => setMode({ type: 'fill', form: contactForm })}>
              Fill Out New
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMode({ type: 'build', form: contactForm })}>
              Customize
            </Button>
          </div>
        </div>

        {/* Buyer — coming soon or existing */}
        {buyerForms.length > 0 ? buyerForms.map(bf => (
          <div key={bf.id} className="if-template-card">
            <div className="if-template-card__header">
              <div className="if-template-card__title-row">
                <span className="if-template-card__icon">🔑</span>
                <div>
                  <h3 className="if-template-card__name">{bf.name}</h3>
                  <p className="if-template-card__desc">
                    {bf.fields.filter(f => f.enabled).length} fields · {getFormResponses('buyer').length} responses
                    {bf.logo?.url && <span className="if-template-card__logo-flag"> · 🖼️ logo</span>}
                    {bf.publishedSlug && <span className="if-template-card__live-flag"> · ● live link</span>}
                  </p>
                </div>
              </div>
              <Badge variant="info" size="sm">BUYER</Badge>
            </div>
            {bf.logo?.url && (
              <div className="if-template-card__logo-preview">
                <img src={bf.logo.url} alt="Form logo" />
              </div>
            )}
            <p className="if-template-card__subtitle">{bf.description}</p>
            <div className="if-template-card__actions">
              <Button variant="primary" size="sm" onClick={() => setMode({ type: 'fill', form: bf })}>
                Fill Out New
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setMode({ type: 'build', form: bf })}>
                Customize
              </Button>
            </div>
          </div>
        )) : (
          <div className="if-template-card if-template-card--queued">
            <div className="if-template-card__header">
              <div className="if-template-card__title-row">
                <span className="if-template-card__icon">🔑</span>
                <div>
                  <h3 className="if-template-card__name">Buyer Intake Form</h3>
                  <p className="if-template-card__desc">Queued — awaiting your example</p>
                </div>
              </div>
              <Badge variant="dark" size="sm">COMING SOON</Badge>
            </div>
            <p className="if-template-card__subtitle">A buyer consultation form you can fill out while talking with clients. Send me your example and I'll build it out.</p>
            <div className="if-template-card__actions">
              <Button variant="secondary" size="sm" onClick={() => {
                const f = createForm('buyer')
                setMode({ type: 'build', form: f })
              }}>
                Create Draft Anyway
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Saved Responses (local + remote client submissions) ── */}
      {unifiedResponses.length > 0 && (
        <div className="if-responses">
          <h3 className="if-responses__title">Saved Responses</h3>
          <div className="if-responses__list">
            {unifiedResponses.map(r => {
              const form = forms.find(f => f.id === r.formId) || forms.find(f => f.type === r.formType)
              if (!form) return null
              const filledCount = Object.values(r.data).filter(v => v && String(v).trim()).length
              const meta = FORM_DESCRIPTIONS[r.formType] || FORM_DESCRIPTIONS.buyer
              const isRemote = r.source === 'remote'
              return (
                <div
                  key={r.id}
                  className={`if-response-card ${isRemote ? 'if-response-card--remote' : ''}`}
                  onClick={() => setMode({ type: 'fill', form, response: r })}
                >
                  <div className="if-response-card__top">
                    <Badge variant={meta.badgeVariant} size="sm">{meta.badge}</Badge>
                    {isRemote && <Badge variant="info" size="sm">📥 FROM CLIENT</Badge>}
                    <span className="if-response-card__date">{new Date(r.updatedAt || r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h4 className="if-response-card__name">{r.clientName || 'Unnamed Client'}</h4>
                  <p className="if-response-card__meta">{filledCount} fields filled · {form.name}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Custom Forms (ones Dana created from scratch) ─── */}
      {customForms.length > 0 && (
        <div className="if-section">
          <h3 className="if-section-title">Custom Forms</h3>
          <div className="if-templates">
            {customForms.map(cf => (
              <div key={cf.id} className="if-template-card">
                <div className="if-template-card__header">
                  <div className="if-template-card__title-row">
                    <span className="if-template-card__icon">{USAGE_BY_KEY[cf.usage]?.icon || '📄'}</span>
                    <div>
                      <h3 className="if-template-card__name">{cf.name}</h3>
                      <p className="if-template-card__desc">
                        {cf.fields.filter(f => f.enabled).length} fields
                        {cf.publishedSlug && <span className="if-template-card__live-flag"> · ● live link</span>}
                      </p>
                    </div>
                  </div>
                  <Badge variant="default" size="sm">{USAGE_BY_KEY[cf.usage]?.label?.toUpperCase() || 'CUSTOM'}</Badge>
                </div>
                <p className="if-template-card__subtitle">{cf.description || USAGE_BY_KEY[cf.usage]?.description}</p>
                <div className="if-template-card__actions">
                  <Button variant="primary" size="sm" onClick={() => setMode({ type: 'fill', form: cf })}>Fill Out New</Button>
                  <Button variant="secondary" size="sm" onClick={() => setMode({ type: 'build', form: cf })}>Customize</Button>
                  <Button variant="ghost" size="sm" onClick={() => duplicateForm(cf)}>Duplicate</Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteForm(cf.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Submissions Inbox (remote submissions + merged contact links) ─── */}
      <SubmissionsInbox submissions={remoteSubmissions} forms={forms} />
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  NewFormDialog — modal for creating a custom form
// ═══════════════════════════════════════════════════
function NewFormDialog({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [usage, setUsage] = useState('lead_capture')
  const [startFrom, setStartFrom] = useState('contact')

  return (
    <div className="if-dialog-overlay" onClick={onClose}>
      <div className="if-dialog" onClick={e => e.stopPropagation()}>
        <button className="if-dialog__close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="if-dialog__title">New Form</h2>
        <p className="if-dialog__sub">Name it, pick where it's used, and optionally start from an existing template.</p>

        <div className="if-dialog__field">
          <label>Form Name</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Open House Sign-In, FSBO Follow-Up, Past Client Survey"
            autoFocus
          />
        </div>

        <div className="if-dialog__field">
          <label>Use for</label>
          <div className="if-dialog__usage-grid">
            {FORM_USAGES.map(u => (
              <button
                key={u.key}
                type="button"
                className={`if-dialog__usage ${usage === u.key ? 'if-dialog__usage--selected' : ''}`}
                onClick={() => setUsage(u.key)}
              >
                <span className="if-dialog__usage-icon">{u.icon}</span>
                <span className="if-dialog__usage-label">{u.label}</span>
                <span className="if-dialog__usage-desc">{u.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="if-dialog__field">
          <label>Start from</label>
          <Select value={startFrom} onChange={e => setStartFrom(e.target.value)}>
            <option value="blank">Blank (just name/email/phone)</option>
            <option value="contact">Get In Touch template</option>
            <option value="buyer">Buyer Intake template</option>
            <option value="seller">Seller Intake template</option>
          </Select>
        </div>

        <div className="if-dialog__footer">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name.trim()} onClick={() => onCreate({ name: name.trim(), usage, startFrom })}>
            Create & Edit
          </Button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════
//  SubmissionsInbox — shows incoming submissions + which contact they merged into
// ═══════════════════════════════════════════════════
function SubmissionsInbox({ submissions, forms }) {
  if (!submissions || submissions.length === 0) {
    return (
      <div className="if-section">
        <h3 className="if-section-title">Recent Submissions</h3>
        <div className="if-empty-inbox">
          <p>No public submissions yet. When a client fills out a published form, it shows up here and auto-merges into their contact file.</p>
        </div>
      </div>
    )
  }

  const formBySlug = (slug) => forms.find(f => buildSlug(f) === slug)

  return (
    <div className="if-section">
      <h3 className="if-section-title">Recent Submissions ({submissions.length})</h3>
      <p className="if-section-sub">Every public form submission auto-merges into your Contacts. Click a contact link to open their file.</p>

      <div className="if-inbox">
        {submissions.slice(0, 25).map(sub => {
          const form = formBySlug(sub.formSlug || sub.form_slug)
          const merged = sub.merged_contact || null
          const when = new Date(sub.createdAt || sub.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })
          return (
            <div key={sub.id} className="if-inbox__row">
              <div className="if-inbox__main">
                <div className="if-inbox__name">
                  {sub.clientName || sub.client_name || 'Unnamed'}
                </div>
                <div className="if-inbox__meta">
                  {form?.name || sub.formSlug || sub.form_slug} · {when}
                </div>
              </div>
              <div className="if-inbox__merge">
                {merged ? (
                  <a
                    href={merged.type === 'seller' || merged.type === 'both' ? '/crm/seller-clients' : '/crm/buyers'}
                    className="if-inbox__merge-link"
                  >
                    → {merged.name}
                    {merged.type && <span className="if-inbox__merge-type"> ({merged.type})</span>}
                  </a>
                ) : (
                  <span className="if-inbox__merge-pending">not yet merged</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

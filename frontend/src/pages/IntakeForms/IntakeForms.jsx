import { useState } from 'react'
import { Button, Badge, SectionHeader, Card, Input, Select, Textarea } from '../../components/ui/index.jsx'
import { BrandColorPicker, BorderRadiusControl, FontPicker } from '../../components/ui/StyleControls'
import './IntakeForms.css'

// ─── Storage ───
const STORAGE_KEY = 'intake_forms'

function loadForms() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}
function saveForms(forms) { localStorage.setItem(STORAGE_KEY, JSON.stringify(forms)) }

// ─── Brand colors ───
const BRAND = {
  dark: '#524136',
  mid: '#b79782',
  cream: '#efede8',
  white: '#ffffff',
}

// ─── Default field libraries ───
const BUYER_FIELDS = [
  // Contact
  { id: 'name',           label: 'Full Name',                type: 'text',     section: 'Contact Info',         required: true,  enabled: true },
  { id: 'email',          label: 'Email Address',            type: 'email',    section: 'Contact Info',         required: true,  enabled: true },
  { id: 'phone',          label: 'Phone Number',             type: 'tel',      section: 'Contact Info',         required: true,  enabled: true },
  { id: 'preferred_contact', label: 'Preferred Contact Method', type: 'select', section: 'Contact Info',        required: false, enabled: true, options: ['Call', 'Text', 'Email'] },
  { id: 'best_time',      label: 'Best Time to Reach You',   type: 'select',   section: 'Contact Info',         required: false, enabled: true, options: ['Morning', 'Afternoon', 'Evening', 'Any time'] },
  // Timeline
  { id: 'timeline',       label: 'When Do You Want to Buy?',     type: 'select',   section: 'Timeline',         required: true,  enabled: true, options: ['ASAP', '1–3 months', '3–6 months', '6–12 months', 'Just exploring'] },
  { id: 'currently_renting', label: 'Currently Renting or Own?', type: 'select',   section: 'Timeline',         required: false, enabled: true, options: ['Renting', 'Own — need to sell first', 'Own — keeping current home', 'Living with family/friends'] },
  { id: 'lease_end',      label: 'Lease End Date (if renting)',  type: 'date',     section: 'Timeline',         required: false, enabled: true },
  // Financing
  { id: 'pre_approved',   label: 'Are You Pre-Approved?',        type: 'select',   section: 'Financing',        required: true,  enabled: true, options: ['Yes', 'No — not yet', 'No — paying cash'] },
  { id: 'lender_name',    label: 'Lender / Loan Officer Name',   type: 'text',     section: 'Financing',        required: false, enabled: true },
  { id: 'loan_type',      label: 'Loan Type',                    type: 'select',   section: 'Financing',        required: false, enabled: true, options: ['Conventional', 'FHA', 'VA', 'USDA', 'Cash', 'Other', 'Not sure'] },
  { id: 'budget_min',     label: 'Budget — Minimum',             type: 'number',   section: 'Financing',        required: false, enabled: true, placeholder: '350000' },
  { id: 'budget_max',     label: 'Budget — Maximum',             type: 'number',   section: 'Financing',        required: true,  enabled: true, placeholder: '500000' },
  { id: 'down_payment',   label: 'Estimated Down Payment',       type: 'text',     section: 'Financing',        required: false, enabled: true, placeholder: '$50,000 or 10%' },
  // Property Preferences
  { id: 'areas',          label: 'Preferred Areas / Cities',     type: 'text',     section: 'Property Preferences', required: true,  enabled: true, placeholder: 'Gilbert, Chandler, Mesa' },
  { id: 'beds_min',       label: 'Minimum Bedrooms',             type: 'number',   section: 'Property Preferences', required: true,  enabled: true },
  { id: 'baths_min',      label: 'Minimum Bathrooms',            type: 'number',   section: 'Property Preferences', required: true,  enabled: true },
  { id: 'sqft_min',       label: 'Minimum Square Feet',          type: 'number',   section: 'Property Preferences', required: false, enabled: true },
  { id: 'property_type',  label: 'Property Type',                type: 'select',   section: 'Property Preferences', required: false, enabled: true, options: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', 'No preference'] },
  { id: 'garage',         label: 'Garage Required?',             type: 'select',   section: 'Property Preferences', required: false, enabled: true, options: ['Yes — 2+ car', 'Yes — any garage', 'No preference'] },
  { id: 'pool',           label: 'Pool Wanted?',                 type: 'select',   section: 'Property Preferences', required: false, enabled: true, options: ['Must have pool', 'Pool preferred', 'No preference', 'No pool'] },
  { id: 'school_pref',    label: 'School District Preference',   type: 'text',     section: 'Property Preferences', required: false, enabled: true },
  { id: 'commute_to',     label: 'Commute To (work address)',    type: 'text',     section: 'Property Preferences', required: false, enabled: true },
  // Must-Haves & Dealbreakers
  { id: 'must_haves',     label: 'Must-Have Features',           type: 'textarea', section: 'Must-Haves & Dealbreakers', required: false, enabled: true, placeholder: 'RV gate, single story, open floor plan...' },
  { id: 'dealbreakers',   label: 'Dealbreakers',                 type: 'textarea', section: 'Must-Haves & Dealbreakers', required: false, enabled: true, placeholder: 'No HOA, no 2-story, no busy streets...' },
  { id: 'nice_to_haves',  label: 'Nice-to-Have (Not Required)',  type: 'textarea', section: 'Must-Haves & Dealbreakers', required: false, enabled: false, placeholder: 'Solar, casita, mountain views...' },
  // Additional
  { id: 'working_with_agent', label: 'Are You Currently Working with an Agent?', type: 'select', section: 'Additional', required: false, enabled: true, options: ['No', 'Yes — but not exclusively', 'Yes — signed agreement'] },
  { id: 'additional_notes', label: 'Anything Else I Should Know?', type: 'textarea', section: 'Additional',     required: false, enabled: true },
]

const SELLER_FIELDS = [
  // Contact
  { id: 'name',           label: 'Full Name',                    type: 'text',     section: 'Contact Info',       required: true,  enabled: true },
  { id: 'email',          label: 'Email Address',                type: 'email',    section: 'Contact Info',       required: true,  enabled: true },
  { id: 'phone',          label: 'Phone Number',                 type: 'tel',      section: 'Contact Info',       required: true,  enabled: true },
  { id: 'preferred_contact', label: 'Preferred Contact Method',  type: 'select',   section: 'Contact Info',       required: false, enabled: true, options: ['Call', 'Text', 'Email'] },
  // Property Info
  { id: 'property_address', label: 'Property Address',           type: 'text',     section: 'Property Info',      required: true,  enabled: true },
  { id: 'property_city',  label: 'City',                         type: 'text',     section: 'Property Info',      required: true,  enabled: true, placeholder: 'Gilbert' },
  { id: 'property_zip',   label: 'Zip Code',                     type: 'text',     section: 'Property Info',      required: false, enabled: true },
  { id: 'property_type',  label: 'Property Type',                type: 'select',   section: 'Property Info',      required: false, enabled: true, options: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', 'Mobile Home', 'Land'] },
  { id: 'bedrooms',       label: 'Bedrooms',                     type: 'number',   section: 'Property Info',      required: true,  enabled: true },
  { id: 'bathrooms',      label: 'Bathrooms',                    type: 'number',   section: 'Property Info',      required: true,  enabled: true },
  { id: 'sqft',           label: 'Approx. Square Feet',          type: 'number',   section: 'Property Info',      required: false, enabled: true },
  { id: 'year_built',     label: 'Year Built',                   type: 'number',   section: 'Property Info',      required: false, enabled: true },
  { id: 'lot_size',       label: 'Lot Size (approx.)',           type: 'text',     section: 'Property Info',      required: false, enabled: true, placeholder: '7,200 sqft or 0.17 acres' },
  { id: 'pool',           label: 'Pool?',                        type: 'select',   section: 'Property Info',      required: false, enabled: true, options: ['Yes', 'No'] },
  { id: 'garage',         label: 'Garage?',                      type: 'select',   section: 'Property Info',      required: false, enabled: true, options: ['1 car', '2 car', '3+ car', 'Carport', 'None'] },
  { id: 'hoa',            label: 'Is There an HOA?',             type: 'select',   section: 'Property Info',      required: false, enabled: true, options: ['Yes', 'No', 'Not sure'] },
  { id: 'hoa_amount',     label: 'HOA Amount ($/month)',         type: 'number',   section: 'Property Info',      required: false, enabled: true },
  // Selling Timeline & Goals
  { id: 'timeline',       label: 'When Do You Want to Sell?',    type: 'select',   section: 'Timeline & Goals',   required: true,  enabled: true, options: ['ASAP', '1–3 months', '3–6 months', '6+ months', 'Just exploring options'] },
  { id: 'reason',         label: 'Reason for Selling',           type: 'select',   section: 'Timeline & Goals',   required: false, enabled: true, options: ['Upgrading', 'Downsizing', 'Relocating', 'Investing/Rental', 'Financial reasons', 'Life change', 'Other'] },
  { id: 'price_expectation', label: 'Your Price Expectation',    type: 'text',     section: 'Timeline & Goals',   required: false, enabled: true, placeholder: '$500,000' },
  { id: 'buying_next',    label: 'Are You Buying Another Home?', type: 'select',   section: 'Timeline & Goals',   required: false, enabled: true, options: ['Yes — need to find one', 'Yes — already found', 'No', 'Maybe'] },
  { id: 'mortgage_balance', label: 'Approx. Remaining Mortgage Balance', type: 'text', section: 'Timeline & Goals', required: false, enabled: true, placeholder: '$250,000' },
  // Property Condition
  { id: 'condition',      label: 'Overall Condition',            type: 'select',   section: 'Property Condition', required: false, enabled: true, options: ['Move-in ready', 'Minor updates needed', 'Needs some work', 'Major renovation needed'] },
  { id: 'recent_updates', label: 'Recent Updates / Renovations', type: 'textarea', section: 'Property Condition', required: false, enabled: true, placeholder: 'New roof 2023, remodeled kitchen...' },
  { id: 'known_issues',   label: 'Any Known Issues?',            type: 'textarea', section: 'Property Condition', required: false, enabled: true, placeholder: 'Pool pump needs replacing, AC is 15 years old...' },
  { id: 'features',       label: 'Best Features of Your Home',   type: 'textarea', section: 'Property Condition', required: false, enabled: true, placeholder: 'Sparkling pool, mountain views, RV gate, remodeled kitchen...' },
  // Logistics
  { id: 'occupancy',      label: 'Is the Home Currently Occupied?', type: 'select', section: 'Logistics',        required: false, enabled: true, options: ['Owner-occupied', 'Tenant-occupied', 'Vacant'] },
  { id: 'showing_flexibility', label: 'Showing Flexibility',      type: 'select',  section: 'Logistics',         required: false, enabled: true, options: ['Very flexible', 'Need 24hr notice', 'Restricted hours', 'Weekends only'] },
  { id: 'currently_listed', label: 'Is It Currently Listed?',     type: 'select',  section: 'Logistics',         required: false, enabled: true, options: ['No', 'Yes — with another agent', 'Yes — expired', 'For Sale By Owner'] },
  { id: 'listing_expires', label: 'If Listed, When Does It Expire?', type: 'date', section: 'Logistics',         required: false, enabled: false },
  // Additional
  { id: 'working_with_agent', label: 'Are You Currently Working with an Agent?', type: 'select', section: 'Additional', required: false, enabled: true, options: ['No', 'Yes — but not exclusively', 'Yes — signed agreement'] },
  { id: 'additional_notes', label: 'Anything Else I Should Know?', type: 'textarea', section: 'Additional',      required: false, enabled: true },
]

// ─── Default form configs ───
function createDefaultForm(formType) {
  return {
    id: crypto.randomUUID(),
    type: formType,
    name: formType === 'buyer' ? 'Buyer Intake Form' : 'Seller Intake Form',
    description: formType === 'buyer'
      ? "Let's find your dream home! Please fill out this quick form so I can start searching for properties that match your needs."
      : "Thinking about selling? Fill out this form so I can prepare a customized plan and market analysis for your property.",
    fields: formType === 'buyer' ? BUYER_FIELDS.map(f => ({ ...f })) : SELLER_FIELDS.map(f => ({ ...f })),
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
    thankYouMessage: formType === 'buyer'
      ? "Thank you! I've received your info and I'll be in touch soon with some properties I think you'll love."
      : "Thank you! I've received your property details and will prepare a personalized market analysis for you.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Form Preview ───
function FormPreview({ form }) {
  const sections = [...new Set(form.fields.filter(f => f.enabled).map(f => f.section))]
  const s = form.style

  return (
    <div className="if-preview" style={{ background: s.bgColor, fontFamily: s.fontFamily, color: s.textColor, borderRadius: s.borderRadius }}>
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
                  {f.type === 'select' ? (
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

// ─── Style Editor (collapsible) ───
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
  const [activeTab, setActiveTab] = useState('fields') // fields | style | settings

  const handleSave = () => {
    onSave({ ...draft, updatedAt: new Date().toISOString() })
  }

  const handleCopyLink = () => {
    // Placeholder — in production this would generate a real shareable URL
    const slug = draft.type + '-intake-' + draft.id.slice(0, 8)
    const url = `${window.location.origin}/form/${slug}`
    navigator.clipboard.writeText(url)
    alert('Link copied! (Note: public form hosting coming soon)')
  }

  return (
    <div className="if-builder">
      {/* Builder Header */}
      <div className="if-builder__header">
        <button className="if-builder__back" onClick={onBack}>← Back to Forms</button>
        <div className="if-builder__header-right">
          <Button size="sm" variant="secondary" onClick={handleCopyLink}>📋 Copy Link</Button>
          <Button size="sm" variant="primary" onClick={handleSave}>Save Form</Button>
        </div>
      </div>

      <div className="if-builder__workspace">
        {/* Left: Editor */}
        <div className="if-builder__editor">
          <div className="if-builder__tabs">
            {['fields', 'style', 'settings'].map(tab => (
              <button
                key={tab}
                className={`if-builder__tab ${activeTab === tab ? 'if-builder__tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'fields' ? '📝 Fields' : tab === 'style' ? '🎨 Style' : '⚙️ Settings'}
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
            </div>
          )}
        </div>

        {/* Right: Preview */}
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

// ─── Main Page ───
export default function IntakeForms() {
  const [forms, setForms] = useState(loadForms)
  const [editing, setEditing] = useState(null) // form object or null

  const createForm = (type) => {
    const form = createDefaultForm(type)
    const updated = [form, ...forms]
    setForms(updated)
    saveForms(updated)
    setEditing(form)
  }

  const saveForm = (updated) => {
    const newForms = forms.map(f => f.id === updated.id ? updated : f)
    setForms(newForms)
    saveForms(newForms)
    setEditing(null)
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

  if (editing) {
    return <FormBuilder form={editing} onSave={saveForm} onBack={() => setEditing(null)} />
  }

  const buyerForms = forms.filter(f => f.type === 'buyer')
  const sellerForms = forms.filter(f => f.type === 'seller')

  return (
    <div className="if-page">
      <SectionHeader
        title="Intake Forms"
        subtitle="Create buyer & seller intake forms to send to clients — collect their info automatically"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="md" onClick={() => createForm('buyer')}>+ Buyer Form</Button>
            <Button variant="primary" size="md" onClick={() => createForm('seller')}>+ Seller Form</Button>
          </div>
        }
      />

      {forms.length === 0 && (
        <Card className="if-empty">
          <div className="if-empty__content">
            <p className="if-empty__icon">📋</p>
            <h3 className="if-empty__title">No forms yet</h3>
            <p className="if-empty__text">Create a buyer or seller intake form to start collecting client info. Each form is fully customizable — choose which fields to include, adjust colors and fonts to match your brand, and send a link to your clients.</p>
            <div className="if-empty__actions">
              <Button variant="secondary" size="md" onClick={() => createForm('buyer')}>🏡 Create Buyer Form</Button>
              <Button variant="primary" size="md" onClick={() => createForm('seller')}>💰 Create Seller Form</Button>
            </div>
          </div>
        </Card>
      )}

      {buyerForms.length > 0 && (
        <div className="if-section">
          <h3 className="if-section__title">Buyer Intake Forms</h3>
          <div className="if-grid">
            {buyerForms.map(form => (
              <Card key={form.id} className="if-card" onClick={() => setEditing(form)}>
                <div className="if-card__header">
                  <Badge variant="info" size="sm">BUYER</Badge>
                  <div className="if-card__actions">
                    <button className="if-card__action" onClick={e => { e.stopPropagation(); duplicateForm(form) }} title="Duplicate">📄</button>
                    <button className="if-card__action if-card__action--danger" onClick={e => { e.stopPropagation(); deleteForm(form.id) }} title="Delete">🗑️</button>
                  </div>
                </div>
                <h4 className="if-card__name">{form.name}</h4>
                <p className="if-card__meta">{form.fields.filter(f => f.enabled).length} fields · Updated {new Date(form.updatedAt).toLocaleDateString()}</p>
                <div className="if-card__preview-stripe" style={{ background: form.style.accentColor }} />
              </Card>
            ))}
          </div>
        </div>
      )}

      {sellerForms.length > 0 && (
        <div className="if-section">
          <h3 className="if-section__title">Seller Intake Forms</h3>
          <div className="if-grid">
            {sellerForms.map(form => (
              <Card key={form.id} className="if-card" onClick={() => setEditing(form)}>
                <div className="if-card__header">
                  <Badge variant="warning" size="sm">SELLER</Badge>
                  <div className="if-card__actions">
                    <button className="if-card__action" onClick={e => { e.stopPropagation(); duplicateForm(form) }} title="Duplicate">📄</button>
                    <button className="if-card__action if-card__action--danger" onClick={e => { e.stopPropagation(); deleteForm(form.id) }} title="Delete">🗑️</button>
                  </div>
                </div>
                <h4 className="if-card__name">{form.name}</h4>
                <p className="if-card__meta">{form.fields.filter(f => f.enabled).length} fields · Updated {new Date(form.updatedAt).toLocaleDateString()}</p>
                <div className="if-card__preview-stripe" style={{ background: form.style.accentColor }} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

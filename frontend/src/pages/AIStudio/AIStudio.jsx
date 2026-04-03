import { useState, useCallback, useEffect } from 'react'
import { Button, Textarea, EmptyState, Select, SlidePanel } from '../../components/ui/index.jsx'
import { PropertyPicker } from '../../components/ui/PropertyPicker.jsx'
import supabase from '../../lib/supabase.js'
import './AIStudio.css'

/* ─── Design type presets for real estate marketing ─── */
const DESIGN_TYPES = [
  { id: 'just_listed',    label: 'Just Listed',           icon: '🏠', desc: 'Announce a new listing' },
  { id: 'just_sold',      label: 'Just Sold',             icon: '🎉', desc: 'Celebrate your closed deal' },
  { id: 'open_house',     label: 'Open House',            icon: '🚪', desc: 'Promote your open house' },
  { id: 'coming_soon',    label: 'Coming Soon',           icon: '🔜', desc: 'Tease a new listing' },
  { id: 'under_contract', label: 'Under Contract',        icon: '📝', desc: 'Share the good news' },
  { id: 'price_reduction',label: 'Price Reduction',       icon: '📉', desc: 'Announce a price drop' },
  { id: 'market_update',  label: 'Market Update',         icon: '📊', desc: 'Share local market stats' },
  { id: 'listing_pres',   label: 'Listing Presentation',  icon: '🎤', desc: 'Pitch deck for sellers' },
  { id: 'content',        label: 'Content / Social',      icon: '📸', desc: 'General social content' },
]

const FORMAT_OPTIONS = ['Carousel', 'Story', 'Flyer', 'Postcard', 'Presentation', 'Document', 'Post']

/* ─── Default template catalog (seeded on first load) ─── */
const DEFAULT_TEMPLATES = [
  { id: 'DAGkJyaPiMo', category: 'just_listed', label: 'Just Listed - Mailer',                    format: 'Postcard',  editUrl: 'https://www.canva.com/d/e4Ts2U_iEkV6s5W' },
  { id: 'DAGgvDc3uPY', category: 'just_listed', label: 'Just Listed - About the Area',            format: 'Carousel',  editUrl: 'https://www.canva.com/d/ABdGrrHgBurzIs2' },
  { id: 'DAGomOuv1mA', category: 'just_listed', label: 'Just Listed - Lifestyle Carousel',        format: 'Carousel',  editUrl: 'https://www.canva.com/d/qYMXdJm3mLoUIW-' },
  { id: 'DAGgvBMw6ek', category: 'just_listed', label: 'Just Listed - IG Stories 1',              format: 'Story',     editUrl: 'https://www.canva.com/d/MWPRiOiCuJXcnNk' },
  { id: 'DAGgvB7A9Ls', category: 'just_listed', label: 'Just Listed - IG Stories 2',              format: 'Story',     editUrl: 'https://www.canva.com/d/Uf83Nf4VQDVqoN8' },
  { id: 'DAGnFEAlb2E', category: 'just_listed', label: 'Listing Preview',                         format: 'Story',     editUrl: 'https://www.canva.com/d/elMIiRn3VK7A7jD' },
  { id: 'DAGnFCL6K3U', category: 'just_listed', label: 'Listing of the Week',                     format: 'Story',     editUrl: 'https://www.canva.com/d/e2geMdmPq2Lao-A' },
  { id: 'DAGkJ0AyZCo', category: 'coming_soon', label: 'Coming Soon - Postcard',                  format: 'Postcard',  editUrl: 'https://www.canva.com/d/UP8lskgpzH4n19M' },
  { id: 'DAGgvDdtPFI', category: 'under_contract', label: 'Under Contract - Stories',             format: 'Story',     editUrl: 'https://www.canva.com/d/g55pKjwXCrjSOfK' },
  { id: 'DAGpEEiXbdc', category: 'under_contract', label: 'Under Contract - Timeline',            format: 'Flyer',     editUrl: 'https://www.canva.com/d/CqaI4VFJi6Nmbcg' },
  { id: 'DAGgvEOVbSM', category: 'just_sold',   label: 'Just Sold - How We Did It',               format: 'Carousel',  editUrl: 'https://www.canva.com/d/Noh3GGIx0HbPuID' },
  { id: 'DAGgvGEN__Y', category: 'just_sold',   label: 'Just Sold - Story Time (Stories)',         format: 'Story',     editUrl: 'https://www.canva.com/d/cHfL_5Fu2Q-PabL' },
  { id: 'DAGgvFT0Qv0', category: 'just_sold',   label: 'Just Sold - Story Time (Carousel)',       format: 'Carousel',  editUrl: 'https://www.canva.com/d/1joxYSdWIvnZgbW' },
  { id: 'DAGgvDP4PE0', category: 'just_sold',   label: 'Just Sold - Strategy Story',              format: 'Carousel',  editUrl: 'https://www.canva.com/d/5JxrNbVANfnX9K1' },
  { id: 'DAGnKI6MXUQ', category: 'listing_pres', label: 'Listing Appointment - Market Report',    format: 'Presentation', editUrl: 'https://www.canva.com/d/aWD_emQd2eeVK1P' },
  { id: 'DAGgVFGW9iA', category: 'listing_pres', label: 'Comprehensive CMA',                     format: 'Document',  editUrl: 'https://www.canva.com/d/OPUT0bA9Fx6D49s' },
  { id: 'DAGnKPsPeQU', category: 'listing_pres', label: 'Single Page & Full CMA Report',         format: 'Document',  editUrl: 'https://www.canva.com/d/-Elh4ybf2SRDNXy' },
  { id: 'DAGnKBwjUa0', category: 'listing_pres', label: 'Pre-listing & On-market Schedule',      format: 'Flyer',     editUrl: 'https://www.canva.com/d/G7t08nP2FEpl8jl' },
  { id: 'DAGnKB5AnuA', category: 'listing_pres', label: 'Seller Concession Cheat Sheet',         format: 'Document',  editUrl: 'https://www.canva.com/d/EW07ymctpGtEN78' },
  { id: 'DAGnKHRJv3I', category: 'listing_pres', label: 'Weekly Seller Listing Update',          format: 'Flyer',     editUrl: 'https://www.canva.com/d/3a0V7NIXEMhetxP' },
  { id: 'DAHFZa5Oj9Q', category: 'listing_pres', label: 'Listing Booklet - Property Specific',   format: 'Document',  editUrl: 'https://www.canva.com/d/F7SeRXySIwp1efd' },
  { id: 'DAGgvDULZV4', category: 'content',     label: 'Active Listing - About the Area',         format: 'Carousel',  editUrl: 'https://www.canva.com/d/l-MCtmxLFEmded2' },
  { id: 'DAGgyrBIt3I', category: 'content',     label: 'Active Listing - Why You\'d Love This',   format: 'Carousel',  editUrl: 'https://www.canva.com/d/eWoItrnPnKZKifz' },
  { id: 'DAGgvP52pp0', category: 'content',     label: 'Active Listing - Area Expert',            format: 'Carousel',  editUrl: 'https://www.canva.com/d/Y5TuC0pc6-6usLn' },
  { id: 'DAGnFAeHDqs', category: 'content',     label: 'Day in the Life If I Lived At...',        format: 'Carousel',  editUrl: 'https://www.canva.com/d/6t2pnFDCHGFBSqY' },
  { id: 'DAGqTYdRBKY', category: 'content',     label: 'IG Stories Template Pack',                format: 'Story',     editUrl: 'https://www.canva.com/d/GVeMmBbIP_Kp9vo' },
  { id: 'DAGi8Vq8WcI', category: 'content',     label: 'Buyer Needs - Flyer',                    format: 'Flyer',     editUrl: 'https://www.canva.com/d/PVr2UTyZL4R3m86' },
  { id: 'DAGgVcbsX0I', category: 'content',     label: 'Recent Production - Flyer',              format: 'Flyer',     editUrl: 'https://www.canva.com/d/gRzIFwMzY5X8jvi' },
  { id: 'DAGjXdKS72w', category: 'market_update', label: 'The Monthly Edit',                     format: 'Document',  editUrl: 'https://www.canva.com/d/qJjHvqyn-7cYqb8' },
  { id: 'DAGnKJug-fs', category: 'market_update', label: 'New Construction Guide',               format: 'Document',  editUrl: 'https://www.canva.com/d/_7RaHEMoG7ImE6H' },
  { id: 'DAHEyXPSouU', category: 'open_house',  label: 'QR Code Sign In Sheet / Raffle',          format: 'Flyer',     editUrl: 'https://www.canva.com/d/wP3ATlYqoKj3X8M' },
]

const STORAGE_KEY = 'content-studio-templates'

function loadTemplates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return DEFAULT_TEMPLATES
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates))
}

/* ─── Fresh generation platform options ─── */
const FRESH_FORMATS = [
  { id: 'flyer',          label: 'Flyer' },
  { id: 'instagram_post', label: 'Instagram Post' },
  { id: 'facebook_post',  label: 'Facebook Post' },
  { id: 'your_story',     label: 'Instagram Story' },
  { id: 'postcard',       label: 'Postcard / Mailer' },
  { id: 'presentation',   label: 'Presentation' },
]

function buildPrompt(designType, property, clientName, customPrompt) {
  const preset = DESIGN_TYPES.find(d => d.id === designType)
  if (!preset) return customPrompt || ''

  const parts = [`Create a professional luxury real estate ${preset.label} design`]

  if (property) {
    parts.push(`for the property at ${property.address}`)
    if (property.city) parts.push(`in ${property.city}, AZ ${property.zip || ''}`.trim())
    if (property.price) parts.push(`listed at $${Number(property.price).toLocaleString()}`)
    const specs = [
      property.beds && `${property.beds} bedrooms`,
      property.baths && `${property.baths} bathrooms`,
      property.sqft && `${Number(property.sqft).toLocaleString()} sq ft`,
      property.year_built && `built in ${property.year_built}`,
      property.pool && 'pool',
    ].filter(Boolean)
    if (specs.length) parts.push(`featuring ${specs.join(', ')}`)
  }

  if (clientName?.trim()) {
    parts.push(`. Client: ${clientName.trim()}`)
  }

  parts.push('. Agent: Dana Massey. Use a modern, elegant aesthetic with clean typography and warm tones.')

  if (customPrompt?.trim()) {
    parts.push(`Additional instructions: ${customPrompt.trim()}`)
  }

  return parts.join(' ')
}

function formatDesignName(clientName, property, designLabel) {
  const client = clientName?.trim() || 'Client'
  const addr = property?.address || 'Property'
  return `${client}_${addr}-${designLabel}`
}

export default function AIStudio() {
  const [templates, setTemplates] = useState(loadTemplates)
  const [step, setStep] = useState('pick')
  const [selectedType, setSelectedType] = useState(null)
  const [method, setMethod] = useState(null)
  const [property, setProperty] = useState(null)
  const [clientName, setClientName] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [freshFormats, setFreshFormats] = useState([])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [savedDesigns, setSavedDesigns] = useState([])

  // Manage templates panel
  const [manageOpen, setManageOpen] = useState(false)
  const [manageFilter, setManageFilter] = useState('all')
  const [addForm, setAddForm] = useState({ label: '', editUrl: '', category: '', format: 'Carousel' })

  // Persist template changes
  useEffect(() => { saveTemplates(templates) }, [templates])

  const preset = DESIGN_TYPES.find(d => d.id === selectedType)
  const matchingTemplates = templates.filter(t => t.category === selectedType)

  const toggleFreshFormat = (id) => {
    setFreshFormats(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  /* ─── Template CRUD ─── */
  const removeTemplate = (id) => {
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  const addTemplate = () => {
    const { label, editUrl, category, format } = addForm
    if (!label.trim() || !editUrl.trim() || !category) return
    const id = 'custom_' + Date.now()
    setTemplates(prev => [...prev, { id, label: label.trim(), editUrl: editUrl.trim(), category, format }])
    setAddForm({ label: '', editUrl: '', category: '', format: 'Carousel' })
  }

  /* ─── Generate fresh designs ─── */
  const handleGenerate = useCallback(async () => {
    if (freshFormats.length === 0) {
      setError('Select at least one format to generate')
      return
    }
    setGenerating(true)
    setError(null)
    setResults([])

    const prompt = buildPrompt(selectedType, property, clientName, customPrompt)

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('canva-generate', {
        body: {
          prompt,
          design_types: freshFormats,
          brand_kit_id: null,
          property: property ? {
            address: property.address,
            city: property.city,
            price: property.price,
            beds: property.beds,
            baths: property.baths,
            sqft: property.sqft,
          } : null,
        },
      })
      if (fnErr) throw fnErr
      setResults(data?.results ?? [])
      setStep('results')
    } catch (e) {
      setError(e.message || 'Failed to generate designs. Check your Canva API connection.')
    } finally {
      setGenerating(false)
    }
  }, [selectedType, property, clientName, customPrompt, freshFormats])

  const handleSave = useCallback(async (result, candidateId) => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('canva-generate', {
        body: { action: 'save', job_id: result.job_id, candidate_id: candidateId },
      })
      if (fnErr) throw fnErr
      setSavedDesigns(prev => [...prev, { ...data, candidate_id: candidateId }])
    } catch (e) {
      setError(e.message || 'Failed to save design')
    }
  }, [])

  const handleReset = () => {
    setStep('pick')
    setSelectedType(null)
    setMethod(null)
    setProperty(null)
    setClientName('')
    setCustomPrompt('')
    setFreshFormats([])
    setResults([])
    setError(null)
    setSavedDesigns([])
  }

  const stepLabels = ['Choose Type', 'Property & Client', method === 'template' ? 'Pick Template' : 'Generate', 'Results']
  const stepKeys = ['pick', 'method', method === 'template' ? 'templates' : 'customize', 'results']

  // Filtered templates for manage panel
  const managedTemplates = manageFilter === 'all'
    ? templates
    : templates.filter(t => t.category === manageFilter)

  return (
    <div className="section-dash ai-studio">
      <div className="ai-studio__header">
        <div>
          <h2 className="ai-studio__title">Content Studio</h2>
          <p className="ai-studio__subtitle">Create marketing materials from your templates or generate fresh with Canva + your brand kit</p>
        </div>
        <div className="ai-studio__header-actions">
          <Button variant="ghost" size="sm" onClick={() => setManageOpen(true)}>
            Manage Templates ({templates.length})
          </Button>
          {step !== 'pick' && (
            <Button variant="ghost" size="sm" onClick={handleReset}>Start Over</Button>
          )}
        </div>
      </div>

      {/* ─── Step indicator ─── */}
      <div className="ai-studio__steps">
        {stepLabels.map((s, i) => {
          const currentIdx = stepKeys.indexOf(step)
          const isActive = i === currentIdx
          const isDone = currentIdx > i
          return (
            <div key={s} className={`ai-studio__step ${isActive ? 'ai-studio__step--active' : ''} ${isDone ? 'ai-studio__step--done' : ''}`}>
              <span className="ai-studio__step-num">{isDone ? '✓' : i + 1}</span>
              <span className="ai-studio__step-label">{s}</span>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="ai-studio__error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* ═══════ STEP 1: Pick design type ═══════ */}
      {step === 'pick' && (
        <div className="ai-studio__grid">
          {DESIGN_TYPES.map(dt => {
            const tplCount = templates.filter(t => t.category === dt.id).length
            return (
              <button
                key={dt.id}
                className={`ai-studio__type-card ${selectedType === dt.id ? 'ai-studio__type-card--selected' : ''}`}
                onClick={() => { setSelectedType(dt.id); setStep('method') }}
              >
                <span className="ai-studio__type-icon">{dt.icon}</span>
                <span className="ai-studio__type-label">{dt.label}</span>
                <span className="ai-studio__type-desc">{dt.desc}</span>
                {tplCount > 0 && (
                  <span className="ai-studio__type-tpl-count">{tplCount} template{tplCount > 1 ? 's' : ''}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* ═══════ STEP 2: Property, client, and method ═══════ */}
      {step === 'method' && preset && (
        <div className="ai-studio__customize">
          <div className="ai-studio__customize-header">
            <span className="ai-studio__customize-icon">{preset.icon}</span>
            <div>
              <h3 className="ai-studio__customize-title">{preset.label}</h3>
              <p className="ai-studio__customize-desc">{preset.desc}</p>
            </div>
          </div>

          <div className="ai-studio__form">
            <div className="ai-studio__field">
              <label className="field__label" htmlFor="client-name">Client Name</label>
              <input id="client-name" className="field__input" type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Don Neves" />
            </div>

            <div className="ai-studio__field">
              <label className="field__label">Link a Property</label>
              {property ? (
                <div className="ai-studio__selected-property">
                  <div>
                    <strong>{property.address}</strong>
                    <span className="ai-studio__property-meta">
                      {[property.city && `${property.city}, AZ`, property.price && `$${Number(property.price).toLocaleString()}`, property.beds && `${property.beds}bd`, property.baths && `${property.baths}ba`, property.sqft && `${Number(property.sqft).toLocaleString()}sf`].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <button className="ai-studio__remove-prop" onClick={() => setProperty(null)}>Remove</button>
                </div>
              ) : (
                <PropertyPicker onSelect={setProperty} placeholder="Choose a property to auto-fill details..." />
              )}
            </div>

            <div className="ai-studio__field">
              <label className="field__label">How do you want to create?</label>
              <div className="ai-studio__method-choice">
                <button className={`ai-studio__method-btn ${method === 'template' ? 'ai-studio__method-btn--active' : ''}`} onClick={() => setMethod('template')} disabled={matchingTemplates.length === 0}>
                  <span className="ai-studio__method-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
                  </span>
                  <span className="ai-studio__method-label">Use My Template</span>
                  <span className="ai-studio__method-desc">{matchingTemplates.length > 0 ? `${matchingTemplates.length} template${matchingTemplates.length > 1 ? 's' : ''} available` : 'No templates for this type'}</span>
                </button>
                <button className={`ai-studio__method-btn ${method === 'fresh' ? 'ai-studio__method-btn--active' : ''}`} onClick={() => setMethod('fresh')}>
                  <span className="ai-studio__method-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z"/></svg>
                  </span>
                  <span className="ai-studio__method-label">Generate Fresh</span>
                  <span className="ai-studio__method-desc">AI-generated with your brand kit</span>
                </button>
              </div>
            </div>

            <div className="ai-studio__actions">
              <Button variant="ghost" onClick={() => { setStep('pick'); setSelectedType(null); setMethod(null) }}>Back</Button>
              <Button disabled={!method} onClick={() => setStep(method === 'template' ? 'templates' : 'customize')}>Continue</Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ STEP 3a: Template picker ═══════ */}
      {step === 'templates' && preset && (
        <div className="ai-studio__customize">
          <div className="ai-studio__customize-header">
            <span className="ai-studio__customize-icon">{preset.icon}</span>
            <div>
              <h3 className="ai-studio__customize-title">Pick a Template</h3>
              <p className="ai-studio__customize-desc">
                {clientName && property ? `Will be named: ${formatDesignName(clientName, property, '[Template Name]')}` : 'Select a template to duplicate and customize'}
              </p>
            </div>
          </div>

          <div className="ai-studio__template-list">
            {matchingTemplates.map(tpl => (
              <div key={tpl.id} className="ai-studio__template-row">
                <a href={tpl.editUrl} target="_blank" rel="noopener noreferrer" className="ai-studio__template-link">
                  <div className="ai-studio__template-info">
                    <span className="ai-studio__template-name">{tpl.label}</span>
                    <span className="ai-studio__template-format">{tpl.format}</span>
                  </div>
                  <span className="ai-studio__template-open">
                    Open in Canva
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </span>
                </a>
              </div>
            ))}
          </div>

          {clientName && property && (
            <div className="ai-studio__naming-hint">
              Naming convention: <strong>{formatDesignName(clientName, property, preset.label)}</strong>
            </div>
          )}

          <div className="ai-studio__actions">
            <Button variant="ghost" onClick={() => setStep('method')}>Back</Button>
          </div>
        </div>
      )}

      {/* ═══════ STEP 3b: Fresh generation ═══════ */}
      {step === 'customize' && preset && (
        <div className="ai-studio__customize">
          <div className="ai-studio__customize-header">
            <span className="ai-studio__customize-icon">{preset.icon}</span>
            <div>
              <h3 className="ai-studio__customize-title">Generate Fresh — {preset.label}</h3>
              <p className="ai-studio__customize-desc">AI will create new designs using your Dana Massey brand kit</p>
            </div>
          </div>
          <div className="ai-studio__form">
            <div className="ai-studio__field">
              <label className="field__label">Select Formats</label>
              <div className="ai-studio__batch-options">
                {FRESH_FORMATS.map(fmt => (
                  <label key={fmt.id} className={`ai-studio__batch-chip ${freshFormats.includes(fmt.id) ? 'ai-studio__batch-chip--on' : ''}`}>
                    <input type="checkbox" checked={freshFormats.includes(fmt.id)} onChange={() => toggleFreshFormat(fmt.id)} />
                    {fmt.label}
                  </label>
                ))}
              </div>
            </div>
            <Textarea label="Additional Instructions (optional)" id="custom-prompt" placeholder="e.g. Use a warm sunset background, highlight the pool..." value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} rows={3} />
            <div className="ai-studio__preview-prompt">
              <span className="field__label">Prompt Preview</span>
              <p className="ai-studio__prompt-text">{buildPrompt(selectedType, property, clientName, customPrompt)}</p>
            </div>
            {clientName && property && (
              <div className="ai-studio__naming-hint">Designs will be named: <strong>{formatDesignName(clientName, property, preset.label + ' [Format]')}</strong></div>
            )}
            <div className="ai-studio__actions">
              <Button variant="ghost" onClick={() => setStep('method')}>Back</Button>
              <Button onClick={handleGenerate} disabled={generating || freshFormats.length === 0}>
                {generating ? 'Generating...' : `Generate ${freshFormats.length} Design${freshFormats.length !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </div>
      )}

      {generating && (
        <div className="ai-studio__generating">
          <div className="ai-studio__spinner" />
          <p>Creating your designs with Canva...</p>
          <p className="ai-studio__gen-sub">This typically takes 15–30 seconds per format</p>
        </div>
      )}

      {/* ═══════ STEP 4: Results ═══════ */}
      {step === 'results' && !generating && (
        <div className="ai-studio__results">
          {results.length === 0 ? (
            <EmptyState title="No Results" description="No design candidates were returned. Try adjusting your prompt." action={<Button onClick={() => setStep('customize')}>Try Again</Button>} />
          ) : (
            results.map((result, ri) => (
              <div key={ri} className="ai-studio__result-group">
                {result.design_type && <h3 className="ai-studio__result-type">{FRESH_FORMATS.find(f => f.id === result.design_type)?.label || result.design_type}</h3>}
                <div className="ai-studio__candidates">
                  {(result.candidates ?? []).map((cand, ci) => {
                    const isSaved = savedDesigns.some(s => s.candidate_id === cand.id)
                    return (
                      <div key={ci} className="ai-studio__candidate">
                        {cand.thumbnail_url ? <img src={cand.thumbnail_url} alt={`Candidate ${ci + 1}`} className="ai-studio__candidate-img" /> : <div className="ai-studio__candidate-placeholder">Preview not available</div>}
                        <div className="ai-studio__candidate-actions">
                          {cand.preview_url && <a href={cand.preview_url} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">Preview in Canva</a>}
                          <Button size="sm" variant={isSaved ? 'ghost' : 'primary'} disabled={isSaved} onClick={() => handleSave(result, cand.id)}>{isSaved ? 'Saved' : 'Save to Canva'}</Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
          <div className="ai-studio__results-footer">
            <Button variant="ghost" onClick={() => setStep('customize')}>Regenerate</Button>
            <Button variant="ghost" onClick={handleReset}>New Design</Button>
          </div>
        </div>
      )}

      {/* ═══════ Manage Templates Panel ═══════ */}
      <SlidePanel open={manageOpen} onClose={() => setManageOpen(false)} title="Manage Templates" subtitle={`${templates.length} templates`} width={520}>
        {/* Filter tabs */}
        <div className="ai-studio__manage-tabs">
          <button className={`ai-studio__manage-tab ${manageFilter === 'all' ? 'ai-studio__manage-tab--active' : ''}`} onClick={() => setManageFilter('all')}>
            All ({templates.length})
          </button>
          {DESIGN_TYPES.map(dt => {
            const count = templates.filter(t => t.category === dt.id).length
            if (count === 0) return null
            return (
              <button key={dt.id} className={`ai-studio__manage-tab ${manageFilter === dt.id ? 'ai-studio__manage-tab--active' : ''}`} onClick={() => setManageFilter(dt.id)}>
                {dt.icon} {dt.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Template list */}
        <div className="ai-studio__manage-list">
          {managedTemplates.map(tpl => {
            const cat = DESIGN_TYPES.find(d => d.id === tpl.category)
            return (
              <div key={tpl.id} className="ai-studio__manage-row">
                <a href={tpl.editUrl} target="_blank" rel="noopener noreferrer" className="ai-studio__manage-link">
                  <span className="ai-studio__manage-name">{tpl.label}</span>
                  <span className="ai-studio__manage-meta">{tpl.format} {cat ? `· ${cat.label}` : ''}</span>
                </a>
                <button className="ai-studio__manage-remove" onClick={() => removeTemplate(tpl.id)} title="Remove template">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )
          })}
        </div>

        {/* Add new template */}
        <div className="ai-studio__manage-add">
          <h4 className="ai-studio__manage-add-title">Add a Template</h4>
          <div className="ai-studio__manage-add-form">
            <input className="field__input" type="text" placeholder="Template name" value={addForm.label} onChange={e => setAddForm(prev => ({ ...prev, label: e.target.value }))} />
            <input className="field__input" type="url" placeholder="Canva URL (edit link)" value={addForm.editUrl} onChange={e => setAddForm(prev => ({ ...prev, editUrl: e.target.value }))} />
            <div className="ai-studio__manage-add-row">
              <select className="field__input field__select" value={addForm.category} onChange={e => setAddForm(prev => ({ ...prev, category: e.target.value }))}>
                <option value="">Category...</option>
                {DESIGN_TYPES.map(dt => <option key={dt.id} value={dt.id}>{dt.label}</option>)}
              </select>
              <select className="field__input field__select" value={addForm.format} onChange={e => setAddForm(prev => ({ ...prev, format: e.target.value }))}>
                {FORMAT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <Button size="sm" onClick={addTemplate} disabled={!addForm.label.trim() || !addForm.editUrl.trim() || !addForm.category}>
              Add Template
            </Button>
          </div>
        </div>
      </SlidePanel>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { Button, Select, Textarea, EmptyState } from '../../components/ui/index.jsx'
import { PropertyPicker } from '../../components/ui/PropertyPicker.jsx'
import { useProperties } from '../../lib/hooks.js'
import supabase from '../../lib/supabase.js'
import './AIStudio.css'

/* ─── Design type presets for real estate marketing ─── */
const DESIGN_TYPES = [
  { id: 'just_listed_flyer',   label: 'Just Listed Flyer',      canvaType: 'flyer',          icon: '🏠', desc: 'Print-ready listing flyer' },
  { id: 'just_sold_flyer',     label: 'Just Sold Flyer',        canvaType: 'flyer',          icon: '🎉', desc: 'Celebrate your closed deal' },
  { id: 'open_house_flyer',    label: 'Open House Flyer',       canvaType: 'flyer',          icon: '🚪', desc: 'Promote your open house event' },
  { id: 'ig_post',             label: 'Instagram Post',         canvaType: 'instagram_post', icon: '📸', desc: 'Square post for Instagram' },
  { id: 'fb_post',             label: 'Facebook Post',          canvaType: 'facebook_post',  icon: '📘', desc: 'Optimized for Facebook feed' },
  { id: 'ig_story',            label: 'Instagram Story',        canvaType: 'your_story',     icon: '📱', desc: 'Vertical story format' },
  { id: 'postcard',            label: 'Postcard',               canvaType: 'postcard',       icon: '✉️',  desc: 'Direct mail postcard' },
  { id: 'price_reduction',     label: 'Price Reduction',        canvaType: 'instagram_post', icon: '📉', desc: 'Announce a price drop' },
  { id: 'market_update',       label: 'Market Update',          canvaType: 'instagram_post', icon: '📊', desc: 'Share local market stats' },
  { id: 'listing_pres',        label: 'Listing Presentation',   canvaType: 'presentation',   icon: '🎤', desc: 'Pitch deck for seller meetings' },
]

/* ─── Batch platform options ─── */
const BATCH_PLATFORMS = [
  { id: 'instagram_post', label: 'Instagram Post' },
  { id: 'facebook_post',  label: 'Facebook Post' },
  { id: 'your_story',     label: 'Story' },
  { id: 'flyer',          label: 'Flyer' },
  { id: 'postcard',       label: 'Postcard' },
]

function buildPrompt(designType, property, customPrompt) {
  const preset = DESIGN_TYPES.find(d => d.id === designType)
  if (!preset) return customPrompt || ''

  const parts = [`Create a professional real estate ${preset.label}`]

  if (property) {
    parts.push(`for the property at ${property.address}`)
    if (property.city) parts.push(`in ${property.city}, AZ`)
    if (property.price) parts.push(`listed at $${Number(property.price).toLocaleString()}`)
    const specs = [
      property.bedrooms && `${property.bedrooms} bedrooms`,
      property.bathrooms && `${property.bathrooms} bathrooms`,
      property.sqft && `${Number(property.sqft).toLocaleString()} sq ft`,
      property.year_built && `built in ${property.year_built}`,
    ].filter(Boolean)
    if (specs.length) parts.push(`featuring ${specs.join(', ')}`)
  }

  parts.push('. Use a luxury, modern aesthetic with clean typography.')

  if (customPrompt?.trim()) {
    parts.push(`Additional instructions: ${customPrompt.trim()}`)
  }

  return parts.join(' ')
}

export default function AIStudio() {
  const [step, setStep] = useState('pick')        // pick → customize → generate → results
  const [selectedType, setSelectedType] = useState(null)
  const [property, setProperty] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [batchMode, setBatchMode] = useState(false)
  const [batchPlatforms, setBatchPlatforms] = useState([])
  const [generating, setGenerating] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)
  const [savedDesigns, setSavedDesigns] = useState([])

  const preset = DESIGN_TYPES.find(d => d.id === selectedType)

  const toggleBatchPlatform = (id) => {
    setBatchPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  /* ─── Generate via Supabase Edge Function ─── */
  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    setResults([])

    const prompt = buildPrompt(selectedType, property, customPrompt)
    const types = batchMode && batchPlatforms.length > 0
      ? batchPlatforms
      : [preset.canvaType]

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('canva-generate', {
        body: {
          prompt,
          design_types: types,
          brand_kit_id: null, // auto-detect
          property: property ? {
            address: property.address,
            city: property.city,
            price: property.price,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
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
  }, [selectedType, property, customPrompt, batchMode, batchPlatforms, preset])

  /* ─── Save a design candidate ─── */
  const handleSave = useCallback(async (result, candidateId) => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('canva-generate', {
        body: {
          action: 'save',
          job_id: result.job_id,
          candidate_id: candidateId,
        },
      })
      if (fnErr) throw fnErr
      setSavedDesigns(prev => [...prev, { ...data, candidate_id: candidateId }])
    } catch (e) {
      setError(e.message || 'Failed to save design')
    }
  }, [])

  /* ─── Reset to start ─── */
  const handleReset = () => {
    setStep('pick')
    setSelectedType(null)
    setProperty(null)
    setCustomPrompt('')
    setBatchMode(false)
    setBatchPlatforms([])
    setResults([])
    setError(null)
    setSavedDesigns([])
  }

  return (
    <div className="section-dash ai-studio">
      <div className="ai-studio__header">
        <div>
          <h2 className="ai-studio__title">AI Studio</h2>
          <p className="ai-studio__subtitle">Generate marketing materials with Canva + your brand kit</p>
        </div>
        {step !== 'pick' && (
          <Button variant="ghost" onClick={handleReset}>Start Over</Button>
        )}
      </div>

      {/* ─── Step indicator ─── */}
      <div className="ai-studio__steps">
        {['Choose Type', 'Customize', 'Results'].map((s, i) => {
          const stepKeys = ['pick', 'customize', 'results']
          const isActive = stepKeys[i] === step
          const isDone = stepKeys.indexOf(step) > i
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

      {/* ─── STEP 1: Pick design type ─── */}
      {step === 'pick' && (
        <div className="ai-studio__grid">
          {DESIGN_TYPES.map(dt => (
            <button
              key={dt.id}
              className={`ai-studio__type-card ${selectedType === dt.id ? 'ai-studio__type-card--selected' : ''}`}
              onClick={() => {
                setSelectedType(dt.id)
                setStep('customize')
              }}
            >
              <span className="ai-studio__type-icon">{dt.icon}</span>
              <span className="ai-studio__type-label">{dt.label}</span>
              <span className="ai-studio__type-desc">{dt.desc}</span>
            </button>
          ))}
        </div>
      )}

      {/* ─── STEP 2: Customize ─── */}
      {step === 'customize' && preset && (
        <div className="ai-studio__customize">
          <div className="ai-studio__customize-header">
            <span className="ai-studio__customize-icon">{preset.icon}</span>
            <div>
              <h3 className="ai-studio__customize-title">{preset.label}</h3>
              <p className="ai-studio__customize-desc">{preset.desc}</p>
            </div>
          </div>

          <div className="ai-studio__form">
            {/* Property picker */}
            <div className="ai-studio__field">
              <label className="field__label">Link a Property (optional)</label>
              {property ? (
                <div className="ai-studio__selected-property">
                  <div>
                    <strong>{property.address}</strong>
                    <span className="ai-studio__property-meta">
                      {[
                        property.city && `${property.city}, AZ`,
                        property.price && `$${Number(property.price).toLocaleString()}`,
                        property.bedrooms && `${property.bedrooms}bd`,
                        property.bathrooms && `${property.bathrooms}ba`,
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <button className="ai-studio__remove-prop" onClick={() => setProperty(null)}>Remove</button>
                </div>
              ) : (
                <PropertyPicker
                  onSelect={setProperty}
                  placeholder="Choose a property to auto-fill details..."
                />
              )}
            </div>

            {/* Custom prompt */}
            <Textarea
              label="Additional Instructions"
              id="custom-prompt"
              placeholder="e.g. Use a warm sunset background, highlight the pool, emphasize luxury living..."
              value={customPrompt}
              onChange={e => setCustomPrompt(e.target.value)}
              rows={3}
            />

            {/* Batch mode */}
            <div className="ai-studio__field">
              <label className="ai-studio__batch-toggle">
                <input
                  type="checkbox"
                  checked={batchMode}
                  onChange={e => setBatchMode(e.target.checked)}
                />
                <span>Generate for multiple platforms at once</span>
              </label>
              {batchMode && (
                <div className="ai-studio__batch-options">
                  {BATCH_PLATFORMS.map(bp => (
                    <label key={bp.id} className={`ai-studio__batch-chip ${batchPlatforms.includes(bp.id) ? 'ai-studio__batch-chip--on' : ''}`}>
                      <input
                        type="checkbox"
                        checked={batchPlatforms.includes(bp.id)}
                        onChange={() => toggleBatchPlatform(bp.id)}
                      />
                      {bp.label}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Preview prompt */}
            <div className="ai-studio__preview-prompt">
              <span className="field__label">Prompt Preview</span>
              <p className="ai-studio__prompt-text">
                {buildPrompt(selectedType, property, customPrompt)}
              </p>
            </div>

            <div className="ai-studio__actions">
              <Button variant="ghost" onClick={() => { setStep('pick'); setSelectedType(null) }}>
                Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Generating...' : 'Generate Designs'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Generating spinner ─── */}
      {generating && (
        <div className="ai-studio__generating">
          <div className="ai-studio__spinner" />
          <p>Creating your designs with Canva...</p>
          <p className="ai-studio__gen-sub">This typically takes 15–30 seconds</p>
        </div>
      )}

      {/* ─── STEP 3: Results ─── */}
      {step === 'results' && !generating && (
        <div className="ai-studio__results">
          {results.length === 0 ? (
            <EmptyState
              title="No Results"
              description="No design candidates were returned. Try adjusting your prompt or property details."
              action={<Button onClick={() => setStep('customize')}>Try Again</Button>}
            />
          ) : (
            results.map((result, ri) => (
              <div key={ri} className="ai-studio__result-group">
                {result.design_type && (
                  <h3 className="ai-studio__result-type">
                    {BATCH_PLATFORMS.find(bp => bp.id === result.design_type)?.label || result.design_type}
                  </h3>
                )}
                <div className="ai-studio__candidates">
                  {(result.candidates ?? []).map((cand, ci) => {
                    const isSaved = savedDesigns.some(s => s.candidate_id === cand.id)
                    return (
                      <div key={ci} className="ai-studio__candidate">
                        {cand.thumbnail_url ? (
                          <img
                            src={cand.thumbnail_url}
                            alt={`Design candidate ${ci + 1}`}
                            className="ai-studio__candidate-img"
                          />
                        ) : (
                          <div className="ai-studio__candidate-placeholder">
                            Preview not available
                          </div>
                        )}
                        <div className="ai-studio__candidate-actions">
                          {cand.preview_url && (
                            <a
                              href={cand.preview_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn--ghost btn--sm"
                            >
                              Preview in Canva
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant={isSaved ? 'ghost' : 'primary'}
                            disabled={isSaved}
                            onClick={() => handleSave(result, cand.id)}
                          >
                            {isSaved ? 'Saved' : 'Save to Canva'}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}

          <div className="ai-studio__results-footer">
            <Button variant="ghost" onClick={() => setStep('customize')}>
              Regenerate
            </Button>
            <Button variant="ghost" onClick={handleReset}>
              New Design
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

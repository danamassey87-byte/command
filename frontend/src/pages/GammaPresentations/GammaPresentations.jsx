import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Select, Textarea, Badge } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import './GammaPresentations.css'

const PRES_TYPES = [
  { value: 'listing',          label: 'Listing Presentation',   icon: '🏠' },
  { value: 'buyer_consult',    label: 'Buyer Consultation',     icon: '🤝' },
  { value: 'cma',              label: 'CMA / Market Analysis',  icon: '📊' },
  { value: 'market_report',    label: 'Market Report',          icon: '📈' },
  { value: 'open_house_recap', label: 'Open House Recap',       icon: '🏡' },
  { value: 'custom',           label: 'Custom Presentation',    icon: '✨' },
]

const TYPE_LABELS = Object.fromEntries(PRES_TYPES.map(t => [t.value, t.label]))
const TYPE_ICONS  = Object.fromEntries(PRES_TYPES.map(t => [t.value, t.icon]))

export default function GammaPresentations() {
  const [tab, setTab] = useState('gallery')          // gallery | create
  const [presentations, setPresentations] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')
  const [gammaConfigured, setGammaConfigured] = useState(null) // null = loading, true/false

  // ─── New presentation form state ───
  const [formType, setFormType] = useState('listing')
  const [formListingId, setFormListingId] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formStrategy, setFormStrategy] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)

  useEffect(() => {
    loadData()
    checkGammaConfig()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [presRes, listRes] = await Promise.all([
        DB.getGammaPresentations(),
        DB.getListings(),
      ])
      setPresentations(presRes.data || [])
      setListings(listRes.data || [])
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function checkGammaConfig() {
    try {
      const { data } = await DB.getGammaConfig()
      setGammaConfigured(!!(data?.value?.api_key))
    } catch {
      setGammaConfigured(false)
    }
  }

  const filtered = useMemo(() => {
    if (filterType === 'all') return presentations
    return presentations.filter(p => p.presentation_type === filterType)
  }, [presentations, filterType])

  async function handleGenerate() {
    if (!formTitle.trim()) return
    setGenerating(true)
    setGenResult(null)

    try {
      // Save record first
      const record = {
        title: formTitle.trim(),
        presentation_type: formType,
        listing_id: formListingId || null,
        strategy_text: formStrategy.trim() || null,
        status: 'generating',
      }
      const { data: saved } = await DB.createGammaPresentation(record)

      // If listing type, call the build-presentation edge function
      if (formListingId) {
        const result = await DB.buildPresentation(formListingId, formStrategy, [])
        if (result?.url) {
          await DB.updateGammaPresentation(saved.id, {
            gamma_url: result.url,
            gamma_generation_id: result.gamma_id,
            status: 'ready',
          })
          setGenResult({ ok: true, message: 'Presentation created!', url: result.url })
        } else if (result?.gamma_id) {
          await DB.updateGammaPresentation(saved.id, {
            gamma_generation_id: result.gamma_id,
            status: 'generating',
          })
          setGenResult({ ok: true, message: 'Generating... Gamma is building your presentation. Refresh in a minute.' })
        }
      } else {
        // Custom / non-listing — call edge function with just strategy text
        const result = await DB.buildGammaCustom(formTitle, formStrategy, formType)
        if (result?.url) {
          await DB.updateGammaPresentation(saved.id, {
            gamma_url: result.url,
            gamma_generation_id: result.gamma_id,
            status: 'ready',
          })
          setGenResult({ ok: true, message: 'Presentation created!', url: result.url })
        } else {
          await DB.updateGammaPresentation(saved.id, {
            gamma_generation_id: result?.gamma_id || null,
            status: result?.gamma_id ? 'generating' : 'failed',
          })
          setGenResult({ ok: !!result?.gamma_id, message: result?.gamma_id ? 'Generating... refresh in a minute.' : 'Generation failed — check your Gamma API key.' })
        }
      }

      // Reset form + reload
      setFormTitle('')
      setFormStrategy('')
      setFormListingId('')
      loadData()
    } catch (err) {
      setGenResult({ ok: false, message: err.message })
      // Mark as failed if we saved one
      loadData()
    } finally {
      setGenerating(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this presentation?')) return
    await DB.deleteGammaPresentation(id)
    setPresentations(prev => prev.filter(p => p.id !== id))
  }

  function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const selectedListing = listings.find(l => l.id === formListingId)

  return (
    <div className="gp-page">
      <div className="gp-header">
        <div>
          <h1 className="gp-header__title">Gamma Presentations</h1>
          <p className="gp-header__sub">AI-generated listing presentations, CMAs, and property websites</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link to="/content"><Button size="sm" variant="ghost">Back</Button></Link>
          <Button size="sm" onClick={() => setTab(tab === 'create' ? 'gallery' : 'create')}>
            {tab === 'create' ? 'View Gallery' : '+ New Presentation'}
          </Button>
        </div>
      </div>

      {/* Setup banner when Gamma not configured */}
      {gammaConfigured === false && (
        <div className="gp-setup-banner">
          <div className="gp-setup-banner__icon">🎯</div>
          <div className="gp-setup-banner__title">Connect Gamma Pro</div>
          <p className="gp-setup-banner__text">
            Gamma generates stunning AI presentations from your listing data — presentations, CMAs, market reports, and property websites in seconds.
          </p>
          <div className="gp-setup-banner__steps">
            <div className="gp-setup-banner__step">
              <span className="gp-setup-banner__num">1</span>
              <span>Sign up at <strong>gamma.app</strong> (Pro plan or higher)</span>
            </div>
            <div className="gp-setup-banner__step">
              <span className="gp-setup-banner__num">2</span>
              <span>Go to Account Settings → API Keys → Generate key</span>
            </div>
            <div className="gp-setup-banner__step">
              <span className="gp-setup-banner__num">3</span>
              <span>Paste your key in <Link to="/settings" style={{ color: 'var(--brown-dark)', fontWeight: 600 }}>Settings → Connected Accounts → Gamma</Link></span>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            You can still create presentation records below — they'll generate once you connect Gamma.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="gp-tabs">
        <button className={`gp-tab${tab === 'gallery' ? ' gp-tab--active' : ''}`} onClick={() => setTab('gallery')}>
          Gallery ({presentations.length})
        </button>
        <button className={`gp-tab${tab === 'create' ? ' gp-tab--active' : ''}`} onClick={() => setTab('create')}>
          Create New
        </button>
      </div>

      {/* ─── Create Tab ─── */}
      {tab === 'create' && (
        <div className="gp-form">
          <div className="gp-form__row">
            <div>
              <label className="gp-form__label">Presentation Type</label>
              <Select value={formType} onChange={e => setFormType(e.target.value)}>
                {PRES_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="gp-form__label">Link to Listing (optional)</label>
              <Select value={formListingId} onChange={e => {
                setFormListingId(e.target.value)
                if (e.target.value) {
                  const l = listings.find(x => x.id === e.target.value)
                  if (l) {
                    const addr = l.property?.address || l.address || ''
                    setFormTitle(`${addr} — ${TYPE_LABELS[formType] || 'Presentation'}`)
                  }
                }
              }}>
                <option value="">None — custom content</option>
                {listings.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.property?.address || l.address || l.client_name || 'Listing'} — {l.status || 'active'}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="gp-form__row gp-form__row--full">
            <div>
              <label className="gp-form__label">Title</label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. 1234 E Main St — Listing Presentation"
              />
            </div>
          </div>

          <div className="gp-form__row gp-form__row--full">
            <div>
              <label className="gp-form__label">Strategy / Content Notes</label>
              <Textarea
                value={formStrategy}
                onChange={e => setFormStrategy(e.target.value)}
                placeholder="Describe what this presentation should cover. For listings, include key selling points, neighborhood highlights, pricing strategy, etc. Claude will transform this into a polished slide outline before sending to Gamma."
                rows={5}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <Button onClick={handleGenerate} disabled={generating || !formTitle.trim()}>
              {generating ? 'Generating...' : '🎯 Generate with Gamma'}
            </Button>
            {!gammaConfigured && (
              <span style={{ fontSize: '0.78rem', color: '#b8860b' }}>
                Gamma not connected — presentation will be saved as draft
              </span>
            )}
          </div>

          {genResult && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: '0.82rem',
              background: genResult.ok ? '#e6f4ea' : '#fce8e6',
              color: genResult.ok ? '#137333' : '#c5221f',
            }}>
              {genResult.message}
              {genResult.url && (
                <a href={genResult.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, fontWeight: 600 }}>
                  Open in Gamma →
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Gallery Tab ─── */}
      {tab === 'gallery' && (
        <>
          {/* Type filters */}
          <div className="gp-filters">
            <button
              className={`gp-filter-chip${filterType === 'all' ? ' gp-filter-chip--active' : ''}`}
              onClick={() => setFilterType('all')}
            >All</button>
            {PRES_TYPES.map(t => (
              <button
                key={t.value}
                className={`gp-filter-chip${filterType === t.value ? ' gp-filter-chip--active' : ''}`}
                onClick={() => setFilterType(t.value)}
              >{t.icon} {t.label}</button>
            ))}
          </div>

          {loading ? (
            <div className="gp-empty">
              <p>Loading presentations...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="gp-empty">
              <div className="gp-empty__icon">🎯</div>
              <div className="gp-empty__title">No presentations yet</div>
              <p className="gp-empty__text">
                Create your first AI-generated presentation — listing decks, buyer consultations, CMAs, and more.
              </p>
              <Button size="sm" onClick={() => setTab('create')}>+ Create Presentation</Button>
            </div>
          ) : (
            <div className="gp-grid">
              {filtered.map(p => (
                <div key={p.id} className="gp-card">
                  <div className="gp-card__preview">
                    {TYPE_ICONS[p.presentation_type] || '📄'}
                    <span className={`gp-card__status gp-card__status--${p.status}`}>
                      {p.status}
                    </span>
                  </div>
                  <div className="gp-card__body">
                    <h3 className="gp-card__title">{p.title || 'Untitled'}</h3>
                    <p className="gp-card__meta">
                      <span className="gp-card__type">{TYPE_LABELS[p.presentation_type] || p.presentation_type}</span>
                      {formatDate(p.created_at)}
                    </p>
                    <div className="gp-card__actions">
                      {p.gamma_url && (
                        <a href={p.gamma_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm">Open in Gamma</Button>
                        </a>
                      )}
                      {p.gamma_edit_url && (
                        <a href={p.gamma_edit_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost">Edit</Button>
                        </a>
                      )}
                      {p.status === 'generating' && (
                        <Button size="sm" variant="ghost" onClick={loadData}>Refresh</Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} style={{ color: '#c5221f' }}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

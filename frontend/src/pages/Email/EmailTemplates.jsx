import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionHeader, Button, Badge } from '../../components/ui/index.jsx'
import { STARTER_TEMPLATES, BLOCK_PALETTE, fillSigBlock } from '../EmailBuilder/EmailBuilder'
import { useBrand } from '../../lib/BrandContext'
import './EmailTemplates.css'

const TEMPLATES_KEY = 'email_saved_templates'
const DRAFTS_KEY = 'email_builder_drafts'

function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY)) || [] } catch { return [] }
}
function saveTemplates(t) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)) }
function loadDrafts() {
  try { return JSON.parse(localStorage.getItem(DRAFTS_KEY)) || [] } catch { return [] }
}
function saveDrafts(d) { localStorage.setItem(DRAFTS_KEY, JSON.stringify(d)) }

const CATEGORY_COLORS = {
  NURTURE: '#6a9e72',
  LISTINGS: '#c99a2e',
  EVENTS: '#c0604a',
  AUTHORITY: 'var(--brown-mid)',
  CUSTOM: '#b79782',
}

export default function EmailTemplates() {
  const navigate = useNavigate()
  const { brand } = useBrand()
  const [savedTemplates, setSavedTemplates] = useState(loadTemplates)
  const [drafts, setDrafts] = useState(loadDrafts)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Refresh when localStorage may have changed
  useEffect(() => {
    const handler = () => {
      setSavedTemplates(loadTemplates())
      setDrafts(loadDrafts())
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [])

  const openTemplate = (template) => {
    // Navigate to builder with the template auto-loaded via query param
    // For saved (custom) templates, store in localStorage and open
    const sig = brand?.signature ?? {}
    const email = {
      draftId: crypto.randomUUID(),
      templateId: template.id,
      subject: template.subject,
      blocks: template.blocks.map(b => fillSigBlock({ ...b, id: crypto.randomUUID() }, sig)),
      createdAt: new Date().toISOString(),
    }
    // Push to drafts so EmailBuilder can load it
    const updated = [{ ...email, emailSettings: template.emailSettings || {}, updatedAt: new Date().toISOString() }, ...loadDrafts()]
    saveDrafts(updated)
    navigate('/email/builder')
  }

  const openStarterTemplate = (templateId) => {
    navigate(`/email/builder?template=${templateId}`)
  }

  const deleteTemplate = (id) => {
    const updated = savedTemplates.filter(t => t.id !== id)
    setSavedTemplates(updated)
    saveTemplates(updated)
  }

  const deleteDraft = (draftId) => {
    const updated = drafts.filter(d => d.draftId !== draftId)
    setDrafts(updated)
    saveDrafts(updated)
  }

  const duplicateTemplate = (tpl) => {
    const dup = {
      ...tpl,
      id: crypto.randomUUID(),
      name: `${tpl.name} (copy)`,
      createdAt: new Date().toISOString(),
    }
    const updated = [dup, ...savedTemplates]
    setSavedTemplates(updated)
    saveTemplates(updated)
  }

  // Filtering
  const allCategories = [...new Set([
    ...savedTemplates.map(t => t.category),
    ...STARTER_TEMPLATES.map(t => t.category),
  ])]

  const filterTemplates = (list) => {
    let filtered = list
    if (filter !== 'all') filtered = filtered.filter(t => t.category === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(t =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q)
      )
    }
    return filtered
  }

  const filteredSaved = filterTemplates(savedTemplates)
  const filteredStarter = filterTemplates(STARTER_TEMPLATES)

  return (
    <div className="email-templates">
      <SectionHeader
        title="Email Templates"
        subtitle="Your library of reusable email templates"
        actions={<Button onClick={() => navigate('/email/builder')}>+ New Email</Button>}
      />

      {/* Search + Filter bar */}
      <div className="et__toolbar">
        <input
          className="et__search"
          placeholder="Search templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="et__filters">
          <button className={`et__filter-btn ${filter === 'all' ? 'et__filter-btn--active' : ''}`} onClick={() => setFilter('all')}>
            All
          </button>
          {allCategories.map(cat => (
            <button
              key={cat}
              className={`et__filter-btn ${filter === cat ? 'et__filter-btn--active' : ''}`}
              onClick={() => setFilter(cat)}
              style={filter === cat ? { background: CATEGORY_COLORS[cat] || '#b79782', color: 'white' } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Drafts */}
      {drafts.length > 0 && (
        <div className="et__section">
          <h3 className="et__section-title">Drafts</h3>
          <div className="et__grid">
            {drafts.map(d => (
              <div key={d.draftId} className="et__card et__card--draft">
                <div className="et__card-top">
                  <Badge variant="warning" size="sm">Draft</Badge>
                  <span className="et__card-date">{new Date(d.updatedAt || d.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="et__card-name">{d.subject || 'Untitled draft'}</p>
                <p className="et__card-meta">{d.blocks?.length || 0} blocks</p>
                <div className="et__card-actions">
                  <Button size="sm" onClick={() => { navigate('/email/builder') }}>Edit</Button>
                  <button className="et__card-delete" onClick={() => deleteDraft(d.draftId)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Templates */}
      {filteredSaved.length > 0 && (
        <div className="et__section">
          <h3 className="et__section-title">My Templates</h3>
          <div className="et__grid">
            {filteredSaved.map(t => (
              <div key={t.id} className="et__card">
                <div className="et__card-top">
                  <span className="et__card-emoji">{t.emoji || '⭐'}</span>
                  <Badge size="sm" style={{ background: CATEGORY_COLORS[t.category] || '#b79782', color: 'white' }}>{t.category}</Badge>
                </div>
                <p className="et__card-name">{t.name}</p>
                <p className="et__card-subject">{t.subject || 'No subject'}</p>
                <p className="et__card-meta">{t.blocks?.length || 0} blocks · {new Date(t.createdAt).toLocaleDateString()}</p>
                <div className="et__card-actions">
                  <Button size="sm" onClick={() => openTemplate(t)}>Use</Button>
                  <button className="et__card-action" onClick={() => duplicateTemplate(t)}>Duplicate</button>
                  <button className="et__card-delete" onClick={() => deleteTemplate(t.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Starter Templates */}
      <div className="et__section">
        <h3 className="et__section-title">Starter Templates</h3>
        <p className="et__section-sub">Pre-built templates — pick one and customize it in the Email Builder</p>
        <div className="et__grid">
          {filteredStarter.map(t => (
            <div key={t.id} className="et__card et__card--starter" onClick={() => openStarterTemplate(t.id)}>
              <div className="et__card-top">
                <span className="et__card-emoji">{t.emoji}</span>
                <Badge size="sm" style={{ background: CATEGORY_COLORS[t.category] || '#b79782', color: 'white' }}>{t.category}</Badge>
              </div>
              <p className="et__card-name">{t.name}</p>
              <p className="et__card-subject">{t.subject}</p>
              <p className="et__card-meta">{t.blocks?.length || 0} blocks</p>
            </div>
          ))}
        </div>
      </div>

      {filteredSaved.length === 0 && filteredStarter.length === 0 && (
        <div className="et__empty">
          <p>No templates match your search.</p>
        </div>
      )}
    </div>
  )
}

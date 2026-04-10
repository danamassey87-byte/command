import { useState, useMemo, useCallback } from 'react'
import { SectionHeader, Badge, Card, SlidePanel, Input, Select, Textarea, EmptyState, TabBar } from '../../components/ui/index.jsx'
import { TagPicker, TagBadge, TagManager } from '../../components/ui/TagPicker.jsx'
import RelatedPeopleSection, { cleanRelatedPeople } from '../../components/related-people/RelatedPeopleSection.jsx'
import { useContactsWithTags, useTags, useListings } from '../../lib/hooks.js'
import { useNavigate } from 'react-router-dom'
import * as DB from '../../lib/supabase.js'
import './Database.css'

// Buyer stages that indicate an active buy-side engagement
const ACTIVE_BUYER_STAGES = new Set(['New Lead', 'Pre-Approval', 'Active Search', 'Showing', 'Under Contract'])

const TYPE_LABELS = {
  buyer: 'Buyer', seller: 'Seller', both: 'Buyer & Seller',
  investor: 'Investor', lead: 'Lead',
}
const TYPE_VARIANTS = {
  buyer: 'info', seller: 'accent', both: 'warning',
  investor: 'default', lead: 'default',
}

const SOURCE_LABELS = {
  expired: 'Expired', fsbo: 'FSBO', circle: 'Circle',
  soi: 'Personal Circle', referral: 'Referral', open_house: 'OH Lead',
  intake_form: 'Intake Form',
}

const MLS_STATUS_LABELS = {
  expired: 'Expired', relisted: 'Relisted', active: 'Active',
  sold: 'Sold', withdrawn: 'Withdrawn', cancelled: 'Cancelled',
}
const MLS_STATUS_COLORS = {
  expired: '#e74c3c', relisted: '#e67e22', active: '#27ae60',
  sold: '#8b7a68', withdrawn: '#95a5a6', cancelled: '#95a5a6',
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Database() {
  const { data: contacts, loading, refetch } = useContactsWithTags()
  const { data: allTags } = useTags()
  const { data: allListings } = useListings()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [selectedTags, setSelectedTags] = useState([]) // tag IDs to filter by
  const [tagMode, setTagMode] = useState('any') // 'any' or 'all'
  const [showManager, setShowManager] = useState(false)
  const [selected, setSelected] = useState(null) // contact being edited
  const [dualRolePicker, setDualRolePicker] = useState(null) // contact triggered by dual-role click
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('database') // 'database' | 'tags'
  const navigate = useNavigate()

  const tags = allTags ?? []
  const rows = contacts ?? []

  // Build a set of contact_ids that have at least one listing. Used for
  // dual-role detection — a contact with a listing AND a buyer-side stage
  // is effectively "both" even if their type column doesn't say so.
  const contactIdsWithListings = useMemo(() => {
    const set = new Set()
    for (const l of (allListings ?? [])) {
      if (l.contact_id) set.add(l.contact_id)
    }
    return set
  }, [allListings])

  // Returns true if this contact is effectively both a buyer and a seller.
  const isDualRole = (c) => {
    if (c.type === 'both') return true
    if (contactIdsWithListings.has(c.id)) {
      // They have a listing. Dual-role if they're also tracking as a buyer
      // (type=buyer OR in an active buyer stage).
      if (c.type === 'buyer') return true
      if (c.stage && ACTIVE_BUYER_STAGES.has(c.stage)) return true
    }
    return false
  }

  // Click handler that intercepts dual-role contacts and shows
  // a picker first. Single-role contacts go straight to the edit panel.
  const openContact = (c) => {
    if (isDualRole(c)) {
      setDualRolePicker(c)
    } else {
      setSelected(c)
    }
  }

  // Build contact list with flattened tags
  const enriched = useMemo(() =>
    rows.map(c => ({
      ...c,
      tags: (c.contact_tags ?? []).map(ct => ct.tag).filter(Boolean),
    })),
    [rows]
  )

  // Filter
  const filtered = useMemo(() => {
    let list = enriched

    if (search) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        (c.name ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q)
      )
    }

    if (typeFilter !== 'all') {
      list = list.filter(c => c.type === typeFilter)
    }

    if (sourceFilter !== 'all') {
      list = list.filter(c => c.lead_source === sourceFilter)
    }

    if (selectedTags.length > 0) {
      list = list.filter(c => {
        const cTagIds = new Set(c.tags.map(t => t.id))
        return tagMode === 'any'
          ? selectedTags.some(id => cTagIds.has(id))
          : selectedTags.every(id => cTagIds.has(id))
      })
    }

    return list
  }, [enriched, search, typeFilter, sourceFilter, selectedTags, tagMode])

  // Tag filter toggle
  const toggleTagFilter = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  // Contact tag update (inline)
  const handleTagsChange = useCallback((contactId, newTags) => {
    refetch()
  }, [refetch])

  // Quick add tag to contact from table
  const handleQuickTag = async (contactId, tagId) => {
    await DB.addContactTag(contactId, tagId)
    refetch()
  }

  // Group tags by category for filter sidebar
  const tagsByCategory = useMemo(() => {
    const grouped = {}
    tags.forEach(t => {
      const cat = t.category || 'custom'
      if (!grouped[cat]) grouped[cat] = []
      grouped[cat].push(t)
    })
    return grouped
  }, [tags])

  const CATEGORY_LABELS = {
    status: 'Status', pipeline: 'Pipeline', relationship: 'Relationship',
    email: 'Email', interest: 'Interest', priority: 'Priority', custom: 'Custom',
  }

  return (
    <div className="database-page">
      <SectionHeader
        title="Contact Database"
        subtitle={`${filtered.length} of ${enriched.length} contacts`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`db-tab-btn ${tab === 'database' ? 'db-tab-btn--active' : ''}`}
              onClick={() => setTab('database')}
            >Database</button>
            <button
              className={`db-tab-btn ${tab === 'tags' ? 'db-tab-btn--active' : ''}`}
              onClick={() => setTab('tags')}
            >Manage Tags</button>
          </div>
        }
      />

      {tab === 'tags' ? (
        <TagManager onClose={() => setTab('database')} />
      ) : (
        <div className="database-layout">
          {/* ─── Tag Filter Sidebar ─── */}
          <aside className="db-sidebar">
            <div className="db-sidebar__section">
              <div className="db-sidebar__label">Filter by Type</div>
              <select
                className="db-sidebar__select"
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="buyer">Buyers</option>
                <option value="seller">Sellers</option>
                <option value="both">Buyer & Seller</option>
                <option value="investor">Investors</option>
                <option value="lead">Leads</option>
              </select>
            </div>

            <div className="db-sidebar__section">
              <div className="db-sidebar__label">Filter by Source</div>
              <select
                className="db-sidebar__select"
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
              >
                <option value="all">All Sources</option>
                <option value="expired">Expired Listings</option>
                <option value="fsbo">FSBO</option>
                <option value="circle">Circle Prospecting</option>
                <option value="soi">Personal Circle</option>
                <option value="referral">Referral</option>
                <option value="open_house">Open House Leads</option>
                <option value="intake_form">Intake Forms</option>
              </select>
            </div>

            <div className="db-sidebar__section">
              <div className="db-sidebar__label">
                Filter by Tags
                {selectedTags.length > 0 && (
                  <button className="db-sidebar__clear" onClick={() => setSelectedTags([])}>Clear</button>
                )}
              </div>
              <div className="db-sidebar__tag-mode">
                <button
                  className={`db-mode-btn ${tagMode === 'any' ? 'db-mode-btn--active' : ''}`}
                  onClick={() => setTagMode('any')}
                >Any</button>
                <button
                  className={`db-mode-btn ${tagMode === 'all' ? 'db-mode-btn--active' : ''}`}
                  onClick={() => setTagMode('all')}
                >All</button>
              </div>
              <div className="db-sidebar__tags">
                {Object.entries(tagsByCategory).map(([cat, catTags]) => (
                  <div key={cat}>
                    <div className="db-sidebar__cat">{CATEGORY_LABELS[cat] || cat}</div>
                    {catTags.map(t => (
                      <button
                        key={t.id}
                        className={`db-tag-filter ${selectedTags.includes(t.id) ? 'db-tag-filter--active' : ''}`}
                        onClick={() => toggleTagFilter(t.id)}
                      >
                        <span className="tag-badge__dot" style={{ '--tag-color': t.color }} />
                        <span>{t.name}</span>
                        {selectedTags.includes(t.id) && (
                          <svg viewBox="0 0 12 12" width="10" height="10" className="db-tag-filter__check">
                            <polyline points="1,6 4,9 11,2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {selectedTags.length > 0 && (
              <div className="db-sidebar__section">
                <div className="db-sidebar__label">Active Filters</div>
                <div className="db-sidebar__active-tags">
                  {selectedTags.map(id => {
                    const t = tags.find(tg => tg.id === id)
                    return t ? <TagBadge key={id} tag={t} onRemove={() => toggleTagFilter(id)} /> : null
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* ─── Main Table ─── */}
          <div className="db-main">
            <div className="db-search-bar">
              <input
                className="db-search"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="db-search-bar__count">
                {filtered.length} contact{filtered.length !== 1 ? 's' : ''}
              </div>
            </div>

            {loading ? (
              <div className="db-loading">Loading contacts...</div>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No contacts found"
                description={search || selectedTags.length ? 'Try adjusting your filters' : 'Contacts from all pipelines will appear here'}
              />
            ) : (
              <div className="db-table-wrap">
                <table className="db-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Stage</th>
                      <th>Tags</th>
                      <th>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id} className="db-table__row" onClick={() => openContact(c)}>
                        <td className="db-table__name">{c.name || '—'}</td>
                        <td className="db-table__contact">
                          {c.email && <span className="db-table__email">{c.email}</span>}
                          {c.phone && <span className="db-table__phone">{c.phone}</span>}
                        </td>
                        <td>
                          <Badge variant={TYPE_VARIANTS[c.type] || 'default'} size="sm">
                            {TYPE_LABELS[c.type] || c.type}
                          </Badge>
                        </td>
                        <td className="db-table__source">
                          {c.lead_source && (
                            <span className="db-source-badge">{SOURCE_LABELS[c.lead_source] || c.lead_source}</span>
                          )}
                          {c.mls_status && (
                            <span
                              className="db-mls-badge"
                              style={{ '--mls-color': MLS_STATUS_COLORS[c.mls_status] || '#95a5a6' }}
                            >
                              {MLS_STATUS_LABELS[c.mls_status] || c.mls_status}
                            </span>
                          )}
                          {!c.lead_source && !c.mls_status && '—'}
                        </td>
                        <td className="db-table__stage">{c.stage || '—'}</td>
                        <td className="db-table__tags">
                          {c.tags.slice(0, 3).map(t => (
                            <TagBadge key={t.id} tag={t} />
                          ))}
                          {c.tags.length > 3 && (
                            <span className="db-table__more">+{c.tags.length - 3}</span>
                          )}
                        </td>
                        <td className="db-table__date">{fmtDate(c.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Dual-Role Picker (contact is both buyer + seller) ─── */}
      {dualRolePicker && (
        <div className="db-dual-overlay" onClick={() => setDualRolePicker(null)}>
          <div className="db-dual-modal" onClick={e => e.stopPropagation()}>
            <button className="db-dual-modal__close" onClick={() => setDualRolePicker(null)}>×</button>
            <h3 className="db-dual-modal__title">{dualRolePicker.name}</h3>
            <p className="db-dual-modal__sub">
              This client is both buying and selling. Which transaction do you want to open?
            </p>
            <div className="db-dual-modal__choices">
              <button
                className="db-dual-choice db-dual-choice--buyer"
                onClick={() => { navigate('/crm/buyers'); setDualRolePicker(null) }}
              >
                <span className="db-dual-choice__icon">🏠</span>
                <span className="db-dual-choice__label">Buyer Side</span>
                <span className="db-dual-choice__detail">Open in Buyers</span>
              </button>
              <button
                className="db-dual-choice db-dual-choice--seller"
                onClick={() => { navigate('/crm/seller-clients'); setDualRolePicker(null) }}
              >
                <span className="db-dual-choice__icon">🏷️</span>
                <span className="db-dual-choice__label">Seller Side</span>
                <span className="db-dual-choice__detail">Open in Sellers</span>
              </button>
              <button
                className="db-dual-choice db-dual-choice--detail"
                onClick={() => { setSelected(dualRolePicker); setDualRolePicker(null) }}
              >
                <span className="db-dual-choice__icon">✎</span>
                <span className="db-dual-choice__label">Edit Contact</span>
                <span className="db-dual-choice__detail">Just edit profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Contact Detail Panel ─── */}
      <SlidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name || 'Contact'}
        subtitle={TYPE_LABELS[selected?.type] || selected?.type}
        width={500}
      >
        {selected && (
          <ContactDetail
            key={selected?.id || 'new'}
            contact={selected}
            onSave={async (updates) => {
              setSaving(true)
              try {
                await DB.updateContact(selected.id, updates)
                refetch()
                setSelected(null)
              } finally { setSaving(false) }
            }}
            onTagsChange={() => refetch()}
            saving={saving}
          />
        )}
      </SlidePanel>
    </div>
  )
}

/* ─── Contact Detail / Edit ─── */
function ContactDetail({ contact, onSave, onTagsChange, saving }) {
  const [draft, setDraft] = useState({
    name:  contact.name ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    type:  contact.type ?? 'buyer',
    stage: contact.stage ?? '',
    source: contact.source ?? '',
    notes: contact.notes ?? '',
    related_people: Array.isArray(contact.related_people) ? contact.related_people : [],
  })
  const [contactTags, setContactTags] = useState(contact.tags ?? [])

  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  return (
    <div className="contact-detail">
      <div className="contact-detail__section">
        <h4 className="contact-detail__heading">Tags</h4>
        <TagPicker
          contactId={contact.id}
          assignedTags={contactTags}
          onTagsChange={(newTags) => {
            setContactTags(newTags)
            onTagsChange()
          }}
        />
      </div>

      <div className="contact-detail__section">
        <h4 className="contact-detail__heading">Details</h4>
        <Input label="Name" value={draft.name} onChange={e => set('name', e.target.value)} />
        <Input label="Email" type="email" value={draft.email} onChange={e => set('email', e.target.value)} />
        <Input label="Phone" value={draft.phone} onChange={e => set('phone', e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select label="Type" value={draft.type} onChange={e => set('type', e.target.value)}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="both">Buyer & Seller</option>
            <option value="investor">Investor</option>
            <option value="lead">Lead</option>
          </Select>
          <Input label="Stage" value={draft.stage} onChange={e => set('stage', e.target.value)} />
        </div>
        <Input label="Source" value={draft.source} onChange={e => set('source', e.target.value)} />
        <Textarea label="Notes" value={draft.notes} onChange={e => set('notes', e.target.value)} rows={3} />
      </div>

      <div className="contact-detail__section">
        <RelatedPeopleSection
          value={draft.related_people}
          onChange={v => set('related_people', v)}
        />
      </div>

      <button
        className="db-save-btn"
        disabled={saving || !draft.name.trim()}
        onClick={() => onSave({
          name: draft.name.trim(),
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          type: draft.type,
          stage: draft.stage || null,
          source: draft.source || null,
          notes: draft.notes || null,
          related_people: cleanRelatedPeople(draft.related_people),
        })}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}

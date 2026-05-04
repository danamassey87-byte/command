import { useState, useMemo, useCallback } from 'react'
import { SectionHeader, Badge, Card, SlidePanel, Input, Select, Textarea, EmptyState, TabBar } from '../../components/ui/index.jsx'
import { TagPicker, TagBadge, TagManager } from '../../components/ui/TagPicker.jsx'
import CampaignBadgePopover from '../../components/ui/CampaignBadgePopover.jsx'
import RelatedPeopleSection, { cleanRelatedPeople } from '../../components/related-people/RelatedPeopleSection.jsx'
import { useContactsWithTags, useTags, useListings, useTransactions, useReplyLogForContact, useActiveEnrollments, useLatestComms } from '../../lib/hooks.js'
import { useNavigate } from 'react-router-dom'
import * as DB from '../../lib/supabase.js'
import SendEmailModal from '../../components/email/SendEmailModal'
import InteractionsTimeline from '../../components/InteractionsTimeline.jsx'
import SocialProfilesPanel from '../../components/SocialProfilesPanel.jsx'
import LifeEventsPanel from '../../components/LifeEventsPanel.jsx'
import FamilyLinksPanel from '../../components/FamilyLinksPanel.jsx'
import IntakeFormTracker from '../../components/IntakeFormTracker.jsx'
import DuplicateDetector from '../../components/DuplicateDetector.jsx'
import FacebookExport from '../../components/FacebookExport.jsx'
import LabelPrinter from '../../components/LabelPrinter.jsx'
import { exportContacts } from '../../lib/csvExport.js'
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
  const { data: enrollments, refetch: refetchEnrollments } = useActiveEnrollments()
  const { data: latestCommsData } = useLatestComms()

  // Build map of contact_id → latest communication date
  const lastContactedMap = useMemo(() => {
    const map = {}
    for (const c of (latestCommsData ?? [])) {
      if (!c.contact_id) continue
      if (!map[c.contact_id] || c.logged_at > map[c.contact_id]) map[c.contact_id] = c.logged_at
    }
    return map
  }, [latestCommsData])

  // Build a map of contact_id → active enrollments (full record so the popover can pause/stop)
  const enrollmentMap = useMemo(() => {
    const map = {}
    for (const e of (enrollments ?? [])) {
      if (!e.contact_id) continue
      if (!map[e.contact_id]) map[e.contact_id] = []
      map[e.contact_id].push(e)
    }
    return map
  }, [enrollments])

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [fbExportOpen, setFbExportOpen] = useState(false)
  const [labelPrinterOpen, setLabelPrinterOpen] = useState(false)
  const [bulkSelected, setBulkSelected] = useState(new Set())
  const [bulkTagging, setBulkTagging] = useState(false)
  const [bulkTagId, setBulkTagId] = useState('')

  const toggleBulk = (id) => setBulkSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const toggleAllBulk = () => {
    if (bulkSelected.size === filtered.length) setBulkSelected(new Set())
    else setBulkSelected(new Set(filtered.map(c => c.id)))
  }
  const handleBulkTag = async () => {
    if (!bulkTagId || bulkSelected.size === 0) return
    setBulkTagging(true)
    try {
      for (const cid of bulkSelected) await DB.addContactTag(cid, bulkTagId)
      setBulkSelected(new Set())
      setBulkTagId('')
      refetch()
    } catch (e) { alert(e.message) }
    finally { setBulkTagging(false) }
  }
  const [selectedTags, setSelectedTags] = useState([]) // tag IDs to filter by
  const [tagMode, setTagMode] = useState('any') // 'any' or 'all'
  const [showManager, setShowManager] = useState(false)
  const [selected, setSelected] = useState(null) // contact being edited
  const [dualRolePicker, setDualRolePicker] = useState(null) // contact triggered by dual-role click
  const [emailContact, setEmailContact] = useState(null)
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

  // Contact duplicate detection
  const contactDupeGroups = useMemo(() => {
    const groups = {}
    const seen = new Set()
    for (const c of enriched) {
      if (seen.has(c.id)) continue
      // Key 1: normalized full name
      const normName = (c.name ?? '').toLowerCase().replace(/[^a-z]/g, '').trim()
      // Key 2: first_name + last_name (more precise)
      const normFL = ((c.first_name ?? '') + (c.last_name ?? '')).toLowerCase().replace(/[^a-z]/g, '').trim()
      // Key 3: email (exact)
      const normEmail = (c.email ?? '').toLowerCase().trim()
      // Key 4: phone (digits only)
      const normPhone = (c.phone ?? '').replace(/[^0-9]/g, '').slice(-10)

      const keys = []
      if (normName.length >= 3) keys.push('n:' + normName)
      if (normFL.length >= 3 && normFL !== normName) keys.push('fl:' + normFL)
      if (normEmail.length >= 5) keys.push('e:' + normEmail)
      if (normPhone.length >= 7) keys.push('p:' + normPhone)

      for (const key of keys) {
        if (!groups[key]) groups[key] = []
        groups[key].push(c)
      }
    }
    // Dedupe groups: merge overlapping groups, take unique groups only
    const result = []
    const usedIds = new Set()
    for (const group of Object.values(groups).filter(g => g.length > 1)) {
      const ids = group.map(c => c.id).sort().join(',')
      if (usedIds.has(ids)) continue
      usedIds.add(ids)
      group.forEach(c => seen.add(c.id))
      result.push(group)
    }
    return result
  }, [enriched])

  const [mergingContacts, setMergingContacts] = useState(false)
  const [dismissedContactGroups, setDismissedContactGroups] = useState(new Set())

  const handleContactMerge = async (keepId, dupeIds, gi) => {
    setMergingContacts(true)
    try {
      await DB.mergeContacts(keepId, dupeIds)
      refetch()
    } catch (e) { alert('Merge failed: ' + e.message) }
    finally { setMergingContacts(false) }
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
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className={`db-tab-btn ${tab === 'database' ? 'db-tab-btn--active' : ''}`}
              onClick={() => setTab('database')}
            >Database</button>
            <button
              className={`db-tab-btn ${tab === 'dupes' ? 'db-tab-btn--active' : ''}`}
              onClick={() => setTab('dupes')}
            >Find Duplicates{contactDupeGroups.length > 0 ? ` (${contactDupeGroups.length})` : ''}</button>
            <button
              className={`db-tab-btn ${tab === 'tags' ? 'db-tab-btn--active' : ''}`}
              onClick={() => setTab('tags')}
            >Manage Tags</button>
            <div style={{ flex: 1 }} />
            <button onClick={() => exportContacts(enriched, `contacts_${new Date().toISOString().split('T')[0]}.csv`)} className="db-tab-btn" title="Export contacts to CSV">📥 CSV</button>
            <button onClick={() => setLabelPrinterOpen(true)} className="db-tab-btn" title="Print mailing labels">🏷 Labels</button>
            <button onClick={() => setFbExportOpen(true)} className="db-tab-btn" title="Export for Facebook Audience">📤 FB Export</button>
          </div>
        }
      />

      {tab === 'dupes' ? (
        <div style={{ padding: '16px 0' }}>
          {contactDupeGroups.filter((_, i) => !dismissedContactGroups.has(i)).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--brown-dark)' }}>No duplicates found</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Contacts are matched by name similarity.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--brown-dark)', padding: '8px 12px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8 }}>
                <strong>{contactDupeGroups.filter((_, i) => !dismissedContactGroups.has(i)).length} potential duplicate groups.</strong> Select which contact to keep — all data (showings, expenses, campaigns, notes) will merge into the primary.
              </p>
              {contactDupeGroups.map((group, gi) => {
                if (dismissedContactGroups.has(gi)) return null
                return (
                  <div key={gi} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 14, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <strong style={{ fontSize: '0.88rem' }}>Group {gi + 1} — {group.length} contacts</strong>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setDismissedContactGroups(prev => new Set([...prev, gi]))} style={{ padding: '4px 10px', fontSize: '0.72rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'none', cursor: 'pointer' }}>Not Duplicates</button>
                      </div>
                    </div>
                    {group.map((c, ci) => (
                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: ci === 0 ? 'var(--color-bg-success, #e8f5e9)' : 'transparent', borderRadius: 6, marginBottom: 2 }}>
                        <input type="radio" name={`merge-contact-${gi}`} defaultChecked={ci === 0} onChange={() => {}} />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{c.name}</span>
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.email || ''} {c.phone || ''}</span>
                        </div>
                        <Badge variant={TYPE_VARIANTS[c.type] || 'default'} size="sm">{c.type || 'contact'}</Badge>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{c.tags?.length || 0} tags</span>
                      </div>
                    ))}
                    <button
                      disabled={mergingContacts}
                      onClick={() => handleContactMerge(group[0].id, group.slice(1).map(c => c.id), gi)}
                      style={{ marginTop: 8, padding: '6px 14px', background: 'var(--brown-mid)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {mergingContacts ? 'Merging...' : `Merge into ${group[0].name}`}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : tab === 'tags' ? (
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

            {/* Bulk action bar */}
            {bulkSelected.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: 'var(--brown-dark)', color: '#fff', borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{bulkSelected.size} selected</span>
                <select value={bulkTagId} onChange={e => setBulkTagId(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: '0.78rem', fontFamily: 'inherit' }}>
                  <option value="">— Add tag —</option>
                  {(allTags ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button disabled={!bulkTagId || bulkTagging} onClick={handleBulkTag} style={{ padding: '4px 12px', background: '#fff', color: 'var(--brown-dark)', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', opacity: (!bulkTagId || bulkTagging) ? 0.5 : 1 }}>
                  {bulkTagging ? 'Applying...' : 'Apply Tag'}
                </button>
                <button onClick={() => {
                  const emails = [...bulkSelected].map(id => (filtered.find(c => c.id === id)?.email)).filter(Boolean)
                  if (emails.length === 0) { alert('No selected contacts have emails'); return }
                  window.open(`mailto:${emails.join(',')}`, '_blank')
                }} style={{ padding: '4px 12px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                  Email All
                </button>
                <button onClick={() => setLabelPrinterOpen(true)} style={{ padding: '4px 12px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                  Print Labels
                </button>
                <button onClick={() => setFbExportOpen(true)} style={{ padding: '4px 12px', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }}>
                  FB Export
                </button>
                <div style={{ flex: 1 }} />
                <button onClick={() => setBulkSelected(new Set())} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.82rem' }}>Clear</button>
              </div>
            )}

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
                      <th style={{ width: 36 }}>
                        <input type="checkbox" checked={bulkSelected.size === filtered.length && filtered.length > 0} onChange={toggleAllBulk} title="Select all" />
                      </th>
                      <th>Name</th>
                      <th>Contact</th>
                      <th>Type</th>
                      <th>Source</th>
                      <th>Stage</th>
                      <th>Tags</th>
                      <th>Last Contact</th>
                      <th>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (
                      <tr key={c.id} className="db-table__row" onClick={() => openContact(c)}>
                        <td onClick={e => e.stopPropagation()} style={{ width: 36 }}>
                          <input type="checkbox" checked={bulkSelected.has(c.id)} onChange={() => toggleBulk(c.id)} />
                        </td>
                        <td className="db-table__name">
                          <a href={`/contact/${c.id}`} onClick={e => e.stopPropagation()} style={{ color: 'inherit', textDecoration: 'none' }}>{c.name || '—'}</a>
                          {c.last_reply_scan_at && (
                            <span className="db-replied-badge" title={`Replied to campaign email${c.reply_count > 1 ? ` (${c.reply_count}x)` : ''}`}>Replied</span>
                          )}
                          {enrollmentMap[c.id]?.map((en) => (
                            <span key={en.id} style={{ marginLeft: 4 }}>
                              <CampaignBadgePopover enrollment={en} onChange={refetchEnrollments} />
                            </span>
                          ))}
                        </td>
                        <td className="db-table__contact">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div>
                              {c.email && <span className="db-table__email">{c.email}</span>}
                              {c.phone && <span className="db-table__phone">{c.phone}</span>}
                            </div>
                            {c.email && (
                              <span className="db-table__email-btn" title="Send email" onClick={e => { e.stopPropagation(); setEmailContact({ id: c.id, name: c.name, email: c.email, type: c.type }) }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                              </span>
                            )}
                          </div>
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
                        <td className="db-table__date">
                          {(() => {
                            const dt = lastContactedMap[c.id]
                            if (!dt) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            const days = Math.floor((new Date() - new Date(dt)) / 86400000)
                            const color = days > 30 ? 'var(--color-danger)' : days > 14 ? 'var(--color-warning, #e67e22)' : 'var(--color-success)'
                            return <span style={{ color, fontWeight: 600 }}>{days === 0 ? 'Today' : days === 1 ? '1d' : `${days}d`}</span>
                          })()}
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

      <SendEmailModal open={!!emailContact} onClose={() => setEmailContact(null)} contact={emailContact || {}} contactType={emailContact?.type} />
      <FacebookExport contacts={enriched} open={fbExportOpen} onClose={() => setFbExportOpen(false)} />
      <LabelPrinter contacts={enriched} open={labelPrinterOpen} onClose={() => setLabelPrinterOpen(false)} />
    </div>
  )
}

/* ─── Contact Detail / Edit ─── */
function ContactDetail({ contact, onSave, onTagsChange, saving }) {
  const { data: allTransactions } = useTransactions()
  const { data: replyLog } = useReplyLogForContact(contact.id)
  const contactDeals = useMemo(() =>
    (allTransactions ?? []).filter(t => t.contact_id === contact.id)
  , [allTransactions, contact.id])

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

      {contactDeals.length > 0 && (
        <div className="contact-detail__section">
          <h4 className="contact-detail__heading">Deals ({contactDeals.length})</h4>
          {contactDeals.map(deal => {
            const stg = (deal.status ?? '').replace(/_/g, ' ')
            const isClosed = stg.includes('closed')
            const isDeclined = stg.includes('declined')
            return (
              <Card key={deal.id} style={{ marginBottom: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--brown-dark)' }}>{deal.property?.address ?? 'No address'}</p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                      {deal.property?.city ?? ''}{deal.property?.price ? ` · $${Number(deal.property.price).toLocaleString()}` : ''}
                    </p>
                  </div>
                  <Badge variant={isClosed ? 'success' : isDeclined ? 'danger' : 'accent'} size="sm" style={{ textTransform: 'capitalize' }}>{stg || 'Active'}</Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {(replyLog ?? []).length > 0 && (
        <div className="contact-detail__section">
          <h4 className="contact-detail__heading" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            Campaign Replies ({replyLog.length})
            <Badge variant="info" size="sm">Replied</Badge>
          </h4>
          {replyLog.slice(0, 5).map(reply => (
            <Card key={reply.id} style={{ marginBottom: 8, padding: '10px 12px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--brown-dark)', margin: 0 }}>
                    {reply.subject || '(No subject)'}
                  </p>
                  <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                    {reply.reply_date ? new Date(reply.reply_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
                {reply.campaign_name && (
                  <p style={{ fontSize: '0.72rem', color: '#7a93b7', margin: '2px 0 0' }}>
                    Campaign: {reply.campaign_name}
                  </p>
                )}
                {reply.snippet && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '4px 0 0', fontStyle: 'italic', lineHeight: 1.4 }}>
                    &ldquo;{reply.snippet.slice(0, 150)}{reply.snippet.length > 150 ? '...' : ''}&rdquo;
                  </p>
                )}
              </div>
            </Card>
          ))}
          {replyLog.length > 5 && (
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              + {replyLog.length - 5} more replies
            </p>
          )}
        </div>
      )}

      {/* ── Communication Log ── */}
      <SocialProfilesPanel contactId={contact.id} />
      <FamilyLinksPanel contactId={contact.id} />
      <LifeEventsPanel contactId={contact.id} />
      <IntakeFormTracker contactId={contact.id} contactEmail={contact.email} contactName={contact.name} />
      <InteractionsTimeline contactId={contact.id} />

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

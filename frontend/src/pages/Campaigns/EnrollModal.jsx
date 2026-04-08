// ─────────────────────────────────────────────────────────────────────────────
// EnrollModal — bulk enrollment picker for Smart Campaigns.
// Three modes:
//   1. By Tag       — multi-select tags → auto-enroll every matching contact
//   2. By Segment   — pick a saved segment (Buyers / Sellers / BBA Signed / ...)
//   3. Pick Contacts — multi-select list with search (legacy flow, upgraded)
// All three converge on a single enrollContacts(campaignId, ids[]) call.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react'
import { SlidePanel, Button, Input, Select } from '../../components/ui'
import { enrollContacts as bulkEnroll } from '../../lib/campaigns'

// ═══════════════════════════════════════════════════════════════════════════
// Segment definitions — each is a filter function over a contact row
// ═══════════════════════════════════════════════════════════════════════════
const SEGMENTS = [
  {
    key: 'all',
    label: 'All Contacts',
    description: 'Every live contact in the database',
    filter: () => true,
  },
  {
    key: 'leads',
    label: 'Leads',
    description: 'Contacts typed as "lead"',
    filter: c => c.type === 'lead',
  },
  {
    key: 'buyers',
    label: 'Buyers',
    description: 'Active buyers (type = buyer or both)',
    filter: c => c.type === 'buyer' || c.type === 'both',
  },
  {
    key: 'buyers_bba_signed',
    label: 'Buyers — BBA Signed',
    description: 'Buyers with a signed BBA still active (expiry in future or not set)',
    filter: c => {
      if (!(c.type === 'buyer' || c.type === 'both')) return false
      if (!c.bba_signed) return false
      if (!c.bba_expiry_date) return true
      return new Date(c.bba_expiry_date) >= new Date()
    },
  },
  {
    key: 'buyers_bba_expiring',
    label: 'Buyers — BBA Expiring Soon (30d)',
    description: 'BBA expires in the next 30 days',
    filter: c => {
      if (!c.bba_signed || !c.bba_expiry_date) return false
      const days = (new Date(c.bba_expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
      return days >= 0 && days <= 30
    },
  },
  {
    key: 'sellers',
    label: 'Sellers',
    description: 'Active sellers (type = seller or both)',
    filter: c => c.type === 'seller' || c.type === 'both',
  },
  {
    key: 'investors',
    label: 'Investors',
    description: 'Investor contacts',
    filter: c => c.type === 'investor',
  },
  {
    key: 'past_clients',
    label: 'Past Clients',
    description: 'Closed deals / type = past_client',
    filter: c => c.type === 'past_client',
  },
  {
    key: 'fsbo',
    label: 'FSBO',
    description: 'Source = FSBO',
    filter: c => (c.source || '').toLowerCase() === 'fsbo',
  },
  {
    key: 'expired',
    label: 'Expired Listings',
    description: 'Source = expired',
    filter: c => (c.source || '').toLowerCase() === 'expired',
  },
  {
    key: 'circle',
    label: 'Circle Prospecting',
    description: 'Source = circle',
    filter: c => (c.source || '').toLowerCase() === 'circle',
  },
  {
    key: 'soi',
    label: 'Sphere of Influence',
    description: 'Source = soi / sphere / referral',
    filter: c => {
      const s = (c.source || '').toLowerCase()
      return s === 'soi' || s === 'sphere' || s === 'referral'
    },
  },
  {
    key: 'no_email',
    label: 'No Email on File',
    description: 'Contacts missing an email address (SMS-only)',
    filter: c => !c.email || !c.email.trim(),
  },
  {
    key: 'no_recent_activity',
    label: 'Stale — No Activity 14+ days',
    description: 'created_at older than 14 days and no recent update',
    filter: c => {
      const last = new Date(c.updated_at || c.created_at || 0)
      const days = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24)
      return days >= 14
    },
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════
export default function EnrollModal({
  open,
  onClose,
  campaign,                // { id, name, ... }
  contacts = [],           // all live contacts (already filtered for deleted_at)
  contactsWithTags = [],   // same shape but joined with contact_tags
  tags = [],               // all tags
  existingEnrollments = [],// used to mark already-enrolled contacts
  onEnrolled,              // (result) => void  — parent reloads after
}) {
  const [tab, setTab] = useState('tag')   // 'tag' | 'segment' | 'contacts'

  // By Tag state
  const [selectedTagIds, setSelectedTagIds] = useState(new Set())
  const [tagMatchMode, setTagMatchMode] = useState('any') // 'any' | 'all'

  // By Segment state
  const [segmentKey, setSegmentKey] = useState('leads')

  // Pick Contacts state
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  // Reset when the modal opens/closes or campaign changes
  useEffect(() => {
    if (open) {
      setTab('tag')
      setSelectedTagIds(new Set())
      setTagMatchMode('any')
      setSegmentKey('leads')
      setSearch('')
      setSelectedIds(new Set())
      setResult(null)
      setSubmitting(false)
    }
  }, [open, campaign?.id])

  // ─── Contacts already enrolled in this campaign (to mark + skip UI) ──────
  const alreadyEnrolledIds = useMemo(() => {
    if (!campaign) return new Set()
    return new Set(
      existingEnrollments
        .filter(e => e.campaign_id === campaign.id && e.status === 'active')
        .map(e => e.contact_id)
    )
  }, [campaign, existingEnrollments])

  // ─── Live (non-deleted) contacts ─────────────────────────────────────────
  const liveContacts = useMemo(
    () => contacts.filter(c => !c.deleted_at && !c.archived_at),
    [contacts]
  )

  // ─── Tag → contact index (from contactsWithTags) ─────────────────────────
  const contactTagMap = useMemo(() => {
    // { [contact_id]: Set<tag_id> }
    const map = new Map()
    for (const c of contactsWithTags) {
      if (c.deleted_at || c.archived_at) continue
      const tagIds = new Set()
      for (const ct of (c.contact_tags || [])) {
        if (ct?.tag?.id) tagIds.add(ct.tag.id)
      }
      map.set(c.id, tagIds)
    }
    return map
  }, [contactsWithTags])

  // ─── Tags grouped by category ────────────────────────────────────────────
  const tagsByCategory = useMemo(() => {
    const groups = new Map()
    for (const t of tags) {
      const cat = t.category || 'Uncategorized'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat).push(t)
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [tags])

  // ─── Compute matched contact IDs for the active tab ──────────────────────
  const matchedIds = useMemo(() => {
    if (tab === 'tag') {
      if (selectedTagIds.size === 0) return []
      const ids = []
      for (const c of liveContacts) {
        const ctags = contactTagMap.get(c.id) || new Set()
        const matches = [...selectedTagIds].filter(t => ctags.has(t))
        if (tagMatchMode === 'all' && matches.length === selectedTagIds.size) ids.push(c.id)
        else if (tagMatchMode === 'any' && matches.length > 0) ids.push(c.id)
      }
      return ids
    }
    if (tab === 'segment') {
      const seg = SEGMENTS.find(s => s.key === segmentKey)
      if (!seg) return []
      return liveContacts.filter(seg.filter).map(c => c.id)
    }
    if (tab === 'contacts') {
      return [...selectedIds]
    }
    return []
  }, [tab, selectedTagIds, tagMatchMode, segmentKey, selectedIds, liveContacts, contactTagMap])

  // Matched minus already-enrolled = actual new enrollment count
  const newIds = useMemo(
    () => matchedIds.filter(id => !alreadyEnrolledIds.has(id)),
    [matchedIds, alreadyEnrolledIds]
  )

  // ─── Filtered contacts for the Pick Contacts tab ─────────────────────────
  const filteredForList = useMemo(() => {
    if (tab !== 'contacts') return []
    const q = search.trim().toLowerCase()
    if (!q) return liveContacts
    return liveContacts.filter(c =>
      (c.name || '').toLowerCase().includes(q)
      || (c.email || '').toLowerCase().includes(q)
      || (c.phone || '').includes(q)
    )
  }, [tab, search, liveContacts])

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleEnroll = async () => {
    if (!campaign || newIds.length === 0) return
    setSubmitting(true)
    try {
      const res = await bulkEnroll(campaign.id, newIds)
      setResult(res)
      onEnrolled?.(res)
    } catch (err) {
      alert('Enrollment failed: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTag = (id) => {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleContact = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelectedIds(new Set(filteredForList.map(c => c.id)))
  }
  const clearSelection = () => setSelectedIds(new Set())

  // ═════════════════════════════════════════════════════════════════════════
  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Enroll Contacts"
      subtitle={campaign?.name}
      width={560}
    >
      {campaign && (
        <div className="enroll-modal">
          {/* ─── Result screen shown after successful enrollment ─── */}
          {result && (
            <div className="enroll-modal__result">
              <div className="enroll-modal__result-headline">
                ✓ Enrolled {result.enrolled.length} contact{result.enrolled.length === 1 ? '' : 's'}
              </div>
              {result.skipped.length > 0 && (
                <div className="enroll-modal__result-skipped">
                  Skipped {result.skipped.length}:
                  <ul>
                    {Object.entries(
                      result.skipped.reduce((acc, s) => {
                        acc[s.reason] = (acc[s.reason] || 0) + 1
                        return acc
                      }, {})
                    ).map(([reason, n]) => (
                      <li key={reason}>
                        {n}× {reason === 'already_active' ? 'already enrolled'
                          : reason === 'suppressed' ? 'email suppressed'
                          : reason === 'no_contact' ? 'contact missing'
                          : reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="enroll-modal__result-actions">
                <Button variant="primary" onClick={onClose}>Done</Button>
                <Button variant="ghost" onClick={() => setResult(null)}>Enroll more</Button>
              </div>
            </div>
          )}

          {/* ─── Normal UI ─── */}
          {!result && (
            <>
              {/* Tab buttons */}
              <div className="enroll-modal__tabs">
                <button
                  className={`enroll-modal__tab ${tab === 'tag' ? 'is-active' : ''}`}
                  onClick={() => setTab('tag')}
                >
                  By Tag
                </button>
                <button
                  className={`enroll-modal__tab ${tab === 'segment' ? 'is-active' : ''}`}
                  onClick={() => setTab('segment')}
                >
                  By Segment
                </button>
                <button
                  className={`enroll-modal__tab ${tab === 'contacts' ? 'is-active' : ''}`}
                  onClick={() => setTab('contacts')}
                >
                  Pick Contacts
                </button>
              </div>

              {/* ─── By Tag tab ──────────────────────────────────────── */}
              {tab === 'tag' && (
                <div className="enroll-modal__tag-tab">
                  {tags.length === 0 ? (
                    <p className="enroll-modal__empty">
                      No tags defined yet. Create tags in Settings → Lists & Tags.
                    </p>
                  ) : (
                    <>
                      <div className="enroll-modal__match-mode">
                        <label>
                          <input
                            type="radio"
                            checked={tagMatchMode === 'any'}
                            onChange={() => setTagMatchMode('any')}
                          />
                          Match <strong>any</strong> selected tag
                        </label>
                        <label>
                          <input
                            type="radio"
                            checked={tagMatchMode === 'all'}
                            onChange={() => setTagMatchMode('all')}
                          />
                          Match <strong>all</strong> selected tags
                        </label>
                      </div>
                      {tagsByCategory.map(([category, ts]) => (
                        <div key={category} className="enroll-modal__tag-group">
                          <div className="enroll-modal__tag-group-title">{category}</div>
                          <div className="enroll-modal__tag-chips">
                            {ts.map(t => (
                              <button
                                key={t.id}
                                className={`enroll-modal__tag-chip ${selectedTagIds.has(t.id) ? 'is-selected' : ''}`}
                                style={selectedTagIds.has(t.id) ? { background: t.color, borderColor: t.color, color: '#fff' } : { borderColor: t.color }}
                                onClick={() => toggleTag(t.id)}
                              >
                                {t.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* ─── By Segment tab ──────────────────────────────────── */}
              {tab === 'segment' && (
                <div className="enroll-modal__segment-tab">
                  <Select
                    label="Segment"
                    value={segmentKey}
                    onChange={e => setSegmentKey(e.target.value)}
                  >
                    {SEGMENTS.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </Select>
                  <p className="enroll-modal__segment-desc">
                    {SEGMENTS.find(s => s.key === segmentKey)?.description}
                  </p>
                </div>
              )}

              {/* ─── Pick Contacts tab ───────────────────────────────── */}
              {tab === 'contacts' && (
                <div className="enroll-modal__contacts-tab">
                  <Input
                    placeholder="Search name, email, phone..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <div className="enroll-modal__contacts-toolbar">
                    <button className="enroll-modal__link-btn" onClick={selectAllFiltered}>
                      Select all {filteredForList.length}
                    </button>
                    <button className="enroll-modal__link-btn" onClick={clearSelection}>
                      Clear
                    </button>
                    <span className="enroll-modal__sel-count">{selectedIds.size} selected</span>
                  </div>
                  <div className="enroll-modal__contacts-list">
                    {filteredForList.map(c => {
                      const isSel = selectedIds.has(c.id)
                      const isEnrolled = alreadyEnrolledIds.has(c.id)
                      return (
                        <label
                          key={c.id}
                          className={`enroll-modal__contact-row ${isSel ? 'is-selected' : ''} ${isEnrolled ? 'is-enrolled' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSel}
                            disabled={isEnrolled}
                            onChange={() => toggleContact(c.id)}
                          />
                          <div className="enroll-modal__contact-info">
                            <div className="enroll-modal__contact-name">
                              {c.name || '(no name)'}
                              {isEnrolled && <span className="enroll-modal__badge">already enrolled</span>}
                            </div>
                            <div className="enroll-modal__contact-detail">
                              {c.email || '—'}{c.phone ? ` · ${c.phone}` : ''}
                            </div>
                          </div>
                        </label>
                      )
                    })}
                    {filteredForList.length === 0 && (
                      <p className="enroll-modal__empty">No contacts match.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ─── Footer: preview + enroll ───────────────────────── */}
              <div className="enroll-modal__footer">
                <div className="enroll-modal__preview">
                  <div>
                    <strong>{matchedIds.length}</strong> matched
                  </div>
                  <div className="enroll-modal__preview-sub">
                    {matchedIds.length - newIds.length > 0 && (
                      <span>{matchedIds.length - newIds.length} already enrolled · </span>
                    )}
                    <span><strong>{newIds.length}</strong> will be enrolled</span>
                  </div>
                </div>
                <Button
                  variant="primary"
                  disabled={newIds.length === 0 || submitting}
                  onClick={handleEnroll}
                >
                  {submitting
                    ? 'Enrolling...'
                    : newIds.length === 0
                      ? 'Nothing to enroll'
                      : `Enroll ${newIds.length} contact${newIds.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </SlidePanel>
  )
}

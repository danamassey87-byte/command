import { useState, useMemo, useEffect } from 'react'
import { SectionHeader, Button, Badge } from '../../components/ui/index.jsx'
import { useOnHoldContacts } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import { ensureOnHoldFollowUpsToday, generateOnHoldFollowUps } from '../../lib/onHoldFollowUps.js'
import InteractionsTimeline from '../../components/InteractionsTimeline.jsx'
import SocialProfilesPanel from '../../components/SocialProfilesPanel.jsx'
import LifeEventsPanel from '../../components/LifeEventsPanel.jsx'
import IntakeFormTracker from '../../components/IntakeFormTracker.jsx'
import './OnHoldContacts.css'

function daysBetween(from, to = new Date()) {
  return Math.floor((to - new Date(from)) / 86_400_000)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function OnHoldContacts() {
  const { data, loading, refetch } = useOnHoldContacts()
  const [filter, setFilter]     = useState('all')    // all | buyer | seller
  const [sortDir, setSortDir]   = useState('newest')  // newest | oldest | longest
  const [reactivating, setReactivating] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [genStatus, setGenStatus] = useState(null) // null | 'running' | { created, scanned }

  // Auto-run the daily re-engagement task generator (gated to once/day)
  useEffect(() => { ensureOnHoldFollowUpsToday() }, [])

  const handleGenerateFollowUps = async () => {
    setGenStatus('running')
    try {
      const result = await generateOnHoldFollowUps()
      setGenStatus(result)
      setTimeout(() => setGenStatus(null), 4000)
    } catch (e) {
      console.error(e)
      setGenStatus({ error: true })
      setTimeout(() => setGenStatus(null), 4000)
    }
  }

  const contacts = useMemo(() => {
    let list = (data ?? []).slice()

    // Filter by type
    if (filter === 'buyer')  list = list.filter(c => c.type === 'buyer' || c.type === 'both')
    if (filter === 'seller') list = list.filter(c => c.type === 'seller' || c.type === 'both')

    // Sort
    list.sort((a, b) => {
      const da = new Date(a.on_hold_at)
      const db = new Date(b.on_hold_at)
      if (sortDir === 'oldest') return da - db
      return db - da // newest first (also works for "longest" since newest = most recent pause)
    })

    if (sortDir === 'longest') {
      list.sort((a, b) => daysBetween(a.on_hold_at) - daysBetween(b.on_hold_at)).reverse()
    }

    return list
  }, [data, filter, sortDir])

  const handleReactivate = async (contact) => {
    if (!confirm(`Reactivate ${contact.name}? They'll return to the active pipeline.`)) return
    setReactivating(contact.id)
    try {
      await DB.reactivateContact(contact.id)
      await DB.logActivity('contact_reactivated', `Reactivated: ${contact.name}`, { contactId: contact.id })
      await refetch()
    } catch (e) {
      console.error(e)
    } finally {
      setReactivating(null)
    }
  }

  const totalCount  = (data ?? []).length
  const buyerCount  = (data ?? []).filter(c => c.type === 'buyer' || c.type === 'both').length
  const sellerCount = (data ?? []).filter(c => c.type === 'seller' || c.type === 'both').length
  const avgDays     = totalCount > 0
    ? Math.round((data ?? []).reduce((sum, c) => sum + daysBetween(c.on_hold_at), 0) / totalCount)
    : 0

  if (loading) return <div className="page-loading">Loading on-hold contacts...</div>

  return (
    <div className="on-hold">
      <SectionHeader
        title="On Hold"
        subtitle="Paused clients — not lost, not forgotten"
        actions={
          <button
            onClick={handleGenerateFollowUps}
            disabled={genStatus === 'running'}
            style={{ padding: '8px 14px', background: 'var(--brown-mid)', color: '#fff', border: 'none', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', opacity: genStatus === 'running' ? 0.6 : 1 }}
          >
            {genStatus === 'running' ? 'Generating…'
              : genStatus?.error ? 'Failed'
              : genStatus?.created != null ? `Created ${genStatus.created}`
              : 'Generate Re-Engagement Tasks'}
          </button>
        }
      />

      {/* Stats */}
      <div className="on-hold__stats">
        <div className="on-hold__stat">
          <p className="on-hold__stat-value">{totalCount}</p>
          <p className="on-hold__stat-label">Total Paused</p>
        </div>
        <div className="on-hold__stat">
          <p className="on-hold__stat-value">{buyerCount}</p>
          <p className="on-hold__stat-label">Buyers</p>
        </div>
        <div className="on-hold__stat">
          <p className="on-hold__stat-value">{sellerCount}</p>
          <p className="on-hold__stat-label">Sellers</p>
        </div>
        <div className="on-hold__stat">
          <p className="on-hold__stat-value">{avgDays}d</p>
          <p className="on-hold__stat-label">Avg Days Paused</p>
        </div>
      </div>

      {/* Filters + Sort */}
      <div className="on-hold__filters">
        {['all', 'buyer', 'seller'].map(f => (
          <button
            key={f}
            className={`on-hold__filter-btn ${filter === f ? 'on-hold__filter-btn--active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'buyer' ? 'Buyers' : 'Sellers'}
          </button>
        ))}
        <select className="on-hold__sort" value={sortDir} onChange={e => setSortDir(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="longest">Longest on Hold</option>
        </select>
      </div>

      {/* Card Grid or Empty State */}
      {contacts.length === 0 ? (
        <div className="on-hold__empty">
          <svg className="on-hold__empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p className="on-hold__empty-title">No contacts on hold</p>
          <p className="on-hold__empty-sub">
            When you pause a buyer or seller from their profile, they'll appear here so you never lose track.
          </p>
        </div>
      ) : (
        <div className="on-hold__grid">
          {contacts.map(contact => {
            const days = daysBetween(contact.on_hold_at)
            const daysClass = days >= 90 ? 'on-hold__card-days--danger'
              : days >= 30 ? 'on-hold__card-days--warn' : ''

            return (
              <div key={contact.id} className="on-hold__card">
                <div className="on-hold__card-header">
                  <div>
                    <p className="on-hold__card-name">{contact.name}</p>
                    {(contact.email || contact.phone) && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {contact.email || contact.phone}
                      </p>
                    )}
                  </div>
                  <span className={`on-hold__card-type on-hold__card-type--${contact.type || 'buyer'}`}>
                    {contact.type === 'both' ? 'Buyer & Seller' : contact.type === 'seller' ? 'Seller' : 'Buyer'}
                  </span>
                </div>

                <div className="on-hold__card-meta">
                  <div className="on-hold__card-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Paused {fmtDate(contact.on_hold_at)}
                  </div>
                  <p className={`on-hold__card-days ${daysClass}`}>
                    {days} day{days !== 1 ? 's' : ''} on hold
                  </p>
                </div>

                {contact.on_hold_reason && (
                  <div className="on-hold__card-reason">
                    {contact.on_hold_reason}
                  </div>
                )}

                {contact.stage && (
                  <div className="on-hold__card-row">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
                    </svg>
                    Previous stage: {contact.stage}
                  </div>
                )}

                <div className="on-hold__card-footer">
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {contact.source && `Source: ${contact.source}`}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="on-hold__reactivate-btn"
                      onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                      style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '4px 10px', fontSize: '0.72rem', cursor: 'pointer', color: 'var(--brown-dark)' }}
                    >
                      {expandedId === contact.id ? 'Hide Details' : 'Details'}
                    </button>
                    <button
                      className="on-hold__reactivate-btn"
                      onClick={() => handleReactivate(contact)}
                      disabled={reactivating === contact.id}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10"/>
                        <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                      </svg>
                      {reactivating === contact.id ? 'Reactivating...' : 'Reactivate'}
                    </button>
                  </div>
                </div>

                {expandedId === contact.id && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border-light, #f0ece6)', paddingTop: 12 }}>
                    <IntakeFormTracker contactId={contact.id} contactEmail={contact.email} contactName={contact.name} />
                    <SocialProfilesPanel contactId={contact.id} />
                    <LifeEventsPanel contactId={contact.id} />
                    <InteractionsTimeline contactId={contact.id} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

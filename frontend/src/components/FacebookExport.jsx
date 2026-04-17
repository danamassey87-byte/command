import { useState, useMemo, useEffect } from 'react'
import { Button, Badge, Select, Input } from './ui/index.jsx'
import { useFbAudiences } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

function splitName(fullName) {
  if (!fullName) return { fn: '', ln: '' }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { fn: parts[0], ln: '' }
  return { fn: parts[0], ln: parts.slice(1).join(' ') }
}

function cleanPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '1' + digits
  if (digits.length === 11 && digits[0] === '1') return digits
  return digits
}

function generateCSV(contacts) {
  const header = 'email,phone,fn,ln,ct,st,zip,country'
  const rows = contacts.filter(c => c.email || c.phone).map(c => {
    const { fn, ln } = splitName(c.name)
    return `${(c.email || '').toLowerCase().trim()},${cleanPhone(c.phone)},${fn},${ln},${(c.city || '').replace(/,/g, '')},${c.state || 'AZ'},${(c.zip || '').replace(/,/g, '')},US`
  })
  return header + '\n' + rows.join('\n')
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = filename; link.click()
  URL.revokeObjectURL(url)
}

const SOURCE_LABELS = {
  expired: 'Expired Listings', open_house: 'Open House', referral: 'Referral',
  circle: 'Circle Prospecting', soi: 'SOI / Personal', fsbo: 'FSBO',
  online: 'Online / Website', other: 'Other',
}

const TYPE_LABELS = { buyer: 'Buyers', seller: 'Sellers', both: 'Buyer & Seller', investor: 'Investors' }

const PRESET_AUDIENCES = [
  { name: 'Active Expireds (Auto-Sync)', rules: { source: 'expired', includeProspects: true, excludeStatuses: ['converted', 'dead'] }, autoSync: true },
  { name: 'All Buyers', rules: { type: 'buyer' }, autoSync: false },
  { name: 'All Sellers', rules: { type: 'seller' }, autoSync: false },
  { name: 'Open House Leads', rules: { source: 'open_house' }, autoSync: false },
  { name: 'SOI / Personal Circle', rules: { source: 'soi' }, autoSync: false },
  { name: 'Referrals', rules: { source: 'referral' }, autoSync: false },
]

export default function FacebookExport({ contacts, open, onClose }) {
  const { data: audiences, refetch: refetchAudiences } = useFbAudiences()
  const [tab, setTab] = useState('audiences') // 'audiences' | 'quick' | 'create'
  const [syncing, setSyncing] = useState(null)
  const [exporting, setExporting] = useState(null)
  const [creating, setCreating] = useState(false)
  const [newAudience, setNewAudience] = useState({ name: '', source: '', type: '', autoSync: false, includeProspects: false, excludeStatuses: [] })

  // Quick export filter
  const [quickSource, setQuickSource] = useState('all')
  const quickFiltered = useMemo(() => {
    if (quickSource === 'all') return contacts
    return contacts.filter(c => (c.source || 'Unknown') === quickSource)
  }, [contacts, quickSource])
  const quickExportable = quickFiltered.filter(c => c.email || c.phone)

  const sources = useMemo(() => {
    const map = {}
    for (const c of contacts) { const s = c.source || 'Unknown'; map[s] = (map[s] || 0) + 1 }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [contacts])

  const handleSync = async (id) => {
    setSyncing(id)
    try {
      const result = await DB.syncFbAudience(id)
      alert(`Sync complete: +${result.added} added, -${result.removed} removed, ${result.total} total`)
      refetchAudiences()
    } catch (e) { alert('Sync failed: ' + e.message) }
    finally { setSyncing(null) }
  }

  const handleExportAudience = async (aud) => {
    setExporting(aud.id)
    try {
      const members = await DB.getFbAudienceMembers(aud.id)
      const memberContacts = (members ?? []).map(m => m.contact).filter(Boolean)
      const csv = generateCSV(memberContacts)
      downloadCSV(csv, `fb_audience_${aud.name.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`)
      await DB.updateFbAudience(aud.id, { last_exported_at: new Date().toISOString() })
      refetchAudiences()
    } catch (e) { alert('Export failed: ' + e.message) }
    finally { setExporting(null) }
  }

  const handleQuickExport = () => {
    const csv = generateCSV(quickExportable)
    const src = quickSource === 'all' ? 'all-contacts' : quickSource
    downloadCSV(csv, `fb_audience_${src}_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const handleCreateAudience = async () => {
    if (!newAudience.name.trim()) return
    setCreating(true)
    try {
      const rules = {}
      if (newAudience.source) rules.source = newAudience.source
      if (newAudience.type) rules.type = newAudience.type
      if (newAudience.includeProspects) rules.includeProspects = true
      if (newAudience.excludeStatuses.length) rules.excludeStatuses = newAudience.excludeStatuses

      const aud = await DB.createFbAudience({
        name: newAudience.name.trim(),
        filter_rules: rules,
        auto_sync: newAudience.autoSync,
      })
      // Initial sync
      await DB.syncFbAudience(aud.id)
      setNewAudience({ name: '', source: '', type: '', autoSync: false, includeProspects: false, excludeStatuses: [] })
      setTab('audiences')
      refetchAudiences()
    } catch (e) { alert(e.message) }
    finally { setCreating(false) }
  }

  const handleCreatePreset = async (preset) => {
    setCreating(true)
    try {
      const aud = await DB.createFbAudience({
        name: preset.name,
        filter_rules: preset.rules,
        auto_sync: preset.autoSync,
      })
      await DB.syncFbAudience(aud.id)
      refetchAudiences()
    } catch (e) { alert(e.message) }
    finally { setCreating(false) }
  }

  const handleDeleteAudience = async (id) => {
    if (!confirm('Delete this audience?')) return
    try { await DB.deleteFbAudience(id); refetchAudiences() } catch (e) { alert(e.message) }
  }

  if (!open) return null

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never'

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', paddingTop: 40,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 640, background: '#fff', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)' }}>Facebook Audiences</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--color-border)' }}>
          {[
            { id: 'audiences', label: `My Audiences (${(audiences ?? []).length})` },
            { id: 'quick', label: 'Quick Export' },
            { id: 'create', label: '+ New Audience' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '10px 16px', fontSize: '0.82rem', fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? 'var(--brown-dark)' : 'var(--color-text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--brown-mid)' : '2px solid transparent',
              background: 'none', border: 'none', borderBottomWidth: 2, cursor: 'pointer', fontFamily: 'inherit',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

          {/* ═══ AUDIENCES TAB ═══ */}
          {tab === 'audiences' && (
            <div>
              {(audiences ?? []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30 }}>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--brown-dark)' }}>No audiences yet</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Create an audience or use a preset to get started.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                    {PRESET_AUDIENCES.map(p => (
                      <button key={p.name} onClick={() => handleCreatePreset(p)} disabled={creating}
                        style={{ padding: '6px 12px', fontSize: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, background: 'var(--color-bg-subtle, #faf8f5)', cursor: 'pointer', color: 'var(--brown-dark)' }}
                      >+ {p.name}</button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(audiences ?? []).map(aud => (
                    <div key={aud.id} style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--brown-dark)', flex: 1 }}>{aud.name}</span>
                        <Badge variant="info" size="sm">{aud.member_count} contacts</Badge>
                        {aud.auto_sync && <Badge variant="success" size="sm">Auto-Sync</Badge>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                        <span>Synced: {fmtDate(aud.last_synced_at)}</span>
                        <span>·</span>
                        <span>Exported: {fmtDate(aud.last_exported_at)}</span>
                      </div>
                      {aud.filter_rules && Object.keys(aud.filter_rules).length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                          {aud.filter_rules.source && <Badge variant="default" size="sm">Source: {SOURCE_LABELS[aud.filter_rules.source] || aud.filter_rules.source}</Badge>}
                          {aud.filter_rules.type && <Badge variant="default" size="sm">Type: {TYPE_LABELS[aud.filter_rules.type] || aud.filter_rules.type}</Badge>}
                          {aud.filter_rules.includeProspects && <Badge variant="default" size="sm">+ Prospects</Badge>}
                          {aud.filter_rules.excludeStatuses?.length > 0 && <Badge variant="warning" size="sm">Excludes: {aud.filter_rules.excludeStatuses.join(', ')}</Badge>}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button size="sm" onClick={() => handleExportAudience(aud)} disabled={exporting === aud.id}>
                          {exporting === aud.id ? 'Exporting...' : 'Export CSV'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleSync(aud.id)} disabled={syncing === aud.id}>
                          {syncing === aud.id ? 'Syncing...' : 'Sync Now'}
                        </Button>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => handleDeleteAudience(aud.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Delete</button>
                      </div>
                    </div>
                  ))}

                  {/* Quick-create presets */}
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 4 }}>Quick-Create Presets:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {PRESET_AUDIENCES.filter(p => !(audiences ?? []).some(a => a.name === p.name)).map(p => (
                        <button key={p.name} onClick={() => handleCreatePreset(p)} disabled={creating}
                          style={{ padding: '4px 10px', fontSize: '0.7rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'none', cursor: 'pointer', color: 'var(--brown-mid)' }}
                        >+ {p.name}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ QUICK EXPORT TAB ═══ */}
          {tab === 'quick' && (
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                One-click export without saving an audience. For recurring exports, create a saved audience instead.
              </p>
              <Select label="Filter by Source" value={quickSource} onChange={e => setQuickSource(e.target.value)}>
                <option value="all">All Sources ({contacts.length})</option>
                {sources.map(([src, count]) => <option key={src} value={src}>{SOURCE_LABELS[src] || src} ({count})</option>)}
              </Select>
              <div style={{ display: 'flex', gap: 12, margin: '12px 0' }}>
                <div style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8 }}>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>{quickExportable.length}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: 0 }}>Exportable</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8 }}>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-info, #5b9bd5)', margin: 0 }}>{quickFiltered.filter(c => c.email).length}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: 0 }}>With Email</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: 10, background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8 }}>
                  <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>{quickFiltered.filter(c => c.phone).length}</p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', margin: 0 }}>With Phone</p>
                </div>
              </div>
              <Button onClick={handleQuickExport} disabled={quickExportable.length === 0}>
                Download CSV ({quickExportable.length} contacts)
              </Button>
            </div>
          )}

          {/* ═══ CREATE TAB ═══ */}
          {tab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Input label="Audience Name *" value={newAudience.name} onChange={e => setNewAudience(d => ({ ...d, name: e.target.value }))} placeholder="e.g., Active Expireds, Gilbert Buyers" />
              <div style={{ display: 'flex', gap: 8 }}>
                <Select label="Filter by Source" value={newAudience.source} onChange={e => setNewAudience(d => ({ ...d, source: e.target.value }))} style={{ flex: 1 }}>
                  <option value="">Any Source</option>
                  {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
                <Select label="Filter by Type" value={newAudience.type} onChange={e => setNewAudience(d => ({ ...d, type: e.target.value }))} style={{ flex: 1 }}>
                  <option value="">Any Type</option>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={newAudience.includeProspects} onChange={e => setNewAudience(d => ({ ...d, includeProspects: e.target.checked }))} />
                Include prospects (not just contacts)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={newAudience.autoSync} onChange={e => setNewAudience(d => ({ ...d, autoSync: e.target.checked }))} />
                Auto-sync (new matches added, sold/removed contacts removed)
              </label>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 3 }}>Exclude statuses (auto-remove when contact reaches these)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['converted', 'dead', 'closed', 'relisted', 'inactive'].map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', padding: '3px 8px', border: '1px solid var(--color-border)', borderRadius: 6, cursor: 'pointer', background: newAudience.excludeStatuses.includes(s) ? 'var(--color-bg-success, #e8f5e9)' : 'none' }}>
                      <input type="checkbox" checked={newAudience.excludeStatuses.includes(s)} onChange={e => {
                        setNewAudience(d => ({
                          ...d,
                          excludeStatuses: e.target.checked ? [...d.excludeStatuses, s] : d.excludeStatuses.filter(x => x !== s)
                        }))
                      }} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <Button onClick={handleCreateAudience} disabled={creating || !newAudience.name.trim()}>
                {creating ? 'Creating & Syncing...' : 'Create Audience & Sync'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

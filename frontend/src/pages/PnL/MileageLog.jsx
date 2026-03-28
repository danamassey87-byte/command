import { useState, useMemo, useEffect } from 'react'
import { SectionHeader, Card, Button, SlidePanel, Input, Select } from '../../components/ui/index.jsx'
import { useMileageLog } from '../../lib/hooks.js'
import { useBrand } from '../../lib/BrandContext.jsx'
import {
  createMileageEntry, updateMileageEntry, deleteMileageEntry,
  createMileageBatch, getUnloggedShowings,
} from '../../lib/supabase.js'
import './PnL.css'

const fmt = (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const IRS_RATE = 0.70 // 2026 IRS standard mileage rate

const SOURCE_LABELS = { manual: 'Manual', showing: 'Showing', open_house: 'Open House', listing_appt: 'Listing Appt' }

const EMPTY = {
  date: new Date().toISOString().split('T')[0],
  description: '',
  miles: '',
  start_address: '',
  end_address: '',
  round_trip: true,
  source: 'manual',
}

export default function MileageLog() {
  const year = new Date().getFullYear()
  const from = `${year}-01-01`
  const to   = `${year}-12-31`

  const { brand } = useBrand()
  const homeAddress = brand?.signature?.home_address ?? ''

  const mileage = useMileageLog(from, to)
  const [panel, setPanel]             = useState(null)   // null | 'add' | entry object
  const [draft, setDraft]             = useState(EMPTY)
  const [saving, setSaving]           = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [unlogged, setUnlogged]       = useState([])
  const [importing, setImporting]     = useState(false)
  const [importMiles, setImportMiles] = useState({})     // sessionId -> miles estimate

  const all = mileage.data ?? []

  const totalMiles     = all.reduce((s, m) => s + Number(m.miles || 0), 0)
  const totalDeduction = totalMiles * IRS_RATE

  // Monthly breakdown
  const monthly = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({ miles: 0, trips: 0 }))
    all.forEach(m => {
      const mo = new Date(m.date).getMonth()
      months[mo].miles += Number(m.miles || 0)
      months[mo].trips++
    })
    return months
  }, [all])

  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

  // ─── Panel handlers ───
  function openAdd() {
    setDraft({ ...EMPTY, start_address: homeAddress, end_address: homeAddress })
    setPanel('add')
  }

  function openEdit(entry) {
    setDraft({
      date:          entry.date,
      description:   entry.description ?? '',
      miles:         entry.miles ?? '',
      start_address: entry.start_address ?? homeAddress,
      end_address:   entry.end_address ?? homeAddress,
      round_trip:    entry.round_trip ?? true,
      source:        entry.source ?? 'manual',
    })
    setPanel(entry)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        date:          draft.date,
        description:   draft.description || null,
        miles:         Number(draft.miles),
        start_address: draft.start_address || null,
        end_address:   draft.end_address || null,
        round_trip:    draft.round_trip,
        source:        draft.source || 'manual',
      }
      if (panel === 'add') await createMileageEntry(payload)
      else await updateMileageEntry(panel.id, payload)
      setPanel(null)
      mileage.refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!confirm('Delete this mileage entry?')) return
    try {
      await deleteMileageEntry(panel.id)
      setPanel(null)
      mileage.refetch()
    } catch (e) { alert(e.message) }
  }

  // ─── Import from showings ───
  async function loadUnlogged() {
    setShowImport(true)
    try {
      const sessions = await getUnloggedShowings(from, to)
      setUnlogged(sessions)
      // Pre-fill miles estimates (empty — user fills in)
      const est = {}
      sessions.forEach(s => { est[s.id] = '' })
      setImportMiles(est)
    } catch (e) { alert(e.message) }
  }

  async function handleImport() {
    const rows = []
    for (const session of unlogged) {
      const miles = Number(importMiles[session.id])
      if (!miles || miles <= 0) continue
      const addresses = (session.showings ?? [])
        .map(sh => sh.property?.address).filter(Boolean)
      rows.push({
        date:          session.date,
        description:   `Showing: ${session.contact?.name ?? 'Buyer'} — ${addresses.join(', ') || 'multiple properties'}`,
        miles,
        start_address: homeAddress || null,
        end_address:   homeAddress || null,
        round_trip:    true,
        source:        'showing',
        source_id:     session.id,
        property_id:   session.showings?.[0]?.property?.id || null,
      })
    }
    if (rows.length === 0) { alert('Enter miles for at least one session.'); return }
    setImporting(true)
    try {
      await createMileageBatch(rows)
      mileage.refetch()
      setShowImport(false)
      setUnlogged([])
    } catch (e) { alert(e.message) }
    finally { setImporting(false) }
  }

  // ─── Effective miles display (shows round-trip doubled) ───
  function effectiveMiles(entry) {
    const base = Number(entry.miles || 0)
    return entry.round_trip ? base : base
  }

  return (
    <>
      <SectionHeader
        title="Mileage Log"
        subtitle={`${year} · IRS Rate: $${IRS_RATE.toFixed(3)}/mile`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={loadUnlogged}>Import from Showings</Button>
            <Button onClick={openAdd}>+ Log Trip</Button>
          </div>
        }
      />

      {/* ─── KPIs ─── */}
      <div className="pnl-kpis">
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Total Miles</p>
          <p className="pnl-kpi__value">{totalMiles.toLocaleString('en-US', { maximumFractionDigits: 1 })}</p>
          <p className="pnl-kpi__sub">{all.length} trips logged</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Tax Deduction</p>
          <p className="pnl-kpi__value pnl-kpi__value--green">{fmt(totalDeduction)}</p>
          <p className="pnl-kpi__sub">at ${IRS_RATE.toFixed(3)}/mile</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">Avg per Trip</p>
          <p className="pnl-kpi__value">{all.length > 0 ? (totalMiles / all.length).toFixed(1) : '0'}</p>
          <p className="pnl-kpi__sub">miles</p>
        </Card>
        <Card className="pnl-kpi">
          <p className="pnl-kpi__label">From Showings</p>
          <p className="pnl-kpi__value">{all.filter(m => m.source === 'showing').length}</p>
          <p className="pnl-kpi__sub">auto-imported trips</p>
        </Card>
      </div>

      {/* ─── Home base banner ─── */}
      {!homeAddress && (
        <Card className="mil-home-banner">
          <p>Set your home address in <strong>Settings &rarr; Signature</strong> to auto-fill start/end for mileage tracking.</p>
        </Card>
      )}

      {/* ─── Monthly Summary ─── */}
      <Card padding>
        <p className="pnl-bar-chart__title">Monthly Mileage</p>
        <div className="pnl-bars">
          {monthly.map((m, i) => {
            const maxMiles = Math.max(...monthly.map(x => x.miles), 1)
            return (
              <div key={i} className="pnl-bar">
                <span className="pnl-bar__label">{MONTH_LABELS[i]}</span>
                <div className="pnl-bar__track">
                  <div className="pnl-bar__fill pnl-bar__fill--income" style={{ width: `${(m.miles / maxMiles) * 100}%` }} />
                </div>
                <span className="pnl-bar__value">{m.miles > 0 ? `${m.miles.toFixed(0)} mi` : '—'}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ─── Trip List ─── */}
      <Card padding={false}>
        {all.length === 0 ? (
          <div className="pnl-empty">
            <div className="pnl-empty__icon">&#128663;</div>
            <p className="pnl-empty__title">No trips logged</p>
            <p className="pnl-empty__sub">Log your business driving to track your mileage deduction, or import trips from your showing sessions automatically.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" onClick={loadUnlogged}>Import from Showings</Button>
              <Button onClick={openAdd}>+ Log Trip</Button>
            </div>
          </div>
        ) : (
          <table className="pnl-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Route</th>
                <th>Source</th>
                <th>Miles</th>
                <th>Deduction</th>
              </tr>
            </thead>
            <tbody>
              {all.map(entry => (
                <tr key={entry.id} onClick={() => openEdit(entry)}>
                  <td>{new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td className="pnl-table__vendor">{entry.description || entry.property?.address || '—'}</td>
                  <td className="mil-route">
                    {entry.start_address ? (
                      <span className="mil-route__text">
                        {truncAddr(entry.start_address)} &rarr; {truncAddr(entry.end_address || entry.start_address)}
                        {entry.round_trip && ' (RT)'}
                      </span>
                    ) : '—'}
                  </td>
                  <td><span className={`mil-source mil-source--${entry.source || 'manual'}`}>{SOURCE_LABELS[entry.source] || 'Manual'}</span></td>
                  <td className="pnl-table__amount">{Number(entry.miles).toFixed(1)}</td>
                  <td className="pnl-table__amount">{fmt(Number(entry.miles) * IRS_RATE)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 600 }}>
                <td colSpan="4" style={{ textAlign: 'right', paddingRight: 12 }}>Total</td>
                <td className="pnl-table__amount">{totalMiles.toFixed(1)}</td>
                <td className="pnl-table__amount">{fmt(totalDeduction)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      {/* ─── Add / Edit Panel ─── */}
      <SlidePanel open={!!panel} onClose={() => setPanel(null)} title={panel === 'add' ? 'Log Trip' : 'Edit Trip'}>
        <div className="pnl-form">
          <Input label="Date" type="date" value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} />

          <Input
            label="Description"
            value={draft.description}
            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
            placeholder="e.g., Showing at 123 Main St"
          />

          <div className="pnl-form__row">
            <Input
              label="Start Address"
              value={draft.start_address}
              onChange={e => setDraft(d => ({ ...d, start_address: e.target.value }))}
              placeholder={homeAddress || 'Your home address'}
            />
            <Input
              label="End Address"
              value={draft.end_address}
              onChange={e => setDraft(d => ({ ...d, end_address: e.target.value }))}
              placeholder={homeAddress || 'Your home address'}
            />
          </div>

          {homeAddress && (draft.start_address !== homeAddress || draft.end_address !== homeAddress) && (
            <button
              type="button"
              className="mil-reset-home"
              onClick={() => setDraft(d => ({ ...d, start_address: homeAddress, end_address: homeAddress }))}
            >
              Reset to home address
            </button>
          )}

          <div className="pnl-form__row">
            <Input
              label="Miles (one way)"
              type="number"
              step="0.1"
              value={draft.miles}
              onChange={e => setDraft(d => ({ ...d, miles: e.target.value }))}
              placeholder="12.5"
            />
            <div className="field">
              <label className="field__label">Round Trip?</label>
              <label className="mil-rt-toggle">
                <input
                  type="checkbox"
                  checked={draft.round_trip}
                  onChange={e => setDraft(d => ({ ...d, round_trip: e.target.checked }))}
                />
                <span>{draft.round_trip ? 'Yes — doubles miles' : 'No — one way only'}</span>
              </label>
            </div>
          </div>

          {Number(draft.miles) > 0 && (
            <div className="pnl-form__commission-calc">
              <div className="pnl-form__calc-row">
                <span>One way</span>
                <span>{Number(draft.miles).toFixed(1)} mi</span>
              </div>
              {draft.round_trip && (
                <div className="pnl-form__calc-row">
                  <span>Round trip</span>
                  <span>{(Number(draft.miles) * 2).toFixed(1)} mi</span>
                </div>
              )}
              <div className="pnl-form__calc-row pnl-form__calc-row--total">
                <span>Tax deduction</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                  {fmt((draft.round_trip ? Number(draft.miles) * 2 : Number(draft.miles)) * IRS_RATE)}
                </span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button onClick={handleSave} disabled={saving || !draft.miles}>
              {saving ? 'Saving...' : panel === 'add' ? 'Log Trip' : 'Save Changes'}
            </Button>
            {panel !== 'add' && <Button variant="danger" onClick={handleDelete}>Delete</Button>}
          </div>
        </div>
      </SlidePanel>

      {/* ─── Import from Showings Panel ─── */}
      <SlidePanel open={showImport} onClose={() => setShowImport(false)} title="Import from Showings" width={540}>
        <div className="pnl-form">
          <p className="mil-import-desc">
            These are showing sessions that don't have mileage logged yet.
            Enter the miles for each trip (round-trip from{' '}
            <strong>{homeAddress || 'your home'}</strong>).
            You can change your home address in Settings.
          </p>

          {unlogged.length === 0 ? (
            <div className="pnl-empty" style={{ padding: '40px 20px' }}>
              <div className="pnl-empty__icon">&#10003;</div>
              <p className="pnl-empty__title">All caught up</p>
              <p className="pnl-empty__sub">Every showing session in {year} already has mileage logged.</p>
            </div>
          ) : (
            <>
              {unlogged.map(session => {
                const addresses = (session.showings ?? []).map(sh => sh.property?.address).filter(Boolean)
                return (
                  <div key={session.id} className="mil-import-row">
                    <div className="mil-import-info">
                      <div className="mil-import-date">
                        {new Date(session.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="mil-import-detail">
                        <strong>{session.contact?.name ?? 'Buyer'}</strong>
                        <span className="mil-import-addrs">{addresses.join(' / ') || 'No addresses'}</span>
                        <span className="mil-import-count">{session.showings?.length ?? 0} showing{(session.showings?.length ?? 0) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="mil-import-miles">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="mi"
                        className="mil-import-input"
                        value={importMiles[session.id] ?? ''}
                        onChange={e => setImportMiles(prev => ({ ...prev, [session.id]: e.target.value }))}
                      />
                      <span className="mil-import-rt">RT</span>
                    </div>
                  </div>
                )
              })}

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? 'Importing...' : `Import ${Object.values(importMiles).filter(v => Number(v) > 0).length} Trips`}
                </Button>
              </div>
            </>
          )}
        </div>
      </SlidePanel>
    </>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function truncAddr(addr) {
  if (!addr) return '—'
  // Show first part before the comma (street address only)
  const parts = addr.split(',')
  const street = parts[0].trim()
  return street.length > 25 ? street.slice(0, 22) + '...' : street
}

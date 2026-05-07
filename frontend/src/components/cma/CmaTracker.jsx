// ─────────────────────────────────────────────────────────────────────────────
// CmaTracker — upload a CMA PDF, parse comps via Claude, then weekly-review.
//
// Renders inside listing detail (and could be reused on contact profile for
// pre-listing CMAs). Three sections:
//   1. Upload zone + recent CMAs list
//   2. Per-CMA expanded view: subject estimate + comp table with weekly check
//   3. Verdict button: still_valid / needs_reprice / stale_skip
//
// Comps are stored individually so each row can be checked + updated as the
// weeks pass. The "currently still valid" verdict is what Dana cares about.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import { Button, Badge } from '../ui/index.jsx'
import * as DB from '../../lib/supabase.js'

const STATUS_OPTIONS = [
  { v: 'sold', l: 'Sold' },
  { v: 'active', l: 'Active' },
  { v: 'pending', l: 'Pending' },
  { v: 'expired', l: 'Expired' },
  { v: 'withdrawn', l: 'Withdrawn' },
  { v: 'unknown', l: 'Unknown' },
]

const VERDICTS = [
  { v: 'still_valid',   l: '✓ Still valid',     variant: 'success', desc: 'Numbers still hold; keep current price' },
  { v: 'needs_reprice', l: '⚠️ Reprice',         variant: 'warning', desc: 'Comps shifted; price needs adjusting' },
  { v: 'stale_skip',    l: '⏸ Stale / skip',    variant: 'default', desc: 'Nothing actionable this week' },
]

function fmtDollar(v) {
  if (!v && v !== 0) return '—'
  return '$' + Number(v).toLocaleString()
}
function fmtDate(d) {
  if (!d) return '—'
  try { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) }
  catch { return d }
}
function daysAgo(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export default function CmaTracker({ listingId = null, contactId = null, propertyId = null, addressLabel = '' }) {
  const [cmas, setCmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [parsing, setParsing] = useState({}) // { cma_id: bool }
  const [error, setError] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const data = await DB.getCmas({ listingId, contactId })
      setCmas(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [listingId, contactId])

  useEffect(() => { load() }, [load])

  async function handleUpload(file) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Only PDFs are supported. Export your NARRPR CMA as PDF first.')
      return
    }
    setUploading(true); setError(null)
    try {
      // 1. Create CMA row first to get an ID for the storage path.
      const cma = await DB.createCma({
        listing_id: listingId,
        contact_id: contactId,
        property_id: propertyId,
        label: file.name.replace(/\.pdf$/i, '').slice(0, 200),
        source: 'narrpr',
      })
      // 2. Upload PDF keyed on cma.id.
      const { path, url } = await DB.uploadCmaPdf(file, cma.id)
      await DB.updateCma(cma.id, { file_path: path, file_url: url })
      // 3. Kick off the parse — non-blocking from the user's POV (but we await so
      //    the spinner stays accurate).
      setParsing(p => ({ ...p, [cma.id]: true }))
      try {
        await DB.parseCma(cma.id)
      } catch (e) {
        // Parse failed but the row + PDF still exist — Dana can edit comps manually.
        setError(`Parse failed (PDF uploaded though): ${e.message}`)
      }
      setParsing(p => ({ ...p, [cma.id]: false }))
      setExpandedId(cma.id)
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function reparse(cmaId) {
    setParsing(p => ({ ...p, [cmaId]: true }))
    try {
      await DB.parseCma(cmaId)
      await load()
    } catch (e) {
      setError(`Re-parse failed: ${e.message}`)
    } finally {
      setParsing(p => ({ ...p, [cmaId]: false }))
    }
  }

  async function handleDelete(cmaId) {
    if (!confirm('Remove this CMA?')) return
    try {
      await DB.softDeleteCma(cmaId)
      await load()
    } catch (e) { setError(e.message) }
  }

  if (loading) {
    return <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading CMAs…</p>
  }

  return (
    <div>
      {/* Header + upload */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontStyle: 'italic', fontWeight: 400, color: 'var(--brown-dark)', margin: 0 }}>
            CMA Tracker
          </h3>
          <p style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            Upload your NARRPR CMA PDF · we'll parse the comps · revisit weekly.
          </p>
        </div>
        <label style={{ cursor: uploading ? 'wait' : 'pointer', padding: '7px 14px', borderRadius: 8, background: 'var(--brown-dark)', color: '#fff', fontSize: '0.82rem', fontWeight: 500, opacity: uploading ? 0.7 : 1 }}>
          {uploading ? 'Uploading…' : '＋ Upload CMA PDF'}
          <input
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = '' }}
          />
        </label>
      </div>

      {error && (
        <div style={{ background: '#fdecea', border: '1px solid #f5c6c0', color: '#8a1c0e', padding: '8px 12px', borderRadius: 6, fontSize: '0.82rem', marginBottom: 10 }}>{error}</div>
      )}

      {cmas.length === 0 && !uploading && (
        <div style={{ padding: '24px 16px', background: 'var(--cream, #faf8f5)', border: '1px dashed var(--color-border)', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>📊</div>
          <p style={{ fontSize: '0.88rem', color: 'var(--brown-dark)', margin: '0 0 4px', fontWeight: 500 }}>No CMAs uploaded yet</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
            Build your CMA in NARRPR, export as PDF, drop it here.
            We'll auto-extract the comps and the subject estimate so you can revisit them weekly.
          </p>
        </div>
      )}

      {cmas.map(cma => {
        const isExpanded = expandedId === cma.id
        const isParsing = parsing[cma.id] || cma.parse_status === 'parsing'
        const compsCount = (cma.comps || []).length
        const lastReviewedDays = daysAgo(cma.last_reviewed_at)
        return (
          <div key={cma.id} style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : cma.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brown-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {cma.label || cma.subject_address || 'Untitled CMA'}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {fmtDate(cma.uploaded_at?.slice(0, 10))} ·
                  {' '}{compsCount} comp{compsCount === 1 ? '' : 's'} ·
                  {' '}
                  {cma.subject_estimate_low && cma.subject_estimate_high
                    ? `${fmtDollar(cma.subject_estimate_low)}–${fmtDollar(cma.subject_estimate_high)}`
                    : 'no estimate yet'}
                  {lastReviewedDays !== null && (
                    <span> · reviewed {lastReviewedDays}d ago</span>
                  )}
                </div>
              </div>
              {isParsing && <Badge variant="info" size="sm">Parsing…</Badge>}
              {!isParsing && cma.parse_status === 'failed' && <Badge variant="danger" size="sm">Parse failed</Badge>}
              {cma.review_verdict && (() => {
                const v = VERDICTS.find(x => x.v === cma.review_verdict)
                return v ? <Badge variant={v.variant} size="sm">{v.l}</Badge> : null
              })()}
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{isExpanded ? '▾' : '▸'}</span>
            </button>

            {isExpanded && (
              <CmaDetail
                cma={cma}
                isParsing={isParsing}
                onReparse={() => reparse(cma.id)}
                onDelete={() => handleDelete(cma.id)}
                onChanged={load}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Detail view (expanded card) ─────────────────────────────────────────────
function CmaDetail({ cma, isParsing, onReparse, onDelete, onChanged }) {
  const comps = cma.comps || []
  const [updating, setUpdating] = useState({}) // { comp_id: bool }
  const [verdictNote, setVerdictNote] = useState(cma.notes || '')
  const [savingVerdict, setSavingVerdict] = useState(null) // verdict key while saving

  // Comps sorted by position then created.
  const sortedComps = useMemo(
    () => [...comps].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    [comps]
  )

  async function patchComp(id, patch) {
    setUpdating(s => ({ ...s, [id]: true }))
    try {
      await DB.updateCmaComp(id, patch)
      await onChanged()
    } catch (e) {
      alert(e.message)
    } finally {
      setUpdating(s => ({ ...s, [id]: false }))
    }
  }

  async function markChecked(comp) {
    setUpdating(s => ({ ...s, [comp.id]: true }))
    try {
      await DB.markCmaCompChecked(comp.id)
      await onChanged()
    } catch (e) {
      alert(e.message)
    } finally {
      setUpdating(s => ({ ...s, [comp.id]: false }))
    }
  }

  async function recordVerdict(verdict) {
    setSavingVerdict(verdict)
    try {
      await DB.setCmaReviewVerdict(cma.id, verdict, verdictNote)
      await onChanged()
    } catch (e) {
      alert(e.message)
    } finally {
      setSavingVerdict(null)
    }
  }

  return (
    <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--color-border-light, #f0ece6)' }}>
      {/* Subject summary */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap', padding: '12px 0' }}>
        {cma.subject_address && (
          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--brown-dark)' }}>{cma.subject_address}</span>
        )}
        {cma.subject_estimate_low != null && cma.subject_estimate_high != null && (
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Range: <strong style={{ color: 'var(--brown-dark)' }}>{fmtDollar(cma.subject_estimate_low)}–{fmtDollar(cma.subject_estimate_high)}</strong>
          </span>
        )}
        {cma.subject_recommended_price != null && (
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Recommended: <strong style={{ color: 'var(--brown-dark)' }}>{fmtDollar(cma.subject_recommended_price)}</strong>
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {cma.file_url && (
            <a href={cma.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: 'var(--brown-warm)', textDecoration: 'none' }}>
              📄 Open PDF
            </a>
          )}
          <button
            type="button"
            onClick={onReparse}
            disabled={isParsing}
            style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border)', background: '#fff', cursor: isParsing ? 'wait' : 'pointer' }}
            title="Re-run the AI parse on the uploaded PDF (replaces existing comps)"
          >
            {isParsing ? '…' : '↻ Re-parse'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            style={{ fontSize: '0.78rem', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-danger, #b91c1c)', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}
          >
            Delete
          </button>
        </span>
      </div>

      {/* Comps table */}
      {sortedComps.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '12px 0' }}>
          {isParsing
            ? 'Extracting comps from the PDF — this usually takes 10–30 seconds…'
            : cma.parse_status === 'failed'
              ? 'Parse failed. Try ↻ Re-parse, or check that the PDF actually contains a CMA.'
              : 'No comps yet.'}
        </p>
      ) : (
        <div style={{ overflowX: 'auto', marginBottom: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-light, #f0ece6)' }}>
                <th style={{ textAlign: 'left',  padding: '6px 8px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Address</th>
                <th style={{ textAlign: 'left',  padding: '6px 8px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Specs</th>
                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Original</th>
                <th style={{ textAlign: 'left',  padding: '6px 8px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Now</th>
                <th style={{ textAlign: 'left',  padding: '6px 8px', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Last check</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedComps.map(c => {
                const isStale = !c.last_checked_at
                  || (Date.now() - new Date(c.last_checked_at).getTime()) > 7 * 86400000
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border-light, #f0ece6)' }}>
                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 500, color: 'var(--brown-dark)' }}>{c.address}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {[c.city, c.mls_id ? `MLS ${c.mls_id}` : null].filter(Boolean).join(' · ')}
                      </div>
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'top', fontSize: '0.74rem', color: 'var(--color-text-muted)' }}>
                      {[
                        c.beds ? `${c.beds}bd` : null,
                        c.baths ? `${c.baths}ba` : null,
                        c.sqft ? `${c.sqft.toLocaleString()} sf` : null,
                        c.year_built ? `${c.year_built}` : null,
                      ].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'top', textAlign: 'right' }}>
                      <div style={{ fontWeight: 500, color: 'var(--brown-dark)' }}>{fmtDollar(c.original_sale_price || c.original_list_price)}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {[c.original_status || '—', fmtDate(c.original_sale_date)].join(' · ')}
                      </div>
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                      <select
                        value={c.current_status || ''}
                        onChange={e => patchComp(c.id, { current_status: e.target.value || null })}
                        disabled={updating[c.id]}
                        style={{ fontSize: '0.74rem', padding: '2px 4px', borderRadius: 4, border: '1px solid var(--color-border)', background: '#fff', maxWidth: '100%' }}
                      >
                        <option value="">— same as orig —</option>
                        {STATUS_OPTIONS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                      <input
                        type="number"
                        placeholder="Current $"
                        value={c.current_price ?? ''}
                        onChange={e => patchComp(c.id, { current_price: e.target.value ? Number(e.target.value) : null })}
                        disabled={updating[c.id]}
                        style={{ display: 'block', marginTop: 4, width: '100%', fontSize: '0.74rem', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--color-border)', background: '#fff' }}
                      />
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                      {c.last_checked_at ? (
                        <span style={{ fontSize: '0.74rem', color: isStale ? 'var(--color-warning, #c8a05a)' : 'var(--color-text-muted)' }}>
                          {daysAgo(c.last_checked_at)}d ago
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.74rem', color: 'var(--color-warning, #c8a05a)' }}>never</span>
                      )}
                    </td>
                    <td style={{ padding: '8px', verticalAlign: 'top' }}>
                      <button
                        type="button"
                        onClick={() => markChecked(c)}
                        disabled={updating[c.id]}
                        style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: 6, border: 'none', background: 'var(--brown-dark)', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        title="Mark this comp as just-checked"
                      >
                        ✓ Checked
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Weekly verdict */}
      {sortedComps.length > 0 && (
        <div style={{ background: 'var(--cream, #faf8f5)', borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 6 }}>
            Weekly verdict
          </div>
          <textarea
            placeholder="What changed this week? (optional)"
            value={verdictNote}
            onChange={e => setVerdictNote(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid var(--color-border)', background: '#fff', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }}
          />
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VERDICTS.map(v => (
              <button
                key={v.v}
                type="button"
                onClick={() => recordVerdict(v.v)}
                disabled={savingVerdict !== null}
                title={v.desc}
                style={{
                  padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)',
                  background: cma.review_verdict === v.v ? 'var(--brown-dark)' : '#fff',
                  color: cma.review_verdict === v.v ? '#fff' : 'var(--brown-dark)',
                  fontSize: '0.78rem', fontWeight: 500, cursor: 'pointer',
                }}
              >
                {savingVerdict === v.v ? '…' : v.l}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

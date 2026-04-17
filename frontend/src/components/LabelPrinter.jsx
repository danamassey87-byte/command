import { useState, useMemo, useCallback } from 'react'
import { Button, Badge, Input } from './ui/index.jsx'

/**
 * Avery 5160 Label Printer.
 * Accepts contacts array, lets you pick which to print,
 * choose a start position (for partial sheets), and drag to rearrange.
 *
 * Avery 5160: 30 labels/sheet, 3 cols × 10 rows
 * Label: 2.625" × 1" | Sheet: 8.5" × 11"
 * Top margin: 0.5" | Left margin: 0.1875" | Gutter: 0.125"
 */

const LABELS_PER_SHEET = 30
const COLS = 3
const ROWS = 10

export default function LabelPrinter({ contacts, open, onClose }) {
  const [selected, setSelected] = useState(new Set())
  const [startAt, setStartAt] = useState(1) // 1-indexed label position to start
  const [search, setSearch] = useState('')
  const [labelOrder, setLabelOrder] = useState([]) // ordered list of contact IDs for the sheet
  const [dragIdx, setDragIdx] = useState(null)

  const filtered = useMemo(() => {
    if (!search) return contacts
    const q = search.toLowerCase()
    return contacts.filter(c =>
      (c.name ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.address ?? '').toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q)
    )
  }, [contacts, search])

  const toggleContact = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(filtered.map(c => c.id)))
  const selectNone = () => setSelected(new Set())

  // Build the label sheet preview
  const labels = useMemo(() => {
    const selectedContacts = contacts.filter(c => selected.has(c.id))
    // If user has reordered, use that order; otherwise use selection order
    if (labelOrder.length > 0) {
      const ordered = labelOrder.map(id => selectedContacts.find(c => c.id === id)).filter(Boolean)
      // Add any newly selected that aren't in the order yet
      const inOrder = new Set(labelOrder)
      selectedContacts.forEach(c => { if (!inOrder.has(c.id)) ordered.push(c) })
      return ordered
    }
    return selectedContacts
  }, [contacts, selected, labelOrder])

  // Blank labels before start position
  const blanksBefore = Math.max(0, (startAt - 1))

  const handleDragStart = (idx) => setDragIdx(idx)
  const handleDragOver = (e, idx) => { e.preventDefault() }
  const handleDrop = (targetIdx) => {
    if (dragIdx === null || dragIdx === targetIdx) return
    const ids = labels.map(c => c.id)
    const [moved] = ids.splice(dragIdx, 1)
    ids.splice(targetIdx, 0, moved)
    setLabelOrder(ids)
    setDragIdx(null)
  }

  const handlePrint = () => {
    if (labels.length === 0) return

    const allLabels = []
    // Add blank labels for start position
    for (let i = 0; i < blanksBefore; i++) {
      allLabels.push({ blank: true })
    }
    labels.forEach(c => {
      allLabels.push({
        name: c.name || '',
        line1: c.address || '',
        line2: `${c.city || ''}${c.city && c.state ? ', ' : ''}${c.state || 'AZ'} ${c.zip || ''}`.trim(),
      })
    })

    const win = window.open('', '_blank')
    if (!win) return

    const labelHtml = allLabels.map(l => {
      if (l.blank) return '<div class="label"></div>'
      const name = l.name.length > 32 ? l.name.substring(0, 30) + '...' : l.name
      return `<div class="label">
        <div class="label-name">${name}</div>
        <div class="label-addr">${l.line1}</div>
        <div class="label-addr">${l.line2}</div>
      </div>`
    }).join('')

    win.document.write(`<!DOCTYPE html>
<html><head><title>Avery 5160 Labels</title>
<style>
  @page { size: letter; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; }
  .sheet { width: 8.5in; min-height: 11in; padding-top: 0.5in; padding-left: 0.1875in; display: flex; flex-wrap: wrap; align-content: flex-start; }
  .label { width: 2.625in; height: 1in; padding: 0.15in 0.2in; display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
  .label-name { font-size: 9pt; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .label-addr { font-size: 8pt; line-height: 1.3; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .no-print { display: none; }
  @media screen { .sheet { border: 1px solid #ccc; margin: 20px auto; background: #fff; }
    .label { border: 1px dashed #e0e0e0; } .no-print { display: block; } }
</style></head>
<body>
  <div class="no-print" style="text-align:center;padding:16px">
    <button onclick="window.print()" style="padding:10px 24px;font-size:14px;background:#342922;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">Print Labels</button>
    <span style="margin-left:12px;color:#888;font-size:13px">${labels.length} labels, starting at position ${startAt}</span>
  </div>
  <div class="sheet">${labelHtml}</div>
</body></html>`)
  }

  if (!open) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', paddingTop: 40,
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        width: '100%', maxWidth: 700, background: '#fff', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--brown-dark)' }}>Print Mailing Labels</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Avery 5160 (30 labels/sheet, 3×10)</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>×</button>
        </div>

        {/* Controls */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border-light, #f0ece6)', display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 2 }}>Search</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter contacts..." style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
          </div>
          <div style={{ width: 120 }}>
            <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 2 }}>Start at Label #</label>
            <input type="number" min="1" max="30" value={startAt} onChange={e => setStartAt(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
          </div>
          <button onClick={selectAll} style={{ padding: '6px 12px', fontSize: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'none', cursor: 'pointer' }}>Select All</button>
          <button onClick={selectNone} style={{ padding: '6px 12px', fontSize: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'none', cursor: 'pointer' }}>Clear</button>
        </div>

        {/* Contact list + Sheet preview side by side */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Contact picker */}
          <div style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid var(--color-border-light, #f0ece6)', padding: '8px 0' }}>
            {filtered.map(c => (
              <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', cursor: 'pointer', fontSize: '0.82rem' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover, #f5f0ea)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleContact(c.id)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  {c.address && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{c.address}</span>}
                </div>
                {c.city && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{c.city}</span>}
              </label>
            ))}
            {filtered.length === 0 && <p style={{ padding: 20, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>No contacts match</p>}
          </div>

          {/* Sheet preview */}
          <div style={{ width: 280, overflowY: 'auto', padding: 12, background: 'var(--color-bg-subtle, #faf8f5)' }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--brown-dark)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Sheet Preview — {labels.length} labels{blanksBefore > 0 ? ` (skip ${blanksBefore})` : ''}
            </p>
            <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', margin: '0 0 8px' }}>Drag to reorder</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
              {/* Blanks */}
              {Array.from({ length: blanksBefore }).map((_, i) => (
                <div key={`blank-${i}`} style={{ height: 28, background: 'rgba(0,0,0,0.04)', borderRadius: 3, border: '1px dashed var(--color-border)' }} />
              ))}
              {/* Labels */}
              {labels.map((c, i) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={e => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  style={{
                    height: 28, padding: '2px 4px', fontSize: '0.55rem', lineHeight: 1.2,
                    background: '#fff', borderRadius: 3, border: '1px solid var(--color-border)',
                    cursor: 'grab', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}
                  title={`${c.name}\n${c.address || ''}`}
                >
                  <strong>{(c.name || '').split(' ')[0]}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge variant="info" size="sm">{selected.size} selected</Badge>
          {blanksBefore > 0 && <Badge variant="warning" size="sm">Skip {blanksBefore} labels</Badge>}
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handlePrint} disabled={labels.length === 0}>
            Print {labels.length} Label{labels.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  )
}

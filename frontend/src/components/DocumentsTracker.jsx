import { useState, useMemo } from 'react'
import { Button, Badge, Input, Select } from './ui/index.jsx'
import { useTransactionDocuments } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

const STATUS_OPTIONS = ['Not Received', 'Pending', 'Received', 'Waived', 'N/A']

function statusStyle(status) {
  switch (status) {
    case 'Received': return { bg: 'rgba(139,154,123,.15)', color: '#566b4a' }
    case 'Pending':  return { bg: 'rgba(184,153,90,.18)', color: '#7d5f23' }
    case 'Waived':
    case 'N/A':      return { bg: 'rgba(180,180,180,.15)', color: '#666' }
    default:         return { bg: 'rgba(192,96,74,.10)', color: '#c0604a' }
  }
}

function DocumentRow({ doc, onChange, onDelete }) {
  const ss = statusStyle(doc.status)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ ...doc })

  const save = async () => {
    await onChange(doc.id, {
      status: draft.status,
      date_received: draft.date_received || null,
      notes: draft.notes || null,
      file_url: draft.file_url || null,
    })
    setEditing(false)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: '8px 12px', background: 'var(--cream-3, #F6F4EE)',
      borderLeft: `3px solid ${ss.color}`, borderRadius: 'var(--radius-md, 6px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.6rem', padding: '1px 6px', borderRadius: 999,
          background: ss.bg, color: ss.color,
          fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.06em',
        }}>{doc.status}</span>
        <span style={{ fontSize: '0.82rem', color: 'var(--brown-dark)', fontWeight: 500, flex: 1 }}>{doc.name}</span>
        {doc.responsible_party && (
          <span style={{
            fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3,
            background: doc.responsible_party === 'TC' ? 'rgba(184,153,90,.18)' : 'rgba(139,154,123,.18)',
            color: doc.responsible_party === 'TC' ? '#7d5f23' : '#566b4a',
            fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.06em',
          }}>{doc.responsible_party}</span>
        )}
        <Button size="sm" variant="ghost" onClick={() => setEditing(e => !e)}>
          {editing ? 'Cancel' : 'Edit'}
        </Button>
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: '0.7rem', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
        {doc.required_by && <span>Due: {doc.required_by}</span>}
        {doc.date_received && <span>Received: {new Date(doc.date_received).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
        {doc.file_url && (
          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brown-mid)' }}>
            ↗ Open file
          </a>
        )}
      </div>
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 8, background: '#fff', borderRadius: 4 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value })} style={{ flex: 1 }}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Input type="date" value={draft.date_received ?? ''} onChange={e => setDraft({ ...draft, date_received: e.target.value })} style={{ flex: 1 }} />
          </div>
          <Input placeholder="File URL (optional)" value={draft.file_url ?? ''} onChange={e => setDraft({ ...draft, file_url: e.target.value })} />
          <Input placeholder="Notes" value={draft.notes ?? ''} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <Button size="sm" variant="ghost" onClick={() => onDelete(doc.id)} style={{ color: '#c0604a', marginRight: 'auto' }}>Delete</Button>
            <Button size="sm" onClick={save}>Save</Button>
          </div>
        </div>
      )}
      {!editing && doc.notes && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{doc.notes}</div>
      )}
    </div>
  )
}

/**
 * Required Documents tracker — receipt status of every doc the M1–M10
 * workflow says you need at each phase. Seed once, then update statuses
 * as documents come in. Pairs with the workflow ChecklistRunner.
 */
export default function DocumentsTracker({ parentKind, parentId, appliesTo, defaultCollapsed = false }) {
  const { data: docs, refetch } = useTransactionDocuments(parentKind, parentId)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [seeding, setSeeding] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newDoc, setNewDoc] = useState({ name: '', phase: '', required_by: '', responsible_party: 'Agent' })

  const grouped = useMemo(() => {
    const out = {}
    for (const d of (docs ?? [])) {
      const key = d.phase || 'Other'
      if (!out[key]) out[key] = []
      out[key].push(d)
    }
    return out
  }, [docs])

  const counts = useMemo(() => {
    const list = docs ?? []
    return {
      total:    list.length,
      received: list.filter(d => d.status === 'Received').length,
      pending:  list.filter(d => d.status === 'Pending').length,
      waiting:  list.filter(d => d.status === 'Not Received').length,
    }
  }, [docs])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const result = await DB.seedTransactionDocuments(parentKind, parentId, appliesTo)
      const added = result?.data?.length ?? 0
      if (added === 0) alert('Required documents already seeded for this record.')
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSeeding(false) }
  }

  const handleUpdate = async (id, patch) => {
    await DB.updateTransactionDocument(id, patch)
    refetch()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return
    await DB.deleteTransactionDocument(id)
    refetch()
  }

  const handleAdd = async () => {
    if (!newDoc.name) return
    await DB.createTransactionDocument({
      parent_kind: parentKind, parent_id: parentId,
      name: newDoc.name, phase: newDoc.phase || null,
      required_by: newDoc.required_by || null,
      responsible_party: newDoc.responsible_party,
      status: 'Not Received', sort_order: 9999,
    })
    setNewDoc({ name: '', phase: '', required_by: '', responsible_party: 'Agent' })
    setAdding(false)
    refetch()
  }

  return (
    <div style={{
      background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8,
      border: '1px solid var(--color-border, #C8C3B9)', overflow: 'hidden',
    }}>
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: collapsed ? 'none' : '1px solid var(--color-border, #C8C3B9)', cursor: 'pointer',
        }}
      >
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontWeight: 500, fontSize: '1.1rem', margin: 0,
          }}>
            Required Documents
            <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
              {collapsed ? '▸' : '▾'}
            </span>
          </h3>
          {counts.total > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              {counts.received}/{counts.total} received
              {counts.pending > 0 && ` · ${counts.pending} pending`}
              {counts.waiting > 0 && ` · ${counts.waiting} not yet`}
            </span>
          )}
        </div>
        {counts.total > 0 && counts.total === counts.received && <Badge variant="success" size="sm">All In</Badge>}
      </div>

      {!collapsed && (
        <div style={{ padding: '8px 12px' }}>
          {(docs?.length ?? 0) === 0 ? (
            <div style={{ padding: '12px 4px', textAlign: 'center' }}>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                Seed the required documents list from the M1–M10 workflow.
              </p>
              <Button size="sm" onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Seeding…' : `Seed ${appliesTo === 'buyer' ? '36' : '27'} required documents`}
              </Button>
            </div>
          ) : (
            <>
              {Object.entries(grouped).map(([phase, list]) => (
                <div key={phase} style={{ marginBottom: 10 }}>
                  <div style={{
                    fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em',
                    color: 'var(--color-text-muted, #B79782)', padding: '8px 4px 4px',
                    fontFamily: 'var(--font-mono, monospace)',
                  }}>
                    {phase}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {list.map(doc => (
                      <DocumentRow key={doc.id} doc={doc} onChange={handleUpdate} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Add-document form */}
          <div style={{ marginTop: 8, padding: '8px 4px', borderTop: '1px solid var(--color-border-light, #f0ece6)' }}>
            {adding ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Input placeholder="Document name" value={newDoc.name} onChange={e => setNewDoc({ ...newDoc, name: e.target.value })} />
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input placeholder="Phase (e.g. Closing)" value={newDoc.phase} onChange={e => setNewDoc({ ...newDoc, phase: e.target.value })} style={{ flex: 1 }} />
                  <Input placeholder="Required by" value={newDoc.required_by} onChange={e => setNewDoc({ ...newDoc, required_by: e.target.value })} style={{ flex: 1 }} />
                  <Select value={newDoc.responsible_party} onChange={e => setNewDoc({ ...newDoc, responsible_party: e.target.value })} style={{ flex: 0 }}>
                    <option value="Agent">Agent</option>
                    <option value="TC">TC</option>
                    <option value="Seller">Seller</option>
                    <option value="Buyer">Buyer</option>
                  </Select>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleAdd} disabled={!newDoc.name}>Add</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>+ Add custom document</Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

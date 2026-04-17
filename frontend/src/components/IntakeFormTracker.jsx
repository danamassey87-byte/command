import { useState, useMemo, useEffect } from 'react'
import { Button, Badge, Select } from './ui/index.jsx'
import { useFormSendsForContact } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'
import supabase from '../lib/supabase.js'

const FORMS_STORAGE_KEY = 'intake_forms'

function loadForms() {
  try { return JSON.parse(localStorage.getItem(FORMS_STORAGE_KEY)) || [] } catch { return [] }
}

// ─── Form Response Viewer ───────────────────────────────────────────────────
function FormResponseViewer({ submission }) {
  if (!submission?.data) return null
  const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data
  const entries = Object.entries(data).filter(([k]) => k !== 'related_people')

  return (
    <div style={{ padding: '10px 14px', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-light, #f0ece6)', marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
          Submitted {new Date(submission.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </span>
        {submission.client_name && <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{submission.client_name}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.map(([key, value]) => (
          <div key={key} style={{ display: 'flex', gap: 8, fontSize: '0.8rem', padding: '3px 0', borderBottom: '1px solid var(--color-border-light, #f5f0ea)' }}>
            <span style={{ fontWeight: 600, color: 'var(--brown-dark)', minWidth: 140, textTransform: 'capitalize' }}>
              {key.replace(/_/g, ' ')}
            </span>
            <span style={{ color: 'var(--color-text)', flex: 1 }}>
              {Array.isArray(value) ? value.join(', ') : (value || '—')}
            </span>
          </div>
        ))}
      </div>
      {data.related_people?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)' }}>Related People</span>
          {data.related_people.map((p, i) => (
            <div key={i} style={{ fontSize: '0.78rem', padding: '2px 0', color: 'var(--color-text)' }}>
              {p.name} — {p.relationship}{p.phone ? ` · ${p.phone}` : ''}{p.email ? ` · ${p.email}` : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function IntakeFormTracker({ contactId, contactEmail, contactName }) {
  const { data: sends, refetch } = useFormSendsForContact(contactId)
  const entries = sends ?? []
  const [showSend, setShowSend] = useState(false)
  const [selectedFormId, setSelectedFormId] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null) // auto-expand most recent
  const [submissions, setSubmissions] = useState([]) // form submissions for this contact

  const forms = useMemo(() => loadForms(), [])

  // Load actual form submissions for this contact from public_form_submissions
  useEffect(() => {
    if (!contactId) return
    async function loadSubmissions() {
      try {
        const { data } = await supabase
          .from('public_form_submissions')
          .select('*')
          .eq('merged_contact_id', contactId)
          .order('created_at', { ascending: false })
        setSubmissions(data ?? [])
        // Auto-expand the most recent submission
        if (data?.length > 0) setExpandedId(data[0].id)
      } catch { /* silent */ }
    }
    loadSubmissions()
  }, [contactId])

  const handleSend = async () => {
    if (!selectedFormId) return
    const form = forms.find(f => f.id === selectedFormId)
    if (!form) return
    setSaving(true)
    try {
      await DB.createFormSend({
        contact_id: contactId,
        form_id: form.id,
        form_name: form.name || form.type || 'Intake Form',
        sent_via: 'email',
      })

      const slug = form.slug || form.id
      const formUrl = `${window.location.origin}/form/${slug}`
      const subject = encodeURIComponent(`${form.name || 'Intake Form'} — Please Complete`)
      const body = encodeURIComponent(`Hi ${contactName || 'there'},\n\nPlease fill out this quick form so I can better serve you:\n\n${formUrl}\n\nThank you!`)
      window.open(`mailto:${contactEmail || ''}?subject=${subject}&body=${body}`, '_blank')

      setShowSend(false)
      setSelectedFormId('')
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const handleMarkReceived = async (id) => {
    try { await DB.markFormResponseReceived(id); refetch() } catch (e) { alert(e.message) }
  }

  const totalItems = entries.length + submissions.length

  return (
    <div className="buyer-detail__showings-section">
      <div className="buyer-detail__showings-header">
        <h3>Intake Forms ({totalItems})</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowSend(!showSend)}>Send Form</Button>
      </div>

      {showSend && (
        <div style={{ padding: 12, background: 'var(--cream)', borderRadius: 'var(--radius-md)', marginBottom: 8, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Select label="Select Form" value={selectedFormId} onChange={e => setSelectedFormId(e.target.value)}>
              <option value="">— Choose form —</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.name || f.type || 'Untitled Form'}</option>)}
            </Select>
          </div>
          <Button size="sm" onClick={handleSend} disabled={saving || !selectedFormId}>
            {saving ? 'Sending...' : 'Send & Open Email'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowSend(false)}>Cancel</Button>
        </div>
      )}

      {forms.length === 0 && submissions.length === 0 && !showSend && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '4px 0' }}>
          No intake forms created yet. Go to Settings &gt; Intake Forms to create one.
        </p>
      )}

      {/* ── Form Submissions (actual responses) ── */}
      {submissions.length > 0 && (
        <div style={{ marginBottom: entries.length > 0 ? 12 : 0 }}>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brown-dark)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Responses ({submissions.length})
          </p>
          {submissions.map(sub => (
            <div key={sub.id} style={{ marginBottom: 4 }}>
              <button
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px',
                  background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 'var(--radius-sm)',
                  borderLeft: '3px solid var(--color-success)', border: expandedId === sub.id ? '1px solid var(--color-border)' : '1px solid transparent',
                  borderLeftWidth: 3, borderLeftColor: 'var(--color-success)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                }}
              >
                <Badge variant="success" size="sm">Response</Badge>
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.82rem', color: 'var(--brown-dark)' }}>
                  {sub.client_name || 'Form Submission'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                  {new Date(sub.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{expandedId === sub.id ? '▾' : '▸'}</span>
              </button>
              {expandedId === sub.id && <FormResponseViewer submission={sub} />}
            </div>
          ))}
        </div>
      )}

      {/* ── Form Sends (tracking what was sent) ── */}
      {entries.length > 0 && (
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brown-dark)', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Forms Sent ({entries.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {entries.map(e => (
              <div key={e.id} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${e.response_received ? 'var(--color-success)' : 'var(--brown-mid)'}`,
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--brown-dark)' }}>{e.form_name}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>
                    Sent {new Date(e.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} via {e.sent_via}
                  </span>
                </div>
                {e.response_received ? (
                  <Badge variant="success" size="sm">Received</Badge>
                ) : (
                  <button
                    onClick={() => handleMarkReceived(e.id)}
                    style={{ padding: '4px 10px', fontSize: '0.72rem', border: '1px solid var(--color-border)', borderRadius: 6, background: 'none', cursor: 'pointer', color: 'var(--brown-dark)' }}
                  >
                    Mark Received
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entries.length === 0 && forms.length > 0 && submissions.length === 0 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '4px 0' }}>
          No forms sent to this client yet.
        </p>
      )}
    </div>
  )
}

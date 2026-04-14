import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchPublicForm, submitPublicForm } from '../../lib/publicForms'
import { CONTACT_RELATIONSHIP_ROLES } from '../../lib/vendorRoles'
import './PublicForm.css'

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

// ─── Related-people sub-renderer ─────────────────────────────────────────────
function RelatedPeopleField({ value, onChange, accentColor }) {
  const list = Array.isArray(value) ? value : []
  const add = () => onChange([...(list || []), { id: uid(), first_name: '', last_name: '', phone: '', email: '', relationship: '' }])
  const update = (id, patch) => onChange(list.map(p => p.id === id ? { ...p, ...patch } : p))
  const remove = (id) => onChange(list.filter(p => p.id !== id))

  return (
    <div className="pf-related-people">
      {list.map((p, idx) => (
        <div key={p.id} className="pf-related-people__row">
          <button
            type="button"
            className="pf-related-people__remove"
            onClick={() => remove(p.id)}
            aria-label="Remove"
          >
            ×
          </button>
          <input
            className="pf-input"
            placeholder="First name *"
            value={p.first_name || ''}
            onChange={e => update(p.id, { first_name: e.target.value })}
          />
          <input
            className="pf-input"
            placeholder="Last name *"
            value={p.last_name || ''}
            onChange={e => update(p.id, { last_name: e.target.value })}
          />
          <input
            className="pf-input"
            type="tel"
            placeholder="Phone *"
            value={p.phone || ''}
            onChange={e => update(p.id, { phone: e.target.value })}
          />
          <input
            className="pf-input"
            type="email"
            placeholder="Email (optional)"
            value={p.email || ''}
            onChange={e => update(p.id, { email: e.target.value })}
          />
          <div className="pf-related-people__row-full">
            <select
              className="pf-input"
              value={p.relationship || ''}
              onChange={e => update(p.id, { relationship: e.target.value })}
            >
              <option value="">— how are they connected? —</option>
              {CONTACT_RELATIONSHIP_ROLES.map(r => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="pf-related-people__add"
        onClick={add}
        style={{ borderColor: accentColor + '55', color: accentColor }}
      >
        + Add Person
      </button>
    </div>
  )
}

// ─── Logo header (mirrors IntakeForms FormLogoHeader) ────────────────────────
function FormLogoHeader({ logo }) {
  if (!logo?.url) return null
  const justify = logo.position === 'top-left' ? 'flex-start'
    : logo.position === 'top-right' ? 'flex-end'
    : 'center'
  return (
    <div style={{ display: 'flex', justifyContent: justify, padding: '24px 0 8px' }}>
      <img src={logo.url} alt="Logo" style={{ height: logo.size || 80, maxWidth: '60%', objectFit: 'contain' }} />
    </div>
  )
}

// ─── Field renderer ──────────────────────────────────────────────────────────
function Field({ field, value, onChange, accentColor }) {
  const f = field

  if (f.type === 'related_people') {
    return <RelatedPeopleField value={value} onChange={onChange} accentColor={accentColor} />
  }

  if (f.type === 'radio') {
    return (
      <div className="pf-radio-group">
        {(f.options || []).map(opt => (
          <label
            key={opt}
            className={`pf-radio-option ${value === opt ? 'pf-radio-option--selected' : ''}`}
            style={value === opt ? { borderColor: accentColor, background: accentColor + '11' } : undefined}
          >
            <input
              type="radio"
              name={f.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    )
  }

  if (f.type === 'select') {
    return (
      <select
        className="pf-input"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={f.required}
      >
        <option value="">Select...</option>
        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }

  if (f.type === 'textarea') {
    return (
      <textarea
        className="pf-input pf-textarea"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={f.placeholder || ''}
        rows={3}
        required={f.required}
      />
    )
  }

  return (
    <input
      className="pf-input"
      type={f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={f.placeholder || ''}
      required={f.required}
    />
  )
}

// ─── Main public form page ───────────────────────────────────────────────────
export default function PublicForm() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [record, setRecord] = useState(null)
  const [data, setData] = useState({})
  const [clientName, setClientName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchPublicForm(slug)
      .then(rec => {
        if (cancelled) return
        if (!rec) {
          setError('This form is not available. It may have been unpublished or the link is incorrect.')
        } else {
          setRecord(rec)
        }
      })
      .catch(err => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [slug])

  const setField = (id, v) => setData(prev => ({ ...prev, [id]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return

    const enabledFields = (record.form_json.fields || []).filter(f => f.enabled)
    const missing = enabledFields
      .filter(f => f.required)
      .filter(f => {
        const v = data[f.id]
        if (f.type === 'related_people') {
          return !Array.isArray(v) || v.length === 0
        }
        return !v || !String(v).trim()
      })
    if (missing.length) {
      alert(`Please fill in: ${missing.map(f => f.label).join(', ')}`)
      return
    }

    // Validate inner fields of related_people rows
    for (const f of enabledFields.filter(f => f.type === 'related_people')) {
      const rows = Array.isArray(data[f.id]) ? data[f.id] : []
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (!r.first_name?.trim() || !r.last_name?.trim() || !r.phone?.trim() || !r.relationship) {
          alert(`${f.label} — Person ${i + 1}: first name, last name, phone, and relationship are all required.`)
          return
        }
      }
    }

    setSubmitting(true)
    try {
      await submitPublicForm({
        formId: record.id,
        slug: record.slug,
        clientName,
        data,
      })
      setSubmitted(true)
    } catch (err) {
      alert(`Could not submit: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="pf-page pf-state"><p>Loading form…</p></div>
  }

  if (error) {
    return (
      <div className="pf-page pf-state">
        <h1 className="pf-state__title">Form unavailable</h1>
        <p className="pf-state__msg">{error}</p>
      </div>
    )
  }

  const form = record.form_json
  const s = form.style || {}

  if (submitted) {
    return (
      <div className="pf-page" style={{ background: s.bgColor || '#fff', fontFamily: s.fontFamily || "'Poppins', sans-serif" }}>
        <div className="pf-card" style={{ borderRadius: s.borderRadius || 12 }}>
          <FormLogoHeader logo={form.logo} />
          <div className="pf-thanks">
            <div className="pf-thanks__icon">✓</div>
            <h2 className="pf-thanks__title" style={{ color: s.accentColor || '#3A2A1E' }}>Thank you!</h2>
            <p className="pf-thanks__msg">{form.thankYouMessage || 'Your response has been received.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const enabledFields = (form.fields || []).filter(f => f.enabled)
  const sections = [...new Set(enabledFields.map(f => f.section))]
  const accent = s.accentColor || '#3A2A1E'

  return (
    <div
      className="pf-page"
      style={{
        background: s.bgColor || '#efede8',
        fontFamily: s.fontFamily || "'Poppins', sans-serif",
        color: s.textColor || '#333',
      }}
    >
      <form className="pf-card" onSubmit={handleSubmit} style={{ borderRadius: s.borderRadius || 12 }}>
        <FormLogoHeader logo={form.logo} />

        <div className="pf-header">
          <h1 className="pf-title" style={{ color: accent }}>{form.name}</h1>
          {form.description && <p className="pf-desc">{form.description}</p>}
        </div>

        <div className="pf-field">
          <label className="pf-label">Your Name <span className="pf-req">*</span></label>
          <input
            className="pf-input"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            required
            placeholder="First & Last"
          />
        </div>

        {sections.map(sec => {
          const fields = enabledFields.filter(f => f.section === sec)
          if (!fields.length) return null
          return (
            <div key={sec} className="pf-section">
              <h2 className="pf-section-title" style={{ color: accent, borderBottomColor: accent + '33' }}>{sec}</h2>
              {fields.map(f => (
                <div key={f.id} className="pf-field">
                  <label className="pf-label">
                    {f.label}
                    {f.required && <span className="pf-req"> *</span>}
                  </label>
                  <Field
                    field={f}
                    value={data[f.id]}
                    onChange={v => setField(f.id, v)}
                    accentColor={accent}
                  />
                </div>
              ))}
            </div>
          )
        })}

        <button
          type="submit"
          className="pf-submit"
          disabled={submitting}
          style={{
            background: s.buttonColor || accent,
            color: s.buttonTextColor || '#fff',
            borderRadius: s.buttonRadius || 8,
          }}
        >
          {submitting ? 'Submitting…' : 'Submit'}
        </button>
        <p className="pf-required-note">* Required fields</p>
      </form>
    </div>
  )
}

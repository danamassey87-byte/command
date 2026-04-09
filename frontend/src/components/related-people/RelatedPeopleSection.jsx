// ─────────────────────────────────────────────────────────────────────────────
// RelatedPeopleSection — reusable "+ add a person" list with relationship
// dropdown. Used on buyer contact form, seller listing form, and public
// intake forms.
//
// Value shape: array of { id, first_name, last_name, phone, email, relationship }
// ─────────────────────────────────────────────────────────────────────────────
import { Input, Select, Button } from '../ui'
import { CONTACT_RELATIONSHIP_ROLES } from '../../lib/vendorRoles'
import './RelatedPeopleSection.css'

const uid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const blank = () => ({
  id: uid(),
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  relationship: '',
})

export default function RelatedPeopleSection({
  value = [],
  onChange,
  title = 'Related People',
  subtitle = 'Anyone else on the transaction — spouse, co-buyer, trustee, attorney, etc.',
  compact = false,
}) {
  const list = Array.isArray(value) ? value : []

  const addPerson = () => onChange([...(list || []), blank()])

  const updatePerson = (id, patch) =>
    onChange((list || []).map(p => (p.id === id ? { ...p, ...patch } : p)))

  const removePerson = (id) =>
    onChange((list || []).filter(p => p.id !== id))

  return (
    <div className={`rp-section ${compact ? 'rp-section--compact' : ''}`}>
      <div className="rp-section__header">
        <div>
          <h4 className="rp-section__title">{title}</h4>
          {subtitle && <p className="rp-section__subtitle">{subtitle}</p>}
        </div>
      </div>

      {list.length === 0 && (
        <p className="rp-section__empty">No one added yet.</p>
      )}

      {list.map((p, idx) => (
        <div key={p.id} className="rp-row">
          <div className="rp-row__number">{idx + 1}</div>
          <div className="rp-row__grid">
            <Input
              label="First Name *"
              value={p.first_name || ''}
              onChange={e => updatePerson(p.id, { first_name: e.target.value })}
              placeholder="Jane"
            />
            <Input
              label="Last Name *"
              value={p.last_name || ''}
              onChange={e => updatePerson(p.id, { last_name: e.target.value })}
              placeholder="Smith"
            />
            <Input
              label="Phone *"
              value={p.phone || ''}
              onChange={e => updatePerson(p.id, { phone: e.target.value })}
              placeholder="(480) 555-0000"
            />
            <Input
              label="Email"
              type="email"
              value={p.email || ''}
              onChange={e => updatePerson(p.id, { email: e.target.value })}
              placeholder="email@example.com"
            />
            <div className="rp-row__full">
              <Select
                label="Relationship *"
                value={p.relationship || ''}
                onChange={e => updatePerson(p.id, { relationship: e.target.value })}
              >
                <option value="">— how are they connected? —</option>
                {CONTACT_RELATIONSHIP_ROLES.map(r => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </Select>
            </div>
          </div>
          <button
            type="button"
            className="rp-row__remove"
            onClick={() => removePerson(p.id)}
            aria-label="Remove person"
          >
            ×
          </button>
        </div>
      ))}

      <Button size="sm" variant="ghost" onClick={addPerson}>
        + Add Person
      </Button>
    </div>
  )
}

/**
 * Validate a related_people array. Returns an array of string errors (empty = OK).
 * Used before saving a contact/listing or submitting a public form.
 */
export function validateRelatedPeople(list) {
  const errors = []
  ;(list || []).forEach((p, i) => {
    if (!p.first_name?.trim()) errors.push(`Person ${i + 1}: first name is required`)
    if (!p.last_name?.trim())  errors.push(`Person ${i + 1}: last name is required`)
    if (!p.phone?.trim())      errors.push(`Person ${i + 1}: phone is required`)
    if (!p.relationship)       errors.push(`Person ${i + 1}: relationship is required`)
  })
  return errors
}

/** Strip empty rows (all fields blank) before saving. */
export function cleanRelatedPeople(list) {
  return (list || []).filter(p =>
    p.first_name?.trim() || p.last_name?.trim() || p.phone?.trim() || p.email?.trim()
  )
}

/**
 * Read-only display of related people. Used on detail pages where editing
 * happens in the slide-panel form, not inline.
 */
export function RelatedPeopleDisplay({ value = [], title = 'Related People', compact = false }) {
  const list = Array.isArray(value) ? value : []
  if (list.length === 0) return null

  return (
    <div className={`rp-display ${compact ? 'rp-display--compact' : ''}`}>
      {title && <h4 className="rp-display__title">{title}</h4>}
      <div className="rp-display__list">
        {list.map((p, i) => {
          const role = CONTACT_RELATIONSHIP_ROLES.find(r => r.key === p.relationship)
          const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ') || '(no name)'
          return (
            <div key={p.id || i} className="rp-display__row">
              <div className="rp-display__main">
                <div className="rp-display__name">{fullName}</div>
                {role && <div className="rp-display__role">{role.label}</div>}
              </div>
              <div className="rp-display__contact">
                {p.phone && (
                  <a href={`tel:${p.phone}`} className="rp-display__link" onClick={e => e.stopPropagation()}>
                    {p.phone}
                  </a>
                )}
                {p.email && (
                  <a href={`mailto:${p.email}`} className="rp-display__link" onClick={e => e.stopPropagation()}>
                    {p.email}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

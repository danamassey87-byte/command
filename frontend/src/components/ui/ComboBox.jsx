import { useEffect, useState } from 'react'
import { getDropdownLists, addDropdownItem } from '../../lib/supabase.js'
import './ComboBox.css'

/**
 * ComboBox — a Select that loads its options from a user-managed dropdown
 * list (stored under user_settings.dropdown_lists[listKey]). Lets the user
 * pick an existing option OR add a brand new one inline, which is then
 * persisted so it's available everywhere going forward.
 */
export default function ComboBox({
  label,
  listKey,
  value,
  onChange,
  placeholder = 'Select…',
  allowAdd = true,
  className = '',
}) {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getDropdownLists()
      .then(lists => {
        if (cancelled) return
        const list = Array.isArray(lists?.[listKey]) ? lists[listKey] : []
        setOptions(list)
      })
      .catch(err => console.error('ComboBox load failed:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [listKey])

  const handleSelect = (e) => {
    const v = e.target.value
    if (v === '__add_new__') {
      setAdding(true)
      setDraft('')
      return
    }
    onChange?.(v)
  }

  const handleSaveNew = async () => {
    const v = draft.trim()
    if (!v) { setAdding(false); return }
    setSaving(true)
    try {
      const lists = await addDropdownItem(listKey, v)
      const list = Array.isArray(lists?.[listKey]) ? lists[listKey] : [...options, v]
      setOptions(list)
      onChange?.(v)
      setAdding(false)
      setDraft('')
    } catch (err) {
      console.error('Failed to add option:', err)
      alert('Could not save new option: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const cancelAdd = () => { setAdding(false); setDraft('') }

  // If current value isn't in options, surface it so it stays selected
  const showOrphan = value && !options.includes(value)

  return (
    <div className={`field combo ${className}`}>
      {label && <label className="field__label">{label}</label>}

      {!adding && (
        <div className="combo__row">
          <select
            className="field__input field__select"
            value={value || ''}
            onChange={handleSelect}
            disabled={loading}
          >
            <option value="">{loading ? 'Loading…' : placeholder}</option>
            {showOrphan && <option value={value}>{value}</option>}
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            {allowAdd && (
              <option value="__add_new__">+ Add new…</option>
            )}
          </select>
        </div>
      )}

      {adding && (
        <div className="combo__add">
          <input
            type="text"
            className="field__input"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Type a new option…"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleSaveNew() }
              if (e.key === 'Escape') cancelAdd()
            }}
          />
          <button
            type="button"
            className="combo__btn combo__btn--save"
            onClick={handleSaveNew}
            disabled={saving || !draft.trim()}
          >
            {saving ? '…' : 'Save'}
          </button>
          <button
            type="button"
            className="combo__btn combo__btn--cancel"
            onClick={cancelAdd}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

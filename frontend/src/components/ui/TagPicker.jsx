import { useState, useRef, useEffect } from 'react'
import { useTags } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'
import './TagPicker.css'

const TAG_CATEGORIES = [
  { value: 'status',       label: 'Status' },
  { value: 'pipeline',     label: 'Pipeline' },
  { value: 'relationship', label: 'Relationship' },
  { value: 'email',        label: 'Email' },
  { value: 'interest',     label: 'Interest' },
  { value: 'priority',     label: 'Priority' },
  { value: 'custom',       label: 'Custom' },
]

/* ─── Single Tag Badge ─── */
export function TagBadge({ tag, onRemove, size = 'sm' }) {
  return (
    <span className={`tag-badge tag-badge--${size}`} style={{ '--tag-color': tag.color }}>
      <span className="tag-badge__dot" />
      <span className="tag-badge__label">{tag.name}</span>
      {onRemove && (
        <button className="tag-badge__remove" onClick={e => { e.stopPropagation(); onRemove(tag) }} aria-label={`Remove ${tag.name}`}>
          <svg viewBox="0 0 12 12" width="10" height="10"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      )}
    </span>
  )
}

/* ─── Tag Picker (assign/remove tags on a contact) ─── */
export function TagPicker({ contactId, assignedTags = [], onTagsChange }) {
  const { data: allTags, refetch: refetchTags } = useTags()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTag, setNewTag] = useState({ name: '', color: '#b79782', category: 'custom' })
  const ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const tags = allTags ?? []
  const assignedIds = new Set(assignedTags.map(t => t.id))

  const filtered = tags.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) &&
    !assignedIds.has(t.id)
  )

  // Group by category
  const grouped = {}
  filtered.forEach(t => {
    const cat = t.category || 'custom'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(t)
  })

  const handleAdd = async (tag) => {
    await DB.addContactTag(contactId, tag.id)
    onTagsChange?.([...assignedTags, tag])
  }

  const handleRemove = async (tag) => {
    await DB.removeContactTag(contactId, tag.id)
    onTagsChange?.(assignedTags.filter(t => t.id !== tag.id))
  }

  const handleCreate = async () => {
    if (!newTag.name.trim()) return
    try {
      const created = await DB.createTag({ name: newTag.name.trim(), color: newTag.color, category: newTag.category })
      await DB.addContactTag(contactId, created.id)
      onTagsChange?.([...assignedTags, created])
      refetchTags()
      setNewTag({ name: '', color: '#b79782', category: 'custom' })
      setCreating(false)
    } catch (e) {
      console.error('Tag creation failed:', e)
    }
  }

  return (
    <div className="tag-picker" ref={ref}>
      <div className="tag-picker__assigned">
        {assignedTags.map(t => (
          <TagBadge key={t.id} tag={t} onRemove={handleRemove} />
        ))}
        <button className="tag-picker__add-btn" onClick={() => setOpen(!open)}>
          + Tag
        </button>
      </div>

      {open && (
        <div className="tag-picker__dropdown">
          <input
            className="tag-picker__search"
            placeholder="Search tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />

          <div className="tag-picker__list">
            {Object.entries(grouped).map(([cat, catTags]) => (
              <div key={cat}>
                <div className="tag-picker__cat-label">{TAG_CATEGORIES.find(c => c.value === cat)?.label || cat}</div>
                {catTags.map(t => (
                  <button key={t.id} className="tag-picker__option" onClick={() => handleAdd(t)}>
                    <span className="tag-badge__dot" style={{ '--tag-color': t.color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && !creating && (
              <div className="tag-picker__empty">No matching tags</div>
            )}
          </div>

          <div className="tag-picker__footer">
            {!creating ? (
              <button className="tag-picker__create-btn" onClick={() => setCreating(true)}>
                + Create new tag
              </button>
            ) : (
              <div className="tag-picker__create-form">
                <input
                  className="tag-picker__search"
                  placeholder="Tag name"
                  value={newTag.name}
                  onChange={e => setNewTag(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
                <div className="tag-picker__create-row">
                  <input
                    type="color"
                    value={newTag.color}
                    onChange={e => setNewTag(p => ({ ...p, color: e.target.value }))}
                    className="tag-picker__color-input"
                  />
                  <select
                    value={newTag.category}
                    onChange={e => setNewTag(p => ({ ...p, category: e.target.value }))}
                    className="tag-picker__cat-select"
                  >
                    {TAG_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                  <button className="tag-picker__save-btn" onClick={handleCreate}>Add</button>
                  <button className="tag-picker__cancel-btn" onClick={() => setCreating(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Tag Manager (full CRUD for tags — used in Database page) ─── */
export function TagManager({ onClose }) {
  const { data: allTags, refetch } = useTags()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ name: '', color: '#b79782', category: 'custom' })
  const [creating, setCreating] = useState(false)

  const tags = allTags ?? []
  const grouped = {}
  tags.forEach(t => {
    const cat = t.category || 'custom'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(t)
  })

  const handleSave = async () => {
    if (!draft.name.trim()) return
    try {
      if (editing) {
        await DB.updateTag(editing, { name: draft.name.trim(), color: draft.color, category: draft.category })
      } else {
        await DB.createTag({ name: draft.name.trim(), color: draft.color, category: draft.category })
      }
      refetch()
      setEditing(null)
      setCreating(false)
      setDraft({ name: '', color: '#b79782', category: 'custom' })
    } catch (e) {
      console.error('Tag save failed:', e)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this tag? It will be removed from all contacts.')) return
    await DB.deleteTag(id)
    refetch()
  }

  const startEdit = (tag) => {
    setEditing(tag.id)
    setDraft({ name: tag.name, color: tag.color, category: tag.category || 'custom' })
    setCreating(false)
  }

  const startCreate = () => {
    setCreating(true)
    setEditing(null)
    setDraft({ name: '', color: '#b79782', category: 'custom' })
  }

  return (
    <div className="tag-manager">
      <div className="tag-manager__header">
        <h3 className="tag-manager__title">Manage Tags</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tag-picker__create-btn" onClick={startCreate}>+ New Tag</button>
          {onClose && <button className="tag-picker__cancel-btn" onClick={onClose}>Close</button>}
        </div>
      </div>

      {(creating || editing) && (
        <div className="tag-manager__edit-row">
          <input
            className="tag-picker__search"
            placeholder="Tag name"
            value={draft.name}
            onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
            autoFocus
          />
          <input
            type="color"
            value={draft.color}
            onChange={e => setDraft(p => ({ ...p, color: e.target.value }))}
            className="tag-picker__color-input"
          />
          <select
            value={draft.category}
            onChange={e => setDraft(p => ({ ...p, category: e.target.value }))}
            className="tag-picker__cat-select"
          >
            {TAG_CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button className="tag-picker__save-btn" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button>
          <button className="tag-picker__cancel-btn" onClick={() => { setEditing(null); setCreating(false) }}>Cancel</button>
        </div>
      )}

      <div className="tag-manager__list">
        {Object.entries(grouped).map(([cat, catTags]) => (
          <div key={cat} className="tag-manager__group">
            <div className="tag-picker__cat-label">{TAG_CATEGORIES.find(c => c.value === cat)?.label || cat}</div>
            {catTags.map(t => (
              <div key={t.id} className={`tag-manager__row ${editing === t.id ? 'tag-manager__row--editing' : ''}`}>
                <span className="tag-badge tag-badge--sm" style={{ '--tag-color': t.color }}>
                  <span className="tag-badge__dot" />
                  <span className="tag-badge__label">{t.name}</span>
                </span>
                <div className="tag-manager__actions">
                  <button className="tag-manager__btn" onClick={() => startEdit(t)} title="Edit">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 1.5l3 3L5 14H2v-3z" /></svg>
                  </button>
                  <button className="tag-manager__btn tag-manager__btn--danger" onClick={() => handleDelete(t.id)} title="Delete">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="3" x2="13" y2="13" /><line x1="13" y1="3" x2="3" y2="13" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNotesContext } from '../../lib/NotesContext'
import { useFavoritesContext } from '../../lib/FavoritesContext'
import { useTags, useContacts } from '../../lib/hooks'
import * as DB from '../../lib/supabase'
import './DockPanel.css'

const NOTE_COLORS = [
  null, '#c0604a', '#c99a2e', '#6a9e72', '#5a87b4', '#8b6fb0', '#b79782',
]

export default function DockPanel() {
  const { dockNote, dockOpen, closeNote, saveNote, saving } = useNotesContext()
  const { isFavorited, addFavorite, removeFavorite } = useFavoritesContext()
  const { data: contacts } = useContacts()
  const { data: tags } = useTags()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [contactId, setContactId] = useState(null)
  const [color, setColor] = useState(null)
  const [pinned, setPinned] = useState(false)
  const [noteTags, setNoteTags] = useState([])

  // Sync state when note changes
  useEffect(() => {
    if (dockNote) {
      setTitle(dockNote.title ?? '')
      setBody(dockNote.body ?? '')
      setContactId(dockNote.contact_id ?? null)
      setColor(dockNote.color ?? null)
      setPinned(dockNote.is_pinned ?? false)
      // Load tags
      DB.getNoteTags(dockNote.id).then(t => setNoteTags((t ?? []).map(x => x.tag))).catch(() => {})
    }
  }, [dockNote?.id])

  const handleSave = useCallback((field, value) => {
    if (!dockNote) return
    saveNote(dockNote.id, { [field]: value })
  }, [dockNote, saveNote])

  const handleTitleChange = (v) => { setTitle(v); handleSave('title', v) }
  const handleBodyChange = (v) => { setBody(v); handleSave('body', v) }
  const handleContactChange = (v) => {
    const cid = v || null
    setContactId(cid)
    if (dockNote) DB.updateNote(dockNote.id, { contact_id: cid }).catch(() => {})
  }
  const handleColorChange = (c) => {
    setColor(c)
    if (dockNote) DB.updateNote(dockNote.id, { color: c }).catch(() => {})
  }
  const handlePinToggle = () => {
    const next = !pinned
    setPinned(next)
    if (dockNote) DB.updateNote(dockNote.id, { is_pinned: next }).catch(() => {})
  }

  const handleToggleTag = async (tag) => {
    if (!dockNote) return
    const has = noteTags.some(t => t.id === tag.id)
    if (has) {
      await DB.removeNoteTag(dockNote.id, tag.id).catch(() => {})
      setNoteTags(prev => prev.filter(t => t.id !== tag.id))
    } else {
      await DB.addNoteTag(dockNote.id, tag.id).catch(() => {})
      setNoteTags(prev => [...prev, tag])
    }
  }

  const isFav = dockNote ? isFavorited('note', dockNote.id) : false
  const toggleFav = () => {
    if (!dockNote) return
    if (isFav) removeFavorite('note', dockNote.id)
    else addFavorite({ type: 'note', id: dockNote.id, label: title || 'Untitled Note' })
  }

  const handleDelete = async () => {
    if (!dockNote) return
    if (!confirm('Delete this note?')) return
    await DB.deleteNote(dockNote.id).catch(() => {})
    closeNote()
  }

  // Markdown toolbar helpers
  const textareaRef = { current: null }
  const insertMd = (before, after = '') => {
    const ta = document.getElementById('dock-md-textarea')
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = ta.value
    const selected = text.substring(start, end)
    const replacement = before + (selected || 'text') + after
    const next = text.substring(0, start) + replacement + text.substring(end)
    setBody(next)
    handleSave('body', next)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, start + before.length + (selected || 'text').length)
    }, 0)
  }

  if (!dockOpen) return null

  return (
    <aside className={`dock-panel ${dockOpen ? 'dock-panel--open' : ''}`}>
      {/* Header */}
      <div className="dock-panel__header">
        <div className="dock-panel__header-left">
          <button className="dock-panel__btn" onClick={handlePinToggle} title={pinned ? 'Unpin' : 'Pin'}>
            {pinned ? '📌' : '📍'}
          </button>
          <button className="dock-panel__btn" onClick={toggleFav} title={isFav ? 'Unfavorite' : 'Favorite'}>
            {isFav ? '❤️' : '🤍'}
          </button>
          {saving && <span className="dock-panel__saving">Saving...</span>}
        </div>
        <button className="dock-panel__close" onClick={closeNote} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <input
        className="dock-panel__title"
        value={title}
        onChange={e => handleTitleChange(e.target.value)}
        placeholder="Note title..."
      />

      {/* Meta row */}
      <div className="dock-panel__meta">
        <select
          className="dock-panel__select"
          value={contactId ?? ''}
          onChange={e => handleContactChange(e.target.value)}
        >
          <option value="">Link to contact...</option>
          {(contacts ?? []).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="dock-panel__colors">
          {NOTE_COLORS.map((c, i) => (
            <button
              key={i}
              className={`dock-panel__color-dot ${color === c ? 'dock-panel__color-dot--active' : ''}`}
              style={{ background: c || 'var(--cream)' }}
              onClick={() => handleColorChange(c)}
            />
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="dock-panel__tags">
        {(tags ?? []).map(tag => {
          const active = noteTags.some(t => t.id === tag.id)
          return (
            <button
              key={tag.id}
              className={`dock-panel__tag ${active ? 'dock-panel__tag--active' : ''}`}
              style={active ? { background: tag.color || 'var(--brown-mid)', color: '#fff', borderColor: tag.color || 'var(--brown-mid)' } : {}}
              onClick={() => handleToggleTag(tag)}
            >
              {tag.name}
            </button>
          )
        })}
      </div>

      {/* Markdown toolbar */}
      <div className="dock-panel__toolbar">
        <button className="dock-panel__tool-btn" onClick={() => insertMd('**', '**')} title="Bold"><strong>B</strong></button>
        <button className="dock-panel__tool-btn" onClick={() => insertMd('*', '*')} title="Italic"><em>I</em></button>
        <button className="dock-panel__tool-btn" onClick={() => insertMd('\n- ')} title="Bullet list">&#8226;</button>
        <button className="dock-panel__tool-btn" onClick={() => insertMd('\n1. ')} title="Numbered list">1.</button>
        <button className="dock-panel__tool-btn" onClick={() => insertMd('\n## ')} title="Heading">H</button>
        <button className="dock-panel__tool-btn" onClick={() => insertMd('\n- [ ] ')} title="Checklist">&#9744;</button>
      </div>

      {/* Body */}
      <textarea
        id="dock-md-textarea"
        className="dock-panel__body-editor"
        value={body}
        onChange={e => handleBodyChange(e.target.value)}
        placeholder="Start writing..."
      />

      {/* Footer */}
      <div className="dock-panel__footer">
        <span className="dock-panel__date">
          {dockNote?.updated_at ? `Updated ${new Date(dockNote.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : ''}
        </span>
        <button className="dock-panel__delete-btn" onClick={handleDelete}>Delete</button>
      </div>
    </aside>
  )
}

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNotes } from '../../lib/hooks.js'
import { useNotesContext } from '../../lib/NotesContext'
import './NotesWidget.css'

export default function NotesWidget() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { data: notes } = useNotes()
  const { openNote, createAndOpen } = useNotesContext()
  const ref = useRef(null)
  const inputRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Focus search on open
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const filtered = useMemo(() => {
    if (!notes) return []
    const q = search.toLowerCase().trim()
    const list = q
      ? notes.filter(n =>
          (n.title || '').toLowerCase().includes(q) ||
          (n.body || '').toLowerCase().includes(q) ||
          (n.contact?.name || '').toLowerCase().includes(q)
        )
      : notes
    return list.slice(0, 8)
  }, [notes, search])

  const handleOpen = (note) => {
    openNote(note)
    setOpen(false)
    setSearch('')
  }

  const handleNew = async () => {
    await createAndOpen()
    setOpen(false)
    setSearch('')
  }

  const fmtDate = (str) => {
    if (!str) return ''
    const d = new Date(str)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="notes-widget" ref={ref}>
      <button
        className={`notes-widget__btn ${open ? 'notes-widget__btn--open' : ''}`}
        onClick={() => setOpen(p => !p)}
        aria-label="Quick notes"
        title="Quick notes"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </button>

      {open && (
        <div className="notes-widget__popover">
          <div className="notes-widget__header">
            <input
              ref={inputRef}
              type="text"
              className="notes-widget__search"
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <button className="notes-widget__new" onClick={handleNew}>+ New</button>
          </div>

          <div className="notes-widget__list">
            {filtered.length > 0 ? filtered.map(note => (
              <button key={note.id} className="notes-widget__item" onClick={() => handleOpen(note)}>
                <span
                  className="notes-widget__dot"
                  style={{ background: note.color || 'var(--brown-mid)' }}
                />
                <div className="notes-widget__item-body">
                  <span className="notes-widget__item-title">
                    {note.title || 'Untitled'}
                  </span>
                  {note.contact?.name && (
                    <span className="notes-widget__item-contact">{note.contact.name}</span>
                  )}
                </div>
                <span className="notes-widget__item-time">{fmtDate(note.updated_at)}</span>
              </button>
            )) : (
              <p className="notes-widget__empty">
                {search ? 'No notes match' : 'No notes yet'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

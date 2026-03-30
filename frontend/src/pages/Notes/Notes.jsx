import { useState, useMemo } from 'react'
import { useNotes, useAllNoteTags, useTags } from '../../lib/hooks'
import { useNotesContext } from '../../lib/NotesContext'
import FavoriteButton from '../../components/layout/FavoriteButton'
import './Notes.css'

function fmtDate(str) {
  if (!str) return ''
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Notes() {
  const { data: notes, loading, refetch } = useNotes()
  const { data: allNoteTags } = useAllNoteTags()
  const { data: tags } = useTags()
  const { openNote, createAndOpen } = useNotesContext()

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('updated')
  const [filterTag, setFilterTag] = useState(null)

  // Build tag lookup per note
  const noteTagMap = useMemo(() => {
    const map = {}
    ;(allNoteTags ?? []).forEach(nt => {
      if (!map[nt.note_id]) map[nt.note_id] = []
      if (nt.tag) map[nt.note_id].push(nt.tag)
    })
    return map
  }, [allNoteTags])

  // Filter & sort
  const filtered = useMemo(() => {
    let list = notes ?? []
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(n =>
        (n.title ?? '').toLowerCase().includes(q) ||
        (n.body ?? '').toLowerCase().includes(q) ||
        (n.contact?.name ?? '').toLowerCase().includes(q)
      )
    }
    if (filterTag) {
      list = list.filter(n => (noteTagMap[n.id] ?? []).some(t => t.id === filterTag))
    }
    list = [...list].sort((a, b) => {
      if (sortBy === 'title') return (a.title ?? '').localeCompare(b.title ?? '')
      if (sortBy === 'contact') return (a.contact?.name ?? '').localeCompare(b.contact?.name ?? '')
      return (b.updated_at ?? '').localeCompare(a.updated_at ?? '')
    })
    // Pinned first
    list.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0))
    return list
  }, [notes, search, sortBy, filterTag, noteTagMap])

  const handleCreate = async () => {
    await createAndOpen()
    refetch()
  }

  const handleOpen = (note) => {
    openNote(note)
  }

  return (
    <div className="notes-page">
      {/* Toolbar */}
      <div className="notes-toolbar">
        <input
          className="notes-search"
          type="text"
          placeholder="Search notes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="notes-sort" value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="updated">Recent</option>
          <option value="title">Title</option>
          <option value="contact">Contact</option>
        </select>
        <button className="notes-create-btn" onClick={handleCreate}>+ New Note</button>
      </div>

      {/* Tag filter */}
      <div className="notes-tag-filter">
        <button
          className={`notes-tag-chip ${!filterTag ? 'notes-tag-chip--active' : ''}`}
          onClick={() => setFilterTag(null)}
        >All</button>
        {(tags ?? []).slice(0, 15).map(tag => (
          <button
            key={tag.id}
            className={`notes-tag-chip ${filterTag === tag.id ? 'notes-tag-chip--active' : ''}`}
            style={filterTag === tag.id ? { background: tag.color || 'var(--brown-mid)', color: '#fff', borderColor: tag.color || 'var(--brown-mid)' } : {}}
            onClick={() => setFilterTag(filterTag === tag.id ? null : tag.id)}
          >{tag.name}</button>
        ))}
      </div>

      {/* Notes grid */}
      {loading ? (
        <div className="notes-loading">Loading notes...</div>
      ) : filtered.length === 0 ? (
        <div className="notes-empty">
          <p>No notes yet</p>
          <button className="notes-create-btn" onClick={handleCreate}>Create your first note</button>
        </div>
      ) : (
        <div className="notes-grid">
          {filtered.map(note => {
            const ntags = noteTagMap[note.id] ?? []
            return (
              <div
                key={note.id}
                className="note-card"
                style={note.color ? { borderTopColor: note.color } : {}}
                onClick={() => handleOpen(note)}
              >
                <div className="note-card__header">
                  <h3 className="note-card__title">{note.title || 'Untitled'}</h3>
                  <div className="note-card__actions" onClick={e => e.stopPropagation()}>
                    {note.is_pinned && <span className="note-card__pin" title="Pinned">📌</span>}
                    <FavoriteButton type="note" id={note.id} label={note.title || 'Untitled Note'} />
                  </div>
                </div>
                <p className="note-card__body">{(note.body ?? '').slice(0, 120)}{(note.body ?? '').length > 120 ? '...' : ''}</p>
                <div className="note-card__footer">
                  {note.contact?.name && (
                    <span className="note-card__contact">{note.contact.name}</span>
                  )}
                  <div className="note-card__tags">
                    {ntags.slice(0, 3).map(t => (
                      <span key={t.id} className="note-card__tag" style={{ background: t.color || 'var(--brown-mid)' }}>{t.name}</span>
                    ))}
                  </div>
                  <span className="note-card__date">{fmtDate(note.updated_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

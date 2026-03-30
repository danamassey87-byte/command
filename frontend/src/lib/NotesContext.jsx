import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import * as DB from './supabase.js'

const NotesContext = createContext({
  dockOpen: false,
  dockNote: null,
  openNote: () => {},
  closeNote: () => {},
  createAndOpen: () => {},
  saveNote: () => {},
  saving: false,
})

export function NotesProvider({ children }) {
  const [dockOpen, setDockOpen] = useState(false)
  const [dockNote, setDockNote] = useState(null)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef(null)

  const openNote = useCallback((note) => {
    setDockNote(note)
    setDockOpen(true)
  }, [])

  const closeNote = useCallback(() => {
    setDockOpen(false)
    // Keep the note in state briefly for exit animation
    setTimeout(() => setDockNote(null), 300)
  }, [])

  const createAndOpen = useCallback(async (defaults = {}) => {
    try {
      const note = await DB.createNote({
        title: '',
        body: '',
        ...defaults,
      })
      setDockNote(note)
      setDockOpen(true)
      return note
    } catch (e) {
      console.error('Failed to create note:', e)
    }
  }, [])

  const saveNote = useCallback((id, updates) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await DB.updateNote(id, updates)
        setDockNote(prev => prev?.id === id ? { ...prev, ...updated } : prev)
      } catch (e) {
        console.error('Failed to save note:', e)
      } finally {
        setSaving(false)
      }
    }, 800)
  }, [])

  // Cleanup timer on unmount
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current) }, [])

  return (
    <NotesContext.Provider value={{ dockOpen, dockNote, openNote, closeNote, createAndOpen, saveNote, saving }}>
      {children}
    </NotesContext.Provider>
  )
}

export const useNotesContext = () => useContext(NotesContext)
export default NotesContext

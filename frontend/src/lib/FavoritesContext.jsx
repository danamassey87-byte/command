import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import * as DB from './supabase.js'

const FavoritesContext = createContext({
  favorites: [],
  addFavorite: () => {},
  removeFavorite: () => {},
  isFavorited: () => false,
  collapsed: true,
  toggleCollapsed: () => {},
})

const LS_KEY = 'command_favorites'
const LS_COLLAPSED = 'command_favorites_collapsed'

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) ?? [] } catch { return [] }
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(loadLocal)
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_COLLAPSED)) ?? true } catch { return true }
  })
  const saveTimer = useRef(null)
  const loaded = useRef(false)

  // Load from Supabase on mount
  useEffect(() => {
    DB.getFavorites().then(row => {
      if (row?.value) {
        setFavorites(row.value)
        localStorage.setItem(LS_KEY, JSON.stringify(row.value))
      }
      loaded.current = true
    }).catch(() => { loaded.current = true })
  }, [])

  // Persist to Supabase on change (debounced)
  const persist = useCallback((next) => {
    localStorage.setItem(LS_KEY, JSON.stringify(next))
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      DB.updateFavorites(next).catch(() => {})
    }, 1500)
  }, [])

  const addFavorite = useCallback((item) => {
    setFavorites(prev => {
      if (prev.some(f => f.type === item.type && f.id === item.id)) return prev
      const next = [...prev, item]
      persist(next)
      return next
    })
  }, [persist])

  const removeFavorite = useCallback((type, id) => {
    setFavorites(prev => {
      const next = prev.filter(f => !(f.type === type && f.id === id))
      persist(next)
      return next
    })
  }, [persist])

  const isFavorited = useCallback((type, id) => {
    return favorites.some(f => f.type === type && f.id === id)
  }, [favorites])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      localStorage.setItem(LS_COLLAPSED, JSON.stringify(!prev))
      return !prev
    })
  }, [])

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorited, collapsed, toggleCollapsed }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export const useFavoritesContext = () => useContext(FavoritesContext)
export default FavoritesContext

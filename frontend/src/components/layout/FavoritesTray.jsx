import { useNavigate } from 'react-router-dom'
import { useFavoritesContext } from '../../lib/FavoritesContext'
import { useNotesContext } from '../../lib/NotesContext'
import './FavoritesTray.css'

const TYPE_ICONS = {
  note: '📝',
  contact: '👤',
  deal: '🏠',
  route: '📍',
}

export default function FavoritesTray() {
  const { favorites, removeFavorite, collapsed, toggleCollapsed } = useFavoritesContext()
  const { openNote } = useNotesContext()
  const navigate = useNavigate()

  if (favorites.length === 0) return null

  const handleClick = (fav) => {
    if (fav.type === 'note') {
      openNote({ id: fav.id, title: fav.label })
    } else if (fav.path) {
      navigate(fav.path)
    }
  }

  const visible = favorites.slice(0, 12)
  const overflow = favorites.length - visible.length

  return (
    <div className={`fav-tray ${collapsed ? 'fav-tray--collapsed' : ''}`}>
      <button className="fav-tray__toggle" onClick={toggleCollapsed}>
        <span className="fav-tray__toggle-heart">♥</span>
        <span className="fav-tray__toggle-count">{favorites.length}</span>
      </button>

      {!collapsed && (
        <div className="fav-tray__items">
          {visible.map((fav, i) => (
            <button
              key={`${fav.type}-${fav.id ?? fav.path}-${i}`}
              className="fav-tray__item"
              onClick={() => handleClick(fav)}
              title={fav.label}
            >
              <span className="fav-tray__item-icon">{TYPE_ICONS[fav.type] || '⭐'}</span>
              <span className="fav-tray__item-label">{fav.label}</span>
              <button
                className="fav-tray__item-remove"
                onClick={e => { e.stopPropagation(); removeFavorite(fav.type, fav.id ?? fav.path) }}
                aria-label="Remove"
              >
                &times;
              </button>
            </button>
          ))}
          {overflow > 0 && (
            <span className="fav-tray__overflow">+{overflow}</span>
          )}
        </div>
      )}
    </div>
  )
}

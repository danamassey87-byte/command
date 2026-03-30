import { useFavoritesContext } from '../../lib/FavoritesContext'

/**
 * Reusable heart toggle button for favoriting any item.
 * @param {string} type - 'note' | 'contact' | 'deal' | 'route'
 * @param {string} id - unique identifier
 * @param {string} label - display name for the tray chip
 * @param {string} [path] - route path for route-type favorites
 */
export default function FavoriteButton({ type, id, label, path, className = '' }) {
  const { isFavorited, addFavorite, removeFavorite } = useFavoritesContext()
  const fav = isFavorited(type, id ?? path)

  const toggle = (e) => {
    e.stopPropagation()
    if (fav) {
      removeFavorite(type, id ?? path)
    } else {
      addFavorite({ type, id: id ?? path, label, path })
    }
  }

  return (
    <button
      className={`fav-btn ${fav ? 'fav-btn--active' : ''} ${className}`}
      onClick={toggle}
      title={fav ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={fav ? 'Unfavorite' : 'Favorite'}
    >
      {fav ? '❤️' : '🤍'}
    </button>
  )
}

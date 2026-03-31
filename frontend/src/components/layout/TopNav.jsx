import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import './TopNav.css'

// Shared mobile menu context so Layout can control sidebar too
export const MobileMenuContext = createContext({
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  mobileSidebarOpen: false,
  setMobileSidebarOpen: () => {},
})

const DEFAULT_NAV_ITEMS = [
  { id: 'home',     label: 'Home',     emoji: '📊', path: '/',            activePaths: ['/', '/dashboard', '/goals', '/calendar', '/tasks'] },
  { id: 'prospect', label: 'Prospect', emoji: '🔎', path: '/prospecting', activePaths: ['/prospecting', '/open-houses'] },
  { id: 'people',   label: 'People',   emoji: '📇', path: '/crm',         activePaths: ['/crm'] },
  { id: 'deals',    label: 'Deals',    emoji: '🏠', path: '/pipeline',    activePaths: ['/pipeline'] },
  { id: 'content',  label: 'Content',  emoji: '📝', path: '/content',     activePaths: ['/content', '/campaigns', '/email', '/bio-link'] },
  { id: 'money',    label: 'Money',    emoji: '💰', path: '/pnl',         activePaths: ['/pnl', '/net-sheet', '/market'] },
  { id: 'toolkit',  label: 'Toolkit',  emoji: '🛠️', path: '/resources',   activePaths: ['/resources', '/settings', '/pipeline/buyer-sop', '/pipeline/seller-sop'] },
]

const STORAGE_KEY = 'command_nav_order_v2'

function loadOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return DEFAULT_NAV_ITEMS
    const ids = JSON.parse(saved)
    // Rebuild from saved order, adding any new items at the end
    const map = Object.fromEntries(DEFAULT_NAV_ITEMS.map(i => [i.id, i]))
    const ordered = ids.filter(id => map[id]).map(id => map[id])
    const missing = DEFAULT_NAV_ITEMS.filter(i => !ids.includes(i.id))
    return [...ordered, ...missing]
  } catch { return DEFAULT_NAV_ITEMS }
}

function saveOrder(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(i => i.id)))
}

export default function TopNav() {
  const { pathname } = useLocation()
  const [items, setItems] = useState(loadOrder)
  const [editing, setEditing] = useState(false)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const dragNode = useRef(null)
  const { mobileMenuOpen, setMobileMenuOpen } = useContext(MobileMenuContext)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname, setMobileMenuOpen])

  const isActive = (item) => {
    return item.activePaths.some(p =>
      p === '/' ? pathname === '/' : pathname.startsWith(p)
    )
  }

  const [now, setNow] = useState(new Date())
  useState(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(timer)
  })

  const today = now.toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  // ─── Drag handlers ───
  const handleDragStart = useCallback((e, idx) => {
    setDragIdx(idx)
    dragNode.current = e.target
    e.target.classList.add('topnav__tab--dragging')
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(idx)
  }, [])

  const handleDrop = useCallback((e, dropIdx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === dropIdx) return
    setItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(dropIdx, 0, moved)
      saveOrder(next)
      return next
    })
    setDragIdx(null)
    setOverIdx(null)
  }, [dragIdx])

  const handleDragEnd = useCallback(() => {
    if (dragNode.current) dragNode.current.classList.remove('topnav__tab--dragging')
    setDragIdx(null)
    setOverIdx(null)
  }, [])

  const resetOrder = () => {
    setItems(DEFAULT_NAV_ITEMS)
    saveOrder(DEFAULT_NAV_ITEMS)
  }

  return (
    <>
      <header className="topnav">
        <div className="topnav__header-row">
          <div className="topnav__brand">
            {/* Mobile hamburger */}
            <button
              className="topnav__hamburger"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle navigation menu"
            >
              <span className={`topnav__hamburger-line ${mobileMenuOpen ? 'topnav__hamburger-line--open' : ''}`} />
              <span className={`topnav__hamburger-line ${mobileMenuOpen ? 'topnav__hamburger-line--open' : ''}`} />
              <span className={`topnav__hamburger-line ${mobileMenuOpen ? 'topnav__hamburger-line--open' : ''}`} />
            </button>
            <span className="topnav__name">Dana Massey</span>
            <span className="topnav__separator">—</span>
            <span className="topnav__tagline">Command Center</span>
          </div>
          <div className="topnav__right">
            <span className="topnav__date">{today}</span>
            <span className="topnav__time">{time}</span>
            <button
              className={`topnav__edit-btn ${editing ? 'topnav__edit-btn--active' : ''}`}
              onClick={() => setEditing(p => !p)}
              title={editing ? 'Done editing' : 'Reorder tabs'}
            >
              {editing ? '✓ Done' : '✏️ Edit'}
            </button>
            <NavLink to="/settings" className="topnav__settings-link">
              ⚙️
            </NavLink>
          </div>
        </div>

        <nav className={`topnav__tabs-row ${editing ? 'topnav__tabs-row--editing' : ''}`}>
          {items.map((item, idx) => (
            <NavLink
              key={item.id}
              to={editing ? '#' : item.path}
              onClick={editing ? (e) => e.preventDefault() : undefined}
              className={`topnav__tab ${isActive(item) ? 'topnav__tab--active' : ''} ${editing ? 'topnav__tab--editable' : ''} ${overIdx === idx && dragIdx !== idx ? 'topnav__tab--drop-target' : ''}`}
              draggable={editing}
              onDragStart={editing ? (e) => handleDragStart(e, idx) : undefined}
              onDragOver={editing ? (e) => handleDragOver(e, idx) : undefined}
              onDrop={editing ? (e) => handleDrop(e, idx) : undefined}
              onDragEnd={editing ? handleDragEnd : undefined}
            >
              {editing && <span className="topnav__drag-handle">⠿</span>}
              <span className="topnav__tab-emoji">{item.emoji}</span>
              {item.label}
            </NavLink>
          ))}
          {editing && (
            <button className="topnav__reset-btn" onClick={resetOrder} title="Reset to default order">
              ↺ Reset
            </button>
          )}
        </nav>
      </header>

      {/* Mobile full-screen nav overlay */}
      {mobileMenuOpen && (
        <div className="topnav__mobile-overlay" onClick={() => setMobileMenuOpen(false)}>
          <nav className="topnav__mobile-menu" onClick={e => e.stopPropagation()}>
            {items.map(item => (
              <NavLink
                key={item.id}
                to={item.path}
                className={`topnav__mobile-link ${isActive(item) ? 'topnav__mobile-link--active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="topnav__tab-emoji">{item.emoji}</span>
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              className="topnav__mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="topnav__tab-emoji">⚙️</span>
              Settings
            </NavLink>
          </nav>
        </div>
      )}
    </>
  )
}

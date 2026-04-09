import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import supabase from '../../lib/supabase'
import GlobalActionBar from '../quick-add/GlobalActionBar'
import NotificationsBell from '../notifications/NotificationsBell'
import './TopNav.css'

// Shared mobile menu context so Layout can control sidebar too
export const MobileMenuContext = createContext({
  mobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  mobileSidebarOpen: false,
  setMobileSidebarOpen: () => {},
})

/* Refined SVG icons for top nav — dark brown outlined style */
const NAV_ICONS = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  prospect: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  people: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M15 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="17" cy="7" r="2.5"/><path d="M22 21v-1.5a3.5 3.5 0 00-2.5-3.36"/></svg>,
  deals: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  content: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/></svg>,
  money: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><path d="M16 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H7"/></svg>,
  toolkit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
}

const DEFAULT_NAV_ITEMS = [
  { id: 'home',     label: 'Home',     icon: NAV_ICONS.home,     path: '/',            activePaths: ['/', '/dashboard', '/goals', '/calendar', '/tasks'] },
  { id: 'prospect', label: 'Prospect', icon: NAV_ICONS.prospect, path: '/prospecting', activePaths: ['/prospecting', '/open-houses'] },
  { id: 'people',   label: 'People',   icon: NAV_ICONS.people,   path: '/crm',         activePaths: ['/crm', '/vendors'] },
  { id: 'deals',    label: 'Deals',    icon: NAV_ICONS.deals,    path: '/pipeline',    activePaths: ['/pipeline'] },
  { id: 'content',  label: 'Content',  icon: NAV_ICONS.content,  path: '/content',     activePaths: ['/content', '/campaigns', '/email', '/bio-link'] },
  { id: 'money',    label: 'Money',    icon: NAV_ICONS.money,    path: '/pnl',         activePaths: ['/pnl', '/net-sheet', '/market'] },
  { id: 'toolkit',  label: 'Toolkit',  icon: NAV_ICONS.toolkit,  path: '/resources',   activePaths: ['/resources', '/settings', '/pipeline/buyer-sop', '/pipeline/seller-sop'] },
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
            <GlobalActionBar />
            <NotificationsBell />
            <span className="topnav__date">{today}</span>
            <span className="topnav__time">{time}</span>
            <button
              className={`topnav__edit-btn ${editing ? 'topnav__edit-btn--active' : ''}`}
              onClick={() => setEditing(p => !p)}
              title={editing ? 'Done editing' : 'Reorder tabs'}
            >
              {editing ? 'Done' : 'Edit'}
            </button>
            <NavLink to="/settings" className="topnav__settings-link" title="Settings">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </NavLink>
            <button
              className="topnav__logout-btn"
              onClick={() => supabase.auth.signOut()}
              title="Sign out"
            >
              Sign Out
            </button>
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
              <span className="topnav__tab-icon">{item.icon}</span>
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
                <span className="topnav__tab-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/settings"
              className="topnav__mobile-link"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="topnav__tab-icon">{NAV_ICONS.toolkit}</span>
              Settings
            </NavLink>
          </nav>
        </div>
      )}
    </>
  )
}

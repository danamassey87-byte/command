import { useState, useEffect, useRef } from 'react'
import QuickAddClient from './QuickAddClient'
import QuickAddLead from './QuickAddLead'
import QuickAddListingAppt from './QuickAddListingAppt'
import './quick-add.css'

/**
 * Persistent "+" quick-add button rendered in the global top nav.
 * Opens a small dropdown menu; each option launches a SlidePanel form.
 */
export default function GlobalActionBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState(null) // 'client' | 'lead' | 'listing-appt' | null
  const menuRef = useRef(null)

  // Close menu on outside click or ESC
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  // Global keyboard shortcut: ⌘K / Ctrl+K toggles the menu
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setMenuOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const launch = (which) => {
    setMenuOpen(false)
    setActive(which)
  }

  const close = () => setActive(null)

  return (
    <>
      <div className="gab" ref={menuRef}>
        <button
          type="button"
          className="gab__trigger"
          onClick={() => setMenuOpen(p => !p)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          title="Quick add (⌘K)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Quick Add</span>
          <kbd className="gab__kbd">⌘K</kbd>
        </button>

        {menuOpen && (
          <div className="gab__menu" role="menu">
            <button className="gab__item" role="menuitem" onClick={() => launch('listing-appt')}>
              <span className="gab__item-icon" aria-hidden>📅</span>
              <div>
                <div className="gab__item-title">New Listing Appointment</div>
                <div className="gab__item-sub">Schedule a seller consultation</div>
              </div>
            </button>
            <button className="gab__item" role="menuitem" onClick={() => launch('client')}>
              <span className="gab__item-icon" aria-hidden>👤</span>
              <div>
                <div className="gab__item-title">New Client</div>
                <div className="gab__item-sub">Add a buyer or seller client</div>
              </div>
            </button>
            <button className="gab__item" role="menuitem" onClick={() => launch('lead')}>
              <span className="gab__item-icon" aria-hidden>⚡</span>
              <div>
                <div className="gab__item-title">New Lead</div>
                <div className="gab__item-sub">Capture a buyer or seller lead</div>
              </div>
            </button>
          </div>
        )}
      </div>

      <QuickAddListingAppt open={active === 'listing-appt'} onClose={close} />
      <QuickAddClient open={active === 'client'} onClose={close} />
      <QuickAddLead open={active === 'lead'} onClose={close} />
    </>
  )
}

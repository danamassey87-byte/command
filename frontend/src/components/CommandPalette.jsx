import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const PAGES = [
  { label: 'Dashboard',         path: '/',                  section: 'Navigate', icon: '🏠' },
  { label: 'Goals & KPIs',      path: '/goals',             section: 'Navigate', icon: '🎯' },
  { label: 'Daily Tracker',     path: '/dashboard/daily',   section: 'Navigate', icon: '📊' },
  { label: 'Daily Tasks',       path: '/tasks',             section: 'Navigate', icon: '✓' },
  { label: 'Calendar',          path: '/calendar',          section: 'Navigate', icon: '📅' },
  { label: 'Buyers',            path: '/buyers',            section: 'CRM',      icon: '👥' },
  { label: 'Sellers / Listings', path: '/sellers',          section: 'CRM',      icon: '🏡' },
  { label: 'Listing Appointments', path: '/listing-appts',  section: 'CRM',      icon: '📋' },
  { label: 'Buyer Showings',    path: '/buyer-showings',    section: 'CRM',      icon: '👁' },
  { label: 'Properties',        path: '/properties',        section: 'CRM',      icon: '📍' },
  { label: 'Contact Database',  path: '/database',          section: 'CRM',      icon: '🗂' },
  { label: 'On Hold Contacts',  path: '/on-hold',           section: 'CRM',      icon: '⏸' },
  { label: 'Investors',         path: '/investors',         section: 'CRM',      icon: '💰' },
  { label: 'Vendors',           path: '/vendors',           section: 'CRM',      icon: '🤝' },
  { label: 'Pipeline',          path: '/pipeline',          section: 'Deals',    icon: '📈' },
  { label: 'Deal Board',        path: '/pipeline/board',    section: 'Deals',    icon: '🗃' },
  { label: 'Escrow Tracker',    path: '/pipeline/escrow',   section: 'Deals',    icon: '⏳' },
  { label: 'Closed Deals',      path: '/pipeline/closed',   section: 'Deals',    icon: '✅' },
  { label: 'Expired Listings',  path: '/prospecting/expired', section: 'Lead Gen', icon: '🔍' },
  { label: 'Open Houses',       path: '/open-houses',       section: 'Lead Gen', icon: '🏠' },
  { label: 'Home Value / Seller Leads', path: '/home-value', section: 'Lead Gen', icon: '📊' },
  { label: 'FSBO',              path: '/prospecting/fsbo',  section: 'Lead Gen', icon: '🏗' },
  { label: 'Content Hub',       path: '/content',           section: 'Content',  icon: '📱' },
  { label: 'Content Calendar',  path: '/content-calendar',  section: 'Content',  icon: '📅' },
  { label: 'Media Library',     path: '/media',             section: 'Content',  icon: '📷' },
  { label: 'SEO & AEO',         path: '/seo',               section: 'Content',  icon: '📈' },
  { label: 'Email Builder',     path: '/email/builder',     section: 'Email',    icon: '✉️' },
  { label: 'Smart Campaigns',   path: '/email/campaigns',   section: 'Email',    icon: '📧' },
  { label: 'Newsletters',       path: '/email/newsletters', section: 'Email',    icon: '📰' },
  { label: 'P&L Overview',      path: '/pnl',               section: 'Money',    icon: '💵' },
  { label: 'Expenses',          path: '/pnl/expenses',      section: 'Money',    icon: '📉' },
  { label: 'Mileage Log',       path: '/pnl/mileage',       section: 'Money',    icon: '🚗' },
  { label: 'ROI Analytics',     path: '/pnl/roi',           section: 'Money',    icon: '📊' },
  { label: 'Reviews & Referrals', path: '/reviews',         section: 'Sphere',   icon: '⭐' },
  { label: 'Post-Close Plans',  path: '/post-close',        section: 'Sphere',   icon: '✓' },
  { label: 'Print & Delivery',  path: '/print',             section: 'Sphere',   icon: '✉️' },
  { label: 'AI Assistant',      path: '/ai',                section: 'Tools',    icon: '🤖' },
  { label: 'Bio Link',          path: '/bio-link',          section: 'Tools',    icon: '🔗' },
  { label: 'Net Sheet',         path: '/net-sheet',         section: 'Tools',    icon: '📋' },
  { label: 'Settings',          path: '/settings',          section: 'Settings', icon: '⚙️' },
  { label: 'System Health',     path: '/settings/system',   section: 'Settings', icon: '🖥' },
  { label: 'Notifications',     path: '/notifications',     section: 'Settings', icon: '🔔' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Cmd+K to toggle
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = useMemo(() => {
    if (!query.trim()) return PAGES
    const q = query.toLowerCase()
    return PAGES.filter(p =>
      p.label.toLowerCase().includes(q) ||
      p.section.toLowerCase().includes(q) ||
      p.path.toLowerCase().includes(q)
    )
  }, [query])

  const handleSelect = useCallback((page) => {
    navigate(page.path)
    setOpen(false)
    setQuery('')
  }, [navigate])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && filtered[selected]) {
      handleSelect(filtered[selected])
    }
  }

  if (!open) return null

  // Group by section
  const groups = {}
  filtered.forEach((p, idx) => {
    if (!groups[p.section]) groups[p.section] = []
    groups[p.section].push({ ...p, _idx: idx })
  })

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(58,42,30,.35)',
          zIndex: 9998, backdropFilter: 'blur(2px)',
        }}
      />

      {/* Palette */}
      <div style={{
        position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: 520, maxHeight: '60vh', zIndex: 9999,
        background: '#fff', borderRadius: 12,
        border: '1px solid var(--color-border, #C8C3B9)',
        boxShadow: '0 16px 48px rgba(58,42,30,.15)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{
          padding: '14px 18px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--brown-mid)" strokeWidth="2" width="18" height="18">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, tools, settings..."
            style={{
              flex: 1, border: 'none', outline: 'none', fontSize: '0.95rem',
              fontFamily: 'inherit', background: 'transparent',
              color: 'var(--brown-dark, #3A2A1E)',
            }}
          />
          <span style={{
            fontSize: '0.6rem', padding: '2px 6px', borderRadius: 3,
            border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}>
            ESC
          </span>
        </div>

        {/* Results */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(60vh - 60px)', padding: '6px 0' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px 18px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No results for "{query}"
            </div>
          ) : (
            Object.entries(groups).map(([section, items]) => (
              <div key={section}>
                <div style={{
                  padding: '8px 18px 2px', fontSize: '0.6rem', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '.08em',
                  color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)',
                }}>
                  {section}
                </div>
                {items.map(page => (
                  <button
                    key={page.path}
                    onClick={() => handleSelect(page)}
                    onMouseEnter={() => setSelected(page._idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '8px 18px', border: 'none',
                      background: selected === page._idx ? 'var(--cream, #EFEDE8)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem',
                      color: 'var(--brown-dark, #3A2A1E)', fontFamily: 'inherit',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ width: 22, textAlign: 'center', fontSize: '0.9rem' }}>{page.icon}</span>
                    <span style={{ flex: 1 }}>{page.label}</span>
                    {selected === page._idx && (
                      <span style={{
                        fontSize: '0.58rem', color: 'var(--color-text-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}>
                        ↵ enter
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

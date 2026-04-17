import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContacts, useProperties, useListings } from '../../lib/hooks.js'

const RESULT_TYPES = {
  contact: { icon: '👤', color: 'var(--color-info, #5b9bd5)' },
  property: { icon: '🏠', color: 'var(--brown-mid)' },
  listing: { icon: '📋', color: 'var(--color-success)' },
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const { data: contacts } = useContacts()
  const { data: properties } = useProperties()
  const { data: listings } = useListings()

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setOpen(false); setQuery('') }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Click outside
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false) } }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const results = useMemo(() => {
    if (!query || query.length < 2) return []
    const q = query.toLowerCase()
    const out = []

    // Contacts
    for (const c of (contacts ?? []).slice(0, 200)) {
      if ((c.name ?? '').toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q) || (c.phone ?? '').includes(q)) {
        const typePath = c.type === 'seller' ? '/sellers' : c.type === 'investor' ? '/investors' : '/buyers'
        out.push({ type: 'contact', label: c.name, sub: `${c.type || 'contact'} · ${c.email || c.phone || ''}`, path: typePath, id: c.id })
      }
    }

    // Properties
    for (const p of (properties ?? []).slice(0, 200)) {
      if ((p.address ?? '').toLowerCase().includes(q) || (p.city ?? '').toLowerCase().includes(q)) {
        out.push({ type: 'property', label: p.address, sub: `${p.city || ''} · ${p.price ? '$' + Number(p.price).toLocaleString() : ''}`, path: '/properties', id: p.id })
      }
    }

    // Listings
    for (const l of (listings ?? []).slice(0, 100)) {
      const addr = l.property?.address ?? ''
      const name = l.contact?.name ?? ''
      if (addr.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
        out.push({ type: 'listing', label: addr || 'Listing', sub: `${name} · ${l.status || ''}`, path: '/sellers', id: l.id })
      }
    }

    return out.slice(0, 12)
  }, [query, contacts, properties, listings])

  const handleSelect = (result) => {
    setOpen(false)
    setQuery('')
    navigate(result.path)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
          background: 'var(--color-bg-subtle, rgba(255,255,255,0.08))', border: '1px solid var(--color-border, rgba(255,255,255,0.15))',
          borderRadius: 8, cursor: 'pointer', color: 'var(--color-text-muted, rgba(255,255,255,0.5))',
          fontSize: '0.78rem', fontFamily: 'inherit', minWidth: 180,
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        Search...
        <kbd style={{ marginLeft: 'auto', fontSize: '0.65rem', padding: '1px 4px', background: 'rgba(255,255,255,0.1)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.15)' }}>⌘K</kbd>
      </button>

      {open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', paddingTop: 80,
        }} onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setQuery('') } }}>
          <div style={{
            width: '100%', maxWidth: 520, background: '#fff', borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden', maxHeight: '70vh',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border, #e5dfd7)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--brown-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search contacts, properties, listings..."
                autoFocus
                style={{
                  flex: 1, border: 'none', outline: 'none', fontSize: '1rem',
                  fontFamily: 'inherit', color: 'var(--brown-dark)', background: 'transparent',
                }}
              />
              {query && (
                <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '1.1rem' }}>×</button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
              {query.length < 2 ? (
                <p style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  Type at least 2 characters to search across contacts, properties, and listings
                </p>
              ) : results.length === 0 ? (
                <p style={{ padding: '24px 16px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  No results for "{query}"
                </p>
              ) : (
                results.map((r, i) => {
                  const meta = RESULT_TYPES[r.type] || RESULT_TYPES.contact
                  return (
                    <button
                      key={`${r.type}-${r.id}-${i}`}
                      onClick={() => handleSelect(r)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '10px 16px', border: 'none', background: 'none',
                        cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover, #f5f0ea)'}
                      onMouseOut={e => e.currentTarget.style.background = 'none'}
                    >
                      <span style={{ fontSize: '1.2rem', width: 28, textAlign: 'center' }}>{meta.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--brown-dark)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: '1px 0 0' }}>{r.sub}</p>
                      </div>
                      <span style={{ fontSize: '0.68rem', color: meta.color, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>{r.type}</span>
                    </button>
                  )
                })
              )}
            </div>

            <div style={{ padding: '8px 16px', borderTop: '1px solid var(--color-border, #e5dfd7)', display: 'flex', gap: 12, fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              <span><kbd style={{ padding: '1px 4px', background: 'var(--color-bg-subtle)', borderRadius: 2, border: '1px solid var(--color-border)' }}>↑↓</kbd> navigate</span>
              <span><kbd style={{ padding: '1px 4px', background: 'var(--color-bg-subtle)', borderRadius: 2, border: '1px solid var(--color-border)' }}>↵</kbd> open</span>
              <span><kbd style={{ padding: '1px 4px', background: 'var(--color-bg-subtle)', borderRadius: 2, border: '1px solid var(--color-border)' }}>esc</kbd> close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

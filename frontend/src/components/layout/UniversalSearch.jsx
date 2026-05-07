// ─────────────────────────────────────────────────────────────────────────────
// UniversalSearch — top-nav search across contacts, listings, open houses,
// and active deals.
//
// Shortcut: ⌘K (or Ctrl+K) focuses the input from anywhere in the app.
// ESC clears + blurs. Click a result to navigate.
//
// Keeps the data load small and warm: fetches once on first focus, refreshes
// on focus thereafter only if the cache is older than 60 seconds.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as DB from '../../lib/supabase.js'

const CACHE_TTL_MS = 60 * 1000

let cache = {
  ts: 0,
  contacts: [],
  listings: [],
  openHouses: [],
  transactions: [],
}

async function loadAll(force = false) {
  if (!force && Date.now() - cache.ts < CACHE_TTL_MS) return cache
  try {
    const [contacts, listings, openHouses, transactions] = await Promise.all([
      DB.getContacts(),
      DB.getListings ? DB.getListings() : Promise.resolve([]),
      DB.getOpenHouses(),
      DB.getTransactions ? DB.getTransactions() : Promise.resolve([]),
    ])
    cache = {
      ts: Date.now(),
      contacts: contacts || [],
      listings: listings || [],
      openHouses: openHouses || [],
      transactions: transactions || [],
    }
  } catch (err) {
    console.warn('[UniversalSearch] load failed:', err.message)
  }
  return cache
}

function normalize(s) {
  return (s || '').toString().toLowerCase().trim()
}

function buildContactRows(contacts, q) {
  const out = []
  for (const c of contacts) {
    const haystack = [c.name, c.email, c.phone].map(normalize).join(' ')
    if (haystack.includes(q)) {
      out.push({
        kind: 'contact',
        id: c.id,
        title: c.name || '(unnamed)',
        sub: [c.email, c.phone, c.type].filter(Boolean).join(' · '),
        path: `/contact/${c.id}`,
      })
    }
    if (out.length >= 8) break
  }
  return out
}

function buildListingRows(listings, q) {
  const out = []
  for (const l of listings) {
    const addr = l.property?.address || l.address
    const city = l.property?.city || l.city
    const haystack = normalize([addr, city, l.contact?.name].filter(Boolean).join(' '))
    if (haystack.includes(q)) {
      out.push({
        kind: 'listing',
        id: l.id,
        title: addr || '(no address)',
        sub: [city, l.status, l.contact?.name].filter(Boolean).join(' · '),
        path: `/sellers?listing=${l.id}`,
      })
    }
    if (out.length >= 6) break
  }
  return out
}

function buildOHRows(ohs, q) {
  const out = []
  for (const oh of ohs) {
    const addr = oh.property?.address || oh.address
    const city = oh.property?.city || oh.city
    const haystack = normalize([addr, city, oh.date, oh.agent_name].filter(Boolean).join(' '))
    if (haystack.includes(q)) {
      out.push({
        kind: 'open_house',
        id: oh.id,
        title: addr || '(no address)',
        sub: [oh.date, city, oh.status].filter(Boolean).join(' · '),
        path: `/open-houses?id=${oh.id}`,
      })
    }
    if (out.length >= 6) break
  }
  return out
}

function buildDealRows(transactions, q) {
  const out = []
  for (const t of transactions) {
    const status = (t.status || '').toLowerCase()
    if (status === 'closed' || status === 'archived' || status === 'cancelled' || status === 'withdrawn') continue
    const haystack = normalize([t.contact?.name, t.property?.address, t.status].filter(Boolean).join(' '))
    if (haystack.includes(q)) {
      out.push({
        kind: 'deal',
        id: t.id,
        title: `${t.contact?.name || 'Deal'} — ${t.property?.address || 'no address'}`,
        sub: [t.status, t.deal_type, t.expected_commission ? `$${Number(t.expected_commission).toLocaleString()}` : null].filter(Boolean).join(' · '),
        path: `/pipeline?deal=${t.id}`,
      })
    }
    if (out.length >= 5) break
  }
  return out
}

const KIND_META = {
  contact:    { label: 'People',      icon: '👤' },
  listing:    { label: 'Listings',    icon: '🏠' },
  open_house: { label: 'Open Houses', icon: '🚪' },
  deal:       { label: 'Deals',       icon: '🤝' },
}

export default function UniversalSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  // Load + refresh cache on focus.
  const ensureLoaded = useCallback(async () => {
    await loadAll()
    setLoaded(l => !l || true)
  }, [])

  // ⌘K / Ctrl+K shortcut to focus.
  useEffect(() => {
    const handler = (e) => {
      const isMac = /Mac/.test(navigator.platform)
      if ((isMac ? e.metaKey : e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  // Click-outside closes the dropdown.
  useEffect(() => {
    const handler = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    if (open) {
      window.addEventListener('mousedown', handler)
      return () => window.removeEventListener('mousedown', handler)
    }
  }, [open])

  const norm = normalize(q)
  const groups = useMemo(() => {
    if (norm.length < 2) return []
    return [
      { kind: 'contact',    rows: buildContactRows(cache.contacts, norm) },
      { kind: 'listing',    rows: buildListingRows(cache.listings, norm) },
      { kind: 'open_house', rows: buildOHRows(cache.openHouses, norm) },
      { kind: 'deal',       rows: buildDealRows(cache.transactions, norm) },
    ].filter(g => g.rows.length > 0)
  }, [norm, loaded])

  const flatRows = useMemo(() => groups.flatMap(g => g.rows), [groups])

  const go = useCallback((row) => {
    if (!row) return
    setOpen(false)
    setQ('')
    navigate(row.path)
  }, [navigate])

  const onKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(flatRows.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(flatRows[activeIdx])
    }
  }

  // Reset highlight when results change.
  useEffect(() => { setActiveIdx(0) }, [norm])

  let runningIdx = -1

  return (
    <div className="topnav__search-wrap" ref={wrapRef}>
      <div className="topnav__search-input-wrap">
        <svg className="topnav__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          ref={inputRef}
          type="text"
          className="topnav__search-input"
          placeholder="Search…  ⌘K"
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => { setOpen(true); ensureLoaded() }}
          onKeyDown={onKeyDown}
        />
        {q && (
          <button
            className="topnav__search-clear"
            type="button"
            onClick={() => { setQ(''); inputRef.current?.focus() }}
            title="Clear"
          >×</button>
        )}
      </div>

      {open && q.length >= 2 && (
        <div className="topnav__search-dropdown">
          {groups.length === 0 && (
            <p className="topnav__search-empty">No results for "{q}"</p>
          )}
          {groups.map(g => (
            <div key={g.kind} className="topnav__search-group">
              <div className="topnav__search-group-label">
                <span>{KIND_META[g.kind].icon}</span> {KIND_META[g.kind].label}
              </div>
              {g.rows.map(row => {
                runningIdx++
                const isActive = runningIdx === activeIdx
                return (
                  <button
                    key={`${row.kind}-${row.id}`}
                    type="button"
                    className={`topnav__search-row ${isActive ? 'topnav__search-row--active' : ''}`}
                    onMouseEnter={() => setActiveIdx(runningIdx)}
                    onClick={() => go(row)}
                  >
                    <span className="topnav__search-row-title">{row.title}</span>
                    {row.sub && <span className="topnav__search-row-sub">{row.sub}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

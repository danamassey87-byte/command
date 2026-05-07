// ─────────────────────────────────────────────────────────────────────────────
// StaleListingsWidget — Dashboard widget that surfaces active listings whose
// data hasn't been refreshed against the MLS portal in 7+ days (or never).
//
// Replaces the never-built ARMLS auto-sync — Dana confirmed 2026-05-07
// she'll keep listing data current manually. This widget makes that
// recurring task discoverable and one-click clearable.
//
// Data flow:
//   listings.last_data_synced_at IS NULL OR < now()-7d
//   → list here, "Mark Synced" → set last_data_synced_at = now()
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

const STALE_DAYS = 7

function daysSince(iso) {
  if (!iso) return Infinity
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

export default function StaleListingsWidget() {
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState({}) // { listing_id: bool }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      // Active or coming_soon listings only — closed/withdrawn don't need syncing.
      const { data, error: err } = await supabase
        .from('listings')
        .select('id, status, list_price, current_price, list_date, last_data_synced_at, property:properties(id, address, city)')
        .in('status', ['active', 'coming_soon', 'pending'])
        .is('deleted_at', null)
        .order('last_data_synced_at', { ascending: true, nullsFirst: true })
      if (err) throw err
      setListings(data || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stale = useMemo(
    () => listings.filter(l => daysSince(l.last_data_synced_at) >= STALE_DAYS),
    [listings]
  )

  async function markSynced(listingId) {
    setSyncing(s => ({ ...s, [listingId]: true }))
    try {
      const { error: err } = await supabase
        .from('listings')
        .update({ last_data_synced_at: new Date().toISOString() })
        .eq('id', listingId)
      if (err) throw err
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, last_data_synced_at: new Date().toISOString() } : l))
    } catch (e) {
      alert(`Mark synced failed: ${e.message}`)
    } finally {
      setSyncing(s => ({ ...s, [listingId]: false }))
    }
  }

  async function markAllSynced() {
    if (!stale.length) return
    if (!confirm(`Mark all ${stale.length} listings as just synced? Only do this after you've actually checked them.`)) return
    const now = new Date().toISOString()
    for (const l of stale) {
      try {
        await supabase.from('listings').update({ last_data_synced_at: now }).eq('id', l.id)
      } catch { /* keep going */ }
    }
    await load()
  }

  if (loading) {
    return (
      <div className="widget" style={{ minHeight: 120 }}>
        <div style={{ padding: 14, color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Checking listing freshness…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="widget" style={{ padding: 14 }}>
        <div style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>Stale Listings: {error}</div>
      </div>
    )
  }

  if (!listings.length) return null
  const allFresh = stale.length === 0

  return (
    <div className="widget" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border-light, #f0ece6)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
            🔄 Listing Data Sync
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--brown-dark)', marginTop: 2 }}>
            {allFresh
              ? `All ${listings.length} active listing${listings.length === 1 ? '' : 's'} are fresh ✓`
              : `${stale.length} of ${listings.length} need a check`}
          </div>
        </div>
        {!allFresh && (
          <button
            type="button"
            onClick={markAllSynced}
            style={{ padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, borderRadius: 6, border: '1px solid var(--brown-warm, #8b6f53)', background: 'transparent', color: 'var(--brown-warm)', cursor: 'pointer' }}
            title="Mark every listing as just-synced — only do this after you've actually reviewed them"
          >
            Mark all
          </button>
        )}
      </div>

      {!allFresh && (
        <>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', padding: '8px 16px 0', margin: 0, lineHeight: 1.4 }}>
            Open MLS · check current price / status / DOM · update the listing here · then mark synced.
          </p>
          <div style={{ padding: '4px 0' }}>
            {stale.slice(0, 6).map(l => {
              const days = daysSince(l.last_data_synced_at)
              const addr = l.property?.address || '(no address)'
              const isSyncing = syncing[l.id]
              return (
                <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderBottom: '1px solid var(--color-border-light, #f0ece6)' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/sellers')}
                    style={{ flex: 1, textAlign: 'left', border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', minWidth: 0 }}
                  >
                    <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--brown-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{addr}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {l.property?.city ? l.property.city + ' · ' : ''}
                      {l.last_data_synced_at
                        ? `synced ${days}d ago`
                        : 'never synced'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => markSynced(l.id)}
                    disabled={isSyncing}
                    style={{ padding: '4px 10px', fontSize: '0.7rem', fontWeight: 600, borderRadius: 6, border: '1px solid var(--brown-warm)', background: 'var(--brown-dark)', color: '#fff', cursor: isSyncing ? 'wait' : 'pointer', flexShrink: 0 }}
                    title="Mark this listing as just-synced (after you've checked the MLS portal)"
                  >
                    {isSyncing ? '…' : 'Synced'}
                  </button>
                </div>
              )
            })}
            {stale.length > 6 && (
              <div style={{ padding: '8px 16px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                + {stale.length - 6} more on the Sellers list
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { Button, Badge } from './ui/index.jsx'
import supabase from '../lib/supabase.js'

export default function LoftySyncPanel() {
  const [syncState, setSyncState] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('lofty_sync_state').select('*').order('updated_at', { ascending: false }).limit(50)
      .then(({ data }) => { setSyncState(data ?? []); setLoading(false) })
  }, [])

  const conflicts = useMemo(() => syncState.filter(s => s.conflict), [syncState])
  const synced = useMemo(() => syncState.filter(s => !s.conflict), [syncState])

  const stats = useMemo(() => ({
    total: syncState.length,
    conflicts: conflicts.length,
    synced: synced.length,
    lastPull: syncState[0]?.last_pulled ? new Date(syncState[0].last_pulled) : null,
  }), [syncState, conflicts, synced])

  const handleResolve = async (id, keepCommand) => {
    // Mark conflict as resolved by clearing the conflict field
    await supabase.from('lofty_sync_state').update({
      conflict: null,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    const { data } = await supabase.from('lofty_sync_state').select('*').order('updated_at', { ascending: false }).limit(50)
    setSyncState(data ?? [])
  }

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 12 }}>Loading sync state...</p>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 500, margin: 0 }}>Lofty Sync</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
            Bidirectional contact sync health
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1 }}>{stats.total}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Synced</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1, color: conflicts.length ? '#c0604a' : 'var(--sage-green)' }}>{stats.conflicts}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>Conflicts</div>
          </div>
        </div>
      </div>

      {stats.lastPull && (
        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
          Last pull: {stats.lastPull.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </div>
      )}

      {/* Conflicts first */}
      {conflicts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c0604a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--font-mono)' }}>
            Conflicts ({conflicts.length})
          </h4>
          {conflicts.map(item => (
            <div key={item.id} style={{
              padding: '10px 14px', background: 'rgba(192,96,74,.04)', borderRadius: 6,
              border: '1px solid rgba(192,96,74,.2)', marginBottom: 6,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Badge variant="danger" size="sm">conflict</Badge>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                  {item.entity_kind} · {item.entity_id?.slice(0, 8)}
                </span>
                <span style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  lofty:{item.lofty_id}
                </span>
              </div>
              {item.conflict && (
                <div style={{ fontSize: '0.72rem', color: 'var(--brown-warm)', marginBottom: 6, lineHeight: 1.4 }}>
                  {typeof item.conflict === 'string' ? item.conflict : JSON.stringify(item.conflict, null, 2).slice(0, 200)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" onClick={() => handleResolve(item.id, true)}>Keep Command</Button>
                <Button size="sm" variant="ghost" onClick={() => handleResolve(item.id, false)}>Keep Lofty</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Synced items */}
      {synced.length > 0 && (
        <div>
          <h4 style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--font-mono)' }}>
            Healthy ({synced.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {synced.slice(0, 15).map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', fontSize: '0.75rem',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sage-green)', flexShrink: 0 }} />
                <span style={{ color: 'var(--brown-dark)' }}>{item.entity_kind}</span>
                <span style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>{item.entity_id?.slice(0, 8)}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', marginLeft: 'auto' }}>
                  {item.last_pulled ? new Date(item.last_pulled).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {syncState.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '16px 0' }}>
          No Lofty sync records yet. Sync state will populate once the Lofty integration is connected.
        </p>
      )}
    </div>
  )
}

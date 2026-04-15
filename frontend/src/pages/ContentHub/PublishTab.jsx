import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'

export default function PublishTab() {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | scheduled | published | failed

  useEffect(() => {
    loadQueue()
  }, [])

  async function loadQueue() {
    setLoading(true)
    try {
      const { data } = await DB.getPublishQueue()
      setQueue(data || [])
    } catch (e) {
      console.error('Load queue error:', e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? queue : queue.filter(q => q.status === filter)

  const counts = {
    all: queue.length,
    scheduled: queue.filter(q => q.status === 'scheduled').length,
    published: queue.filter(q => q.status === 'published').length,
    failed: queue.filter(q => q.status === 'failed').length,
  }

  function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {['all', 'scheduled', 'published', 'failed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: 6, fontSize: '0.78rem',
              border: '1px solid #e0dbd6', cursor: 'pointer',
              background: filter === f ? 'var(--brown-dark)' : '#fff',
              color: filter === f ? '#fff' : 'var(--brown-dark)',
              fontWeight: filter === f ? 600 : 400,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
        <button onClick={loadQueue} style={{
          marginLeft: 'auto', padding: '6px 12px', borderRadius: 6,
          fontSize: '0.78rem', border: '1px solid #e0dbd6', background: '#fff',
          color: 'var(--brown-dark)', cursor: 'pointer',
        }}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🚀</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--brown-dark)', marginBottom: 6 }}>
            {filter === 'all' ? 'No content in the queue yet' : `No ${filter} content`}
          </div>
          <p style={{ fontSize: '0.82rem', marginBottom: 14 }}>Create content and publish or schedule it to see it here.</p>
          <Button size="sm" onClick={() => navigate('/content/create')}>+ Create Content</Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(item => {
            const pp = item.platform_post || item
            const content = pp?.content || {}
            const statusColor = {
              published: '#137333', scheduled: '#b8860b', failed: '#c5221f',
              publishing: '#5a87b4', draft: 'var(--color-text-muted)',
            }[item.status] || 'var(--color-text-muted)'
            const statusBg = {
              published: '#e6f4ea', scheduled: '#fef7e0', failed: '#fce8e6',
              publishing: '#eef4fa', draft: '#f5f0eb',
            }[item.status] || '#f5f0eb'

            return (
              <div key={item.id} style={{
                background: '#fff', border: '1px solid #e8e3de', borderRadius: 10,
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--brown-dark)', marginBottom: 2 }}>
                    {content.title || pp?.adapted_text?.slice(0, 60) || 'Untitled'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                    {pp?.platform && <span style={{ textTransform: 'capitalize' }}>{pp.platform} · </span>}
                    {item.published_at ? `Published ${formatDate(item.published_at)}` :
                     item.scheduled_for ? `Scheduled for ${formatDate(item.scheduled_for)}` :
                     formatDate(item.created_at)}
                  </div>
                  {item.error_message && (
                    <div style={{ fontSize: '0.72rem', color: '#c5221f', marginTop: 2 }}>{item.error_message}</div>
                  )}
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: '0.7rem',
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em',
                  background: statusBg, color: statusColor,
                }}>
                  {item.status}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

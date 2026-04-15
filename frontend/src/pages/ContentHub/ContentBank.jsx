import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'

export default function ContentBank() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => { loadBank() }, [])

  async function loadBank() {
    setLoading(true)
    try {
      const { data } = await DB.getContentBank()
      setItems(data || [])
    } catch (e) {
      console.error('Load bank error:', e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = items.filter(item => {
    if (typeFilter !== 'all' && item.content_type !== typeFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (item.title || '').toLowerCase().includes(q) ||
             (item.body_text || '').toLowerCase().includes(q)
    }
    return true
  })

  async function sendToComposer(item) {
    // Reactivate as draft and open in Create tab
    await DB.updateContentPiece(item.id, { status: 'draft' })
    navigate(`/content/create/${item.id}`)
  }

  async function deleteItem(item) {
    if (!confirm('Delete this content permanently?')) return
    await DB.deleteContentPiece(item.id)
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  function formatDate(d) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const TYPE_LABELS = { post: 'Post', blog: 'Blog', video: 'Video', presentation: 'Presentation', direct_mail: 'Direct Mail' }
  const types = [...new Set(items.map(i => i.content_type || 'post'))]

  return (
    <div>
      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search content bank..."
          style={{ flex: 1, maxWidth: 300 }}
        />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{
            padding: '7px 10px', borderRadius: 6, border: '1px solid #e0dbd6',
            fontSize: '0.82rem', background: '#faf8f5', color: 'var(--brown-dark)',
          }}
        >
          <option value="all">All Types</option>
          {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
        </select>
        <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '40px 0' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📦</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--brown-dark)', marginBottom: 6 }}>
            Content Bank is empty
          </div>
          <p style={{ fontSize: '0.82rem', marginBottom: 14 }}>
            When you create content but don't publish it, save it here for later. Nothing gets lost.
          </p>
          <Button size="sm" onClick={() => navigate('/content/create')}>+ Create Content</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(item => (
            <div key={item.id} style={{
              background: '#fff', border: '1px solid #e8e3de', borderRadius: 10,
              padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem',
                  background: '#f5f0eb', color: 'var(--brown-dark)', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.03em',
                }}>
                  {TYPE_LABELS[item.content_type] || 'Post'}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                  {formatDate(item.banked_at || item.created_at)}
                </span>
              </div>

              <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--brown-dark)' }}>
                {item.title || item.body_text?.slice(0, 60) || 'Untitled'}
              </div>

              {item.body_text && (
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {item.body_text.slice(0, 120)}{item.body_text.length > 120 ? '...' : ''}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <Button size="sm" onClick={() => sendToComposer(item)}>Use This →</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteItem(item)} style={{ color: '#c5221f' }}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { Button, Badge, Input, Select, Textarea } from './ui/index.jsx'
import { useReviews, useReferrals } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

const PLATFORMS = [
  { value: 'google',   label: 'Google',     icon: '⭐' },
  { value: 'zillow',   label: 'Zillow',     icon: '🏠' },
  { value: 'realtor',  label: 'Realtor.com', icon: '🔑' },
  { value: 'facebook', label: 'Facebook',   icon: '📘' },
  { value: 'yelp',     label: 'Yelp',       icon: '📋' },
]

function Stars({ rating, size = 14 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ fontSize: size, color: i <= rating ? '#c99a2e' : 'var(--color-border, #C8C3B9)' }}>★</span>
      ))}
    </span>
  )
}

// ─── Reviews tab ─────────────────────────────────────────────────────────────
function ReviewsTab() {
  const { data: reviews, refetch } = useReviews()
  const entries = reviews ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ platform: 'google', rating: 5, body: '', url: '', posted_at: new Date().toISOString().slice(0, 10) })

  const avgRating = useMemo(() => {
    const rated = entries.filter(e => e.rating)
    if (!rated.length) return 0
    return (rated.reduce((s, e) => s + e.rating, 0) / rated.length).toFixed(1)
  }, [entries])

  const byPlatform = useMemo(() => {
    const groups = {}
    for (const e of entries) {
      groups[e.platform] = (groups[e.platform] || 0) + 1
    }
    return groups
  }, [entries])

  const handleAdd = async () => {
    setSaving(true)
    try {
      await DB.createReview({
        platform: draft.platform,
        rating: Number(draft.rating),
        body: draft.body.trim() || null,
        url: draft.url.trim() || null,
        posted_at: draft.posted_at || null,
        verified_at: new Date().toISOString(),
      })
      setShowAdd(false)
      setDraft({ platform: 'google', rating: 5, body: '', url: '', posted_at: new Date().toISOString().slice(0, 10) })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        <div style={{
          background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: 14, textAlign: 'center', minWidth: 100,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--brown-dark)' }}>
            {avgRating || '—'}
          </div>
          <Stars rating={Math.round(avgRating)} />
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{entries.length} reviews</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {Object.entries(byPlatform).map(([platform, count]) => {
            const p = PLATFORMS.find(x => x.value === platform) || { icon: '•', label: platform }
            return (
              <span key={platform} style={{
                fontSize: '0.72rem', padding: '3px 10px', borderRadius: 999,
                border: '1px solid var(--color-border)', background: '#fff',
                color: 'var(--brown-warm)',
              }}>
                {p.icon} {p.label} ({count})
              </span>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>+ Add Review</Button>
      </div>

      {showAdd && (
        <div style={{
          padding: 12, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)',
          marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select label="Platform" value={draft.platform} onChange={e => setDraft(d => ({ ...d, platform: e.target.value }))} style={{ flex: 1 }}>
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.icon} {p.label}</option>)}
            </Select>
            <Select label="Rating" value={draft.rating} onChange={e => setDraft(d => ({ ...d, rating: e.target.value }))} style={{ width: 80 }}>
              {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} ★</option>)}
            </Select>
            <Input label="Date" type="date" value={draft.posted_at} onChange={e => setDraft(d => ({ ...d, posted_at: e.target.value }))} style={{ flex: 1 }} />
          </div>
          <Textarea label="Review text" rows={2} value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} placeholder="Paste the review text..." />
          <Input label="URL" value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))} placeholder="Link to review..." />
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Review list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(review => {
          const p = PLATFORMS.find(x => x.value === review.platform) || { icon: '•', label: review.platform }
          return (
            <div key={review.id} style={{
              padding: '10px 14px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6,
              borderLeft: `3px solid ${review.rating >= 4 ? 'var(--sage-green)' : review.rating >= 3 ? '#c99a2e' : '#c0604a'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span>{p.icon}</span>
                <Stars rating={review.rating} size={12} />
                {review.contact && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{review.contact.name}</span>}
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                  {review.posted_at ? new Date(review.posted_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}
                </span>
              </div>
              {review.body && (
                <p style={{ fontSize: '0.78rem', color: 'var(--brown-warm)', margin: 0, lineHeight: 1.45 }}>"{review.body}"</p>
              )}
              {review.url && (
                <a href={review.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.68rem', color: 'var(--brown-mid)', marginTop: 4, display: 'inline-block' }}>
                  View on {p.label} ↗
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Referrals tab ──────────────────────────────────────────────────────────
function ReferralsTab() {
  const { data: referrals, refetch } = useReferrals()
  const entries = referrals ?? []

  const totalGCI = useMemo(() =>
    entries.filter(r => r.attributed_gci).reduce((s, r) => s + Number(r.attributed_gci), 0),
    [entries]
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        <div style={{
          background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border)',
          borderRadius: 8, padding: 14, textAlign: 'center', minWidth: 100,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--brown-dark)' }}>
            {entries.length}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4 }}>referrals</div>
        </div>
        {totalGCI > 0 && (
          <div style={{
            background: 'var(--cream-3)', border: '1px solid var(--color-border)',
            borderRadius: 8, padding: 14, textAlign: 'center', minWidth: 100,
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--brown-dark)' }}>
              ${totalGCI.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4 }}>GCI from referrals</div>
          </div>
        )}
      </div>

      {entries.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>No referrals tracked yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {entries.map(ref => (
            <div key={ref.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              background: 'var(--color-bg-subtle)', borderRadius: 6,
            }}>
              <span style={{ fontSize: '0.9rem' }}>🤝</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                  {ref.referrer?.name || '—'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 6px' }}>→</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--brown-warm)' }}>
                  {ref.referred?.name || '—'}
                </span>
              </div>
              <Badge variant={ref.status === 'confirmed' ? 'success' : ref.status === 'rejected' ? 'danger' : 'default'} size="sm">
                {ref.status}
              </Badge>
              {ref.attributed_gci && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>
                  ${Number(ref.attributed_gci).toLocaleString()}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'reviews',   label: 'Reviews' },
  { id: 'referrals', label: 'Referrals' },
]

export default function ReviewsAndReferrals() {
  const [tab, setTab] = useState('reviews')

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{
        fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
        fontSize: '1.8rem', fontWeight: 500, marginBottom: 4, color: 'var(--brown-dark)',
      }}>
        Reviews & Referrals
      </div>
      <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
        Track reviews across platforms and referral attribution through your sphere.
      </p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '6px 16px', fontSize: '0.8rem', borderRadius: 6,
              border: `1px solid ${tab === t.id ? 'var(--brown-dark)' : 'var(--color-border)'}`,
              background: tab === t.id ? 'var(--brown-dark)' : 'transparent',
              color: tab === t.id ? 'var(--cream)' : 'var(--brown-warm)',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reviews'   && <ReviewsTab />}
      {tab === 'referrals' && <ReferralsTab />}
    </div>
  )
}

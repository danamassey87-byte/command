import { useState } from 'react'
import HashtagBank from '../HashtagBank/HashtagBank.jsx'
import KeywordTracker from '../KeywordTracker/KeywordTracker.jsx'

const SUB_TABS = [
  { id: 'analytics', label: 'Analytics', icon: '📈' },
  { id: 'hashtags',  label: 'Hashtags',  icon: '#' },
  { id: 'seo',      label: 'SEO / AEO', icon: '🔍' },
]

export default function MeasureTab() {
  const [sub, setSub] = useState('analytics')

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e8e3de', marginBottom: 16 }}>
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            style={{
              padding: '8px 16px', fontSize: '0.8rem',
              color: sub === t.id ? 'var(--brown-dark)' : 'var(--color-text-muted)',
              fontWeight: sub === t.id ? 600 : 400,
              borderBottom: sub === t.id ? '2px solid var(--brown-dark)' : '2px solid transparent',
              background: 'none', border: 'none', borderBottomStyle: 'solid',
              cursor: 'pointer', marginBottom: -1,
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {sub === 'analytics' && <AnalyticsDashboard />}
      {sub === 'hashtags'  && <HashtagBank embedded />}
      {sub === 'seo'       && <KeywordTracker embedded />}
    </div>
  )
}

/* ─── Analytics Dashboard ─── */
function AnalyticsDashboard() {
  // Placeholder — will connect to Blotato analytics API when available
  const stats = [
    { label: 'Posts This Month', value: '—', icon: '📱' },
    { label: 'Total Engagement', value: '—', icon: '❤️' },
    { label: 'Avg Engagement Rate', value: '—', icon: '📊' },
    { label: 'Top Platform', value: '—', icon: '🏆' },
  ]

  const platformStats = [
    { platform: 'Instagram', icon: '📸', posts: '—', reach: '—', engagement: '—' },
    { platform: 'Facebook', icon: '📘', posts: '—', reach: '—', engagement: '—' },
    { platform: 'TikTok', icon: '🎵', posts: '—', reach: '—', engagement: '—' },
    { platform: 'LinkedIn', icon: '💼', posts: '—', reach: '—', engagement: '—' },
  ]

  return (
    <div>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            background: '#fff', border: '1px solid #e8e3de', borderRadius: 10,
            padding: '16px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--brown-dark)' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Platform breakdown */}
      <div style={{ background: '#fff', border: '1px solid #e8e3de', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e8e3de' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--brown-dark)', margin: 0 }}>
            Platform Performance
          </h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f0ece6' }}>
              <th style={{ padding: '10px 18px', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Platform</th>
              <th style={{ padding: '10px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Posts</th>
              <th style={{ padding: '10px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Reach</th>
              <th style={{ padding: '10px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Engagement</th>
            </tr>
          </thead>
          <tbody>
            {platformStats.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0ece6' }}>
                <td style={{ padding: '12px 18px', color: 'var(--brown-dark)', fontWeight: 500 }}>
                  {p.icon} {p.platform}
                </td>
                <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{p.posts}</td>
                <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{p.reach}</td>
                <td style={{ padding: '12px 18px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{p.engagement}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        marginTop: 16, padding: '14px 18px', background: '#faf8f5',
        borderRadius: 8, fontSize: '0.82rem', color: 'var(--color-text-muted)',
        textAlign: 'center',
      }}>
        Analytics will populate once you start publishing via Blotato and connect platform APIs.
        Data flows in automatically from your connected accounts.
      </div>
    </div>
  )
}

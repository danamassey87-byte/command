import { useState } from 'react'
import HashtagBank from '../HashtagBank/HashtagBank.jsx'
import KeywordTracker from '../KeywordTracker/KeywordTracker.jsx'

const SUB_TABS = [
  { id: 'hashtags', label: 'Hashtags', icon: '#' },
  { id: 'seo',     label: 'SEO / AEO', icon: '🔍' },
]

export default function MeasureTab() {
  const [sub, setSub] = useState('hashtags')

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

      {/* Embedded components — they render their own full UI */}
      {sub === 'hashtags' && <HashtagBank embedded />}
      {sub === 'seo'      && <KeywordTracker embedded />}
    </div>
  )
}

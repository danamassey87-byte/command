import { useState } from 'react'
import { Button, Badge, Input, Select } from './ui/index.jsx'
import { useSocialProfiles } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

const PLATFORMS = [
  { id: 'ig',      label: 'Instagram',  icon: '📸', color: '#E1306C' },
  { id: 'fb',      label: 'Facebook',   icon: '📘', color: '#1877F2' },
  { id: 'tt',      label: 'TikTok',     icon: '🎵', color: '#000' },
  { id: 'li',      label: 'LinkedIn',   icon: '💼', color: '#0A66C2' },
  { id: 'x',       label: 'X',          icon: '𝕏', color: '#000' },
  { id: 'yt',      label: 'YouTube',    icon: '▶️', color: '#FF0000' },
  { id: 'threads', label: 'Threads',    icon: '🧵', color: '#000' },
  { id: 'pin',     label: 'Pinterest',  icon: '📌', color: '#E60023' },
  { id: 'nd',      label: 'Nextdoor',   icon: '🏡', color: '#8ED500' },
]

const platformMap = Object.fromEntries(PLATFORMS.map(p => [p.id, p]))

export default function SocialProfilesPanel({ contactId }) {
  const { data: profiles, refetch } = useSocialProfiles(contactId)
  const entries = profiles ?? []
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ platform: 'ig', handle: '', url: '' })

  const existingPlatforms = new Set(entries.map(e => e.platform))
  const availablePlatforms = PLATFORMS.filter(p => !existingPlatforms.has(p.id))

  const handleAdd = async () => {
    if (!draft.handle?.trim() && !draft.url?.trim()) return
    setSaving(true)
    try {
      await DB.upsertSocialProfile({
        contact_id: contactId,
        platform: draft.platform,
        handle: draft.handle.trim().replace(/^@/, '') || null,
        url: draft.url.trim() || null,
        match_source: 'manual',
        verified: true,
      })
      setShowAdd(false)
      setDraft({ platform: availablePlatforms[0]?.id || 'ig', handle: '', url: '' })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const toggleFollow = async (profile, field) => {
    try {
      await DB.upsertSocialProfile({
        contact_id: contactId,
        platform: profile.platform,
        [field]: !profile[field],
      })
      refetch()
    } catch (e) { alert(e.message) }
  }

  if (entries.length === 0 && !showAdd) {
    return (
      <div style={{ padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h4 style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontWeight: 500, fontSize: '1rem', margin: 0,
          }}>Social</h4>
          <button
            onClick={() => setShowAdd(true)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', color: 'var(--brown-mid, #B79782)',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >+ Add profile</button>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted, #B79782)' }}>
          No social profiles linked yet.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h4 style={{
          fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
          fontWeight: 500, fontSize: '1rem', margin: 0,
        }}>Social ({entries.length})</h4>
        {availablePlatforms.length > 0 && (
          <button
            onClick={() => { setDraft(d => ({ ...d, platform: availablePlatforms[0]?.id || 'ig' })); setShowAdd(!showAdd) }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.75rem', color: 'var(--brown-mid)', textDecoration: 'underline', textUnderlineOffset: 3,
            }}
          >+ Add</button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div style={{
          padding: 10, background: 'var(--cream, #EFEDE8)', borderRadius: 8,
          border: '1px solid var(--color-border, #C8C3B9)', marginBottom: 8,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <Select label="Platform" value={draft.platform} onChange={e => setDraft(d => ({ ...d, platform: e.target.value }))} style={{ flex: 1 }}>
              {availablePlatforms.map(p => <option key={p.id} value={p.id}>{p.icon} {p.label}</option>)}
            </Select>
            <Input label="Handle" value={draft.handle} onChange={e => setDraft(d => ({ ...d, handle: e.target.value }))} placeholder="@username" style={{ flex: 1 }} />
          </div>
          <Input label="URL" value={draft.url} onChange={e => setDraft(d => ({ ...d, url: e.target.value }))} placeholder="https://instagram.com/..." />
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="sm" onClick={handleAdd} disabled={saving || (!draft.handle?.trim() && !draft.url?.trim())}>
              {saving ? 'Saving...' : 'Add'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Profile cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {entries.map(profile => {
          const p = platformMap[profile.platform] || { label: profile.platform, icon: '•', color: '#999' }
          return (
            <div key={profile.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
              background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6,
              borderLeft: `3px solid ${p.color}`,
            }}>
              <span style={{ fontSize: '1rem', width: 20, textAlign: 'center' }}>{p.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                    {profile.handle ? `@${profile.handle}` : p.label}
                  </span>
                  {profile.verified && (
                    <span style={{ fontSize: '0.62rem', color: 'var(--sage-green, #8B9A7B)' }}>verified</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  <button
                    onClick={() => toggleFollow(profile, 'following')}
                    style={{
                      fontSize: '0.65rem', padding: '1px 6px', borderRadius: 999, cursor: 'pointer',
                      border: `1px solid ${profile.following ? 'var(--sage-green)' : 'var(--color-border)'}`,
                      background: profile.following ? 'rgba(139,154,123,.1)' : 'transparent',
                      color: profile.following ? '#566b4a' : 'var(--color-text-muted)',
                    }}
                  >
                    {profile.following ? 'Following' : 'Not following'}
                  </button>
                  <button
                    onClick={() => toggleFollow(profile, 'follower')}
                    style={{
                      fontSize: '0.65rem', padding: '1px 6px', borderRadius: 999, cursor: 'pointer',
                      border: `1px solid ${profile.follower ? 'var(--sage-green)' : 'var(--color-border)'}`,
                      background: profile.follower ? 'rgba(139,154,123,.1)' : 'transparent',
                      color: profile.follower ? '#566b4a' : 'var(--color-text-muted)',
                    }}
                  >
                    {profile.follower ? 'Follows you' : 'Not a follower'}
                  </button>
                </div>
              </div>
              {profile.url && (
                <a href={profile.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: '0.72rem', color: 'var(--brown-mid)', textDecoration: 'none' }}>↗</a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

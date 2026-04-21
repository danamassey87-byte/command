import { useState, useEffect, useMemo } from 'react'
import { Button, Badge } from './ui/index.jsx'
import supabase from '../lib/supabase.js'

/**
 * Finds potential duplicate contacts using first_name, last_name, email, and phone.
 * Shows merge suggestions. Can be placed in Settings or Database page.
 */
export default function DuplicateDetector() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('dismissed_dupes') || '[]')) } catch { return new Set() }
  })

  useEffect(() => {
    supabase.from('contacts')
      .select('id, name, first_name, last_name, email, phone, type, stage, tier, created_at')
      .is('deleted_at', null)
      .order('name')
      .then(({ data }) => { setContacts(data ?? []); setLoading(false) })
  }, [])

  const duplicates = useMemo(() => {
    const groups = []
    const seen = new Set()

    for (let i = 0; i < contacts.length; i++) {
      if (seen.has(contacts[i].id)) continue
      const matches = []

      for (let j = i + 1; j < contacts.length; j++) {
        if (seen.has(contacts[j].id)) continue
        const score = matchScore(contacts[i], contacts[j])
        if (score >= 2) {
          matches.push({ contact: contacts[j], score, reasons: matchReasons(contacts[i], contacts[j]) })
        }
      }

      if (matches.length > 0) {
        const key = [contacts[i].id, ...matches.map(m => m.contact.id)].sort().join('-')
        if (!dismissed.has(key)) {
          groups.push({ primary: contacts[i], matches, key })
          seen.add(contacts[i].id)
          matches.forEach(m => seen.add(m.contact.id))
        }
      }
    }

    return groups.sort((a, b) => Math.max(...b.matches.map(m => m.score)) - Math.max(...a.matches.map(m => m.score)))
  }, [contacts, dismissed])

  const handleDismiss = (key) => {
    const next = new Set([...dismissed, key])
    setDismissed(next)
    localStorage.setItem('dismissed_dupes', JSON.stringify([...next]))
  }

  if (loading) return <p style={{ color: 'var(--color-text-muted)', padding: 12 }}>Scanning for duplicates...</p>

  if (duplicates.length === 0) {
    return (
      <div style={{ padding: '12px 0' }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 500, margin: '0 0 4px' }}>
          Duplicate Detection
        </h4>
        <p style={{ fontSize: '0.82rem', color: 'var(--sage-green, #8B9A7B)' }}>
          No potential duplicates found. Your contact database looks clean.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 500, margin: 0 }}>
          Potential Duplicates ({duplicates.length})
        </h4>
        <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
          {contacts.length} contacts scanned
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {duplicates.slice(0, 10).map(group => (
          <div key={group.key} style={{
            background: 'rgba(201,154,46,.04)', borderRadius: 8,
            border: '1px solid rgba(201,154,46,.2)', padding: '12px 14px',
          }}>
            {/* Primary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                {group.primary.name}
              </span>
              {group.primary.email && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{group.primary.email}</span>}
              {group.primary.phone && <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>{group.primary.phone}</span>}
              <Badge variant="default" size="sm">{group.primary.type}</Badge>
            </div>

            {/* Matches */}
            {group.matches.map(match => (
              <div key={match.contact.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                background: 'rgba(201,154,46,.06)', borderRadius: 4, marginBottom: 4,
                borderLeft: '3px solid #c99a2e',
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--brown-dark)' }}>{match.contact.name}</span>
                {match.contact.email && <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{match.contact.email}</span>}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
                  {match.reasons.map(r => (
                    <span key={r} style={{
                      fontSize: '0.55rem', padding: '1px 5px', borderRadius: 999,
                      border: '1px solid #c99a2e', color: '#c99a2e',
                    }}>{r}</span>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Button size="sm" variant="ghost" onClick={() => handleDismiss(group.key)}>Dismiss</Button>
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                Merge available in Contact Database
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Matching logic ──────────────────────────────────────────────────────────
function normalize(str) { return (str ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').trim() }

function matchScore(a, b) {
  let score = 0
  // Exact email match
  if (a.email && b.email && normalize(a.email) === normalize(b.email)) score += 3
  // Exact phone match
  if (a.phone && b.phone && normalize(a.phone) === normalize(b.phone)) score += 3
  // Name match (first + last)
  if (a.first_name && b.first_name && a.last_name && b.last_name) {
    if (normalize(a.first_name) === normalize(b.first_name) && normalize(a.last_name) === normalize(b.last_name)) score += 2
  } else if (a.name && b.name && normalize(a.name) === normalize(b.name)) {
    score += 2
  }
  // Partial name match
  if (a.first_name && b.first_name && normalize(a.first_name) === normalize(b.first_name) && a.last_name !== b.last_name) score += 0.5
  return score
}

function matchReasons(a, b) {
  const reasons = []
  if (a.email && b.email && normalize(a.email) === normalize(b.email)) reasons.push('email')
  if (a.phone && b.phone && normalize(a.phone) === normalize(b.phone)) reasons.push('phone')
  if (a.first_name && b.first_name && normalize(a.first_name) === normalize(b.first_name) &&
      a.last_name && b.last_name && normalize(a.last_name) === normalize(b.last_name)) reasons.push('name')
  else if (a.name && b.name && normalize(a.name) === normalize(b.name)) reasons.push('name')
  return reasons
}

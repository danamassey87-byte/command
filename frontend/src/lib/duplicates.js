import supabase from './supabase'

/* ──────────────────────────────────────────────────────────────────────────
 * Duplicate detection helpers
 * ────────────────────────────────────────────────────────────────────────── */

/** Normalize a name for fuzzy comparison: lowercase, strip punctuation,
 *  collapse whitespace, strip common suffixes (jr, sr, iii, etc). */
export function normalizeName(raw) {
  if (!raw) return ''
  return String(raw)
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|mr|mrs|ms|dr)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalize an address: lowercase, strip punctuation, collapse whitespace,
 *  normalize common street suffix abbreviations (street→st, avenue→ave, etc). */
export function normalizeAddress(raw) {
  if (!raw) return ''
  const STREET_MAP = {
    street: 'st', avenue: 'ave', boulevard: 'blvd', drive: 'dr',
    road: 'rd', lane: 'ln', court: 'ct', place: 'pl', parkway: 'pkwy',
    highway: 'hwy', circle: 'cir', terrace: 'ter', trail: 'trl',
    north: 'n', south: 's', east: 'e', west: 'w',
    northeast: 'ne', northwest: 'nw', southeast: 'se', southwest: 'sw',
    apartment: 'apt', suite: 'ste', unit: 'unit',
  }
  let s = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  s = s.split(' ').map(tok => STREET_MAP[tok] ?? tok).join(' ')
  return s
}

/** Levenshtein distance (iterative, O(n*m) time, O(min(n,m)) space). */
function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  if (a.length < b.length) [a, b] = [b, a]
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr.push(Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost))
    }
    prev = curr
  }
  return prev[b.length]
}

/** Similarity score in [0,1] based on Levenshtein distance. */
export function similarity(a, b) {
  const na = normalizeName(a)
  const nb = normalizeName(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  const maxLen = Math.max(na.length, nb.length)
  return 1 - levenshtein(na, nb) / maxLen
}

/** Token-set similarity (order-independent) — handles "John Smith" vs "Smith, John". */
export function tokenSetSimilarity(a, b) {
  const ta = new Set(normalizeName(a).split(' ').filter(Boolean))
  const tb = new Set(normalizeName(b).split(' ').filter(Boolean))
  if (!ta.size || !tb.size) return 0
  let intersect = 0
  for (const t of ta) if (tb.has(t)) intersect++
  return intersect / Math.max(ta.size, tb.size)
}

/** Best-of similarity: use the higher of edit-distance and token-set. */
export function nameSimilarity(a, b) {
  return Math.max(similarity(a, b), tokenSetSimilarity(a, b))
}

/* ──────────────────────────────────────────────────────────────────────────
 * Supabase-backed lookups
 * ────────────────────────────────────────────────────────────────────────── */

const NAME_MATCH_THRESHOLD = 0.78 // surface as a "potential duplicate"

/** Search contacts for potential name duplicates.
 *  Uses Postgres ILIKE for a coarse prefetch (fast via trigram index),
 *  then refines in JS with Levenshtein + token-set scoring.
 *  Returns matches sorted by score desc. */
export async function findDuplicateContacts(name, { excludeId = null, limit = 5 } = {}) {
  const normalized = normalizeName(name)
  if (normalized.length < 2) return []

  // Prefetch: any contact whose name shares at least the first meaningful token.
  // We OR a few ILIKE clauses for token-based coarse filtering.
  const tokens = normalized.split(' ').filter(t => t.length >= 2).slice(0, 3)
  if (!tokens.length) return []

  const orClause = tokens.map(t => `name.ilike.%${t}%`).join(',')
  let q = supabase.from('contacts').select('id,name,email,phone,type,lead_intent').or(orClause).limit(50)
  if (excludeId) q = q.neq('id', excludeId)

  const { data, error } = await q
  if (error) throw new Error(error.message)

  const scored = (data ?? [])
    .map(c => ({ ...c, score: nameSimilarity(name, c.name) }))
    .filter(c => c.score >= NAME_MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return scored
}

/** Search properties for an existing address (normalized equal OR fuzzy match). */
export async function findDuplicateProperties(address, { limit = 5 } = {}) {
  const normalized = normalizeAddress(address)
  if (normalized.length < 4) return []

  // Prefetch candidates sharing the first house-number-ish token.
  const firstToken = normalized.split(' ')[0]
  const { data, error } = await supabase
    .from('properties')
    .select('id,address,city,state,zip,status')
    .ilike('address', `%${firstToken}%`)
    .limit(50)
  if (error) throw new Error(error.message)

  const matches = (data ?? [])
    .map(p => {
      const np = normalizeAddress(p.address)
      let score = 0
      if (np === normalized) score = 1
      else if (np.startsWith(normalized) || normalized.startsWith(np)) score = 0.95
      else {
        const dist = levenshtein(np, normalized)
        score = 1 - dist / Math.max(np.length, normalized.length)
      }
      return { ...p, score }
    })
    .filter(p => p.score >= 0.85)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  return matches
}

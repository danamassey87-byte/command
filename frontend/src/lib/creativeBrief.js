// ─────────────────────────────────────────────────────────────────────────────
// creativeBrief.js
//
// Single source of truth for "what to bake into every creative AI call".
// Pulls Dana's brain doc + voice + tagline from brand_profile (user_settings)
// and assembles a prompt prefix that every creative invocation passes to its
// edge function. This way the brief is authored ONCE in Settings → Brand
// Guidelines and applied EVERYWHERE — Gamma, content, email, Canva, images.
//
// Usage patterns:
//
//   // From a React component (preferred — uses cached BrandContext):
//   import { useBrief } from './creativeBrief'
//   const brief = useBrief()                  // returns string or ''
//   await DB.buildGammaCustom(title, withBrief(brief, strategy), 'listing_presentation')
//
//   // From a non-React module (e.g. lib/supabase.js helper):
//   import { fetchBrief, withBrief } from './creativeBrief'
//   const brief = await fetchBrief()
//   payload.strategy_text = withBrief(brief, payload.strategy_text)
//
// IMPORTANT — if you add a new creative integration, route its prompt input
// through `withBrief()` so the brain doc is honored. Skipping this means the
// new feature ignores Dana's brand voice. Don't.
// ─────────────────────────────────────────────────────────────────────────────

import { useBrand } from './BrandContext'
import * as DB from './supabase'

/** Build the consolidated brief string from a brand_profile.guidelines object. */
export function buildCreativeBrief(brand) {
  const gl = brand?.guidelines ?? {}
  const lines = []

  if (gl.brain_doc?.trim()) {
    lines.push('─── DANA\'S BRAIN DOC (creative bible — must follow) ───')
    lines.push(gl.brain_doc.trim())
  }
  if (gl.tone_of_voice?.trim()) {
    lines.push('')
    lines.push(`TONE OF VOICE: ${gl.tone_of_voice.trim()}`)
  }
  if (gl.tagline?.trim()) {
    lines.push(`TAGLINE: ${gl.tagline.trim()}`)
  }
  if (gl.primary_color || gl.secondary_color || gl.accent_color) {
    lines.push(`BRAND COLORS: primary=${gl.primary_color || '—'}, secondary=${gl.secondary_color || '—'}, accent=${gl.accent_color || '—'}`)
  }
  if (gl.fonts?.trim()) {
    lines.push(`FONTS: ${gl.fonts.trim()}`)
  }
  if (lines.length === 0) return ''
  lines.push('─── END BRIEF ───')
  return lines.join('\n')
}

/** Hook form for React components — pulls from BrandContext (cached). */
export function useBrief() {
  const { brand } = useBrand()
  return buildCreativeBrief(brand)
}

/** Async fetch form for plain JS modules (no React context available). */
export async function fetchBrief() {
  try {
    const row = await DB.getBrandProfile()
    return buildCreativeBrief(row?.value ?? null)
  } catch {
    return ''
  }
}

/** Prepend the brief to an arbitrary prompt/strategy/body string. */
export function withBrief(brief, text) {
  const safe = (text ?? '').toString()
  if (!brief) return safe
  return `${brief}\n\n${safe}`
}

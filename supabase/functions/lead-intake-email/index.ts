// lead-intake-email — every 10 min, walks Gmail for vendor lead emails,
// parses them, creates contact + lead_attribution (with locked rates) + applies tag.
//
// Setup per source (one-time, in Gmail):
//   1. Create a label `Leads/<slug>` (e.g. Leads/certileads)
//   2. Add a filter: from:(<vendor>) → apply label "Leads/<slug>", skip inbox
//
// The function reads `lead_sources` where intake.method='email_forwarder' and
// runs `searchGmail("label:leads/<slug> newer_than:7d")` for each.
//
// Parsers live in PARSERS keyed by source.slug. A parser returns
// { name, email, phone, address, side } or null if it can't extract enough.
// Null → row marked needs_review for manual classification.
//
// Idempotent via lead_emails_processed (PK = gmail_message_id).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { heartbeat } from '../_shared/heartbeat.ts'
import {
  getGmailAccessToken,
  searchGmail,
  fetchMessageContent,
  type FullMessage,
} from '../_shared/gmail.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Parser types ───────────────────────────────────────────────────────────
interface ParsedLead {
  name?: string
  email?: string
  phone?: string
  address?: string
  side?: 'buyer' | 'seller' | null
  notes?: string
}

type Parser = (msg: FullMessage) => ParsedLead | null

// ─── Per-vendor parsers ─────────────────────────────────────────────────────
// Best-effort regex against subject + body. Real vendor emails will diverge;
// when a parser misses, the message is marked needs_review and surfaced in UI.
//
// All parsers share the helpers below so they're cheap to add. New source?
// Drop a function in PARSERS keyed by slug.

function rx(body: string, ...patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = body.match(p)
    if (m && m[1]) return m[1].trim()
  }
  return undefined
}

function classifySide(text: string, subject?: string): 'buyer' | 'seller' | null {
  // ── Tier 1: explicit "buyer lead" / "seller lead" phrases (most reliable).
  // Vendor subjects use these consistently ("New buyer lead from CertiLeads").
  // Body sections like FAQ "Buyer and Seller Leads" intentionally don't match
  // because the words "buyer/seller" aren't directly adjacent to "lead".
  const phrasePool = `${subject || ''}\n${text}`.toLowerCase()
  const buyerLead  = /\bbuyer\s+lead\b/.test(phrasePool)
  const sellerLead = /\bseller\s+lead\b/.test(phrasePool)
  if (buyerLead && !sellerLead) return 'buyer'
  if (sellerLead && !buyerLead) return 'seller'

  // ── Tier 2: keyword scan (fallback for vendors whose subject is non-standard).
  // Counts occurrences of side signals and picks the dominant one. Tied = null.
  const t = text.toLowerCase()
  const sellerHits = (t.match(/\b(seller|listing|home valuation|sell my home|cash offer|home value|estimate my home|list my home)\b/g) || []).length
  const buyerHits  = (t.match(/\b(buyer|interested in|tour|showing|pre-?qual|looking to buy|home search)\b/g) || []).length
  if (sellerHits > buyerHits) return 'seller'
  if (buyerHits > sellerHits) return 'buyer'
  return null
}

// Phone regex prefers labeled "Phone:" line (captures full +country-code numbers
// up to newline; ensureContactInline strips non-digits). Falls back to a loose
// "first thing that looks like a phone" pattern that allows optional leading +1.
const PHONE_LABELED  = /(?:Phone|Mobile|Cell)\s*:?\s*(\+?[\d().\s\-+x]{10,30})/i
const PHONE_FALLBACK = /(\+?1?[\s\-.]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/

const certileadsParser: Parser = (msg) => {
  const body = msg.body || ''
  const subj = msg.subject || ''
  const name    = rx(body, /Name:\s*([^\n\r]+)/i, /Lead Name:\s*([^\n\r]+)/i)
  const email   = rx(body, /Email:\s*([^\s\n]+@[^\s\n]+)/i)
  const phone   = rx(body, PHONE_LABELED, PHONE_FALLBACK)
  const address = rx(body, /(?:Property|Address):\s*([^\n\r]+)/i)
  const side    = classifySide(body, subj)
  if (!name && !email && !phone) return null
  return { name, email, phone, address, side }
}

const closingleadsParser: Parser = (msg) => {
  const body = msg.body || ''
  const name    = rx(body, /(?:Client|Lead|Customer)\s*Name:\s*([^\n\r]+)/i, /Name:\s*([^\n\r]+)/i)
  const email   = rx(body, /Email(?:\s*Address)?:\s*([^\s\n]+@[^\s\n]+)/i)
  const phone   = rx(body, PHONE_LABELED, PHONE_FALLBACK)
  const address = rx(body, /(?:Property|Address|Location):\s*([^\n\r]+)/i)
  const side    = classifySide(body, msg.subject)
  if (!name && !email && !phone) return null
  return { name, email, phone, address, side }
}

const atclosingParser: Parser = (msg) => {
  const body = msg.body || ''
  const name    = rx(body, /Lead:\s*([^\n\r,]+)/i, /Name:\s*([^\n\r]+)/i)
  const email   = rx(body, /Email:\s*([\w.+-]+@[\w-]+\.[\w.-]+)/i, /([\w.+-]+@[\w-]+\.[\w.-]+)/)
  const phone   = rx(body, PHONE_LABELED, PHONE_FALLBACK)
  const address = rx(body, /(?:Full\s+)?Address:\s*([^\n\r]+)/i, /(?:Property|Address):\s*([^\n\r]+)/i)
  const side    = classifySide(body, msg.subject)
  if (!name && !email && !phone) return null
  return { name, email, phone, address, side }
}

const realtycomParser: Parser = (msg) => {
  const body = msg.body || ''
  const subj = msg.subject || ''
  const name    = rx(body, /(?:Lead Name|Contact|Name):\s*([^\n\r]+)/i, /from\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/)
  const email   = rx(body, /Email:\s*([\w.+-]+@[\w-]+\.[\w.-]+)/i, /([\w.+-]+@[\w-]+\.[\w.-]+)/)
  const phone   = rx(body, PHONE_LABELED, PHONE_FALLBACK)
  const address = rx(body, /(?:Interested in|Property|Listing):\s*([^\n\r]+)/i)
  const side    = classifySide(body, subj)
  if (!name && !email && !phone) return null
  return { name, email, phone, address, side }
}

// Generic fallback for any source without a custom parser. Tries the most
// universal "Name/Email/Phone/Address" patterns.
const genericParser: Parser = (msg) => {
  const body = msg.body || ''
  const name    = rx(body, /(?:^|\n)\s*Name\s*[:\-]\s*([^\n\r]+)/i)
  const email   = rx(body, /([\w.+-]+@[\w-]+\.[\w.-]+)/)
  const phone   = rx(body, PHONE_LABELED, PHONE_FALLBACK)
  const address = rx(body, /(?:^|\n)\s*(?:Address|Property)\s*[:\-]\s*([^\n\r]+)/i)
  const side    = classifySide(body, msg.subject)
  if (!name && !email && !phone) return null
  return { name, email, phone, address, side }
}

const PARSERS: Record<string, Parser> = {
  certileads:    certileadsParser,
  closingleads:  closingleadsParser,
  atclosing:     atclosingParser,
  realtycom:     realtycomParser,
  // movoto/leaddeck use generic until Dana provides sample emails.
}

// ─── Main ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const result = {
    sourcesScanned: 0,
    messagesFound: 0,
    leadsCreated: 0,
    needsReview: 0,
    skipped: 0,
    errors: [] as string[],
  }

  try {
    const accessToken = await getGmailAccessToken(supabase)

    // 1 · Pull active sources configured for email intake.
    const { data: sources, error: srcErr } = await supabase
      .from('lead_sources')
      .select('id, slug, display_name, sides_supplied, buyer_tag_id, seller_tag_id, buyer_pct, buyer_flat_cents, buyer_fee_type, seller_pct, seller_flat_cents, seller_fee_type, attribution_window, intake')
      .eq('status', 'active')
      .filter('intake->>method', 'eq', 'email_forwarder')

    if (srcErr) throw srcErr
    if (!sources || sources.length === 0) {
      await heartbeat(supabase, 'lead-intake-email', { sources_scanned: 0, leads: 0, note: 'no_sources' })
    return json({ ok: true, ...result, note: 'No sources with intake.method=email_forwarder' })
    }

    for (const source of sources) {
      result.sourcesScanned++

      // Build Gmail query. Default = label:leads/<slug> newer_than:7d
      // Override via intake.gmail_query if Dana customizes.
      const query: string = source.intake?.gmail_query
        || `label:leads/${source.slug} newer_than:7d`

      let messages: Array<{ id: string }> = []
      try {
        messages = await searchGmail(accessToken, query, 50)
      } catch (e: any) {
        result.errors.push(`${source.slug} search: ${e.message}`)
        continue
      }
      if (messages.length === 0) continue
      result.messagesFound += messages.length

      // Filter out already-processed.
      const ids = messages.map(m => m.id)
      const { data: already } = await supabase
        .from('lead_emails_processed')
        .select('gmail_message_id')
        .in('gmail_message_id', ids)
      const seen = new Set((already || []).map(r => r.gmail_message_id))
      const fresh = messages.filter(m => !seen.has(m.id))
      result.skipped += messages.length - fresh.length

      // Resolve parser.
      const parser = PARSERS[source.slug] || genericParser

      for (const stub of fresh) {
        try {
          const msg = await fetchMessageContent(accessToken, stub.id)
          const parsed = parser(msg)

          // Common audit fields written either way.
          const baseLog = {
            gmail_message_id: stub.id,
            lead_source_id: source.id,
            raw_subject: msg.subject?.slice(0, 500) || null,
            raw_from: msg.from?.slice(0, 300) || null,
            raw_body_excerpt: msg.body?.slice(0, 800) || null,
          }

          if (!parsed || (!parsed.name && !parsed.email && !parsed.phone)) {
            // Mark needs_review and notify Dana.
            await supabase.from('lead_emails_processed').insert({
              ...baseLog,
              parse_status: 'needs_review',
              parse_error: 'Could not extract name/email/phone',
            })
            await supabase.from('notifications').insert({
              type: 'lead_parse_review',
              title: `Lead parse needs review — ${source.display_name}`,
              body: msg.subject?.slice(0, 200) || 'Email could not be auto-parsed',
              link: '/leads/review',
              source_table: 'lead_emails_processed',
              source_id: stub.id,
              metadata: { source_slug: source.slug, gmail_message_id: stub.id },
            })
            result.needsReview++
            continue
          }

          // Decide tag based on detected side + sides_supplied.
          let tagId: string | null = null
          let detectedSide: 'buyer' | 'seller' | null = parsed.side || null
          if (source.sides_supplied === 'buyer')  detectedSide = 'buyer'
          if (source.sides_supplied === 'seller') detectedSide = 'seller'
          if (detectedSide === 'buyer')  tagId = source.buyer_tag_id
          if (detectedSide === 'seller') tagId = source.seller_tag_id

          // Upsert contact via ensureContact-style logic (inline; the db helper is JS-only).
          const contactId = await ensureContactInline(supabase, {
            name: parsed.name,
            email: parsed.email,
            phone: parsed.phone,
            source: source.display_name,
            lead_source: source.display_name,
            notes: parsed.address ? `Property: ${parsed.address}` : null,
          })

          // Insert lead_attribution with rate snapshot.
          const expiresAt = computeExpiresAt(source.attribution_window)
          const { data: attr, error: attrErr } = await supabase
            .from('lead_attributions')
            .insert({
              contact_id: contactId,
              lead_source_id: source.id,
              acquired_at: msg.internalDate,
              expires_at: expiresAt,
              buyer_pct_locked: source.buyer_pct,
              buyer_flat_cents_locked: source.buyer_flat_cents,
              buyer_fee_type_locked: source.buyer_fee_type,
              seller_pct_locked: source.seller_pct,
              seller_flat_cents_locked: source.seller_flat_cents,
              seller_fee_type_locked: source.seller_fee_type,
              detected_side: detectedSide,
              source_lead_id: stub.id,
              raw_payload: { from: msg.from, subject: msg.subject, parsed },
            })
            .select('id')
            .single()
          if (attrErr) throw attrErr

          // Mark primary attribution + apply tag.
          await supabase.from('contacts').update({ primary_attribution_id: attr.id }).eq('id', contactId)
          if (tagId) {
            await supabase.from('contact_tags').upsert(
              { contact_id: contactId, tag_id: tagId },
              { onConflict: 'contact_id,tag_id' },
            )
          }

          // Audit.
          await supabase.from('lead_emails_processed').insert({
            ...baseLog,
            contact_id: contactId,
            attribution_id: attr.id,
            parse_status: 'parsed',
            detected_side: detectedSide,
          })

          // Notify Dana of new lead.
          await supabase.from('notifications').insert({
            type: 'new_lead',
            title: `New ${detectedSide || 'lead'} from ${source.display_name}`,
            body: `${parsed.name || parsed.email || parsed.phone}${parsed.address ? ' — ' + parsed.address : ''}`,
            link: contactId ? `/database` : '/leads/review',
            source_table: 'contacts',
            source_id: contactId,
            metadata: { source_slug: source.slug, attribution_id: attr.id, side: detectedSide },
          })

          result.leadsCreated++
        } catch (e: any) {
          console.error(`[lead-intake-email] ${stub.id}`, e)
          try {
            await supabase.from('lead_emails_processed').upsert({
              gmail_message_id: stub.id,
              lead_source_id: source.id,
              parse_status: 'error',
              parse_error: e.message?.slice(0, 1000) || String(e),
            })
          } catch (_) { /* swallow audit-log failures */ }
          result.errors.push(`${stub.id}: ${e.message || e}`)
        }
      }
    }

    await heartbeat(supabase, 'lead-intake-email', {
      sources: result.sourcesScanned,
      leads: result.leadsCreated,
      needs_review: result.needsReview,
    })
    return json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[lead-intake-email]', e)
    return json({ ok: false, error: e.message || String(e), ...result }, 500)
  }
})

// ─── Helpers ────────────────────────────────────────────────────────────────
function computeExpiresAt(window?: string): string | null {
  const now = Date.now()
  switch (window) {
    case 'one_year':  return new Date(now + 365 * 86400_000).toISOString()
    case 'two_years': return new Date(now + 2 * 365 * 86400_000).toISOString()
    case 'lifetime':  return null
    case 'none':      return new Date(now + 1 * 86400_000).toISOString()  // subscription = no per-deal claim
    case 'per_deal':
    default:          return null
  }
}

// Inline contact upsert: match by email → phone → name. Returns contact id.
async function ensureContactInline(supabase: any, p: {
  name?: string; email?: string; phone?: string;
  source?: string; lead_source?: string; notes?: string | null;
}): Promise<string> {
  const norm = (s?: string) => (s || '').trim().toLowerCase() || null
  const email = norm(p.email)
  const phoneDigits = (p.phone || '').replace(/\D/g, '')
  const phone = phoneDigits.length >= 10 ? phoneDigits : null
  const name = (p.name || '').trim() || null

  // Match by email first.
  if (email) {
    const { data } = await supabase.from('contacts').select('id').ilike('email', email).limit(1).maybeSingle()
    if (data?.id) {
      // Fill missing fields.
      await supabase.from('contacts').update({ phone: phone, name: name, lead_source: p.lead_source }).eq('id', data.id).is('phone', null)
      return data.id
    }
  }
  if (phone) {
    const { data } = await supabase.from('contacts').select('id').eq('phone', phone).limit(1).maybeSingle()
    if (data?.id) return data.id
  }
  if (name) {
    const { data } = await supabase.from('contacts').select('id').ilike('name', name).limit(1).maybeSingle()
    if (data?.id) return data.id
  }

  // Insert fresh.
  const { data: created, error } = await supabase.from('contacts').insert({
    name, email, phone,
    source: p.source,
    lead_source: p.lead_source,
    notes: p.notes,
    stage: 'new',
  }).select('id').single()
  if (error) throw error
  return created.id
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

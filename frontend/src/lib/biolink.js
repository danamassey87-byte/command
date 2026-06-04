// ─── Bio Link — Supabase persistence + public lead capture ──────────────────
import supabase from './supabase'
import { ensureContact } from './supabase'
import { enrollContact } from './campaigns'

function run(promise) {
  return promise.then(({ data, error }) => {
    if (error) throw new Error(error.message)
    return data
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pages
// ═══════════════════════════════════════════════════════════════════════════════

/** Load the user's bio link page (first one found — single-user for now). */
export async function loadPage() {
  const row = await run(
    supabase.from('biolink_pages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
  )
  return row
}

/** Save (upsert) the page config. Creates if no id provided. */
export async function savePage(page) {
  const payload = {
    slug: page.slug || 'dana',
    title: page.title || 'My Link Page',
    page_json: page.pageJson || page.page_json || page,
    published: page.published ?? false,
    updated_at: new Date().toISOString(),
  }

  if (page.id) {
    const updated = await run(
      supabase.from('biolink_pages')
        .update(payload)
        .eq('id', page.id)
        .select()
        .single()
    )
    return updated
  }

  const created = await run(
    supabase.from('biolink_pages')
      .insert(payload)
      .select()
      .single()
  )
  return created
}

/** Publish the page (set published = true). */
export async function publishPage(id) {
  return run(
    supabase.from('biolink_pages')
      .update({ published: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
  )
}

/** Unpublish the page. */
export async function unpublishPage(id) {
  return run(
    supabase.from('biolink_pages')
      .update({ published: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
  )
}

/** Check if a slug is available (or belongs to the given page id). */
export async function isSlugAvailable(slug, currentPageId) {
  const { data } = await supabase.from('biolink_pages')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) return true
  return data.id === currentPageId
}

/** Fetch a published page by slug (public / anon). */
export async function getPublicPage(slug) {
  const row = await run(
    supabase.from('biolink_pages')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .maybeSingle()
  )
  return row
}

// ═══════════════════════════════════════════════════════════════════════════════
// Lead Capture (public — called from the public page)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Submit a lead from a bio link form/guide block.
 * 1. Insert into biolink_leads
 * 2. Upsert into contacts (dedup by email)
 * 3. If campaignId provided, auto-enroll in that campaign
 * Returns { lead, contact, enrolled }
 */
// H13 from SECURITY_AUDIT_PUNCHLIST: submitLead used to write directly to
// biolink_leads + contacts + campaign_enrollments from anon, with no rate
// limit or captcha. A spammer could pollute the CRM and burn Resend on
// auto-enrolled campaigns. Now routes through biolink-submit edge fn
// which (1) per-IP rate-limits at 10/hr via the M18 rate_limits table,
// (2) optionally verifies a Cloudflare Turnstile token if TURNSTILE_SECRET
// is set, (3) performs all writes server-side under service-role.
//
// `turnstileToken` is optional — pass it from a Turnstile widget when
// Dana wires that up. The edge fn no-ops the check if the secret isn't
// configured, falling back to rate-limit-only protection.
export async function submitLead({ pageId, blockId, name, email, phone, guideType, campaignId, turnstileToken } = {}) {
  const { data, error } = await supabase.functions.invoke('biolink-submit', {
    body: {
      page_id: pageId || null,
      block_id: blockId || null,
      name: name || null,
      email: email || null,
      phone: phone || null,
      guide_type: guideType || null,
      campaign_id: campaignId || null,
      turnstile_token: turnstileToken || null,
    },
  })
  if (error) throw error
  if (data?.error) {
    const err = new Error(data.error)
    if (data.retry_after_seconds) err.retryAfter = data.retry_after_seconds
    throw err
  }
  return { lead: data?.lead, contact: data?.contact, enrolled: data?.enrolled === true }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Leads list (admin view)
// ═══════════════════════════════════════════════════════════════════════════════

export async function listLeads(pageId) {
  let q = supabase.from('biolink_leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (pageId) q = q.eq('page_id', pageId)

  return run(q)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

export function publicPageUrl(slug) {
  return `${window.location.origin}/p/${slug}`
}

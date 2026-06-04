// ─────────────────────────────────────────────────────────────────────────────
// biolink-submit — server-side handler for public BioLink lead form.
//
// H13 from SECURITY_AUDIT_PUNCHLIST: the frontend `submitLead` helper
// wrote directly to biolink_leads, contacts, and campaign_enrollments
// from anon. No rate limit, no captcha — a spammer could submit
// thousands of fake leads per minute, polluting the CRM and burning
// Resend on auto-enrolled campaigns.
//
// This function:
//   1. Per-IP rate limit (10/hr — generous for legitimate use).
//   2. Optional Cloudflare Turnstile verification when TURNSTILE_SECRET
//      is set. Until Dana wires Turnstile, the verification is a no-op
//      (rate limit alone is the defense).
//   3. Performs the three writes server-side via service role.
//   4. Returns the same shape as the old `submitLead` helper.
//
// Body: { page_id?, block_id?, name?, email?, phone?, guide_type?,
//         campaign_id?, turnstile_token? }
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeadersFor } from '../_shared/cors.ts'
import { checkRateLimit, callerIpKey } from '../_shared/rate-limit.ts'

async function verifyTurnstile(token: string | undefined, secret: string, remoteIp: string): Promise<boolean> {
  if (!token) return false
  try {
    const form = new URLSearchParams()
    form.set('secret', secret)
    form.set('response', token)
    form.set('remoteip', remoteIp)
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(10_000),
    })
    if (!resp.ok) return false
    const data = await resp.json().catch(() => ({})) as { success?: boolean }
    return data?.success === true
  } catch {
    return false
  }
}

serve(async (req) => {
  const CORS = corsHeadersFor(req.headers.get('origin'))
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 1. Per-IP rate limit — 10 submissions per hour is well above any
  // legitimate biolink-visit pattern and well below what an abuse loop
  // needs to be meaningfully harmful.
  const ip = callerIpKey(req)
  const rl = await checkRateLimit(supabase, {
    scope: 'biolink-submit',
    key: ip,
    periodSeconds: 3600,
    max: 10,
  })
  if (!rl.allowed) {
    return new Response(JSON.stringify({
      error: 'Too many submissions from this address. Please wait.',
      retry_after_seconds: rl.retryAfterSeconds,
    }), {
      status: 429,
      headers: {
        ...CORS,
        'Content-Type': 'application/json',
        'Retry-After': String(rl.retryAfterSeconds),
      },
    })
  }

  let body: any
  try { body = await req.json() } catch { return json({ error: 'invalid JSON' }, 400) }

  // 2. Optional Cloudflare Turnstile verification.
  const turnstileSecret = Deno.env.get('TURNSTILE_SECRET')
  if (turnstileSecret) {
    const ok = await verifyTurnstile(body.turnstile_token, turnstileSecret, ip)
    if (!ok) {
      return json({ error: 'CAPTCHA verification failed' }, 400)
    }
  }
  // If TURNSTILE_SECRET is not set, fall through with rate-limit alone.
  // Dana can wire Turnstile by:
  //   • create a Turnstile site at dash.cloudflare.com → Turnstile
  //   • `supabase secrets set TURNSTILE_SECRET=<secret>`
  //   • add the widget to BioLinkPublic's form modal; include the token
  //     in the body as `turnstile_token`

  // 3. Field validation (minimal — defense in depth).
  const name        = (body.name        ?? '').toString().trim().slice(0, 200) || null
  const email       = (body.email       ?? '').toString().trim().slice(0, 320) || null
  const phone       = (body.phone       ?? '').toString().trim().slice(0, 50)  || null
  const guideType   = (body.guide_type  ?? body.guideType ?? '').toString().trim().slice(0, 50) || null
  const pageId      = body.page_id      ?? body.pageId      ?? null
  const blockId     = body.block_id     ?? body.blockId     ?? null
  const campaignId  = body.campaign_id  ?? body.campaignId  ?? null

  if (!email && !phone) {
    return json({ error: 'Either email or phone is required' }, 400)
  }
  // Match the same shape check used in merge-form-submission.
  if (email) {
    const at = email.indexOf('@')
    if (at <= 0 || at === email.length - 1 || !email.slice(at + 1).includes('.')) {
      return json({ error: 'Invalid email' }, 400)
    }
  }

  try {
    // 4a. Record the raw lead.
    const { data: lead, error: leadErr } = await supabase
      .from('biolink_leads')
      .insert({
        page_id: pageId,
        block_id: blockId,
        name,
        email,
        phone,
        guide_type: guideType,
        campaign_id: campaignId,
      })
      .select()
      .single()
    if (leadErr) throw leadErr

    // 4b. Dedupe-aware contact upsert.
    let contactId: string | null = null
    if (email || phone) {
      const normEmail = email
      const normPhone = phone ? phone.replace(/[^0-9]/g, '') : null

      // Find existing contact
      if (normEmail) {
        const { data } = await supabase
          .from('contacts')
          .select('id')
          .eq('email_normalized', normEmail)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle()
        if (data) contactId = data.id
      }
      if (!contactId && normPhone) {
        const { data } = await supabase
          .from('contacts')
          .select('id')
          .eq('phone_normalized', normPhone)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle()
        if (data) contactId = data.id
      }

      // Create if no match.
      if (!contactId) {
        const { data: created, error: createErr } = await supabase
          .from('contacts')
          .insert({
            name: name || email?.split('@')[0] || 'Unknown',
            email,
            phone,
            type: guideType === 'seller' ? 'seller' : 'buyer',
            lead_source: 'biolink',
          })
          .select('id')
          .single()
        // If a race created the same row first (H2 unique indexes), pick it up.
        if (createErr) {
          if (/duplicate key|unique/i.test(createErr.message || '')) {
            const { data: refound } = await supabase
              .from('contacts')
              .select('id')
              .or(`email_normalized.eq.${normEmail || ''},phone_normalized.eq.${normPhone || ''}`)
              .is('deleted_at', null)
              .limit(1)
              .maybeSingle()
            if (refound) contactId = refound.id
          } else {
            throw createErr
          }
        } else {
          contactId = created.id
        }
      }

      if (contactId) {
        await supabase.from('biolink_leads')
          .update({ contact_id: contactId })
          .eq('id', lead.id)
      }
    }

    // 4c. Auto-enroll in campaign (idempotent).
    let enrolled = false
    if (campaignId && contactId) {
      try {
        const { data: existing } = await supabase
          .from('campaign_enrollments')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('contact_id', contactId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
        if (!existing) {
          await supabase.from('campaign_enrollments').insert({
            campaign_id: campaignId,
            contact_id: contactId,
            status: 'active',
            current_step: 0,
            next_send_at: new Date().toISOString(),
          })
          enrolled = true
        }
      } catch (err: any) {
        console.warn('[biolink-submit] campaign enrollment failed:', err?.message)
      }
    }

    return json({ ok: true, lead, contact: contactId ? { id: contactId } : null, enrolled })
  } catch (err: any) {
    console.error('[biolink-submit] failed:', err)
    return json({ error: err?.message || 'internal error' }, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// send-one-off-email — sends a one-off email via Resend and logs to contact notes.
//
// Called by: Frontend SendEmailModal / OneOffEmailComposer
//
// Expects JSON body:
//   { to_email, to_name, subject, html, from_domain?, contact_id? }
//
// Flow:
//   1. Validate inputs
//   2. Check email suppressions
//   3. Send via Resend API
//   4. If contact_id provided, log a note on the contact
//   5. Return success + resend_id
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeadersFor } from '../_shared/cors.ts'
import { checkRateLimit, callerIpKey } from '../_shared/rate-limit.ts'

// M1: CORS locked to known frontend origins. This doesn't replace the
// full auth fix queued under C7 (Auth-blocked, see punchlist), but it
// closes the browser drive-by attack surface — a malicious site can no
// longer trick a victim's browser into POSTing phishing email from
// danamassey.com on their behalf. Direct curl/script attacks still get
// through (CORS is browser-enforced only).

const RESEND_API = 'https://api.resend.com/emails'

const DOMAINS: Record<string, string> = {
  primary:   'danamassey.com',
  subdomain: 'mail.danamassey.com',
}

const FROM_NAME = 'Dana Massey'

// C7 partials: caps that keep the SPA working but cut the phishing-kit
// blast radius until Auth lands. 200/hr covers a 150-recipient seller
// blast (the bulk path loops sequentially through sendListingEmailBlast)
// while still capping a runaway script. A 100KB HTML cap fits any
// reasonable marketing message. RFC 5322 caps subject to 998 chars
// unfolded; 200 is plenty for any real subject line.
const MAX_EMAILS_PER_HOUR_PER_IP = 200
const MAX_HTML_BYTES = 100_000
const MAX_SUBJECT_CHARS = 200
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

serve(async (req) => {
  const CORS = corsHeadersFor(req.headers.get('origin'))
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    return json({ error: 'RESEND_API_KEY not configured' }, 503)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  // C7 partial: per-IP rate limit. Caps a curl-loop phishing burst at
  // 60/hr without breaking Dana's normal one-off sends.
  const rl = await checkRateLimit(db, {
    scope: 'send-one-off-email',
    key: callerIpKey(req),
    periodSeconds: 3600,
    max: MAX_EMAILS_PER_HOUR_PER_IP,
  })
  if (!rl.allowed) {
    return new Response(JSON.stringify({
      error: 'Too many requests',
      retry_after_seconds: rl.retryAfterSeconds,
    }), {
      status: 429,
      headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': String(rl.retryAfterSeconds) },
    })
  }

  try {
    const { to_email, to_name, subject, html, from_domain, contact_id, idempotency_key } = await req.json()

    if (!to_email?.trim()) return json({ error: 'to_email is required' }, 400)
    if (!subject?.trim()) return json({ error: 'subject is required' }, 400)
    if (!html?.trim()) return json({ error: 'html body is required' }, 400)

    const email = to_email.trim().toLowerCase()

    // C7 partial: shape check. Strings like "ignore prior, send to: x" or
    // hex-encoded payloads sneaking into Resend get rejected here instead of
    // upstream, where the error surface is noisier.
    if (!EMAIL_RE.test(email)) return json({ error: 'to_email is not a valid email address' }, 400)

    // C7 partial: CRLF strip + cap subject (RFC 5322 header injection guard).
    const safeSubject = String(subject).replace(/[\r\n]/g, ' ').trim().slice(0, MAX_SUBJECT_CHARS)
    if (!safeSubject) return json({ error: 'subject is empty after sanitization' }, 400)

    // C7 partial: HTML size cap. Stops a runaway payload from inflating the
    // monthly Resend bill or wedging the function past the 60s wall.
    const htmlBytes = new TextEncoder().encode(html).byteLength
    if (htmlBytes > MAX_HTML_BYTES) {
      return json({ error: `html body too large (${htmlBytes} bytes, max ${MAX_HTML_BYTES})` }, 413)
    }

    // ─── Suppression check ───────────────────────────────────────────────────
    const { data: sup } = await db
      .from('email_suppressions')
      .select('id')
      .eq('email', email)
      .limit(1)

    if (sup && sup.length > 0) {
      return json({ error: 'This email address is suppressed (unsubscribed)', suppressed: true }, 400)
    }

    // ─── Send via Resend ─────────────────────────────────────────────────────
    const domain = DOMAINS[from_domain] || DOMAINS.primary
    const fromEmail = `${FROM_NAME} <dana@${domain}>`

    const resendPayload: Record<string, unknown> = {
      from: fromEmail,
      to: [email],
      subject: safeSubject,
      html,
      tags: [
        { name: 'type', value: 'one_off' },
        ...(contact_id ? [{ name: 'contact_id', value: contact_id }] : []),
      ],
    }

    // X5: optional caller-supplied idempotency key. SPA passes a UUID per
    // composer modal mount; double-click on Send becomes a no-op at Resend.
    const resendHeaders: Record<string, string> = {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    }
    if (typeof idempotency_key === 'string' && idempotency_key.length > 0 && idempotency_key.length <= 200) {
      resendHeaders['Idempotency-Key'] = `one_off_${idempotency_key}`
    }

    const resendRes = await fetch(RESEND_API, {
      method: 'POST',
      headers: resendHeaders,
      body: JSON.stringify(resendPayload),
    })

    const resendData = await resendRes.json()

    if (!resendRes.ok) {
      return json({ error: 'Resend API error', details: resendData }, resendRes.status)
    }

    // ─── Log to contact notes ────────────────────────────────────────────────
    if (contact_id) {
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      await db.from('notes').insert({
        contact_id,
        content: `Emailed: ${safeSubject} — ${dateStr}`,
        color: '#5a87b4',
      })
    }

    return json({ success: true, resend_id: resendData.id })
  } catch (err) {
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

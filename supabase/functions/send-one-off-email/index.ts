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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'

const DOMAINS: Record<string, string> = {
  primary:   'danamassey.com',
  subdomain: 'mail.danamassey.com',
}

const FROM_NAME = 'Dana Massey'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
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

  try {
    const { to_email, to_name, subject, html, from_domain, contact_id } = await req.json()

    if (!to_email?.trim()) return json({ error: 'to_email is required' }, 400)
    if (!subject?.trim()) return json({ error: 'subject is required' }, 400)
    if (!html?.trim()) return json({ error: 'html body is required' }, 400)

    const email = to_email.trim().toLowerCase()

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
      subject: subject.trim(),
      html,
      tags: [
        { name: 'type', value: 'one_off' },
        ...(contact_id ? [{ name: 'contact_id', value: contact_id }] : []),
      ],
    }

    const resendRes = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
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
        content: `Emailed: ${subject.trim()} — ${dateStr}`,
        color: '#5a87b4',
      })
    }

    return json({ success: true, resend_id: resendData.id })
  } catch (err) {
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

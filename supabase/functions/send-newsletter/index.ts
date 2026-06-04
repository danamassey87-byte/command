// ─────────────────────────────────────────────────────────────────────────────
// send-newsletter — sends a newsletter to all recipients via Resend.
//
// Called by:
//   - pg_cron (for scheduled newsletters)
//   - Frontend "Send Now" button (manual trigger)
//
// Expects JSON body: { newsletter_id: uuid } OR no body (cron mode scans for due newsletters)
//
// H7 from SECURITY_AUDIT_PUNCHLIST: three bugs fixed in this batch.
//   1. Suppression column mismatch. resend-webhook writes the normalized
//      address to `email_suppressions.email`; this function was reading
//      `email_normalized` (nullable, never populated by the webhook), so
//      every hard-bounced / unsubscribed contact got the newsletter
//      anyway. Switched to `email`.
//   2. Dropped recipients >50. Previously the function inserted every
//      recipient row, sent the first 50, and immediately marked the
//      newsletter as `sent`. Everyone past slot 51 silently never got
//      the email. Now we keep `status='sending'` until all rows are
//      processed; subsequent cron runs pick up the remaining
//      `pending` recipients via a per-recipient claim.
//   3. CRLF header injection via `{first_name}`. A contact name with
//      `\r\n` could split the Subject header. We strip CRLF from both
//      first_name and the resolved subject before sending.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { heartbeat } from '../_shared/heartbeat.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API = 'https://api.resend.com/emails'
const FROM_NAME = 'Dana Massey'
const DOMAINS: Record<string, string> = {
  primary: 'danamassey.com',
  subdomain: 'mail.danamassey.com',
}
const MAX_PER_RUN = 50 // Rate limit per invocation

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const db = createClient(supabaseUrl, serviceKey)

  if (!resendKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch { /* no body = cron mode */ }

    let newsletterIds: string[] = []

    if (body.newsletter_id) {
      // Manual trigger — send specific newsletter
      newsletterIds = [body.newsletter_id as string]
    } else {
      // Cron mode — find newsletters that need work. Includes 'sending'
      // (multi-batch in-flight) so a newsletter with >MAX_PER_RUN recipients
      // gets processed across multiple cron ticks.
      const now = new Date().toISOString()
      const { data: due } = await db
        .from('newsletters')
        .select('id')
        .in('status', ['scheduled', 'sending'])
        .lte('scheduled_for', now)
        .is('deleted_at', null)
        .limit(5)
      newsletterIds = (due ?? []).map((n: { id: string }) => n.id)
    }

    const results: Record<string, unknown>[] = []

    for (const nlId of newsletterIds) {
      const { data: nl } = await db
        .from('newsletters')
        .select('*')
        .eq('id', nlId)
        .single()

      if (!nl || nl.status === 'sent') continue

      // H7 step 1: on the FIRST tick (status='scheduled') we need to resolve
      // the recipient list from the filter and write per-recipient rows. On
      // subsequent ticks (status='sending') we skip this and just drain
      // pending recipients from the table.
      if (nl.status === 'scheduled') {
        const filter = nl.recipient_filter ?? { segment: 'all' }
        let contactQuery = db.from('contacts').select('id, name, email').not('email', 'is', null)

        if (filter.segment === 'buyers') contactQuery = contactQuery.in('type', ['buyer', 'both'])
        else if (filter.segment === 'sellers') contactQuery = contactQuery.in('type', ['seller', 'both'])
        else if (filter.segment === 'leads') contactQuery = contactQuery.eq('type', 'lead')
        else if (filter.segment === 'investors') contactQuery = contactQuery.eq('type', 'investor')
        else if (filter.segment === 'past_clients') contactQuery = contactQuery.eq('stage', 'Closed')
        // 'all' = no additional filter

        const { data: recipients } = await contactQuery

        if (!recipients?.length) {
          await db.from('newsletters').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            recipient_count: 0,
          }).eq('id', nlId)
          results.push({ id: nlId, sent: 0, reason: 'no recipients' })
          continue
        }

        // H7 fix #1: read `email` column. resend-webhook writes the
        // normalized address there (line 145); `email_normalized` is a
        // separate nullable column that nothing currently populates, so the
        // previous query missed every real suppression.
        const { data: suppressions } = await db
          .from('email_suppressions')
          .select('email')
        const suppressedSet = new Set(
          (suppressions ?? []).map((s: { email: string }) => (s.email || '').toLowerCase().trim())
        )

        const validRecipients = recipients.filter((r: { email: string }) =>
          r.email && !suppressedSet.has(r.email.toLowerCase().trim())
        )

        if (!validRecipients.length) {
          await db.from('newsletters').update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            recipient_count: 0,
          }).eq('id', nlId)
          results.push({ id: nlId, sent: 0, reason: 'all suppressed' })
          continue
        }

        const recipientRows = validRecipients.map((r: { id: string; name: string; email: string }) => ({
          newsletter_id: nlId,
          contact_id: r.id,
          email: r.email,
          name: r.name,
          status: 'pending',
        }))
        await db.from('newsletter_recipients').insert(recipientRows)

        // Flip to 'sending' so subsequent cron ticks pick up the remaining
        // pending rows. recipient_count is the final total (set once, never
        // re-counted on subsequent batches).
        await db.from('newsletters').update({
          status: 'sending',
          recipient_count: validRecipients.length,
        }).eq('id', nlId)
      }

      // Drain up to MAX_PER_RUN pending recipients for this newsletter.
      const { data: pending } = await db
        .from('newsletter_recipients')
        .select('id, contact_id, email, name')
        .eq('newsletter_id', nlId)
        .eq('status', 'pending')
        .limit(MAX_PER_RUN)

      if (!pending?.length) {
        // Nothing pending — mark complete.
        await db.from('newsletters').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        }).eq('id', nlId)
        results.push({ id: nlId, sent: 0, reason: 'no pending recipients' })
        continue
      }

      // Render HTML
      const domain = DOMAINS[nl.send_via_domain] || DOMAINS.primary
      const fromEmail = `${FROM_NAME} <dana@${domain}>`
      const emailHtml = renderBlocksToHtml(nl.email_blocks ?? [], nl.email_settings ?? {})

      let sentCount = 0
      for (const recipient of pending) {
        // H7 fix #3: strip CRLF from name-derived fields to prevent header
        // injection via the Subject line. RFC 5322 disallows CR/LF in
        // unfolded header values; Resend may or may not enforce it.
        const rawFirstName = (recipient.name || '').split(' ')[0] || ''
        const firstName = rawFirstName.replace(/[\r\n]/g, '')
        const fullName = (recipient.name || '').replace(/[\r\n]/g, '')

        const personalizedHtml = emailHtml
          .replace(/\{first_name\}/g, firstName)
          .replace(/\{full_name\}/g, fullName)
          .replace(/\{email\}/g, recipient.email || '')

        const personalizedSubject = (nl.subject || 'Newsletter')
          .replace(/\{first_name\}/g, firstName)
          .replace(/\{month\}/g, new Date().toLocaleDateString('en-US', { month: 'long' }))
          .replace(/\{year\}/g, String(new Date().getFullYear()))
          .replace(/[\r\n]/g, ' ')
          .slice(0, 998)

        try {
          // X5: pre-record-then-send. `newsletter_recipients` row already
          // exists (pending) by the time we call Resend — its id is the
          // natural idempotency key. Resend honors Idempotency-Key for ~24h,
          // so a cron retry that mid-fails on the status UPDATE will not
          // double-send to the same recipient.
          const res = await fetch(RESEND_API, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
              'Idempotency-Key': `newsletter_recipient_${recipient.id}`,
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [recipient.email],
              subject: personalizedSubject,
              html: personalizedHtml,
            }),
          })
          const resData = await res.json()

          if (res.ok) {
            await db.from('newsletter_recipients')
              .update({
                status: 'sent',
                sent_at: new Date().toISOString(),
                resend_email_id: resData.id ?? null,
              })
              .eq('id', recipient.id)
            sentCount++
          } else {
            await db.from('newsletter_recipients')
              .update({ status: 'failed' })
              .eq('id', recipient.id)
          }
        } catch (err) {
          console.error(`Failed to send to ${recipient.email}:`, err)
          await db.from('newsletter_recipients')
            .update({ status: 'failed' })
            .eq('id', recipient.id)
        }
      }

      // H7 fix #2: only flip the newsletter to 'sent' when there are no more
      // pending recipients. If this batch left some pending (>MAX_PER_RUN
      // total recipients), the next cron tick picks up the rest.
      const { count: remaining } = await db
        .from('newsletter_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('newsletter_id', nlId)
        .eq('status', 'pending')

      if (!remaining || remaining === 0) {
        // Recount delivered + capture send_at on final flip.
        const { count: deliveredFinal } = await db
          .from('newsletter_recipients')
          .select('id', { count: 'exact', head: true })
          .eq('newsletter_id', nlId)
          .eq('status', 'sent')
        await db.from('newsletters').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          delivered_count: deliveredFinal ?? sentCount,
        }).eq('id', nlId)
      }

      results.push({
        id: nlId,
        sent_this_batch: sentCount,
        pending_remaining: remaining ?? 0,
        complete: !remaining || remaining === 0,
      })
    }

    await heartbeat(db, 'send-newsletter', { newsletters: results.length })

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-newsletter error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

// Simple server-side HTML renderer for email blocks
function renderBlocksToHtml(blocks: unknown[], settings: Record<string, unknown>): string {
  const bg = (settings.bgColor as string) || '#e8e4de'
  const emailBg = (settings.emailBgColor as string) || '#ffffff'
  const font = (settings.fontFamily as string) || "'Poppins', Arial, sans-serif"
  const radius = (settings.borderRadius as number) ?? 6

  const inner = (blocks as Record<string, unknown>[]).map(b => {
    switch (b.type) {
      case 'header':
        return `<div style="background:${b.bgColor || '#524136'};color:${b.textColor || '#fff'};padding:${b.padding || 28}px;text-align:center;border-radius:${b.borderRadius || 0}px ${b.borderRadius || 0}px 0 0;">
          ${b.logoUrl ? `<img src="${b.logoUrl}" alt="" style="max-height:48px;" />` : '<strong style="font-size:1.1rem;">REAL Broker</strong>'}
        </div>`
      case 'greeting':
        return `<p style="font-size:${b.fontSize || 15}px;margin:16px 0 8px;">${b.text || ''}</p>`
      case 'text':
        return `<div style="font-size:${b.fontSize || 14}px;line-height:${b.lineHeight || 1.65};color:${b.color || '#444'};margin:12px 0;">${(b.content as string || '').replace(/\n/g, '<br/>')}</div>`
      case 'cta':
        return `<div style="text-align:center;margin:20px 0;"><a href="${b.url || '#'}" style="display:inline-block;padding:${b.padding || 12}px 28px;background:${b.bgColor || '#524136'};color:${b.textColor || '#fff'};border-radius:${b.borderRadius || 6}px;text-decoration:none;font-size:${b.fontSize || 14}px;font-weight:600;">${b.label || 'Learn More'}</a></div>`
      case 'property-card':
        return `<div style="background:${b.bgColor || '#faf9f7'};border-radius:${b.borderRadius || 8}px;padding:16px;margin:12px 0;border:1px solid #e5e7eb;">
          <p style="font-weight:700;font-size:1.1rem;margin:0;">${b.price || ''}</p>
          <p style="margin:4px 0 0;color:#666;">${b.address || ''}</p>
          ${b.beds || b.baths || b.sqft ? `<p style="font-size:0.85rem;color:#888;margin:4px 0 0;">${b.beds ? b.beds + ' bd' : ''}${b.baths ? ' · ' + b.baths + ' ba' : ''}${b.sqft ? ' · ' + b.sqft + ' sqft' : ''}</p>` : ''}
          ${b.description ? `<p style="font-size:0.85rem;margin:8px 0 0;">${b.description}</p>` : ''}
        </div>`
      case 'event-card':
        return `<div style="border-left:4px solid ${b.accentColor || '#524136'};padding:12px 16px;margin:12px 0;background:#faf9f7;border-radius:0 8px 8px 0;">
          <p style="font-weight:700;margin:0;">${b.title || 'Event'}</p>
          ${b.date ? `<p style="margin:4px 0 0;color:#666;">${b.date}${b.time ? ' · ' + b.time : ''}</p>` : ''}
          ${b.address ? `<p style="margin:4px 0 0;color:#666;">${b.address}</p>` : ''}
        </div>`
      case 'stats-row':
        const stats = (b.stats as { label: string; value: string; delta: string }[]) || []
        return `<div style="display:flex;gap:8px;margin:16px 0;">${stats.map(s =>
          `<div style="flex:1;text-align:center;padding:12px;background:#faf9f7;border-radius:${b.borderRadius || 8}px;">
            <p style="font-size:1.2rem;font-weight:700;margin:0;">${s.value}</p>
            <p style="font-size:0.75rem;color:#888;margin:4px 0 0;">${s.label}</p>
          </div>`
        ).join('')}</div>`
      case 'divider':
        return `<hr style="border:none;border-top:${b.thickness || 1}px ${b.dividerStyle || 'solid'} ${b.color || '#b79782'};margin:16px 0;" />`
      case 'image':
        const imgs = (b.images as string[]) || []
        return imgs.filter(u => u).map(u => `<img src="${u}" alt="${b.alt || ''}" style="width:100%;border-radius:${b.borderRadius || 0}px;margin:8px 0;" />`).join('')
      case 'signature':
        return `<div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:24px;">
          ${b.name ? `<p style="font-weight:700;margin:0;">${b.name}</p>` : ''}
          ${b.title ? `<p style="font-size:0.85rem;color:#666;margin:2px 0 0;">${b.title}</p>` : ''}
          ${b.phone ? `<p style="font-size:0.85rem;margin:2px 0 0;">${b.phone}</p>` : ''}
          ${b.email ? `<p style="font-size:0.85rem;margin:2px 0 0;">${b.email}</p>` : ''}
        </div>`
      default:
        return ''
    }
  }).join('\n')

  return `<div style="background:${bg};padding:32px 16px;">
    <div style="max-width:600px;margin:0 auto;background:${emailBg};border-radius:${radius}px;overflow:hidden;font-family:${font};">
      <div style="padding:0 28px 28px;">${inner}</div>
    </div>
  </div>`
}

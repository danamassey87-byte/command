// ─────────────────────────────────────────────────────────────────────────────
// gmail-reply-detect — Scans Gmail for replies to campaign emails.
//
// Searches Gmail for replies to emails sent from dana@danamassey.com or Resend
// domains. When a reply is found:
//   1. Logs it to gmail_reply_log
//   2. Updates campaign_step_history with replied_at + reply_detected
//   3. Updates campaign_enrollments reply_count
//   4. Updates contacts with last_reply_scan_at + reply_count + 'replied' tag
//   5. Writes campaign_audit_log entry (action = 'replied')
//   6. Creates a notification (type = 'campaign_reply')
//
// Uses tokens from user_settings 'google_tokens'. Includes token refresh logic.
// Deduplicates by checking gmail_reply_log.thread_id before inserting.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

// Sender addresses/domains to look for replies to
const SENDER_ADDRESSES = [
  'dana@danamassey.com',
]
const SENDER_DOMAINS = [
  'danamassey.com',
  'mail.danamassey.com',
  'send.danamassey.com',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json().catch(() => ({}))
    const { days_back = 7, max_results = 100 } = body

    // ─── Load + refresh Google tokens ─────────────────────────────────────────
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'google_tokens')
      .maybeSingle()

    if (tokenErr || !tokenRow?.value?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Google account not connected. Connect via Settings.', code: 'not_connected' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    let tokens = tokenRow.value

    // Check if token is expired (with 5-min buffer)
    const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0
    const isExpired = Date.now() > (expiresAt - 5 * 60 * 1000)

    if (isExpired && tokens.refresh_token) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Google OAuth credentials not configured for token refresh.', code: 'missing_credentials' }),
          { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const refreshResp = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      const refreshData = await refreshResp.json()

      if (refreshResp.ok && refreshData.access_token) {
        tokens = {
          ...tokens,
          access_token: refreshData.access_token,
          expires_in: refreshData.expires_in || 3600,
          expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
        }

        await supabase
          .from('user_settings')
          .upsert(
            { key: 'google_tokens', value: tokens, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          )
      } else {
        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please reconnect Google account.', detail: refreshData.error_description || refreshData.error, code: 'refresh_failed' }),
          { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
    }

    const authHeader = { 'Authorization': `Bearer ${tokens.access_token}` }

    // ─── Load existing reply thread IDs for dedup ───────────────────────────
    const { data: existingReplies } = await supabase
      .from('gmail_reply_log')
      .select('thread_id, reply_from_email')

    const seenThreadEmails = new Set(
      (existingReplies || []).map(r => `${r.thread_id}::${r.reply_from_email?.toLowerCase()}`)
    )

    // ─── Build Gmail search query ─────────────────────────────────────────────
    const afterDate = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000)
    const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`

    // Gmail query: find threads in inbox after the date
    // We look for threads where we sent something, which Gmail keeps as threads
    const searchQuery = `in:inbox after:${afterStr}`

    const searchParams = new URLSearchParams({
      q: searchQuery,
      maxResults: String(max_results),
    })

    const searchResp = await fetch(`${GMAIL_API}/threads?${searchParams.toString()}`, {
      headers: authHeader,
    })

    if (!searchResp.ok) {
      const errText = await searchResp.text().catch(() => '')
      return new Response(
        JSON.stringify({ error: `Gmail API search error (${searchResp.status})`, detail: errText.slice(0, 300), code: 'gmail_api_error' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const searchData = await searchResp.json()
    const threads = searchData.threads || []

    // ─── Load contacts + campaign data for matching ─────────────────────────
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, email, tags, reply_count')
      .is('deleted_at', null)

    const contactsByEmail = new Map<string, any>()
    for (const c of (contacts || [])) {
      if (c.email) {
        contactsByEmail.set(c.email.toLowerCase(), c)
      }
    }

    // Load campaign step history with subject lines for matching
    const { data: stepHistory } = await supabase
      .from('campaign_step_history')
      .select('id, enrollment_id, subject, sent_at, reply_detected')
      .gte('sent_at', afterDate.toISOString())
      .order('sent_at', { ascending: false })

    // Load enrollments to link step history to contacts + campaigns
    const enrollmentIds = [...new Set((stepHistory || []).map(s => s.enrollment_id).filter(Boolean))]
    let enrollmentMap: Record<string, any> = {}
    if (enrollmentIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('campaign_enrollments')
        .select('id, campaign_id, contact_id')
        .in('id', enrollmentIds)

      for (const e of (enrollments || [])) {
        enrollmentMap[e.id] = e
      }
    }

    // Load campaign names
    const campaignIds = [...new Set(Object.values(enrollmentMap).map((e: any) => e.campaign_id).filter(Boolean))]
    let campaignNames: Record<string, string> = {}
    if (campaignIds.length > 0) {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds)
      for (const c of (campaigns || [])) {
        campaignNames[c.id] = c.name
      }
    }

    // Build a map: contact_email → [{stepHistory, enrollment}] for subject matching
    const stepsByContactEmail = new Map<string, Array<{ step: any; enrollment: any }>>()
    for (const step of (stepHistory || [])) {
      const enrollment = enrollmentMap[step.enrollment_id]
      if (!enrollment) continue
      const contact = (contacts || []).find(c => c.id === enrollment.contact_id)
      if (!contact?.email) continue
      const email = contact.email.toLowerCase()
      if (!stepsByContactEmail.has(email)) stepsByContactEmail.set(email, [])
      stepsByContactEmail.get(email)!.push({ step, enrollment })
    }

    // ─── Process each thread to find replies ──────────────────────────────────
    interface ReplyRecord {
      thread_id: string
      subject: string
      reply_from_email: string
      reply_from_name: string
      reply_date: string
      snippet: string
      contact_id: string | null
      contact_name: string
      matched_step_id: string | null
      matched_enrollment_id: string | null
      matched_campaign_id: string | null
      matched_campaign_name: string | null
    }

    const newReplies: ReplyRecord[] = []

    for (const thread of threads) {
      try {
        const threadResp = await fetch(
          `${GMAIL_API}/threads/${thread.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=To`,
          { headers: authHeader }
        )

        if (!threadResp.ok) continue

        const threadData = await threadResp.json()
        const messages = threadData.messages || []

        if (messages.length < 2) continue // No reply if only 1 message

        // Check if at least one message in the thread is FROM us (our sender)
        let hasOurMessage = false
        for (const msg of messages) {
          const fromHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'from')
          const fromValue = fromHeader?.value || ''
          const fromEmail = extractEmail(fromValue)
          const fromDomain = fromEmail.split('@')[1] || ''
          if (SENDER_ADDRESSES.includes(fromEmail.toLowerCase()) ||
              SENDER_DOMAINS.includes(fromDomain.toLowerCase())) {
            hasOurMessage = true
            break
          }
        }

        if (!hasOurMessage) continue

        // Get the subject from the first message
        const firstMsg = messages[0]
        const subjectHeader = firstMsg.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'subject')
        const subject = subjectHeader?.value || '(No subject)'

        // Look at messages after the first one — these are potential replies
        for (let i = 1; i < messages.length; i++) {
          const msg = messages[i]
          const fromHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'from')
          const dateHeader = msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === 'date')
          const fromValue = fromHeader?.value || ''

          // Skip if this message is from one of our sender addresses/domains
          const fromEmail = extractEmail(fromValue)
          const fromDomain = fromEmail.split('@')[1] || ''
          const isOurMessage = SENDER_ADDRESSES.includes(fromEmail.toLowerCase()) ||
            SENDER_DOMAINS.includes(fromDomain.toLowerCase())

          if (isOurMessage) continue

          // Deduplicate: skip if we already logged this thread+email pair
          const dedupeKey = `${thread.id}::${fromEmail.toLowerCase()}`
          if (seenThreadEmails.has(dedupeKey)) continue

          // This is a reply from someone external
          const fromName = extractName(fromValue)
          const replyDate = dateHeader?.value || ''

          // Match to a contact
          const contact = contactsByEmail.get(fromEmail.toLowerCase())

          // Try to match to a campaign step by subject line
          let matchedStep: any = null
          let matchedEnrollment: any = null
          let matchedCampaignId: string | null = null
          let matchedCampaignName: string | null = null

          if (contact) {
            const steps = stepsByContactEmail.get(fromEmail.toLowerCase()) || []
            // Match by subject line (strip Re: prefix for comparison)
            const cleanSubject = subject.replace(/^(Re:\s*)+/i, '').toLowerCase().trim()
            for (const { step, enrollment } of steps) {
              const stepSubject = (step.subject || '').toLowerCase().trim()
              if (stepSubject && cleanSubject.includes(stepSubject)) {
                matchedStep = step
                matchedEnrollment = enrollment
                matchedCampaignId = enrollment.campaign_id
                matchedCampaignName = campaignNames[enrollment.campaign_id] || null
                break
              }
            }
            // If no subject match, take the most recent step sent to this contact
            if (!matchedStep && steps.length > 0) {
              const { step, enrollment } = steps[0] // already sorted desc by sent_at
              matchedStep = step
              matchedEnrollment = enrollment
              matchedCampaignId = enrollment.campaign_id
              matchedCampaignName = campaignNames[enrollment.campaign_id] || null
            }
          }

          newReplies.push({
            thread_id: thread.id,
            subject,
            reply_from_email: fromEmail,
            reply_from_name: fromName,
            reply_date: replyDate,
            snippet: msg.snippet || '',
            contact_id: contact?.id || null,
            contact_name: contact?.name || fromName,
            matched_step_id: matchedStep?.id || null,
            matched_enrollment_id: matchedEnrollment?.id || null,
            matched_campaign_id: matchedCampaignId,
            matched_campaign_name: matchedCampaignName,
          })

          // Mark as seen so we don't duplicate within this batch
          seenThreadEmails.add(dedupeKey)
        }
      } catch (e) {
        console.error(`Error processing thread ${thread.id}:`, e)
      }
    }

    // ─── Write results to database ──────────────────────────────────────────
    const flaggedContacts: Array<{ email: string; contact_id: string | null; name: string }> = []
    let repliesLogged = 0
    let stepsUpdated = 0
    let notificationsCreated = 0

    for (const reply of newReplies) {
      try {
        // 1. Insert into gmail_reply_log
        await supabase.from('gmail_reply_log').insert({
          contact_id: reply.contact_id,
          enrollment_id: reply.matched_enrollment_id,
          step_history_id: reply.matched_step_id,
          thread_id: reply.thread_id,
          reply_from_email: reply.reply_from_email,
          reply_from_name: reply.reply_from_name,
          subject: reply.subject,
          snippet: reply.snippet,
          reply_date: reply.reply_date ? new Date(reply.reply_date).toISOString() : new Date().toISOString(),
          campaign_id: reply.matched_campaign_id,
          campaign_name: reply.matched_campaign_name,
        })
        repliesLogged++

        // 2. Update campaign_step_history with replied_at
        if (reply.matched_step_id && !reply.matched_step_id) {
          // Already handled below
        }
        if (reply.matched_step_id) {
          const { error: stepErr } = await supabase
            .from('campaign_step_history')
            .update({
              replied_at: new Date().toISOString(),
              reply_detected: true,
            })
            .eq('id', reply.matched_step_id)

          if (!stepErr) stepsUpdated++
        }

        // 3. Increment reply_count on campaign_enrollments
        if (reply.matched_enrollment_id) {
          // Use RPC-style increment — fetch current, increment, update
          const { data: enrollment } = await supabase
            .from('campaign_enrollments')
            .select('reply_count')
            .eq('id', reply.matched_enrollment_id)
            .maybeSingle()

          if (enrollment) {
            await supabase
              .from('campaign_enrollments')
              .update({ reply_count: (enrollment.reply_count || 0) + 1 })
              .eq('id', reply.matched_enrollment_id)
          }
        }

        // 4. Update contact — tags, reply_count, last_reply_scan_at
        if (reply.contact_id) {
          const contact = contactsByEmail.get(reply.reply_from_email.toLowerCase())
          if (contact) {
            const currentTags = Array.isArray(contact.tags) ? contact.tags : []
            const updates: any = {
              last_reply_scan_at: new Date().toISOString(),
              reply_count: (contact.reply_count || 0) + 1,
              updated_at: new Date().toISOString(),
            }
            if (!currentTags.includes('replied')) {
              updates.tags = [...currentTags, 'replied']
            }
            await supabase
              .from('contacts')
              .update(updates)
              .eq('id', reply.contact_id)

            // Update local cache for subsequent iterations
            contact.reply_count = updates.reply_count
            if (updates.tags) contact.tags = updates.tags
          }

          flaggedContacts.push({
            email: reply.reply_from_email,
            contact_id: reply.contact_id,
            name: reply.contact_name,
          })
        } else {
          flaggedContacts.push({
            email: reply.reply_from_email,
            contact_id: null,
            name: reply.contact_name,
          })
        }

        // 5. Write to campaign_audit_log
        if (reply.matched_campaign_id) {
          await supabase.from('campaign_audit_log').insert({
            enrollment_id: reply.matched_enrollment_id,
            campaign_id: reply.matched_campaign_id,
            contact_id: reply.contact_id,
            contact_name: reply.contact_name,
            campaign_name: reply.matched_campaign_name,
            action: 'replied',
            detail: `Reply detected from ${reply.reply_from_email}: "${(reply.snippet || '').slice(0, 120)}"`,
          })
        }

        // 6. Create notification
        const notifTitle = reply.contact_name
          ? `${reply.contact_name} replied to your email`
          : `Reply from ${reply.reply_from_email}`
        const notifBody = reply.matched_campaign_name
          ? `Campaign: ${reply.matched_campaign_name} — Subject: ${reply.subject}\n"${(reply.snippet || '').slice(0, 200)}"`
          : `Subject: ${reply.subject}\n"${(reply.snippet || '').slice(0, 200)}"`

        await supabase.from('notifications').insert({
          type: 'campaign_reply',
          title: notifTitle,
          body: notifBody,
          link: reply.contact_id ? `/database?contact=${reply.contact_id}` : '/email/sent-history',
          source_table: 'gmail_reply_log',
          source_id: reply.thread_id,
        })
        notificationsCreated++

      } catch (e) {
        console.error(`Error processing reply from ${reply.reply_from_email}:`, e)
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        threads_checked: threads.length,
        replies_found: newReplies.length,
        replies_logged: repliesLogged,
        steps_updated: stepsUpdated,
        contacts_flagged: flaggedContacts.length,
        notifications_created: notificationsCreated,
        replies: newReplies.map(r => ({
          thread_id: r.thread_id,
          subject: r.subject,
          reply_from_email: r.reply_from_email,
          reply_from_name: r.reply_from_name,
          reply_date: r.reply_date,
          snippet: r.snippet,
          contact_name: r.contact_name,
          campaign_name: r.matched_campaign_name,
        })),
        flagged_contacts: flaggedContacts,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('gmail-reply-detect error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error', code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract email from "Name <email@domain.com>" format */
function extractEmail(fromStr: string): string {
  const match = fromStr.match(/<([^>]+)>/)
  if (match) return match[1].trim()
  // Maybe it's just an email address
  if (fromStr.includes('@')) return fromStr.trim()
  return ''
}

/** Extract display name from "Name <email@domain.com>" format */
function extractName(fromStr: string): string {
  const match = fromStr.match(/^"?([^"<]+)"?\s*</)
  if (match) return match[1].trim()
  return ''
}

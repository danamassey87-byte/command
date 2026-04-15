// ─────────────────────────────────────────────────────────────────────────────
// gmail-reply-detect — Scans Gmail for replies to campaign emails.
//
// Searches Gmail for replies to emails sent from dana@danamassey.com or Resend
// domains. Flags matching contacts in the contacts table with a 'replied' tag.
//
// Uses tokens from user_settings 'google_tokens'. Includes token refresh logic.
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

    // ─── Build Gmail search query ─────────────────────────────────────────────
    // Search for threads where we sent a message AND there's a reply from someone else
    const afterDate = new Date(Date.now() - days_back * 24 * 60 * 60 * 1000)
    const afterStr = `${afterDate.getFullYear()}/${String(afterDate.getMonth() + 1).padStart(2, '0')}/${String(afterDate.getDate()).padStart(2, '0')}`

    // Gmail query: find threads that have a reply (in:inbox) to messages from our sender addresses
    const fromQueries = SENDER_ADDRESSES.map(a => `from:${a}`).join(' OR ')
    const searchQuery = `in:inbox is:unread OR is:read after:${afterStr} (${fromQueries})`

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

    // ─── Process each thread to find replies ──────────────────────────────────
    const replies: Array<{
      thread_id: string
      subject: string
      reply_from_email: string
      reply_from_name: string
      reply_date: string
      snippet: string
    }> = []

    for (const thread of threads) {
      try {
        const threadResp = await fetch(`${GMAIL_API}/threads/${thread.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
          headers: authHeader,
        })

        if (!threadResp.ok) continue

        const threadData = await threadResp.json()
        const messages = threadData.messages || []

        if (messages.length < 2) continue // No reply if only 1 message

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

          // This is a reply from someone external
          const fromName = extractName(fromValue)
          const replyDate = dateHeader?.value || ''

          replies.push({
            thread_id: thread.id,
            subject,
            reply_from_email: fromEmail,
            reply_from_name: fromName,
            reply_date: replyDate,
            snippet: msg.snippet || '',
          })
        }
      } catch (e) {
        console.error(`Error processing thread ${thread.id}:`, e)
      }
    }

    // ─── Flag matching contacts ───────────────────────────────────────────────
    const flaggedContacts: Array<{ email: string; contact_id: string | null; name: string }> = []

    // Get unique reply emails
    const replyEmails = [...new Set(replies.map(r => r.reply_from_email.toLowerCase()).filter(Boolean))]

    if (replyEmails.length > 0) {
      // Load all contacts to match by email
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, email, tags')
        .is('deleted_at', null)

      const contactsByEmail = new Map<string, any>()
      for (const c of (contacts || [])) {
        if (c.email) {
          contactsByEmail.set(c.email.toLowerCase(), c)
        }
      }

      for (const replyEmail of replyEmails) {
        const contact = contactsByEmail.get(replyEmail)
        if (contact) {
          // Add 'replied' tag if not already present
          const currentTags = Array.isArray(contact.tags) ? contact.tags : []
          if (!currentTags.includes('replied')) {
            const updatedTags = [...currentTags, 'replied']
            await supabase
              .from('contacts')
              .update({ tags: updatedTags, updated_at: new Date().toISOString() })
              .eq('id', contact.id)

            flaggedContacts.push({ email: replyEmail, contact_id: contact.id, name: contact.name })
          } else {
            flaggedContacts.push({ email: replyEmail, contact_id: contact.id, name: contact.name })
          }
        } else {
          flaggedContacts.push({ email: replyEmail, contact_id: null, name: replies.find(r => r.reply_from_email.toLowerCase() === replyEmail)?.reply_from_name || '' })
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        threads_checked: threads.length,
        replies_found: replies.length,
        contacts_flagged: flaggedContacts.length,
        replies,
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

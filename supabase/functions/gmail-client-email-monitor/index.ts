// ─────────────────────────────────────────────────────────────────────────────
// gmail-client-email-monitor — Routes signed docs, lender updates, inspection
// reports, title/escrow emails, and other transaction-critical emails to the
// correct client Slack channel.
//
// Cron: every 10 minutes.
//
// Flow:
//   1. Search Gmail for transaction-related emails
//   2. Classify document type (signed_doc, lender, inspection, etc.)
//   3. Match email to client via address/name/sender
//   4. Post to the correct Slack channel
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import {
  getGmailAccessToken,
  searchGmail,
  fetchMessageContent,
  extractEmail,
  normalizeAddress,
} from '../_shared/gmail.ts'
import {
  findSlackChannel,
  postToSlackDeduped,
  formatSignedDocMessage,
} from '../_shared/slack.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

// Gmail search queries for transaction-related emails
const CLIENT_EMAIL_QUERIES = [
  // DocuSign / Dotloop / SkySlope signed documents
  'from:dse_na@docusign.net subject:"Completed" newer_than:1d',
  'from:noreply@dotloop.com subject:"signed" newer_than:1d',
  'from:noreply@skyslope.com subject:"signed" newer_than:1d',
  'from:noreply@authentisign.com subject:"signed" newer_than:1d',
  // Fully executed / countersigned docs
  'subject:"fully executed" newer_than:1d -from:me',
  'subject:"countersigned" newer_than:1d -from:me',
  'subject:"signed" (subject:"agreement" OR subject:"addendum" OR subject:"contract") newer_than:1d -from:me',
  // Title / Escrow
  'subject:"escrow" subject:"closing" newer_than:1d -from:me',
  'subject:"title commitment" newer_than:1d -from:me',
  'subject:"settlement statement" newer_than:1d -from:me',
  // Inspections
  'subject:"inspection report" newer_than:1d -from:me',
  'subject:"inspection results" newer_than:1d -from:me',
  // Appraisals
  'subject:"appraisal" newer_than:1d -from:me -subject:"marketing"',
  // Lender updates
  'subject:"clear to close" newer_than:1d -from:me',
  'subject:"conditional approval" newer_than:1d -from:me',
  '(subject:"loan approval" OR subject:"loan approved") newer_than:1d -from:me',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const slackToken = Deno.env.get('SLACK_BOT_TOKEN')
  if (!slackToken) {
    return json({ error: 'SLACK_BOT_TOKEN not configured' }, 503)
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || ''
  const results = { posted: 0, skipped: 0, unmatched: 0, errors: [] as string[] }

  try {
    const accessToken = await getGmailAccessToken(supabase)

    // Collect all messages, dedup
    const seenIds = new Set<string>()
    const allMessages: Array<{ id: string; threadId: string }> = []

    for (const query of CLIENT_EMAIL_QUERIES) {
      try {
        const msgs = await searchGmail(accessToken, query, 20)
        for (const msg of msgs) {
          if (!seenIds.has(msg.id)) {
            seenIds.add(msg.id)
            allMessages.push(msg)
          }
        }
      } catch (err: any) {
        results.errors.push(`Query error: ${err.message}`)
      }
    }

    for (const msg of allMessages) {
      try {
        // Dedup: already posted?
        const { data: existing } = await supabase
          .from('slack_message_log')
          .select('id')
          .eq('source_id', msg.id)
          .maybeSingle()
        if (existing) {
          results.skipped++
          continue
        }

        const fullMsg = await fetchMessageContent(accessToken, msg.id)
        const classification = classifyClientEmail(fullMsg.from, fullMsg.subject, fullMsg.body)

        if (!classification.isClientSpecific) {
          results.skipped++
          continue
        }

        // Match to client
        let clientMatch = await matchEmailToClient(supabase, fullMsg)

        // Claude fallback
        if (!clientMatch && anthropicKey) {
          clientMatch = await claudeMatchEmail(supabase, anthropicKey, fullMsg)
        }

        if (!clientMatch) {
          results.unmatched++
          continue
        }

        // Find Slack channel
        const channelId = clientMatch.listingId
          ? await findSlackChannel(supabase, { listingId: clientMatch.listingId, channelType: 'seller' })
          : await findSlackChannel(supabase, { contactId: clientMatch.contactId })

        if (!channelId) {
          results.unmatched++
          continue
        }

        // Post to Slack
        await postToSlackDeduped(supabase, slackToken, channelId, classification.docType, msg.id, {
          ...formatSignedDocMessage({
            subject: fullMsg.subject,
            from: fullMsg.from,
            snippet: fullMsg.body.substring(0, 500),
            receivedAt: fullMsg.internalDate,
            docType: classification.docType,
          }),
        })
        results.posted++
      } catch (err: any) {
        results.errors.push(`${msg.id}: ${err.message}`)
      }
    }

    return json({ ok: true, messages_checked: allMessages.length, ...results })
  } catch (err: any) {
    console.error('gmail-client-email-monitor error:', err)
    return json({ error: err.message || 'Internal error', ...results }, 500)
  }
})

// ─── Email Classification ───────────────────────────────────────────────────

function classifyClientEmail(
  from: string,
  subject: string,
  _body: string,
): { docType: string; isClientSpecific: boolean } {
  const subj = subject.toLowerCase()
  const sender = from.toLowerCase()

  // Signed documents (highest priority)
  if (
    sender.includes('docusign') ||
    sender.includes('dotloop') ||
    sender.includes('skyslope') ||
    sender.includes('authentisign')
  ) {
    return { docType: 'signed_doc', isClientSpecific: true }
  }
  if (/fully\s+executed|countersigned|all\s+parties.*signed/i.test(subj)) {
    return { docType: 'signed_doc', isClientSpecific: true }
  }

  // Inspection
  if (/inspection\s+(report|results|summary)/i.test(subj)) {
    return { docType: 'inspection', isClientSpecific: true }
  }

  // Appraisal
  if (/appraisal/i.test(subj) && !/marketing|ad/i.test(subj)) {
    return { docType: 'appraisal', isClientSpecific: true }
  }

  // Title / Escrow
  if (/title\s+commit|settlement\s+statement|escrow|closing\s+disclosure/i.test(subj)) {
    return { docType: 'title', isClientSpecific: true }
  }

  // Lender
  if (/clear\s+to\s+close|conditional\s+approval|loan.*approv|pre-?approval/i.test(subj)) {
    return { docType: 'lender', isClientSpecific: true }
  }

  // Disclosure
  if (/disclosure|spds|seller.*property/i.test(subj)) {
    return { docType: 'disclosure', isClientSpecific: true }
  }

  // Signed contract/agreement/addendum
  if (/signed/i.test(subj) && /agreement|addendum|contract/i.test(subj)) {
    return { docType: 'signed_doc', isClientSpecific: true }
  }

  return { docType: 'general', isClientSpecific: false }
}

// ─── Email → Client Matching ────────────────────────────────────────────────

interface ClientMatch {
  contactId: string
  listingId: string | null
  channelType: 'seller' | 'buyer'
}

async function matchEmailToClient(
  supabase: any,
  email: { from: string; subject: string; body: string },
): Promise<ClientMatch | null> {
  // Strategy 1: Extract property address
  const addressPatterns = [
    // "RE: 123 Main St, Gilbert, AZ 85234"
    /(?:re:\s*)?(\d+\s+[\w\s]+(?:st|ave|rd|dr|blvd|ln|ct|pl|way|cir|loop|trail)[\w\s,]*?\d{5})/i,
    // DocuSign: "Completed: Purchase Contract - 123 Main St"
    /completed:.*?[-–]\s*(.+?)(?:\s*[-–]|$)/i,
    // "Property: 123 Main St"
    /property[:\s]+(.+?)(?:\n|<br|$)/i,
  ]

  for (const pattern of addressPatterns) {
    const match = email.subject.match(pattern) || email.body.substring(0, 2000).match(pattern)
    if (match) {
      const searchTerm = normalizeAddress(match[1])

      // Match against listings via properties.address
      const { data: listings } = await supabase
        .from('listings')
        .select('id, contact_id, property:properties(address)')
        .in('status', ['signed', 'coming_soon', 'active', 'pending', 'contingent'])
        .limit(50)

      if (listings) {
        for (const listing of listings) {
          const addr = normalizeAddress((listing as any)?.property?.address || '')
          if (addr.includes(searchTerm) || searchTerm.includes(addr)) {
            return { contactId: listing.contact_id, listingId: listing.id, channelType: 'seller' }
          }
        }
      }
    }
  }

  // Strategy 2: Extract client name
  const namePatterns = [
    /completed:?\s*([\w]+\s+[\w]+)\s*[-–]/i,
    /buyer[:\s]+([\w]+\s+[\w]+)/i,
    /seller[:\s]+([\w]+\s+[\w]+)/i,
    /client[:\s]+([\w]+\s+[\w]+)/i,
  ]

  for (const pattern of namePatterns) {
    const match = email.subject.match(pattern) || email.body.substring(0, 2000).match(pattern)
    if (match) {
      const name = match[1].trim()
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, type')
        .ilike('name', `%${name}%`)
        .in('type', ['buyer', 'seller'])
        .limit(1)
        .maybeSingle()

      if (contact) {
        let listingId = null
        if (contact.type === 'seller') {
          const { data: listing } = await supabase
            .from('listings')
            .select('id')
            .eq('contact_id', contact.id)
            .in('status', ['signed', 'coming_soon', 'active', 'pending', 'contingent'])
            .limit(1)
            .maybeSingle()
          listingId = listing?.id
        }
        return {
          contactId: contact.id,
          listingId,
          channelType: contact.type as 'seller' | 'buyer',
        }
      }
    }
  }

  return null
}

/** Claude Haiku fallback for matching unrecognized emails */
async function claudeMatchEmail(
  supabase: any,
  anthropicKey: string,
  email: { from: string; subject: string; body: string },
): Promise<ClientMatch | null> {
  // Gather active client context for Claude
  const { data: activeClients } = await supabase
    .from('contacts')
    .select('id, name, type')
    .in('type', ['buyer', 'seller'])
    .is('deleted_at', null)
    .limit(50)

  const { data: activeListings } = await supabase
    .from('listings')
    .select('id, contact_id, property:properties(address)')
    .in('status', ['signed', 'coming_soon', 'active', 'pending', 'contingent'])
    .limit(50)

  const clientList = (activeClients || []).map((c: any) => `${c.type}: ${c.name} (${c.id})`).join('\n')
  const listingList = (activeListings || [])
    .map((l: any) => `${(l as any)?.property?.address || 'Unknown'} (listing:${l.id}, contact:${l.contact_id})`)
    .join('\n')

  try {
    const resp = await fetch(ANTHROPIC_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Match this email to one of my clients or properties. Return JSON only.

Active clients:
${clientList || 'None'}

Active listings:
${listingList || 'None'}

Email from: ${email.from}
Subject: ${email.subject}
Body (first 500 chars): ${email.body.substring(0, 500)}

Return: {"contactId":"<exact id from list or null>", "listingId":"<exact listing id or null>", "channelType":"<seller or buyer>"}
If no confident match, return: {"contactId":null, "listingId":null, "channelType":null}`,
          },
        ],
      }),
    })

    const result = await resp.json()
    const parsed = JSON.parse(result.content[0].text)

    if (parsed.contactId) {
      return {
        contactId: parsed.contactId,
        listingId: parsed.listingId || null,
        channelType: parsed.channelType || 'seller',
      }
    }
  } catch {
    // Silent fail — this is a best-effort fallback
  }

  return null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

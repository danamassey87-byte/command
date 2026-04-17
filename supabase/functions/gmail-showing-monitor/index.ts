// ─────────────────────────────────────────────────────────────────────────────
// gmail-showing-monitor — Polls Gmail for showing requests, feedback, and
// cancellations from ShowingTime, BrokerBay, and other platforms.
//
// Cron: every 15 min during business hours, every hour overnight.
//
// Flow:
//   1. Search Gmail for showing-related emails
//   2. Classify each as request / feedback / cancellation
//   3. Parse structured data from email body
//   4. Store in showing_requests / showing_feedback tables
//   5. Post to appropriate Slack channel
//   6. Run sentiment analysis on feedback (via Claude Haiku)
//   7. Trigger negative feedback alerts
//   8. Refresh listing stats
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import {
  getGmailAccessToken,
  searchGmail,
  fetchMessageContent,
  stripHtml,
  extractEmail,
  normalizeAddress,
  parseFlexibleDate,
  type FullMessage,
} from '../_shared/gmail.ts'
import {
  ensureSlackChannel,
  findSlackChannel,
  postToSlackDeduped,
  formatShowingRequestMessage,
  formatCancellationMessage,
  formatFeedbackMessage,
} from '../_shared/slack.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

// Gmail search queries for showing emails
const SHOWING_QUERIES = [
  'from:noreply@showingtime.com subject:"Showing" newer_than:1d',
  'from:notifications@showingtime.com subject:"Showing" newer_than:1d',
  'from:notifications@brokerbay.com subject:"Showing" newer_than:1d',
  'from:noreply@brokerbay.com subject:"showing" newer_than:1d',
  'from:noreply@cssshowing.com subject:"Showing" newer_than:1d',
  'subject:"Showing Feedback" newer_than:1d -from:me',
  'subject:"showing request" newer_than:1d -from:me',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const slackToken = Deno.env.get('SLACK_BOT_TOKEN') || ''
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') || ''

  const results = { processed: 0, skipped: 0, errors: [] as string[] }

  try {
    const accessToken = await getGmailAccessToken(supabase)

    // Collect all messages from all queries, dedup by message ID
    const seenIds = new Set<string>()
    const allMessages: Array<{ id: string; threadId: string }> = []

    for (const query of SHOWING_QUERIES) {
      try {
        const msgs = await searchGmail(accessToken, query, 30)
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
        // Dedup: check if already processed (in either table)
        const { data: existReq } = await supabase
          .from('showing_requests')
          .select('id')
          .eq('source_email_id', msg.id)
          .maybeSingle()
        const { data: existFb } = await supabase
          .from('showing_feedback')
          .select('id')
          .eq('source_email_id', msg.id)
          .maybeSingle()

        if (existReq || existFb) {
          results.skipped++
          continue
        }

        const fullMsg = await fetchMessageContent(accessToken, msg.id)
        const classification = classifyEmail(fullMsg.from, fullMsg.subject, fullMsg.body)

        if (classification === 'request') {
          await processShowingRequest(supabase, slackToken, fullMsg)
          results.processed++
        } else if (classification === 'feedback') {
          await processShowingFeedback(supabase, slackToken, anthropicKey, fullMsg)
          results.processed++
        } else if (classification === 'cancellation') {
          await processShowingCancellation(supabase, slackToken, fullMsg)
          results.processed++
        } else {
          results.skipped++
        }
      } catch (err: any) {
        results.errors.push(`${msg.id}: ${err.message}`)
      }
    }

    return json({ ok: true, messages_checked: allMessages.length, ...results })
  } catch (err: any) {
    console.error('gmail-showing-monitor error:', err)
    return json({ error: err.message || 'Internal error', ...results }, 500)
  }
})

// ─── Email Classification ───────────────────────────────────────────────────

function classifyEmail(from: string, subject: string, body: string): string {
  const subj = subject.toLowerCase()

  if (/cancel/i.test(subj)) return 'cancellation'
  if (/feedback|review|survey|response\s+received/i.test(subj)) return 'feedback'
  if (/showing\s+(request|confirm|schedul|new|approved)/i.test(subj)) return 'request'

  // Body-level fallback
  if (/rating|what did.*like|price opinion|buyer interest/i.test(body)) return 'feedback'
  if (/request.*showing|schedule.*tour|appointment.*request/i.test(body)) return 'request'

  return 'unknown'
}

// ─── Platform Detection ─────────────────────────────────────────────────────

function detectPlatform(fromEmail: string, subject: string): string {
  const email = fromEmail.toLowerCase()
  if (email.includes('showingtime')) return 'showingtime'
  if (email.includes('brokerbay')) return 'brokerbay'
  if (email.includes('cssshowing')) return 'css'
  if (/showingtime/i.test(subject)) return 'showingtime'
  if (/brokerbay/i.test(subject)) return 'brokerbay'
  return 'unknown'
}

// ─── Showing Request Processing ─────────────────────────────────────────────

interface ParsedShowing {
  propertyAddress: string | null
  mlsNumber: string | null
  agentName: string | null
  agentEmail: string | null
  agentPhone: string | null
  agentBrokerage: string | null
  requestedDate: string | null
  requestedTime: string | null
}

function parseShowingBody(body: string): ParsedShowing {
  const text = stripHtml(body)

  const get = (patterns: RegExp[]): string | null => {
    for (const p of patterns) {
      const m = text.match(p)
      if (m) return m[1].trim()
    }
    return null
  }

  return {
    propertyAddress: get([
      /Property[:\s]+(.+?)(?:\n|$)/i,
      /Address[:\s]+(.+?)(?:\n|$)/i,
      /Listing[:\s]+(.+?)(?:\n|$)/i,
    ]),
    mlsNumber: get([/MLS\s*#[:\s]*(\d+)/i]),
    agentName: get([
      /(?:Showing\s+)?Agent[:\s]+(.+?)(?:\n|$)/i,
      /(?:Buyer(?:'s)?\s+)?Agent[:\s]+(.+?)(?:\n|$)/i,
      /Requested\s+by[:\s]+(.+?)(?:\n|$)/i,
    ]),
    agentEmail: get([/(?:Agent\s+)?Email[:\s]+([\w.+-]+@[\w.-]+)/i, /([\w.+-]+@[\w.-]+)/]),
    agentPhone: get([/(?:Agent\s+)?Phone[:\s]+([\d\s()+-]+)/i]),
    agentBrokerage: get([/(?:Office|Brokerage|Company)[:\s]+(.+?)(?:\n|$)/i]),
    requestedDate: get([/Date[:\s]+(.+?)(?:\n|$)/i]),
    requestedTime: get([/Time[:\s]+(\d{1,2}[:.]\d{0,2}\s*(?:AM|PM)?)/i]),
  }
}

/** Attempt Claude Haiku fallback for unparseable emails */
async function claudeFallbackParse(
  anthropicKey: string,
  rawBody: string,
  emailType: 'request' | 'feedback',
): Promise<any> {
  if (!anthropicKey) return null

  const prompt =
    emailType === 'request'
      ? `Extract showing request data from this email. Return JSON only, no other text:
{"propertyAddress":"","mlsNumber":"","agentName":"","agentEmail":"","agentPhone":"","agentBrokerage":"","requestedDate":"YYYY-MM-DD","requestedTime":"HH:MM"}
Use null for any field you cannot find.

Email: "${rawBody.substring(0, 2000)}"`
      : `Extract showing feedback data from this email. Return JSON only, no other text:
{"propertyAddress":"","mlsNumber":"","agentName":"","agentEmail":"","feedbackText":"","overallRating":null,"priceOpinion":"","buyerInterest":"","liked":"","disliked":""}
Use null for any field you cannot find.

Email: "${rawBody.substring(0, 2000)}"`

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
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const result = await resp.json()
    return JSON.parse(result.content[0].text)
  } catch {
    return null
  }
}

/** Resolve a listing_id from address or MLS number */
async function resolveListingId(
  supabase: any,
  address: string | null,
  mlsNumber: string | null,
): Promise<string | null> {
  if (mlsNumber) {
    const { data } = await supabase
      .from('listings')
      .select('id')
      .eq('mls_number', mlsNumber)
      .limit(1)
      .maybeSingle()
    if (data) return data.id
  }

  if (address) {
    const normalized = normalizeAddress(address)
    // Join with properties to match on address
    const { data } = await supabase
      .from('listings')
      .select('id, property:properties(address)')
      .in('status', ['signed', 'coming_soon', 'active', 'pending', 'contingent'])
      .limit(50)

    if (data) {
      for (const listing of data) {
        const propAddr = (listing as any)?.property?.address || ''
        if (normalizeAddress(propAddr).includes(normalized) || normalized.includes(normalizeAddress(propAddr))) {
          return listing.id
        }
      }
    }
  }

  return null
}

async function processShowingRequest(supabase: any, slackToken: string, msg: FullMessage) {
  const platform = detectPlatform(msg.from, msg.subject)
  let parsed = parseShowingBody(msg.body)

  // If key fields missing, try extracting from subject
  if (!parsed.propertyAddress) {
    const subjMatch = msg.subject.match(
      /(?:showing\s+(?:request|confirmed|scheduled)\s+(?:for\s+)?)?(.+?)(?:\s*\(MLS[#\s]*(\d+)\))?$/i,
    )
    if (subjMatch) {
      parsed.propertyAddress = subjMatch[1].trim()
      if (subjMatch[2]) parsed.mlsNumber = subjMatch[2]
    }
  }

  // Claude fallback if still no address
  if (!parsed.propertyAddress) {
    const fallback = await claudeFallbackParse(
      Deno.env.get('ANTHROPIC_API_KEY') || '',
      msg.body,
      'request',
    )
    if (fallback) {
      parsed = { ...parsed, ...fallback }
    }
  }

  const listingId = await resolveListingId(supabase, parsed.propertyAddress, parsed.mlsNumber)

  const requestedDate = parsed.requestedDate
    ? parseFlexibleDate(parsed.requestedDate)
    : new Date().toISOString().split('T')[0]

  const { data: showing } = await supabase
    .from('showing_requests')
    .insert({
      listing_id: listingId,
      property_address: parsed.propertyAddress || 'UNPARSED — manual review',
      mls_number: parsed.mlsNumber,
      agent_name: parsed.agentName,
      agent_email: parsed.agentEmail,
      agent_phone: parsed.agentPhone,
      agent_brokerage: parsed.agentBrokerage,
      requested_date: requestedDate,
      requested_time: parsed.requestedTime,
      source_platform: platform,
      source_email_id: msg.id,
      source_thread_id: msg.threadId,
      raw_email_body: msg.body.substring(0, 10000),
      status: 'confirmed',
      feedback_status: 'awaiting',
    })
    .select()
    .single()

  // Refresh listing stats
  if (listingId) {
    await supabase.rpc('refresh_listing_showing_stats', { p_listing_id: listingId })
  }

  // Post to Slack
  if (slackToken && listingId) {
    const channelId = await findSlackChannel(supabase, { listingId, channelType: 'seller' })
    if (channelId && showing) {
      await postToSlackDeduped(
        supabase,
        slackToken,
        channelId,
        'showing_request',
        showing.id,
        formatShowingRequestMessage(showing),
      )
    }
  }

  // Create notification
  await supabase.from('notifications').insert({
    type: 'showing_request',
    title: `New showing: ${parsed.propertyAddress || 'Unknown'}`,
    body: `${parsed.agentName || 'Unknown agent'} requested ${requestedDate}${parsed.requestedTime ? ' at ' + parsed.requestedTime : ''}`,
    link: listingId ? `/crm/sellers?listing=${listingId}` : '/crm/sellers',
    source_table: 'showing_requests',
    source_id: showing?.id,
  })

  return showing
}

// ─── Feedback Processing ────────────────────────────────────────────────────

interface ParsedFeedback {
  propertyAddress: string | null
  mlsNumber: string | null
  agentName: string | null
  agentEmail: string | null
  feedbackText: string
  feedbackType: 'structured' | 'freeform' | 'rating_only'
  overallRating: number | null
  priceOpinion: string | null
  buyerInterest: string | null
  wouldShowAgain: boolean | null
  liked: string | null
  disliked: string | null
  additionalComments: string | null
}

function parseStructuredFeedback(body: string): ParsedFeedback {
  const text = stripHtml(body)

  const ratingMatch = text.match(/(?:Overall\s+)?Rating[:\s]*(\d)\s*(?:\/\s*5|out\s+of\s+5|stars?)?/i)
  const priceMatch = text.match(
    /Price[:\s]*(too\s+high|just\s+right|fair|too\s+low|over\s*priced|under\s*priced)/i,
  )
  const interestMatch = text.match(
    /(?:Buyer\s+)?Interest[:\s]*(very\s+interested|interested|somewhat|not\s+interested|no\s+interest|will\s+not)/i,
  )
  const showAgainMatch = text.match(/(?:Would\s+)?Show\s+Again[:\s]*(yes|no|maybe|possibly)/i)
  const likedMatch = text.match(
    /(?:What\s+(?:did\s+)?(?:the\s+)?buyer\s+)?(?:like|liked|pros?)[:\s]+(.+?)(?=\n\n|\nWhat|\nDislike|\nAdditional|$)/is,
  )
  const dislikedMatch = text.match(
    /(?:What\s+(?:did\s+)?(?:the\s+)?buyer\s+)?(?:dislike|didn't\s+like|concerns?|cons?)[:\s]+(.+?)(?=\n\n|\nWhat|\nLike|\nAdditional|$)/is,
  )
  const commentsMatch = text.match(
    /(?:Additional\s+)?(?:Comments?|Notes?|Remarks?)[:\s]+(.+?)(?=\n\n|$)/is,
  )

  const hasStructured = ratingMatch || priceMatch || interestMatch

  return {
    propertyAddress: text.match(/Property[:\s]+(.+?)(?:\n|$)/i)?.[1]?.trim() ?? null,
    mlsNumber: text.match(/MLS[#:\s]+(\d+)/i)?.[1] ?? null,
    agentName:
      text.match(/(?:From|Agent|Submitted\s+by)[:\s]+(.+?)(?:\n|$)/i)?.[1]?.trim() ?? null,
    agentEmail: text.match(/([\w.+-]+@[\w.-]+)/)?.[1] ?? null,
    feedbackText: text,
    feedbackType: hasStructured ? 'structured' : 'freeform',
    overallRating: ratingMatch ? parseInt(ratingMatch[1]) : null,
    priceOpinion: normalizePriceOpinion(priceMatch?.[1]),
    buyerInterest: normalizeInterest(interestMatch?.[1]),
    wouldShowAgain: showAgainMatch ? /yes|possibly|maybe/i.test(showAgainMatch[1]) : null,
    liked: likedMatch?.[1]?.trim() ?? null,
    disliked: dislikedMatch?.[1]?.trim() ?? null,
    additionalComments: commentsMatch?.[1]?.trim() ?? null,
  }
}

function normalizePriceOpinion(raw: string | undefined): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase().replace(/\s+/g, '_')
  if (/too_high|over_?priced/.test(lower)) return 'too_high'
  if (/just_right|fair/.test(lower)) return 'fair'
  if (/too_low|under_?priced/.test(lower)) return 'too_low'
  return 'no_opinion'
}

function normalizeInterest(raw: string | undefined): string | null {
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (/very/.test(lower)) return 'very_interested'
  if (/not|no|will\s*not/.test(lower)) return 'not_interested'
  if (/interest|somewhat/.test(lower)) return 'interested'
  return 'no_response'
}

/** Match feedback to a showing request */
async function matchFeedbackToShowing(
  supabase: any,
  parsed: ParsedFeedback,
  threadId: string | null,
): Promise<string | null> {
  // Strategy 1: Thread ID match
  if (threadId) {
    const { data } = await supabase
      .from('showing_requests')
      .select('id')
      .eq('source_thread_id', threadId)
      .maybeSingle()
    if (data) return data.id
  }

  // Strategy 2: Address + Agent + Date window
  if (parsed.propertyAddress && parsed.agentEmail) {
    const normalized = normalizeAddress(parsed.propertyAddress)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data } = await supabase
      .from('showing_requests')
      .select('id')
      .ilike('property_address', `%${normalized}%`)
      .ilike('agent_email', parsed.agentEmail)
      .gte('requested_date', sevenDaysAgo)
      .order('requested_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return data.id
  }

  // Strategy 3: MLS + Agent
  if (parsed.mlsNumber && parsed.agentEmail) {
    const { data } = await supabase
      .from('showing_requests')
      .select('id')
      .eq('mls_number', parsed.mlsNumber)
      .ilike('agent_email', parsed.agentEmail)
      .order('requested_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return data.id
  }

  // Strategy 4: Address-only + awaiting feedback
  if (parsed.propertyAddress) {
    const normalized = normalizeAddress(parsed.propertyAddress)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
    const { data } = await supabase
      .from('showing_requests')
      .select('id')
      .ilike('property_address', `%${normalized}%`)
      .eq('feedback_status', 'awaiting')
      .gte('requested_date', fourteenDaysAgo)
      .order('requested_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) return data.id
  }

  return null
}

/** Run sentiment analysis via Claude Haiku */
async function analyzeSentiment(
  anthropicKey: string,
  feedbackText: string,
): Promise<{ score: number; label: string; summary: string }> {
  if (!anthropicKey) {
    return { score: 0, label: 'neutral', summary: 'Analysis unavailable — no API key' }
  }

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
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Analyze this real estate showing feedback. Return JSON only, no other text.

Feedback: "${feedbackText.substring(0, 1500)}"

Return: {"score": <float -1.0 to 1.0>, "label": "<positive|neutral|negative|mixed>", "summary": "<one sentence summary of buyer sentiment and key concerns>"}`,
          },
        ],
      }),
    })

    const result = await resp.json()
    return JSON.parse(result.content[0].text)
  } catch {
    return { score: 0, label: 'neutral', summary: 'Unable to analyze sentiment' }
  }
}

async function processShowingFeedback(
  supabase: any,
  slackToken: string,
  anthropicKey: string,
  msg: FullMessage,
) {
  let parsed = parseStructuredFeedback(msg.body)

  // Claude fallback if no structured fields found
  if (!parsed.propertyAddress && !parsed.agentName) {
    const fallback = await claudeFallbackParse(anthropicKey, msg.body, 'feedback')
    if (fallback) {
      parsed = {
        ...parsed,
        propertyAddress: fallback.propertyAddress || parsed.propertyAddress,
        mlsNumber: fallback.mlsNumber || parsed.mlsNumber,
        agentName: fallback.agentName || parsed.agentName,
        agentEmail: fallback.agentEmail || parsed.agentEmail,
        overallRating: fallback.overallRating || parsed.overallRating,
        liked: fallback.liked || parsed.liked,
        disliked: fallback.disliked || parsed.disliked,
      }
    }
  }

  const showingId = await matchFeedbackToShowing(supabase, parsed, msg.threadId)

  // Get listing_id from matched showing
  let listingId: string | null = null
  if (showingId) {
    const { data: showing } = await supabase
      .from('showing_requests')
      .select('listing_id')
      .eq('id', showingId)
      .single()
    listingId = showing?.listing_id
  }

  // Sentiment analysis
  const sentiment = await analyzeSentiment(anthropicKey, parsed.feedbackText)

  // Insert feedback
  const { data: feedback } = await supabase
    .from('showing_feedback')
    .insert({
      showing_id: showingId,
      listing_id: listingId,
      agent_name: parsed.agentName,
      agent_email: parsed.agentEmail,
      feedback_text: parsed.feedbackText.substring(0, 10000),
      feedback_type: parsed.feedbackType,
      overall_rating: parsed.overallRating,
      price_opinion: parsed.priceOpinion,
      buyer_interest: parsed.buyerInterest,
      would_show_again: parsed.wouldShowAgain,
      liked: parsed.liked,
      disliked: parsed.disliked,
      additional_comments: parsed.additionalComments,
      sentiment_score: sentiment.score,
      sentiment_label: sentiment.label,
      sentiment_summary: sentiment.summary,
      source_email_id: msg.id,
      source_thread_id: msg.threadId,
      raw_email_body: msg.body.substring(0, 10000),
    })
    .select()
    .single()

  // Update showing request
  if (showingId && feedback) {
    await supabase
      .from('showing_requests')
      .update({ feedback_id: feedback.id, feedback_status: 'received' })
      .eq('id', showingId)
  }

  // Refresh listing stats
  if (listingId) {
    await supabase.rpc('refresh_listing_showing_stats', { p_listing_id: listingId })
  }

  // Post to Slack
  if (slackToken && listingId && feedback) {
    const channelId = await findSlackChannel(supabase, { listingId, channelType: 'seller' })
    if (channelId) {
      await postToSlackDeduped(
        supabase,
        slackToken,
        channelId,
        'feedback',
        feedback.id,
        formatFeedbackMessage(feedback),
      )
    }
  }

  // Negative feedback alert (email to Dana)
  if (
    sentiment.label === 'negative' ||
    (parsed.overallRating !== null && parsed.overallRating <= 2)
  ) {
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: 'Antigravity Alerts <dana@mail.danamassey.com>',
          to: 'dana@danamassey.com',
          subject: `Negative Feedback: ${parsed.propertyAddress || 'Unknown Property'}`,
          html: `<h3>Negative Showing Feedback Received</h3>
<p><strong>Property:</strong> ${parsed.propertyAddress || 'Unknown'}</p>
<p><strong>Agent:</strong> ${parsed.agentName || 'Unknown'} (${parsed.agentEmail || ''})</p>
<p><strong>Rating:</strong> ${parsed.overallRating || 'N/A'}/5</p>
<p><strong>Price Opinion:</strong> ${parsed.priceOpinion?.replace('_', ' ') || 'N/A'}</p>
<p><strong>Buyer Interest:</strong> ${parsed.buyerInterest?.replace('_', ' ') || 'N/A'}</p>
<hr/>
<p><strong>Feedback:</strong></p>
<blockquote>${parsed.feedbackText?.substring(0, 500)}</blockquote>
<p><strong>AI Summary:</strong> ${sentiment.summary}</p>`,
        }),
      })
    }
  }

  // Create notification
  await supabase.from('notifications').insert({
    type: 'showing_feedback',
    title: `Feedback: ${parsed.propertyAddress || 'Unknown'}`,
    body: `${parsed.agentName || 'Agent'}: ${sentiment.summary || parsed.feedbackText?.substring(0, 120)}`,
    link: listingId ? `/crm/sellers?listing=${listingId}` : '/crm/sellers',
    source_table: 'showing_feedback',
    source_id: feedback?.id,
  })

  return feedback
}

// ─── Cancellation Processing ────────────────────────────────────────────────

async function processShowingCancellation(supabase: any, slackToken: string, msg: FullMessage) {
  // Try thread_id match
  if (msg.threadId) {
    const { data } = await supabase
      .from('showing_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('source_thread_id', msg.threadId)
      .eq('status', 'confirmed')
      .select()

    if (data?.length) {
      for (const showing of data) {
        if (slackToken && showing.listing_id) {
          const channelId = await findSlackChannel(supabase, {
            listingId: showing.listing_id,
            channelType: 'seller',
          })
          if (channelId) {
            await postToSlackDeduped(
              supabase,
              slackToken,
              channelId,
              'showing_cancel',
              showing.id,
              formatCancellationMessage(showing),
            )
          }
        }
      }
      return
    }
  }

  // Fallback: parse address and match
  const parsed = parseShowingBody(msg.body)
  if (parsed.propertyAddress) {
    const normalized = normalizeAddress(parsed.propertyAddress)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('showing_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .ilike('property_address', `%${normalized}%`)
      .eq('status', 'confirmed')
      .gte('requested_date', today)
      .select()

    if (data?.length) {
      for (const showing of data) {
        if (slackToken && showing.listing_id) {
          const channelId = await findSlackChannel(supabase, {
            listingId: showing.listing_id,
            channelType: 'seller',
          })
          if (channelId) {
            await postToSlackDeduped(
              supabase,
              slackToken,
              channelId,
              'showing_cancel',
              showing.id,
              formatCancellationMessage(showing),
            )
          }
        }
      }
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

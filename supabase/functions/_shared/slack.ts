// ─────────────────────────────────────────────────────────────────────────────
// Slack Utilities — shared module for all edge functions
//
// Channel naming conventions:
//   Sellers: seller_firstname-lastname_street-address
//   Buyers:  buyer_clientname  (keeps "and" between names)
//
// Usage:
//   import { ensureSlackChannel, postToSlackDeduped, formatShowingRequest, ... } from '../_shared/slack.ts'
// ─────────────────────────────────────────────────────────────────────────────

const SLACK_API = 'https://slack.com/api'

// ─── Channel Naming ─────────────────────────────────────────────────────────

/** Sanitize a string for Slack channel name (lowercase, alphanumeric + hyphens) */
export function sanitizeForSlack(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+and\s+/g, '-and-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/** Build seller channel name: seller_firstname-lastname_street-address */
export function buildSellerChannelName(contactName: string, propertyAddress: string): string {
  const name = sanitizeForSlack(contactName)
  const streetOnly = propertyAddress.split(',')[0].trim()
  const address = sanitizeForSlack(streetOnly)
  return `seller_${name}_${address}`.substring(0, 80)
}

/** Build buyer channel name: buyer_clientname */
export function buildBuyerChannelName(contactName: string): string {
  const name = sanitizeForSlack(contactName)
  return `buyer_${name}`.substring(0, 80)
}

// ─── Core Slack API Calls ───────────────────────────────────────────────────

interface SlackMessage {
  text: string
  blocks?: any[]
  thread_ts?: string
  unfurl_links?: boolean
}

/** Post a message to a Slack channel. Returns message_ts or null on failure. */
export async function postToSlack(
  slackToken: string,
  channelId: string,
  message: SlackMessage,
): Promise<string | null> {
  const resp = await fetch(`${SLACK_API}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${slackToken}`,
    },
    body: JSON.stringify({
      channel: channelId,
      text: message.text,
      blocks: message.blocks,
      thread_ts: message.thread_ts,
      unfurl_links: message.unfurl_links ?? false,
    }),
  })

  const data = await resp.json()
  if (!data.ok) {
    console.error(`Slack post failed: ${data.error}`)

    // If channel is archived, try to unarchive and retry once
    if (data.error === 'is_archived') {
      await fetch(`${SLACK_API}/conversations.unarchive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
        body: JSON.stringify({ channel: channelId }),
      })
      const retry = await fetch(`${SLACK_API}/chat.postMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
        body: JSON.stringify({ channel: channelId, text: message.text, blocks: message.blocks }),
      })
      const retryData = await retry.json()
      if (retryData.ok) return retryData.ts
    }

    return null
  }
  return data.ts
}

/** Post with deduplication — won't double-post for the same source event */
export async function postToSlackDeduped(
  supabase: any,
  slackToken: string,
  channelId: string,
  messageType: string,
  sourceId: string,
  message: SlackMessage,
): Promise<void> {
  const { data: existing } = await supabase
    .from('slack_message_log')
    .select('id')
    .eq('slack_channel_id', channelId)
    .eq('message_type', messageType)
    .eq('source_id', sourceId)
    .maybeSingle()

  if (existing) return

  const messageTs = await postToSlack(slackToken, channelId, message)

  if (messageTs) {
    await supabase.from('slack_message_log').insert({
      slack_channel_id: channelId,
      message_type: messageType,
      source_id: sourceId,
      message_ts: messageTs,
    })
  }
}

// ─── Channel Management ─────────────────────────────────────────────────────

export interface SlackChannelResult {
  slackChannelId: string
  channelName: string
  isNew: boolean
}

/**
 * Find or create a Slack channel for a contact.
 * Sellers get one channel per listing, buyers get one channel per contact.
 */
export async function ensureSlackChannel(
  supabase: any,
  slackToken: string,
  params: {
    contactId: string
    contactName: string
    contactType: 'seller' | 'buyer'
    listingId?: string
    propertyAddress?: string
  },
): Promise<SlackChannelResult> {
  // Check if channel already exists
  let query = supabase
    .from('slack_channels')
    .select('slack_channel_id, channel_name')
    .eq('contact_id', params.contactId)
    .eq('channel_type', params.contactType)
    .eq('is_archived', false)

  if (params.contactType === 'seller' && params.listingId) {
    query = query.eq('listing_id', params.listingId)
  }

  const { data: existing } = await query.limit(1).maybeSingle()

  if (existing) {
    return {
      slackChannelId: existing.slack_channel_id,
      channelName: existing.channel_name,
      isNew: false,
    }
  }

  // Build channel name
  const channelName =
    params.contactType === 'seller'
      ? buildSellerChannelName(params.contactName, params.propertyAddress || 'unknown')
      : buildBuyerChannelName(params.contactName)

  // Create in Slack
  let slackChannelId: string
  let finalName = channelName

  const createResp = await fetch(`${SLACK_API}/conversations.create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
    body: JSON.stringify({ name: channelName, is_private: false }),
  })
  const createData = await createResp.json()

  if (createData.ok) {
    slackChannelId = createData.channel.id
    finalName = createData.channel.name
  } else if (createData.error === 'name_taken') {
    // Append short suffix and retry
    const suffix = Date.now().toString(36).slice(-4)
    const retryName = `${channelName}-${suffix}`.substring(0, 80)
    const retryResp = await fetch(`${SLACK_API}/conversations.create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
      body: JSON.stringify({ name: retryName, is_private: false }),
    })
    const retryData = await retryResp.json()
    if (!retryData.ok) throw new Error(`Slack channel creation failed: ${retryData.error}`)
    slackChannelId = retryData.channel.id
    finalName = retryData.channel.name
  } else {
    throw new Error(`Slack channel creation failed: ${createData.error}`)
  }

  // Set channel topic
  const topic =
    params.contactType === 'seller'
      ? `Seller: ${params.contactName} | ${params.propertyAddress || 'TBD'}`
      : `Buyer: ${params.contactName}`

  await fetch(`${SLACK_API}/conversations.setTopic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
    body: JSON.stringify({ channel: slackChannelId, topic }),
  })

  // Post welcome message
  await postToSlack(slackToken, slackChannelId, {
    text:
      params.contactType === 'seller'
        ? `Channel created for *${params.contactName}* — ${params.propertyAddress || 'TBD'}\nShowing requests, feedback, signed docs, and listing updates will post here.`
        : `Channel created for *${params.contactName}*\nPipeline updates, showing activity, signed docs, and key emails will post here.`,
  })

  // Store in database
  await supabase.from('slack_channels').insert({
    contact_id: params.contactId,
    listing_id: params.listingId || null,
    slack_channel_id: slackChannelId,
    channel_name: finalName,
    channel_type: params.contactType,
  })

  return { slackChannelId, channelName: finalName, isNew: true }
}

/** Look up the Slack channel for a listing (seller) or contact (buyer) */
export async function findSlackChannel(
  supabase: any,
  opts: { listingId?: string; contactId?: string; channelType?: 'seller' | 'buyer' },
): Promise<string | null> {
  let query = supabase
    .from('slack_channels')
    .select('slack_channel_id')
    .eq('is_archived', false)

  if (opts.listingId) query = query.eq('listing_id', opts.listingId)
  if (opts.contactId) query = query.eq('contact_id', opts.contactId)
  if (opts.channelType) query = query.eq('channel_type', opts.channelType)

  const { data } = await query.limit(1).maybeSingle()
  return data?.slack_channel_id || null
}

// ─── Message Formatters ─────────────────────────────────────────────────────

function formatTime12h(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

/** Format a showing request for Slack */
export function formatShowingRequestMessage(showing: any): SlackMessage {
  const dateStr = formatDate(showing.requested_date)
  const timeStr = showing.requested_time ? ` at ${formatTime12h(showing.requested_time)}` : ''

  return {
    text: `New showing request: ${dateStr}${timeStr} — ${showing.agent_name || 'Unknown agent'}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'New Showing Request', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Date:*\n${dateStr}${timeStr}` },
          { type: 'mrkdwn', text: `*Agent:*\n${showing.agent_name || 'Unknown'}` },
          { type: 'mrkdwn', text: `*Brokerage:*\n${showing.agent_brokerage || 'N/A'}` },
          {
            type: 'mrkdwn',
            text: `*Contact:*\n${showing.agent_email || ''}${showing.agent_phone ? '\n' + showing.agent_phone : ''}`,
          },
        ],
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Via ${showing.source_platform} • Received ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' })}`,
          },
        ],
      },
    ],
  }
}

/** Format a cancellation for Slack */
export function formatCancellationMessage(showing: any): SlackMessage {
  const dateStr = formatDateShort(showing.requested_date)
  return {
    text: `Showing cancelled: ${dateStr} — ${showing.agent_name || 'Unknown agent'}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Showing Cancelled*\n${dateStr}${showing.requested_time ? ` at ${formatTime12h(showing.requested_time)}` : ''}\nAgent: ${showing.agent_name || 'Unknown'} (${showing.agent_brokerage || ''})`,
        },
      },
    ],
  }
}

/** Format feedback for Slack */
export function formatFeedbackMessage(feedback: any): SlackMessage {
  const ratingStars = feedback.overall_rating
    ? '\u2B50'.repeat(feedback.overall_rating) + '\u2606'.repeat(5 - feedback.overall_rating)
    : 'No rating'

  const sentimentEmoji: Record<string, string> = {
    positive: '\uD83D\uDFE2',
    neutral: '\uD83D\uDFE1',
    negative: '\uD83D\uDD34',
    mixed: '\uD83D\uDFE0',
  }

  const priceLabels: Record<string, string> = {
    too_high: 'Too High',
    fair: 'Fair',
    too_low: 'Too Low',
    no_opinion: '—',
  }

  const interestLabels: Record<string, string> = {
    very_interested: 'Very Interested',
    interested: 'Interested',
    not_interested: 'Not Interested',
    no_response: '—',
  }

  const blocks: any[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Showing Feedback Received', emoji: true },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Agent:*\n${feedback.agent_name || 'Unknown'}` },
        { type: 'mrkdwn', text: `*Rating:*\n${ratingStars}` },
        { type: 'mrkdwn', text: `*Price Opinion:*\n${priceLabels[feedback.price_opinion] || '—'}` },
        { type: 'mrkdwn', text: `*Buyer Interest:*\n${interestLabels[feedback.buyer_interest] || '—'}` },
      ],
    },
  ]

  if (feedback.liked || feedback.disliked) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          feedback.liked ? `*Liked:* ${feedback.liked}` : '',
          feedback.disliked ? `*Concerns:* ${feedback.disliked}` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      },
    })
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `${sentimentEmoji[feedback.sentiment_label] || ''} *AI Summary:* ${feedback.sentiment_summary || 'No analysis available'}`,
      },
    ],
  })

  if (feedback.feedback_text) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `> ${feedback.feedback_text.substring(0, 2500).replace(/\n/g, '\n> ')}`,
      },
    })
  }

  return {
    text: `Feedback from ${feedback.agent_name}: ${feedback.sentiment_summary || feedback.feedback_text?.substring(0, 100)}`,
    blocks,
  }
}

/** Format signed doc / key email for Slack */
export function formatSignedDocMessage(email: {
  subject: string
  from: string
  snippet: string
  receivedAt: string
  docType: string
}): SlackMessage {
  const docLabels: Record<string, string> = {
    signed_doc: 'Signed Document Received',
    disclosure: 'Disclosure Received',
    inspection: 'Inspection Report',
    appraisal: 'Appraisal Update',
    title: 'Title / Escrow Update',
    lender: 'Lender Update',
    general: 'Key Email Received',
  }

  return {
    text: `${docLabels[email.docType] || 'Email'}: ${email.subject}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: docLabels[email.docType] || 'Email Notification', emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Subject:*\n${email.subject}` },
          { type: 'mrkdwn', text: `*From:*\n${email.from}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `> ${email.snippet.substring(0, 500)}` },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Received ${new Date(email.receivedAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Phoenix' })}`,
          },
        ],
      },
    ],
  }
}

/** Format a pipeline update for Slack (buyer stage change, listing status, etc.) */
export function formatPipelineUpdateMessage(params: {
  contactName: string
  contactType: 'seller' | 'buyer'
  field: string
  oldValue?: string
  newValue: string
  propertyAddress?: string
}): SlackMessage {
  const label = params.contactType === 'seller' ? 'Listing Status' : 'Pipeline Stage'
  return {
    text: `${label} changed to ${params.newValue} for ${params.contactName}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${label} Update*\n${params.oldValue ? `${params.oldValue} → ` : ''}*${params.newValue}*${params.propertyAddress ? `\n${params.propertyAddress}` : ''}`,
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `${new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Phoenix' })}` },
        ],
      },
    ],
  }
}

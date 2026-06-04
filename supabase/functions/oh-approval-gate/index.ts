// ─────────────────────────────────────────────────────────────────────────────
// oh-approval-gate — runs compliance checks on pending OH promo posts and
// posts a single approval-needed message to Slack.
//
// Flow (invoked from autoScheduleOHPromo right after pending_approval rows
// are inserted):
//   1. Load OH + property + listing + every content_platform_posts row in
//      'pending_approval' state tied to this OH (via content_pieces.open_house_id).
//   2. Pull Dana's brand_profile from user_settings.
//   3. For each pending post, send the body + hashtags to Claude with a
//      system prompt that scores it on two axes:
//        • Brand alignment   — does it sound like Dana? Right colors/voice/usp?
//        • ADRE compliance   — brokerage attribution? Agent name? Open house
//                              date + address accurate? Misleading claims?
//      Store the structured result back in compliance_check JSONB.
//   4. Resolve the Slack channel: prefer the seller's channel for this listing;
//      fall back to user_settings.slack_config.approvals_channel_id.
//   5. Build ONE message with: OH headline, count of pending posts, list of
//      windows (7d/24h/live) each with a deep-link back to the OH detail page
//      where the approval panel lives.
//
// Idempotent: re-running on the same OH is safe — compliance_check is
// overwritten, Slack is dedup'd via slack_message_log (message_type='oh_approval').
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { logAiGeneration, anthropicCostCents } from '../_shared/replicate-notify.ts'
import { callAnthropic } from '../_shared/ai-bill.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// (former ANTHROPIC_API constant removed — routed through _shared/ai-bill.ts)
const SLACK_API = 'https://slack.com/api'

// Conservative defaults that match how `generate-content` is configured.
const COMPLIANCE_MODEL = 'claude-haiku-4-5-20251001'

interface ComplianceResult {
  brand: { score: number; issues: string[] }
  adre:  { score: number; issues: string[] }
  missing_elements: string[]
  ran_at: string
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function buildBrandSummary(brandProfile: any): string {
  if (!brandProfile) return ''
  const sig = brandProfile.signature || {}
  const gl = brandProfile.guidelines || {}
  const parts: string[] = []
  if (sig.full_name)    parts.push(`Agent: ${sig.full_name}`)
  if (sig.title)        parts.push(`Title: ${sig.title}`)
  if (sig.brokerage)    parts.push(`Brokerage: ${sig.brokerage}`)
  if (sig.license_number) parts.push(`License #: ${sig.license_number}`)
  if (sig.tagline)      parts.push(`Tagline: ${sig.tagline}`)
  if (sig.usp)          parts.push(`USP: ${sig.usp}`)
  if (gl.tone_of_voice) parts.push(`Voice: ${gl.tone_of_voice}`)
  if (gl.primary_color || gl.accent_color) {
    parts.push(`Brand colors: primary ${gl.primary_color}, accent ${gl.accent_color || 'N/A'}`)
  }
  return parts.join('\n')
}

const ADRE_REQUIREMENTS = `Arizona Department of Real Estate (ADRE) advertising requirements for a salesperson promoting an open house:
• Brokerage name MUST appear in the post (the salesperson works under the broker — own name alone is insufficient).
• Salesperson's name should be clearly identifiable somewhere in the post or attribution.
• Property address must be accurate; date and time must be accurate.
• No misleading or unverifiable claims (e.g., "guaranteed best price", "only home on the market", price reductions that haven't happened).
• REALTOR® mark, if used, requires the registered-trademark symbol.
• If hosting another agent's listing, the listing agent / firm should be disclosed.
• No bait-and-switch language and no implied dual licensing the agent doesn't hold.`

async function runComplianceCheck(
  supabase: any,
  anthropicKey: string,
  brandSummary: string,
  oh: any,
  property: any,
  post: { platform: string; body: string; hashtags: string | null },
): Promise<ComplianceResult> {
  const dateStr = oh?.date || ''
  const timeStr = (oh?.start_time || '').toString().slice(0, 5)
  const addr = property?.address || ''
  const city = property?.city || ''

  const userPrompt = `You are auditing a social media post for an Arizona real-estate agent. Return STRICT JSON only — no prose, no code fences.

BRAND PROFILE
${brandSummary || '(no brand profile available)'}

ADRE RULES
${ADRE_REQUIREMENTS}

CONTEXT — this is an OPEN HOUSE promo for:
Address: ${addr}${city ? ', ' + city : ''}
Date:    ${dateStr}
Time:    ${timeStr}
Platform: ${post.platform}

POST BODY
"""
${post.body}
"""

HASHTAGS
${post.hashtags || '(none)'}

Score the post on TWO axes from 0 (catastrophic) to 100 (perfect). Be strict but fair — minor issues should still score 70+; only major violations should drop below 60.

Return this exact JSON shape:
{
  "brand": { "score": 0-100, "issues": ["short bullet about brand voice/colors/USP misses"] },
  "adre":  { "score": 0-100, "issues": ["short bullet about each ADRE-specific gap"] },
  "missing_elements": ["broker_name", "agent_name", "open_house_date", "open_house_time", "address"]
}

The missing_elements array should ONLY contain elements from this exact list, and ONLY if they are missing from the post body+hashtags: broker_name, agent_name, open_house_date, open_house_time, address. (For example, if the brokerage name "REAL Broker" appears in the post, do NOT include "broker_name".) Empty arrays are fine.`

  // C10: route through callAnthropic so cost_ledger reflects the spend.
  let data: any
  try {
    data = await callAnthropic(supabase, {
      model: COMPLIANCE_MODEL,
      maxTokens: 600,
      messages: [{ role: 'user', content: userPrompt }],
      feature: 'oh-approval-gate/compliance',
      attributedTo: oh?.id ? { kind: 'open_house', id: String(oh.id) } : undefined,
    })
  } catch (err: any) {
    await logAiGeneration(supabase, {
      service: 'anthropic',
      model: COMPLIANCE_MODEL,
      kind: 'oh_compliance_check',
      listing_id: oh?.listing_id || null,
      property_id: oh?.property_id || null,
      succeeded: false,
    })
    throw new Error(err?.message || 'Anthropic call failed')
  }
  await logAiGeneration(supabase, {
    service: 'anthropic',
    model: COMPLIANCE_MODEL,
    kind: 'oh_compliance_check',
    listing_id: oh?.listing_id || null,
    property_id: oh?.property_id || null,
    cost_cents: anthropicCostCents(COMPLIANCE_MODEL, data?.usage),
    succeeded: true,
  })
  const text = data?.content?.[0]?.text || '{}'

  // Defensive JSON parsing — strip code fences if Claude wrapped them.
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim()
  let parsed: any
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Last-ditch: find the first { ... } block.
    const m = cleaned.match(/\{[\s\S]*\}/)
    parsed = m ? JSON.parse(m[0]) : {}
  }

  const result: ComplianceResult = {
    brand: {
      score: Math.max(0, Math.min(100, Number(parsed?.brand?.score) || 0)),
      issues: Array.isArray(parsed?.brand?.issues) ? parsed.brand.issues.slice(0, 8).map((s: any) => String(s)) : [],
    },
    adre: {
      score: Math.max(0, Math.min(100, Number(parsed?.adre?.score) || 0)),
      issues: Array.isArray(parsed?.adre?.issues) ? parsed.adre.issues.slice(0, 8).map((s: any) => String(s)) : [],
    },
    missing_elements: Array.isArray(parsed?.missing_elements)
      ? parsed.missing_elements.filter((s: any) =>
          ['broker_name', 'agent_name', 'open_house_date', 'open_house_time', 'address'].includes(s),
        )
      : [],
    ran_at: new Date().toISOString(),
  }
  return result
}

function fmtScheduledFor(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZone: 'America/Phoenix',
    }) + ' MST'
  } catch { return iso }
}

async function findSlackChannelForOH(supabase: any, oh: any): Promise<string | null> {
  // 1) Try the seller's channel via the listing.
  if (oh?.listing_id) {
    const { data } = await supabase
      .from('slack_channels')
      .select('slack_channel_id')
      .eq('listing_id', oh.listing_id)
      .eq('is_archived', false)
      .limit(1)
      .maybeSingle()
    if (data?.slack_channel_id) return data.slack_channel_id
  }
  // 2) Fall back to a Dana-level approvals channel from user_settings.
  const { data: cfg } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'slack_config')
    .maybeSingle()
  return cfg?.value?.approvals_channel_id || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const slackToken   = Deno.env.get('SLACK_BOT_TOKEN') || ''
    const appUrl       = Deno.env.get('APP_URL') || 'https://app.danamassey.com'

    if (!anthropicKey) return json({ error: 'ANTHROPIC_API_KEY missing' }, 503)

    const { oh_id, skip_compliance } = await req.json()
    if (!oh_id) return json({ error: 'oh_id required' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1) Load OH + property + listing.
    const { data: oh, error: ohErr } = await supabase
      .from('open_houses')
      .select('id, date, start_time, end_time, listing_id, property_id, property:properties(address, city)')
      .eq('id', oh_id)
      .maybeSingle()
    if (ohErr || !oh) return json({ error: 'OH not found' }, 404)

    const property = (oh as any).property || null

    // 2) Pull pending_approval platform_posts for this OH.
    //    They join through content_pieces.open_house_id.
    const { data: pieces } = await supabase
      .from('content_pieces')
      .select('id')
      .eq('open_house_id', oh_id)
    const pieceIds = (pieces || []).map((p: any) => p.id)
    if (!pieceIds.length) return json({ ok: true, scanned: 0, note: 'no content_pieces for this OH' })

    const { data: posts, error: postsErr } = await supabase
      .from('content_platform_posts')
      .select('id, content_id, platform, adapted_text, hashtags, scheduled_for, status, compliance_check')
      .in('content_id', pieceIds)
      .eq('status', 'pending_approval')
    if (postsErr) return json({ error: `platform_posts load failed: ${postsErr.message}` }, 500)
    if (!posts || posts.length === 0) {
      return json({ ok: true, scanned: 0, note: 'no pending_approval posts' })
    }

    // 3) Brand profile.
    const { data: brandRow } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'brand_profile')
      .maybeSingle()
    const brandSummary = buildBrandSummary(brandRow?.value)

    // 4) Run compliance per post (unless caller opted out).
    const compliancePromises = (posts as any[]).map(async (p) => {
      if (skip_compliance) return null
      try {
        const c = await runComplianceCheck(supabase, anthropicKey, brandSummary, oh, property, {
          platform: p.platform,
          body: p.adapted_text || '',
          hashtags: p.hashtags || null,
        })
        await supabase
          .from('content_platform_posts')
          .update({ compliance_check: c })
          .eq('id', p.id)
        return c
      } catch (err) {
        console.error(`[oh-approval-gate] compliance failed for post ${p.id}:`, err)
        return null
      }
    })
    const complianceResults = await Promise.all(compliancePromises)

    // Aggregate worst-of stats so Slack message is useful at a glance.
    let minBrand = 100, minAdre = 100
    const flagged: any[] = []
    complianceResults.forEach((c, i) => {
      if (!c) return
      if (c.brand.score < minBrand) minBrand = c.brand.score
      if (c.adre.score  < minAdre)  minAdre  = c.adre.score
      if (c.brand.score < 70 || c.adre.score < 70 || (c.missing_elements && c.missing_elements.length)) {
        flagged.push({ platform: posts[i].platform, ...c })
      }
    })

    // 5) Build Slack message.
    const propLabel = `${property?.address || 'Open House'}${property?.city ? ', ' + property.city : ''}`
    const ohDateLabel = oh.date
      ? new Date(oh.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : ''
    const approvalUrl = `${appUrl}/open-houses?oh=${encodeURIComponent(oh_id)}#approvals`

    // Group posts by window (derived from the content_piece title pattern
    // 'OH Promo — <label>'). Best-effort; if we can't read it we just list flat.
    const windowsMap = new Map<string, any[]>()
    for (const p of posts as any[]) {
      const piece = pieces?.find((x: any) => x.id === p.content_id)
      const label = (piece as any)?.title?.replace(/^OH Promo\s*[—-]\s*/i, '') || 'Pending'
      const list = windowsMap.get(label) || []
      list.push(p)
      windowsMap.set(label, list)
    }

    const blocks: any[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🚪 OH posts need approval', emoji: true },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${propLabel}* — ${ohDateLabel}\n*${posts.length}* post${posts.length === 1 ? '' : 's'} pending approval.\nBrand score (worst): *${minBrand}/100* • ADRE score (worst): *${minAdre}/100*`,
        },
      },
    ]

    for (const [label, list] of windowsMap.entries()) {
      const earliest = list
        .map((p) => p.scheduled_for)
        .filter(Boolean)
        .sort()[0]
      const channels = list.map((p) => p.platform).join(', ')
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `• *${label}* — ${earliest ? fmtScheduledFor(earliest) : '—'}\n   ${channels}`,
        },
      })
    }

    if (flagged.length) {
      const flagLines = flagged.slice(0, 4).map((f) => {
        const issues = [...(f.brand?.issues || []), ...(f.adre?.issues || [])].slice(0, 3).join(' · ')
        const miss = (f.missing_elements || []).join(', ')
        return `   ⚠️ *${f.platform}* — brand ${f.brand?.score}/100, adre ${f.adre?.score}/100${miss ? ` · missing: ${miss}` : ''}${issues ? `\n      _${issues}_` : ''}`
      })
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `*Flagged:*\n${flagLines.join('\n')}` },
      })
    }

    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Review & approve', emoji: true },
          url: approvalUrl,
          style: 'primary',
        },
      ],
    })

    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: `Nothing will publish until you approve. _oh:${oh_id}_` }],
    })

    let slackPosted = false
    let slackChannel: string | null = null
    if (slackToken) {
      slackChannel = await findSlackChannelForOH(supabase, oh)
      if (slackChannel) {
        // Dedup so re-runs on the same OH don't spam.
        const sourceId = `oh-approval:${oh_id}:${posts.length}`
        const { data: existing } = await supabase
          .from('slack_message_log')
          .select('id')
          .eq('slack_channel_id', slackChannel)
          .eq('message_type', 'oh_approval')
          .eq('source_id', sourceId)
          .maybeSingle()

        if (!existing) {
          const resp = await fetch(`${SLACK_API}/chat.postMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${slackToken}`,
            },
            body: JSON.stringify({
              channel: slackChannel,
              text: `${posts.length} OH post${posts.length === 1 ? '' : 's'} pending approval — ${propLabel}`,
              blocks,
              unfurl_links: false,
            }),
          })
          const data = await resp.json()
          if (data.ok) {
            slackPosted = true
            await supabase.from('slack_message_log').insert({
              slack_channel_id: slackChannel,
              message_type: 'oh_approval',
              source_id: sourceId,
              message_ts: data.ts,
            })
          } else {
            console.error('Slack post failed:', data.error)
          }
        } else {
          slackPosted = true // already posted previously
        }
      }
    }

    return json({
      ok: true,
      scanned: posts.length,
      brand_score_min: minBrand,
      adre_score_min: minAdre,
      flagged_count: flagged.length,
      slack_posted: slackPosted,
      slack_channel: slackChannel,
      approval_url: approvalUrl,
    })
  } catch (err: any) {
    console.error('oh-approval-gate error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

// Shared helper — when a Replicate call returns 402 "Insufficient credit",
// drop a notification so Dana sees a bell-icon alert with a one-click link
// to her billing page.
//
// Idempotent: if there's already an unread `replicate_low_credit` notification
// from the last 24 hours, we don't create another one. (Replicate stays
// 402'd until she reloads, so without dedup every retry would spam.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const BILLING_URL = 'https://replicate.com/account/billing'

export async function maybeNotifyLowReplicateCredit(supabase: ReturnType<typeof createClient>, source: string, errorDetail?: string) {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'replicate_low_credit')
      .gte('created_at', since)
      .in('status', ['unread', 'snoozed'])
      .limit(1)

    if (existing && existing.length) return // already notified recently

    await supabase.from('notifications').insert({
      type: 'replicate_low_credit',
      title: '💳 Replicate credit running low',
      body: `Your last AI generation (${source}) failed with insufficient credit. Add a top-up at ${BILLING_URL} to keep Virtual Staging + Generate Image working. You set auto-reload OFF, so this won't refill on its own.`,
      // External URL — NotificationsBell.jsx + Notifications.jsx detect http(s)://
      // and open in a new tab.
      link: BILLING_URL,
      source_table: 'replicate',
      metadata: {
        billing_url: BILLING_URL,
        triggered_by: source,
        error_detail: errorDetail?.slice(0, 300) || null,
      },
    })
  } catch (err) {
    // Best-effort — never block the edge function on notification failures.
    console.warn('[replicate-notify] insert failed:', (err as any)?.message)
  }
}

export function isReplicate402(status: number, body: string): boolean {
  if (status !== 402) return false
  if (!body) return true
  return /insufficient credit|insufficient_credit|payment required/i.test(body)
}

// Estimate Anthropic cost in cents from a Claude `usage` block.
// Returns null when usage is missing or unrecognized. Rates are pulled from
// public Anthropic pricing (per 1M tokens). Cached tokens cost less; we count
// cache_creation at the same rate as fresh input (close enough — true rate is
// 1.25x but we'd rather under-account than block a call).
export function anthropicCostCents(
  model: string | undefined | null,
  usage: { input_tokens?: number; output_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number } | null | undefined,
): number | null {
  if (!usage) return null
  const input = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0)
  const output = usage.output_tokens || 0
  const cacheRead = usage.cache_read_input_tokens || 0
  if (input + output + cacheRead === 0) return null

  // Defaults: Sonnet pricing.
  let inRate = 3, outRate = 15, cacheReadRate = 0.30
  const m = (model || '').toLowerCase()
  if (m.includes('haiku')) { inRate = 1; outRate = 5; cacheReadRate = 0.10 }
  else if (m.includes('opus')) { inRate = 15; outRate = 75; cacheReadRate = 1.50 }

  const dollars = (input * inRate + output * outRate + cacheRead * cacheReadRate) / 1_000_000
  // Cents with 4-decimal precision so tiny calls (~$0.0001) don't round to 0.
  return Math.round(dollars * 100 * 10000) / 10000
}

/**
 * Append one row to ai_generation_log. Best-effort — never throws so a
 * logging failure can't break the user-facing call. Powers the AI Spend
 * dashboard widget.
 */
export async function logAiGeneration(
  supabase: ReturnType<typeof createClient>,
  entry: {
    service: 'replicate' | 'anthropic' | 'higgsfield' | 'other'
    model?: string
    kind?: string
    prompt?: string
    cost_cents?: number
    listing_id?: string | null
    property_id?: string | null
    contact_id?: string | null
    prediction_id?: string
    succeeded?: boolean
  }
) {
  try {
    await supabase.from('ai_generation_log').insert({
      service: entry.service,
      model: entry.model || null,
      kind: entry.kind || null,
      prompt: entry.prompt?.slice(0, 1000) || null,  // cap prompt size
      cost_cents: entry.cost_cents ?? null,
      listing_id: entry.listing_id || null,
      property_id: entry.property_id || null,
      contact_id: entry.contact_id || null,
      prediction_id: entry.prediction_id || null,
      succeeded: entry.succeeded ?? true,
    })
  } catch (err: any) {
    console.warn('[ai-log] insert failed:', err?.message)
  }
}

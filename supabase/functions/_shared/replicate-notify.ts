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

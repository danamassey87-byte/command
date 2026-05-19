// Higgsfield-specific helpers: low-credit / auth-error notifications and a
// 402/insufficient-credit detector. Mirrors the Replicate equivalent so the
// notification bell behaves the same way for both providers.
//
// Idempotent: only inserts a fresh notification if there isn't an unread
// `higgsfield_low_credit` one from the last 24 hours.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const BILLING_URL = 'https://higgsfield.ai/pricing'

export async function maybeNotifyHiggsfieldIssue(
  supabase: ReturnType<typeof createClient>,
  source: string,
  reason: 'low_credit' | 'auth' | 'rate_limited',
  errorDetail?: string,
) {
  try {
    const type = reason === 'auth'
      ? 'higgsfield_auth_error'
      : reason === 'rate_limited'
        ? 'higgsfield_rate_limited'
        : 'higgsfield_low_credit'

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', type)
      .gte('created_at', since)
      .in('status', ['unread', 'snoozed'])
      .limit(1)

    if (existing && existing.length) return

    const title =
      reason === 'auth'
        ? '🔑 Higgsfield API key issue'
        : reason === 'rate_limited'
          ? '⏳ Higgsfield rate-limited'
          : '💳 Higgsfield credits running low'

    const body =
      reason === 'auth'
        ? `An ${source} call to Higgsfield failed authentication. Re-check HIGGSFIELD_KEY_ID and HIGGSFIELD_KEY_SECRET in Supabase secrets.`
        : reason === 'rate_limited'
          ? `Higgsfield is rate-limiting your account (${source}). Try again in a minute or upgrade your plan at ${BILLING_URL}.`
          : `Your last AI generation (${source}) failed for lack of Higgsfield credits. Top up your plan at ${BILLING_URL} to keep Cinematic AI working.`

    await supabase.from('notifications').insert({
      type,
      title,
      body,
      link: BILLING_URL,
      source_table: 'higgsfield',
      metadata: {
        billing_url: BILLING_URL,
        triggered_by: source,
        error_detail: errorDetail?.slice(0, 300) || null,
      },
    })
  } catch (err) {
    console.warn('[higgsfield-notify] insert failed:', (err as any)?.message)
  }
}

export function isHiggsfieldCreditError(status: number, body: string): boolean {
  if (status === 402) return true
  if (!body) return false
  return /insufficient.*credit|out of credit|quota|payment required/i.test(body)
}

export function isHiggsfieldAuthError(status: number): boolean {
  return status === 401 || status === 403
}

export function isHiggsfieldRateLimited(status: number): boolean {
  return status === 429
}

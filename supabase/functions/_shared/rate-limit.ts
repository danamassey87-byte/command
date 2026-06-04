// M18 helper. Thin wrapper around the check_rate_limit RPC so edge fns
// don't reinvent the call shape. Returns { allowed, count, max,
// retryAfterSeconds } or — on any error talking to Postgres — fails open
// with allowed=true (rate-limiting outage is preferable to a 503 storm).
//
// Usage:
//   const rl = await checkRateLimit(supabase, {
//     scope: 'validate-address',
//     key: req.headers.get('x-forwarded-for') || 'anon',
//     periodSeconds: 3600,
//     max: 100,
//   })
//   if (!rl.allowed) {
//     return new Response('Too Many Requests', {
//       status: 429,
//       headers: { 'Retry-After': String(rl.retryAfterSeconds) },
//     })
//   }
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

export interface RateLimitArgs {
  scope: string
  key: string
  periodSeconds: number
  max: number
}

export interface RateLimitResult {
  allowed: boolean
  count: number
  max: number
  retryAfterSeconds: number
}

export async function checkRateLimit(
  supabase: SupabaseClient,
  args: RateLimitArgs,
): Promise<RateLimitResult> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_scope:          args.scope,
    p_key:            args.key,
    p_period_seconds: args.periodSeconds,
    p_max:            args.max,
  })
  if (error) {
    // Fail open. Rate-limit-table outage shouldn't take the endpoint down.
    console.warn(`[rate-limit] ${args.scope}/${args.key} check failed:`, error.message)
    return { allowed: true, count: 0, max: args.max, retryAfterSeconds: 0 }
  }
  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed:           !!row?.allowed,
    count:             Number(row?.count || 0),
    max:               Number(row?.max || args.max),
    retryAfterSeconds: Number(row?.retry_after_seconds || 0),
  }
}

/** Get a best-effort caller-IP key from the inbound request. Supabase
 *  preserves the client IP via x-forwarded-for / cf-connecting-ip. Falls
 *  back to a constant so unauthenticated unkeyed callers all share a
 *  bucket (a single global per scope). */
export function callerIpKey(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || 'anon'
  )
}

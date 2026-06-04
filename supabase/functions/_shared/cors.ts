// M1 from SECURITY_AUDIT_PUNCHLIST: state-mutating edge functions should
// restrict CORS to known frontend origins instead of `*`. With `*`, any
// website on the internet can make CORS requests (and cookie-less POSTs)
// from a victim's browser to our edge functions. Browser-enforced CORS
// is the layer this closes; a malicious script that doesn't run in a
// browser can still spoof any Origin, so this is defense-in-depth only —
// the real auth checks (bearer / signature / etc.) still own enforcement.
//
// Webhook receivers (Resend, Lofty, embed-on-insert) don't have a useful
// browser Origin — they're called by vendor servers — so they stay on
// the old `CORS_OPEN` allow-all map. State-mutating endpoints called from
// the SPA use `corsHeadersFor(origin)` which echoes back the request's
// Origin if it's in the allowlist.

const ALLOWED_ORIGINS = new Set<string>([
  'https://app.danamassey.com',
  // Vercel preview deploys
  'https://command-git-main-danamassey.vercel.app',
  // Local dev
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
])

/** CORS header set for state-mutating endpoints. Echoes the request Origin
 *  back if it's in the allowlist; otherwise rejects with `null` Origin
 *  (browser blocks the call). */
export function corsHeadersFor(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Credentials'] = 'true'
  } else {
    // Reject silently — browser blocks the response.
    headers['Access-Control-Allow-Origin'] = 'null'
  }
  return headers
}

/** Open CORS for unauthenticated public endpoints (webhook receivers, public
 *  kiosk reads etc). Use sparingly — anything that mutates state should
 *  prefer `corsHeadersFor`. */
export const CORS_OPEN = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

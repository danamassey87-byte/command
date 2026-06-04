// ─────────────────────────────────────────────────────────────────────────────
// save-elevenlabs-key — validate a new ElevenLabs API key, then store it in
// service_secrets (service-role-only) and set has_api_key=true in user_settings.
//
// Body: { api_key: string }
//
// Auth (C2 from SECURITY_AUDIT_PUNCHLIST): the previous version had no auth
// check at all, so anyone on the internet could POST a throwaway key and
// silently divert Dana's TTS spend + prompts to their own ElevenLabs account.
// We now accept either:
//   • Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>  (admin / direct backend)
//   • Authorization: Bearer <user JWT>                   (frontend, once Auth ships)
// Anonymous calls (anon publishable key, no header) are rejected with 401.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// Constant-time string compare to avoid leaking timing information about
// the service-role key length / prefix.
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function authorize(req: Request, db: SupabaseClient): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const header = req.headers.get('authorization') || ''
  if (!header.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, error: 'Authorization: Bearer <token> required' }
  }
  const token = header.slice(7).trim()
  if (!token) return { ok: false, status: 401, error: 'Empty bearer token' }

  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  if (serviceRole && timingSafeEqualStr(token, serviceRole)) {
    return { ok: true }
  }

  // Fallback: treat as a user JWT. getUser hits Supabase Auth and returns the
  // user if the token is signed by this project's JWT secret. Anon publishable
  // keys are NOT user JWTs and will be rejected here.
  try {
    const { data, error } = await db.auth.getUser(token)
    if (error || !data?.user) {
      return { ok: false, status: 403, error: 'Token is not a valid user session or service-role key' }
    }
    return { ok: true }
  } catch {
    return { ok: false, status: 403, error: 'Token rejected' }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const auth = await authorize(req, db)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  try {
    const { api_key } = await req.json()
    const trimmed = (api_key || '').trim()
    if (!trimmed) return json({ error: 'api_key is required' }, 400)
    if (!trimmed.startsWith('sk_') || trimmed.length < 20) {
      return json({ error: 'Looks malformed — ElevenLabs keys start with "sk_"' }, 400)
    }

    // Validate by hitting /user (cheap auth check)
    const probe = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': trimmed },
    })
    if (!probe.ok) {
      return json({ error: `Key rejected by ElevenLabs (HTTP ${probe.status})` }, 400)
    }
    const userInfo = await probe.json().catch(() => ({}))

    // Store
    await db.from('service_secrets')
      .upsert({ key: 'elevenlabs_api_key', value: { api_key: trimmed }, updated_at: new Date().toISOString() })

    // Mark configured in user_settings (preserve other fields)
    const { data: cfgRow } = await db.from('user_settings').select('value').eq('key', 'elevenlabs').maybeSingle()
    const prev = (cfgRow?.value as any) || {}
    const nextValue = {
      ...prev,
      has_api_key: true,
      configured_at: prev.configured_at || new Date().toISOString(),
      key_updated_at: new Date().toISOString(),
    }
    await db.from('user_settings')
      .upsert({ key: 'elevenlabs', value: nextValue, updated_at: new Date().toISOString() })

    return json({
      success: true,
      subscription: userInfo?.subscription?.tier || null,
      character_count: userInfo?.subscription?.character_count ?? null,
      character_limit: userInfo?.subscription?.character_limit ?? null,
    })
  } catch (err: any) {
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

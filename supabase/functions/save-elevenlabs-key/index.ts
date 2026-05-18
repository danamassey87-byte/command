// ─────────────────────────────────────────────────────────────────────────────
// save-elevenlabs-key — validate a new ElevenLabs API key, then store it in
// service_secrets (service-role-only) and set has_api_key=true in user_settings.
//
// Body: { api_key: string }
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

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

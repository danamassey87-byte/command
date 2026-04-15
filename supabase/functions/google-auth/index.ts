// ─────────────────────────────────────────────────────────────────────────────
// google-auth — Handles Google OAuth2 flow for Calendar + Gmail integration.
//
// Two actions:
//   1. get_auth_url  → returns Google consent URL with required scopes
//   2. exchange_code → exchanges auth code for tokens, stores in user_settings
//
// Secrets (set via Supabase Edge Function secrets):
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      return new Response(
        JSON.stringify({ error: 'Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Supabase Edge Function secrets.', code: 'missing_credentials' }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { action, code, redirect_uri } = await req.json()

    // ─── Action: get_auth_url ─────────────────────────────────────────────────
    if (action === 'get_auth_url') {
      if (!redirect_uri) {
        return new Response(
          JSON.stringify({ error: 'Missing redirect_uri' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirect_uri,
        response_type: 'code',
        scope: SCOPES,
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
      })

      const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`

      return new Response(
        JSON.stringify({ ok: true, auth_url: authUrl }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Action: exchange_code ────────────────────────────────────────────────
    if (action === 'exchange_code') {
      if (!code || !redirect_uri) {
        return new Response(
          JSON.stringify({ error: 'Missing code or redirect_uri' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      // Exchange authorization code for tokens
      const tokenResp = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: redirect_uri,
        }),
      })

      const tokenData = await tokenResp.json()

      if (!tokenResp.ok || tokenData.error) {
        return new Response(
          JSON.stringify({
            error: 'Token exchange failed',
            detail: tokenData.error_description || tokenData.error || 'Unknown error',
            code: 'token_exchange_failed',
          }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch user email from Google
      let userEmail = null
      try {
        const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` },
        })
        if (userInfoResp.ok) {
          const userInfo = await userInfoResp.json()
          userEmail = userInfo.email || null
        }
      } catch (e) {
        console.error('Failed to fetch user email:', e)
      }

      // Store tokens in user_settings
      const tokenPayload = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_type: tokenData.token_type || 'Bearer',
        expires_in: tokenData.expires_in || 3600,
        scope: tokenData.scope || SCOPES,
        email: userEmail,
        connected_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
      }

      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert(
          { key: 'google_tokens', value: tokenPayload, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        )

      if (upsertError) {
        return new Response(
          JSON.stringify({ error: 'Failed to store tokens', detail: upsertError.message, code: 'storage_failed' }),
          { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          ok: true,
          email: userEmail,
          scopes: tokenData.scope || SCOPES,
          connected_at: tokenPayload.connected_at,
        }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action. Use get_auth_url or exchange_code.' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('google-auth error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error', code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

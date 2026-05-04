// google-drive — create + manage client/listing folders in Dana's Drive.
//
// Actions:
//   create_folder { kind: 'contact'|'listing', id, name, subfolders?: string[] }
//     - Ensures a parent "Real Estate" folder exists (stored in user_settings.drive_root_folder)
//     - Creates a named child folder under it
//     - Optionally creates standard subfolders ("Disclosures", "Offers", etc.)
//     - Stores folder_id + webViewLink on the contact/listing row
//
// Auth: uses the stored google_tokens (refresh_token if access expired).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const ROOT_FOLDER_NAME = 'Real Estate'

const DEFAULT_LISTING_SUBFOLDERS = ['Photos', 'Disclosures', 'Offers', 'Contracts', 'Inspection']
const DEFAULT_CONTACT_SUBFOLDERS = ['Showings', 'Documents', 'Communications']

async function refreshAccessTokenIfNeeded(supabase: any, tokens: any): Promise<string> {
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0
  // Refresh if within 5 minutes of expiry
  if (Date.now() < expiresAt - 5 * 60 * 1000 && tokens.access_token) {
    return tokens.access_token
  }

  if (!tokens.refresh_token) {
    throw new Error('Token expired and no refresh_token available — Dana needs to reconnect Google')
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const data = await resp.json()
  if (!resp.ok || data.error) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error || 'unknown'}`)
  }

  const updated = {
    ...tokens,
    access_token: data.access_token,
    expires_in: data.expires_in || 3600,
    expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
  }

  await supabase
    .from('user_settings')
    .upsert({ key: 'google_tokens', value: updated, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  return data.access_token
}

async function findFolderByName(accessToken: string, name: string, parentId?: string): Promise<string | null> {
  const queryParts = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
  ]
  if (parentId) queryParts.push(`'${parentId}' in parents`)
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(queryParts.join(' and '))}&fields=files(id,name)&pageSize=1`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`Drive search failed: ${data.error?.message || resp.statusText}`)
  return data.files?.[0]?.id ?? null
}

async function createFolder(accessToken: string, name: string, parentId?: string): Promise<{ id: string; webViewLink: string }> {
  const body: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) body.parents = [parentId]

  const resp = await fetch(`${DRIVE_API}/files?fields=id,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`Drive create failed: ${data.error?.message || resp.statusText}`)
  return { id: data.id, webViewLink: data.webViewLink }
}

async function ensureRootFolder(supabase: any, accessToken: string): Promise<string> {
  // Check user_settings for cached root folder ID
  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'drive_root_folder')
    .maybeSingle()

  if (settingsRow?.value?.id) {
    // Verify it still exists (and is in trash check)
    try {
      const resp = await fetch(`${DRIVE_API}/files/${settingsRow.value.id}?fields=id,trashed`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (resp.ok) {
        const data = await resp.json()
        if (!data.trashed) return settingsRow.value.id
      }
    } catch (_) { /* fall through to recreate */ }
  }

  // Look up by name (in case the folder exists from a prior install)
  const found = await findFolderByName(accessToken, ROOT_FOLDER_NAME)
  let rootId = found
  if (!rootId) {
    const created = await createFolder(accessToken, ROOT_FOLDER_NAME)
    rootId = created.id
  }

  await supabase
    .from('user_settings')
    .upsert({ key: 'drive_root_folder', value: { id: rootId }, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  return rootId
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { action, kind, id, name, subfolders } = await req.json()

    if (action !== 'create_folder') {
      return new Response(
        JSON.stringify({ error: 'Unknown action. Use create_folder.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (!kind || !id || !name) {
      return new Response(
        JSON.stringify({ error: 'Missing required: kind, id, name' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }
    if (!['contact', 'listing'].includes(kind)) {
      return new Response(
        JSON.stringify({ error: 'kind must be "contact" or "listing"' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Load Google tokens
    const { data: tokenRow } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'google_tokens')
      .maybeSingle()

    if (!tokenRow?.value?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Google account not connected. Connect in Settings → Connected Accounts.', code: 'not_connected' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = await refreshAccessTokenIfNeeded(supabase, tokenRow.value)
    const rootId = await ensureRootFolder(supabase, accessToken)

    // Create the named folder under root
    const cleanName = String(name).trim().slice(0, 200)
    const existing = await findFolderByName(accessToken, cleanName, rootId)
    let folderId: string, folderUrl: string
    if (existing) {
      folderId = existing
      // Fetch webViewLink
      const resp = await fetch(`${DRIVE_API}/files/${existing}?fields=webViewLink`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await resp.json()
      folderUrl = data.webViewLink
    } else {
      const created = await createFolder(accessToken, cleanName, rootId)
      folderId = created.id
      folderUrl = created.webViewLink
    }

    // Default subfolders if none specified
    const subs = Array.isArray(subfolders) ? subfolders
      : (kind === 'listing' ? DEFAULT_LISTING_SUBFOLDERS : DEFAULT_CONTACT_SUBFOLDERS)

    const subResults: Array<{ name: string; id: string }> = []
    for (const subName of subs) {
      const cleanSub = String(subName).trim().slice(0, 100)
      if (!cleanSub) continue
      const existingSub = await findFolderByName(accessToken, cleanSub, folderId)
      if (existingSub) {
        subResults.push({ name: cleanSub, id: existingSub })
      } else {
        const sub = await createFolder(accessToken, cleanSub, folderId)
        subResults.push({ name: cleanSub, id: sub.id })
      }
    }

    // Persist on the contact/listing row
    const table = kind === 'contact' ? 'contacts' : 'listings'
    await supabase
      .from(table)
      .update({
        drive_folder_id:  folderId,
        drive_folder_url: folderUrl,
      })
      .eq('id', id)

    return new Response(
      JSON.stringify({
        ok: true,
        folder_id: folderId,
        folder_url: folderUrl,
        subfolders: subResults,
        action: existing ? 'linked_existing' : 'created',
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('google-drive error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error', code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

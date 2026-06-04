// google-drive — create + manage client/listing folders in Dana's Drive.
//
// Actions:
//   create_folder { kind: 'contact'|'listing', id, name, subfolders?: string[] }
//     - Ensures a parent "Real Estate" folder exists (stored in user_settings.drive_root_folder)
//     - Creates a named child folder under it
//     - Optionally creates standard subfolders ("Disclosures", "Offers", etc.)
//     - Stores folder_id + webViewLink on the contact/listing row
//
//   share_folder { folder_id, email, role?: 'writer'|'reader'|'commenter', notify?: boolean }
//     - Grants the given email access to the folder via Drive permissions API
//     - Defaults: role='writer', notify=true (Google sends an invite email)
//     - Idempotent — silently no-ops if the email already has equal-or-greater access
//
//   sync_photos { listing_id, subfolder?: string }
//     - Reads the listing's drive_folder_id, finds the named subfolder (default 'Photos'),
//       lists every image inside, and inserts new ones into media_assets keyed by drive_file_id.
//     - Returns { imported: N, skipped: N, total: N } for UI feedback.
//
//   list_meet_recordings { since_days?: number }
//     - Finds the auto-created "Meet Recordings" folder in Dana's Drive.
//     - Lists video files created in the last `since_days` (default 90, max 365).
//     - Cross-references existing interactions to mark already-imported recordings.
//     - Returns { recordings: [{ drive_file_id, name, web_view_link, thumbnail_link,
//                                 created_at, duration_ms, imported }], total }.
//
//   link_meet_recording { drive_file_id, name, web_view_link, thumbnail_link,
//                         created_at, duration_ms, contact_id, deal_id?, property_id?, body? }
//     - Inserts an interactions row with kind='meet_recording' linking the
//       Drive file to a contact. Idempotent — returns the existing interaction
//       if the drive_file_id is already linked.
//
// Auth: uses the stored google_tokens (refresh_token if access expired).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeadersFor } from '../_shared/cors.ts'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const ROOT_FOLDER_NAME = 'Real Estate'

const DEFAULT_LISTING_SUBFOLDERS = ['Photos', 'Disclosures', 'Offers', 'Contracts', 'Inspection']
const DEFAULT_CONTACT_SUBFOLDERS = ['Showings', 'Documents', 'Communications']

async function refreshAccessTokenIfNeeded(supabase: any, tokens: any): Promise<string> {
  const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0
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
  const { data: settingsRow } = await supabase
    .from('user_settings')
    .select('value')
    .eq('key', 'drive_root_folder')
    .maybeSingle()

  if (settingsRow?.value?.id) {
    try {
      const resp = await fetch(`${DRIVE_API}/files/${settingsRow.value.id}?fields=id,trashed`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (resp.ok) {
        const data = await resp.json()
        if (!data.trashed) return settingsRow.value.id
      }
    } catch (_) { /* fall through */ }
  }

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

// Permission rank for idempotent share check. Higher number = broader access.
const ROLE_RANK: Record<string, number> = { reader: 1, commenter: 2, writer: 3, owner: 4 }

async function shareFolder(
  accessToken: string,
  folderId: string,
  email: string,
  role: string,
  notify: boolean,
): Promise<{ ok: true; action: 'created' | 'already_shared'; permission_id?: string }> {
  // Check existing permissions to avoid duplicate shares.
  const listResp = await fetch(
    `${DRIVE_API}/files/${folderId}/permissions?fields=permissions(id,emailAddress,role)&pageSize=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  const listData = await listResp.json()
  if (!listResp.ok) throw new Error(`Drive permissions list failed: ${listData.error?.message || listResp.statusText}`)

  const lowered = email.toLowerCase()
  const existing = (listData.permissions || []).find(
    (p: any) => p.emailAddress?.toLowerCase() === lowered,
  )
  if (existing && (ROLE_RANK[existing.role] ?? 0) >= (ROLE_RANK[role] ?? 0)) {
    return { ok: true, action: 'already_shared', permission_id: existing.id }
  }

  const url = `${DRIVE_API}/files/${folderId}/permissions?sendNotificationEmail=${notify ? 'true' : 'false'}&fields=id`
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'user', role, emailAddress: email }),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`Drive share failed: ${data.error?.message || resp.statusText}`)
  return { ok: true, action: 'created', permission_id: data.id }
}

interface DrivePhoto {
  id: string
  name: string
  mimeType: string
  size?: string
  webViewLink?: string
  webContentLink?: string
  thumbnailLink?: string
  imageMediaMetadata?: { width?: number; height?: number; time?: string }
  createdTime?: string
}

async function listImagesInFolder(accessToken: string, folderId: string): Promise<DrivePhoto[]> {
  const out: DrivePhoto[] = []
  let pageToken: string | undefined
  const fields = 'nextPageToken,files(id,name,mimeType,size,webViewLink,webContentLink,thumbnailLink,createdTime,imageMediaMetadata(width,height,time))'
  // mimeType contains 'image/' covers jpg, png, heic, webp, etc.
  const q = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`

  do {
    const params = new URLSearchParams({
      q,
      fields,
      pageSize: '200',
      ...(pageToken ? { pageToken } : {}),
    })
    const resp = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(`Drive list failed: ${data.error?.message || resp.statusText}`)
    for (const f of data.files || []) out.push(f as DrivePhoto)
    pageToken = data.nextPageToken
  } while (pageToken)

  return out
}

serve(async (req) => {
  // M1: lock CORS to known frontend origins.
  const CORS = corsHeadersFor(req.headers.get('origin'))
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json()
    const { action } = body

    // Load Google tokens (shared across all actions).
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

    if (action === 'create_folder') {
      const { kind, id, name, subfolders } = body
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

      const rootId = await ensureRootFolder(supabase, accessToken)
      const cleanName = String(name).trim().slice(0, 200)
      const existing = await findFolderByName(accessToken, cleanName, rootId)
      let folderId: string, folderUrl: string
      if (existing) {
        folderId = existing
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

      const table = kind === 'contact' ? 'contacts' : 'listings'
      await supabase
        .from(table)
        .update({ drive_folder_id: folderId, drive_folder_url: folderUrl })
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
    }

    if (action === 'share_folder') {
      const { folder_id, email, role = 'writer', notify = true } = body
      if (!folder_id || !email) {
        return new Response(
          JSON.stringify({ error: 'Missing required: folder_id, email' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
      if (!['reader', 'commenter', 'writer'].includes(role)) {
        return new Response(
          JSON.stringify({ error: 'role must be reader, commenter, or writer' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const result = await shareFolder(accessToken, folder_id, String(email).trim(), role, !!notify)
      return new Response(
        JSON.stringify(result),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'sync_photos') {
      const { listing_id, subfolder = 'Photos' } = body
      if (!listing_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required: listing_id' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      // Look up the listing's Drive folder + property_id (media_assets is keyed on property).
      const { data: listing, error: listingErr } = await supabase
        .from('listings')
        .select('id, drive_folder_id, property_id')
        .eq('id', listing_id)
        .maybeSingle()

      if (listingErr || !listing) {
        return new Response(
          JSON.stringify({ error: 'Listing not found' }),
          { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
      if (!listing.drive_folder_id) {
        return new Response(
          JSON.stringify({ error: 'Listing has no Drive folder yet. Click 📁 Drive first.', code: 'no_drive_folder' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
      if (!listing.property_id) {
        return new Response(
          JSON.stringify({ error: 'Listing has no linked property.', code: 'no_property' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const subId = await findFolderByName(accessToken, String(subfolder), listing.drive_folder_id)
      if (!subId) {
        return new Response(
          JSON.stringify({ error: `'${subfolder}' subfolder not found inside the listing's Drive folder.`, code: 'no_subfolder' }),
          { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const photos = await listImagesInFolder(accessToken, subId)
      if (!photos.length) {
        return new Response(
          JSON.stringify({ ok: true, imported: 0, skipped: 0, total: 0, message: 'No photos in folder.' }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      // Dedup: skip drive_file_ids already imported (and not soft-deleted).
      const driveIds = photos.map(p => p.id)
      const { data: existing } = await supabase
        .from('media_assets')
        .select('drive_file_id')
        .in('drive_file_id', driveIds)
        .is('deleted_at', null)

      const seen = new Set((existing || []).map((r: any) => r.drive_file_id))
      const toInsert = photos
        .filter(p => !seen.has(p.id))
        .map(p => ({
          kind: 'photo',
          property_id: listing.property_id,
          drive_file_id: p.id,
          // Use webContentLink (direct download) when available, else webViewLink.
          storage_url: p.webContentLink || p.webViewLink || `https://drive.google.com/file/d/${p.id}/view`,
          thumbnail_url: p.thumbnailLink || null,
          width: p.imageMediaMetadata?.width ?? null,
          height: p.imageMediaMetadata?.height ?? null,
          file_size: p.size ? Number(p.size) : null,
          shot_at: p.imageMediaMetadata?.time || p.createdTime || null,
        }))

      let imported = 0
      if (toInsert.length) {
        const { error: insertErr } = await supabase.from('media_assets').insert(toInsert)
        if (insertErr) throw new Error(`media_assets insert failed: ${insertErr.message}`)
        imported = toInsert.length
      }

      return new Response(
        JSON.stringify({
          ok: true,
          imported,
          skipped: photos.length - imported,
          total: photos.length,
        }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'list_meet_recordings') {
      const { since_days = 90 } = body
      // Google saves Meet recordings to a "Meet Recordings" folder (auto-created
      // by Meet on the first recording). Find it; if it doesn't exist, return
      // an empty list rather than failing.
      const meetFolderId = await findFolderByName(accessToken, 'Meet Recordings')
      if (!meetFolderId) {
        return new Response(
          JSON.stringify({ ok: true, recordings: [], note: 'No "Meet Recordings" folder found in Drive — record at least one Meet first.' }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const sinceIso = new Date(Date.now() - Math.max(1, Math.min(365, Number(since_days))) * 24 * 60 * 60 * 1000).toISOString()
      const fields = 'files(id,name,mimeType,size,webViewLink,thumbnailLink,createdTime,modifiedTime,videoMediaMetadata(durationMillis))'
      const q = `'${meetFolderId}' in parents and trashed = false and createdTime > '${sinceIso}'`
      const url = `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent('nextPageToken,' + fields)}&pageSize=100&orderBy=createdTime desc`

      const resp = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
      const data = await resp.json()
      if (!resp.ok) throw new Error(`Drive list failed: ${data.error?.message || resp.statusText}`)

      const recordings = (data.files || []).map((f: any) => ({
        drive_file_id: f.id,
        name: f.name,
        mime_type: f.mimeType,
        size: f.size ? Number(f.size) : null,
        web_view_link: f.webViewLink,
        thumbnail_link: f.thumbnailLink || null,
        created_at: f.createdTime,
        modified_at: f.modifiedTime,
        duration_ms: f.videoMediaMetadata?.durationMillis ? Number(f.videoMediaMetadata.durationMillis) : null,
      }))

      // Cross-reference against existing interactions to mark already-imported.
      const driveIds = recordings.map((r: any) => r.drive_file_id)
      let imported = new Set<string>()
      if (driveIds.length) {
        const { data: existing } = await supabase
          .from('interactions')
          .select('metadata')
          .eq('kind', 'meet_recording')
          .is('deleted_at', null)
        for (const row of existing || []) {
          const id = (row as any)?.metadata?.drive_file_id
          if (id) imported.add(id)
        }
      }
      const enriched = recordings.map((r: any) => ({ ...r, imported: imported.has(r.drive_file_id) }))

      return new Response(
        JSON.stringify({ ok: true, recordings: enriched, folder_id: meetFolderId, total: enriched.length }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'link_meet_recording') {
      const { drive_file_id, name, web_view_link, thumbnail_link, created_at, duration_ms, contact_id, deal_id, property_id, body: bodyText } = body
      if (!drive_file_id || !contact_id) {
        return new Response(
          JSON.stringify({ error: 'Missing required: drive_file_id, contact_id' }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      // Check if this drive_file_id already has an interaction — return that
      // instead of creating a duplicate.
      const { data: existing } = await supabase
        .from('interactions')
        .select('id, contact_id, metadata')
        .eq('kind', 'meet_recording')
        .is('deleted_at', null)
      const dupe = (existing || []).find((r: any) => r?.metadata?.drive_file_id === drive_file_id)
      if (dupe) {
        return new Response(
          JSON.stringify({ ok: true, action: 'already_linked', interaction_id: dupe.id, contact_id: dupe.contact_id }),
          { headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const { data: inserted, error: insertErr } = await supabase
        .from('interactions')
        .insert({
          contact_id,
          deal_id: deal_id || null,
          property_id: property_id || null,
          kind: 'meet_recording',
          channel: 'video',
          body: bodyText || name || 'Google Meet recording',
          at: created_at || new Date().toISOString(),
          metadata: {
            drive_file_id,
            file_name: name,
            web_view_link,
            thumbnail_link,
            duration_ms,
            source: 'google_meet',
          },
        })
        .select('id')
        .single()

      if (insertErr) throw new Error(`interactions insert failed: ${insertErr.message}`)

      return new Response(
        JSON.stringify({ ok: true, action: 'linked', interaction_id: inserted.id }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action. Use create_folder, share_folder, sync_photos, list_meet_recordings, or link_meet_recording.' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('google-drive error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error', code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

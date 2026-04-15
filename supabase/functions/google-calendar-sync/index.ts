// ─────────────────────────────────────────────────────────────────────────────
// google-calendar-sync — Two-way sync between app events and Google Calendar.
//
// Two actions:
//   1. push → push open_houses and buyer_showings to Google Calendar
//   2. pull → pull events from Google Calendar for display
//
// Uses tokens from user_settings 'google_tokens'. Includes token refresh logic.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { action, time_min, time_max, calendar_id } = await req.json()

    if (!action || !['push', 'pull'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid action. Use push or pull.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Load + refresh Google tokens ─────────────────────────────────────────
    const { data: tokenRow, error: tokenErr } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'google_tokens')
      .maybeSingle()

    if (tokenErr || !tokenRow?.value?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Google account not connected. Connect via Settings.', code: 'not_connected' }),
        { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    let tokens = tokenRow.value
    const calId = calendar_id || 'primary'

    // Check if token is expired (with 5-min buffer)
    const expiresAt = tokens.expires_at ? new Date(tokens.expires_at).getTime() : 0
    const isExpired = Date.now() > (expiresAt - 5 * 60 * 1000)

    if (isExpired && tokens.refresh_token) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')

      if (!clientId || !clientSecret) {
        return new Response(
          JSON.stringify({ error: 'Google OAuth credentials not configured for token refresh.', code: 'missing_credentials' }),
          { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const refreshResp = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokens.refresh_token,
          grant_type: 'refresh_token',
        }),
      })

      const refreshData = await refreshResp.json()

      if (refreshResp.ok && refreshData.access_token) {
        tokens = {
          ...tokens,
          access_token: refreshData.access_token,
          expires_in: refreshData.expires_in || 3600,
          expires_at: new Date(Date.now() + (refreshData.expires_in || 3600) * 1000).toISOString(),
        }

        // Persist refreshed tokens
        await supabase
          .from('user_settings')
          .upsert(
            { key: 'google_tokens', value: tokens, updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          )
      } else {
        return new Response(
          JSON.stringify({ error: 'Token refresh failed. Please reconnect Google account.', detail: refreshData.error_description || refreshData.error, code: 'refresh_failed' }),
          { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
    }

    const authHeader = { 'Authorization': `Bearer ${tokens.access_token}`, 'Content-Type': 'application/json' }

    // ─── Action: PUSH ─────────────────────────────────────────────────────────
    if (action === 'push') {
      const results: Array<{ type: string; id: string; google_event_id: string | null; status: string; error?: string }> = []

      // 1. Push open houses
      const { data: openHouses } = await supabase
        .from('open_houses')
        .select('*')
        .is('deleted_at', null)
        .gte('date', new Date().toISOString().slice(0, 10))

      for (const oh of (openHouses || [])) {
        try {
          const startDateTime = oh.date && oh.start_time
            ? `${oh.date}T${oh.start_time}:00`
            : oh.date ? `${oh.date}T10:00:00` : null
          const endDateTime = oh.date && oh.end_time
            ? `${oh.date}T${oh.end_time}:00`
            : oh.date ? `${oh.date}T14:00:00` : null

          if (!startDateTime) {
            results.push({ type: 'open_house', id: oh.id, google_event_id: null, status: 'skipped', error: 'No date' })
            continue
          }

          const eventBody: Record<string, any> = {
            summary: `Open House: ${oh.address || oh.property_address || 'TBD'}`,
            description: [
              oh.notes || '',
              oh.mls_id ? `MLS# ${oh.mls_id}` : '',
              `Status: ${oh.status || 'scheduled'}`,
            ].filter(Boolean).join('\n'),
            start: { dateTime: startDateTime, timeZone: 'America/Phoenix' },
            end: { dateTime: endDateTime, timeZone: 'America/Phoenix' },
            location: oh.address || oh.property_address || '',
            colorId: '11', // red/tomato for open houses
          }

          // Check if already synced
          const { data: syncLog } = await supabase
            .from('google_calendar_sync_log')
            .select('google_event_id')
            .eq('source_type', 'open_house')
            .eq('source_id', oh.id)
            .maybeSingle()

          let googleEventId: string | null = null

          if (syncLog?.google_event_id) {
            // Update existing event
            const updateResp = await fetch(`${CALENDAR_API}/calendars/${calId}/events/${syncLog.google_event_id}`, {
              method: 'PUT',
              headers: authHeader,
              body: JSON.stringify(eventBody),
            })
            if (updateResp.ok) {
              const updated = await updateResp.json()
              googleEventId = updated.id
              results.push({ type: 'open_house', id: oh.id, google_event_id: googleEventId, status: 'updated' })
            } else {
              // Event may have been deleted on Google side — create new
              const createResp = await fetch(`${CALENDAR_API}/calendars/${calId}/events`, {
                method: 'POST',
                headers: authHeader,
                body: JSON.stringify(eventBody),
              })
              if (createResp.ok) {
                const created = await createResp.json()
                googleEventId = created.id
                results.push({ type: 'open_house', id: oh.id, google_event_id: googleEventId, status: 'recreated' })
              } else {
                const errText = await createResp.text().catch(() => '')
                results.push({ type: 'open_house', id: oh.id, google_event_id: null, status: 'error', error: errText.slice(0, 200) })
                continue
              }
            }
          } else {
            // Create new event
            const createResp = await fetch(`${CALENDAR_API}/calendars/${calId}/events`, {
              method: 'POST',
              headers: authHeader,
              body: JSON.stringify(eventBody),
            })
            if (createResp.ok) {
              const created = await createResp.json()
              googleEventId = created.id
              results.push({ type: 'open_house', id: oh.id, google_event_id: googleEventId, status: 'created' })
            } else {
              const errText = await createResp.text().catch(() => '')
              results.push({ type: 'open_house', id: oh.id, google_event_id: null, status: 'error', error: errText.slice(0, 200) })
              continue
            }
          }

          // Upsert sync log
          if (googleEventId) {
            await supabase
              .from('google_calendar_sync_log')
              .upsert({
                source_type: 'open_house',
                source_id: oh.id,
                google_event_id: googleEventId,
                google_calendar_id: calId,
                last_synced_at: new Date().toISOString(),
                sync_direction: 'push',
              }, { onConflict: 'source_type,source_id' })
          }
        } catch (e) {
          results.push({ type: 'open_house', id: oh.id, google_event_id: null, status: 'error', error: e.message })
        }
      }

      // 2. Push buyer showings
      const { data: showings } = await supabase
        .from('buyer_showings')
        .select('*, contact:contacts(name)')
        .is('deleted_at', null)
        .gte('showing_date', new Date().toISOString().slice(0, 10))

      for (const showing of (showings || [])) {
        try {
          const startDateTime = showing.showing_date && showing.showing_time
            ? `${showing.showing_date}T${showing.showing_time}:00`
            : showing.showing_date ? `${showing.showing_date}T12:00:00` : null

          if (!startDateTime) {
            results.push({ type: 'buyer_showing', id: showing.id, google_event_id: null, status: 'skipped', error: 'No date' })
            continue
          }

          // Default 1-hour showing
          const endDate = new Date(new Date(startDateTime).getTime() + 60 * 60 * 1000)
          const endDateTime = endDate.toISOString().replace('Z', '').slice(0, 19)

          const buyerName = showing.contact?.name || showing.buyer_name || 'Buyer'

          const eventBody: Record<string, any> = {
            summary: `Showing: ${showing.address || showing.property_address || 'TBD'} (${buyerName})`,
            description: [
              `Buyer: ${buyerName}`,
              showing.notes || '',
              showing.lockbox_code ? `Lockbox: ${showing.lockbox_code}` : '',
              showing.access_notes || '',
            ].filter(Boolean).join('\n'),
            start: { dateTime: startDateTime, timeZone: 'America/Phoenix' },
            end: { dateTime: endDateTime, timeZone: 'America/Phoenix' },
            location: showing.address || showing.property_address || '',
            colorId: '9', // blueberry for showings
          }

          // Check if already synced
          const { data: syncLog } = await supabase
            .from('google_calendar_sync_log')
            .select('google_event_id')
            .eq('source_type', 'buyer_showing')
            .eq('source_id', showing.id)
            .maybeSingle()

          let googleEventId: string | null = null

          if (syncLog?.google_event_id) {
            const updateResp = await fetch(`${CALENDAR_API}/calendars/${calId}/events/${syncLog.google_event_id}`, {
              method: 'PUT',
              headers: authHeader,
              body: JSON.stringify(eventBody),
            })
            if (updateResp.ok) {
              const updated = await updateResp.json()
              googleEventId = updated.id
              results.push({ type: 'buyer_showing', id: showing.id, google_event_id: googleEventId, status: 'updated' })
            } else {
              const createResp = await fetch(`${CALENDAR_API}/calendars/${calId}/events`, {
                method: 'POST',
                headers: authHeader,
                body: JSON.stringify(eventBody),
              })
              if (createResp.ok) {
                const created = await createResp.json()
                googleEventId = created.id
                results.push({ type: 'buyer_showing', id: showing.id, google_event_id: googleEventId, status: 'recreated' })
              } else {
                const errText = await createResp.text().catch(() => '')
                results.push({ type: 'buyer_showing', id: showing.id, google_event_id: null, status: 'error', error: errText.slice(0, 200) })
                continue
              }
            }
          } else {
            const createResp = await fetch(`${CALENDAR_API}/calendars/${calId}/events`, {
              method: 'POST',
              headers: authHeader,
              body: JSON.stringify(eventBody),
            })
            if (createResp.ok) {
              const created = await createResp.json()
              googleEventId = created.id
              results.push({ type: 'buyer_showing', id: showing.id, google_event_id: googleEventId, status: 'created' })
            } else {
              const errText = await createResp.text().catch(() => '')
              results.push({ type: 'buyer_showing', id: showing.id, google_event_id: null, status: 'error', error: errText.slice(0, 200) })
              continue
            }
          }

          if (googleEventId) {
            await supabase
              .from('google_calendar_sync_log')
              .upsert({
                source_type: 'buyer_showing',
                source_id: showing.id,
                google_event_id: googleEventId,
                google_calendar_id: calId,
                last_synced_at: new Date().toISOString(),
                sync_direction: 'push',
              }, { onConflict: 'source_type,source_id' })
          }
        } catch (e) {
          results.push({ type: 'buyer_showing', id: showing.id, google_event_id: null, status: 'error', error: e.message })
        }
      }

      return new Response(
        JSON.stringify({ ok: true, action: 'push', synced: results.length, results }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Action: PULL ─────────────────────────────────────────────────────────
    if (action === 'pull') {
      const now = new Date()
      const defaultMin = time_min || now.toISOString()
      const defaultMax = time_max || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const params = new URLSearchParams({
        timeMin: defaultMin,
        timeMax: defaultMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      })

      const eventsResp = await fetch(`${CALENDAR_API}/calendars/${calId}/events?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${tokens.access_token}` },
      })

      if (!eventsResp.ok) {
        const errText = await eventsResp.text().catch(() => '')
        return new Response(
          JSON.stringify({ error: `Google Calendar API error (${eventsResp.status})`, detail: errText.slice(0, 300), code: 'calendar_api_error' }),
          { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const eventsData = await eventsResp.json()
      const events = (eventsData.items || []).map((evt: any) => ({
        id: evt.id,
        summary: evt.summary || '(No title)',
        description: evt.description || '',
        location: evt.location || '',
        start: evt.start?.dateTime || evt.start?.date || null,
        end: evt.end?.dateTime || evt.end?.date || null,
        status: evt.status,
        html_link: evt.htmlLink || null,
        color_id: evt.colorId || null,
        created: evt.created,
        updated: evt.updated,
        organizer: evt.organizer?.email || null,
      }))

      return new Response(
        JSON.stringify({ ok: true, action: 'pull', count: events.length, events }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('google-calendar-sync error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error', code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

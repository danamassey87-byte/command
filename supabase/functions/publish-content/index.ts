// ─────────────────────────────────────────────────────────────────────────────
// publish-content — publishes or schedules a social media post via Blotato API.
//
// Called by:
//   - PostComposer "Publish Now" button
//   - PostComposer "Schedule" button
//   - Future: cron-triggered dispatch for scheduled posts
//
// Expects JSON body:
//   { platform_post_id: uuid, action: 'publish_now' | 'schedule', scheduled_for?: string }
//
// Flow:
//   1. Load platform post + parent content piece
//   2. Upload media to Blotato if present
//   3. Create post via Blotato POST /v2/posts
//   4. Update platform_post status + blotato_post_id
//   5. Create/update content_publish_queue row
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BLOTATO_API = 'https://api.blotato.com/v2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const blotatoKey = Deno.env.get('BLOTATO_API_KEY')
    if (!blotatoKey) {
      return new Response(
        JSON.stringify({ error: 'BLOTATO_API_KEY is not configured. Add it in Supabase Edge Function secrets.', code: 'missing_api_key' }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { platform_post_id, action, scheduled_for } = await req.json()

    if (!platform_post_id || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing platform_post_id or action' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Load platform post + content piece
    const { data: platformPost, error: ppErr } = await supabase
      .from('content_platform_posts')
      .select('*, content:content_pieces(*)')
      .eq('id', platform_post_id)
      .single()

    if (ppErr || !platformPost) {
      return new Response(
        JSON.stringify({ error: 'Platform post not found', detail: ppErr?.message }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const contentPiece = platformPost.content
    const postText = platformPost.adapted_text || contentPiece?.body_text || ''
    const hashtagStr = platformPost.hashtags || ''
    const fullText = hashtagStr ? `${postText}\n\n${hashtagStr}` : postText
    const mediaUrls: Array<{ url: string; type: string }> = platformPost.media_urls || []

    // 2. Update status to publishing
    await supabase
      .from('content_platform_posts')
      .update({ status: 'publishing' })
      .eq('id', platform_post_id)

    // 3. Upload media to Blotato if present
    const mediaIds: string[] = []
    for (const media of mediaUrls) {
      try {
        const mediaResp = await fetch(`${BLOTATO_API}/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${blotatoKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: media.url,
            type: media.type || 'image',
          }),
        })
        if (mediaResp.ok) {
          const mediaData = await mediaResp.json()
          if (mediaData.media_id) mediaIds.push(mediaData.media_id)
        } else {
          console.error('Blotato media upload failed:', await mediaResp.text())
        }
      } catch (err) {
        console.error('Blotato media upload error:', err)
      }
    }

    // 4. Create post via Blotato
    // Load Blotato account config from user_settings
    const { data: settingsRow } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'blotato_config')
      .single()

    const blotatoConfig = settingsRow?.value || {}
    const connectedPlatforms: Array<{ platform: string; account_id: string }> =
      blotatoConfig.connected_platforms || []

    // Find matching Blotato account for this platform
    const matchingAccount = connectedPlatforms.find(
      (cp: any) => cp.platform === platformPost.platform
    )

    const postBody: Record<string, any> = {
      text: fullText,
      platform: platformPost.platform,
    }

    if (matchingAccount?.account_id) {
      postBody.account_id = matchingAccount.account_id
    }

    if (mediaIds.length > 0) {
      postBody.media_ids = mediaIds
    }

    if (action === 'schedule' && scheduled_for) {
      postBody.scheduled_time = scheduled_for
    }

    const postResp = await fetch(`${BLOTATO_API}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${blotatoKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postBody),
    })

    const postResult = await postResp.json()

    if (!postResp.ok) {
      // Update status to failed
      await supabase
        .from('content_platform_posts')
        .update({
          status: 'failed',
        })
        .eq('id', platform_post_id)

      // Create publish queue entry with error
      await supabase
        .from('content_publish_queue')
        .insert({
          platform_post_id,
          status: 'failed',
          error_message: postResult?.error || postResult?.message || JSON.stringify(postResult),
          scheduled_for: scheduled_for || null,
        })

      return new Response(
        JSON.stringify({
          error: 'Blotato API error',
          detail: postResult?.error || postResult?.message || 'Unknown error',
          code: 'blotato_error',
        }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Success — update records
    const blotatoPostId = postResult.post_id || postResult.id || null
    const newStatus = action === 'schedule' ? 'scheduled' : 'published'
    const now = new Date().toISOString()

    await supabase
      .from('content_platform_posts')
      .update({
        status: newStatus,
        blotato_post_id: blotatoPostId,
        published_at: action === 'publish_now' ? now : null,
        scheduled_for: action === 'schedule' ? scheduled_for : null,
      })
      .eq('id', platform_post_id)

    // Create publish queue entry
    await supabase
      .from('content_publish_queue')
      .insert({
        platform_post_id,
        blotato_post_id: blotatoPostId,
        status: newStatus,
        scheduled_for: action === 'schedule' ? scheduled_for : null,
        published_at: action === 'publish_now' ? now : null,
      })

    return new Response(
      JSON.stringify({
        ok: true,
        blotato_post_id: blotatoPostId,
        status: newStatus,
        published_at: action === 'publish_now' ? now : null,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('publish-content error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error', code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// fetch-social-stats — Runs an Apify actor to scrape Instagram or Facebook
// data and returns a normalized payload. Called by the frontend "Sync now"
// button. DB writes happen client-side through the normal supabase client so
// we keep RLS and avoid handling the service-role key here.
//
// Request body:
//   {
//     platform: 'instagram' | 'facebook',
//     handle:   string,       // e.g. '@wright_mode' or 'DanaMasseyRE'
//     apify_key: string,      // Apify API token
//     limit?:   number        // max posts to scrape (default 30)
//   }
//
// Response body:
//   {
//     ok: true,
//     platform,
//     profile: {
//       followers, following, posts_count, bio, profile_url, name
//     },
//     posts: [
//       {
//         post_url, caption, posted_at,
//         likes, comments, shares, saves, views, reach, impressions,
//         type   // 'image' | 'video' | 'reel' | 'story' | 'post'
//       }
//     ]
//   }
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Apify actor IDs (URL-safe form with ~)
const ACTORS = {
  instagram: 'apify~instagram-scraper',
  facebook:  'apify~facebook-pages-scraper',
}

function normalizeHandle(handle: string, platform: string): string {
  const h = handle.trim().replace(/^@/, '')
  if (platform === 'instagram') return `https://www.instagram.com/${h}/`
  if (platform === 'facebook')  return `https://www.facebook.com/${h}/`
  return h
}

async function runActor(actorId: string, input: unknown, token: string) {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Apify actor ${actorId} failed (${res.status}): ${err.slice(0, 400)}`)
  }
  return await res.json() as Array<Record<string, unknown>>
}

// ─── Normalizers ───────────────────────────────────────────────────────────

type NormalizedPost = {
  post_url: string
  caption: string
  posted_at: string | null
  likes: number
  comments: number
  shares: number
  saves: number
  views: number
  reach: number
  impressions: number
  type: string
}

function toInt(v: unknown): number {
  if (typeof v === 'number') return Math.round(v)
  if (typeof v === 'string') {
    const n = parseInt(v.replace(/[^0-9]/g, ''), 10)
    return isNaN(n) ? 0 : n
  }
  return 0
}

function normalizeInstagram(items: Array<Record<string, any>>) {
  // apify/instagram-scraper returns a list of posts when resultsType='posts',
  // OR a mix including profile details depending on the input.
  // Profile info is typically on each post (ownerUsername, followersCount)
  // OR delivered as the first item when type='details'.

  let profile: Record<string, any> = {}
  const posts: NormalizedPost[] = []

  for (const item of items) {
    if (item.type === 'Post' || item.shortCode || item.url?.includes?.('/p/') || item.url?.includes?.('/reel/')) {
      posts.push({
        post_url:    String(item.url || item.shortCode || ''),
        caption:     String(item.caption || ''),
        posted_at:   item.timestamp ? new Date(item.timestamp as string).toISOString() : null,
        likes:       toInt(item.likesCount),
        comments:    toInt(item.commentsCount),
        shares:      0,
        saves:       0,
        views:       toInt(item.videoViewCount ?? item.videoPlayCount),
        reach:       0,
        impressions: 0,
        type:        item.productType === 'clips' ? 'reel' : (item.type || 'post').toLowerCase(),
      })

      // Pull profile fields from the first post we see
      if (!profile.followers && item.ownerUsername) {
        profile = {
          followers:   toInt(item.ownerFollowers ?? item.followersCount),
          following:   toInt(item.ownerFollowing ?? item.followsCount),
          posts_count: toInt(item.ownerPostsCount ?? item.postsCount),
          bio:         String(item.ownerBiography ?? item.biography ?? ''),
          profile_url: `https://www.instagram.com/${item.ownerUsername}/`,
          name:        String(item.ownerFullName ?? item.fullName ?? item.ownerUsername),
        }
      }
    } else if (item.username || item.followersCount != null) {
      // Profile detail row
      profile = {
        followers:   toInt(item.followersCount),
        following:   toInt(item.followsCount),
        posts_count: toInt(item.postsCount),
        bio:         String(item.biography ?? ''),
        profile_url: String(item.url ?? ''),
        name:        String(item.fullName ?? item.username ?? ''),
      }
    }
  }

  return { profile, posts }
}

function normalizeFacebook(items: Array<Record<string, any>>) {
  let profile: Record<string, any> = {}
  const posts: NormalizedPost[] = []

  for (const item of items) {
    // apify/facebook-pages-scraper returns the page as the first item
    // with `posts` array nested OR emits separate post items.
    if (item.pageUrl || item.likes != null || item.followers != null) {
      profile = {
        followers:   toInt(item.followers ?? item.followersCount),
        following:   0,
        posts_count: toInt(item.postsCount),
        bio:         String(item.intro ?? item.about ?? ''),
        profile_url: String(item.pageUrl ?? item.url ?? ''),
        name:        String(item.title ?? item.name ?? ''),
      }

      // Nested posts shape
      if (Array.isArray(item.posts)) {
        for (const p of item.posts) {
          posts.push({
            post_url:    String(p.url ?? p.postUrl ?? ''),
            caption:     String(p.text ?? p.message ?? ''),
            posted_at:   p.time ? new Date(p.time as string).toISOString() : null,
            likes:       toInt(p.likes ?? p.likesCount ?? p.reactionsCount),
            comments:    toInt(p.comments ?? p.commentsCount),
            shares:      toInt(p.shares ?? p.sharesCount),
            saves:       0,
            views:       toInt(p.viewsCount ?? p.videoViewCount),
            reach:       0,
            impressions: 0,
            type:        p.type || 'post',
          })
        }
      }
    } else if (item.postUrl || item.text || item.time) {
      // Post-only shape
      posts.push({
        post_url:    String(item.postUrl ?? item.url ?? ''),
        caption:     String(item.text ?? item.message ?? ''),
        posted_at:   item.time ? new Date(item.time as string).toISOString() : null,
        likes:       toInt(item.likes ?? item.likesCount ?? item.reactionsCount),
        comments:    toInt(item.comments ?? item.commentsCount),
        shares:      toInt(item.shares ?? item.sharesCount),
        saves:       0,
        views:       toInt(item.viewsCount ?? item.videoViewCount),
        reach:       0,
        impressions: 0,
        type:        item.type || 'post',
      })
    }
  }

  return { profile, posts }
}

// ─── Handler ───────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { platform, handle, apify_key, limit = 30 } = await req.json()

    if (!apify_key) throw new Error('apify_key is required')
    if (!platform)  throw new Error('platform is required')
    if (!handle)    throw new Error('handle is required')

    const actorId = ACTORS[platform as keyof typeof ACTORS]
    if (!actorId) throw new Error(`Unsupported platform: ${platform}`)

    const url = normalizeHandle(handle, platform)

    // Build actor-specific input
    let input: unknown
    if (platform === 'instagram') {
      input = {
        directUrls:    [url],
        resultsType:   'posts',
        resultsLimit:  limit,
        addParentData: true,
      }
    } else if (platform === 'facebook') {
      input = {
        startUrls:    [{ url }],
        resultsLimit: limit,
      }
    }

    const items = await runActor(actorId, input, apify_key)

    const normalized = platform === 'instagram'
      ? normalizeInstagram(items)
      : normalizeFacebook(items)

    return new Response(
      JSON.stringify({
        ok:       true,
        platform,
        handle,
        fetched_at: new Date().toISOString(),
        profile:  normalized.profile,
        posts:    normalized.posts,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

/**
 * auto-generate-content
 *
 * Called daily via pg_cron or external scheduler.
 * Reads auto_content_config from user_settings, then for each active avatar:
 *  1. Picks the day's format slot (Mon=Reel, Tue=Carousel, etc.)
 *  2. Generates an IG post via generate-content edge function
 *  3. Adapts for FB and all other configured platforms
 *  4. Saves as content_pieces + platform_posts (draft or auto-publish)
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const WEEKLY_SLOTS = [
  { day: 0, format: 'STORY',          topic: 'Client win / testimonial / just sold',         niche: 'SOCIAL PROOF' },
  { day: 1, format: 'REEL',           topic: 'Area spotlight — bars, restaurants, things to do', niche: 'LOCAL' },
  { day: 2, format: 'CAROUSEL',       topic: 'Me as Expert — market stats, tips',             niche: 'AUTHORITY' },
  { day: 3, format: 'STORY',          topic: 'Coffee & Contracts — Q&A, behind the scenes',   niche: 'PERSONAL' },
  { day: 4, format: 'REEL',           topic: "Houses I'd Send My Buyers — curated picks",     niche: 'LISTINGS' },
  { day: 5, format: 'CAROUSEL',       topic: 'Home buyer tips & tricks',                      niche: 'EDUCATION' },
  { day: 6, format: 'STORY / REEL',   topic: 'Life Lately / Day in the Life',                 niche: 'LIFESTYLE' },
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const apiKey      = Deno.env.get('ANTHROPIC_API_KEY')

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set', code: 'missing_api_key' }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // ─── Load config ──────────────────────────────────────────────────────
    const { data: configRow } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'auto_content_config')
      .maybeSingle()

    const config = configRow?.value || {}
    if (!config.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: 'Auto-content is disabled' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const platforms = config.platforms || ['instagram', 'facebook']
    const autoPublish = config.auto_publish || false

    // ─── Load avatars ─────────────────────────────────────────────────────
    let avatarQuery = supabase.from('client_avatars').select('*')
    if (config.avatar_ids?.length) {
      avatarQuery = avatarQuery.in('id', config.avatar_ids)
    }
    const { data: avatars } = await avatarQuery
    if (!avatars?.length) {
      return new Response(JSON.stringify({ skipped: true, reason: 'No avatars found' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    // ─── Load content rules ───────────────────────────────────────────────
    const { data: rulesRow } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'content_rules')
      .maybeSingle()
    const contentRules = Array.isArray(rulesRow?.value) ? rulesRow.value : []

    // ─── Load brand context ───────────────────────────────────────────────
    const { data: brandRow } = await supabase
      .from('user_settings')
      .select('value')
      .eq('key', 'brand_profile')
      .maybeSingle()

    let brandContext = ''
    if (brandRow?.value) {
      const b = brandRow.value
      const parts: string[] = []
      if (b.signature?.full_name) parts.push(`Agent: ${b.signature.full_name}`)
      if (b.signature?.brokerage) parts.push(`Brokerage: ${b.signature.brokerage}`)
      if (b.guidelines?.tone_of_voice) parts.push(`Voice: ${b.guidelines.tone_of_voice}`)
      if (parts.length) brandContext = '\n' + parts.join('. ') + '.'
    }

    // ─── Today's slot ─────────────────────────────────────────────────────
    const today = new Date()
    const dayOfWeek = today.getDay() // 0=Sun
    const slot = WEEKLY_SLOTS[dayOfWeek]
    const todayISO = today.toISOString().slice(0, 10)

    // ─── Generate for each avatar ─────────────────────────────────────────
    const results: Array<{ avatar: string; piece_id: string; platforms: string[] }> = []

    for (const avatar of avatars) {
      const avatarDesc = [
        `${avatar.name} (${avatar.type})`,
        avatar.age_range && `Age: ${avatar.age_range}`,
        avatar.motivation && `Motivation: ${avatar.motivation}`,
        avatar.pain_points && `Pain: ${avatar.pain_points}`,
        avatar.content_resonates && `Responds to: ${avatar.content_resonates}`,
      ].filter(Boolean).join('. ')

      const rulesBlock = contentRules.length
        ? '\n\nHARD RULES:\n' + contentRules.map(r => `- ${r}`).join('\n')
        : ''

      const systemPrompt = `You are a content writer for a real estate agent in the East Valley / Gilbert, AZ market.${brandContext}${rulesBlock}

Write in a warm, confident, authentic voice. Engaging, helpful, not salesy. No hashtags in the body.`

      const userPrompt = `Write a ${slot.format} caption for ${slot.niche} content.

Today's theme: ${slot.topic}

TARGET AUDIENCE: ${avatarDesc}

Write for Instagram first. Make it scroll-stopping, personal, and actionable. The format is ${slot.format} — ${slot.format === 'REEL' ? 'so write a short, punchy script with a strong hook' : slot.format === 'CAROUSEL' ? 'so write slide-by-slide content (Slide 1: hook, Slide 2-6: value, Final: CTA)' : 'so keep it short, visual, and direct'}.

Output ONLY the caption/script. No labels, no "Slide 1:" headers unless carousel.`

      // Call Anthropic directly
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      })

      if (!response.ok) {
        console.error(`Anthropic error for avatar ${avatar.name}:`, response.status)
        continue
      }

      const result = await response.json()
      const mainCaption = result.content?.[0]?.text ?? ''
      if (!mainCaption) continue

      // ─── Create content piece ──────────────────────────────────────────
      const { data: piece } = await supabase
        .from('content_pieces')
        .insert({
          title: `${slot.niche}: ${avatar.name} — ${slot.topic}`.slice(0, 80),
          body_text: mainCaption,
          content_date: todayISO,
          avatar_id: avatar.id,
          status: autoPublish ? 'scheduled' : 'draft',
          notes: `Auto-generated for ${avatar.name} (${slot.format} / ${slot.niche})`,
          channel: 'instagram',
        })
        .select()
        .single()

      if (!piece?.id) continue

      // ─── Create platform posts (IG first, then adapt others) ───────────
      // Save IG version
      await supabase.from('content_platform_posts').insert({
        content_id: piece.id,
        platform: 'instagram',
        adapted_text: mainCaption,
        char_count: mainCaption.length,
        status: autoPublish ? 'scheduled' : 'draft',
      })

      // Adapt for other platforms
      const otherPlatforms = platforms.filter(p => p !== 'instagram')
      if (otherPlatforms.length > 0) {
        const adaptPrompt = `I have this Instagram caption:

"${mainCaption}"

Repurpose it for each of these platforms, adapting tone, length, and format:
${otherPlatforms.join(', ')}

Platform guidance:
- facebook: conversational, longer form ok, community feel
- tiktok: hook in first sentence, short punchy lines, trending energy
- linkedin: professional tone, insight-driven, no fluff
- youtube: video description, structured, can be longer
- twitter: under 280 chars, punchy
- threads: short, conversational
- pinterest: descriptive, keyword-rich
- gmb: local focus, include location
- nextdoor: hyper-local, neighborly tone

Return ONLY valid JSON: {"platform": "adapted text", ...}`

        const adaptResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: 'user', content: adaptPrompt }],
          }),
        })

        if (adaptResp.ok) {
          const adaptResult = await adaptResp.json()
          const adaptText = adaptResult.content?.[0]?.text ?? ''
          try {
            const jsonMatch = adaptText.match(/\{[\s\S]*\}/)
            const adapted = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
            for (const [plat, text] of Object.entries(adapted)) {
              if (typeof text === 'string' && platforms.includes(plat)) {
                await supabase.from('content_platform_posts').insert({
                  content_id: piece.id,
                  platform: plat,
                  adapted_text: text,
                  char_count: text.length,
                  status: autoPublish ? 'scheduled' : 'draft',
                })
              }
            }
          } catch { /* JSON parse failed — non-fatal */ }
        }
      }

      results.push({ avatar: avatar.name, piece_id: piece.id, platforms })
    }

    return new Response(JSON.stringify({
      generated: results.length,
      date: todayISO,
      slot: slot.topic,
      format: slot.format,
      results,
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('auto-generate-content error:', err)
    return new Response(JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      code: 'internal_error',
    }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})

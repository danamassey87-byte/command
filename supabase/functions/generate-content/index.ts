import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a content writer for Dana Massey, a real estate agent at Antigravity Real Estate in the East Valley / Gilbert, AZ market.

Write in Dana's voice: warm, confident, knowledgeable, and authentic. She helps buyers, sellers, and investors in the Phoenix metro area. Her content should feel like it's coming from a real person who loves real estate and her community — not a corporate marketing account.

Keep content valuable, honest, and action-oriented. Avoid buzzwords like "dream home" or "hot market" unless used ironically.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const { type, pillar, prompt, body_text, platform, active_platforms } = await req.json()

    let userMessage = ''

    if (type === 'write') {
      // Generate main copy from a short prompt
      userMessage = `Write a social media post for the content pillar: "${pillar || 'Real Estate'}".

Topic / idea: ${prompt}

Write engaging, authentic copy. Conversational tone, genuinely helpful, not salesy. Don't include hashtags in the body — those go in notes. Just the post copy itself.`

    } else if (type === 'repurpose') {
      // Repurpose main copy across all active platforms at once
      userMessage = `I have this content piece:

"${body_text}"

Repurpose it for each of these platforms, adapting tone, length, and format for each:
${active_platforms.join(', ')}

Platform guidance:
- instagram: punchy, visual, storytelling, 1-3 short paragraphs, emoji ok
- facebook: conversational, longer form ok, community feel
- tiktok: hook in first sentence, short punchy lines, trending energy
- youtube: video script or description, can be longer
- linkedin: professional tone, insight-driven, no fluff
- email: subject line on first line then body, personal and direct
- twitter: under 280 chars, punchy, can be a thread opener
- stories: ultra-short, 1-2 sentences max, visual + action-driven

Return ONLY a valid JSON object with platform keys mapping to adapted text. No extra commentary. Example:
{"instagram": "...", "facebook": "...", "tiktok": "..."}`

    } else if (type === 'adapt') {
      // Adapt main copy for one specific platform
      const hints: Record<string, string> = {
        instagram: 'punchy, visual, 1-3 short paragraphs, emoji ok, storytelling',
        facebook: 'conversational, longer form ok, community-focused',
        tiktok: 'hook in first sentence, short punchy lines, high energy',
        youtube: 'video script or description, structured, can be longer',
        linkedin: 'professional, insight-driven, no filler phrases',
        email: 'start with subject line, then body copy — personal and direct',
        twitter: 'under 280 chars, punchy, thread-opener style',
        stories: 'ultra-short, 1-2 sentences, visual and action-driven',
      }
      userMessage = `Adapt this content for ${platform}:

"${body_text}"

Format guidance for ${platform}: ${hints[platform] || 'platform-appropriate tone and length'}.

Output just the adapted copy, nothing else.`
    }

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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    const result = await response.json()
    const text = result.content?.[0]?.text ?? ''

    // For repurpose, parse JSON from Claude's response
    if (type === 'repurpose') {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        return new Response(JSON.stringify({ platforms: parsed }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      } catch {
        return new Response(JSON.stringify({ platforms: {}, raw: text }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

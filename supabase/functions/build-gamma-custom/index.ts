// ─────────────────────────────────────────────────────────────────────────────
// build-gamma-custom — generates non-listing presentations via Gamma API.
//
// Supports: buyer consultations, CMAs, market reports, OH recaps, custom decks.
// Flow: Claude → slide outline → Gamma generation → poll → return URL.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GAMMA_API = 'https://public-api.gamma.app/v1.0'

const TYPE_PROMPTS: Record<string, string> = {
  buyer_consult: `Create a buyer consultation presentation for a real estate agent meeting with a potential buyer client.
Include: intro/credentials, current market conditions, the buying process timeline, financing overview, what to expect at showings, how the agent adds value, and next steps/CTA.`,

  cma: `Create a Comparative Market Analysis (CMA) presentation for a real estate agent.
Include: subject property overview, methodology, comparable sold properties (3-5), active competition, market trends chart concept, pricing recommendation, and agent credentials.`,

  market_report: `Create a monthly/quarterly real estate market report presentation.
Include: key market stats (median price, DOM, inventory), year-over-year trends, neighborhood spotlights, buyer vs seller market indicators, forecast/outlook, and agent branding/contact.`,

  open_house_recap: `Create a post-open-house recap presentation for a listing agent to share with the seller.
Include: attendance summary, visitor feedback themes, showing activity comparison, marketing reach stats, agent recommendations for next steps, and timeline.`,

  custom: `Create a professional real estate presentation based on the user's notes below.`,
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const gammaKey = Deno.env.get('GAMMA_API_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

    if (!gammaKey) {
      return new Response(
        JSON.stringify({ error: 'GAMMA_API_KEY is not configured.', code: 'missing_api_key' }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const { title, strategy_text, presentation_type } = await req.json()

    if (!title) {
      return new Response(
        JSON.stringify({ error: 'Missing title' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Build slide outline via Claude
    let slideOutline = ''
    const typePrompt = TYPE_PROMPTS[presentation_type] || TYPE_PROMPTS.custom

    if (anthropicKey) {
      try {
        const claudeResp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            system: `You are a presentation designer for Dana Massey, a real estate agent at REAL Broker in the East Valley / Gilbert, AZ market. Convert instructions into a concise, compelling slide outline for Gamma.app. Use clear slide titles and bullet points. Keep it under 12 slides. Make it look professional and high-end.`,
            messages: [{ role: 'user', content: `${typePrompt}\n\nTitle: ${title}\n\nAdditional notes from the agent:\n${strategy_text || 'None provided — use best practices for this type of presentation.'}\n\nFormat as a presentation outline with slide titles and key bullet points.` }],
          }),
        })
        if (claudeResp.ok) {
          const result = await claudeResp.json()
          slideOutline = result.content?.[0]?.text || ''
        }
      } catch (e) {
        console.error('Claude outline failed:', e)
      }
    }

    // Fallback
    if (!slideOutline) {
      slideOutline = `${title}\n\nDana Massey — REAL Broker\nEast Valley / Gilbert, AZ\n\n${strategy_text || typePrompt}`
    }

    // 2. Send to Gamma
    const gammaResp = await fetch(`${GAMMA_API}/generations`, {
      method: 'POST',
      headers: {
        'X-API-KEY': gammaKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: slideOutline,
        style: 'professional',
        title,
      }),
    })

    if (!gammaResp.ok) {
      const errText = await gammaResp.text().catch(() => '')
      return new Response(
        JSON.stringify({ error: `Gamma API error (${gammaResp.status}): ${errText.slice(0, 300)}`, code: 'gamma_error' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const gammaResult = await gammaResp.json()
    const gammaUrl = gammaResult.url || gammaResult.presentation_url || gammaResult.edit_url || null
    const gammaId = gammaResult.id || gammaResult.generation_id || null

    // 3. Poll if async
    let finalUrl = gammaUrl
    if (!finalUrl && gammaId) {
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 5000))
        try {
          const pollResp = await fetch(`${GAMMA_API}/generations/${gammaId}`, {
            headers: { 'X-API-KEY': gammaKey },
          })
          if (pollResp.ok) {
            const pollData = await pollResp.json()
            if (pollData.status === 'completed' || pollData.url) {
              finalUrl = pollData.url || pollData.presentation_url || pollData.edit_url
              break
            }
            if (pollData.status === 'failed') {
              throw new Error('Gamma generation failed')
            }
          }
        } catch (e) {
          console.error('Gamma poll error:', e)
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        url: finalUrl,
        gamma_id: gammaId,
        status: finalUrl ? 'ready' : 'generating',
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('build-gamma-custom error:', err)
    return new Response(
      JSON.stringify({ error: message, code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

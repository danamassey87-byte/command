// ─────────────────────────────────────────────────────────────────────────────
// build-presentation — generates a listing presentation via Gamma API.
//
// Flow:
//   1. Receive listing_id + strategy text + optional photos
//   2. Claude transforms strategy → slide outline
//   3. POST to Gamma API to generate presentation
//   4. Poll until complete → update listing record with URL
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GAMMA_API = 'https://api.gamma.app/v1'

serve(async (req) => {
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { listing_id, strategy_text, photos } = await req.json()

    if (!listing_id) {
      return new Response(
        JSON.stringify({ error: 'Missing listing_id' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Load listing + property data
    const { data: listing, error: listErr } = await supabase
      .from('listings')
      .select('*, property:properties(*)')
      .eq('id', listing_id)
      .single()

    if (listErr || !listing) {
      return new Response(
        JSON.stringify({ error: 'Listing not found', detail: listErr?.message }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Mark as generating
    await supabase
      .from('listings')
      .update({ presentation_status: 'generating' })
      .eq('id', listing_id)

    const property = listing.property || {}
    const addr = property.address || 'Property'
    const city = property.city || ''
    const price = property.price ? `$${Number(property.price).toLocaleString()}` : ''
    const specs = [
      property.bedrooms && `${property.bedrooms} bed`,
      property.bathrooms && `${property.bathrooms} bath`,
      property.sqft && `${Number(property.sqft).toLocaleString()} sqft`,
    ].filter(Boolean).join(' · ')

    // 3. Build slide outline from strategy text using Claude
    let slideOutline = ''
    if (anthropicKey && strategy_text) {
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
            system: 'You are a presentation designer. Convert real estate listing strategy text into a concise slide outline for Gamma.app. Use clear slide titles and bullet points. Keep it under 10 slides.',
            messages: [{ role: 'user', content: `Create a presentation outline for this property listing:\n\nAddress: ${addr}, ${city}\nPrice: ${price}\nSpecs: ${specs}\n\nStrategy:\n${strategy_text}\n\nFormat as a presentation outline with slide titles and key bullets. Include:\n1. Title slide with address and price\n2. Property highlights\n3. Neighborhood / lifestyle\n4. Market positioning\n5. Marketing strategy\n6. Timeline\n7. Why Dana Massey / REAL Broker\n8. Next steps / CTA` }],
          }),
        })
        if (claudeResp.ok) {
          const claudeResult = await claudeResp.json()
          slideOutline = claudeResult.content?.[0]?.text || ''
        }
      } catch (e) {
        console.error('Claude outline generation failed:', e)
      }
    }

    // Fallback outline if Claude fails
    if (!slideOutline) {
      slideOutline = `${addr}\n${city} · ${price} · ${specs}\n\n${strategy_text || 'Listing presentation for this property.'}`
    }

    // 4. Create presentation via Gamma API
    const gammaResp = await fetch(`${GAMMA_API}/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${gammaKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: slideOutline,
        style: 'professional',
        title: `${addr} — Listing Presentation`,
      }),
    })

    if (!gammaResp.ok) {
      const errText = await gammaResp.text().catch(() => '')
      await supabase
        .from('listings')
        .update({ presentation_status: 'none' })
        .eq('id', listing_id)

      return new Response(
        JSON.stringify({ error: `Gamma API error (${gammaResp.status}): ${errText.slice(0, 300)}`, code: 'gamma_error' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const gammaResult = await gammaResp.json()
    const gammaUrl = gammaResult.url || gammaResult.presentation_url || gammaResult.edit_url || null
    const gammaId = gammaResult.id || gammaResult.generation_id || null

    // 5. If async (has an ID but no URL yet), poll for completion
    let finalUrl = gammaUrl
    if (!finalUrl && gammaId) {
      // Poll up to 60 seconds
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 5000))
        try {
          const pollResp = await fetch(`${GAMMA_API}/generations/${gammaId}`, {
            headers: { 'Authorization': `Bearer ${gammaKey}` },
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

    // 6. Update listing record
    const now = new Date().toISOString()
    await supabase
      .from('listings')
      .update({
        presentation_url: finalUrl,
        presentation_status: finalUrl ? 'draft' : 'none',
        presentation_generated_at: finalUrl ? now : null,
      })
      .eq('id', listing_id)

    return new Response(
      JSON.stringify({
        ok: true,
        url: finalUrl,
        gamma_id: gammaId,
        status: finalUrl ? 'draft' : 'pending',
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('build-presentation error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error', code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

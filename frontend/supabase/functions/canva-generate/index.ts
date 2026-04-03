import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CANVA_API = 'https://api.canva.com/rest/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const canvaToken = Deno.env.get('CANVA_CLIENT_SECRET')
    if (!canvaToken) {
      throw new Error('CANVA_CLIENT_SECRET not configured')
    }

    const body = await req.json()

    // ─── Save a design candidate ───
    if (body.action === 'save') {
      const res = await fetch(`${CANVA_API}/autofills`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${canvaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_id: body.job_id,
          candidate_id: body.candidate_id,
        }),
      })
      const data = await res.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── List brand kits ───
    if (body.action === 'list_brand_kits') {
      const res = await fetch(`${CANVA_API}/brand-kits`, {
        headers: { Authorization: `Bearer ${canvaToken}` },
      })
      const data = await res.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ─── Generate designs ───
    const { prompt, design_types, brand_kit_id } = body
    if (!prompt || !design_types?.length) {
      throw new Error('prompt and design_types are required')
    }

    // Fetch brand kits to auto-detect if none provided
    let kitId = brand_kit_id
    if (!kitId) {
      const kitsRes = await fetch(`${CANVA_API}/brand-kits`, {
        headers: { Authorization: `Bearer ${canvaToken}` },
      })
      const kitsData = await kitsRes.json()
      kitId = kitsData.items?.[0]?.id ?? null
    }

    // Generate one design per type
    const results = await Promise.all(
      design_types.map(async (designType: string) => {
        const generateBody: Record<string, unknown> = {
          design_type: designType,
          query: prompt,
        }
        if (kitId) {
          generateBody.brand_kit_id = kitId
        }

        const res = await fetch(`${CANVA_API}/ai/designs`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${canvaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(generateBody),
        })

        const data = await res.json()

        // Normalize response to a consistent shape
        return {
          design_type: designType,
          job_id: data.job_id ?? null,
          candidates: (data.candidates ?? data.designs ?? []).map((c: Record<string, unknown>) => ({
            id: c.id ?? c.candidate_id,
            thumbnail_url: c.thumbnail?.url ?? c.thumbnail_url ?? null,
            preview_url: c.urls?.edit_url ?? c.edit_url ?? c.preview_url ?? null,
          })),
        }
      })
    )

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

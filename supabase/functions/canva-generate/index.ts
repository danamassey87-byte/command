import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CANVA_API = 'https://api.canva.com/rest/v1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIME_FOR_FORMAT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // L11: the Canva Connect API takes a bearer access token, NOT an OAuth
    // client secret (those two are not interchangeable in OAuth land — the
    // client secret is exchanged with the auth code for an access token).
    // The env var was misnamed. Accept both names for compatibility:
    //   • CANVA_API_KEY — preferred new name (per Canva docs)
    //   • CANVA_CLIENT_SECRET — legacy name; will be removed once Dana
    //     renames the secret in Supabase Function Secrets.
    const canvaToken = Deno.env.get('CANVA_API_KEY') || Deno.env.get('CANVA_CLIENT_SECRET')
    if (!canvaToken) {
      throw new Error('Canva token not configured (CANVA_API_KEY or legacy CANVA_CLIENT_SECRET)')
    }

    const body = await req.json()

    // ─── Export a design → upload PNG to Supabase storage → return public URL ───
    // Used by ListingContentModal "Use this design" after generation so the
    // rendered image can land in content_platform_posts.media_urls and be
    // handed to Blotato's POST /v2/media at publish time.
    if (body.action === 'export') {
      const designId = body.design_id
      const format = (body.format || 'png').toLowerCase()
      const contentType = MIME_FOR_FORMAT[format] || 'application/octet-stream'
      if (!designId) throw new Error('design_id is required for export action')

      // 1. Kick off the export job
      const initResp = await fetch(`${CANVA_API}/exports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${canvaToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          design_id: designId,
          format: { type: format },
        }),
      })
      const initData = await initResp.json()
      if (!initResp.ok) {
        return new Response(
          JSON.stringify({ error: 'Canva /exports init failed', detail: initData }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const jobId = initData?.job?.id ?? initData?.id
      let status: string = initData?.job?.status ?? initData?.status ?? 'in_progress'
      let urls: string[] = initData?.job?.urls ?? initData?.urls ?? []

      // M4: stay inside the 60s edge-function wall. Was 45 × 2s = 90s
      // which would get killed at 60s — the export succeeded on Canva's
      // side but never got downloaded into our storage. Now 25 × 2s =
      // 50s; on timeout we return 504 below and the client can re-invoke
      // the function (Canva's job_id stays valid).
      if (!urls.length && jobId) {
        for (let i = 0; i < 25 && status !== 'success' && status !== 'failed'; i++) {
          await new Promise(r => setTimeout(r, 2000))
          const pollResp = await fetch(`${CANVA_API}/exports/${jobId}`, {
            headers: { Authorization: `Bearer ${canvaToken}` },
          })
          if (!pollResp.ok) continue
          const pollData = await pollResp.json()
          status = pollData?.job?.status ?? pollData?.status ?? status
          if (status === 'success') {
            urls = pollData?.job?.urls ?? pollData?.urls ?? []
            break
          }
        }
      }

      if (status === 'failed') {
        return new Response(
          JSON.stringify({ error: 'Canva export job failed', jobId }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (!urls.length) {
        return new Response(
          JSON.stringify({ error: 'Canva export timed out before ready', jobId, status }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // 3. Download the rendered image
      const downloadResp = await fetch(urls[0])
      if (!downloadResp.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to download Canva export', status: downloadResp.status }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const fileBytes = new Uint8Array(await downloadResp.arrayBuffer())

      // 4. Upload to Supabase storage (canva-exports bucket)
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const path = `${designId}-${Date.now()}.${format}`
      const { error: upErr } = await supabase.storage
        .from('canva-exports')
        .upload(path, fileBytes, { contentType, upsert: true })
      if (upErr) {
        return new Response(
          JSON.stringify({ error: 'Storage upload failed', detail: upErr.message }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const { data: pub } = supabase.storage.from('canva-exports').getPublicUrl(path)

      return new Response(
        JSON.stringify({
          ok: true,
          design_id: designId,
          job_id: jobId,
          format,
          url: pub.publicUrl,
          bucket_path: path,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

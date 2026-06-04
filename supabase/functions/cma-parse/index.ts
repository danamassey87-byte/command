// ─────────────────────────────────────────────────────────────────────────────
// cma-parse — extracts structured comp data from an uploaded CMA PDF.
//
// Flow:
//   1. Frontend uploads CMA PDF to storage bucket `cma-uploads/<cma_id>.pdf`
//      and inserts a `cmas` row with parse_status='pending', file_path set.
//   2. Frontend calls this function with { cma_id }.
//   3. We download the PDF via service role, base64-encode, send to Claude
//      with a document content block.
//   4. Claude returns a JSON envelope: subject estimate + comps array.
//   5. We persist the subject fields on `cmas` and bulk-insert into
//      `cma_comps`. Set parse_status='parsed' on success / 'failed' on error.
//
// Idempotent on `cma_comps`: we delete existing comps for the cma_id before
// re-inserting, so re-running replaces them cleanly.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { logAiGeneration, anthropicCostCents } from '../_shared/replicate-notify.ts'
import { callAnthropic } from '../_shared/ai-bill.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const SYSTEM_PROMPT = `You are extracting structured comparable-sales data from a CMA PDF (Comparative Market Analysis) built in NARRPR or a similar tool.

Return STRICT JSON only — no commentary, no markdown fences. Schema:

{
  "subject": {
    "address": string | null,
    "estimate_low": number | null,
    "estimate_high": number | null,
    "recommended_price": number | null
  },
  "comps": [
    {
      "address": string,
      "city": string | null,
      "mls_id": string | null,
      "status": "sold" | "active" | "pending" | "expired" | "withdrawn" | null,
      "sale_price": number | null,
      "list_price": number | null,
      "sale_date": string | null,    // YYYY-MM-DD
      "sqft": integer | null,
      "beds": integer | null,
      "baths": number | null,
      "year_built": integer | null,
      "distance_miles": number | null,
      "dom": integer | null
    }
    // ... up to all comps in the document
  ]
}

Rules:
- Comps are typically labelled "Comp 1", "Comp 2", etc. Include every one you can identify.
- "status" — usually shown as Sold, Active, Pending. Map "Closed" to "sold". Lower-case the result.
- Dates: convert any format to YYYY-MM-DD. If only month/year is shown, use the 1st of the month.
- Prices: numeric only, no $ or commas. If a range is shown, use the higher value for sale_price.
- Don't invent data. If a field isn't visible in the PDF, return null for it.
- Skip any "subject property" entry from the comps array — that goes in subject.
- If you can't read the document at all, return { "subject": {...all nulls}, "comps": [], "error": "could not parse" }.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { cma_id } = await req.json().catch(() => ({}))
    if (!cma_id) return json({ error: 'cma_id is required' }, 400)

    // Load the cma row.
    const { data: cma, error: cmaErr } = await supabase
      .from('cmas')
      .select('id, file_path, file_url, parse_status')
      .eq('id', cma_id)
      .maybeSingle()
    if (cmaErr) return json({ error: `cmas load failed: ${cmaErr.message}` }, 500)
    if (!cma) return json({ error: 'cma not found' }, 404)
    if (!cma.file_path) return json({ error: 'cma has no file_path — upload PDF first' }, 400)

    // Mark parsing.
    await supabase.from('cmas').update({ parse_status: 'parsing', updated_at: new Date().toISOString() }).eq('id', cma_id)

    // Download PDF from storage.
    const { data: fileData, error: dlErr } = await supabase
      .storage
      .from('cma-uploads')
      .download(cma.file_path)
    if (dlErr || !fileData) {
      await supabase.from('cmas').update({ parse_status: 'failed' }).eq('id', cma_id)
      return json({ error: `PDF download failed: ${dlErr?.message || 'unknown'}` }, 500)
    }

    const pdfArrayBuffer = await fileData.arrayBuffer()
    // base64 encode in chunks (PDFs can be MB-scale).
    const b64 = arrayBufferToBase64(pdfArrayBuffer)

    // Call Claude with the PDF as a document block. C10: routed through
    // callAnthropic so cost_ledger reflects the spend and the monthly cap
    // can block runaway parses.
    const CLAUDE_MODEL = 'claude-sonnet-4-6'

    let claudeBody: any
    try {
      claudeBody = await callAnthropic(supabase, {
        model: CLAUDE_MODEL,
        maxTokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: b64 },
            },
            { type: 'text', text: 'Extract the subject estimate and all comparable properties from this CMA. Return only the JSON envelope per the schema in the system prompt.' },
          ],
        }],
        feature: 'cma-parse',
        attributedTo: { kind: 'cma', id: cma_id },
      })
    } catch (err: any) {
      await supabase.from('cmas').update({ parse_status: 'failed' }).eq('id', cma_id)
      await logAiGeneration(supabase, { service: 'anthropic', model: CLAUDE_MODEL, kind: 'cma_parse', succeeded: false })
      const status = err?.status || 502
      return json({ error: err?.message || 'Claude call failed' }, status)
    }

    await logAiGeneration(supabase, {
      service: 'anthropic',
      model: CLAUDE_MODEL,
      kind: 'cma_parse',
      cost_cents: anthropicCostCents(CLAUDE_MODEL, claudeBody?.usage),
      succeeded: true,
    })
    const textBlock = (claudeBody.content || []).find((c: any) => c.type === 'text')
    const raw = textBlock?.text?.trim() || ''
    let parsed: any
    try {
      // Strip code fences if Claude wrapped output despite instructions.
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
      parsed = JSON.parse(cleaned)
    } catch (e) {
      await supabase.from('cmas').update({ parse_status: 'failed' }).eq('id', cma_id)
      return json({ error: 'Claude returned non-JSON output', raw: raw.slice(0, 500) }, 502)
    }

    const subject = parsed.subject || {}
    const comps = Array.isArray(parsed.comps) ? parsed.comps : []

    // Persist subject fields on the cma row.
    await supabase.from('cmas').update({
      subject_address: subject.address || null,
      subject_estimate_low: numOrNull(subject.estimate_low),
      subject_estimate_high: numOrNull(subject.estimate_high),
      subject_recommended_price: numOrNull(subject.recommended_price),
      parse_status: 'parsed',
      updated_at: new Date().toISOString(),
    }).eq('id', cma_id)

    // Replace any existing comps for this cma (idempotent re-runs).
    await supabase.from('cma_comps').delete().eq('cma_id', cma_id)

    if (comps.length) {
      const rows = comps.map((c: any, idx: number) => ({
        cma_id,
        address: String(c.address || '').slice(0, 300) || `(comp ${idx + 1})`,
        city: c.city || null,
        mls_id: c.mls_id || null,
        original_status: (c.status || '').toLowerCase() || null,
        original_sale_price: numOrNull(c.sale_price),
        original_list_price: numOrNull(c.list_price),
        original_sale_date: c.sale_date || null,
        sqft: intOrNull(c.sqft),
        beds: intOrNull(c.beds),
        baths: numOrNull(c.baths),
        year_built: intOrNull(c.year_built),
        distance_miles: numOrNull(c.distance_miles),
        dom: intOrNull(c.dom),
        position: idx,
      }))
      const { error: insertErr } = await supabase.from('cma_comps').insert(rows)
      if (insertErr) {
        return json({ error: `comp insert failed: ${insertErr.message}`, parsed_count: comps.length }, 500)
      }
    }

    return json({
      ok: true,
      cma_id,
      subject: {
        address: subject.address,
        estimate_low: numOrNull(subject.estimate_low),
        estimate_high: numOrNull(subject.estimate_high),
        recommended_price: numOrNull(subject.recommended_price),
      },
      comps_inserted: comps.length,
    })
  } catch (err: any) {
    console.error('cma-parse error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as any)
  }
  return btoa(binary)
}

function numOrNull(v: any): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function intOrNull(v: any): number | null {
  const n = numOrNull(v)
  return n === null ? null : Math.round(n)
}

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================================================
// generate-embeddings — FREE vector embeddings via HuggingFace Inference API
//
// Uses sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
// No API key required for this model on HuggingFace's free tier.
//
// Accepts batch input:
//   POST { items: [{ id?, content, title?, collection, source_kind, source_id?, metadata? }] }
//
// Also accepts single-item shorthand:
//   POST { content, title?, collection, source_kind, source_id?, metadata? }
//
// Returns: { results: [{ id, status, similarity_preview? }], embedded_count }
// ============================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`

// Max chars per text chunk sent to HuggingFace (model max is ~256 tokens ≈ ~1200 chars,
// but we truncate to be safe — longer docs should be pre-chunked by the caller)
const MAX_TEXT_LENGTH = 2000

// HuggingFace free tier allows batching up to ~10 inputs at once
const HF_BATCH_SIZE = 8

interface EmbedItem {
  id?: string
  content: string
  title?: string
  collection: string
  source_kind: string
  source_id?: string
  metadata?: Record<string, unknown>
  chunk_index?: number
}

/**
 * Call HuggingFace free Inference API to generate embeddings.
 * Returns a 384-dimension float array per input text.
 * Retries once on 503 (model loading) after a short wait.
 */
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  // Truncate long texts
  const truncated = texts.map(t => t.slice(0, MAX_TEXT_LENGTH))

  const doFetch = async (): Promise<Response> => {
    return fetch(HF_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: truncated,
        options: { wait_for_model: true },
      }),
    })
  }

  let response = await doFetch()

  // HuggingFace returns 503 when model is cold-starting — retry once
  if (response.status === 503) {
    await new Promise(r => setTimeout(r, 3000))
    response = await doFetch()
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`HuggingFace API error (${response.status}): ${errText}`)
  }

  const result = await response.json()

  // Response shape: for batch input, returns array of arrays
  // For single input, may return a single array — normalize
  if (Array.isArray(result) && Array.isArray(result[0])) {
    // Batch response: [[384 floats], [384 floats], ...]
    return result as number[][]
  } else if (Array.isArray(result) && typeof result[0] === 'number') {
    // Single response: [384 floats]
    return [result as number[]]
  }

  throw new Error(`Unexpected HuggingFace response shape: ${JSON.stringify(result).slice(0, 200)}`)
}

/**
 * Use Claude to generate a summary card for the content.
 * Summary cards reduce query token usage by ~80% per the Command spec.
 * Returns null if Claude API key is not available (non-fatal).
 */
async function generateSummary(
  content: string,
  title: string,
  collection: string,
): Promise<string | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return null

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        system: 'You are a summarizer. Output ONLY a 1-2 sentence summary of the content. No preamble, no labels.',
        messages: [{
          role: 'user',
          content: `Summarize this ${collection} document titled "${title}":\n\n${content.slice(0, 3000)}`,
        }],
      }),
    })

    if (!response.ok) return null
    const result = await response.json()
    return result.content?.[0]?.text || null
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const body = await req.json()

    // ─── Normalize input: single item or batch ─────────────────────────
    let items: EmbedItem[]
    if (body.items && Array.isArray(body.items)) {
      items = body.items
    } else if (body.content) {
      // Single-item shorthand
      items = [{
        id: body.id,
        content: body.content,
        title: body.title,
        collection: body.collection || 'brain',
        source_kind: body.source_kind || 'library',
        source_id: body.source_id,
        metadata: body.metadata,
        chunk_index: body.chunk_index,
      }]
    } else {
      return new Response(
        JSON.stringify({ error: 'Missing required field: items[] or content', code: 'invalid_input' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Validate
    for (const item of items) {
      if (!item.content || !item.collection || !item.source_kind) {
        return new Response(
          JSON.stringify({
            error: 'Each item requires: content, collection, source_kind',
            code: 'invalid_input',
          }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // ─── Generate embeddings in batches ────────────────────────────────
    const allEmbeddings: number[][] = []

    for (let i = 0; i < items.length; i += HF_BATCH_SIZE) {
      const batch = items.slice(i, i + HF_BATCH_SIZE)
      // Combine title + content for richer embeddings
      const texts = batch.map(item => {
        const prefix = item.title ? `${item.title}: ` : ''
        return prefix + item.content
      })
      const embeddings = await generateEmbeddings(texts)
      allEmbeddings.push(...embeddings)
    }

    // ─── Generate summaries + upsert into document_embeddings ──────────
    const results: Array<{ id: string; status: string; error?: string }> = []
    let embeddedCount = 0

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const embedding = allEmbeddings[i]

      try {
        // Generate summary (async, non-blocking — skip if it fails)
        const summary = await generateSummary(
          item.content,
          item.title || 'Untitled',
          item.collection,
        )

        // Rough token count estimate (1 token ≈ 4 chars)
        const tokenCount = Math.ceil(item.content.length / 4)

        const row: Record<string, unknown> = {
          collection: item.collection,
          source_kind: item.source_kind,
          title: item.title || item.content.slice(0, 80),
          content: item.content,
          summary,
          embedding: `[${embedding.join(',')}]`,
          metadata: item.metadata || {},
          chunk_index: item.chunk_index || 0,
          token_count: tokenCount,
          updated_at: new Date().toISOString(),
        }

        if (item.source_id) row.source_id = item.source_id
        if (item.id) row.id = item.id

        let result
        if (item.id) {
          // Upsert by provided ID
          result = await supabase
            .from('document_embeddings')
            .upsert(row, { onConflict: 'id' })
            .select('id')
            .single()
        } else {
          // Insert new
          result = await supabase
            .from('document_embeddings')
            .insert(row)
            .select('id')
            .single()
        }

        if (result.error) {
          results.push({ id: item.id || '', status: 'error', error: result.error.message })
        } else {
          results.push({ id: result.data.id, status: 'embedded' })
          embeddedCount++
        }
      } catch (err) {
        results.push({
          id: item.id || '',
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return new Response(
      JSON.stringify({
        results,
        embedded_count: embeddedCount,
        total: items.length,
        model: HF_MODEL,
        dimensions: 384,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('generate-embeddings error:', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        code: 'internal_error',
      }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

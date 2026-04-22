import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ============================================================================
// embed-on-insert — Database webhook companion for auto-embedding
//
// Wire this up as a Supabase Database Webhook on INSERT/UPDATE for tables
// whose content should be auto-embedded into the RAG knowledge base.
//
// Supported source tables:
//   - interactions  → collection: voice (Dana's communication history)
//   - contacts      → collection: brain (contact knowledge)
//   - listings      → collection: brain (property knowledge)
//   - content_posts → collection: voice (Dana's content library)
//   - ai_prompts    → collection: brain (custom prompts/SOPs)
//
// The webhook payload format from Supabase:
//   { type: "INSERT"|"UPDATE", table: "interactions", record: {...}, old_record: {...} }
//
// This function extracts the relevant text, then calls generate-embeddings
// internally to produce and store the vector.
// ============================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2'
const HF_API_URL = `https://api-inference.huggingface.co/pipeline/feature-extraction/${HF_MODEL}`
const MAX_TEXT_LENGTH = 2000

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  record: Record<string, unknown>
  old_record?: Record<string, unknown>
}

/**
 * Extract embeddable text + metadata from a database record based on its source table.
 * Returns null if the record shouldn't be embedded (e.g., too short, deleted).
 */
function extractContent(table: string, record: Record<string, unknown>): {
  content: string
  title: string
  collection: string
  source_kind: string
  source_id: string
  metadata: Record<string, unknown>
} | null {
  switch (table) {
    case 'interactions': {
      const body = String(record.body || '')
      if (body.length < 20) return null // skip trivial entries
      const kind = String(record.kind || 'note')
      const channel = String(record.channel || '')
      const contactId = record.contact_id ? String(record.contact_id) : undefined
      return {
        content: body,
        title: `${kind} via ${channel}`.trim(),
        collection: 'voice',
        source_kind: 'interaction',
        source_id: String(record.id),
        metadata: {
          kind,
          channel,
          contact_id: contactId,
          date: record.created_at,
        },
      }
    }

    case 'contacts': {
      // Build a text representation of the contact for semantic search
      const name = String(record.name || 'Unknown')
      const parts = [`Contact: ${name}`]
      if (record.email) parts.push(`Email: ${record.email}`)
      if (record.phone) parts.push(`Phone: ${record.phone}`)
      if (record.stage) parts.push(`Stage: ${record.stage}`)
      if (record.tier) parts.push(`Tier: ${record.tier}`)
      if (record.looking_for) parts.push(`Looking for: ${record.looking_for}`)
      if (record.source) parts.push(`Source: ${record.source}`)
      if (record.notes) parts.push(`Notes: ${record.notes}`)
      if (record.tags) parts.push(`Tags: ${Array.isArray(record.tags) ? record.tags.join(', ') : record.tags}`)
      const content = parts.join('\n')
      if (content.length < 30) return null
      return {
        content,
        title: name,
        collection: 'brain',
        source_kind: 'contact',
        source_id: String(record.id),
        metadata: {
          stage: record.stage,
          tier: record.tier,
          type: record.type,
        },
      }
    }

    case 'listings': {
      const address = String(record.address || record.street_address || 'Unknown')
      const parts = [`Listing: ${address}`]
      if (record.city) parts.push(`City: ${record.city}`)
      if (record.price) parts.push(`Price: $${record.price}`)
      if (record.beds || record.bedrooms) parts.push(`Beds: ${record.beds || record.bedrooms}`)
      if (record.baths || record.bathrooms) parts.push(`Baths: ${record.baths || record.bathrooms}`)
      if (record.sqft) parts.push(`Sqft: ${record.sqft}`)
      if (record.status) parts.push(`Status: ${record.status}`)
      if (record.description) parts.push(`Description: ${record.description}`)
      if (record.notes) parts.push(`Notes: ${record.notes}`)
      const content = parts.join('\n')
      return {
        content,
        title: address,
        collection: 'brain',
        source_kind: 'listing',
        source_id: String(record.id),
        metadata: {
          status: record.status,
          price: record.price,
          city: record.city,
        },
      }
    }

    case 'content_posts': {
      const bodyText = String(record.body_text || record.content || '')
      if (bodyText.length < 20) return null
      const pillar = String(record.pillar || record.content_type || '')
      return {
        content: bodyText,
        title: String(record.title || pillar || 'Content post'),
        collection: 'voice',
        source_kind: 'social-post',
        source_id: String(record.id),
        metadata: {
          pillar,
          platform: record.platform,
          status: record.status,
          date: record.created_at,
        },
      }
    }

    case 'ai_prompts': {
      const promptText = String(record.prompt_text || '')
      if (promptText.length < 20) return null
      return {
        content: promptText,
        title: String(record.prompt_key || 'Custom prompt'),
        collection: 'brain',
        source_kind: 'sop',
        source_id: String(record.id),
        metadata: {
          prompt_key: record.prompt_key,
        },
      }
    }

    default:
      return null
  }
}

/**
 * Generate embedding via HuggingFace free API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = text.slice(0, MAX_TEXT_LENGTH)

  const doFetch = () =>
    fetch(HF_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: truncated,
        options: { wait_for_model: true },
      }),
    })

  let response = await doFetch()
  if (response.status === 503) {
    await new Promise(r => setTimeout(r, 3000))
    response = await doFetch()
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`HuggingFace API error (${response.status}): ${errText}`)
  }

  const result = await response.json()

  // Single text returns [384 floats]
  if (Array.isArray(result) && typeof result[0] === 'number') {
    return result as number[]
  }
  // Sometimes wraps in extra array
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as number[]
  }

  throw new Error(`Unexpected HuggingFace response: ${JSON.stringify(result).slice(0, 200)}`)
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

    const payload: WebhookPayload = await req.json()
    const { type, table, record } = payload

    // Skip DELETE events
    if (type === 'DELETE' || !record) {
      return new Response(
        JSON.stringify({ status: 'skipped', reason: 'delete_event' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Extract embeddable content
    const extracted = extractContent(table, record)
    if (!extracted) {
      return new Response(
        JSON.stringify({ status: 'skipped', reason: 'no_embeddable_content' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Generate embedding
    const embedding = await generateEmbedding(`${extracted.title}: ${extracted.content}`)

    // Generate summary via Claude (best-effort)
    let summary: string | null = null
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (apiKey && extracted.content.length > 100) {
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 150,
            system: 'Output ONLY a 1-sentence summary. No preamble.',
            messages: [{
              role: 'user',
              content: `Summarize: ${extracted.content.slice(0, 2000)}`,
            }],
          }),
        })
        if (resp.ok) {
          const r = await resp.json()
          summary = r.content?.[0]?.text || null
        }
      } catch { /* non-fatal */ }
    }

    const tokenCount = Math.ceil(extracted.content.length / 4)

    // Check if embedding already exists for this source
    const { data: existing } = await supabase
      .from('document_embeddings')
      .select('id')
      .eq('source_kind', extracted.source_kind)
      .eq('source_id', extracted.source_id)
      .eq('chunk_index', 0)
      .maybeSingle()

    const row: Record<string, unknown> = {
      collection: extracted.collection,
      source_kind: extracted.source_kind,
      source_id: extracted.source_id,
      title: extracted.title,
      content: extracted.content,
      summary,
      embedding: `[${embedding.join(',')}]`,
      metadata: extracted.metadata,
      chunk_index: 0,
      token_count: tokenCount,
      updated_at: new Date().toISOString(),
    }

    let result
    if (existing?.id) {
      // Update existing embedding
      row.id = existing.id
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
      throw new Error(`Supabase upsert failed: ${result.error.message}`)
    }

    return new Response(
      JSON.stringify({
        status: 'embedded',
        id: result.data.id,
        table,
        source_id: extracted.source_id,
        collection: extracted.collection,
        dimensions: 384,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('embed-on-insert error:', err)
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
        code: 'internal_error',
      }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

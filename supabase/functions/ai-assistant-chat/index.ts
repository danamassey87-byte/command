import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured.', code: 'missing_api_key' }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { messages, contact_id } = await req.json()

    // ─── Build system prompt with brand context ──────────────────────────
    let brandContext = ''
    try {
      const { data: brandRow } = await supabase
        .from('user_settings')
        .select('value')
        .eq('key', 'brand_profile')
        .maybeSingle()
      if (brandRow?.value) {
        const b = brandRow.value
        const parts: string[] = []
        if (b.signature) {
          const sig = b.signature
          if (sig.full_name) parts.push(`Agent: ${sig.full_name}`)
          if (sig.brokerage) parts.push(`Brokerage: ${sig.brokerage}`)
          if (sig.title) parts.push(`Title: ${sig.title}`)
          if (sig.phone) parts.push(`Phone: ${sig.phone}`)
          if (sig.designations) parts.push(`Designations: ${sig.designations}`)
          if (sig.usp) parts.push(`USP: ${sig.usp}`)
          if (sig.service_areas) parts.push(`Service areas: ${sig.service_areas}`)
        }
        if (b.guidelines) {
          const gl = b.guidelines
          if (gl.tagline) parts.push(`Tagline: "${gl.tagline}"`)
          if (gl.tone_of_voice) parts.push(`Voice: ${gl.tone_of_voice}`)
        }
        if (parts.length) brandContext = '\n\nBRAND IDENTITY:\n' + parts.join('\n')
      }
    } catch (_e) { /* non-fatal */ }

    // ─── Contact context (if @mentioned) ─────────────────────────────────
    let contactContext = ''
    if (contact_id) {
      try {
        const { data: contact } = await supabase
          .from('contacts')
          .select('name, email, phone, stage, tier, looking_for, notes, source')
          .eq('id', contact_id)
          .single()
        if (contact) {
          const parts = [`ATTACHED CONTACT: ${contact.name}`]
          if (contact.email) parts.push(`Email: ${contact.email}`)
          if (contact.phone) parts.push(`Phone: ${contact.phone}`)
          if (contact.stage) parts.push(`Stage: ${contact.stage}`)
          if (contact.tier) parts.push(`Tier: ${contact.tier}`)
          if (contact.looking_for) parts.push(`Looking for: ${contact.looking_for}`)
          if (contact.source) parts.push(`Source: ${contact.source}`)
          if (contact.notes) parts.push(`Notes: ${contact.notes}`)
          contactContext = '\n\n' + parts.join('\n')
        }

        // Recent interactions with this contact
        const { data: interactions } = await supabase
          .from('interactions')
          .select('kind, channel, body, created_at')
          .eq('contact_id', contact_id)
          .order('created_at', { ascending: false })
          .limit(10)
        if (interactions?.length) {
          contactContext += '\n\nRECENT INTERACTIONS:\n' + interactions.map((i: any) =>
            `- [${i.created_at?.slice(0, 10)}] ${i.kind} via ${i.channel}: ${(i.body || '').slice(0, 120)}`
          ).join('\n')
        }
      } catch (_e) { /* non-fatal */ }
    }

    // ─── RAG: vector similarity search via pgvector embeddings ───────────
    // Uses HuggingFace sentence-transformers/all-MiniLM-L6-v2 (384 dims, FREE)
    // Falls back to keyword search if embeddings aren't available yet
    const lastUserMsg = messages?.filter((m: any) => m.role === 'user').pop()?.content || ''
    let ragContext = ''
    if (lastUserMsg.length > 10) {
      let usedVectorSearch = false

      // Try vector similarity search first
      try {
        // Generate embedding for the user's query via HuggingFace free API
        const hfResp = await fetch(
          'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputs: lastUserMsg.slice(0, 2000),
              options: { wait_for_model: true },
            }),
          }
        )

        if (hfResp.ok) {
          let queryEmbedding = await hfResp.json()
          // Normalize response shape (single text may return nested array)
          if (Array.isArray(queryEmbedding) && Array.isArray(queryEmbedding[0])) {
            queryEmbedding = queryEmbedding[0]
          }

          if (Array.isArray(queryEmbedding) && typeof queryEmbedding[0] === 'number') {
            // Call the match_documents database function for semantic search
            const { data: vectorResults } = await supabase.rpc('match_documents', {
              query_embedding: queryEmbedding,
              match_collection: null,  // search all collections
              match_count: 5,
              match_threshold: 0.5,
            })

            if (vectorResults?.length) {
              usedVectorSearch = true
              ragContext = '\n\nRELEVANT KNOWLEDGE (semantic search from knowledge base):\n' +
                vectorResults.map((r: any) => {
                  const sim = (r.similarity * 100).toFixed(0)
                  const text = r.summary || r.content?.slice(0, 200) || ''
                  return `- [${r.collection}/${r.source_kind}] ${r.title} (${sim}% match): ${text}`
                }).join('\n')
            }
          }
        }
      } catch (_e) {
        // Vector search failed — fall through to keyword search
        console.log('Vector search unavailable, falling back to keyword search')
      }

      // Fallback: keyword search against interactions (original approach)
      if (!usedVectorSearch) {
        try {
          const keywords = lastUserMsg.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5)
          if (keywords.length) {
            const searchTerm = keywords.join(' & ')
            const { data: relevant } = await supabase
              .from('interactions')
              .select('kind, channel, body, created_at')
              .textSearch('body', searchTerm, { type: 'websearch' })
              .limit(5)
            if (relevant?.length) {
              ragContext = '\n\nRELEVANT KNOWLEDGE (from CRM data):\n' + relevant.map((r: any) =>
                `- [${r.created_at?.slice(0, 10)}] ${r.kind}: ${(r.body || '').slice(0, 150)}`
              ).join('\n')
            }
          }
        } catch (_e) { /* non-fatal — text search may not be indexed yet */ }
      }
    }

    // ─── Fetch custom AI prompts if any ──────────────────────────────────
    let customSystemPrompt = ''
    try {
      const { data: prompt } = await supabase
        .from('ai_prompts')
        .select('prompt_text')
        .eq('prompt_key', 'assistant_system')
        .maybeSingle()
      if (prompt?.prompt_text) {
        customSystemPrompt = prompt.prompt_text
      }
    } catch (_e) { /* non-fatal */ }

    const systemPrompt = (customSystemPrompt || `You are Dana Massey's real estate AI assistant. Dana is a solo agent with REAL Brokerage in Arizona, focused on the East Valley / Gilbert market.

Your capabilities:
- Write listing descriptions, emails, social captions, newsletters, and marketing copy
- Draft follow-up messages and client communications
- Prepare for appointments, open houses, and listing presentations
- Analyze objections and suggest responses
- Review content for Fair Housing, ADRE, and NAR compliance
- Help with market analysis and pricing strategy

Rules:
- Always comply with Fair Housing Act — never reference protected classes (race, religion, national origin, familial status, disability, sex, color)
- Include brokerage disclosure (REAL Brokerage) in any marketing copy
- Never guarantee sales prices, appreciation, or investment returns
- Match Dana's tone: warm, direct, professional but not stuffy
- For listing descriptions: lead with lifestyle, mention key features, end with call to action
- For emails: personal touch, no corporate-speak
- For social: engaging hooks, hashtag suggestions, platform-specific formatting
- If generating publishable content, note any compliance considerations at the end

If you identify a Fair Housing or compliance issue, flag it clearly with a ⚠️ COMPLIANCE note.`) + brandContext + contactContext + ragContext

    // ─── Call Claude ─────────────────────────────────────────────────────
    // Send full conversation history for multi-turn context
    const conversationMessages = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
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
        messages: conversationMessages,
      }),
    })

    if (!response.ok) {
      let detail = ''
      try {
        const errBody = await response.json()
        detail = errBody?.error?.message || JSON.stringify(errBody)
      } catch {
        detail = await response.text().catch(() => '')
      }
      return new Response(
        JSON.stringify({ error: `Claude API error (${response.status}): ${detail}`, code: 'anthropic_api_error' }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    const text = result.content?.[0]?.text ?? ''
    const inputTokens = result.usage?.input_tokens || 0
    const outputTokens = result.usage?.output_tokens || 0

    // Simple compliance check on output
    const fairHousingTerms = ['perfect for families', 'family neighborhood', 'great schools', 'church nearby', 'no children', 'adult community', 'ethnic']
    const hasComplianceIssue = fairHousingTerms.some(term => text.toLowerCase().includes(term))

    return new Response(
      JSON.stringify({
        text,
        compliance: hasComplianceIssue ? 'review' : 'pass',
        usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('ai-assistant-chat error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err), code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { logAiGeneration, anthropicCostCents } from '../_shared/replicate-notify.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a content writer for Dana Massey, a real estate agent at REAL Broker in the East Valley / Gilbert, AZ market.

Write in Dana's voice: warm, confident, knowledgeable, and authentic. She helps buyers, sellers, and investors in the Phoenix metro area. Her content should feel like it's coming from a real person who loves real estate and her community — not a corporate marketing account.

Keep content valuable, honest, and action-oriented. Avoid buzzwords like "dream home" or "hot market" unless used ironically.`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'AI is not configured yet. ANTHROPIC_API_KEY is missing from Supabase Edge Function secrets.',
          code: 'missing_api_key',
        }),
        { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const { type, pillar, prompt, body_text, platform, active_platforms, plan_type, address, property, source, avatar_id, framework, inspo_notes, conversation, variant, listing_id, oh_id, channels } = await req.json()

    // Single supabase client used only for ai_generation_log writes — keeps the
    // per-block clients below independent while letting every Anthropic call site
    // log without re-creating clients on each path.
    const logSb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ─── Brand guidelines injection ──────────────────────────────────────
    // Pull brand profile from user_settings so Claude knows Dana's brand voice,
    // colors, tagline, and tone before generating any content.
    let brandContext = ''
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data: brandRow } = await supabase
        .from('user_settings')
        .select('value')
        .eq('key', 'brand_profile')
        .maybeSingle()
      if (brandRow?.value) {
        const b = brandRow.value
        const parts: string[] = []

        // Signature / identity
        if (b.signature) {
          const sig = b.signature
          if (sig.full_name) parts.push(`Agent name: ${sig.full_name}`)
          if (sig.brokerage) parts.push(`Brokerage: ${sig.brokerage}`)
          if (sig.title) parts.push(`Title: ${sig.title}`)
          if (sig.phone) parts.push(`Phone: ${sig.phone}`)
          if (sig.designations) parts.push(`Designations: ${sig.designations}`)
          if (sig.usp) parts.push(`Unique Selling Proposition: ${sig.usp}`)
          if (sig.service_areas) parts.push(`Service areas: ${sig.service_areas}`)
        }

        // Guidelines
        if (b.guidelines) {
          const gl = b.guidelines
          if (gl.tagline) parts.push(`Brand tagline: "${gl.tagline}"`)
          if (gl.tone_of_voice) parts.push(`Brand voice / tone: ${gl.tone_of_voice}`)
          if (gl.primary_color) parts.push(`Brand colors: primary ${gl.primary_color}, secondary ${gl.secondary_color || 'N/A'}, accent ${gl.accent_color || 'N/A'}`)
          if (gl.fonts) parts.push(`Brand fonts: ${gl.fonts}`)
        }

        if (parts.length > 0) {
          brandContext = '\n\nBRAND IDENTITY & GUIDELINES:\n' + parts.join('\n') + '\n\nAlways write in alignment with these brand guidelines. Use the brand voice and tone described above.'
        }
      }
    } catch (e) {
      console.error('Brand profile lookup failed (non-fatal):', e)
    }

    // ─── Framework injection ─────────────────────────────────────────────
    // When a copywriting framework is specified, fetch it from ai_prompts and
    // prepend it as writing instructions for Claude.
    let frameworkContext = ''
    if (framework) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        const { data: fwPrompt } = await supabase
          .from('ai_prompts')
          .select('prompt_text')
          .eq('prompt_key', `framework_${framework}`)
          .maybeSingle()
        if (fwPrompt?.prompt_text) {
          frameworkContext = '\n\nCOPYWRITING FRAMEWORK INSTRUCTIONS:\n' + fwPrompt.prompt_text
        }
      } catch (e) {
        console.error('Framework lookup failed (non-fatal):', e)
      }
    }

    // ─── Avatar context injection ──────────────────────────────────────────
    // When avatar_id is provided, fetch the avatar and build a targeting block.
    let avatarContext = ''
    if (avatar_id) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        const { data: avatar } = await supabase
          .from('client_avatars')
          .select('*')
          .eq('id', avatar_id)
          .single()
        if (avatar) {
          const parts = [`TARGET AUDIENCE: ${avatar.name} — ${avatar.type}`]
          if (avatar.age_range) parts.push(`Age: ${avatar.age_range}`)
          if (avatar.family_status) parts.push(`Family: ${avatar.family_status}`)
          if (avatar.motivation) parts.push(`Motivation: ${avatar.motivation}`)
          if (avatar.pain_points) parts.push(`Pain points: ${avatar.pain_points}`)
          if (avatar.content_resonates) parts.push(`Responds to: ${avatar.content_resonates}`)
          if (avatar.online_platforms?.length) parts.push(`Found on: ${avatar.online_platforms.join(', ')}`)
          if (avatar.price_range_min || avatar.price_range_max) {
            parts.push(`Price range: $${avatar.price_range_min?.toLocaleString() || '?'} – $${avatar.price_range_max?.toLocaleString() || '?'}`)
          }
          parts.push('\nTailor your tone, examples, and messaging to resonate with this specific person.')
          avatarContext = '\n\n' + parts.join('\n')
        }
      } catch (e) {
        console.error('Avatar lookup failed (non-fatal):', e)
      }
    }

    // ─── Content rules injection ────────────────────────────────────────────
    // Hard rules the user has configured (e.g., "never use dashes").
    // Applied to ALL generation types.
    let contentRulesContext = ''
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data: rulesRow } = await supabase
        .from('user_settings')
        .select('value')
        .eq('key', 'content_rules')
        .maybeSingle()
      if (rulesRow?.value && Array.isArray(rulesRow.value) && rulesRow.value.length > 0) {
        contentRulesContext = '\n\nHARD CONTENT RULES — You MUST follow these rules in ALL output. No exceptions:\n' +
          rulesRow.value.map((r: string) => `- ${r}`).join('\n')
      }
    } catch (e) {
      console.error('Content rules lookup failed (non-fatal):', e)
    }

    // Listing checklist + strategy narrative.
    // Caller supplies the rendered prompt (with {source} etc already inlined)
    // plus a `source` field that we use to add source-specific framing.
    // Returns { tasks: [...], strategy: "markdown..." }
    if (type === 'listing_checklist') {
      // Source-specific framing injected into the system prompt so Claude knows
      // *exactly* what kind of data access Dana has for this listing.
      const sourceContext: Record<string, string> = {
        my_expired: 'CONTEXT: This listing previously expired with Dana as the listing agent. She HAS full history — prior showings, feedback, marketing performance, what worked and didn\'t. Reference that prior effort in the strategy. Positioning: "we know what happened, here\'s the fix."',
        taken_over: 'CONTEXT: This listing previously expired under a DIFFERENT agent. Dana is TAKING IT OVER fresh — she does NOT have access to the prior agent\'s showings, feedback, or marketing data. Do NOT reference prior marketing efforts, showing counts, or feedback she wouldn\'t know. Positioning: "fresh eyes, fresh strategy, new team." Focus on what a new-agent-with-new-approach can offer. Be explicit that this is a clean-slate relaunch.',
        fsbo: 'CONTEXT: This seller was previously FSBO (For Sale By Owner) and is now listing with Dana. Positioning: "professional marketing + agent network you didn\'t have before."',
        new: 'CONTEXT: Fresh new listing — never been on the market. Standard launch strategy.',
      }
      const sourceKey = (typeof source === 'string' && source in sourceContext) ? source : 'new'
      const contextLine = sourceContext[sourceKey]

      const systemChecklist = `You are a real estate listing strategist for Dana Massey (REAL Broker, East Valley AZ).

${contextLine}

Respond ONLY with a valid JSON array of task objects in the form [{"label":"...","phase":"..."}]. No prose, no markdown fences. Tasks must match the phases named in the user prompt.`

      const systemStrategy = `You are a real estate listing strategist for Dana Massey (REAL Broker, East Valley AZ). Voice: direct, warm, story-driven, no fluff, no clichés. Leads with emotion — not specs.

${contextLine}

Output a structured markdown strategy document with these sections:

## Positioning
1–2 paragraphs on the story angle and positioning — tailored to the source context above.

## Pricing Strategy
- Recommended approach (don't invent specific comps; use the price and DOM given)
- Psychology / rounding / positioning vs competition

## Target Buyer
Who is this property for? Write it as a persona.

## Messaging & Talking Points
- 5–7 bullets of specific, on-voice messaging Dana can reuse in captions, emails, and showings.

## Marketing Channels
Prioritized list of channels + what to post on each.

## Seller Talking Points
How Dana should frame the relaunch / launch / takeover to the seller. Be honest and direct.

Be specific and reusable — this text will be copy-pasted into social captions, emails, and client docs. No filler.`

      const callClaude = (system: string, userContent: string, maxTokens: number) =>
        fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            system,
            messages: [{ role: 'user', content: userContent }],
          }),
        })

      // The user prompt from the frontend tells Claude to return a JSON task
      // array. For the strategy call, append an override so Claude ignores
      // those JSON instructions and produces markdown instead.
      const strategyUserPrompt = `${prompt || ''}

---
STRATEGY MODE — IMPORTANT
Ignore ANY instructions above that ask for JSON, task lists, or checklist items. Those were for a different call.

Your job right now is to produce the markdown strategy document described in the system prompt. Output nothing but the markdown. Do not wrap in code fences. Do not return JSON. Start directly with a "## Positioning" heading.`

      // Fire both calls in parallel — tasks + narrative strategy.
      const [checklistResp, strategyResp] = await Promise.all([
        callClaude(systemChecklist + contentRulesContext, prompt || '', 2048),
        callClaude(systemStrategy + contentRulesContext,  strategyUserPrompt, 3072),
      ])

      const parseAnthropicError = async (r: Response) => {
        try {
          const errBody = await r.json()
          return errBody?.error?.message || JSON.stringify(errBody)
        } catch {
          return await r.text().catch(() => '')
        }
      }

      const checklistModel = 'claude-sonnet-4-6'
      if (!checklistResp.ok) {
        await logAiGeneration(logSb, { service: 'anthropic', model: checklistModel, kind: 'listing_checklist', listing_id: listing_id || null, succeeded: false })
        return new Response(
          JSON.stringify({
            error: `Anthropic API error (${checklistResp.status}): ${await parseAnthropicError(checklistResp) || 'unknown'}`,
            code: 'anthropic_api_error',
          }),
          { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const checklistResult = await checklistResp.json()
      await logAiGeneration(logSb, {
        service: 'anthropic',
        model: checklistModel,
        kind: 'listing_checklist',
        listing_id: listing_id || null,
        cost_cents: anthropicCostCents(checklistModel, checklistResult?.usage),
        succeeded: true,
      })
      const checklistText = checklistResult.content?.[0]?.text ?? ''

      let tasks: Array<{ label: string; phase: string }> = []
      try {
        const jsonMatch = checklistText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          if (Array.isArray(parsed)) {
            tasks = parsed
              .filter((t: any) => t && typeof t.label === 'string')
              .map((t: any) => ({
                label: String(t.label),
                phase: typeof t.phase === 'string' && t.phase ? t.phase : (plan_type === 'new' ? 'prep' : 'analysis'),
              }))
          }
        }
      } catch (_e) {
        // fall through with empty tasks array
      }

      // Strategy is best-effort — if it fails we still return the tasks.
      let strategy = ''
      if (strategyResp.ok) {
        try {
          const sr = await strategyResp.json()
          await logAiGeneration(logSb, {
            service: 'anthropic',
            model: checklistModel,
            kind: 'listing_strategy',
            listing_id: listing_id || null,
            cost_cents: anthropicCostCents(checklistModel, sr?.usage),
            succeeded: true,
          })
          strategy = sr.content?.[0]?.text ?? ''
        } catch { /* ignore */ }
      } else {
        await logAiGeneration(logSb, { service: 'anthropic', model: checklistModel, kind: 'listing_strategy', listing_id: listing_id || null, succeeded: false })
      }

      return new Response(
        JSON.stringify({ tasks, strategy, raw: checklistText }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Listing content (Just Listed / Coming Soon / Price Drop / Just Sold / OH Promo) ──
    // One button on a listing or open house generates a draft per channel.
    // Returns { drafts: [{ channel, format, title, body_text, hashtags }] }.
    // Caller persists each draft as a content_pieces row linked to listing_id / open_house_id.
    if (type === 'listing_content') {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )

      const VALID_VARIANTS = ['just_listed', 'coming_soon', 'price_drop', 'just_sold', 'oh_promo']
      if (!variant || !VALID_VARIANTS.includes(variant)) {
        return new Response(
          JSON.stringify({ error: `variant must be one of: ${VALID_VARIANTS.join(', ')}` }),
          { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      // Default channel set if caller doesn't specify.
      const requestedChannels: Array<{ channel: string; format: string }> = Array.isArray(channels) && channels.length > 0
        ? channels.map((c: any) => typeof c === 'string'
            ? { channel: c.split(':')[0], format: c.split(':')[1] || 'post' }
            : { channel: String(c.channel || 'instagram'), format: String(c.format || 'post') })
        : [
            { channel: 'instagram', format: 'post' },
            { channel: 'instagram', format: 'story' },
            { channel: 'facebook',  format: 'post' },
            { channel: 'email',     format: 'announcement' },
          ]

      // Fetch listing + property + open_house data.
      let listingRow: any = null
      let propertyRow: any = null
      let ohRow: any = null

      if (listing_id) {
        const { data } = await supabase
          .from('listings')
          .select('id, list_price, current_price, close_price, list_date, status, type, dom, strategy, property_id, contact:contacts(name, email)')
          .eq('id', listing_id)
          .maybeSingle()
        listingRow = data
        if (data?.property_id) {
          const { data: p } = await supabase
            .from('properties')
            .select('address, city, state, zip, bedrooms, bathrooms, sqft, year_built, lot_acres, pool, garage_spaces, subdivision, school_district')
            .eq('id', data.property_id)
            .maybeSingle()
          propertyRow = p
        }
      }

      if (oh_id) {
        const { data } = await supabase
          .from('open_houses')
          .select('id, date, start_time, end_time, listing_id, property_id, host_agent_name, lockbox_code')
          .eq('id', oh_id)
          .maybeSingle()
        ohRow = data
        // If no listing_id was passed but OH has one, hydrate from there.
        if (!listingRow && data?.listing_id) {
          const { data: l } = await supabase
            .from('listings')
            .select('id, list_price, current_price, list_date, status, type, dom, strategy, property_id, contact:contacts(name, email)')
            .eq('id', data.listing_id)
            .maybeSingle()
          listingRow = l
        }
        if (!propertyRow && data?.property_id) {
          const { data: p } = await supabase
            .from('properties')
            .select('address, city, state, zip, bedrooms, bathrooms, sqft, year_built, lot_acres, pool, garage_spaces, subdivision, school_district')
            .eq('id', data.property_id)
            .maybeSingle()
          propertyRow = p
        }
      }

      // ─── Build the listing facts block (shared across all channel calls) ──
      const fmtPrice = (n: any) => n ? `$${Number(n).toLocaleString()}` : '—'
      const fmtDate = (d: any) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : '—'
      const fmtTime = (t: any) => {
        if (!t) return '—'
        const [h, m] = String(t).split(':').map(Number)
        const hr12 = ((h + 11) % 12) + 1
        const ampm = h >= 12 ? 'PM' : 'AM'
        return `${hr12}${m ? ':' + String(m).padStart(2, '0') : ''} ${ampm}`
      }

      const facts: string[] = []
      if (propertyRow) {
        facts.push(`Address: ${propertyRow.address}${propertyRow.city ? ', ' + propertyRow.city : ''}${propertyRow.state ? ', ' + propertyRow.state : ''}`)
        if (propertyRow.bedrooms || propertyRow.bathrooms) {
          facts.push(`Beds/Baths: ${propertyRow.bedrooms || '?'} bed / ${propertyRow.bathrooms || '?'} bath`)
        }
        if (propertyRow.sqft) facts.push(`SqFt: ${Number(propertyRow.sqft).toLocaleString()}`)
        if (propertyRow.year_built) facts.push(`Year Built: ${propertyRow.year_built}`)
        if (propertyRow.lot_acres) facts.push(`Lot: ${propertyRow.lot_acres} acres`)
        if (propertyRow.garage_spaces) facts.push(`Garage: ${propertyRow.garage_spaces}-car`)
        if (propertyRow.pool) facts.push('Pool: yes')
        if (propertyRow.subdivision) facts.push(`Subdivision: ${propertyRow.subdivision}`)
        if (propertyRow.school_district) facts.push(`Schools: ${propertyRow.school_district}`)
      }
      if (listingRow) {
        if (variant === 'just_sold' && listingRow.close_price) {
          facts.push(`Sold Price: ${fmtPrice(listingRow.close_price)}`)
          if (listingRow.list_price) facts.push(`Original List: ${fmtPrice(listingRow.list_price)}`)
        } else if (variant === 'price_drop') {
          if (listingRow.list_price) facts.push(`Original Price: ${fmtPrice(listingRow.list_price)}`)
          if (listingRow.current_price) facts.push(`New Price: ${fmtPrice(listingRow.current_price)}`)
        } else {
          if (listingRow.current_price || listingRow.list_price) {
            facts.push(`Price: ${fmtPrice(listingRow.current_price || listingRow.list_price)}`)
          }
        }
        if (listingRow.dom != null && variant !== 'coming_soon' && variant !== 'just_listed') {
          facts.push(`Days on Market: ${listingRow.dom}`)
        }
        if (listingRow.strategy && variant !== 'just_sold') {
          facts.push(`Listing Strategy Notes: ${String(listingRow.strategy).slice(0, 600)}`)
        }
      }
      if (ohRow && variant === 'oh_promo') {
        facts.push(`Open House Date: ${fmtDate(ohRow.date)}`)
        facts.push(`Open House Time: ${fmtTime(ohRow.start_time)} – ${fmtTime(ohRow.end_time)}`)
        if (ohRow.host_agent_name) facts.push(`Hosted by: ${ohRow.host_agent_name}`)
      }
      const factsBlock = facts.length ? `LISTING FACTS:\n${facts.map(f => '- ' + f).join('\n')}` : ''

      // ─── Variant framing ─────────────────────────────────────────────────
      const VARIANT_FRAMING: Record<string, string> = {
        just_listed:  'This is a JUST LISTED announcement — the home went live on the market today. Tone: confident, excited, story-driven. Lead with what makes this property special, not the specs. Mention price + address but don\'t lead with them.',
        coming_soon:  'This is a COMING SOON teaser — the home isn\'t live yet but is about to be. Tone: anticipation, exclusivity. Build curiosity. Don\'t reveal full price or all photos. CTA: "DM for early access" or "Tag someone who needs to see this first."',
        price_drop:   'This is a PRICE IMPROVEMENT post — the seller has lowered the price. Tone: honest, opportunity-framed. NEVER use "desperate", "must sell", or apologetic language. Frame it as "the seller adjusted to current market" or "we\'re creating a window for the right buyer."',
        just_sold:    'This is a JUST SOLD celebration — the deal closed. Tone: warm gratitude. Celebrate the client\'s next chapter, not Dana\'s ego. End with a soft CTA for sellers who are curious about the market.',
        oh_promo:     'This is an OPEN HOUSE invitation — promote attendance at the OH. Tone: inviting, no-pressure. Lead with date/time + property hook. CTA: "Stop by" or "RSVP via link in bio." Mention parking, pets, kids welcome if relevant.',
      }
      const variantInstruction = VARIANT_FRAMING[variant]

      // ─── Per-channel format instructions ─────────────────────────────────
      const CHANNEL_INSTRUCTIONS: Record<string, string> = {
        'instagram:post':   'Format: Instagram caption (150–250 words). Hook in line 1. Use line breaks for scannability. End with a soft CTA. Include a "hashtags" array of 12–18 mixed local/niche/community tags. Title field: a short headline you\'d put on the photo overlay.',
        'instagram:story':  'Format: Instagram story (very short, 30–80 words). Bold pullquote-style. End with "swipe up" or "DM me" prompt. Title: 3–5 word overlay headline. Hashtags: 3–5 only.',
        'instagram:reel':   'Format: Instagram Reel script. 5–8 line voice-over for a 15–30 second clip. Each line is 1 sentence. Title: hook for the cover frame. Hashtags: 8–12.',
        'facebook:post':    'Format: Facebook post (200–350 words). Slightly longer + more narrative than Instagram. Can include the address explicitly. Title: same as the FB post headline. Hashtags: 5–8 (Facebook uses fewer).',
        'facebook:event':   'Format: Facebook Event description (100–150 words). Date + time + property pull. Title: event title.',
        'email:announcement': 'Format: Email body (250–400 words). Plain text, no HTML, no signature block. Conversational. Title: email subject line. Hashtags: empty array (emails don\'t use hashtags).',
        'gmb:post':         'Format: Google Business Profile post (under 1500 chars, 100–200 words is the sweet spot). Action-oriented. Title: short headline. Hashtags: 3–5.',
        'tiktok:post':      'Format: TikTok caption + on-screen text script (80–150 words total). Hook-driven. Title: 5–8 word hook for first 2 seconds. Hashtags: 8–12.',
      }

      // ─── Build per-channel Claude calls in parallel ──────────────────────
      const listingContentModel = 'claude-sonnet-4-6'
      const callClaudeJson = async (system: string, userPrompt: string, maxTokens = 1200) => {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: listingContentModel,
            max_tokens: maxTokens,
            system,
            messages: [{ role: 'user', content: userPrompt }],
          }),
        })
        if (!r.ok) {
          const errText = await r.text().catch(() => '')
          await logAiGeneration(logSb, { service: 'anthropic', model: listingContentModel, kind: `listing_content:${variant}`, listing_id: listingRow?.id || listing_id || null, succeeded: false })
          throw new Error(`Anthropic API error (${r.status}): ${errText.slice(0, 400)}`)
        }
        const j = await r.json()
        await logAiGeneration(logSb, {
          service: 'anthropic',
          model: listingContentModel,
          kind: `listing_content:${variant}`,
          listing_id: listingRow?.id || listing_id || null,
          cost_cents: anthropicCostCents(listingContentModel, j?.usage),
          succeeded: true,
        })
        return j.content?.[0]?.text ?? ''
      }

      const buildSystem = () =>
        SYSTEM_PROMPT + brandContext + frameworkContext + avatarContext + contentRulesContext + `\n\nWhen asked for listing-promotion content, return ONLY valid JSON in this exact shape:\n{ "title": "...", "body_text": "...", "hashtags": ["#tag1","#tag2"] }\nDo not wrap in code fences. No prose outside the JSON.`

      const drafts: Array<{ channel: string; format: string; title: string; body_text: string; hashtags: string[]; raw?: string }> = []

      const results = await Promise.allSettled(
        requestedChannels.map(async ({ channel, format }) => {
          const channelKey = `${channel}:${format}`
          const channelInstr = CHANNEL_INSTRUCTIONS[channelKey]
            || `Format: ${channel} ${format} (200 words). Title: short headline. Hashtags: 5–10.`
          const userPrompt = `${variantInstruction}

CHANNEL & FORMAT: ${channel} ${format}
${channelInstr}

${factsBlock}

Return ONE JSON object with title, body_text, and hashtags. Output ONLY the JSON, nothing else.`
          const text = await callClaudeJson(buildSystem(), userPrompt, 1400)
          let parsed: any = null
          try {
            const m = text.match(/\{[\s\S]*\}/)
            if (m) parsed = JSON.parse(m[0])
          } catch { /* ignore — return raw */ }
          return {
            channel,
            format,
            title: parsed?.title || '',
            body_text: parsed?.body_text || text,
            hashtags: Array.isArray(parsed?.hashtags) ? parsed.hashtags : [],
            raw: parsed ? undefined : text,
          }
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled') drafts.push(r.value)
        else drafts.push({
          channel: 'unknown',
          format: 'unknown',
          title: '',
          body_text: `Generation failed: ${r.reason?.message || 'unknown error'}`,
          hashtags: [],
        })
      }

      return new Response(
        JSON.stringify({ ok: true, drafts, variant, listing_id: listingRow?.id || listing_id, open_house_id: ohRow?.id || oh_id }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    let userMessage = ''

    if (type === 'email_content') {
      // Email Builder AI — generate email copy with full brand context
      userMessage = `You are writing an email for Dana Massey, a real estate agent. Write in her voice: warm, confident, knowledgeable, and authentic.

${prompt}

Important guidelines:
- Write in first person as Dana
- Keep paragraphs short (2-3 sentences max)
- Be personal and conversational, not corporate
- End with a clear call to action when appropriate
- Don't include subject line unless specifically asked
- Don't include HTML — just plain text
- Don't include a signature block — that's handled separately`

    } else if (type === 'write') {
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

    } else if (type === 'suggest_hooks') {
      // Generate hook ideas for a given niche/topic
      userMessage = `Generate 5 fresh, scroll-stopping hook ideas for a ${prompt || 'real estate'} social media post.

Niche/theme: ${pillar || 'Real Estate'}
Content format: ${body_text || 'Instagram post'}

Each hook should be the opening line that makes someone stop scrolling. Mix styles:
- Question hooks
- Bold statement hooks
- "POV:" or "Story time:" hooks
- Controversial/unexpected takes
- Relatable/funny hooks

Return ONLY a valid JSON array of 5 strings. No extra commentary. Example:
["Hook one...", "Hook two...", "Hook three...", "Hook four...", "Hook five..."]`

    } else if (type === 'suggest_topics') {
      // Generate content topic ideas for the week
      userMessage = `Generate 7 content topic ideas for a real estate agent's week of social media content.

The weekly format is:
${prompt}

For each day, suggest a specific, actionable content idea that fits the assigned niche/format. Be creative and timely — think trending topics, seasonal angles, local East Valley/Gilbert AZ events, and evergreen real estate content.

Return ONLY a valid JSON array of 7 objects with "day" and "idea" keys. Example:
[{"day": "Monday", "idea": "Top 5 brunch spots in Downtown Gilbert with a reel-style walkthrough"}, ...]`

    } else if (type === 'listing_plan') {
      // Generate a full new-listing or relisting strategy
      const isRelisting = plan_type === 'expired' || plan_type === 'relisting'
      const propertyDetails = property ? `

KNOWN PROPERTY DETAILS (from database):
- Address: ${property.address || address}
- City: ${property.city || ''}, AZ ${property.zip || ''}
- Beds: ${property.beds || property.bedrooms || 'unknown'}
- Baths: ${property.baths || property.bathrooms || 'unknown'}
- Sqft: ${property.sqft || 'unknown'}
- Year built: ${property.year_built || 'unknown'}
- Pool: ${property.pool ? 'yes' : 'unknown'}
- Subdivision: ${property.subdivision || 'unknown'}
- Notes: ${property.notes || 'none'}` : ''

      userMessage = `You are Dana Massey's listing strategist. Dana is a concierge agent with REAL Broker in Arizona's East Valley (Gilbert, Mesa, Queen Creek, Chandler, San Tan Valley, Apache Junction, Scottsdale). Voice: direct, warm, story-driven, no fluff, no clichés. Leads with emotion — not specs.

Generate a complete ${isRelisting ? 'RELISTING' : 'NEW LISTING LAUNCH'} strategy for the property at: ${address || property?.address}${propertyDetails}

Output a structured plan with these sections (use markdown headers):

## 1. Pricing Strategy
${isRelisting ? '- Recommended new list price with justification\n- Why the original price didn\'t work\n- Pricing psychology approach' : '- Recommended list price range (low/mid/high scenarios)\n- Position vs active competition\n- Pricing psychology approach'}

## 2. Marketing Plan
- New listing headline (Dana's voice — story-driven, emotional)
- MLS description (2-3 paragraphs)
- Targeted buyer profile
- Neighborhood story angle
- Top 3 emotional selling points

## 3. ${isRelisting ? '14-Day Relaunch Timeline' : '21-Day Launch Timeline'}
Day-by-day action plan with specific tasks for each day.

## 4. Content Calendar (first 2 weeks)
For each day, suggest specific social media content:
- Day 1: Just Listed announcement
- Day 3: Lifestyle / "what it's like to live here"
- Day 5: Area spotlight
- Day 7: Open house promotion
- Day 10: Specific feature highlight
- Day 14: Showings update / social proof

## 5. Seller Talking Points
${isRelisting ? '- Why it didn\'t sell (without blaming previous agent)\n- How the new strategy is different\n- Objection handling for price reduction' : '- How to present pricing\n- Setting showing expectations\n- Why Dana\'s approach is different'}

## 6. Competitive Edge Tactics
- Unique angles vs other listings
- Creative incentives to consider
- Buyer agent outreach strategy

Be specific, actionable, and write in Dana's actual voice — warm, confident, no buzzwords.`

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

    } else if (type === 'suggest_hashtags') {
      // Suggest hashtags for a content piece
      userMessage = `Suggest 15-20 relevant Instagram/social media hashtags for this content:

"${prompt || body_text || 'Real estate content for the East Valley, AZ market'}"

${platform ? `Target platform: ${platform}` : ''}

Mix of:
- Location hashtags (Gilbert AZ, East Valley, Phoenix metro area)
- Industry hashtags (real estate, homes for sale, etc.)
- Niche/topic hashtags specific to the content
- Trending/engagement hashtags

Return ONLY a valid JSON array of hashtag strings (WITHOUT the # symbol). No extra commentary. Example:
["gilbertaz", "realestate", "homesforsale", "eastvalley"]`

    } else if (type === 'suggest_keywords') {
      // Suggest SEO/AEO keywords for target market
      userMessage = `You are an SEO and AEO (Answer Engine Optimization) strategist for Dana Massey, a real estate agent at REAL Broker in the East Valley / Gilbert, AZ market.

Context: ${prompt || 'Real estate agent targeting buyers, sellers, and investors in Gilbert, Mesa, Queen Creek, Chandler, San Tan Valley, and the greater Phoenix metro area.'}

Generate 10 keyword/phrase suggestions across these categories:
- SEO: Traditional search engine keywords people type into Google
- AEO: Question-based phrases people ask AI assistants (ChatGPT, Perplexity, Google AI Overview)
- Local: Geo-specific keywords for the East Valley market
- Long Tail: Longer, more specific phrases with lower competition

Return ONLY a valid JSON array of objects. No extra commentary. Example:
[{"keyword": "homes for sale in Gilbert AZ", "category": "seo", "rationale": "High-volume primary geo keyword"}]`

    } else if (type === 'recreate_inspo') {
      // Analyze and recreate inspiration content in Dana's voice
      // Pull Dana's style preferences from her inspo library notes
      let styleContext = ''
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        )
        const { data: recentInspo } = await supabase
          .from('inspo_bank')
          .select('notes, source_platform, content_type, tags')
          .not('notes', 'is', null)
          .neq('notes', '')
          .order('created_at', { ascending: false })
          .limit(20)
        if (recentInspo?.length) {
          const noteLines = recentInspo.map((item: any, i: number) => {
            const tags = item.tags?.length ? ` [${item.tags.join(', ')}]` : ''
            return `${i + 1}. "${item.notes}"${tags} (${item.content_type || item.source_platform || 'general'})`
          }).join('\n')
          styleContext = `\n\nDANA'S STYLE PREFERENCES — she has saved these notes about content she likes. Use these to understand her taste and what resonates with her. Mirror these preferences in what you create:\n${noteLines}\n`
        }
      } catch (e) {
        console.error('Inspo notes lookup failed (non-fatal):', e)
      }

      // If the caller passed notes from the specific inspo item being recreated
      const itemNotes = inspo_notes ? `\n\nNOTES ON THIS SPECIFIC PIECE — what Dana liked about it:\n"${inspo_notes}"\nMake sure the recreation captures these specific qualities she called out.\n` : ''

      userMessage = `I found this content that I'd like to recreate in my own voice and style:

"${prompt || body_text}"

${platform ? `Target platform: ${platform}` : ''}
${pillar ? `Content pillar: ${pillar}` : ''}
${styleContext}${itemNotes}
Please do TWO things:

1. **ANALYZE** the structure: What hook type is used? What's the emotional arc? What's the CTA pattern? What format/structure makes it effective?

2. **RECREATE** it in Dana's voice — warm, confident, authentic East Valley real estate agent. Same structure and intent, completely different words. Make it sound like Dana wrote it from scratch. Pay attention to her style preferences above — she's told you what she likes.

Return ONLY a valid JSON object with these keys (no extra commentary):
{
  "analysis": "Brief structural breakdown...",
  "recreated_text": "The full recreated post...",
  "suggested_hashtags": ["hashtag1", "hashtag2", ...],
  "suggested_hook": "The opening hook line..."
}`
    }

    // ─── Multi-turn refine: conversational AI content refinement ──────────
    // When type === 'refine', the frontend sends a full conversation history.
    // We pass it straight to Claude so it can refine without repeating itself.
    if (type === 'refine' && Array.isArray(conversation) && conversation.length > 0) {
      const refineSystem = SYSTEM_PROMPT + brandContext + frameworkContext + avatarContext + contentRulesContext + `

REFINEMENT MODE: The user is iterating on content with you. You are having a conversation to get the perfect output.

Rules:
- Do NOT repeat the same content you already gave. Each revision should be meaningfully different.
- If the user says "rewrite" or "try again" without specifics, ask what they'd like changed — offer 2-3 specific options (e.g. "I can try a different angle, shorten it, make it more emotional, or switch up the hook. What sounds right?")
- When you produce new content, output ONLY the new content text — no labels, no "Here's the rewrite:", no markdown headers. Just the caption/post/script itself.
- If suggesting hashtags, return them with a single # prefix (not ##).
- Be concise in your questions. Don't over-explain.`

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
          system: refineSystem,
          messages: conversation,
        }),
      })

      const refineModel = 'claude-sonnet-4-6'
      if (!response.ok) {
        let detail = ''
        try {
          const errBody = await response.json()
          detail = errBody?.error?.message || JSON.stringify(errBody)
        } catch {
          detail = await response.text().catch(() => '')
        }
        await logAiGeneration(logSb, { service: 'anthropic', model: refineModel, kind: 'refine', succeeded: false })
        return new Response(
          JSON.stringify({ error: `Anthropic API error (${response.status}): ${detail || 'unknown'}`, code: 'anthropic_api_error' }),
          { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      const result = await response.json()
      await logAiGeneration(logSb, {
        service: 'anthropic',
        model: refineModel,
        kind: 'refine',
        cost_cents: anthropicCostCents(refineModel, result?.usage),
        succeeded: true,
      })
      const text = result.content?.[0]?.text ?? ''
      return new Response(JSON.stringify({ text }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Pick model + token budget by task. listing_plan is long-form strategy
    // work — worth the Opus spend. Everything else stays on Sonnet.
    const model = type === 'listing_plan' ? 'claude-opus-4-6' : 'claude-sonnet-4-6'
    const maxTokens = type === 'listing_plan' ? 8192 : (type === 'recreate_inspo' ? 2048 : 1024)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT + brandContext + frameworkContext + avatarContext + contentRulesContext,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    // Surface Anthropic errors instead of silently returning empty text.
    // Previously this swallowed 4xx/5xx from the API and callers would see
    // an empty `text` field with no explanation.
    if (!response.ok) {
      let detail = ''
      try {
        const errBody = await response.json()
        detail = errBody?.error?.message || JSON.stringify(errBody)
      } catch {
        detail = await response.text().catch(() => '')
      }
      await logAiGeneration(logSb, { service: 'anthropic', model, kind: type || 'generate', succeeded: false })
      return new Response(
        JSON.stringify({
          error: `Anthropic API error (${response.status}): ${detail || 'unknown'}`,
          code: 'anthropic_api_error',
          status: response.status,
        }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const result = await response.json()
    await logAiGeneration(logSb, {
      service: 'anthropic',
      model,
      kind: type || 'generate',
      cost_cents: anthropicCostCents(model, result?.usage),
      succeeded: true,
    })
    const text = result.content?.[0]?.text ?? ''

    if (!text) {
      return new Response(
        JSON.stringify({
          error: 'Anthropic returned an empty response. Try again.',
          code: 'empty_response',
          raw: result,
        }),
        { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // For suggest_hooks, parse JSON array
    if (type === 'suggest_hooks') {
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : []
        return new Response(JSON.stringify({ hooks: parsed }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      } catch {
        return new Response(JSON.stringify({ hooks: [], raw: text }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // For suggest_topics, parse JSON array
    if (type === 'suggest_topics') {
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : []
        return new Response(JSON.stringify({ topics: parsed }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      } catch {
        return new Response(JSON.stringify({ topics: [], raw: text }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // For suggest_hashtags, parse JSON array
    if (type === 'suggest_hashtags') {
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : []
        return new Response(JSON.stringify({ hashtags: parsed }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      } catch {
        return new Response(JSON.stringify({ hashtags: [], raw: text }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // For suggest_keywords, parse JSON array of objects
    if (type === 'suggest_keywords') {
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : []
        return new Response(JSON.stringify({ keywords: parsed }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      } catch {
        return new Response(JSON.stringify({ keywords: [], raw: text }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // For recreate_inspo, parse JSON object with analysis + recreated_text
    if (type === 'recreate_inspo') {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        return new Response(JSON.stringify(parsed), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      } catch {
        // Fallback: return as plain text
        return new Response(JSON.stringify({ recreated_text: text, analysis: '', suggested_hashtags: [], suggested_hook: '' }), {
          headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
    }

    // For email_content, return plain text as 'content'
    if (type === 'email_content') {
      return new Response(JSON.stringify({ content: text }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

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
    console.error('generate-content error:', err)
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({
        error: message || 'Unknown error',
        code: 'internal_error',
      }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

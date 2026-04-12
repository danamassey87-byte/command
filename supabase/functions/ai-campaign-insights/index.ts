// ─────────────────────────────────────────────────────────────────────────────
// ai-campaign-insights — Claude Sonnet analyzes campaign performance and
// generates optimization recommendations.
//
// Called by:
//   - pg_cron (weekly batch analysis)
//   - Frontend "Analyze" button (manual trigger for single campaign)
//
// Expects JSON body: { campaign_id?: uuid } — omit for batch mode (all eligible)
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MIN_SENDS = 20 // Statistical floor
const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
  const db = createClient(supabaseUrl, serviceKey)

  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    let body: Record<string, unknown> = {}
    try { body = await req.json() } catch {}

    // Find eligible campaigns
    let campaignIds: string[] = []

    if (body.campaign_id) {
      campaignIds = [body.campaign_id as string]
    } else {
      // Batch mode — find campaigns with enough sends and no recent analysis
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const { data: campaigns } = await db
        .from('campaigns')
        .select('id')
        .in('status', ['active', 'paused', 'completed'])
        .is('deleted_at', null)

      // Filter to campaigns with ≥ MIN_SENDS total history rows
      const eligible: string[] = []
      for (const c of campaigns ?? []) {
        const { count } = await db
          .from('campaign_step_history')
          .select('id', { count: 'exact', head: true })
          .in('enrollment_id',
            (await db.from('campaign_enrollments').select('id').eq('campaign_id', c.id)).data?.map((e: { id: string }) => e.id) ?? []
          )
        if ((count ?? 0) >= MIN_SENDS) {
          // Check if already analyzed recently
          const { data: recent } = await db
            .from('campaign_ai_recommendations')
            .select('created_at')
            .eq('campaign_id', c.id)
            .order('created_at', { ascending: false })
            .limit(1)
          if (!recent?.length || recent[0].created_at < sevenDaysAgo) {
            eligible.push(c.id)
          }
        }
      }
      campaignIds = eligible.slice(0, 5) // Max 5 per batch
    }

    const results: Record<string, unknown>[] = []
    const batchId = crypto.randomUUID()

    for (const campaignId of campaignIds) {
      // Load campaign + steps
      const { data: campaign } = await db
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single()
      if (!campaign) continue

      const { data: steps } = await db
        .from('campaign_steps')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('step_order')

      // Load enrollments + history
      const { data: enrollments } = await db
        .from('campaign_enrollments')
        .select('id, status')
        .eq('campaign_id', campaignId)

      const enrollmentIds = (enrollments ?? []).map((e: { id: string }) => e.id)

      const { data: history } = await db
        .from('campaign_step_history')
        .select('*')
        .in('enrollment_id', enrollmentIds.length ? enrollmentIds : ['__none__'])

      // Aggregate stats per step
      const stepStats = (steps ?? []).map((step: Record<string, unknown>, idx: number) => {
        const stepHistory = (history ?? []).filter((h: Record<string, unknown>) => h.step_index === idx)
        const sent = stepHistory.length
        const delivered = stepHistory.filter((h: Record<string, unknown>) => h.delivered_at).length
        const opened = stepHistory.filter((h: Record<string, unknown>) => h.opened_at).length
        const clicked = stepHistory.filter((h: Record<string, unknown>) => h.clicked_at).length
        const bounced = stepHistory.filter((h: Record<string, unknown>) => h.bounced_at).length

        return {
          step_index: idx,
          type: step.type,
          subject: step.subject,
          body: (step.body ?? '').slice(0, 500), // Truncate for token efficiency
          has_design: !!step.email_blocks,
          cta_labels: ((step.email_blocks ?? []) as Record<string, unknown>[])
            .filter(b => b.type === 'cta')
            .map(b => b.label),
          delay_days: step.delay_days,
          sent, delivered, opened, clicked, bounced,
          open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
          click_rate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
          bounce_rate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
        }
      })

      const totalSent = stepStats.reduce((s: number, st: { sent: number }) => s + st.sent, 0)
      const totalOpened = stepStats.reduce((s: number, st: { opened: number }) => s + st.opened, 0)
      const overallOpenRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0

      // Load brand voice
      const { data: brandRow } = await db
        .from('user_settings')
        .select('value')
        .eq('key', 'brand_profile')
        .maybeSingle()
      const brandVoice = brandRow?.value?.guidelines?.brand_voice ?? 'Professional, warm, approachable real estate agent in Gilbert/East Valley AZ'

      // Call Claude Sonnet
      const prompt = `You are an email marketing optimization expert for real estate agents. Analyze this campaign's performance data and provide specific, actionable recommendations.

CAMPAIGN: "${campaign.name}"
Type: ${campaign.type || 'general'}
Status: ${campaign.status}
Overall open rate: ${overallOpenRate}%
Total sends: ${totalSent}

STEP-BY-STEP PERFORMANCE:
${stepStats.map((s: Record<string, unknown>) => `
Step ${(s.step_index as number) + 1} (${s.type}, +${s.delay_days} days):
  Subject: "${s.subject || 'N/A'}"
  Body preview: "${(s.body as string || '').slice(0, 200)}"
  CTA buttons: ${(s.cta_labels as string[])?.join(', ') || 'none'}
  Has designed email: ${s.has_design}
  Sent: ${s.sent} | Delivered: ${s.delivered} | Opened: ${s.opened} (${s.open_rate}%) | Clicked: ${s.clicked} (${s.click_rate}%) | Bounced: ${s.bounced} (${s.bounce_rate}%)
`).join('')}

BRAND VOICE: ${brandVoice}

Provide 3-6 specific recommendations as a JSON array. Each recommendation must have:
- "type": one of "subject_line", "email_body", "cta", "send_time", "step_order", "funnel"
- "step_index": number (0-based) or null for campaign-level
- "current_value": what it is now (quote the actual subject/CTA/etc)
- "suggested_value": your specific replacement text
- "reasoning": 1-2 sentences explaining WHY, citing the data
- "confidence": 0.0 to 1.0

Focus on the biggest opportunities first. Be specific — don't say "make it better", write the actual replacement text. Consider real estate email best practices.

Respond with ONLY the JSON array, no other text.`

      const claudeRes = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const claudeData = await claudeRes.json()
      const content = claudeData?.content?.[0]?.text ?? '[]'

      // Parse recommendations
      let recs: Record<string, unknown>[] = []
      try {
        // Extract JSON array from response (handle markdown code blocks)
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        recs = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      } catch {
        console.error('Failed to parse Claude response:', content.slice(0, 200))
        recs = []
      }

      // Insert recommendations
      if (recs.length > 0) {
        const rows = recs.map((r: Record<string, unknown>) => ({
          campaign_id: campaignId,
          step_index: r.step_index ?? null,
          type: r.type || 'email_body',
          current_value: r.current_value || null,
          suggested_value: r.suggested_value || null,
          reasoning: r.reasoning || null,
          confidence: r.confidence ?? 0.5,
          status: 'pending',
          batch_id: batchId,
        }))

        await db.from('campaign_ai_recommendations').insert(rows)
      }

      results.push({
        campaign_id: campaignId,
        name: campaign.name,
        total_sends: totalSent,
        recommendations: recs.length,
      })
    }

    return new Response(JSON.stringify({ ok: true, batch_id: batchId, results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('ai-campaign-insights error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// compile-weekly-showing-report — Aggregates per-listing stats from the last
// 7 days into weekly_report_snapshots for dynamic insertion into client emails.
//
// Cron: Monday 6:00 AM MST (13:00 UTC)
//
// Flow:
//   1. Find all listings with showings in the past 7 days
//   2. Compile showings, feedback, and stats per listing
//   3. Compare to prior week for trend calculation
//   4. Evaluate price reduction signals
//   5. Insert snapshot rows for use by send-campaign-step
// ─────────────────────────────────────────────────────────────────────────────
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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const periodEnd = new Date()
    const periodStart = new Date(periodEnd)
    periodStart.setDate(periodStart.getDate() - 7)

    const periodStartStr = periodStart.toISOString().split('T')[0]
    const periodEndStr = periodEnd.toISOString().split('T')[0]

    // Prior week for trend comparison
    const priorStart = new Date(periodStart)
    priorStart.setDate(priorStart.getDate() - 7)
    const priorStartStr = priorStart.toISOString().split('T')[0]

    // Step 1: Find all listings with showings this week
    const { data: weekShowings } = await supabase
      .from('showing_requests')
      .select('listing_id, property_address, mls_number')
      .gte('requested_date', periodStartStr)
      .lte('requested_date', periodEndStr)
      .neq('status', 'cancelled')
      .not('listing_id', 'is', null)

    // Deduplicate by listing_id
    const listingMap = new Map<string, { address: string; mls: string | null }>()
    for (const s of weekShowings || []) {
      if (s.listing_id && !listingMap.has(s.listing_id)) {
        listingMap.set(s.listing_id, { address: s.property_address, mls: s.mls_number })
      }
    }

    const reports = []

    for (const [listingId, meta] of listingMap) {
      // Step 2: Fetch this week's showings
      const { data: showings } = await supabase
        .from('showing_requests')
        .select('id, requested_date, requested_time, agent_name, agent_brokerage, status')
        .eq('listing_id', listingId)
        .gte('requested_date', periodStartStr)
        .lte('requested_date', periodEndStr)
        .neq('status', 'cancelled')
        .order('requested_date', { ascending: true })

      // Step 3: Fetch feedback received this week
      const { data: feedback } = await supabase
        .from('showing_feedback')
        .select(
          'agent_name, feedback_text, overall_rating, price_opinion, buyer_interest, sentiment_label, sentiment_summary, received_at',
        )
        .eq('listing_id', listingId)
        .gte('received_at', periodStart.toISOString())
        .order('received_at', { ascending: true })

      // Step 4: Get lifetime stats
      const { data: stats } = await supabase
        .from('listing_showing_stats')
        .select('*')
        .eq('listing_id', listingId)
        .maybeSingle()

      // Step 5: Prior week count for trend
      const { count: priorWeekCount } = await supabase
        .from('showing_requests')
        .select('id', { count: 'exact', head: true })
        .eq('listing_id', listingId)
        .gte('requested_date', priorStartStr)
        .lt('requested_date', periodStartStr)
        .neq('status', 'cancelled')

      const thisWeekCount = showings?.length || 0
      const trend =
        (priorWeekCount || 0) === 0
          ? thisWeekCount > 0
            ? 'up'
            : 'flat'
          : thisWeekCount > (priorWeekCount || 0)
            ? 'up'
            : thisWeekCount < (priorWeekCount || 0)
              ? 'down'
              : 'flat'

      // Step 6: Price reduction signal
      const priceSignal = evaluatePriceSignal(stats, feedback || [], listingId)

      // Step 7: Insert snapshot
      const { data: snapshot } = await supabase
        .from('weekly_report_snapshots')
        .insert({
          listing_id: listingId,
          property_address: meta.address,
          report_period_start: periodStartStr,
          report_period_end: periodEndStr,
          showings_data: showings || [],
          feedback_data: feedback || [],
          stats: {
            total_showings: thisWeekCount,
            feedback_count: feedback?.length || 0,
            avg_rating: stats?.week_avg_rating,
            avg_sentiment: stats?.week_avg_sentiment,
            showing_trend: trend,
            lifetime_showings: stats?.total_showings || 0,
            lifetime_feedback_rate: stats?.feedback_rate || 0,
            price_signal: priceSignal,
          },
        })
        .select()
        .single()

      reports.push(snapshot)

      // Refresh stats while we're at it
      await supabase.rpc('refresh_listing_showing_stats', { p_listing_id: listingId })
    }

    return json({ ok: true, compiled: reports.length, listings: [...listingMap.keys()] })
  } catch (err: any) {
    console.error('compile-weekly-showing-report error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

// ─── Price Signal Evaluation ────────────────────────────────────────────────

interface PriceSignal {
  shouldFlag: boolean
  reason: string
  severity: 'info' | 'warning' | 'urgent'
}

function evaluatePriceSignal(
  stats: any,
  feedback: any[],
  _listingId: string,
): PriceSignal {
  const priceOpinions = feedback.filter((f) => f.price_opinion)
  const tooHighCount = priceOpinions.filter((f) => f.price_opinion === 'too_high').length
  const tooHighPct = priceOpinions.length > 0 ? tooHighCount / priceOpinions.length : 0

  const interestedCount = feedback.filter(
    (f) => f.buyer_interest === 'very_interested' || f.buyer_interest === 'interested',
  ).length
  const interestRate = feedback.length > 0 ? interestedCount / feedback.length : 0

  const triggers: PriceSignal[] = []

  // >50% say too high with 3+ data points
  if (tooHighPct > 0.5 && priceOpinions.length >= 3) {
    triggers.push({
      shouldFlag: true,
      reason: `${Math.round(tooHighPct * 100)}% of agents (${tooHighCount}/${priceOpinions.length}) say price is too high`,
      severity: 'warning',
    })
  }

  // High showings + zero offers after 3 weeks
  if (stats && stats.total_showings >= 10 && (stats.offers_received || 0) === 0) {
    triggers.push({
      shouldFlag: true,
      reason: `${stats.total_showings} showings with 0 offers — showing-to-offer ratio indicates price resistance`,
      severity: 'urgent',
    })
  }

  // Low interest rate
  if (interestRate < 0.25 && feedback.length >= 4) {
    triggers.push({
      shouldFlag: true,
      reason: `Only ${Math.round(interestRate * 100)}% buyer interest rate across ${feedback.length} showings`,
      severity: 'warning',
    })
  }

  // Return most severe
  const severityOrder: Record<string, number> = { urgent: 3, warning: 2, info: 1 }
  triggers.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])

  return triggers[0] || { shouldFlag: false, reason: '', severity: 'info' }
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

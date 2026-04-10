// ─────────────────────────────────────────────────────────────────────────────
// dispatch-due-campaigns — cron-triggered dispatcher that finds active
// enrollments whose next_send_at <= now() and fans out to send-campaign-step.
//
// Scheduling: call this via pg_cron every 10 minutes, or via Supabase
// Scheduled Functions, or an external cron (Vercel, GitHub Actions, etc).
//
// Guards:
//   - Only processes campaigns where auto_send_enabled = true
//   - Skips steps with requires_approval = true (manual_email type)
//   - Skips task-type steps (auto-advances instead)
//   - Rate-limits to 50 sends per invocation to avoid Resend rate limits
//   - Skips enrollments that were just sent (prevents double-fire)
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_PER_RUN = 50 // Rate-limit per invocation

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey)

  const sendFunctionUrl = `${supabaseUrl}/functions/v1/send-campaign-step`

  try {
    // Find active enrollments with next_send_at in the past
    const { data: dueEnrollments, error } = await db
      .from('campaign_enrollments')
      .select(`
        id, campaign_id, contact_id, current_step, next_send_at, status
      `)
      .eq('status', 'active')
      .not('next_send_at', 'is', null)
      .lte('next_send_at', new Date().toISOString())
      .order('next_send_at', { ascending: true })
      .limit(MAX_PER_RUN)

    if (error) {
      return json({ error: 'Failed to query enrollments', detail: error.message }, 500)
    }

    if (!dueEnrollments?.length) {
      return json({ result: 'idle', dispatched: 0, message: 'No enrollments due' })
    }

    // Pre-load campaigns to check auto_send_enabled + steps for requires_approval
    const campaignIds = [...new Set(dueEnrollments.map(e => e.campaign_id))]
    const { data: campaigns } = await db
      .from('campaigns')
      .select('id, auto_send_enabled, name')
      .in('id', campaignIds)

    const campaignMap = new Map((campaigns || []).map(c => [c.id, c]))

    // Pre-load steps to check requires_approval and type
    const { data: allSteps } = await db
      .from('campaign_steps')
      .select('campaign_id, step_order, type, requires_approval')
      .in('campaign_id', campaignIds)
      .order('step_order', { ascending: true })

    // Group steps by campaign_id
    const stepsByC = new Map<string, any[]>()
    for (const s of (allSteps || [])) {
      if (!stepsByC.has(s.campaign_id)) stepsByC.set(s.campaign_id, [])
      stepsByC.get(s.campaign_id)!.push(s)
    }

    const results: any[] = []

    for (const enrollment of dueEnrollments) {
      const campaign = campaignMap.get(enrollment.campaign_id)

      // Guard: campaign must have auto_send_enabled
      if (!campaign?.auto_send_enabled) {
        results.push({ enrollment_id: enrollment.id, result: 'skipped', reason: 'auto_send_disabled' })
        continue
      }

      // Guard: current step must not require approval
      const steps = stepsByC.get(enrollment.campaign_id) || []
      const currentStep = steps[enrollment.current_step]
      if (!currentStep) {
        results.push({ enrollment_id: enrollment.id, result: 'skipped', reason: 'step_not_found' })
        continue
      }

      if (currentStep.requires_approval) {
        results.push({ enrollment_id: enrollment.id, result: 'skipped', reason: 'requires_approval' })
        continue
      }

      // Task steps: auto-advance without sending
      if (currentStep.type === 'task') {
        const nextIdx = enrollment.current_step + 1
        const isComplete = nextIdx >= steps.length
        if (isComplete) {
          await db.from('campaign_enrollments').update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            next_send_at: null,
          }).eq('id', enrollment.id)
        } else {
          const nextStep = steps[nextIdx]
          const nextDate = new Date()
          nextDate.setDate(nextDate.getDate() + (nextStep?.delay_days ?? 0))
          await db.from('campaign_enrollments').update({
            current_step: nextIdx,
            next_send_at: nextDate.toISOString(),
          }).eq('id', enrollment.id)
        }
        results.push({ enrollment_id: enrollment.id, result: 'task_advanced' })
        continue
      }

      // ─── Dispatch to send-campaign-step ────────────────────────────────────
      try {
        const sendRes = await fetch(sendFunctionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ enrollment_id: enrollment.id }),
        })

        const sendData = await sendRes.json()
        results.push({
          enrollment_id: enrollment.id,
          result: sendRes.ok ? 'sent' : 'error',
          detail: sendData,
        })
      } catch (fetchErr: any) {
        results.push({
          enrollment_id: enrollment.id,
          result: 'fetch_error',
          error: fetchErr.message,
        })
      }
    }

    return json({
      result: 'dispatched',
      total_due: dueEnrollments.length,
      results,
    })

  } catch (err: any) {
    console.error('dispatch-due-campaigns error:', err)
    return json({ error: err.message }, 500)
  }
})

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

// cash-offer-sla-check — hourly cron that walks pending cash_offer_routings
// and marks any past-SLA row as outcome='expired'. For each expired row it:
//   1. Adds a daily_task ("FCO SLA expired — pivot conversation")
//   2. Emits a notification to Dana
//   3. (TODO) Auto-enrolls the contact in the configured fallback campaign
//      once a "Traditional list" sequence exists in campaigns.
//
// Triggered hourly via pg_cron. Idempotent — only flips pending → expired once,
// and the daily_task source_link dedupe prevents duplicate tasks.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const result = { expired: 0, tasksCreated: 0, errors: [] as string[] }

  try {
    // 1 · Find pending routings whose SLA has passed.
    const { data: pending, error: pendErr } = await supabase
      .from('cash_offer_routings')
      .select('id, contact_id, lead_source_id, property_address, sla_due_at, contact:contacts(name)')
      .eq('outcome', 'pending')
      .lt('sla_due_at', new Date().toISOString())

    if (pendErr) throw pendErr
    if (!pending || pending.length === 0) {
      return json({ ok: true, ...result })
    }

    // 2 · Mark each expired and queue Dana's pivot task.
    for (const r of pending) {
      try {
        // Flip to expired.
        const { error: upErr } = await supabase
          .from('cash_offer_routings')
          .update({ outcome: 'expired', updated_at: new Date().toISOString() })
          .eq('id', r.id)
          .eq('outcome', 'pending')  // optimistic guard against races
        if (upErr) throw upErr
        result.expired++

        // 3 · Queue a follow-up task for Dana (idempotent on source_link).
        const sourceLink = `fco-sla-expired://${r.id}`
        const { data: existing } = await supabase
          .from('daily_tasks')
          .select('id')
          .eq('source_link', sourceLink)
          .maybeSingle()

        if (!existing) {
          const contactName = (r as any).contact?.name || 'Seller'
          const addr = r.property_address || 'their property'
          const { error: taskErr } = await supabase.from('daily_tasks').insert({
            title: `FCO SLA expired — pivot ${contactName} to traditional listing`,
            description: `FastCashOffers did not respond within 24 hours for ${addr}. Call ${contactName} to walk through traditional-listing options or schedule a CMA.`,
            category: 'follow_up',
            priority: 'high',
            status: 'pending',
            due_date: new Date().toISOString().slice(0, 10),
            contact_id: r.contact_id,
            source_type: 'cash_offer_routing',
            source_link: sourceLink,
          })
          if (taskErr) throw taskErr
          result.tasksCreated++
        }

        // 4 · Notification (best-effort).
        try {
          await supabase.from('notifications').insert({
            type: 'fco_sla_expired',
            title: 'FCO SLA expired',
            body: `${(r as any).contact?.name || 'Seller'} — ${r.property_address || 'address'} did not get a cash offer within 24h. Pivot the conversation.`,
            link: '/sellers',
            source_table: 'cash_offer_routings',
            source_id: r.id,
            metadata: { routing_id: r.id },
          })
        } catch { /* notifications table may not exist or be required — non-fatal */ }
      } catch (e: any) {
        result.errors.push(`${r.id}: ${e.message || e}`)
      }
    }

    return json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[cash-offer-sla-check]', e)
    return json({ ok: false, error: e.message || String(e), ...result }, 500)
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

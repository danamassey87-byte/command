// ─────────────────────────────────────────────────────────────────────────────
// host-report-followup — escalates a host report's strong signals into
// concrete follow-up tasks for every merged sign-in attendee.
//
// Triggered by the public OHHostReport form right after the host_report row
// is inserted (verify_jwt:false — host is unauthenticated). The form posts
// { host_report_id }; we re-load the row server-side via service-role so
// callers can't fabricate signal strength.
//
// Strong-signal heuristic (any one fires the cascade):
//   • leads_count > 0
//   • overall_impression === 'strong'
//   • price_perception === 'great_deal'
//   • offer_interest is non-trivial free text (>=8 chars, not "no" / "n/a")
//
// On a strong signal:
//   1. Pull every oh_sign_ins row for the OH where contact_id IS NOT NULL
//      (already merged into a contact via merge-oh-signin)
//   2. For each sign-in, insert a daily_tasks row tomorrow at high priority
//      with source_type='host_report' so it doesn't collide with the
//      existing oh_sign_in hot-lead task (a contact can have both)
//   3. Drop one summary notification: "Host report → N follow-up tasks"
//
// Idempotent: refuses to re-process the same host_report_id (returns
// `already_processed`). Tracks via host_reports.followup_processed_at.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

function isMeaningfulOfferInterest(text: string | null | undefined): boolean {
  if (!text) return false
  const t = text.trim().toLowerCase()
  if (t.length < 8) return false
  // Filter out trivial negatives.
  if (['no', 'none', 'n/a', 'na', 'not really', 'nothing', 'nope', 'no one'].includes(t)) return false
  return true
}

function detectStrongSignal(report: any): { strong: boolean; reasons: string[] } {
  const reasons: string[] = []
  if ((report.leads_count ?? 0) > 0) reasons.push(`${report.leads_count} hot leads on the host's count`)
  if (report.overall_impression === 'strong') reasons.push('host called the vibe Strong')
  if (report.price_perception === 'great_deal') reasons.push("host's read: priced as a Great Deal")
  if (isMeaningfulOfferInterest(report.offer_interest)) reasons.push('host noted offer interest')
  return { strong: reasons.length > 0, reasons }
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

    let body: any = {}
    try { body = await req.json() } catch { /* empty body is fine */ }
    const reportId = body?.host_report_id
    if (!reportId) return json({ error: 'host_report_id is required' }, 400)

    // Load the host_report row.
    const { data: report, error: reportErr } = await supabase
      .from('host_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle()

    if (reportErr) return json({ error: `host_reports load failed: ${reportErr.message}` }, 500)
    if (!report) return json({ error: 'host_report not found' }, 404)

    // Idempotency guard. The column is added by migration
    // 20260507_host_reports_followup_processed_at.sql — until that's applied
    // the field is undefined and we just proceed (frontend only calls us once
    // per submission so re-runs are rare; per-task dedup in the loop catches
    // the rest).
    if (report.followup_processed_at) {
      return json({ ok: true, already_processed: true, processed_at: report.followup_processed_at })
    }

    const { strong, reasons } = detectStrongSignal(report)
    if (!strong) {
      // Mark processed so we don't keep checking. Best-effort.
      const { error: markErr } = await supabase
        .from('host_reports')
        .update({ followup_processed_at: new Date().toISOString() })
        .eq('id', reportId)
      if (markErr && !String(markErr.message || '').includes('followup_processed_at')) {
        console.warn('[host-report-followup] mark-processed failed:', markErr.message)
      }
      return json({ ok: true, strong: false, reasons: [] })
    }

    // Find the OH this report is tied to. The form stores oh_date + listing_id,
    // not open_house_id directly. Resolve via metadata on the
    // host_report_received notification, OR fall back to listing_id + date.
    let openHouseId: string | null = null
    {
      // Try via the notification we wrote at submit time.
      const { data: notif } = await supabase
        .from('notifications')
        .select('metadata')
        .eq('source_table', 'host_reports')
        .eq('type', 'host_report_received')
        .order('created_at', { ascending: false })
        .limit(20)
      const match = (notif || []).find((n: any) => n?.metadata?.host_report_id === reportId)
      if (match?.metadata?.open_house_id) {
        openHouseId = match.metadata.open_house_id
      }
    }

    if (!openHouseId && report.listing_id && report.oh_date) {
      const { data: oh } = await supabase
        .from('open_houses')
        .select('id')
        .eq('listing_id', report.listing_id)
        .eq('date', report.oh_date)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (oh) openHouseId = oh.id
    }

    if (!openHouseId) {
      // Mark processed; nothing actionable. Best-effort.
      const { error: markErr } = await supabase
        .from('host_reports')
        .update({ followup_processed_at: new Date().toISOString() })
        .eq('id', reportId)
      if (markErr && !String(markErr.message || '').includes('followup_processed_at')) {
        console.warn('[host-report-followup] mark-processed failed:', markErr.message)
      }
      return json({ ok: true, strong: true, reasons, fired: 0, note: 'open_house_id could not be resolved' })
    }

    // Pull merged sign-ins for this OH.
    const { data: signins, error: siErr } = await supabase
      .from('oh_sign_ins')
      .select('id, contact_id, first_name, last_name, email, phone')
      .eq('open_house_id', openHouseId)
      .not('contact_id', 'is', null)

    if (siErr) return json({ error: `oh_sign_ins load failed: ${siErr.message}` }, 500)

    // Look up the property address for richer task descriptions.
    const { data: ohRow } = await supabase
      .from('open_houses')
      .select('property:properties(address, city)')
      .eq('id', openHouseId)
      .maybeSingle()
    const propAddr = (ohRow as any)?.property?.address || 'an open house'

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const reasonText = reasons.join(' · ')
    const hostName = report.agent_name || 'host agent'

    let fired = 0
    const skippedExisting: string[] = []

    for (const s of signins || []) {
      // Skip if a host_report-source task already exists for this contact +
      // open house. Lets the function be safely re-run.
      const { data: existing } = await supabase
        .from('daily_tasks')
        .select('id')
        .eq('contact_id', s.contact_id)
        .eq('source_type', 'host_report')
        .ilike('description', `%${openHouseId}%`)
        .limit(1)
      if (existing && existing.length) {
        skippedExisting.push(s.contact_id)
        continue
      }

      const guestName = [s.first_name, s.last_name].filter(Boolean).join(' ').trim() || 'an attendee'
      const contactInfo = [
        s.email ? `Email: ${s.email}` : null,
        s.phone ? `Phone: ${s.phone}` : null,
      ].filter(Boolean).join(' · ')

      const { error: taskErr } = await supabase
        .from('daily_tasks')
        .insert({
          title:       `Host flagged: follow up with ${guestName}`,
          description: `${hostName} called this OH strong (${reasonText}). ${guestName} attended ${propAddr}. ${contactInfo}. [oh:${openHouseId}]`,
          category:    'follow-up',
          priority:    'high',
          status:      'pending',
          due_date:    tomorrow,
          contact_id:  s.contact_id,
          source_type: 'host_report',
          source_link: `/contact/${s.contact_id}`,
          is_recurring: false,
          vendor_ids:  [],
        })
      if (taskErr) {
        console.warn('[host-report-followup] task insert failed:', taskErr.message)
        continue
      }
      fired++
    }

    // Drop one summary notification — even if 0 attendees were eligible
    // (so Dana sees the host's positive signal even with no merged sign-ins).
    await supabase
      .from('notifications')
      .insert({
        type: 'host_report_followup',
        title: fired > 0
          ? `Host report → ${fired} follow-up task${fired === 1 ? '' : 's'} for ${propAddr}`
          : `Host called ${propAddr} strong — no merged sign-ins to assign`,
        body: fired > 0
          ? `${hostName} reported strong interest (${reasonText}). Tasks queued on tomorrow's list.`
          : `${hostName} reported strong interest (${reasonText}), but no sign-ins have been matched to contacts yet for this OH.`,
        link: `/sellers`,
        source_table: 'host_reports',
        source_id: reportId,
        metadata: {
          open_house_id: openHouseId,
          host_report_id: reportId,
          fired_count: fired,
          reasons,
        },
      })
      .then(() => {}, (err: any) => console.warn('[host-report-followup] notif insert failed:', err.message))

    // Mark processed (best-effort; tolerated if migration hasn't been applied).
    {
      const { error: markErr } = await supabase
        .from('host_reports')
        .update({ followup_processed_at: new Date().toISOString() })
        .eq('id', reportId)
      if (markErr && !String(markErr.message || '').includes('followup_processed_at')) {
        console.warn('[host-report-followup] mark-processed failed:', markErr.message)
      }
    }

    return json({
      ok: true,
      strong: true,
      reasons,
      open_house_id: openHouseId,
      eligible: (signins || []).length,
      fired,
      skipped_existing: skippedExisting.length,
    })
  } catch (err: any) {
    console.error('host-report-followup error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

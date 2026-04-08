// ─────────────────────────────────────────────────────────────────────────────
// Smart Campaigns — Supabase CRUD layer
// Replaces the old localStorage persistence in SmartCampaigns.jsx.
// All functions throw on error; callers can catch or let errors bubble to
// React error boundaries.
// ─────────────────────────────────────────────────────────────────────────────
import supabase from './supabase'

async function run(promise) {
  const { data, error } = await promise
  if (error) throw new Error(error.message)
  return data
}

// ═══════════════════════════════════════════════════════════════════════════
// Campaigns
// ═══════════════════════════════════════════════════════════════════════════

/** List all campaigns (excluding soft-deleted), newest first, with their steps. */
export async function listCampaigns() {
  const campaigns = await run(
    supabase.from('campaigns')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
  )
  if (!campaigns.length) return []

  const ids = campaigns.map(c => c.id)
  const steps = await run(
    supabase.from('campaign_steps')
      .select('*')
      .in('campaign_id', ids)
      .order('step_order', { ascending: true })
  )

  // Group steps by campaign_id and attach
  const byCampaign = new Map()
  for (const s of steps) {
    if (!byCampaign.has(s.campaign_id)) byCampaign.set(s.campaign_id, [])
    byCampaign.get(s.campaign_id).push(stepRowToClient(s))
  }
  return campaigns.map(c => ({ ...c, steps: byCampaign.get(c.id) || [] }))
}

/** Create a new campaign with its steps. Returns the saved campaign (with ids). */
export async function createCampaign(campaign) {
  const { steps = [], id: _ignoreId, ...fields } = campaign
  const inserted = await run(
    supabase.from('campaigns').insert(campaignFieldsForDB(fields)).select().single()
  )
  const campaignId = inserted.id

  if (steps.length) {
    const rows = steps.map((s, i) => stepClientToRow(s, campaignId, i))
    await run(supabase.from('campaign_steps').insert(rows))
  }

  return (await getCampaign(campaignId))
}

/** Update an existing campaign: replaces ALL steps atomically-ish (delete + re-insert). */
export async function updateCampaign(campaign) {
  const { steps = [], id, ...fields } = campaign
  if (!id) throw new Error('updateCampaign requires id')

  await run(
    supabase.from('campaigns').update(campaignFieldsForDB(fields)).eq('id', id)
  )

  // Replace all steps
  await run(supabase.from('campaign_steps').delete().eq('campaign_id', id))
  if (steps.length) {
    const rows = steps.map((s, i) => stepClientToRow(s, id, i))
    await run(supabase.from('campaign_steps').insert(rows))
  }

  return (await getCampaign(id))
}

/** Save — create or update based on whether the id exists in the DB. */
export async function saveCampaign(campaign) {
  if (!campaign.id) return createCampaign(campaign)
  const existing = await run(
    supabase.from('campaigns').select('id').eq('id', campaign.id).maybeSingle()
  )
  if (existing) return updateCampaign(campaign)
  return createCampaign(campaign)
}

/** Fetch one campaign with its steps. */
export async function getCampaign(id) {
  const campaign = await run(
    supabase.from('campaigns').select('*').eq('id', id).maybeSingle()
  )
  if (!campaign) return null
  const steps = await run(
    supabase.from('campaign_steps').select('*')
      .eq('campaign_id', id)
      .order('step_order', { ascending: true })
  )
  return { ...campaign, steps: steps.map(stepRowToClient) }
}

/** Soft delete: marks deleted_at. Cascades enrollments to be hidden via status='stopped'. */
export async function deleteCampaign(id) {
  await run(
    supabase.from('campaigns').update({ deleted_at: new Date().toISOString() }).eq('id', id)
  )
  // Stop any active/paused enrollments
  await run(
    supabase.from('campaign_enrollments')
      .update({ status: 'stopped', stopped_at: new Date().toISOString() })
      .eq('campaign_id', id)
      .in('status', ['active', 'paused'])
  )
}

/** Duplicate a campaign (including all steps) with a new id. */
export async function duplicateCampaign(sourceId) {
  const source = await getCampaign(sourceId)
  if (!source) throw new Error('Source campaign not found')
  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, ...fields } = source
  return createCampaign({
    ...fields,
    name: `${source.name} (Copy)`,
    status: 'draft',
    steps: source.steps.map(s => ({ ...s, id: undefined })),
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Enrollments
// ═══════════════════════════════════════════════════════════════════════════

/** List enrollments across all campaigns, newest first. */
export async function listEnrollments() {
  return run(
    supabase.from('campaign_enrollments')
      .select('*')
      .order('enrolled_at', { ascending: false })
  )
}

/**
 * Bulk enroll many contacts into a campaign. Idempotent and suppression-aware.
 * Returns { enrolled: [...rows], skipped: [{ contact_id, reason }] }.
 *
 * Skip reasons:
 *   - 'already_active'   — already has an active enrollment in this campaign
 *   - 'suppressed'       — email is in email_suppressions
 *   - 'no_contact'       — contact_id does not exist / is soft-deleted
 */
export async function enrollContacts(campaignId, contactIds) {
  if (!campaignId) throw new Error('enrollContacts requires campaignId')
  const ids = Array.from(new Set((contactIds || []).filter(Boolean)))
  if (!ids.length) return { enrolled: [], skipped: [] }

  // Load contacts (only live rows) so we can read email for suppression check
  const contacts = await run(
    supabase.from('contacts')
      .select('id, name, email, deleted_at, archived_at')
      .in('id', ids)
  )
  const liveById = new Map(
    contacts
      .filter(c => !c.deleted_at && !c.archived_at)
      .map(c => [c.id, c])
  )

  // Existing active enrollments for this campaign
  const existing = await run(
    supabase.from('campaign_enrollments')
      .select('contact_id')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .in('contact_id', ids)
  )
  const alreadyActive = new Set(existing.map(r => r.contact_id))

  // Suppression check (by email)
  const emails = [...liveById.values()].map(c => (c.email || '').toLowerCase().trim()).filter(Boolean)
  const suppressedSet = new Set()
  if (emails.length) {
    const sup = await run(
      supabase.from('email_suppressions').select('email').in('email', emails)
    )
    for (const s of sup) suppressedSet.add((s.email || '').toLowerCase().trim())
  }

  const skipped = []
  const toInsert = []
  for (const id of ids) {
    const c = liveById.get(id)
    if (!c) { skipped.push({ contact_id: id, reason: 'no_contact' }); continue }
    if (alreadyActive.has(id)) { skipped.push({ contact_id: id, reason: 'already_active' }); continue }
    const email = (c.email || '').toLowerCase().trim()
    if (email && suppressedSet.has(email)) { skipped.push({ contact_id: id, reason: 'suppressed' }); continue }
    toInsert.push({
      campaign_id: campaignId,
      contact_id: id,
      status: 'active',
      current_step: 0,
      next_send_at: new Date().toISOString(),
      enrolled_at: new Date().toISOString(),
    })
  }

  let enrolled = []
  if (toInsert.length) {
    enrolled = await run(
      supabase.from('campaign_enrollments').insert(toInsert).select()
    )
    // Audit log rows (fire-and-forget — don't block on errors)
    const campaign = await run(
      supabase.from('campaigns').select('name').eq('id', campaignId).maybeSingle()
    )
    const auditRows = enrolled.map(e => ({
      enrollment_id: e.id,
      campaign_id: campaignId,
      contact_id: e.contact_id,
      contact_name: liveById.get(e.contact_id)?.name || '',
      campaign_name: campaign?.name || '',
      action: 'enrolled',
      detail: 'Bulk enrolled in campaign',
    }))
    if (auditRows.length) {
      try { await run(supabase.from('campaign_audit_log').insert(auditRows)) }
      catch (err) { console.warn('[enrollContacts] audit log failed:', err.message) }
    }
  }

  return { enrolled, skipped }
}

/** Enroll a contact into a campaign. Idempotent — no double active enrollment. */
export async function enrollContact(campaignId, contactId) {
  // Check for existing active enrollment
  const existing = await run(
    supabase.from('campaign_enrollments')
      .select('id')
      .eq('campaign_id', campaignId)
      .eq('contact_id', contactId)
      .eq('status', 'active')
      .maybeSingle()
  )
  if (existing) return existing

  const row = {
    campaign_id: campaignId,
    contact_id: contactId,
    status: 'active',
    current_step: 0,
    next_send_at: new Date().toISOString(),
    enrolled_at: new Date().toISOString(),
  }
  const inserted = await run(
    supabase.from('campaign_enrollments').insert(row).select().single()
  )

  // Audit log
  const [campaign, contact] = await Promise.all([
    run(supabase.from('campaigns').select('name').eq('id', campaignId).maybeSingle()),
    run(supabase.from('contacts').select('name').eq('id', contactId).maybeSingle()),
  ])
  await logAction({
    enrollment_id: inserted.id,
    campaign_id: campaignId,
    contact_id: contactId,
    contact_name: contact?.name || '',
    campaign_name: campaign?.name || '',
    action: 'enrolled',
    detail: 'Contact enrolled in campaign',
  })

  return inserted
}

export async function pauseEnrollment(id) {
  const updated = await run(
    supabase.from('campaign_enrollments')
      .update({ status: 'paused', paused_at: new Date().toISOString() })
      .eq('id', id).select().single()
  )
  await logAction({
    enrollment_id: id,
    campaign_id: updated.campaign_id,
    contact_id: updated.contact_id,
    action: 'paused',
    detail: 'Campaign paused',
  })
  return updated
}

export async function resumeEnrollment(id) {
  const updated = await run(
    supabase.from('campaign_enrollments')
      .update({ status: 'active', paused_at: null })
      .eq('id', id).select().single()
  )
  await logAction({
    enrollment_id: id,
    campaign_id: updated.campaign_id,
    contact_id: updated.contact_id,
    action: 'resumed',
    detail: 'Campaign resumed',
  })
  return updated
}

export async function stopEnrollment(id) {
  const updated = await run(
    supabase.from('campaign_enrollments')
      .update({ status: 'stopped', stopped_at: new Date().toISOString() })
      .eq('id', id).select().single()
  )
  await logAction({
    enrollment_id: id,
    campaign_id: updated.campaign_id,
    contact_id: updated.contact_id,
    action: 'stopped',
    detail: 'Campaign stopped',
  })
  return updated
}

/** Mark a step as sent: writes step_history, advances current_step, schedules next_send_at. */
export async function markStepSent(enrollmentId, stepIndex, sentVia = 'manual') {
  const enrollment = await run(
    supabase.from('campaign_enrollments').select('*').eq('id', enrollmentId).maybeSingle()
  )
  if (!enrollment) throw new Error('Enrollment not found')

  const campaign = await getCampaign(enrollment.campaign_id)
  if (!campaign) throw new Error('Campaign not found')
  const step = campaign.steps[stepIndex]
  if (!step) throw new Error(`Step ${stepIndex} not found`)

  // Write to step history
  await run(
    supabase.from('campaign_step_history').insert({
      enrollment_id: enrollmentId,
      step_index: stepIndex,
      step_type: step.type,
      subject: step.subject ?? null,
      sent_at: new Date().toISOString(),
      sent_via: sentVia,
    })
  )

  // Calculate next state
  const nextStep = stepIndex + 1
  const isComplete = nextStep >= campaign.steps.length
  const nextDelay = campaign.steps[nextStep]?.delay_days ?? 0
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + nextDelay)

  const updates = {
    current_step: isComplete ? stepIndex : nextStep,
    status: isComplete ? 'completed' : enrollment.status,
    completed_at: isComplete ? new Date().toISOString() : null,
    next_send_at: isComplete ? null : nextDate.toISOString(),
  }
  await run(
    supabase.from('campaign_enrollments').update(updates).eq('id', enrollmentId)
  )

  // Audit log
  const contact = await run(
    supabase.from('contacts').select('name').eq('id', enrollment.contact_id).maybeSingle()
  )
  await logAction({
    enrollment_id: enrollmentId,
    campaign_id: enrollment.campaign_id,
    contact_id: enrollment.contact_id,
    contact_name: contact?.name || '',
    campaign_name: campaign.name,
    action: 'step_sent',
    detail: `${step.type === 'sms' ? 'SMS' : 'Email'} sent: ${step.subject || '(SMS)'}`,
  })

  return { ...enrollment, ...updates }
}

// ═══════════════════════════════════════════════════════════════════════════
// Audit log
// ═══════════════════════════════════════════════════════════════════════════

export async function logAction(entry) {
  return run(supabase.from('campaign_audit_log').insert(entry))
}

/** List audit log — all campaigns (recent first) or filtered by enrollment. */
export async function listAuditLog({ enrollmentId = null, limit = 100 } = {}) {
  let q = supabase.from('campaign_audit_log').select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (enrollmentId) q = q.eq('enrollment_id', enrollmentId)
  return run(q)
}

/** List every step_history row (used by SmartCampaigns to populate per-enrollment history). */
export async function listAllStepHistory() {
  return run(
    supabase.from('campaign_step_history')
      .select('*')
      .order('sent_at', { ascending: true })
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Campaign Triggers (auto-enrollment on events)
// ═══════════════════════════════════════════════════════════════════════════

/** List every trigger attached to a campaign. */
export async function listTriggersForCampaign(campaignId) {
  return run(
    supabase.from('campaign_triggers')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: true })
  )
}

/** List all triggers across all campaigns. */
export async function listAllTriggers() {
  return run(
    supabase.from('campaign_triggers').select('*').order('created_at', { ascending: false })
  )
}

/** Create a new trigger. config is an arbitrary JSONB (tag_id, type_to, etc.). */
export async function createTrigger({ campaign_id, trigger_type, config = {}, enabled = true }) {
  return run(
    supabase.from('campaign_triggers')
      .insert({ campaign_id, trigger_type, config, enabled })
      .select().single()
  )
}

/** Update an existing trigger's config or enabled state. */
export async function updateTrigger(id, updates) {
  return run(
    supabase.from('campaign_triggers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
  )
}

/** Remove a trigger. */
export async function deleteTrigger(id) {
  return run(supabase.from('campaign_triggers').delete().eq('id', id))
}

/** List the most recent trigger events (for the activity panel). */
export async function listRecentTriggerEvents({ limit = 50, campaignId = null } = {}) {
  let q = supabase.from('campaign_trigger_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (campaignId) {
    // Events don't carry campaign_id directly — filter via resulting_enrollments join.
    // Since we store resulting_enrollments as uuid[], Postgres can check containment
    // but requires a different shape. For now, return all and let the UI filter.
  }
  return run(q)
}

// ═══════════════════════════════════════════════════════════════════════════
// Email suppressions
// ═══════════════════════════════════════════════════════════════════════════

export async function listSuppressions() {
  return run(
    supabase.from('email_suppressions')
      .select('*')
      .order('suppressed_at', { ascending: false })
  )
}

export async function isSuppressed(email) {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  const row = await run(
    supabase.from('email_suppressions')
      .select('id')
      .eq('email_normalized', normalized)
      .maybeSingle()
  )
  return !!row
}

export async function suppressEmail(email, reason = 'manual', notes = null) {
  return run(
    supabase.from('email_suppressions').upsert(
      { email, reason, source: 'manual_ui', notes },
      { onConflict: 'email_normalized' }
    ).select().single()
  )
}

export async function unsuppressEmail(email) {
  const normalized = email.trim().toLowerCase()
  return run(
    supabase.from('email_suppressions').delete().eq('email_normalized', normalized)
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Row ↔ client shape helpers
// ═══════════════════════════════════════════════════════════════════════════

function campaignFieldsForDB(c) {
  return {
    name: c.name,
    description: c.description ?? null,
    type: c.type ?? null,
    status: c.status ?? 'draft',
    send_via_domain: c.send_via_domain ?? 'primary',
    auto_send_enabled: !!c.auto_send_enabled,
  }
}

function stepClientToRow(s, campaignId, order) {
  return {
    campaign_id: campaignId,
    step_order: order,
    type: s.type,
    delay_days: Number(s.delay_days ?? 0),
    delay_label: s.delay_label ?? null,
    subject: s.subject ?? null,
    body: s.body ?? null,
    email_blocks: s.email_blocks ?? null,
    email_settings: s.email_settings ?? null,
    // B2: new step types
    requires_approval: !!s.requires_approval,
    task_title: s.task_title ?? null,
    task_notes: s.task_notes ?? null,
    task_link: s.task_link ?? null,
  }
}

function stepRowToClient(r) {
  return {
    id: r.id,
    order: r.step_order,
    type: r.type,
    delay_days: r.delay_days,
    delay_label: r.delay_label,
    subject: r.subject,
    body: r.body,
    email_blocks: r.email_blocks,
    email_settings: r.email_settings,
    // B2
    requires_approval: !!r.requires_approval,
    task_title: r.task_title ?? null,
    task_notes: r.task_notes ?? null,
    task_link: r.task_link ?? null,
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// One-time localStorage → Supabase migration
// Call this once on first mount of SmartCampaigns. It's idempotent via a flag.
// ═══════════════════════════════════════════════════════════════════════════

const MIGRATION_FLAG = 'sc_migrated_to_supabase_v1'

export async function migrateLocalStorageIfNeeded() {
  if (typeof window === 'undefined') return { migrated: false, reason: 'no-window' }
  if (localStorage.getItem(MIGRATION_FLAG)) return { migrated: false, reason: 'already-done' }

  const load = (k) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? [] }
    catch { return [] }
  }
  const oldCampaigns   = load('sc_campaigns')
  const oldEnrollments = load('sc_enrollments')
  const oldHistory     = load('sc_history')

  if (!oldCampaigns.length && !oldEnrollments.length && !oldHistory.length) {
    localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
    return { migrated: false, reason: 'nothing-to-migrate' }
  }

  // Map old client ids → new Supabase ids so we can rewrite enrollment references
  const campaignIdMap = new Map()
  for (const c of oldCampaigns) {
    try {
      const saved = await createCampaign({
        name: c.name,
        description: c.description,
        type: c.type,
        status: c.status === 'template' ? 'draft' : (c.status || 'draft'),
        send_via_domain: 'primary',
        steps: (c.steps || []).map(s => ({
          type: s.type,
          delay_days: Number(s.delay_days ?? 0),
          delay_label: s.delay_label,
          subject: s.subject,
          body: s.body,
          email_blocks: s.email_blocks,
          email_settings: s.email_settings,
        })),
      })
      campaignIdMap.set(c.id, saved.id)
    } catch (e) {
      console.warn(`[campaigns migration] skipped campaign "${c.name}":`, e.message)
    }
  }

  // Enrollments (only active/paused — completed/stopped don't need to carry over since
  // the old step_history is not perfectly recoverable)
  for (const e of oldEnrollments) {
    const newCampaignId = campaignIdMap.get(e.campaign_id)
    if (!newCampaignId) continue
    if (!e.contact_id) continue
    try {
      const enrollment = await enrollContact(newCampaignId, e.contact_id)
      // Preserve status and current step
      if (e.status !== 'active' || e.current_step > 0) {
        await run(
          supabase.from('campaign_enrollments').update({
            status: e.status || 'active',
            current_step: e.current_step || 0,
            next_send_at: e.next_send_at || null,
            paused_at: e.paused_at || null,
            completed_at: e.completed_at || null,
            stopped_at: e.stopped_at || null,
          }).eq('id', enrollment.id)
        )
      }
      // Preserve step_history entries
      for (const h of (e.step_history || [])) {
        await run(supabase.from('campaign_step_history').insert({
          enrollment_id: enrollment.id,
          step_index: h.step_index,
          step_type: h.step_type || 'email',
          subject: h.subject || null,
          sent_at: h.sent_at || new Date().toISOString(),
          sent_via: 'manual',
        }))
      }
    } catch (err) {
      console.warn(`[campaigns migration] skipped enrollment:`, err.message)
    }
  }

  localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
  return {
    migrated: true,
    campaigns: campaignIdMap.size,
    enrollments: oldEnrollments.length,
  }
}

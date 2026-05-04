/**
 * Interaction bridges — auto-log events from various sources
 * into the unified interactions table.
 *
 * Call these from existing handlers to build the activity timeline.
 */
import supabase from './supabase.js'

// Fire-and-forget: never block the caller
function logQuiet(data) {
  supabase.from('interactions').insert(data).then(() => {}).catch(() => {})
}

/** Log a showing as an interaction */
export function logShowingInteraction({ contactId, propertyId, address, status }) {
  logQuiet({
    contact_id: contactId,
    property_id: propertyId || null,
    kind: 'showing',
    channel: 'command',
    body: `Showing at ${address || 'property'}${status ? ` (${status})` : ''}`,
    metadata: { status },
  })
}

/** Log showing feedback as an interaction */
export function logShowingFeedback({ contactId, propertyId, address, feedback, rating }) {
  logQuiet({
    contact_id: contactId,
    property_id: propertyId || null,
    kind: 'note',
    channel: 'command',
    body: `Showing feedback for ${address || 'property'}: ${feedback || ''}${rating ? ` (${rating})` : ''}`,
    metadata: { type: 'showing-feedback', rating },
  })
}

/** Log a campaign email send as an interaction */
export function logEmailSend({ contactId, subject, campaignName }) {
  logQuiet({
    contact_id: contactId,
    kind: 'email-sent',
    channel: 'resend',
    body: subject || `Campaign email: ${campaignName || 'unnamed'}`,
    metadata: { campaign: campaignName },
  })
}

/** Log an email open as an interaction */
export function logEmailOpen({ contactId, subject }) {
  logQuiet({
    contact_id: contactId,
    kind: 'email-open',
    channel: 'resend',
    body: `Opened: ${subject || 'email'}`,
    metadata: {},
  })
}

/** Log an email click as an interaction */
export function logEmailClick({ contactId, subject, url }) {
  logQuiet({
    contact_id: contactId,
    kind: 'email-click',
    channel: 'resend',
    body: `Clicked in: ${subject || 'email'}`,
    metadata: { url },
  })
}

/** Log a bio-link form submission as an interaction */
export function logBioLinkCapture({ contactId, formName }) {
  logQuiet({
    contact_id: contactId,
    kind: 'form-fill',
    channel: 'bio-link',
    body: `Bio link form submission: ${formName || 'contact form'}`,
    metadata: { source: 'bio-link' },
  })
}

/** Log an intake form submission as an interaction */
export function logIntakeFormSubmission({ contactId, formName }) {
  logQuiet({
    contact_id: contactId,
    kind: 'form-fill',
    channel: 'command',
    body: `Intake form submitted: ${formName || 'form'}`,
    metadata: { source: 'intake-form' },
  })
}

/** Log a deal stage change as an interaction */
export function logDealStageChange({ contactId, dealId, fromStage, toStage, propertyAddress }) {
  logQuiet({
    contact_id: contactId,
    deal_id: dealId,
    kind: 'transact-milestone',
    channel: 'command',
    body: `Deal stage: ${fromStage || '—'} → ${toStage}${propertyAddress ? ` (${propertyAddress})` : ''}`,
    metadata: { from: fromStage, to: toStage },
  })
}

/** Log a note as an interaction */
export function logNoteCreated({ contactId, notePreview }) {
  logQuiet({
    contact_id: contactId,
    kind: 'note',
    channel: 'command',
    body: notePreview?.slice(0, 200) || 'New note added',
    metadata: { type: 'note' },
  })
}

/** Log a campaign enrollment status change (paused/resumed/stopped) as an interaction */
export function logCampaignEnrollmentChange({ contactId, action, campaignName }) {
  const verb = action === 'paused' ? 'Paused' : action === 'resumed' ? 'Resumed' : action === 'stopped' ? 'Unenrolled from' : 'Updated'
  logQuiet({
    contact_id: contactId,
    kind: 'campaign-enrollment',
    channel: 'command',
    body: `${verb} campaign: ${campaignName || 'unnamed'}`,
    metadata: { action, campaign: campaignName },
  })
}

/** Log a Slack post as an interaction */
export function logSlackPost({ contactId, channelName, message }) {
  logQuiet({
    contact_id: contactId,
    kind: 'slack-post',
    channel: 'slack',
    body: `${channelName}: ${message?.slice(0, 200) || 'Message posted'}`,
    metadata: { channel: channelName },
  })
}

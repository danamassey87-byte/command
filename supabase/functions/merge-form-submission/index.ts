// ─────────────────────────────────────────────────────────────────────────────
// merge-form-submission — auto-merge public form / bio link submissions into contacts.
//
// Called after any public form is submitted (intake forms, bio link guides, etc.)
// Mirrors the merge-oh-signin pattern:
//   1. Look up contact by email or phone
//   2. Create new contact if not found, update tags if found
//   3. Link submission back to contact (merged_contact_id)
//   4. Log interaction on the contact timeline
//   5. Fire a notification so Dana knows immediately
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/** Try to extract a value from the form data JSON by checking common field names. */
function extract(data: Record<string, any>, ...keys: string[]): string | null {
  for (const key of keys) {
    for (const [k, v] of Object.entries(data)) {
      if (k.toLowerCase().replace(/[_\- ]/g, '').includes(key.toLowerCase().replace(/[_\- ]/g, '')) && v) {
        return String(v).trim()
      }
    }
  }
  return null
}

/** Derive a human-readable form label from the slug. */
function formLabel(slug: string): string {
  return slug
    .replace(/-[a-f0-9]{6,}$/i, '')  // strip hash suffix
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim() || 'Form'
}

/** Derive lead source tag from form slug. */
function formTag(slug: string): string {
  const lower = slug.toLowerCase()
  if (lower.includes('buyer'))  return 'Buyer Intake'
  if (lower.includes('seller')) return 'Seller Intake'
  if (lower.includes('guide'))  return 'Guide Download'
  if (lower.includes('bio'))    return 'Bio Link Lead'
  if (lower.includes('home') && lower.includes('value')) return 'Home Value Request'
  return `Form: ${formLabel(slug)}`
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

    const { submission_id } = await req.json()
    if (!submission_id) {
      return new Response(
        JSON.stringify({ error: 'Missing submission_id' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Load the submission ────────────────────────────────────────────
    const { data: sub, error: subErr } = await supabase
      .from('public_form_submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (subErr || !sub) {
      return new Response(
        JSON.stringify({ error: 'Submission not found' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Already merged?
    if (sub.merged_contact_id) {
      return new Response(
        JSON.stringify({ ok: true, contact_id: sub.merged_contact_id, action: 'already_merged' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const formData = sub.data || {}
    const slug = sub.form_slug || ''
    const now = new Date().toISOString()

    // ─── Extract contact info from form data ────────────────────────────
    const email = (extract(formData, 'email') || '').toLowerCase() || null
    const phone = extract(formData, 'phone', 'cell', 'mobile', 'telephone') || null
    const firstName = extract(formData, 'firstname', 'first_name', 'first') || sub.client_name?.split(' ')[0] || null
    const lastName = extract(formData, 'lastname', 'last_name', 'last') || sub.client_name?.split(' ').slice(1).join(' ') || null
    const fullName = sub.client_name || [firstName, lastName].filter(Boolean).join(' ') || 'Unknown'

    // Must have at least email or phone to merge
    if (!email && !phone) {
      return new Response(
        JSON.stringify({ ok: true, action: 'skipped', reason: 'No email or phone in submission' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // ─── Look up existing contact ───────────────────────────────────────
    let existingContact: { id: string; tags?: string[] } | null = null
    if (email) {
      const { data } = await supabase
        .from('contacts')
        .select('id, tags')
        .ilike('email', email)
        .limit(1)
        .maybeSingle()
      if (data) existingContact = data
    }
    if (!existingContact && phone) {
      const { data } = await supabase
        .from('contacts')
        .select('id, tags')
        .eq('phone', phone)
        .limit(1)
        .maybeSingle()
      if (data) existingContact = data
    }

    let contactId: string
    const tag = formTag(slug)
    const label = formLabel(slug)

    if (existingContact) {
      // ─── Update existing contact with form tag ──────────────────────
      contactId = existingContact.id
      const existingTags: string[] = existingContact.tags || []
      const newTags = [...new Set([...existingTags, tag])]

      await supabase
        .from('contacts')
        .update({
          tags: newTags,
          updated_at: now,
          // Fill in phone if contact doesn't have one
          ...(phone && !existingContact ? { phone } : {}),
        })
        .eq('id', contactId)

    } else {
      // ─── Create new contact ─────────────────────────────────────────
      const notes: string[] = []

      // Pull useful info from form fields
      const timeframe = extract(formData, 'timeframe', 'timeline', 'when')
      const budget = extract(formData, 'budget', 'price', 'pricerange', 'price_range')
      const preApproved = extract(formData, 'preapproved', 'pre_approved', 'approved')
      const areas = extract(formData, 'area', 'location', 'neighborhood', 'city', 'cities')
      const message = extract(formData, 'message', 'comments', 'notes', 'additional')

      if (timeframe) notes.push(`Timeframe: ${timeframe}`)
      if (budget) notes.push(`Budget: ${budget}`)
      if (preApproved) notes.push(`Pre-approved: ${preApproved}`)
      if (areas) notes.push(`Areas of interest: ${areas}`)
      if (message) notes.push(`Message: ${message}`)

      const contactData: Record<string, any> = {
        first_name: firstName,
        last_name: lastName,
        email: email || null,
        phone: phone || null,
        lead_source: tag,
        tags: [tag],
        notes: notes.length > 0 ? notes.join('\n') : `Submitted ${label} form`,
        status: 'lead',
        created_at: now,
      }

      // Try to determine buyer vs seller type
      const lower = slug.toLowerCase()
      if (lower.includes('buyer') || lower.includes('guide')) {
        contactData.type = 'buyer'
      } else if (lower.includes('seller') || lower.includes('home') && lower.includes('value')) {
        contactData.type = 'seller'
      }

      const { data: newContact, error: createErr } = await supabase
        .from('contacts')
        .insert(contactData)
        .select('id')
        .single()

      if (createErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to create contact', detail: createErr.message }),
          { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
        )
      }

      contactId = newContact.id
    }

    // ─── Link submission to contact ─────────────────────────────────────
    await supabase
      .from('public_form_submissions')
      .update({ merged_contact_id: contactId, merged_at: now })
      .eq('id', submission_id)

    // ─── Log interaction on contact timeline ────────────────────────────
    await supabase
      .from('interactions')
      .insert({
        contact_id: contactId,
        kind: 'form-fill',
        channel: 'web',
        direction: 'inbound',
        body: `${fullName} submitted the ${label} form`,
        metadata: {
          source: 'form-submission',
          form_slug: slug,
          submission_id: submission_id,
        },
      })

    // ─── Fire notification ──────────────────────────────────────────────
    await supabase
      .from('notifications')
      .insert({
        type: 'form_returned',
        title: `${label} submitted`,
        body: `${fullName} just filled out the ${label} form.${email ? ` Email: ${email}` : ''}${phone ? ` Phone: ${phone}` : ''}`,
        link: `/contact/${contactId}`,
        source_table: 'public_form_submissions',
        source_id: submission_id,
        metadata: {
          contact_id: contactId,
          form_slug: slug,
          client_name: fullName,
          action: existingContact ? 'updated' : 'created',
        },
      })

    return new Response(
      JSON.stringify({
        ok: true,
        contact_id: contactId,
        action: existingContact ? 'updated' : 'created',
        tag,
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('merge-form-submission error:', err)
    return new Response(
      JSON.stringify({ error: message, code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

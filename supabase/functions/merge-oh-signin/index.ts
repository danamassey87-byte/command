// ─────────────────────────────────────────────────────────────────────────────
// merge-oh-signin — auto-merge OH sign-in into contacts table.
//
// Called after a guest submits the sign-in form. Checks if contact exists
// by email or phone, creates/updates contact, links back to sign-in record.
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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { sign_in_id } = await req.json()
    if (!sign_in_id) {
      return new Response(
        JSON.stringify({ error: 'Missing sign_in_id' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Load the sign-in record
    const { data: signIn, error: siErr } = await supabase
      .from('oh_sign_ins')
      .select('*, open_house:open_houses(id, date, property:properties(id, address, city))')
      .eq('id', sign_in_id)
      .single()

    if (siErr || !signIn) {
      return new Response(
        JSON.stringify({ error: 'Sign-in not found' }),
        { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    if (signIn.contact_id) {
      return new Response(
        JSON.stringify({ ok: true, contact_id: signIn.contact_id, action: 'already_merged' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const email = signIn.email?.trim().toLowerCase()
    const phone = signIn.phone?.trim()
    const propertyAddr = signIn.open_house?.property?.address || ''
    const now = new Date().toISOString()

    // Try to find existing contact by normalized email or phone (so formatting differences don't create dupes)
    const normEmail = email || null
    const normPhone = phone ? phone.replace(/[^0-9]/g, '') : null
    let existingContact = null
    if (normEmail) {
      const { data } = await supabase
        .from('contacts')
        .select('id')
        .eq('email_normalized', normEmail)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      if (data) existingContact = data
    }
    if (!existingContact && normPhone) {
      const { data } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone_normalized', normPhone)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle()
      if (data) existingContact = data
    }

    let contactId: string

    if (existingContact) {
      // Update existing contact with OH tag
      contactId = existingContact.id
      const { data: contact } = await supabase
        .from('contacts')
        .select('tags')
        .eq('id', contactId)
        .single()

      const existingTags: string[] = contact?.tags || []
      const newTags = [...new Set([
        ...existingTags,
        'Open House',
        `OH: ${propertyAddr}`,
      ])]

      await supabase
        .from('contacts')
        .update({
          tags: newTags,
          updated_at: now,
          ...(signIn.phone && !contact?.phone ? { phone: signIn.phone } : {}),
        })
        .eq('id', contactId)
    } else {
      // Create new contact
      const contactData = {
        first_name: signIn.first_name,
        last_name: signIn.last_name,
        email: email || null,
        phone: phone || null,
        lead_source: 'Open House',
        tags: ['Open House', `OH: ${propertyAddr}`],
        notes: [
          signIn.working_with_agent ? `Has agent: ${signIn.agent_name || 'yes'}` : 'No agent — hot lead',
          signIn.pre_approved ? `Pre-approved${signIn.lender_name ? ` (${signIn.lender_name})` : ''}` : null,
          signIn.timeframe ? `Timeframe: ${signIn.timeframe}` : null,
          signIn.need_to_sell ? 'Needs to sell current home' : null,
        ].filter(Boolean).join('\n'),
        status: signIn.working_with_agent ? 'lead' : 'hot_lead',
        created_at: now,
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

    // Link sign-in to contact
    await supabase
      .from('oh_sign_ins')
      .update({ contact_id: contactId, merged_at: now })
      .eq('id', sign_in_id)

    return new Response(
      JSON.stringify({
        ok: true,
        contact_id: contactId,
        action: existingContact ? 'updated' : 'created',
      }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('merge-oh-signin error:', err)
    return new Response(
      JSON.stringify({ error: message, code: 'internal_error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})

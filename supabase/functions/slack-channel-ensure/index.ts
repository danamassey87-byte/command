// ─────────────────────────────────────────────────────────────────────────────
// slack-channel-ensure — Find or create a Slack channel for a client.
//
// Called by frontend when:
//   1. New listing appointment is created
//   2. Listing status changes to 'signed'
//   3. Buyer enters active pipeline stage
//   4. Any other event that needs a Slack channel for a contact
//
// Expects JSON body:
//   { contactId: uuid, contactType: 'seller'|'buyer', listingId?: uuid, propertyAddress?: string }
//
// Returns: { slackChannelId, channelName, isNew }
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ensureSlackChannel } from '../_shared/slack.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  const slackToken = Deno.env.get('SLACK_BOT_TOKEN')
  if (!slackToken) {
    return json({ error: 'SLACK_BOT_TOKEN not configured' }, 503)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    const body = await req.json()
    const { contactId, contactType, listingId, propertyAddress } = body

    if (!contactId || !contactType) {
      return json({ error: 'contactId and contactType are required' }, 400)
    }

    if (!['seller', 'buyer'].includes(contactType)) {
      return json({ error: 'contactType must be "seller" or "buyer"' }, 400)
    }

    // Fetch contact name
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .select('name')
      .eq('id', contactId)
      .single()

    if (contactErr || !contact) {
      return json({ error: 'Contact not found' }, 404)
    }

    // For sellers, resolve property address from listing if not provided
    let address = propertyAddress
    if (contactType === 'seller' && !address && listingId) {
      const { data: listing } = await supabase
        .from('listings')
        .select('property:properties(address)')
        .eq('id', listingId)
        .single()

      address = (listing as any)?.property?.address || 'unknown'
    }

    const channel = await ensureSlackChannel(supabase, slackToken, {
      contactId,
      contactName: contact.name,
      contactType,
      listingId,
      propertyAddress: address,
    })

    return json(channel)
  } catch (err: any) {
    console.error('slack-channel-ensure error:', err)
    return json({ error: err.message || 'Internal error' }, 500)
  }
})

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

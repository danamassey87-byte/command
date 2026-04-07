// Supabase Edge Function: validate-address
// Validates a US street address against the USPS Addresses 3.0 API and
// returns the standardized version (USPS-preferred casing/abbreviations,
// ZIP+4, county, DPV deliverability flag).
//
// Required env vars (set via `supabase secrets set`):
//   USPS_CONSUMER_KEY    — from developers.usps.com
//   USPS_CONSUMER_SECRET — from developers.usps.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TOKEN_URL = 'https://apis.usps.com/oauth2/v3/token'
const ADDRESS_URL = 'https://apis.usps.com/addresses/v3/address'

// In-memory token cache (per cold start). USPS tokens last ~8 hours.
let cachedToken: { token: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token
  }
  const key = Deno.env.get('USPS_CONSUMER_KEY')
  const secret = Deno.env.get('USPS_CONSUMER_SECRET')
  if (!key || !secret) throw new Error('USPS_CONSUMER_KEY / USPS_CONSUMER_SECRET not set')

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: key,
      client_secret: secret,
      scope: 'addresses',
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`USPS auth failed (${res.status}): ${txt}`)
  }
  const data = await res.json()
  const ttl = Number(data.expires_in ?? 28800) * 1000
  cachedToken = { token: data.access_token, expiresAt: Date.now() + ttl }
  return cachedToken.token
}

interface ValidateInput {
  address?: string        // street line, e.g. "1234 N Main St Apt 2"
  streetAddress?: string  // alternative explicit field
  secondaryAddress?: string
  city?: string
  state?: string          // 2-letter
  zip?: string            // 5-digit
  zipPlus4?: string
}

function splitStreetAndUnit(line: string): { street: string; unit?: string } {
  // Detect common secondary unit designators at the end of the line
  const re = /\s+(apt|apartment|unit|suite|ste|#|bldg|building|floor|fl|lot|rm|room)\.?\s*([\w\-]+)\s*$/i
  const m = line.match(re)
  if (m) {
    return {
      street: line.slice(0, m.index).trim(),
      unit: `${m[1]} ${m[2]}`.trim(),
    }
  }
  return { street: line.trim() }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const body = (await req.json()) as ValidateInput

    let streetAddress = (body.streetAddress ?? body.address ?? '').trim()
    let secondaryAddress = (body.secondaryAddress ?? '').trim()
    if (!secondaryAddress && streetAddress) {
      const split = splitStreetAndUnit(streetAddress)
      streetAddress = split.street
      if (split.unit) secondaryAddress = split.unit
    }
    const city = (body.city ?? '').trim()
    const state = (body.state ?? '').trim().toUpperCase()
    const zip = (body.zip ?? '').trim()

    if (!streetAddress) throw new Error('Street address is required')
    if (!zip && !(city && state)) {
      throw new Error('Provide either ZIP code or both city and state')
    }

    const token = await getAccessToken()
    const params = new URLSearchParams()
    params.set('streetAddress', streetAddress)
    if (secondaryAddress) params.set('secondaryAddress', secondaryAddress)
    if (city) params.set('city', city)
    if (state) params.set('state', state)
    if (zip) params.set('ZIPCode', zip.split('-')[0])
    if (body.zipPlus4) params.set('ZIPPlus4', body.zipPlus4)

    const res = await fetch(`${ADDRESS_URL}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      const txt = await res.text()
      // 400 from USPS = address not found / invalid input — surface gracefully
      if (res.status === 400 || res.status === 404) {
        return new Response(
          JSON.stringify({ valid: false, reason: 'USPS could not match this address', detail: txt }),
          { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
        )
      }
      throw new Error(`USPS lookup failed (${res.status}): ${txt}`)
    }

    const data = await res.json()
    const addr = data.address ?? {}
    const additional = data.additionalInfo ?? {}

    // DPV confirmation indicators: 'Y' (full match), 'S' (street match, secondary missing/wrong),
    // 'D' (street match, secondary missing), 'N' (no match)
    const dpv = additional.DPVConfirmation ?? additional.dpvConfirmation ?? null
    const deliverable = dpv === 'Y' || dpv === 'S' || dpv === 'D'

    return new Response(
      JSON.stringify({
        valid: true,
        deliverable,
        dpvConfirmation: dpv,
        standardized: {
          streetAddress: addr.streetAddress ?? '',
          secondaryAddress: addr.secondaryAddress ?? '',
          city: addr.city ?? '',
          state: addr.state ?? '',
          zip: addr.ZIPCode ?? addr.zipCode ?? '',
          zipPlus4: addr.ZIPPlus4 ?? addr.zipPlus4 ?? '',
          county: additional.countyName ?? null,
          carrierRoute: additional.carrierRoute ?? null,
        },
        raw: data,
      }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// meta-proxy — server-side wrapper for Meta Marketing API calls.
//
// C12 from SECURITY_AUDIT_PUNCHLIST: previously the Meta long-lived
// access_token round-tripped through React state — loaded from
// user_settings into a useState in Settings.jsx, then sent as
// `Authorization: Bearer ${token}` from the browser straight to
// graph.facebook.com. Any XSS could grab the token via
// `await DB.getMetaAdsConfig()` and exfiltrate a 60-day credential good
// for full ads_management on Dana's account.
//
// This function holds the token server-side. Frontend invokes with
// { op, ... } and never sees the token. Supported ops:
//
//   save_token        Persist a freshly-pasted token + ad_account_id.
//                     Body: { access_token, ad_account_id, report_stats? }
//   get_status        Read sanitized status (no token in response).
//                     Body: {}
//                     Returns: { connected, ad_account_id, report_stats }
//   campaigns         Fetch active campaigns + adsets.
//                     Body: {}
//                     Returns: Array<{ id, name, status, adsets[] }>
//   insights          Fetch insights for one object id.
//                     Body: { object_id, date_preset? }
//                     Returns: { impressions, reach, clicks, spend, ... }
//
// Frontend should NEVER call graph.facebook.com directly anymore.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeadersFor } from '../_shared/cors.ts'

const GRAPH = 'https://graph.facebook.com/v21.0'

interface MetaConfigValue {
  access_token?: string
  ad_account_id?: string
  report_stats?: boolean
  campaign_count?: number
  has_access_token?: boolean
  configured_at?: string
}

async function loadConfig(db: any): Promise<MetaConfigValue> {
  const { data } = await db
    .from('user_settings')
    .select('value')
    .eq('key', 'meta_ads_config')
    .maybeSingle()
  return (data?.value as MetaConfigValue) || {}
}

async function saveConfig(db: any, value: MetaConfigValue): Promise<void> {
  await db
    .from('user_settings')
    .upsert(
      { key: 'meta_ads_config', value, updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    )
}

serve(async (req) => {
  const CORS = corsHeadersFor(req.headers.get('origin'))
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: any
  try { body = await req.json() } catch { body = {} }
  const op = body.op as string

  try {
    if (op === 'save_token') {
      const token = String(body.access_token || '').trim()
      const adAccountId = String(body.ad_account_id || '').trim()
      const reportStats = body.report_stats === true
      if (!token) return json({ error: 'access_token is required' }, 400)
      if (!adAccountId) return json({ error: 'ad_account_id is required' }, 400)

      const existing = await loadConfig(db)
      const next: MetaConfigValue = {
        ...existing,
        access_token: token,
        ad_account_id: adAccountId,
        report_stats: reportStats,
        has_access_token: true,
        configured_at: existing.configured_at || new Date().toISOString(),
      }
      await saveConfig(db, next)
      return json({ ok: true, connected: true, ad_account_id: adAccountId, report_stats: reportStats })
    }

    if (op === 'get_status') {
      const cfg = await loadConfig(db)
      return json({
        connected: !!cfg.access_token,
        ad_account_id: cfg.ad_account_id || null,
        report_stats: cfg.report_stats === true,
        campaign_count: cfg.campaign_count ?? null,
      })
    }

    if (op === 'disconnect') {
      // Clear the token but keep the rest of the config so re-connect can
      // restore prior preferences.
      const existing = await loadConfig(db)
      const next: MetaConfigValue = {
        ...existing,
        access_token: undefined,
        has_access_token: false,
      }
      delete next.access_token
      await saveConfig(db, next)
      return json({ ok: true, connected: false })
    }

    // From here on we need a token + ad_account_id.
    const cfg = await loadConfig(db)
    const token = cfg.access_token
    if (!token) return json({ error: 'Meta not connected — call save_token first', code: 'not_connected' }, 400)

    if (op === 'campaigns') {
      const adAccountId = cfg.ad_account_id
      if (!adAccountId) return json({ error: 'ad_account_id not configured' }, 400)

      const campResp = await fetch(
        `${GRAPH}/act_${adAccountId}/campaigns?fields=id,name,status,objective,start_time,stop_time&limit=50`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(15_000),
        },
      )
      if (!campResp.ok) {
        const err = await campResp.json().catch(() => ({}))
        return json({ error: err.error?.message || `Meta API error ${campResp.status}` }, 502)
      }
      const campData = await campResp.json()
      const campaigns = campData.data || []

      // Adsets per campaign (sequential to keep within token's rate limit;
      // small campaign counts in practice for a single-agent account).
      for (const camp of campaigns) {
        try {
          const adsetResp = await fetch(
            `${GRAPH}/${camp.id}/adsets?fields=id,name,status,targeting&limit=50`,
            {
              headers: { 'Authorization': `Bearer ${token}` },
              signal: AbortSignal.timeout(15_000),
            },
          )
          camp.adsets = adsetResp.ok ? ((await adsetResp.json()).data || []) : []
        } catch {
          camp.adsets = []
        }
      }
      return json({ campaigns })
    }

    if (op === 'insights') {
      const objectId = String(body.object_id || '').trim()
      const datePreset = String(body.date_preset || 'lifetime').trim()
      if (!objectId) return json({ error: 'object_id is required' }, 400)

      const resp = await fetch(
        `${GRAPH}/${objectId}/insights?fields=impressions,reach,clicks,spend,actions,ctr,cpc,cost_per_action_type&date_preset=${encodeURIComponent(datePreset)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(15_000),
        },
      )
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        return json({ error: err.error?.message || `Meta API error ${resp.status}` }, 502)
      }
      const data = await resp.json()
      const row = (data.data || [])[0] || {}
      const leadAction = (row.actions || []).find((a: any) =>
        a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped',
      )
      const leads = leadAction ? Number(leadAction.value) : 0
      const conversions = (row.actions || []).reduce((sum: number, a: any) => sum + (Number(a.value) || 0), 0)
      const cplAction = (row.cost_per_action_type || []).find((a: any) =>
        a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped',
      )
      return json({
        impressions: Number(row.impressions) || 0,
        reach:       Number(row.reach)       || 0,
        clicks:      Number(row.clicks)      || 0,
        spend:       Number(row.spend)       || 0,
        ctr:         Number(row.ctr)         || 0,
        cpc:         Number(row.cpc)         || 0,
        leads,
        cpl:         cplAction ? Number(cplAction.value) : (leads > 0 ? Number(row.spend) / leads : 0),
        conversions,
      })
    }

    return json({ error: `unknown op: ${op}` }, 400)
  } catch (err: any) {
    console.error('[meta-proxy] error:', err)
    return json({ error: err?.message || 'internal error' }, 500)
  }
})

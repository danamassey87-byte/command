// gmail-leads-setup — one-shot helper that creates Gmail labels (and optionally
// filters) for every active lead_sources row whose intake.method='email_forwarder'.
//
// For each source it ensures:
//   • Label `Leads/<slug>` exists (creates if missing). Stores label id back on
//     lead_sources.intake.gmail_label_id.
//   • If body includes `create_filters=true` AND source.intake.from_filter is set,
//     also creates a Gmail filter (from:<filter> → addLabelIds=<label>, skip inbox).
//
// Idempotent — labels with the matching name are reused; filters that already
// match the criteria are skipped.
//
// Requires Google OAuth scope: gmail.modify (labels) + gmail.settings.basic (filters).
// User must reconnect Google in Settings if they only have the older readonly scope.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getGmailAccessToken } from '../_shared/gmail.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

interface LabelResp {
  id: string
  name: string
}

interface FilterResp {
  id: string
  criteria: { from?: string }
  action: { addLabelIds?: string[]; removeLabelIds?: string[] }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { create_filters = false } = await req.json().catch(() => ({}))

  const result = {
    sources: 0,
    labelsCreated: 0,
    labelsReused: 0,
    filtersCreated: 0,
    filtersSkipped: 0,
    errors: [] as string[],
    scopeError: null as string | null,
  }

  try {
    const accessToken = await getGmailAccessToken(supabase)

    // ─── Pull active sources ────────────────────────────────────────────────
    const { data: sources, error: srcErr } = await supabase
      .from('lead_sources')
      .select('id, slug, display_name, intake')
      .eq('status', 'active')
      .filter('intake->>method', 'eq', 'email_forwarder')

    if (srcErr) throw srcErr
    if (!sources || sources.length === 0) {
      return json({ ok: true, ...result, note: 'No sources with intake.method=email_forwarder' })
    }
    result.sources = sources.length

    // ─── Pre-fetch existing labels + filters for dedup ─────────────────────
    const labels = await listLabels(accessToken)
    const labelByName = new Map(labels.map(l => [l.name, l]))

    let filters: FilterResp[] = []
    if (create_filters) {
      try {
        filters = await listFilters(accessToken)
      } catch (e: any) {
        // Filter scope might be missing — log but don't abort.
        if (String(e.message).includes('Insufficient')) {
          result.scopeError = 'gmail.settings.basic scope missing — reconnect Google to enable filter creation. Labels still created.'
        } else {
          result.errors.push(`list_filters: ${e.message}`)
        }
      }
    }

    // ─── Per source ──────────────────────────────────────────────────────────
    for (const source of sources) {
      const labelName = `Leads/${source.slug}`
      try {
        // Find or create label.
        let label = labelByName.get(labelName)
        if (label) {
          result.labelsReused++
        } else {
          label = await createLabel(accessToken, labelName)
          labelByName.set(labelName, label)
          result.labelsCreated++
        }

        // Persist label id on source.intake so the cron can use it directly.
        const newIntake = { ...(source.intake || {}), gmail_label_id: label.id, gmail_label_name: labelName }
        await supabase.from('lead_sources').update({ intake: newIntake }).eq('id', source.id)

        // Create filter if requested + we have a from_filter configured.
        if (create_filters && !result.scopeError) {
          const fromFilter = source.intake?.from_filter as string | undefined
          if (!fromFilter) {
            result.filtersSkipped++
            continue
          }
          // L5: validate from_filter shape — must look like an email or
          // domain so a typo like `"*"` doesn't create a Gmail filter that
          // captures every inbox email under the source's label and skips
          // inbox. Allow `user@domain`, `*@domain`, or `domain.tld`. Reject
          // anything starting with `*` alone or containing ` OR ` (those
          // widen the filter's reach far beyond a single sender).
          const trimmed = fromFilter.trim()
          const looksOk =
            /@[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed) ||                  // <anything>@domain.tld
            /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(trimmed)                     // bare domain.tld
          const looksTooWide =
            /^\*+$/.test(trimmed) || /\s+or\s+/i.test(trimmed) || trimmed === ''
          if (!looksOk || looksTooWide) {
            result.errors.push(`${source.slug} filter: from_filter "${trimmed}" rejected — must be a single email or domain (no "*" or "OR")`)
            continue
          }
          // Skip if a filter already exists with the same criteria + label.
          const existing = filters.find(f =>
            f.criteria?.from === fromFilter &&
            (f.action?.addLabelIds || []).includes(label!.id),
          )
          if (existing) {
            result.filtersSkipped++
            continue
          }
          try {
            await createFilter(accessToken, fromFilter, label.id, source.intake?.skip_inbox !== false)
            result.filtersCreated++
          } catch (e: any) {
            result.errors.push(`${source.slug} filter: ${e.message}`)
          }
        }
      } catch (e: any) {
        result.errors.push(`${source.slug}: ${e.message || e}`)
      }
    }

    return json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[gmail-leads-setup]', e)
    return json({ ok: false, error: e.message || String(e), ...result }, 500)
  }
})

// ─── Gmail helpers ──────────────────────────────────────────────────────────
async function listLabels(token: string): Promise<LabelResp[]> {
  const r = await fetch(`${GMAIL_API}/labels`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`list labels failed (${r.status}): ${await r.text()}`)
  const data = await r.json()
  return data.labels || []
}

async function createLabel(token: string, name: string): Promise<LabelResp> {
  const r = await fetch(`${GMAIL_API}/labels`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
      color: { backgroundColor: '#b99aff', textColor: '#ffffff' },
    }),
  })
  if (!r.ok) {
    const txt = await r.text()
    if (r.status === 409) {
      // Already exists — fetch and return.
      const list = await listLabels(token)
      const found = list.find(l => l.name === name)
      if (found) return found
    }
    throw new Error(`create label "${name}" failed (${r.status}): ${txt}`)
  }
  return r.json()
}

async function listFilters(token: string): Promise<FilterResp[]> {
  const r = await fetch(`${GMAIL_API}/settings/filters`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) {
    const txt = await r.text()
    if (r.status === 403 && txt.includes('Insufficient')) {
      throw new Error('Insufficient scope (gmail.settings.basic)')
    }
    throw new Error(`list filters failed (${r.status}): ${txt}`)
  }
  const data = await r.json()
  return data.filter || []
}

async function createFilter(token: string, fromFilter: string, labelId: string, skipInbox: boolean) {
  const action: any = { addLabelIds: [labelId] }
  if (skipInbox) action.removeLabelIds = ['INBOX']
  const r = await fetch(`${GMAIL_API}/settings/filters`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      criteria: { from: fromFilter },
      action,
    }),
  })
  if (!r.ok) throw new Error(`create filter failed (${r.status}): ${await r.text()}`)
  return r.json()
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

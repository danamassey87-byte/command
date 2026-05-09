// gmail-leads-backfill-labels — one-shot helper that retroactively applies
// the `Leads/<slug>` Gmail label to every existing message matching each
// email-forwarder source's `intake.from_filter`. Used after Gmail filters
// are first set up, so the inbox view matches what's already in the CRM
// (filters only auto-apply to incoming mail going forward, not history).
//
// Idempotent — Gmail's batchModify is a no-op when the label is already
// present. Safe to re-run.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { getGmailAccessToken, searchGmail } from '../_shared/gmail.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const result = {
    sourcesProcessed: 0,
    messagesLabeled: 0,
    perSource: [] as Array<{ slug: string; count: number; label_id: string | null }>,
    errors: [] as string[],
  }

  try {
    const accessToken = await getGmailAccessToken(supabase)

    const { data: sources } = await supabase
      .from('lead_sources')
      .select('slug, display_name, intake')
      .eq('status', 'active')
      .filter('intake->>method', 'eq', 'email_forwarder')

    if (!sources || sources.length === 0) {
      return json({ ok: true, ...result, note: 'No email_forwarder sources' })
    }

    for (const src of sources) {
      const labelId    = src.intake?.gmail_label_id as string | undefined
      const fromFilter = src.intake?.from_filter as string | undefined  // e.g. "@certileads.com"
      if (!labelId || !fromFilter) {
        result.errors.push(`${src.slug}: missing gmail_label_id or from_filter`)
        continue
      }

      // Strip leading "@" if present — Gmail's `from:` operator wants the bare domain
      const domain = fromFilter.replace(/^@/, '')
      const query = `from:${domain}`

      const messages = await searchGmail(accessToken, query, 200)
      if (messages.length === 0) {
        result.perSource.push({ slug: src.slug, count: 0, label_id: labelId })
        continue
      }

      const ids = messages.map(m => m.id)
      const r = await fetch(`${GMAIL_API}/messages/batchModify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, addLabelIds: [labelId] }),
      })

      if (!r.ok) {
        const txt = await r.text().catch(() => '')
        result.errors.push(`${src.slug} batchModify (${r.status}): ${txt.slice(0, 300)}`)
        continue
      }

      result.sourcesProcessed++
      result.messagesLabeled += ids.length
      result.perSource.push({ slug: src.slug, count: ids.length, label_id: labelId })
    }

    return json({ ok: true, ...result })
  } catch (e: any) {
    console.error('[gmail-leads-backfill-labels]', e)
    return json({ ok: false, error: e.message || String(e), ...result }, 500)
  }
})

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

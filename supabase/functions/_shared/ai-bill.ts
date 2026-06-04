// Centralized cost-tracked LLM caller for all edge functions.
// Replaces the raw `fetch('https://api.anthropic.com/v1/messages', ...)` pattern
// scattered across ai-assistant-chat, generate-content, ai-campaign-insights,
// auto-generate-content, build-gamma-custom, build-presentation, canva-generate,
// compile-weekly-showing-report, feedback-follow-up, send-newsletter, etc.
//
// What it does (per Handoff README v2 §12):
//   1. Loads / creates this month's row in cost_ledger for the service
//   2. If amount >= budget_cap, rejects with HTTP-503-equivalent
//   3. Calls Anthropic, reads usage.input_tokens + usage.output_tokens
//   4. Computes $ at the published model rate, increments cost_ledger.amount
//   5. Posts to system_events at 80%/95% thresholds (Slack #system fans out from there)
//   6. Returns the original response object so callers don't need to change shapes
//
// Acceptance Tests non-functional gate: NO direct anthropic.messages.create
// imports outside this file. Grep enforced in CI (eventually).

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

// ───────────────────────────────────────────────────────────────────────────
// Pricing table — published Anthropic rates as of training cutoff Jan 2026.
// Keep in sync with https://www.anthropic.com/pricing
// Values are USD per 1M tokens.
// ───────────────────────────────────────────────────────────────────────────
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-7':       { input: 15.00, output: 75.00 },
  'claude-opus-4-6':       { input: 15.00, output: 75.00 },
  'claude-sonnet-4-6':     { input:  3.00, output: 15.00 },
  'claude-sonnet-4-5':     { input:  3.00, output: 15.00 },
  'claude-haiku-4-5':      { input:  0.80, output:  4.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
}

// Default model is Sonnet 4.6 — matches the existing edge function pattern.
// Callers should pass `model: 'claude-haiku-4-5'` for chore tasks (titles,
// classification, one-liners) per README §12.
const DEFAULT_MODEL = 'claude-sonnet-4-6'

// ───────────────────────────────────────────────────────────────────────────
// Public API
// ───────────────────────────────────────────────────────────────────────────

export type BillingService =
  | 'anthropic' | 'openai' | 'elevenlabs' | 'openweathermap'
  | 'resend' | 'twilio' | 'total'

export interface BillError extends Error {
  code: 'budget_exceeded' | 'missing_api_key' | 'upstream_error' | 'unknown'
  status: number
  service?: BillingService
  budgetCap?: number
  spentSoFar?: number
}

function billError(
  code: BillError['code'],
  status: number,
  message: string,
  extra: Partial<BillError> = {},
): BillError {
  const e = new Error(message) as BillError
  e.code = code
  e.status = status
  Object.assign(e, extra)
  return e
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | Array<{ type: string; text?: string; [k: string]: unknown }>
}

interface CallAnthropicOptions {
  /** Anthropic model id. Default: claude-sonnet-4-6. Use Haiku for chore tasks. */
  model?: string
  /** max_tokens — required by the API. Keep it tight. */
  maxTokens: number
  /** System prompt (or array of blocks). */
  system?: string | Array<{ type: 'text'; text: string }>
  /** Conversation messages. */
  messages: AnthropicMessage[]
  /** Optional temperature, top_p, top_k forwarded as-is. */
  temperature?: number
  topP?: number
  topK?: number
  /** Tool definitions for tool use. */
  tools?: unknown[]
  /** Optional metadata for the cost row (e.g. feature: 'ai-assistant-chat'). */
  feature?: string
  /** Optional user/contact for cost attribution / future per-deal billing. */
  attributedTo?: { kind: string; id?: string }
}

export interface AnthropicUsage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export interface AnthropicResponse {
  id: string
  type: 'message'
  role: 'assistant'
  model: string
  content: Array<{ type: string; text?: string; [k: string]: unknown }>
  stop_reason: string
  usage: AnthropicUsage
}

/**
 * Call Anthropic Messages API with cost tracking + budget enforcement.
 * Throws BillError on budget exceeded or missing API key.
 *
 * Usage:
 *   const sb = createBillingClient()  // or pass an existing one
 *   const res = await callAnthropic(sb, { maxTokens: 1024, messages: [...] })
 *   const text = res.content[0]?.text ?? ''
 */
export async function callAnthropic(
  supabase: SupabaseClient,
  opts: CallAnthropicOptions,
): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    throw billError('missing_api_key', 503, 'ANTHROPIC_API_KEY not configured.', { service: 'anthropic' })
  }

  const model = opts.model || DEFAULT_MODEL
  const pricing = ANTHROPIC_PRICING[model]
  if (!pricing) {
    // Don't block — just log the unknown model and continue. Next deploy will add it.
    console.warn(`[ai-bill] unknown model "${model}" — cost will not be tracked accurately.`)
  }

  // ── Pre-call budget check ─────────────────────────────────────────────
  await assertBudgetAvailable(supabase, 'anthropic')
  await assertBudgetAvailable(supabase, 'total')

  // ── Make the call ─────────────────────────────────────────────────────
  const body: Record<string, unknown> = {
    model,
    max_tokens: opts.maxTokens,
    messages: opts.messages,
  }
  if (opts.system !== undefined) body.system = opts.system
  if (opts.temperature !== undefined) body.temperature = opts.temperature
  if (opts.topP !== undefined) body.top_p = opts.topP
  if (opts.topK !== undefined) body.top_k = opts.topK
  if (opts.tools !== undefined) body.tools = opts.tools

  // M2 from SECURITY_AUDIT_PUNCHLIST: bound the wall clock so a hung
  // Anthropic call can't burn the entire Supabase edge function budget
  // (default ~60s). 25s leaves ~35s headroom for the caller's other work
  // (DB writes, downstream actions). Anthropic responses typically land
  // well inside this window.
  const ANTHROPIC_TIMEOUT_MS = 25_000
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw billError(
      'upstream_error',
      response.status,
      `Anthropic API error ${response.status}: ${text.slice(0, 400)}`,
      { service: 'anthropic' },
    )
  }

  const json = (await response.json()) as AnthropicResponse

  // ── Post-call cost write (best-effort; don't throw if the ledger update fails) ──
  if (pricing && json.usage) {
    const inputCost  = (json.usage.input_tokens  / 1_000_000) * pricing.input
    const outputCost = (json.usage.output_tokens / 1_000_000) * pricing.output
    const dollars    = inputCost + outputCost
    await incrementLedger(supabase, 'anthropic', dollars, {
      model,
      feature: opts.feature ?? 'unspecified',
      input_tokens: json.usage.input_tokens,
      output_tokens: json.usage.output_tokens,
      attributed_to: opts.attributedTo,
    }).catch((err) => {
      console.error('[ai-bill] ledger write failed:', err)
    })
    // Mirror to 'total' so the global cap reflects all services.
    // M20: was previously `.catch(() => {})` — silent failures meant a
    // broken `total` ledger row went unnoticed, and the global cap check
    // would under-count.
    await incrementLedger(supabase, 'total', dollars, { mirror_of: 'anthropic' })
      .catch((err) => console.error('[ai-bill] total-mirror ledger write failed:', err))
  }

  return json
}

/**
 * Convenience: pull just the first text block. Most edge fns want this.
 */
export function textOf(res: AnthropicResponse): string {
  for (const block of res.content) {
    if (block.type === 'text' && typeof block.text === 'string') return block.text
  }
  return ''
}

/**
 * Increment cost_ledger amount for a (service, current_month) row.
 *
 * C9 from SECURITY_AUDIT_PUNCHLIST: the previous JS-side SELECT-then-UPDATE
 * pattern was lost-update under concurrency. Three parallel LLM calls when
 * the ledger was at $99.50 with a $100 cap could each see the same $99.50,
 * each write $99.50 + their delta, lose two of the three increments, and
 * effectively bypass the budget cap. Now goes through the atomic
 * `increment_cost_ledger(service, month, amount)` Postgres function (an
 * INSERT ... ON CONFLICT (service, month) DO UPDATE SET amount = amount + EXCLUDED.amount)
 * which is concurrency-safe and returns the new total + cap for the alert.
 */
export async function incrementLedger(
  supabase: SupabaseClient,
  service: BillingService,
  amount: number,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (amount <= 0) return

  const month = currentMonth()
  const { data, error } = await supabase.rpc('increment_cost_ledger', {
    p_service: service,
    p_month:   month,
    p_amount:  amount,
    p_source:  'api',
  })
  if (error) {
    // M20: was previously console-only. A persistent ledger-write failure
    // breaks budget enforcement (the next call's pre-check reads a stale
    // amount and lets through requests that should be blocked). Write a
    // system_events row so Slack #system pings on warn-or-worse severity.
    console.error('[ai-bill] increment_cost_ledger failed:', error.message)
    await supabase.from('system_events').insert({
      kind: 'cost.ledger_write_failed',
      severity: 'warn',
      source: service,
      body: `increment_cost_ledger RPC failed: ${error.message}`,
      metadata: { service, month, amount, rpc_error: error.message },
    }).then(() => {}, () => { /* surfacing visibility, not creating cascade failures */ })
    return
  }

  // PostgREST returns TABLE(...) results as an array; pull the single row.
  const row = Array.isArray(data) ? data[0] : data
  if (!row) return

  const newAmount = Number(row.new_amount || 0)
  const cap       = Number(row.cap || 0)
  await maybeAlert(supabase, service, newAmount, cap, metadata)
}

/**
 * Throws BillError('budget_exceeded') if this service has hit its monthly cap.
 * No-op if no cap is set (treats cap=0/null as "unlimited" — explicit opt-out).
 */
export async function assertBudgetAvailable(
  supabase: SupabaseClient,
  service: BillingService,
): Promise<void> {
  const month = currentMonth()
  const { data } = await supabase
    .from('cost_ledger')
    .select('amount, budget_cap')
    .eq('service', service).eq('month', month).maybeSingle()
  if (!data) return  // never been billed → assume ok
  const cap = Number(data.budget_cap || 0)
  if (cap <= 0) return  // no cap configured → no enforcement
  const spent = Number(data.amount || 0)
  if (spent >= cap) {
    throw billError(
      'budget_exceeded',
      429,
      `Monthly budget for ${service} exhausted (${spent.toFixed(2)} / ${cap.toFixed(2)} USD). New requests will resume next month or after the cap is raised in Settings.`,
      { service, budgetCap: cap, spentSoFar: spent },
    )
  }
}

// ───────────────────────────────────────────────────────────────────────────
// Internals
// ───────────────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Posts a system_events row at 80% / 95% / 100% thresholds. Slack #system
 * subscribes to system_events via notification_rules → no direct Slack call here.
 */
async function maybeAlert(
  supabase: SupabaseClient,
  service: BillingService,
  spent: number,
  cap: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (cap <= 0) return
  const pct = spent / cap
  let severity: 'info' | 'warn' | 'err' | null = null
  let kind = ''
  if (pct >= 1.0)        { severity = 'err';  kind = 'cost.cap_hit' }
  else if (pct >= 0.95)  { severity = 'warn'; kind = 'cost.cap_95' }
  else if (pct >= 0.80)  { severity = 'warn'; kind = 'cost.cap_80' }
  if (!severity) return

  // De-dupe: only one alert per (kind, service, month). Look for an existing one.
  const month = currentMonth()
  const { data: existing } = await supabase
    .from('system_events')
    .select('id')
    .eq('kind', kind)
    .eq('source', service)
    .gte('created_at', `${month}T00:00:00Z`)
    .limit(1)
    .maybeSingle()
  if (existing) return

  await supabase.from('system_events').insert({
    kind,
    severity,
    source: service,
    body: `${service}: ${(pct * 100).toFixed(0)}% of monthly cap (${spent.toFixed(2)} / ${cap.toFixed(2)})`,
    metadata: { ...metadata, spent, cap, pct },
  })
}

/**
 * Helper for callers that want a fresh service-role client. Most edge fns
 * already create one — they should reuse that client and pass it in.
 */
export function createBillingClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

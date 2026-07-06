# Command — App Handbook & State of the System

> Full breakdown of how the app works, what's set up, what data is stored, and what's broken.
> Generated 2026-06-30. Verified against the **live** Supabase project `Client Tracker` (`lfydlxhfctuiyykuyqnr`), the git repo, and the running cron schedule — not just the code.

---

## 0. TL;DR — Read this first

**What it is:** "Command" is your all-in-one real estate business platform — a React web app (63 pages) backed by Supabase (Postgres + ~51 edge functions + 18 cron jobs), deployed on Vercel at **app.danamassey.com**. It covers the entire agent workflow: prospecting → CRM → pipeline/transactions → open houses → content & social → email campaigns → P&L/financials → video rendering.

**Overall state:** The app is **built and live**, but it's **early in real usage** — the live database has 63 contacts, 46 properties, but only **1 active listing** and **6 transactions**. Most of the ambitious schema (seller-lead microsites, print/mail, reviews, valuations) exists in the database but has **zero rows** — designed, not yet used.

**🔴 The one thing that could bite you: your June 4 security sprint was never deployed.** The code and database changes are live, but the ~30 edge functions were never redeployed (newest deployed = May 18). See §7 — this is the #1 item to fix before you rely on the app publicly.

---

## 1. Critical action items (do before "tomorrow")

| # | Item | Why it matters | Effort |
|---|------|----------------|--------|
| 1 | **Deploy the edge functions.** Run `supabase functions deploy` for all functions changed on/after June 4. | ~30 security + reliability fixes are committed to `main` and their DB migrations are already applied live — but the functions themselves still run **May-18 code**. Every fix below is currently INACTIVE in production: webhook signature checks (C3/C4), one-off-email rate limiting (C7), campaign double-send guard + auth (C8), ElevenLabs key lock (C2), wallet-drain guard (C10), Meta token proxy (C12). | 30–60 min |
| 2 | **Verify Smart Campaign drips are actually sending.** `dispatch-due-campaigns` is **NOT in the live cron schedule** (18 jobs are scheduled; this isn't one). Newsletters run every 5 min, but timed campaign steps may not be firing. | Drip emails may be silently not going out. | 15 min |
| 3 | **Merge the video pacing fix.** It lives on branch `fix/listing-tour-pacing` (1 commit ahead of `main`, unmerged). Not deployed. | The "glacial empty-room pacing" fix isn't live. | 5 min |
| 4 | **Watch for new DB errors from the split-brain state.** June 4 migrations added CHECK constraints + unique indexes (`status_check_constraints`, `contacts_unique_normalized`) that the *old* deployed functions don't know about — old code can now throw on edge cases until item #1 is done. | Deploying (#1) resolves this. | — |
| 5 | **Known cosmetic bug:** ListingTour videos render the REAL logo **mirrored** (LogoOverlay). Tracked, not yet fixed. | Video branding looks wrong. | small |

**Genuinely open security items** (everything else from the audit is fixed in code — see §7): RLS is still permissive (C1, expected pre-Auth), OAuth refresh tokens stored unencrypted (C11), two storage buckets public (C14). These are the pre-multi-user backlog.

---

## 2. Stack & how to run it

| Layer | Tech | Where |
|-------|------|-------|
| Frontend | React 19 + Vite, React Router (lazy-loaded pages) | `frontend/` → Vercel project `command` → **app.danamassey.com** (DNS at Cloudflare). Underlying Vercel URL is `command-*.vercel.app`. Auto-deploys on push to `main`. |
| Backend | Supabase (Postgres 17 + Deno edge functions) | `supabase/functions/` (~51 fns), project `lfydlxhfctuiyykuyqnr`, region us-west-2 |
| Scheduling | Supabase `pg_cron` (18 jobs) + GitHub Actions (video render queue every 10 min) | `.github/workflows/` |
| Video | Remotion + AWS Lambda (us-west-2) | `video/` workspace |
| Auth | **Not yet wired** — app currently runs single-user with a demo-mode gate; multi-user Supabase Auth + RLS is queued | `frontend/src/lib/AuthContext.jsx` |

**Local dev:**
- Frontend: `cd frontend && npm install && npm run dev` (localhost:5173)
- Video: `cd video && npm install && npm run dev` (Remotion Studio, localhost:3000)
- Secrets: `frontend/.env.local` (Vite keys), Supabase function secrets (backend), `video/.env` (AWS/Remotion)

---

## 3. Feature walkthrough (what you can do, by nav section)

### Dashboard & daily
- **Dashboard** — customizable widget grid: today's briefing, pipeline summary, activity feed, cost mini-widget, upcoming events, goal progress, stale-record/stale-listing alerts. Tabs: Today / Pipeline / Performance / Activity.
- **Daily Tracker** — log daily prospecting metrics (calls, texts, doors, emails, appts set, offers) vs weekly/annual targets with color-coded progress + 30-day trend.
- **Goals** — 15+ annual KPIs (activity / production / income) with week-by-week heatmap.
- **Market / Stats** — weekly market data for 7 AZ markets (Gilbert, Mesa, Queen Creek, Scottsdale, PV, Santa Fe Valley, Chandler). **Manually updated** (no live MLS feed).

### Prospecting
Dashboard + dedicated lists for **All Prospects**, **Expired/Cannonball** (auto 90-day outreach cadence; note: "cannonball" = high-priority home that gets a *different* letter sequence from the start), **FSBO**, **Circle prospecting**, **Sphere of Influence**, **Referral partners**, **OH Leads** (from Lofty/Curbhero), **Bio-Link Leads**. Each tracks source, stage, cadence step, next touch.

### CRM
- **Buyers** — stage, pre-approval + lender, budget, area/beds/baths prefs, BBA (buyer-broker agreement) status & expiry, related people, docs, deadlines, intake form, life events, showing history.
- **Sellers / Seller Clients** — listing status, price, DOM, offers; pre-listing prep + launch checklists, weekly seller updates, CMA tracker, virtual staging, document + deadline trackers.
- **Listing Appts** — appointment pipeline (prospect → scheduled → held → won/lost); prep tasks; auto-triggers a Gamma listing presentation when the prep task is checked done.
- **Listing Plan** — 12-month per-listing marketing plan.
- **Investors** — strategy (buy-hold / flip / multi-family), portfolio, acquisition cadence.
- **Properties** — master property inventory (my-listing / hosted / buyer-interest / comp / inspo), full details + staging tools.
- **Database** — master contact hub: search/filter by type/source/stage/tags, bulk tag/email, duplicate detection & merge, Facebook audience export, label printing, family linking, interaction timeline.
- **On-Hold Contacts** — paused contacts with auto-generated re-engagement tasks on cadence templates (5-Year Standard / Investor / Sphere VIP).
- **Intake Forms** — customizable buyer/seller intake form builder with shareable public links.

### Pipeline & transactions
Kanban board across AZ deal stages (Pre-Offer → … → Under Contract → EMD → Inspection → BINSR → Appraisal → Loan Approval → Closing). **Buyer SOP** and **Seller SOP** step checklists, **Escrow Tracker** (AZ deadlines), **Closed Deals** log. Auto-seed: reaching "Under Contract" auto-creates document checklists + deadline reminders.

### Calendar
Dashboard, full schedule, today's showings, tasks (priority + due dates), notes linked to records. Google Calendar 2-way sync.

### Open Houses
Event setup + prep/post checklists, kiosk QR **sign-in** (`/oh-signin/:id`), attendee capture (Lofty/Curbhero), **host reports** (for hosted OHs), **attendee feedback** survey + inbox, weather/heat prep flags, auto follow-up. Approval gate: auto-promoted OHs go through a Claude ADRE+brand compliance check + Slack notification before going live. **Rule:** an OH only links to a listing whose `agreement_signed_date ≤ oh.date`.

### Content Hub (4 tabs + extras)
- **Plan** — content calendar across IG/FB/TikTok/LinkedIn/YouTube/Email.
- **Create** — AI composer (Claude), Video Studio, Gamma presentations, Ads Manager; PostComposer with virtual staging + "Generate Fresh Image" (FLUX).
- **Publish** — direct publish/schedule via **Blotato** (only through the "Dana Massey" account).
- **Measure** — engagement/reach/watch-time/email analytics.
- **Bank** — reusable media/content library. Plus **Hashtag Bank**, **Keyword Tracker**, **Inspo Recreator**, **SEO/AEO**.

### Email
- **Builder** — WYSIWYG templates (Welcome, Listing Alert, OH Invite, Price Reduction, Closed Deal, Market Update).
- **Newsletters** — recurring sends (cron every 5 min).
- **Smart Campaigns** — trigger-based multi-step drips (expired outreach, buyer nurture, on-hold re-engagement) with enrollment logic, queue, history, reporting. Two Resend domains (warm primary + cold subdomain), per-campaign picker. ⚠️ see §1 item 2.
- **Sent History** + **Email Reporting** (delivery/open/click via Resend webhooks).

### Financials (P&L)
Overview (YTD/MTD/quarter, commission-cap tracking), **Expenses** (Schedule-C categories, receipts, split tracking), **Income** (GCI/broker-split/referral), **Mileage** (auto IRS rate), **Recurring**, **Budget vs Actual**, **Tax Summary**, **Cost Tracker** (per listing/OH/buyer/campaign), **ROI Analytics** (lead-source ROI, CPA). Plus **Net Sheet** calculator (Maricopa County defaults).

### Everything else
**Bio Link** (public landing page `/p/:slug` + lead capture), **Vendors** (roles, ratings, status), **Notifications** (inbox/kept/snoozed/dismissed + rules editor), **Reviews & Referrals**, **Post-Close** (5-year nurture), **Media Library**, **Print & Delivery**, **AI Assistant** (Claude chat with your data + voice playback), **Settings** (single source of truth for profile/brand/assets/social/connected accounts/AI prompts/lists/lead sources), **System Health**, **Recovery**.

### Stubs / not-fully-built
- **Home Value tool** — routed to a "Coming Soon" stub (needs a non-MLS comp source; full impl parked).
- **Stats/Market** — manual data entry, no live feed.
- **SEO/AEO** — keywords work; citations/hub-spoke/audits in progress.

---

## 4. Backend automation

### Edge functions (~51, grouped)
- **Email/Campaigns:** `send-campaign-step`, `dispatch-due-campaigns`, `send-newsletter`, `send-one-off-email`, `send-oh-feedback-request`, `ai-campaign-insights`, `lead-intake-email`.
- **Open Houses:** `oh-reminders`, `oh-followup`, `submit-oh-feedback`, `oh-approval-gate`, `merge-oh-signin`, `host-report-followup`, `feedback-follow-up`, `compile-weekly-showing-report`.
- **AI content/media:** `generate-content`, `auto-generate-content`, `generate-image` (Replicate FLUX), `virtual-staging` (Replicate interior-design), `higgsfield-generate` + `higgsfield-status`, `canva-generate`, `build-presentation` + `build-gamma-custom` (Gamma), `cma-parse`, `ai-assistant-chat`, `elevenlabs-tts`.
- **Embeddings/RAG:** `embed-on-insert`, `generate-embeddings`.
- **Google/Gmail:** `google-auth`, `google-calendar-sync`, `google-drive`, `gmail-client-email-monitor`, `gmail-showing-monitor`, `gmail-reply-detect`, `gmail-leads-setup`, `gmail-leads-backfill-labels`.
- **Video:** `render-trigger` (queues a `render_jobs` row).
- **Social:** `publish-content` (Blotato), `fetch-social-stats` (Apify), `meta-proxy` (server-side Meta token).
- **Webhooks:** `resend-webhook` (Svix-verified), `lofty-webhook` (secret-gated).
- **Business logic:** `cash-offer-sla-check`, `transaction-deadline-check`, `validate-address` (USPS), `biolink-submit` (Turnstile), `merge-form-submission`, `save-elevenlabs-key`, `slack-channel-ensure`.

### Live cron schedule (18 jobs, all active — verified in `cron.job`)
| Job | Schedule |
|-----|----------|
| send-newsletter-cron | every 5 min |
| gmail-client-email-monitor | every 10 min |
| lead-intake-email | every 10 min |
| gmail-showing-monitor | every 15 min |
| oh-followup-cron | every 15 min |
| oh-reminders-cron | hourly |
| cash-offer-sla-check | hourly |
| cron-watchdog-hourly | hourly (:07) |
| auto-generate-daily-content | daily 12:00 UTC |
| daily-interaction-stats | daily 13:00 UTC |
| transaction-deadline-check-daily | daily 14:00 UTC |
| daily-stale-contact-alert | daily 15:00 UTC |
| feedback-follow-up | daily 17:00 UTC |
| cron-retention-purge-nightly | daily 10:17 UTC |
| ai-campaign-insights-weekly | Mon 08:00 |
| compile-weekly-showing-report | Mon 13:00 |
| weekly-checklist-cleanup | Sun 00:00 |
| monthly-cost-ledger-reminder | 1st of month 16:00 |

> ⚠️ **`dispatch-due-campaigns` is NOT scheduled here.** Timed Smart Campaign steps may not be auto-dispatching. Verify (§1 item 2).

**Health monitoring:** every cron writes a `heartbeat()`; `cron-watchdog-hourly` alerts to Slack #system if any job's heartbeat is older than 2× its interval. Nightly purge trims old logs (lofty events / system_events 90d, ai_generation_log & gmail_reply 180d, calendar sync 30d).

---

## 5. What data is stored (data model + live reality)

The schema is large (~80 tables, RLS enabled everywhere with permissive policies pending Auth). Below is what's **actually populated** live vs designed-but-empty.

### Actually in use (live row counts, 2026-06-30)
| Domain | Tables with data | Notable counts |
|--------|------------------|----------------|
| CRM | contacts **63**, contact_tags 54, tags 13, interactions 3, activity_log 59 | Lofty ID, normalized email/phone dedupe, soft-delete |
| Properties/Listings | properties **46**, listings **1**, media_assets 34, listing_price_history 5, listing_parties 5 | Only 1 active listing so far |
| Transactions | transactions **6**, transaction_documents 28, transaction_deadlines 16, transaction_status_log 11, transaction_document_templates 63, transaction_deadline_templates 36 | 40+ doc / ~20 deadline templates auto-seed per deal |
| Open Houses | open_houses **21**, oh_tasks **196**, oh_outreach 13, oh_outreach_attempts 13, oh_sign_ins 2 | oh_tasks is your biggest workload table |
| Showings | showings 32, showing_sessions 9 | |
| Checklists | checklist_tasks 16, checklist_templates 5, checklist_runs 2, listing_appt_checklist 14 | |
| Content/Social | content_pieces 2, content_pillars 6, hashtag_groups 5, seo_keywords 10, client_avatars 5 | Content engine barely used yet |
| Campaigns | campaigns 4, campaign_steps 12, campaign_audit_log 3 | |
| Financials | expenses 2, expense_categories 61, cost_ledger 15, lead_sources 7, lead_attributions 53 | Lead attribution actively tracked |
| AI/ops | ai_generation_log 21, ai_prompts 15, system_events **330**, notifications 75, cron_heartbeats 13, notification_rules 10, compliance_rules 12 | |
| Video | render_jobs 1, listing_video_assets 1 | One listing wired for video |
| Misc | vendors 2, notes 1, user_settings 7, service_secrets 1, lead_emails_processed 56 | |

### Designed but empty (0 rows — future features)
seller_leads, valuations, cmas/cma_comps, reviews/review_requests, referrals, client_for_life_plans/post_close_touches, print_orders/delivery_batches, expired_leads/fsbo_leads/call_outcomes, microsite_drips, document_embeddings (RAG), blotato_posts, social_metrics, family_links, life_events, offers.

**Takeaway:** the data model is far more ambitious than current usage. The core loop in real use today is **contacts → properties → open houses/showings → transactions**, plus lead attribution and OH task management.

### Key data invariants (enforced by triggers/constraints)
- A listing **can't be `active`** without a signed listing agreement.
- Properties dedupe on `(normalized_address, zip)`; `mls_id` unique.
- Lead-source fee % is **snapshotted at acquisition** — later % edits don't rewrite existing attributions.
- Referral fees **lock on close**.
- One primary lead source per contact (partial unique index).
- `do_not_contact` respected by all send paths; soft-delete + nightly purge everywhere.
- RAG: pgvector `document_embeddings` (brain/compliance/voice/performance collections) with auto-embed triggers — **currently empty**, so the AI Assistant's retrieval layer isn't populated yet.

---

## 6. Integrations & status

| Service | Used for | Status |
|---------|----------|--------|
| **Supabase** | DB, edge fns, storage | ✅ Live (free tier) |
| **Vercel** | Frontend hosting | ✅ Live (`command` → app.danamassey.com) |
| **Resend** | All email (2 domains: warm `danamassey.com`, cold `mail.danamassey.com`) | ✅ Live, $20/mo Pro |
| **Anthropic (Claude)** | Content, insights, CMA parse, approval gate, assistant | ✅ Live (all calls routed through `ai-bill.ts` cost guard) |
| **Google Cloud** | Maps, Calendar sync, Gmail monitors, OAuth, Drive | ✅ Live (broad API set enabled) |
| **Replicate** | Virtual staging + image gen (FLUX) | ✅ Live |
| **Blotato** | Social publishing | ✅ Live (Dana Massey account only) |
| **Canva Connect** | Brand-kit design gen/export (MCP) | ✅ Wired |
| **AWS Lambda (Remotion)** | Video rendering | ✅ Live (see §8) |
| **ElevenLabs** | Voiceover TTS (voice cloned) | ✅ Wired; needs subscription key |
| **Slack** | System/lead/approval alerts | ✅ Live (outbound) |
| **Lofty CRM** | Inbound webhook (OH sign-ins/leads) | ⚠️ Receiver live, **mapper pending** Lofty API access |
| **Higgsfield** | Cinematic AI image/video | ⚠️ Code shipped, awaiting $99/mo Studio key |
| **Gamma** | Listing presentations / property sites | ✅ Wired (use "Dana" brand kit) |
| **Meta** | Ads insights | ⚠️ `meta-proxy` scaffolded, token server-side |
| **USPS** | Address validation | ⚠️ Function ready, not called from listing flow |
| **Turnstile** | Bio-link bot protection | ✅ Wired |
| **Apify** | IG/FB stat scraping | Wired |

Queued (not started): Twilio SMS, full Google Drive OAuth (high priority — unlocks Meet recording pull + photo sync), ARMLS/MLS feed (dropped 2026-05-07, needs new source), Supabase Pro (at multi-user launch).

---

## 7. Security & reliability audit status

From the 2026-06-03 full-codebase audit (`SECURITY_AUDIT_PUNCHLIST.md`): **65 findings** (15 crit / 17 high / 21 med / 12 low). Current state of the code: **43 fixed, 6 partial, 3 open** at the CRITICAL/HIGH/MEDIUM tiers.

**⚠️ Deployment gap (the big one):** All the June-4 fixes are committed to `main` and their **DB migrations are applied live**, but the **edge functions were never redeployed** (newest live function = May 18). So in production *right now*, these are still on old code:
- C3 `resend-webhook` Svix verification — forged webhook events still possible
- C4 `lofty-webhook` secret gate — unauth POSTs accepted
- C7 `send-one-off-email` rate-limit/sanitize — public DKIM-signed send surface
- C8 campaign atomic dispatch + bearer auth — double-send race; step callable anon
- C2 `save-elevenlabs-key` lock, C10 wallet-drain guard, C12 Meta token proxy — all old code

**Fix:** `supabase functions deploy` for the changed functions. (The frontend fixes like C5 XSS *are* live, because Vercel auto-deploys from `main`.)

**Still genuinely open (backlog):**
- **C1 — RLS permissive.** Live advisors show **217 "RLS policy always true"** warnings. Anon key can read everything. Expected pre-Auth; unblocks with the queued multi-user Auth + `owner_id` RLS work.
- **C11 — OAuth refresh tokens stored unencrypted** in `user_settings`.
- **C14 — 2 storage buckets public** (`staging-photos`, `canva-exports`) — partially mitigated.
- **C6/C7 full fixes** — need per-row HMAC submit tokens + server-side identity, which depend on Auth.

Live security advisor summary (verified today): 217 rls_policy_always_true, 12 function_search_path_mutable, 4 security_definer_view (ERROR), 4 rls_enabled_no_policy, 6 SECURITY DEFINER fns executable by anon/authenticated, 2 public buckets, 1 leaked-password-protection disabled.

**Feature test backlog:** `TEST_PUNCHLIST.md` lists shipped features awaiting a live smoke test (email blast, PostComposer photo gallery, host-report cascade, multi-date OH, status-log trigger, ⌘K search).

---

## 8. Video pipeline (Remotion + AWS Lambda)

**Flow:** Listings UI → `render-trigger` edge fn (builds inputProps from listing + media + VO tracks, inserts a `render_jobs` row) → GitHub Actions cron (`video/scripts/process-queue.ts`, every 10 min) claims the job atomically → `renderMediaOnLambda` on AWS → writes `output_url` + cost back.

- **Composition:** `ListingTour` (~3:45 MP4) + `ListingTourThumbnail` (1280×720). Scenes: cold open, exterior, great room, kitchen, primary, secondary, garage, backyard, community, close — each with crossfades + Ken Burns.
- **Voiceover:** 11 ElevenLabs tracks per listing (`listing_video_assets.vo_urls`).
- **Lambda config:** us-west-2, 3008 MB / 10240 MB disk / 900 s, ~850 frames/chunk (8 chunks) to stay under the timeout. AWS account concurrency should be ≥9 (raise quota if you scale up).
- **State:** First MP4 rendered 2026-05-19 (~$0.12/render). Render queue automated via GitHub Actions. **Open bugs:** (a) REAL logo renders **mirrored**; (b) empty-room pacing fix is on an unmerged branch (§1 items 3 & 5). One listing (`9603 E Theia Dr`) is wired end-to-end.

---

## 9. Cost snapshot

Current ~**$27–40/mo** (Resend $20 + Claude ~$5–15 + Google/AWS/Replicate a few $). Projected at full multi-user stack ~**$100–150/mo** (+Supabase Pro $25, +Gamma/Drive, +Twilio, +Higgsfield $99, +Canva Pro). See `reference_cost_analysis` memory for the full breakdown.

---

## 10. Suggested order of operations for tomorrow

1. `supabase functions deploy` (all June-4-changed functions) — closes the live security gap. **(§1.1)**
2. Confirm campaign drips send — schedule `dispatch-due-campaigns` if missing. **(§1.2)**
3. Merge `fix/listing-tour-pacing` → `main`. **(§1.3)**
4. Smoke-test the features in `TEST_PUNCHLIST.md`.
5. Re-run Supabase security advisors; confirm no new errors from the constraint/old-code mismatch.
6. Then resume the roadmap (Auth + RLS, Lofty mapper, Home Value, Drive OAuth).

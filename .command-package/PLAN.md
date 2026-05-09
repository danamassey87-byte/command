# Command v4 Handoff — Gap Analysis & Build Plan

> Source of truth for what's done, what's missing, and what to build next against
> the v4 ship docs in `.command-package/ship/`. Update as PRs land.

**Locked decisions** (also saved to memory `project_command_v4_handoff.md`):

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Evolve, don't rewrite.** Keep Vite + React (JS) at [frontend/](../frontend/). | README §16 wins over §4. ~30 migrations + 62 pages already exist. Greenfield Next would discard months of work. |
| 2 | **Arizona, not Illinois.** `America/Phoenix`, ADRE rules, REAL Broker AZ. | Onboarding wireframe + Settings + AZ Compliance doc + project memory all confirm AZ. IL/Evanston references are stale placeholders. |
| 3 | **Supabase project `lfydlxhfctuiyykuyqnr`** (verified not `greenpros`). | Memory hard-rule + `.env.local` confirmation. |
| 4 | **pgvector, not Pinecone.** | `20260421_command_pgvector_rag.sql` already landed it. ~$80/mo savings. |
| 5 | **MapView placeholder.** Build behind a stable interface; swap when addendum ships. | v4 manifest §6 confirms addendum is still owed. Don't block Calendar. |

---

## 1 · Schema gap (Data Model v2 → migrations/)

| Block | Status | Tables present | Tables missing |
|-------|--------|----------------|----------------|
| Phase 1 core | ✅ done in `20260421_command_phase1_core.sql` | interactions, checklist_templates/runs, lofty_sync_state, transact_files, notification_rules, blotato_posts, weather_forecasts, cost_ledger, system_events, background_jobs, compliance_checks, media_assets | — |
| Tags | ✅ `20260421_command_tags_and_contact_tags.sql` | tags, contact_tags | — |
| OH signins | ✅ `20260421_command_column_additions.sql` | oh_signins | — |
| pgvector RAG | ✅ `20260421_command_pgvector_rag.sql` | document_embeddings (collection-based: brain · compliance · voice · performance) | — |
| Relationships+ | ✅ `20260421_command_v2_modules.sql` | social_profiles, family_links, life_events | — |
| Home-value | ✅ `20260421_command_v2_modules.sql` | seller_leads, valuations, microsite_drips/steps/runs | — |
| Reviews & referrals | ✅ `20260421_command_v2_modules.sql` | review_requests, reviews, referrals | — |
| Print & delivery | ✅ `20260421_command_v2_modules.sql` | print_orders, delivery_batches | — |
| Expired/FSBO | ✅ `20260421_command_v2_modules.sql` | expired_leads, fsbo_leads, call_outcomes | — |
| Post-close | 🟡 partial | client_for_life_plans | **post_close_touches** (verify) |
| **Audit + compliance corpus** | ✅ shipped in `20260506_command_audit_compliance_corpus.sql` | audit_events, compliance_overrides, compliance_rules (seeded with AZ-ADV-001..012) | — |
| **Lead Sources / PAC attribution** | ✅ shipped in `20260507_command_lead_sources_pac.sql` + Phase-9 invariant test in `supabase/tests/phase9_pct_lock_invariant.sql` (passes) | lead_sources (7 v1 sources seeded), lead_attributions (with locked-pct snapshot + unique-primary-per-contact partial index), referral_fees (suggested→confirmed→paid pipeline), cash_offer_routings (24h SLA) | — |
| **Team & permissions** | ❌ missing | — | team_members, roles, permissions, scope_overrides, routing_rules, co_listings, gci_splits, delegation_items |
| **SEO/AEO** | ❌ missing | — | seo_keywords, ranking_snapshots, ai_citations, hub_pages, spoke_pages, gmb_posts, schema_fragments, seo_audits |
| **Custom fields** (for Data Layer screen) | ❌ missing | — | custom_fields (v4 manifest §6 calls this out as a Data Model v2 follow-up) |

---

## 2 · Edge function gap

| Function | Status | Notes |
|----------|--------|-------|
| `_shared/ai-bill.ts` cost wrapper | ✅ **shipped tonight** | Wraps Anthropic Messages API · enforces cost_ledger budget caps · fires 80/95/100% alerts via system_events. Existing functions need to be refactored to use it (next PR). |
| `_shared/gmail.ts` · `slack.ts` | ✅ exist | Already shared. |
| 12 LLM-calling functions | 🟡 **bypass the wrapper** | ai-assistant-chat, generate-content, ai-campaign-insights, auto-generate-content, build-gamma-custom, build-presentation, canva-generate, compile-weekly-showing-report, feedback-follow-up, send-newsletter, send-one-off-email, oh-followup all call `fetch('https://api.anthropic.com/v1/messages')` directly. Migrate one at a time to `callAnthropic(supabase, ...)`. |
| `compliance-check` | ❌ missing | The real RAG-grounded gate. ComplianceCheck.jsx today does basic client-side regex with a comment *"In production, this would call Claude via an edge function"*. That edge function needs to exist. Algorithm in AZ Compliance Rules §4. |
| `compliance-corpus-ingest` | ❌ missing | Reads PDFs from `uploads/compliance/` (REAL Broker AZ Widen exports, ADRE Law Book, Dec 2025 revisions, NAR/Fair Housing/RESPA), chunks, embeds, writes to document_embeddings with `collection='compliance'`. |
| `slack-channel-ensure` | ✅ exists | Auto-create #buyer_/#seller_ etc. |

---

## 3 · Frontend section coverage (v4 sections → existing pages)

Existing 62 pages give us **strong section coverage**. Stars indicate the section's caption-PRD is well-supported by the page:

### Mobile (8)
- ✅ Dashboard → `pages/Dashboard/`
- ✅ Prospecting → `pages/Prospecting/` ★
- ✅ Tasks + Notes → `pages/Tasks/`, `pages/Notes/`
- ✅ Buyer Showings → `pages/BuyerShowings/`
- ✅ Showing Route → `pages/Calendar/` (needs MapView interface)
- 🟡 m·Listing Appt → `pages/ListingAppts/` desktop; mobile parity TBD
- 🟡 m·Deals → `pages/Pipeline/` desktop; mobile parity TBD
- 🟡 m·Content Studio → `pages/ContentHub/` desktop; mobile parity TBD

### Desktop (39)
- ✅ Open House → `pages/OpenHouses/` ★
- 🟡 OH·sign-in devices → `pages/OHSignIn/` exists; iPad-kiosk variant + phone-QR self-serve TBD
- ✅ CRM → `pages/CRM/` (verify Synced-systems rail per wireframe `crm2`)
- ✅ Email Builder → `pages/EmailBuilder/`
- ❌ Lead Sources → no page yet (depends on missing schema)
- ✅ Inspo Vault → `pages/InspoRecreator/`
- ✅ Content Studio → `pages/ContentHub/`, `pages/Content/`, `pages/PostComposer/`
- ✅ Listing Appt + CMA → `pages/ListingAppts/`, `pages/ListingPlan/`, `pages/NetSheet/`
- ✅ Deals + Offers → `pages/Pipeline/`
- ✅ KPI → `pages/Stats/`, `pages/Goals/`
- ✅ Bio Link → `pages/BioLink/`
- ✅ Properties → `pages/Properties/`
- ✅ Money → `pages/PnL/`
- ✅ Checklists → component `ChecklistRunner.jsx`; dedicated page TBD
- 🟡 Mentor → no page (deferred)
- 🟡 Seller Updates → component `SellerWeeklyUpdate.jsx`; surface TBD
- 🟡 Agreements → no page (uses Drive)
- ✅ Vendors → `pages/Vendors/`
- 🟡 Social Research → no page (deferred)
- ✅ Content · Publish + Talking-head → `pages/PostComposer/`, `pages/VideoStudio/`
- 🟡 Content · Places & Events → no page (deferred)
- ✅ Open House QR → component baked into OHSignIn
- 🟡 OH · Social posts → no page (deferred)
- 🟡 Library → no page (deferred)
- ❌ Visual v2 → reference only (gradient-forward direction)
- ✅ Studio → `pages/VideoStudio/`
- ✅ Admin → `pages/SystemHealth/`
- ✅ Print & Delivery → `pages/PrintDelivery/`
- ✅ AI Assistant → `pages/AIAssistant/`
- ✅ Reviews & Referrals → component `ReviewsPanel.jsx`; dedicated page TBD
- ✅ Post-close → `pages/PostClose/`
- ✅ Expired + FSBO → components `ExpiredLeadsDb.jsx`, `FsboLeadsDb.jsx`
- ✅ Relationships+ → components `SocialProfilesPanel.jsx`, `FamilyLinksPanel.jsx`, `LifeEventsPanel.jsx`
- ✅ Home-value microsite → `pages/HomeValue/`, `pages/PropertyWebsite/`
- ❌ Team + Multi-agent → not yet (depends on missing schema)
- ✅ SEO + AEO → `pages/SeoAeo/`, `pages/KeywordTracker/`
- 🟡 Client Portal → no page yet
- 🟡 Compliance Log → uses `compliance_checks` queries; dedicated page TBD
- 🟡 Showing Dispatch → `pages/SellerShowings/`, `pages/BuyerShowings/`
- ✅ Inbox + Notifs → `pages/Notifications/`
- ✅ Command-K → component `CommandPalette.jsx`
- ✅ Goals → `pages/Goals/`

### Foundation (11)
- 🟡 Global UI → header pattern needs README §18 cleanup (kill bottom-right FAB stack)
- 🟡 Docs → no internal docs page (low priority)
- 🟡 Onboarding → `pages/Onboarding/Onboarding.jsx` is **single 203-line file**; v4 wants 7 screens (Welcome + 6 steps with skippable progress). Rebuild as wizard. ★
- 🟡 Empty + Error → no centralized states; per-page handling
- ✅ Settings → `pages/Settings/`
- 🟡 Hi-Fi V2 → reference visual pass; not a build target
- 🟡 Data layer → no page; needs `custom_fields` table first
- 🟡 Data flow → reference diagram

---

## 4 · README §18 — Header cluster cleanup

README §18 is a hard rule across every page:
- Header right rail: `[+ Quick Add] · [🔔] · [✎ Note] · [✓ Tasks] · [date/time] · [Edit] · [⚙] · [Sign out]`
- Quick Note drawer (right slide-in 360px, autosave to localStorage, contact-link picker, tags, Esc/overlay dismisses).
- Tasks drawer (today + overdue, inline check, quick-add, accessible from every route via header ✓ or `T`).
- Keyboard: `N` → Quick Note, `T` → Tasks (when not in a text field).
- **Remove the bottom-right FAB stack everywhere.** Audit `frontend/src/components/QuickLogButton.jsx` and `frontend/src/components/layout/` for FAB remnants.

---

## 5 · Compliance pipeline TODO

The schema is in place after tonight's migration. Remaining:
1. **Ingest the corpus.** Upload to `uploads/compliance/`: `2026-ADRE-Law-Book.pdf`, `ADRE-AdvertisingArticle-20220308.pdf`, `aar-rule-revisions-dec-2025-part1.pdf`, `aar-rule-revisions-dec-2025-part2.pdf`, REAL Broker AZ Widen marketing PDFs. Build `compliance-corpus-ingest` edge fn that chunks → embeds → writes `document_embeddings` rows with `collection='compliance'`.
2. **Build `compliance-check` edge fn.** Algorithm in AZ Compliance Rules §4: deterministic rules from `compliance_rules` table → RAG (top 6 chunks via pgvector) → Sonnet via `callAnthropic` → merge highest-severity → log to `compliance_checks`.
3. **Refactor `ComplianceCheck.jsx`** to call the edge fn instead of running client-side regex.
4. **Wire `#compliance` Slack channel** for BLOCK alerts and override audit posts (notification_rules row).
5. **Settings · Compliance** page surfacing: `broker_legal_name`, `team_name`, `licensed_states`, `ai_disclosure_required`, `override_policy` (self-approve · require-broker), corpus re-ingest buttons.

---

## ⚠ Naming gotcha — "deal" in the spec, "transaction" in the app

The Data Model v2 spec uses entity name **`Deal`** but the existing app's table is **`transactions`** (already populated, 7+ rows). Per the evolve-not-rewrite rule, future migrations and code reference `transactions`, not `deals`. Concrete decisions made:

- `referral_fees.transaction_id` → `transactions(id)` (not `deal_id` → non-existent `deals(id)`)
- `transactions.projected_referral_fee_cents` and `.actual_referral_fee_cents` (not on `deals`)
- Frontend code referring to a "deal" should keep that user-facing terminology but fetch from `transactions` in queries.

When future schema work mentions "deal" from the spec, mentally substitute `transactions`. Same row count, same shape, different name.

---

## 6 · Next 3 PRs (concrete sequence)

After tonight's migration + cost wrapper:

**~~PR-2~~ ✅ DONE.** Lead Sources schema shipped + Phase-9 invariant regression test in `supabase/tests/phase9_pct_lock_invariant.sql` (passes — buyer_pct_locked stays locked when source pct is changed; transactional rollback leaves no residue).

**PR-1 · AI cost wrapper migration sweep.** Refactor the 12 LLM-calling edge functions one at a time to use `callAnthropic` from `_shared/ai-bill.ts`. Order: ai-assistant-chat (most-used) → generate-content → ai-campaign-insights → ... Each function gets one PR; verify cost_ledger reflects the call. Acceptance gate: `grep -rn 'fetch.*api\.anthropic\.com' supabase/functions/ | grep -v _shared` returns empty.

**PR-3 · Onboarding wizard rebuild.** Replace `Onboarding.jsx` with a 7-step skippable wizard matching `components/foundations.jsx OB_*`: Welcome → Import (Lofty/Google/CSV/iPhone/MLS) → Voice (4 presets + train-my-own) → Socials (8 platforms + Blotato) → Farm (zip/subdivision/cadence/cost estimate) → Title rep (link Marisol or skip) → First OH (wizard or skip). Each step must persist progress so refresh doesn't lose state.

**PR-4 (new) · Lead Sources frontend page** at `pages/LeadSources/`. Table view of the 7 sources (slug, cost_model, pct, attribution_window, status), per-source detail panel matching wireframe `leadsources` captions (intake config, live totals, pipeline-fee forecast, ROI-by-source). Editor for buyer_pct/seller_pct that warns *"future leads only — in-flight contacts keep their locked pct"*. The `compliance-check` and `compliance-corpus-ingest` edge functions probably want to wait until after the cost wrapper sweep so they ship through the gate.

After PR-1/3/4: pick up Phase-1 surface gap-fills in Dana's stated order (CRM Synced-systems rail → OH·devices kiosk variant → mobile parity → Calendar/MapView shim → AI Assistant cost-aware refactor).

---

## 7 · Outstanding asks for the spec author

These were flagged in v4 manifest §6 as still-owed:
1. **MapView/RouteLine Design System addendum** — needed before Calendar/Showing Route, Home-value, Properties can ship in parallel. Building behind interface in the meantime.
2. **README briefs for the 5 new sections** (Inbox, Cmd-K, OH devices, Mobile parity, Hi-Fi pass) — captions cover the *what*; ship-plan briefs cover the *how*.
3. **CustomField entity addendum** — append-only Data Model row needed before the Data Layer / Field Editor screen ships.
4. **Click-through extension to OH devices** — extend the "I have an OH" scenario into the kiosk path.
5. **Acceptance Tests Phase 10** covering Inbox, Cmd-K, Field Editor migration safety.

---

*Last updated: 2026-05-06 · session that read the v4 package end-to-end + shipped audit/compliance corpus migration + AI cost wrapper.*

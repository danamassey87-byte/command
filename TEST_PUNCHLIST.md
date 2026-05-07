# Test Punch List

> Features shipped that need a quick live verification when there's time.
> Tick boxes as you go. Latest items at the top.

---

## 2026-05-07 session

### C4 — 📧 Email Blast (listing detail)
- [ ] Open a listing that has at least one banked email-channel content_piece
  - If none yet: Generate Content first, save the email channel to bank
- [ ] Click 📧 **Email Blast** button on the listing detail toolbar
- [ ] Confirm subject + body pre-fill from the banked piece
- [ ] Pick "Sphere of Influence" segment (or another small one)
- [ ] Click **Review Recipients**, exclude one, return
- [ ] Send to a test group (start with 2–3 people you trust)
- [ ] Verify result panel shows accurate sent / suppressed / failed counts
- [ ] Check `email_blast_sent` activity row in interactions / Activity Log

### C5 — 🖼️ Listing Photo Gallery in PostComposer
- [ ] Pick a listing with synced Drive photos (use 🖼️ Sync Photos on listing first if needed)
- [ ] Open PostComposer, attach to that listing (`property_id` set)
- [ ] Verify the "📸 From this listing's photos (N)" thumb strip appears above the upload drop
- [ ] Tap a thumb → it joins mediaFiles with green check
- [ ] Tap again to confirm it doesn't double-add
- [ ] Save → confirm media URLs persist on the post

### O4 — 🔥 Host Report Cascade
- [ ] Pick an OH that has at least one merged sign-in (`oh_sign_ins.contact_id IS NOT NULL`)
- [ ] Submit a host report at `/oh/<id>/host-report` with `overall_impression='strong'` (or set `leads_count > 0`)
- [ ] Verify a `host_report_followup` notification fires
- [ ] Verify `daily_tasks` rows are created with `source_type='host_report'`, priority=high, due tomorrow
- [ ] Re-submit / re-process — confirm idempotency (no duplicate tasks)

### O6 — 📅 Multi-Date OH Scheduling
- [ ] Open OHQuickForm, schedule Sat + Sun for one address
- [ ] After save, verify both rows share a `series_id` UUID
- [ ] Open Saturday's OH in OHForm
- [ ] See the "Day 1 of 2" badge in the Host Runsheet header
- [ ] Fill in lockbox + parking + talking points
- [ ] Tick "Apply runsheet to all 2 dates in this series"
- [ ] Save, then open Sunday's OH — verify it inherited the runsheet fields

### Polish — 💰 Status Log Trigger
- [ ] Open any deal in Pipeline, flip its status (e.g. offer → accepted)
- [ ] Run a SQL check: `SELECT * FROM transaction_status_log WHERE transaction_id = '<deal-id>' ORDER BY changed_at DESC LIMIT 5;`
- [ ] Confirm a fresh row with the from/to status

### Polish — 🔍 Universal Search (⌘K)
- [ ] Press ⌘K from any page; verify the search input focuses
- [ ] Type a contact's first name (≥2 chars) — confirm grouped results dropdown
- [ ] ↑/↓ keyboard nav, Enter to navigate
- [ ] Try a property address — confirm Listings group
- [ ] Try `'today'` or an OH city — confirm Open Houses group
- [ ] Resize the browser narrow (<720px) — confirm search hides for hamburger nav

### Polish — 📧 Closing Recap
- [ ] In Pipeline → Closed Deals, expand a closed deal with a contact email on file
- [ ] Click 📧 **Send Closing Recap**
- [ ] Verify subject + body pre-fill with deal facts (price, closing date)
- [ ] Verify buyer-side vs seller-side language matches the deal type
- [ ] Edit + send to your own email first to QA the layout
- [ ] Then send to a real client when ready

### Polish — Recurring Expense Idempotency
- [ ] On the Recurring Expenses page, click **Generate This Month** with at least one monthly template
- [ ] Verify expense rows were created
- [ ] Click again — confirm it now says "Nothing to generate" (or skipped count)
- [ ] Check the table — templates that ran should show "✓ Done" badge

### Polish — Sellers True Net + Pipeline Projected Net
- [ ] Open the Sellers list — verify the "True Net" column (was "Est. ROI")
- [ ] Hover a row — confirm tooltip shows breakdown
- [ ] Open a Pipeline deal detail — confirm "Projected Net if Closed" panel renders
- [ ] Confirm fees / marketing / mileage line items match what's logged

### CMA Tracker (NEW 2026-05-07 — listing detail)
- [ ] Open a listing detail page; scroll to the new "CMA Tracker" section
- [ ] Build a real CMA in NARRPR; export PDF
- [ ] Click **+ Upload CMA PDF**; pick the file; wait ~10–30 sec for parse
- [ ] Verify the subject estimate (range / recommended) populated
- [ ] Verify comps table shows: address / specs / original sale price + status / now editable / last-check
- [ ] Click **✓ Checked** on a comp — verify timestamp populates
- [ ] Edit a comp's "Now" status (e.g. flip Sold → Active) + current price; verify save
- [ ] Click a verdict button (Still valid / Reprice / Stale) — verify badge appears on the row header
- [ ] Click **↻ Re-parse** — confirm comps replace cleanly without dupes
- [ ] Click **📄 Open PDF** — confirm the original PDF opens in a new tab

### Polish — 🔄 Weekly Listing Data Sync (NEW 2026-05-07)
- [ ] Open Dashboard → Today tab; find "🔄 Listing Data Sync" widget
- [ ] If you have active listings with no `last_data_synced_at`, they show as "needs check"
- [ ] Click an address → goes to /sellers; update price/status/DOM if needed
- [ ] Come back to Dashboard, click "Synced" — verify days-since-sync resets to 0
- [ ] Confirm "Mark all" bulk action shows confirm dialog before firing
- [ ] When all are fresh, widget shows "All N active listings are fresh ✓"

### Polish — Expired Leads single-entry shortcut (NEW 2026-05-07)
- [ ] Go to Prospecting → Expired Cannonball
- [ ] Click "+ Add One" in the toolbar — verify it switches to Database view + opens add form
- [ ] Fill address + city, click Add — verify lead appears

### Polish — Home Valuation Coming Soon (NEW 2026-05-07)
- [ ] Visit `/home-value` — verify the Coming Soon placeholder renders (full impl parked)

### 🪑 Virtual Staging Studio (NEW 2026-05-07)
- [ ] Open Settings → Connected Accounts → find new "🪑 Replicate" card
- [ ] Click **Test connection** — should show "Connected to adirik/interior-design (X runs to date)"
- [ ] Open any listing → click **🪑 Stage a Room** in the toolbar
- [ ] Upload an empty-room photo (or pick from existing — empty for v1)
- [ ] Pick a style (try Modern first) + Room type (Living)
- [ ] Click **✨ Generate Staging** → wait 15-30s
- [ ] Verify before/after preview shows the original + staged version
- [ ] Verify cost shows on the result line (~3¢)
- [ ] Click **↻ Regenerate** — verify a fresh staging runs
- [ ] Click **← Try different style** — pick Luxury, regenerate, compare
- [ ] Click **Save to listing photos** → confirms saved + new media_asset row created
- [ ] Verify the original photo is unchanged (staged is a NEW row with staged_from_id pointing at original)

### Drive — 🎥 Meet Recording Sync
- [ ] Record at least one Google Meet (so the "Meet Recordings" Drive folder exists)
- [ ] Open Settings → Connected Accounts → Google Drive card
- [ ] Expand "🎥 Meet Recordings" section
- [ ] Pick a look-back window, click **Scan recordings**
- [ ] Verify list shows file with thumbnail, name (links to Drive), date, duration
- [ ] Use the contact picker to attach one to a real contact, click **Link**
- [ ] Verify the row flips to "✓ Linked"
- [ ] Open that contact's profile — confirm a `meet_recording` interaction exists with link back to Drive
- [ ] Click **Scan** again — verify the linked row stays marked (idempotency)

---

## How to clear

When you've ticked everything, delete this file. Or move done items to a "Verified" section if you want a paper trail.

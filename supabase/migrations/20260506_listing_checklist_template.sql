-- ────────────────────────────────────────────────────────────────────────────
-- 2026-05-06 — Seed comprehensive Listing Workflow (M1–M10) (M1–M10)
-- 172 tasks across 10 modules: Seller Consultation → Post-Close. Includes pre-listing research, full property prep (21 tasks), full marketing (24 tasks), weekly seller updates, net sheet per offer.
-- Replaces any previous template under category='listing'.
-- ────────────────────────────────────────────────────────────────────────────

-- Soft-delete prior templates in this category to avoid duplicate "start" buttons
UPDATE checklist_templates
SET deleted_at = now()
WHERE category = 'listing' AND deleted_at IS NULL;

-- Insert the comprehensive M1–M10 template
INSERT INTO checklist_templates (name, category, steps, version)
VALUES (
  'Listing Workflow (M1–M10)',
  'listing',
  '[
  {
    "id": "m1_01",
    "label": "Receive and log new seller lead in CRM",
    "section": "M1 · Seller Consultation — Lead Intake & Initial Contact",
    "order": 1001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Source, contact info, property address, motivation level"
  },
  {
    "id": "m1_02",
    "label": "Respond to seller inquiry within 1 business day",
    "section": "M1 · Seller Consultation — Lead Intake & Initial Contact",
    "order": 1002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Per communication SLA — email next business day, text within 2 hours"
  },
  {
    "id": "m1_03",
    "label": "Conduct initial phone/video screening call",
    "section": "M1 · Seller Consultation — Lead Intake & Initial Contact",
    "order": 1003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Motivation, timeline, property basics, prior agent relationships"
  },
  {
    "id": "m1_04",
    "label": "Send pre-consultation package to seller",
    "section": "M1 · Seller Consultation — Lead Intake & Initial Contact",
    "order": 1004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Seller Guide, \"Why Work With an RE Advisor\", market snapshot"
  },
  {
    "id": "m1_05",
    "label": "Schedule in-person or virtual listing consultation",
    "section": "M1 · Seller Consultation — Lead Intake & Initial Contact",
    "order": 1005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Confirm date/time/location; send calendar invite with agenda"
  },
  {
    "id": "m1_06",
    "label": "Research property in MLS/public records before consultation",
    "section": "M1 · Seller Consultation — Lead Intake & Initial Contact",
    "order": 1006,
    "role": "Agent",
    "offset_days": null,
    "system": "mls",
    "notes": "Tax records, prior sales, current liens, HOA, zoning"
  },
  {
    "id": "m1_07",
    "label": "Present professional credentials and value proposition",
    "section": "M1 · Seller Consultation — Seller Consultation Meeting",
    "order": 1007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "\"Professional RE Advisor\" positioning; address 90/10 industry stat"
  },
  {
    "id": "m1_08",
    "label": "Educate seller on fiduciary duty and agent obligations",
    "section": "M1 · Seller Consultation — Seller Consultation Meeting",
    "order": 1008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Material info disclosure, fair market value guidance, negotiation approach"
  },
  {
    "id": "m1_09",
    "label": "Discuss seller’s goals, timeline, and motivation",
    "section": "M1 · Seller Consultation — Seller Consultation Meeting",
    "order": 1009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Why selling? Timeline? Rent-back? Sell first or buy first? Prep budget?"
  },
  {
    "id": "m1_10",
    "label": "Conduct preliminary property walkthrough assessment",
    "section": "M1 · Seller Consultation — Seller Consultation Meeting",
    "order": 1010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Note condition, updates needed, unique features, staging potential"
  },
  {
    "id": "m1_11",
    "label": "Present and explain the listing agreement components",
    "section": "M1 · Seller Consultation — Seller Consultation Meeting",
    "order": 1011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Commission, compensation transparency, duration, duties, cancellation"
  },
  {
    "id": "m1_12",
    "label": "Discuss compensation and marketing investment",
    "section": "M1 · Seller Consultation — Seller Consultation Meeting",
    "order": 1012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "What commission covers; outline potential marketing spend"
  },
  {
    "id": "m1_13",
    "label": "Review potential costs of selling (net sheet preview)",
    "section": "M1 · Seller Consultation — Seller Consultation Meeting",
    "order": 1013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Closing costs, title insurance, transfer taxes, repairs, staging, moving"
  },
  {
    "id": "m1_14",
    "label": "Establish communication expectations and preferences",
    "section": "M1 · Seller Consultation — Seller Consultation Meeting",
    "order": 1014,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Preferred method, response windows, weekly update schedule"
  },
  {
    "id": "m1_15",
    "label": "Send consultation recap and next steps email",
    "section": "M1 · Seller Consultation — Post-Consultation Follow-Up",
    "order": 1015,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Summarize discussion, action items, timeline; attach materials"
  },
  {
    "id": "m1_16",
    "label": "Deliver preliminary CMA if not presented at consultation",
    "section": "M1 · Seller Consultation — Post-Consultation Follow-Up",
    "order": 1016,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Live CMA walkthrough preferred — schedule if not done at consult"
  },
  {
    "id": "m1_17",
    "label": "Follow up on decision / secure signed listing agreement",
    "section": "M1 · Seller Consultation — Post-Consultation Follow-Up",
    "order": 1017,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Respectful follow-up; address remaining questions"
  },
  {
    "id": "m1_18",
    "label": "Log consultation outcome in CRM",
    "section": "M1 · Seller Consultation — Post-Consultation Follow-Up",
    "order": 1018,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Won, lost, pending — track for pipeline and conversion metrics"
  },
  {
    "id": "m1_19",
    "label": "If not converted, add to nurture/drip campaign",
    "section": "M1 · Seller Consultation — Post-Consultation Follow-Up",
    "order": 1019,
    "role": "Agent",
    "offset_days": null,
    "system": "resend",
    "notes": "Set follow-up reminders at 30/60/90 days"
  },
  {
    "id": "m2_01",
    "label": "Review and complete listing agreement with seller",
    "section": "M2 · Agreement & Onboarding — Listing Agreement Execution",
    "order": 2001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Ensure all terms accurate: price, commission, duration, inclusions/exclusions"
  },
  {
    "id": "m2_02",
    "label": "Obtain all required signatures on listing agreement",
    "section": "M2 · Agreement & Onboarding — Listing Agreement Execution",
    "order": 2002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "All owners must sign; verify legal authority to sell"
  },
  {
    "id": "m2_03",
    "label": "Collect and verify seller disclosure forms",
    "section": "M2 · Agreement & Onboarding — Listing Agreement Execution",
    "order": 2003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "State-required disclosures, property condition, lead paint, HOA docs"
  },
  {
    "id": "m2_04",
    "label": "Obtain agency disclosure acknowledgment",
    "section": "M2 · Agreement & Onboarding — Listing Agreement Execution",
    "order": 2004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Confirm seller understands agency relationship and representation"
  },
  {
    "id": "m2_05",
    "label": "Collect HOA documents, bylaws, and contact info",
    "section": "M2 · Agreement & Onboarding — Listing Agreement Execution",
    "order": 2005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "HOA fees, special assessments, rules, rental restrictions, reserve study"
  },
  {
    "id": "m2_06",
    "label": "Request preliminary title report / title commitment",
    "section": "M2 · Agreement & Onboarding — Listing Agreement Execution",
    "order": 2006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Identify liens, easements, encumbrances early to avoid surprises"
  },
  {
    "id": "m2_07",
    "label": "Verify property legal description and ownership",
    "section": "M2 · Agreement & Onboarding — Listing Agreement Execution",
    "order": 2007,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Cross-reference with county records; confirm all parties on title"
  },
  {
    "id": "m2_08",
    "label": "Create transaction file in transaction management system",
    "section": "M2 · Agreement & Onboarding — Transaction Setup & File Creation",
    "order": 2008,
    "role": "TC",
    "offset_days": null,
    "system": "transact",
    "notes": "Upload listing agreement, disclosures, all initial documents"
  },
  {
    "id": "m2_09",
    "label": "Set up listing timeline and key deadlines",
    "section": "M2 · Agreement & Onboarding — Transaction Setup & File Creation",
    "order": 2009,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Photos, staging, MLS entry, open house dates, showing start date"
  },
  {
    "id": "m2_10",
    "label": "Notify team of new listing (team leader, TC, marketing)",
    "section": "M2 · Agreement & Onboarding — Transaction Setup & File Creation",
    "order": 2010,
    "role": "Agent",
    "offset_days": null,
    "system": "slack",
    "notes": "Property details, seller expectations, timeline, special considerations"
  },
  {
    "id": "m2_11",
    "label": "Confirm seller’s preferred showing instructions",
    "section": "M2 · Agreement & Onboarding — Transaction Setup & File Creation",
    "order": 2011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Lockbox code, pet protocols, alarm info, restricted times, tenant notice"
  },
  {
    "id": "m2_12",
    "label": "Order home warranty (if applicable)",
    "section": "M2 · Agreement & Onboarding — Transaction Setup & File Creation",
    "order": 2012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Discuss options with seller; note cost and coverage terms"
  },
  {
    "id": "m2_13",
    "label": "Coordinate with seller on property access for vendors",
    "section": "M2 · Agreement & Onboarding — Transaction Setup & File Creation",
    "order": 2013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Key/lockbox for photographer, stager, inspector, contractors"
  },
  {
    "id": "m2_14",
    "label": "Send seller welcome packet and process overview",
    "section": "M2 · Agreement & Onboarding — Seller Communication Setup",
    "order": 2014,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Timeline, what to expect, key contacts, communication plan"
  },
  {
    "id": "m2_15",
    "label": "Set up seller in communication/update system",
    "section": "M2 · Agreement & Onboarding — Seller Communication Setup",
    "order": 2015,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Weekly update schedule, showing feedback portal, document sharing link"
  },
  {
    "id": "m2_16",
    "label": "Introduce TC/team members to seller (if applicable)",
    "section": "M2 · Agreement & Onboarding — Seller Communication Setup",
    "order": 2016,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Explain roles and who handles what; provide direct contact info"
  },
  {
    "id": "m3_01",
    "label": "Pull comparable sales data (sold, active, pending, expired)",
    "section": "M3 · Pricing & Market Analysis — Comparative Market Analysis (CMA)",
    "order": 3001,
    "role": "Agent",
    "offset_days": null,
    "system": "mls",
    "notes": "Min: 3–5 closed comps within 6 months, 0.5 mile radius"
  },
  {
    "id": "m3_02",
    "label": "Analyze and adjust comps for property differences",
    "section": "M3 · Pricing & Market Analysis — Comparative Market Analysis (CMA)",
    "order": 3002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Adjust for sq ft, lot size, condition, upgrades, age, location, view"
  },
  {
    "id": "m3_03",
    "label": "Review current market conditions and absorption rate",
    "section": "M3 · Pricing & Market Analysis — Comparative Market Analysis (CMA)",
    "order": 3003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Days on market, inventory, buyer demand, seasonal trends"
  },
  {
    "id": "m3_04",
    "label": "Prepare comprehensive CMA presentation",
    "section": "M3 · Pricing & Market Analysis — Comparative Market Analysis (CMA)",
    "order": 3004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Visual comparisons, market trends, price-per-sq-ft analysis"
  },
  {
    "id": "m3_05",
    "label": "Present CMA live with seller (not just emailed)",
    "section": "M3 · Pricing & Market Analysis — Comparative Market Analysis (CMA)",
    "order": 3005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Walk through each comp; explain methodology; answer questions"
  },
  {
    "id": "m3_06",
    "label": "Discuss pricing strategy and positioning",
    "section": "M3 · Pricing & Market Analysis — Pricing Strategy",
    "order": 3006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Price to market vs. price to negotiate; impact of overpricing; DOM stats"
  },
  {
    "id": "m3_07",
    "label": "Agree on initial list price with seller",
    "section": "M3 · Pricing & Market Analysis — Pricing Strategy",
    "order": 3007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Document agreed price and rationale; address emotional vs. market reality"
  },
  {
    "id": "m3_08",
    "label": "Prepare seller net sheet at agreed list price",
    "section": "M3 · Pricing & Market Analysis — Pricing Strategy",
    "order": 3008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Estimated proceeds after costs, commissions, payoffs"
  },
  {
    "id": "m3_09",
    "label": "Establish price reduction strategy and timeline",
    "section": "M3 · Pricing & Market Analysis — Pricing Strategy",
    "order": 3009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "If no offers in X days, pre-agreed reduction intervals"
  },
  {
    "id": "m3_10",
    "label": "Review appraisal considerations for pricing",
    "section": "M3 · Pricing & Market Analysis — Pricing Strategy",
    "order": 3010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Ensure pricing aligns with likely appraisal range; plan for low appraisal"
  },
  {
    "id": "m4_01",
    "label": "Recommend pre-listing home inspection (optional but advised)",
    "section": "M4 · Property Preparation — Pre-Listing Inspection & Repairs",
    "order": 4001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Identify issues before buyer’s inspection; builds credibility"
  },
  {
    "id": "m4_02",
    "label": "Review inspection results with seller",
    "section": "M4 · Property Preparation — Pre-Listing Inspection & Repairs",
    "order": 4002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Prioritize: safety, structural, cosmetic; cost vs. ROI analysis"
  },
  {
    "id": "m4_03",
    "label": "Coordinate necessary repairs with contractors",
    "section": "M4 · Property Preparation — Pre-Listing Inspection & Repairs",
    "order": 4003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Get bids, manage timeline, ensure quality; keep receipts for disclosure"
  },
  {
    "id": "m4_04",
    "label": "Verify all permits for past and current work",
    "section": "M4 · Property Preparation — Pre-Listing Inspection & Repairs",
    "order": 4004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Unpermitted work can derail transactions; verify with building dept"
  },
  {
    "id": "m4_05",
    "label": "Assess and improve curb appeal / landscaping",
    "section": "M4 · Property Preparation — Exterior Preparation",
    "order": 4005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Mow, trim, mulch, plant seasonal flowers, clean beds, edge walkways"
  },
  {
    "id": "m4_06",
    "label": "Power wash exterior surfaces",
    "section": "M4 · Property Preparation — Exterior Preparation",
    "order": 4006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Driveway, walkways, siding, deck/patio, fence"
  },
  {
    "id": "m4_07",
    "label": "Touch up or repaint exterior as needed",
    "section": "M4 · Property Preparation — Exterior Preparation",
    "order": 4007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Front door, trim, shutters, garage door; neutral, welcoming colors"
  },
  {
    "id": "m4_08",
    "label": "Clean gutters and downspouts",
    "section": "M4 · Property Preparation — Exterior Preparation",
    "order": 4008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Visible debris is a red flag for buyers"
  },
  {
    "id": "m4_09",
    "label": "Ensure all exterior lighting is functional",
    "section": "M4 · Property Preparation — Exterior Preparation",
    "order": 4009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Front porch, pathway, garage, security lights"
  },
  {
    "id": "m4_10",
    "label": "Clean windows (interior and exterior)",
    "section": "M4 · Property Preparation — Exterior Preparation",
    "order": 4010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Critical for photos and showings; hire professional if needed"
  },
  {
    "id": "m4_11",
    "label": "Complete interior repairs (walls, fixtures, doors, floors)",
    "section": "M4 · Property Preparation — Interior Preparation",
    "order": 4011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Patch holes, fix squeaky doors, replace broken fixtures, repair flooring"
  },
  {
    "id": "m4_12",
    "label": "Paint interior walls (neutral, modern palette)",
    "section": "M4 · Property Preparation — Interior Preparation",
    "order": 4012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Light, warm tones; cover bold/dated colors; ceilings and trim"
  },
  {
    "id": "m4_13",
    "label": "Update lighting fixtures if dated",
    "section": "M4 · Property Preparation — Interior Preparation",
    "order": 4013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Modern, bright fixtures; max wattage in all rooms"
  },
  {
    "id": "m4_14",
    "label": "Deep clean entire property",
    "section": "M4 · Property Preparation — Interior Preparation",
    "order": 4014,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Professional: carpets, tile, grout, appliances, bathrooms"
  },
  {
    "id": "m4_15",
    "label": "De-clutter all rooms, closets, and storage areas",
    "section": "M4 · Property Preparation — Interior Preparation",
    "order": 4015,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Remove 50%+ of items; rent storage if needed; clear countertops"
  },
  {
    "id": "m4_16",
    "label": "De-personalize the home",
    "section": "M4 · Property Preparation — Interior Preparation",
    "order": 4016,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Remove family photos, religious items, political decor, kids’ art"
  },
  {
    "id": "m4_17",
    "label": "Address any odor issues (pets, smoke, cooking)",
    "section": "M4 · Property Preparation — Interior Preparation",
    "order": 4017,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Professional treatment if needed; address the source, not cover-up"
  },
  {
    "id": "m4_18",
    "label": "Determine staging approach (professional, virtual, DIY)",
    "section": "M4 · Property Preparation — Staging",
    "order": 4018,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Consider price point, market expectations, vacant vs. occupied"
  },
  {
    "id": "m4_19",
    "label": "Coordinate professional staging consultation",
    "section": "M4 · Property Preparation — Staging",
    "order": 4019,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Walk through with stager; agree on furniture plan and budget"
  },
  {
    "id": "m4_20",
    "label": "Complete staging installation",
    "section": "M4 · Property Preparation — Staging",
    "order": 4020,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Ensure completed before photography; verify every room camera-ready"
  },
  {
    "id": "m4_21",
    "label": "Prepare smart home features for showing (if applicable)",
    "section": "M4 · Property Preparation — Staging",
    "order": 4021,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Thermostat, lighting scenes, music, security system instructions"
  },
  {
    "id": "m5_01",
    "label": "Schedule professional photography session",
    "section": "M5 · Marketing & Execution — Photography & Visual Content",
    "order": 5001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "HDR; twilight if applicable; ensure staging complete first"
  },
  {
    "id": "m5_02",
    "label": "Schedule aerial/drone photography (if applicable)",
    "section": "M5 · Marketing & Execution — Photography & Visual Content",
    "order": 5002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Lot size, views, neighborhood context; check drone regulations"
  },
  {
    "id": "m5_03",
    "label": "Order 3D virtual tour / Matterport scan",
    "section": "M5 · Marketing & Execution — Photography & Visual Content",
    "order": 5003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Essential for out-of-area buyers; embed on listing"
  },
  {
    "id": "m5_04",
    "label": "Create professional video walkthrough",
    "section": "M5 · Marketing & Execution — Photography & Visual Content",
    "order": 5004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Narrated or cinematic; key features, neighborhood, lifestyle"
  },
  {
    "id": "m5_05",
    "label": "Review and approve all visual content",
    "section": "M5 · Marketing & Execution — Photography & Visual Content",
    "order": 5005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Accuracy, editing, correct property representation"
  },
  {
    "id": "m5_06",
    "label": "Order floor plan / layout diagram",
    "section": "M5 · Marketing & Execution — Photography & Visual Content",
    "order": 5006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Buyers value floor plans; include room dimensions and total sq ft"
  },
  {
    "id": "m5_07",
    "label": "Write compelling MLS listing description",
    "section": "M5 · Marketing & Execution — Listing Copy & Description",
    "order": 5007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Top features, lifestyle benefits, neighborhood; avoid fair housing violations"
  },
  {
    "id": "m5_08",
    "label": "Have seller review listing description for accuracy",
    "section": "M5 · Marketing & Execution — Listing Copy & Description",
    "order": 5008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Confirm all features, upgrades, details correctly represented"
  },
  {
    "id": "m5_09",
    "label": "Prepare property feature sheet / one-pager",
    "section": "M5 · Marketing & Execution — Listing Copy & Description",
    "order": 5009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Professional design; print-ready for showings"
  },
  {
    "id": "m5_10",
    "label": "Enter listing in MLS with all required fields",
    "section": "M5 · Marketing & Execution — MLS & Syndication",
    "order": 5010,
    "role": "Agent",
    "offset_days": null,
    "system": "mls",
    "notes": "Verify: sq ft, bed/bath, lot, year built, features, disclosures"
  },
  {
    "id": "m5_11",
    "label": "Upload all photos in correct order",
    "section": "M5 · Marketing & Execution — MLS & Syndication",
    "order": 5011,
    "role": "Agent",
    "offset_days": null,
    "system": "mls",
    "notes": "Lead with best exterior shot; logical flow through home"
  },
  {
    "id": "m5_12",
    "label": "Attach virtual tour, video, and floor plan links",
    "section": "M5 · Marketing & Execution — MLS & Syndication",
    "order": 5012,
    "role": "Agent",
    "offset_days": null,
    "system": "mls",
    "notes": "Verify all links work before going live"
  },
  {
    "id": "m5_13",
    "label": "Set showing instructions and lockbox details in MLS",
    "section": "M5 · Marketing & Execution — MLS & Syndication",
    "order": 5013,
    "role": "Agent",
    "offset_days": null,
    "system": "mls",
    "notes": "Appointment, notice period, access, pet/alarm info"
  },
  {
    "id": "m5_14",
    "label": "Verify syndication to major portals (Zillow, Realtor.com, etc.)",
    "section": "M5 · Marketing & Execution — MLS & Syndication",
    "order": 5014,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Check listing accuracy on all syndicated sites; correct errors"
  },
  {
    "id": "m5_15",
    "label": "Share listing on agent/team social media channels",
    "section": "M5 · Marketing & Execution — Digital Marketing",
    "order": 5015,
    "role": "Agent",
    "offset_days": null,
    "system": "blotato",
    "notes": "Instagram, Facebook, LinkedIn; professional photos and copy"
  },
  {
    "id": "m5_16",
    "label": "Send \"Just Listed\" email blast to database",
    "section": "M5 · Marketing & Execution — Digital Marketing",
    "order": 5016,
    "role": "Agent",
    "offset_days": null,
    "system": "resend",
    "notes": "Segment list; key photos and details"
  },
  {
    "id": "m5_17",
    "label": "Launch targeted digital ad campaign (if in budget)",
    "section": "M5 · Marketing & Execution — Digital Marketing",
    "order": 5017,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "FB/IG ads, Google display; geo-target likely buyer demographics"
  },
  {
    "id": "m5_18",
    "label": "Create single-property website",
    "section": "M5 · Marketing & Execution — Digital Marketing",
    "order": 5018,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Custom URL, all media, neighborhood info, OH schedule"
  },
  {
    "id": "m5_19",
    "label": "Post video content (walkthrough, neighborhood) to YouTube/social",
    "section": "M5 · Marketing & Execution — Digital Marketing",
    "order": 5019,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "SEO-optimize titles and descriptions for address and neighborhood"
  },
  {
    "id": "m5_20",
    "label": "Design and print property brochures/flyers",
    "section": "M5 · Marketing & Execution — Print & Traditional Marketing",
    "order": 5020,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Professional design; leave at property for showings and OH"
  },
  {
    "id": "m5_21",
    "label": "Install professional yard sign and rider signs",
    "section": "M5 · Marketing & Execution — Print & Traditional Marketing",
    "order": 5021,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Agent contact, brokerage, OH riders if applicable"
  },
  {
    "id": "m5_22",
    "label": "Send \"Just Listed\" postcards to surrounding neighborhood",
    "section": "M5 · Marketing & Execution — Print & Traditional Marketing",
    "order": 5022,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Target 100–200 closest homes; awareness and lead generation"
  },
  {
    "id": "m5_23",
    "label": "Prepare property book / Home Property Book for showings",
    "section": "M5 · Marketing & Execution — Print & Traditional Marketing",
    "order": 5023,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Binder at property: disclosures, surveys, HOA docs, utility costs"
  },
  {
    "id": "m5_24",
    "label": "Notify agent network / office of new listing",
    "section": "M5 · Marketing & Execution — Print & Traditional Marketing",
    "order": 5024,
    "role": "Agent",
    "offset_days": null,
    "system": "slack",
    "notes": "Office meeting, agent-to-agent email, broker tour invitation"
  },
  {
    "id": "m6_01",
    "label": "Activate showing service / set up showing notifications",
    "section": "M6 · Showings & Open Houses — Showing Management",
    "order": 6001,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Confirm seller notification preferences"
  },
  {
    "id": "m6_02",
    "label": "Prepare property showing checklist for seller",
    "section": "M6 · Showings & Open Houses — Showing Management",
    "order": 6002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Lights on, blinds open, pets secured, beds made, clutter hidden, temp set"
  },
  {
    "id": "m6_03",
    "label": "Monitor and manage showing requests",
    "section": "M6 · Showings & Open Houses — Showing Management",
    "order": 6003,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Respond promptly; coordinate with seller schedule; track volume"
  },
  {
    "id": "m6_04",
    "label": "Collect and compile showing feedback",
    "section": "M6 · Showings & Open Houses — Showing Management",
    "order": 6004,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Automate feedback requests; compile for weekly seller update"
  },
  {
    "id": "m6_05",
    "label": "Review showing feedback with seller weekly",
    "section": "M6 · Showings & Open Houses — Showing Management",
    "order": 6005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Identify patterns: pricing, condition, layout concerns"
  },
  {
    "id": "m6_06",
    "label": "Follow up with buyer agents after showings",
    "section": "M6 · Showings & Open Houses — Showing Management",
    "order": 6006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Gauge interest, answer questions, encourage offers"
  },
  {
    "id": "m6_07",
    "label": "Schedule and plan open house events",
    "section": "M6 · Showings & Open Houses — Open House Planning & Execution",
    "order": 6007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "First OH within 1–2 weeks; consider broker open vs. public"
  },
  {
    "id": "m6_08",
    "label": "Promote open house (MLS, social media, signage, email)",
    "section": "M6 · Showings & Open Houses — Open House Planning & Execution",
    "order": 6008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Update MLS OH field; social posts; directional signs; email blast"
  },
  {
    "id": "m6_09",
    "label": "Prepare open house materials",
    "section": "M6 · Showings & Open Houses — Open House Planning & Execution",
    "order": 6009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Sign-in sheets, brochures, disclosures, business cards, refreshments"
  },
  {
    "id": "m6_10",
    "label": "Host open house and engage visitors",
    "section": "M6 · Showings & Open Houses — Open House Planning & Execution",
    "order": 6010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Greet, qualify, collect contact info; highlight features"
  },
  {
    "id": "m6_11",
    "label": "Follow up with all open house attendees within 24 hours",
    "section": "M6 · Showings & Open Houses — Open House Planning & Execution",
    "order": 6011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Email or call; provide info; encourage second showings or offers"
  },
  {
    "id": "m6_12",
    "label": "Report open house results to seller",
    "section": "M6 · Showings & Open Houses — Open House Planning & Execution",
    "order": 6012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Visitors, feedback, interested parties, next steps"
  },
  {
    "id": "m6_13",
    "label": "Provide weekly seller update (showing activity, feedback, market)",
    "section": "M6 · Showings & Open Houses — Ongoing Listing Management",
    "order": 6013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Show count, feedback summary, market changes, strategy adjustments"
  },
  {
    "id": "m6_14",
    "label": "Monitor competing listings and market changes",
    "section": "M6 · Showings & Open Houses — Ongoing Listing Management",
    "order": 6014,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "New listings, price changes, sold comps; share with seller"
  },
  {
    "id": "m6_15",
    "label": "Evaluate need for price adjustment based on data",
    "section": "M6 · Showings & Open Houses — Ongoing Listing Management",
    "order": 6015,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "DOM threshold? Showing volume declining? Feedback patterns?"
  },
  {
    "id": "m6_16",
    "label": "Refresh marketing materials and MLS photos if needed",
    "section": "M6 · Showings & Open Houses — Ongoing Listing Management",
    "order": 6016,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Seasonal updates, new staging, twilight photos"
  },
  {
    "id": "m6_17",
    "label": "Maintain property condition during listing period",
    "section": "M6 · Showings & Open Houses — Ongoing Listing Management",
    "order": 6017,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Lawn, cleanliness, clutter management; check before events"
  },
  {
    "id": "m7_01",
    "label": "Receive and log incoming offer(s)",
    "section": "M7 · Offers & Negotiation — Offer Receipt & Review",
    "order": 7001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Date/time received, buyer agent info, offer terms; track all offers"
  },
  {
    "id": "m7_02",
    "label": "Verify buyer pre-approval / proof of funds",
    "section": "M7 · Offers & Negotiation — Offer Receipt & Review",
    "order": 7002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Call buyer’s lender to verify; confirm funds for cash offers"
  },
  {
    "id": "m7_03",
    "label": "Analyze offer terms comprehensively",
    "section": "M7 · Offers & Negotiation — Offer Receipt & Review",
    "order": 7003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Price, contingencies, closing date, financing, escalation, concessions"
  },
  {
    "id": "m7_04",
    "label": "Prepare updated seller net sheet for each offer",
    "section": "M7 · Offers & Negotiation — Offer Receipt & Review",
    "order": 7004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Apples-to-apples when multiple; show net proceeds for each"
  },
  {
    "id": "m7_05",
    "label": "Present all offers to seller with analysis",
    "section": "M7 · Offers & Negotiation — Offer Receipt & Review",
    "order": 7005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Strengths/weaknesses; recommendation without pressuring"
  },
  {
    "id": "m7_06",
    "label": "Review buyer’s agent compensation offer and disclosure",
    "section": "M7 · Offers & Negotiation — Offer Receipt & Review",
    "order": 7006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Compliance with current regulations; transparent discussion"
  },
  {
    "id": "m7_07",
    "label": "Discuss negotiation strategy with seller",
    "section": "M7 · Offers & Negotiation — Negotiation",
    "order": 7007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Counter, accept, reject, multiple counter; mediation vs. combative"
  },
  {
    "id": "m7_08",
    "label": "Prepare and send counter-offer (if applicable)",
    "section": "M7 · Offers & Negotiation — Negotiation",
    "order": 7008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Address all terms; professional, solution-oriented tone"
  },
  {
    "id": "m7_09",
    "label": "Manage multiple-offer situation (if applicable)",
    "section": "M7 · Offers & Negotiation — Negotiation",
    "order": 7009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Highest and best; transparent; comply with seller instructions"
  },
  {
    "id": "m7_10",
    "label": "Negotiate final terms to mutual agreement",
    "section": "M7 · Offers & Negotiation — Negotiation",
    "order": 7010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Document all changes in writing; nothing verbal-only"
  },
  {
    "id": "m7_11",
    "label": "Review final accepted offer for completeness",
    "section": "M7 · Offers & Negotiation — Negotiation",
    "order": 7011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "All addenda, signatures, initials, dates; contingency deadlines clear"
  },
  {
    "id": "m7_12",
    "label": "Obtain all signatures on accepted contract",
    "section": "M7 · Offers & Negotiation — Contract Execution",
    "order": 7012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "All sellers and buyers; fully executed copy to all parties"
  },
  {
    "id": "m7_13",
    "label": "Send executed contract to TC and title company",
    "section": "M7 · Offers & Negotiation — Contract Execution",
    "order": 7013,
    "role": "Agent",
    "offset_days": null,
    "system": "transact",
    "notes": "Upload to transaction management; confirm receipt by all parties"
  },
  {
    "id": "m7_14",
    "label": "Confirm earnest money deposit instructions sent to buyer",
    "section": "M7 · Offers & Negotiation — Contract Execution",
    "order": 7014,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Verify amount, deadline, deposit location per contract"
  },
  {
    "id": "m7_15",
    "label": "Update MLS status to Under Contract / Pending",
    "section": "M7 · Offers & Negotiation — Contract Execution",
    "order": 7015,
    "role": "Agent",
    "offset_days": null,
    "system": "mls",
    "notes": "Accurate status; backup offer instructions if any"
  },
  {
    "id": "m7_16",
    "label": "Notify seller of all contract deadlines and timeline",
    "section": "M7 · Offers & Negotiation — Contract Execution",
    "order": 7016,
    "role": "Agent",
    "offset_days": 0,
    "system": "command",
    "notes": "Create deadline calendar; review each critical date; explain consequences"
  },
  {
    "id": "m8_01",
    "label": "Verify earnest money deposited by deadline",
    "section": "M8 · Due Diligence — Earnest Money & Title",
    "order": 8001,
    "role": "TC",
    "offset_days": 3,
    "system": "command",
    "notes": "Confirm receipt from title company; document and notify all parties"
  },
  {
    "id": "m8_02",
    "label": "Monitor title search progress",
    "section": "M8 · Due Diligence — Earnest Money & Title",
    "order": 8002,
    "role": "TC",
    "offset_days": 7,
    "system": "command",
    "notes": "Follow up with title company; review for issues early"
  },
  {
    "id": "m8_03",
    "label": "Review title commitment and resolve any title issues",
    "section": "M8 · Due Diligence — Earnest Money & Title",
    "order": 8003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Liens, judgments, easements, boundary issues; coordinate with seller"
  },
  {
    "id": "m8_04",
    "label": "Provide required documents to title company",
    "section": "M8 · Due Diligence — Earnest Money & Title",
    "order": 8004,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Survey, HOA docs, payoff statements, divorce decrees, trust documents"
  },
  {
    "id": "m8_05",
    "label": "Coordinate access for buyer’s home inspection",
    "section": "M8 · Due Diligence — Buyer’s Inspection Period",
    "order": 8005,
    "role": "TC",
    "offset_days": 7,
    "system": "command",
    "notes": "Confirm date/time; ensure property accessible; seller vacates"
  },
  {
    "id": "m8_06",
    "label": "Receive and review buyer’s inspection report/objection",
    "section": "M8 · Due Diligence — Buyer’s Inspection Period",
    "order": 8006,
    "role": "Agent",
    "offset_days": 12,
    "system": "command",
    "notes": "Categorize: safety, structural, cosmetic, unreasonable"
  },
  {
    "id": "m8_07",
    "label": "Advise seller on inspection response strategy",
    "section": "M8 · Due Diligence — Buyer’s Inspection Period",
    "order": 8007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Repair, credit, push back; get repair estimates"
  },
  {
    "id": "m8_08",
    "label": "Negotiate inspection resolution with buyer’s agent",
    "section": "M8 · Due Diligence — Buyer’s Inspection Period",
    "order": 8008,
    "role": "Agent",
    "offset_days": 15,
    "system": "command",
    "notes": "Written resolution/amendment; document agreed repairs or credits"
  },
  {
    "id": "m8_09",
    "label": "Coordinate and verify completion of agreed repairs",
    "section": "M8 · Due Diligence — Buyer’s Inspection Period",
    "order": 8009,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Receipts, invoices, completion docs; provide to buyer’s agent"
  },
  {
    "id": "m8_10",
    "label": "Coordinate access for any additional inspections",
    "section": "M8 · Due Diligence — Buyer’s Inspection Period",
    "order": 8010,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Radon, sewer scope, structural, pest, well, septic — as applicable"
  },
  {
    "id": "m8_11",
    "label": "Prepare appraisal support package for appraiser",
    "section": "M8 · Due Diligence — Appraisal",
    "order": 8011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "CMA, upgrades list with costs, comparable sales, unique features"
  },
  {
    "id": "m8_12",
    "label": "Coordinate access for appraisal",
    "section": "M8 · Due Diligence — Appraisal",
    "order": 8012,
    "role": "TC",
    "offset_days": 21,
    "system": "command",
    "notes": "Property clean and staged; agent meets appraiser if permitted"
  },
  {
    "id": "m8_13",
    "label": "Review appraisal results",
    "section": "M8 · Due Diligence — Appraisal",
    "order": 8013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Compare to contract price; identify any issues or disputes"
  },
  {
    "id": "m8_14",
    "label": "Negotiate appraisal shortfall (if applicable)",
    "section": "M8 · Due Diligence — Appraisal",
    "order": 8014,
    "role": "Agent",
    "offset_days": 24,
    "system": "command",
    "notes": "Reduction, buyer covers gap, meet in middle, additional comps; dispute"
  },
  {
    "id": "m8_15",
    "label": "Provide HOA documents to buyer per contract timeline",
    "section": "M8 · Due Diligence — HOA & Additional Contingencies",
    "order": 8015,
    "role": "TC",
    "offset_days": 7,
    "system": "command",
    "notes": "Bylaws, financials, meeting minutes, reserve study, rules, assessments"
  },
  {
    "id": "m8_16",
    "label": "Monitor buyer’s HOA document review period",
    "section": "M8 · Due Diligence — HOA & Additional Contingencies",
    "order": 8016,
    "role": "TC",
    "offset_days": 14,
    "system": "command",
    "notes": "Track deadline; follow up if no response as deadline approaches"
  },
  {
    "id": "m8_17",
    "label": "Track all contingency deadlines and removal dates",
    "section": "M8 · Due Diligence — HOA & Additional Contingencies",
    "order": 8017,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Inspection, appraisal, financing, HOA, sale of buyer’s home"
  },
  {
    "id": "m8_18",
    "label": "Confirm contingency removals/waivers in writing",
    "section": "M8 · Due Diligence — HOA & Additional Contingencies",
    "order": 8018,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Document each contingency resolution; file in transaction system"
  },
  {
    "id": "m8_19",
    "label": "Monitor buyer’s loan progress with lender",
    "section": "M8 · Due Diligence — HOA & Additional Contingencies",
    "order": 8019,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Regular check-ins; escalate any delays; verify clear-to-close timeline"
  },
  {
    "id": "m9_01",
    "label": "Confirm closing date, time, and location with all parties",
    "section": "M9 · Pre-Closing — Closing Coordination",
    "order": 9001,
    "role": "TC",
    "offset_days": 23,
    "system": "command",
    "notes": "Title, seller, buyer, agents, lender; send calendar invites"
  },
  {
    "id": "m9_02",
    "label": "Confirm buyer’s lender has issued clear-to-close",
    "section": "M9 · Pre-Closing — Closing Coordination",
    "order": 9002,
    "role": "TC",
    "offset_days": 25,
    "system": "command",
    "notes": "Follow up directly with lender; escalate if delayed"
  },
  {
    "id": "m9_03",
    "label": "Review preliminary closing disclosure / settlement statement",
    "section": "M9 · Pre-Closing — Closing Coordination",
    "order": 9003,
    "role": "TC",
    "offset_days": 27,
    "system": "command",
    "notes": "Verify all numbers: price, commissions, credits, prorations, payoffs"
  },
  {
    "id": "m9_04",
    "label": "Review closing statement with seller and explain all line items",
    "section": "M9 · Pre-Closing — Closing Coordination",
    "order": 9004,
    "role": "Agent",
    "offset_days": 28,
    "system": "command",
    "notes": "Walk through every charge and credit; compare to net sheet"
  },
  {
    "id": "m9_05",
    "label": "Confirm all agreed repairs completed and documented",
    "section": "M9 · Pre-Closing — Closing Coordination",
    "order": 9005,
    "role": "TC",
    "offset_days": 28,
    "system": "command",
    "notes": "Receipts, photos, warranties; provide to buyer’s agent in advance"
  },
  {
    "id": "m9_06",
    "label": "Ensure all required documents submitted to title company",
    "section": "M9 · Pre-Closing — Closing Coordination",
    "order": 9006,
    "role": "TC",
    "offset_days": 27,
    "system": "command",
    "notes": "Payoff letters, ID, HOA certs, survey, POA if needed"
  },
  {
    "id": "m9_07",
    "label": "Remind seller of move-out timeline and condition requirements",
    "section": "M9 · Pre-Closing — Seller Preparation",
    "order": 9007,
    "role": "Agent",
    "offset_days": 23,
    "system": "command",
    "notes": "Clean, all belongings removed, all included items remain"
  },
  {
    "id": "m9_08",
    "label": "Arrange for staging furniture removal (if applicable)",
    "section": "M9 · Pre-Closing — Seller Preparation",
    "order": 9008,
    "role": "Agent",
    "offset_days": 28,
    "system": "command",
    "notes": "Coordinate with staging company; confirm pickup"
  },
  {
    "id": "m9_09",
    "label": "Collect all keys, remotes, codes, and manuals for buyer",
    "section": "M9 · Pre-Closing — Seller Preparation",
    "order": 9009,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Keys, mailbox, garage remotes, alarm codes, appliance manuals, warranties"
  },
  {
    "id": "m9_10",
    "label": "Transfer or cancel utilities and services",
    "section": "M9 · Pre-Closing — Seller Preparation",
    "order": 9010,
    "role": "Agent",
    "offset_days": 28,
    "system": "command",
    "notes": "Electric, gas, water, internet, trash, lawn, security, pool"
  },
  {
    "id": "m9_11",
    "label": "Complete final property walkthrough preparation",
    "section": "M9 · Pre-Closing — Seller Preparation",
    "order": 9011,
    "role": "Agent",
    "offset_days": 29,
    "system": "command",
    "notes": "Broom-clean, all agreed items in place, no damage from move-out"
  },
  {
    "id": "m9_12",
    "label": "Coordinate buyer’s final walkthrough",
    "section": "M9 · Pre-Closing — Buyer’s Final Walkthrough",
    "order": 9012,
    "role": "TC",
    "offset_days": 28,
    "system": "command",
    "notes": "Confirm time with buyer’s agent; ensure property accessible"
  },
  {
    "id": "m9_13",
    "label": "Address any walkthrough issues immediately",
    "section": "M9 · Pre-Closing — Buyer’s Final Walkthrough",
    "order": 9013,
    "role": "Agent",
    "offset_days": 29,
    "system": "command",
    "notes": "Missing items, damage, incomplete repairs — resolve before closing"
  },
  {
    "id": "m10_01",
    "label": "Attend closing (in person or coordinate remote signing)",
    "section": "M10 · Closing & Post-Close — Closing Day",
    "order": 10001,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Be present to support; handle last-minute issues"
  },
  {
    "id": "m10_02",
    "label": "Review and verify all closing documents with seller",
    "section": "M10 · Closing & Post-Close — Closing Day",
    "order": 10002,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Deed, settlement statement, tax forms, transfer docs"
  },
  {
    "id": "m10_03",
    "label": "Confirm all signatures obtained and documents executed",
    "section": "M10 · Closing & Post-Close — Closing Day",
    "order": 10003,
    "role": "TC",
    "offset_days": 30,
    "system": "command",
    "notes": "Verify nothing missed; title confirms complete package"
  },
  {
    "id": "m10_04",
    "label": "Deliver keys, remotes, and access items to buyer/buyer’s agent",
    "section": "M10 · Closing & Post-Close — Closing Day",
    "order": 10004,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Per contract terms — at closing or upon recording"
  },
  {
    "id": "m10_05",
    "label": "Confirm recording of deed with title company",
    "section": "M10 · Closing & Post-Close — Closing Day",
    "order": 10005,
    "role": "TC",
    "offset_days": 30,
    "system": "command",
    "notes": "Verify recording with county; confirm transfer of ownership"
  },
  {
    "id": "m10_06",
    "label": "Verify commission disbursement",
    "section": "M10 · Closing & Post-Close — Closing Day",
    "order": 10006,
    "role": "TC",
    "offset_days": 30,
    "system": "command",
    "notes": "Confirm correct amounts disbursed to brokerage"
  },
  {
    "id": "m10_07",
    "label": "Update MLS status to Sold/Closed",
    "section": "M10 · Closing & Post-Close — Post-Closing Administration",
    "order": 10007,
    "role": "Agent",
    "offset_days": 30,
    "system": "mls",
    "notes": "Final sale price, closing date, concessions, buyer agent comp"
  },
  {
    "id": "m10_08",
    "label": "Complete final transaction file audit",
    "section": "M10 · Closing & Post-Close — Post-Closing Administration",
    "order": 10008,
    "role": "TC",
    "offset_days": 33,
    "system": "command",
    "notes": "All documents uploaded, organized, brokerage-compliant"
  },
  {
    "id": "m10_09",
    "label": "Remove lockbox, sign, and any marketing materials",
    "section": "M10 · Closing & Post-Close — Post-Closing Administration",
    "order": 10009,
    "role": "Agent",
    "offset_days": 31,
    "system": "command",
    "notes": "Collect from property; cancel any active showing service"
  },
  {
    "id": "m10_10",
    "label": "Update CRM with transaction details and close date",
    "section": "M10 · Closing & Post-Close — Post-Closing Administration",
    "order": 10010,
    "role": "TC",
    "offset_days": 33,
    "system": "command",
    "notes": "Sale price, close date, commission, buyer info; tag for future marketing"
  },
  {
    "id": "m10_11",
    "label": "Send closing gift and handwritten thank-you note",
    "section": "M10 · Closing & Post-Close — Client Relationship & Retention",
    "order": 10011,
    "role": "Agent",
    "offset_days": 37,
    "system": "command",
    "notes": "Personalized, memorable; reflects relationship and experience"
  },
  {
    "id": "m10_12",
    "label": "Request testimonial / online review",
    "section": "M10 · Closing & Post-Close — Client Relationship & Retention",
    "order": 10012,
    "role": "Agent",
    "offset_days": 44,
    "system": "command",
    "notes": "Google, Zillow, Realtor.com; provide direct links"
  },
  {
    "id": "m10_13",
    "label": "Request referrals",
    "section": "M10 · Closing & Post-Close — Client Relationship & Retention",
    "order": 10013,
    "role": "Agent",
    "offset_days": 58,
    "system": "command",
    "notes": "Ask specifically: family, friends, colleagues"
  },
  {
    "id": "m10_14",
    "label": "Add seller to post-close nurture campaign",
    "section": "M10 · Closing & Post-Close — Client Relationship & Retention",
    "order": 10014,
    "role": "Agent",
    "offset_days": 60,
    "system": "resend",
    "notes": "Anniversary touchpoints, value updates, holiday/seasonal outreach"
  },
  {
    "id": "m10_15",
    "label": "Send \"Happy Home Anniversary\" on annual close date",
    "section": "M10 · Closing & Post-Close — Client Relationship & Retention",
    "order": 10015,
    "role": "Agent",
    "offset_days": 365,
    "system": "command",
    "notes": "Automate in CRM; personal note or small gift each year"
  },
  {
    "id": "m10_16",
    "label": "Conduct post-transaction client satisfaction survey",
    "section": "M10 · Closing & Post-Close — Client Relationship & Retention",
    "order": 10016,
    "role": "Agent",
    "offset_days": 58,
    "system": "command",
    "notes": "Gather feedback; identify areas for improvement"
  },
  {
    "id": "m10_17",
    "label": "Provide post-move resource list to seller",
    "section": "M10 · Closing & Post-Close — Client Relationship & Retention",
    "order": 10017,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Moving checklist, change of address, utility setup for new location"
  }
]'::jsonb,
  2
);

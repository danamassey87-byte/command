-- ────────────────────────────────────────────────────────────────────────────
-- 2026-05-06 — Seed comprehensive Buyer Workflow (M1–M10) (M1–M10)
-- 151 tasks across 10 modules: Lead Intake → Post-Closing. Includes NAR settlement compliance, Tier 1/2/3 showings, full specialty inspections, contingency tracking, wire-fraud prevention, annual home anniversary.
-- Replaces any previous template under category='buyer'.
-- ────────────────────────────────────────────────────────────────────────────

-- Soft-delete prior templates in this category to avoid duplicate "start" buttons
UPDATE checklist_templates
SET deleted_at = now()
WHERE category = 'buyer' AND deleted_at IS NULL;

-- Insert the comprehensive M1–M10 template
INSERT INTO checklist_templates (name, category, steps, version)
VALUES (
  'Buyer Workflow (M1–M10)',
  'buyer',
  '[
  {
    "id": "m1_01",
    "label": "Receive and log new buyer lead in CRM",
    "section": "M1 · Buyer Consultation — Lead Intake & Initial Contact",
    "order": 1001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Record source, contact info, buying timeline, property type interest"
  },
  {
    "id": "m1_02",
    "label": "Respond to buyer inquiry within communication SLA",
    "section": "M1 · Buyer Consultation — Lead Intake & Initial Contact",
    "order": 1002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Email: next business day · Text: within 2 hours (9:30am–7pm) · Collections: 3–5 hours"
  },
  {
    "id": "m1_03",
    "label": "Conduct initial phone/video screening call",
    "section": "M1 · Buyer Consultation — Lead Intake & Initial Contact",
    "order": 1003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Assess: timeline, pre-approval status, motivation, current living situation, working with another agent?"
  },
  {
    "id": "m1_04",
    "label": "Send pre-consultation package to buyer",
    "section": "M1 · Buyer Consultation — Lead Intake & Initial Contact",
    "order": 1004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Buyer Guide, \"Why Work With an RE Advisor\", pre-approval checklist"
  },
  {
    "id": "m1_05",
    "label": "Schedule in-person or virtual buyer consultation",
    "section": "M1 · Buyer Consultation — Lead Intake & Initial Contact",
    "order": 1005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Confirm date/time/location; send calendar invite with agenda"
  },
  {
    "id": "m1_06",
    "label": "Pre-qualify buyer: verify pre-approval or financing status",
    "section": "M1 · Buyer Consultation — Lead Intake & Initial Contact",
    "order": 1006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Mortgage pre-approval letter, proof of funds for cash, budget range confirmed"
  },
  {
    "id": "m1_07",
    "label": "Present professional credentials and value proposition",
    "section": "M1 · Buyer Consultation — Buyer Consultation Meeting",
    "order": 1007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Professional RE Advisor positioning; 90/10 industry stat; fiduciary duty explanation"
  },
  {
    "id": "m1_08",
    "label": "Educate buyer on fiduciary duty and agent obligations",
    "section": "M1 · Buyer Consultation — Buyer Consultation Meeting",
    "order": 1008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Material information disclosure, fair market value, negotiation approach, mediation philosophy"
  },
  {
    "id": "m1_09",
    "label": "Complete buyer needs assessment questionnaire",
    "section": "M1 · Buyer Consultation — Buyer Consultation Meeting",
    "order": 1009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Motivation, timeline, must-haves, absolutely-nots, neighborhoods, 1–10 readiness scale"
  },
  {
    "id": "m1_10",
    "label": "Discuss budget, financing options, and affordability",
    "section": "M1 · Buyer Consultation — Buyer Consultation Meeting",
    "order": 1010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Monthly payment comfort, down payment sources, loan types, closing cost estimates"
  },
  {
    "id": "m1_11",
    "label": "Explain the home buying process (overview of all steps)",
    "section": "M1 · Buyer Consultation — Buyer Consultation Meeting",
    "order": 1011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Walk through complete process from search to closing; set realistic expectations"
  },
  {
    "id": "m1_12",
    "label": "Discuss current market conditions and what to expect",
    "section": "M1 · Buyer Consultation — Buyer Consultation Meeting",
    "order": 1012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Inventory, competition, pricing trends, typical timelines"
  },
  {
    "id": "m1_13",
    "label": "Introduce specialized buyer programs and services",
    "section": "M1 · Buyer Consultation — Buyer Consultation Meeting",
    "order": 1013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Concierge search, curated collections, off-market access, buyer business cards for OH"
  },
  {
    "id": "m1_14",
    "label": "Establish communication expectations and preferences",
    "section": "M1 · Buyer Consultation — Buyer Consultation Meeting",
    "order": 1014,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Preferred method, response windows, weekly update schedule, tour scheduling protocol"
  },
  {
    "id": "m1_15",
    "label": "Send consultation recap and next steps email",
    "section": "M1 · Buyer Consultation — Post-Consultation Follow-Up",
    "order": 1015,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Summary of needs, timeline, action items, links to resources"
  },
  {
    "id": "m1_16",
    "label": "Set up automated property search alerts in MLS",
    "section": "M1 · Buyer Consultation — Post-Consultation Follow-Up",
    "order": 1016,
    "role": "Agent",
    "offset_days": null,
    "system": "mls",
    "notes": "Match needs assessment criteria; alert frequency per buyer preference"
  },
  {
    "id": "m1_17",
    "label": "Connect buyer with preferred lender (if not yet pre-approved)",
    "section": "M1 · Buyer Consultation — Post-Consultation Follow-Up",
    "order": 1017,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Warm introduction; share buyer’s timeline and purchase goals"
  },
  {
    "id": "m1_18",
    "label": "Log consultation outcome and buyer profile in CRM",
    "section": "M1 · Buyer Consultation — Post-Consultation Follow-Up",
    "order": 1018,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Active buyer / future buyer / not qualified — set follow-up plan"
  },
  {
    "id": "m1_19",
    "label": "If not ready to engage, add to nurture/drip campaign",
    "section": "M1 · Buyer Consultation — Post-Consultation Follow-Up",
    "order": 1019,
    "role": "Agent",
    "offset_days": null,
    "system": "resend",
    "notes": "Educational content, market updates; follow-up at 30/60/90 days"
  },
  {
    "id": "m2_01",
    "label": "Explain buyer agency representation and what it means",
    "section": "M2 · Agency & Compliance — Buyer Agency Agreement (NAR Settlement)",
    "order": 2001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Right to representation; duty of loyalty and fiduciary obligation"
  },
  {
    "id": "m2_02",
    "label": "Present written buyer agency agreement for review",
    "section": "M2 · Agency & Compliance — Buyer Agency Agreement (NAR Settlement)",
    "order": 2002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "REQUIRED before any property tours per NAR settlement (Aug 2024)"
  },
  {
    "id": "m2_03",
    "label": "Discuss compensation structure and terms transparently",
    "section": "M2 · Agency & Compliance — Buyer Agency Agreement (NAR Settlement)",
    "order": 2003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "How agent is compensated, who pays, buyer obligation, seller concessions, negotiability"
  },
  {
    "id": "m2_04",
    "label": "Ensure compensation terms are objectively ascertainable",
    "section": "M2 · Agency & Compliance — Buyer Agency Agreement (NAR Settlement)",
    "order": 2004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Specific dollar amount or percentage — cannot be open-ended per NAR settlement"
  },
  {
    "id": "m2_05",
    "label": "Obtain signed buyer agency agreement",
    "section": "M2 · Agency & Compliance — Buyer Agency Agreement (NAR Settlement)",
    "order": 2005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "All buyers must sign before any property showing; retain copy"
  },
  {
    "id": "m2_06",
    "label": "Upload executed agreement to transaction management system",
    "section": "M2 · Agency & Compliance — Buyer Agency Agreement (NAR Settlement)",
    "order": 2006,
    "role": "TC",
    "offset_days": null,
    "system": "transact",
    "notes": "File in buyer transaction; note duration and terms"
  },
  {
    "id": "m2_07",
    "label": "Provide state-required agency disclosure form",
    "section": "M2 · Agency & Compliance — Agency Disclosures",
    "order": 2007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Explain types of agency; document buyer acknowledgment"
  },
  {
    "id": "m2_08",
    "label": "Obtain signed agency disclosure acknowledgment",
    "section": "M2 · Agency & Compliance — Agency Disclosures",
    "order": 2008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "File in transaction record; required before substantive discussions"
  },
  {
    "id": "m2_09",
    "label": "Explain dual agency policy (AZ allows with consent)",
    "section": "M2 · Agency & Compliance — Agency Disclosures",
    "order": 2009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "AZ permits with limited representation; explain limitations and get written consent"
  },
  {
    "id": "m2_10",
    "label": "Discuss how compensation will be handled if listing offers $0",
    "section": "M2 · Agency & Compliance — Agency Disclosures",
    "order": 2010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Options: buyer pays, negotiate into offer, request concession; ensure understanding before touring"
  },
  {
    "id": "m2_11",
    "label": "Review Fair Housing obligations with buyer",
    "section": "M2 · Agency & Compliance — Fair Housing & Compliance",
    "order": 2011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Protected classes, steering prohibition, equal service commitment"
  },
  {
    "id": "m2_12",
    "label": "Ensure all search criteria are buyer-directed (not agent-directed)",
    "section": "M2 · Agency & Compliance — Fair Housing & Compliance",
    "order": 2012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Document that location/neighborhood/school preferences come from buyer"
  },
  {
    "id": "m3_01",
    "label": "Refine search criteria based on consultation needs assessment",
    "section": "M3 · Property Search — Search Setup & Strategy",
    "order": 3001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Must-haves, nice-to-haves, deal-breakers; prioritize non-negotiables"
  },
  {
    "id": "m3_02",
    "label": "Set up curated property collections for buyer",
    "section": "M3 · Property Search — Search Setup & Strategy",
    "order": 3002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Organized by neighborhood, price range, or style"
  },
  {
    "id": "m3_03",
    "label": "Identify off-market and coming-soon opportunities",
    "section": "M3 · Property Search — Search Setup & Strategy",
    "order": 3003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Agent network, pocket listings, pre-market intel"
  },
  {
    "id": "m3_04",
    "label": "Educate buyer on how to evaluate listing photos and descriptions",
    "section": "M3 · Property Search — Search Setup & Strategy",
    "order": 3004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "What to look for, red flags, how to read between the lines"
  },
  {
    "id": "m3_05",
    "label": "Schedule property showings per buyer availability",
    "section": "M3 · Property Search — Property Tours & Evaluation",
    "order": 3005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Tier 1: immediate · Tier 2: within 24 hrs · Tier 3: weekend/planned"
  },
  {
    "id": "m3_06",
    "label": "Prepare showing packets for each property",
    "section": "M3 · Property Search — Property Tours & Evaluation",
    "order": 3006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "MLS sheets, tax records, HOA, neighborhood data, DOM, price history"
  },
  {
    "id": "m3_07",
    "label": "Conduct property tours and guide buyer evaluation",
    "section": "M3 · Property Search — Property Tours & Evaluation",
    "order": 3007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Point out positive and negative features objectively"
  },
  {
    "id": "m3_08",
    "label": "Document buyer feedback on each property viewed",
    "section": "M3 · Property Search — Property Tours & Evaluation",
    "order": 3008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Ratings, pros/cons, comparison notes; track to narrow down"
  },
  {
    "id": "m3_09",
    "label": "Use elimination method to narrow to top 3 properties",
    "section": "M3 · Property Search — Property Tours & Evaluation",
    "order": 3009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Rank by buyer priority criteria"
  },
  {
    "id": "m3_10",
    "label": "Provide buyer business cards for independent open house visits",
    "section": "M3 · Property Search — Property Tours & Evaluation",
    "order": 3010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Buyers represent themselves at OH with your card; keeps relationship clear"
  },
  {
    "id": "m3_11",
    "label": "Run CMAs on buyer’s top 3 properties",
    "section": "M3 · Property Search — Property Analysis & CMA",
    "order": 3011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Live walkthrough; comp analysis to determine fair market value and offer strategy"
  },
  {
    "id": "m3_12",
    "label": "Research neighborhood and community details",
    "section": "M3 · Property Search — Property Analysis & CMA",
    "order": 3012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Schools, commute, amenities, crime stats, future development, HOA"
  },
  {
    "id": "m3_13",
    "label": "Review property history (prior sales, DOM, price changes)",
    "section": "M3 · Property Search — Property Analysis & CMA",
    "order": 3013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Motivation clues from days on market and price reductions"
  },
  {
    "id": "m3_14",
    "label": "Assess property for potential issues (foundation, roof, systems)",
    "section": "M3 · Property Search — Property Analysis & CMA",
    "order": 3014,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Visual only — note items for inspection; discuss potential costs"
  },
  {
    "id": "m3_15",
    "label": "Provide buyer with estimated costs of ownership",
    "section": "M3 · Property Search — Property Analysis & CMA",
    "order": 3015,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Taxes, insurance, HOA, utilities, maintenance; monthly payment reality check"
  },
  {
    "id": "m4_01",
    "label": "Confirm buyer’s pre-approval is current and sufficient",
    "section": "M4 · Offer & Negotiation — Offer Preparation",
    "order": 4001,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Call lender; verify amount, loan type, rate lock status"
  },
  {
    "id": "m4_02",
    "label": "Discuss offer strategy with buyer",
    "section": "M4 · Offer & Negotiation — Offer Preparation",
    "order": 4002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Price, contingencies, closing date, earnest money, escalation, concessions"
  },
  {
    "id": "m4_03",
    "label": "Review CMA and determine offer price recommendation",
    "section": "M4 · Offer & Negotiation — Offer Preparation",
    "order": 4003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Fair market value analysis; offer positioning vs. asking and competition"
  },
  {
    "id": "m4_04",
    "label": "Discuss buyer agent compensation handling in offer",
    "section": "M4 · Offer & Negotiation — Offer Preparation",
    "order": 4004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Request from seller / buyer-paid / combination"
  },
  {
    "id": "m4_05",
    "label": "Prepare purchase offer contract with all terms",
    "section": "M4 · Offer & Negotiation — Offer Preparation",
    "order": 4005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "All required forms, addenda, disclosures; review every field"
  },
  {
    "id": "m4_06",
    "label": "Prepare buyer estimated closing cost worksheet",
    "section": "M4 · Offer & Negotiation — Offer Preparation",
    "order": 4006,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Loan costs, title, insurance, prepaid items, recording fees, agent comp"
  },
  {
    "id": "m4_07",
    "label": "Review offer with buyer before submission",
    "section": "M4 · Offer & Negotiation — Offer Preparation",
    "order": 4007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Walk through every term; ensure buyer understands obligations and timelines"
  },
  {
    "id": "m4_08",
    "label": "Obtain buyer signatures on offer and all addenda",
    "section": "M4 · Offer & Negotiation — Offer Preparation",
    "order": 4008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "All buyers sign; verify nothing blank; include pre-approval letter"
  },
  {
    "id": "m4_09",
    "label": "Submit offer to listing agent with all required documents",
    "section": "M4 · Offer & Negotiation — Offer Submission & Negotiation",
    "order": 4009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Signed offer, pre-approval, proof of funds, cover letter (if appropriate)"
  },
  {
    "id": "m4_10",
    "label": "Follow up with listing agent to confirm receipt",
    "section": "M4 · Offer & Negotiation — Offer Submission & Negotiation",
    "order": 4010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Confirm receipt; ask about other offers, seller timeline"
  },
  {
    "id": "m4_11",
    "label": "Communicate seller response to buyer and strategize",
    "section": "M4 · Offer & Negotiation — Offer Submission & Negotiation",
    "order": 4011,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Counter-offer, rejection, or acceptance; discuss strategy"
  },
  {
    "id": "m4_12",
    "label": "Negotiate counter-offers using mediation approach",
    "section": "M4 · Offer & Negotiation — Offer Submission & Negotiation",
    "order": 4012,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Solution-oriented; focus on win-win; keep buyer informed"
  },
  {
    "id": "m4_13",
    "label": "Handle multiple-offer competition strategy",
    "section": "M4 · Offer & Negotiation — Offer Submission & Negotiation",
    "order": 4013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Highest and best, escalation clauses, appraisal gap coverage"
  },
  {
    "id": "m4_14",
    "label": "Confirm mutual acceptance and fully executed contract",
    "section": "M4 · Offer & Negotiation — Contract Execution",
    "order": 4014,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "All signatures, initials, dates; no blanks; all addenda attached"
  },
  {
    "id": "m4_15",
    "label": "Send executed contract to TC, lender, and title company",
    "section": "M4 · Offer & Negotiation — Contract Execution",
    "order": 4015,
    "role": "Agent",
    "offset_days": null,
    "system": "transact",
    "notes": "Upload to transaction management system; confirm receipt by all parties"
  },
  {
    "id": "m4_16",
    "label": "Deliver earnest money per contract terms",
    "section": "M4 · Offer & Negotiation — Contract Execution",
    "order": 4016,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Wire, certified check, or digital transfer; verify delivery method and deadline"
  },
  {
    "id": "m4_17",
    "label": "Create master deadline calendar for all contract dates",
    "section": "M4 · Offer & Negotiation — Contract Execution",
    "order": 4017,
    "role": "TC",
    "offset_days": 0,
    "system": "command",
    "notes": "All contingency deadlines, inspection periods, closing date; share with buyer"
  },
  {
    "id": "m4_18",
    "label": "Notify buyer of all deadlines and explain consequences",
    "section": "M4 · Offer & Negotiation — Contract Execution",
    "order": 4018,
    "role": "Agent",
    "offset_days": 0,
    "system": "command",
    "notes": "Time is of the essence — missed deadlines can cost rights or earnest money"
  },
  {
    "id": "m5_01",
    "label": "Schedule home inspection within contract timeline",
    "section": "M5 · Inspections — Home Inspection",
    "order": 5001,
    "role": "TC",
    "offset_days": 1,
    "system": "command",
    "notes": "Book immediately — inspection periods are often 7–10 days"
  },
  {
    "id": "m5_02",
    "label": "Coordinate property access for inspection",
    "section": "M5 · Inspections — Home Inspection",
    "order": 5002,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Confirm access with listing agent; ensure attic/crawlspace/garage accessible"
  },
  {
    "id": "m5_03",
    "label": "Attend home inspection with buyer",
    "section": "M5 · Inspections — Home Inspection",
    "order": 5003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Walk through with inspector; help buyer understand findings"
  },
  {
    "id": "m5_04",
    "label": "Review inspection report thoroughly with buyer",
    "section": "M5 · Inspections — Home Inspection",
    "order": 5004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Categorize: safety, structural, mechanical, cosmetic; severity and cost"
  },
  {
    "id": "m5_05",
    "label": "Research repair costs for significant inspection items",
    "section": "M5 · Inspections — Home Inspection",
    "order": 5005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Get estimates from contractors if needed for negotiation leverage"
  },
  {
    "id": "m5_06",
    "label": "Schedule radon test (if applicable)",
    "section": "M5 · Inspections — Specialty Inspections",
    "order": 5006,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Common in many markets; results in 48–72 hours"
  },
  {
    "id": "m5_07",
    "label": "Schedule sewer/septic inspection",
    "section": "M5 · Inspections — Specialty Inspections",
    "order": 5007,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Sewer scope for municipal; full septic for septic systems"
  },
  {
    "id": "m5_08",
    "label": "Schedule pest/termite inspection",
    "section": "M5 · Inspections — Specialty Inspections",
    "order": 5008,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Required by some lenders; check for active infestation and damage"
  },
  {
    "id": "m5_09",
    "label": "Schedule structural/foundation inspection (if flagged)",
    "section": "M5 · Inspections — Specialty Inspections",
    "order": 5009,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Only if general inspection flags concerns; structural engineer"
  },
  {
    "id": "m5_10",
    "label": "Schedule well water test (if applicable)",
    "section": "M5 · Inspections — Specialty Inspections",
    "order": 5010,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Water quality, flow rate, potability; required by many lenders"
  },
  {
    "id": "m5_11",
    "label": "Schedule roof inspection (if flagged or near end of life)",
    "section": "M5 · Inspections — Specialty Inspections",
    "order": 5011,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Certified roof inspector; document age/condition/remaining life/replacement cost"
  },
  {
    "id": "m5_12",
    "label": "Schedule pool/spa inspection (if applicable)",
    "section": "M5 · Inspections — Specialty Inspections",
    "order": 5012,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Equipment, safety compliance, structural integrity"
  },
  {
    "id": "m5_13",
    "label": "Prepare inspection objection / repair request",
    "section": "M5 · Inspections — Inspection Negotiation",
    "order": 5013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Prioritize safety and major items; reasonable and strategic; with documentation"
  },
  {
    "id": "m5_14",
    "label": "Submit inspection objection to listing agent",
    "section": "M5 · Inspections — Inspection Negotiation",
    "order": 5014,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Within contract timeframe; professional tone; solution-oriented"
  },
  {
    "id": "m5_15",
    "label": "Negotiate inspection resolution with listing agent",
    "section": "M5 · Inspections — Inspection Negotiation",
    "order": 5015,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Repairs, credits, price reduction; document everything in writing"
  },
  {
    "id": "m5_16",
    "label": "Execute inspection resolution agreement / amendment",
    "section": "M5 · Inspections — Inspection Negotiation",
    "order": 5016,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "All parties sign; specify exactly what seller will repair and standards"
  },
  {
    "id": "m5_17",
    "label": "If resolution fails, advise buyer on termination rights",
    "section": "M5 · Inspections — Inspection Negotiation",
    "order": 5017,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Understand contract provisions; protect earnest money; timeline compliance"
  },
  {
    "id": "m6_01",
    "label": "Confirm title company has opened title order",
    "section": "M6 · Title & Financing — Title Review",
    "order": 6001,
    "role": "TC",
    "offset_days": 3,
    "system": "command",
    "notes": "Verify receipt of contract; confirm processing has begun"
  },
  {
    "id": "m6_02",
    "label": "Review title commitment when received",
    "section": "M6 · Title & Financing — Title Review",
    "order": 6002,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Liens, encumbrances, easements, boundary issues, title exceptions"
  },
  {
    "id": "m6_03",
    "label": "Discuss any title issues with buyer",
    "section": "M6 · Title & Financing — Title Review",
    "order": 6003,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Explain implications; determine if resolvable before closing"
  },
  {
    "id": "m6_04",
    "label": "Submit title objection if needed (per contract timeline)",
    "section": "M6 · Title & Financing — Title Review",
    "order": 6004,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Formal written objection; request seller resolve before closing"
  },
  {
    "id": "m6_05",
    "label": "Review and recommend title insurance options to buyer",
    "section": "M6 · Title & Financing — Title Review",
    "order": 6005,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Owner’s policy, lender’s policy, enhanced coverage; explain benefits"
  },
  {
    "id": "m6_06",
    "label": "Confirm lender has ordered appraisal",
    "section": "M6 · Title & Financing — Appraisal",
    "order": 6006,
    "role": "TC",
    "offset_days": 7,
    "system": "command",
    "notes": "Follow up with lender; track order date and expected completion"
  },
  {
    "id": "m6_07",
    "label": "Provide comparable sales data to appraiser (if permitted)",
    "section": "M6 · Title & Financing — Appraisal",
    "order": 6007,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Share CMA and recent comps; varies by market"
  },
  {
    "id": "m6_08",
    "label": "Review appraisal results when received",
    "section": "M6 · Title & Financing — Appraisal",
    "order": 6008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Compare appraised value to purchase price; identify any issues"
  },
  {
    "id": "m6_09",
    "label": "If low appraisal, discuss options with buyer",
    "section": "M6 · Title & Financing — Appraisal",
    "order": 6009,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Renegotiate, cover gap, split, dispute/rebuttal, terminate"
  },
  {
    "id": "m6_10",
    "label": "Negotiate appraisal shortfall with listing agent (if applicable)",
    "section": "M6 · Title & Financing — Appraisal",
    "order": 6010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Present additional comps; price adjustment or gap coverage split"
  },
  {
    "id": "m6_11",
    "label": "Confirm buyer has submitted all lender-required documents",
    "section": "M6 · Title & Financing — Financing & Loan Progress",
    "order": 6011,
    "role": "TC",
    "offset_days": 7,
    "system": "command",
    "notes": "Tax returns, pay stubs, bank statements, employment verification, asset docs"
  },
  {
    "id": "m6_12",
    "label": "Monitor loan processing and underwriting progress",
    "section": "M6 · Title & Financing — Financing & Loan Progress",
    "order": 6012,
    "role": "TC",
    "offset_days": 7,
    "system": "command",
    "notes": "Weekly check-ins; track milestones"
  },
  {
    "id": "m6_13",
    "label": "Ensure buyer responds promptly to lender requests",
    "section": "M6 · Title & Financing — Financing & Loan Progress",
    "order": 6013,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Additional docs, explanations, verifications — delays here delay closing"
  },
  {
    "id": "m6_14",
    "label": "Confirm loan commitment / conditional approval",
    "section": "M6 · Title & Financing — Financing & Loan Progress",
    "order": 6014,
    "role": "TC",
    "offset_days": 21,
    "system": "command",
    "notes": "Track conditions to be met; ensure all cleared before closing"
  },
  {
    "id": "m6_15",
    "label": "Verify clear-to-close from lender",
    "section": "M6 · Title & Financing — Financing & Loan Progress",
    "order": 6015,
    "role": "TC",
    "offset_days": 25,
    "system": "command",
    "notes": "Final loan approval with no remaining conditions"
  },
  {
    "id": "m6_16",
    "label": "Order homeowner’s insurance and provide to lender",
    "section": "M6 · Title & Financing — Financing & Loan Progress",
    "order": 6016,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Required before closing; buyer selects carrier and coverage"
  },
  {
    "id": "m6_17",
    "label": "Receive HOA documents from seller/listing agent",
    "section": "M6 · Title & Financing — HOA Review",
    "order": 6017,
    "role": "TC",
    "offset_days": 7,
    "system": "command",
    "notes": "Bylaws, financials, meeting minutes, reserve study, rules, pending assessments"
  },
  {
    "id": "m6_18",
    "label": "Review HOA documents with buyer",
    "section": "M6 · Title & Financing — HOA Review",
    "order": 6018,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Fees, restrictions, financial health, pending litigation, rental rules, pet policies"
  },
  {
    "id": "m6_19",
    "label": "Submit HOA objection if needed (per contract timeline)",
    "section": "M6 · Title & Financing — HOA Review",
    "order": 6019,
    "role": "Agent",
    "offset_days": 14,
    "system": "command",
    "notes": "If documents reveal unacceptable conditions; maintain termination rights"
  },
  {
    "id": "m7_01",
    "label": "Create comprehensive contingency deadline tracker",
    "section": "M7 · Contingency Management — Contingency Tracking",
    "order": 7001,
    "role": "TC",
    "offset_days": 0,
    "system": "command",
    "notes": "All contingency start/end dates"
  },
  {
    "id": "m7_02",
    "label": "Send weekly deadline reminder to buyer and agent",
    "section": "M7 · Contingency Management — Contingency Tracking",
    "order": 7002,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Upcoming deadlines, what action is needed, who is responsible"
  },
  {
    "id": "m7_03",
    "label": "Monitor inspection contingency deadline",
    "section": "M7 · Contingency Management — Contingency Tracking",
    "order": 7003,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Ensure objection filed or contingency waived/removed"
  },
  {
    "id": "m7_04",
    "label": "Monitor appraisal contingency deadline",
    "section": "M7 · Contingency Management — Contingency Tracking",
    "order": 7004,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Track order, completion, resolution timeline"
  },
  {
    "id": "m7_05",
    "label": "Monitor financing contingency deadline",
    "section": "M7 · Contingency Management — Contingency Tracking",
    "order": 7005,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Loan approval status; escalate if lender timeline threatens"
  },
  {
    "id": "m7_06",
    "label": "Monitor title contingency deadline",
    "section": "M7 · Contingency Management — Contingency Tracking",
    "order": 7006,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Title commitment received, reviewed, objections filed within timeline"
  },
  {
    "id": "m7_07",
    "label": "Monitor HOA document review contingency",
    "section": "M7 · Contingency Management — Contingency Tracking",
    "order": 7007,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Documents received, review period, objection deadline"
  },
  {
    "id": "m7_08",
    "label": "Monitor sale of buyer’s property contingency (if applicable)",
    "section": "M7 · Contingency Management — Contingency Tracking",
    "order": 7008,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Track listing status, offers, closing timeline; kick-out clause"
  },
  {
    "id": "m7_09",
    "label": "Obtain and file written contingency removal/waiver for each",
    "section": "M7 · Contingency Management — Contingency Removal & Documentation",
    "order": 7009,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Written documentation for each resolved contingency"
  },
  {
    "id": "m7_10",
    "label": "Advise buyer on implications of removing contingencies",
    "section": "M7 · Contingency Management — Contingency Removal & Documentation",
    "order": 7010,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Once removed, buyer may lose rights to terminate and recover earnest money"
  },
  {
    "id": "m7_11",
    "label": "Confirm all contingencies resolved or removed before closing",
    "section": "M7 · Contingency Management — Contingency Removal & Documentation",
    "order": 7011,
    "role": "TC",
    "offset_days": 28,
    "system": "command",
    "notes": "Audit file for any open contingencies"
  },
  {
    "id": "m7_12",
    "label": "Process any contract amendments or extensions",
    "section": "M7 · Contingency Management — Amendment & Extension Management",
    "order": 7012,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Price changes, closing date changes, contingency extensions — all in writing"
  },
  {
    "id": "m7_13",
    "label": "Track all amendments and maintain amendment log",
    "section": "M7 · Contingency Management — Amendment & Extension Management",
    "order": 7013,
    "role": "TC",
    "offset_days": null,
    "system": "command",
    "notes": "Clear record of original vs. amended terms"
  },
  {
    "id": "m8_01",
    "label": "Confirm closing date, time, and location with all parties",
    "section": "M8 · Pre-Closing — Closing Coordination",
    "order": 8001,
    "role": "TC",
    "offset_days": 23,
    "system": "command",
    "notes": "Title, buyer, seller agent, lender; send calendar invites"
  },
  {
    "id": "m8_02",
    "label": "Confirm lender has issued clear-to-close",
    "section": "M8 · Pre-Closing — Closing Coordination",
    "order": 8002,
    "role": "TC",
    "offset_days": 25,
    "system": "command",
    "notes": "Follow up directly; escalate any delays immediately"
  },
  {
    "id": "m8_03",
    "label": "Review preliminary closing disclosure / settlement statement",
    "section": "M8 · Pre-Closing — Closing Coordination",
    "order": 8003,
    "role": "TC",
    "offset_days": 27,
    "system": "command",
    "notes": "Verify: price, loan amount, credits, prorations, closing costs, agent comp"
  },
  {
    "id": "m8_04",
    "label": "Review closing disclosure with buyer and explain all line items",
    "section": "M8 · Pre-Closing — Closing Coordination",
    "order": 8004,
    "role": "Agent",
    "offset_days": 28,
    "system": "command",
    "notes": "Walk through every charge and credit; compare to original estimate"
  },
  {
    "id": "m8_05",
    "label": "Confirm seller has completed all agreed repairs",
    "section": "M8 · Pre-Closing — Closing Coordination",
    "order": 8005,
    "role": "TC",
    "offset_days": 28,
    "system": "command",
    "notes": "Request receipts, photos, warranties from listing agent"
  },
  {
    "id": "m8_06",
    "label": "Verify all required documents submitted to title company",
    "section": "M8 · Pre-Closing — Closing Coordination",
    "order": 8006,
    "role": "TC",
    "offset_days": 27,
    "system": "command",
    "notes": "ID, lender docs, HOA transfer forms, insurance binder, POA if needed"
  },
  {
    "id": "m8_07",
    "label": "🚨 Verify wire instructions BY PHONE (wire fraud prevention)",
    "section": "M8 · Pre-Closing — Buyer Preparation",
    "order": 8007,
    "role": "TC",
    "offset_days": 28,
    "system": "command",
    "notes": "Wire fraud prevention — call title company at known number; never trust emailed instructions"
  },
  {
    "id": "m8_08",
    "label": "Confirm buyer has wired funds / cashier’s check for closing",
    "section": "M8 · Pre-Closing — Buyer Preparation",
    "order": 8008,
    "role": "TC",
    "offset_days": 28,
    "system": "command",
    "notes": "Verify exact amount from closing disclosure"
  },
  {
    "id": "m8_09",
    "label": "Remind buyer of what to bring to closing",
    "section": "M8 · Pre-Closing — Buyer Preparation",
    "order": 8009,
    "role": "Agent",
    "offset_days": 28,
    "system": "command",
    "notes": "Government ID, certified funds, proof of insurance, requested documents"
  },
  {
    "id": "m8_10",
    "label": "Schedule utility transfers for closing date",
    "section": "M8 · Pre-Closing — Buyer Preparation",
    "order": 8010,
    "role": "Agent",
    "offset_days": 23,
    "system": "command",
    "notes": "Electric, gas, water, internet, trash; effective closing day"
  },
  {
    "id": "m8_11",
    "label": "Provide buyer with a moving preparation checklist",
    "section": "M8 · Pre-Closing — Buyer Preparation",
    "order": 8011,
    "role": "Agent",
    "offset_days": 16,
    "system": "command",
    "notes": "Change of address, school enrollment, mail forwarding, DMV, voter registration"
  },
  {
    "id": "m8_12",
    "label": "Schedule final walkthrough (24–48 hours before closing)",
    "section": "M8 · Pre-Closing — Final Walkthrough",
    "order": 8012,
    "role": "TC",
    "offset_days": 28,
    "system": "command",
    "notes": "Coordinate with listing agent; ensure property accessible"
  },
  {
    "id": "m8_13",
    "label": "Conduct final walkthrough with buyer",
    "section": "M8 · Pre-Closing — Final Walkthrough",
    "order": 8013,
    "role": "Agent",
    "offset_days": 29,
    "system": "command",
    "notes": "Verify: repairs completed, property condition, all inclusions, no new damage"
  },
  {
    "id": "m8_14",
    "label": "Complete walkthrough checklist",
    "section": "M8 · Pre-Closing — Final Walkthrough",
    "order": 8014,
    "role": "Agent",
    "offset_days": 29,
    "system": "command",
    "notes": "Systems functional, fixtures intact, appliances working, clean, no unexpected changes"
  },
  {
    "id": "m8_15",
    "label": "Address any walkthrough issues before closing",
    "section": "M8 · Pre-Closing — Final Walkthrough",
    "order": 8015,
    "role": "Agent",
    "offset_days": 29,
    "system": "command",
    "notes": "Document issues; negotiate with listing agent; decide if closing should proceed"
  },
  {
    "id": "m9_01",
    "label": "Attend closing with buyer (in person or coordinate remote signing)",
    "section": "M9 · Closing Day — Closing Execution",
    "order": 9001,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Be present to support; explain documents; handle last-minute issues"
  },
  {
    "id": "m9_02",
    "label": "Review all closing documents with buyer before signing",
    "section": "M9 · Closing Day — Closing Execution",
    "order": 9002,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Deed, mortgage, note, settlement statement, title insurance"
  },
  {
    "id": "m9_03",
    "label": "Verify closing disclosure matches agreed terms",
    "section": "M9 · Closing Day — Closing Execution",
    "order": 9003,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Compare to contract, amendments, and pre-closing CD; flag discrepancies"
  },
  {
    "id": "m9_04",
    "label": "Ensure all signatures obtained and documents executed",
    "section": "M9 · Closing Day — Closing Execution",
    "order": 9004,
    "role": "TC",
    "offset_days": 30,
    "system": "command",
    "notes": "Verify nothing missed; title confirms complete package"
  },
  {
    "id": "m9_05",
    "label": "Confirm funding and recording",
    "section": "M9 · Closing Day — Closing Execution",
    "order": 9005,
    "role": "TC",
    "offset_days": 30,
    "system": "command",
    "notes": "Lender funds; title confirms recording with county; ownership transfers"
  },
  {
    "id": "m9_06",
    "label": "Receive keys, remotes, codes, and access items",
    "section": "M9 · Closing Day — Closing Execution",
    "order": 9006,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Per contract terms; inventory all items received"
  },
  {
    "id": "m9_07",
    "label": "Verify commission disbursement",
    "section": "M9 · Closing Day — Closing Execution",
    "order": 9007,
    "role": "TC",
    "offset_days": 30,
    "system": "command",
    "notes": "Confirm correct amounts disbursed per agreement; document in file"
  },
  {
    "id": "m9_08",
    "label": "Celebrate with buyer!",
    "section": "M9 · Closing Day — Closing Execution",
    "order": 9008,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Photo at closing table or with keys; mark the moment"
  },
  {
    "id": "m10_01",
    "label": "Complete final transaction file audit",
    "section": "M10 · Post-Closing — Post-Closing Administration",
    "order": 10001,
    "role": "TC",
    "offset_days": 33,
    "system": "command",
    "notes": "All documents uploaded, organized, compliant with brokerage requirements"
  },
  {
    "id": "m10_02",
    "label": "Update CRM with transaction details",
    "section": "M10 · Post-Closing — Post-Closing Administration",
    "order": 10002,
    "role": "TC",
    "offset_days": 33,
    "system": "command",
    "notes": "Purchase price, close date, address, commission, referral sources"
  },
  {
    "id": "m10_03",
    "label": "Confirm buyer received all closing documents and copies",
    "section": "M10 · Post-Closing — Post-Closing Administration",
    "order": 10003,
    "role": "TC",
    "offset_days": 37,
    "system": "command",
    "notes": "CD, deed copy, title insurance policy, home warranty info"
  },
  {
    "id": "m10_04",
    "label": "Verify commission received and properly allocated",
    "section": "M10 · Post-Closing — Post-Closing Administration",
    "order": 10004,
    "role": "TC",
    "offset_days": 37,
    "system": "command",
    "notes": "Confirm brokerage received and disbursed per splits/agreements"
  },
  {
    "id": "m10_05",
    "label": "Send closing gift and handwritten thank-you note",
    "section": "M10 · Post-Closing — Client Care & Follow-Up",
    "order": 10005,
    "role": "Agent",
    "offset_days": 37,
    "system": "command",
    "notes": "Personalized, memorable; reflects relationship — not generic"
  },
  {
    "id": "m10_06",
    "label": "Provide post-purchase resource package",
    "section": "M10 · Post-Closing — Client Care & Follow-Up",
    "order": 10006,
    "role": "Agent",
    "offset_days": 37,
    "system": "command",
    "notes": "Local experience guide, home maintenance calendar, contractors, community info"
  },
  {
    "id": "m10_07",
    "label": "Introduce buyer to Local Experience Curator resources",
    "section": "M10 · Post-Closing — Client Care & Follow-Up",
    "order": 10007,
    "role": "Agent",
    "offset_days": 44,
    "system": "command",
    "notes": "Restaurants, services, parks, community events"
  },
  {
    "id": "m10_08",
    "label": "Connect buyer with Home Customization Advisor (if requested)",
    "section": "M10 · Post-Closing — Client Care & Follow-Up",
    "order": 10008,
    "role": "Agent",
    "offset_days": null,
    "system": "command",
    "notes": "Design and renovation resources for personalizing"
  },
  {
    "id": "m10_09",
    "label": "Share property damage concierge service info (Matterport 3D)",
    "section": "M10 · Post-Closing — Client Care & Follow-Up",
    "order": 10009,
    "role": "Agent",
    "offset_days": 30,
    "system": "command",
    "notes": "Pre-move-in 3D documentation for insurance purposes"
  },
  {
    "id": "m10_10",
    "label": "Request testimonial / online review",
    "section": "M10 · Post-Closing — Reviews, Referrals & Long-Term Retention",
    "order": 10010,
    "role": "Agent",
    "offset_days": 44,
    "system": "command",
    "notes": "Google, Zillow, Realtor.com; provide direct links; make it easy"
  },
  {
    "id": "m10_11",
    "label": "Request referrals",
    "section": "M10 · Post-Closing — Reviews, Referrals & Long-Term Retention",
    "order": 10011,
    "role": "Agent",
    "offset_days": 58,
    "system": "command",
    "notes": "Ask specifically: family, friends, colleagues who may need RE help"
  },
  {
    "id": "m10_12",
    "label": "Add buyer to post-close nurture campaign",
    "section": "M10 · Post-Closing — Reviews, Referrals & Long-Term Retention",
    "order": 10012,
    "role": "Agent",
    "offset_days": 60,
    "system": "resend",
    "notes": "Home anniversary, value updates, seasonal maintenance, holiday outreach"
  },
  {
    "id": "m10_13",
    "label": "Send \"Happy Home Anniversary\" on annual close date",
    "section": "M10 · Post-Closing — Reviews, Referrals & Long-Term Retention",
    "order": 10013,
    "role": "Agent",
    "offset_days": 365,
    "system": "command",
    "notes": "Automate in CRM; personal note or small gift each year"
  },
  {
    "id": "m10_14",
    "label": "Conduct post-transaction client satisfaction survey",
    "section": "M10 · Post-Closing — Reviews, Referrals & Long-Term Retention",
    "order": 10014,
    "role": "Agent",
    "offset_days": 58,
    "system": "command",
    "notes": "Gather feedback; identify what went well and areas for improvement"
  },
  {
    "id": "m10_15",
    "label": "Provide ongoing home value updates (quarterly or annual)",
    "section": "M10 · Post-Closing — Reviews, Referrals & Long-Term Retention",
    "order": 10015,
    "role": "Agent",
    "offset_days": 90,
    "system": "command",
    "notes": "Automated or personal CMA updates; keeps you top-of-mind"
  },
  {
    "id": "m10_16",
    "label": "Offer home maintenance management check-in (annual)",
    "section": "M10 · Post-Closing — Reviews, Referrals & Long-Term Retention",
    "order": 10016,
    "role": "Agent",
    "offset_days": 365,
    "system": "command",
    "notes": "Touch base on maintenance needs; provide seasonal tips"
  }
]'::jsonb,
  2
);

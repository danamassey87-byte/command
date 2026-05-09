/* ============================================================
   DOCS · KPI definitions + Buyer lifecycle
   Written-doc style screens — Command surfaces these in-app
   ============================================================ */

function DocKPI_Overview() {
  return <Desktop active="Docs · KPI" url="command.app/docs/kpis">
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div className="hand-alt tiny">REFERENCE · KPI DEFINITIONS</div>
      <div className="serif" style={{ fontSize: 36, lineHeight: 1.1, marginTop: 6 }}>The 12 KPIs Command tracks</div>
      <div className="muted" style={{ marginTop: 8, fontSize: 15 }}>Every number on your scoreboard has a precise definition. Here's the full list — what each means, how it's computed, and when it lies.</div>

      <Hr />

      <div className="hand-alt" style={{ marginTop: 14 }}>Top-line</div>
      <Box style={{ marginTop: 8, padding: 14 }}>
        {[
          ['GCI',               'Gross Commission Income', 'sum of your side of every closed commission this period · cash basis · excludes referral splits you pay out'],
          ['Net income',         '—',                      'GCI − brokerage split − franchise fees − marketing − tools · what you actually take home'],
          ['Units closed',       '—',                      'count of sides closed · 1 for buyer · 1 for listing · dual rep = 2'],
          ['Avg sale price',     '—',                      'sum of sale prices / units · separate calcs for buyer side vs. listing side'],
        ].map((r, i) => (
          <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div className="row between"><b>{r[0]}</b><span className="tiny mono muted">{r[1]}</span></div>
            <div className="tiny muted" style={{ marginTop: 4 }}>{r[2]}</div>
          </div>
        ))}
      </Box>

      <div className="hand-alt" style={{ marginTop: 18 }}>Pipeline health</div>
      <Box style={{ marginTop: 8, padding: 14 }}>
        {[
          ['Active leads',      'contacts tagged cold/warm/hot with last touch ≤ 90 days · excludes closed-lost + cold-storage'],
          ['Pipeline value',    'sum of (list price × probability) for every open opportunity · probability by stage'],
          ['Under contract $',  'sum of list prices for everything in UC status · your earned-but-not-paid'],
          ['Conversion rate',    'closed / (closed + lost) over last 12 mo · separate for buyer and listing sides'],
        ].map((r, i) => (
          <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <b>{r[0]}</b>
            <div className="tiny muted" style={{ marginTop: 4 }}>{r[1]}</div>
          </div>
        ))}
      </Box>

      <div className="hand-alt" style={{ marginTop: 18 }}>Activity + efficiency</div>
      <Box style={{ marginTop: 8, padding: 14 }}>
        {[
          ['Conversations this week', 'distinct contacts you had ≥1 two-way interaction with · call + email + text + in-person'],
          ['Listing appts booked',    'count of appts set · whether or not you win them'],
          ['Listing win rate',        'signed listings / listing appts held · rolling 90 days'],
          ['Days on market (avg)',    'your listings · list date to contract date · median + mean'],
          ['Price-to-list ratio',     'sold price / original list · >100% = over ask'],
          ['Cost per closing',        'all tool + marketing + print spend for the period / units closed'],
        ].map((r, i) => (
          <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <b>{r[0]}</b>
            <div className="tiny muted" style={{ marginTop: 4 }}>{r[1]}</div>
          </div>
        ))}
      </Box>

      <Box dashed style={{ marginTop: 18, padding: 14 }}>
        <div className="hand-alt tiny">WHEN THESE LIE</div>
        <Hr />
        <div className="tiny" style={{ marginTop: 8 }}>
          <b>Small sample</b> · conversion rate on &lt;10 appts is noise. Command greys it out until 10.<br/>
          <b>Stale tags</b> · "active leads" inflates if you haven't cold-stored old contacts. Nudge at 180d since touch.<br/>
          <b>Dual rep distortion</b> · 1 deal = 2 units. Command can show both views (sides and transactions).<br/>
          <b>Yearly vs rolling</b> · Jan–Mar is always bad. Use rolling 12 for trend, calendar for goal tracking.
        </div>
      </Box>
    </div>
  </Desktop>;
}

function DocKPI_Targets() {
  return <Desktop active="Docs · KPI" url="command.app/docs/kpis/targets">
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div className="hand-alt tiny">YOUR 2026 TARGETS</div>
      <div className="serif" style={{ fontSize: 32, lineHeight: 1.1, marginTop: 6 }}>Goals, pace, and what each means</div>

      <Box style={{ marginTop: 14, padding: 0 }}>
        <table className="wf-table">
          <thead><tr><th>KPI</th><th>2025 actual</th><th>2026 goal</th><th>YTD pace</th><th>Δ</th></tr></thead>
          <tbody>
            {[
              ['GCI',                  '$284k',   '$360k',   '$98k',    '+9% vs plan',  'sage'],
              ['Units closed',          '18',     '22',      '6',        'on pace',       'sage'],
              ['Avg sale price',        '$678k',  '$725k',   '$691k',    'under',         'tan'],
              ['Listing : buyer ratio', '55:45',  '65:35',   '58:42',    'under',         'tan'],
              ['Listing win rate',      '52%',    '60%',     '58%',      'close',         'sage'],
              ['Days on market',        '22 avg', '≤18',     '16',       'ahead',         'sage'],
              ['Past-client repeat',    '3/yr',   '6/yr',    '1 ytd',    'behind',        'rose'],
              ['Conversations/wk',      '18 avg', '25',      '22',       'close',         'tan'],
              ['Cost per closing',      '$892',   '≤$700',   '$612',     'ahead',         'sage'],
            ].map((r,i) => (
              <tr key={i}>
                <td>{r[0]}</td>
                <td className="tiny mono">{r[1]}</td>
                <td className="tiny mono"><b>{r[2]}</b></td>
                <td className="tiny mono">{r[3]}</td>
                <td><Chip sm filled style={{ background: `var(--accent-${r[5]})`, color: 'var(--paper)' }}>{r[4]}</Chip></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>

      <div className="hand-alt" style={{ marginTop: 18 }}>Working-backwards math</div>
      <Box style={{ marginTop: 8, padding: 14 }}>
        <div className="tiny">
          <b>$360k GCI @ 2.5% avg commission =</b> $14.4M sales volume<br/>
          <b>÷ $725k avg price =</b> 20 units · target 22 for buffer<br/>
          <b>22 units @ 58% win rate =</b> 38 appts held · 44 booked (book-to-hold 87%)<br/>
          <b>44 appts @ 12% appt-from-lead rate =</b> 367 warm-or-hotter leads needed across the year<br/>
          <b>367 / 52 weeks =</b> ~7 new qualified leads/wk to maintain pipeline<br/>
        </div>
        <Hr />
        <div className="tiny muted">Command derives the weekly targets automatically from your annual goal — edit any assumption, the chain recomputes.</div>
      </Box>
    </div>
  </Desktop>;
}

function DocBuyer1_Stages() {
  return <Desktop active="Docs · Buyer lifecycle" url="command.app/docs/buyer-lifecycle">
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="hand-alt tiny">REFERENCE · BUYER LIFECYCLE</div>
      <div className="serif" style={{ fontSize: 36, lineHeight: 1.1, marginTop: 6 }}>From first tap to 12-month check-in</div>
      <div className="muted" style={{ marginTop: 8 }}>Every stage a buyer passes through, the signals that move them forward, and what Command does at each.</div>

      <Hr />

      {[
        {
          stage: '01 · Inquiry',
          dur: '0–24 hrs',
          signal: 'sign-in form · text reply to a listing · IG DM · website chat',
          me: 'nothing — Command responds in under 2 min with a human-voice reply',
          ai: 'detects intent (buying/browsing/neighbor) · asks 3 qualifying Qs · books a call if ready',
          exit: 'qualified (warm tag + call booked) · browsing (nurture list) · wrong-fit (archive)',
        },
        {
          stage: '02 · Discovery call',
          dur: '15–30 min',
          signal: 'scheduled call · 1st real conversation',
          me: 'I run it · listen · ask about timing, motivation, budget anchor, must-haves',
          ai: 'records + transcribes · pre-reads their Lofty history · drafts follow-up email while call ends',
          exit: '→ pre-approved intro (if no lender) · → buyer consult (if ready) · → nurture (if 6+ mo out)',
        },
        {
          stage: '03 · Pre-approval setup',
          dur: '3–7 days',
          signal: 'I refer to lender · they apply · lender issues letter',
          me: 'warm intro email (3-way) · follow up if stalled',
          ai: 'monitors for the letter · texts them reminders · pings lender at day 3 and 5 if silent',
          exit: '→ buyer consult (pre-approved) · → nurture (not ready) · → referred-out (cash/FHA issues)',
        },
        {
          stage: '04 · Buyer consultation',
          dur: '60–90 min',
          signal: 'in-person or Zoom · first serious meeting',
          me: 'run full consult · present process · sign buyer-broker agreement · lock must-haves',
          ai: 'generates personalized consult deck from their discovery-call notes · handles DocuSign for BBA · builds their initial search',
          exit: '→ active showing (search + schedule) · signed BBA',
        },
        {
          stage: '05 · Active showings',
          dur: '2–12 weeks',
          signal: 'saved searches running · showings scheduled · feedback gathering',
          me: 'showings + the listening that matters: are they narrowing or scattering?',
          ai: 'runs searches · drafts showing routes · after each showing captures feedback · weekly "narrowing report" · flags when pattern = ready-to-offer',
          exit: '→ offer prep · → pause (needs break) · → reset search',
        },
        {
          stage: '06 · Offer prep',
          dur: '1–3 days',
          signal: 'they say "let\'s go on that one"',
          me: 'strategy call · offer terms · escalation cap · negotiate',
          ai: 'comps + seller motivation research · drafts offer terms · writes the buyer-love-letter (if requested) · DocuSign prep',
          exit: '→ under contract · → countered · → lost',
        },
        {
          stage: '07 · Under contract',
          dur: '21–45 days',
          signal: 'signed · earnest money · clock starts',
          me: 'quarterback the deal · the ugly middle',
          ai: 'reads contract · extracts every date · tracks all 11 deadlines · auto-drafts "48h heads up" messages · coordinates inspector/appraiser/lender/title',
          exit: '→ closed · → re-negotiated (inspection issues) · → terminated',
        },
        {
          stage: '08 · Closing week',
          dur: '5 days',
          signal: 'CD received · final walkthrough · funding',
          me: 'reassure · make the moment',
          ai: 'runs through 14-item closing checklist · utility transfer reminders · closing-gift orchestration',
          exit: '→ closed — keys delivered',
        },
        {
          stage: '09 · 30-day post-close',
          dur: '30 days',
          signal: 'nothing — they\'re moved in',
          me: 'check in at 7d + 30d · real conversation',
          ai: 'reminds me · drafts the texts · "moving-in kit" digital handoff (trash day, local contractors, school info)',
          exit: '→ 90d follow-up',
        },
        {
          stage: '10 · Ongoing past-client',
          dur: 'forever',
          signal: 'quarterly + life events',
          me: 'pop-bys · their birthday · anniversary of close',
          ai: 'reminds me · surfaces public-record events (refi, renovation, new listings nearby)',
          exit: '→ repeat client · → referral source · → quiet',
        },
      ].map((s, i) => (
        <Box key={i} style={{ marginTop: 10 }}>
          <div className="row between center">
            <div className="hand-alt">{s.stage}</div>
            <Chip sm>{s.dur}</Chip>
          </div>
          <Hr />
          <div className="tiny" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
            <span className="muted">Signal</span>          <span>{s.signal}</span>
            <span className="muted">You do</span>           <span>{s.me}</span>
            <span className="muted">Command does</span>     <span>{s.ai}</span>
            <span className="muted">Exit</span>             <span>{s.exit}</span>
          </div>
        </Box>
      ))}
    </div>
  </Desktop>;
}

function DocBuyer2_Metrics() {
  return <Desktop active="Docs · Buyer lifecycle" url="command.app/docs/buyer-lifecycle/metrics">
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="hand-alt tiny">BUYER LIFECYCLE · METRICS + DROP-OFF</div>
      <div className="serif" style={{ fontSize: 32, lineHeight: 1.1, marginTop: 6 }}>Where buyers fall off · what to do</div>

      <Box style={{ marginTop: 14, padding: 14 }}>
        <div className="hand-alt tiny">YOUR FUNNEL · TTM</div>
        <Hr />
        {[
          ['01 · Inquiries',          312, '100%',  'baseline'],
          ['02 · Discovery call',      94,  '30%',   'expected: 25–35%'],
          ['03 · Pre-approved',        58,  '62%',   'expected: 55–70%'],
          ['04 · Buyer consult held',  41,  '71%',   'expected: 75–85% — a touch low'],
          ['05 · Active showing',      38,  '93%',   'good'],
          ['06 · Offer made',          22,  '58%',   'expected: 55–65%'],
          ['07 · Under contract',      14,  '64%',   'expected: 60–70%'],
          ['08 · Closed',              13,  '93%',   'excellent'],
          ['09 · 30d follow-up',       11,  '85%',   'expected: 95% — improve'],
          ['10 · Repeat/referral',     4,   '36%',   'expected: 40–50% — improve'],
        ].map((r, i) => (
          <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div>{r[0]}</div>
            <div className="row" style={{ gap: 14 }}>
              <span className="mono tiny">{r[1]}</span>
              <span className="mono tiny" style={{ width: 50, textAlign: 'right' }}>{r[2]}</span>
              <span className="tiny muted" style={{ width: 200 }}>{r[3]}</span>
            </div>
          </div>
        ))}
      </Box>

      <div className="hand-alt" style={{ marginTop: 18 }}>Top drop-off points for you</div>

      <Box style={{ marginTop: 8, padding: 14, background: 'var(--accent-rose-2)', borderLeft: '4px solid var(--accent-rose)' }}>
        <div className="hand-alt">🔴 Stage 3 → 4 (pre-approved → buyer consult)</div>
        <div className="tiny" style={{ marginTop: 6 }}><b>17 people</b> got pre-approved but never sat for a consult. That's $4.5M of potential sales walking out.</div>
        <div className="tiny" style={{ marginTop: 8 }}><b>Likely causes:</b> too long between pre-approval and consult · lender letters without immediate re-engagement · nobody owns the handoff.</div>
        <div className="tiny" style={{ marginTop: 8 }}><b>Command suggests:</b> auto-trigger consult booking the day letter arrives · offer 3 specific time slots · follow up at 24h and 72h.</div>
      </Box>

      <Box style={{ marginTop: 10, padding: 14, background: 'var(--accent-tan-2)', borderLeft: '4px solid var(--accent-tan)' }}>
        <div className="hand-alt">🟡 Stage 9 (30-day follow-up)</div>
        <div className="tiny" style={{ marginTop: 6 }}>You're doing 85% — should be 95%+. These are your biggest future referral source.</div>
        <div className="tiny" style={{ marginTop: 8 }}><b>Command suggests:</b> auto-draft + auto-send the 30d follow-up unless you flag it for personal handling.</div>
      </Box>

      <Box style={{ marginTop: 10, padding: 14, background: 'var(--accent-tan-2)', borderLeft: '4px solid var(--accent-tan)' }}>
        <div className="hand-alt">🟡 Stage 10 (repeat + referral)</div>
        <div className="tiny" style={{ marginTop: 6 }}>36% is below your target of 40–50%. Past clients are the highest-ROI source.</div>
        <div className="tiny" style={{ marginTop: 8 }}><b>Command suggests:</b> 2-per-quarter pop-by cadence · anniversary-of-close content · referral-ask scripts at 90d, 180d, 365d.</div>
      </Box>

      <Box dashed style={{ marginTop: 18, padding: 14 }}>
        <div className="hand-alt">How long each stage should take · median</div>
        <Hr />
        <div className="tiny" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <span>Inquiry → discovery call</span><span className="mono">3 days</span>
          <span>Discovery → pre-approved</span><span className="mono">7 days</span>
          <span>Pre-approved → consult</span><span className="mono">5 days</span>
          <span>Consult → first showing</span><span className="mono">7 days</span>
          <span>First showing → offer</span><span className="mono">28 days</span>
          <span>Offer → under contract</span><span className="mono">3 days</span>
          <span>UC → close</span><span className="mono">32 days</span>
          <span>Close → 30d f/u done</span><span className="mono">30 days</span>
          <span className="tiny muted" style={{ gridColumn: 'span 2', marginTop: 8 }}>Total median · inquiry to close: ~115 days. You're running 98 days (faster than benchmark).</span>
        </div>
      </Box>
    </div>
  </Desktop>;
}

function DocBuyer3_Scripts() {
  return <Desktop active="Docs · Buyer lifecycle" url="command.app/docs/buyer-lifecycle/scripts">
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <div className="hand-alt tiny">BUYER LIFECYCLE · SCRIPTS + TEMPLATES</div>
      <div className="serif" style={{ fontSize: 32, lineHeight: 1.1, marginTop: 6 }}>What Command writes at each stage</div>

      {[
        {
          st: 'Stage 01 · First reply (AI, under 2 min)',
          ex: `"Hey Jamie — Dana here. Yeah, 22 Hawthorn's a good one — been on market 4 days, priced under comps. Are you actively looking or just browsing? Easy either way. If looking, I've got 3 similar in that pocket. Happy to walk you through them."`,
          notes: 'Casual · asks 1 qualifying Q · offers value without pressure.',
        },
        {
          st: 'Stage 02 · Post-discovery-call follow-up',
          ex: `"Great talking with you. Here's what I heard: you're 3–5 months out, ~$650k, Round Rock or south Austin, need 3 br minimum, priority is a yard for the dog. I'll start a saved search now — you'll see new ones as they drop. Next step: let's get you pre-approved so when the right one comes, we can move. Tom Lin at Benchmark (below) is the best in town — I'll intro you tomorrow."`,
          notes: 'Summarizes · sets next step · introduces lender · no fluff.',
        },
        {
          st: 'Stage 04 · Consult prep email',
          ex: `"Before Thursday: 3 things to send over — bank statements, 2yr W2s, and any pay stubs. Tom will need these for underwriting. Also: I'll bring a packet Thursday — 8–10 homes that hit your criteria, a breakdown of closing costs, and the buyer-broker agreement (standard, nothing scary). Looking forward."`,
          notes: 'Specific · logistics-forward · sets expectation.',
        },
        {
          st: 'Stage 05 · Post-showing feedback text',
          ex: `"Debrief on Maple: you liked the light + kitchen, hesitant on the busy street. Writing that down — helps me narrow. Sat I've got 2 lined up that are quieter streets, similar kitchens. 10 and 11:30?"`,
          notes: 'Shows listening · proposes next · offers specifics.',
        },
        {
          st: 'Stage 06 · Offer strategy call recap',
          ex: `"Recap: we're going in at $624k, $5k escalation cap to $649k in $2.5k increments, 20% down, 21-day close, inspection contingency kept, appraisal waived up to $10k. I'll send for DocuSign tonight — sign before 8am so we submit first thing."`,
          notes: 'Every term explicit · clear action + deadline.',
        },
        {
          st: 'Stage 07 · "48h heads up" during UC',
          ex: `"Appraisal is Friday. Nothing to do on your end — appraiser has lockbox code. I'll send you the result Mon AM. If it comes in low, we'll talk options that afternoon — don't stress yet."`,
          notes: 'Proactive · reduces anxiety · signals what\'s next.',
        },
        {
          st: 'Stage 09 · 30-day check-in',
          ex: `"Been thinking about you — how's the house feeling 30 days in? Any surprises (good or annoying)? Also — don't forget the 1yr home warranty is active, and the HVAC tune-up I mentioned is best done before summer. Coffee sometime?"`,
          notes: 'Genuine · not transactional · offers specific value + connection.',
        },
      ].map((s, i) => (
        <Box key={i} style={{ marginTop: 14 }}>
          <div className="hand-alt">{s.st}</div>
          <Hr />
          <div style={{ padding: 12, background: 'var(--accent-sage-2)', fontSize: 13, lineHeight: 1.5, marginTop: 8 }}>
            {s.ex}
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>{s.notes}</div>
        </Box>
      ))}

      <Box dashed style={{ marginTop: 18, padding: 12 }}>
        <div className="hand-alt tiny">EVERY SCRIPT IS EDITABLE</div>
        <div className="tiny" style={{ marginTop: 6 }}>Command starts with these as defaults. First 10 times you edit a draft, it notes your changes and tunes the tone. Over time the drafts converge on your voice. You approve every send.</div>
      </Box>
    </div>
  </Desktop>;
}

window.DocScreens = [
  { id: 'd1', label: 'V1 · KPI definitions',        caption: 'The 12 KPIs Command tracks · precise definitions · when they lie.',                         Component: DocKPI_Overview },
  { id: 'd2', label: 'V2 · KPI targets + math',     caption: '2026 goals · working-backwards math from $360k GCI.',                                       Component: DocKPI_Targets },
  { id: 'd3', label: 'V3 · Buyer lifecycle · 10 stages', caption: 'Every stage: signal, what you do, what Command does, exit criteria.',                   Component: DocBuyer1_Stages },
  { id: 'd4', label: 'V4 · Buyer funnel metrics',   caption: 'TTM funnel · top drop-off points with interventions · median stage durations.',              Component: DocBuyer2_Metrics },
  { id: 'd5', label: 'V5 · Buyer lifecycle · scripts', caption: 'Real draft copy for 7 critical stages · editable, learns your voice.',                     Component: DocBuyer3_Scripts },
];

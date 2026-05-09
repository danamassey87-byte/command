/* ============================================================
   EXPIRED + FSBO DEEP-DIVE
   Targeted outreach · scripts · tracking · AI-personalized letters
   ============================================================ */

/* ====================== V1 · DAILY HIT LIST · MORNING BRIEF ====================== */
function Exp1_HitList() {
  const expireds = [
    ['47 Oakmont Dr',      'Oak Park',   '$725K',  '$689K',  '62 days',  'expired apr 21',  '2nd expire',      'Kimberly Holt · 62 · owner-occ', 'hot'],
    ['1204 Birch Ln',      'East side',  '$549K',  '$549K',  '94 days',  'expired apr 20',  '1st expire',      'Ben + Teri Ng · 48/46',          'hot'],
    ['822 Alder Ct',       'Oak Park',   '$489K',  '$472K',  '87 days',  'expired apr 19',  '1st expire',      'Estate of R. Moss · probate',    'warm'],
    ['3310 Maple Heights', 'North hills','$1.29M', '$1.18M', '147 days', 'withdrawn apr 18','3x withdrawn',   'the Okafors · 56/54',            'complex'],
    ['56 Cedar Way',       'South',     '$649K',  '$649K',  '31 days',  'expired apr 18',  '1st · quick exp', 'Lisa + Dan Park · 39/42',        'warm'],
  ];
  const fsbos = [
    ['2847 Oakhill',       'Oak Park',   '$595K',  '—',      '14 days live',  'Zillow FSBO',  'Sanchez · 44/42 · DIY reddit',  'warm'],
    ['418 Ironwood',       'East side',  '$469K',  '—',      '21 days live',  'FB Marketplace','E. Grayson · solo · tired',     'hot'],
    ['607 Willow Crest',   'Oak Park',   '$729K',  '—',      '9 days live',   'ForSaleByOwner.com', 'Young · investor',         'cold'],
  ];

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Expired + FSBO · today" url="command.app/prospect/daily" style={{ width: 960 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">✦ DAILY HIT LIST · TUE APR 22 · 8:15am</div>
          <div className="serif" style={{ fontSize: 26 }}>8 new leads need your voice today</div>
          <div className="tiny muted">5 expired/withdrawn overnight · 3 active FSBOs worth a reach · AI-ranked by fit to your style + close probability.</div>
        </div>
        <Btn primary>Start power hour →</Btn>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <Chip sm filled>expired (5)</Chip>
        <Chip sm>FSBO (3)</Chip>
        <Chip sm>withdrawn (1)</Chip>
        <Chip sm>canceled (0)</Chip>
        <Chip sm>coming soon (0)</Chip>
      </div>

      <div className="hand-alt tiny" style={{ marginTop: 14 }}>EXPIRED · WITHDRAWN</div>
      <Box style={{ marginTop: 6, padding: 0 }}>
        <div className="row" style={{ padding: '6px 10px', background: 'var(--tint)', fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
          <span style={{ width: 170 }}>ADDRESS</span>
          <span style={{ width: 80 }}>AREA</span>
          <span style={{ width: 70 }}>LIST→LAST</span>
          <span style={{ width: 70 }}>DOM</span>
          <span style={{ width: 110 }}>STATUS</span>
          <span style={{ flex: 1 }}>OWNER</span>
          <span style={{ width: 80 }}>FIT</span>
        </div>
        {expireds.map((r, i) => (
          <div key={i} className="row" style={{ padding: '8px 10px', borderTop: '1px dashed var(--faint)', fontSize: 12, alignItems: 'center' }}>
            <b style={{ width: 170 }}>{r[0]}</b>
            <span style={{ width: 80 }} className="muted tiny">{r[1]}</span>
            <span style={{ width: 70 }} className="mono tiny">{r[2]}→{r[3]}</span>
            <span style={{ width: 70 }} className="mono tiny">{r[4]}</span>
            <span style={{ width: 110 }}><Chip sm>{r[6]}</Chip></span>
            <span style={{ flex: 1, fontSize: 11 }}>{r[7]}</span>
            <Chip sm filled={r[8] === 'hot'} style={{ width: 70, background: r[8] === 'hot' ? 'var(--accent-sage)' : r[8] === 'complex' ? 'var(--accent-rose)' : undefined, color: r[8] !== 'warm' ? 'var(--paper)' : undefined, border: 'none', fontSize: 10 }}>{r[8]}</Chip>
          </div>
        ))}
      </Box>

      <div className="hand-alt tiny" style={{ marginTop: 14 }}>ACTIVE FSBO</div>
      <Box style={{ marginTop: 6, padding: 0 }}>
        {fsbos.map((r, i) => (
          <div key={i} className="row" style={{ padding: '8px 10px', borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12, alignItems: 'center' }}>
            <b style={{ width: 170 }}>{r[0]}</b>
            <span style={{ width: 80 }} className="muted tiny">{r[1]}</span>
            <span style={{ width: 70 }} className="mono tiny">{r[2]}</span>
            <span style={{ width: 70 }} className="mono tiny">{r[4]}</span>
            <span style={{ width: 110 }}><Chip sm>{r[5]}</Chip></span>
            <span style={{ flex: 1, fontSize: 11 }}>{r[6]}</span>
            <Chip sm filled={r[7] === 'hot'} style={{ width: 70, background: r[7] === 'hot' ? 'var(--accent-sage)' : r[7] === 'cold' ? 'var(--muted)' : undefined, color: 'var(--paper)', border: 'none', fontSize: 10 }}>{r[7]}</Chip>
          </div>
        ))}
      </Box>

      <Box dashed style={{ marginTop: 14, padding: 12 }}>
        <div className="hand-alt tiny">✦ WHY THESE ARE RANKED HOT</div>
        <div className="tiny" style={{ marginTop: 4 }}>
          Owner-occupants on expired/1st-expire at fair price (not overpriced by 15%+) · under 100 DOM · zip where you've closed before · not listed with a team you've never beaten.
          FSBOs ranked hot show fatigue signals: multiple price drops, weekend calls coming in, listed on 3+ sites.
        </div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Daily hit list</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Pulled overnight from MLS + FSBO aggregators · enriched w/ owner + property data · ranked by fit to your history.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">SKIP LIST</div>
        <div className="tiny" style={{ marginTop: 4 }}>DNC registry · already worked by team · relist signed (just pending MLS) · owner on your "don't contact" list.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V2 · EXPIRED PROFILE · DEEP RECON ====================== */
function Exp2_Profile() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="47 Oakmont Dr · recon" url="command.app/prospect/47-oakmont" style={{ width: 960 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">EXPIRED · APR 21 · 2nd time</div>
          <div className="serif" style={{ fontSize: 24 }}>47 Oakmont Dr · Oak Park</div>
          <div className="tiny muted">Kimberly Holt · 62 · owner-occ 23yr · widowed 2022</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>skip</Btn>
          <Btn primary>Start outreach →</Btn>
        </div>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 14, alignItems: 'flex-start' }}>
        {/* Left: listing history */}
        <Box style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">LISTING HISTORY (2 cycles)</div>
          <div style={{ marginTop: 8 }}>
            {[
              ['CYCLE 2 · expired yesterday', 'Feb 20 → Apr 21 · 62d · w/ Bev Lynn (RE/MAX)', '$725 → $699 → $689 · 2 drops · 8 showings · 0 offers'],
              ['CYCLE 1 · expired Dec 2024',   'Oct 2 → Dec 12 · 71d · w/ Doug Wyatt (Century21)', '$749 → $725 · 1 drop · 5 showings · 0 offers'],
            ].map((r, i) => (
              <Box key={i} dashed style={{ padding: 10, marginTop: i ? 8 : 0 }}>
                <b style={{ fontSize: 12 }}>{r[0]}</b>
                <div className="tiny muted" style={{ marginTop: 2 }}>{r[1]}</div>
                <div className="tiny" style={{ marginTop: 4 }}>{r[2]}</div>
              </Box>
            ))}
          </div>

          <div className="hand-alt tiny" style={{ marginTop: 14 }}>✦ AI HYPOTHESIS · why it didn't sell</div>
          <Box tan style={{ marginTop: 6, padding: 10 }}>
            <div className="tiny" style={{ lineHeight: 1.5 }}>
              <b>1. Price anchor too high.</b> $725 was 7% above comp median at list. Psychological start.<br/>
              <b>2. MLS photos dim + dated.</b> Prior agent used iPhone, no staging. 3-star quality in a 5-star comp set.<br/>
              <b>3. "Home by Holt" family legacy.</b> Listing description mentions in-laws who built the house. Emotionally charged but scares buyers.<br/>
              <b>4. Showing friction.</b> Per MLS, 24hr notice required. In a fast zip, buyers skipped.
            </div>
          </Box>
        </Box>

        {/* Right: owner intel */}
        <div style={{ width: 320 }}>
          <Box style={{ padding: 12 }}>
            <div className="hand-alt tiny">KIMBERLY · OWNER INTEL</div>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <div><b>Age</b> <span className="muted">62 · widowed 2022</span></div>
              <div><b>Owned since</b> <span className="muted">Feb 2002 · 23 yrs</span></div>
              <div><b>Mortgage</b> <span className="muted">paid off 2019 · 0 liens</span></div>
              <div><b>Prop tax</b> <span className="muted">$6.2K/yr · homestead</span></div>
              <div><b>Children</b> <span className="muted">2 adult kids · one in Denver</span></div>
              <div><b>Work</b> <span className="muted">retired nurse · 2023</span></div>
              <div><b>Social</b> <span className="muted">FB: quilting · grandkids · church</span></div>
              <div><b>Other prop</b> <span className="muted">none</span></div>
            </div>
          </Box>

          <Box tan style={{ marginTop: 10, padding: 12 }}>
            <div className="hand-alt tiny">✦ AI · WHY SHE'S SELLING</div>
            <div className="tiny" style={{ marginTop: 4 }}>Strong signals:<br/>
            • Posted "empty house feels too big now" on FB in Jan<br/>
            • Searched "patio home denver" + "senior condos"<br/>
            • Daughter in Denver had baby #2 in March<br/><br/>
            <b>Likely real reason:</b> wants to be near grandkids. Price isn't the issue — confidence and help are.</div>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">DNC CHECK</div>
            <div className="tiny" style={{ marginTop: 4 }}>✓ Not on federal DNC · ✓ Not in your "already worked" list · ✓ No prior agent conflict logged</div>
          </Box>
        </div>
      </div>
    </Desktop>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Deep recon</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Before you dial, you know who she is + why the last agent failed. That changes everything about the conversation.</p>
    </div>
  </div>;
}

/* ====================== V3 · SCRIPT + AI COACH (live call) ====================== */
function Exp3_Script() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Live call · Kimberly Holt" url="command.app/prospect/call" style={{ width: 960 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">● LIVE · KIMBERLY HOLT · 2:14 into call</div>
          <div className="serif" style={{ fontSize: 22 }}>Expired follow-up · 47 Oakmont</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Chip sm style={{ background: 'var(--accent-sage)', color: 'var(--paper)', border: 'none' }}>going well</Chip>
          <Btn sm>end call</Btn>
        </div>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 14, alignItems: 'flex-start' }}>
        {/* Live transcript */}
        <Box style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">LIVE TRANSCRIPT</div>
          <div style={{ marginTop: 8, fontSize: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div><b>YOU 0:00</b> <span className="muted">"Hi Kimberly? This is Dana Martinez — local agent in Oak Park. I'm calling because I saw your listing just expired. I won't take much of your time — are you still thinking about selling?"</span></div>
            <div><b>KIMBERLY 0:18</b> <span className="muted">"Oh hi — well, yes, but not with another agent. Three of you called already today."</span></div>
            <div><b>YOU 0:24</b> <span className="muted">"I totally understand, and I promise this is different. Before I pitch you anything — what did you think went wrong last time?"</span></div>
            <div><b>KIMBERLY 0:35</b> <span className="muted">"Honestly? I don't know. They said it would sell in a month. Two months and nothing."</span></div>
            <div><b>YOU 0:48</b> <span className="muted">"I pulled the listing. Can I share what I noticed — just as a neighbor, not a pitch?"</span></div>
            <div><b>KIMBERLY 1:02</b> <span className="muted">"Sure, go ahead."</span></div>
            <div style={{ opacity: 0.4 }}><b>YOU (now) ●</b> <i>... discussing 3 AI-spotted issues from listing ...</i></div>
          </div>
        </Box>

        {/* AI coach */}
        <div style={{ width: 320 }}>
          <Box tan style={{ padding: 12 }}>
            <div className="hand-alt tiny">✦ AI COACH · live</div>
            <Box dashed style={{ marginTop: 6, padding: 8, background: 'var(--accent-sage-2)' }}>
              <div className="tiny mono" style={{ color: 'var(--accent-sage)' }}>GOOD MOVE</div>
              <div className="tiny" style={{ marginTop: 2 }}>You asked her diagnosis first. Builds trust vs "I'd list it for less."</div>
            </Box>
            <Box dashed style={{ marginTop: 6, padding: 8 }}>
              <div className="tiny mono">NEXT · WHAT TO SAY</div>
              <div className="tiny" style={{ marginTop: 2, fontFamily: "'Caveat',cursive", fontSize: 13 }}>
                "The 3 things I'd do different are... (1) restart with fresh photos · (2) reposition as 'Oak Park classic' not a family legacy · (3) price at $675 to drive offers not avoid them."
              </div>
            </Box>
            <Box dashed style={{ marginTop: 6, padding: 8 }}>
              <div className="tiny mono">WATCH FOR</div>
              <div className="tiny" style={{ marginTop: 2 }}>She mentioned daughter in Denver in your notes. If she brings that up, <b>don't skip past it</b> — that's the real reason.</div>
            </Box>
            <Box dashed style={{ marginTop: 6, padding: 8 }}>
              <div className="tiny mono">OBJECTION PRIMER</div>
              <div className="tiny" style={{ marginTop: 2 }}>Likely: "I'll just wait til spring." → <b>"Spring will have 3x the inventory — your price competes with new listings, not this season's."</b></div>
            </Box>
          </Box>

          <Box style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">SENTIMENT</div>
            <div className="row" style={{ gap: 6, alignItems: 'center', marginTop: 6 }}>
              <div style={{ flex: 1, height: 8, background: 'var(--tint)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: '68%', height: '100%', background: 'var(--accent-sage)' }} />
              </div>
              <span className="tiny">68% warming</span>
            </div>
            <div className="tiny muted" style={{ marginTop: 6 }}>She's 2 mins in and still on the line · past 3 agents she hung up in &lt;45s.</div>
          </Box>
        </div>
      </div>
    </Desktop>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Live AI coach</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Transcribes, analyzes sentiment, surfaces your prep notes, pre-loads the best next move. Listens so you can be present.</p>
    </div>
  </div>;
}

/* ====================== V4 · AI PERSONALIZED LETTER ====================== */
function Exp4_Letter() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ width: 520 }}>
      <div className="hand-alt tiny">PRINT + MAIL · HANDWRITTEN FONT · day after expire</div>
      <Box style={{ marginTop: 8, padding: 28, background: '#F8F5EE' }}>
        <div className="tiny mono" style={{ color: 'var(--muted)' }}>April 22, 2026</div>
        <div className="serif" style={{ fontSize: 14, marginTop: 14, fontFamily: "'Caveat',cursive", lineHeight: 1.7, fontSize: 16 }}>
          Kimberly,<br/><br/>
          I know you don't know me — I'm Dana Martinez, I live two blocks from you on Oakhill. I noticed 47 Oakmont came off the market yesterday and I wanted to write instead of call, because I imagine you've had enough phone calls this week. <br/><br/>
          I'm not writing to pitch you. I'm writing because I pulled the listing and I think three specific things kept it from selling, none of which are the price being too high. If you want a second opinion from someone who sells a lot of houses on your block, I'd love to meet for 20 minutes at my place or the coffee shop on Main — no presentation, no pressure, just an honest read. <br/><br/>
          If that's a no, I completely understand. I'll be the one neighbor who didn't keep calling. <br/><br/>
          Warmly, <br/>
          Dana <br/>
          <span className="tiny mono" style={{ fontFamily: 'monospace' }}>(714) 555-8821 · dana@command.re</span>
        </div>

        <Box dashed style={{ marginTop: 20, padding: 10 }}>
          <div className="tiny mono">ENCLOSED (optional)</div>
          <div className="tiny" style={{ marginTop: 4 }}>• 1-page "what I'd do different" analysis · no selling<br/>• Her closing-day coffee gift-card ($15 Philz)</div>
        </Box>
      </Box>
    </div>

    <div style={{ width: 360, paddingTop: 20 }}>
      <div className="hand-alt tiny">✦ WHY THIS LETTER</div>
      <Box dashed style={{ marginTop: 8, padding: 12 }}>
        <div className="tiny" style={{ lineHeight: 1.5 }}>
          <b>Personalized</b> — Kimberly specifically, her listing, the 3 issues.<br/>
          <b>Handwritten font</b> — real-ink printed via VistaPrint Blue Ink.<br/>
          <b>No pitch</b> — "I'll be the one neighbor who didn't keep calling."<br/>
          <b>Low-ask meeting</b> — 20 min, her choice of location.<br/>
          <b>Gift enclosure</b> — disarming, memorable, $15.
        </div>
      </Box>

      <div className="hand-alt tiny" style={{ marginTop: 14 }}>THE BATCH</div>
      <Box style={{ marginTop: 8, padding: 10 }}>
        <div className="tiny">Sending 5 personalized letters today:</div>
        {['Kimberly (47 Oakmont)', 'Ben + Teri (1204 Birch)', 'Moss estate (822 Alder)', 'the Okafors (3310 Maple)', 'Park family (56 Cedar)'].map((r, i) => (
          <div key={i} className="tiny mono" style={{ padding: '4px 0', borderTop: '1px dashed var(--faint)' }}>✦ {r}</div>
        ))}
        <Box tan style={{ marginTop: 10, padding: 8 }}>
          <div className="tiny mono">✦ EACH IS UNIQUE</div>
          <div className="tiny" style={{ marginTop: 2 }}>Every letter references their specific listing issues, tenure, family situation. The Okafors' mentions their 3x withdrawal pattern. Moss estate letter addresses probate sensitively.</div>
        </Box>
      </Box>

      <Box dashed style={{ marginTop: 10, padding: 10 }}>
        <div className="tiny mono">COST</div>
        <div className="tiny" style={{ marginTop: 4 }}>5 letters · $18 printing + $17 stamps + $75 gift cards = <b>$110</b><br/>If 1 of 5 responds and becomes a listing ($18K GCI avg) = <b>164x ROI</b></div>
      </Box>
    </div>
  </div>;
}

/* ====================== V5 · CADENCE · 14-DAY TRACK ====================== */
function Exp5_Cadence() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Cadence · Kimberly Holt · day 4" url="command.app/prospect/cadence" style={{ width: 900 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">14-DAY TRACK · KIMBERLY HOLT · day 4</div>
          <div className="serif" style={{ fontSize: 22 }}>Sequenced, never stalker</div>
        </div>
        <Chip sm filled>on track</Chip>
      </div>

      <Box style={{ marginTop: 14, padding: 0 }}>
        {[
          ['Day 0 · Apr 22', 'call',   'First call · 14min · went well',                  'done',  '✓'],
          ['Day 0 · Apr 22', 'letter', 'Personalized letter mailed (USPS) + gift card',    'done',  '✓'],
          ['Day 2 · Apr 24', 'text',   '"Hey — just confirming letter arrived. No reply needed."','done',  '✓'],
          ['Day 4 · Apr 26', 'call',   '2nd call · soft follow · "read your letter?"',    'today · 10am',  '●'],
          ['Day 6 · Apr 28', 'email',  '"3 things" PDF · actionable, not salesy',          'queued',  '·'],
          ['Day 9 · May 1',  'pop-by', 'Drive by · leave a mini-CMA w/ "not selling you" note', 'queued',  '·'],
          ['Day 11 · May 3', 'text',   '"Last check-in · have a lovely weekend."',        'queued',  '·'],
          ['Day 14 · May 6', 'stop',   'No reply = stop · re-trigger if she relists',      'queued',  '·'],
        ].map((r, i) => (
          <div key={i} className="row" style={{ padding: '10px 12px', borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12, alignItems: 'center', background: r[3].includes('today') ? 'var(--accent-sage-2)' : 'transparent' }}>
            <span style={{ width: 130 }} className="mono">{r[0]}</span>
            <Chip sm style={{ width: 70, fontSize: 10 }}>{r[1]}</Chip>
            <span style={{ flex: 1 }}>{r[2]}</span>
            <Chip sm filled={r[3] === 'done'} style={{ width: 100, fontSize: 10 }}>{r[3]}</Chip>
            <span className="tiny mono" style={{ width: 24, textAlign: 'center' }}>{r[4]}</span>
          </div>
        ))}
      </Box>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">RESPONSE WATCHERS</div>
          <div className="tiny" style={{ marginTop: 4 }}>If she texts back · replies to email · opens 3+ emails · visits bio page — cadence pauses and escalates to YOU personally, not next scripted step.</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">IF SHE RELISTS</div>
          <div className="tiny" style={{ marginTop: 4 }}>New listing detected in MLS → cadence stops immediately, contact moved to "got other agent" tag · 90-day quiet hold · check back at 30 DOM if still active.</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">STOP-ASK RULE</div>
          <div className="tiny" style={{ marginTop: 4 }}>If she says "stop" (call, text, email) — all channels pause instantly + logged + flagged DNC for your db.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 240, paddingTop: 20 }}>
      <div className="hand-alt">14-day track</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Multi-channel, respectful, auto-stop. The top-agent cadence without the top-agent admin burden.</p>
    </div>
  </div>;
}

/* ====================== V6 · FSBO · DIFFERENT PLAY ====================== */
function Exp6_FSBO() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="FSBO · 418 Ironwood · E. Grayson" url="command.app/prospect/fsbo-ironwood" style={{ width: 960 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">FSBO · 418 IRONWOOD · day 21 listed</div>
          <div className="serif" style={{ fontSize: 22 }}>E. Grayson · solo seller · tired</div>
          <div className="tiny muted">Listed Zillow + FB + ForSaleByOwner.com · $469K · 2 drops · 7 showings, 1 lowball, no offer</div>
        </div>
        <Btn primary>Start FSBO play →</Btn>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">✦ FSBO IS A DIFFERENT BEAST</div>
          <div className="tiny" style={{ marginTop: 8, lineHeight: 1.5 }}>
            Expired = "my agent failed me." FSBO = "I don't need an agent." <br/><br/>
            The play is NOT "let me list it." The play is: <b>be genuinely useful while they figure out it's harder than they thought.</b> Then when they're ready, you're the one they already trust.
          </div>

          <div className="hand-alt tiny" style={{ marginTop: 14 }}>THE 4-STEP PLAY</div>
          {[
            ['1', 'Offer real help, no strings', 'Send buyer referrals. "I\'ve got 2 buyers who might be a fit — want me to send them by?"'],
            ['2', 'Offer the scary doc', '"Contracts are where FSBOs get burned. I can review the one they hand you — free, 15min."'],
            ['3', 'Be the referral safety net', '"When your buyer needs a lender/inspector/title — I\'ve got trusted ones."'],
            ['4', 'Wait for fatigue', 'At day 45 with no offer, send "no pressure, just checking in." 68% of FSBOs list w/ an agent by day 60.'],
          ].map((s, i) => (
            <div key={i} className="row" style={{ padding: '8px 0', borderTop: '1px dashed var(--faint)', fontSize: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--ink)', color: 'var(--paper)', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 }}>{s[0]}</div>
              <div>
                <b>{s[1]}</b>
                <div className="tiny muted" style={{ marginTop: 2 }}>{s[2]}</div>
              </div>
            </div>
          ))}
        </Box>

        <div style={{ width: 340 }}>
          <Box tan style={{ padding: 12 }}>
            <div className="hand-alt tiny">TODAY · SEND</div>
            <Box dashed style={{ marginTop: 8, padding: 10 }}>
              <div className="tiny" style={{ fontFamily: "'Caveat',cursive", fontSize: 14, lineHeight: 1.3 }}>
                "Hi Elliott — saw 418 Ironwood on Zillow. Love that you're going FSBO — most agents hate when I say this, but more people should try it. I've got 2 buyers I'm working with who want a 3bd in your zip. No obligation — want me to bring them by Saturday? No listing agreement, no fee from you. — Dana (2 blocks up on Oakhill)"
              </div>
            </Box>
            <Btn sm primary block style={{ marginTop: 8 }}>send text</Btn>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">AUTO-DRAFTED IF THEY REPLY</div>
            <div className="tiny" style={{ marginTop: 4 }}>3 reply variants pre-drafted: "YES bring them" → confirm + prep · "no thanks" → "ok, one last offer — free contract review when needed" · silence → 5d soft reminder.</div>
          </Box>

          <Box style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">FATIGUE SIGNALS (watched)</div>
            <div className="tiny" style={{ marginTop: 4 }}>Price drop #3 · listing edits at 11pm · no weekend showings 2 weeks in a row · description gets longer/sadder · asks re: "do you know a good inspector?" · DM to you.</div>
          </Box>
        </div>
      </div>
    </Desktop>

    <div style={{ maxWidth: 240, paddingTop: 20 }}>
      <div className="hand-alt">FSBO play</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Long game. Be helpful, not hunting. Agents who try to "convert" FSBOs day 1 lose every time.</p>
    </div>
  </div>;
}

/* ====================== V7 · OBJECTION TRAINER (practice) ====================== */
function Exp7_Trainer() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Objection trainer" url="command.app/prospect/trainer" style={{ width: 900 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">✦ TRAINER · expired + FSBO · 12 scenarios</div>
          <div className="serif" style={{ fontSize: 24 }}>Practice before you dial</div>
          <div className="tiny muted">AI plays the objector. Voice or text. You get graded + real feedback.</div>
        </div>
        <Btn primary>Run 10-min drill →</Btn>
      </div>

      {/* Scenario grid */}
      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          ['"I\'m taking it off til spring"',        'price & timing',   'medium', 3],
          ['"Already signed w/ another agent"',     'timing',            'easy',   8],
          ['"I don\'t trust realtors"',             'trust',             'hard',   2],
          ['"You\'re the 5th call today"',          'overwhelm',         'medium', 5],
          ['"My commission was too high"',          'fees',              'hard',   1],
          ['"I\'ll just FSBO it myself"',           'DIY',              'medium', 4],
          ['"Zillow says it\'s worth $40K more"',   'price anchor',      'hard',   2],
          ['"My neighbor said don\'t sell now"',     'zeitgeist',         'medium', 6],
          ['"What makes you different"',             'differentiation',   'easy',   7],
          ['"Prove you can sell it"',                'credibility',       'hard',   1],
          ['"Send me your marketing plan"',          'info-only',         'medium', 4],
          ['"I just want a quick sale"',             'investor-minded',   'easy',   5],
        ].map((s, i) => (
          <Box key={i} style={{ padding: 10 }}>
            <div className="tiny mono" style={{ color: 'var(--muted)' }}>{s[1]}</div>
            <div className="tiny" style={{ marginTop: 4, fontFamily: "'Caveat',cursive", fontSize: 13 }}>{s[0]}</div>
            <div className="row between" style={{ marginTop: 8 }}>
              <Chip sm style={{ fontSize: 10, background: s[2] === 'hard' ? 'var(--accent-rose)' : s[2] === 'medium' ? 'var(--accent-tan)' : 'var(--accent-sage)', color: 'var(--paper)', border: 'none' }}>{s[2]}</Chip>
              <span className="tiny muted">{s[3]}× avg/wk</span>
            </div>
          </Box>
        ))}
      </div>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box tan style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">✦ YOUR HISTORY</div>
          <div className="tiny" style={{ marginTop: 4 }}>You've run 14 drills · improved 23% on "trust" scenarios · your weakest is "price anchor" (58% pass rate).</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">HOW GRADING WORKS</div>
          <div className="tiny" style={{ marginTop: 4 }}>AI scores: empathy (did you acknowledge), diagnosis (did you ask before telling), reframe (did you shift their lens), commitment (did you set a next step).</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">MODES</div>
          <div className="tiny" style={{ marginTop: 4 }}>Voice · type · in-car (mobile) · replay your own real calls with critique turned on.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 240, paddingTop: 20 }}>
      <div className="hand-alt">Objection trainer</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>The batting cages. 10 minutes before your power hour, work a fastball you've been missing.</p>
    </div>
  </div>;
}

/* ====================== V8 · CONVERSION DASHBOARD ====================== */
function Exp8_Dashboard() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Expired+FSBO · performance" url="command.app/prospect/stats" style={{ width: 900 }}>
      <div className="hand-alt tiny">✦ LAST 90 DAYS · EXPIRED + FSBO PIPELINE</div>
      <div className="serif" style={{ fontSize: 26 }}>What's actually converting</div>

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        {[
          ['Touches sent',     '412',  'multi-channel'],
          ['Responses',        '87',    '21% reply rate'],
          ['Meetings booked',  '23',   '5.6% of touches'],
          ['Listings signed',  '7',    '30% of meetings'],
          ['Closed so far',    '3',    '+$64K GCI'],
          ['In pipeline',      '4',    'est. $79K GCI'],
        ].map((s, i) => (
          <Box key={i} style={{ padding: 10, flex: 1 }}>
            <div className="tiny mono">{s[0]}</div>
            <div className="serif" style={{ fontSize: 24, marginTop: 2 }}>{s[1]}</div>
            <div className="tiny muted">{s[2]}</div>
          </Box>
        ))}
      </div>

      {/* Funnel visual */}
      <Box style={{ marginTop: 14, padding: 16 }}>
        <div className="hand-alt tiny">FUNNEL · visual</div>
        <div style={{ marginTop: 10 }}>
          {[
            ['Leads identified',        '847',  100],
            ['Touched',                 '412',  49],
            ['Responded',               '87',   10],
            ['Meeting booked',          '23',   3],
            ['Listing signed',          '7',    0.8],
            ['Closed',                  '3',    0.35],
          ].map((r, i) => (
            <div key={i} className="row" style={{ gap: 10, alignItems: 'center', padding: '4px 0' }}>
              <span style={{ width: 150, fontSize: 12 }}>{r[0]}</span>
              <div style={{ flex: 1, height: 18, background: 'var(--tint)', borderRadius: 2, position: 'relative', overflow: 'hidden' }}>
                <div style={{ width: `${r[2]}%`, height: '100%', background: i < 2 ? 'var(--accent-tan)' : i < 4 ? 'var(--accent-sage)' : 'var(--ink)' }} />
              </div>
              <span className="tiny mono" style={{ width: 100, textAlign: 'right' }}>{r[1]} ({r[2]}%)</span>
            </div>
          ))}
        </div>
      </Box>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box tan style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">✦ WHAT'S WORKING</div>
          <div className="tiny" style={{ marginTop: 4 }}>Letter + gift card = 3.2x reply rate vs cold call alone · "diagnose first" opener 2.1x vs elevator pitch · text day 2 after letter = 4.4x vs no text.</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">WHAT'S NOT</div>
          <div className="tiny" style={{ marginTop: 4 }}>Emails alone = 0.8% reply · calling after 6pm = half the pickup rate · withdrawn listings over 3x = 0/14 meetings (consider skipping).</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">NEXT EXPERIMENT</div>
          <div className="tiny" style={{ marginTop: 4 }}>A/B: handwritten envelope vs printed. Run on next 40. Hypothesis: opens +30%.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 240, paddingTop: 20 }}>
      <div className="hand-alt">Conversion dashboard</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Treat prospecting like a funnel — see exactly which touch works, which channel drops, where to spend more.</p>
    </div>
  </div>;
}

/* ====================== V9 · MOBILE · DRIVE-TIME POWER HOUR ====================== */
function Exp9_Mobile() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">POWER HOUR · CAR MODE · 8:02am</div>
        <div className="serif" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>5 calls today</div>
        <div className="tiny muted">Hands-free · AI will log · tap to skip</div>

        <Box filled style={{ marginTop: 14, padding: 12 }}>
          <div className="hand-alt tiny" style={{ color: 'var(--paper)', opacity: 0.8 }}>NEXT UP · 1 OF 5</div>
          <div className="serif" style={{ fontSize: 20, marginTop: 4 }}>Kimberly Holt</div>
          <div className="tiny" style={{ opacity: 0.9, marginTop: 2 }}>47 Oakmont · expired yesterday · 62 · widowed</div>

          <div className="tiny" style={{ marginTop: 10, fontFamily: "'Caveat',cursive", fontSize: 14 }}>
            Remember: she's moving for grandkids. Don't lead with price. Ask about the last agent.
          </div>

          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            <Chip sm style={{ background: 'var(--paper)', color: 'var(--ink)', border: 'none' }}>daughter → Denver</Chip>
            <Chip sm style={{ background: 'var(--paper)', color: 'var(--ink)', border: 'none' }}>2nd expire</Chip>
          </div>
        </Box>

        <Btn primary block style={{ marginTop: 14 }}>📞 Call Kimberly</Btn>
        <Btn block style={{ marginTop: 6 }}>Skip · try after 3pm</Btn>
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">● LIVE CALL · 2:14</div>
        <div className="serif" style={{ fontSize: 20, marginTop: 4 }}>Kimberly Holt</div>

        <Box tan style={{ marginTop: 10, padding: 10 }}>
          <div className="tiny mono">✦ AI SAYS NEXT</div>
          <div className="tiny" style={{ marginTop: 4, fontFamily: "'Caveat',cursive", fontSize: 13 }}>
            "What did you think went wrong?"
          </div>
        </Box>

        <Box dashed style={{ marginTop: 8, padding: 8 }}>
          <div className="tiny mono">SHE SAID</div>
          <div className="tiny muted" style={{ marginTop: 2 }}>"Three other agents called today..."</div>
        </Box>

        <Box dashed style={{ marginTop: 8, padding: 8 }}>
          <div className="tiny mono">DON'T SAY</div>
          <div className="tiny" style={{ marginTop: 2 }}>"I'm different" · "Let me list it" · "The price was too high"</div>
        </Box>

        <div className="row" style={{ gap: 6, marginTop: 14 }}>
          <Btn sm primary>✓ booked meeting</Btn>
          <Btn sm>callback</Btn>
          <Btn sm>no interest</Btn>
        </div>

        <Box dashed style={{ marginTop: 10, padding: 8 }}>
          <div className="tiny mono">AUTO-LOGGING</div>
          <div className="tiny" style={{ marginTop: 2 }}>Full transcript · sentiment · agreed-to follow-up · next step draft — all saved to her profile when call ends.</div>
        </Box>
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">POWER HOUR · DONE</div>
        <div className="serif" style={{ fontSize: 22, marginTop: 4 }}>Great run, Dana</div>

        <div style={{ marginTop: 14, fontSize: 12 }}>
          {[
            ['Called',      '5 of 5', '✓'],
            ['Connected',   '3',      '60%'],
            ['Meetings',    '1',      'Kimberly · Thu 10am'],
            ['Callbacks',   '1',      'Teri · after 6pm'],
            ['Declined',    '1',      'Okafors · respect'],
            ['Time',        '47 min', ''],
          ].map((r, i) => (
            <div key={i} className="row between" style={{ padding: '8px 0', borderTop: '1px dashed var(--faint)' }}>
              <span>{r[0]}</span>
              <span><b>{r[1]}</b> <span className="tiny muted">{r[2]}</span></span>
            </div>
          ))}
        </div>

        <Box tan style={{ marginTop: 12, padding: 10 }}>
          <div className="tiny mono">✦ AI WRAP</div>
          <div className="tiny" style={{ marginTop: 4 }}>Your "diagnose first" move is working · try it on Teri too tonight · drafted prep for Kimberly Thu ready to review.</div>
        </Box>

        <Btn primary block style={{ marginTop: 12 }}>See Kimberly prep →</Btn>
      </div>
    </Phone>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Drive-time</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Between showings or school runs. One-tap call, AI logs the whole thing, you never touch a keyboard.</p>
    </div>
  </div>;
}

/* ====================== REGISTRATIONS ====================== */

window.ExpiredFSBOScreens = [
  { id: 'ex1', label: 'V1 · Daily hit list',        caption: 'Overnight expired + active FSBO · AI-ranked by fit to your history.',              Component: Exp1_HitList },
  { id: 'ex2', label: 'V2 · Deep recon · owner',    caption: 'Listing history · owner intel · privacy-aware "why selling" hypothesis.',           Component: Exp2_Profile },
  { id: 'ex3', label: 'V3 · Live call · AI coach',  caption: 'Live transcript + sentiment + what-to-say-next + objection primer.',               Component: Exp3_Script },
  { id: 'ex4', label: 'V4 · AI-personalized letter',caption: 'Handwritten-font print · each letter unique · gift card enclosed · 164x ROI math.', Component: Exp4_Letter },
  { id: 'ex5', label: 'V5 · 14-day cadence',        caption: 'Multi-channel, respectful, auto-stop on "stop" or relist signal.',                 Component: Exp5_Cadence },
  { id: 'ex6', label: 'V6 · FSBO · long game',      caption: 'Be helpful not hunting · 4-step play · fatigue-signal watchers.',                    Component: Exp6_FSBO },
  { id: 'ex7', label: 'V7 · Objection trainer',     caption: 'Practice 12 scenarios · graded · voice-or-text · mobile drive-time mode.',          Component: Exp7_Trainer },
  { id: 'ex8', label: 'V8 · Conversion dashboard',  caption: 'Funnel stats · what\'s working · A/B experiments on prospecting methods.',           Component: Exp8_Dashboard },
  { id: 'ex9', label: 'V9 · Mobile power hour',     caption: 'Car-safe · hands-free · one-tap call · AI logs everything · end-of-run wrap.',      Component: Exp9_Mobile },
];

/* ============================================================
   POST-CLOSE · CLIENT-FOR-LIFE
   Pop-bys · home anniversary · equity check · tax CMA · moments of truth
   ============================================================ */

/* ====================== V1 · LIFECYCLE MAP ====================== */
function Post1_Lifecycle() {
  const rows = [
    ['day 0',    'Closing',            'Keys, photo, champagne, closing gift',        '847 clients · 100%', 'var(--accent-sage)'],
    ['day 7',    '1st week check-in',  '"How\'s it feeling?" · note any problems',     '94%', 'var(--accent-sage)'],
    ['day 30',   '30-day recap',       'Welcome basket, referral reminder, review ask','82%', 'var(--accent-sage)'],
    ['day 90',   'Settled-in',         'Pop-by · first handwritten · warranty check',  '71%', 'var(--accent-tan)'],
    ['day 180',  'Half-year',          'Seasonal treat · utility bill benchmark',       '54%', 'var(--accent-tan)'],
    ['year 1',   'Home anniversary',   'Video tribute, anniversary gift, equity pulse','78%', 'var(--accent-sage)'],
    ['yr 1.25',  'Tax season',         'Tax-ready package · mortgage interest stmt',    '41%', 'var(--accent-rose)'],
    ['year 2+',  'Annual equity',      'AI CMA + market letter · every March',         '38%', 'var(--accent-rose)'],
    ['ongoing',  'Life events',        'Birthday · kids · promotions · moves spotted',  '—',    'var(--muted)'],
  ];

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Client-for-life" url="command.app/lifecycle" style={{ width: 900 }}>
      <div className="hand-alt tiny">✦ CLIENT-FOR-LIFE · past 847 clients</div>
      <div className="serif" style={{ fontSize: 28 }}>The lifecycle map</div>
      <div className="tiny muted">Every past client, tracked across 9 moments of truth. Percentages = coverage across your database.</div>

      <Box style={{ marginTop: 14, padding: 0 }}>
        <div className="row" style={{ padding: '8px 12px', background: 'var(--tint)', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
          <span style={{ width: 90 }}>WHEN</span>
          <span style={{ width: 140 }}>MOMENT</span>
          <span style={{ flex: 1 }}>WHAT HAPPENS</span>
          <span style={{ width: 120 }}>COVERAGE</span>
        </div>
        {rows.map((r, i) => (
          <div key={i} className="row" style={{ padding: '10px 12px', borderTop: '1px dashed var(--faint)', fontSize: 12, alignItems: 'center' }}>
            <span style={{ width: 90 }} className="mono muted">{r[0]}</span>
            <b style={{ width: 140 }}>{r[1]}</b>
            <span style={{ flex: 1 }}>{r[2]}</span>
            <Chip sm style={{ width: 120, background: r[4], color: 'var(--paper)', border: 'none', fontSize: 10 }}>{r[3]}</Chip>
          </div>
        ))}
      </Box>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box dashed style={{ padding: 10, flex: 2 }}>
          <div className="tiny mono">✦ THE GAP</div>
          <div className="tiny" style={{ marginTop: 4 }}>You've got 847 past clients but only 38% get their annual equity check. That's 524 conversations you're not having. This section closes that gap with zero extra effort.</div>
        </Box>
        <Box tan style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">TUNE FREQUENCY</div>
          <div className="tiny" style={{ marginTop: 4 }}>Dial up or down per client tier — raving fans get higher cadence, flat-fee one-timers get lighter touch.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">The map</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>9 scheduled moments per client, auto-tracked. No more "I meant to reach out" after 3 years of silence.</p>
    </div>
  </div>;
}

/* ====================== V2 · POP-BY PLANNER ====================== */
function Post2_PopBy() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Pop-by planner · April" url="command.app/lifecycle/popby" style={{ width: 900 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">✦ POP-BY · APRIL · plan your route</div>
          <div className="serif" style={{ fontSize: 26 }}>Drop 14 gifts on Saturday</div>
          <div className="tiny muted">One route · 4 hours · $126 in gifts. Targets grouped by geography.</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>reshuffle who</Btn>
          <Btn primary>Print labels + route →</Btn>
        </div>
      </div>

      {/* Theme + gift */}
      <Box tan style={{ marginTop: 14, padding: 12 }}>
        <div className="hand-alt tiny">THIS MONTH'S GIFT</div>
        <div className="row" style={{ gap: 14, marginTop: 8, alignItems: 'center' }}>
          <Img label="succulent + tag" w={100} h={100} />
          <div style={{ flex: 1 }}>
            <div className="serif" style={{ fontSize: 18 }}>"Things that grow" · spring succulent</div>
            <div className="tiny muted">$9 per unit · 14 ordered · trader joes or Costco pickup · handwritten tag</div>
          </div>
          <Box dashed style={{ padding: 8, maxWidth: 220 }}>
            <div className="tiny mono">TAG COPY</div>
            <div className="tiny" style={{ marginTop: 4, fontFamily: "'Caveat',cursive", fontSize: 14 }}>"Thinking of your place today. Hope it's still feeling like home. — Dana"</div>
          </Box>
        </div>
      </Box>

      {/* Groups */}
      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        {[
          ['Oak Park cluster', '6 stops', '42 min drive', ['Jen O.', 'Webers', 'Pattersons', 'Chens', 'M. Ramirez', 'Rosa R.']],
          ['East side',        '5 stops', '58 min drive', ['Marcus + Sara', 'J. Tran', 'D. Weber', 'Sanchezes', 'Ortegas']],
          ['North hills',      '3 stops', '34 min drive', ['the Kims', 'Ashley & John', 'the Greens']],
        ].map((g, i) => (
          <Box key={i} style={{ padding: 10, flex: 1 }}>
            <div className="hand-alt tiny">{g[0]}</div>
            <div className="row between" style={{ marginTop: 4 }}>
              <b style={{ fontSize: 13 }}>{g[1]}</b>
              <span className="tiny muted">{g[2]}</span>
            </div>
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {g[3].map((c, j) => (
                <div key={j} className="row between" style={{ padding: '4px 0', borderTop: j ? '1px dashed var(--faint)' : 'none', fontSize: 11 }}>
                  <span>• {c}</span>
                  <span className="tiny muted">last touch 47d</span>
                </div>
              ))}
            </div>
          </Box>
        ))}
      </div>

      <Box dashed style={{ marginTop: 14, padding: 10 }}>
        <div className="tiny mono">✦ AI PICKED WHO</div>
        <div className="tiny" style={{ marginTop: 4 }}>Weighted toward: raving fans w/ no touch in 60+ days · high-value tree roots · recent life events (new baby · new job). Skipped: "prefers no contact" flag, seasonal homeowners out of town.</div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Pop-by planner</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>One monthly pop-by · one theme · AI picks who, groups by geography, plans the route, prints the labels.</p>
    </div>
  </div>;
}

/* ====================== V3 · HOME ANNIVERSARY ====================== */
function Post3_Anniversary() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Anniversary · Jen Ortiz · 1 yr" url="command.app/lifecycle/anniversary/jen" style={{ width: 900 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">✦ JEN ORTIZ · 1-YEAR ANNIVERSARY · March 24 (in 5d)</div>
          <div className="serif" style={{ fontSize: 26 }}>Celebrate the move</div>
        </div>
        <Btn primary>send on the day →</Btn>
      </div>

      <div className="row" style={{ gap: 14, marginTop: 14, alignItems: 'flex-start' }}>
        {/* Left: auto-generated video tribute */}
        <Box style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">✦ VIDEO TRIBUTE (ai-drafted, 32s)</div>
          <Img label="▶ kids + keys → kids + yard (now)" h={220} style={{ marginTop: 8 }} />
          <div className="tiny mono" style={{ marginTop: 4 }}>0:00 intro · 0:08 closing-day photo · 0:18 recent social post · 0:28 sign-off</div>

          <Box dashed style={{ marginTop: 10, padding: 8 }}>
            <div className="tiny mono">VOICEOVER SCRIPT</div>
            <div className="tiny" style={{ marginTop: 4, fontFamily: "'Caveat',cursive", fontSize: 13 }}>
              "Jen — one year ago today you got the keys. I still remember you crying in the kitchen. Hope the past year's been everything. — Dana"
            </div>
          </Box>

          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            <Btn sm primary>looks good</Btn>
            <Btn sm>record it myself</Btn>
            <Btn sm>rewrite script</Btn>
          </div>
        </Box>

        {/* Right: gift + equity snapshot */}
        <div style={{ width: 300 }}>
          <Box tan style={{ padding: 12 }}>
            <div className="hand-alt tiny">GIFT · SUGGESTED</div>
            <div className="tiny" style={{ marginTop: 6 }}>Local bakery — Biscotti Bakery (their favorite per closing dinner convo) · sampler · $38</div>
            <Btn sm filled style={{ marginTop: 8 }}>order + schedule delivery</Btn>
          </Box>

          <Box style={{ marginTop: 10, padding: 12 }}>
            <div className="hand-alt tiny">✦ EQUITY PULSE</div>
            <div className="serif" style={{ fontSize: 24, marginTop: 4 }}>+$47K</div>
            <div className="tiny muted">Estimated home appreciation · 1yr</div>
            <Box dashed style={{ marginTop: 8, padding: 6 }}>
              <div className="tiny" style={{ fontSize: 11 }}>Paid $548K · AI est today $595K · (based on 11 Oak Park comps last 90d).</div>
            </Box>
            <div className="tiny muted" style={{ marginTop: 6 }}>Included in the anniversary note · soft not pushy.</div>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">SOCIAL POST (optional)</div>
            <div className="tiny" style={{ marginTop: 4 }}>With Jen's permission · IG reel of tribute · tags her. Approval asked via 1-tap.</div>
          </Box>
        </div>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Anniversary</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Nobody else will remember. You will. Video tribute + gift + equity glimpse · all pre-built, just confirm.</p>
    </div>
  </div>;
}

/* ====================== V4 · ANNUAL EQUITY CHECK (CMA-lite) ====================== */
function Post4_Equity() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ width: 520 }}>
      <div className="hand-alt tiny">PAST CLIENT · mailed + emailed · march every year</div>
      <Box style={{ marginTop: 8, padding: 20, background: 'var(--paper)' }}>
        <div className="row between">
          <div>
            <div className="hand-alt tiny">YOUR HOME · APRIL 2026</div>
            <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>2847 Oakhill Lane</div>
            <div className="tiny muted">Oak Park · 3bd 2ba · 1,840sqft</div>
          </div>
          <Avatar initials="DM" size={44} />
        </div>

        <div className="serif" style={{ fontSize: 40, marginTop: 18 }}>$595K <span className="tiny muted" style={{ fontSize: 12, fontFamily: 'monospace' }}>est.</span></div>
        <div className="tiny muted">Based on 11 Oak Park comps sold last 90 days</div>

        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <Box dashed style={{ padding: 8, flex: 1 }}>
            <div className="tiny mono">YOU PAID</div>
            <div className="serif" style={{ fontSize: 18 }}>$548K</div>
            <div className="tiny muted">Mar 2025</div>
          </Box>
          <Box dashed style={{ padding: 8, flex: 1 }}>
            <div className="tiny mono">APPRECIATED</div>
            <div className="serif" style={{ fontSize: 18, color: 'var(--accent-sage)' }}>+$47K</div>
            <div className="tiny muted">+8.6% in 12 mo</div>
          </Box>
          <Box dashed style={{ padding: 8, flex: 1 }}>
            <div className="tiny mono">EST. EQUITY</div>
            <div className="serif" style={{ fontSize: 18 }}>$184K</div>
            <div className="tiny muted">incl. payoff</div>
          </Box>
        </div>

        {/* Comps */}
        <div className="hand-alt tiny" style={{ marginTop: 14 }}>WHAT SOLD NEAR YOU</div>
        {[
          ['2841 Oakhill', '3bd/2ba · 1,910', '$612K', 'Mar 12'],
          ['2812 Birch',   '3bd/2ba · 1,780', '$588K', 'Apr 08'],
          ['2904 Oakhill', '4bd/2ba · 2,100', '$648K', 'Apr 02'],
        ].map((c, i) => (
          <div key={i} className="row between" style={{ padding: '6px 0', borderTop: '1px dashed var(--faint)', fontSize: 12 }}>
            <span>{c[0]} <span className="tiny muted">· {c[1]}</span></span>
            <span><b>{c[2]}</b> <span className="tiny muted">· {c[3]}</span></span>
          </div>
        ))}

        <Box tan style={{ marginTop: 14, padding: 12 }}>
          <div className="hand-alt tiny">DANA'S NOTE</div>
          <div className="tiny" style={{ marginTop: 6, fontFamily: "'Caveat',cursive", fontSize: 15, lineHeight: 1.3 }}>
            "Jen — not trying to sell you anything. Just want you to see what's happening. Oak Park's been steady and your home's tracking well. Call me if you want to talk — otherwise see you next year."
          </div>
        </Box>

        <Box dashed style={{ marginTop: 10, padding: 8 }}>
          <div className="tiny mono">KEY DATES</div>
          <div className="tiny" style={{ marginTop: 4 }}>Mortgage interest statement attached · property tax reminder (due Apr 30) · homestead exemption check-in</div>
        </Box>
      </Box>
    </div>

    <div style={{ maxWidth: 280, paddingTop: 20 }}>
      <div className="hand-alt">Annual equity · mailed + emailed</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>The letter they look forward to. Not a pitch — a present. "Here's what your house is worth and who else sold."</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">WHY THIS WORKS</div>
        <div className="tiny" style={{ marginTop: 4 }}>When they DO decide to sell, they call you because you've been the voice of their house for years. No other agent shows up in March with this.</div>
      </Box>
      <Box dashed style={{ marginTop: 10, padding: 10 }}>
        <div className="tiny mono">AUTO-GENERATED</div>
        <div className="tiny" style={{ marginTop: 4 }}>All 847 past clients get their own personalized letter · pulled from MLS comps · printed via title-co partner.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V5 · TAX-SEASON PACKAGE ====================== */
function Post5_TaxSeason() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Tax-ready · feb 1" url="command.app/lifecycle/tax" style={{ width: 900 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">✦ TAX SEASON · FEB 1 · 847 past clients</div>
          <div className="serif" style={{ fontSize: 26 }}>The tax-ready package</div>
          <div className="tiny muted">A micro-site with every doc they need from their closing year · emailed + SMS · printable PDF.</div>
        </div>
        <Btn primary>send to eligible 384 →</Btn>
      </div>

      {/* Preview */}
      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">WHAT'S INCLUDED · per client</div>
          {[
            ['HUD-1 / Closing Disclosure',     'pulled from Transact'],
            ['Mortgage interest (1098)',        'auto-pulled from lender partner'],
            ['Property tax paid at close',      'from HUD'],
            ['Points paid (deductible?)',       'AI flags · check w/ CPA'],
            ['Home improvement receipts',       'that you uploaded to me'],
            ['1099-S (if you sold)',            'from title co'],
            ['Homestead exemption check',       'did you file? 62% of clients didn\'t'],
          ].map((r, i) => (
            <div key={i} className="row between" style={{ padding: '8px 0', borderTop: '1px dashed var(--faint)', fontSize: 12 }}>
              <span>✓ {r[0]}</span><span className="tiny muted">{r[1]}</span>
            </div>
          ))}
        </Box>

        <Box tan style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">THE EMAIL</div>
          <div className="tiny" style={{ marginTop: 6, fontFamily: "'Caveat',cursive", fontSize: 14, lineHeight: 1.3 }}>
            Hey Jen — tax season is here. I put together everything you'll need for your 2025 closing in one folder, including your 1098, closing statement, and the home-improvement receipts you sent me. CPAs love when this is tidy. <br/><br/>
            If you need a referral to a great one, I'm friends with three — just reply and I'll intro. <br/><br/>
            — Dana
          </div>

          <Box dashed style={{ marginTop: 10, padding: 8 }}>
            <div className="tiny mono">LINK TO SECURE PORTAL</div>
            <div className="tiny" style={{ marginTop: 4 }}>danamartinez.com/taxdocs/[secure-token] · PDF download + printable packet</div>
          </Box>
        </Box>
      </div>

      <Box dashed style={{ marginTop: 14, padding: 10 }}>
        <div className="tiny mono">✦ CPA REFERRAL LOOP</div>
        <div className="tiny" style={{ marginTop: 4 }}>When a client says "send CPA intro" → auto-connects them to 3 vendors in your referral vendor list · tracks who books · credits you when they use a mortgage referral in the future.</div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Tax-ready</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Feb 1 email every year. Their CPA loves it. They remember why you were the right choice.</p>
    </div>
  </div>;
}

/* ====================== V6 · LIFE EVENTS RADAR ====================== */
function Post6_LifeEvents() {
  const events = [
    ['Jen Ortiz',        '🎂 birthday',         'may 14 · in 22d',   'send preferred: peonies + note', 'queued'],
    ['Miguel R.',        '👶 new baby',         'detected from IG',   'meal train · $80 · auto-send',    'pending approval'],
    ['Marcus Webb',      '💼 new job',          'detected from LinkedIn','congrats text drafted',       'pending approval'],
    ['the Pattersons',   '🏠 2yr anniversary',  'apr 18 · in 5d',     'equity letter + gift card',       'queued'],
    ['D. Weber',         '📈 job promo',        'LinkedIn · yesterday','congrats + "anything moving?"', 'pending approval'],
    ['J. Tran',          '💔 divorce filed',    'public record alert · PRIVATE', 'pause all comms 90d · discreet note', 'privacy-hold'],
    ['Rosa Ramirez',     '👶 grandkid #3',      'from son Miguel',     'flowers + knit blanket',          'queued'],
    ['the Chens',        '🎓 kid graduated',    'Miguel mentioned',     'campus gift · $50',              'draft only'],
  ];

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Life events · radar" url="command.app/lifecycle/events" style={{ width: 900 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">✦ LIFE EVENTS · detected across your network</div>
          <div className="serif" style={{ fontSize: 26 }}>Don't miss the moments that matter</div>
          <div className="tiny muted">Pulled from LinkedIn, IG, Facebook, public records, client conversations, and things you told me.</div>
        </div>
      </div>

      <Box style={{ marginTop: 14, padding: 0 }}>
        <div className="row" style={{ padding: '8px 12px', background: 'var(--tint)', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
          <span style={{ width: 140 }}>CLIENT</span>
          <span style={{ width: 150 }}>EVENT</span>
          <span style={{ width: 180 }}>SOURCE</span>
          <span style={{ flex: 1 }}>ACTION DRAFTED</span>
          <span style={{ width: 130 }}>STATUS</span>
        </div>
        {events.map((r, i) => (
          <div key={i} className="row" style={{ padding: '10px 12px', borderTop: '1px dashed var(--faint)', fontSize: 12, alignItems: 'center', background: r[4].includes('privacy') ? 'rgba(200,80,80,0.06)' : 'transparent' }}>
            <b style={{ width: 140 }}>{r[0]}</b>
            <span style={{ width: 150 }}>{r[1]}</span>
            <span style={{ width: 180 }} className="muted tiny">{r[2]}</span>
            <span style={{ flex: 1, fontSize: 11 }}>{r[3]}</span>
            <Chip sm filled={r[4] === 'queued'} style={{ width: 110, fontSize: 10, background: r[4].includes('privacy') ? 'var(--accent-rose)' : undefined, color: r[4].includes('privacy') ? 'var(--paper)' : undefined }}>{r[4]}</Chip>
          </div>
        ))}
      </Box>

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">✦ PRIVACY FIRST</div>
          <div className="tiny" style={{ marginTop: 4 }}>Sensitive events (divorce, death, illness) are flagged PRIVATE — AI suggests pausing comms or a discreet note, never a celebratory reach-out.</div>
        </Box>
        <Box tan style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">YOU WROTE IT ONCE</div>
          <div className="tiny" style={{ marginTop: 4 }}>Templates learn your voice — birthdays don't read like mass merge. They sound like you wrote them on the train.</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">OPT-OUT RESPECTED</div>
          <div className="tiny" style={{ marginTop: 4 }}>Clients who flag "prefer less contact" get filtered here — they just get the annual equity letter, nothing else.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Life events</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Real relationships require remembering things. AI watches the signals you don't have time to scan so you show up.</p>
    </div>
  </div>;
}

/* ====================== V7 · MOVE-SPOTTING · DETECTED SELLERS ====================== */
function Post7_MoveSpot() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Move signals · your database" url="command.app/lifecycle/move-spotting" style={{ width: 900 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">✦ AI · detected move intent · 9 clients</div>
          <div className="serif" style={{ fontSize: 26 }}>Who's moving (before they tell you)</div>
          <div className="tiny muted">Signals from public records, social, behavior, relationships. High-signal only — no creepiness.</div>
        </div>
      </div>

      <Box style={{ marginTop: 14, padding: 0 }}>
        <div className="row" style={{ padding: '8px 12px', background: 'var(--tint)', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
          <span style={{ width: 160 }}>CLIENT</span>
          <span style={{ flex: 1 }}>SIGNALS</span>
          <span style={{ width: 90 }}>CONFIDENCE</span>
          <span style={{ width: 160 }}>SUGGESTED PLAY</span>
        </div>
        {[
          ['the Hendersons', '• Zestimate searches (2x this week) · • their daughter just accepted at UCSD · • baby #2 on the way (IG)', 'high', 'quiet CMA + coffee invite'],
          ['Marcus + Sara',   '• 3 CoStar downtown listing views · • promo @ Autodesk (LinkedIn) · • searched "best SF suburbs"', 'high', 'not-yet-ready packet'],
          ['the Kims',        '• kid graduating HS · • "empty nest" pin on Pinterest · • zip code search activity', 'medium', 'wait 60d then soft reach'],
          ['J. Tran',         '• divorce filed · • new apartment lease (public)', 'skip', 'privacy-hold · no outreach'],
          ['Rosa R.',         '• mobility convos w/ Miguel · • 1-story searches on Redfin', 'medium', 'age-in-place or downsize talk · thru Miguel'],
          ['D. Weber',        '• new job offer in Austin', 'medium', 'intro to my TX agent network'],
        ].map((r, i) => (
          <div key={i} className="row" style={{ padding: '10px 12px', borderTop: '1px dashed var(--faint)', fontSize: 12, alignItems: 'flex-start', background: r[2] === 'skip' ? 'rgba(200,80,80,0.06)' : 'transparent' }}>
            <b style={{ width: 160 }}>{r[0]}</b>
            <span style={{ flex: 1, fontSize: 11 }}>{r[1]}</span>
            <Chip sm style={{ width: 80, fontSize: 10, background: r[2] === 'high' ? 'var(--accent-sage)' : r[2] === 'skip' ? 'var(--accent-rose)' : 'var(--accent-tan)', color: 'var(--paper)', border: 'none' }}>{r[2]}</Chip>
            <span style={{ width: 160, fontSize: 11 }}>{r[3]}</span>
          </div>
        ))}
      </Box>

      <Box dashed style={{ marginTop: 14, padding: 12 }}>
        <div className="hand-alt tiny">HOW I USE THIS (without being weird)</div>
        <div className="tiny" style={{ marginTop: 4 }}>
          I don't call and say "I heard you got promoted." I call and say "Hey — I was running Oak Park comps and thought of you. Coffee next week?" The signal guides the TIMING, not the pretext.
        </div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Move-spotting</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>The thing every top agent does mentally, now systematic. Privacy-forward — confidence tiers, skip signals for sensitive situations.</p>
    </div>
  </div>;
}

/* ====================== V8 · CLIENT CARE INBOX (problems · mobile) ====================== */
function Post8_CareInbox() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">CLIENT CARE · INBOX · 4 open</div>
        <div className="serif" style={{ fontSize: 20, marginTop: 4 }}>Past clients need you</div>

        <div style={{ marginTop: 14 }}>
          {[
            ['Jen O.',   'HVAC quote sanity check', '"Is $4,200 fair for a new unit?"',  '2h ago', 'var(--accent-tan)'],
            ['Webers',   'plumber rec',              '"our shower is leaking weirdly"',  '5h ago', 'var(--accent-sage)'],
            ['M. Ramirez','refi question',           '"should I refi at 6.1%?"',         '1d ago', 'var(--accent-rose)'],
            ['Patterson','thank you',                '"kids love the yard, thanks again"','2d ago', 'var(--muted)'],
          ].map((r, i) => (
            <Box key={i} dashed style={{ padding: 10, marginTop: i ? 6 : 0, borderLeft: `3px solid ${r[4]}` }}>
              <div className="row between">
                <b style={{ fontSize: 13 }}>{r[0]}</b>
                <span className="tiny muted">{r[3]}</span>
              </div>
              <div className="tiny mono" style={{ marginTop: 2 }}>{r[1]}</div>
              <div className="tiny" style={{ marginTop: 4 }}>{r[2]}</div>
            </Box>
          ))}
        </div>

        <Box tan style={{ marginTop: 12, padding: 10 }}>
          <div className="tiny mono">✦ AI · JEN'S HVAC Q</div>
          <div className="tiny" style={{ marginTop: 4 }}>Called Alvarez HVAC (your trusted vendor) — they quoted $3,800 for same job last mo. Fair but high. Want me to intro?</div>
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            <Btn sm primary>intro Alvarez</Btn>
            <Btn sm>reply myself</Btn>
          </div>
        </Box>
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">VENDOR REC · to Webers</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Drafted reply:</div>

        <Box dashed style={{ marginTop: 8, padding: 10 }}>
          <div className="tiny" style={{ fontFamily: "'Caveat',cursive", fontSize: 14 }}>
            "Hey y'all — use Jose at Salcido Plumbing. 714-555-2211. Tell him I sent you. He's honest + fast. Fixed our kitchen last year."
          </div>
        </Box>

        <Box style={{ marginTop: 8, padding: 10 }}>
          <div className="tiny mono">INCLUDED IN VENDOR CARD</div>
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            <Img label="vcard" w={48} h={48} />
            <div>
              <b className="tiny">Jose Salcido · Plumbing</b>
              <div className="tiny muted">714-555-2211 · salcido.plumbing</div>
              <div className="tiny muted">5.0★ · used 14x · 0 complaints</div>
            </div>
          </div>
        </Box>

        <Btn primary block style={{ marginTop: 12 }}>send reply + vcard</Btn>
        <Btn block style={{ marginTop: 6 }}>also send Jose a heads-up text</Btn>

        <Box dashed style={{ marginTop: 12, padding: 8 }}>
          <div className="tiny mono">AUTO-LOG</div>
          <div className="tiny" style={{ marginTop: 4 }}>Recorded as "referred plumber · Webers." Jose credited w/ 15th use. Webers tagged "asked for vendor" (buyer signal).</div>
        </Box>
      </div>
    </Phone>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Client care</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Past clients text you forever. This turns vendor asks, refi questions, random panic moments into instant quality answers — logged for later.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">WHY IT MATTERS</div>
        <div className="tiny" style={{ marginTop: 4 }}>Every vendor ask is a signal. "Asked for plumber" = nesting. "Asked for HVAC" = capital project. Logged data.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V9 · PAST-CLIENT DASHBOARD ====================== */
function Post9_Dashboard() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Past clients · health" url="command.app/past-clients" style={{ width: 900 }}>
      <div className="hand-alt tiny">✦ 847 PAST CLIENTS · annual health</div>
      <div className="serif" style={{ fontSize: 28 }}>The whole book, in one glance</div>

      {/* Segments */}
      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        {[
          ['Raving fans',   '142', 'v. high touch',     '4+ referrals · active love', 'var(--accent-sage)'],
          ['Warm',          '384', 'normal cadence',    'good, but not evangelizing',  'var(--accent-tan)'],
          ['Drifting',      '211', 'needs revive',      'no response 18mo+',            'var(--accent-rose)'],
          ['Lost / cold',   '94',  'archive or revive', '36mo+ silence',                'var(--muted)'],
          ['Opt-out',       '16',  'respect',           'explicit "no contact"',        'var(--line)'],
        ].map((s, i) => (
          <Box key={i} style={{ padding: 10, flex: 1, borderTop: `4px solid ${s[4]}` }}>
            <div className="serif" style={{ fontSize: 24 }}>{s[1]}</div>
            <div className="hand-alt tiny">{s[0]}</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>{s[2]}</div>
            <div className="tiny" style={{ marginTop: 4 }}>{s[3]}</div>
          </Box>
        ))}
      </div>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        {/* Scorecard */}
        <Box style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">THIS QUARTER · HEALTH TRENDS</div>
          <div style={{ marginTop: 8 }}>
            {[
              ['Raving fans', '+12', 'up'],
              ['Drifting',     '-28', 'revived'],
              ['Referrals received',  '+11', 'strong'],
              ['Reviews published',   '+9',  'good'],
              ['Pop-bys completed',   '42/56','below target'],
              ['Anniversaries sent',   '18/18','perfect'],
              ['Tax packages sent',    '384/384','100%'],
            ].map((r, i) => (
              <div key={i} className="row between" style={{ padding: '6px 0', borderTop: '1px dashed var(--faint)', fontSize: 12 }}>
                <span>{r[0]}</span>
                <span><b>{r[1]}</b> <span className="tiny muted">· {r[2]}</span></span>
              </div>
            ))}
          </div>
        </Box>

        {/* ROI */}
        <Box tan style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">✦ CLIENT-FOR-LIFE ROI · this year</div>
          <div className="serif" style={{ fontSize: 34, marginTop: 4 }}>$612K</div>
          <div className="tiny muted">GCI from past-client & referral deals (68% of total)</div>

          <Box dashed style={{ marginTop: 10, padding: 8 }}>
            <div className="tiny mono">SPEND</div>
            <div className="tiny" style={{ marginTop: 4 }}>Pop-bys $2.8K · gifts $4.4K · mailers $1.2K · software (us) $600 · total $9K — <b>68x ROI</b></div>
          </Box>

          <Box dashed style={{ marginTop: 8, padding: 8 }}>
            <div className="tiny mono">IF YOU STOPPED TOMORROW</div>
            <div className="tiny" style={{ marginTop: 4 }}>Based on industry churn, you'd lose roughly $220K in referrals & repeat within 3 years. This is the machine that pays for itself 60x over.</div>
          </Box>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">The book</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>The only metric most agents track is closings. This is what's underneath — where repeat business really lives.</p>
    </div>
  </div>;
}

/* ====================== REGISTRATIONS ====================== */

window.PostCloseScreens = [
  { id: 'pc1', label: 'V1 · Lifecycle map',        caption: '9 scheduled moments per client · coverage heatmap across 847 past clients.',    Component: Post1_Lifecycle },
  { id: 'pc2', label: 'V2 · Monthly pop-by planner',caption: 'One gift · 14 stops · AI picks who · groups by geography · prints labels+route.', Component: Post2_PopBy },
  { id: 'pc3', label: 'V3 · Home anniversary',     caption: 'Video tribute · gift · equity pulse · on the day, auto.',                        Component: Post3_Anniversary },
  { id: 'pc4', label: 'V4 · Annual equity letter',  caption: 'The March letter past clients look forward to — real comps, soft close.',       Component: Post4_Equity },
  { id: 'pc5', label: 'V5 · Tax-ready package',    caption: 'Feb 1 · every client gets their full closing year of tax docs in one portal.',  Component: Post5_TaxSeason },
  { id: 'pc6', label: 'V6 · Life events radar',    caption: 'Birthdays · new babies · job changes · privacy-first opt-outs.',                Component: Post6_LifeEvents },
  { id: 'pc7', label: 'V7 · Move-spotting',        caption: 'Signal-based: who in your DB is actually considering moving · with privacy rails.', Component: Post7_MoveSpot },
  { id: 'pc8', label: 'V8 · Client care inbox',    caption: 'Vendor asks · refi Qs · panic moments · quality answers + logged data.',        Component: Post8_CareInbox },
  { id: 'pc9', label: 'V9 · Past-client dashboard', caption: '847 clients by tier · quarterly health · client-for-life ROI ($612K · 68x).',    Component: Post9_Dashboard },
];

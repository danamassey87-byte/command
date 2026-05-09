/* ============================================================
   V2 HI-FI · MARQUEE SCREENS
   Publisher-quality polish: proper typography, photography,
   color, spacing. These are the "shareable" versions.
   ============================================================ */

const hifiStyles = {
  page: {
    background: 'var(--paper-2)',
    padding: '40px 30px',
    minHeight: 800,
    fontFamily: 'Nunito Sans, sans-serif',
  },
  cardFrame: {
    background: 'var(--paper)',
    border: '1px solid rgba(42, 31, 23, 0.08)',
    boxShadow: '0 1px 3px rgba(42, 31, 23, 0.04), 0 20px 60px rgba(42, 31, 23, 0.08)',
    borderRadius: 6,
    overflow: 'hidden',
  },
};

function photoPlaceholder({ w = 200, h = 140, label = '', tint = '#8a987a', dark = false }) {
  return (
    <div style={{
      width: w,
      height: h,
      background: dark
        ? `linear-gradient(135deg, ${tint}33 0%, #2a1f17 100%)`
        : `linear-gradient(135deg, ${tint}55 0%, ${tint}22 50%, #f5f1ea 100%)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 10,
      color: dark ? 'rgba(245,241,234,0.5)' : 'rgba(42, 31, 23, 0.35)',
      fontFamily: 'Courier, monospace',
      letterSpacing: 1,
      flex: 'none',
    }}>
      {label || `[ ${w}×${h} ]`}
    </div>
  );
}

/* ====================== HIFI 1 · MORNING DASHBOARD ====================== */

function HiFi1_Morning() {
  return <div style={hifiStyles.page}>
    <div style={{ maxWidth: 1180, margin: '0 auto', ...hifiStyles.cardFrame }}>
      {/* Desktop chrome */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(42,31,23,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: '#fafaf7' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: 6, background: '#ff6057' }}></div>
          <div style={{ width: 11, height: 11, borderRadius: 6, background: '#ffbd2e' }}></div>
          <div style={{ width: 11, height: 11, borderRadius: 6, background: '#28c940' }}></div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Courier, monospace', fontSize: 11, color: '#8a807a' }}>command.app</div>
      </div>

      {/* Two-col layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 280px', minHeight: 680 }}>

        {/* Sidebar */}
        <div style={{ background: '#fafaf7', padding: '20px 12px', borderRight: '1px solid rgba(42,31,23,0.06)' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, letterSpacing: -0.4, color: '#2a1f17' }}>Command</div>
          <div style={{ fontSize: 10, color: '#8a807a', letterSpacing: 2, marginTop: 2 }}>DANA · MON APR 20</div>

          <div style={{ marginTop: 24 }}>
            {['Home','Prospect','CRM','Deals','Content','Email','Library','Money'].map((t, i) => (
              <div key={t} style={{
                padding: '8px 10px',
                marginBottom: 2,
                borderRadius: 4,
                background: i === 0 ? 'rgba(190, 123, 86, 0.12)' : 'transparent',
                color: i === 0 ? '#2a1f17' : '#6e665c',
                fontWeight: i === 0 ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
              }}>{t}</div>
            ))}
          </div>

          <div style={{ marginTop: 30, padding: '10px 10px', background: 'rgba(138, 152, 122, 0.15)', borderRadius: 4 }}>
            <div style={{ fontSize: 9, color: '#5d6a52', letterSpacing: 2, fontWeight: 600 }}>NOW</div>
            <div style={{ fontSize: 12, color: '#2a1f17', marginTop: 4, lineHeight: 1.4 }}>Listing appt · 47 Olive in 38 min</div>
          </div>
        </div>

        {/* Main */}
        <div style={{ padding: '30px 36px' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 44, color: '#2a1f17', letterSpacing: -1, lineHeight: 1 }}>
            Good morning, Dana.
          </div>
          <div style={{ fontSize: 14, color: '#6e665c', marginTop: 6, maxWidth: 500 }}>
            Three things before 11am · one deal moving · your week is tracking on pace.
          </div>

          {/* Stat strip */}
          <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
            {[
              ['$98k',  'GCI YTD',       '+9% plan',   '#7a9566'],
              ['4',     'Active deals',   '1 UC',       '#2a1f17'],
              ['14',    'Warm leads',    '+2 this wk', '#be7b56'],
              ['22',    'Conv/week',      'goal: 25',   '#2a1f17'],
            ].map((r, i) => (
              <div key={i} style={{ flex: 1, padding: '14px 16px', border: '1px solid rgba(42,31,23,0.08)', borderRadius: 4, background: '#fefdf9' }}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 32, color: r[3], letterSpacing: -0.5, lineHeight: 1 }}>{r[0]}</div>
                <div style={{ fontSize: 11, color: '#6e665c', marginTop: 6 }}>{r[1]}</div>
                <div style={{ fontSize: 10, color: '#8a807a', marginTop: 2 }}>{r[2]}</div>
              </div>
            ))}
          </div>

          {/* Today */}
          <div style={{ marginTop: 36 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17' }}>Today</div>
              <div style={{ fontSize: 11, color: '#8a807a', fontFamily: 'Courier, monospace', letterSpacing: 1 }}>3 BLOCKS · 8HR AWAKE</div>
            </div>

            {/* Timeline rail */}
            <div style={{ borderLeft: '2px solid rgba(42,31,23,0.08)', paddingLeft: 22, position: 'relative' }}>
              {[
                { t: '9:00',  tag: 'deep',       title: 'Power hour · 14 past-clients',       sub: 'AI has drafts ready · you approve/send', active: false },
                { t: '10:52', tag: 'drive',      title: 'Leave for 47 Olive',                   sub: '18 min · the Chens · listing pitch · $935', active: true },
                { t: '11:30', tag: 'onsite',     title: '47 Olive · listing appt',             sub: 'Pricing deck auto-loaded · Biscuit will be there', active: true },
                { t: '2:00',  tag: 'content',    title: 'Studio block · 2 pieces',              sub: 'IG Reel teaser · Yellow Wood · needs approval', active: false },
                { t: '4:30',  tag: 'flex',       title: 'Buyer showings · the Parks',          sub: '3 homes · route in maps', active: false },
              ].map((b, i) => (
                <div key={i} style={{ position: 'relative', paddingBottom: 18, paddingTop: i === 0 ? 0 : 4 }}>
                  <div style={{
                    position: 'absolute',
                    left: -29,
                    top: 3,
                    width: 10, height: 10,
                    borderRadius: 5,
                    background: b.active ? '#be7b56' : '#fefdf9',
                    border: `2px solid ${b.active ? '#be7b56' : 'rgba(42,31,23,0.15)'}`,
                  }}></div>
                  <div style={{ fontSize: 11, color: '#8a807a', fontFamily: 'Courier, monospace', letterSpacing: 1 }}>
                    {b.t} · {b.tag.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 15, color: '#2a1f17', fontWeight: b.active ? 600 : 500, marginTop: 2 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: '#6e665c', marginTop: 2 }}>{b.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Needs you strip */}
          <div style={{ marginTop: 28, padding: '16px 20px', background: 'rgba(176, 106, 115, 0.08)', borderLeft: '3px solid #b06a73', borderRadius: 2 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#7a4048', fontWeight: 600 }}>NEEDS YOU · NOT AUTOMATED</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 19, marginTop: 6, color: '#2a1f17' }}>
              Ashley Chen's brother called — wants your number.
            </div>
            <div style={{ fontSize: 12, color: '#6e665c', marginTop: 4 }}>This is a real intro. Command won't touch it. Your call back before the Chens appt.</div>
          </div>

        </div>

        {/* Right rail */}
        <div style={{ background: '#fdfbf5', padding: '30px 24px', borderLeft: '1px solid rgba(42,31,23,0.06)' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: '#2a1f17' }}>What Command did overnight</div>
          <div style={{ fontSize: 11, color: '#8a807a', marginTop: 4, marginBottom: 18 }}>You'll see this at 7am every day.</div>

          {[
            { ic:'📮', t:'Printed + shipped 100 flyers', sub:'Vistaprint · arrives Thu · 2222 Yellow Wood OH', cost:'$34.20' },
            { ic:'🎥', t:'Scored 4 reel drafts',          sub:'Top-rated queued for 6pm tonight · Yellow Wood', cost:'' },
            { ic:'📊', t:'Pulled March market recap',     sub:'Austin metro · draft blog 720w · awaiting you', cost:'' },
            { ic:'🔎', t:'Ran 23 buyer searches',          sub:'8 new matches · top 3 worth your eye', cost:'' },
            { ic:'✉️', t:'Drafted 14 power-hour notes',  sub:'Personalized · ready for 9am', cost:'' },
            { ic:'🔁', t:'Synced Lofty · 2 updates',      sub:'Kim Park reply · new smart list "springers"', cost:'' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px dashed rgba(42,31,23,0.1)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 14 }}>{r.ic}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#2a1f17', fontWeight: 500 }}>{r.t}</div>
                  <div style={{ fontSize: 11, color: '#6e665c', marginTop: 2 }}>{r.sub}</div>
                </div>
                {r.cost && <span style={{ fontSize: 10, color: '#8a807a', fontFamily: 'Courier, monospace' }}>{r.cost}</span>}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 28, padding: '12px 14px', background: 'rgba(138, 152, 122, 0.12)', borderRadius: 4 }}>
            <div style={{ fontSize: 10, color: '#5d6a52', letterSpacing: 2, fontWeight: 600 }}>YOUR HOURS</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, color: '#2a1f17', marginTop: 4, lineHeight: 1 }}>4.2 saved</div>
            <div style={{ fontSize: 11, color: '#6e665c', marginTop: 4 }}>vs. your average week last year</div>
          </div>
        </div>

      </div>
    </div>

    <div style={{ maxWidth: 1180, margin: '16px auto 0', fontSize: 10, color: '#8a807a', fontFamily: 'Courier, monospace', letterSpacing: 1 }}>
      HI-FI V2 · MORNING DASHBOARD · 1180×680
    </div>
  </div>;
}

/* ====================== HIFI 2 · LISTING PRESENT ====================== */

function HiFi2_Deck() {
  return <div style={hifiStyles.page}>
    <div style={{ maxWidth: 1180, margin: '0 auto', ...hifiStyles.cardFrame }}>
      {/* Pitch deck slide */}
      <div style={{ padding: 50, background: '#fefdf9', minHeight: 620, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 40, alignItems: 'center' }}>
        {/* Left · content */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#be7b56', fontWeight: 600 }}>THE CHENS · 47 OLIVE STREET · PRICING</div>

          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 72, color: '#2a1f17', letterSpacing: -1.5, lineHeight: 0.95, marginTop: 14 }}>
            $935,000
          </div>

          <div style={{ fontSize: 15, color: '#6e665c', marginTop: 18, maxWidth: 460, lineHeight: 1.5 }}>
            Priced against your strongest six comparables in a 0.8-mile radius, adjusted for the backyard, updated primary, and Olive-street quiet premium.
          </div>

          <div style={{ marginTop: 32, display: 'flex', gap: 30 }}>
            {[
              ['8–14', 'days on market'],
              ['1.8%', 'within optimal band'],
              ['102%', 'expected sale-to-list'],
            ].map(([n, l], i) => (
              <div key={i}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: '#2a1f17', letterSpacing: -0.5, lineHeight: 1 }}>{n}</div>
                <div style={{ fontSize: 11, color: '#6e665c', marginTop: 6, letterSpacing: 0.5 }}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 40, padding: '14px 18px', background: '#f5f1ea', borderLeft: '3px solid #be7b56' }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#8a807a', fontWeight: 600 }}>IF WE GO TO $949</div>
            <div style={{ fontSize: 13, color: '#2a1f17', marginTop: 4, lineHeight: 1.4 }}>
              Expected DOM doubles to 18–26. 58% likelihood of one price reduction. Sale-to-list drops to ~98%.
            </div>
          </div>
        </div>

        {/* Right · comp visualization */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#8a807a', fontWeight: 600, marginBottom: 14 }}>YOUR COMPS · LAST 90 DAYS</div>

          {[
            { addr: '51 Olive St',      px: '$918k', dom: '12d', dist: '0.1mi', strength: 95 },
            { addr: '38 Sycamore Ln',  px: '$945k', dom: '9d',  dist: '0.4mi', strength: 88 },
            { addr: '411 Kimball',      px: '$922k', dom: '18d', dist: '0.6mi', strength: 82 },
            { addr: '105 Pecan',        px: '$929k', dom: '11d', dist: '0.5mi', strength: 79 },
            { addr: '228 Elm',           px: '$958k', dom: '22d', dist: '0.3mi', strength: 76 },
            { addr: '19 Oak Grove',     px: '$901k', dom: '14d', dist: '0.7mi', strength: 71 },
          ].map((c, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, padding: '9px 0', borderTop: i ? '1px dashed rgba(42,31,23,0.1)' : 'none', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, color: '#2a1f17' }}>{c.addr}</div>
                <div style={{ height: 3, background: 'rgba(190, 123, 86, 0.15)', marginTop: 4, borderRadius: 1.5, width: '100%' }}>
                  <div style={{ height: '100%', width: `${c.strength}%`, background: '#be7b56', borderRadius: 1.5 }}></div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#2a1f17', fontFamily: 'Courier, monospace', width: 50, textAlign: 'right' }}>{c.px}</div>
              <div style={{ fontSize: 11, color: '#8a807a', fontFamily: 'Courier, monospace', width: 30 }}>{c.dom}</div>
              <div style={{ fontSize: 11, color: '#8a807a', fontFamily: 'Courier, monospace', width: 32 }}>{c.dist}</div>
            </div>
          ))}

          <div style={{ marginTop: 20, padding: '10px 12px', background: 'rgba(138, 152, 122, 0.1)', fontSize: 11, color: '#5d6a52', lineHeight: 1.5 }}>
            <b style={{ fontWeight: 600 }}>Our position:</b> below Elm, above Oak Grove — the tight-range band these homes sold in.
          </div>
        </div>
      </div>

      {/* Slide footer */}
      <div style={{ padding: '14px 50px', borderTop: '1px solid rgba(42,31,23,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafaf7' }}>
        <div style={{ fontSize: 11, color: '#8a807a', fontFamily: 'Courier, monospace', letterSpacing: 1 }}>12 / 48 · POSITIONING</div>
        <div style={{ display: 'flex', gap: 18, fontSize: 11, color: '#8a807a' }}>
          <span>◉ eye-track: 4.2s</span>
          <span>◉ Ashley hesitated</span>
          <span>◉ Miguel nodded</span>
        </div>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, color: '#2a1f17' }}>Dana Reeves · Compass</div>
      </div>
    </div>

    <div style={{ maxWidth: 1180, margin: '16px auto 0', fontSize: 10, color: '#8a807a', fontFamily: 'Courier, monospace', letterSpacing: 1 }}>
      HI-FI V2 · LISTING APPT SLIDE 12 · PRICING
    </div>
  </div>;
}

/* ====================== HIFI 3 · DEAL COCKPIT ====================== */

function HiFi3_Deal() {
  return <div style={hifiStyles.page}>
    <div style={{ maxWidth: 1180, margin: '0 auto', ...hifiStyles.cardFrame }}>

      {/* Header hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', minHeight: 260, background: '#fefdf9' }}>
        <div style={{ padding: '30px 40px' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, color: '#be7b56', fontWeight: 600 }}>UNDER CONTRACT · DAY 9 OF 30 · BUYER SIDE</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 42, color: '#2a1f17', marginTop: 10, letterSpacing: -0.8, lineHeight: 1 }}>
            2222 Yellow Wood Lane
          </div>
          <div style={{ fontSize: 14, color: '#6e665c', marginTop: 6 }}>
            Elgin Home Farm · The Mitchells · closing Thu May 7
          </div>

          <div style={{ display: 'flex', gap: 30, marginTop: 26 }}>
            {[
              ['$645,000', 'contract price',       ''],
              ['$19,350',  'your GCI · 3%',         '·'],
              ['21 days',  'to close',              ''],
              ['11 / 14',  'milestones complete',   '79%'],
            ].map((r, i) => (
              <div key={i}>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: '#2a1f17', letterSpacing: -0.3, lineHeight: 1 }}>{r[0]}</div>
                <div style={{ fontSize: 10, color: '#8a807a', letterSpacing: 1, marginTop: 4 }}>{r[1].toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero photo tile */}
        <div style={{ background: 'linear-gradient(135deg, #be7b56 0%, #2a1f17 100%)', display: 'flex', alignItems: 'flex-end', padding: 22 }}>
          <div style={{ color: 'rgba(245, 241, 234, 0.85)' }}>
            <div style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(245, 241, 234, 0.55)', fontWeight: 600 }}>BUYERS</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#f5f1ea', marginTop: 4 }}>Joel + Sara Mitchell</div>
            <div style={{ fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
              First-time buyers · Joel works remote for a fintech · Sara is due in July · they chose this house for the yard.
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: '30px 40px', borderTop: '1px solid rgba(42,31,23,0.06)', background: '#fdfbf5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 22 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17' }}>Path to close</div>
          <div style={{ fontSize: 10, color: '#8a807a', letterSpacing: 1, fontFamily: 'Courier, monospace' }}>AUTO-TRACKED FROM CONTRACT PDF · 14 DEADLINES</div>
        </div>

        {/* Horizontal timeline bar */}
        <div style={{ position: 'relative', height: 46 }}>
          {/* Track */}
          <div style={{ position: 'absolute', top: 20, left: 0, right: 0, height: 2, background: 'rgba(42,31,23,0.1)' }}></div>
          {/* Filled portion */}
          <div style={{ position: 'absolute', top: 20, left: 0, width: '30%', height: 2, background: '#7a9566' }}></div>

          {[
            { pct: 0,   lbl: 'Signed',        dt: 'Apr 15',  done: true },
            { pct: 7,   lbl: 'EMD',           dt: 'Apr 16',  done: true },
            { pct: 23,  lbl: 'Inspection',    dt: 'Apr 22',  done: true, now: true },
            { pct: 30,  lbl: 'Resp deadline', dt: 'Apr 25',  done: false, hot: true },
            { pct: 50,  lbl: 'Appraisal',     dt: 'Apr 30',  done: false },
            { pct: 68,  lbl: 'Loan contg',    dt: 'May 5',    done: false },
            { pct: 86,  lbl: 'Walkthrough',   dt: 'May 6',    done: false },
            { pct: 100, lbl: 'Close',         dt: 'May 7',    done: false },
          ].map((m, i) => (
            <div key={i} style={{ position: 'absolute', left: `${m.pct}%`, top: 0, transform: m.pct > 90 ? 'translateX(-100%)' : m.pct < 5 ? 'translateX(0)' : 'translateX(-50%)', textAlign: 'center', fontSize: 10 }}>
              <div style={{
                width: m.now ? 12 : 10,
                height: m.now ? 12 : 10,
                borderRadius: 6,
                background: m.done ? '#7a9566' : m.hot ? '#b06a73' : '#fefdf9',
                border: `2px solid ${m.done ? '#7a9566' : m.hot ? '#b06a73' : 'rgba(42,31,23,0.2)'}`,
                margin: `${m.now ? 14 : 15}px auto 0`,
              }}></div>
              <div style={{ marginTop: 6, color: '#6e665c', fontSize: 10 }}>{m.lbl}</div>
              <div style={{ color: '#8a807a', fontFamily: 'Courier, monospace', fontSize: 10, marginTop: 1 }}>{m.dt}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid rgba(42,31,23,0.06)' }}>
        {/* Left · needs you */}
        <div style={{ padding: '24px 30px', borderRight: '1px solid rgba(42,31,23,0.06)' }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#7a4048', fontWeight: 600 }}>NEEDS YOU · TODAY</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17', marginTop: 8, lineHeight: 1.2 }}>
            Inspector found 3 items. Mitchells want to know how to respond.
          </div>

          <div style={{ marginTop: 14 }}>
            {[
              ['HVAC unit · 2009 · at end of life',    '~$4,800 replace',  'medium'],
              ['Subpanel · aluminum wiring in kitchen', '~$2,200 remedy',  'high'],
              ['Water heater · starting to rust',        'cosmetic',        'low'],
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: i ? '1px dashed rgba(42,31,23,0.1)' : 'none' }}>
                <span style={{ fontSize: 12, color: '#2a1f17' }}>{r[0]}</span>
                <span style={{ fontSize: 11, color: '#6e665c', fontFamily: 'Courier, monospace' }}>{r[1]}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, padding: '14px 16px', background: 'rgba(190, 123, 86, 0.08)', borderRadius: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#be7b56', fontWeight: 600 }}>COMMAND'S TAKE</div>
            <div style={{ fontSize: 12, color: '#2a1f17', marginTop: 6, lineHeight: 1.5 }}>
              Ask for $5k credit at close (focus on subpanel + HVAC split). Seller list-price has 3% cushion. Sara's pregnancy + remote loan = don't lose this deal over $2k. I'd push for $5k, settle at $3.5k.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={{ padding: '6px 12px', background: '#2a1f17', color: '#fefdf9', border: 'none', fontSize: 12, borderRadius: 3, cursor: 'pointer', fontWeight: 500 }}>draft response</button>
              <button style={{ padding: '6px 12px', background: 'transparent', color: '#2a1f17', border: '1px solid #2a1f17', fontSize: 12, borderRadius: 3, cursor: 'pointer' }}>call Mitchells</button>
            </div>
          </div>
        </div>

        {/* Right · vendors + autopilot */}
        <div style={{ padding: '24px 30px' }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: '#5d6a52', fontWeight: 600 }}>ON AUTOPILOT</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17', marginTop: 8 }}>
            Command is managing 7 things.
          </div>

          <div style={{ marginTop: 14 }}>
            {[
              ['Appraisal coordination',       'scheduled Wed 9am',      'Bright'],
              ['Loan docs follow-up',           'Tom Lin pinged Mon',     'lender'],
              ['Title prep',                     'commitment ordered',     'First American'],
              ['Utility transfer reminders',    '2 of 4 done',           'Mitchells'],
              ['Home warranty quote',           'sent to Mitchells',      'one-guard'],
              ['Insurance intro',                'scheduled Thu',          'Allstate'],
              ['Close gift',                     'local honey + bread',    'ordered'],
            ].map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 10, padding: '7px 0', borderTop: i ? '1px dashed rgba(42,31,23,0.08)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#2a1f17' }}>{r[0]}</span>
                <span style={{ fontSize: 10, color: '#6e665c', fontFamily: 'Courier, monospace' }}>{r[1]}</span>
                <span style={{ fontSize: 10, color: '#8a807a' }}>{r[2]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>

    <div style={{ maxWidth: 1180, margin: '16px auto 0', fontSize: 10, color: '#8a807a', fontFamily: 'Courier, monospace', letterSpacing: 1 }}>
      HI-FI V2 · DEAL COCKPIT · UNDER CONTRACT
    </div>
  </div>;
}

/* ====================== HIFI 4 · OPEN HOUSE CONTROL ====================== */

function HiFi4_OpenHouse() {
  return <div style={hifiStyles.page}>
    <div style={{ maxWidth: 1180, margin: '0 auto', ...hifiStyles.cardFrame }}>

      {/* Header */}
      <div style={{ padding: '30px 40px 24px', background: 'linear-gradient(180deg, #fefdf9 0%, #faf6ed 100%)', borderBottom: '1px solid rgba(42,31,23,0.06)' }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: '#be7b56', fontWeight: 600 }}>OPEN HOUSE · SATURDAY APR 26 · 1–3 PM</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 10 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 42, color: '#2a1f17', letterSpacing: -0.8, lineHeight: 1 }}>
            2222 Yellow Wood Lane
          </div>
          <div style={{ fontSize: 14, color: '#6e665c' }}>$649,000 · 4 / 3 · 2,840 sf</div>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
          {[
            ['☀ 68°',   'Sat 1pm',       'high of 74',     'ok'],
            ['100',     'flyers',         'arriving Thu',   'ok'],
            ['Wed · Fri · Sat',  'social posts',      'scheduled',     'ok'],
            ['Fri 5pm', 'lockbox',       'install',        'ok'],
            ['6 · 8',   'signs · direc.', 'Sat 10am',       'ok'],
          ].map(([h, l, s], i) => (
            <div key={i} style={{ flex: 1, padding: '12px 14px', background: '#fefdf9', borderRadius: 4, border: '1px solid rgba(42,31,23,0.06)' }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: '#2a1f17', lineHeight: 1 }}>{h}</div>
              <div style={{ fontSize: 10, letterSpacing: 1, color: '#8a807a', marginTop: 6 }}>{l.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: '#7a9566', marginTop: 3 }}>✓ {s}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', padding: '0' }}>

        {/* Left · timeline + Checklist */}
        <div style={{ padding: '28px 36px', borderRight: '1px solid rgba(42,31,23,0.06)' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17' }}>The week of</div>

          <div style={{ marginTop: 16 }}>
            {[
              { d: 'Mon',  pre: 'today',     items: ['Call Javier · photography Wed',     'Confirm cleaning · Thu 9am'] },
              { d: 'Tue',  pre: 'staging',   items: ['Staging install · Studio Maple 11am (auto)',  'Blotato draft IG teaser · approve'] },
              { d: 'Wed',  pre: 'photos',    items: ['Photography 9am-12pm · Javier',                'Blotato IG/FB/TT post 6pm · teaser'] },
              { d: 'Thu',  pre: 'flyers',    items: ['Flyers arrive · Vistaprint morning',            'Listing appt · 47 Olive 11am (separate)'] },
              { d: 'Fri',  pre: 'sign day',   items: ['Sign + lockbox 3pm/5pm (BoldSign)',            'Weather check 6pm · flag Sat'] },
              { d: 'Sat',  pre: 'OH day',    items: ['OH signs out 10am',                             'OPEN HOUSE 1–3pm',  'OH signs in 4pm',  'Follow-up drafts 6pm'] },
            ].map((r, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '56px 1fr', gap: 16, padding: '12px 0', borderTop: i ? '1px dashed rgba(42,31,23,0.08)' : 'none' }}>
                <div>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: i === 5 ? '#be7b56' : '#2a1f17', letterSpacing: -0.2, lineHeight: 1 }}>{r.d}</div>
                  <div style={{ fontSize: 10, color: '#8a807a', letterSpacing: 1, marginTop: 4 }}>{r.pre.toUpperCase()}</div>
                </div>
                <div>
                  {r.items.map((it, j) => (
                    <div key={j} style={{ fontSize: 12, color: '#2a1f17', padding: '3px 0' }}>· {it}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right · live kiosk preview + QR */}
        <div style={{ padding: '28px 30px', background: '#fdfbf5' }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17' }}>Visitor experience</div>
          <div style={{ fontSize: 11, color: '#8a807a', marginTop: 4 }}>What they see when they scan the QR at the door</div>

          {/* Phone preview */}
          <div style={{ marginTop: 18, padding: 16, background: '#2a1f17', borderRadius: 22, width: 260, margin: '18px auto' }}>
            <div style={{ background: '#fefdf9', borderRadius: 14, padding: '18px 16px', minHeight: 360 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: '#8a807a', fontWeight: 600 }}>WELCOME TO</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17', lineHeight: 1.05, marginTop: 4 }}>
                2222 Yellow Wood Lane
              </div>
              <div style={{ fontSize: 11, color: '#6e665c', marginTop: 4 }}>$649k · 4 / 3 · 2,840 sf</div>

              <div style={{ marginTop: 14, padding: 10, background: '#f5f1ea', borderRadius: 4 }}>
                <div style={{ fontSize: 9, letterSpacing: 1, color: '#8a807a', fontWeight: 600 }}>QUICK · 30 SECONDS</div>
                <div style={{ fontSize: 12, color: '#2a1f17', marginTop: 6 }}>Your name + mobile</div>
                <div style={{ background: '#fefdf9', height: 28, borderRadius: 3, marginTop: 6, border: '1px solid #e8dfce' }}></div>
                <div style={{ fontSize: 12, color: '#2a1f17', marginTop: 8 }}>Buying timeline</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                  {['just looking','3-6mo','this yr','already working w/ agent'].map(x => (
                    <div key={x} style={{ fontSize: 9, padding: '4px 6px', background: '#fefdf9', border: '1px solid #e8dfce', borderRadius: 2 }}>{x}</div>
                  ))}
                </div>
              </div>

              <button style={{ marginTop: 14, width: '100%', padding: '10px', background: '#be7b56', color: '#fefdf9', border: 'none', borderRadius: 3, fontSize: 12, fontWeight: 600 }}>Unlock tour info</button>

              <div style={{ fontSize: 9, color: '#8a807a', marginTop: 10, textAlign: 'center', lineHeight: 1.4 }}>
                Dana Reeves · Compass<br/>License #12345 · disclaimer
              </div>
            </div>
          </div>

          <div style={{ padding: '12px 14px', background: '#fefdf9', borderRadius: 4, border: '1px solid rgba(42,31,23,0.06)', marginTop: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, color: '#5d6a52', fontWeight: 600 }}>LAST OH · FIRST 15 MIN</div>
            <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
              <div><div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17' }}>28</div><div style={{ fontSize: 10, color: '#8a807a' }}>visitors</div></div>
              <div><div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#2a1f17' }}>24</div><div style={{ fontSize: 10, color: '#8a807a' }}>signed in</div></div>
              <div><div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: '#be7b56' }}>6</div><div style={{ fontSize: 10, color: '#8a807a' }}>warm leads</div></div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div style={{ maxWidth: 1180, margin: '16px auto 0', fontSize: 10, color: '#8a807a', fontFamily: 'Courier, monospace', letterSpacing: 1 }}>
      HI-FI V2 · OPEN HOUSE CONTROL · WEEK-OF VIEW
    </div>
  </div>;
}

window.HiFiScreens = [
  { id: 'hf1', label: 'V1 · Morning dashboard',     caption: 'Publisher-quality hero page: 3-column layout, real typography, what-Command-did-overnight rail.', Component: HiFi1_Morning },
  { id: 'hf2', label: 'V2 · Listing appt · slide 12', caption: 'Inside the pitching deck: positioning slide with comp bars, eye-track overlay at the bottom.',   Component: HiFi2_Deck },
  { id: 'hf3', label: 'V3 · Deal cockpit · UC',      caption: 'Under-contract command center: horizontal timeline, NEEDS YOU · ON AUTOPILOT split.',            Component: HiFi3_Deal },
  { id: 'hf4', label: 'V4 · Open house control',    caption: 'Week-of view · visitor experience mock · live kiosk preview · last-OH stats.',                  Component: HiFi4_OpenHouse },
];

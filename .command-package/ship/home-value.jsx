/* ============================================================
   HOME-VALUE MICROSITE · SELLER LEAD-GEN
   Public landing · instant valuation · drip editor · dashboard
   CMA reconcile · embeddable widget · funnel health
   ============================================================ */

/* ---------------- shared bits ---------------- */
function SiteFrame({ url, children }) {
  return <div style={{ background:'var(--paper-2)', border:'1px solid var(--line)', boxShadow:'0 2px 0 var(--faint)', overflow:'hidden' }}>
    <div className="row" style={{ gap: 6, padding:'6px 10px', background:'#f4efe7', borderBottom:'1px solid var(--line)', alignItems:'center' }}>
      <span style={{ width: 9, height: 9, borderRadius:'50%', background:'#e07a6e' }} />
      <span style={{ width: 9, height: 9, borderRadius:'50%', background:'#e8c069' }} />
      <span style={{ width: 9, height: 9, borderRadius:'50%', background:'#8b9a7b' }} />
      <div className="mono" style={{ flex: 1, textAlign:'center', fontSize: 10, color:'var(--muted)' }}>🔒 {url}</div>
    </div>
    <div style={{ background:'#fffdf7' }}>{children}</div>
  </div>;
}

const VALUATION_ADDRESS = '742 Mesquite Lane, Oak Park, Phoenix AZ 85032';


/* ============================================================
 * V1 · PUBLIC LANDING (hero · value prop · form)
 * ============================================================ */
function HV1_Landing() {
  return <SiteFrame url="worth.martinezgroup.co">
    <div style={{ padding:'30px 40px 40px', minHeight: 620, background:'linear-gradient(180deg, #fffdf7 0%, #f6efe2 100%)' }}>
      {/* mini-nav */}
      <div className="row between center" style={{ marginBottom: 34 }}>
        <div className="row" style={{ gap: 8, alignItems:'center' }}>
          <div style={{ width: 28, height: 28, background:'var(--ink)', color:'var(--paper)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Cormorant Garamond',serif", fontSize: 18 }}>m</div>
          <span className="serif" style={{ fontSize: 16 }}>Martinez Group</span>
          <span className="tiny muted">· real estate, honestly</span>
        </div>
        <div className="row" style={{ gap: 18 }}>
          <span className="tiny">About</span>
          <span className="tiny">Listings</span>
          <span className="tiny" style={{ fontWeight: 600 }}>Home value ✦</span>
          <span className="tiny">Contact</span>
        </div>
      </div>

      <div className="row" style={{ gap: 40, alignItems:'flex-start' }}>
        <div style={{ flex: 1.1 }}>
          <div className="hand-alt muted" style={{ fontSize: 12, letterSpacing:'0.1em' }}>↓ FREE · NO SIGN-UP · INSTANT</div>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize: 46, lineHeight: 1.05, margin:'8px 0 14px', fontWeight: 500 }}>What's your home<br/>actually worth today?</h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color:'var(--ink)', maxWidth: 440 }}>Three estimates from the major AVMs, plus Dana's neighborhood-adjusted read — with the comps we used. No drip unless you ask. No calls unless you ask.</p>

          {/* Trust row */}
          <div className="row" style={{ gap: 18, marginTop: 18, alignItems:'center' }}>
            <div className="col"><span className="serif" style={{ fontSize: 26 }}>217</span><span className="tiny muted">homes sold · Oak Park</span></div>
            <div style={{ width: 1, height: 28, background:'var(--line)' }} />
            <div className="col"><span className="serif" style={{ fontSize: 26 }}>101.8%</span><span className="tiny muted">avg list-to-sale · 2024</span></div>
            <div style={{ width: 1, height: 28, background:'var(--line)' }} />
            <div className="col"><span className="serif" style={{ fontSize: 26 }}>14d</span><span className="tiny muted">median DOM</span></div>
          </div>

          {/* why different */}
          <div className="col" style={{ gap: 4, marginTop: 24 }}>
            {['Three estimates, not one · you see the range',
              'Dana\'s human adjust · "pool but north-facing = −$8k"',
              'Comps shown · not hidden · with photos',
              'Opt-in to updates · one click to unsubscribe',
            ].map((t,i)=>(
              <div key={i} className="row" style={{ gap: 8, alignItems:'center' }}>
                <span style={{ width: 14, height: 14, border:'1px solid var(--ink)', background:'var(--accent-sage)' }} />
                <span className="tiny">{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* form */}
        <Box style={{ flex: 1, padding: 22, background:'#fff', boxShadow:'0 4px 0 var(--faint)' }}>
          <div className="hand-alt" style={{ fontSize: 15 }}>✦ Get your range in 90 seconds</div>
          <div className="col" style={{ gap: 12, marginTop: 14 }}>
            <div className="col" style={{ gap: 4 }}>
              <span className="tiny mono muted" style={{ fontSize: 9, letterSpacing:'0.1em' }}>ADDRESS</span>
              <div className="row" style={{ gap: 6, alignItems:'center', padding: 10, border:'1px solid var(--ink)', background:'var(--paper-2)' }}>
                <span style={{ fontSize: 13 }}>742 Mesquite Ln, Oak Park</span>
                <Chip sm sage style={{ marginLeft:'auto', fontSize: 9 }}>✓ found</Chip>
              </div>
              <span className="tiny muted" style={{ fontSize: 10 }}>auto-complete via MLS + USPS</span>
            </div>

            <div className="row" style={{ gap: 8 }}>
              <div className="col grow" style={{ gap: 4 }}>
                <span className="tiny mono muted" style={{ fontSize: 9 }}>TIMEFRAME</span>
                <div className="row" style={{ gap: 4 }}>
                  {['< 3 mo','3–6','6–12','Just curious'].map((t,i)=>(
                    <Chip key={i} sm filled={i===1} style={i===1?{background:'var(--accent-tan)', color:'var(--paper)', border:'none'}:{}}>{t}</Chip>
                  ))}
                </div>
              </div>
            </div>

            <div className="col" style={{ gap: 4 }}>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>EMAIL · so we can send the full report</span>
              <div style={{ padding: 10, border:'1px solid var(--line)', background:'var(--paper-2)', fontSize: 13 }}>you@example.com</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <div className="col grow" style={{ gap: 4 }}>
                <span className="tiny mono muted" style={{ fontSize: 9 }}>NAME</span>
                <div style={{ padding: 10, border:'1px solid var(--line)', background:'var(--paper-2)', fontSize: 13, color:'var(--muted)' }}>First and last</div>
              </div>
              <div className="col grow" style={{ gap: 4 }}>
                <span className="tiny mono muted" style={{ fontSize: 9 }}>PHONE · optional</span>
                <div style={{ padding: 10, border:'1px solid var(--line)', background:'var(--paper-2)', fontSize: 13, color:'var(--muted)' }}>(480) — —</div>
              </div>
            </div>

            <label className="row" style={{ gap: 6, alignItems:'flex-start', fontSize: 11, color:'var(--muted)', marginTop: 4 }}>
              <input type="checkbox" defaultChecked style={{ marginTop: 3 }} />
              <span>Yes, send me monthly neighborhood updates. Unsubscribe anytime · one click.</span>
            </label>

            <Btn primary block style={{ fontSize: 14, padding:'12px' }}>show my home value →</Btn>
            <span className="tiny muted" style={{ textAlign:'center' }}>no credit card · no sign-in · no spam</span>
          </div>
        </Box>
      </div>

      {/* Sub-band · recent */}
      <Hr />
      <div className="hand-alt muted" style={{ fontSize: 11, letterSpacing:'0.12em' }}>RECENT IN OAK PARK</div>
      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        {[
          ['47 Oak Dr.',   '4 bd · 2 ba · 2,180sf', '$825k', 'listed'],
          ['102 Mesquite', '3 bd · 2 ba · 1,940sf', '$712k', 'sold'],
          ['88 Sienna',    '4 bd · 3 ba · 2,560sf', '$955k', 'pending'],
          ['21 Palo Verde','3 bd · 2 ba · 1,780sf', '$685k', 'sold'],
        ].map(([a,b,p,s],i)=>(
          <Box key={i} className="grow" style={{ padding: 10 }}>
            <div className="row between"><span className="tiny" style={{ fontWeight: 600 }}>{a}</span><Chip sm>{s}</Chip></div>
            <span className="tiny muted">{b}</span>
            <span className="serif" style={{ fontSize: 18 }}>{p}</span>
          </Box>
        ))}
      </div>
    </div>
  </SiteFrame>;
}


/* ============================================================
 * V2 · INSTANT VALUATION RESULT
 * ============================================================ */
function HV2_Result() {
  return <SiteFrame url="worth.martinezgroup.co/result/742-mesquite">
    <div style={{ padding:'24px 40px 40px', background:'#fffdf7' }}>
      <div className="hand-neat tiny muted">↓ Your range is ready, Jen</div>
      <div className="serif" style={{ fontSize: 30, marginTop: 4 }}>{VALUATION_ADDRESS}</div>
      <div className="tiny muted">4 bd · 2.5 ba · 2,240 sf · built 2005 · pool · 0.22 ac</div>

      {/* Big number + range */}
      <Box style={{ marginTop: 16, padding: 22, background:'#fff' }}>
        <div className="row between" style={{ alignItems:'flex-end' }}>
          <div>
            <span className="hand-alt muted tiny" style={{ letterSpacing:'0.15em' }}>↓ MOST LIKELY SALE RANGE TODAY</span>
            <div className="serif" style={{ fontSize: 48, lineHeight: 1 }}>$792k <span className="muted">—</span> $828k</div>
            <div className="tiny muted">midpoint $810k · ±2.2% confidence</div>
          </div>
          <div className="col" style={{ alignItems:'flex-end' }}>
            <Chip sm sage>GOOD TIME TO LIST</Chip>
            <span className="tiny muted" style={{ marginTop: 4 }}>inventory low · rates stable</span>
          </div>
        </div>

        {/* range bar */}
        <div style={{ position:'relative', marginTop: 20, height: 46 }}>
          <div style={{ position:'absolute', left: 0, right: 0, top: 18, height: 10, background:'linear-gradient(90deg, rgba(185,151,130,0.2) 0%, var(--accent-tan) 30%, var(--accent-sage) 70%, rgba(139,154,123,0.2) 100%)' }} />
          {[['Zillow','$784k','18%','ink'],['Redfin','$801k','43%','tan'],['Realtor.com','$818k','65%','tan'],['Dana\'s adjust','$810k','52%','sage']].map(([l,v,p,c],i)=>(
            <div key={i} style={{ position:'absolute', left: p, top: i%2===0?-2:30, transform:'translateX(-50%)', textAlign:'center' }}>
              <div style={{ fontSize: 9, fontFamily:"'IBM Plex Mono',monospace", color:'var(--muted)' }}>{l.toUpperCase()}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
              <div style={{ width: 2, height: 10, background:`var(--accent-${c})`, margin: '2px auto' }} />
            </div>
          ))}
        </div>
      </Box>

      <div className="row" style={{ gap: 14, marginTop: 14 }}>
        {/* Comps */}
        <Box className="grow" style={{ padding: 14 }}>
          <div className="row between">
            <span className="hand-alt" style={{ fontSize: 14 }}>✦ Top 6 comps · within 0.4 mi</span>
            <span className="tiny muted">see all 23</span>
          </div>
          <div className="col" style={{ gap: 4, marginTop: 8 }}>
            {[
              ['188 Mesquite',   '4/2.5 · 2,180sf',  '$814k','sold 14d ago','+0.3mi'],
              ['22 Palo Verde',  '4/3 · 2,340sf',    '$838k','sold 28d',    '+0.2mi'],
              ['55 Oak Dr',      '3/2 · 2,040sf',    '$768k','sold 41d',    '+0.3mi'],
              ['9 Sienna',        '4/2.5 · 2,210sf',  '$792k','sold 62d',    '+0.4mi'],
              ['102 Cedar',      '4/3 · 2,380sf · pool','$831k','sold 38d', '+0.3mi'],
              ['47 Oak',          '4/2 · 2,180sf',    '$825k','listed now',  '+0.4mi'],
            ].map(([a,b,p,st,d],i)=>(
              <div key={i} className="row" style={{ gap: 8, padding: 6, background:'var(--paper-2)', border:'1px solid var(--line)', fontSize: 11 }}>
                <div style={{ width: 42, height: 32, background:'var(--accent-tan)', opacity: 0.5 }} />
                <div className="col" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600 }}>{a}</span>
                  <span className="muted">{b}</span>
                </div>
                <div className="col" style={{ alignItems:'flex-end' }}>
                  <span className="mono" style={{ fontWeight: 600 }}>{p}</span>
                  <span className="tiny mono muted" style={{ fontSize: 9 }}>{st} · {d}</span>
                </div>
              </div>
            ))}
          </div>
        </Box>

        {/* Dana's adjusts */}
        <Box style={{ width: 320 }} tan>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ Dana's human adjusts</span>
          <div className="col" style={{ gap: 4, marginTop: 6 }}>
            {[
              ['+ Pool installed 2021',     '+$12k'],
              ['+ New HVAC 2023',           '+$6k'],
              ['+ Kitchen reno · mid-tier', '+$18k'],
              ['− North-facing · Oak Park', '−$8k'],
              ['− Busy street · Mesquite',   '−$4k'],
              ['− Roof · 8yr remaining',    '−$2k'],
            ].map(([t,v],i)=>(
              <div key={i} className="row between" style={{ padding:'3px 0', borderBottom:'1px dashed var(--line)', fontSize: 11 }}>
                <span>{t}</span><span className="mono" style={{ fontWeight: 600, color: v[0]==='+'?'var(--accent-sage)':'var(--accent-rose)' }}>{v}</span>
              </div>
            ))}
          </div>
          <Hr />
          <div className="tiny"><b>Net adjust:</b> <span className="mono">+$22k over AVM midpoint</span></div>
        </Box>
      </div>

      {/* CTA strip */}
      <Box style={{ marginTop: 14, padding: 16, background:'var(--ink)', color:'var(--paper)' }}>
        <div className="row between center">
          <div>
            <div className="hand-alt" style={{ fontSize: 16, color:'var(--paper)' }}>Want the full 12-page report?</div>
            <div className="tiny" style={{ opacity: 0.7, marginTop: 3 }}>Every comp · photos · what's selling fast · seller prep checklist · timing read.</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Btn sm style={{ background:'transparent', color:'var(--paper)', border:'1px solid var(--paper)' }}>email it to me</Btn>
            <Btn sm style={{ background:'var(--paper)', color:'var(--ink)' }}>15-min call w/ Dana →</Btn>
          </div>
        </div>
      </Box>
    </div>
  </SiteFrame>;
}


/* ============================================================
 * V3 · DRIP EDITOR (what nurture hits Jen)
 * ============================================================ */
function HV3_DripEditor() {
  return <Desktop active="Content" url="command.app/home-value/drip">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Home-value microsite · seller drip</div>
        <span className="serif" style={{ fontSize: 22 }}>What Jen gets after the form</span>
        <div className="tiny muted">14-touch sequence · branches by timeframe · auto-pauses if she books a call.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>preview in inbox</Btn>
        <Btn sm>A/B test</Btn>
        <Btn sm primary>publish changes</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      <Box className="grow" style={{ flexBasis: 560 }}>
        <div className="row between">
          <span className="hand-alt" style={{ fontSize: 14 }}>SEQUENCE · "3–6 month seller"</span>
          <div className="row" style={{ gap: 4 }}>
            <Chip sm filled>3–6mo</Chip>
            <Chip sm>&lt; 3mo · hot</Chip>
            <Chip sm>just curious</Chip>
          </div>
        </div>

        <div className="col" style={{ gap: 0, marginTop: 10, position:'relative' }}>
          <div style={{ position:'absolute', left: 22, top: 20, bottom: 20, width: 2, background:'var(--line)' }} />
          {[
            ['0m',   'instant', 'EMAIL',  'Your valuation · full report attached',   'subject: your Oak Park home value range', 'sage'],
            ['5m',   '+5 min',  'SMS',    'Quick one · did the report land OK? — D', 'optional · only if phone given', 'sage'],
            ['1d',   'day 1',   'EMAIL',  'The 3 things that move your number most', 'personalized to her comps', 'tan'],
            ['3d',   'day 3',   'EMAIL',  'Your street · 3 homes sold this month',    'auto-pulls MLS for her zip', 'tan'],
            ['7d',   'week 1',  'SMS',    'Any questions on the comps?',             'Dana sends personally', ''],
            ['14d',  'week 2',  'EMAIL',  'Seller prep checklist (PDF)',              '9-item · printable', ''],
            ['21d',  'week 3',  'EMAIL',  'Story: the Hartleys sold in 11 days',      'case study · same neighborhood', ''],
            ['30d',  'month 1', 'VALUE',  'Refresh · your home is now $814k (+$4k)', 'auto-re-run AVMs', 'sage'],
            ['45d',  'month 1.5','EMAIL', 'Timing read · spring vs summer',           'seasonality chart', ''],
            ['60d',  'month 2', 'SMS',    'Quick check — still thinking 3–6mo?',      'branch on reply', ''],
            ['75d',  'month 2.5','EMAIL', 'Before-list prep: 5 weekend projects',     'light-reno guide', ''],
            ['90d',  'month 3', 'VALUE',  'Refresh · your home is now $822k',         'auto', 'sage'],
            ['120d', 'month 4', 'EMAIL',  '"If we listed today" — 1-page plan',       'Dana drafts, human-review', 'tan'],
            ['150d', 'month 5', 'CALL',   '15-min call offer · calendar link',        'high-intent CTA', 'rose'],
          ].map(([d,when,kind,t,sub,c],i)=>(
            <div key={i} className="row" style={{ gap: 12, padding:'8px 0', alignItems:'flex-start', position:'relative' }}>
              <div style={{ width: 46, zIndex: 1, textAlign:'right' }}>
                <span className="tiny mono muted">{d}</span>
              </div>
              <div style={{ width: 12, height: 12, borderRadius:'50%', background: c ? `var(--accent-${c})` : 'var(--muted)', border:'2px solid var(--paper)', boxShadow:'0 0 0 1px var(--line)', flexShrink: 0, marginTop: 4, zIndex: 1 }} />
              <div className="col" style={{ flex: 1, background:'#fff', border:'1px solid var(--line)', padding: 8 }}>
                <div className="row between">
                  <div className="row" style={{ gap: 6 }}>
                    <span className="tiny mono" style={{ background:'var(--paper-2)', padding:'1px 5px', fontSize: 9 }}>{kind}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{t}</span>
                  </div>
                  <Btn sm ghost>edit</Btn>
                </div>
                <span className="tiny muted" style={{ marginTop: 2 }}>{sub}</span>
              </div>
            </div>
          ))}
          <div className="row" style={{ gap: 12, padding:'8px 0', alignItems:'center' }}>
            <div style={{ width: 46 }} />
            <div style={{ width: 12, height: 12, flexShrink: 0 }} />
            <Btn sm dashed>+ add step</Btn>
          </div>
        </div>
      </Box>

      {/* Branches + controls */}
      <div className="col" style={{ width: 320, gap: 10 }}>
        <Box>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ Auto-pause triggers</span>
          <ul className="tiny" style={{ margin:'6px 0 0 16px', lineHeight: 1.7 }}>
            <li>Books a call · pause entire sequence</li>
            <li>Replies "no thanks" · pause + tag</li>
            <li>Opens nothing for 14d · soft-pause, monthly only</li>
            <li>Goes under contract elsewhere · archive · 6mo pop-by</li>
          </ul>
        </Box>
        <Box tan>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ Dana's voice</span>
          <div className="tiny" style={{ marginTop: 4 }}>Every email auto-drafts in Dana's voice profile · human-review toggle on critical steps · 2 pre-approved variants rotate.</div>
        </Box>
        <Box>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ Performance · last 90d</span>
          <div className="row" style={{ gap: 8, marginTop: 6, flexWrap:'wrap' }}>
            {[['open rate','48%'],['reply rate','12%'],['call booked','4.8%'],['listed w/ Dana','1.9%']].map(([l,v],i)=>(
              <div key={i} className="col" style={{ padding: 8, background:'var(--paper-2)', border:'1px solid var(--line)', flex:'1 0 44%' }}>
                <span className="tiny mono muted">{l}</span>
                <span className="serif" style={{ fontSize: 20 }}>{v}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}


/* ============================================================
 * V4 · SELLER-LEAD DASHBOARD (where Dana lives)
 * ============================================================ */
function HV4_LeadDashboard() {
  return <Desktop active="Deals" url="command.app/home-value/leads">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Home-value · seller leads</div>
        <span className="serif" style={{ fontSize: 22 }}>Seller leads · 84 in funnel</span>
        <div className="tiny muted">18 hot · 41 warm · 25 cool. Sorted by a readiness score, not recency.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>bulk tag</Btn>
        <Btn sm>export CSV</Btn>
        <Btn sm primary>+ manual add</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10 }}>
      {[
        ['Hot · intent signals',    18, 'rose'],
        ['Warm · engaged',           41, 'tan'],
        ['Cool · opened only',       25, ''],
        ['Called Dana back',          7, 'sage'],
        ['Listed w/ me',              3, 'sage'],
        ['Lost · listed elsewhere',   4, ''],
      ].map(([l,n,c],i)=>(
        <Box key={i} className="grow" style={{ padding: 10, borderLeft: c?`3px solid var(--accent-${c})`:'1px solid var(--line)' }}>
          <span className="tiny mono muted">{l}</span>
          <div className="serif" style={{ fontSize: 24 }}>{n}</div>
        </Box>
      ))}
    </div>

    <Box>
      <div style={{ display:'grid', gridTemplateColumns:'28px 1.3fr 120px 140px 90px 1fr 90px 110px', gap: 8, padding:'6px 4px', fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, letterSpacing:'0.1em', color:'var(--muted)', borderBottom:'1px solid var(--line)' }}>
        <div /><div>LEAD</div><div>ADDRESS</div><div>RANGE</div><div>TIMEFRAME</div><div>LATEST SIGNAL</div><div>SCORE</div><div>NEXT</div>
      </div>
      {[
        ['JO','Jen Ortiz',         '742 Mesquite',   '$792–828k','< 3mo',   'opened refresh email · 2h',  94, 'call 3pm',    'rose'],
        ['BK','Ben Kowalski',      '198 Sienna',      '$740–775k','3–6mo',  'replied to SMS · "maybe"',    81, 'reply',       'rose'],
        ['MR','Marisol Reyes',     '9 Palo Verde',    '$695–725k','3–6mo',  'clicked seller prep PDF',     72, 'send comps',  'tan'],
        ['GT','Greg Tan',          '55 Oak Dr',       '$768–795k','6–12mo', 'ran refresh twice',           69, 'nurture',     'tan'],
        ['CW','Claire W.',          '22 Cedar',        '$810–850k','< 3mo',  'booked call · Fri 10a',       95, 'prep + go',   'sage'],
        ['AN','Ajay Nair',         '102 Sienna',      '$920–960k','curious', 'opened 3 emails',             42, 'monthly',     ''],
        ['LM','Leah Morris',        '18 Juniper',      '$620–650k','6–12mo', 'unsub\'d',                    12, 'pop-by 6mo',  ''],
        ['DS','Derek Sosa',         '77 Mesquite',     '$740–770k','3–6mo',  '3 email opens · no click',    51, 'try SMS',     ''],
      ].map(([init,name,addr,range,tf,sig,score,next,c],i)=>(
        <div key={i} style={{ display:'grid', gridTemplateColumns:'28px 1.3fr 120px 140px 90px 1fr 90px 110px', gap: 8, padding:'8px 4px', alignItems:'center', borderBottom:'1px dashed var(--line)', fontSize: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius:'50%', background:'var(--accent-tan)', color:'var(--paper)', fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, display:'flex', alignItems:'center', justifyContent:'center' }}>{init}</div>
          <div className="col">
            <span style={{ fontWeight: 600 }}>{name}</span>
            <span className="tiny muted" style={{ fontSize: 9 }}>seller · AVM lead · 23d ago</span>
          </div>
          <span className="tiny mono">{addr}</span>
          <span className="tiny mono">{range}</span>
          <Chip sm>{tf}</Chip>
          <span className="tiny muted">{sig}</span>
          <div className="row" style={{ gap: 4, alignItems:'center' }}>
            <div style={{ width: 30, height: 6, background:'var(--line)' }}>
              <div style={{ width: score+'%', height:'100%', background: score>80?'var(--accent-rose)':score>60?'var(--accent-tan)':'var(--muted)' }} />
            </div>
            <span className="tiny mono">{score}</span>
          </div>
          <Btn sm primary={c==='rose'} ghost={!c}>{next}</Btn>
        </div>
      ))}
    </Box>

    <Anno style={{ alignSelf:'flex-end' }}>↑ score = opens + clicks + refresh-runs + reply + call-booked · weighted by recency</Anno>
  </Desktop>;
}


/* ============================================================
 * V5 · LEAD DETAIL (Jen Ortiz · seller page)
 * ============================================================ */
function HV5_LeadDetail() {
  return <Desktop active="Deals" url="command.app/home-value/leads/jen-ortiz">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Seller leads · Jen Ortiz</div>
        <span className="serif" style={{ fontSize: 22 }}>Jen Ortiz · seller lead · <span className="mono" style={{ color:'var(--accent-rose)' }}>score 94</span></span>
        <div className="tiny muted">742 Mesquite Ln · &lt; 3mo timeframe · ran refresh 2h ago</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>SMS</Btn>
        <Btn sm>call</Btn>
        <Btn sm primary>offer 15-min →</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      <div className="col grow" style={{ gap: 14, flexBasis: 620 }}>
        {/* signal timeline */}
        <Box>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ Signal timeline · what she's done</span>
          <div className="col" style={{ gap: 0, marginTop: 8 }}>
            {[
              ['2h ago',    '↻', 'ran valuation refresh · 3rd time this week', 'rose'],
              ['Yday 8p',    '✉', 'opened "your street · 3 sold" email · clicked comp #2', 'tan'],
              ['3d ago',     '✉', 'opened seller prep PDF · downloaded', 'tan'],
              ['6d ago',     '💬','replied SMS · "probably April, but curious"', 'rose'],
              ['9d ago',     '🔗','shared valuation link with someone (co-owner?)', 'tan'],
              ['14d ago',    '✉', 'opened refresh at $810k email', ''],
              ['23d ago',    '●', 'submitted form · 742 Mesquite · 3–6mo → shifted to < 3mo on day 16', 'sage'],
            ].map(([t,i,w,c],idx)=>(
              <div key={idx} className="row" style={{ gap: 10, padding:'6px 0', borderBottom:'1px dashed var(--line)' }}>
                <span className="tiny mono muted" style={{ width: 60 }}>{t}</span>
                <span style={{ fontSize: 14, width: 20 }}>{i}</span>
                <span className="tiny" style={{ flex: 1 }}>{w}</span>
                {c && <Chip sm style={{ fontSize: 9 }}>{c==='rose'?'intent':c==='tan'?'engaged':'entry'}</Chip>}
              </div>
            ))}
          </div>
        </Box>

        {/* AI suggestions */}
        <Box tan>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ Dana — here's what she's signaling</span>
          <div className="tiny" style={{ marginTop: 4, lineHeight: 1.6 }}>3 refreshes in 7 days + "probably April" + prep-PDF download = she's closer than her form said. Suggest: call today, offer a Saturday walk-through with no obligation. Don't send another drip email until you hear back.</div>
          <div className="row" style={{ gap: 4, marginTop: 8 }}>
            <Btn sm primary>accept · draft SMS</Btn>
            <Btn sm>draft email instead</Btn>
            <Btn sm ghost>ignore</Btn>
          </div>
        </Box>

        {/* Drafted message */}
        <Box>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ Draft SMS · Dana's voice</span>
          <div style={{ marginTop: 8, padding: 12, background:'var(--paper-2)', border:'1px solid var(--line)', fontSize: 13, lineHeight: 1.6, fontFamily:"'Cormorant Garamond',serif" }}>
            "Hey Jen, Dana here. Saw you ran your home value again — looks like things are firming up for you. No pressure, but I'd love to walk through your place (Saturday or Sunday works), give you a straight read on timing + list price, no obligation. Worth 20 min? — D"
          </div>
          <div className="row" style={{ gap: 4, marginTop: 8 }}>
            <Btn sm primary>send now</Btn>
            <Btn sm>regenerate · warmer</Btn>
            <Btn sm>edit</Btn>
          </div>
        </Box>
      </div>

      {/* Right rail · home snapshot */}
      <Box style={{ width: 320 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Home snapshot</span>
        <div style={{ height: 110, background:'linear-gradient(135deg, var(--accent-tan) 0%, var(--accent-sage) 100%)', marginTop: 8, opacity: 0.5 }} />
        <div className="col" style={{ gap: 3, marginTop: 8, fontSize: 12 }}>
          <div className="row between"><span className="muted">Current range</span><span className="mono" style={{ fontWeight: 600 }}>$792–828k</span></div>
          <div className="row between"><span className="muted">Last refresh</span><span className="mono">2h ago · $810k</span></div>
          <div className="row between"><span className="muted">30d trend</span><span className="mono" style={{ color:'var(--accent-sage)' }}>+$4k (+0.5%)</span></div>
          <div className="row between"><span className="muted">Mortgage balance (Zillow est.)</span><span className="mono">$412k</span></div>
          <div className="row between"><span className="muted">Estimated equity</span><span className="mono" style={{ fontWeight: 600 }}>$398k</span></div>
          <div className="row between"><span className="muted">Owner since</span><span className="mono">2016 · 9 yrs</span></div>
        </div>
        <Hr />
        <span className="hand-alt tiny">Life events (social · opt-in)</span>
        <ul className="tiny" style={{ margin:'4px 0 0 16px', lineHeight: 1.5 }}>
          <li>Kid #2 headed to college (IG · Aug 2024)</li>
          <li>Remote job confirmed (LinkedIn · Jan)</li>
          <li>Mom moved to AZ (FB · Feb)</li>
        </ul>
        <Hr />
        <Btn sm block>open CMA builder →</Btn>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V6 · CMA RECONCILE (Dana's human adjust workbench)
 * ============================================================ */
function HV6_CMAReconcile() {
  return <Desktop active="Content" url="command.app/cma/742-mesquite">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← CMA workbench · 742 Mesquite</div>
        <span className="serif" style={{ fontSize: 22 }}>Reconcile · 3 AVMs → 1 human read</span>
        <div className="tiny muted">Tune the human adjusts · see range tighten live · this powers the microsite.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>history · 6 refreshes</Btn>
        <Btn sm>export PDF</Btn>
        <Btn sm primary>publish → microsite</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* AVMs */}
      <Box style={{ width: 340 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>AVM INPUTS</span>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {[
            ['Zillow Zestimate','$784k','±4.2%','updated 1h'],
            ['Redfin Estimate','$801k','±3.1%','updated 6h'],
            ['Realtor.com AVM','$818k','±3.8%','updated yday'],
            ['CoreLogic (MLS)','$806k','±2.8%','updated 3h'],
          ].map(([n,v,c,u],i)=>(
            <div key={i} className="col" style={{ padding: 8, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
              <div className="row between">
                <span className="tiny" style={{ fontWeight: 600 }}>{n}</span>
                <Chip sm style={{ fontSize: 9 }}>{c}</Chip>
              </div>
              <div className="row between" style={{ marginTop: 3 }}>
                <span className="serif" style={{ fontSize: 20 }}>{v}</span>
                <span className="tiny mono muted" style={{ fontSize: 9 }}>{u}</span>
              </div>
            </div>
          ))}
        </div>
        <Hr />
        <div className="tiny">AVM blend (weighted): <span className="mono" style={{ fontWeight: 600 }}>$802k</span></div>
        <div className="tiny muted">Oak Park CoreLogic weights higher · tuned for AZ mid-market.</div>
      </Box>

      {/* Adjusters */}
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>HUMAN ADJUSTS · drag to tune</span>
        <div className="col" style={{ gap: 8, marginTop: 10 }}>
          {[
            ['Pool · installed 2021',          '+12', 70, '+$8k to +$16k in comps'],
            ['HVAC · new 2023',                '+6',  55, '+$4k to +$8k · mid-market'],
            ['Kitchen · mid-tier reno 2022',   '+18', 80, '+$14k to +$22k · Oak Park'],
            ['North-facing',                    '−8',  25, '−$5k to −$10k · AZ summers'],
            ['Busy street · Mesquite',         '−4',  22, '−$2k to −$6k'],
            ['Roof · 8yr life remaining',       '−2',  18, '−$1k to −$4k'],
            ['Corner lot',                      '+3',  40, '+$2k to +$5k'],
            ['No HOA',                          '+5',  45, 'rare in Oak Park'],
          ].map(([label,v,pct,range],i)=>(
            <div key={i} className="col" style={{ gap: 2 }}>
              <div className="row between">
                <span className="tiny" style={{ fontWeight: 500 }}>{label}</span>
                <div className="row" style={{ gap: 6, alignItems:'center' }}>
                  <span className="tiny mono muted" style={{ fontSize: 9 }}>{range}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 600, width: 44, textAlign:'right', color: v[0]==='+'?'var(--accent-sage)':'var(--accent-rose)' }}>{v}k</span>
                </div>
              </div>
              <div style={{ position:'relative', height: 10, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
                <div style={{ position:'absolute', left:'50%', top: 0, bottom: 0, width: 1, background:'var(--line)' }} />
                <div style={{ position:'absolute', left: v[0]==='+'?'50%':(50-pct/2)+'%', top: 0, bottom: 0, width: (pct/2)+'%', background: v[0]==='+'?'var(--accent-sage)':'var(--accent-rose)', opacity: 0.7 }} />
                <div style={{ position:'absolute', left: v[0]==='+'?(50+pct/2)+'%':(50-pct/2)+'%', top: -3, bottom: -3, width: 3, background:'var(--ink)' }} />
              </div>
            </div>
          ))}
        </div>
        <Hr />
        <div className="row between">
          <span className="tiny">Net human adjust</span>
          <span className="mono" style={{ fontSize: 14, fontWeight: 600, color:'var(--accent-sage)' }}>+$30k</span>
        </div>
      </Box>

      {/* Output */}
      <Box style={{ width: 260 }} sage>
        <span className="hand-alt" style={{ fontSize: 14 }}>FINAL RANGE · published</span>
        <div className="serif" style={{ fontSize: 26, marginTop: 4, lineHeight: 1.1 }}>$792k<br/>— $828k</div>
        <div className="tiny muted">midpoint <b className="mono" style={{ color:'var(--ink)' }}>$810k</b></div>
        <Hr />
        <div className="col" style={{ gap: 3, fontSize: 11 }}>
          <div className="row between"><span className="muted">AVM blend</span><span className="mono">$802k</span></div>
          <div className="row between"><span className="muted">+ human adj</span><span className="mono">+$30k</span></div>
          <div className="row between"><span className="muted">− market risk buffer</span><span className="mono">−$22k</span></div>
          <div className="row between" style={{ fontWeight: 600 }}><span>Published midpoint</span><span className="mono">$810k</span></div>
        </div>
        <Hr />
        <span className="tiny muted">Jen sees this range on worth.martinezgroup.co and in her refresh emails.</span>
        <Btn sm primary block style={{ marginTop: 8 }}>publish →</Btn>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V7 · EMBEDDABLE WIDGET (drops into agent's existing site)
 * ============================================================ */
function HV7_Widget() {
  return <Desktop active="Content" url="command.app/home-value/widget">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Home-value · embeddable widget</div>
        <span className="serif" style={{ fontSize: 22 }}>Drop it into your existing site</span>
        <div className="tiny muted">One &lt;script&gt;. All leads land in Command. Matches your colors.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>change variant</Btn>
        <Btn sm>copy embed</Btn>
        <Btn sm primary>publish</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* Variants */}
      <Box style={{ width: 250 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>VARIANTS</span>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {[
            ['Hero form · full','560×360','picked', true],
            ['Sidebar CTA',     '320×420','',      false],
            ['Inline banner',    '100%×120','',    false],
            ['Floating bubble','bottom-right','', false],
            ['Exit-intent modal','modal',   '',    false],
          ].map(([l,s,p,a],i)=>(
            <div key={i} className="row between" style={{ padding: 8, background: a?'var(--accent-tan)':'var(--paper-2)', color: a?'var(--paper)':'var(--ink)', border:'1px solid var(--line)' }}>
              <div className="col"><span className="tiny" style={{ fontWeight: 600 }}>{l}</span><span className="tiny mono" style={{ opacity: 0.7, fontSize: 9 }}>{s}</span></div>
              {a && <Chip sm style={{ background:'var(--paper)', color:'var(--ink)', fontSize: 9 }}>LIVE</Chip>}
            </div>
          ))}
        </div>
        <Hr />
        <span className="hand-alt tiny">THEME TOKENS</span>
        <div className="col" style={{ gap: 3, marginTop: 4, fontSize: 11 }}>
          <div className="row between"><span className="muted">Primary</span><div style={{ display:'flex', gap: 4, alignItems:'center' }}><div style={{ width: 12, height: 12, background:'var(--accent-tan)' }} /><span className="mono">#B99782</span></div></div>
          <div className="row between"><span className="muted">Accent</span><div style={{ display:'flex', gap: 4, alignItems:'center' }}><div style={{ width: 12, height: 12, background:'var(--accent-sage)' }} /><span className="mono">#8B9A7B</span></div></div>
          <div className="row between"><span className="muted">Font</span><span className="mono">Cormorant Garamond</span></div>
          <div className="row between"><span className="muted">Radius</span><span className="mono">0px</span></div>
        </div>
      </Box>

      {/* Preview */}
      <div className="col grow" style={{ gap: 10 }}>
        <div style={{ padding: 16, background:'#2a2a2a', color:'#eee', minHeight: 340, position:'relative' }}>
          <div className="row between" style={{ marginBottom: 14 }}>
            <span className="serif" style={{ fontSize: 18, color:'#fff' }}>danamartinez.realtor</span>
            <div className="row" style={{ gap: 12, fontSize: 11, opacity: 0.7 }}><span>About</span><span>Listings</span><span>Contact</span></div>
          </div>
          <div className="row" style={{ gap: 20, alignItems:'center' }}>
            <div className="col" style={{ flex: 1 }}>
              <div style={{ width: 80, height: 10, background:'#444', marginBottom: 8 }} />
              <div style={{ width: '90%', height: 28, background:'#333', marginBottom: 6 }} />
              <div style={{ width: '70%', height: 28, background:'#333', marginBottom: 14 }} />
              <div style={{ width: '100%', height: 8, background:'#333', marginBottom: 4 }} />
              <div style={{ width: '80%', height: 8, background:'#333' }} />
            </div>
            <div style={{ flex: 0.9, background:'#fffdf7', color:'var(--ink)', padding: 16, border:'2px solid var(--accent-tan)' }}>
              <div className="hand-alt" style={{ fontSize: 13, color:'var(--accent-tan)' }}>✦ What's your home worth?</div>
              <div className="serif" style={{ fontSize: 20, margin:'4px 0 8px' }}>Instant range · 90 seconds</div>
              <div style={{ padding: 8, border:'1px solid var(--line)', background:'var(--paper-2)', fontSize: 11, color:'var(--muted)' }}>Start typing your address…</div>
              <Btn primary block style={{ marginTop: 8 }}>get my value →</Btn>
              <span className="tiny muted" style={{ fontSize: 9, textAlign:'center', display:'block', marginTop: 4 }}>no sign-up · powered by Command</span>
            </div>
          </div>
          <Chip sm style={{ position:'absolute', top: 10, right: 10, background:'rgba(255,255,255,0.1)', color:'#fff', fontSize: 9 }}>PREVIEW · on your site</Chip>
        </div>

        <Box dashed>
          <span className="hand-alt tiny">EMBED CODE · copy-paste</span>
          <div className="mono" style={{ marginTop: 6, padding: 10, background:'var(--paper-2)', fontSize: 11, lineHeight: 1.6, whiteSpace:'pre', overflow:'auto' }}>
{`<!-- Martinez Group · Home Value Widget -->
<div id="mg-home-value"></div>
<script async
  src="https://widget.command.app/v1/home-value.js"
  data-agent="dana-martinez"
  data-variant="hero"
  data-theme="auto">
</script>`}</div>
        </Box>
      </div>
    </div>
  </Desktop>;
}


/* ============================================================
 * V8 · FUNNEL HEALTH / ATTRIBUTION
 * ============================================================ */
function HV8_Funnel() {
  return <Desktop active="KPI" url="command.app/home-value/funnel">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Home-value · funnel health</div>
        <span className="serif" style={{ fontSize: 22 }}>Landing → listing · 90-day view</span>
        <div className="tiny muted">The full sequence, with drop-off, time-in-stage, and revenue attribution.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm filled>90d</Chip>
        <Chip sm>YTD</Chip>
        <Btn sm>by source</Btn>
      </div>
    </div>

    <Box>
      <div className="row" style={{ gap: 0, alignItems:'flex-end', height: 260, padding: '10px 0' }}>
        {[
          ['Visited microsite',   2840, 1.0,  '',              'var(--accent-tan)'],
          ['Started form',         612,  0.22, '21.5% of visits','var(--accent-tan)'],
          ['Submitted',            418,  0.147, '68% finish',    'var(--accent-tan)'],
          ['Opened 1st email',     401,  0.141, '96% delivered', 'var(--accent-tan)'],
          ['Engaged 7+ days',      186,  0.065, '45% stuck',     'var(--accent-sage)'],
          ['Refreshed value',      142,  0.050, '76% of engaged','var(--accent-sage)'],
          ['Replied / called',      58,  0.020, '31% of refresh','var(--accent-sage)'],
          ['Booked appt',           23,  0.008, '40% of replied','var(--accent-rose)'],
          ['Signed listing',         9,  0.003, '39% of appts',  'var(--ink)'],
        ].map(([l,n,w,note,c],i)=>(
          <div key={i} className="col" style={{ flex: 1, alignItems:'center', gap: 4 }}>
            <span className="tiny mono" style={{ fontWeight: 600 }}>{n.toLocaleString()}</span>
            <div style={{ width:'75%', height: (w*200)+20, background: c, border:'1px solid var(--ink)' }} />
            <span className="tiny" style={{ fontSize: 10, textAlign:'center', fontWeight: 600 }}>{l}</span>
            <span className="tiny muted" style={{ fontSize: 9, textAlign:'center' }}>{note}</span>
          </div>
        ))}
      </div>
      <Hr />
      <div className="row between">
        <div className="tiny"><b>Overall:</b> 2,840 visits → 9 signed listings · 0.32% end-to-end · $187k GCI</div>
        <div className="tiny mono muted">$66/visit · $457/lead · $20,777/signed listing · 22% gross margin after ads</div>
      </div>
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Biggest leaks · AI flagged</span>
        <div className="col" style={{ gap: 6, marginTop: 6 }}>
          {[
            ['21.5% start rate',           'Hero form fine. But mobile users start 11% — test a lighter inline-CTA on phones.',   'rose'],
            ['45% reach 7-day engagement', '55% ghost after email 1. Test an earlier SMS (day 1 vs day 5) — 3 agents A/B\'d +14%.','tan'],
            ['40% replied → appt',         'Your best ratio · Dana\'s call book is working. Don\'t break it.',                       'sage'],
            ['Refresh re-runs',             'Refreshers convert 7× better than non-refreshers. Make refresh email weekly, not monthly.','tan'],
          ].map(([l,w,c],i)=>(
            <div key={i} className="col" style={{ padding: 8, background:'var(--paper-2)', border:`1px solid ${c==='rose'?'var(--accent-rose)':c==='sage'?'var(--accent-sage)':'var(--accent-tan)'}`, borderLeftWidth: 3 }}>
              <span className="tiny" style={{ fontWeight: 600 }}>{l}</span>
              <span className="tiny muted" style={{ marginTop: 2 }}>{w}</span>
            </div>
          ))}
        </div>
      </Box>

      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Attribution · 9 listings signed</span>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {[
            ['Organic · Google',   4, '$58k ads → $98k GCI'],
            ['Zillow retargeting', 2, '$18k → $42k'],
            ['Existing sphere',    2, '$0 → $38k'],
            ['Facebook ads',       1, '$12k → $9k · losing'],
          ].map(([s,n,roi],i)=>(
            <div key={i} className="row" style={{ gap: 8, padding: 8, background:'var(--paper-2)', border:'1px solid var(--line)', alignItems:'center' }}>
              <span className="serif" style={{ fontSize: 20, width: 30 }}>{n}</span>
              <div className="col" style={{ flex: 1 }}>
                <span className="tiny" style={{ fontWeight: 600 }}>{s}</span>
                <span className="tiny muted" style={{ fontSize: 10 }}>{roi}</span>
              </div>
            </div>
          ))}
        </div>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V9 · MOBILE (both sides · public form + hot-lead ping)
 * ============================================================ */
function HV9_Mobile() {
  return <div className="row" style={{ gap: 20, alignItems:'flex-start' }}>
    {/* Public */}
    <Phone title="worth.martinezgroup.co">
      <div style={{ padding: 14, background:'linear-gradient(180deg, #fffdf7 0%, #f6efe2 100%)', minHeight: 580 }}>
        <div className="row between center">
          <span className="serif" style={{ fontSize: 14 }}>Martinez Group</span>
          <span className="tiny muted">≡</span>
        </div>
        <Hr />
        <div className="hand-alt muted tiny" style={{ letterSpacing:'0.1em' }}>↓ FREE · 90 SECONDS</div>
        <div className="serif" style={{ fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>What's your home worth today?</div>
        <p className="tiny" style={{ marginTop: 8, lineHeight: 1.5 }}>3 estimates + Dana's neighborhood-adjusted read. No drip unless you ask.</p>

        <div className="col" style={{ gap: 10, marginTop: 16 }}>
          <div>
            <span className="tiny mono muted" style={{ fontSize: 9 }}>ADDRESS</span>
            <div style={{ padding: 12, border:'1px solid var(--ink)', background:'#fff', fontSize: 13, marginTop: 3 }}>742 Mesquite Ln, Oak Park</div>
          </div>
          <div>
            <span className="tiny mono muted" style={{ fontSize: 9 }}>TIMEFRAME</span>
            <div className="row" style={{ gap: 4, marginTop: 3 }}>
              {['< 3mo','3–6','6–12','curious'].map((t,i)=>(
                <Chip key={i} sm filled={i===1} style={i===1?{background:'var(--accent-tan)', color:'var(--paper)', border:'none'}:{flex:1, textAlign:'center'}}>{t}</Chip>
              ))}
            </div>
          </div>
          <div>
            <span className="tiny mono muted" style={{ fontSize: 9 }}>EMAIL</span>
            <div style={{ padding: 12, border:'1px solid var(--line)', background:'#fff', fontSize: 13, marginTop: 3, color:'var(--muted)' }}>you@example.com</div>
          </div>
          <Btn primary block style={{ padding: 14, fontSize: 14 }}>show my value →</Btn>
          <span className="tiny muted" style={{ textAlign:'center' }}>no sign-in · no spam</span>
        </div>

        <Hr />
        <div className="row" style={{ gap: 12, justifyContent:'space-between' }}>
          <div className="col"><span className="serif" style={{ fontSize: 20 }}>217</span><span className="tiny muted">homes sold</span></div>
          <div className="col"><span className="serif" style={{ fontSize: 20 }}>14d</span><span className="tiny muted">avg DOM</span></div>
          <div className="col"><span className="serif" style={{ fontSize: 20 }}>4.9★</span><span className="tiny muted">58 reviews</span></div>
        </div>
      </div>
    </Phone>

    {/* Agent-side alert */}
    <Phone title="Dana · hot seller ping">
      <div style={{ padding: 14 }}>
        <div className="hand-neat tiny muted">Push · just now</div>
        <Box style={{ padding: 14, marginTop: 10, background:'rgba(192,96,74,0.12)', border:'1px solid var(--accent-rose)' }}>
          <div className="hand-alt" style={{ fontSize: 15 }}>🔥 Hot seller signal</div>
          <div className="tiny" style={{ marginTop: 4, lineHeight: 1.5 }}><b>Jen Ortiz</b> · 742 Mesquite just re-ran her valuation for the 3rd time in a week. Timeframe shifted &lt; 3mo yesterday.</div>
          <div className="row" style={{ gap: 4, marginTop: 10 }}>
            <Btn sm primary>call now</Btn>
            <Btn sm>SMS w/ draft</Btn>
            <Btn sm ghost>later</Btn>
          </div>
        </Box>

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>TODAY'S SELLER LEADS</div>
        <div className="col" style={{ gap: 4, marginTop: 4 }}>
          {[
            ['JO','Jen Ortiz',        '94','< 3mo','rose'],
            ['CW','Claire W.',         '95','appt Fri','sage'],
            ['BK','Ben Kowalski',      '81','3–6mo','rose'],
            ['MR','Marisol Reyes',     '72','3–6mo','tan'],
            ['GT','Greg Tan',          '69','6–12mo','tan'],
          ].map(([i,n,s,tf,c],idx)=>(
            <div key={idx} className="row" style={{ gap: 8, padding: 8, background:'var(--paper-2)', border:'1px solid var(--line)', alignItems:'center' }}>
              <div style={{ width: 26, height: 26, borderRadius:'50%', background:'var(--accent-tan)', color:'var(--paper)', fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, display:'flex', alignItems:'center', justifyContent:'center' }}>{i}</div>
              <div className="col" style={{ flex: 1 }}>
                <span className="tiny" style={{ fontWeight: 600 }}>{n}</span>
                <span className="tiny muted" style={{ fontSize: 9 }}>{tf}</span>
              </div>
              <div className="col" style={{ alignItems:'flex-end' }}>
                <span className="mono tiny" style={{ color: c==='rose'?'var(--accent-rose)':c==='sage'?'var(--accent-sage)':'var(--accent-tan)', fontWeight: 600 }}>{s}</span>
              </div>
            </div>
          ))}
        </div>

        <Hr />
        <Btn sm block>open seller pipeline →</Btn>
      </div>
    </Phone>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Both sides</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Public form clean + fast, not lead-gen-trap-y. Agent-side gets a push the moment intent spikes — with the draft ready.</p>
    </div>
  </div>;
}


/* ============================================================
 * Register
 * ============================================================ */
window.HomeValueScreens = [
  { id:'hv1', label:'V1 · Public landing',          caption:'No sign-up bait. 3 AVMs + human adjust. Trust row · recent comps · "90 seconds" form.', Component: HV1_Landing },
  { id:'hv2', label:'V2 · Instant result',           caption:'Range bar with all 4 estimates · Dana\'s human adjust list · top 6 comps · full-report CTA.', Component: HV2_Result },
  { id:'hv3', label:'V3 · Drip editor',              caption:'14-touch sequence · 3 branches by timeframe · auto-pause rules · performance per step.', Component: HV3_DripEditor },
  { id:'hv4', label:'V4 · Seller-lead dashboard',    caption:'84 in funnel · readiness score · next action per row · filter by signal.', Component: HV4_LeadDashboard },
  { id:'hv5', label:'V5 · Lead detail · Jen Ortiz',  caption:'Signal timeline · AI-synthesized "here\'s what she\'s saying" · drafted SMS in voice · equity snapshot.', Component: HV5_LeadDetail },
  { id:'hv6', label:'V6 · CMA reconcile · 3 AVMs',   caption:'4 AVM blend · 8 human-adjust sliders with comp ranges · published midpoint pushes to microsite.', Component: HV6_CMAReconcile },
  { id:'hv7', label:'V7 · Embeddable widget',        caption:'5 variants · theme tokens pulled from brand · one-line embed · live preview on their current site.', Component: HV7_Widget },
  { id:'hv8', label:'V8 · Funnel health + attrib.',  caption:'Landing → listing · drop-off per step · AI leak flags · GCI by traffic source.', Component: HV8_Funnel },
  { id:'hv9', label:'V9 · Mobile · both sides',      caption:'Public form (clean · fast) + agent hot-lead push the second intent spikes.', Component: HV9_Mobile },
];

/* ============================================================
   SEO + AEO (answer-engine optimization)
   Blog hub-and-spoke · GMB posts · schema preview · AI-citation tracker
   Visibility Audit — SEO + AEO best-practice checklist for a modern RE agent
   ============================================================ */

/* ============================================================
 * V1 · SEO / AEO DASHBOARD
 * ============================================================ */
function SEO1_Dashboard() {
  return <Desktop active="Content" url="command.app/seo">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">↓ SEO + AEO command center</div>
        <span className="serif" style={{ fontSize: 22 }}>Where people (and AI) find you</span>
        <div className="tiny muted">Google rank · GMB reach · AI citations · schema coverage · review velocity.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm filled>30d</Chip>
        <Chip sm>90d</Chip>
        <Btn sm>site audit ·  Fri</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10 }}>
      {[
        ['Google impressions',  '41.8k', '+22%', 'sage'],
        ['Organic clicks',       '1,204', '+14%', 'sage'],
        ['GMB views',            '8.6k',  '+31%', 'sage'],
        ['GMB actions',          '312',   '+18%', 'sage'],
        ['AI citations (30d)',    '47',    '+12',   'tan'],
        ['Avg Google position',   '7.4',   '−1.1',  'sage'],
      ].map(([l,v,d,c],i)=>(
        <Box key={i} className="grow" style={{ padding: 10 }}>
          <span className="tiny mono muted">{l}</span>
          <div className="serif" style={{ fontSize: 22 }}>{v}</div>
          <span className="tiny mono" style={{ color: c==='sage'?'var(--accent-sage)':'var(--accent-tan)' }}>{d}</span>
        </Box>
      ))}
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ What's ranking · top 8 pages</span>
        <div className="col" style={{ gap: 4, marginTop: 8 }}>
          {[
            ['Oak Park Phoenix homes for sale',   '#3','↑4', 892, 'hub'],
            ['Best schools in Oak Park AZ',        '#5','↑2', 412, 'spoke'],
            ['How much home can I afford · 2025',  '#8','↓1', 284, 'spoke'],
            ['Oak Park vs Tempe · which is better','#4','↑6', 318, 'spoke'],
            ['First-time buyer guide · Phoenix',   '#11','↑3',196, 'spoke'],
            ['Selling a pool home in AZ',           '#9','↑1', 142, 'spoke'],
            ['New listings Oak Park',               '#2','—',  874, 'hub'],
            ['HOA or no HOA · Phoenix',              '#14','↑5',  98, 'spoke'],
          ].map(([t,p,d,c,k],i)=>(
            <div key={i} className="row" style={{ gap: 8, padding: 6, background:'var(--paper-2)', border:'1px solid var(--line)', fontSize: 12, alignItems:'center' }}>
              <Chip sm style={k==='hub'?{background:'var(--accent-tan)', color:'var(--paper)', border:'none', fontSize: 9}:{fontSize: 9}}>{k.toUpperCase()}</Chip>
              <span className="tiny" style={{ flex: 1, fontWeight: 500 }}>{t}</span>
              <span className="mono tiny" style={{ width: 34, textAlign:'right', fontWeight: 600 }}>{p}</span>
              <span className="mono tiny" style={{ width: 24, color: d[0]==='↑'?'var(--accent-sage)':d[0]==='↓'?'var(--accent-rose)':'var(--muted)' }}>{d}</span>
              <span className="mono tiny muted" style={{ width: 44, textAlign:'right' }}>{c}</span>
            </div>
          ))}
        </div>
      </Box>

      <Box style={{ width: 320 }} tan>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ This week · content plan</span>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {[
            ['Mon','Blog',  '"Oak Park winter rates" · 1,100w','draft ready'],
            ['Tue','GMB',    'Just-listed 47 Oak · w/ photos','scheduled'],
            ['Wed','Blog',   '"What \'as-is\' means in AZ" · 800w','outline'],
            ['Thu','Video',  'Neighborhood tour · Palo Verde','filming'],
            ['Fri','GMB',    'Open-house Saturday · 47 Oak','scheduled'],
            ['Fri','Blog',    'Market update · June','in draft'],
            ['Sat','Review', 'Ask Chen family post-close','auto'],
          ].map(([d,k,t,st],i)=>(
            <div key={i} className="row" style={{ gap: 6, padding: 6, background:'var(--paper-2)', border:'1px solid var(--line)', alignItems:'center' }}>
              <span className="tiny mono muted" style={{ width: 26, fontSize: 9 }}>{d}</span>
              <span className="tiny mono" style={{ width: 46, fontSize: 9, fontWeight: 600 }}>{k}</span>
              <span className="tiny" style={{ flex: 1 }}>{t}</span>
              <Chip sm style={{ fontSize: 9 }}>{st}</Chip>
            </div>
          ))}
        </div>
      </Box>
    </div>

    <Box dashed>
      <div className="row between center">
        <div>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ Visibility Audit — what to fix this week</span>
          <div className="tiny muted">Ranked by visibility impact × effort · AI audited site Fri 4am</div>
        </div>
        <Btn sm primary>open checklist →</Btn>
      </div>
      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        {[
          ['3 pages missing schema', 'high', 'rose'],
          ['2 blog posts · update for 2025', 'high', 'rose'],
          ['GMB: no post in 8 days',  'med',  'tan'],
          ['4 images missing alt text', 'med', 'tan'],
          ['2 broken internal links',  'low',  ''],
        ].map(([l,p,c],i)=>(
          <Box key={i} className="grow" style={{ padding: 8, borderLeft: c?`3px solid var(--accent-${c})`:'1px solid var(--line)' }}>
            <span className="tiny" style={{ fontWeight: 600 }}>{l}</span>
            <div className="tiny mono muted" style={{ fontSize: 9 }}>priority · {p}</div>
          </Box>
        ))}
      </div>
    </Box>
  </Desktop>;
}


/* ============================================================
 * V2 · HUB-AND-SPOKE CONTENT MAP
 * ============================================================ */
function SEO2_HubSpoke() {
  return <Desktop active="Content" url="command.app/seo/map">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Content architecture · hub & spoke</div>
        <span className="serif" style={{ fontSize: 22 }}>Topical authority · visualized</span>
        <div className="tiny muted">3 hubs · 28 spokes · 14 outbound backlinks. Green = ranking top 10.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>add hub</Btn>
        <Btn sm primary>suggest next spoke · AI</Btn>
      </div>
    </div>

    <Box style={{ padding: 24, minHeight: 500, background:'#fffdf7', position:'relative' }}>
      {/* Hub · Oak Park */}
      <div style={{ position:'absolute', left: '35%', top: '20%', transform:'translate(-50%,-50%)', width: 160, padding: 14, background:'var(--accent-tan)', color:'var(--paper)', textAlign:'center', border:'2px solid var(--ink)' }}>
        <div className="hand-alt" style={{ fontSize: 11, color:'var(--paper)', letterSpacing:'0.1em' }}>★ HUB</div>
        <div className="serif" style={{ fontSize: 16 }}>Oak Park, Phoenix</div>
        <div className="tiny" style={{ opacity: 0.8, fontSize: 10 }}>2,842 words · #3 rank</div>
      </div>

      {/* Hub · Seller */}
      <div style={{ position:'absolute', left: '70%', top: '60%', transform:'translate(-50%,-50%)', width: 160, padding: 14, background:'var(--accent-sage)', color:'var(--paper)', textAlign:'center', border:'2px solid var(--ink)' }}>
        <div className="hand-alt" style={{ fontSize: 11, color:'var(--paper)', letterSpacing:'0.1em' }}>★ HUB</div>
        <div className="serif" style={{ fontSize: 16 }}>Selling in AZ</div>
        <div className="tiny" style={{ opacity: 0.8, fontSize: 10 }}>3,180 words · #5</div>
      </div>

      {/* Hub · Buyer */}
      <div style={{ position:'absolute', left: '20%', top: '72%', transform:'translate(-50%,-50%)', width: 160, padding: 14, background:'var(--ink)', color:'var(--paper)', textAlign:'center', border:'2px solid var(--ink)' }}>
        <div className="hand-alt" style={{ fontSize: 11, color:'var(--paper)', letterSpacing:'0.1em' }}>★ HUB</div>
        <div className="serif" style={{ fontSize: 16 }}>Buying in Phoenix</div>
        <div className="tiny" style={{ opacity: 0.8, fontSize: 10 }}>2,410 · #6</div>
      </div>

      {/* Spokes around Oak Park */}
      {[
        ['Best schools · Oak Park', '8%',  '6%',  '#5',  'sage'],
        ['Oak Park vs Tempe',        '55%', '4%',  '#4',  'sage'],
        ['HOA or no HOA',            '65%', '32%', '#14', 'tan'],
        ['Pool homes in Oak Park',   '5%',  '30%', '#11', 'tan'],
        ['New builds 2025',           '22%', '50%', '—',  ''],
      ].map(([t,l,top,r,c],i)=>(
        <React.Fragment key={i}>
          <div style={{ position:'absolute', left: l, top: top, width: 110, padding: 8, background:'#fff', border:`1px solid var(--accent-${c||'ink'})`, borderLeftWidth: 3, fontSize: 10 }}>
            <div style={{ fontWeight: 600 }}>{t}</div>
            <div className="mono muted" style={{ fontSize: 9 }}>{r}</div>
          </div>
        </React.Fragment>
      ))}

      {[
        ['Selling pool home', '82%', '40%', '#9', 'sage'],
        ['Home prep · AZ',    '90%', '70%', '#12', 'tan'],
        ['As-is · what it means','60%','85%','—',  ''],
        ['Capital gains · AZ', '90%', '48%', '—',  ''],
      ].map(([t,l,top,r,c],i)=>(
        <div key={'s'+i} style={{ position:'absolute', left: l, top: top, width: 110, padding: 8, background:'#fff', border:`1px solid var(--accent-${c||'ink'})`, borderLeftWidth: 3, fontSize: 10 }}>
          <div style={{ fontWeight: 600 }}>{t}</div>
          <div className="mono muted" style={{ fontSize: 9 }}>{r}</div>
        </div>
      ))}

      {[
        ['First-time buyer',        '2%',  '40%', '#11', 'tan'],
        ['How much can I afford',    '8%',  '52%', '#8',  'sage'],
        ['Down payment AZ',          '28%', '84%', '#16', ''],
      ].map(([t,l,top,r,c],i)=>(
        <div key={'b'+i} style={{ position:'absolute', left: l, top: top, width: 110, padding: 8, background:'#fff', border:`1px solid var(--accent-${c||'ink'})`, borderLeftWidth: 3, fontSize: 10 }}>
          <div style={{ fontWeight: 600 }}>{t}</div>
          <div className="mono muted" style={{ fontSize: 9 }}>{r}</div>
        </div>
      ))}

      {/* Legend */}
      <div style={{ position:'absolute', right: 20, top: 20, background:'var(--paper-2)', padding: 10, border:'1px solid var(--line)', fontSize: 10 }}>
        <div className="hand-alt tiny" style={{ letterSpacing:'0.1em' }}>LEGEND</div>
        <div className="row" style={{ gap: 6, marginTop: 4, alignItems:'center' }}><div style={{ width: 10, height: 10, background:'var(--accent-sage)' }}/> top 10</div>
        <div className="row" style={{ gap: 6, marginTop: 2, alignItems:'center' }}><div style={{ width: 10, height: 10, background:'var(--accent-tan)' }}/> 11–25</div>
        <div className="row" style={{ gap: 6, marginTop: 2, alignItems:'center' }}><div style={{ width: 10, height: 10, background:'var(--line)' }}/> not yet</div>
      </div>
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow" tan>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Gap analysis · suggested new spokes</span>
        <ul className="tiny" style={{ margin:'4px 0 0 16px', lineHeight: 1.7 }}>
          <li>"Property taxes · Maricopa County" — 2,400/mo searches · 0 Oak Park agents rank.</li>
          <li>"Moving to Phoenix from California" — 4,800/mo · high buyer-intent.</li>
          <li>"Oak Park rental vs buy · 2025" — long-tail · low comp, close-to-convert.</li>
          <li>"New-construction Oak Park" — Dana knows 3 builders personally · topical edge.</li>
        </ul>
        <Btn sm primary style={{ marginTop: 8 }}>add to plan →</Btn>
      </Box>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Internal linking health</span>
        <div className="col" style={{ gap: 3, fontSize: 11, marginTop: 6 }}>
          <div className="row between"><span>Orphan pages (no inbound)</span><span className="mono" style={{ color:'var(--warn)' }}>2</span></div>
          <div className="row between"><span>Spokes w/ hub link</span><span className="mono">26 / 28</span></div>
          <div className="row between"><span>Hubs w/ 10+ spokes</span><span className="mono">2 / 3</span></div>
          <div className="row between"><span>Avg anchor-text health</span><span className="mono" style={{ color:'var(--accent-sage)' }}>good</span></div>
        </div>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V3 · BLOG POST EDITOR (SEO + AEO optimized)
 * ============================================================ */
function SEO3_BlogEditor() {
  return <Desktop active="Content" url="command.app/blog/oak-park-vs-tempe/edit">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Blog · draft · Oak Park vs Tempe</div>
        <span className="serif" style={{ fontSize: 22 }}>Oak Park vs Tempe · which is better for families</span>
        <div className="tiny muted">1,187 words · target keyword "oak park vs tempe" · 2,900 searches/mo</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>preview</Btn>
        <Btn sm>schedule</Btn>
        <Btn sm primary>publish</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* Editor pane */}
      <Box className="grow" style={{ flexBasis: 620, padding: 22 }}>
        <div style={{ fontFamily:"'Cormorant Garamond',serif" }}>
          <div className="tiny mono muted" style={{ fontSize: 9, letterSpacing:'0.1em' }}>H1 · TITLE TAG</div>
          <div style={{ fontSize: 26, lineHeight: 1.15, padding:'4px 0', borderBottom:'1px dashed var(--line)' }}>Oak Park vs Tempe: Which is Better for Families in 2025?</div>

          <div className="tiny mono muted" style={{ fontSize: 9, letterSpacing:'0.1em', marginTop: 14 }}>INTRO · ANSWER UP FRONT (for AEO)</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 4 }}>Short answer: <b>if you want top-rated schools, larger lots, and a quieter pace, Oak Park wins</b>. If you want walkability, more restaurants, and a younger feel, Tempe is the stronger fit. Both sit about 18 minutes from Sky Harbor, both have strong resale, and both have aggressive 2025 inventory cycles worth knowing about.</p>

          <div className="tiny mono muted" style={{ fontSize: 9, letterSpacing:'0.1em', marginTop: 14 }}>H2 · COMPARISON TABLE</div>
          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr', gap: 0, marginTop: 6, border:'1px solid var(--ink)' }}>
            {[
              ['',               'Oak Park',       'Tempe',          'head'],
              ['Median price',   '$689k',          '$542k',          ''],
              ['School rating',  '9 / 10',         '7 / 10',         ''],
              ['Walk score',     '42',             '74',             ''],
              ['Avg lot',        '0.22 ac',        '0.12 ac',        ''],
              ['Days on market', '14d',            '22d',            ''],
            ].map(([a,b,c,k],i)=>(
              <React.Fragment key={i}>
                <div style={{ padding: 8, background: k==='head'?'var(--ink)':'var(--paper-2)', color: k==='head'?'var(--paper)':'var(--ink)', fontSize: 12, fontWeight: k==='head'?600:400, borderBottom:'1px solid var(--line)' }}>{a}</div>
                <div style={{ padding: 8, background: k==='head'?'var(--ink)':'#fff', color: k==='head'?'var(--paper)':'var(--ink)', fontSize: 12, fontWeight: k==='head'?600:400, borderBottom:'1px solid var(--line)', borderLeft:'1px solid var(--line)' }}>{b}</div>
                <div style={{ padding: 8, background: k==='head'?'var(--ink)':'#fff', color: k==='head'?'var(--paper)':'var(--ink)', fontSize: 12, fontWeight: k==='head'?600:400, borderBottom:'1px solid var(--line)', borderLeft:'1px solid var(--line)' }}>{c}</div>
              </React.Fragment>
            ))}
          </div>

          <div className="tiny mono muted" style={{ fontSize: 9, letterSpacing:'0.1em', marginTop: 14 }}>H2 · FAQ (for schema + AEO)</div>
          <div className="col" style={{ gap: 6, marginTop: 4 }}>
            {[
              ['Is Oak Park safer than Tempe?','On crime data (PPD 2024), Oak Park is ~38% lower per capita…'],
              ['Which has better schools?','Oak Park schools (Cactus, Sunnyslope, Desert Mountain) rate 9/10…'],
              ['Property taxes?','Both sit in Maricopa County. Oak Park effective rate ~0.63%; Tempe ~0.66%…'],
            ].map(([q,a],i)=>(
              <div key={i} style={{ padding: 10, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{q}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </Box>

      {/* Right rail · SEO + AEO score */}
      <div className="col" style={{ width: 320, gap: 10 }}>
        <Box>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ SEO score · 87/100</span>
          <div style={{ height: 8, background:'var(--paper-2)', marginTop: 6 }}><div style={{ width:'87%', height:'100%', background:'var(--accent-sage)' }} /></div>
          <div className="col" style={{ gap: 3, marginTop: 8 }}>
            {[
              ['Title tag length',         '✓','58 chars'],
              ['Meta description',          '✓','148 chars'],
              ['H1 has keyword',            '✓','exact match'],
              ['Keyword density',           '✓','1.4%'],
              ['Internal links',             '✓','3 (Oak Park hub)'],
              ['External auth. links',       '⚠','0 — add 1 · GreatSchools?'],
              ['Alt text on images',         '⚠','1/3 missing'],
              ['Word count vs competition', '✓','1,187 (avg 890)'],
              ['Reading level',              '✓','8th grade'],
            ].map(([l,ok,note],i)=>(
              <div key={i} className="row between" style={{ fontSize: 11, padding:'3px 0', borderBottom:'1px dashed var(--line)' }}>
                <span>{l}</span>
                <span className="row" style={{ gap: 6 }}><span style={{ color: ok==='✓'?'var(--accent-sage)':'var(--warn)' }}>{ok}</span><span className="tiny muted">{note}</span></span>
              </div>
            ))}
          </div>
        </Box>

        <Box tan>
          <span className="hand-alt" style={{ fontSize: 14 }}>✦ AEO score · 74/100</span>
          <div className="tiny muted">Answer engine optimization · how likely to be cited by ChatGPT, Perplexity, Google AI.</div>
          <ul className="tiny" style={{ margin:'6px 0 0 16px', lineHeight: 1.7 }}>
            <li>✓ Answer in first 60 words</li>
            <li>✓ Comparison table · scannable</li>
            <li>✓ FAQ schema · 3 Q/A</li>
            <li>✓ Author bio · real human, licensed</li>
            <li>⚠ Add citation · a .gov or .edu source</li>
            <li>⚠ Add date · "updated June 2025"</li>
          </ul>
          <Btn sm primary block style={{ marginTop: 8 }}>auto-fix ⚠ items →</Btn>
        </Box>

        <Box>
          <span className="hand-alt tiny">DANA'S VOICE CHECK</span>
          <div className="tiny" style={{ marginTop: 4 }}>92% match to voice profile · 2 corporate-y phrases flagged. Replace "in terms of" → "when it comes to" (1 place).</div>
        </Box>
      </div>
    </div>
  </Desktop>;
}


/* ============================================================
 * V4 · GMB POST COMPOSER (Google Business Profile)
 * ============================================================ */
function SEO4_GMB() {
  return <Desktop active="Content" url="command.app/gmb">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Google Business Profile · post</div>
        <span className="serif" style={{ fontSize: 22 }}>GMB post · Just Listed 47 Oak</span>
        <div className="tiny muted">Post expires after 7 days unless you repost. We'll auto-repost if engagement &gt; threshold.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>preview on Google</Btn>
        <Btn sm>schedule</Btn>
        <Btn sm primary>post now</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* Composer */}
      <Box className="grow">
        <div className="row" style={{ gap: 6 }}>
          {['What\'s new','Event','Offer','Product'].map((t,i)=>(
            <Chip key={i} sm filled={i===0} style={i===0?{background:'var(--accent-tan)',color:'var(--paper)',border:'none'}:{}}>{t}</Chip>
          ))}
        </div>

        <div className="col" style={{ gap: 10, marginTop: 12 }}>
          <div>
            <span className="tiny mono muted" style={{ fontSize: 9 }}>PHOTO · 1200×900 min</span>
            <div style={{ height: 200, background:'linear-gradient(135deg, var(--accent-tan) 0%, var(--accent-sage) 100%)', marginTop: 4, position:'relative', opacity: 0.6, border:'1px solid var(--line)' }}>
              <span className="tiny mono" style={{ position:'absolute', bottom: 8, left: 10, background:'rgba(0,0,0,0.4)', color:'#fff', padding:'2px 6px', fontSize: 9 }}>front-elevation-47-oak.jpg</span>
            </div>
          </div>

          <div>
            <span className="tiny mono muted" style={{ fontSize: 9 }}>POST TEXT · 1,500 char max</span>
            <div style={{ padding: 12, border:'1px solid var(--ink)', background:'#fff', fontFamily:"'Cormorant Garamond',serif", fontSize: 14, lineHeight: 1.6, marginTop: 3 }}>
              Just listed · <b>47 Oak Dr, Oak Park</b>. 4 bed, 2.5 bath, 2,180 sf on a 0.22-ac lot. Updated kitchen, pool added 2021, new HVAC. Priced at $825,000.<br/><br/>
              Open house Saturday 10am–1pm · no obligation, just come look.<br/><br/>
              Questions? Text me at (480) 555-0142 — Dana.
            </div>
            <div className="row between" style={{ marginTop: 4 }}>
              <span className="tiny mono muted">328 / 1,500</span>
              <span className="tiny mono" style={{ color:'var(--accent-sage)' }}>✓ drafted in Dana's voice</span>
            </div>
          </div>

          <div>
            <span className="tiny mono muted" style={{ fontSize: 9 }}>CTA BUTTON</span>
            <div className="row" style={{ gap: 4, marginTop: 3 }}>
              {['Learn more','Call now','Book','Sign up','Buy','Order'].map((t,i)=>(
                <Chip key={i} sm filled={i===0} style={i===0?{background:'var(--ink)', color:'var(--paper)', border:'none'}:{}}>{t}</Chip>
              ))}
            </div>
            <div className="tiny muted" style={{ marginTop: 4 }}>→ https://martinezgroup.co/47-oak · tracked w/ UTM</div>
          </div>
        </div>
      </Box>

      {/* Right · preview + history */}
      <div className="col" style={{ width: 320, gap: 10 }}>
        <Box>
          <span className="hand-alt tiny">GOOGLE PREVIEW</span>
          <div style={{ border:'1px solid var(--line)', marginTop: 6, padding: 10, background:'#fff' }}>
            <div className="row" style={{ gap: 6, alignItems:'center' }}>
              <div style={{ width: 28, height: 28, borderRadius:'50%', background:'var(--accent-tan)' }} />
              <div className="col">
                <span className="tiny" style={{ fontWeight: 600, fontSize: 11 }}>Martinez Group Real Estate</span>
                <span className="tiny muted" style={{ fontSize: 9 }}>Just now · Oak Park, Phoenix AZ</span>
              </div>
            </div>
            <div style={{ height: 90, background:'linear-gradient(135deg, var(--accent-tan), var(--accent-sage))', marginTop: 6, opacity: 0.6 }} />
            <div className="tiny" style={{ marginTop: 6, lineHeight: 1.5 }}>Just listed · <b>47 Oak Dr, Oak Park</b>. 4 bed, 2.5 bath, 2,180 sf on a 0.22-ac lot...</div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}>
              <span className="tiny" style={{ color:'#1a73e8', fontWeight: 500 }}>Learn more →</span>
            </div>
          </div>
        </Box>

        <Box>
          <span className="hand-alt tiny">POST PERFORMANCE · last 30d</span>
          <div className="col" style={{ gap: 3, marginTop: 6, fontSize: 11 }}>
            {[
              ['Just Listed · 88 Elm',       '2,410 views','48 clicks','12 calls'],
              ['Open house · Mesquite',      '1,980','31','6'],
              ['Market update · May',         '1,420','22','2'],
              ['Review highlight · Chen',    '1,110','18','4'],
            ].map(([t,v,c,cl],i)=>(
              <div key={i} className="col" style={{ gap: 2, padding: 6, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
                <span className="tiny" style={{ fontWeight: 600 }}>{t}</span>
                <div className="row between tiny mono muted" style={{ fontSize: 9 }}><span>{v}</span><span>{c}</span><span>{cl}</span></div>
              </div>
            ))}
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}


/* ============================================================
 * V5 · SCHEMA PREVIEW (rich-results)
 * ============================================================ */
function SEO5_Schema() {
  return <Desktop active="Content" url="command.app/seo/schema/47-oak">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Schema · 47 Oak listing page</div>
        <span className="serif" style={{ fontSize: 22 }}>Structured data · what Google + AI see</span>
        <div className="tiny muted">Applied: RealEstateListing · FAQPage · LocalBusiness · BreadcrumbList. All validated.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>validate · Google</Btn>
        <Btn sm>test · rich-results</Btn>
        <Btn sm primary>push to site</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* Live preview */}
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Google rich-result preview</span>
        <div style={{ border:'1px solid var(--line)', marginTop: 8, padding: 14, background:'#fff', fontFamily:'Arial, sans-serif' }}>
          <div style={{ color:'#202124', fontSize: 11 }}>martinezgroup.co › listings › 47-oak</div>
          <div style={{ color:'#1a0dab', fontSize: 18, marginTop: 2 }}>47 Oak Dr, Oak Park AZ · 4 Bed · $825,000 — Martinez Group</div>
          <div style={{ color:'#4d5156', fontSize: 12, marginTop: 3, lineHeight: 1.5 }}>Newly listed 4-bedroom, 2.5-bath home in Oak Park with pool, updated kitchen, and new HVAC. Open house Saturday 10am–1pm...</div>
          <div className="row" style={{ gap: 12, marginTop: 8, alignItems:'center' }}>
            <div style={{ width: 120, height: 80, background:'linear-gradient(135deg, var(--accent-tan), var(--accent-sage))', opacity: 0.6 }} />
            <div className="col" style={{ gap: 2 }}>
              <div className="row" style={{ gap: 3, alignItems:'center', fontSize: 12 }}><span style={{ color:'#f5a623' }}>★★★★★</span> <span>4.9</span> <span style={{ color:'#70757a' }}>(58)</span></div>
              <div style={{ fontSize: 12 }}><b>$825,000</b> · 4 bd · 2.5 ba · 2,180 sf</div>
              <div style={{ fontSize: 12, color:'#137333' }}>Open house · Sat 10am</div>
            </div>
          </div>
        </div>

        <Hr />

        <span className="hand-alt tiny">JSON-LD · RealEstateListing</span>
        <div className="mono" style={{ marginTop: 4, padding: 10, background:'var(--ink)', color:'#e8e4db', fontSize: 10, lineHeight: 1.5, overflow:'auto' }}>
{`{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "47 Oak Dr, Oak Park AZ",
  "offers": {
    "@type": "Offer",
    "price": "825000",
    "priceCurrency": "USD"
  },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "47 Oak Drive",
    "addressLocality": "Phoenix",
    "addressRegion": "AZ",
    "postalCode": "85032"
  },
  "numberOfBedrooms": 4,
  "numberOfBathroomsTotal": 2.5,
  "floorSize": { "@type": "QuantitativeValue", "value": 2180, "unitCode": "FTK" },
  "yearBuilt": 2005,
  "datePosted": "2025-06-12",
  "broker": { "@type": "RealEstateAgent", "@id": "#dana-martinez" }
}`}</div>
      </Box>

      {/* Right · schema coverage */}
      <Box style={{ width: 320 }}>
        <span className="hand-alt tiny">SCHEMA COVERAGE · site-wide</span>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {[
            ['RealEstateListing',    '24/24', 'sage'],
            ['RealEstateAgent',       '1/1',   'sage'],
            ['LocalBusiness',         '1/1',   'sage'],
            ['FAQPage',                '9/14',  'tan'],
            ['BreadcrumbList',         '36/42', 'tan'],
            ['Article (blog)',         '14/16', 'tan'],
            ['Review',                 '58/58', 'sage'],
            ['VideoObject',            '3/8',   'rose'],
            ['Event (open house)',     '2/2',   'sage'],
          ].map(([t,v,c],i)=>(
            <div key={i} className="row between" style={{ padding: 6, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
              <span className="tiny">{t}</span>
              <div className="row" style={{ gap: 6, alignItems:'center' }}>
                <span className="mono tiny">{v}</span>
                <div style={{ width: 6, height: 6, borderRadius:'50%', background: `var(--accent-${c})` }} />
              </div>
            </div>
          ))}
        </div>
        <Hr />
        <div className="tiny muted">Missing items are auto-drafted overnight · you approve in Delegation inbox.</div>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V6 · AI CITATION TRACKER
 *   Am I showing up in ChatGPT / Perplexity / Google AI answers?
 * ============================================================ */
function SEO6_AICitations() {
  return <Desktop active="KPI" url="command.app/seo/ai-citations">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← AEO · AI citation tracker</div>
        <span className="serif" style={{ fontSize: 22 }}>Are AIs citing you?</span>
        <div className="tiny muted">We run 40 Oak Park / Phoenix queries weekly across ChatGPT, Perplexity, Google AI, Claude.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm filled>30d</Chip>
        <Chip sm>90d</Chip>
        <Btn sm>add tracked query</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10 }}>
      {[
        ['Total citations · 30d',  '47', '+12 vs prev', 'sage'],
        ['Unique pages cited',     '14', '+4', 'sage'],
        ['Share-of-voice · Oak Park','28%','Dana ranks #2', 'tan'],
        ['Sentiment · cited',       '94% positive','', 'sage'],
      ].map(([l,v,d,c],i)=>(
        <Box key={i} className="grow" style={{ padding: 10 }}>
          <span className="tiny mono muted">{l}</span>
          <div className="serif" style={{ fontSize: 22 }}>{v}</div>
          <span className="tiny mono" style={{ color: c==='sage'?'var(--accent-sage)':'var(--accent-tan)' }}>{d}</span>
        </Box>
      ))}
    </div>

    <Box>
      <span className="hand-alt" style={{ fontSize: 14 }}>✦ Citations by AI · last 30d</span>
      <div style={{ display:'grid', gridTemplateColumns:'1.5fr 70px 70px 70px 70px 90px', gap: 0, marginTop: 8, fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, letterSpacing:'0.1em', color:'var(--muted)', borderBottom:'1px solid var(--line)' }}>
        <div style={{ padding:'6px 8px' }}>QUERY</div>
        <div style={{ padding:'6px 8px', textAlign:'center' }}>CHATGPT</div>
        <div style={{ padding:'6px 8px', textAlign:'center' }}>PERPLEX.</div>
        <div style={{ padding:'6px 8px', textAlign:'center' }}>GOOGLE AI</div>
        <div style={{ padding:'6px 8px', textAlign:'center' }}>CLAUDE</div>
        <div style={{ padding:'6px 8px', textAlign:'right' }}>TREND</div>
      </div>
      {[
        ['best realtor in Oak Park Phoenix',     1,1,1,1, '↑ new'],
        ['oak park phoenix school rating',       1,1,0,1, 'stable'],
        ['should I buy in oak park or tempe',    1,1,1,1, '↑ +2'],
        ['homes for sale oak park under 1m',     0,1,1,0, '↓ -1'],
        ['real estate agent for first-time buyer AZ',1,1,0,0,'↑ new'],
        ['average DOM oak park 2025',             0,1,0,1, '↑ new'],
        ['how much is my house worth oak park',   0,1,1,0, 'stable'],
        ['pool home realtor phoenix',             0,0,0,1, '↓ new tier'],
        ['oak park vs tempe',                     1,1,1,0, '↑ +1'],
        ['local realtor oak park zip 85032',      1,1,0,1, 'stable'],
      ].map(([q,...rest],i)=>{
        const trend = rest.pop();
        return <div key={i} style={{ display:'grid', gridTemplateColumns:'1.5fr 70px 70px 70px 70px 90px', gap: 0, alignItems:'center', borderBottom:'1px dashed var(--line)' }}>
          <div style={{ padding:'6px 8px', fontSize: 12 }}>{q}</div>
          {rest.map((v,j)=>(
            <div key={j} style={{ padding:'6px 8px', textAlign:'center' }}>
              {v ? <span style={{ display:'inline-block', width: 16, height: 16, background:'var(--accent-sage)', color:'var(--paper)', borderRadius:'50%', fontSize: 10, lineHeight:'16px' }}>✓</span> : <span style={{ color:'var(--faint)' }}>·</span>}
            </div>
          ))}
          <div style={{ padding:'6px 8px', textAlign:'right', fontSize: 10 }} className="mono muted">{trend}</div>
        </div>;
      })}
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow" tan>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Example citation · ChatGPT · yesterday</span>
        <div style={{ marginTop: 6, padding: 10, background:'#fff', border:'1px solid var(--line)', fontFamily:"'Cormorant Garamond',serif", fontSize: 13, lineHeight: 1.6 }}>
          "For Oak Park specifically, local agents like <b style={{ color:'var(--accent-tan)' }}>Dana Martinez of Martinez Group</b> have published detailed neighborhood comparisons — their 2025 guide notes that while Oak Park has higher median prices ($689k), the school ratings and lot sizes typically justify the premium for families."
        </div>
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="tiny mono muted">source page: /oak-park-vs-tempe</span>
          <Btn sm ghost>see query</Btn>
        </div>
      </Box>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ What drives citations</span>
        <ul className="tiny" style={{ margin:'4px 0 0 16px', lineHeight: 1.7 }}>
          <li>Specific, factual claims with numbers + sources (2×)</li>
          <li>Q&amp;A structure · FAQ schema (1.8×)</li>
          <li>Comparison tables · scannable (1.6×)</li>
          <li>Author E-E-A-T · licensed, real, bio page (1.4×)</li>
          <li>Fresh dates · "updated 2025" (1.3×)</li>
          <li>3rd-party mentions · Zillow, Realtor.com, local news</li>
        </ul>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V7 · VISIBILITY AUDIT (weekly SEO/AEO checklist)
 * ============================================================ */
function SEO7_Audit() {
  return <Desktop active="Content" url="command.app/seo/audit">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Visibility Audit · weekly SEO/AEO checklist</div>
        <span className="serif" style={{ fontSize: 22 }}>Visibility Audit — 12 things to fix this week</span>
        <div className="tiny muted">Audit runs every Friday 4am. Ranked by impact ÷ effort. 2 already auto-fixed.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>run audit now</Btn>
        <Btn sm>assign to Sam</Btn>
        <Btn sm primary>auto-fix safe items (5)</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10 }}>
      {[
        ['Site health',    '82/100', '+3', 'sage'],
        ['Issues found',   '12',     '3 auto-fixed', 'tan'],
        ['Est. impact',    '+180 clicks/mo', 'if all done', 'sage'],
        ['Audit status',  '⚠',      '12 open issues',   ''],
      ].map(([l,v,d,c],i)=>(
        <Box key={i} className="grow" style={{ padding: 10 }}>
          <span className="tiny mono muted">{l}</span>
          <div className="serif" style={{ fontSize: 22 }}>{v}</div>
          <span className="tiny muted">{d}</span>
        </Box>
      ))}
    </div>

    <Box>
      <div className="col" style={{ gap: 0 }}>
        {[
          ['HIGH',  'Blog · "Oak Park schools"',       'Last updated 2022 · refresh + add 2025 ratings',           '+ ~40 clicks/mo',   '15 min','auto'],
          ['HIGH',  '3 pages missing RealEstateListing schema', 'AI can add from listing data · you approve',      '+ rich results',    'auto',   'auto'],
          ['HIGH',  'GMB · no post in 8 days',         'Post-a-day loses reach after 5. Draft ready · just-listed 47 Oak', '+ GMB reach 25%','1 click','ready'],
          ['MED',   'Broken link · /about → /team',    '/team 404s. Point to /dana or create /team page.',           '− 1 error',         '2 min',  ''],
          ['MED',   'Title tag · homepage · 71 chars', 'Truncates in Google. Shorten to &lt; 60.',                    '+ CTR',              '1 min',  'ready'],
          ['MED',   '4 images · no alt text',           '/listings/88-elm · gallery. Auto-caption in Dana voice?',     '+ a11y + SEO',      '1 click','auto'],
          ['MED',   'Blog · "First-time buyer" · outdated', '2023 rates mentioned · replace w/ current',             '+ trust',            '5 min',  'draft'],
          ['MED',   'No FAQPage schema · 6 posts',      'AI can add from H2 questions',                             '+ AEO',              'auto',   'auto'],
          ['LOW',   'Orphan page · /neighborhoods/sunnyslope', 'Add 2 inbound links · from Oak Park hub',             '+ discover',         '3 min',  ''],
          ['LOW',   'Mobile CLS · 0.18 on /listings',   'Reserve image heights to stop layout shift',                 '+ core web vitals', '15 min', ''],
          ['LOW',   'Sitemap · 3 pages excluded',       'Confirm noindex is intentional',                             '—',                  '2 min',  ''],
          ['LOW',   'Contact page · no LocalBusiness schema', 'AI can add',                                            '+ local pack',       'auto',   'auto'],
        ].map(([pri,title,desc,impact,time,state],i)=>(
          <div key={i} className="row" style={{ gap: 10, padding: 10, borderBottom:'1px dashed var(--line)', alignItems:'center' }}>
            <Chip sm style={{ background: pri==='HIGH'?'var(--accent-rose)':pri==='MED'?'var(--accent-tan)':'var(--faint)', color: pri==='LOW'?'var(--ink)':'var(--paper)', border:'none', fontSize: 9, width: 44, textAlign:'center' }}>{pri}</Chip>
            <div className="col" style={{ flex: 1.2 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }} dangerouslySetInnerHTML={{__html: title}} />
              <span className="tiny muted" style={{ marginTop: 2 }} dangerouslySetInnerHTML={{__html: desc}} />
            </div>
            <div className="col" style={{ width: 130 }}>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>IMPACT</span>
              <span className="tiny">{impact}</span>
            </div>
            <div className="col" style={{ width: 80 }}>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>EFFORT</span>
              <span className="tiny mono">{time}</span>
            </div>
            <Btn sm primary={state==='auto'||state==='ready'||state==='draft'} ghost={!state}>
              {state==='auto' ? 'auto-fix' : state==='ready' ? 'publish →' : state==='draft' ? 'review' : 'assign'}
            </Btn>
          </div>
        ))}
      </div>
    </Box>

    <Box dashed tan>
      <div className="row between">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Weekly audit digest · email + Slack</span>
        <Chip sm filled>every Fri 8am</Chip>
      </div>
      <div className="tiny" style={{ marginTop: 4 }}>One-line summary · top 3 wins · top 3 problems · auto-fixed count · share-of-voice on tracked queries.</div>
    </Box>
  </Desktop>;
}


/* ============================================================
 * V8 · MOBILE (audit in your pocket + GMB post-on-the-go)
 * ============================================================ */
function SEO8_Mobile() {
  return <div className="row" style={{ gap: 20, alignItems:'flex-start' }}>
    <Phone title="Visibility Audit · Fri">
      <div style={{ padding: 14 }}>
        <div className="hand-neat tiny muted">Friday digest · 8:02a</div>
        <span className="serif" style={{ fontSize: 20 }}>Your visibility week</span>
        <div className="tiny muted">82/100 · 12 issues · 3 auto-fixed</div>

        <Box tan style={{ padding: 12, marginTop: 10 }}>
          <div className="hand-alt tiny">THIS WEEK'S WIN</div>
          <div className="tiny" style={{ marginTop: 4 }}><b>Oak Park vs Tempe</b> blog jumped to #4 (from #10). ChatGPT cited you yesterday in an Oak Park query.</div>
        </Box>

        <div className="hand-alt tiny" style={{ marginTop: 12 }}>DO THESE 3 THIS WEEKEND</div>
        <div className="col" style={{ gap: 6, marginTop: 6 }}>
          {[
            ['🔴 HIGH','Blog refresh · "Oak Park schools"','+40 clicks/mo · 15min'],
            ['🔴 HIGH','Approve 3 schema auto-fixes',      '+rich results · 1 tap'],
            ['🟡 MED', 'Post to GMB · 8 days since last',  '+reach · 30sec'],
          ].map(([p,t,n],i)=>(
            <div key={i} className="row between" style={{ padding: 8, background:'var(--paper-2)', border:'1px solid var(--line)', alignItems:'center' }}>
              <div className="col" style={{ flex: 1 }}>
                <span className="tiny" style={{ fontWeight: 600 }}>{p} · {t}</span>
                <span className="tiny muted" style={{ fontSize: 10 }}>{n}</span>
              </div>
              <Btn sm ghost>do →</Btn>
            </div>
          ))}
        </div>

        <Hr />
        <div className="hand-alt tiny">AI CITATIONS · 30D</div>
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          {['ChatGPT 14','Perplex. 18','Google 9','Claude 6'].map((t,i)=>(
            <Chip key={i} sm>{t}</Chip>
          ))}
        </div>
        <Btn sm block style={{ marginTop: 10 }}>open dashboard →</Btn>
      </div>
    </Phone>

    <Phone title="GMB · post now">
      <div style={{ padding: 14 }}>
        <div className="hand-neat tiny muted">Quick post · Google Business</div>
        <div style={{ padding: 10, background:'var(--paper-2)', border:'1px solid var(--line)', marginTop: 10 }}>
          <div className="row between"><span className="tiny mono muted">SUGGESTED</span><Chip sm sage style={{ fontSize: 9 }}>AUTO</Chip></div>
          <div style={{ height: 140, background:'linear-gradient(135deg, var(--accent-tan), var(--accent-sage))', marginTop: 8, opacity: 0.6 }} />
          <div className="tiny" style={{ marginTop: 6, fontFamily:"'Cormorant Garamond',serif", fontSize: 13, lineHeight: 1.5 }}>Just listed · <b>47 Oak Dr</b>. 4bd/2.5ba · pool · $825k. Open house Saturday 10–1. — Dana</div>
          <div className="row" style={{ gap: 4, marginTop: 8 }}>
            <Btn sm primary>post →</Btn>
            <Btn sm>edit</Btn>
            <Btn sm ghost>swap photo</Btn>
          </div>
        </div>

        <Hr />
        <div className="hand-alt tiny">LAST 7 POSTS</div>
        <div className="col" style={{ gap: 4, marginTop: 4 }}>
          {[
            ['Mon','Just listed · 88 Elm','2.4k views'],
            ['Tue','Market update · May','1.4k'],
            ['Wed','Review · Chen family','1.1k'],
            ['Thu','—','—'],
            ['Fri','—','—'],
            ['Sat','—','—'],
            ['Sun','—','—'],
          ].map(([d,t,v],i)=>(
            <div key={i} className="row" style={{ gap: 6, padding:'3px 0', borderBottom:'1px dashed var(--line)', fontSize: 11 }}>
              <span className="mono muted" style={{ width: 28, fontSize: 9 }}>{d}</span>
              <span style={{ flex: 1, opacity: t==='—'?0.4:1 }}>{t}</span>
              <span className="mono muted" style={{ fontSize: 9 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Phone>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Audit in your pocket</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Weekly digest · 3 things to do this weekend · GMB quick-post · AI citation ticker. SEO stops feeling like homework.</p>
    </div>
  </div>;
}


/* ============================================================
 * Register
 * ============================================================ */
window.SeoAeoScreens = [
  { id:'seo1', label:'V1 · SEO/AEO dashboard',      caption:'All 6 signals · rankings · AI citations · GMB · schema · weekly fixes.', Component: SEO1_Dashboard },
  { id:'seo2', label:'V2 · Hub-and-spoke map',       caption:'3 hubs · 28 spokes · topical authority visualized · AI suggests next spoke.', Component: SEO2_HubSpoke },
  { id:'seo3', label:'V3 · Blog editor · SEO + AEO', caption:'Answer-first · comparison table · FAQ schema · SEO 87 + AEO 74 score · voice check.', Component: SEO3_BlogEditor },
  { id:'seo4', label:'V4 · GMB post composer',        caption:'Post · Event · Offer · Product · live Google preview · 30d performance per post.', Component: SEO4_GMB },
  { id:'seo5', label:'V5 · Schema preview',            caption:'JSON-LD · rich-result preview · site-wide coverage matrix · auto-add missing.', Component: SEO5_Schema },
  { id:'seo6', label:'V6 · AI citation tracker',       caption:'40 tracked queries · 4 AIs · share-of-voice · example citation · what drives pickups.', Component: SEO6_AICitations },
  { id:'seo7', label:'V7 · Visibility Audit · weekly',   caption:'12 issues ranked · auto-fix 5 safe ones · impact/effort · assign to team.', Component: SEO7_Audit },
  { id:'seo8', label:'V8 · Mobile · Audit + GMB',       caption:'Friday digest · 3 weekend fixes · GMB quick-post · AI citation ticker.', Component: SEO8_Mobile },
];

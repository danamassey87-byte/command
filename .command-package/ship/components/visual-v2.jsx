// ============================================================
// VISUAL v2 — REWORKED
// Two card tiers only: SOFT-WHITE and INK. No color gradients.
// Typography picker with several real options.
// ============================================================

// ---------- Typography options ----------
const v2Fonts = {
  // [display, body, feel]
  hostGrotesk: { name: 'Host Grotesk + Instrument Serif', disp: "'Instrument Serif', Georgia, serif", body: "'Host Grotesk', system-ui, sans-serif", feel: 'Editorial · warm · modern', dispWeight: 400, bodyWeight: 400, dispItalic: true },
  freight:     { name: 'Fraunces + Inter', disp: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif", feel: 'High-end magazine · softened', dispWeight: 500, bodyWeight: 400, dispItalic: false },
  gtamerica:   { name: 'Söhne-style (Inter Tight)', disp: "'Inter Tight', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", feel: 'Pure clean · Vercel / Linear', dispWeight: 600, bodyWeight: 400, dispItalic: false },
  stripe:      { name: 'Geist + Geist Mono', disp: "'Geist', system-ui, sans-serif", body: "'Geist', system-ui, sans-serif", feel: 'Technical · precise', dispWeight: 500, bodyWeight: 400, dispItalic: false },
  serifmono:   { name: 'DM Serif Display + IBM Plex Sans', disp: "'DM Serif Display', Georgia, serif", body: "'IBM Plex Sans', system-ui, sans-serif", feel: 'Bold serif headline · corporate body', dispWeight: 400, bodyWeight: 400, dispItalic: false },
  softsans:    { name: 'Work Sans everywhere', disp: "'Work Sans', system-ui, sans-serif", body: "'Work Sans', system-ui, sans-serif", feel: 'Rounded · approachable', dispWeight: 600, bodyWeight: 400, dispItalic: false },
  newsreader:  { name: 'Newsreader + Manrope', disp: "'Newsreader', Georgia, serif", body: "'Manrope', system-ui, sans-serif", feel: 'Longform · reading-first', dispWeight: 500, bodyWeight: 400, dispItalic: true },
  grotesk:     { name: 'Space Grotesk + Inter', disp: "'Space Grotesk', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif", feel: 'Slightly quirky · product-y', dispWeight: 600, bodyWeight: 400, dispItalic: false },
};

// Add a cheap "fonts loaded" stub — these are all already loaded or fallback cleanly.
// Inject extra Google Fonts once.
(function loadV2Fonts(){
  if (document.getElementById('v2-fonts')) return;
  const l = document.createElement('link');
  l.id = 'v2-fonts';
  l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Host+Grotesk:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter+Tight:wght@400;500;600;700&family=DM+Serif+Display&family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Manrope:wght@400;500;600;700&display=swap';
  document.head.appendChild(l);
})();

// ---------- Card tiers ----------
const v2 = {
  // Soft white / warm cream — the main surface
  soft: {
    background: 'linear-gradient(180deg, #fff 0%, #fbf5ea 100%)',
    border: '1px solid #ece2d0',
    borderRadius: 18,
    boxShadow: '0 6px 20px -10px rgba(42,31,23,0.1)',
  },
  // Ink card — dark warm, for AI + data
  ink: {
    background: 'linear-gradient(180deg, #2a1f17 0%, #1f1610 100%)',
    border: '1px solid #3d2e1f',
    borderRadius: 18,
    color: '#fbf5ea',
    boxShadow: '0 10px 30px -14px rgba(42,31,23,0.4)',
  },
  // Muted panel (flat cream, for subtle groupings)
  muted: {
    background: '#f8f1e3',
    border: '1px solid #ece2d0',
    borderRadius: 14,
  },
};

// Font-scoped wrapper — every v2 screen renders inside one of these
function FontScope({ fontKey = 'hostGrotesk', children, style }) {
  const f = v2Fonts[fontKey];
  return <div style={{
    fontFamily: f.body, fontWeight: f.bodyWeight,
    '--v2-disp': f.disp,
    '--v2-disp-weight': f.dispWeight,
    '--v2-disp-italic': f.dispItalic ? 'italic' : 'normal',
    color: 'var(--ink)',
    ...style,
  }}>{children}</div>;
}
// Shortcut display-text component
function DispH({ size = 28, children, style }) {
  return <div style={{
    fontFamily: 'var(--v2-disp)',
    fontWeight: 'var(--v2-disp-weight)',
    fontStyle: 'var(--v2-disp-italic)',
    fontSize: size, lineHeight: 1.1, letterSpacing: -0.01,
    ...style,
  }}>{children}</div>;
}

// Soft card
function SCard({ children, style, pad = 18 }) {
  return <div style={{ ...v2.soft, padding: pad, ...style }}>{children}</div>;
}
// Ink card
function ICard({ children, style, pad = 18 }) {
  return <div style={{ ...v2.ink, padding: pad, ...style }}>{children}</div>;
}
// Pill / chip
function V2Chip({ children, tone = 'neutral' }) {
  const tones = {
    neutral: { bg: '#f5ead7', col: 'var(--ink)', bd: '#e0d1b3' },
    sage:    { bg: '#e3ead4', col: '#4a5840', bd: '#c9d3b9' },
    rose:    { bg: '#f2d9cc', col: '#6d3a2c', bd: '#e4bfaf' },
    tan:     { bg: '#f0e5d0', col: '#6b4d24', bd: '#dfce9f' },
    ink:     { bg: '#2a1f17', col: '#fbf5ea', bd: '#3d2e1f' },
    ghost:   { bg: 'transparent', col: 'var(--muted)', bd: '#e0d5c2' },
  };
  const t = tones[tone] || tones.neutral;
  return <span style={{
    display:'inline-flex', alignItems:'center', gap: 5,
    padding:'3px 10px', borderRadius: 999,
    background: t.bg, color: t.col,
    fontSize: 11, fontWeight: 500, letterSpacing: 0.1,
    border: `1px solid ${t.bd}`,
    whiteSpace: 'nowrap',
  }}>{children}</span>;
}

function V2Spark({ data, color = '#8a9b7f', height = 36, width = 120 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(' ');
  const area = `0,${height} ${pts} ${width},${height}`;
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  return <svg width={width} height={height} style={{ display:'block' }}>
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.25" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <polygon points={area} fill={`url(#${gid})`} />
    <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

// ============================================================
// TYPOGRAPHY PICKER — shows all 8 options side-by-side
// ============================================================
function V2_TypePicker() {
  return <Desktop active="Visual System" url="command.app/visual/typography">
    <FontScope fontKey="hostGrotesk">
      <SCard>
        <V2Chip tone="tan">typography</V2Chip>
        <DispH size={36} style={{ marginTop: 10 }}>Pick a typographic voice</DispH>
        <div style={{ opacity: 0.7, marginTop: 6, maxWidth: 560 }}>
          Same two card tiers, different typefaces. Each specimen shows the feeling, not just the letters.
        </div>
      </SCard>
    </FontScope>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 14, marginTop: 14 }}>
      {Object.entries(v2Fonts).map(([key, f])=>(
        <FontScope key={key} fontKey={key}>
          <SCard style={{ padding: 0, overflow:'hidden' }}>
            {/* Header bar */}
            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding: '10px 16px', borderBottom:'1px solid #ece2d0',
              background:'#fbf5ea',
            }}>
              <div style={{ display:'flex', gap: 8, alignItems:'center' }}>
                <span style={{ fontFamily:'var(--font-mono)', fontSize: 10, opacity: 0.6 }}>{key.toUpperCase()}</span>
                <V2Chip tone="ghost">{f.feel}</V2Chip>
              </div>
              <span style={{ fontSize: 11, opacity: 0.6 }}>{f.name}</span>
            </div>

            {/* Specimen */}
            <div style={{ padding: 20 }}>
              <DispH size={12} style={{ textTransform:'uppercase', letterSpacing: 0.15, opacity: 0.5, fontStyle:'normal' }}>Friday · April 17</DispH>
              <DispH size={40} style={{ marginTop: 4 }}>Good evening, Dana.</DispH>
              <div style={{ fontSize: 15, marginTop: 8, opacity: 0.85, lineHeight: 1.5 }}>
                Your pipeline is <b style={{ color: '#4a5840' }}>$94,200</b> — two deals close this month. One open house tomorrow, 42 visitors expected.
              </div>

              {/* Mini KPI row */}
              <div style={{ display:'flex', gap: 10, marginTop: 16 }}>
                {[
                  ['Pipeline','$94.2k'],
                  ['Cap','77%'],
                  ['Hot','6'],
                ].map(([l,v])=>(
                  <div key={l} style={{
                    flex: 1, padding: 12, background:'#fff',
                    border:'1px solid #ece2d0', borderRadius: 12,
                  }}>
                    <div style={{ fontSize: 10, textTransform:'uppercase', letterSpacing: 0.1, opacity: 0.55 }}>{l}</div>
                    <DispH size={24} style={{ marginTop: 2 }}>{v}</DispH>
                  </div>
                ))}
              </div>

              {/* Body sample */}
              <div style={{ marginTop: 16, padding: 14, background:'#fbf5ea', borderRadius: 12, border:'1px solid #ece2d0' }}>
                <div style={{ fontSize: 11, textTransform:'uppercase', letterSpacing: 0.1, opacity: 0.55, marginBottom: 4 }}>body at 14/22</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  Sarah McCallister just viewed 42 Oak for the second time this week. She's looking in the $720–760k range and keeps lingering on the kitchen photos. Want me to draft a soft nudge?
                </div>
              </div>

              {/* Choose button */}
              <div style={{ marginTop: 16, display:'flex', gap: 6, alignItems:'center' }}>
                <button style={{
                  padding:'8px 14px', borderRadius: 999, border:'none',
                  background:'var(--ink)', color:'#fbf5ea',
                  fontSize: 12, fontWeight: 600, fontFamily: f.body,
                }}>use this →</button>
                <V2Chip tone="ghost">display: {f.disp.split(',')[0].replace(/'/g,'')}</V2Chip>
                <V2Chip tone="ghost">body: {f.body.split(',')[0].replace(/'/g,'')}</V2Chip>
              </div>
            </div>
          </SCard>
        </FontScope>
      ))}
    </div>

    {/* Summary */}
    <FontScope fontKey="hostGrotesk">
      <SCard style={{ marginTop: 14 }}>
        <V2Chip tone="sage">recommendation</V2Chip>
        <DispH size={22} style={{ marginTop: 10 }}>Three that feel most "Dana":</DispH>
        <ul style={{ margin:'10px 0 0 18px', fontSize: 14, lineHeight: 1.8 }}>
          <li><b>Host Grotesk + Instrument Serif</b> — warm editorial, italic serif for moments that need soul</li>
          <li><b>Fraunces + Inter</b> — softer magazine feel, friendlier than a luxury brokerage</li>
          <li><b>Newsreader + Manrope</b> — if longform blog is a heavy part of the mix</li>
        </ul>
        <div style={{ marginTop: 10, fontSize: 13, opacity: 0.7 }}>
          The rest are solid fallbacks if you want the UI more "tech product" than "editorial."
        </div>
      </SCard>
    </FontScope>
  </Desktop>;
}

// ============================================================
// MOBILE + DESKTOP screens using ONLY soft + ink cards
// (Rendered inside a single default font scope — picker lets you flip)
// ============================================================

function V2_MobileHome() {
  return <Phone tabbarItems={[{label:'Home',active:true},{label:'Prospect'},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
   <FontScope fontKey="hostGrotesk">
    <div style={{ padding: '8px 4px' }}>
      <div className="row between center">
        <div>
          <div style={{ fontSize: 11, opacity: 0.5, textTransform:'uppercase', letterSpacing: 0.1 }}>Friday · Apr 17</div>
          <DispH size={26} style={{ marginTop: 2 }}>Good evening,<br/>Dana.</DispH>
        </div>
        <Avatar initials="DM" size={40} />
      </div>
    </div>

    {/* HERO — soft card */}
    <SCard style={{ marginTop: 8 }}>
      <div className="row between center">
        <V2Chip tone="tan">today's focus</V2Chip>
        <span style={{ fontSize: 11, opacity: 0.55 }}>3 of 8 done</span>
      </div>
      <DispH size={20} style={{ marginTop: 8 }}>
        Counter Sarah's offer before noon · <span style={{ color:'#8a5c4f' }}>$762k</span>
      </DispH>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
        AI drafted · 2 comps attached · inspection rider included
      </div>
      <div style={{ display:'flex', gap: 6, marginTop: 12 }}>
        <button style={{ padding:'8px 14px', borderRadius: 999, border:'none', background:'var(--ink)', color:'#fbf5ea', fontSize: 12, fontWeight: 600 }}>open draft →</button>
        <button style={{ padding:'8px 14px', borderRadius: 999, background:'#fbf5ea', color:'var(--ink)', border:'1px solid #ece2d0', fontSize: 12 }}>snooze 1h</button>
      </div>
    </SCard>

    {/* Stat pair — ink + soft */}
    <div style={{ display:'flex', gap: 8, marginTop: 10 }}>
      <ICard style={{ flex: 1, padding: 14 }}>
        <div style={{ fontSize: 10, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>Pipeline</div>
        <DispH size={22}>$94.2k</DispH>
        <V2Spark data={[4,5,4,6,7,8,9,11]} color="#c9a274" width={90} height={28} />
      </ICard>
      <SCard style={{ flex: 1, padding: 14 }}>
        <div style={{ fontSize: 10, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>Hot leads</div>
        <DispH size={22}>6</DispH>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>2 waiting reply →</div>
      </SCard>
    </div>

    {/* Shortcuts */}
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 10, opacity: 0.5, textTransform:'uppercase', letterSpacing: 0.1, marginBottom: 8 }}>Shortcuts</div>
      <div style={{ display:'flex', gap: 6, flexWrap:'wrap' }}>
        {[['📞 call list','neutral'],['🏠 add listing','neutral'],['✧ AI compose','tan'],['📸 content','neutral'],['QR: open house','ink']].map(([l,t])=><V2Chip key={l} tone={t}>{l}</V2Chip>)}
      </div>
    </div>

    {/* Timeline list */}
    <div style={{ marginTop: 14 }}>
      <div className="row between center" style={{ marginBottom: 8 }}>
        <DispH size={16}>Rest of today</DispH>
        <span style={{ fontSize: 11, opacity: 0.55 }}>5 items</span>
      </div>
      {[
        ['4:00','Showing · 42 Oak · Kim Pair','#8a9b7f'],
        ['5:30','Drive to signing · 88 Elm','#c9a274'],
        ['6:15','Final signing · Reid family','#c78b7a'],
        ['7:30','Dinner · family','#b8ad9d'],
      ].map(([t,l,c],i)=>(
        <div key={i} style={{ display:'flex', gap: 10, alignItems:'center', padding:'10px 14px', marginBottom: 6, background:'#fff', borderRadius: 14, border:'1px solid #ece2d0' }}>
          <div style={{ width: 4, height: 32, background: c, borderRadius: 2 }} />
          <span style={{ fontFamily:'var(--font-mono)', fontSize: 11, width: 36, opacity: 0.6 }}>{t}</span>
          <span style={{ fontSize: 13, flex: 1 }}>{l}</span>
        </div>
      ))}
    </div>
   </FontScope>
  </Phone>;
}

function V2_DesktopDash() {
  return <Desktop active="Home" url="command.app">
   <FontScope fontKey="hostGrotesk">
    {/* Greeting — soft */}
    <SCard pad={24}>
      <div className="row between center">
        <div>
          <V2Chip tone="neutral">Friday · April 17</V2Chip>
          <DispH size={36} style={{ marginTop: 10 }}>Good evening, Dana.</DispH>
          <div style={{ fontSize: 15, opacity: 0.7, marginTop: 6 }}>
            You're <b style={{ color:'#4a5840' }}>$18,400 / $24,000</b> to cap · two deals out.
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <V2Spark data={[2,4,3,5,6,7,9,12,14]} color="#c9a274" width={180} height={56} />
          <div style={{ fontSize: 11, opacity: 0.55, marginTop: 4 }}>Pipeline · 9-week trend</div>
        </div>
      </div>
    </SCard>

    {/* Stat grid — all soft */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 12, marginTop: 12 }}>
      {[
        { lab:'Cap progress', v:'77%', s:'$5,600 to go', spark:[4,5,6,7,8,9,10], c:'#8a9b7f' },
        { lab:'Hot leads', v:'6', s:'2 waiting reply', spark:[2,3,2,4,3,5,6], c:'#c9a274' },
        { lab:'Open deals', v:'4', s:'1 at contract', spark:[1,2,3,2,3,4,4], c:'#c78b7a' },
        { lab:'YTD GCI', v:'$147.8k', s:'+22% vs 2025', spark:[10,12,14,18,22,28,34], c:'#8a9b7f' },
      ].map((s,i)=>(
        <SCard key={i} pad={16}>
          <div style={{ fontSize: 10, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>{s.lab}</div>
          <DispH size={30} style={{ marginTop: 4 }}>{s.v}</DispH>
          <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>{s.s}</div>
          <div style={{ marginTop: 8 }}><V2Spark data={s.spark} color={s.c} width={160} height={32} /></div>
        </SCard>
      ))}
    </div>

    {/* 2-col: soft queue + ink AI */}
    <div className="row" style={{ gap: 12, marginTop: 12 }}>
      <SCard className="grow" pad={20}>
        <div className="row between center">
          <DispH size={18}>Today's queue</DispH>
          <V2Chip tone="sage">on track</V2Chip>
        </div>
        <div style={{ marginTop: 12 }}>
          {[
            ['09:00','Listing appt · Marcus Reid','done','sage'],
            ['10:30','Showings · Kim Pair (3)','done','sage'],
            ['12:00','Counter Sarah M. — $762k','now','rose'],
            ['14:00','Content batch · 6 posts','up next','neutral'],
            ['16:00','Walk-through · 88 Elm','up next','neutral'],
            ['18:00','Signing · Reid family','up next','neutral'],
          ].map(([t,l,s,c],i)=>(
            <div key={i} style={{
              display:'flex', alignItems:'center', gap: 12,
              padding:'10px 0', borderBottom: i<5 ? '1px solid #ece2d0' : 'none',
            }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize: 11, width: 48, opacity: 0.55 }}>{t}</span>
              <span style={{ flex: 1, fontWeight: 500, fontSize: 14 }}>{l}</span>
              <V2Chip tone={c}>{s}</V2Chip>
            </div>
          ))}
        </div>
      </SCard>

      <ICard pad={20} style={{ width: 320 }}>
        <div style={{ fontSize: 11, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>Pipeline · stages</div>
        <DispH size={26} style={{ marginTop: 4, color:'#fbf5ea' }}>$94,200</DispH>
        <div style={{ fontSize: 12, opacity: 0.6 }}>6 deals · 4 close this month</div>
        <div style={{ marginTop: 16 }}>
          {[
            ['Prospect',18,'#c9a274'],
            ['Consult',12,'#c78b7a'],
            ['Listed',8,'#8a9b7f'],
            ['Under contract',4,'#d4a373'],
            ['Closing',2,'#fbf5ea'],
          ].map(([l,n,c],i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 90, fontSize: 12, opacity: 0.85 }}>{l}</span>
              <div style={{ flex: 1, height: 8, background:'rgba(255,255,255,0.08)', borderRadius: 999, overflow:'hidden' }}>
                <div style={{ width: `${(n/18)*100}%`, height:'100%', background: c, borderRadius: 999 }} />
              </div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize: 11, width: 24, textAlign:'right', opacity: 0.9 }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background:'rgba(251,245,234,0.06)', border:'1px solid rgba(251,245,234,0.1)' }}>
          <div style={{ fontSize: 10, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>✦ AI insight</div>
          <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
            3 consult-stage leads haven't been contacted in 9+ days. Nudge before weekend?
          </div>
        </div>
      </ICard>
    </div>

    {/* Activity — soft */}
    <SCard pad={20}>
      <div className="row between center">
        <DispH size={18}>Recent activity</DispH>
        <span style={{ fontSize: 11, opacity: 0.55 }}>last 2 hours</span>
      </div>
      <div style={{ marginTop: 10 }}>
        {[
          ['📸','Jake uploaded 42 Oak photos','2m ago'],
          ['✉','Kim Pair opened follow-up email 3×','18m ago'],
          ['🏠','New OH sign-in · M. Patel (pre-approved)','42m ago'],
          ['💬','Showing feedback · 9 Juniper · 4.5 ★','1h ago'],
          ['💵','Invoice paid · SentriLock · $1,140','1h ago'],
        ].map(([ic,l,t],i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap: 12, padding:'8px 0', borderBottom: i<4 ? '1px solid #ece2d0' : 'none' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background:'#fbf5ea', border:'1px solid #ece2d0', display:'flex', alignItems:'center', justifyContent:'center' }}>{ic}</div>
            <span style={{ flex: 1, fontSize: 13 }}>{l}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize: 11, opacity: 0.55 }}>{t}</span>
          </div>
        ))}
      </div>
    </SCard>
   </FontScope>
  </Desktop>;
}

function V2_PropertyDetail() {
  return <Desktop active="Properties" url="command.app/p/42-oak">
   <FontScope fontKey="hostGrotesk">
    {/* Property hero — soft with an image slot (no gradient behind) */}
    <SCard pad={0} style={{ overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap: 0 }}>
        {/* Image placeholder — flat muted tone */}
        <div style={{
          minHeight: 220, background: '#eadfc8',
          display:'flex', alignItems:'flex-end', padding: 20,
          position:'relative', borderRight:'1px solid #ece2d0',
        }}>
          <div style={{ position:'absolute', top: 14, left: 14 }}>
            <V2Chip tone="ink">🏠 Seller · Chen Family</V2Chip>
          </div>
          <div style={{ position:'absolute', inset: 0, display:'flex', alignItems:'center', justifyContent:'center', opacity: 0.35, fontSize: 11, letterSpacing: 0.2, textTransform:'uppercase' }}>[ listing photo ]</div>
          <div style={{ position:'relative' }}>
            <div style={{ fontSize: 11, opacity: 0.7, textTransform:'uppercase', letterSpacing: 0.15 }}>Active · MLS #8821</div>
            <DispH size={30} style={{ marginTop: 4 }}>42 Oak Street</DispH>
            <div style={{ fontSize: 14, opacity: 0.75, marginTop: 2 }}>Oak Park · 4bd · 3ba · 2,840 sqft</div>
          </div>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ fontSize: 11, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>List price</div>
          <DispH size={36}>$895,000</DispH>
          <div style={{ display:'flex', gap: 8, marginTop: 8, alignItems:'center' }}>
            <V2Chip tone="rose">−3.2% from list</V2Chip>
            <span style={{ fontSize: 11, opacity: 0.55 }}>12 DOM · area avg 34</span>
          </div>
          <div style={{ marginTop: 14, padding: 12, background:'#fbf5ea', borderRadius: 12, border:'1px solid #ece2d0' }}>
            <div className="row between"><span style={{ fontSize: 11, opacity: 0.6 }}>Proj. commission</span><span style={{ fontFamily:'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>$22,375</span></div>
            <div className="row between" style={{ marginTop: 4 }}><span style={{ fontSize: 11, opacity: 0.6 }}>Net to Dana</span><span style={{ fontFamily:'var(--font-mono)', fontSize: 13, fontWeight: 600, color:'#4a5840' }}>$12,884</span></div>
          </div>
        </div>
      </div>
    </SCard>

    {/* 3-up performance — all soft */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 12, marginTop: 12 }}>
      <SCard pad={16}>
        <div style={{ fontSize: 10, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>7-day views</div>
        <DispH size={28}>1,284</DispH>
        <V2Spark data={[40,82,124,210,180,248,400]} color="#8a9b7f" width={220} height={36} />
        <div style={{ display:'flex', gap: 4, marginTop: 8, flexWrap:'wrap' }}>
          <V2Chip tone="neutral">Zillow 482</V2Chip>
          <V2Chip tone="neutral">Realtor 612</V2Chip>
          <V2Chip tone="neutral">MLS 190</V2Chip>
        </div>
      </SCard>
      <SCard pad={16}>
        <div style={{ fontSize: 10, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>Saves + showings</div>
        <div style={{ display:'flex', gap: 14, marginTop: 6, alignItems:'baseline' }}>
          <div><DispH size={28}>110</DispH><div style={{ fontSize: 10, opacity: 0.55 }}>saves</div></div>
          <div><DispH size={28}>6</DispH><div style={{ fontSize: 10, opacity: 0.55 }}>showings</div></div>
          <div><DispH size={28}>2</DispH><div style={{ fontSize: 10, opacity: 0.55 }}>OHs</div></div>
        </div>
      </SCard>
      <SCard pad={16}>
        <div style={{ fontSize: 10, opacity: 0.55, textTransform:'uppercase', letterSpacing: 0.1 }}>Marketing spent</div>
        <DispH size={28}>$3,730</DispH>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>photo · drone · staging · signs</div>
        <div style={{ height: 6, background:'#ece2d0', borderRadius: 999, marginTop: 12, overflow:'hidden' }}>
          <div style={{ width:'64%', height:'100%', background:'#8a9b7f' }} />
        </div>
        <div style={{ fontSize: 11, opacity: 0.65, marginTop: 4 }}>16.7% of commission · healthy</div>
      </SCard>
    </div>

    {/* AI rec — ink */}
    <ICard style={{ marginTop: 12 }}>
      <div className="row between center">
        <V2Chip tone="neutral">✦ AI recommendation · 78% confidence</V2Chip>
        <span style={{ fontSize: 11, opacity: 0.55 }}>based on comps + feedback + DOM trend</span>
      </div>
      <DispH size={22} style={{ color:'#fbf5ea', marginTop: 10, maxWidth: 700 }}>
        Consider a <span style={{ color:'#c9a274' }}>$20k reduction to $875k</span> this week — it re-triggers alerts on Zillow and matches where comps are closing.
      </DispH>
      <div style={{ display:'flex', gap: 8, marginTop: 14 }}>
        <button style={{ padding:'8px 16px', borderRadius: 999, border:'none', background:'#fbf5ea', color:'var(--ink)', fontSize: 12, fontWeight: 600 }}>draft email to Chen →</button>
        <button style={{ padding:'8px 16px', borderRadius: 999, background:'transparent', color:'#fbf5ea', border:'1px solid rgba(251,245,234,0.3)', fontSize: 12 }}>see reasoning</button>
      </div>
    </ICard>
   </FontScope>
  </Desktop>;
}

function V2_System() {
  return <Desktop active="Visual System" url="command.app/visual">
   <FontScope fontKey="hostGrotesk">
    <SCard>
      <V2Chip tone="tan">visual direction v2</V2Chip>
      <DispH size={32} style={{ marginTop: 10 }}>Two card tiers. Calm typography. No gradients.</DispH>
      <div style={{ maxWidth: 560, marginTop: 6, fontSize: 14, opacity: 0.7 }}>
        The whole UI is either a <b>soft white card</b> or an <b>ink card</b>. Color comes from accent chips + small data marks, not backgrounds.
      </div>
    </SCard>

    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14, marginTop: 14 }}>
      <SCard>
        <V2Chip tone="neutral">soft card</V2Chip>
        <DispH size={20} style={{ marginTop: 8 }}>The primary surface.</DispH>
        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.75, lineHeight: 1.6 }}>
          Every list, stat, dashboard, and content screen uses this. Warm off-white with a thin border and a whisper of shadow. No radial gradients, no color washes.
        </div>
      </SCard>
      <ICard>
        <V2Chip tone="neutral">ink card</V2Chip>
        <DispH size={20} style={{ color:'#fbf5ea', marginTop: 8 }}>Reserved for depth.</DispH>
        <div style={{ fontSize: 13, marginTop: 6, opacity: 0.75, lineHeight: 1.6 }}>
          AI insights, pipeline visualizations, and key CTAs. Use sparingly — one or two per screen — so it stays meaningful.
        </div>
      </ICard>
    </div>

    {/* Chip system */}
    <SCard>
      <V2Chip tone="neutral">chips</V2Chip>
      <DispH size={18} style={{ marginTop: 8 }}>Six tones, one shape.</DispH>
      <div style={{ display:'flex', gap: 6, marginTop: 10, flexWrap:'wrap' }}>
        <V2Chip tone="neutral">neutral</V2Chip>
        <V2Chip tone="sage">sage · positive</V2Chip>
        <V2Chip tone="rose">rose · attention</V2Chip>
        <V2Chip tone="tan">tan · content</V2Chip>
        <V2Chip tone="ink">ink · primary</V2Chip>
        <V2Chip tone="ghost">ghost</V2Chip>
      </div>
    </SCard>

    {/* Rules */}
    <SCard>
      <V2Chip tone="neutral">rules</V2Chip>
      <ul style={{ margin:'10px 0 0 18px', fontSize: 14, lineHeight: 1.8 }}>
        <li>Cards only in two tiers: <b>soft</b> or <b>ink</b>. No color backgrounds.</li>
        <li>Color appears only in chips, sparklines, status dots, and type accents.</li>
        <li>Border-radius: cards 18, inner panels 12, chips & buttons 999.</li>
        <li>Shadows are warm — <code>rgba(42,31,23, …)</code>. Never neutral gray.</li>
        <li>One ink card per screen maximum (two on data-heavy screens).</li>
        <li>Display font is configurable; body font pairs with it automatically.</li>
      </ul>
    </SCard>
   </FontScope>
  </Desktop>;
}

window.VisualV2Screens = [
  { id:'v2-type', label:'✦ Typography picker', caption:'8 font pairings side-by-side — same layout, different voice.', Component: V2_TypePicker },
  { id:'v2-sys',  label:'V2 · System', caption:'Two card tiers, chip tones, rules. No gradients.', Component: V2_System },
  { id:'v2-dash', label:'V2 · Desktop dashboard', caption:'Greeting, 4 soft stats, queue + ink AI panel, activity feed.', Component: V2_DesktopDash },
  { id:'v2-prop', label:'V2 · Property detail', caption:'Photo hero (placeholder), perf cards, ink AI recommendation.', Component: V2_PropertyDetail },
  { id:'v2-home', label:'V2 · Mobile home', caption:'Soft hero + mixed stat pair (ink/soft) + timeline cards.', Component: V2_MobileHome },
];

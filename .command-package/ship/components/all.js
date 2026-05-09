const { useState, useEffect, useRef, useMemo, Fragment } = React;

/* ===== components/kit.jsx ===== */
// Wireframe kit components — sketchy primitives shared across screens
// [removed duplicate React destructure]
// Sketchy icon that's just a labeled box (for low-fi)
function Ic({ label = '', size = 14, color = 'var(--line)' }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      border: `1.2px solid ${color}`, borderRadius: 3,
      fontSize: size * 0.6, fontFamily: "'Patrick Hand',cursive",
      textAlign: 'center', lineHeight: `${size - 2}px`,
      color, flexShrink: 0,
    }}>{label}</span>
  );
}

function Box({ children, style = {}, dashed, filled, ink, accent, tan, sage, double, className = '', ...rest }) {
  const cls = ['wf-box',
    dashed && 'dashed', filled && 'filled',
    ink && 'ink', accent && 'accent', tan && 'tan', sage && 'sage',
    double && 'double', className
  ].filter(Boolean).join(' ');
  return <div className={cls} style={style} {...rest}>{children}</div>;
}

function Chip({ children, filled, tan, sage, rose, dot, style = {} }) {
  const cls = ['wf-chip', filled && 'filled', tan && 'tan', sage && 'sage', rose && 'rose', dot && 'dot'].filter(Boolean).join(' ');
  return <span className={cls} style={style}>{children}</span>;
}

function Btn({ children, primary, tan, sage, ghost, sm, onClick, style = {} }) {
  const cls = ['wf-btn', primary && 'primary', tan && 'tan', sage && 'sage', ghost && 'ghost', sm && 'sm'].filter(Boolean).join(' ');
  return <button className={cls} onClick={onClick} style={style}>{children}</button>;
}

function Input({ placeholder = '', dashed, value, style = {} }) {
  return <div className={'wf-input ' + (dashed ? 'dashed' : '')} style={{...style, color: value ? 'var(--ink)' : 'var(--muted)'}}>
    {value || placeholder}
  </div>;
}

function Img({ label = 'photo', w = '100%', h = 100, style = {} }) {
  return <div className="wf-img" style={{ width: w, height: h, ...style }}>{label}</div>;
}

function Avatar({ initials = 'DM', size = 36, color = 'var(--accent-tan)', style = {} }) {
  return <div className="wf-avatar" style={{ width: size, height: size, background: color, fontSize: size * 0.5, ...style }}>{initials}</div>;
}

function Stat({ n, l, style = {} }) {
  return <div className="wf-stat" style={style}>
    <span className="n">{n}</span>
    <span className="l">{l}</span>
  </div>;
}

function Check({ children, done }) {
  return <div className={'wf-check ' + (done ? 'done' : '')}>
    <span className="box">{done ? '✓' : ''}</span>
    <span className="label">{children}</span>
  </div>;
}

function Bar({ pct = 40, color = 'var(--accent)', style = {} }) {
  return <div className="wf-bar" style={style}>
    <span style={{ width: `${pct}%`, background: color }} />
  </div>;
}

function Sticky({ children, rot = -1.2, style = {} }) {
  return <div className="wf-sticky" style={{ transform: `rotate(${rot}deg)`, ...style }}>{children}</div>;
}

function AI({ children = 'AI' }) {
  return <span className="ai-badge">{children}</span>;
}

function Hr() { return <hr className="wf-hr" />; }

function UL({ children, accent }) {
  return <span className={'wf-ul ' + (accent ? 'accent' : '')}>{children}</span>;
}

// Squiggly arrow between two things
function Arrow({ children = '→' }) {
  return <span className="wf-arrow">{children}</span>;
}

// Red-pen annotation
function Anno({ children, style = {} }) {
  return <span className="wf-anno" style={style}>{children}</span>;
}

// Frame wrapper with label + caption
function Frame({ label, caption, children }) {
  return <div className="variation-cell">
    <div className="wf-frame-label">{label}</div>
    {caption && <div className="wf-frame-caption">{caption}</div>}
    {children}
  </div>;
}

// Phone shell (low-fi, ~iPhone proportions)
function Phone({ children, nav = true, scale = 1, style = {}, tabbarItems }) {
  const tabs = tabbarItems || [
    { label: 'Home', active: true },
    { label: 'CRM' },
    { label: 'Deals' },
    { label: 'Content' },
    { label: 'More' },
  ];
  return <div className="phone-shell" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', ...style }}>
    <div className="phone-top-nav">
      {['Home','Prospect','CRM','Deals','Content','Email'].map((t, i) => (
        <span key={t} className={'pitem ' + (i === 0 ? 'active' : '')}>{t}</span>
      ))}
    </div>
    <div className="phone-body">{children}</div>
    {nav && <div className="phone-tabbar">
      {tabs.map((t, i) => (
        <div key={i} className={'pt ' + (t.active ? 'active' : '')}>
          <span className="icon" />
          <span>{t.label}</span>
        </div>
      ))}
    </div>}
  </div>;
}

// Desktop shell with sidebar + top nav
function Desktop({ active = 'Home', title = 'Command', url = 'command.app', children, width = '100%' }) {
  const navItems = ['Home','Prospect','CRM','Deals','Content','Email','Bio Link','Money','Toolkit','Settings'];
  return <div className="desktop-shell" style={{ width }}>
    <div className="desktop-chrome">
      <span className="dot" style={{ background: '#e48179' }} />
      <span className="dot" style={{ background: '#e5c86b' }} />
      <span className="dot" style={{ background: '#8fb77a' }} />
      <span className="url">{url}</span>
    </div>
    <div className="top-nav">
      <span className="hand-alt" style={{  marginRight: 16, fontSize: 16 }}>Command</span>
      {navItems.map(n => (
        <span key={n} className={'nav-item ' + (n === active ? 'active' : '')}>{n}</span>
      ))}
    </div>
    <div className="desktop-body">
      <div className="side-nav">
        <div className="logo">Command</div>
        {navItems.map(n => (
          <div key={n} className={'nav-item ' + (n === active ? 'active' : '')}>
            <span className="ic" />{n}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--muted)', padding: '8px 10px' }}>
          Dana Massey<br/>
          <span style={{ fontSize: 10 }}>Friday, Apr 17</span>
        </div>
      </div>
      <div className="main-area">{children}</div>
    </div>
  </div>;
}

Object.assign(window, { Ic, Box, Chip, Btn, Input, Img, Avatar, Stat, Check, Bar, Sticky, AI, Hr, UL, Arrow, Anno, Frame, Phone, Desktop });


/* ===== components/mobile-dash.jsx ===== */
// Mobile: Dashboard / Home — 5 variations
// Each is a different structural/navigational approach to the daily command center.

// === V1: Classic card stack (matches existing app) ===
function DashV1_Classic() {
  return <Phone tabbarItems={[{label:'Home',active:true},{label:'Prospect'},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center" style={{ padding: '2px 4px' }}>
      <span className="hand-neat" style={{ fontSize: 14 }}>☰  Dana Massey</span>
      <Avatar initials="+" size={28} color="var(--accent)" style={{ color: 'var(--paper)' }} />
    </div>
    <div className="serif" style={{ fontSize: 20, marginTop: 4 }}>Good evening, Dana</div>
    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>FRIDAY · APR 17</div>

    <Box style={{ padding: 10 }}>
      <div className="hand-neat tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 0.1 }}>Portfolio</div>
      <div className="serif" style={{ fontSize: 22 }}>$2.3M</div>
    </Box>
    <div className="row">
      <Box className="grow" style={{ padding: 10 }}>
        <div className="tiny muted mono">LISTINGS</div>
        <div className="serif" style={{ fontSize: 20 }}>2</div>
      </Box>
      <Box className="grow" style={{ padding: 10 }}>
        <div className="tiny muted mono">U. CONTRACT</div>
        <div className="serif" style={{ fontSize: 20 }}>7</div>
      </Box>
    </div>
    <Box tan style={{ padding: 10 }}>
      <div className="tiny mono">NET PROFIT</div>
      <div className="serif" style={{ fontSize: 20 }}>$712.99</div>
    </Box>
    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 15 }}>Tasks</span>
        <span className="tiny muted">3/7</span>
      </div>
      <Bar pct={42} style={{ marginTop: 6 }} />
      <div style={{ marginTop: 8 }}>
        <Check done>Call Sarah re: offer</Check>
        <Check>Post carousel — Tue</Check>
        <Check>Prep open house packet</Check>
      </div>
    </Box>
    <Box filled>
      <div className="hand-alt" style={{ fontSize: 16 }}>Annual Goals</div>
      <div className="row" style={{ marginTop: 6 }}>
        {[['Sales', '0/20'],['Listings','0/15'],['Buyers','0/15'],['OH','3/48']].map(([l,v])=>(
          <div key={l} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid var(--line)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="hand-alt">{v.split('/')[0]/Number(v.split('/')[1]) < 0.1 ? '0%' : '6%'}</div>
            <div className="tiny mono muted" style={{ marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
    </Box>
    <Anno style={{ fontSize: 13, alignSelf: 'flex-end' }}>↑ existing pattern</Anno>
  </Phone>;
}

// === V2: Time-ribbon / today-focused ===
function DashV2_Today() {
  return <Phone tabbarItems={[{label:'Today',active:true},{label:'Prospect'},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat" style={{ fontSize: 13 }}>☰</span>
      <span className="serif" style={{ fontSize: 15 }}>Today</span>
      <Avatar initials="DM" size={26} />
    </div>
    <Box accent style={{ padding: 10 }}>
      <div className="tiny mono" style={{ opacity: 0.7 }}>FRIDAY · APR 17 · 9:13 PM</div>
      <div className="hand-alt" style={{ fontSize: 20, marginTop: 4 }}>Prospect window closes in 47 min</div>
      <div className="row" style={{ marginTop: 8, gap: 6 }}>
        <Btn sm style={{ background: 'var(--paper)', color: 'var(--ink)' }}>▶ Start</Btn>
        <Btn sm ghost style={{ color: 'var(--paper)', borderColor: 'var(--paper)' }}>Snooze</Btn>
      </div>
    </Box>
    <div className="hand-alt" style={{ fontSize: 18, marginTop: 4 }}>Now</div>
    <Box>
      <div className="row between">
        <span className="hand-neat">Call: Sarah M.</span>
        <Chip tan>offer</Chip>
      </div>
      <div className="tiny muted mono" style={{ marginTop: 2 }}>9:30 — re: 42 Oak offer response</div>
    </Box>
    <div className="hand-alt" style={{ fontSize: 18, marginTop: 8 }}>Next up</div>
    {[
      ['10:00','Post IG carousel',''],
      ['10:30','Expired listings batch','12 letters'],
      ['2:00','Open house prep — 88 Elm',''],
      ['4:30','CMA review: Hernandez','AI draft ready'],
    ].map(([t,l,s])=>(
      <Box key={t} style={{ padding: 8 }}>
        <div className="row between center">
          <div className="row center" style={{ gap: 8 }}>
            <span className="mono tiny" style={{ width: 40 }}>{t}</span>
            <span className="hand-neat">{l}</span>
          </div>
          {s && <span className="tiny muted">{s}</span>}
        </div>
      </Box>
    ))}
    <Hr />
    <div className="row" style={{ gap: 6 }}>
      <Box className="grow" style={{ padding: 6, textAlign: 'center' }}>
        <div className="hand-alt" style={{ fontSize: 18 }}>14</div>
        <div className="tiny mono muted">PROSPECT</div>
      </Box>
      <Box className="grow" style={{ padding: 6, textAlign: 'center' }}>
        <div className="hand-alt" style={{ fontSize: 18 }}>40</div>
        <div className="tiny mono muted">CONTACTS</div>
      </Box>
      <Box className="grow" style={{ padding: 6, textAlign: 'center' }}>
        <div className="hand-alt" style={{ fontSize: 18 }}>7</div>
        <div className="tiny mono muted">DEALS</div>
      </Box>
    </div>
    <Anno style={{ alignSelf: 'flex-end' }}>→ agenda-first, not data-first</Anno>
  </Phone>;
}

// === V3: AI Day Briefing hero ===
function DashV3_AIBriefing() {
  return <Phone tabbarItems={[{label:'Home',active:true},{label:'Prospect'},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat tiny muted">FRI · APR 17</span>
      <Avatar initials="DM" size={26} />
    </div>
    <Box sage style={{ padding: 12 }}>
      <div className="row between center">
        <AI>DAY BRIEFING</AI>
        <span className="tiny" style={{ opacity: 0.8 }}>generated 7:02am</span>
      </div>
      <div className="hand-alt" style={{ fontSize: 17, marginTop: 6, lineHeight: 1.3 }}>
        "3 offers on the table. Sarah's the priority — she asked for a response by noon. The Hernandez listing went live overnight; 4 saves already. I drafted your follow-ups."
      </div>
      <div className="row wrap" style={{ gap: 4, marginTop: 8 }}>
        <Chip style={{ background: 'var(--paper)' }}>Review drafts (3)</Chip>
        <Chip style={{ background: 'var(--paper)' }}>Play audio ▶</Chip>
      </div>
    </Box>
    <div className="hand-alt" style={{ fontSize: 17 }}>Next best action</div>
    <Box double>
      <div className="row between center">
        <div>
          <div className="hand-neat">Respond to Sarah M.</div>
          <div className="tiny muted mono">$740k offer · expires 12pm</div>
        </div>
        <Btn primary sm>Open →</Btn>
      </div>
      <Hr />
      <div className="tiny muted" style={{ marginBottom: 4 }}>AI suggests counter @ $762k — comps attached</div>
      <div className="row" style={{ gap: 4 }}>
        <Btn sm>Counter</Btn>
        <Btn sm>Accept</Btn>
        <Btn sm ghost>See comps</Btn>
      </div>
    </Box>
    <div className="row" style={{ gap: 6 }}>
      <Box className="grow" style={{ padding: 8, textAlign: 'center' }}>
        <Stat n="$2.3M" l="portfolio" />
      </Box>
      <Box className="grow" style={{ padding: 8, textAlign: 'center' }}>
        <Stat n="7" l="under contract" />
      </Box>
    </div>
    <Box filled>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 14 }}>Pulse</span>
        <span className="tiny mono muted">1-MILE RADIUS</span>
      </div>
      <div style={{ marginTop: 6 }} className="tiny">
        <div>🏠 New: 114 Maple · $649k · 3bd</div>
        <div>✓ Sold: 22 Birch · $710k (+4% ask)</div>
        <div>⌛ Price cut: 7 Cedar · −$25k</div>
      </div>
    </Box>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ AI takes the lead</Anno>
  </Phone>;
}

// === V4: Swim-lane / pipeline focused ===
function DashV4_Pipeline() {
  return <Phone tabbarItems={[{label:'Pipeline',active:true},{label:'Prospect'},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 18 }}>Pipeline</span>
      <div className="row" style={{ gap: 4 }}>
        <Chip sage dot>Wk 16</Chip>
        <Avatar initials="DM" size={26} />
      </div>
    </div>
    <div className="row" style={{ gap: 4 }}>
      {[
        ['PROSPECT', 14, 'var(--accent-tan)'],
        ['APPT', 3, 'var(--accent-sage)'],
        ['LISTING', 2, 'var(--accent-rose)'],
        ['U/C', 7, 'var(--accent)'],
        ['CLOSED', 1, 'var(--ink)'],
      ].map(([l,v,c])=>(
        <div key={l} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ height: Math.min(60, v*6+20), background: c, border: '1.5px solid var(--line)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--paper)', fontFamily: 'Caveat, cursive', fontSize: 18 }}>{v}</div>
          <div className="tiny mono muted" style={{ marginTop: 3 }}>{l}</div>
        </div>
      ))}
    </div>
    <Hr />
    <div className="hand-alt" style={{ fontSize: 16 }}>Stuck / needs attention</div>
    {[
      ['Sarah M.','offer · 18h left','var(--accent-rose)'],
      ['Park Listing','no showings in 6d','var(--accent-tan)'],
      ['J. Chen lead','cold · 14d','var(--faint)'],
    ].map(([n,s,c],i)=>(
      <Box key={i} style={{ padding: 8 }}>
        <div className="row between center">
          <div className="row center" style={{ gap: 8 }}>
            <div style={{ width: 4, height: 28, background: c, borderRadius: 2 }} />
            <div>
              <div className="hand-neat" style={{ fontSize: 13 }}>{n}</div>
              <div className="tiny muted mono">{s}</div>
            </div>
          </div>
          <Btn sm>Act</Btn>
        </div>
      </Box>
    ))}
    <div className="hand-alt" style={{ fontSize: 16, marginTop: 4 }}>Conversion <span className="tiny muted">(last 30d)</span></div>
    <Box filled>
      <div className="row between tiny mono">
        <span>Prospect → Appt</span><span>11%</span>
      </div>
      <Bar pct={11} style={{ margin: '4px 0 8px' }} />
      <div className="row between tiny mono">
        <span>Appt → Listing</span><span>66%</span>
      </div>
      <Bar pct={66} style={{ margin: '4px 0 8px' }} />
      <div className="row between tiny mono">
        <span>Listing → Closed</span><span>91%</span>
      </div>
      <Bar pct={91} style={{ margin: '4px 0 0' }} />
    </Box>
    <Anno style={{ alignSelf: 'flex-end' }}>funnel-first view</Anno>
  </Phone>;
}

// === V5: Quick-capture / minimal ===
function DashV5_Capture() {
  return <Phone tabbarItems={[{label:'Home',active:true},{label:'Prospect'},{label:'Capture'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <Avatar initials="DM" size={30} />
      <span className="hand-alt" style={{ fontSize: 16 }}>Evening, Dana</span>
      <span className="hand-neat tiny">☰</span>
    </div>
    <div className="serif" style={{ fontSize: 28, lineHeight: 1.1, marginTop: 6 }}>
      What's on <UL>your mind?</UL>
    </div>
    <Input placeholder="✎ jot a note, a task, an idea…" style={{ minHeight: 60 }} />
    <div className="row wrap" style={{ gap: 4 }}>
      <Chip>+ Task</Chip>
      <Chip>+ Note</Chip>
      <Chip>+ Lead</Chip>
      <Chip>+ Expense</Chip>
      <Chip tan>✦ Ask AI</Chip>
    </div>
    <Hr />
    <div className="row between center">
      <span className="hand-alt" style={{ fontSize: 15 }}>Tap through</span>
      <span className="tiny muted mono">SWIPE →</span>
    </div>
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 2px' }}>
      {[
        ['$2.3M','portfolio','var(--accent-tan)'],
        ['7','u/c','var(--accent-sage)'],
        ['3','tasks','var(--accent-rose)'],
        ['14','prospect','var(--accent)'],
      ].map(([n,l,c],i)=>(
        <div key={i} style={{ minWidth: 90, padding: 10, border: '1.5px solid var(--line)', borderRadius: 12, background: c, color: i===3?'var(--paper)':'var(--ink)' }}>
          <div className="hand-alt" style={{ fontSize: 22 }}>{n}</div>
          <div className="tiny mono" style={{ opacity: 0.7 }}>{l.toUpperCase()}</div>
        </div>
      ))}
    </div>
    <Box dashed>
      <div className="row between center">
        <span className="hand-neat">Shortcuts</span>
        <span className="tiny muted">edit</span>
      </div>
      <div className="row wrap" style={{ gap: 4, marginTop: 6 }}>
        {['📋 OH sign-in','✉ Send follow-up','📞 Expired batch','📊 KPIs','🏡 New listing'].map(s=>(
          <Chip key={s} filled style={{ background: 'var(--paper-2)', color: 'var(--ink)' }}>{s}</Chip>
        ))}
      </div>
    </Box>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ zero friction</Anno>
  </Phone>;
}

window.DashVariations = [
  { id: 'v1', label: 'V1 · Classic stack', caption: 'Matches your existing card-per-metric layout. Familiar but dense.', Component: DashV1_Classic },
  { id: 'v2', label: 'V2 · Today / agenda', caption: 'Ditches the big numbers — opens to a timed schedule and prospect window.', Component: DashV2_Today },
  { id: 'v3', label: 'V3 · AI briefing hero', caption: 'AI speaks first. Every morning: what matters, what to say, what to decide.', Component: DashV3_AIBriefing },
  { id: 'v4', label: 'V4 · Pipeline visual', caption: 'Funnel at a glance. Stuck deals surface themselves.', Component: DashV4_Pipeline },
  { id: 'v5', label: 'V5 · Quick capture', caption: 'Notebook-first. Big text input. Everything else is one tap away.', Component: DashV5_Capture },
];


/* ===== components/mobile-screens.jsx ===== */
// Mobile: Prospecting hub + Expired Listings + Open House + Notes/Tasks + Buyer Showings

// ===================== PROSPECTING HUB (4 variations) =====================
function ProspectV1_Channels() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 18 }}>Prospect</span>
      <Btn sm primary>+ New</Btn>
    </div>
    <Box filled>
      <div className="tiny mono muted">TODAY · DIALER GOAL 40</div>
      <div className="row between center" style={{ marginTop: 4 }}>
        <span className="hand-alt" style={{ fontSize: 22 }}>14 / 40</span>
        <Btn tan sm>Resume ▶</Btn>
      </div>
      <Bar pct={35} style={{ marginTop: 6 }} />
    </Box>
    <div className="hand-alt" style={{ fontSize: 16 }}>Channels</div>
    {[
      ['Expired Listings','12 new · 3 unopened','var(--accent-rose)','letter + call'],
      ['Open House Reach-Out','88 Elm · 22 neighbors','var(--accent-tan)','door-knock'],
      ['FSBO','6 in radius','var(--accent-sage)','email'],
      ['Personal Circle (SOI)','40 contacts','var(--accent)','quarterly touch'],
      ['Past Clients','27 · 4 due soon','var(--ink)','anniversary'],
    ].map(([t,s,c,tag],i)=>(
      <Box key={i} style={{ padding: 10, borderLeft: `4px solid ${c}` }}>
        <div className="row between center">
          <div>
            <div className="hand-neat" style={{ fontSize: 14 }}>{t}</div>
            <div className="tiny muted">{s}</div>
          </div>
          <Chip>{tag}</Chip>
        </div>
      </Box>
    ))}
    <Hr />
    <div className="hand-alt" style={{ fontSize: 15 }}>Auto-send new contacts to…</div>
    <Box dashed>
      <div className="row between center">
        <span className="hand-neat tiny">FB Custom Audience · "Agents 2026"</span>
        <Chip sage dot>ON</Chip>
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>+ Google Customer Match · Mailchimp sync</div>
    </Box>
  </Phone>;
}

function ProspectV2_ExpiredFlow() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat">← Prospect</span>
      <span className="tiny muted mono">EXPIRED LISTINGS</span>
    </div>
    <div className="row wrap" style={{ gap: 4 }}>
      <Chip filled>All 42</Chip>
      <Chip>New 12</Chip>
      <Chip>Called</Chip>
      <Chip>Letter sent</Chip>
      <Chip tan>Hot 3</Chip>
    </div>
    <Box>
      <div className="row between">
        <div>
          <div className="hand-neat">114 Maple St</div>
          <div className="tiny muted">3bd · $649k · 142 DOM · exp 4/14</div>
        </div>
        <Chip rose dot>Hot</Chip>
      </div>
      <Hr />
      <div className="tiny muted">Last agent: Coldwell · priced 8% over comps</div>
      <div className="row" style={{ gap: 4, marginTop: 6 }}>
        <Btn sm primary>📞 Call</Btn>
        <Btn sm>✉ Letter</Btn>
        <Btn sm ghost>AI angle ✦</Btn>
      </div>
    </Box>
    <Box>
      <div className="row between">
        <div>
          <div className="hand-neat">22 Pine Ave</div>
          <div className="tiny muted">4bd · $899k · 98 DOM · exp 4/15</div>
        </div>
        <Chip>new</Chip>
      </div>
    </Box>
    <Hr />
    <div className="hand-alt" style={{ fontSize: 15 }}>Letter campaign</div>
    <Box accent>
      <div className="tiny" style={{ opacity: 0.8 }}>BATCH · 12 ready to mail</div>
      <div className="hand-alt" style={{ fontSize: 18, marginTop: 4 }}>"Dear {'{Owner}'}, I noticed…"</div>
      <div className="row" style={{ gap: 4, marginTop: 6 }}>
        <Btn sm style={{ background: 'var(--paper)', color: 'var(--ink)' }}>Preview</Btn>
        <Btn sm ghost style={{ color: 'var(--paper)', borderColor: 'var(--paper)' }}>Edit template</Btn>
      </div>
      <div className="tiny" style={{ marginTop: 6, opacity: 0.7 }}>via Lob · $0.82/letter · 2-day mail</div>
    </Box>
    <Box sage>
      <div className="row between center">
        <div>
          <div className="hand-neat">Smart campaign: "Expired 90-day"</div>
          <div className="tiny" style={{ opacity: 0.8 }}>Letter → wait 5d → call → email</div>
        </div>
        <Chip style={{ background: 'var(--paper)', color: 'var(--ink)' }}>12 enrolled</Chip>
      </div>
    </Box>
  </Phone>;
}

function ProspectV3_MapFirst() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 16 }}>Prospect · Map</span>
      <div className="row" style={{ gap: 4 }}>
        <Chip sm>List</Chip>
        <Chip filled sm>Map</Chip>
      </div>
    </div>
    <Box style={{ padding: 0, height: 220, position: 'relative', overflow: 'hidden' }}>
      <div className="wf-img" style={{ width: '100%', height: '100%', borderRadius: 12 }}>
        [ neighborhood map w/ pins ]
      </div>
      <div style={{ position: 'absolute', top: 10, right: 10 }}>
        <Chip rose dot>exp 12</Chip>
      </div>
      <div style={{ position: 'absolute', bottom: 10, left: 10 }}>
        <Chip tan dot>fsbo 6</Chip>
      </div>
      <div style={{ position: 'absolute', top: '40%', left: '30%' }}>
        <span className="hand-alt" style={{ fontSize: 18, color: '#b6473a' }}>●</span>
      </div>
      <div style={{ position: 'absolute', top: '55%', left: '60%' }}>
        <span className="hand-alt" style={{ fontSize: 18, color: 'var(--accent-tan)' }}>●</span>
      </div>
    </Box>
    <div className="row wrap" style={{ gap: 4 }}>
      <Chip dot filled>Expired</Chip>
      <Chip dot tan>FSBO</Chip>
      <Chip dot sage>Past clients</Chip>
      <Chip>+ layer</Chip>
    </div>
    <Hr />
    <div className="hand-alt" style={{ fontSize: 15 }}>Within 1 mi of my listings</div>
    <Box>
      <div className="row between">
        <span className="hand-neat tiny">New listings · this week</span>
        <span className="hand-alt">4</span>
      </div>
      <div className="row between">
        <span className="hand-neat tiny">Sold · this week</span>
        <span className="hand-alt">2</span>
      </div>
      <div className="row between">
        <span className="hand-neat tiny">Price cuts</span>
        <span className="hand-alt">1</span>
      </div>
      <Btn sm ghost style={{ marginTop: 4 }}>⚙ notification rules</Btn>
    </Box>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ geography-native</Anno>
  </Phone>;
}

function ProspectV4_Campaigns() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 16 }}>Smart Campaigns</span>
      <Btn sm primary>+ New</Btn>
    </div>
    <div className="wf-tabs">
      <span className="tab active">Active 4</span>
      <span className="tab">Paused 1</span>
      <span className="tab">Draft 2</span>
      <span className="tab">Done</span>
    </div>
    {[
      ['Expired 90-day','Letter → call → email · 5 steps',12,'62%'],
      ['Open House Follow-Up','Text → email → call',5,'80%'],
      ['SOI Quarterly','Postcard → IG DM',40,'—'],
      ['Anniversary (past buyers)','Email + FB retarget',14,'31%'],
    ].map(([n,s,e,r],i)=>(
      <Box key={i}>
        <div className="row between center">
          <div>
            <div className="hand-neat">{n}</div>
            <div className="tiny muted">{s}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="hand-alt">{e}</div>
            <div className="tiny mono muted">ENROLLED</div>
          </div>
        </div>
        <Hr />
        <div className="row between tiny mono muted">
          <span>reply rate {r}</span>
          <span>+ add step</span>
        </div>
      </Box>
    ))}
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 15 }}>✦ AI suggested</div>
      <div className="tiny muted">"Neighbor-just-sold" campaign — 4 listings closed near your SOI. Send a personalized letter?</div>
      <Btn sm tan style={{ marginTop: 6 }}>Build it →</Btn>
    </Box>
  </Phone>;
}

// ===================== OPEN HOUSE OVERVIEW (3 variations) =====================
function OpenHouseV1() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat">← Prospect</span>
      <Chip sage dot>LIVE now</Chip>
    </div>
    <Box style={{ padding: 0, overflow: 'hidden' }}>
      <Img label="[ 88 Elm St — front photo ]" h={100} style={{ border: 'none', borderRadius: 0 }} />
      <div style={{ padding: 10 }}>
        <div className="serif" style={{ fontSize: 16 }}>88 Elm Street</div>
        <div className="tiny muted mono">SAT APR 18 · 1-3PM · $649K</div>
      </div>
    </Box>
    <div className="row" style={{ gap: 6 }}>
      <Box className="grow" style={{ textAlign: 'center', padding: 8 }}>
        <div className="hand-alt" style={{ fontSize: 22 }}>7</div>
        <div className="tiny mono muted">SIGNED IN</div>
      </Box>
      <Box className="grow" style={{ textAlign: 'center', padding: 8 }}>
        <div className="hand-alt" style={{ fontSize: 22 }}>3</div>
        <div className="tiny mono muted">HOT LEADS</div>
      </Box>
      <Box className="grow" style={{ textAlign: 'center', padding: 8 }}>
        <div className="hand-alt" style={{ fontSize: 22 }}>1h 47m</div>
        <div className="tiny mono muted">LEFT</div>
      </Box>
    </div>
    <div className="wf-tabs">
      <span className="tab">Prep</span>
      <span className="tab active">During</span>
      <span className="tab">After</span>
    </div>
    <Box tan>
      <div className="hand-alt" style={{ fontSize: 16 }}>Open sign-in form</div>
      <div className="tiny muted mono" style={{ marginTop: 2 }}>tap to hand to visitor</div>
      <Btn primary sm style={{ marginTop: 6 }}>Open form →</Btn>
    </Box>
    <Box>
      <div className="hand-alt" style={{ fontSize: 15 }}>Latest sign-ins</div>
      <Hr />
      {[['M. Patel','pre-approved · moving Aug'],['J. Liu','just looking · SOI'],['A. Torres','buyer · cash']].map(([n,s],i)=>(
        <div key={i} className="row between center" style={{ padding: '4px 0' }}>
          <div className="row center" style={{ gap: 6 }}>
            <Avatar initials={n.split(' ')[0][0] + n.split(' ')[1][0]} size={26} />
            <div>
              <div className="hand-neat tiny">{n}</div>
              <div className="tiny muted mono">{s}</div>
            </div>
          </div>
          <span className="tiny muted">2m ago</span>
        </div>
      ))}
    </Box>
    <Box dashed>
      <div className="tiny muted">AUTO-ENROLL TO:</div>
      <div className="tiny">→ "Open House Follow-Up" campaign</div>
      <div className="tiny">→ FB Custom Audience</div>
      <div className="tiny">→ CRM tag: oh-88elm</div>
    </Box>
  </Phone>;
}

function OpenHouseV2_SignInForm() {
  return <Phone nav={false} tabbarItems={[]}>
    <div style={{ textAlign: 'center', padding: '20px 0 10px' }}>
      <div className="serif" style={{ fontSize: 22 }}>Welcome to 88 Elm</div>
      <div className="hand-alt muted" style={{ fontSize: 16 }}>please sign in</div>
    </div>
    <Img label="[ house photo · hero ]" h={110} />
    <div className="col" style={{ gap: 8 }}>
      <Input placeholder="Your name *" />
      <Input placeholder="Phone" />
      <Input placeholder="Email *" />
      <div className="hand-alt muted tiny">Are you…</div>
      <div className="row wrap" style={{ gap: 4 }}>
        <Chip>just looking</Chip>
        <Chip filled>actively buying</Chip>
        <Chip>with an agent</Chip>
        <Chip>neighbor</Chip>
      </div>
      <div className="hand-alt muted tiny" style={{ marginTop: 4 }}>How'd you hear?</div>
      <div className="row wrap" style={{ gap: 4 }}>
        <Chip>sign</Chip><Chip>Zillow</Chip><Chip>IG</Chip><Chip>friend</Chip>
      </div>
      <Input placeholder="What are you looking for? (optional)" style={{ minHeight: 50 }} />
      <Box dashed style={{ padding: 8 }}>
        <div className="hand-neat tiny">□ Email me this week's new listings</div>
        <div className="hand-neat tiny">□ Send me the neighborhood guide (PDF)</div>
      </Box>
      <Btn primary style={{ justifyContent: 'center', padding: '12px' }}>Sign In ✓</Btn>
      <div className="tiny muted" style={{ textAlign: 'center' }}>Powered by Command · Dana Massey, Realtor</div>
    </div>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ visitor-facing</Anno>
  </Phone>;
}

function OpenHouseV3_Lifecycle() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 16 }}>88 Elm · Open House</span>
      <span className="tiny muted mono">SAT 1–3P</span>
    </div>
    {/* Lifecycle rail */}
    <div style={{ position: 'relative', padding: '10px 0' }}>
      <div style={{ position: 'absolute', top: 22, left: 20, right: 20, height: 2, borderTop: '1.5px dashed var(--line)' }} />
      <div className="row between" style={{ padding: '0 4px', position: 'relative' }}>
        {['Prep','Live','After','Report'].map((s,i)=>(
          <div key={s} style={{ textAlign: 'center' }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              border: '1.5px solid var(--line)',
              background: i <= 1 ? 'var(--accent)' : 'var(--card)',
              color: i <= 1 ? 'var(--paper)' : 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto', fontFamily: 'Caveat,cursive',
            }}>{i+1}</div>
            <div className="tiny mono" style={{ marginTop: 4 }}>{s}</div>
          </div>
        ))}
      </div>
    </div>
    <Box>
      <div className="hand-alt" style={{ fontSize: 15 }}>① Prep · 6 done / 8</div>
      <Check done>Print 25 flyers</Check>
      <Check done>Directional signs placed</Check>
      <Check>QR code → sign-in form</Check>
      <Check>Water + snacks</Check>
    </Box>
    <Box accent>
      <div className="row between">
        <div className="hand-alt" style={{ fontSize: 16 }}>② Live — 7 visitors</div>
        <Btn sm style={{ background: 'var(--paper)', color: 'var(--ink)' }}>QR →</Btn>
      </div>
      <div className="tiny" style={{ opacity: 0.8, marginTop: 4 }}>tap-and-hand sign-in active</div>
    </Box>
    <Box filled>
      <div className="hand-alt" style={{ fontSize: 15 }}>③ After · auto-triggers</div>
      <div className="tiny" style={{ marginTop: 2 }}>→ thank-you text · 1h</div>
      <div className="tiny">→ AI-drafted email · 1d</div>
      <div className="tiny">→ phone call task · 3d</div>
      <div className="tiny">→ added to "Warm Buyers" list</div>
    </Box>
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 15 }}>④ Report</div>
      <div className="tiny muted mono">→ visitors, leads, conv. rate, comps feedback</div>
    </Box>
  </Phone>;
}

// ===================== NOTES + TASKS (3 variations) =====================
function TasksV1_Grouped() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect'},{label:'Tasks',active:true},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 18 }}>Tasks</span>
      <Btn sm primary>+</Btn>
    </div>
    <div className="wf-tabs">
      <span className="tab active">To do 8</span>
      <span className="tab">Upcoming 12</span>
      <span className="tab">Done 34</span>
    </div>
    <div className="hand-alt muted" style={{ fontSize: 14 }}>Today</div>
    <Box>
      <Check>Call Sarah M.<br/><span className="tiny muted mono">9:30 · ⟶ Sarah M.</span></Check>
      <Check>Post IG carousel<br/><span className="tiny muted mono">10am · content</span></Check>
      <Check done>Morning prospect block<br/><span className="tiny muted mono">done 9:00</span></Check>
    </Box>
    <div className="hand-alt muted" style={{ fontSize: 14 }}>Tomorrow</div>
    <Box>
      <Check>Prep open house — 88 Elm</Check>
      <Check>Review CMA draft (Hernandez)</Check>
    </Box>
    <div className="hand-alt muted" style={{ fontSize: 14 }}>Next week</div>
    <Box filled>
      <Check>Quarterly SOI touch (40)</Check>
      <Check>Blog post: spring market</Check>
      <Check>Refresh bio-link page</Check>
    </Box>
  </Phone>;
}

function TasksV2_Notes() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect'},{label:'Notes',active:true},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 18 }}>Notepad</span>
      <Btn sm primary>✎ new</Btn>
    </div>
    <Input placeholder="✎ search or jot…" />
    <div className="row wrap" style={{ gap: 4 }}>
      <Chip filled>All</Chip>
      <Chip>Client-tagged 22</Chip>
      <Chip>Loose 15</Chip>
      <Chip>Starred</Chip>
    </div>
    <Sticky>
      <div className="tiny muted mono">APR 17 · 2:14pm</div>
      <div style={{ marginTop: 2 }}>Sarah mentioned her mom might sell the Norfolk house in fall. <b>Follow up Sep.</b></div>
      <div style={{ marginTop: 4 }}>
        <Chip sm tan style={{ fontSize: 10 }}>→ Sarah M.</Chip>
      </div>
    </Sticky>
    <Sticky rot={1}>
      <div className="tiny muted mono">APR 17 · 11:02am</div>
      <div style={{ marginTop: 2 }}>Idea: blog post — "what your HOA docs actually mean"</div>
      <Chip sm style={{ fontSize: 10, marginTop: 4 }}>content</Chip>
    </Sticky>
    <Sticky rot={-0.6}>
      <div className="tiny muted mono">APR 16</div>
      <div style={{ marginTop: 2 }}>Stager recommend — Elena @ Heirloom. $1,400/mo. Seen at Maple listing.</div>
      <Chip sm style={{ fontSize: 10, marginTop: 4 }}>vendors</Chip>
    </Sticky>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ stickies w/ client-tag</Anno>
  </Phone>;
}

function TasksV3_QuickCapture() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect'},{label:'+',active:true},{label:'Deals'},{label:'More'}]}>
    <div className="serif" style={{ fontSize: 22, textAlign: 'center', marginTop: 10 }}>Quick capture</div>
    <Input placeholder="✎  type or dictate anything" style={{ minHeight: 90 }} />
    <div className="row wrap" style={{ gap: 4, justifyContent: 'center' }}>
      <Chip>🎙 dictate</Chip>
      <Chip>📷 photo</Chip>
      <Chip tan>✦ AI parse</Chip>
    </div>
    <Box dashed>
      <div className="tiny muted mono">AI WILL EXTRACT</div>
      <div className="tiny">task? · note? · new contact? · follow-up date? · link to client?</div>
    </Box>
    <Hr />
    <div className="hand-alt" style={{ fontSize: 15 }}>Recent captures</div>
    {['"remind me to drop cookies at the Johnsons Tuesday"','"Mike called — wants to see 42 Oak Sat 3pm"','"need to update bio link headshot"'].map((t,i)=>(
      <Box key={i} style={{ padding: 8 }}>
        <div className="hand-neat tiny">{t}</div>
        <div className="row between tiny muted mono" style={{ marginTop: 4 }}>
          <span>→ {['task + note','showing + contact','task'][i]}</span>
          <span>✎ edit</span>
        </div>
      </Box>
    ))}
  </Phone>;
}

// ===================== BUYER SHOWINGS (3 variations) =====================
function BuyerV1_Shortlist() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect'},{label:'CRM',active:true},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat">← CRM · Buyers</span>
      <Chip tan>active 8</Chip>
    </div>
    <Box>
      <div className="row center" style={{ gap: 8 }}>
        <Avatar initials="MC" size={36} color="var(--accent-sage)" style={{ color: 'var(--paper)' }} />
        <div className="grow">
          <div className="serif" style={{ fontSize: 15 }}>Mike & Carla</div>
          <div className="tiny muted mono">budget $800k · 4bd · Oak Park</div>
        </div>
        <Btn sm>✉</Btn>
      </div>
      <Hr />
      <div className="row between tiny mono muted">
        <span>shown: 7</span><span>offers: 2</span><span>shortlist: 3</span>
      </div>
    </Box>
    <div className="wf-tabs">
      <span className="tab active">Shortlist 3</span>
      <span className="tab">Shown 7</span>
      <span className="tab">Feedback</span>
      <span className="tab">Report</span>
    </div>
    {[
      ['42 Oak St','$799k · ★★★★☆','offer-sent'],
      ['16 Beacon Ln','$785k · ★★★☆☆','considering'],
      ['8 Ridge Rd','$812k · ★★★★★','love'],
    ].map(([t,s,tag],i)=>(
      <Box key={i} style={{ padding: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <Img label="home" w={56} h={56} />
          <div className="grow">
            <div className="hand-neat" style={{ fontSize: 13 }}>{t}</div>
            <div className="tiny muted mono">{s}</div>
            <div style={{ marginTop: 4 }}>
              <Chip sm>{tag}</Chip>
            </div>
          </div>
        </div>
      </Box>
    ))}
    <Btn ghost sm style={{ alignSelf: 'center' }}>+ add showing feedback</Btn>
  </Phone>;
}

function BuyerV2_Feedback() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect'},{label:'CRM',active:true},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat">← Mike & Carla</span>
      <span className="tiny muted mono">showing 7</span>
    </div>
    <Box>
      <div className="row" style={{ gap: 8 }}>
        <Img label="photo" w={72} h={54} />
        <div className="grow">
          <div className="serif" style={{ fontSize: 15 }}>42 Oak St</div>
          <div className="tiny muted mono">shown apr 15 · 4:30p</div>
        </div>
      </div>
    </Box>
    <div className="hand-alt" style={{ fontSize: 15 }}>How'd it feel?</div>
    <div className="row between center">
      {['😍','🙂','😐','😕','👎'].map((e,i) => (
        <div key={i} style={{
          width: 44, height: 44, border: '1.5px solid var(--line)', borderRadius: 12,
          background: i===1 ? 'var(--accent-tan)' : 'var(--card)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>{e}</div>
      ))}
    </div>
    <div className="hand-alt" style={{ fontSize: 14 }}>Ratings</div>
    {[
      ['Layout', 4],['Kitchen', 5],['Yard', 3],['Neighborhood', 4],['Condition', 3],
    ].map(([l,r])=>(
      <div key={l} className="row between center" style={{ padding: '2px 0' }}>
        <span className="hand-neat tiny">{l}</span>
        <span className="hand-alt">{'★'.repeat(r) + '☆'.repeat(5-r)}</span>
      </div>
    ))}
    <Input placeholder="✎ Buyer said…" style={{ minHeight: 60 }} />
    <Box dashed>
      <div className="tiny muted">✦ AI summary for listing agent (optional):</div>
      <div className="tiny" style={{ marginTop: 2,  }}>"Buyers liked the updated kitchen but felt the yard was smaller than photos suggested. Price sensitivity — hoping to come in ~5% under ask."</div>
    </Box>
    <div className="row" style={{ gap: 6 }}>
      <Btn primary className="grow">Save</Btn>
      <Btn className="grow">Save + share</Btn>
    </div>
  </Phone>;
}

function BuyerV3_Report() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect'},{label:'CRM',active:true},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat">← Mike & Carla · Report</span>
      <Btn sm ghost>📤</Btn>
    </div>
    <Box filled>
      <div className="hand-alt" style={{ fontSize: 16 }}>Buyer journey</div>
      <div className="row between" style={{ margin: '8px 0', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}><div className="hand-alt" style={{ fontSize: 22 }}>7</div><div className="tiny mono muted">SHOWN</div></div>
        <Arrow />
        <div style={{ textAlign: 'center' }}><div className="hand-alt" style={{ fontSize: 22 }}>3</div><div className="tiny mono muted">SHORTLIST</div></div>
        <Arrow />
        <div style={{ textAlign: 'center' }}><div className="hand-alt" style={{ fontSize: 22 }}>2</div><div className="tiny mono muted">OFFERS</div></div>
        <Arrow />
        <div style={{ textAlign: 'center' }}><div className="hand-alt" style={{ fontSize: 22 }}>?</div><div className="tiny mono muted">CLOSED</div></div>
      </div>
    </Box>
    <Box>
      <div className="hand-alt" style={{ fontSize: 15 }}>Avg feedback</div>
      <div className="row between tiny mono"><span>Layout</span><span>★★★★☆ 3.9</span></div>
      <div className="row between tiny mono"><span>Kitchen</span><span>★★★★★ 4.4</span></div>
      <div className="row between tiny mono"><span>Price fit</span><span>★★★☆☆ 2.8</span></div>
    </Box>
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ AI insight</div>
      <div className="tiny" style={{  }}>"Buyers consistently ding yard size. Consider tightening the search to ≥0.25 acre — skip properties under that."</div>
    </Box>
    <Btn style={{ alignSelf: 'center' }}>📤 Share with clients</Btn>
  </Phone>;
}

window.MobileScreens = {
  prospect: [
    { id:'p1', label:'V1 · Channel list', caption:'All channels in priority order. Daily dialer goal up top.', Component: ProspectV1_Channels },
    { id:'p2', label:'V2 · Expired deep-dive', caption:'Drill into expired listings. Batch letters + smart campaign enroll.', Component: ProspectV2_ExpiredFlow },
    { id:'p3', label:'V3 · Map-first', caption:'Geography-native. Toggle layers: expired, FSBO, SOI.', Component: ProspectV3_MapFirst },
    { id:'p4', label:'V4 · Campaigns dashboard', caption:'Every outreach as an automated sequence. AI suggests new ones.', Component: ProspectV4_Campaigns },
  ],
  openHouse: [
    { id:'oh1', label:'V1 · Event overview', caption:'Prep / During / After tabs. Live visitor count + sign-in button.', Component: OpenHouseV1 },
    { id:'oh2', label:'V2 · Sign-in form (visitor-facing)', caption:'The actual form you hand to guests. Auto-enrolls to campaigns + FB audience.', Component: OpenHouseV2_SignInForm },
    { id:'oh3', label:'V3 · Lifecycle stepper', caption:'One screen, 4 stages on a rail. Auto-triggers drive the After stage.', Component: OpenHouseV3_Lifecycle },
  ],
  tasks: [
    { id:'t1', label:'V1 · Grouped by time', caption:'Today / Tomorrow / Next week, with client-link chips.', Component: TasksV1_Grouped },
    { id:'t2', label:'V2 · Sticky-note notepad', caption:'Notes look like a corkboard. Each note can tag a client.', Component: TasksV2_Notes },
    { id:'t3', label:'V3 · Quick capture + AI parse', caption:'One dictate box. AI figures out if it\'s a task, note, or contact.', Component: TasksV3_QuickCapture },
  ],
  buyer: [
    { id:'b1', label:'V1 · Shortlist view', caption:'Per-buyer profile with shortlist / shown / feedback tabs.', Component: BuyerV1_Shortlist },
    { id:'b2', label:'V2 · Per-showing feedback', caption:'Quick-capture form post-showing. Emoji + stars + AI summary.', Component: BuyerV2_Feedback },
    { id:'b3', label:'V3 · Journey report', caption:'Stats across all showings. Shareable with clients.', Component: BuyerV3_Report },
  ],
};


/* ===== components/desktop-1.jsx ===== */
// Desktop: CRM + Email Builder + Content Studio

// ===================== CRM (3 variations) =====================
function CRMv1_Table() {
  return <Desktop active="CRM" url="command.app/crm">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Contacts · <span className="muted">1,284</span></span>
      <div className="row" style={{ gap: 6 }}>
        <Input placeholder="🔍 search name, phone, tag…" style={{ width: 260 }} />
        <Btn>+ filter</Btn>
        <Btn primary>+ Contact</Btn>
      </div>
    </div>
    <div className="row wrap" style={{ gap: 4 }}>
      <Chip filled>All 1,284</Chip>
      <Chip>Buyers 84</Chip>
      <Chip>Sellers 42</Chip>
      <Chip>Past clients 312</Chip>
      <Chip>SOI 40</Chip>
      <Chip>Leads 208</Chip>
      <Chip tan>Hot 12</Chip>
      <Chip>+ saved view</Chip>
    </div>
    <Box style={{ padding: 0, overflow: 'hidden' }}>
      <table className="wf-table">
        <thead><tr>
          <th>Name</th><th>Tags</th><th>Stage</th><th>Last touch</th><th>Next step</th><th>LTV</th><th>Source</th>
        </tr></thead>
        <tbody>
          {[
            ['Sarah McCallister','buyer · hot','offer out','2h ago · call','respond 12pm','—','OH 88 Elm'],
            ['Mike & Carla Lee','buyer','shortlist','1d · email','showing Sat','—','SOI ref'],
            ['Hernandez, J.','seller','appt booked','3h · text','CMA Fri','—','expired'],
            ['Patel, M.','lead','new','signed in Sat','7d drip','—','OH 88 Elm'],
            ['Chen, J.','lead · cold','—','14d','re-engage','—','FB ad'],
            ['Thompson','past client','closed 2023','90d','anniv Jun','$12.3k','SOI'],
            ['Fernandez, R.','seller · FSBO','outreach','5d · letter','call Mon','—','FSBO'],
            ['Baxter-Reed, A.','buyer','shown 4','yesterday','new comps','—','Zillow'],
          ].map((r,i)=>(
            <tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </Box>
    <div className="row between tiny muted mono">
      <span>showing 8 of 1,284 · sort: last touch</span>
      <span>⚙ columns</span>
    </div>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ airtable-style · everything is a filterable row</Anno>
  </Desktop>;
}

function CRMv2_Profile() {
  return <Desktop active="CRM" url="command.app/crm/sarah-mccallister">
    <div className="row between center">
      <span className="hand-neat muted">← CRM · Sarah McCallister</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>✉ Email</Btn>
        <Btn sm>📞 Call</Btn>
        <Btn sm primary>+ Task</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 16 }}>
      <Box style={{ width: 260, flexShrink: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <Avatar initials="SM" size={80} color="var(--accent-tan)" />
          <div className="serif" style={{ fontSize: 20, marginTop: 8 }}>Sarah McCallister</div>
          <div className="tiny muted">buyer · hot · offer out</div>
        </div>
        <Hr />
        <div className="tiny mono muted">PHONE</div>
        <div className="hand-neat tiny">(512) 555-0134</div>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>EMAIL</div>
        <div className="hand-neat tiny">sarah.m@…</div>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>BUDGET</div>
        <div className="hand-neat tiny">$720k – $760k</div>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>LOOKING FOR</div>
        <div className="hand-neat tiny">3bd, Oak Park, yard ≥ ¼ac</div>
        <Hr />
        <div className="tiny mono muted">TAGS</div>
        <div style={{ marginTop: 4 }}>
          <Chip rose dot>Hot</Chip> <Chip>Buyer</Chip> <Chip>OH·88Elm</Chip>
        </div>
        <Hr />
        <div className="tiny mono muted">AUDIENCES</div>
        <div className="tiny">✓ FB · Warm Buyers 2026</div>
        <div className="tiny">✓ Email · Spring Drip</div>
      </Box>
      <div className="col grow">
        <div className="wf-tabs">
          <span className="tab active">Timeline</span>
          <span className="tab">Showings 7</span>
          <span className="tab">Notes 4</span>
          <span className="tab">Files 3</span>
          <span className="tab">Deals 1</span>
        </div>
        <Box>
          <div className="row between">
            <div>
              <div className="hand-neat">Called Sarah — 9:32am</div>
              <div className="tiny muted">Discussed offer counter. She'll decide by 12pm.</div>
            </div>
            <span className="tiny mono muted">TODAY</span>
          </div>
        </Box>
        <Box>
          <div className="row between">
            <div>
              <div className="hand-neat">Showing: 42 Oak St · ★★★★☆</div>
              <div className="tiny muted">"Loved kitchen, worried about yard size."</div>
            </div>
            <span className="tiny mono muted">APR 15</span>
          </div>
        </Box>
        <Box filled>
          <div className="hand-alt" style={{ fontSize: 15 }}>✦ AI suggested next actions</div>
          <Check>Send counter @ $762k w/ comps</Check>
          <Check>Text 5pm check-in if no response</Check>
          <Check>Tee up 2 backup showings Sun</Check>
        </Box>
      </div>
    </div>
  </Desktop>;
}

function CRMv3_Kanban() {
  return <Desktop active="CRM" url="command.app/crm/board">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Pipeline Board</span>
      <div className="row" style={{ gap: 6 }}>
        <Chip>Table</Chip><Chip filled>Board</Chip><Chip>Timeline</Chip>
      </div>
    </div>
    <div className="row" style={{ gap: 10, alignItems: 'flex-start', overflowX: 'auto' }}>
      {[
        ['New', 42, 'var(--accent-tan)', [['Patel, M.','OH · 2d'],['Chen, J.','FB ad · 5d'],['+14 more','']]],
        ['Working', 28, 'var(--accent-sage)', [['Hernandez','appt Fri'],['Baxter-R.','4 shown'],['Fernandez','FSBO · calling']]],
        ['Appt', 6, 'var(--accent-rose)', [['Hernandez','CMA Fri'],['R. Kim','listing pitch Sat']]],
        ['Active', 9, 'var(--accent)', [['Mike & Carla','shortlist'],['Ng family','2 offers']]],
        ['Closed', 1, 'var(--ink)', [['Thompson','closed 4/12']]],
      ].map(([t,c,col,cards],i)=>(
        <div key={i} style={{ minWidth: 180, flex: 1 }}>
          <div className="row between center" style={{ padding: '0 4px 6px' }}>
            <span className="hand-alt" style={{ fontSize: 15 }}>{t}</span>
            <Chip sm style={{ background: col, color: 'var(--paper)', borderColor: col }}>{c}</Chip>
          </div>
          <div className="col" style={{ gap: 6 }}>
            {cards.map(([n,s],j)=>(
              <Box key={j} style={{ padding: 8 }}>
                <div className="hand-neat tiny">{n}</div>
                <div className="tiny muted mono">{s}</div>
              </Box>
            ))}
            <Btn sm ghost>+ add</Btn>
          </div>
        </div>
      ))}
    </div>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ drag between stages · auto-fire sequences</Anno>
  </Desktop>;
}

// ===================== EMAIL BUILDER (3 variations) =====================
function EmailV1_Builder() {
  return <Desktop active="Email" url="command.app/email/builder">
    <div className="row between center">
      <span className="hand-neat muted">← Campaigns · Spring Market Letter</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>Save draft</Btn>
        <Btn sm>Preview</Btn>
        <Btn sm primary>Schedule →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
      <Box style={{ width: 180, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>Blocks</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {['Text','Heading','Image','Button','Divider','Columns','Listing card','Market stats','Social','Footer'].map(b=>(
            <div key={b} className="wf-chip" style={{ justifyContent: 'flex-start', fontSize: 11 }}>◫ {b}</div>
          ))}
        </div>
        <Hr />
        <div className="hand-alt" style={{ fontSize: 14 }}>Templates</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          <Chip>Market update</Chip>
          <Chip>New listing</Chip>
          <Chip>Just sold</Chip>
          <Chip>Testimonial</Chip>
        </div>
      </Box>
      <Box className="grow" style={{ padding: 0, minHeight: 540, background: 'var(--paper)' }}>
        <div style={{ padding: 20, maxWidth: 560, margin: '0 auto' }}>
          <div style={{ background: 'var(--card)', border: '1.5px dashed var(--line)', padding: 20, borderRadius: 10 }}>
            <div className="serif" style={{ fontSize: 24, textAlign: 'center' }}>Dana Massey</div>
            <div className="hand-alt muted" style={{ fontSize: 13, textAlign: 'center' }}>your neighborhood realtor</div>
            <Hr />
            <div className="serif" style={{ fontSize: 20 }}>The Spring Market is shifting.</div>
            <div className="hand-neat tiny" style={{ marginTop: 8 }}>Hi {'{FirstName}'}, — quick note from the field. Inventory is up 14%, days on market are down, and…</div>
            <Img label="[ market stats graphic ]" h={120} style={{ margin: '10px 0' }} />
            <div style={{ textAlign: 'center', margin: '14px 0' }}>
              <Btn primary>Request my free neighborhood report</Btn>
            </div>
            <Hr />
            <div className="tiny muted" style={{ textAlign: 'center' }}>Command · unsubscribe · 512-555-0100</div>
          </div>
        </div>
      </Box>
      <Box style={{ width: 200, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>Selected: Heading</div>
        <div className="tiny mono muted" style={{ marginTop: 8 }}>TEXT</div>
        <Input value="The Spring Market is shifting." />
        <div className="tiny mono muted" style={{ marginTop: 8 }}>FONT</div>
        <Chip>Georgia italic</Chip>
        <div className="tiny mono muted" style={{ marginTop: 8 }}>SIZE</div>
        <div className="row" style={{ gap: 4 }}><Chip>14</Chip><Chip>18</Chip><Chip filled>20</Chip><Chip>28</Chip></div>
        <div className="tiny mono muted" style={{ marginTop: 8 }}>COLOR</div>
        <div className="row" style={{ gap: 4 }}>
          {['#1a1a1a','#3d2e1f','#8a9b7f','#c9a274'].map(c=>(
            <div key={c} style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: '1.5px solid var(--line)' }} />
          ))}
        </div>
        <Hr />
        <Box dashed style={{ padding: 8 }}>
          <div className="hand-alt tiny">✦ AI rewrite</div>
          <div className="tiny muted">shorter · warmer · more urgent</div>
        </Box>
      </Box>
    </div>
  </Desktop>;
}

function EmailV2_Campaigns() {
  return <Desktop active="Email" url="command.app/email">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Campaigns</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>Templates</Btn>
        <Btn sm>Audiences</Btn>
        <Btn sm primary>+ New campaign</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 10 }}>
      {[['Sent','42'],['Avg open','48%'],['Avg click','6.2%'],['Unsubs','0.3%'],['Replies','14']].map(([l,v])=>(
        <Box key={l} className="grow" style={{ textAlign: 'center', padding: 10 }}>
          <div className="serif" style={{ fontSize: 22 }}>{v}</div>
          <div className="tiny mono muted">{l.toUpperCase()}</div>
        </Box>
      ))}
    </div>
    <div className="wf-tabs">
      <span className="tab active">Active 4</span>
      <span className="tab">Scheduled 2</span>
      <span className="tab">One-offs 8</span>
      <span className="tab">Drafts 3</span>
      <span className="tab">Sequences 6</span>
    </div>
    <Box style={{ padding: 0, overflow: 'hidden' }}>
      <table className="wf-table">
        <thead><tr>
          <th>Campaign</th><th>Type</th><th>Audience</th><th>Sent</th><th>Open</th><th>Click</th><th>Replies</th><th></th>
        </tr></thead>
        <tbody>
          {[
            ['Spring Market Letter','one-off','All 1,284','4/12','52%','8%','12','→'],
            ['OH Follow-Up (88 Elm)','sequence · 3 steps','OH signed-in 22','rolling','61%','11%','5','→'],
            ['Expired 90-day','sequence · 5 steps','Expired 42','rolling','38%','4%','3','→'],
            ['SOI Quarterly','one-off','SOI 40','draft','—','—','—','→'],
          ].map((r,i)=>(
            <tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </Box>
    <div className="row" style={{ gap: 10 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Last 30 days</div>
        <Img label="[ open-rate line chart ]" h={120} />
      </Box>
      <Box className="grow" dashed>
        <div className="hand-alt" style={{ fontSize: 15 }}>✦ AI suggestions</div>
        <div className="tiny" style={{ marginTop: 4 }}>• Warm buyers haven't heard from you in 18d — send market snapshot?</div>
        <div className="tiny">• Subject lines with first name open 12% higher for your list</div>
        <div className="tiny">• 14 past clients hit anniversary next week → queue cards</div>
      </Box>
    </div>
  </Desktop>;
}

function EmailV3_Templates() {
  return <Desktop active="Email" url="command.app/email/templates">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Template library</span>
      <Btn sm primary>+ New template</Btn>
    </div>
    <div className="row wrap" style={{ gap: 4 }}>
      <Chip filled>All 34</Chip>
      <Chip>Team 12</Chip>
      <Chip>Mine 22</Chip>
      <Chip>Sales</Chip><Chip>Nurture</Chip><Chip>Seller</Chip><Chip>Buyer</Chip><Chip>Post-close</Chip>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
      {[
        ['Intro to new lead','buyer'],['Listing appt confirm','seller'],['Pre-showing tips','buyer'],
        ['Post-showing thanks','buyer'],['Offer accepted! 🎉','buyer'],['CMA attached','seller'],
        ['1-year anniv','past'],['Holiday: Thanksgiving','past'],['Referral ask','past'],
        ['Open house invite','team'],['Just listed','sales'],['Just sold','sales'],
      ].map((t,i)=>(
        <Box key={i} style={{ padding: 8 }}>
          <Img label="preview" h={90} />
          <div className="hand-neat tiny" style={{ marginTop: 6 }}>{t[0]}</div>
          <div className="row between tiny muted mono">
            <span>{t[1]}</span><span>used 12×</span>
          </div>
        </Box>
      ))}
    </div>
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ AI can draft a new template from your voice</div>
      <div className="row" style={{ gap: 6, marginTop: 6 }}>
        <Input placeholder="describe: 'follow-up after open house for neighbors'" />
        <Btn sm tan>Draft →</Btn>
      </div>
    </Box>
  </Desktop>;
}

// ===================== CONTENT STUDIO (4 variations) =====================
function ContentV1_Hub() {
  return <Desktop active="Content" url="command.app/content">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Content Studio</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>Ideal client</Btn>
        <Btn sm>Pillars</Btn>
        <Btn sm primary>✦ Generate</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Ideal Client Avatar</div>
        <div className="tiny muted mono">LOCKED IN</div>
        <Hr />
        <div className="tiny"><b>"Emma"</b> · 34 · first-time buyer · Oak Park</div>
        <div className="tiny">income: $120k · values: yard, walkable, good schools</div>
        <div className="tiny">pain: lost 2 bids, nervous about rate</div>
        <div className="tiny">reads: IG, Apartment Therapy, neighborhood FB</div>
        <Btn sm ghost style={{ marginTop: 6 }}>edit</Btn>
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Content Pillars</div>
        <div className="tiny muted mono">4 ACTIVE</div>
        <Hr />
        {[['Market intel','30%','var(--accent-tan)'],['First-timer ed.','30%','var(--accent-sage)'],['Neighborhood love','25%','var(--accent-rose)'],['Personal/BTS','15%','var(--accent)']].map(([t,p,c])=>(
          <div key={t} className="row between center" style={{ padding: '3px 0' }}>
            <div className="row center" style={{ gap: 6 }}>
              <div style={{ width: 10, height: 10, background: c, borderRadius: 2 }} />
              <span className="hand-neat tiny">{t}</span>
            </div>
            <span className="tiny mono">{p}</span>
          </div>
        ))}
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>SEO / AEO score</div>
        <div className="tiny muted mono">WEEKLY</div>
        <Hr />
        <div className="row between"><span className="hand-neat tiny">SEO</span><span className="hand-alt">7.2</span></div>
        <Bar pct={72} />
        <div className="row between" style={{ marginTop: 6 }}><span className="hand-neat tiny">AEO</span><span className="hand-alt">5.4</span></div>
        <Bar pct={54} color="var(--accent-sage)" />
        <div className="row between" style={{ marginTop: 6 }}><span className="hand-neat tiny">GEO</span><span className="hand-alt">4.1</span></div>
        <Bar pct={41} color="var(--accent-tan)" />
      </Box>
    </div>
    <div className="hand-alt" style={{ fontSize: 16 }}>This week's calendar</div>
    <Box>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d,i)=>(
          <div key={d} style={{ border: '1.2px dashed var(--line)', borderRadius: 8, padding: 6, minHeight: 80 }}>
            <div className="tiny mono muted">{d}</div>
            {i===0 && <Chip sm tan dot>blog</Chip>}
            {i===1 && <Chip sm sage dot>IG carousel</Chip>}
            {i===3 && <Chip sm rose dot>TikTok</Chip>}
            {i===5 && <Chip sm tan dot>IG reel</Chip>}
          </div>
        ))}
      </div>
    </Box>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ ICA + pillars drive every generation</Anno>
  </Desktop>;
}

function ContentV2_Carousel() {
  return <Desktop active="Content" url="command.app/content/carousel">
    <div className="row between center">
      <span className="hand-neat muted">← Content · New carousel</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>Save</Btn>
        <Btn sm primary>Schedule →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 260, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 15 }}>Brief</div>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>TOPIC</div>
        <Input value="5 first-time buyer mistakes" />
        <div className="tiny mono muted" style={{ marginTop: 6 }}>PILLAR</div>
        <Chip sage>First-timer ed.</Chip>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>PLATFORM</div>
        <div className="row" style={{ gap: 4 }}>
          <Chip filled>IG</Chip><Chip>LinkedIn</Chip><Chip>FB</Chip>
        </div>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>KEYWORDS</div>
        <div className="row wrap" style={{ gap: 4 }}>
          <Chip sm>first-time buyer</Chip><Chip sm>Oak Park</Chip><Chip sm>2026 market</Chip>
        </div>
        <Hr />
        <Box dashed>
          <div className="hand-alt tiny">✦ generated by</div>
          <div className="row" style={{ gap: 4, marginTop: 4 }}>
            <Chip filled sm>Claude</Chip><Chip sm>Gamma</Chip>
          </div>
        </Box>
      </Box>
      <div className="col grow">
        <div className="row" style={{ gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            ['1 · cover','"5 first-time\nbuyer mistakes"'],
            ['2 · hook','Missing pre-approval'],
            ['3 · hook','Ignoring total cost'],
            ['4 · hook','Skipping inspection'],
            ['5 · hook','Emotional offers'],
            ['6 · hook','No exit plan'],
            ['7 · cta','DM "GUIDE" →'],
          ].map(([l,t],i)=>(
            <div key={i} style={{ minWidth: 150 }}>
              <div style={{
                width: 150, height: 180, border: '1.5px solid var(--line)',
                borderRadius: 10, padding: 10, background: i===0 ? 'var(--accent)' : 'var(--card)',
                color: i===0 ? 'var(--paper)' : 'var(--ink)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', fontFamily: 'var(--font-display)', 
                whiteSpace: 'pre-line',
              }}>{t}</div>
              <div className="tiny muted mono" style={{ marginTop: 4, textAlign: 'center' }}>{l}</div>
            </div>
          ))}
        </div>
        <Box>
          <div className="hand-alt" style={{ fontSize: 15 }}>Caption</div>
          <div className="tiny" style={{ marginTop: 6,  }}>
            "You'd be shocked how many buyers lose their first home over #1. Save this for your house hunt →
            {'\n\n'}What would you add? comment below 👇
            {'\n\n'}#oakparktx #firsttimebuyer #realestate2026"
          </div>
          <div className="row" style={{ gap: 4, marginTop: 8 }}>
            <Btn sm>✦ rewrite</Btn>
            <Btn sm>shorter</Btn>
            <Btn sm>more hooks</Btn>
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

function ContentV3_Blog() {
  return <Desktop active="Content" url="command.app/content/blog">
    <div className="row between center">
      <span className="hand-neat muted">← Content · Blog post</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>Save draft</Btn>
        <Btn sm>Preview</Btn>
        <Btn sm primary>Publish</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow" style={{ padding: 20, background: 'var(--paper)' }}>
        <div className="tiny mono muted">H1</div>
        <div className="serif" style={{ fontSize: 26 }}>What $650k buys in Oak Park right now</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>by Dana Massey · Apr 17, 2026 · 4 min read</div>
        <Hr />
        <div className="tiny">Spring in Oak Park is doing something unusual this year. Inventory is up, buyers are cautious, and the median sale price sits at $648,000…</div>
        <div className="serif" style={{ fontSize: 18, marginTop: 12 }}>Is this a buyer's market?</div>
        <div className="tiny" style={{ marginTop: 4 }}>The short answer: not quite, but we're closer than we've been in three years. Days on market have climbed from 12 to 34…</div>
        <Img label="[ chart · DOM over time ]" h={140} style={{ margin: '12px 0' }} />
        <div className="serif" style={{ fontSize: 18 }}>What you actually get for $650k</div>
        <div className="tiny muted">— 3bd / 2ba · ~1,800sf · built 1960s-90s · ~0.2ac lot</div>
      </Box>
      <Box style={{ width: 260, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 15 }}>SEO / AEO</div>
        <Hr />
        <div className="row between tiny mono"><span>Target keyword</span><span>✓</span></div>
        <div className="row between tiny mono"><span>Meta description</span><span>✓</span></div>
        <div className="row between tiny mono"><span>H1 contains kw</span><span>✓</span></div>
        <div className="row between tiny mono"><span>Question-phrased H2</span><span>✓</span></div>
        <div className="row between tiny mono"><span>FAQ schema</span><span>⚠</span></div>
        <div className="row between tiny mono"><span>Author schema</span><span>✓</span></div>
        <div className="row between tiny mono"><span>Cited stats</span><span>2 ✓</span></div>
        <Hr />
        <div className="hand-alt tiny">Score</div>
        <div className="row between"><span className="tiny">SEO</span><span className="hand-alt">8.6</span></div>
        <Bar pct={86} />
        <div className="row between" style={{ marginTop: 4 }}><span className="tiny">AEO</span><span className="hand-alt">7.1</span></div>
        <Bar pct={71} color="var(--accent-sage)" />
        <Hr />
        <Box dashed>
          <div className="hand-alt tiny">✦ AI suggestions</div>
          <div className="tiny">• Add FAQ block ("is it a good time to buy in Oak Park?")</div>
          <div className="tiny">• Shorten intro</div>
          <div className="tiny">• Link to CMA page</div>
        </Box>
      </Box>
    </div>
  </Desktop>;
}

function ContentV4_CrossPost() {
  return <Desktop active="Content" url="command.app/content/publish">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Multi-platform publish</span>
      <Btn sm primary>Schedule all →</Btn>
    </div>
    <Box>
      <div className="hand-alt" style={{ fontSize: 15 }}>Source: "5 first-time buyer mistakes" carousel</div>
      <div className="tiny muted mono">published Mon 10am planned</div>
    </Box>
    {[
      ['Instagram','carousel · 7 slides','scheduled','var(--accent-rose)'],
      ['LinkedIn','image + essay-length caption','✦ rewriting for professional tone','var(--accent-sage)'],
      ['Facebook','carousel · cross-posted','scheduled','var(--accent)'],
      ['TikTok','auto-video from slides','draft','var(--accent-tan)'],
      ['YouTube Shorts','auto-video','draft','var(--accent-rose)'],
      ['Blog','long-form adaptation','✦ generating 1,200 words','var(--accent-sage)'],
      ['Email newsletter','adapted teaser + CTA','scheduled','var(--ink)'],
    ].map(([p,f,s,c],i)=>(
      <Box key={i}>
        <div className="row between center">
          <div className="row center" style={{ gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: c, border: '1.5px solid var(--line)' }} />
            <div>
              <div className="hand-neat">{p}</div>
              <div className="tiny muted mono">{f}</div>
            </div>
          </div>
          <div className="row center" style={{ gap: 6 }}>
            <Chip sm>{s}</Chip>
            <Btn sm ghost>✎ edit</Btn>
          </div>
        </div>
      </Box>
    ))}
    <Anno style={{ alignSelf: 'flex-end' }}>↑ one idea → 7 platforms, each adapted</Anno>
  </Desktop>;
}

window.DesktopScreens = window.DesktopScreens || {};
Object.assign(window.DesktopScreens, {
  crm: [
    { id:'crm1', label:'V1 · Table + filters', caption:'Airtable-style database. Every field filterable, bulk actions.', Component: CRMv1_Table },
    { id:'crm2', label:'V2 · Contact profile', caption:'Full context on one person. AI suggests next actions.', Component: CRMv2_Profile },
    { id:'crm3', label:'V3 · Kanban board', caption:'Pipeline as columns. Drag to fire automations.', Component: CRMv3_Kanban },
  ],
  email: [
    { id:'em1', label:'V1 · Flodesk-style builder', caption:'Drag blocks. Right rail for block props. AI rewrite on selection.', Component: EmailV1_Builder },
    { id:'em2', label:'V2 · Campaigns dashboard', caption:'All sends in one place: one-offs, sequences, stats, AI suggestions.', Component: EmailV2_Campaigns },
    { id:'em3', label:'V3 · Template library', caption:'Reusable + team-shared templates, tagged by purpose.', Component: EmailV3_Templates },
  ],
  content: [
    { id:'co1', label:'V1 · Studio hub', caption:'ICA + pillars + SEO/AEO/GEO scores + weekly calendar.', Component: ContentV1_Hub },
    { id:'co2', label:'V2 · Carousel builder', caption:'Brief-driven. Gamma/Claude generates slides. Caption rewriter.', Component: ContentV2_Carousel },
    { id:'co3', label:'V3 · Blog + AEO scoring', caption:'Editor with live SEO/AEO checks. AI adds FAQ schema, cited stats.', Component: ContentV3_Blog },
    { id:'co4', label:'V4 · Multi-platform publish', caption:'One idea fans out to 7 channels, each auto-adapted.', Component: ContentV4_CrossPost },
  ],
});


/* ===== components/desktop-2.jsx ===== */
// Desktop: Listing Appt/CMA + Deals + KPI + Bio Link

// ===================== LISTING APPT / AI CMA (4 variations) =====================
function ListingV1_Inquiry() {
  return <Desktop active="Deals" url="command.app/listings/new">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>New Listing Inquiry</span>
      <Btn sm primary>✦ Build AI CMA →</Btn>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Owner</div>
        <div className="row" style={{ gap: 8 }}>
          <Input placeholder="Full name" value="Jennifer Hernandez" />
          <Input placeholder="Phone" value="(512) 555-0148" />
        </div>
        <Input placeholder="Email" value="j.hernandez@..." style={{ marginTop: 6 }} />
        <Hr />
        <div className="hand-alt" style={{ fontSize: 15 }}>Property</div>
        <Input placeholder="Address" value="1428 Magnolia Dr" style={{ marginTop: 4 }} />
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          <Input placeholder="Bd" value="4" /><Input placeholder="Ba" value="2.5" />
          <Input placeholder="Sqft" value="2,210" /><Input placeholder="Lot" value="0.24 ac" />
        </div>
        <Input placeholder="Year built" value="1984" style={{ marginTop: 6 }} />
        <Input placeholder="Notes (recent updates, condition, motivation)" style={{ marginTop: 6, minHeight: 80 }} value="Kitchen redone 2022. Roof 2019. Motivated — moving for job July." />
        <Hr />
        <div className="hand-alt" style={{ fontSize: 15 }}>Target</div>
        <div className="row" style={{ gap: 8 }}>
          <Input placeholder="Seller's est. value" value="$825k" />
          <Input placeholder="Listing appt date" value="Fri Apr 24 · 2pm" />
        </div>
      </Box>
      <Box style={{ width: 300, flexShrink: 0 }} dashed>
        <div className="hand-alt" style={{ fontSize: 15 }}>✦ AI will generate</div>
        <Hr />
        <Check>Comparable sales (last 180d, ½mi)</Check>
        <Check>Suggested list price range</Check>
        <Check>Marketing plan (photos, stage, timing)</Check>
        <Check>Pre-listing prep checklist</Check>
        <Check>25-page listing presentation</Check>
        <Check>Seller net sheet at 3 price points</Check>
        <Check>Personalized cover letter</Check>
        <Hr />
        <div className="tiny muted">Reuses your template: "Dana's 2026 Seller Deck"</div>
      </Box>
    </div>
  </Desktop>;
}

function ListingV2_CMA() {
  return <Desktop active="Deals" url="command.app/listings/1428-magnolia/cma">
    <div className="row between center">
      <span className="hand-neat muted">← 1428 Magnolia · CMA</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>Edit comps</Btn>
        <Btn sm>Export PDF</Btn>
        <Btn sm primary>Build presentation →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="row between">
          <div>
            <div className="hand-alt" style={{ fontSize: 16 }}>Suggested range</div>
            <div className="tiny muted">based on 8 comps · confidence 82%</div>
          </div>
          <AI>✦ AI</AI>
        </div>
        <Hr />
        <div style={{ position: 'relative', padding: '20px 0 10px' }}>
          <div style={{ height: 6, background: 'var(--paper-2)', borderRadius: 3, position: 'relative' }}>
            <div style={{ position: 'absolute', left: '18%', right: '22%', top: 0, bottom: 0, background: 'var(--accent-sage)', borderRadius: 3 }} />
            <div style={{ position: 'absolute', left: '34%', top: -4, width: 4, height: 14, background: 'var(--accent)' }} />
          </div>
          <div className="row between mono tiny" style={{ marginTop: 6 }}>
            <span>$760k</span><span>$795k ←  suggested</span><span>$840k</span>
          </div>
        </div>
        <Hr />
        <div className="hand-alt" style={{ fontSize: 14 }}>Comparable sales</div>
        <table className="wf-table" style={{ marginTop: 4 }}>
          <thead><tr><th>Address</th><th>Sold</th><th>$/sf</th><th>DOM</th><th>Match</th></tr></thead>
          <tbody>
            {[
              ['22 Birch Ln','$710k','$332','14','87%'],
              ['144 Willow','$785k','$361','22','82%'],
              ['6 Juniper Pl','$802k','$354','9','79%'],
              ['88 Magnolia','$768k','$345','31','91%'],
              ['312 Peach','$740k','$338','44','74%'],
            ].map((r,i)=>(<tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>))}
          </tbody>
        </table>
      </Box>
      <Box style={{ width: 280, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 15 }}>Seller net sheet</div>
        <div className="tiny muted">3 price scenarios</div>
        <Hr />
        <div className="row between"><span className="hand-neat tiny">List $760k</span><span className="hand-alt">$706k</span></div>
        <div className="tiny muted mono">net after fees</div>
        <div className="row between" style={{ marginTop: 8 }}><span className="hand-neat tiny">List $795k</span><span className="hand-alt">$738k</span></div>
        <div className="tiny muted mono">net after fees</div>
        <div className="row between" style={{ marginTop: 8 }}><span className="hand-neat tiny">List $840k</span><span className="hand-alt">$779k</span></div>
        <div className="tiny muted mono">net after fees</div>
        <Hr />
        <Box dashed style={{ padding: 6 }}>
          <div className="tiny">✦ AI narrative:<br/><i>"At $795k I project 14-21 DOM and 2-3 offers. Above $820k, DOM likely doubles."</i></div>
        </Box>
      </Box>
    </div>
  </Desktop>;
}

function ListingV3_Presentation() {
  return <Desktop active="Deals" url="command.app/listings/1428-magnolia/deck">
    <div className="row between center">
      <span className="hand-neat muted">← Presentation builder</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>Swap template</Btn>
        <Btn sm>Present mode ▶</Btn>
        <Btn sm primary>Send to Jennifer →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
      <Box style={{ width: 180, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>Slides · 18</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {[
            ['01','Cover'],['02','About me'],['03','My promise'],['04','Your home'],
            ['05','The market now'],['06','Comps'],['07','Pricing strategy'],
            ['08','Marketing plan'],['09','Photography'],['10','Staging'],
            ['11','Launch timeline'],['12','Digital ads'],['13','Open houses'],
            ['14','Social reach'],['15','Database'],['16','Net sheet'],
            ['17','Checklist'],['18','Next steps'],
          ].map(([n,t],i)=>(
            <div key={n} className={'wf-chip ' + (i===7?'filled':'')} style={{ justifyContent: 'flex-start', fontSize: 10, padding: '2px 6px' }}>
              <span className="mono" style={{ opacity: 0.5 }}>{n}</span> {t}
            </div>
          ))}
        </div>
        <Btn sm ghost style={{ marginTop: 6 }}>+ slide</Btn>
      </Box>
      <Box className="grow" style={{ padding: 0, background: 'var(--paper)' }}>
        <div style={{ padding: 30, minHeight: 440 }}>
          <div style={{ background: 'var(--card)', border: '1.5px dashed var(--line)', borderRadius: 12, padding: 30, aspectRatio: '16/10' }}>
            <div className="tiny mono muted">08 · MARKETING PLAN</div>
            <div className="serif" style={{ fontSize: 34, marginTop: 8 }}>We're going to reach 48,000 people in 14 days.</div>
            <div className="row" style={{ gap: 20, marginTop: 20 }}>
              <div>
                <div className="hand-alt" style={{ fontSize: 32 }}>48k</div>
                <div className="tiny mono muted">IMPRESSIONS</div>
              </div>
              <div>
                <div className="hand-alt" style={{ fontSize: 32 }}>7</div>
                <div className="tiny mono muted">CHANNELS</div>
              </div>
              <div>
                <div className="hand-alt" style={{ fontSize: 32 }}>2,400</div>
                <div className="tiny mono muted">EMAIL LIST</div>
              </div>
            </div>
            <Hr />
            <div className="tiny muted">Professional photography · drone · 3D walk · FB/IG retargeting · print · open house · agent email blast · just-listed postcard</div>
          </div>
        </div>
      </Box>
      <Box style={{ width: 240, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>Slide 08 · edit</div>
        <Hr />
        <div className="tiny mono muted">HEADLINE</div>
        <Input value="We're going to reach 48,000 people in 14 days." />
        <div className="tiny mono muted" style={{ marginTop: 6 }}>STATS (auto-pulled)</div>
        <div className="tiny">✓ your email list · 2,400</div>
        <div className="tiny">✓ your FB audience · 18k</div>
        <div className="tiny">✓ your IG · 12k</div>
        <Hr />
        <Box dashed>
          <div className="hand-alt tiny">✦ AI</div>
          <div className="tiny">rewrite for softer tone · add a 4th stat · translate to Spanish</div>
        </Box>
      </Box>
    </div>
  </Desktop>;
}

function ListingV4_Checklist() {
  return <Desktop active="Deals" url="command.app/listings/1428-magnolia/checklist">
    <div className="row between center">
      <span className="hand-neat muted">← 1428 Magnolia</span>
      <div className="row" style={{ gap: 6 }}>
        <Chip tan dot>DAY 3 of 45</Chip>
        <Btn sm primary>Go live →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 10 }}>
      {[
        ['Pre-listing','6/9','var(--accent-sage)','66%'],
        ['Photo & media','2/5','var(--accent-tan)','40%'],
        ['Marketing launch','0/8','var(--accent-rose)','0%'],
        ['Live on MLS','0/4','var(--faint)','0%'],
        ['Offers & close','—','var(--faint)','0%'],
      ].map(([l,c,col,p])=>(
        <Box key={l} className="grow" style={{ padding: 10, borderTop: `4px solid ${col}` }}>
          <div className="hand-alt" style={{ fontSize: 14 }}>{l}</div>
          <div className="hand-alt" style={{ fontSize: 22 }}>{c}</div>
          <Bar pct={parseInt(p)} color={col} />
        </Box>
      ))}
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Pre-listing · 6 of 9</div>
        <Hr />
        <Check done>Signed listing agreement</Check>
        <Check done>Collected disclosures</Check>
        <Check done>Measured + floorplan</Check>
        <Check done>Schedule sign install · postasign.com</Check>
        <Check done>Ordered lockbox</Check>
        <Check done>Recommended stager intro</Check>
        <Check>Final CMA reviewed with seller</Check>
        <Check>Seller prep doc sent</Check>
        <Check>Schedule photo/video</Check>
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Photo & media · 2 of 5</div>
        <Hr />
        <Check done>Book photographer (Alex)</Check>
        <Check done>Book drone</Check>
        <Check>Confirm shoot date</Check>
        <Check>3D walk uploaded</Check>
        <Check>Review edits · approve</Check>
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Marketing launch · 0 of 8</div>
        <Hr />
        <Check>Just-listed postcard (500)</Check>
        <Check>Email blast to SOI + list</Check>
        <Check>FB/IG boost $200</Check>
        <Check>MLS copy written</Check>
        <Check>Social carousel</Check>
        <Check>Agent-to-agent email</Check>
        <Check>Reel + YT short</Check>
        <Check>Schedule open house 1</Check>
      </Box>
    </div>
  </Desktop>;
}

// ===================== DEAL TRACKER + OFFER COMPARISON (3 variations) =====================
function DealV1_Pipeline() {
  return <Desktop active="Deals" url="command.app/deals">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Deals</span>
      <div className="row" style={{ gap: 6 }}>
        <Chip filled>Active 9</Chip>
        <Chip>Pending 2</Chip>
        <Chip>Closed 4</Chip>
      </div>
    </div>
    <div className="row" style={{ gap: 10 }}>
      {[['Active','9','$6.8M'],['Under contract','7','$5.1M'],['This month','$712k','net'],['YTD','$12.3M','volume']].map(([l,v,s],i)=>(
        <Box key={i} className="grow" style={{ padding: 10 }}>
          <div className="tiny mono muted">{l.toUpperCase()}</div>
          <div className="serif" style={{ fontSize: 22 }}>{v}</div>
          <div className="tiny muted">{s}</div>
        </Box>
      ))}
    </div>
    <Box style={{ padding: 0, overflow: 'hidden' }}>
      <table className="wf-table">
        <thead><tr>
          <th>Property</th><th>Client</th><th>Side</th><th>Stage</th><th>Price</th><th>Key dates</th><th>Next</th>
        </tr></thead>
        <tbody>
          {[
            ['42 Oak St','Sarah M.','buy','offer out','$762k','resp 12pm','respond'],
            ['88 Elm St','—','list','listed','$649k','DOM 4','OH Sat'],
            ['1428 Magnolia','Hernandez','list','appt Fri','$795k','appt 4/24','present CMA'],
            ['Park Ave 204','Ng family','buy','inspection','$1.1M','due 4/22','schedule'],
            ['7 Cedar','—','list','price cut','−$25k','DOM 21','strategy call'],
            ['12 Ash','Thompson','buy','closing','$540k','close 4/30','final walk'],
          ].map((r,i)=>(<tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>))}
        </tbody>
      </table>
    </Box>
    <Box filled>
      <div className="hand-alt" style={{ fontSize: 15 }}>Post-close follow-up (stay top of mind)</div>
      <div className="row wrap" style={{ gap: 6 }}>
        {[['Thompson','day 14 · 1st check-in'],['Lau','month 3 · anniv handoff'],['Baxter-R.','month 12 · review request'],['Kim-P.','year 2 · Spring CMA gift']].map(([n,s],i)=>(
          <Box key={i} style={{ padding: 6, minWidth: 140 }}>
            <div className="hand-neat tiny">{n}</div>
            <div className="tiny muted mono">{s}</div>
          </Box>
        ))}
      </div>
    </Box>
  </Desktop>;
}

function DealV2_OfferCompare() {
  return <Desktop active="Deals" url="command.app/deals/88-elm/offers">
    <div className="row between center">
      <span className="hand-neat muted">← 88 Elm St · Offer comparison</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>✦ Summarize for seller</Btn>
        <Btn sm primary>Accept offer →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 10 }}>
      {[
        {name:'Offer A', price:'$665k', buyer:'Patel, M.', color:'var(--accent-sage)', best:true,
         rows:[['Down','30%'],['Financing','Conv · pre-app ✓'],['EMD','$20k'],['Close','30d'],['Inspection','4d'],['Appraisal','waived'],['Seller credit','$0'],['Contingencies','none'],['Love letter','✓']]},
        {name:'Offer B', price:'$672k', buyer:'Ng family', color:'var(--accent-tan)',
         rows:[['Down','20%'],['Financing','Conv · pre-app ✓'],['EMD','$15k'],['Close','45d'],['Inspection','7d'],['Appraisal','standard'],['Seller credit','$5k'],['Contingencies','home sale'],['Love letter','—']]},
        {name:'Offer C', price:'$658k', buyer:'Chen, J.', color:'var(--accent-rose)',
         rows:[['Down','25%'],['Financing','Cash ✓'],['EMD','$25k'],['Close','14d'],['Inspection','3d'],['Appraisal','N/A'],['Seller credit','$0'],['Contingencies','none'],['Love letter','✓']]},
      ].map((o,i)=>(
        <Box key={i} className="grow" style={{ padding: 12, position: 'relative', borderTop: `4px solid ${o.color}` }}>
          {o.best && <div style={{ position: 'absolute', top: -12, right: 10, background: 'var(--accent)', color: 'var(--paper)', padding: '2px 8px', borderRadius: 10, fontFamily: 'Caveat,cursive', fontSize: 12 }}>✦ strongest</div>}
          <div className="hand-alt" style={{ fontSize: 16 }}>{o.name}</div>
          <div className="serif" style={{ fontSize: 24 }}>{o.price}</div>
          <div className="tiny muted">{o.buyer}</div>
          <Hr />
          {o.rows.map(([l,v])=>(
            <div key={l} className="row between tiny mono" style={{ padding: '2px 0' }}>
              <span className="muted">{l}</span><span>{v}</span>
            </div>
          ))}
        </Box>
      ))}
    </div>
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 15 }}>✦ AI comparison for seller</div>
      <div className="tiny" style={{  marginTop: 4 }}>
        "Offer B is highest on price but has a home-sale contingency — adds 2-4 weeks of risk. Offer C is cash, closes fastest, nets you ~$642k after fees. Offer A is strongest overall: strong down payment, pre-approved, no contingencies, net ~$620k. <b>My recommendation: counter A at $680k.</b>"
      </div>
    </Box>
  </Desktop>;
}

function DealV3_DealRoom() {
  return <Desktop active="Deals" url="command.app/deals/42-oak">
    <div className="row between center">
      <span className="hand-neat muted">← 42 Oak St · Deal room</span>
      <Chip tan dot>OFFER OUT · 18h</Chip>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 260, flexShrink: 0 }}>
        <Img label="[ 42 Oak · photo ]" h={120} />
        <div className="serif" style={{ fontSize: 17, marginTop: 8 }}>42 Oak St</div>
        <div className="tiny muted mono">$799k · 3bd · 2ba · 0.3ac</div>
        <Hr />
        <div className="tiny mono muted">BUYER</div>
        <div className="hand-neat">Sarah McCallister</div>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>LISTING AGENT</div>
        <div className="hand-neat">B. Kim · Compass</div>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>TIMELINE</div>
        <div className="tiny">Offer out · 8am Apr 17</div>
        <div className="tiny muted">Seller response by 12pm Apr 18</div>
      </Box>
      <div className="col grow">
        <div className="wf-tabs">
          <span className="tab active">Timeline</span>
          <span className="tab">Docs 7</span>
          <span className="tab">Parties 4</span>
          <span className="tab">Key dates</span>
          <span className="tab">Notes</span>
        </div>
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          <div style={{ position: 'absolute', left: 8, top: 8, bottom: 8, width: 2, background: 'var(--line)', borderRadius: 2 }} />
          {[
            ['APR 15','Showing #4 · ★★★★☆','—'],
            ['APR 16','CMA review w/ Sarah','decided to offer'],
            ['APR 17 · 8am','Offer submitted $762k','30% down, 30d close'],
            ['APR 17 · 2pm','Listing agent ack','"seller reviewing"'],
            ['APR 18 · 9am','AI-drafted check-in text','ready to send'],
            ['APR 18 · 12pm','⚠ Seller response deadline',''],
          ].map(([d,t,s],i)=>(
            <div key={i} style={{ position: 'relative', marginBottom: 10 }}>
              <div style={{ position: 'absolute', left: -18, top: 4, width: 10, height: 10, borderRadius: '50%', background: i<4?'var(--accent)':'var(--card)', border: '1.5px solid var(--line)' }} />
              <div className="tiny mono muted">{d}</div>
              <div className="hand-neat tiny">{t}</div>
              {s && <div className="tiny muted">{s}</div>}
            </div>
          ))}
        </div>
        <Box dashed>
          <div className="hand-alt tiny">✦ Draft check-in (awaits your approval)</div>
          <div className="tiny" style={{  marginTop: 4 }}>
            "Hey Sarah — no word yet but I've been in touch with Barbara. Deadline's noon. I'll call the second I hear. Hang in there 🤞 – Dana"
          </div>
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            <Btn sm primary>Send</Btn>
            <Btn sm>Edit</Btn>
            <Btn sm ghost>Skip</Btn>
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

// ===================== KPI REPORTING (4 variations — 3 views + goals) =====================
function KPIv1_Summary() {
  return <Desktop active="Money" url="command.app/kpi">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Reporting</span>
      <div className="row" style={{ gap: 6 }}>
        <Chip>Week</Chip><Chip filled>Month</Chip><Chip>Quarter</Chip><Chip>YTD</Chip>
      </div>
    </div>
    <div className="wf-tabs">
      <span className="tab active">Summary</span>
      <span className="tab">Scorecard</span>
      <span className="tab">Funnel</span>
      <span className="tab">Sources</span>
    </div>
    <div className="row" style={{ gap: 10 }}>
      {[
        ['$2.3M','portfolio','↑ 12%'],
        ['$712','net this mo','↓ 8%'],
        ['7','under contract','—'],
        ['14','buyer prospects','↑ 40%'],
        ['48%','email open','↑ 3pt'],
        ['11','appts booked','↑ 22%'],
      ].map(([v,l,d],i)=>(
        <Box key={i} className="grow" style={{ padding: 10 }}>
          <div className="tiny mono muted">{l.toUpperCase()}</div>
          <div className="serif" style={{ fontSize: 22 }}>{v}</div>
          <div className="tiny muted">{d}</div>
        </Box>
      ))}
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Revenue · last 6 months</div>
        <Img label="[ bar chart · NOV DEC JAN FEB MAR APR ]" h={180} />
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Activity mix</div>
        <div className="row between tiny mono"><span>Prospect calls</span><span>224</span></div>
        <Bar pct={80} />
        <div className="row between tiny mono" style={{ marginTop: 6 }}><span>Showings</span><span>38</span></div>
        <Bar pct={50} color="var(--accent-sage)" />
        <div className="row between tiny mono" style={{ marginTop: 6 }}><span>Open houses hosted</span><span>5</span></div>
        <Bar pct={33} color="var(--accent-rose)" />
        <div className="row between tiny mono" style={{ marginTop: 6 }}><span>Content posts</span><span>22</span></div>
        <Bar pct={66} color="var(--accent-tan)" />
        <div className="row between tiny mono" style={{ marginTop: 6 }}><span>Letters sent</span><span>142</span></div>
        <Bar pct={90} color="var(--ink)" />
      </Box>
    </div>
  </Desktop>;
}

function KPIv2_Scorecard() {
  return <Desktop active="Money" url="command.app/kpi/scorecard">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Scorecard</span>
      <div className="row" style={{ gap: 6 }}>
        <Chip>Week</Chip><Chip filled>Month</Chip><Chip>YTD</Chip>
        <Btn sm>⚙ edit targets</Btn>
      </div>
    </div>
    <Box style={{ padding: 0, overflow: 'hidden' }}>
      <table className="wf-table">
        <thead><tr>
          <th>Metric</th><th>Target</th><th>Actual</th><th>Δ</th><th>Pace</th><th>Status</th>
        </tr></thead>
        <tbody>
          {[
            ['Closed sales','5','2','−3','40%','🟡 off pace'],
            ['New listings','3','2','−1','67%','🟡 off pace'],
            ['Buyer consults','8','11','+3','138%','🟢 on track'],
            ['Open houses','4','5','+1','125%','🟢 on track'],
            ['Prospect calls (conn.)','120','142','+22','118%','🟢 on track'],
            ['Letters sent','40','142','+102','355%','🟢 on track'],
            ['Content posts','16','22','+6','138%','🟢 on track'],
            ['Email sends','4','6','+2','150%','🟢 on track'],
            ['Referrals asked','10','3','−7','30%','🔴 behind'],
            ['Past client touches','40','12','−28','30%','🔴 behind'],
          ].map((r,i)=>(
            <tr key={i}>{r.map((c,j)=><td key={j} style={{
              color: j===5 ? (c.includes('🟢')?'var(--accent-sage)':c.includes('🔴')?'#b6473a':'var(--accent-tan)') : undefined,
              fontWeight: j===5 ? 600 : undefined,
            }}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </Box>
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ AI coach</div>
      <div className="tiny">You're winning on top-of-funnel but starving on referrals + past-client touches — where repeat business lives. Queue 40 anniversary emails? <Btn sm tan style={{ marginLeft: 6 }}>Do it</Btn></div>
    </Box>
    <Anno style={{ alignSelf: 'flex-end' }}>↑ traffic-light accountability</Anno>
  </Desktop>;
}

function KPIv3_Funnel() {
  return <Desktop active="Money" url="command.app/kpi/funnel">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Conversion Funnel</span>
      <div className="row" style={{ gap: 6 }}>
        <Chip>Week</Chip><Chip>Month</Chip><Chip filled>Quarter</Chip>
      </div>
    </div>
    <Box>
      <div className="col" style={{ gap: 6, padding: '10px 0' }}>
        {[
          ['Prospects contacted',624,'100%','var(--accent-tan)'],
          ['Conversations',214,'34%','var(--accent-tan)'],
          ['Leads (opted-in)',86,'14%','var(--accent-sage)'],
          ['Appointments',22,'3.5%','var(--accent-sage)'],
          ['Signed clients',14,'2.2%','var(--accent-rose)'],
          ['Active deals',9,'1.4%','var(--accent)'],
          ['Closed',4,'0.6%','var(--ink)'],
        ].map(([l,v,p,c],i)=>(
          <div key={l} className="row center" style={{ gap: 8 }}>
            <div style={{ width: 140 }} className="hand-neat tiny">{l}</div>
            <div style={{
              flex: 1, height: 26,
              background: c, color: 'var(--paper)',
              border: '1.5px solid var(--line)', borderRadius: 6,
              display: 'flex', alignItems: 'center', padding: '0 10px',
              width: `${100 - i*12}%`,
              fontFamily: 'Caveat,cursive', fontSize: 16, justifyContent: 'space-between',
            }}>
              <span>{v}</span>
              <span className="mono tiny" style={{ opacity: 0.8 }}>{p}</span>
            </div>
          </div>
        ))}
      </div>
    </Box>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>Leaks</div>
        <div className="tiny"><b>Prospect → Conversation</b>: 34% (industry 28%) <span className="faint">— ok</span></div>
        <div className="tiny"><b>Conversation → Lead</b>: 40% (industry 55%) <span style={{color:'#b6473a'}}>— under</span></div>
        <div className="tiny"><b>Lead → Appt</b>: 26% (industry 22%) <span style={{color:'var(--accent-sage)'}}>— strong</span></div>
        <div className="tiny"><b>Appt → Client</b>: 64% (industry 70%) <span className="faint">— ok</span></div>
      </Box>
      <Box className="grow" dashed>
        <div className="hand-alt" style={{ fontSize: 15 }}>✦ AI focus</div>
        <div className="tiny">Conversation → Lead is leaking. Your script closes on "more info later" too often. Try: "Would it help if I sent you 3 homes that match now?" — 12 top agents in your comp group use that line.</div>
      </Box>
    </div>
  </Desktop>;
}

function KPIv4_Goals() {
  return <Desktop active="Money" url="command.app/kpi/goals">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Annual Goals · 2026</span>
      <span className="tiny mono muted">33% THROUGH YEAR</span>
    </div>
    <div className="row" style={{ gap: 10 }}>
      {[
        ['Sales', 2, 20, 'var(--accent)'],
        ['Listings', 2, 15, 'var(--accent-tan)'],
        ['Buyers signed', 3, 15, 'var(--accent-sage)'],
        ['Open houses', 5, 48, 'var(--accent-rose)'],
        ['GCI', 38, 180, 'var(--ink)', '$k'],
      ].map(([l,a,t,c,u],i)=>{
        const pct = Math.round(a/t*100);
        const onPace = 33;
        return <Box key={i} className="grow" style={{ padding: 12 }}>
          <div className="hand-alt" style={{ fontSize: 14 }}>{l}</div>
          <div style={{ position: 'relative', width: 80, height: 80, margin: '6px auto' }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="var(--paper-2)" strokeWidth="8"/>
              <circle cx="40" cy="40" r="32" fill="none" stroke={c} strokeWidth="8" strokeDasharray={`${pct*2.01} 999`} strokeLinecap="round" transform="rotate(-90 40 40)"/>
              <text x="40" y="46" textAnchor="middle" fontFamily="Caveat,cursive" fontSize="20" fill="var(--ink)">{pct}%</text>
            </svg>
          </div>
          <div className="tiny mono muted" style={{ textAlign: 'center' }}>{u||''}{a} / {u||''}{t}</div>
          <div className="tiny" style={{ textAlign: 'center', color: pct<onPace-10?'#b6473a':pct<onPace?'var(--accent-tan)':'var(--accent-sage)' }}>
            {pct<onPace-10?'behind pace':pct<onPace?'slightly behind':'on pace'}
          </div>
        </Box>;
      })}
    </div>
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 15 }}>Week 16 commitments</div>
      <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
        <Chip>40 prospect calls</Chip>
        <Chip>2 open houses</Chip>
        <Chip>10 letters</Chip>
        <Chip>3 content posts</Chip>
        <Chip>1 blog</Chip>
        <Chip tan>✦ auto-tracked from activity</Chip>
      </div>
    </Box>
  </Desktop>;
}

// ===================== BIO LINK PAGE (3 variations) =====================
function BioV1_Builder() {
  return <Desktop active="Bio Link" url="command.app/bio">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Bio Link Page</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>dana.command.co</Btn>
        <Btn sm>Preview</Btn>
        <Btn sm primary>Publish</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 200, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>Blocks</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {['◉ Header','↗ Link','✎ Form','📘 Guide download','📅 Booker','★ Testimonial','🏡 Featured listing','📹 Video','📧 Email opt-in','🎁 Lead magnet'].map(b=>(
            <div key={b} className="wf-chip" style={{ justifyContent: 'flex-start', fontSize: 11 }}>{b}</div>
          ))}
        </div>
      </Box>
      <Box className="grow" style={{ padding: 0, background: 'var(--paper-2)' }}>
        <div style={{ maxWidth: 340, margin: '20px auto', background: 'var(--card)', padding: 24, borderRadius: 18, border: '1.5px solid var(--line)' }}>
          <div style={{ textAlign: 'center' }}>
            <Avatar size={70} initials="DM" color="var(--accent-tan)" />
            <div className="serif" style={{ fontSize: 20, marginTop: 8 }}>Dana Massey</div>
            <div className="hand-alt muted" style={{ fontSize: 14 }}>Oak Park realtor · mom of 2</div>
          </div>
          <div className="col" style={{ gap: 8, marginTop: 14 }}>
            <Box style={{ textAlign: 'center', padding: 10 }}>🏡  Browse my listings</Box>
            <Box tan style={{ textAlign: 'center', padding: 10 }}>📘  Free: First-time buyer guide</Box>
            <Box style={{ textAlign: 'center', padding: 10 }}>📅  Book a 20-min intro</Box>
            <Box dashed style={{ padding: 10 }}>
              <div className="hand-alt tiny" style={{ textAlign: 'center' }}>Get my weekly market email</div>
              <Input placeholder="email" style={{ marginTop: 6 }} />
              <Btn primary sm style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>Subscribe</Btn>
            </Box>
            <Box style={{ textAlign: 'center', padding: 10 }}>⭐  read client reviews</Box>
            <div className="row between" style={{ marginTop: 8 }}>
              {['IG','FB','TT','YT','LN'].map(s=><Chip key={s} sm>{s}</Chip>)}
            </div>
          </div>
        </div>
      </Box>
      <Box style={{ width: 220, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>Selected: Guide block</div>
        <Hr />
        <div className="tiny mono muted">LABEL</div>
        <Input value="First-time buyer guide" />
        <div className="tiny mono muted" style={{ marginTop: 6 }}>FILE</div>
        <Chip>first-time-buyer.pdf</Chip>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>DELIVERY</div>
        <Check done>Require email</Check>
        <Check done>Auto-enroll: "FTB sequence"</Check>
        <Check done>Add tag: "guide-download"</Check>
        <Check>Add to FB audience</Check>
        <Hr />
        <div className="tiny muted mono">THIS BLOCK · 30d</div>
        <div className="tiny">👁 views 1,214</div>
        <div className="tiny">↓ downloads 88</div>
        <div className="tiny">→ opt-ins 74</div>
      </Box>
    </div>
  </Desktop>;
}

function BioV2_Analytics() {
  return <Desktop active="Bio Link" url="command.app/bio/stats">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Bio Link · Performance</span>
      <div className="row" style={{ gap: 6 }}>
        <Chip>7d</Chip><Chip filled>30d</Chip><Chip>90d</Chip>
      </div>
    </div>
    <div className="row" style={{ gap: 10 }}>
      {[['3,414','visits','↑ 22%'],['842','clicks','↑ 14%'],['24.7%','CTR','↑ 2pt'],['88','downloads','↑ 40%'],['74','email opt-ins','↑ 32%']].map(([v,l,d])=>(
        <Box key={l} className="grow" style={{ padding: 10 }}>
          <div className="tiny mono muted">{l.toUpperCase()}</div>
          <div className="serif" style={{ fontSize: 22 }}>{v}</div>
          <div className="tiny muted">{d}</div>
        </Box>
      ))}
    </div>
    <Box>
      <div className="hand-alt" style={{ fontSize: 15 }}>Block performance</div>
      <table className="wf-table">
        <thead><tr><th>Block</th><th>Views</th><th>Clicks</th><th>CTR</th><th>Conv.</th></tr></thead>
        <tbody>
          {[
            ['📘 Guide download',3414,512,'15%','74 opt-ins'],
            ['📅 Book intro',3414,98,'2.9%','12 booked'],
            ['🏡 Browse listings',3414,214,'6.3%','—'],
            ['📧 Email opt-in',3414,68,'2.0%','44 subs'],
            ['⭐ Reviews',3414,42,'1.2%','—'],
          ].map((r,i)=>(<tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>))}
        </tbody>
      </table>
    </Box>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 14 }}>Traffic sources</div>
        <div className="row between tiny mono"><span>Instagram bio</span><span>58%</span></div>
        <Bar pct={58} />
        <div className="row between tiny mono" style={{ marginTop: 4 }}><span>TikTok</span><span>22%</span></div>
        <Bar pct={22} color="var(--accent-rose)" />
        <div className="row between tiny mono" style={{ marginTop: 4 }}><span>Direct / QR</span><span>14%</span></div>
        <Bar pct={14} color="var(--accent-sage)" />
      </Box>
      <Box className="grow" dashed>
        <div className="hand-alt" style={{ fontSize: 14 }}>✦ AI recommendations</div>
        <div className="tiny">• Move the guide block above listings — will likely lift downloads 12%</div>
        <div className="tiny">• Your reviews block is under-clicked; swap for a testimonial carousel</div>
        <div className="tiny">• TikTok traffic spiked Thu — repost the first-timer reel</div>
      </Box>
    </div>
  </Desktop>;
}

function BioV3_LeadMagnet() {
  return <Desktop active="Bio Link" url="command.app/bio/guides">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Guides + Lead Magnets</span>
      <Btn sm primary>+ New guide</Btn>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
      {[
        ['First-time buyer guide','pdf · 18 pages',88,'FTB sequence'],
        ['Oak Park neighborhood guide','pdf · 12 pages',44,'SOI nurture'],
        ['Seller prep checklist','pdf · 4 pages',22,'Seller seq.'],
        ['Spring market report','pdf · 8 pages · auto-refresh',14,'Market sub.'],
        ['Relocation packet','pdf · 20 pages',6,'Relo sequence'],
        ['+ new','',null,''],
      ].map(([t,f,d,seq],i)=>{
        if(d === null) return <Box key={i} dashed style={{ textAlign: 'center', padding: 20 }}>
          <div className="hand-alt" style={{ fontSize: 28 }}>+</div>
          <div className="tiny muted">new lead magnet</div>
        </Box>;
        return <Box key={i}>
          <Img label="[ pdf cover ]" h={100} />
          <div className="hand-neat" style={{ marginTop: 6 }}>{t}</div>
          <div className="tiny muted mono">{f}</div>
          <Hr />
          <div className="row between tiny"><span>Downloads</span><span>{d}</span></div>
          <div className="row between tiny"><span>→ sequence</span><span className="muted">{seq}</span></div>
        </Box>;
      })}
    </div>
    <Box dashed>
      <div className="hand-alt">✦ AI can generate a new guide</div>
      <div className="row" style={{ gap: 6, marginTop: 6 }}>
        <Input placeholder="topic — e.g., 'moving to Austin with kids'" />
        <Btn sm tan>Draft →</Btn>
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>Uses your voice, your ICA, your brand colors. 15-20 page PDF in ~2 minutes.</div>
    </Box>
  </Desktop>;
}

window.DesktopScreens = window.DesktopScreens || {};
Object.assign(window.DesktopScreens, {
  listing: [
    { id:'li1', label:'V1 · New inquiry intake', caption:'Quick form. AI promises a CMA + 25-page deck.', Component: ListingV1_Inquiry },
    { id:'li2', label:'V2 · AI CMA', caption:'Comps table, confidence, net sheets at 3 price points.', Component: ListingV2_CMA },
    { id:'li3', label:'V3 · Presentation builder', caption:'Slide list, canvas, right rail. AI rewrites + swaps data.', Component: ListingV3_Presentation },
    { id:'li4', label:'V4 · 45-day checklist', caption:'Pre-listing → photo → launch → live → close.', Component: ListingV4_Checklist },
  ],
  deals: [
    { id:'d1', label:'V1 · Deal pipeline', caption:'All active deals in one table + post-close follow-up strip.', Component: DealV1_Pipeline },
    { id:'d2', label:'V2 · Offer comparison', caption:'Side-by-side offers. AI picks strongest + writes seller summary.', Component: DealV2_OfferCompare },
    { id:'d3', label:'V3 · Deal room (per-deal)', caption:'Timeline, parties, docs. AI drafts check-ins.', Component: DealV3_DealRoom },
  ],
  kpi: [
    { id:'k1', label:'V1 · Executive summary', caption:'Big numbers, trend deltas, revenue chart, activity mix.', Component: KPIv1_Summary },
    { id:'k2', label:'V2 · Scorecard', caption:'Targets vs actuals. Red/yellow/green. AI coach at bottom.', Component: KPIv2_Scorecard },
    { id:'k3', label:'V3 · Conversion funnel', caption:'Leak analysis vs industry. AI pinpoints the weakest stage.', Component: KPIv3_Funnel },
    { id:'k4', label:'V4 · Annual goals', caption:'Circular progress per goal, auto-tracked weekly commitments.', Component: KPIv4_Goals },
  ],
  bio: [
    { id:'bi1', label:'V1 · Page builder', caption:'Linktree-style. Forms, guide downloads, bookers, auto-enroll.', Component: BioV1_Builder },
    { id:'bi2', label:'V2 · Performance analytics', caption:'Block-by-block CTR + AI reorder suggestions.', Component: BioV2_Analytics },
    { id:'bi3', label:'V3 · Lead magnet library', caption:'All guides in one place. AI can draft a new one.', Component: BioV3_LeadMagnet },
  ],
});


/* ===== components/inspo.jsx ===== */
// Content Studio — Inspo Vault (3 variations) + Taste Profile
// Drop inspo, AI extracts, learn preferences, recreate with "this property"

function InspoV1_Vault() {
  const items = [
    { k:'reel', src:'@theagencyre', label:'dawn drone pan · jazz undertone', tags:['cinematic','listing','luxury'], liked:true },
    { k:'carousel', src:'@ryanserhant', label:'8-slide "3 biggest mistakes"', tags:['educational','carousel','punchy'], liked:true },
    { k:'photo', src:'pinterest', label:'matte kitchen · styled flat-lay', tags:['photo','warm','editorial'] },
    { k:'tiktok', src:'@glennsanford', label:'talking head + b-roll overlays', tags:['talking-head','fast-cut'] },
    { k:'reel', src:'@erinandream', label:'walk-through w/ voiceover list', tags:['voiceover','walk-through'], liked:true },
    { k:'post', src:'@oakparkdana', label:'before/after renovation grid', tags:['before-after','story'] },
    { k:'email', src:'flodesk', label:'quarterly recap, soft serif', tags:['newsletter','editorial'] },
    { k:'carousel', src:'@mollymccaw', label:'neighborhood guide · mapped', tags:['neighborhood','carousel','guide'], liked:true },
    { k:'photo', src:'domino', label:'dusk exterior · golden hour', tags:['photo','golden-hour'] },
  ];
  return <Desktop active="Content" url="command.app/content/inspo">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Inspo vault</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>⎗ paste link</Btn>
        <Btn sm>↑ upload</Btn>
        <Btn sm>📎 IG saved sync</Btn>
        <Btn sm primary>✦ extract from selection →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 180, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>Filter</div>
        <Hr />
        <div className="tiny mono muted">TYPE</div>
        <div className="col" style={{ gap: 2, marginTop: 4 }}>
          {['All 42','Reel 14','Carousel 11','Photo 9','TikTok 5','Email 3'].map(t=>
            <div key={t} className="wf-chip" style={{ justifyContent:'flex-start', fontSize: 11 }}>{t}</div>)}
        </div>
        <div className="tiny mono muted" style={{ marginTop: 10 }}>TAG</div>
        <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
          {['cinematic','editorial','warm','walk-through','voiceover','before-after','carousel','golden-hour','educational'].map(t=>
            <Chip key={t} sm>{t}</Chip>)}
        </div>
        <div className="tiny mono muted" style={{ marginTop: 10 }}>STATUS</div>
        <Check>★ loved (14)</Check>
        <Check>○ saved (28)</Check>
        <Check>✓ recreated (9)</Check>
      </Box>
      <div className="grow">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10 }}>
          {items.map((it,i)=>(
            <Box key={i} style={{ padding: 0, overflow: 'hidden' }}>
              <Img label={`[ ${it.k} · ${it.src} ]`} h={140} />
              <div style={{ padding: 10 }}>
                <div className="row between center">
                  <span className="tiny mono muted">{it.src}</span>
                  <span className="tiny">{it.liked ? '★' : '○'}</span>
                </div>
                <div className="hand-neat" style={{ fontSize: 13, marginTop: 2 }}>{it.label}</div>
                <div className="row wrap" style={{ gap: 3, marginTop: 4 }}>
                  {it.tags.map(t=><Chip key={t} sm>{t}</Chip>)}
                </div>
                <div className="row" style={{ gap: 4, marginTop: 6 }}>
                  <Btn sm>✦ Recreate</Btn>
                  <Btn sm ghost>notes</Btn>
                </div>
              </div>
            </Box>
          ))}
        </div>
      </div>
    </div>
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ What I learned this week</div>
      <div className="tiny">You ★'d 4 cinematic listing reels with warm color-grade and no on-screen text. You dismissed 3 talking-head pieces. I'll prioritize those patterns in new suggestions.</div>
    </Box>
  </Desktop>;
}

function InspoV2_Extract() {
  return <Desktop active="Content" url="command.app/content/inspo/reel-erinandream-042">
    <div className="row between center">
      <span className="hand-neat muted">← Inspo · @erinandream listing walk-through</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>★ love</Btn>
        <Btn sm>add note</Btn>
        <Btn sm primary>✦ Recreate with… →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 260, flexShrink: 0, padding: 0, overflow:'hidden' }}>
        <Img label="[ reel preview · 0:47 ]" h={380} />
        <div style={{ padding: 10 }}>
          <div className="tiny mono muted">SOURCE</div>
          <div className="tiny">instagram.com/reel/Cx7h…</div>
          <div className="tiny mono muted" style={{ marginTop: 6 }}>SAVED</div>
          <div className="tiny">Apr 14, 2026 · 2:14pm</div>
        </div>
      </Box>
      <div className="col grow" style={{ gap: 10 }}>
        <Box>
          <div className="hand-alt" style={{ fontSize: 15 }}>✦ AI extracted</div>
          <Hr />
          <div className="row" style={{ gap: 12 }}>
            <div className="grow">
              <div className="tiny mono muted">FORMAT</div>
              <div>45–60s reel · vertical · 3-scene structure</div>
              <div className="tiny mono muted" style={{ marginTop: 6 }}>HOOK (0–2s)</div>
              <div className="serif" style={{ fontSize: 16 }}>"You will not believe what's behind this door."</div>
              <div className="tiny mono muted" style={{ marginTop: 6 }}>PACING</div>
              <div>1 cut every 1.8s · slow push-ins · voiceover under music at -18db</div>
            </div>
            <div className="grow">
              <div className="tiny mono muted">VISUAL LANGUAGE</div>
              <div>warm LUT · matte highlights · no on-screen text</div>
              <div className="tiny mono muted" style={{ marginTop: 6 }}>MUSIC</div>
              <div>low-tempo piano (epidemic "Honey Oak")</div>
              <div className="tiny mono muted" style={{ marginTop: 6 }}>CTA</div>
              <div>"link in bio to tour" · held 3s over exterior</div>
            </div>
          </div>
        </Box>
        <Box>
          <div className="hand-alt" style={{ fontSize: 15 }}>Why you liked it  <span className="tiny muted">· tell AI more</span></div>
          <Hr />
          <div className="row wrap" style={{ gap: 4 }}>
            {[['hook','★'],['pacing','★'],['voiceover','★'],['color grade','★'],['CTA',''],['music',''],['caption','—']].map(([l,v])=>(
              <Chip key={l}>{l} {v}</Chip>
            ))}
          </div>
          <Input placeholder="what specifically do you love about this? (teaches your taste)" value="the single-line hook without on-screen text — feels cinematic, not salesy" style={{ marginTop: 8, minHeight: 50 }} />
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            <Btn sm>👍 more like this</Btn>
            <Btn sm ghost>👎 not my style</Btn>
          </div>
        </Box>
        <Box dashed>
          <div className="hand-alt">Recreate this with…</div>
          <div className="row" style={{ gap: 6, marginTop: 6, flexWrap:'wrap' }}>
            <Chip>🏡 42 Oak St (active)</Chip>
            <Chip>🏡 88 Elm St (active)</Chip>
            <Chip>🏡 1428 Magnolia (upcoming)</Chip>
            <Chip>📍 Oak Park neighborhood</Chip>
            <Chip>☕ Fiore coffee shop feature</Chip>
            <Chip tan>+ custom brief</Chip>
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>AI keeps the structure (hook→3 scenes→CTA) but swaps the subject. Script, shot list, and caption draft appear in the Carousel/Script builder.</div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

function InspoV3_TasteProfile() {
  const loves = [
    ['warm, matte color grade', 14],
    ['single-line hooks (no on-screen text)', 11],
    ['voiceover over soft piano', 9],
    ['slow push-in shots', 7],
    ['editorial serif captions', 6],
    ['before/after structure', 5],
    ['neighborhood-as-character', 4],
  ];
  const avoids = [
    ['talking-head direct-to-cam',4],
    ['trending audio / memes',7],
    ['hard-sell CTAs in caption',5],
    ['neon/gradient overlays',3],
    ['screen-text-heavy edits',6],
  ];
  return <Desktop active="Content" url="command.app/content/taste">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>My taste profile</span>
      <div className="tiny mono muted">BUILT FROM 42 INSPO · 9 RECREATES · 138 SIGNALS</div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>What Dana loves</div>
        <Hr />
        {loves.map(([l,n])=>(
          <div key={l} className="row between center" style={{ padding: '3px 0' }}>
            <span>{l}</span>
            <div className="row center" style={{ gap: 6 }}>
              <Bar pct={n*7} />
              <span className="tiny mono muted" style={{ width: 20 }}>{n}</span>
            </div>
          </div>
        ))}
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>What Dana avoids</div>
        <Hr />
        {avoids.map(([l,n])=>(
          <div key={l} className="row between center" style={{ padding: '3px 0' }}>
            <span>{l}</span>
            <div className="row center" style={{ gap: 6 }}>
              <Bar pct={n*10} color="var(--accent-rose)" />
              <span className="tiny mono muted" style={{ width: 20 }}>{n}</span>
            </div>
          </div>
        ))}
      </Box>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 14 }}>Voice · signature phrases</div>
        <div className="tiny">"let's walk it" · "here's what I'd do" · "the room that sold me" · "you don't buy a house, you buy a life"</div>
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 14 }}>Palette reference</div>
        <div className="row" style={{ gap: 4, marginTop: 4 }}>
          {['#3d2e1f','#c9a274','#8a9b7f','#c78b7a','#f5f1ea'].map(c=>
            <div key={c} style={{ width: 28, height: 28, borderRadius: 4, background: c, border:'1px solid var(--line)' }} />
          )}
        </div>
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 14 }}>Reference creators</div>
        <div className="tiny">@erinandream · @mollymccaw · @theagencyre · @ryanserhant (educational only)</div>
      </Box>
    </div>
    <Box dashed>
      <div className="hand-alt">✦ Ready to use this profile</div>
      <div className="row" style={{ gap: 6, marginTop: 6, flexWrap:'wrap' }}>
        <Chip tan>draft this week's reel (3 ideas)</Chip>
        <Chip>rewrite pinned posts in voice</Chip>
        <Chip>suggest 5 inspo to save next</Chip>
        <Chip>build a listing launch pack for 42 Oak</Chip>
      </div>
    </Box>
    <Anno style={{ alignSelf:'flex-end' }}>↑ the longer you use it, the sharper it gets</Anno>
  </Desktop>;
}

window.InspoScreens = [
  { id:'insp1', label:'V1 · Inspo vault', caption:'Drop links/uploads/IG saves. Grid, filter, tag, love, recreate.', Component: InspoV1_Vault },
  { id:'insp2', label:'V2 · Extract + recreate', caption:'AI breaks down what makes the piece work. Pick a property to recreate with.', Component: InspoV2_Extract },
  { id:'insp3', label:'V3 · Taste profile', caption:'What AI has learned. Loves, avoids, voice, palette, creators.', Component: InspoV3_TasteProfile },
];


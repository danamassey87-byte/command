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

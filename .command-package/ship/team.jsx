/* ============================================================
   TEAM · MULTI-AGENT
   Assistants · TCs · co-listing · delegation · permissions
   Designed for the solo-to-small-team transition (2–12 people).
   ============================================================ */

/* ---------- shared ---------- */
const TEAM_ROSTER = [
  { id:'dana',  name:'Dana Martinez',     role:'Lead agent',           init:'DM', color:'var(--accent-tan)',  cap:'owner',  rev:'$412k' },
  { id:'maya',  name:'Maya Chen',         role:'Buyer agent',          init:'MC', color:'var(--accent-sage)', cap:'agent',  rev:'$138k' },
  { id:'jordan',name:'Jordan Park',       role:'Showing + TC assist',  init:'JP', color:'var(--accent-rose)', cap:'agent',  rev:'$62k'  },
  { id:'alex',  name:'Alex Rivera',       role:'Transaction coord.',   init:'AR', color:'var(--ink)',          cap:'tc',     rev:'—'    },
  { id:'sam',   name:'Sam Nakamura',      role:'Marketing VA',         init:'SN', color:'var(--accent-tan)',  cap:'va',     rev:'—'    },
  { id:'priya', name:'Priya Shah',        role:'ISA (part-time)',      init:'PS', color:'var(--accent-sage)', cap:'isa',    rev:'—'    },
];

function Avatar({ p, size = 28 }) {
  return <div style={{
    width: size, height: size, borderRadius: '50%',
    background: p.color || 'var(--accent-tan)',
    color:'var(--paper)', display:'flex', alignItems:'center', justifyContent:'center',
    fontFamily:"'IBM Plex Mono',monospace", fontSize: Math.round(size*0.35), letterSpacing:'0.05em', fontWeight: 600, flexShrink: 0,
  }}>{p.init}</div>;
}

function RoleBadge({ role }) {
  const map = {
    owner:{ bg:'var(--ink)',          fg:'var(--paper)', label:'OWNER' },
    agent:{ bg:'var(--accent-sage)',  fg:'var(--paper)', label:'AGENT' },
    tc:   { bg:'var(--accent-tan)',   fg:'var(--ink)',   label:'TC' },
    va:   { bg:'var(--accent-rose)',  fg:'var(--paper)', label:'VA' },
    isa:  { bg:'var(--faint)',        fg:'var(--ink)',   label:'ISA' },
  };
  const m = map[role] || map.agent;
  return <span style={{ background: m.bg, color: m.fg, fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, padding:'2px 6px', borderRadius: 3, letterSpacing:'0.1em' }}>{m.label}</span>;
}

/* ============================================================
 * V1 · TEAM DASHBOARD (desktop)
 *   Who's on today · live deals by owner · capacity heatmap
 * ============================================================ */
function Team1_Dashboard() {
  return <Desktop active="Team" url="command.app/team">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · 6 people</div>
        <span className="serif" style={{ fontSize: 22 }}>The team · today</span>
        <div className="tiny muted">One screen. Who's doing what. Where the bottleneck is. Who needs help.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>standup recap</Btn>
        <Btn sm>reassign</Btn>
        <Btn sm primary>+ invite</Btn>
      </div>
    </div>

    {/* Live capacity heatmap */}
    <Box>
      <div className="row between center">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Capacity today · live</span>
        <span className="tiny muted">updates every 5 min · tap a cell to reassign</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'110px repeat(6, 1fr) 70px', gap: 4, marginTop: 8, alignItems:'center' }}>
        <div />
        {TEAM_ROSTER.map(p => (
          <div key={p.id} className="col" style={{ alignItems:'center', gap: 3 }}>
            <Avatar p={p} />
            <span className="tiny mono" style={{ fontSize: 9 }}>{p.name.split(' ')[0]}</span>
          </div>
        ))}
        <div className="tiny mono muted">total</div>

        {[
          ['Buyer showings', [2,4,3,0,0,0]],
          ['Listings active',[3,1,0,0,0,0]],
          ['Open houses wk', [1,0,2,0,0,0]],
          ['Contacts owed',  [8,3,5,0,12,18]],
          ['Drafts to review',[6,0,0,0,14,0]],
          ['Docs open',      [2,1,1,11,0,0]],
          ['Hours (est.)',   [46, 38, 24, 32, 20, 14]],
        ].map(([label, vals],ri)=>(
          <React.Fragment key={ri}>
            <div className="tiny">{label}</div>
            {vals.map((v,i)=>{
              const over = (label==='Hours (est.)' && v >= 40) || (label==='Contacts owed' && v >= 10);
              const warm = v >= (label==='Hours (est.)' ? 30 : 6);
              const bg = v===0 ? 'var(--paper-2)' : over ? 'rgba(192,96,74,0.18)' : warm ? 'rgba(185,151,130,0.3)' : 'rgba(139,154,123,0.22)';
              return <div key={i} style={{ background: bg, padding:'6px 4px', textAlign:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize: 11, border:'1px solid var(--line)' }}>{v || '·'}</div>;
            })}
            <div className="tiny mono" style={{ textAlign:'right' }}>{vals.reduce((a,b)=>a+b,0)}</div>
          </React.Fragment>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>↑ Sam has 14 drafts in review · Priya's ISA queue hit 18 · consider load-shifting before Friday.</div>
    </Box>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* Who's on */}
      <Box className="grow" style={{ flexBasis: 360 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>WHO'S ON · live</span>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {[
            [TEAM_ROSTER[0], 'listing appt · 9a — 47 Oak', 'active',    'var(--accent-sage)'],
            [TEAM_ROSTER[1], '3 showings · 10:30 → 2pm',   'driving',   'var(--accent-tan)'],
            [TEAM_ROSTER[2], 'open house · Sat prep',       'desk',      'var(--accent-sage)'],
            [TEAM_ROSTER[3], 'inspection coord · 2 deals',  'calls',     'var(--accent-tan)'],
            [TEAM_ROSTER[4], 'drafts · carousel × 3',       'desk',      'var(--accent-sage)'],
            [TEAM_ROSTER[5], 'ISA dials · exp + FSBO',      'calling',   'var(--accent-rose)'],
          ].map(([p,now,st,c],i)=>(
            <div key={i} className="row" style={{ gap: 8, padding: 8, background:'#fff', border:'1px solid var(--line)', alignItems:'center' }}>
              <Avatar p={p} />
              <div className="col" style={{ flex: 1 }}>
                <div className="row" style={{ gap: 6, alignItems:'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                  <RoleBadge role={p.cap} />
                </div>
                <span className="tiny muted">{now}</span>
              </div>
              <div style={{ width: 8, height: 8, borderRadius:'50%', background: c }} />
              <span className="tiny mono muted" style={{ fontSize: 9 }}>{st}</span>
            </div>
          ))}
        </div>
      </Box>

      {/* Team pipeline */}
      <Box className="grow" style={{ flexBasis: 420 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>TEAM PIPELINE · by owner · $3.2M total</span>
        <div className="col" style={{ gap: 4, marginTop: 8 }}>
          {[
            [TEAM_ROSTER[0], 11, '$2.1M', 74],
            [TEAM_ROSTER[1], 5,  '$780k', 52],
            [TEAM_ROSTER[2], 2,  '$310k', 20],
          ].map(([p,n,gci,pct],i)=>(
            <div key={i} className="col" style={{ gap: 3, padding: 6, background:'var(--paper-2)' }}>
              <div className="row between center">
                <div className="row" style={{ gap: 6, alignItems:'center' }}>
                  <Avatar p={p} size={22} />
                  <span className="tiny" style={{ fontWeight: 600 }}>{p.name}</span>
                </div>
                <span className="tiny mono">{n} deals · {gci}</span>
              </div>
              <div style={{ height: 5, background:'var(--line)', borderRadius: 2, overflow:'hidden' }}>
                <div style={{ width: pct+'%', height:'100%', background: p.color }} />
              </div>
            </div>
          ))}
        </div>
        <Hr />
        <div className="tiny mono muted">UNASSIGNED</div>
        <div className="row between" style={{ padding:'4px 0' }}>
          <span className="tiny">3 new leads · no owner</span>
          <Btn sm>auto-route →</Btn>
        </div>
      </Box>
    </div>

    <Anno style={{ alignSelf:'flex-end' }}>↑ Dana sees the whole team from one screen · ops, don't manage</Anno>
  </Desktop>;
}


/* ============================================================
 * V2 · ROSTER + ROLES (desktop)
 *   People list · add person · role templates · activity
 * ============================================================ */
function Team2_Roster() {
  const rolePresets = [
    ['Lead agent',         'Full access · owner equiv · billing'],
    ['Buyer/Listing agent', 'Own their deals · see all listings · can\'t see money'],
    ['Transaction coord.', 'All deals in contract+ · checklists · vendor coord · docs'],
    ['Showing agent',      'Only assigned showings · deal-specific access expires'],
    ['ISA / dialer',       'Leads feed · scripts · can text/call · no deal access'],
    ['Marketing / VA',     'Content studio · drafts · no client direct contact'],
    ['Custom',             'Build your own · 28 granular permissions'],
  ];

  return <Desktop active="Team" url="command.app/team/roster">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Team · roster</div>
        <span className="serif" style={{ fontSize: 22 }}>6 people · 3 seats open</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>import from Slack</Btn>
        <Btn sm primary>+ invite person</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* Table */}
      <Box className="grow">
        <div style={{ display:'grid', gridTemplateColumns:'28px 1.2fr 1fr 120px 90px 140px 80px', gap: 8, padding:'6px 4px', fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, letterSpacing:'0.1em', color:'var(--muted)', borderBottom:'1px solid var(--line)' }}>
          <div /><div>NAME</div><div>ROLE</div><div>PERMISSIONS</div><div>DEALS</div><div>YTD GCI</div><div>STATUS</div>
        </div>
        {TEAM_ROSTER.map((p,i)=>(
          <div key={p.id} style={{ display:'grid', gridTemplateColumns:'28px 1.2fr 1fr 120px 90px 140px 80px', gap: 8, padding:'8px 4px', alignItems:'center', borderBottom:'1px dashed var(--line)', fontSize: 12 }}>
            <Avatar p={p} size={22} />
            <div className="col">
              <span style={{ fontWeight: 600 }}>{p.name}</span>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>{p.id}@martinezgroup.co</span>
            </div>
            <span className="tiny">{p.role}</span>
            <RoleBadge role={p.cap} />
            <span className="tiny mono">{[11,5,2,'—','—','—'][i]}</span>
            <span className="tiny mono">{p.rev}</span>
            <Chip sm sage>active</Chip>
          </div>
        ))}
        <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 80px', gap: 8, padding:'8px 4px', alignItems:'center', opacity: 0.6 }}>
          <div style={{ width: 22, height: 22, borderRadius:'50%', border:'1px dashed var(--muted)' }} />
          <span className="tiny">3 seats · invite more at $29/seat/mo</span>
          <Btn sm ghost>+ invite</Btn>
        </div>
      </Box>

      {/* Role templates */}
      <Box style={{ width: 320 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>ROLE TEMPLATES</span>
        <div className="tiny muted">Pre-built permission sets · clone and customize</div>
        <div className="col" style={{ gap: 4, marginTop: 8 }}>
          {rolePresets.map(([r,d],i)=>(
            <div key={i} className="row between" style={{ padding: 7, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
              <div className="col">
                <span style={{ fontSize: 12, fontWeight: 600 }}>{r}</span>
                <span className="tiny muted" style={{ fontSize: 10 }}>{d}</span>
              </div>
              <Btn sm ghost>edit →</Btn>
            </div>
          ))}
        </div>
      </Box>
    </div>

    <Anno style={{ alignSelf:'flex-start' }}>↑ 6 pre-built role templates · custom when you need it · granular underneath</Anno>
  </Desktop>;
}


/* ============================================================
 * V3 · PERMISSIONS EDITOR (desktop)
 *   28 granular permissions grouped · per-role matrix
 * ============================================================ */
function Team3_Permissions() {
  const perms = [
    ['Contacts', [
      ['View all contacts',           [1,1,0,0,1]],
      ['Edit contacts',               [1,1,0,0,0]],
      ['Delete contacts',             [1,0,0,0,0]],
      ['Export list (CSV)',           [1,0,0,0,0]],
      ['See private notes',           [1,1,0,0,0]],
      ['See sphere / family tags',    [1,1,0,0,0]],
    ]],
    ['Deals + listings', [
      ['View all deals',              [1,0,1,0,0]],
      ['Edit assigned deals',         [1,1,1,0,0]],
      ['Reassign deals',              [1,0,0,0,0]],
      ['See offer amounts',           [1,1,1,0,0]],
      ['Access after close',          [1,0,1,0,0]],
    ]],
    ['Communications', [
      ['Send texts from team line',   [1,1,0,1,1]],
      ['Send emails from team line',  [1,1,1,1,1]],
      ['Drafts-only (needs approval)', [0,0,0,1,1]],
      ['Access Dana\'s inbox',         [1,0,0,0,0]],
    ]],
    ['Money', [
      ['See commissions',             [1,0,0,0,0]],
      ['See team P&L',                [1,0,0,0,0]],
      ['Edit deal splits',            [1,0,0,0,0]],
    ]],
    ['Content + marketing', [
      ['Publish live',                [1,1,0,1,0]],
      ['Create drafts',               [1,1,0,1,1]],
      ['Access brand kit',            [1,1,0,1,1]],
      ['Approve before send',         [1,0,0,0,0]],
    ]],
    ['Admin', [
      ['Invite people',               [1,0,0,0,0]],
      ['Billing + plan',              [1,0,0,0,0]],
      ['Integrations (MLS, Lofty)',   [1,0,0,0,0]],
      ['Delete team',                 [1,0,0,0,0]],
      ['Impersonate another user',    [1,0,0,0,0]],
      ['Audit log',                   [1,0,0,0,0]],
    ]],
  ];

  const roles = ['Owner','Agent','TC','VA','ISA'];

  return <Desktop active="Team" url="command.app/team/permissions">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Team · permissions matrix</div>
        <span className="serif" style={{ fontSize: 22 }}>What each role can do</span>
        <div className="tiny muted">Start from a template · toggle any cell · save as custom role.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>compare · template vs current</Btn>
        <Btn sm primary>save as custom</Btn>
      </div>
    </div>

    <Box>
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr repeat(5, 78px)', gap: 0, fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, letterSpacing:'0.1em', color:'var(--muted)' }}>
        <div style={{ padding:'8px 10px', background:'var(--paper-2)', borderBottom:'1px solid var(--line)' }}>PERMISSION</div>
        {roles.map(r=><div key={r} style={{ padding:'8px 10px', background:'var(--paper-2)', textAlign:'center', borderBottom:'1px solid var(--line)', borderLeft:'1px solid var(--line)' }}>{r.toUpperCase()}</div>)}

        {perms.map(([group, rows])=>(
          <React.Fragment key={group}>
            <div style={{ gridColumn:'span 6', padding:'10px 10px 4px', fontSize: 9, fontWeight: 600, letterSpacing:'0.15em', color:'var(--ink)', borderTop:'1px dashed var(--line)' }}>{group.toUpperCase()}</div>
            {rows.map(([label, vals],i)=>(
              <React.Fragment key={i}>
                <div style={{ padding:'6px 10px', fontFamily:"'Cormorant Garamond',serif", fontSize: 12, color:'var(--ink)' }}>{label}</div>
                {vals.map((v,j)=>(
                  <div key={j} style={{ padding:'6px 10px', textAlign:'center', borderLeft:'1px solid var(--line)' }}>
                    {v
                      ? <span style={{ color:'var(--accent-sage)', fontSize: 14 }}>✓</span>
                      : <span style={{ color:'var(--faint)', fontSize: 14 }}>·</span>}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
      </div>
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow" dashed>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Scope overrides</span>
        <div className="tiny" style={{ marginTop: 4 }}>Permissions can be narrowed per-deal. Example: Jordan has "Agent" role, but for 47 Oak only sees the showing calendar — not the offer or commission. Dana adds this on the deal itself.</div>
      </Box>
      <Box className="grow" dashed>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Time-boxed access</span>
        <div className="tiny" style={{ marginTop: 4 }}>Grant a contractor photographer view-only access to 3 deals, expires Friday 5pm. Audit log shows every view.</div>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V4 · LEAD ROUTING (desktop)
 *   Round-robin · skill-based · price-band · geo · fallbacks
 * ============================================================ */
function Team4_LeadRouting() {
  return <Desktop active="Team" url="command.app/team/routing">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Team · lead routing</div>
        <span className="serif" style={{ fontSize: 22 }}>Where new leads go</span>
        <div className="tiny muted">Rules run top-down · first match wins · fallbacks always.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>dry run · last 50 leads</Btn>
        <Btn sm primary>+ rule</Btn>
      </div>
    </div>

    <Box>
      <span className="hand-alt" style={{ fontSize: 14 }}>ACTIVE ROUTES · 7</span>
      <div className="col" style={{ gap: 6, marginTop: 8 }}>
        {[
          ['1','If <b>seller lead from home-value form</b>',            '→ Dana (always)',                   'instant · SMS',   'sage'],
          ['2','If <b>price &gt; $1M</b> OR zip in <b>85253/85255</b>', '→ Dana (always)',                   '5 min',            'sage'],
          ['3','If <b>buyer lead · $500k–$1M · Oak Park</b>',           '→ Maya · round-robin w/ Jordan',   '5 min',            'sage'],
          ['4','If <b>source = Zillow ad</b> AND ISA hours',            '→ Priya · ISA dials first',         'instant · call',  'tan'],
          ['5','If <b>expired · FSBO · not-my-listing</b>',             '→ Priya · qualifies → Dana',       '10 min',           'tan'],
          ['6','If <b>referral from past client</b>',                    '→ Dana (always, even after-hours)','10 min',           'sage'],
          ['7','<b>Fallback</b> (no rule matched)',                     '→ Dana · alert only',               '15 min',           'rose'],
        ].map(([n,cond,to,sla,c],i)=>(
          <div key={i} className="row" style={{ gap: 10, padding: 10, background:'#fff', border:'1px solid var(--line)', alignItems:'center' }}>
            <span className="mono" style={{ width: 18, fontSize: 13, color:'var(--muted)' }}>{n}</span>
            <div className="col" style={{ flex: 1.3 }}>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>WHEN</span>
              <span className="tiny" dangerouslySetInnerHTML={{__html: cond}} />
            </div>
            <div className="col" style={{ flex: 1 }}>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>ROUTE</span>
              <span className="tiny" style={{ fontWeight: 600 }}>{to}</span>
            </div>
            <div className="col" style={{ width: 110 }}>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>SLA</span>
              <Chip sm style={{ background: c==='rose'?'rgba(192,96,74,0.18)':c==='tan'?'rgba(185,151,130,0.3)':'rgba(139,154,123,0.22)', border:'none' }}>{sla}</Chip>
            </div>
            <Btn sm ghost>edit</Btn>
          </div>
        ))}
      </div>
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Round-robin state</span>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {[
            [TEAM_ROSTER[1], 'next up', 4, 'sage'],
            [TEAM_ROSTER[2], 'on deck', 3, 'tan'],
            [TEAM_ROSTER[0], 'skip · solo load', '—', null],
          ].map(([p,st,n,c],i)=>(
            <div key={i} className="row" style={{ gap: 8, padding: 6, background:'var(--paper-2)', alignItems:'center' }}>
              <Avatar p={p} size={24} />
              <span className="tiny" style={{ flex: 1 }}>{p.name}</span>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>{st}</span>
              <Chip sm>{n} wk</Chip>
            </div>
          ))}
        </div>
      </Box>
      <Box className="grow" tan>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ SLA tripwires</span>
        <ul className="tiny" style={{ margin:'4px 0 0 16px', lineHeight: 1.6 }}>
          <li>If lead not contacted in SLA · escalate to Dana + Slack alert.</li>
          <li>If contacted but no response in 24h · auto-add to "unanswered" drip.</li>
          <li>Weekly report · who hit SLA · who missed · why.</li>
          <li>After-hours (9pm–7am) · text-only · human follow at 7:30am.</li>
        </ul>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V5 · CO-LISTING (deal view · split + shared access)
 * ============================================================ */
function Team5_Colisting() {
  return <Desktop active="Team" url="command.app/deals/88-elm/co-listing">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← 88 Elm Ave · deal settings</div>
        <span className="serif" style={{ fontSize: 22 }}>Co-listing · split + roles</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>see on deal</Btn>
        <Btn sm primary>save</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* Participants */}
      <Box className="grow" style={{ flexBasis: 420 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>PARTICIPANTS</span>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {[
            [TEAM_ROSTER[0], 'Lead · listing',      '60%', ['MLS input','Seller-facing','Comms','Pricing','CMA','Negotiation']],
            [TEAM_ROSTER[2], 'Co-list · open houses', '20%', ['Open houses','Showings','Buyer feedback','Post-OH recap']],
            [TEAM_ROSTER[4], 'Marketing',            '—',   ['Photos coord','Content studio','Social · all channels','Print']],
            [TEAM_ROSTER[3], 'TC',                   '—',   ['Checklist','Vendor coord','Docs','Compliance','Closing']],
            [{ id:'outside', name:'Erin Walsh (Compass)', role:'Referral agent', init:'EW', color:'var(--faint)', cap:'agent' }, 'Referral', '20% of Dana\'s', ['No system access · 1099']],
          ].map(([p,role,split,scopes],i)=>(
            <div key={i} className="col" style={{ gap: 4, padding: 8, background:'#fff', border:'1px solid var(--line)' }}>
              <div className="row" style={{ gap: 8, alignItems:'center' }}>
                <Avatar p={p} size={28} />
                <div className="col" style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</span>
                  <span className="tiny muted">{role}</span>
                </div>
                <div className="col" style={{ alignItems:'flex-end' }}>
                  <span className="tiny mono muted" style={{ fontSize: 9 }}>GCI SPLIT</span>
                  <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{split}</span>
                </div>
              </div>
              <div className="row" style={{ gap: 3, flexWrap:'wrap', marginTop: 4 }}>
                {scopes.map((s,j)=><Chip key={j} sm style={{ fontSize: 9, padding:'1px 5px' }}>{s}</Chip>)}
              </div>
            </div>
          ))}
          <Btn sm dashed>+ add participant</Btn>
        </div>
      </Box>

      {/* GCI waterfall preview */}
      <Box style={{ width: 320 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>GCI WATERFALL · preview</span>
        <div className="tiny muted">Sell at list $825K · 2.5% listing side · $20,625 GCI</div>
        <div className="col" style={{ gap: 4, marginTop: 10 }}>
          {[
            ['Gross commission',    '$20,625', 1.0,  'var(--accent-tan)'],
            ['− Referral · Erin (20%)', '−$4,125', 0.2,  'var(--faint)'],
            ['Net to team',         '$16,500', 0.8,  'var(--accent-sage)'],
            ['→ Dana (60%)',         '$9,900',  0.48, 'var(--accent-tan)'],
            ['→ Jordan (20%)',       '$3,300',  0.16, 'var(--accent-sage)'],
            ['→ Brokerage cap',     '$3,300',  0.16, 'var(--ink)'],
          ].map(([l,v,w,c],i)=>(
            <div key={i} className="col" style={{ gap: 2 }}>
              <div className="row between">
                <span className="tiny">{l}</span>
                <span className="tiny mono" style={{ fontWeight: 600 }}>{v}</span>
              </div>
              <div style={{ height: 5, background:'var(--paper-2)', overflow:'hidden' }}>
                <div style={{ width: (w*100)+'%', height:'100%', background: c }} />
              </div>
            </div>
          ))}
        </div>
        <Hr />
        <div className="tiny muted">Updates live as split % changes · pushed to Money on close.</div>
      </Box>
    </div>

    <Anno style={{ alignSelf:'flex-end' }}>↑ co-listing is first-class: split, scopes, waterfall, outside agents</Anno>
  </Desktop>;
}


/* ============================================================
 * V6 · DELEGATION INBOX
 *   Dana delegates tasks · approval-queue for VA drafts
 * ============================================================ */
function Team6_Delegation() {
  return <Desktop active="Team" url="command.app/team/delegation">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Delegation inbox</div>
        <span className="serif" style={{ fontSize: 22 }}>What's waiting on Dana</span>
        <div className="tiny muted">12 items · usually &lt; 3 min each</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>approve-all safe items (5)</Btn>
        <Btn sm ghost>mute 48h</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10, flexWrap:'wrap' }}>
      {[['All',12,true],['Drafts to approve',6],['Offers to sign',2],['Vendor approvals',2],['Client replies',2]].map(([l,n,a],i)=>(
        <Chip key={i} sm filled={a} style={a?{background:'var(--accent-tan)',color:'var(--paper)'}:{}}>{l} · {n}</Chip>
      ))}
    </div>

    <Box>
      <div className="col" style={{ gap: 0 }}>
        {[
          { who: TEAM_ROSTER[4], kind:'DRAFT',   title:'IG carousel · "5 kitchens that add $18k"', sub:'reviewed OK · compliance clean · ready to queue Fri 10a', color:'var(--accent-sage)', actions:['approve','edit','reject'] },
          { who: TEAM_ROSTER[4], kind:'DRAFT',   title:'Email · weekly nurture · Oak Park market', sub:'tone check: warm · 1 factual claim flagged — verify $689k median', color:'var(--warn)', actions:['approve','edit','reject'] },
          { who: TEAM_ROSTER[5], kind:'LEAD',    title:'ISA qualified · Ben K. — $650k budget · 90d',sub:'Priya talked 6min · notes: wants Tempe schools, has agent-friend hesitation', color:'var(--accent-tan)', actions:['call','take over','decline'] },
          { who: TEAM_ROSTER[3], kind:'VENDOR',  title:'Inspector $650 · outside normal budget',    sub:'Alex · 2022 Oak has knob+tube flags · specialty inspector · deal 188 Maple', color:'var(--warn)', actions:['approve','alt vendor','deny'] },
          { who: TEAM_ROSTER[1], kind:'OFFER',   title:'Counter at $815k · 88 Elm · needs Dana sig', sub:'Maya drafted · $5k credit · close 45d · inspection objection', color:'var(--accent-rose)', actions:['sign','edit','call me'] },
          { who: TEAM_ROSTER[5], kind:'CLIENT',  title:'Reply draft · Chen family · pricing pushback', sub:'Priya drafted · calm + facts · 3 comps included · waiting on you', color:'var(--accent-sage)', actions:['send','edit','send call me'] },
          { who: TEAM_ROSTER[4], kind:'DRAFT',   title:'Blog · "Oak Park vs Tempe" · 820 words',    sub:'SEO ✓ · H2s clean · quotes from your voice bank', color:'var(--accent-sage)', actions:['publish','edit','reject'] },
        ].map((it,i)=>(
          <div key={i} className="row" style={{ gap: 10, padding: 10, borderBottom:'1px dashed var(--line)', alignItems:'flex-start' }}>
            <input type="checkbox" />
            <Avatar p={it.who} size={26} />
            <div className="col" style={{ flex: 1 }}>
              <div className="row" style={{ gap: 6, alignItems:'center' }}>
                <span className="tiny mono" style={{ background: it.color, color:'var(--paper)', padding:'1px 5px', fontSize: 9 }}>{it.kind}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{it.title}</span>
              </div>
              <span className="tiny muted" style={{ marginTop: 2 }}>{it.sub}</span>
              <span className="tiny mono muted" style={{ fontSize: 9, marginTop: 2 }}>from {it.who.name}</span>
            </div>
            <div className="row" style={{ gap: 4 }}>
              {it.actions.map((a,j)=><Btn key={j} sm primary={j===0} ghost={j>0}>{a}</Btn>)}
            </div>
          </div>
        ))}
      </div>
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow" tan>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Auto-approve rules</span>
        <ul className="tiny" style={{ margin:'4px 0 0 16px', lineHeight: 1.6 }}>
          <li>Sam's carousel drafts with compliance ✓ · voice score &gt; 85 → auto-publish.</li>
          <li>Inspector/vendor spend &lt; $500 from vetted list → auto-approve.</li>
          <li>Counter offers within $5k of list → still need Dana sig.</li>
          <li>Client replies from past-client tag → auto-send after 5 min review grace.</li>
        </ul>
      </Box>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Dana's time saved</span>
        <div className="row" style={{ gap: 10, marginTop: 8 }}>
          {[['drafts approved · wk','24'],['avg review time','2:14'],['auto-approved','9'],['hours saved','6.2']].map(([l,v],i)=>(
            <div key={i} className="col grow" style={{ padding: 8, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
              <span className="tiny mono muted">{l}</span>
              <span className="serif" style={{ fontSize: 22 }}>{v}</span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V7 · TC WORKSPACE (transaction coordinator)
 * ============================================================ */
function Team7_TCWorkspace() {
  return <Desktop active="Team" url="command.app/tc/workspace">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">Alex Rivera · TC dashboard</div>
        <span className="serif" style={{ fontSize: 22 }}>11 deals · 6 urgent this week</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>by agent</Btn>
        <Btn sm>by stage</Btn>
        <Btn sm primary>health view</Btn>
      </div>
    </div>

    <Box>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 0 }}>
        {['Under contract','Inspection','Appraisal','Financing','Clear-to-close','Closing this wk'].map((s,i)=>(
          <div key={i} style={{ padding:'8px 6px', background: i===5?'var(--accent-sage)':'var(--paper-2)', color: i===5?'var(--paper)':'var(--ink)', textAlign:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize: 10, letterSpacing:'0.1em', borderRight: i<5?'1px solid var(--line)':'none' }}>
            {s.toUpperCase()} · {[3,2,2,1,1,2][i]}
          </div>
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 6, padding: 8 }}>
        {[
          ['47 Oak','Dana','Chen','Apr 22 OH','ok'],
          ['88 Elm','Dana','Ortiz','3d UC','ok'],
          ['12 Rose','Maya','Lee','day 9','warn'],
          ['188 Mpl','Jordan','Brown','ins. ordered','ok'],
          ['21 Pine','Dana','Kwan','apprais.','warn'],
          ['9 Cedar','Dana','Ngu','app · 14d','ok'],
          ['34 Birch','Maya','Diaz','app · 21d','ok'],
          ['55 Fig','Dana','Mills','CTC','sage'],
          ['77 Ash','Maya','Kowalski','close Thu','sage'],
          ['102 Lark','Dana','Pope','close Fri','sage'],
        ].map(([addr,ag,client,stage,c],i)=>(
          <div key={i} className="col" style={{ gap: 2, padding: 7, background:'#fff', border:`1px solid ${c==='warn'?'var(--warn)':c==='sage'?'var(--accent-sage)':'var(--line)'}`, borderLeftWidth: c?'3px':'1px' }}>
            <div className="row between">
              <span className="tiny" style={{ fontSize: 10, fontWeight: 600 }}>{addr}</span>
              <span className="tiny mono muted" style={{ fontSize: 9 }}>{ag}</span>
            </div>
            <span className="tiny muted" style={{ fontSize: 9 }}>{client} fam.</span>
            <span className="tiny mono" style={{ fontSize: 9, color: c==='warn'?'var(--warn)':c==='sage'?'var(--accent-sage)':'var(--muted)' }}>{stage}</span>
          </div>
        ))}
      </div>
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Today · Alex's checklist</span>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {[
            ['☐','12 Rose · inspection response due 5pm','warn'],
            ['☐','21 Pine · appraisal report arrived · review w/ Dana',''],
            ['☑','47 Oak · seller disclosures delivered','sage'],
            ['☐','9 Cedar · HOA docs request','',],
            ['☐','102 Lark · final walkthrough Fri 3pm','',],
            ['☐','77 Ash · wire verification call · Thu 9am','warn'],
            ['☑','34 Birch · appraisal ordered','sage'],
          ].map(([c,t,cl],i)=>(
            <div key={i} className="row" style={{ gap: 6, fontSize: 12, color: cl==='warn'?'var(--warn)':cl==='sage'?'var(--accent-sage)':'var(--ink)' }}>
              <span>{c}</span><span>{t}</span>
            </div>
          ))}
        </div>
      </Box>
      <Box style={{ width: 280 }}>
        <span className="hand-alt" style={{ fontSize: 14 }}>HANDOFF RULES</span>
        <div className="tiny muted">Agent → TC the second a deal goes UC</div>
        <ul className="tiny" style={{ margin:'6px 0 0 16px', lineHeight: 1.7 }}>
          <li>All docs mirror auto · Transact webhook.</li>
          <li>TC owns the checklist · agent keeps comms w/ client.</li>
          <li>TC flags anything off · agent gets Slack ping.</li>
          <li>48-hr rule: if something's stuck &gt; 48hr, alert agent + Dana.</li>
          <li>Close: TC triggers commission doc + post-close flow.</li>
        </ul>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V8 · TEAM ANALYTICS (leaderboard · fair · activity-weighted)
 * ============================================================ */
function Team8_Analytics() {
  return <Desktop active="Team" url="command.app/team/analytics">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Team · analytics · Q2</div>
        <span className="serif" style={{ fontSize: 22 }}>How the team's performing</span>
        <div className="tiny muted">Not a shame-leaderboard. Activity-weighted. Coaching-ready.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm filled>this quarter</Chip>
        <Chip sm>rolling 90d</Chip>
        <Chip sm>YTD</Chip>
      </div>
    </div>

    <div className="row" style={{ gap: 12 }}>
      {[
        ['Team GCI',         '$412k', '+18% QoQ', 'sage'],
        ['Deals closed',     '14',    '3 pending', 'tan'],
        ['Avg DOM',           '22d',   '−6d vs Q1', 'sage'],
        ['Team NPS',          '72',    '+8',        'sage'],
        ['SLA compliance',    '94%',   '−2',        'warn'],
      ].map(([l,v,d,c],i)=>(
        <Box key={i} className="grow" style={{ padding: 10 }}>
          <span className="tiny mono muted">{l}</span>
          <div className="serif" style={{ fontSize: 24, lineHeight: 1 }}>{v}</div>
          <span className="tiny mono" style={{ color: c==='sage'?'var(--accent-sage)':c==='warn'?'var(--warn)':'var(--accent-tan)' }}>{d}</span>
        </Box>
      ))}
    </div>

    <Box>
      <div className="row between">
        <span className="hand-alt" style={{ fontSize: 14 }}>AGENT SCORECARD</span>
        <span className="tiny muted">sorted by conversion · not volume</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'28px 1.2fr 80px 80px 80px 80px 80px 90px', gap: 8, padding:'8px 4px', fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, letterSpacing:'0.1em', color:'var(--muted)', borderBottom:'1px solid var(--line)' }}>
        <div /><div>AGENT</div><div>LEADS</div><div>QUALIF</div><div>APPTS</div><div>CLOSED</div><div>CONV %</div><div>GCI</div>
      </div>
      {[
        [TEAM_ROSTER[0], 84, 42, 22, 9, 10.7, '$286k', 10.7],
        [TEAM_ROSTER[1], 52, 28, 14, 5, 9.6,  '$128k', 9.6],
        [TEAM_ROSTER[2], 31, 18, 9,  2, 6.5,  '$62k',  6.5],
      ].map(([p,...d],i)=>(
        <div key={i} style={{ display:'grid', gridTemplateColumns:'28px 1.2fr 80px 80px 80px 80px 80px 90px', gap: 8, padding:'8px 4px', alignItems:'center', borderBottom:'1px dashed var(--line)' }}>
          <Avatar p={p} size={22} />
          <span className="tiny" style={{ fontWeight: 600 }}>{p.name}</span>
          <span className="mono tiny">{d[0]}</span>
          <span className="mono tiny">{d[1]}</span>
          <span className="mono tiny">{d[2]}</span>
          <span className="mono tiny">{d[3]}</span>
          <div className="row" style={{ gap: 4, alignItems:'center' }}>
            <span className="mono tiny">{d[4]}%</span>
            <div style={{ flex: 1, height: 4, background:'var(--line)' }}>
              <div style={{ width: (d[4]*8)+'%', height:'100%', background: p.color }} />
            </div>
          </div>
          <span className="mono tiny" style={{ fontWeight: 600 }}>{d[5]}</span>
        </div>
      ))}
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow" tan>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ AI coaching insight</span>
        <ul className="tiny" style={{ margin:'4px 0 0 16px', lineHeight: 1.7 }}>
          <li>Maya's conversion drops at qualif → appt (33%). Listen to 3 calls this week · Mentor will flag patterns.</li>
          <li>Jordan's lead-to-qualif is strong (58%) · scale by giving more leads.</li>
          <li>Team SLA dipped 2pts · Priya's ISA calls slipped Thu 4–6p (school pickup). Shift or add backup.</li>
        </ul>
      </Box>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Load balance recommendation</span>
        <div className="tiny" style={{ marginTop: 4 }}>Maya at 52 leads/Q · 14 appts. Jordan at 31/9. Shift 8 leads from Maya's backlog to Jordan next Mon. Projected: +2 Jordan appts, Maya freed for top-20 re-engage.</div>
        <Btn sm primary style={{ marginTop: 8 }}>preview shift →</Btn>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V9 · ACTIVITY FEED + AUDIT LOG
 *   Who did what, when, to what · searchable
 * ============================================================ */
function Team9_Audit() {
  return <Desktop active="Team" url="command.app/team/audit">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Team · activity + audit</div>
        <span className="serif" style={{ fontSize: 22 }}>Every action · every person</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>all</Chip>
        <Chip sm filled>admin changes</Chip>
        <Chip sm>client-facing</Chip>
        <Chip sm>data access</Chip>
        <Btn sm>export CSV</Btn>
      </div>
    </div>

    <Box>
      <div className="col" style={{ gap: 0 }}>
        {[
          ['9:42a', TEAM_ROSTER[0], 'approved',    'Sam\'s IG carousel "5 kitchens" · queued Fri 10a',       'content',   'sage'],
          ['9:38a', TEAM_ROSTER[3], 'uploaded',    '3 inspection docs to 188 Maple deal',                   'document',  ''],
          ['9:31a', TEAM_ROSTER[1], 'sent email',  'Chen family · counter rationale · via team line',       'client',    ''],
          ['9:22a', TEAM_ROSTER[5], 'called',      'Ben K. (new Zillow lead) · 6m42s · qualified',          'client',    'tan'],
          ['9:18a', TEAM_ROSTER[0], 'changed role','Jordan Park · Showing agent → Agent (co-list scope)',   'admin',     'rose'],
          ['9:10a', TEAM_ROSTER[4], 'edited',      'Brand kit · added 2 fonts · Cormorant, Plex Mono',       'brand',     ''],
          ['8:47a', TEAM_ROSTER[2], 'reassigned',  '12 Rose showing · Jordan → Maya (client preference)',   'deal',      ''],
          ['8:30a', TEAM_ROSTER[0], 'signed in',   'from 192.0.2.4 · Phoenix, AZ · iPhone',                 'session',   ''],
          ['8:12a', TEAM_ROSTER[3], 'opened',      'commission statement · 47 Oak · read-only (permitted)', 'money',     ''],
          ['Yday',  TEAM_ROSTER[0], 'granted',     'Erin Walsh (external) · view 88 Elm · expires Fri 5p',  'admin',     'rose'],
        ].map(([t,p,verb,what,kind,c],i)=>(
          <div key={i} className="row" style={{ gap: 10, padding:'8px 4px', borderBottom:'1px dashed var(--line)', alignItems:'center' }}>
            <span className="tiny mono muted" style={{ width: 40, fontSize: 9 }}>{t}</span>
            <Avatar p={p} size={22} />
            <span className="tiny" style={{ fontWeight: 600, width: 100 }}>{p.name.split(' ')[0]}</span>
            <span className="tiny mono" style={{ width: 80, fontSize: 10, color:'var(--muted)' }}>{verb}</span>
            <span className="tiny" style={{ flex: 1 }}>{what}</span>
            <Chip sm style={c==='rose'?{background:'rgba(192,96,74,0.18)', border:'none'}:c==='sage'?{background:'rgba(139,154,123,0.22)',border:'none'}:c==='tan'?{background:'rgba(185,151,130,0.3)',border:'none'}:{}}>{kind}</Chip>
          </div>
        ))}
      </div>
    </Box>

    <div className="row" style={{ gap: 14 }}>
      <Box className="grow" dashed>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Audit retention</span>
        <div className="tiny" style={{ marginTop: 4 }}>90 days searchable · 7 years archived · SOC2-ready. Required for brokerage reviews + dispute resolution.</div>
      </Box>
      <Box className="grow" dashed>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ Anomaly alerts</span>
        <div className="tiny" style={{ marginTop: 4 }}>Sign-in from new location · bulk export · money changes · external grants · impersonation. Dana gets Slack ping.</div>
      </Box>
    </div>
  </Desktop>;
}


/* ============================================================
 * V10 · MOBILE — ASSIGN + SEE TEAM ON THE GO
 * ============================================================ */
function Team10_Mobile() {
  return <div className="row" style={{ gap: 20, alignItems:'flex-start' }}>
    <Phone title="Team · Jordan">
      <div style={{ padding: 14 }}>
        <div className="hand-neat tiny muted">Team · today</div>
        <span className="serif" style={{ fontSize: 20 }}>Who's on now</span>

        <div className="col" style={{ gap: 6, marginTop: 12 }}>
          {TEAM_ROSTER.slice(0,5).map((p,i)=>(
            <div key={i} className="row" style={{ gap: 10, padding: 10, background:'var(--paper-2)', border:'1px solid var(--line)', alignItems:'center' }}>
              <div style={{ position:'relative' }}>
                <Avatar p={p} size={34} />
                <div style={{ position:'absolute', right: -1, bottom: -1, width: 10, height: 10, borderRadius:'50%', background: i<3?'var(--accent-sage)':'var(--warn)', border:'2px solid var(--paper)' }} />
              </div>
              <div className="col" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                <span className="tiny muted">{['showing at 47 Oak','driving → 12 Rose','desk · drafts','inspection call','calling leads'][i]}</span>
              </div>
              <Btn sm ghost>ping</Btn>
            </div>
          ))}
        </div>

        <Hr />

        <div className="hand-alt tiny">✦ Delegation inbox</div>
        <Box style={{ padding: 10, marginTop: 6 }}>
          <div className="row between">
            <span className="tiny" style={{ fontWeight: 600 }}>12 items waiting</span>
            <Chip sm>3 urgent</Chip>
          </div>
          <div className="tiny muted" style={{ marginTop: 3 }}>6 drafts · 2 offers · 2 vendors · 2 client replies</div>
          <Btn sm primary block style={{ marginTop: 8 }}>review inbox →</Btn>
        </Box>

        <Hr />

        <div className="hand-alt tiny">✦ Quick reassign</div>
        <Box dashed style={{ padding: 10, marginTop: 6 }}>
          <div className="tiny">12 Rose Saturday OH · currently <b>Jordan</b></div>
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            <Btn sm>→ Maya</Btn>
            <Btn sm>→ Sam</Btn>
            <Btn sm ghost>keep</Btn>
          </div>
        </Box>
      </div>
    </Phone>

    <Phone title="Team · load alert">
      <div style={{ padding: 14 }}>
        <div className="hand-neat tiny muted">Alert · 11:42a</div>
        <Box style={{ padding: 14, marginTop: 10, background:'rgba(192,96,74,0.12)', border:'1px solid var(--accent-rose)' }}>
          <div className="hand-alt" style={{ fontSize: 16 }}>⚠ Maya at capacity</div>
          <div className="tiny" style={{ marginTop: 4 }}>4 showings + 3 drafts due · 9 unanswered leads · projected to miss 2 SLAs today.</div>
        </Box>

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>RECOMMENDED SHIFT</div>
        <Box tan style={{ padding: 10, marginTop: 4 }}>
          <div className="tiny">Move 3 leads (Greg W., Priya S., Marcus L.) from Maya → Jordan.</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Jordan's load: 3 → 6. Still under his cap of 10.</div>
          <div className="row" style={{ gap: 4, marginTop: 8 }}>
            <Btn sm primary>do it</Btn>
            <Btn sm>adjust</Btn>
            <Btn sm ghost>dismiss</Btn>
          </div>
        </Box>

        <Hr />

        <div className="hand-alt tiny">MAYA'S DAY · live</div>
        <div className="col" style={{ gap: 3, marginTop: 6 }}>
          {[['10:30a','showing · 47 Oak','done'],
            ['11:30a','showing · 12 Rose','now'],
            ['12:45p','showing · 188 Maple',''],
            ['2:00p','lunch · Chen buyers',''],
            ['3:30p','showing · 21 Pine',''],
            ['5:00p','drafts review · 3',''],
          ].map(([t,what,st],i)=>(
            <div key={i} className="row" style={{ gap: 6, padding:'4px 0', borderBottom:'1px dashed var(--line)' }}>
              <span className="tiny mono" style={{ width: 54, color:'var(--muted)' }}>{t}</span>
              <span className="tiny" style={{ flex: 1, fontWeight: st==='now'?600:400 }}>{what}</span>
              {st==='now' && <Chip sm sage style={{ fontSize: 8 }}>NOW</Chip>}
              {st==='done' && <span className="tiny mono muted" style={{ fontSize: 9 }}>✓</span>}
            </div>
          ))}
        </div>
      </div>
    </Phone>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">On the go</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Team visibility · quick reassign · load alerts · approve drafts from the car. Dana runs the team even between showings.</p>
    </div>
  </div>;
}


/* ============================================================
 * Register
 * ============================================================ */
window.TeamScreens = [
  { id:'team1',  label:'V1 · Team dashboard',           caption:'One screen. Who\'s on. Capacity heatmap. Team pipeline. Today\'s bottleneck surfaced.', Component: Team1_Dashboard },
  { id:'team2',  label:'V2 · Roster + role templates',  caption:'6 pre-built roles (Agent, TC, VA, ISA, Showing-only). Invite · seat pricing · import.',  Component: Team2_Roster },
  { id:'team3',  label:'V3 · Permissions matrix',        caption:'28 granular permissions · 6 groups · scope overrides per-deal · time-boxed access.',     Component: Team3_Permissions },
  { id:'team4',  label:'V4 · Lead routing',              caption:'7 rules · round-robin state · SLA tripwires · dry-run against last 50 leads.',           Component: Team4_LeadRouting },
  { id:'team5',  label:'V5 · Co-listing · split + roles',caption:'First-class: 5 participants, scoped access, GCI waterfall preview with referral.',       Component: Team5_Colisting },
  { id:'team6',  label:'V6 · Delegation inbox',          caption:'12 items waiting on Dana · 7 types · auto-approve rules · time saved metric.',           Component: Team6_Delegation },
  { id:'team7',  label:'V7 · TC workspace',              caption:'Alex\'s view · 11 deals in pipeline · today\'s checklist · handoff rules.',               Component: Team7_TCWorkspace },
  { id:'team8',  label:'V8 · Team analytics',             caption:'Activity-weighted · funnel conversion · AI coaching · load-balance recommendations.',    Component: Team8_Analytics },
  { id:'team9',  label:'V9 · Audit + activity log',      caption:'Every action searchable · 90-day retention · SOC2-ready · anomaly alerts.',              Component: Team9_Audit },
  { id:'team10', label:'V10 · Mobile · team on the go',  caption:'Who\'s on · delegation inbox · quick reassign · load-alert push.',                        Component: Team10_Mobile },
];

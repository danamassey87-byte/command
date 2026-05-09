// ============================================================
// Command — Remaining Wireframes (Properties, Money, Checklists,
// Mentor, Weekly Update, Agreements, Vendors, Calendar,
// Social Competitor, Content v2)
// ============================================================

// ========== PROPERTIES (mandatory linkage) ==================
function PropV1_Directory() {
  const rows = [
    { addr:'42 Oak St', link:'Seller · Chen Family', status:'Active', list:'$895k', dom:12, tag:'sage' },
    { addr:'88 Elm Ave', link:'Seller · Marcus Reid', status:'Coming Soon', list:'$1.2M', dom:0, tag:'tan' },
    { addr:'1428 Magnolia', link:'Prospect · Rivera lead', status:'Potential', list:'—', dom:0, tag:'rose' },
    { addr:'9 Juniper Ct', link:'Buyer · Kim Pair', status:'Showing Mon', list:'$780k', dom:34, tag:'' },
    { addr:'220 Birch', link:'Open House Sat 2–4', status:'OH Scheduled', list:'$650k', dom:8, tag:'sage' },
    { addr:'777 Cedar', link:'Buyer · Haleigh + Tom', status:'Under Contract', list:'$1.05M', dom:21, tag:'tan' },
  ];
  return <Desktop active="Properties" url="command.app/properties">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Properties <span className="tiny muted">· 24 tracked</span></span>
      <div className="row" style={{ gap: 6 }}>
        <Input placeholder="search address…" style={{ width: 220 }} />
        <Btn sm>filter: all</Btn>
        <Btn sm primary>+ new property</Btn>
      </div>
    </div>
    <Box dashed style={{ background: 'var(--paper-2)' }}>
      <div className="row between center">
        <span className="tiny">⚠ <b>Every property requires a link.</b> Buyer · Seller · Prospect · Open House.</span>
        <span className="tiny muted">3 unlinked · needs attention</span>
      </div>
    </Box>
    <Box style={{ padding: 0 }}>
      <table className="wf-table">
        <thead><tr><th>Address</th><th>Linked to</th><th>Status</th><th>List $</th><th>DOM</th><th></th></tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{r.addr}</td>
              <td><Chip sm className={r.tag}>{r.link}</Chip></td>
              <td>{r.status}</td>
              <td className="mono">{r.list}</td>
              <td className="mono">{r.dom}</td>
              <td><Btn sm ghost>open →</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  </Desktop>;
}

function PropV2_NewWithLink() {
  return <Desktop active="Properties" url="command.app/properties/new">
    <span className="serif" style={{ fontSize: 22 }}>New property</span>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Address</div>
        <Input placeholder="123 Main St, Oak Park" />
        <Hr />
        <div className="hand-alt" style={{ color: 'var(--accent-rose)' }}>Link to · required ★</div>
        <div className="tiny muted">Property cannot exist without a connection.</div>
        <div className="row wrap" style={{ gap: 6, marginTop: 6 }}>
          <Chip tan>🏠 Seller</Chip>
          <Chip>👥 Buyer</Chip>
          <Chip>✧ Prospect</Chip>
          <Chip sage>🎪 Open House</Chip>
        </div>
        <Input placeholder="search clients to link… Chen Family" style={{ marginTop: 8 }} />
        <Hr />
        <div className="row" style={{ gap: 6 }}>
          <Input placeholder="list $" />
          <Input placeholder="beds" />
          <Input placeholder="baths" />
          <Input placeholder="sqft" />
        </div>
      </Box>
      <Box style={{ width: 320, flexShrink: 0 }}>
        <div className="hand-alt">What we're doing for this property</div>
        <div className="tiny muted">Toggle on/off. Each item tracks cost + dates.</div>
        <Hr />
        {['Pro photography','Drone / aerial','Cinematic video','Staging','Sign install','Lockbox install','Open house signs','Door jambs / flyers','Property website','Social launch kit','Just-listed mail'].map((x,i)=>
          <Check key={x} checked={i<6}>{x}</Check>
        )}
      </Box>
    </div>
  </Desktop>;
}

function PropV3_PropertyDetail() {
  return <Desktop active="Properties" url="command.app/properties/42-oak">
    <div className="row between center">
      <div>
        <div className="hand-neat muted tiny">← Properties</div>
        <div className="serif" style={{ fontSize: 26 }}>42 Oak St <span className="tiny muted">· $895,000 · 12 DOM</span></div>
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          <Chip tan>Seller · Chen Family</Chip>
          <Chip>Agreement 04/01 → 10/01</Chip>
          <Chip sage>Active MLS</Chip>
        </div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>📸 assets</Btn>
        <Btn sm>💵 money</Btn>
        <Btn sm primary>✦ weekly email →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Price history</div>
        <Hr />
        <table className="wf-table">
          <thead><tr><th>Date</th><th>Event</th><th>Price</th><th>Δ</th></tr></thead>
          <tbody>
            <tr><td className="mono">04/01/26</td><td>Listed</td><td className="mono">$925,000</td><td></td></tr>
            <tr><td className="mono">04/10/26</td><td>Price drop</td><td className="mono">$895,000</td><td className="mono" style={{ color:'var(--accent-rose)' }}>−3.2%</td></tr>
          </tbody>
        </table>
        <Hr />
        <div className="row between center">
          <span>DOM: <b className="mono">12</b></span>
          <span className="tiny muted">area avg: 34 · you're <span style={{ color:'var(--accent-sage)' }}>22 below</span></span>
        </div>
      </Box>
      <Box style={{ width: 300 }}>
        <div className="hand-alt">Services · live</div>
        <Hr />
        {[
          ['Staging','$2,400','install 04/02','removes 07/01','sage'],
          ['Sign install','$185','04/01','—','tan'],
          ['Lockbox','$95','04/01','—',''],
          ['Photography','$650','04/01 done','—','sage'],
          ['Drone','$400','04/02 done','—','sage'],
        ].map(([s,c,d1,d2,t])=>(
          <div key={s} className="row between center" style={{ padding: '4px 0', borderBottom: '1px dashed var(--line)' }}>
            <div>
              <Chip sm className={t}>{s}</Chip>
              <div className="tiny muted">{d1} · {d2}</div>
            </div>
            <div className="mono tiny">{c}</div>
          </div>
        ))}
        <div className="row between" style={{ marginTop: 6 }}>
          <span className="tiny">Total spent</span>
          <span className="mono" style={{ fontWeight: 600 }}>$3,730</span>
        </div>
      </Box>
    </div>
    <Box>
      <div className="row between center">
        <div className="hand-alt">Performance · 7-day</div>
        <span className="tiny muted">from Zillow · realtor.com · MLS · FB · IG · site</span>
      </div>
      <Hr />
      <div className="row" style={{ gap: 18, flexWrap:'wrap' }}>
        <Stat n="1,284" l="total views" />
        <Stat n="92" l="realtor.com saves" />
        <Stat n="18" l="zillow saves" />
        <Stat n="6" l="showings" />
        <Stat n="2" l="OHs held" />
        <Stat n="14" l="feedback notes" />
        <Stat n="$2.9k" l="ad spend" />
      </div>
    </Box>
  </Desktop>;
}

window.PropertyScreens = [
  { id:'pr1', label:'V1 · Directory', caption:'Linked-only rule visible. Filter, search, bulk.', Component: PropV1_Directory },
  { id:'pr2', label:'V2 · New + required link', caption:'Can\'t save without buyer/seller/prospect/OH. Services toggles.', Component: PropV2_NewWithLink },
  { id:'pr3', label:'V3 · Property detail', caption:'Price history, DOM vs area, services w/ dates + costs, perf.', Component: PropV3_PropertyDetail },
];

// ========== MONEY / EXPENSES / GCI ==========================
function MoneyV1_Dashboard() {
  return <Desktop active="Money" url="command.app/money">
    <span className="serif" style={{ fontSize: 22 }}>Money</span>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Brokerage cap</div>
        <Hr />
        <div className="row between" style={{ marginBottom: 4 }}>
          <span className="mono">$18,400 of $24,000</span>
          <span className="tiny muted">77%</span>
        </div>
        <Bar pct={77} color="var(--accent-sage)" />
        <div className="tiny" style={{ marginTop: 6 }}>2 more deals to cap · est. May 18</div>
      </Box>
      <Box className="grow">
        <div className="hand-alt">Pipeline GCI</div>
        <Hr />
        <div className="serif" style={{ fontSize: 28 }}>$94,200</div>
        <div className="tiny muted">6 deals · $18,840 to cap · $75,360 net</div>
      </Box>
      <Box className="grow">
        <div className="hand-alt">YTD closed</div>
        <Hr />
        <div className="serif" style={{ fontSize: 28 }}>$147,800</div>
        <div className="tiny muted">9 deals · avg $16,422 · +22% vs '25</div>
      </Box>
    </div>
    <Box>
      <div className="row between center">
        <div className="hand-alt">Expenses — month</div>
        <Btn sm>+ log expense</Btn>
      </div>
      <Hr />
      <table className="wf-table">
        <thead><tr><th>Date</th><th>Category</th><th>Vendor</th><th>Client / property</th><th>$</th><th>Tracked</th></tr></thead>
        <tbody>
          <tr><td className="mono">04/14</td><td>Photography</td><td>Jake @ Bright</td><td>42 Oak · Chen</td><td className="mono">$650</td><td><Chip sm sage>→ Oak</Chip></td></tr>
          <tr><td className="mono">04/14</td><td>Drone</td><td>Skyline</td><td>42 Oak · Chen</td><td className="mono">$400</td><td><Chip sm sage>→ Oak</Chip></td></tr>
          <tr><td className="mono">04/12</td><td>Envelopes · #10</td><td>Staples</td><td>(inventory)</td><td className="mono">$251</td><td><Chip sm>240 @ $1.05 ea</Chip></td></tr>
          <tr><td className="mono">04/12</td><td>Stamps · forever</td><td>USPS</td><td>(inventory)</td><td className="mono">$37</td><td><Chip sm>50 @ $0.73 ea</Chip></td></tr>
          <tr><td className="mono">04/11</td><td>Lockboxes · bulk</td><td>SentriLock</td><td>(inventory)</td><td className="mono">$1,140</td><td><Chip sm>12 boxes · $95 ea</Chip></td></tr>
          <tr><td className="mono">04/09</td><td>Expired mail</td><td>Wise Pelican</td><td>Campaign Apr-01</td><td className="mono">$342</td><td><Chip sm tan>47 pieces</Chip></td></tr>
          <tr><td className="mono">04/08</td><td>Open house signs</td><td>SignsOnTime</td><td>(inventory)</td><td className="mono">$220</td><td><Chip sm>8 signs</Chip></td></tr>
        </tbody>
      </table>
    </Box>
  </Desktop>;
}

function MoneyV2_PerDeal() {
  return <Desktop active="Money" url="command.app/money/deal/42-oak">
    <div className="hand-neat tiny muted">← Money · 42 Oak St</div>
    <span className="serif" style={{ fontSize: 22 }}>42 Oak St · commission & costs</span>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Projected close</div>
        <Hr />
        <table className="wf-table">
          <tbody>
            <tr><td>Sale price (est.)</td><td className="mono">$895,000</td></tr>
            <tr><td>Your side commission</td><td className="mono">2.5% = $22,375</td></tr>
            <tr><td>Split to brokerage (23%)</td><td className="mono">−$5,146</td></tr>
            <tr><td>TC fee</td><td className="mono">−$495</td></tr>
            <tr><td>E&O + transaction</td><td className="mono">−$120</td></tr>
            <tr><td>Marketing spent (this deal)</td><td className="mono">−$3,730</td></tr>
            <tr style={{ borderTop: '1px solid var(--line)' }}><td><b>Net to Dana</b></td><td className="mono" style={{ fontWeight:700 }}>$12,884</td></tr>
          </tbody>
        </table>
      </Box>
      <Box style={{ width: 320 }}>
        <div className="hand-alt">Cap impact</div>
        <Hr />
        <div className="tiny">This deal contributes <b>$5,146</b> to cap.</div>
        <Bar pct={77} color="var(--accent-sage)" />
        <div className="tiny muted">After close: 98% of cap · next deal uncapped</div>
        <Hr />
        <div className="hand-alt">Listed vs sold</div>
        <div className="tiny">List: $925k → Sold (est) $895k · <b>−3.2%</b></div>
        <div className="tiny muted">DOM est 24 · area avg 34</div>
      </Box>
    </div>
  </Desktop>;
}

function MoneyV3_Inventory() {
  return <Desktop active="Money" url="command.app/money/inventory">
    <span className="serif" style={{ fontSize: 22 }}>Inventory & supplies</span>
    <div className="row" style={{ gap: 12 }}>
      {[
        ['Lockboxes','8 on hand','12 in use','$95 ea','low → reorder 5'],
        ['For-sale signs','3 on hand','9 in use','$85 ea','ok'],
        ['Open house signs','22','0','$28 ea','ok'],
        ['Door jambs','180','—','$0.40 ea','ok'],
        ['Envelopes #10','640','—','$0.08 ea','ok'],
        ['Stamps','32','—','$0.68 ea','low → reorder'],
        ['Buyer guides','14','—','$4.20 ea','low → reorder 50'],
        ['Seller guides','9','—','$4.20 ea','low → reorder 50'],
      ].map(([n,o,u,c,s])=>(
        <Box key={n} style={{ width: 220 }}>
          <div className="hand-alt" style={{ fontSize: 15 }}>{n}</div>
          <div className="tiny muted">{o} {u!=='—'&&`· ${u}`}</div>
          <div className="tiny">unit cost: {c}</div>
          <div className="tiny" style={{ marginTop: 4, color: s.startsWith('low') ? 'var(--warn)' : 'var(--accent-sage)' }}>{s}</div>
        </Box>
      ))}
    </div>
    <Box dashed>
      <div className="hand-alt">Cost-per-piece rollup</div>
      <div className="tiny">When you send 200 expired letters: paper + envelope + stamp + return postage = <b className="mono">$1.84/piece</b>. Wise Pelican alt: <b className="mono">$1.29/piece</b>.</div>
    </Box>
  </Desktop>;
}

window.MoneyScreens = [
  { id:'mo1', label:'V1 · Dashboard', caption:'Cap, pipeline, YTD, itemized expenses (client + inventory + mail).', Component: MoneyV1_Dashboard },
  { id:'mo2', label:'V2 · Per-deal P&L', caption:'Commission, splits, TC fee, marketing spent, net, cap impact.', Component: MoneyV2_PerDeal },
  { id:'mo3', label:'V3 · Inventory', caption:'Supplies on hand, reorder flags, cost-per-piece rollup.', Component: MoneyV3_Inventory },
];

// ========== CHECKLISTS LIBRARY ==============================
function CheckV1_Library() {
  const lists = [
    ['New buyer inquiry','12 items',5],
    ['Buyer · signed BBA','18 items',3],
    ['New seller inquiry','9 items',2],
    ['Listing · signed','34 items',6],
    ['Offer · buyer side','16 items',4],
    ['Offer · seller side','14 items',4],
    ['Expired process','11 items',0],
    ['Investor (Lead Deck)','8 items',0],
    ['Open house prep','22 items',5],
    ['Post-close follow-up','12 items',0],
  ];
  return <Desktop active="Checklists" url="command.app/checklists">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Checklists</span>
      <Btn sm primary>+ new template</Btn>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 10 }}>
      {lists.map(([n,ct,active])=>(
        <Box key={n}>
          <div className="row between center">
            <div>
              <div className="hand-alt" style={{ fontSize: 15 }}>{n}</div>
              <div className="tiny muted">{ct}</div>
            </div>
            {active>0 && <Chip sm tan>{active} active</Chip>}
          </div>
          <Hr />
          <div className="row" style={{ gap: 4 }}>
            <Btn sm>edit template</Btn>
            <Btn sm ghost>see active runs →</Btn>
          </div>
        </Box>
      ))}
    </div>
  </Desktop>;
}

function CheckV2_OpenHouseRun() {
  const items = [
    ['48h before',[['Put sign order in',true,'🪧 open house signs'],['Print MLS sheet (25)',true,'📄 sheet template'],['Door-jamb flyers (100)',true,'📄 flyer PDF'],['Schedule email 24h reminder',true,'📧 template']]],
    ['Day of',[['Sign-in iPad charged',true,'📲 form link'],['Set up signs (AM route)',false,'🗺 route map'],['Buyer guides · 10 copies',true,'📕 buyer guide'],['Snacks / water',false,'']]],
    ['After',[['Thank-you to each visitor',false,'📧 template'],['Seller recap email',false,'📧 weekly update'],['Add visitors to CRM + nurture',false,'']]],
  ];
  return <Desktop active="Checklists" url="command.app/checklists/oh/42-oak">
    <div className="hand-neat tiny muted">← Checklists · Open house · 42 Oak · Sat 2–4pm</div>
    <span className="serif" style={{ fontSize: 22 }}>Open house · 42 Oak St</span>
    {items.map(([sect, rows])=>(
      <Box key={sect}>
        <div className="hand-alt">{sect}</div>
        <Hr />
        {rows.map(([label, done, asset],i)=>(
          <div key={i} className="row between center" style={{ padding:'4px 0', borderBottom:'1px dashed var(--line)' }}>
            <Check checked={done}>{label}</Check>
            {asset && <Chip sm>{asset}</Chip>}
          </div>
        ))}
      </Box>
    ))}
    <Box sage>
      <div className="hand-alt">✦ Mentor scripts for open houses</div>
      <div className="tiny">· "Dana's objection handler for low-ball after-OH"  · "OH sign-in opener (Serhant)"  · "Soft follow-up 24h script"</div>
    </Box>
  </Desktop>;
}

function CheckV3_ExpiredRun() {
  return <Desktop active="Checklists" url="command.app/checklists/expired/apr-run">
    <span className="serif" style={{ fontSize: 22 }}>Expired campaign · Apr run</span>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Prep</div>
        <Hr />
        {['Pull expireds from MLS (47 found)','Enrich with phone + address','Filter price band $400k–$1.5M','Mail-merge letter (template v3)','Print batch OR send via Wise Pelican','Stuff + stamp (if self-mail)','Drop at USPS'].map((l,i)=>
          <Check key={i} checked={i<4}>{l}</Check>
        )}
      </Box>
      <Box className="grow">
        <div className="hand-alt">Call</div>
        <Hr />
        {['Day 1 call (40 dials goal)','Day 3 call back','Day 7 text follow','Day 14 second letter','Day 30 drop-by if warm'].map((l,i)=>
          <Check key={i}>{l}</Check>
        )}
      </Box>
      <Box className="grow">
        <div className="hand-alt">Costs · this run</div>
        <Hr />
        <div className="tiny mono">47 letters · $1.84 ea = $86.48</div>
        <div className="tiny mono">alt: Wise Pelican = $60.63</div>
        <Hr />
        <div className="hand-alt" style={{ fontSize: 13 }}>Scripts (auto-surfaced)</div>
        <div className="tiny">· Expired opener (Ferry)  · Objection: "list with same agent"  · Price-reduction ask</div>
      </Box>
    </div>
  </Desktop>;
}

window.ChecklistScreens = [
  { id:'ck1', label:'V1 · Library', caption:'Templates for every flow: inquiry → signed → offer → close.', Component: CheckV1_Library },
  { id:'ck2', label:'V2 · Open house run', caption:'Checklist with asset links (flyers, sheets, signs) per item.', Component: CheckV2_OpenHouseRun },
  { id:'ck3', label:'V3 · Expired run', caption:'Prep + call + cost rollup, Wise Pelican alt, Mentor scripts.', Component: CheckV3_ExpiredRun },
];

// ========== MENTOR (scripts/playbooks) ======================
function MentorV1_Library() {
  return <Desktop active="Mentor" url="command.app/mentor">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Mentor library</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>↑ upload playbook PDF</Btn>
        <Btn sm primary>+ new script</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 200, flexShrink: 0 }}>
        <div className="hand-alt">Coaches</div>
        <Hr />
        {['Tom Ferry · 14','Mike Ferry · 8','Serhant · 11','Icenhower · 4','GSD Mode · 6','My own · 9'].map(x=><Chip key={x} sm style={{ display:'block', margin:'3px 0' }}>{x}</Chip>)}
        <Hr />
        <div className="hand-alt">Category</div>
        {['Expired','FSBO','Open house','Buyer consult','Objections','Price reduction','Post-close','Investor'].map(x=><Chip key={x} sm style={{ display:'block', margin:'2px 0' }}>{x}</Chip>)}
      </Box>
      <div className="grow">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap: 10 }}>
          {[
            ['Expired opener','Tom Ferry','Expired','"When you put your home on the market…"'],
            ['Price reduction conversation','Serhant','Price reduction','"Let me show you what the market is telling us…"'],
            ['OH sign-in opener','Icenhower','Open house','"Quick question — are you working with an agent yet?"'],
            ['FSBO 3-call plan','Mike Ferry','FSBO','Call 1: curiosity · Call 2: value · Call 3: ask'],
            ['Buyer consult agenda','My own','Buyer consult','30 min: goals · criteria · agency · lender'],
            ['Post-close 30/60/90','GSD Mode','Post-close','Handwritten · referral ask · anniversary'],
          ].map(([t,src,cat,preview],i)=>(
            <Box key={i}>
              <div className="row between center">
                <Chip sm tan>{cat}</Chip>
                <span className="tiny muted">{src}</span>
              </div>
              <div className="hand-alt" style={{ fontSize: 15, marginTop: 4 }}>{t}</div>
              <div className="tiny" style={{ color:'var(--muted)' }}>"{preview}"</div>
              <div className="row" style={{ gap: 4, marginTop: 6 }}>
                <Btn sm>open</Btn>
                <Btn sm ghost>copy</Btn>
              </div>
            </Box>
          ))}
        </div>
      </div>
    </div>
    <Box dashed>
      <div className="hand-alt">✦ Contextual surfacing</div>
      <div className="tiny">When you're in <b>Expired</b>, Expired scripts show. When on a <b>listing appt</b>, Pre-list scripts show. When a <b>price drop</b> conversation is coming, Price-reduction scripts show.</div>
    </Box>
  </Desktop>;
}

function MentorV2_Reader() {
  return <Desktop active="Mentor" url="command.app/mentor/expired-opener-ferry">
    <div className="hand-neat tiny muted">← Mentor · Expired opener · Tom Ferry</div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="serif" style={{ fontSize: 20 }}>Expired opener</div>
        <div className="tiny muted">Tom Ferry · Power of One coaching · uploaded Feb 2026</div>
        <Hr />
        <div style={{ whiteSpace:'pre-line', lineHeight: 1.55 }}>
{`"Hi {FIRST}, this is Dana with {BROKERAGE} — I noticed your home at {ADDRESS} came off the market.

Quick question: are you going to hire another agent, or have you decided not to sell?

[wait for response]

Ok — what do you think didn't work the first time?
[listen]
What are you looking for in the agent you hire this time?"`}
        </div>
        <Hr />
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>copy script</Btn>
          <Btn sm>use in dialer</Btn>
          <Btn sm ghost>add my notes</Btn>
        </div>
      </Box>
      <Box style={{ width: 280 }}>
        <div className="hand-alt">Linked objections</div>
        <Hr />
        {['"I\'m going to wait a bit"','"I\'ll relist with same agent"','"Market\'s too soft"'].map(o=>
          <Chip key={o} sm style={{ display:'block', margin:'4px 0' }}>{o}</Chip>
        )}
        <Hr />
        <div className="hand-alt">Usage</div>
        <div className="tiny">Used 34× · answered 6× · 2 appts booked</div>
      </Box>
    </div>
  </Desktop>;
}

window.MentorScreens = [
  { id:'me1', label:'V1 · Library', caption:'Upload coach PDFs. Category-tagged. Contextually surfaced.', Component: MentorV1_Library },
  { id:'me2', label:'V2 · Script reader', caption:'Script + objections + usage stats. Copy / dial / annotate.', Component: MentorV2_Reader },
];

// ========== WEEKLY SELLER UPDATE ============================
function WeeklyV1_Draft() {
  return <Desktop active="Seller Updates" url="command.app/updates/42-oak-week-2">
    <div className="hand-neat tiny muted">← Seller updates · 42 Oak St · Week 2</div>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Weekly update · Chen Family</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>preview</Btn>
        <Btn sm primary>send to Chen →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Email draft</div>
        <Hr />
        <div style={{ whiteSpace:'pre-line', lineHeight:1.55, fontSize: 13 }}>
{`Subject: 42 Oak Week 2 — views up, one price-drop question

Hi Chen Family,

Your home had another strong week. Here's where we are:

📊 This week (new since last update)
• 642 total views across platforms
• Realtor.com: 38 saves (+12 vs wk1) · 4 tour requests
• Zillow: 11 saves (+3) · 2 save-for-later
• 3 showings · 1 very-interested buyer (second showing Sat)

🏡 Open house (Sat 2–4)
• 18 groups through (target was 12)
• Feedback themes: loved the kitchen · wondered about HOA · asked about flooring

💬 Feedback this week (3 new)
• "Beautiful but we thought master would be bigger" — passed
• "We'd offer but price feels 4–5% high" — considering
• "Perfect but not ready until July" — saved

✦ My recommendation
The pattern is clear: buyers are circling but the two at-price offers haven't materialized. I'd suggest we consider a $20k reduction to $875k. Here's why:
· Comps at $875k are moving in 14–18 days
· Our DOM (12) is still well below area (34) — we can move before market flags us
· It re-triggers alerts on Zillow/realtor.com and we get a second "new" wave

Let me know if you'd like to hop on a call this week.

Dana`}
        </div>
      </Box>
      <Box style={{ width: 300 }}>
        <div className="hand-alt">Data pulled</div>
        <Hr />
        <div className="tiny">✓ Realtor.com (views, saves)</div>
        <div className="tiny">✓ Zillow (views, saves)</div>
        <div className="tiny">✓ MLS (showings)</div>
        <div className="tiny">✓ Meta ads (spend, clicks)</div>
        <div className="tiny">✓ OH sign-in (visitors + feedback)</div>
        <div className="tiny">✓ Showing feedback forms</div>
        <Hr />
        <div className="hand-alt">AI suggestion</div>
        <div className="tiny"><b>Price reduction · confidence 78%</b></div>
        <div className="tiny muted">based on 2 comps &lt; list · buyer feedback "4–5% high" · DOM trend</div>
        <Hr />
        <div className="hand-alt">Last email</div>
        <div className="tiny muted">Apr 10 · only showing new since then</div>
      </Box>
    </div>
  </Desktop>;
}

function WeeklyV2_Settings() {
  return <Desktop active="Seller Updates" url="command.app/updates/settings">
    <span className="serif" style={{ fontSize: 22 }}>Seller update settings</span>
    <Box>
      <div className="hand-alt">Schedule</div>
      <Hr />
      <Check checked>Auto-draft every Thursday 7am</Check>
      <Check checked>Queue for my review — don't auto-send</Check>
      <Check>Auto-send if I haven't reviewed by Friday 4pm</Check>
    </Box>
    <Box>
      <div className="hand-alt">Include</div>
      <Hr />
      <div className="row wrap" style={{ gap: 6 }}>
        {['Realtor.com views','Zillow views','Realtor.com saves','Zillow saves','MLS showings','OH visitors','OH feedback','Showing feedback','Meta ads clicks','Ad spend','Recent comps','AI suggestion','Next week plan'].map(x=>
          <Chip key={x} sm tan>✓ {x}</Chip>)}
      </div>
    </Box>
    <Box>
      <div className="hand-alt">Rules</div>
      <Hr />
      <Check checked>Only show feedback <b>new since last send</b></Check>
      <Check checked>Auto-suggest price reduction if DOM &gt; area avg × 0.8</Check>
      <Check>Include comp set every 3rd email</Check>
      <Check checked>Attach open-house recap PDF</Check>
    </Box>
  </Desktop>;
}

window.WeeklyScreens = [
  { id:'wk1', label:'V1 · Drafted email', caption:'Pulls from all platforms. New-only feedback. AI price suggestion + reasoning.', Component: WeeklyV1_Draft },
  { id:'wk2', label:'V2 · Settings', caption:'Schedule, what to include, rules for suggestions.', Component: WeeklyV2_Settings },
];

// ========== AGREEMENTS ======================================
function AgreeV1_List() {
  const rows = [
    ['Chen Family','Listing · 42 Oak','2.5%','04/01 → 10/01','164 days left','sage'],
    ['Kim Pair','Buyer BBA','2.75%','03/22 → 09/22','155 days left',''],
    ['Marcus Reid','Listing · 88 Elm','2.5%','02/18 → 05/18','30 days ⚠','tan'],
    ['Haleigh + Tom','Buyer BBA','2.5%','01/05 → 04/05','EXPIRED 13 days ago','rose'],
    ['Ortega Investments','Buyer BBA (investor)','1.5%','04/12 → 10/12','176 days left',''],
  ];
  return <Desktop active="Agreements" url="command.app/agreements">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Agreements</span>
      <Btn sm primary>+ new agreement</Btn>
    </div>
    <Box dashed>
      <div className="hand-alt">⚠ 3 need attention</div>
      <div className="tiny">1 expired · 2 in 45-day window</div>
    </Box>
    <Box style={{ padding: 0 }}>
      <table className="wf-table">
        <thead><tr><th>Client</th><th>Type</th><th>Commission</th><th>Term</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              <td style={{ fontWeight:500 }}>{r[0]}</td>
              <td>{r[1]}</td>
              <td className="mono">{r[2]}</td>
              <td className="mono tiny">{r[3]}</td>
              <td><Chip sm className={r[5]}>{r[4]}</Chip></td>
              <td><Btn sm ghost>open →</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  </Desktop>;
}

function AgreeV2_Detail() {
  return <Desktop active="Agreements" url="command.app/agreements/reid-listing">
    <div className="hand-neat tiny muted">← Agreements · Marcus Reid · 88 Elm listing</div>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Listing agreement · 88 Elm</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>↑ upload signed doc</Btn>
        <Btn sm primary>start renewal convo →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Terms</div>
        <Hr />
        <table className="wf-table">
          <tbody>
            <tr><td>Commission</td><td className="mono">2.5% listing + 2.5% co-op</td></tr>
            <tr><td>List price</td><td className="mono">$1,200,000</td></tr>
            <tr><td>Signed</td><td className="mono">02/18/2026</td></tr>
            <tr><td>Expires</td><td className="mono">05/18/2026 · 30 days</td></tr>
            <tr><td>Protection period</td><td className="mono">90 days</td></tr>
          </tbody>
        </table>
      </Box>
      <Box style={{ width: 300 }}>
        <div className="hand-alt">Reminder schedule</div>
        <Hr />
        {[
          ['45 days out','✓ sent · Apr 3'],
          ['30 days out','✓ today'],
          ['15 days out','pending · May 3'],
          ['5 days out','pending · May 13'],
          ['Expired','pending · May 18'],
        ].map(([l,s],i)=>(
          <div key={i} className="row between center" style={{ padding:'3px 0', borderBottom:'1px dashed var(--line)' }}>
            <span>{l}</span>
            <span className="tiny mono muted">{s}</span>
          </div>
        ))}
        <Hr />
        <Check>Stop reminders — new agreement signed</Check>
      </Box>
    </div>
  </Desktop>;
}

window.AgreementScreens = [
  { id:'ag1', label:'V1 · List + expirations', caption:'All BBAs + listing agmts. Countdown status chips.', Component: AgreeV1_List },
  { id:'ag2', label:'V2 · Detail + reminders', caption:'Terms, 45/30/15/5/expired reminder ladder, override toggle.', Component: AgreeV2_Detail },
];

// ========== VENDORS =========================================
function VendorV1_Directory() {
  const vendors = [
    ['Jake @ Bright','Photography','$650 listing · $350 OH','4.9 ★ · 12 jobs','sage'],
    ['Skyline Drone','Drone + aerial','$400 · $600 w/ video','4.8 · 8 jobs','sage'],
    ['Allie Staging','Staging','$2,400 avg · 3mo','5.0 · 4 jobs','sage'],
    ['SentriLock','Lockboxes','$95/box bulk','—',''],
    ['SignsOnTime','Sign install','$85 install · $45 remove','4.7','tan'],
    ['Wise Pelican','Mail service','$1.29/piece','—','tan'],
    ['Maria Cruz TC','Transaction coord.','$495/deal','5.0 · 14 deals','sage'],
    ['LendUp Kate','Lender','referral','4.9',''],
    ['HomeShield Inspect','Inspection','$450 buyer','4.6',''],
  ];
  return <Desktop active="Vendors" url="command.app/vendors">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Vendors</span>
      <Btn sm primary>+ add vendor</Btn>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 10 }}>
      {vendors.map((v,i)=>(
        <Box key={i}>
          <div className="row between center">
            <div className="hand-alt" style={{ fontSize: 15 }}>{v[0]}</div>
            <Chip sm className={v[4]}>{v[1]}</Chip>
          </div>
          <div className="tiny muted">{v[2]}</div>
          <div className="tiny">{v[3]}</div>
          <Hr />
          <div className="row" style={{ gap: 4 }}>
            <Btn sm>assign to client</Btn>
            <Btn sm ghost>jobs →</Btn>
          </div>
        </Box>
      ))}
    </div>
  </Desktop>;
}

function VendorV2_ClientAssign() {
  return <Desktop active="Vendors" url="command.app/vendors/assign/chen">
    <div className="hand-neat tiny muted">← Vendors · Chen Family · 42 Oak</div>
    <span className="serif" style={{ fontSize: 22 }}>Chen Family — vendors</span>
    <Box>
      <div className="hand-alt">Assigned</div>
      <Hr />
      <table className="wf-table">
        <thead><tr><th>Vendor</th><th>Service</th><th>Scheduled</th><th>$</th><th></th></tr></thead>
        <tbody>
          <tr><td>Jake @ Bright</td><td>Photography</td><td className="mono">04/01 done</td><td className="mono">$650</td><td><Btn sm ghost>log</Btn></td></tr>
          <tr><td>Skyline</td><td>Drone</td><td className="mono">04/02 done</td><td className="mono">$400</td><td><Btn sm ghost>log</Btn></td></tr>
          <tr><td>Allie Staging</td><td>Staging</td><td className="mono">04/02 → 07/01</td><td className="mono">$2,400</td><td><Btn sm ghost>log</Btn></td></tr>
          <tr><td>SignsOnTime</td><td>Sign install</td><td className="mono">04/01</td><td className="mono">$185</td><td><Btn sm ghost>log</Btn></td></tr>
          <tr><td>Maria Cruz</td><td>TC</td><td className="mono">at contract</td><td className="mono">$495</td><td><Btn sm ghost>log</Btn></td></tr>
        </tbody>
      </table>
    </Box>
    <Box dashed>
      <div className="hand-alt">+ add vendor to this client</div>
      <div className="row" style={{ gap: 6, marginTop: 6, flexWrap:'wrap' }}>
        {['Inspector','Lender','Contractor','Cleaner','Landscaper','Mover','Stager (extra)'].map(x=><Chip key={x} sm>+ {x}</Chip>)}
      </div>
    </Box>
  </Desktop>;
}

window.VendorScreens = [
  { id:'vn1', label:'V1 · Directory', caption:'All vendors, categories, ratings, bulk pricing.', Component: VendorV1_Directory },
  { id:'vn2', label:'V2 · Assigned per client', caption:'Multi-vendor on one client, schedule, cost, auto-log to Money.', Component: VendorV2_ClientAssign },
];

// ========== SHOWING CALENDAR (mobile) =======================
function CalV1_Day() {
  return <Phone tabbarItems={[{label:'Today'},{label:'Map',active:true},{label:'Notes'},{label:'CRM'},{label:'More'}]}>
    <div style={{ padding: 12 }}>
      <div className="tiny muted">Saturday · April 18</div>
      <div className="serif" style={{ fontSize: 22 }}>Showing route</div>
    </div>
    <div style={{ margin: '0 12px', background:'var(--paper-2)', border:'1px solid var(--line)', borderRadius:8, height: 180, display:'flex', alignItems:'center', justifyContent:'center' }} className="tiny muted">[ live map · route line · 5 pins ]</div>
    <div style={{ padding: 12 }}>
      {[
        ['10:00','42 Oak St','Kim Pair · buyer','15 min · 3.2mi'],
        ['10:45','9 Juniper Ct','Kim Pair','22 min · 5.1mi'],
        ['11:30','220 Birch','Kim Pair','12 min · 2.4mi'],
        ['12:15','Break','lunch Fiore','—'],
        ['1:30','777 Cedar','Haleigh + Tom','drive from Fiore 8mi'],
      ].map(([t,addr,who,meta],i)=>(
        <div key={i} style={{ display:'flex', gap: 10, padding:'8px 0', borderBottom:'1px dashed var(--line)' }}>
          <div className="mono" style={{ width: 50, fontWeight:500 }}>{t}</div>
          <div className="grow">
            <div style={{ fontWeight: 500 }}>{addr}</div>
            <div className="tiny muted">{who} · {meta}</div>
          </div>
          <Btn sm>↗ nav</Btn>
        </div>
      ))}
    </div>
    <div style={{ padding: 12 }}>
      <Btn sm primary>✦ optimize route →</Btn>
    </div>
  </Phone>;
}

function CalV2_Map() {
  return <Phone tabbarItems={[{label:'Today'},{label:'Map',active:true},{label:'Notes'},{label:'CRM'},{label:'More'}]}>
    <div style={{ padding: 12 }}>
      <div className="serif" style={{ fontSize: 20 }}>Route · Sat 10am → 2:30pm</div>
      <div className="tiny muted">5 stops · 28mi · Kim Pair + Haleigh/Tom</div>
    </div>
    <div style={{ margin: '0 12px', background:'var(--paper-2)', border:'1px solid var(--line)', borderRadius:8, height: 340, display:'flex', alignItems:'center', justifyContent:'center' }} className="tiny muted">[ fullscreen map · numbered pins 1–5 · route line · ETA labels ]</div>
    <div style={{ padding: 12 }}>
      <div className="row between">
        <div>
          <div className="tiny muted">Next stop</div>
          <div style={{ fontWeight:500 }}>9 Juniper Ct · 10:45</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>call Kim</Btn>
          <Btn sm primary>open in Maps</Btn>
        </div>
      </div>
    </div>
  </Phone>;
}

window.CalendarScreens = [
  { id:'cal1', label:'V1 · Day schedule', caption:'Timeline of showings, distance + drive time, tap to nav.', Component: CalV1_Day },
  { id:'cal2', label:'V2 · Route map', caption:'Full-screen map, numbered stops, optimize button.', Component: CalV2_Map },
];

// ========== SOCIAL COMPETITOR ===============================
function SocialV1_Researcher() {
  return <Desktop active="Social Research" url="command.app/social/research">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Competitor & trend researcher</span>
      <div className="row" style={{ gap: 6 }}>
        <Input placeholder="add handle to track" style={{ width: 220 }} />
        <Btn sm primary>+ track</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 220, flexShrink: 0 }}>
        <div className="hand-alt">Tracked</div>
        <Hr />
        {['@mollymccaw','@erinandream','@theagencyre','@ryanserhant','@glennsanford','@oakparkdana (me)'].map(x=>
          <div key={x} className="row between" style={{ padding:'3px 0' }}>
            <span className="tiny">{x}</span>
            <Chip sm>IG</Chip>
          </div>
        )}
        <Hr />
        <div className="hand-alt">Filter</div>
        <Check checked>Top 10% views</Check>
        <Check checked>Last 30 days</Check>
        <Check>Same market</Check>
      </Box>
      <div className="grow">
        <div className="row" style={{ gap: 12 }}>
          <Box className="grow"><Stat n="1.2M" l="total views · tracked" /></Box>
          <Box className="grow"><Stat n="47" l="posts this week" /></Box>
          <Box className="grow"><Stat n="6" l="viral (&gt;100k)" /></Box>
          <Box className="grow"><Stat n="12" l="formats detected" /></Box>
        </div>
        <Box>
          <div className="row between center">
            <div className="hand-alt">What's working right now</div>
            <span className="tiny muted">AI synthesized · updated 2h ago</span>
          </div>
          <Hr />
          {[
            ['Reel','"3 things you\'re missing when buying in [neighborhood]"','213k views · 8.4% ER · @mollymccaw'],
            ['Carousel','"The hidden cost of waiting to list"','142k · 12% save rate · @erinandream'],
            ['Reel','"POV: I walked into this listing at dawn"','487k · 4% ER · @theagencyre'],
            ['TikTok','"5 questions to ask before your offer"','89k · 6.1% ER · @glennsanford'],
          ].map((r,i)=>(
            <div key={i} className="row between center" style={{ padding:'6px 0', borderBottom:'1px dashed var(--line)' }}>
              <div>
                <Chip sm tan>{r[0]}</Chip>
                <span style={{ marginLeft: 8 }}>{r[1]}</span>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <span className="tiny muted">{r[2]}</span>
                <Btn sm>save to inspo</Btn>
                <Btn sm primary>✦ recreate</Btn>
              </div>
            </div>
          ))}
        </Box>
        <Box dashed>
          <div className="hand-alt">Pattern recognition (last 30d)</div>
          <div className="tiny">• Neighborhood guides in carousel form are saving 3× average</div>
          <div className="tiny">• Dawn / dusk b-roll reels outperforming talking-head 4:1</div>
          <div className="tiny">• Top performers post M/W/F mornings · you post Th/Sun</div>
          <div className="tiny">• "POV" hooks up 38% week-over-week in luxury listings</div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

window.SocialScreens = [
  { id:'sc1', label:'V1 · Competitor researcher', caption:'Track handles. Top content. AI pattern synthesis. One-tap recreate.', Component: SocialV1_Researcher },
];

// ========== CONTENT V2 (Blotato / Canva / Gamma / Remotion) ==
function ContentX1_PublishFlow() {
  return <Desktop active="Content v2" url="command.app/content/publish/42-oak-tour">
    <div className="hand-neat tiny muted">← Content · 42 Oak · Listing tour reel</div>
    <span className="serif" style={{ fontSize: 22 }}>Publish destinations</span>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Manual · I'll copy/post myself</div>
        <div className="tiny muted">Never auto-posts. Click to download + open app.</div>
        <Hr />
        {[
          ['Instagram Reel','42 Oak tour · 0:45','.mp4 · caption ready'],
          ['Facebook Reel','same','.mp4 · caption ready'],
          ['TikTok','42 Oak tour · vertical','.mp4 · caption + hashtags'],
        ].map(([p,d,m])=>(
          <div key={p} className="row between center" style={{ padding:'6px 0', borderBottom:'1px dashed var(--line)' }}>
            <div>
              <div style={{ fontWeight:500 }}>{p}</div>
              <div className="tiny muted">{d} · {m}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Btn sm>copy caption</Btn>
              <Btn sm primary>↓ download</Btn>
            </div>
          </div>
        ))}
      </Box>
      <Box className="grow">
        <div className="hand-alt">Auto-post via Blotato</div>
        <div className="tiny muted">One click — posts + tracks stats.</div>
        <Hr />
        {[
          ['YouTube Shorts','connected'],
          ['LinkedIn','connected'],
          ['X / Twitter','connected'],
          ['Pinterest','connected'],
          ['Threads','connected'],
          ['Blog (your site)','connected'],
        ].map(([p,s])=>(
          <div key={p} className="row between center" style={{ padding:'6px 0', borderBottom:'1px dashed var(--line)' }}>
            <div>
              <div style={{ fontWeight:500 }}>{p}</div>
              <div className="tiny muted">{s}</div>
            </div>
            <Check checked>schedule</Check>
          </div>
        ))}
        <Btn primary style={{ marginTop: 8 }}>✦ schedule all 6 · Thu 8am</Btn>
      </Box>
    </div>
    <Box>
      <div className="hand-alt">Attribute to</div>
      <Hr />
      <div className="row wrap" style={{ gap: 6 }}>
        <Chip sage>✓ 42 Oak · Chen Family (listing)</Chip>
        <Chip>+ Oak Park neighborhood</Chip>
        <Chip>+ buyer audience</Chip>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Stats on this post will roll up to <b>Chen Family's</b> weekly update + to Oak Park campaign.</div>
    </Box>
  </Desktop>;
}

function ContentX2_TalkingHead() {
  return <Desktop active="Content v2" url="command.app/content/talking-head/new">
    <span className="serif" style={{ fontSize: 22 }}>Talking-head video · Remotion edit</span>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Step 1 · Script AI needs from you</div>
        <Hr />
        <div style={{ whiteSpace:'pre-line', lineHeight:1.55, fontSize: 13 }}>
{`Record yourself saying this (exactly 3 beats, 45–60 sec):

BEAT 1 — HOOK (5–8 sec)
"If you're thinking about selling in Oak Park this spring, there's one thing your agent probably isn't telling you."

BEAT 2 — VALUE (25–35 sec)
"The average home in our zip code sold for 2.1% under list last quarter. But the top 20% — listed between $800k and $1.1M — sold at or above. The difference? Staging, drone video, and launching on a Thursday. I can break down the data for your block specifically."

BEAT 3 — CTA (8–12 sec)
"DM me 'Oak Park' and I'll send you a one-pager on your block. Zero pressure."`}
        </div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <Btn sm>regenerate script</Btn>
          <Btn sm>adjust to my voice</Btn>
          <Btn sm primary>↑ upload my recording</Btn>
        </div>
      </Box>
      <Box style={{ width: 300 }}>
        <div className="hand-alt">Step 2 · Remotion will do</div>
        <Hr />
        <Check checked>Auto-cut silences</Check>
        <Check checked>Add captions (in your font)</Check>
        <Check checked>Trim to 45–60 sec</Check>
        <Check checked>B-roll overlays at BEAT 2 (your listing photos)</Check>
        <Check checked>Soft piano bed @ -18db</Check>
        <Check>Bleep-out mistakes</Check>
        <Hr />
        <div className="hand-alt">Launch to</div>
        <Chip sm>↓ IG/FB/TT download</Chip>
        <Chip sm sage>✦ auto-post: YouTube Shorts, LinkedIn</Chip>
      </Box>
    </div>
    <Box dashed>
      <div className="hand-alt">Other entry points</div>
      <div className="row" style={{ gap: 6, marginTop: 4 }}>
        <Chip>🎨 Open in Canva</Chip>
        <Chip>◉ Open in Gamma</Chip>
        <Chip>▶ Open in Remotion</Chip>
      </div>
    </Box>
  </Desktop>;
}

window.ContentExtraScreens = [
  { id:'cx1', label:'V1 · Publish flow', caption:'Manual copy/download for IG/FB/TT · auto-post elsewhere via Blotato · attribute to client.', Component: ContentX1_PublishFlow },
  { id:'cx2', label:'V2 · Talking-head + Remotion', caption:'AI gives you the exact script. You record. Remotion edits. Choose Canva/Gamma/Remotion.', Component: ContentX2_TalkingHead },
];

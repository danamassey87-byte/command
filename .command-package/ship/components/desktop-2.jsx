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
        <Check done>Ordered sign</Check>
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
      <div className="tiny" style={{ fontStyle: 'italic', marginTop: 4 }}>
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
          <div className="tiny" style={{ fontStyle: 'italic', marginTop: 4 }}>
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

function ScorecardTable() {
  const rows = [
    { metric:'Closed sales',           target:5,   actual:2,   daysLeft:11 },
    { metric:'New listings',           target:3,   actual:2,   daysLeft:11 },
    { metric:'Buyer consults',         target:8,   actual:11,  daysLeft:11 },
    { metric:'Open houses',            target:4,   actual:5,   daysLeft:11 },
    { metric:'Prospect calls (conn.)', target:120, actual:142, daysLeft:11 },
    { metric:'Letters sent',           target:40,  actual:142, daysLeft:11 },
    { metric:'Content posts',          target:16,  actual:22,  daysLeft:11 },
    { metric:'Email sends',            target:4,   actual:6,   daysLeft:11 },
    { metric:'Referrals asked',        target:10,  actual:3,   daysLeft:11 },
    { metric:'Past client touches',    target:40,  actual:12,  daysLeft:11 },
  ].map(r => {
    const delta = r.actual - r.target;
    const pace = r.actual / r.target;
    const needPerDay = Math.max(0, (r.target - r.actual)) / Math.max(1, r.daysLeft);
    let status = pace >= 1.1 ? { lab:'🟢 on track',   tier: 3, col:'var(--accent-sage)' }
               : pace >= 0.7 ? { lab:'🟡 off pace',   tier: 2, col:'var(--accent-tan)'  }
               :                { lab:'🔴 behind',    tier: 1, col:'#b6473a' };
    return { ...r, delta, pace, needPerDay, status };
  });

  const cols = [
    { key:'metric',    label:'Metric',    type:'s', render:r=>r.metric },
    { key:'target',    label:'Target',    type:'n', render:r=>r.target },
    { key:'actual',    label:'Actual',    type:'n', render:r=>r.actual },
    { key:'delta',     label:'Δ',         type:'n', render:r=>(r.delta>0?'+':'')+r.delta },
    { key:'pace',      label:'Pace',      type:'n', render:r=>Math.round(r.pace*100)+'%' },
    { key:'needPerDay',label:'Need/day',  type:'n', render:r=>r.needPerDay>0 ? r.needPerDay.toFixed(1) : <span className="faint">—</span> },
    { key:'daysLeft',  label:'Days left', type:'n', render:r=>r.daysLeft },
    { key:'status',    label:'Status',    type:'tier', render:r=>r.status.lab, sortVal:r=>r.status.tier, color:r=>r.status.col, weight:600 },
  ];

  const [sortKey, setSortKey] = React.useState('status');
  const [sortDir, setSortDir] = React.useState('asc'); // asc = worst-first for status (tier 1 = behind)

  const sorted = React.useMemo(() => {
    const col = cols.find(c => c.key === sortKey);
    const getV = col.sortVal || (r => r[col.key]);
    const arr = [...rows].sort((a,b) => {
      const va = getV(a), vb = getV(b);
      if (typeof va === 'string') return va.localeCompare(vb);
      return va - vb;
    });
    if (sortDir === 'desc') arr.reverse();
    return arr;
  }, [sortKey, sortDir]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'metric' ? 'asc' : 'desc'); }
  };

  const arrow = (key) => sortKey !== key ? <span style={{ opacity: 0.25, marginLeft: 3 }}>⇅</span>
                        : <span style={{ color:'var(--accent-rose)', marginLeft: 3 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;

  return (
    <Box style={{ padding: 0, overflow: 'hidden' }}>
      <table className="wf-table">
        <thead>
          <tr>{cols.map(c => (
            <th key={c.key}
                onClick={() => onSort(c.key)}
                style={{ cursor:'pointer', userSelect:'none', background: sortKey===c.key ? 'var(--paper-2)' : undefined }}>
              {c.label}{arrow(c.key)}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {sorted.map((r,i) => (
            <tr key={i}>
              {cols.map(c => (
                <td key={c.key} style={{
                  color: c.color ? c.color(r) : undefined,
                  fontWeight: c.weight || undefined,
                }}>{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Box>
  );
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
    <ScorecardTable />
    <Anno>↑ click any header to sort · days-left shows pace against month-end</Anno>
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

// ============================================================
// ADDRESS INTELLIGENCE — Re-run MLS status, tap-to-call/text,
// interactive map with zoom. Works for expireds OR any address.
// ============================================================

// ---------- Tap-to-call / tap-to-text primitives ----------
// Big thumb-friendly buttons. Different colors for call vs text.
function TapCall({ number = '(312) 555-0142', compact = false }) {
  return <div style={{
    display:'inline-flex', alignItems:'center', gap: 6,
    padding: compact ? '6px 12px' : '10px 16px',
    background:'#8a9b7f', color:'#fbf5ea',
    borderRadius: 999,
    fontSize: compact ? 12 : 14, fontWeight: 600,
    border:'1.5px solid #6f8263',
    boxShadow:'0 2px 0 rgba(42,31,23,0.08)',
    minHeight: compact ? 32 : 44, // hit target
  }}>
    📞 <span>Call</span>
    {!compact && <span style={{ fontFamily:'var(--font-mono)', fontSize: 11, opacity: 0.9, marginLeft: 4 }}>{number}</span>}
  </div>;
}
function TapText({ number = '(312) 555-0142', compact = false }) {
  return <div style={{
    display:'inline-flex', alignItems:'center', gap: 6,
    padding: compact ? '6px 12px' : '10px 16px',
    background:'#c9a274', color:'#2a1f17',
    borderRadius: 999,
    fontSize: compact ? 12 : 14, fontWeight: 600,
    border:'1.5px solid #b48b5e',
    boxShadow:'0 2px 0 rgba(42,31,23,0.08)',
    minHeight: compact ? 32 : 44,
  }}>
    💬 <span>Text</span>
    {!compact && <span style={{ fontFamily:'var(--font-mono)', fontSize: 11, opacity: 0.8, marginLeft: 4 }}>{number}</span>}
  </div>;
}

// ---------- MLS status chip ----------
function StatusChip({ status }) {
  const map = {
    active:     { bg:'#e3ead4', col:'#4a5840', bd:'#c9d3b9', label:'Active' },
    uc:         { bg:'#f0e5d0', col:'#6b4d24', bd:'#dfce9f', label:'Under contract' },
    pending:    { bg:'#f2d9cc', col:'#6d3a2c', bd:'#e4bfaf', label:'Pending' },
    sold:       { bg:'#2a1f17', col:'#fbf5ea', bd:'#3d2e1f', label:'Sold' },
    expired:    { bg:'#f5ead7', col:'#6b4d24', bd:'#e0d1b3', label:'Expired' },
    withdrawn:  { bg:'#ede4d0', col:'#5a4a2a', bd:'#d6c9a9', label:'Withdrawn' },
    off:        { bg:'#e8e0cf', col:'#6b5c3e', bd:'#cfc3a8', label:'Off-market' },
  };
  const s = map[status] || map.off;
  return <span style={{
    display:'inline-flex', alignItems:'center', gap: 4,
    padding:'3px 10px', borderRadius: 999,
    background: s.bg, color: s.col, border:`1px solid ${s.bd}`,
    fontSize: 11, fontWeight: 600, letterSpacing: 0.1,
  }}>● {s.label}</span>;
}

// ---------- Interactive map (SVG-based, zoomable) ----------
function AddressMap({ height = 200, pin = { x: 50, y: 50 }, zoomLevel = 15 }) {
  const [zoom, setZoom] = useState(zoomLevel);
  // Simulate zoom by scaling the grid + moving features
  const scale = Math.pow(1.15, zoom - 15);
  const gridSize = 40 * scale;

  return <div style={{
    position:'relative', width:'100%', height,
    borderRadius: 14, overflow:'hidden',
    border:'1.5px solid var(--line)',
    background: '#ece4d0',
  }}>
    {/* Map base — streets grid */}
    <svg width="100%" height="100%" style={{ display:'block' }}>
      <defs>
        <pattern id="streets" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
          <rect width={gridSize} height={gridSize} fill="#ece4d0" />
          <line x1="0" y1={gridSize/2} x2={gridSize} y2={gridSize/2} stroke="#fbf5ea" strokeWidth={6*scale/2 + 2} />
          <line x1={gridSize/2} y1="0" x2={gridSize/2} y2={gridSize} stroke="#fbf5ea" strokeWidth={6*scale/2 + 2} />
          <line x1="0" y1={gridSize*0.2} x2={gridSize} y2={gridSize*0.2} stroke="#e0d5c2" strokeWidth="1" />
          <line x1="0" y1={gridSize*0.8} x2={gridSize} y2={gridSize*0.8} stroke="#e0d5c2" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#streets)" />
      {/* Parks / greenspaces */}
      <rect x="15%" y="60%" width={60*scale} height={40*scale} fill="#c9d3b9" opacity="0.6" rx="4" />
      <rect x="72%" y="15%" width={50*scale} height={50*scale} fill="#c9d3b9" opacity="0.6" rx="4" />
      {/* Water */}
      <path d={`M 0 ${height*0.85} Q ${100*scale} ${height*0.82} ${200*scale} ${height*0.88} T 400 ${height*0.85} V ${height} H 0 Z`}
            fill="#b8cad1" opacity="0.5" />
      {/* Street labels */}
      <text x="10" y="14" fontSize={9*Math.min(scale,1.4)} fill="#6b5c3e" fontFamily="var(--font-mono)">OAK ST</text>
      <text x="10" y={height - 8} fontSize={9*Math.min(scale,1.4)} fill="#6b5c3e" fontFamily="var(--font-mono)">ELM AVE</text>
    </svg>

    {/* Main pin — drops at center */}
    <div style={{
      position:'absolute', top:'50%', left:'50%',
      transform:'translate(-50%, -100%)',
      display:'flex', flexDirection:'column', alignItems:'center',
      pointerEvents:'none',
    }}>
      <div style={{
        background:'#2a1f17', color:'#fbf5ea',
        padding:'4px 10px', borderRadius: 8,
        fontSize: 11, fontWeight: 600,
        border:'1.5px solid #3d2e1f',
        boxShadow:'0 4px 12px -4px rgba(42,31,23,0.4)',
        whiteSpace:'nowrap',
      }}>114 Maple St</div>
      <div style={{
        width: 0, height: 0,
        borderLeft:'6px solid transparent',
        borderRight:'6px solid transparent',
        borderTop:'8px solid #2a1f17',
      }} />
      <div style={{
        width: 12, height: 12, borderRadius:'50%',
        background:'#b6473a', border:'2px solid #fbf5ea',
        boxShadow:'0 2px 6px rgba(42,31,23,0.3)',
        marginTop: -2,
      }} />
    </div>

    {/* Zoom controls — top-right, big tap targets */}
    <div style={{
      position:'absolute', top: 10, right: 10,
      display:'flex', flexDirection:'column', gap: 4,
    }}>
      <button onClick={()=>setZoom(z=>Math.min(z+1, 19))} style={zoomBtnStyle}>+</button>
      <button onClick={()=>setZoom(z=>Math.max(z-1, 11))} style={zoomBtnStyle}>−</button>
    </div>
    {/* Layer + current-location controls — bottom-right */}
    <div style={{ position:'absolute', bottom: 10, right: 10, display:'flex', flexDirection:'column', gap: 4 }}>
      <button style={zoomBtnStyle} title="My location">◎</button>
      <button style={zoomBtnStyle} title="Layers">☰</button>
    </div>
    {/* Zoom indicator — bottom-left */}
    <div style={{
      position:'absolute', bottom: 10, left: 10,
      padding:'3px 8px', background:'rgba(251,245,234,0.9)',
      borderRadius: 6, fontSize: 10, fontFamily:'var(--font-mono)',
      border:'1px solid var(--line)',
    }}>zoom {zoom}</div>
    {/* Pinch hint (mobile) */}
    <div style={{
      position:'absolute', top: 10, left: 10,
      padding:'3px 8px', background:'rgba(251,245,234,0.9)',
      borderRadius: 6, fontSize: 10,
      border:'1px solid var(--line)', color:'#6b5c3e',
    }}>pinch or +/− to zoom</div>
  </div>;
}
const zoomBtnStyle = {
  width: 36, height: 36, borderRadius: 8,
  background:'#fbf5ea', border:'1.5px solid var(--line)',
  fontSize: 18, fontWeight: 600, color:'var(--ink)',
  cursor:'pointer', boxShadow:'0 2px 6px rgba(42,31,23,0.15)',
  display:'flex', alignItems:'center', justifyContent:'center',
  padding: 0, fontFamily:'inherit',
};

// ---------- Status history timeline ----------
function StatusTimeline({ events }) {
  return <div style={{ position:'relative' }}>
    {events.map((e, i) => (
      <div key={i} style={{ display:'flex', gap: 10, marginBottom: 10, position:'relative' }}>
        <div style={{ width: 12, flexShrink: 0, display:'flex', flexDirection:'column', alignItems:'center', paddingTop: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius:'50%', background: e.current ? '#b6473a' : '#c9a274', border:'2px solid #fbf5ea' }} />
          {i < events.length - 1 && <div style={{ width: 2, flex: 1, background:'#e0d5c2', marginTop: 2 }} />}
        </div>
        <div style={{ flex: 1, paddingBottom: 4 }}>
          <div className="row between" style={{ alignItems:'baseline' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{e.label}</span>
            <span className="tiny muted mono">{e.date}</span>
          </div>
          <div className="tiny muted">{e.detail}</div>
        </div>
      </div>
    ))}
  </div>;
}

// ============================================================
// MOBILE · Address lookup with re-run status
// ============================================================
function AddrV1_MobileLookup() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat">← 114 Maple St</span>
      <Chip sm>re-run ↻</Chip>
    </div>

    {/* Status banner — the thing that changes */}
    <Box style={{ padding: 12, background:'#f8f1e3', border:'1.5px solid #e0d5c2' }}>
      <div className="row between center">
        <div className="tiny mono muted">CURRENT STATUS · checked 2 min ago</div>
        <Btn sm>↻ re-check</Btn>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 8, marginTop: 6 }}>
        <StatusChip status="expired" />
        <span className="tiny muted">since Apr 14 · 142 DOM</span>
      </div>
      <div className="hand-alt" style={{ fontSize: 13, marginTop: 8, color:'#6b4d24' }}>
        ⚠ Not active, UC, or pending. Not sold in the past 12 months. Safe to prospect.
      </div>
    </Box>

    {/* Map */}
    <AddressMap height={180} />

    {/* Tap-to-call / tap-to-text — BIG and obvious */}
    <div style={{ display:'flex', gap: 8 }}>
      <div style={{ flex: 1 }}><TapCall /></div>
      <div style={{ flex: 1 }}><TapText /></div>
    </div>

    {/* Full status history */}
    <Box>
      <div className="row between center">
        <div className="hand-alt" style={{ fontSize: 14 }}>12-month status history</div>
        <Chip sm>MLS + public records</Chip>
      </div>
      <Hr />
      <StatusTimeline events={[
        { label:'Expired',      date:'Apr 14, 2026', detail:'142 DOM · listed $649k · no offers', current: true },
        { label:'Price cut',    date:'Feb 18, 2026', detail:'$679k → $649k (−$30k)' },
        { label:'Price cut',    date:'Jan 08, 2026', detail:'$699k → $679k (−$20k)' },
        { label:'Listed',       date:'Nov 22, 2025', detail:'Coldwell · $699k · 3bd/2ba' },
        { label:'Off-market',   date:'Sep 10, 2025', detail:'Prior listing withdrawn' },
        { label:'Sold (prior)', date:'Apr 03, 2019', detail:'$468k · current owner bought' },
      ]} />
    </Box>

    {/* Owner info */}
    <Box>
      <div className="hand-alt" style={{ fontSize: 14 }}>Owner · public records</div>
      <Hr />
      <div className="row between"><span className="tiny muted">Owner</span><span className="tiny">R. Hernandez</span></div>
      <div className="row between"><span className="tiny muted">Mailing addr</span><span className="tiny">same as property</span></div>
      <div className="row between"><span className="tiny muted">Phone (likely)</span><span className="tiny mono">(312) 555-0142</span></div>
      <div className="row between"><span className="tiny muted">Owned since</span><span className="tiny">Apr 2019 · 7 yrs</span></div>
      <div className="row between"><span className="tiny muted">Equity est.</span><span className="tiny">~$380k (59%)</span></div>
    </Box>

    {/* Quick actions row */}
    <div className="row wrap" style={{ gap: 6 }}>
      <Btn sm>✉ Letter</Btn>
      <Btn sm>📧 Email</Btn>
      <Btn sm>📝 Add note</Btn>
      <Btn sm tan>AI angle ✦</Btn>
      <Btn sm>→ CRM</Btn>
    </div>

    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 13 }}>✦ AI angle</div>
      <div className="tiny" style={{ marginTop: 4 }}>
        Priced 8% over closed comps. Two reductions didn't move it. Lead with <i>"I have three buyers who passed at $649k but would offer at $599k — want to see the comp set?"</i>
      </div>
    </Box>
  </Phone>;
}

// ============================================================
// MOBILE · Expired list WITH tap-to-call/text inline
// ============================================================
function AddrV2_ExpiredListTap() {
  const rows = [
    { addr:'114 Maple St', sub:'3bd · $649k · 142 DOM', status:'expired', hot: true, phone:'(312) 555-0142' },
    { addr:'22 Pine Ave',  sub:'4bd · $899k · 98 DOM',  status:'expired', hot: false, phone:'(312) 555-0188' },
    { addr:'9 Juniper Ct', sub:'3bd · $725k · sold Jul 2025', status:'sold', hot: false, phone:null, warn:'sold 9 months ago — skip' },
    { addr:'44 Cedar Ln',  sub:'4bd · $1.1M · UC Mar 30', status:'uc', hot: false, phone:null, warn:'under contract — skip for now' },
    { addr:'8 Birch Dr',   sub:'3bd · $579k · back on market', status:'active', hot: false, phone:'(312) 555-0233', warn:'re-listed 5 days ago — different agent' },
    { addr:'77 Walnut Way', sub:'5bd · $1.4M · pending', status:'pending', hot: false, phone:null, warn:'pending — track for fall-through' },
  ];
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="hand-neat">← Expired Listings</span>
      <Chip sm>↻ re-run all</Chip>
    </div>
    <div className="tiny muted mono">LAST RE-RUN · 12 MIN AGO · 2 CHANGED STATUS</div>

    <div className="row wrap" style={{ gap: 4 }}>
      <Chip filled>All 42</Chip>
      <Chip>Clean 38</Chip>
      <Chip rose>Status changed 2</Chip>
      <Chip tan>Hot 3</Chip>
    </div>

    {rows.map((r, i) => (
      <Box key={i} style={{ padding: 12, opacity: r.warn && r.status !== 'active' ? 0.72 : 1 }}>
        <div className="row between center">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hand-neat" style={{ fontSize: 14 }}>{r.addr}</div>
            <div className="tiny muted">{r.sub}</div>
          </div>
          <StatusChip status={r.status} />
        </div>
        {r.warn && (
          <div style={{
            marginTop: 6, padding:'4px 8px', borderRadius: 8,
            background: r.status === 'active' ? '#f2d9cc' : '#ede4d0',
            color: r.status === 'active' ? '#6d3a2c' : '#6b5c3e',
            fontSize: 11, fontWeight: 500,
          }}>⚠ {r.warn}</div>
        )}
        {/* Tap row — only if prospect-able */}
        {r.phone ? (
          <div style={{ display:'flex', gap: 6, marginTop: 8 }}>
            <div style={{ flex: 1 }}><TapCall number={r.phone} compact /></div>
            <div style={{ flex: 1 }}><TapText number={r.phone} compact /></div>
            <button style={{
              width: 32, height: 32, borderRadius: 8,
              background:'#fbf5ea', border:'1.5px solid var(--line)',
              fontSize: 14, padding: 0,
            }}>⋯</button>
          </div>
        ) : (
          <div style={{ marginTop: 6, fontSize: 11, color:'var(--muted)' }}>
            no outreach — revisit after status clears
          </div>
        )}
      </Box>
    ))}

    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 13 }}>✦ Re-run logic</div>
      <div className="tiny" style={{ marginTop: 4 }}>
        Every address is re-checked against MLS + public records before you see it. Active, UC, pending, or sold-in-last-12-months get flagged and pushed to the bottom so you don't waste a call.
      </div>
    </Box>
  </Phone>;
}

// ============================================================
// DESKTOP · Full address detail (Command Center view)
// ============================================================
function AddrV3_DesktopDetail() {
  return <Desktop active="Prospect" url="command.app/address/114-maple-st">
    <div className="row between center">
      <div>
        <div className="tiny mono muted">ADDRESS INTEL</div>
        <span className="serif" style={{ fontSize: 22 }}>114 Maple St, Oak Park IL 60302</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>↻ re-run MLS</Btn>
        <Btn sm>↻ refresh public records</Btn>
        <Btn sm primary>+ add to campaign</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 12 }}>
      {/* Left: status + history */}
      <div className="col grow" style={{ gap: 12 }}>
        {/* Status banner */}
        <Box style={{ padding: 14, background:'#f8f1e3', border:'1.5px solid #e0d5c2' }}>
          <div className="row between center">
            <div className="tiny mono muted">STATUS · checked 2 min ago via MLS feed</div>
            <div className="row" style={{ gap: 4 }}>
              <Chip sm>auto-refresh daily</Chip>
              <Chip sm filled>alerts on ↑</Chip>
            </div>
          </div>
          <div className="row" style={{ gap: 10, alignItems:'center', marginTop: 8 }}>
            <StatusChip status="expired" />
            <span className="tiny muted">since Apr 14 · 142 DOM · not sold in the past 12 months</span>
          </div>
          <Hr />
          <div className="row" style={{ gap: 8, flexWrap:'wrap' }}>
            <Chip sm sage>✓ Not active</Chip>
            <Chip sm sage>✓ Not under contract</Chip>
            <Chip sm sage>✓ Not pending</Chip>
            <Chip sm sage>✓ Not sold past 12mo</Chip>
            <Chip sm sage>✓ Not withdrawn</Chip>
            <Chip sm filled>→ safe to prospect</Chip>
          </div>
        </Box>

        {/* Map — big on desktop */}
        <Box style={{ padding: 0 }}>
          <AddressMap height={320} zoomLevel={16} />
        </Box>

        {/* 12-month history */}
        <Box>
          <div className="row between center">
            <div className="hand-alt" style={{ fontSize: 15 }}>12-month status history</div>
            <Chip sm>MLS + tax records</Chip>
          </div>
          <Hr />
          <StatusTimeline events={[
            { label:'Expired',       date:'Apr 14, 2026', detail:'142 DOM · listed $649k · no accepted offers', current: true },
            { label:'Price cut #2',  date:'Feb 18, 2026', detail:'$679k → $649k (−$30k, −4.4%)' },
            { label:'Showing lull',  date:'Jan 20, 2026', detail:'No showings logged for 18 days' },
            { label:'Price cut #1',  date:'Jan 08, 2026', detail:'$699k → $679k (−$20k, −2.9%)' },
            { label:'Listed',        date:'Nov 22, 2025', detail:'Coldwell · $699k · 3bd/2ba/1842 sqft' },
            { label:'Off-market',    date:'Sep 10, 2025', detail:'Prior listing withdrawn' },
            { label:'Listed (prior)',date:'Jul 15, 2025', detail:'First attempt · $725k · withdrawn after 8 weeks' },
          ]} />
        </Box>

        {/* Comparable closed sales — proves "not sold recently" context */}
        <Box>
          <div className="hand-alt" style={{ fontSize: 15 }}>Closed comps · past 12 months (within 0.5 mi)</div>
          <Hr />
          <table className="wf-table">
            <thead><tr><th>Address</th><th>Sold</th><th>Price</th><th>$/sqft</th><th>DOM</th><th>vs 114 Maple</th></tr></thead>
            <tbody>
              <tr><td>98 Maple St</td><td className="mono">Mar 2026</td><td className="mono">$595k</td><td className="mono">$312</td><td>42</td><td><Chip sm sage>−$54k</Chip></td></tr>
              <tr><td>220 Pine Ave</td><td className="mono">Feb 2026</td><td className="mono">$614k</td><td className="mono">$298</td><td>38</td><td><Chip sm sage>−$35k</Chip></td></tr>
              <tr><td>41 Oak St</td><td className="mono">Jan 2026</td><td className="mono">$628k</td><td className="mono">$315</td><td>29</td><td><Chip sm>−$21k</Chip></td></tr>
              <tr><td>7 Cedar Ln</td><td className="mono">Nov 2025</td><td className="mono">$599k</td><td className="mono">$305</td><td>51</td><td><Chip sm sage>−$50k</Chip></td></tr>
            </tbody>
          </table>
          <div className="tiny muted" style={{ marginTop: 6 }}>
            Median closed: <b>$609k</b> · this listing was $40k above. Pricing issue, not demand issue.
          </div>
        </Box>
      </div>

      {/* Right rail: owner + contact */}
      <div className="col" style={{ gap: 12, width: 320, flexShrink: 0 }}>
        {/* Owner card */}
        <Box>
          <div className="hand-alt" style={{ fontSize: 15 }}>Owner · public records</div>
          <Hr />
          <div className="row between"><span className="tiny muted">Owner</span><span className="tiny">Ruben Hernandez</span></div>
          <div className="row between"><span className="tiny muted">Owned since</span><span className="tiny">Apr 2019 · 7 yrs</span></div>
          <div className="row between"><span className="tiny muted">Purchase price</span><span className="tiny mono">$468k</span></div>
          <div className="row between"><span className="tiny muted">Est. equity</span><span className="tiny mono">~$380k (59%)</span></div>
          <div className="row between"><span className="tiny muted">Mailing addr</span><span className="tiny">same</span></div>
          <Hr />
          <div className="tiny mono muted">BEST CONTACT · matched via skip-trace</div>
          <div className="row between" style={{ marginTop: 4 }}>
            <span className="tiny">Mobile</span>
            <span className="tiny mono">(312) 555-0142</span>
          </div>
          <div className="row between">
            <span className="tiny">Home</span>
            <span className="tiny mono">(312) 555-0188</span>
          </div>
          <div className="row between">
            <span className="tiny">Email</span>
            <span className="tiny">r.hernandez@…</span>
          </div>
          <div className="row between">
            <span className="tiny">DNC list</span>
            <span className="tiny"><Chip sm sage>✓ clear</Chip></span>
          </div>
        </Box>

        {/* Tap-to-call / tap-to-text — primary CTAs */}
        <Box style={{ padding: 14 }}>
          <div className="hand-alt" style={{ fontSize: 14 }}>Reach out</div>
          <div className="tiny muted">One tap. Logged to CRM automatically.</div>
          <div style={{ display:'flex', gap: 8, marginTop: 10 }}>
            <div style={{ flex: 1 }}><TapCall /></div>
            <div style={{ flex: 1 }}><TapText /></div>
          </div>
          <Hr />
          <div className="tiny mono muted">SUGGESTED OPENER · expired · Ferry</div>
          <div className="tiny" style={{ marginTop: 4, fontStyle:'italic' }}>
            "Hi Ruben — I'm Dana Massey, a realtor here in Oak Park. I noticed your home just came off the market and wanted to understand what happened before you relist…"
          </div>
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            <Btn sm ghost>swap script</Btn>
            <Btn sm ghost>AI custom ✦</Btn>
          </div>
        </Box>

        {/* Outcome logger */}
        <Box dashed>
          <div className="hand-alt" style={{ fontSize: 13 }}>After the call</div>
          <div className="col" style={{ gap: 4, marginTop: 4 }}>
            {['Answered — interested','Answered — not interested','Voicemail','No answer','Bad number','DNC requested'].map(x=>
              <Chip key={x} sm style={{ justifyContent:'flex-start' }}>{x}</Chip>
            )}
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

// ============================================================
// MOBILE · Map-first prospecting (interactive)
// ============================================================
function AddrV4_MobileMapProspect() {
  return <Phone tabbarItems={[{label:'Home'},{label:'Prospect',active:true},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="row between center">
      <span className="serif" style={{ fontSize: 16 }}>Prospect · Map</span>
      <div className="row" style={{ gap: 4 }}>
        <Chip sm>List</Chip>
        <Chip filled sm>Map</Chip>
      </div>
    </div>

    {/* Filter chips */}
    <div className="row wrap" style={{ gap: 4 }}>
      <Chip rose dot>Expired 12</Chip>
      <Chip tan dot>FSBO 6</Chip>
      <Chip sage dot>SOI 40</Chip>
      <Chip>+ layer</Chip>
    </div>

    {/* Big map */}
    <AddressMap height={340} zoomLevel={15} />

    {/* Selected pin card */}
    <Box style={{ padding: 12 }}>
      <div className="row between center">
        <div>
          <div className="hand-neat" style={{ fontSize: 14 }}>114 Maple St</div>
          <div className="tiny muted">3bd · $649k · 142 DOM</div>
        </div>
        <StatusChip status="expired" />
      </div>
      <div style={{ display:'flex', gap: 6, marginTop: 10 }}>
        <div style={{ flex: 1 }}><TapCall compact /></div>
        <div style={{ flex: 1 }}><TapText compact /></div>
        <button style={{
          width: 32, height: 32, borderRadius: 8,
          background:'#fbf5ea', border:'1.5px solid var(--line)',
          fontSize: 14,
        }}>→</button>
      </div>
    </Box>
  </Phone>;
}

// ---------- Register screens ----------
window.AddressScreens = [
  { id:'ad1', label:'Mobile · Address lookup + re-run', caption:'Every address, before you contact — active/UC/pending/sold-past-12mo check, full history timeline, interactive map, tap-to-call/text.', Component: AddrV1_MobileLookup },
  { id:'ad2', label:'Mobile · Expired list · status-aware', caption:'Re-run all at once. Anything newly active, UC, pending, or recently sold gets flagged + pushed down. Tap-to-call/text inline.', Component: AddrV2_ExpiredListTap },
  { id:'ad3', label:'Desktop · Full address intel', caption:'Status banner, pass/fail checks, big zoomable map, 12-month history, closed comps, owner + skip-trace contacts.', Component: AddrV3_DesktopDetail },
  { id:'ad4', label:'Mobile · Map-first prospecting', caption:'Interactive map with zoom · layer toggles · one-tap call/text from selected pin.', Component: AddrV4_MobileMapProspect },
];

// ============================================================
// Dynamic Open House QR — one code, swaps to active OH by date/time
// ============================================================

function QRV1_Smart() {
  const upcoming = [
    { when:'SAT · Apr 18 · 2–4pm', addr:'42 Oak St', tag:'🟢 ACTIVE now · 1:48pm', active:true },
    { when:'SAT · Apr 18 · 2–4pm', addr:'220 Birch Ave', tag:'starts in 12 min (2nd active)', active:false },
    { when:'SUN · Apr 19 · 1–3pm', addr:'88 Elm Ave', tag:'tomorrow', active:false },
    { when:'SAT · Apr 25 · 2–4pm', addr:'9 Juniper Ct', tag:'next week', active:false },
  ];
  return <Desktop active="Open House" url="command.app/openhouse/qr">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Smart open house QR <span className="tiny muted">· one code · auto-routes</span></span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>print poster</Btn>
        <Btn sm primary>↓ download QR · PNG + SVG</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 320, flexShrink: 0, textAlign: 'center' }}>
        <div className="hand-alt">Your permanent QR</div>
        <div className="tiny muted">command.link/dana-oh</div>
        <div style={{
          width: 220, height: 220, margin: '14px auto',
          border: '1px solid var(--line)', borderRadius: 12,
          background: `
            repeating-linear-gradient(0deg, var(--ink) 0 4px, transparent 4px 8px),
            repeating-linear-gradient(90deg, var(--ink) 0 4px, transparent 4px 8px),
            var(--paper)`,
          backgroundBlendMode: 'multiply',
          display:'flex', alignItems:'center', justifyContent:'center',
          position: 'relative',
        }}>
          <div style={{ position:'absolute', inset: 20, background:
            'repeating-conic-gradient(var(--ink) 0% 25%, var(--paper) 25% 50%)',
            backgroundSize: '22px 22px', borderRadius: 6, opacity: 0.95 }} />
          <div style={{ position:'absolute', width: 46, height: 46, background:'var(--paper)',
            border:'3px solid var(--ink)', borderRadius: 10,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--font-display)', fontSize: 20 }}>✦</div>
        </div>
        <div className="tiny" style={{ marginTop: 4 }}>Print once. Keep it in every open house bag.</div>
        <div className="tiny muted">Resolves to the right property at scan time.</div>
      </Box>

      <Box className="grow">
        <div className="hand-alt">How it decides</div>
        <Hr />
        <div className="tiny" style={{ lineHeight: 1.7 }}>
          <div>① Scans today between <b>11am – 6pm</b> → look for open houses within that window</div>
          <div>② Single active OH → <b>auto-route</b> to it (sign-in form pre-filled w/ address)</div>
          <div>③ Two active at the same time → show <b>chooser</b> ("Which one are you at?")</div>
          <div>④ No active OH → show <b>upcoming 3</b> + "browse my listings"</div>
          <div>⑤ Outside of any window → link to <b>bio page</b></div>
        </div>
        <Hr />
        <div className="hand-alt">Live right now</div>
        <div className="row between center" style={{
          padding: 10, marginTop: 4,
          background: 'var(--paper-2)', borderRadius: 8, border: '1px solid var(--line)'
        }}>
          <div>
            <Chip sage>🟢 ACTIVE</Chip>
            <span style={{ fontWeight: 500, marginLeft: 8 }}>42 Oak St</span>
            <span className="tiny muted" style={{ marginLeft: 8 }}>scans → /oh/42-oak</span>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <span className="mono tiny">14 scans today</span>
            <Btn sm ghost>view sign-ins →</Btn>
          </div>
        </div>

        <Hr />
        <div className="hand-alt">Upcoming (auto-populated from calendar)</div>
        {upcoming.map((u,i)=>(
          <div key={i} className="row between center" style={{
            padding:'6px 0', borderBottom:'1px dashed var(--line)'
          }}>
            <div>
              <div style={{ fontWeight: u.active ? 600 : 500 }}>{u.addr}</div>
              <div className="tiny muted">{u.when}</div>
            </div>
            <Chip sm className={u.active ? 'sage' : ''}>{u.tag}</Chip>
          </div>
        ))}
      </Box>
    </div>

    <Box dashed>
      <div className="hand-alt">✦ Override — "I'm here but it's not picking the right one"</div>
      <div className="tiny muted">Visitors always see this fallback picker one tap away — in case the logic misfires.</div>
      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        {/* visitor-view preview */}
        <Box style={{ width: 280, background:'var(--paper)', border:'1px solid var(--line)' }}>
          <div className="tiny mono muted">VISITOR'S PHONE</div>
          <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>Welcome! 👋</div>
          <div className="tiny muted">Which open house are you at?</div>
          <Hr />
          <div style={{ padding: 10, background:'var(--paper-2)', borderRadius: 6, border: '1px solid var(--accent-sage)' }}>
            <div className="tiny mono" style={{ color:'var(--accent-sage)' }}>DETECTED (you're ~40ft away)</div>
            <div style={{ fontWeight: 600 }}>42 Oak St</div>
            <div className="tiny muted">2–4pm · Chen Family listing</div>
            <Btn primary sm style={{ marginTop: 6 }}>yes, continue →</Btn>
          </div>
          <div className="tiny muted" style={{ marginTop: 10 }}>or pick another:</div>
          <Chip sm style={{ display:'block', margin:'4px 0' }}>220 Birch · 2–4pm</Chip>
          <Chip sm style={{ display:'block', margin:'4px 0' }}>88 Elm · tomorrow 1–3pm</Chip>
          <div className="tiny muted" style={{ marginTop: 6 }}>not at an open house? → <u>browse listings</u></div>
        </Box>

        <Box style={{ width: 280, background:'var(--paper)', border:'1px solid var(--line)' }}>
          <div className="tiny mono muted">NEXT SCREEN · SIGN-IN</div>
          <div className="serif" style={{ fontSize: 16, marginTop: 4 }}>42 Oak St · sign-in</div>
          <Hr />
          <Input placeholder="first name" />
          <Input placeholder="phone" />
          <Input placeholder="working with an agent?" />
          <Check checked>Text me new listings in this area</Check>
          <Check>Send the buyer guide (PDF)</Check>
          <Btn primary sm style={{ marginTop: 6 }}>Sign in ✓</Btn>
          <div className="tiny muted" style={{ marginTop: 6 }}>Goes straight to CRM · auto-tagged "42 Oak · OH Apr 18"</div>
        </Box>
      </div>
    </Box>

    <Box>
      <div className="hand-alt">Geo + time logic · advanced</div>
      <Hr />
      <div className="row" style={{ gap: 20, flexWrap:'wrap' }}>
        <div>
          <div className="tiny mono muted">DETECTION RADIUS</div>
          <div style={{ fontWeight: 500 }}>200 ft</div>
          <div className="tiny muted">if GPS confident</div>
        </div>
        <div>
          <div className="tiny mono muted">TIME WINDOW</div>
          <div style={{ fontWeight: 500 }}>30 min before → 30 min after</div>
        </div>
        <div>
          <div className="tiny mono muted">TIE-BREAKER</div>
          <div style={{ fontWeight: 500 }}>Closest address wins</div>
          <div className="tiny muted">else: chooser</div>
        </div>
        <div>
          <div className="tiny mono muted">FALLBACK URL</div>
          <div style={{ fontWeight: 500 }}>dana.bio/openhouses</div>
        </div>
      </div>
    </Box>
  </Desktop>;
}

function QRV2_VisitorFlow() {
  return <Phone tabbarItems={[]}>
    <div style={{ padding: 14 }}>
      <div className="tiny mono muted">VISITOR SCANNED THE QR</div>
      <div className="serif" style={{ fontSize: 22, marginTop: 2 }}>Welcome! 👋</div>
      <div className="tiny muted">Thanks for stopping by.</div>

      <div style={{ marginTop: 14, padding: 12, background:'var(--paper-2)', borderRadius: 10, border:'1px solid var(--accent-sage)' }}>
        <div className="tiny mono" style={{ color:'var(--accent-sage)' }}>📍 YOU'RE AT</div>
        <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>42 Oak St</div>
        <div className="tiny muted">Sat 2–4pm · Chen Family</div>
        <Btn primary style={{ marginTop: 8, justifyContent:'center' }}>yes, continue →</Btn>
      </div>

      <div className="tiny muted" style={{ marginTop: 12 }}>Not quite? Pick another:</div>
      <Chip sm style={{ display:'block', margin:'6px 0' }}>220 Birch · Sat 2–4pm (also live)</Chip>
      <Chip sm style={{ display:'block', margin:'6px 0' }}>88 Elm · tomorrow 1–3pm</Chip>
      <Chip sm style={{ display:'block', margin:'6px 0' }}>9 Juniper · next Sat</Chip>

      <Hr />
      <div className="tiny muted">Not at an open house?</div>
      <Btn sm ghost style={{ marginTop: 4 }}>browse Dana's listings →</Btn>
    </div>
  </Phone>;
}

function QRV3_Posters() {
  return <Desktop active="Open House" url="command.app/openhouse/qr/posters">
    <div className="hand-neat tiny muted">← QR · printables</div>
    <span className="serif" style={{ fontSize: 22 }}>Poster templates <span className="tiny muted">(print & reuse)</span></span>
    <div className="row" style={{ gap: 10, flexWrap:'wrap' }}>
      {[
        ['Table tent · 5×7','For the sign-in table'],
        ['Window cling · 8.5×11','Stick inside front window'],
        ['Lawn sign rider','12×6 · velcro to sign'],
        ['Door jamb','4×9 · hang from knob'],
        ['Business card back','2×3.5 · keep a stack'],
        ['IG story frame','9×16 · screen-only'],
      ].map(([n,s],i)=>(
        <Box key={n} style={{ width: 170 }}>
          <div style={{
            height: 120, background:'var(--paper-2)',
            border:'1px dashed var(--line)', borderRadius: 6,
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 4,
          }}>
            <div style={{ width: 60, height: 60, background:
              'repeating-linear-gradient(0deg, var(--ink) 0 3px, transparent 3px 6px),repeating-linear-gradient(90deg, var(--ink) 0 3px, transparent 3px 6px)' }} />
            <div className="tiny">scan for info</div>
          </div>
          <div style={{ fontWeight: 500, marginTop: 6 }}>{n}</div>
          <div className="tiny muted">{s}</div>
          <Btn sm ghost style={{ marginTop: 4 }}>download PDF</Btn>
        </Box>
      ))}
    </div>
    <Box dashed>
      <div className="hand-alt">Why one QR forever</div>
      <div className="tiny">You print these once. The code never changes. Whatever the listing is, whatever the date — scans route correctly. No reprinting per OH.</div>
    </Box>
  </Desktop>;
}

window.OpenHouseQRScreens = [
  { id:'qr1', label:'V1 · Smart QR control', caption:'One permanent code. Routes by date + time + geo. Live/upcoming list. Visitor preview.', Component: QRV1_Smart },
  { id:'qr2', label:'V2 · Visitor experience', caption:'What the scanner sees — auto-detected property + one-tap override.', Component: QRV2_VisitorFlow },
  { id:'qr3', label:'V3 · Printables', caption:'Every format you\'d ever need — print once, use forever.', Component: QRV3_Posters },
];

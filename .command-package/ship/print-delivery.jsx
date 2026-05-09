/* ============================================================
   PRINT & DELIVERY
   3 sources (title co / local / DIY) · walk-route planning
   · magic buyer letters · master queue
   8 screens · uses wireframe kit (Box, Btn, Chip, Input, Hr, Desktop)
   ============================================================ */

// =============================================================
// V1 · Print source picker — "who prints this?"
// =============================================================
function PD_V1_SourcePicker() {
  return <Desktop active="Content" url="command.app/print/new">
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny muted" style={{ textTransform:'uppercase', letterSpacing: 1.5 }}>New print order · step 1 of 3</div>
          <span className="serif" style={{ fontSize: 26 }}>Who's printing this?</span>
        </div>
        <Chip>draft · 0 items</Chip>
      </div>
      <div className="tiny muted" style={{ marginTop: 4, maxWidth: 560 }}>
        Three options. Command handles the handoff no matter which you pick — but the flow, cost, and turnaround are different.
      </div>

      <div className="row" style={{ gap: 12, alignItems: 'stretch', marginTop: 14 }}>
        {/* Option 1 · Title company */}
        <Box sage className="grow" style={{ position: 'relative', flex: 1 }}>
          <div style={{ position: 'absolute', top: 10, right: 10 }}>
            <Chip sage dot>most common</Chip>
          </div>
          <div className="hand-neat" style={{ fontSize: 15 }}>Title company</div>
          <div className="tiny muted mono">Landmark Title · co-branded program</div>
          <Hr />
          <div className="tiny" style={{ lineHeight: 1.8 }}>
            <div><b>Cost to you:</b> $0 — co-marketing benefit</div>
            <div><b>Turnaround:</b> 2–3 business days</div>
            <div><b>Co-branded:</b> their logo + yours, every piece</div>
            <div><b>Shipping:</b> delivered to your office</div>
            <div><b>Limits:</b> ~400 pcs / mo · postcards, flyers, door hangers</div>
          </div>
          <Hr />
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <Chip sm>postcards</Chip>
            <Chip sm>flyers</Chip>
            <Chip sm>door hangers</Chip>
          </div>
          <Btn primary style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}>Use Landmark Title →</Btn>
        </Box>

        {/* Option 2 · Local printer */}
        <Box className="grow" style={{ flex: 1 }}>
          <div className="hand-neat" style={{ fontSize: 15 }}>Local printer</div>
          <div className="tiny muted mono">Nine Dots Print Co. · Tempe</div>
          <Hr />
          <div className="tiny" style={{ lineHeight: 1.8 }}>
            <div><b>Cost to you:</b> $0.18–$2.40 / piece · card on file</div>
            <div><b>Turnaround:</b> same-day or next-day</div>
            <div><b>Co-branded:</b> your brand only</div>
            <div><b>Pickup:</b> you drive · or $12 courier</div>
            <div><b>Limits:</b> unlimited volume · any format incl. canvas + signs</div>
          </div>
          <Hr />
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <Chip sm>all formats</Chip>
            <Chip sm>yard signs</Chip>
            <Chip sm tan>rush ok</Chip>
          </div>
          <Btn style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}>Use Nine Dots →</Btn>
        </Box>

        {/* Option 3 · DIY */}
        <Box dashed className="grow" style={{ flex: 1 }}>
          <div className="hand-neat" style={{ fontSize: 15 }}>Print at home</div>
          <div className="tiny muted mono">Your printer · your paper</div>
          <Hr />
          <div className="tiny" style={{ lineHeight: 1.8 }}>
            <div><b>Cost to you:</b> ~$0.10 / page</div>
            <div><b>Turnaround:</b> now</div>
            <div><b>Co-branded:</b> your brand only</div>
            <div><b>Output:</b> print-ready PDF</div>
            <div><b>Good for:</b> magic buyer letters · small runs · urgent</div>
          </div>
          <Hr />
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <Chip sm>letter</Chip>
            <Chip sm>flyer</Chip>
            <Chip sm>&lt; 50 pcs</Chip>
          </div>
          <Btn ghost style={{ width: '100%', marginTop: 12, justifyContent: 'center' }}>DIY PDF →</Btn>
        </Box>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <Box dashed className="grow">
          <div className="hand-alt tiny">When to pick what</div>
          <div className="tiny" style={{ marginTop: 6, lineHeight: 1.8 }}>
            <b>Title co:</b> default for farm postcards, just-listed, OH cards. Free. Slightly slower.<br/>
            <b>Local printer:</b> fast, weird formats (canvas, photo, yard signs), rush jobs.<br/>
            <b>DIY:</b> magic buyer letters (authenticity), gifts, tiny batches.
          </div>
        </Box>
        <Box dashed className="grow">
          <div className="hand-alt tiny">What Command remembers</div>
          <div className="tiny" style={{ marginTop: 6, lineHeight: 1.8 }}>
            Default source per piece-type. Last-used printer. Landmark's monthly usage (no co-marketing blowouts). Your home printer's ink level from last job.
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

// =============================================================
// V2 · Title company program — co-branded usage dashboard
// =============================================================
function PD_V2_TitleCo() {
  return <Desktop active="Content" url="command.app/print/landmark">
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="hand-alt tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>Print · Landmark Title program</div>
      <span className="serif" style={{ fontSize: 26 }}>Your co-branded mailers <span className="tiny muted">· April</span></span>

      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        <Box sage className="grow" style={{ flex: 1 }}>
          <div className="tiny mono" style={{ opacity: 0.7 }}>USED · APR</div>
          <div className="hand-alt" style={{ fontSize: 30 }}>247 <span className="tiny mono muted">/ 400</span></div>
          <Bar pct={62} color="var(--accent-sage)" />
          <div className="tiny muted" style={{ marginTop: 4 }}>153 pcs remain · resets May 1</div>
        </Box>
        <Box className="grow" style={{ flex: 1 }}>
          <div className="tiny mono muted">YOUR REP</div>
          <div className="hand-neat" style={{ fontSize: 15 }}>Kyla Andersen</div>
          <div className="tiny muted">Landmark Title · Scottsdale</div>
          <Hr />
          <div className="tiny">kyla@landmarktitle.com · 602-555-0142</div>
          <Btn sm style={{ marginTop: 6 }}>Message rep →</Btn>
        </Box>
        <Box className="grow" style={{ flex: 1 }}>
          <div className="tiny mono muted">COST TO YOU</div>
          <div className="hand-alt" style={{ fontSize: 30 }}>$0</div>
          <div className="tiny muted">fair-market value: $312 · disclosed on 1099</div>
        </Box>
      </div>

      <Box style={{ marginTop: 14 }}>
        <div className="row between center">
          <div className="hand-alt">This month's orders</div>
          <Btn sm primary>+ New order</Btn>
        </div>
        <Hr />
        <table className="wf-table">
          <thead><tr>
            <th>Piece</th><th>Qty</th><th>Sent</th><th>Status</th><th>Audience</th><th></th>
          </tr></thead>
          <tbody>
            {[
              ['Just-Listed · 2222 Yellow Wood', 120, 'Apr 14', 'delivered', 'Olive Park farm', 'reorder'],
              ['Just-Sold · 18 Cedar',           95,  'Apr 10', 'delivered', 'within ½ mi',     'reorder'],
              ['Market update · April',          32,  'Apr 7',  'delivered', 'SOI · top 40',    'view'],
              ['Open House · 2222 YW',           '—', 'Apr 6',  'in production',  'neighbors',  '—'],
            ].map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j}>{c === '—' ? <span className="muted">—</span> : c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </Box>

      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        <Box tan className="grow">
          <div className="hand-neat" style={{ fontSize: 14 }}>Heads up · 153 pieces left</div>
          <div className="tiny" style={{ marginTop: 4 }}>At this pace you'll hit the cap ~Apr 26. If you need more: talk to Kyla about a program bump, or route the overflow to Nine Dots.</div>
        </Box>
        <Box dashed className="grow">
          <div className="hand-alt tiny">Co-mark compliance</div>
          <div className="tiny" style={{ marginTop: 6, lineHeight: 1.7 }}>
            Every piece shows Landmark's logo at equal prominence. Required by RESPA. Command enforces this on every template — you can't accidentally strip the co-brand.
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

// =============================================================
// V3 · Local printer — price compare + cart
// =============================================================
function PD_V3_LocalPrinter() {
  return <Desktop active="Content" url="command.app/print/local/cart">
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="hand-alt tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>Local printer · Nine Dots · Tempe</div>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 26 }}>Cart <span className="tiny muted">· 3 items · $286.40</span></span>
        <div className="row" style={{ gap: 6 }}>
          <Chip sage dot>rush available</Chip>
          <Btn sm>compare printers</Btn>
        </div>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 10 }}>
        <div className="grow" style={{ flex: 2 }}>
          {[
            ['Magic buyer letter', '45 pcs · letter · single-sided', '$0.18 / pc', '$8.10'],
            ['Yard sign', '4 pcs · 18×24 · corrugated + stakes', '$48.00 / pc', '$192.00'],
            ['Window cling', '2 pcs · 12×18 · vinyl', '$43.15 / pc', '$86.30'],
          ].map((r, i) => (
            <Box key={i}>
              <div className="row between center">
                <div>
                  <div className="hand-neat">{r[0]}</div>
                  <div className="tiny muted mono">{r[1]}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="tiny muted mono">{r[2]}</div>
                  <div className="hand-alt" style={{ fontSize: 18 }}>{r[3]}</div>
                </div>
              </div>
              <Hr />
              <div className="row" style={{ gap: 6 }}>
                <Btn sm ghost>preview</Btn>
                <Btn sm ghost>edit</Btn>
                <Btn sm ghost>remove</Btn>
              </div>
            </Box>
          ))}

          <Box dashed>
            <div className="row between center">
              <span className="hand-neat tiny">+ Add from library</span>
              <Btn sm ghost>browse templates</Btn>
            </div>
          </Box>
        </div>

        <div style={{ flex: 1 }}>
          <Box>
            <div className="hand-alt" style={{ fontSize: 15 }}>Summary</div>
            <Hr />
            <div className="row between tiny mono"><span>Subtotal</span><span>$286.40</span></div>
            <div className="row between tiny mono"><span>Rush fee</span><span className="muted">— skip</span></div>
            <div className="row between tiny mono"><span>Tax</span><span>$23.62</span></div>
            <Hr />
            <div className="row between"><b>Total</b><b>$310.02</b></div>
            <div className="tiny muted" style={{ marginTop: 4 }}>charged to •••• 4418</div>
          </Box>

          <Box>
            <div className="hand-alt tiny">Turnaround</div>
            <div className="hand-neat" style={{ fontSize: 14, marginTop: 4 }}>ready <b>Fri 3pm</b></div>
            <div className="tiny muted mono">2 business days · standard</div>
            <Hr />
            <Chip sm>□ pickup</Chip>
            <Chip sm filled>✓ courier · $12</Chip>
          </Box>

          <Box sage>
            <div className="tiny" style={{ opacity: 0.8 }}>PRICE CHECK</div>
            <div className="hand-neat" style={{ fontSize: 13, marginTop: 4 }}>Nine Dots is cheapest on the letter + signs. Vistaprint is cheaper on the cling (by $6) but adds 3 days.</div>
          </Box>

          <Btn primary style={{ width: '100%', justifyContent: 'center', padding: 12 }}>Place order — $310.02</Btn>
        </div>
      </div>
    </div>
  </Desktop>;
}

// =============================================================
// V4 · DIY PDF — magic buyer letter preview before print
// =============================================================
function PD_V4_DIYLetter() {
  return <Desktop active="Content" url="command.app/print/diy/letter-preview">
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="hand-alt tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>DIY · print at home · step 3 of 3</div>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 26 }}>Ready to print <span className="tiny muted">· 47 letters · Olive Park</span></span>
        <Btn primary>↓ download PDF (47 pages)</Btn>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 10 }}>
        {/* Letter preview */}
        <Box className="grow" style={{ flex: 2, padding: 24, background: 'var(--paper-2)' }}>
          <div className="tiny muted mono">PREVIEW · page 1 of 47 · "The Parks"</div>
          <Hr />
          <div style={{ padding: '20px 30px', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 4, minHeight: 400 }}>
            <div style={{ textAlign: 'right' }} className="tiny mono">Dana Massey, Realtor · Keller Williams<br/>480-555-0192 · dana@danamassey.realestate</div>
            <div style={{ marginTop: 22 }} className="tiny">April 17, 2026</div>
            <div style={{ marginTop: 16 }} className="tiny">The Homeowner<br/>1411 Olive Drive<br/>Scottsdale, AZ 85260</div>
            <div style={{ marginTop: 20, fontSize: 13, lineHeight: 1.7 }}>
              <div>Hi — Dana here.</div>
              <div style={{ marginTop: 10 }}>
                I'm writing on behalf of <b>Raj and Priya Park</b>. They're currently renting in Arcadia with their two kids and looking to buy into Olive Park specifically — they love the mature trees and the walk to Olive Elementary.
              </div>
              <div style={{ marginTop: 10 }}>
                They're pre-approved up to <b>$780k</b>, want 3+ bedrooms, and are flexible on timing. No contingencies. If you've ever thought about selling, I'd love a short conversation — no obligation.
              </div>
              <div style={{ marginTop: 10 }}>
                You can reach me at 480-555-0192, or scan the QR below and it routes straight to my private line.
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 60, height: 60, background: '#2a1d12', borderRadius: 4 }}></div>
                <div className="tiny muted">scan · tracks who replies</div>
              </div>
              <div style={{ marginTop: 20 }}>Warmly,<br/>Dana</div>
            </div>
          </div>
          <div className="row between" style={{ marginTop: 6 }}>
            <Btn sm ghost>← prev</Btn>
            <span className="tiny muted">1 / 47</span>
            <Btn sm ghost>next →</Btn>
          </div>
        </Box>

        {/* Controls */}
        <div style={{ flex: 1 }}>
          <Box>
            <div className="hand-alt" style={{ fontSize: 15 }}>Personalization</div>
            <Hr />
            <div className="tiny" style={{ lineHeight: 1.9 }}>
              <div className="row between"><span>Buyer family name</span><b>The Parks</b></div>
              <div className="row between"><span>Neighborhood</span><b>Olive Park</b></div>
              <div className="row between"><span>Recipients</span><b>47 parcels</b></div>
              <div className="row between"><span>QR tracks</span><b>✓ Dana line</b></div>
            </div>
            <Hr />
            <Btn sm ghost>edit letter text</Btn>
          </Box>

          <Box tan>
            <div className="hand-neat" style={{ fontSize: 13 }}>Buyer approval needed</div>
            <div className="tiny" style={{ marginTop: 4 }}>Because this letter speaks for Raj + Priya, Command needs their sign-off before you can print.</div>
            <Btn sm primary style={{ marginTop: 6 }}>Send for 1-click approval</Btn>
            <div className="tiny muted mono" style={{ marginTop: 4 }}>avg response: 42 min</div>
          </Box>

          <Box dashed>
            <div className="hand-alt tiny">Print settings</div>
            <div className="tiny" style={{ marginTop: 6, lineHeight: 1.7 }}>
              <div className="row between"><span>Paper</span><Chip sm>Letter · 8.5×11</Chip></div>
              <div className="row between"><span>Color</span><Chip sm>✓ color</Chip></div>
              <div className="row between"><span>Duplex</span><Chip sm>single-sided</Chip></div>
              <div className="row between"><span>Your ink</span><span className="mono tiny">HP 410 · 67%</span></div>
            </div>
          </Box>
        </div>
      </div>
    </div>
  </Desktop>;
}

// =============================================================
// V5 · Magic buyer letter · campaign builder
// =============================================================
function PD_V5_MagicCampaign() {
  return <Desktop active="Content" url="command.app/magic-letter/new">
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="hand-alt tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>Magic buyer letter · for the Parks</div>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 26 }}>Define the target <span className="tiny muted">· Olive Park · 3/2+ · &lt; $780k</span></span>
        <Chip sage dot>47 parcels match</Chip>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 10 }}>
        <Box className="grow" style={{ flex: 3, padding: 0, overflow: 'hidden' }}>
          <Img label="[ Olive Park polygon · 47 pins · MLS listings struck through ]" h={340} style={{ border: 'none', borderRadius: 0 }} />
        </Box>

        <div style={{ flex: 2 }}>
          <Box>
            <div className="hand-alt" style={{ fontSize: 15 }}>Targeting</div>
            <Hr />
            <div className="tiny" style={{ lineHeight: 1.9 }}>
              <div className="row between"><span>Area</span><b>Polygon · 0.42 sq mi</b></div>
              <div className="row between"><span>Min bed</span><b>3</b></div>
              <div className="row between"><span>Min bath</span><b>2</b></div>
              <div className="row between"><span>Min lot</span><b>6,500 sf</b></div>
              <div className="row between"><span>Built after</span><b>1975</b></div>
              <div className="row between"><span>Exclude</span><b>currently listed · 4</b></div>
              <div className="row between"><span>Exclude</span><b>sold &lt; 12 mo · 6</b></div>
            </div>
            <Hr />
            <Btn sm ghost>edit criteria</Btn>
          </Box>

          <Box sage>
            <div className="hand-neat" style={{ fontSize: 14 }}>Parcel math</div>
            <div className="tiny" style={{ marginTop: 4, lineHeight: 1.8 }}>
              <div className="row between"><span>Total in polygon</span><span>218</span></div>
              <div className="row between"><span>− already listed</span><span>−4</span></div>
              <div className="row between"><span>− sold recently</span><span>−6</span></div>
              <div className="row between"><span>− criteria filter</span><span>−161</span></div>
              <Hr />
              <div className="row between"><b>Reachable</b><b>47</b></div>
            </div>
          </Box>

          <Box tan>
            <div className="hand-neat" style={{ fontSize: 13 }}>Typical yield</div>
            <div className="tiny" style={{ marginTop: 4 }}>50-letter runs produce <b>1–3 replies</b> → typically <b>1 private showing</b> → ~30% convert to a deal. Cost ~$75. Cycle 2–6 weeks.</div>
          </Box>

          <Btn primary style={{ width: '100%', justifyContent: 'center', padding: 12 }}>Continue to letter →</Btn>
        </div>
      </div>
    </div>
  </Desktop>;
}

// =============================================================
// V6 · Walk route planner
// =============================================================
function PD_V6_WalkRoute() {
  return <Desktop active="Content" url="command.app/magic-letter/route">
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className="hand-alt tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>Walk route · Olive Park · Sat Apr 19</div>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 26 }}>45 doors · ~58 minutes</span>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>↓ export to iPhone Maps</Btn>
          <Btn sm primary>Start walking mode →</Btn>
        </div>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 10 }}>
        <Box className="grow" style={{ flex: 3, padding: 0, overflow: 'hidden', position: 'relative' }}>
          <Img label="[ optimized walking polyline · ~2.3 mi loop · starts/ends at your car ]" h={360} style={{ border: 'none', borderRadius: 0 }} />
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <Chip sage dot>start</Chip>
          </div>
          <div style={{ position: 'absolute', bottom: 10, right: 10 }}>
            <Chip tan>avg 1.3 min / door</Chip>
          </div>
        </Box>

        <div style={{ flex: 2 }}>
          <Box>
            <div className="hand-alt" style={{ fontSize: 15 }}>Route settings</div>
            <Hr />
            <div className="tiny" style={{ lineHeight: 1.9 }}>
              <div className="row between"><span>Start</span><b>Your car · 1400 Olive</b></div>
              <div className="row between"><span>Optimized for</span><b>shortest walk</b></div>
              <div className="row between"><span>Avoid</span><b>HOA no-solicit · 2</b></div>
              <div className="row between"><span>Gated entries</span><b>skip · 1</b></div>
              <div className="row between"><span>Total distance</span><b>2.3 mi</b></div>
              <div className="row between"><span>Est. finish</span><b>11:58 am</b></div>
            </div>
            <Hr />
            <div className="row" style={{ gap: 6 }}>
              <Btn sm ghost>re-optimize</Btn>
              <Btn sm ghost>split in half</Btn>
            </div>
          </Box>

          <Box dashed>
            <div className="hand-alt tiny">Friday night reminder</div>
            <div className="tiny" style={{ marginTop: 4 }}>Command texts you Fri 7pm: weather forecast, parcel count, "print your letters tonight."</div>
          </Box>

          <Box>
            <div className="hand-alt tiny">What you carry</div>
            <div className="tiny" style={{ marginTop: 6, lineHeight: 1.9 }}>
              <div className="row between"><span>Letters</span><b>45</b></div>
              <div className="row between"><span>Door hangers</span><b>45 (in case nobody home)</b></div>
              <div className="row between"><span>Business cards</span><b>~10</b></div>
              <div className="row between"><span>Water bottle</span><b>1</b></div>
            </div>
          </Box>
        </div>
      </div>
    </div>
  </Desktop>;
}

// =============================================================
// V7 · Door-by-door walking mode (mobile-ish desktop preview)
// =============================================================
function PD_V7_DoorByDoor() {
  return <Desktop active="Content" url="command.app/walk/live">
    <div style={{ maxWidth: 520, margin: '0 auto' }}>
      <div className="hand-alt tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>walking mode · live</div>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 22 }}>Door 14 of 45</span>
        <Chip sage dot>on pace</Chip>
      </div>
      <Bar pct={31} style={{ marginTop: 6 }} />

      <Box style={{ marginTop: 10, padding: 0, overflow: 'hidden' }}>
        <Img label="[ small map · pulsing blue dot + next 3 doors ]" h={160} style={{ border: 'none', borderRadius: 0 }} />
      </Box>

      <Box style={{ marginTop: 10 }}>
        <div className="tiny muted mono">NEXT · 14 m</div>
        <div className="serif" style={{ fontSize: 20 }}>1418 Olive Drive</div>
        <div className="tiny muted">3 / 2 · 1,820 sf · built 1994 · lot 7,200 sf</div>
        <Hr />
        <div className="tiny muted mono">LETTER ADDRESSED TO</div>
        <div className="hand-neat" style={{ fontSize: 14 }}>Karina &amp; David Westerlund</div>
        <div className="tiny muted">owners since 2011 · no prior contact</div>
      </Box>

      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <Btn sage className="grow" style={{ justifyContent: 'center', padding: 14 }}>✓ Dropped — next door</Btn>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 6 }}>
        <Btn className="grow" style={{ justifyContent: 'center' }}>Talked · note</Btn>
        <Btn ghost className="grow" style={{ justifyContent: 'center' }}>Skip · no-go</Btn>
      </div>

      <Box tan style={{ marginTop: 10 }}>
        <div className="hand-neat" style={{ fontSize: 13 }}>Quick note on last door?</div>
        <Input placeholder="✎ 1416 said wife 'might be interested in a year'" style={{ marginTop: 6 }} />
      </Box>

      <div className="row between tiny mono muted" style={{ marginTop: 14 }}>
        <span>12 dropped · 1 talked · 0 skipped</span>
        <span>11:18 am · 39 min left</span>
      </div>
    </div>
  </Desktop>;
}

// =============================================================
// V8 · Master print queue (all jobs, all sources)
// =============================================================
function PD_V8_Queue() {
  const col = (title, count, rows) => (
    <div className="grow" style={{ flex: 1 }}>
      <div className="row between center" style={{ padding: '4px 2px' }}>
        <span className="hand-alt">{title}</span>
        <Chip sm>{count}</Chip>
      </div>
      {rows}
    </div>
  );

  const card = (title, meta, source, tone) => (
    <Box style={{ padding: 10, marginBottom: 6 }} tan={tone === 'tan'} sage={tone === 'sage'} dashed={tone === 'dashed'}>
      <div className="hand-neat tiny">{title}</div>
      <div className="tiny muted mono" style={{ marginTop: 2 }}>{meta}</div>
      <Hr />
      <div className="row between tiny mono muted">
        <span>{source}</span>
        <span>✎</span>
      </div>
    </Box>
  );

  return <Desktop active="Content" url="command.app/print/queue">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny muted" style={{ textTransform: 'uppercase', letterSpacing: 1.5 }}>Master queue · all print jobs</div>
        <span className="serif" style={{ fontSize: 26 }}>Print &amp; delivery <span className="tiny muted">· 11 jobs in flight</span></span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>all</Chip>
        <Chip sm filled>mine</Chip>
        <Chip sm>team</Chip>
        <Btn sm primary>+ New</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10, marginTop: 10, alignItems: 'flex-start' }}>
      {col('To order', 3, <>
        {card('Magic letter · the Parks', '45 pcs · letter · DIY', 'DIY · awaiting buyer approval', 'tan')}
        {card('Just-Sold postcard · 18 Cedar', '120 pcs · postcard', 'Landmark Title · free')}
        {card('Door hangers · Olive Park', '45 pcs', 'Nine Dots · $0.42 / pc')}
      </>)}

      {col('In production', 3, <>
        {card('Just-Listed · 2222 Yellow Wood', '120 pcs · postcard · farm', 'Landmark · ship Apr 18', 'sage')}
        {card('Yard signs · 2222 YW', '4 pcs · 18×24', 'Nine Dots · ready Fri')}
        {card('Window cling · 2222 YW', '2 pcs · vinyl', 'Nine Dots · ready Fri')}
      </>)}

      {col('Ready to walk / deliver', 2, <>
        {card('Door hangers · Sat campaign', '45 pcs · at your office', 'picked up · ready', 'sage')}
        {card('Letters · Olive Park · the Parks', '45 pcs · printed last night', 'DIY · in your bag', 'sage')}
      </>)}

      {col('Delivered', 3, <>
        {card('Just-Listed · Yellow Wood', '120 pcs · Apr 14', '✓ mailed · Landmark', 'dashed')}
        {card('Just-Sold · Cedar', '95 pcs · Apr 10', '✓ mailed · Landmark', 'dashed')}
        {card('Magic letter · the Heshams', '38 pcs · Mar 22', '✓ walked · 2 replies', 'dashed')}
      </>)}
    </div>

    <div className="row" style={{ gap: 10, marginTop: 14 }}>
      <Box dashed className="grow">
        <div className="hand-alt tiny">Month to date</div>
        <div className="row" style={{ gap: 18, marginTop: 6 }}>
          <div><div className="hand-alt" style={{ fontSize: 22 }}>437</div><div className="tiny muted mono">PCS SHIPPED</div></div>
          <div><div className="hand-alt" style={{ fontSize: 22 }}>$310</div><div className="tiny muted mono">YOUR SPEND</div></div>
          <div><div className="hand-alt" style={{ fontSize: 22 }}>$312</div><div className="tiny muted mono">LANDMARK PROVIDED</div></div>
          <div><div className="hand-alt" style={{ fontSize: 22 }}>7</div><div className="tiny muted mono">REPLIES TRACKED</div></div>
        </div>
      </Box>
    </div>
  </Desktop>;
}

window.PrintDeliveryScreens = [
  { id: 'pd1', label: 'V1 · Source picker',       caption: 'Title co · local printer · DIY — the first choice of every print job.',  Component: PD_V1_SourcePicker },
  { id: 'pd2', label: 'V2 · Title co dashboard',   caption: 'Co-branded program with Landmark · monthly cap · reorder.',              Component: PD_V2_TitleCo },
  { id: 'pd3', label: 'V3 · Local printer cart',   caption: 'Nine Dots checkout · rush + courier · price check vs Vistaprint.',       Component: PD_V3_LocalPrinter },
  { id: 'pd4', label: 'V4 · DIY letter preview',   caption: 'Preview the letter · buyer approval required · print settings.',         Component: PD_V4_DIYLetter },
  { id: 'pd5', label: 'V5 · Magic letter builder', caption: 'Polygon targeting · parcel math · yield forecast.',                      Component: PD_V5_MagicCampaign },
  { id: 'pd6', label: 'V6 · Walk route planner',   caption: '45-door loop · optimized polyline · Fri-night reminder.',                Component: PD_V6_WalkRoute },
  { id: 'pd7', label: 'V7 · Walking mode (live)',  caption: 'Door-by-door · dropped/talked/skip · quick note per door.',              Component: PD_V7_DoorByDoor },
  { id: 'pd8', label: 'V8 · Master queue',         caption: 'To order · in production · ready to walk · delivered.',                  Component: PD_V8_Queue },
];

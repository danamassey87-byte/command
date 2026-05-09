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

        {/* Log-activity composer — for things that happened OUTSIDE the app */}
        <Box style={{ padding: 10, borderTop: '3px solid var(--accent-tan)' }}>
          <div className="row between center" style={{ marginBottom: 6 }}>
            <div>
              <div className="hand-alt" style={{ fontSize: 14 }}>+ Log activity</div>
              <div className="tiny muted">Called, texted, or met outside the app? Log it here so it stays on the record.</div>
            </div>
            <Chip sm>auto-tags to Sarah</Chip>
          </div>
          <div className="row wrap" style={{ gap: 4, marginBottom: 8 }}>
            <Chip filled>📞 Called (external)</Chip>
            <Chip>💬 Texted (external)</Chip>
            <Chip>🤝 Met in person</Chip>
            <Chip>✉ Emailed</Chip>
            <Chip>🏠 Showed a home</Chip>
            <Chip>🎪 OH visit</Chip>
            <Chip>📝 Note</Chip>
          </div>
          <div className="row" style={{ gap: 6, alignItems: 'stretch' }}>
            <Input placeholder="what happened? — e.g. Called from my cell, 14 min. She wants to counter at $758k." style={{ flex: 1 }} />
            <div className="col" style={{ gap: 4, width: 120, flexShrink: 0 }}>
              <div className="row" style={{ gap: 2 }}>
                <Chip sm filled>just now</Chip>
                <Chip sm>pick time</Chip>
              </div>
              <div className="row" style={{ gap: 2 }}>
                <Chip sm>3 min</Chip><Chip sm>10 min</Chip><Chip sm>30 min</Chip>
              </div>
            </div>
            <Btn primary>Log →</Btn>
          </div>
          <div className="tiny muted" style={{ marginTop: 6, fontSize: 10 }}>
            ✦ <b>Tip:</b> text "log call sarah 14m she wants to counter 758" to your Command number — logs automatically. Or iOS share-sheet → Command after a call.
          </div>
        </Box>

        <Box>
          <div className="row between">
            <div>
              <div className="row center" style={{ gap: 6 }}>
                <div className="hand-neat">Called Sarah — 9:32am</div>
                <Chip sm tan style={{ fontSize: 9 }}>logged from phone</Chip>
              </div>
              <div className="tiny muted">Discussed offer counter. She'll decide by 12pm. · 14 min · personal cell</div>
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
    <div className="row wrap" style={{ gap: 10, alignItems: 'flex-start' }}>
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
        <div className="row wrap" style={{ gap: 10, paddingBottom: 4 }}>
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
                textAlign: 'center', fontFamily: 'Georgia, serif', fontStyle: 'italic',
                whiteSpace: 'pre-line',
              }}>{t}</div>
              <div className="tiny muted mono" style={{ marginTop: 4, textAlign: 'center' }}>{l}</div>
            </div>
          ))}
        </div>
        <Box>
          <div className="hand-alt" style={{ fontSize: 15 }}>Caption</div>
          <div className="tiny" style={{ marginTop: 6, fontStyle: 'italic' }}>
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
  // Platform rules — character counts + best-practice guidance per channel.
  const platforms = [
    {
      name: 'Instagram', fmt: 'carousel · 7 slides', color: 'var(--accent-rose)', status: 'scheduled',
      copy: "POV: you thought you needed 20% down. You don't.\n\nHere are 5 mistakes I see first-time buyers make in Chicagoland — and exactly how to avoid them 👇\n\n#chicagorealestate #firsttimehomebuyer #oakpark #realtor #househunting",
      limits: { optimal: 125, max: 2200, label: 'caption' },
      tips: [
        'Hook in the first 125 chars — rest gets truncated',
        '3–5 hashtags > 30 (Meta deprioritizes hashtag-stuffing)',
        'First line carries 90% of reach. No "link in bio" hooks.',
      ],
    },
    {
      name: 'LinkedIn', fmt: 'image + long caption', color: 'var(--accent-sage)', status: '✦ rewriting',
      copy: "I've closed 40+ first-time buyer transactions in the last 18 months. The same 5 mistakes show up in almost every one.\n\n1. Shopping before lender pre-approval.\nYou'll fall in love with a house you can't afford. Or worse — lose it to someone who has their paperwork.\n\n2. Focusing on rate, not total cost of ownership.\n\n3. Waiving inspection to win…",
      limits: { optimal: 1200, max: 3000, label: 'post' },
      tips: [
        'Professional tone, use numerals and list structure',
        'No hashtags — or max 3, at the end',
        'Open with a credibility stat. LinkedIn rewards expertise.',
      ],
    },
    {
      name: 'Facebook', fmt: 'carousel · cross-posted', color: 'var(--accent)', status: 'scheduled',
      copy: "Chicagoland friends buying your first home this spring — these are the 5 things I wish every client knew before they started looking. Save this for later 👇",
      limits: { optimal: 80, max: 63206, label: 'post' },
      tips: [
        'Conversational, community-first tone',
        'Ask a question to drive comments (algorithm boost)',
        'No emoji spam; 1-2 max',
      ],
    },
    {
      name: 'TikTok', fmt: 'auto-video from slides', color: 'var(--accent-tan)', status: 'draft',
      copy: "5 first-time buyer mistakes that will cost you THOUSANDS 💸",
      limits: { optimal: 100, max: 2200, label: 'caption' },
      tips: [
        'Caption = hook only. Save story for the video.',
        '3–5 niche hashtags (#firsttimehomebuyer, not #realestate)',
        'Hook in first 2 seconds of video. No intro.',
      ],
    },
    {
      name: 'YouTube Shorts', fmt: 'auto-video', color: 'var(--accent-rose)', status: 'draft',
      copy: "5 FIRST-TIME BUYER MISTAKES (Chicago edition)",
      limits: { optimal: 60, max: 100, label: 'title' },
      tips: [
        'TITLE-CASE or ALL CAPS first words boost CTR',
        'Under 60 chars keeps it visible on all devices',
        'Put keyword first, brand last',
      ],
    },
    {
      name: 'Blog', fmt: 'long-form adaptation', color: 'var(--accent-sage)', status: '✦ generating',
      copy: "# 5 First-Time Buyer Mistakes (and How to Avoid Them in 2026)\n\nIf you're buying your first home in Chicagoland this year, you're entering one of the most competitive markets in a decade. But it's not the market that sinks most first-time buyers — it's five specific mistakes, repeated over and over…",
      limits: { optimal: 1500, max: 5000, label: 'words' },
      tips: [
        'H1 with primary keyword · H2s for each mistake',
        'Add FAQ schema at bottom for AEO (AI answer engines)',
        'Include 2-3 cited stats with source links',
      ],
    },
    {
      name: 'Email newsletter', fmt: 'adapted teaser + CTA', color: 'var(--ink)', status: 'scheduled',
      copy: "Subject: The $18,000 mistake I see almost every week\n\nHi {FirstName},\n\nLast week a buyer I've been talking to for 3 months lost her dream house. Not because of price. Not because of the inspection. Because of mistake #2 on this list…\n\n→ Read the full breakdown",
      limits: { optimal: 150, max: 500, label: 'preview' },
      tips: [
        'Subject line: curiosity + specific number. Under 50 chars.',
        'Single CTA. Never two.',
        'Personalize with {FirstName} or city tag',
      ],
    },
  ];

  // Per-platform state
  const [drafts, setDrafts] = React.useState(platforms.map(p => p.copy));
  const [openIdx, setOpenIdx] = React.useState(null);
  const fmt = (n) => n.toLocaleString();

  // Count words for Blog (limits.label === 'words'), else characters
  const getCount = (txt, label) => label === 'words'
    ? txt.trim().split(/\s+/).filter(Boolean).length
    : txt.length;

  return <Desktop active="Content" url="command.app/content/publish">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Multi-platform publish</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>✦ rewrite ALL per platform</Btn>
        <Btn sm primary>Schedule all →</Btn>
      </div>
    </div>
    <Box>
      <div className="hand-alt" style={{ fontSize: 15 }}>Source: "5 first-time buyer mistakes" carousel</div>
      <div className="tiny muted mono">published Mon 10am planned · each platform auto-adapted · expand to edit</div>
    </Box>

    {platforms.map((p, i) => {
      const count = getCount(drafts[i], p.limits.label);
      const opt = p.limits.optimal, max = p.limits.max;
      const pctOpt = Math.min(100, (count / opt) * 100);
      const overOpt = count > opt;
      const overMax = count > max;
      // bar color — sage while under optimal, tan once over optimal, rose over max
      const barCol = overMax ? '#b6473a' : overOpt ? 'var(--accent-tan)' : 'var(--accent-sage)';
      const isOpen = openIdx === i;

      return (
        <Box key={i} style={{ padding: 0, overflow: 'hidden' }}>
          {/* Collapsed header */}
          <div className="row between center" style={{ padding: 10, cursor:'pointer' }}
               onClick={() => setOpenIdx(isOpen ? null : i)}>
            <div className="row center" style={{ gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: p.color, border: '1.5px solid var(--line)' }} />
              <div>
                <div className="hand-neat">{p.name}</div>
                <div className="tiny muted mono">{p.fmt}</div>
              </div>
            </div>
            <div className="row center" style={{ gap: 10 }}>
              {/* Character count pill */}
              <div style={{
                fontSize: 11, fontFamily: 'ui-monospace,monospace',
                color: overMax ? '#b6473a' : overOpt ? '#8a6a2e' : 'var(--muted)',
                fontWeight: overOpt ? 600 : 500,
              }}>
                {fmt(count)}{p.limits.label === 'words' ? 'w' : 'ch'}
                <span className="faint" style={{ marginLeft: 2 }}>/ {fmt(opt)} opt · {fmt(max)} max</span>
              </div>
              {/* Mini progress ring (linear pill) */}
              <div style={{ width: 60, height: 5, background:'var(--line)', borderRadius: 999, overflow:'hidden' }}>
                <div style={{ width: pctOpt+'%', height:'100%', background: barCol }} />
              </div>
              <Chip sm>{p.status}</Chip>
              <Btn sm ghost>{isOpen ? '▴ collapse' : '✎ edit'}</Btn>
            </div>
          </div>

          {/* Expanded editor */}
          {isOpen && (
            <div style={{ borderTop: '1px solid var(--line)', padding: 12, background:'var(--paper-2)' }}>
              <div className="row" style={{ gap: 12, alignItems:'stretch' }}>
                {/* Editable copy */}
                <div style={{ flex: 2, display:'flex', flexDirection:'column', gap: 6 }}>
                  <div className="row between center">
                    <div className="tiny mono muted">COPY · {p.name.toUpperCase()}</div>
                    <div className="row" style={{ gap: 4 }}>
                      <Btn sm>✦ rewrite for {p.name}</Btn>
                      <Btn sm ghost>↻ reset from source</Btn>
                    </div>
                  </div>
                  <textarea
                    value={drafts[i]}
                    onChange={e => setDrafts(d => d.map((v,k) => k === i ? e.target.value : v))}
                    style={{
                      width: '100%', minHeight: 140,
                      fontFamily: 'ui-monospace,monospace', fontSize: 12, lineHeight: 1.5,
                      background: 'var(--paper)', border: '1.5px solid var(--line)',
                      borderRadius: 8, padding: 10, resize: 'vertical', color: 'var(--ink)',
                    }}
                  />
                  {/* Detailed counter */}
                  <div className="row between" style={{ fontSize: 11 }}>
                    <div style={{ display:'flex', gap: 10, alignItems:'center' }}>
                      <span className="mono" style={{ color: overMax ? '#b6473a' : overOpt ? '#8a6a2e' : 'var(--ink)', fontWeight: 600 }}>
                        {fmt(count)} {p.limits.label}
                      </span>
                      <span className="faint">
                        optimal {fmt(opt)} · max {fmt(max)}
                      </span>
                      {overMax ? <span style={{ color:'#b6473a', fontWeight:600 }}>✕ {fmt(count-max)} over max</span>
                        : overOpt ? <span style={{ color:'#8a6a2e' }}>⚠ {fmt(count-opt)} over optimal</span>
                        : <span style={{ color:'var(--accent-sage)' }}>✓ within range</span>}
                    </div>
                    {p.name === 'Instagram' && (
                      <span className="faint mono">
                        hashtags: {(drafts[i].match(/#\w+/g) || []).length} · emoji: {(drafts[i].match(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length}
                      </span>
                    )}
                  </div>
                </div>

                {/* Best-practices sidebar */}
                <div style={{
                  flex: 1, background:'var(--paper)',
                  border: '1.5px dashed var(--line)', borderRadius: 8, padding: 10,
                }}>
                  <div className="hand-alt tiny" style={{ marginBottom: 4 }}>✦ what wins on {p.name}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap: 6, marginTop: 6 }}>
                    {p.tips.map((t, k) => (
                      <div key={k} style={{ fontSize: 11, lineHeight: 1.4, display:'flex', gap: 6 }}>
                        <span style={{ color: p.color, fontWeight: 700 }}>•</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                  <Hr />
                  <div className="tiny muted" style={{ fontSize: 10 }}>
                    Based on top-10% performing posts in your niche · updates weekly
                  </div>
                </div>
              </div>
            </div>
          )}
        </Box>
      );
    })}
    <Anno style={{ alignSelf: 'flex-end' }}>↑ click any platform to rewrite · live char counts · per-platform best practices</Anno>
  </Desktop>;
}

// ===================== CRM · v2 additions (4 screens) =====================
function CRMv4_SavedViews() {
  return <Desktop active="CRM" url="command.app/crm?view=hot-spring-buyers">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Saved views</span>
      <div className="row" style={{ gap: 6 }}><Btn sm>+ new view</Btn><Btn sm primary>Share w/ team</Btn></div>
    </div>
    <div className="row" style={{ gap: 12, alignItems:'flex-start' }}>
      <Box style={{ width: 220, flexShrink: 0 }}>
        <div className="tiny mono muted">MY VIEWS</div>
        {['Hot spring buyers','Needs follow-up 14d','Birthdays next 30d','Past clients · 2-yr anniv','OH · 88 Elm signins','Expired · ready to re-approach'].map((v,i)=>(
          <div key={i} className={'hand-neat tiny'+(i===0?' ':'')} style={{ padding:'4px 6px', background: i===0?'var(--card)':'transparent', borderRadius:4, marginTop:2 }}>{i===0?'★ ':''}{v}</div>
        ))}
        <Hr /><div className="tiny mono muted">TEAM VIEWS</div>
        <div className="hand-neat tiny" style={{ padding:'4px 6px' }}>Jamie · my buyers active</div>
        <div className="hand-neat tiny" style={{ padding:'4px 6px' }}>Shared · Sphere VIPs</div>
      </Box>
      <div className="col grow">
        <Box style={{ padding: 10 }}>
          <div className="hand-alt" style={{ fontSize: 14 }}>★ Hot spring buyers</div>
          <div className="tiny muted">Filters stack top-down. Drag to reorder.</div>
          <div className="col" style={{ gap:4, marginTop:8 }}>
            <div className="tiny mono" style={{ background:'var(--paper-2)', padding:'4px 8px', borderRadius:4 }}>tier = hot  AND</div>
            <div className="tiny mono" style={{ background:'var(--paper-2)', padding:'4px 8px', borderRadius:4 }}>stage = buyer-active  AND</div>
            <div className="tiny mono" style={{ background:'var(--paper-2)', padding:'4px 8px', borderRadius:4 }}>last_touch &gt; 14d ago  AND</div>
            <div className="tiny mono" style={{ background:'var(--paper-2)', padding:'4px 8px', borderRadius:4 }}>budget_max ≥ $700k</div>
            <Chip sm>+ filter</Chip>
          </div>
          <Hr />
          <div className="tiny mono muted">AUTOMATIONS ON THIS VIEW</div>
          <Check>Auto-add to "Spring Drip" email sequence</Check>
          <Check>Post digest to #buyers every Mon 8am</Check>
          <Check>Flag if no contact in 21d</Check>
        </Box>
        <Box>
          <div className="tiny mono muted">PREVIEW · 18 contacts match</div>
          <div className="tiny hand-neat">Sarah McC · Mike &amp; Carla · Baxter-Reed · +15</div>
        </Box>
      </div>
    </div>
    <Anno style={{ alignSelf:'flex-end' }}>↑ views = filters + sort + columns + automations, saved</Anno>
  </Desktop>;
}
function CRMv5_BulkActions() {
  return <Desktop active="CRM" url="command.app/crm">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>42 selected</span>
      <div className="row" style={{ gap: 6 }}><Btn sm>Clear</Btn><Btn sm primary>Apply →</Btn></div>
    </div>
    <Box filled style={{ padding:12 }}>
      <div className="hand-alt" style={{ fontSize:15 }}>Bulk actions</div>
      <div className="row wrap" style={{ gap:6, marginTop:8 }}>
        <Chip filled>+ Tag</Chip><Chip>− Tag</Chip><Chip>Move stage →</Chip><Chip>Add to sequence</Chip>
        <Chip>Add to audience (FB/Email)</Chip><Chip>Assign to…</Chip><Chip>Enqueue postcard</Chip>
        <Chip>Export CSV</Chip><Chip rose>DNC flag</Chip><Chip rose>Archive</Chip>
      </div>
      <Hr />
      <div className="tiny mono muted">ACTIVE · + TAG</div>
      <div className="row" style={{ gap:6, marginTop:6 }}>
        <Input placeholder="tag name… (existing or new)" style={{ flex:1 }} value="spring-2026-buyer" />
        <Btn sm>Create + apply</Btn>
      </div>
      <div className="tiny muted" style={{ marginTop:6 }}>Will sync to Lofty · 42 contacts · ~3 sec</div>
    </Box>
    <Box dashed>
      <div className="hand-alt tiny">✦ AI suggests</div>
      <div className="tiny">• All 42 match "warm buyer" profile — add to <b>Spring Drip</b> sequence?</div>
      <div className="tiny">• 14 of these haven't heard from you in 21d — schedule check-in call task?</div>
    </Box>
    <Box style={{ padding:0 }}>
      <table className="wf-table">
        <thead><tr><th>✓</th><th>Name</th><th>Tags</th><th>Last touch</th><th>Tier</th></tr></thead>
        <tbody>{[['Sarah McC','buyer·hot','2h','hot'],['Baxter-Reed','buyer','1d','warm'],['Patel','lead','5d','nurture'],['+ 39 more','','','']].map((r,i)=>(
          <tr key={i}><td>✓</td>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>))}</tbody>
      </table>
    </Box>
  </Desktop>;
}
function CRMv6_ImportMerge() {
  return <Desktop active="CRM" url="command.app/crm/import">
    <div className="row between center"><span className="serif" style={{ fontSize: 22 }}>Import · Lofty CSV</span><Btn sm>Cancel</Btn></div>
    <div className="wf-tabs"><span className="tab">1 · Upload</span><span className="tab active">2 · Map fields</span><span className="tab">3 · Dedupe</span><span className="tab">4 · Review</span></div>
    <Box>
      <div className="hand-alt" style={{ fontSize:14 }}>Field mapping · 12 of 14 auto-matched</div>
      <table className="wf-table" style={{ marginTop:8 }}>
        <thead><tr><th>CSV column</th><th></th><th>Command field</th><th>Sample</th></tr></thead>
        <tbody>
          {[['first_name','→','first_name','Sarah'],['email','→','email','sarah.m@…'],['phone_mobile','→','phone (E.164)','+15125550134'],['last_contact','→','interactions.last_at','2026-04-14'],['deal_value','⚠','budget_max','$760,000'],['zillow_id','–','— ignore —','Z-47291']].map((r,i)=>(
            <tr key={i} style={{ background: r[1]==='⚠'?'#FAF1DD': r[1]==='–'?'#F3EBE3':'transparent' }}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>))}
        </tbody>
      </table>
    </Box>
    <Box dashed>
      <div className="hand-alt tiny">Dedupe rules</div>
      <Check>Match on email (exact, case-insensitive)</Check>
      <Check>Match on phone (E.164 normalized)</Check>
      <Check>Fuzzy name + zip (confirm each)</Check>
      <div className="tiny muted" style={{ marginTop:6 }}>Found <b>23 likely duplicates</b> · 18 exact, 5 fuzzy → review in step 3</div>
    </Box>
    <Box>
      <div className="hand-alt tiny">Conflict: existing Sarah McCallister vs CSV Sarah McCallister</div>
      <div className="tiny mono muted" style={{ marginTop:6 }}>FIELD · EXISTING · INCOMING · CHOICE</div>
      {[['phone','(512) 555-0134','+15125550134','keep existing (formatted)'],['budget_max','$760k','$720k','⚠ conflict — keep both as notes'],['tags','buyer·hot','buyer·hot·sphere','merge']].map((r,i)=>(
        <div key={i} className="tiny mono" style={{ padding:'4px 0', borderBottom:'1px solid var(--line)' }}>{r[0]} · <span className="muted">{r[1]}</span> · <span>{r[2]}</span> · <b>{r[3]}</b></div>))}
      <Btn sm style={{ marginTop:8 }}>Apply to all 23 matches</Btn>
    </Box>
  </Desktop>;
}
function CRMv7_Timeline() {
  return <Desktop active="CRM" url="command.app/crm/sarah-mccallister/timeline">
    <div className="row between center">
      <span className="hand-neat muted">← Sarah McCallister · Full timeline</span>
      <div className="row" style={{ gap:6 }}>
        <Chip filled>All 124</Chip><Chip>Calls 18</Chip><Chip>Texts 42</Chip><Chip>Emails 31</Chip><Chip>Showings 7</Chip><Chip>Notes 14</Chip><Chip>System 12</Chip>
      </div>
    </div>
    <div className="row" style={{ gap:12, alignItems:'flex-start' }}>
      <Box style={{ width:180, flexShrink:0 }}>
        <div className="tiny mono muted">FILTER</div>
        <div className="tiny mono muted" style={{ marginTop:8 }}>DATE RANGE</div>
        <div className="row" style={{ gap:4, marginTop:4 }}><Chip sm>30d</Chip><Chip sm filled>90d</Chip><Chip sm>All</Chip></div>
        <div className="tiny mono muted" style={{ marginTop:8 }}>CHANNELS</div>
        <Check checked>Gmail · Resend</Check><Check checked>iMessage · Twilio</Check><Check checked>Lofty</Check><Check>Slack</Check><Check>Transact</Check>
        <div className="tiny mono muted" style={{ marginTop:8 }}>DIRECTION</div>
        <div className="row" style={{ gap:4 }}><Chip sm filled>All</Chip><Chip sm>In</Chip><Chip sm>Out</Chip></div>
      </Box>
      <div className="col grow">
        {[
          ['TODAY 9:32am','📞','Called · 14min','She wants to counter at $758k. Promised comps by 12.','call · out'],
          ['TODAY 8:04am','💬','Text · in','"Morning! Any word from the seller?"','text · in'],
          ['APR 15','🏠','Showing · 42 Oak St','★★★★☆ "Loved kitchen, worried about yard"','showing'],
          ['APR 15','✉','Email open · Spring Market Letter','opened 3x · clicked CTA · 47 sec read','email · system'],
          ['APR 14','📞','Missed call → VM','2:14 long · transcribed','call · in'],
          ['APR 13','📝','Note (Dana)','"Budget flex to $770 if right kitchen. Wife decides."','note'],
          ['APR 12','💼','Transact · BBA signed','Buyer Broker Agreement executed','system'],
        ].map((row,i)=>(
          <div key={i} className="row" style={{ gap:10, padding:'8px 0', borderBottom:'1px dashed var(--line)', alignItems:'flex-start' }}>
            <div className="tiny mono muted" style={{ width:72, flexShrink:0 }}>{row[0]}</div>
            <div style={{ fontSize:18, width:24, flexShrink:0 }}>{row[1]}</div>
            <div className="grow">
              <div className="hand-neat">{row[2]}</div>
              <div className="tiny muted">{row[3]}</div>
            </div>
            <Chip sm>{row[4]}</Chip>
          </div>
        ))}
      </div>
    </div>
    <Anno style={{ alignSelf:'flex-end' }}>↑ append-only log · pulls from 7 integrations</Anno>
  </Desktop>;
}

// ===================== EMAIL · v2 additions (4 screens) =====================
function EmailV4_Sequences() {
  return <Desktop active="Email" url="command.app/email/sequences/oh-followup">
    <div className="row between center">
      <span className="hand-neat muted">← Sequences · OH Follow-Up (88 Elm)</span>
      <div className="row" style={{ gap:6 }}><Btn sm>Pause</Btn><Btn sm primary>Edit</Btn></div>
    </div>
    <div className="row" style={{ gap:10 }}>
      {[['Enrolled','22'],['Active','14'],['Completed','6'],['Paused','2'],['Avg open','61%']].map(([l,v])=>(
        <Box key={l} className="grow" style={{ textAlign:'center', padding:10 }}>
          <div className="serif" style={{ fontSize:22 }}>{v}</div>
          <div className="tiny mono muted">{l.toUpperCase()}</div>
        </Box>
      ))}
    </div>
    <Box style={{ padding:14 }}>
      <div className="hand-alt" style={{ fontSize:15 }}>Steps</div>
      <div className="col" style={{ gap:8, marginTop:10 }}>
        {[
          ['Step 1','Day 0','✉','Thank-you + your guide','sent · 22','61% open'],
          ['Step 2','Day +2','💬','SMS check-in (short)','sent · 22','—'],
          ['Step 3','Day +5','✉','Similar homes in area','sent · 18','54% open · 4 reply'],
          ['⏸','Day +9','📞','Call task (Dana)','pending · 14','—'],
          ['Step 4','Day +14','✉','Market snapshot for Evanston','scheduled','—'],
          ['Step 5','Day +30','📮','Postcard (handwritten)','print queue','—'],
        ].map((r,i)=>(
          <div key={i} className="row center" style={{ gap:10, padding:'8px 10px', background:'var(--card)', borderRadius:6 }}>
            <Chip sm filled>{r[0]}</Chip>
            <span className="tiny mono muted" style={{ width:60 }}>{r[1]}</span>
            <span style={{ fontSize:16, width:20 }}>{r[2]}</span>
            <span className="hand-neat grow">{r[3]}</span>
            <Chip sm>{r[4]}</Chip>
            <span className="tiny muted" style={{ width:100, textAlign:'right' }}>{r[5]}</span>
          </div>
        ))}
      </div>
      <Hr />
      <div className="tiny mono muted">PAUSE RULES</div>
      <Check checked>Replies to any step</Check>
      <Check checked>Clicks "unsubscribe"</Check>
      <Check checked>Becomes a Deal</Check>
      <Check>Opens 3+ but doesn't reply in 7d → escalate to call task</Check>
    </Box>
  </Desktop>;
}
function EmailV5_ABTest() {
  return <Desktop active="Email" url="command.app/email/ab/spring-letter">
    <div className="row between center">
      <span className="serif" style={{ fontSize:22 }}>A/B · Spring Market Letter · subject</span>
      <Btn sm primary>Pick winner → send to rest</Btn>
    </div>
    <div className="row" style={{ gap:12 }}>
      {[
        {lbl:'A',sub:'The Spring Market is shifting.',open:'52%',click:'8.1%',rep:'9',win:true},
        {lbl:'B',sub:'Evanston inventory is up 14% — what it means for you',open:'44%',click:'6.4%',rep:'5',win:false},
      ].map((v,i)=>(
        <Box key={i} className="grow" filled={v.win} style={{ border: v.win?'2px solid var(--accent-sage)':undefined }}>
          <div className="row between center">
            <Chip filled sm>{v.lbl}</Chip>
            {v.win && <Chip sm tan>✓ winner · +18% open</Chip>}
          </div>
          <div className="serif" style={{ fontSize:16, marginTop:6 }}>{v.sub}</div>
          <Hr />
          <div className="row" style={{ gap:14 }}>
            <div><div className="serif" style={{ fontSize:22 }}>{v.open}</div><div className="tiny mono muted">OPEN</div></div>
            <div><div className="serif" style={{ fontSize:22 }}>{v.click}</div><div className="tiny mono muted">CLICK</div></div>
            <div><div className="serif" style={{ fontSize:22 }}>{v.rep}</div><div className="tiny mono muted">REPLIES</div></div>
          </div>
          <div className="tiny muted" style={{ marginTop:6 }}>sent to 200 · {v.lbl==='A'?'104 opens':'88 opens'} · significant at 95%</div>
        </Box>
      ))}
    </div>
    <Box dashed>
      <div className="hand-alt tiny">✦ AI read</div>
      <div className="tiny">Short &amp; curious beats specific-stat for this list (matches last 4 A/Bs). Suggest locking "curiosity-forward" as your subject style for market updates.</div>
    </Box>
    <Box>
      <div className="hand-alt" style={{ fontSize:14 }}>Test history · last 12</div>
      <table className="wf-table" style={{ marginTop:6 }}>
        <thead><tr><th>Test</th><th>Dim</th><th>Winner</th><th>Lift</th><th>Date</th></tr></thead>
        <tbody>{[['Spring letter','subject','A · curiosity','+18% open','4/18'],['Just sold 42 Oak','hero img','B · exterior','+11% click','4/10'],['CMA follow-up','send time','9am','+7% open','3/28']].map((r,i)=>(<tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>))}</tbody>
      </table>
    </Box>
  </Desktop>;
}
function EmailV6_Deliverability() {
  return <Desktop active="Email" url="command.app/email/deliverability">
    <div className="row between center">
      <span className="serif" style={{ fontSize:22 }}>Deliverability · dana@danamassey.co</span>
      <Chip sm style={{ background:'var(--accent-sage)', color:'var(--paper)' }}>Reputation · Healthy</Chip>
    </div>
    <div className="row" style={{ gap:10 }}>
      {[['SPF','✓ pass'],['DKIM','✓ aligned'],['DMARC','✓ p=quarantine'],['BIMI','⚠ not set'],['Blacklists','0 of 87']].map(([l,v],i)=>(
        <Box key={i} className="grow" style={{ textAlign:'center', padding:10 }}>
          <div className="serif" style={{ fontSize:18 }}>{v}</div>
          <div className="tiny mono muted">{l.toUpperCase()}</div>
        </Box>
      ))}
    </div>
    <Box>
      <div className="hand-alt" style={{ fontSize:15 }}>Warm-up schedule (new domain)</div>
      <div className="tiny muted">Target inbox placement ≥ 95%. Raise volume weekly.</div>
      <div className="row" style={{ gap:6, marginTop:10, alignItems:'flex-end' }}>
        {[30,60,120,240,480,800,1200].map((v,i)=>(
          <div key={i} className="col center" style={{ flex:1, gap:4 }}>
            <div style={{ height: v/14, width:'100%', background: i<=2?'var(--accent-sage)': i<=4?'var(--accent-tan)':'var(--line)', borderRadius:'4px 4px 0 0' }} />
            <div className="tiny mono muted">W{i+1}</div>
            <div className="tiny">{v}</div>
          </div>
        ))}
      </div>
      <div className="tiny muted" style={{ marginTop:8 }}>Currently W3 · 120 sends/day cap · auto-throttle enforced</div>
    </Box>
    <Box dashed>
      <div className="hand-alt tiny">Inbox placement · last 7d</div>
      <div className="row" style={{ gap:10, marginTop:6 }}>
        <div className="grow"><div className="serif" style={{ fontSize:22 }}>96%</div><div className="tiny mono muted">GMAIL INBOX</div></div>
        <div className="grow"><div className="serif" style={{ fontSize:22 }}>92%</div><div className="tiny mono muted">OUTLOOK</div></div>
        <div className="grow"><div className="serif" style={{ fontSize:22 }}>88%</div><div className="tiny mono muted">YAHOO</div></div>
        <div className="grow"><div className="serif" style={{ fontSize:22 }}>0.3%</div><div className="tiny mono muted">SPAM COMPLAINTS</div></div>
      </div>
    </Box>
  </Desktop>;
}
function EmailV7_Preview() {
  return <Desktop active="Email" url="command.app/email/preview/spring-letter">
    <div className="row between center"><span className="hand-neat muted">← Preview · Spring Market Letter</span><div className="row" style={{ gap:6 }}><Btn sm>Send test to me</Btn><Btn sm primary>Approve → Schedule</Btn></div></div>
    <div className="row" style={{ gap:6 }}>
      {['Gmail web','Gmail mobile','Apple Mail','Outlook','Dark mode','Plain text'].map((t,i)=>(<Chip key={i} filled={i===1}>{t}</Chip>))}
    </div>
    <div className="row" style={{ gap:14, alignItems:'flex-start' }}>
      <Box style={{ width:320, padding:0, background:'#1a1a1a', borderRadius:20 }}>
        <div style={{ padding:'12px 14px', color:'#aaa', fontSize:10 }}>Gmail · mobile · iPhone 15</div>
        <div style={{ background:'var(--paper)', margin:'0 10px 10px', borderRadius:8, padding:12 }}>
          <div className="tiny muted">from Dana Massey &lt;dana@…&gt;</div>
          <div className="serif" style={{ fontSize:16, marginTop:4 }}>The Spring Market is shifting.</div>
          <div className="tiny muted">preview: Inventory is up 14%, days on market are down…</div>
          <Hr />
          <div className="hand-neat tiny">Hi Sarah, quick note from the field…</div>
          <Img label="market stats" h={80} style={{ marginTop:8 }} />
          <Btn primary sm style={{ marginTop:8 }}>Request my report</Btn>
        </div>
      </Box>
      <div className="col grow" style={{ gap:10 }}>
        <Box dashed>
          <div className="hand-alt" style={{ fontSize:14 }}>✓ Compliance · passed</div>
          <div className="tiny muted">Fair Housing · RESPA · IL license act · REAL broker handbook</div>
          <div className="tiny muted" style={{ marginTop:4 }}>Auto-added: broker license # in footer · unsubscribe link · physical address</div>
        </Box>
        <Box>
          <div className="hand-alt" style={{ fontSize:14 }}>Spam-score (Mail-Tester equivalent)</div>
          <div className="row center" style={{ gap:12 }}>
            <div className="serif" style={{ fontSize:36 }}>9.2<span className="tiny muted">/10</span></div>
            <div className="col" style={{ gap:2 }}>
              <div className="tiny">✓ Auth passed</div>
              <div className="tiny">✓ Image/text ratio 0.31</div>
              <div className="tiny">⚠ 1 trigger word: "free"</div>
              <div className="tiny">✓ No excess links</div>
            </div>
          </div>
        </Box>
        <Box>
          <div className="hand-alt" style={{ fontSize:14 }}>Merge preview · Sarah McCallister</div>
          <div className="tiny mono" style={{ background:'var(--paper-2)', padding:8, borderRadius:4, marginTop:6 }}>
            &#123;FirstName&#125; → Sarah<br/>
            &#123;Area&#125; → Evanston<br/>
            &#123;LastTouched&#125; → 2 hours ago
          </div>
          <div className="tiny muted" style={{ marginTop:6 }}>All 1,284 recipients: 0 missing merge values · ready to send</div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

window.DesktopScreens = window.DesktopScreens || {};
Object.assign(window.DesktopScreens, {
  crm: [
    { id:'crm1', label:'V1 · Table + filters', caption:'Airtable-style database. Every field filterable, bulk actions.', Component: CRMv1_Table },
    { id:'crm2', label:'V2 · Contact profile', caption:'Full context on one person. AI suggests next actions.', Component: CRMv2_Profile },
    { id:'crm3', label:'V3 · Kanban board', caption:'Pipeline as columns. Drag to fire automations.', Component: CRMv3_Kanban },
    { id:'crm4', label:'V4 · Saved views', caption:'Filter+sort+columns+automations saved as a reusable view.', Component: CRMv4_SavedViews },
    { id:'crm5', label:'V5 · Bulk actions', caption:'Multi-select toolbar with tag/move/sequence/postcard in one.', Component: CRMv5_BulkActions },
    { id:'crm6', label:'V6 · Import + merge', caption:'CSV upload, field mapping, fuzzy dedupe, conflict resolution.', Component: CRMv6_ImportMerge },
    { id:'crm7', label:'V7 · Full timeline', caption:'Append-only interaction log across 7 integrations.', Component: CRMv7_Timeline },
  ],
  email: [
    { id:'em1', label:'V1 · Flodesk-style builder', caption:'Drag blocks. Right rail for block props. AI rewrite on selection.', Component: EmailV1_Builder },
    { id:'em2', label:'V2 · Campaigns dashboard', caption:'All sends in one place: one-offs, sequences, stats, AI suggestions.', Component: EmailV2_Campaigns },
    { id:'em3', label:'V3 · Template library', caption:'Reusable + team-shared templates, tagged by purpose.', Component: EmailV3_Templates },
    { id:'em4', label:'V4 · Sequence builder', caption:'Multi-step drip with pause rules + per-step stats.', Component: EmailV4_Sequences },
    { id:'em5', label:'V5 · A/B testing', caption:'Subject/hero/time A/B with significance + AI read on winner.', Component: EmailV5_ABTest },
    { id:'em6', label:'V6 · Deliverability', caption:'SPF/DKIM/DMARC/BIMI, warm-up schedule, inbox placement.', Component: EmailV6_Deliverability },
    { id:'em7', label:'V7 · Preview + compliance', caption:'Multi-client preview, spam score, merge check, compliance gate.', Component: EmailV7_Preview },
  ],
  content: [
    { id:'co1', label:'V1 · Studio hub', caption:'ICA + pillars + SEO/AEO/GEO scores + weekly calendar.', Component: ContentV1_Hub },
    { id:'co2', label:'V2 · Carousel builder', caption:'Brief-driven. Gamma/Claude generates slides. Caption rewriter.', Component: ContentV2_Carousel },
    { id:'co3', label:'V3 · Blog + AEO scoring', caption:'Editor with live SEO/AEO checks. AI adds FAQ schema, cited stats.', Component: ContentV3_Blog },
    { id:'co4', label:'V4 · Multi-platform publish', caption:'One idea fans out to 7 channels, each auto-adapted.', Component: ContentV4_CrossPost },
  ],
});

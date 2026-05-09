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
      <div className="tiny" style={{ marginTop: 2, fontStyle: 'italic' }}>"Buyers liked the updated kitchen but felt the yard was smaller than photos suggested. Price sensitivity — hoping to come in ~5% under ask."</div>
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
      <div className="tiny" style={{ fontStyle: 'italic' }}>"Buyers consistently ding yard size. Consider tightening the search to ≥0.25 acre — skip properties under that."</div>
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

// ============================================================
// Foundations · Empty States · Onboarding · Settings & Billing
// Three pillars that protect the launch and close the product shape.
// ============================================================

/* ===== 1 · EMPTY STATES ===== */

function ES_NoMLS() {
  return <Desktop active="Dashboard" url="command.app/">
    <Box dashed style={{ textAlign:'center', padding: 40 }}>
      <div style={{ fontSize: 40, opacity: 0.4 }}>⛰</div>
      <div className="serif" style={{ fontSize: 22, marginTop: 8 }}>Your MLS isn't connected yet</div>
      <div className="tiny muted" style={{ marginTop: 4 }}>Most of Command runs without it, but listings · CMA · auto-fill all depend on MLS.</div>
      <div className="row" style={{ gap: 6, marginTop: 16, justifyContent:'center' }}>
        <Btn primary>connect ARMLS →</Btn>
        <Btn ghost>continue without MLS</Btn>
      </div>
      <Hr />
      <div className="tiny muted">ARMLS · CRMLS · Bright · Stellar · MIBOR · 120 others supported</div>
    </Box>
    <div className="row" style={{ gap: 8 }}>
      <Box className="grow"><div className="hand-alt tiny">✓ works without MLS</div><div className="tiny">CRM · content · email · social · tasks · showings</div></Box>
      <Box className="grow" dashed><div className="hand-alt tiny">✗ requires MLS</div><div className="tiny">CMA · listing auto-fill · DOM data · comp pulls · weekly seller updates</div></Box>
    </div>
  </Desktop>;
}

function ES_NoPhotos() {
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/photos">
    <div className="hand-neat tiny muted">← 88 Elm · photos</div>
    <span className="serif" style={{ fontSize: 22 }}>No photos yet</span>
    <Box dashed style={{ textAlign:'center', padding: 32 }}>
      <div style={{ fontSize: 36, opacity: 0.4 }}>📷</div>
      <div className="serif" style={{ fontSize: 18, marginTop: 6 }}>Drop photos here · or pick a source</div>
      <div className="tiny muted">Without photos we can only generate the stylized poster. Hero photos make every channel 3× better.</div>
      <div className="row" style={{ gap: 6, marginTop: 12, justifyContent:'center' }}>
        <Btn primary>↑ upload files</Btn>
        <Btn>⇅ pull from MLS (23)</Btn>
        <Btn>⇅ pull from Listing record</Btn>
        <Btn ghost>use stylized poster only</Btn>
      </div>
    </Box>
    <div className="tiny muted">Tip: even 1 exterior + 3 interior photos makes a big difference. MLS photos auto-sync daily if linked.</div>
  </Desktop>;
}

function ES_BlotatoRateLimit() {
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/schedule">
    <div className="hand-neat tiny muted">← 88 Elm · schedule</div>
    <Box style={{ border:'2px solid var(--warn)', background:'#FFF7E3' }}>
      <div className="row between center">
        <div>
          <div className="hand-alt" style={{ color:'var(--warn)', fontSize: 15 }}>⚠ Blotato rate limit hit</div>
          <div className="tiny" style={{ color:'var(--ink)' }}>Your Blotato plan allows 50 scheduled posts / day. You have 47 queued + 6 more in this OH = 53.</div>
        </div>
        <Chip sm>50/50 · IG, TikTok</Chip>
      </div>
      <Hr />
      <div className="tiny" style={{ lineHeight: 1.7 }}>
        <b>Your options:</b><br/>
        · Upgrade Blotato to Pro ($29/mo · 200 posts/day)<br/>
        · Push 3 posts to next day (Sun Apr 26)<br/>
        · Drop lower-value channels (Threads · LinkedIn)<br/>
        · Switch this OH to manual posting
      </div>
      <div className="row" style={{ gap: 4, marginTop: 10 }}>
        <Btn primary>upgrade Blotato →</Btn>
        <Btn>push 3 to Sunday</Btn>
        <Btn ghost>manage queue →</Btn>
      </div>
    </Box>
    <Box dashed>
      <div className="hand-alt tiny">What's in your queue</div>
      <div className="tiny muted">3 other open houses · 2 content batches · 42 posts across 7 days</div>
      <Btn sm ghost style={{ marginTop: 4 }}>see all queued →</Btn>
    </Box>
  </Desktop>;
}

function ES_VistaprintOutage() {
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/print">
    <div className="hand-neat tiny muted">← 88 Elm · print</div>
    <Box style={{ border:'2px solid var(--status-danger, #c0604a)', background:'#FBEEE9' }}>
      <div className="hand-alt" style={{ color:'var(--status-danger, #c0604a)' }}>✗ Vistaprint API is down · status: investigating</div>
      <div className="tiny" style={{ color:'var(--ink)', marginTop: 4 }}>Reported 18 min ago. Their ETA: &lt; 1 hour. We're auto-retrying every 5 min.</div>
      <Hr />
      <div className="tiny" style={{ lineHeight: 1.7, color:'var(--ink)' }}>
        <b>Your options in the meantime:</b><br/>
        · Download PDFs and use your local print shop<br/>
        · Send to your title company (Marisol · First American · active)<br/>
        · Queue the order — we'll send the second Vistaprint is back<br/>
      </div>
      <div className="row" style={{ gap: 4, marginTop: 10 }}>
        <Btn primary>send to title company →</Btn>
        <Btn>↓ PDFs</Btn>
        <Btn ghost>queue for retry</Btn>
      </div>
    </Box>
    <Box dashed>
      <div className="tiny muted">We monitor 14 vendors. Fallbacks are pre-wired per category — the Print button still works even when a vendor is out.</div>
    </Box>
  </Desktop>;
}

function ES_NoLeadsYet() {
  return <Phone tabbarItems={[{label:'Home', active:true},{label:'Prospect'},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <div className="hand-alt">Your first week</div>
    <Box dashed style={{ textAlign:'center', padding: 24 }}>
      <div style={{ fontSize: 36, opacity: 0.4 }}>🌱</div>
      <div className="serif" style={{ fontSize: 16, marginTop: 6 }}>No leads yet · totally normal</div>
      <div className="tiny muted">Command will surface them as they come in. Three fast ways to seed the pipeline:</div>
    </Box>
    <Box>
      <Check>Import contacts from Lofty (est 340 contacts)</Check>
      <Check>Upload a CSV of past clients</Check>
      <Check>Paste a farm list from MLS export</Check>
      <Check>Sync SOI from your phone contacts</Check>
    </Box>
    <Box filled>
      <div className="hand-alt" style={{ fontSize: 14 }}>Or start with one open house</div>
      <div className="tiny">An OH is the fastest way to seed 20–40 leads in one weekend. Command walks you through it.</div>
      <Btn sm style={{ marginTop: 6 }}>start OH wizard →</Btn>
    </Box>
    <div className="tiny muted" style={{ textAlign:'center' }}>You'll see pipeline start filling in within 48h.</div>
  </Phone>;
}

function ES_IntegrationExpired() {
  return <Desktop active="Settings" url="command.app/settings/integrations">
    <div className="hand-alt">Integration health</div>
    <Box style={{ border:'2px solid var(--warn)', background:'#FFF7E3' }}>
      <div className="row between center">
        <div>
          <div className="hand-alt" style={{ color:'var(--warn)' }}>⚠ 2 integrations need your attention</div>
          <div className="tiny" style={{ color:'var(--ink)' }}>Nothing is broken yet. Both will stop working within 7 days if not refreshed.</div>
        </div>
        <Btn sm primary>fix both</Btn>
      </div>
    </Box>
    <div className="col" style={{ gap: 6 }}>
      <div className="row between center" style={{ padding: 10, background:'var(--paper-2)', borderRadius: 4 }}>
        <div>
          <div style={{ fontWeight: 500 }}>◆ Instagram · OAuth expires in 4 days</div>
          <div className="tiny muted">Meta rotates tokens every 60 days. One tap to refresh.</div>
        </div>
        <Btn sm primary>refresh</Btn>
      </div>
      <div className="row between center" style={{ padding: 10, background:'var(--paper-2)', borderRadius: 4 }}>
        <div>
          <div style={{ fontWeight: 500 }}>✉ Gmail · reauth needed for new scopes</div>
          <div className="tiny muted">We asked for "send on behalf" — you approved the old version.</div>
        </div>
        <Btn sm primary>reauth</Btn>
      </div>
      <div className="row between center" style={{ padding: 10, background:'var(--paper)', borderRadius: 4, border:'1px solid var(--line)' }}>
        <div>
          <div style={{ fontWeight: 500 }}>✓ Lofty · healthy</div>
          <div className="tiny muted">last sync 3 min ago · 1,847 contacts</div>
        </div>
        <Chip sm filled>ok</Chip>
      </div>
      <div className="row between center" style={{ padding: 10, background:'var(--paper)', borderRadius: 4, border:'1px solid var(--line)' }}>
        <div>
          <div style={{ fontWeight: 500 }}>✓ Blotato · healthy</div>
          <div className="tiny muted">last post 12 min ago · 47/50 today</div>
        </div>
        <Chip sm filled>ok</Chip>
      </div>
    </div>
  </Desktop>;
}

function ES_NoVoiceYet() {
  return <Desktop active="Content" url="command.app/content/new">
    <Box dashed style={{ textAlign:'center', padding: 40 }}>
      <div style={{ fontSize: 36, opacity: 0.4 }}>✎</div>
      <div className="serif" style={{ fontSize: 18, marginTop: 6 }}>You haven't trained your voice yet</div>
      <div className="tiny muted">Command can generate content, but without a voice sample it'll sound like… everyone.</div>
      <div className="row" style={{ gap: 6, marginTop: 14, justifyContent:'center' }}>
        <Btn primary>train voice (3 min)</Btn>
        <Btn>use "warm realtor" default</Btn>
        <Btn ghost>skip for now</Btn>
      </div>
    </Box>
    <div className="row" style={{ gap: 8 }}>
      <Box className="grow"><div className="hand-alt tiny">Paste samples</div><div className="tiny muted">Paste 3 recent IG captions, emails, or texts</div></Box>
      <Box className="grow"><div className="hand-alt tiny">Import from IG</div><div className="tiny muted">We'll pull your last 20 captions · 1-tap</div></Box>
      <Box className="grow"><div className="hand-alt tiny">Answer 5 Qs</div><div className="tiny muted">"how would you describe your style" etc</div></Box>
    </div>
  </Desktop>;
}

function ES_SearchNothing() {
  return <Desktop active="Search" url="command.app/search?q=birch">
    <Input value="birch" style={{ width: 400 }} />
    <Box dashed style={{ textAlign:'center', padding: 30 }}>
      <div style={{ fontSize: 32, opacity: 0.4 }}>🔎</div>
      <div className="serif" style={{ fontSize: 16, marginTop: 6 }}>No results for "birch"</div>
      <div className="tiny muted">We searched 1,847 contacts · 23 properties · 412 deals · 1.2k content items</div>
      <div className="row" style={{ gap: 6, marginTop: 10, justifyContent:'center' }}>
        <Btn sm>create contact "birch"</Btn>
        <Btn sm>search archived (47)</Btn>
        <Btn sm ghost>try a similar spelling</Btn>
      </div>
    </Box>
  </Desktop>;
}

window.EmptyStateScreens = [
  { id:'es1', label:'MLS not connected',      caption:'Dashboard · soft prompt to connect MLS with what still works without it.', Component: ES_NoMLS },
  { id:'es2', label:'No photos on OH',        caption:'OH wizard · drop/pull/use-poster choice with why it matters.',            Component: ES_NoPhotos },
  { id:'es3', label:'Blotato rate limit',     caption:'Queue full · upgrade / push / drop / manual paths.',                     Component: ES_BlotatoRateLimit },
  { id:'es4', label:'Vistaprint outage',      caption:'Hard vendor error with pre-wired fallbacks (title co, local, queue).',  Component: ES_VistaprintOutage },
  { id:'es5', label:'No leads (week 1)',      caption:'Mobile · seeding paths · "start with an OH" nudge.',                    Component: ES_NoLeadsYet },
  { id:'es6', label:'Integrations expiring',  caption:'Warning state before break · OAuth/token refresh one tap.',              Component: ES_IntegrationExpired },
  { id:'es7', label:'Voice not trained',      caption:'Blocks low-quality content · 3 training paths.',                         Component: ES_NoVoiceYet },
  { id:'es8', label:'Search · no results',    caption:'Soft failure · suggest creation · scoped count.',                         Component: ES_SearchNothing },
];


/* ===== 2 · ONBOARDING ===== */

function OB_Welcome() {
  return <Desktop active="Welcome" url="command.app/welcome">
    <div style={{ textAlign:'center', padding: '40px 20px' }}>
      <div className="serif" style={{ fontSize: 40, fontWeight: 500 }}>Welcome to Command, Dana.</div>
      <div style={{ fontSize: 16, color:'var(--muted)', marginTop: 8 }}>10 minutes to get you set up. You can skip any step and come back.</div>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 8 }}>
      {['Import contacts','Pick your voice','Connect socials','Set up farm','Link printing','First open house'].map((s, i) => (
        <Box key={i} style={{ textAlign:'center', background: i===0?'var(--accent-sage-soft,#EEF1E9)':'var(--paper-2)' }}>
          <div className="tiny mono" style={{ letterSpacing:'0.14em' }}>STEP {i+1}</div>
          <div style={{ fontWeight: 500, marginTop: 4 }}>{s}</div>
          <div className="tiny muted">~1 min</div>
        </Box>
      ))}
    </div>
    <div style={{ textAlign:'center', marginTop: 20 }}>
      <Btn primary>let's go →</Btn>
      <div className="tiny muted" style={{ marginTop: 6 }}>or <u>skip setup · take me straight to the dashboard</u></div>
    </div>
  </Desktop>;
}

function OB_Import() {
  return <Desktop active="Setup · 1 of 6" url="command.app/welcome/import">
    <div className="row between">
      <div>
        <div className="tiny mono muted">STEP 1 OF 6</div>
        <span className="serif" style={{ fontSize: 22 }}>Import your contacts</span>
      </div>
      <div className="tiny muted">skip · next →</div>
    </div>
    <div className="row" style={{ gap: 10 }}>
      {[
        ['Lofty CRM',    '1 tap · OAuth',    '~340 contacts',  true],
        ['Google contacts','1 tap · OAuth',  '~600 contacts',  false],
        ['CSV upload',   'map columns',      'any size',       false],
        ['iPhone contacts','QR to mobile',   'SOI seed',       false],
        ['MLS client list','client-side',   'export first',   false],
      ].map(([src, how, count, active], i) => (
        <Box key={i} className="grow" accent={active}>
          <div className="hand-alt" style={{ fontSize: 15 }}>{src}</div>
          <div className="tiny" style={{ opacity: active ? 0.88 : 0.7 }}>{how}</div>
          <div className="tiny" style={{ opacity: active ? 0.88 : 0.7, marginTop: 4 }}>{count}</div>
          <Btn sm style={{ marginTop: 6, background: active?'var(--paper)':undefined, color: active?'var(--ink)':undefined }}>connect</Btn>
        </Box>
      ))}
    </div>
    <Box dashed>
      <div className="hand-alt tiny">Detected: Lofty</div>
      <div className="tiny muted">We noticed your login email matches a Lofty account. 1 tap imports 340 contacts + 12 deals + your taxonomy.</div>
      <Btn sm primary style={{ marginTop: 4 }}>yes · import from Lofty</Btn>
    </Box>
  </Desktop>;
}

function OB_Voice() {
  return <Desktop active="Setup · 2 of 6" url="command.app/welcome/voice">
    <div className="tiny mono muted">STEP 2 OF 6</div>
    <span className="serif" style={{ fontSize: 22 }}>Pick (or train) your voice</span>
    <div className="tiny muted">This is how Command writes for you: captions, emails, DMs, everything. You can edit anytime.</div>

    <div className="row" style={{ gap: 10 }}>
      {[
        ['Warm realtor',       'friendly · a little emoji · ends with a question',   'default'],
        ['Luxury calm',        'restrained · no emoji · confidence',                 'picked'],
        ['Data-driven',        'market stats · numbers first · professional tone',   ''],
        ['Witty storyteller',  'anecdotes · humor · personality-forward',            ''],
        ['Train my own',       'paste samples · 3 min · best match',                 ''],
      ].map(([name, desc, tag], i) => (
        <Box key={i} className="grow" accent={tag==='picked'} style={{ minHeight: 140 }}>
          <div className="hand-alt" style={{ fontSize: 15 }}>{name}</div>
          <div className="tiny" style={{ opacity: tag==='picked'?0.88:0.7, marginTop: 4 }}>{desc}</div>
          <div className="tiny mono" style={{ marginTop: 10, background: 'var(--paper-2)', padding: 4, borderRadius: 3, color:'var(--ink)' }}>sample →</div>
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            {tag==='picked' ? <Chip sm filled>selected</Chip> : <Btn sm>pick</Btn>}
          </div>
        </Box>
      ))}
    </div>
  </Desktop>;
}

function OB_ConnectSocials() {
  return <Desktop active="Setup · 3 of 6" url="command.app/welcome/social">
    <div className="tiny mono muted">STEP 3 OF 6</div>
    <span className="serif" style={{ fontSize: 22 }}>Connect your socials</span>
    <div className="tiny muted">Where do you want Command to publish? Skip any · change anytime.</div>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8 }}>
      {[
        ['Instagram',    '✓ connected'],
        ['Facebook',     '✓ connected'],
        ['TikTok',       'connect →'],
        ['LinkedIn',     '✓ connected'],
        ['Threads',      'connect →'],
        ['Twitter/X',    'connect →'],
        ['YouTube',      'connect →'],
        ['Pinterest',    'connect →'],
      ].map(([p, state], i) => (
        <Box key={i} style={{ textAlign:'center' }}>
          <div style={{ fontWeight: 500 }}>{p}</div>
          <div className="tiny muted">{state}</div>
        </Box>
      ))}
    </div>

    <Box>
      <div className="hand-alt">✦ Use Blotato for scheduling?</div>
      <div className="tiny muted">Blotato posts to 8+ platforms from one queue. We already support Blotato if you have it.</div>
      <div className="row" style={{ gap: 4, marginTop: 6 }}>
        <Btn primary>link existing Blotato</Btn>
        <Btn>create free Blotato (referral)</Btn>
        <Btn ghost>skip · I'll post manually</Btn>
      </div>
    </Box>
  </Desktop>;
}

function OB_Farm() {
  return <Desktop active="Setup · 4 of 6" url="command.app/welcome/farm">
    <div className="tiny mono muted">STEP 4 OF 6</div>
    <span className="serif" style={{ fontSize: 22 }}>Set up your farm</span>
    <div className="tiny muted">Dropping a farm = sending mail + email to a neighborhood on a cadence. Your #1 repeat-business driver.</div>

    <Box>
      <div className="hand-alt">Your farm area</div>
      <div className="row" style={{ gap: 6, marginTop: 6 }}>
        <Input placeholder="zip code" value="85253" style={{ width: 120 }} />
        <Btn sm>+ add subdivision</Btn>
        <Btn sm>+ draw on map</Btn>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>
        85253 · Paradise Valley · <b>1,240 homeowners</b> · avg home value $1.2M · 18% turnover annual
      </div>
    </Box>

    <Box>
      <div className="hand-alt">Cadence</div>
      <div className="col" style={{ gap: 4, marginTop: 4 }}>
        <Check checked>Postcards · quarterly · EDDM</Check>
        <Check checked>Email · monthly · market update</Check>
        <Check>Door hangers · when I have an OH in zip</Check>
        <Check>Just-sold/just-listed · automatic</Check>
      </div>
    </Box>

    <Box dashed>
      <div className="hand-alt tiny">Cost estimate</div>
      <div className="tiny">postcards (1,240 × $0.28) × 4/yr = <b>$1,390/yr</b> · email = free · door hangers ~$71/event</div>
      <div className="tiny muted" style={{ marginTop: 4 }}>Title co can usually cover 50–100% of print. We'll ask them after setup.</div>
    </Box>
  </Desktop>;
}

function OB_Title() {
  return <Desktop active="Setup · 5 of 6" url="command.app/welcome/title">
    <div className="tiny mono muted">STEP 5 OF 6</div>
    <span className="serif" style={{ fontSize: 22 }}>Link your title rep (for printing)</span>
    <div className="tiny muted">Your title rep usually prints marketing for free in exchange for co-brand. We automate the handoff.</div>

    <div className="row" style={{ gap: 10 }}>
      <Box className="grow">
        <div className="hand-alt">Your rep</div>
        <div className="col" style={{ gap: 6, marginTop: 6 }}>
          <Input placeholder="Name" value="Marisol Reyes" />
          <Input placeholder="Email" value="marisol.reyes@firstam.com" />
          <Input placeholder="Phone" value="602-555-1847" />
          <Input placeholder="Title company" value="First American" />
          <Input placeholder="Monthly print budget (if known)" value="~$200" />
        </div>
        <Btn sm primary style={{ marginTop: 6 }}>save + invite Marisol to the print portal</Btn>
      </Box>
      <Box dashed style={{ width: 280 }}>
        <div className="hand-alt tiny">What Marisol will see</div>
        <div className="tiny" style={{ lineHeight: 1.6 }}>
          · one-link print portal · no login<br/>
          · every print job you send her · status-tracked<br/>
          · her logo + NMLS auto-placed on back<br/>
          · co-brand compliance badge
        </div>
      </Box>
    </div>

    <Btn ghost>I don't have a rep yet · skip</Btn>
  </Desktop>;
}

function OB_FirstOH() {
  return <Desktop active="Setup · 6 of 6" url="command.app/welcome/first-oh">
    <div className="tiny mono muted">STEP 6 OF 6 · FINAL</div>
    <span className="serif" style={{ fontSize: 22 }}>Your first open house</span>
    <div className="tiny muted">Nothing tests the whole system like running one OH. Command will walk you through.</div>

    <div className="row" style={{ gap: 10 }}>
      <Box className="grow" accent>
        <div className="hand-alt" style={{ fontSize: 16 }}>Start the OH wizard</div>
        <div className="tiny" style={{ opacity: 0.88 }}>Paste an MLS # or pick an existing listing. Takes 5 minutes. You leave with 15 assets (social + print + email) ready to go.</div>
        <Btn style={{ marginTop: 10, background:'var(--paper)', color:'var(--ink)' }}>start wizard →</Btn>
      </Box>
      <Box className="grow">
        <div className="hand-alt">Skip for now</div>
        <div className="tiny muted">Command is fully usable. Jump to the dashboard — we'll nudge you when you're ready.</div>
        <Btn sm style={{ marginTop: 10 }}>take me to my dashboard</Btn>
      </Box>
    </div>

    <Box dashed>
      <div className="hand-alt tiny">✓ done during setup</div>
      <div className="tiny muted">340 contacts imported · voice trained (Luxury calm) · 4 platforms linked · 85253 farm · Marisol at First American</div>
    </Box>
  </Desktop>;
}

window.OnboardingScreens = [
  { id:'ob1', label:'Welcome · 6-step overview', caption:'Expectation-setting splash. Each step ~1 min. Any step skippable.',       Component: OB_Welcome },
  { id:'ob2', label:'Step 1 · import contacts',  caption:'Detected Lofty · 5 source options · one-tap Lofty import.',               Component: OB_Import },
  { id:'ob3', label:'Step 2 · pick voice',       caption:'4 presets + "train my own" · sample output on hover.',                     Component: OB_Voice },
  { id:'ob4', label:'Step 3 · connect socials',  caption:'8 platforms grid · Blotato offer as the scheduling backbone.',            Component: OB_ConnectSocials },
  { id:'ob5', label:'Step 4 · set up farm',      caption:'Pick area · cadence · cost estimate with title-co offset note.',           Component: OB_Farm },
  { id:'ob6', label:'Step 5 · link title rep',   caption:'Capture rep + invite to the print portal (no login on their end).',       Component: OB_Title },
  { id:'ob7', label:'Step 6 · first open house', caption:'Nudge into OH wizard OR skip · setup summary at bottom.',                  Component: OB_FirstOH },
];


/* ===== 3 · SETTINGS / PROFILE / BILLING ===== */

function ST_Profile() {
  return <Desktop active="Settings" url="command.app/settings/profile">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Profile & brand</span>
      <Btn sm primary>save</Btn>
    </div>
    <div className="row" style={{ gap: 12, alignItems:'flex-start' }}>
      <Box className="grow">
        <div className="hand-alt">Agent info</div>
        <div className="col" style={{ gap: 6, marginTop: 6 }}>
          <Input placeholder="Full name" value="Dana Massey" />
          <Input placeholder="Phone" value="602-555-8821" />
          <Input placeholder="Email" value="dana@danamassey.com" />
          <Input placeholder="License #" value="SA702218000" />
          <Input placeholder="Brokerage" value="REAL Broker AZ, LLC" />
          <Input placeholder="Markets" value="Paradise Valley · Scottsdale · N Phoenix" />
          <Input placeholder="Bio (one sentence)" value="Paradise Valley specialist · buyer's agent by nature · 11 yrs in" />
        </div>
        <Hr />
        <div className="hand-alt">Brand kit</div>
        <div className="row" style={{ gap: 4, marginTop: 6 }}>
          {['#3A2A1E','#B79782','#EFEDE8','#8B9A7B'].map(c => <div key={c} style={{ width: 28, height: 28, borderRadius: 4, background: c, border:'1px solid var(--line)' }} />)}
          <Btn sm ghost style={{ marginLeft: 8 }}>edit palette</Btn>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <Chip sm>display: Cormorant Garamond</Chip>
          <Chip sm>body: Nunito Sans</Chip>
          <Btn sm ghost>change</Btn>
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>Used on every poster, door hanger, flyer, email, OH sign, buyer packet.</div>
      </Box>
      <Box style={{ width: 280 }}>
        <div className="hand-alt tiny">Headshot + logo</div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background:'linear-gradient(135deg, #D8C2A6, #B79782)', border:'1px solid var(--line)' }} />
          <div>
            <div className="tiny">headshot</div>
            <Btn sm ghost>change</Btn>
          </div>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <div style={{ width: 80, height: 80, borderRadius: 4, background:'#EFEDE8', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Cormorant Garamond',serif" }}>DM</div>
          <div>
            <div className="tiny">logo</div>
            <Btn sm ghost>change</Btn>
          </div>
        </div>
      </Box>
    </div>
  </Desktop>;
}

function ST_Team() {
  return <Desktop active="Settings" url="command.app/settings/team">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Team</span>
      <Btn sm primary>+ invite</Btn>
    </div>

    <Box>
      <table style={{ width:'100%', fontSize: 13 }}>
        <thead>
          <tr style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize: 10, letterSpacing:'0.1em', color:'var(--muted)', textAlign:'left' }}>
            <th style={{ padding:'6px 4px' }}>NAME</th><th>ROLE</th><th>ACCESS</th><th>LAST SEEN</th><th></th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Dana Massey',     'Owner',              'Everything',                       'now'],
            ['Elena Park',      'Showing agent',       'Buyer flows · calendar',           '12m ago'],
            ['Josh Tran',       'Marketing assistant', 'Content · social · email (review)','2h ago'],
            ['Marisol Reyes',   'Title rep (external)', 'Print portal · link-only',         'last week'],
          ].map((r, i) => (
            <tr key={i} style={{ borderTop:'1px solid var(--line)' }}>
              <td style={{ padding:'8px 4px', fontWeight: 500 }}>{r[0]}</td>
              <td>{r[1]}</td>
              <td className="tiny muted">{r[2]}</td>
              <td className="tiny muted">{r[3]}</td>
              <td style={{ textAlign:'right' }}><Btn sm ghost>manage</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Box dashed>
      <div className="hand-alt tiny">Role templates</div>
      <div className="tiny muted" style={{ marginBottom: 6 }}>granular permissions · applied when you invite someone</div>
      <div className="row wrap" style={{ gap: 4 }}>
        <Chip sm filled>Owner</Chip>
        <Chip sm>Co-agent</Chip>
        <Chip sm>Showing agent</Chip>
        <Chip sm>Marketing asst</Chip>
        <Chip sm>Transaction coord</Chip>
        <Chip sm>External (link)</Chip>
        <Chip sm dashed>+ custom</Chip>
      </div>
    </Box>
  </Desktop>;
}

function ST_Billing() {
  return <Desktop active="Settings" url="command.app/settings/billing">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Plan & billing</span>
      <Btn sm>invoices</Btn>
    </div>

    <div className="row" style={{ gap: 10 }}>
      <Box className="grow" accent>
        <div className="tiny mono" style={{ opacity: 0.8 }}>YOUR PLAN</div>
        <div className="serif" style={{ fontSize: 28 }}>Command · Pro</div>
        <div className="tiny" style={{ opacity: 0.88 }}>$149/mo · annual billing · $1,788/yr</div>
        <Hr />
        <div className="tiny" style={{ opacity: 0.88 }}>includes · unlimited contacts · AI credits to 50k/mo · 8 platforms · 2 team seats · print-portal</div>
        <Btn sm style={{ marginTop: 8, background:'var(--paper)', color:'var(--ink)' }}>compare plans →</Btn>
      </Box>
      <Box className="grow">
        <div className="tiny mono muted">THIS MONTH</div>
        <div className="serif" style={{ fontSize: 22 }}>42% used</div>
        <div className="tiny muted">of AI credits · 21k / 50k</div>
        <Hr />
        <div className="tiny">· 820 content drafts<br/>· 340 captions<br/>· 14 CMAs<br/>· 82 email rewrites</div>
      </Box>
      <Box className="grow">
        <div className="tiny mono muted">NEXT BILL</div>
        <div className="serif" style={{ fontSize: 22 }}>May 3</div>
        <div className="tiny muted">$149.00 · card ending 4421</div>
        <Hr />
        <Btn sm ghost>change card</Btn>
      </Box>
    </div>

    <Box>
      <div className="hand-alt">Add-ons</div>
      <div className="col" style={{ gap: 6, marginTop: 6 }}>
        <div className="row between center" style={{ padding: 6, background:'var(--paper-2)', borderRadius: 4 }}>
          <div><div style={{ fontWeight: 500 }}>Extra AI credits · +50k/mo</div><div className="tiny muted">$39/mo · for heavy content months</div></div>
          <Chip sm>off</Chip>
        </div>
        <div className="row between center" style={{ padding: 6, background:'var(--paper-2)', borderRadius: 4 }}>
          <div><div style={{ fontWeight: 500 }}>Additional team seat</div><div className="tiny muted">$29/seat/mo · you have 2/2 used</div></div>
          <Btn sm>add seat</Btn>
        </div>
        <div className="row between center" style={{ padding: 6, background:'var(--paper-2)', borderRadius: 4 }}>
          <div><div style={{ fontWeight: 500 }}>Premium voice model</div><div className="tiny muted">$19/mo · sharper tone matching</div></div>
          <Chip sm filled>on</Chip>
        </div>
      </div>
    </Box>

    <Box dashed>
      <div className="hand-alt tiny">Third-party costs (pass-through)</div>
      <div className="tiny muted">These bill directly to their services — we just show them here:</div>
      <div className="tiny">· Blotato Pro · $29/mo<br/>· Vistaprint orders · $84 MTD<br/>· EDDM postage · $310 MTD<br/>· Twilio SMS · $12 MTD</div>
    </Box>
  </Desktop>;
}

function ST_Preferences() {
  return <Desktop active="Settings" url="command.app/settings/preferences">
    <span className="serif" style={{ fontSize: 22 }}>Preferences</span>
    <div className="row" style={{ gap: 10 }}>
      <Box className="grow">
        <div className="hand-alt">Notifications</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          <Check checked>new lead · push + SMS</Check>
          <Check checked>buyer reply · push</Check>
          <Check checked>print link viewed by title rep · push</Check>
          <Check>daily morning digest · 7am</Check>
          <Check>weekly performance · Sun 4pm</Check>
          <Check>system health · only if broken</Check>
        </div>
      </Box>
      <Box className="grow">
        <div className="hand-alt">Quiet hours</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          <div className="row between"><span>Weeknights</span><Input value="9pm – 7am" style={{ width: 120 }} /></div>
          <div className="row between"><span>Sundays</span><Input value="all day" style={{ width: 120 }} /></div>
          <Check>emergency overrides (active deal · client-in-motion)</Check>
        </div>
      </Box>
      <Box className="grow">
        <div className="hand-alt">Privacy</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          <Check checked>AI may use my content to improve my models</Check>
          <Check>AI may use my content to improve other agents' models (opt-in)</Check>
          <Check checked>show compliance badge on public assets</Check>
        </div>
      </Box>
    </div>
  </Desktop>;
}

window.SettingsScreens = [
  { id:'set1', label:'Profile & brand', caption:'Agent info + brand kit (colors, fonts, headshot, logo) that flow into every generated asset.', Component: ST_Profile },
  { id:'set2', label:'Team',            caption:'Invite, role templates, permission scoping · includes external print-portal access.',            Component: ST_Team },
  { id:'set3', label:'Plan & billing',  caption:'Plan tier, usage (AI credits), add-ons, third-party passthrough costs broken out.',              Component: ST_Billing },
  { id:'set4', label:'Preferences',     caption:'Notifications · quiet hours · privacy / AI model opt-ins.',                                      Component: ST_Preferences },
];

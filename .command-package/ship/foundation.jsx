/* ============================================================
   FOUNDATION SCREENS
   Onboarding · Empty states · Settings / "Me" hub
   Date tracking · Conflict resolver
   ============================================================ */

/* ====================== ONBOARDING ====================== */

function Onboard1_Welcome() {
  return <Desktop active="Onboarding" url="command.app/welcome">
    <div style={{ maxWidth: 820, margin: '40px auto' }}>
      <div className="serif" style={{ fontSize: 40, lineHeight: 1.1 }}>Welcome to Command, Dana.</div>
      <div className="muted" style={{ marginTop: 8, fontSize: 16 }}>Let's get you running in ~10 minutes. Skip anything — it'll wait in your setup checklist.</div>

      <Box style={{ marginTop: 28, padding: 20 }}>
        <div className="hand-alt" style={{ marginBottom: 10 }}>Before we start</div>
        <div className="tiny muted" style={{ marginBottom: 14 }}>Command replaces ~8 tools. Here's what we need from you:</div>
        {[
          ['Your Lofty account',  'To import contacts + keep them in sync',    'have login ready'],
          ['Your brokerage info', 'Name, logo, broker supervisor, license #',   'have license # handy'],
          ['Your headshot + b-roll', 'We index them for video + email',         'can upload later'],
          ['Blotato API key',     'For IG/FB/TT auto-posting',                  'we\'ll help you get it'],
          ['Slack workspace',     'For daily brief + notifications',            'optional — skip if not using'],
        ].map((r, i) => (
          <div key={i} className="row between" style={{ padding: '10px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div>
              <div>{r[0]}</div>
              <div className="tiny muted">{r[1]}</div>
            </div>
            <Chip sm>{r[2]}</Chip>
          </div>
        ))}
      </Box>

      <div className="row" style={{ gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
        <Btn ghost>I'll do this later</Btn>
        <Btn primary>Start setup →</Btn>
      </div>

      <Box dashed style={{ marginTop: 16, padding: 10 }}>
        <div className="tiny mono">STEP 0/6 · Welcome</div>
      </Box>
    </div>
  </Desktop>;
}

function Onboard2_LoftyImport() {
  return <Desktop active="Onboarding" url="command.app/welcome/lofty">
    <div style={{ maxWidth: 900, margin: '24px auto' }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">Step 1 of 6</div>
          <div className="serif" style={{ fontSize: 28 }}>Connect Lofty</div>
        </div>
        <Chip>skip for now</Chip>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 16 }}>
        <Box className="grow">
          <div className="hand-alt tiny">OAuth</div>
          <Btn primary block style={{ marginTop: 8 }}>Sign in with Lofty →</Btn>
          <div className="tiny muted" style={{ marginTop: 8 }}>Read-only first. You'll review before anything syncs.</div>
        </Box>
        <Box className="grow">
          <div className="hand-alt tiny">API Key (advanced)</div>
          <Input placeholder="paste Lofty API key" style={{ marginTop: 8 }} />
          <div className="tiny muted" style={{ marginTop: 8 }}>Settings → Integrations → API Keys in Lofty.</div>
        </Box>
      </div>

      <Box style={{ marginTop: 16, padding: 16, background: 'var(--accent-sage-2)' }}>
        <div className="row between">
          <div className="hand-alt">Connected · lofty.com/dana-reeves</div>
          <Chip sm ok>✓ authorized</Chip>
        </div>
        <Hr />
        <div className="tiny muted" style={{ marginBottom: 8 }}>We found:</div>
        <div className="row" style={{ gap: 20, flexWrap: 'wrap' }}>
          <div><div className="serif" style={{ fontSize: 28 }}>847</div><div className="tiny muted">contacts</div></div>
          <div><div className="serif" style={{ fontSize: 28 }}>23</div><div className="tiny muted">active buyer searches</div></div>
          <div><div className="serif" style={{ fontSize: 28 }}>4</div><div className="tiny muted">open transactions</div></div>
          <div><div className="serif" style={{ fontSize: 28 }}>61</div><div className="tiny muted">tags</div></div>
          <div><div className="serif" style={{ fontSize: 28 }}>12</div><div className="tiny muted">smart lists</div></div>
        </div>
      </Box>

      <Box dashed style={{ marginTop: 14, padding: 12 }}>
        <div className="hand-alt">What to do with each</div>
        <Hr />
        {[
          ['Contacts',       'Import all 847 · map tags · detect duplicates', 'review'],
          ['Buyer searches', 'Keep running in Lofty · we read results',       'read-only'],
          ['Transactions',   'Duplicate to Command? Most stay in Transact',  'skip for now'],
          ['Smart lists',    'Convert 12 → Command segments',                 'convert all'],
          ['Tags',           '61 tags → we\'ll show dupes + suggest merges',   'review'],
        ].map((r, i) => (
          <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div><div>{r[0]}</div><div className="tiny muted">{r[1]}</div></div>
            <Chip sm>{r[2]}</Chip>
          </div>
        ))}
      </Box>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Btn ghost>skip Lofty</Btn>
        <Btn>review → </Btn>
        <Btn primary>Sync everything</Btn>
      </div>
    </div>
  </Desktop>;
}

function Onboard3_Brokerage() {
  return <Desktop active="Onboarding" url="command.app/welcome/brokerage">
    <div style={{ maxWidth: 900, margin: '24px auto' }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">Step 2 of 6</div>
          <div className="serif" style={{ fontSize: 28 }}>Brokerage + compliance</div>
        </div>
        <Chip sm>required for disclosures</Chip>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 16 }}>
        <Box className="grow" style={{ flex: 1 }}>
          <div className="hand-alt tiny">Brokerage</div>
          <Input placeholder="Compass · 450 Broadway · SF, CA 94133" style={{ marginTop: 6 }} />
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <Input placeholder="License # (you)" />
            <Input placeholder="License # (broker)" />
          </div>
          <Input placeholder="Broker supervisor (name + email)" style={{ marginTop: 8 }} />
          <Box dashed style={{ marginTop: 10, padding: 8 }}>
            <div className="tiny muted">Uploaded · compass_logo.svg · compass_disclaimer.txt</div>
          </Box>
        </Box>
        <Box className="grow" style={{ flex: 1, background: 'var(--accent-tan-2)' }}>
          <div className="hand-alt tiny">What we'll auto-apply</div>
          <div style={{ marginTop: 8 }}>
            {['Email signature footer','Blog post author bio','Listing flyer broker line','Open house sign disclaimer','Social caption compliance tag','Video end-card'].map((l,i)=>(
              <div key={i} style={{ padding: '5px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>{l}</div>
            ))}
          </div>
        </Box>
      </div>

      <Box style={{ marginTop: 16, padding: 14 }}>
        <div className="hand-alt tiny">State-specific disclosures</div>
        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {['CA TDS','CA NHD','Agency disclosure','Dual agency','Megan\'s Law','Fair Housing'].map(x => <Chip key={x} sm filled>{x}</Chip>)}
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>Command will attach the right ones per transaction. You can override per-deal.</div>
      </Box>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Btn ghost>save for later</Btn>
        <Btn primary>Continue →</Btn>
      </div>
    </div>
  </Desktop>;
}

function Onboard4_Brand() {
  return <Desktop active="Onboarding" url="command.app/welcome/brand">
    <div style={{ maxWidth: 900, margin: '24px auto' }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">Step 3 of 6</div>
          <div className="serif" style={{ fontSize: 28 }}>Your brand kit</div>
        </div>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 16 }}>
        <Box className="grow">
          <div className="hand-alt tiny">Headshot</div>
          <Box dashed style={{ height: 160, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-2)' }}>
            <Btn sm primary>Upload headshot</Btn>
          </Box>
          <div className="tiny muted" style={{ marginTop: 6 }}>We use this everywhere — sigs, flyers, video thumbnails.</div>
        </Box>
        <Box className="grow">
          <div className="hand-alt tiny">Logo (optional)</div>
          <Box dashed style={{ height: 160, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-2)' }}>
            <Btn sm>Upload logo</Btn>
          </Box>
          <div className="tiny muted" style={{ marginTop: 6 }}>SVG preferred. We'll use inverted on dark backgrounds.</div>
        </Box>
      </div>

      <Box style={{ marginTop: 14 }}>
        <div className="hand-alt tiny">Palette · detected from headshot + logo</div>
        <div className="row" style={{ gap: 10, marginTop: 8 }}>
          {['#2a1f17','#be7b56','#b38f63','#8a987a','#b06a73','#f5f1ea'].map(c => (
            <div key={c} className="row center" style={{ gap: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: c, border: '1px solid var(--line)' }} />
              <div className="tiny mono">{c}</div>
            </div>
          ))}
          <Btn sm ghost style={{ marginLeft: 'auto' }}>edit palette</Btn>
        </div>
      </Box>

      <Box style={{ marginTop: 14 }}>
        <div className="hand-alt tiny">Fonts</div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <Chip sm filled>Display · Cormorant Garamond</Chip>
          <Chip sm filled>Body · Nunito Sans</Chip>
          <Chip sm>change</Chip>
        </div>
      </Box>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Btn ghost>skip</Btn>
        <Btn primary>Continue →</Btn>
      </div>
    </div>
  </Desktop>;
}

function Onboard5_Voice() {
  return <Desktop active="Onboarding" url="command.app/welcome/voice">
    <div style={{ maxWidth: 900, margin: '24px auto' }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">Step 4 of 6</div>
          <div className="serif" style={{ fontSize: 28 }}>Train your AI voice</div>
        </div>
        <Chip sm>~3 min</Chip>
      </div>

      <Box style={{ marginTop: 16, padding: 16 }}>
        <div className="hand-alt">Two ways — pick both if you can:</div>

        <div style={{ marginTop: 12 }}>
          <div className="row between">
            <div><b>1 · Upload your real emails (5–10)</b><div className="tiny muted">Sent folder drop-in. We extract tone, not content.</div></div>
            <Btn sm>choose files</Btn>
          </div>
          <Hr />
          <div className="row between">
            <div><b>2 · Speak for 60 seconds</b><div className="tiny muted">"Tell me about your last open house." We learn cadence + vocabulary.</div></div>
            <Btn sm primary>Record</Btn>
          </div>
          <Hr />
          <div className="row between">
            <div><b>3 · Pick a base voice</b><div className="tiny muted">Skip custom — use a preset. You can blend later.</div></div>
            <div className="row" style={{ gap: 6 }}>
              {['warm-local','no-fluff','polished','conversational'].map(v => <Chip key={v} sm>{v}</Chip>)}
            </div>
          </div>
        </div>
      </Box>

      <Box dashed style={{ marginTop: 14, padding: 12 }}>
        <div className="hand-alt tiny">Preview · same email, your voice vs Chet's</div>
        <div className="row" style={{ gap: 10, marginTop: 8 }}>
          <Box className="grow" style={{ padding: 10 }}>
            <div className="tiny mono">DANA · trained</div>
            <div className="tiny" style={{ marginTop: 6 }}>"Hey Kim — so the Maple one was a no. Walked it twice, kitchen was smaller than it showed. I've got three more saved for Sat, want me to line them up?"</div>
          </Box>
          <Box className="grow" style={{ padding: 10, background: 'var(--paper-2)' }}>
            <div className="tiny mono">GENERIC AI</div>
            <div className="tiny" style={{ marginTop: 6 }}>"Dear Kim, Thank you for viewing 123 Maple Street. Based on your feedback, the kitchen did not meet your expectations. I have identified three additional properties that align with your criteria for Saturday's showings. Please advise."</div>
          </Box>
        </div>
      </Box>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Btn ghost>use preset</Btn>
        <Btn primary>Train my voice →</Btn>
      </div>
    </div>
  </Desktop>;
}

function Onboard6_FirstOH() {
  return <Desktop active="Onboarding" url="command.app/welcome/first-open-house">
    <div style={{ maxWidth: 900, margin: '24px auto' }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">Step 5 of 6</div>
          <div className="serif" style={{ fontSize: 28 }}>Set up your first open house</div>
        </div>
        <Chip sm>demo mode · won't send anything real</Chip>
      </div>

      <Box style={{ marginTop: 16, padding: 16 }}>
        <div className="hand-alt tiny">Pick a listing (or use our sample)</div>
        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <Chip filled>🏠 sample · 2222 Yellow Wood · $649k</Chip>
          <Chip>enter address...</Chip>
        </div>
        <Hr />
        <div className="hand-alt tiny" style={{ marginTop: 6 }}>Date · time</div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <Input defaultValue="Sat, Apr 26" style={{ maxWidth: 220 }} />
          <Input defaultValue="1:00 – 3:00 pm" style={{ maxWidth: 220 }} />
          <Chip sm>☀️ 68°F · light wind</Chip>
        </div>
        <Hr />
        <div className="hand-alt tiny">Command will set up:</div>
        <div style={{ marginTop: 6 }}>
          {[
            ['Kiosk QR + sign-in form',       'right now'],
            ['Printed flyers via Vistaprint', 'today — arrives Thu'],
            ['Lockbox install',                'Fri 5pm'],
            ['Sign delivery + install',        'Fri 3pm'],
            ['Blotato IG/FB/TT posts',        'Wed, Fri, Sat morning'],
            ['Follow-up email drafts (x2)',   'Sat night + Mon morning'],
            ['Weather-aware reminder',         'checks Fri night'],
          ].map((r,i) => (
            <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
              <div>{r[0]}</div><span className="tiny muted">{r[1]}</span>
            </div>
          ))}
        </div>
      </Box>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
        <Btn ghost>skip — I'll do this later</Btn>
        <Btn primary>Set up open house →</Btn>
      </div>
    </div>
  </Desktop>;
}

function Onboard7_Done() {
  return <Desktop active="Onboarding" url="command.app/welcome/done">
    <div style={{ maxWidth: 780, margin: '60px auto', textAlign: 'center' }}>
      <div className="serif" style={{ fontSize: 48, lineHeight: 1.05 }}>You're in.</div>
      <div className="muted" style={{ marginTop: 10 }}>Five more pieces ready when you are — no rush.</div>

      <Box style={{ marginTop: 24, textAlign: 'left', padding: 16 }}>
        <div className="hand-alt tiny">Setup checklist · 5 items remaining</div>
        <Hr />
        {[
          ['Connect Blotato',               'IG + FB + TikTok + Pinterest auto-posting',  '5 min'],
          ['Upload your b-roll library',    'b-roll for Remotion + email',    '15 min'],
          ['Connect Slack',                  'Daily brief + notifications',    '3 min'],
          ['Set up KPIs + goals',           '2026 scoreboard',                '10 min'],
          ['Import existing email templates','We\'ll check for conflicts',    '5 min · has conflicts'],
        ].map((r, i) => (
          <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div>
              <div>{r[0]}</div>
              <div className="tiny muted">{r[1]}</div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="tiny muted">{r[2]}</span>
              <Btn sm primary>→</Btn>
            </div>
          </div>
        ))}
      </Box>

      <div className="row" style={{ justifyContent: 'center', gap: 10, marginTop: 20 }}>
        <Btn primary>Open my dashboard →</Btn>
      </div>
    </div>
  </Desktop>;
}

window.OnboardingScreens = [
  { id: 'ob1', label: 'V1 · Welcome',         caption: 'Pre-flight checklist. What we need before setup.',                 Component: Onboard1_Welcome },
  { id: 'ob2', label: 'V2 · Lofty import',    caption: 'OAuth + dry-run. Review 847 contacts, 12 lists, 61 tags before syncing.', Component: Onboard2_LoftyImport },
  { id: 'ob3', label: 'V3 · Brokerage',       caption: 'Compliance data. Auto-fills signatures, disclaimers, disclosures.', Component: Onboard3_Brokerage },
  { id: 'ob4', label: 'V4 · Brand kit',       caption: 'Headshot · logo · palette (auto-detected) · fonts.',               Component: Onboard4_Brand },
  { id: 'ob5', label: 'V5 · Voice training',  caption: 'Upload emails, speak 60s, or pick a preset. Preview shows the difference.', Component: Onboard5_Voice },
  { id: 'ob6', label: 'V6 · First open house',caption: 'Walk through a real example. Every automation previewed.',         Component: Onboard6_FirstOH },
  { id: 'ob7', label: 'V7 · Done',            caption: 'Setup checklist for the rest — keep going at your own pace.',       Component: Onboard7_Done },
];

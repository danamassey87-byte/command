/* ============================================================
   SETTINGS / "ME" HUB · DATE TRACKING · CONFLICT RESOLVER
   ============================================================ */

/* ====================== SETTINGS / ME ====================== */

function SettingsV1_Me() {
  // The "get to know me" control center — expands the existing brokerage/sig settings
  // into a full identity hub. AI reads from here to personalize everything.
  return <Desktop active="Settings · Me" url="command.app/settings/me">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">YOUR CONTROL CENTER</div>
        <div className="serif" style={{ fontSize: 28 }}>Me</div>
        <div className="tiny muted">Everything Command knows about you. Used to personalize every draft, post, video, email.</div>
      </div>
      <Btn sm>export my data</Btn>
    </div>

    <div className="row" style={{ gap: 12, marginTop: 14 }}>
      {/* Left rail — sub-nav */}
      <Box style={{ width: 200, padding: 0 }}>
        {[
          ['Identity',        'name · headshot · bio',              true],
          ['Brand',           'colors · fonts · logo · feel',       false],
          ['Voice + tone',    'how I write · AI training',          false],
          ['Brokerage',       'compliance · license · disclosures', false],
          ['Signatures',      'email sig · video end-card · bio',   false],
          ['Avatars',         'for Remotion + video generation',    false],
          ['Social handles',  'IG · FB · TT · LN · YT',             false],
          ['Personal',        'spouse · kids · pets · hobbies',     false],
          ['Business',        'farm areas · specialties · stats',   false],
          ['Service',         'hours · rules · auto-reply',         false],
        ].map((r, i) => (
          <div key={i} className="row between" style={{ padding: '10px 12px', borderTop: i ? '1px dashed var(--faint)' : 'none', background: r[2] ? 'var(--accent-sage-2)' : 'transparent' }}>
            <div>
              <div style={{ fontSize: 13 }}>{r[0]}</div>
              <div className="tiny muted">{r[1]}</div>
            </div>
            {r[2] && <Chip sm filled>●</Chip>}
          </div>
        ))}
      </Box>

      {/* Right — Identity content */}
      <div className="grow">
        <Box>
          <div className="row" style={{ gap: 14 }}>
            <Box dashed style={{ width: 140, height: 140, background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="tiny muted">headshot.jpg</div>
            </Box>
            <div className="grow">
              <div className="tiny mono">DISPLAY NAME</div>
              <Input defaultValue="Dana Reeves" style={{ marginTop: 4 }} />
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1 }}><div className="tiny mono">LEGAL NAME</div><Input defaultValue="Dana M. Reeves" style={{ marginTop: 4 }} /></div>
                <div style={{ flex: 1 }}><div className="tiny mono">PRONOUNS</div><Input defaultValue="she/her" style={{ marginTop: 4 }} /></div>
              </div>
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <div style={{ flex: 1 }}><div className="tiny mono">PHONE</div><Input defaultValue="(408) 555-0199" style={{ marginTop: 4 }} /></div>
                <div style={{ flex: 1 }}><div className="tiny mono">EMAIL</div><Input defaultValue="dana@reevesrealty.com" style={{ marginTop: 4 }} /></div>
              </div>
            </div>
          </div>
        </Box>

        <Box style={{ marginTop: 12 }}>
          <div className="hand-alt tiny">Bio variants · AI picks the right length for the context</div>
          <Hr />
          {[
            ['Short · 1 line',        'Austin + Round Rock realtor. Calm, fact-first, renovation nerd.',                                           'sig · social'],
            ['Medium · 3 sentences',  'Dana Reeves has been helping Austin-area families buy and sell since 2019. She specializes in renovated homes and first-time buyers. Known for plain-English guidance and never over-promising.', 'bio link · about'],
            ['Long · 150 words',      '(click to expand — used on press kit, longer profiles, and broker-intro emails)',                           'press kit'],
            ['Why I do this',         'I grew up watching my mom go through 4 moves with the wrong agent. I built this practice to be the opposite.', 'personal'],
          ].map((r, i) => (
            <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
              <div className="row between"><b>{r[0]}</b><Chip sm>{r[2]}</Chip></div>
              <div className="tiny muted" style={{ marginTop: 4 }}>{r[1]}</div>
            </div>
          ))}
          <Btn sm ghost style={{ marginTop: 8 }}>+ add variant</Btn>
        </Box>

        <Box style={{ marginTop: 12, padding: 14, background: 'var(--accent-tan-2)' }}>
          <div className="hand-alt">What AI uses this for</div>
          <div className="tiny muted" style={{ marginTop: 6 }}>Every email sig · blog author bio · social caption · video intro · bio link · press one-pager · podcast intro.</div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

function SettingsV2_Avatars() {
  return <Desktop active="Settings · Avatars" url="command.app/settings/avatars">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">ME · AVATARS</div>
        <div className="serif" style={{ fontSize: 28 }}>For video + Remotion</div>
        <div className="tiny muted">Use these in auto-generated videos, talking-head overlays, YouTube intros.</div>
      </div>
      <Btn primary>Upload new →</Btn>
    </div>

    <div className="row" style={{ gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
      {[
        ['Primary headshot',    'default · most contexts',   'sage'],
        ['Casual b-roll still', 'blog · personal posts',     'tan'],
        ['Sign photo',          'for open house signs',      'tan'],
        ['Talking-head intro',  'video end-card · YouTube', 'rose'],
        ['Action shot',         'walking up to a listing',   'tan'],
        ['Holiday variant',     'seasonal campaigns',        'tan'],
      ].map((r, i) => (
        <Box key={i} style={{ width: 260, padding: 10 }}>
          <Box dashed style={{ height: 160, background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="tiny muted">{r[0]}.jpg</span>
          </Box>
          <div className="row between" style={{ marginTop: 8 }}>
            <div>
              <div>{r[0]}</div>
              <div className="tiny muted">{r[1]}</div>
            </div>
            <Chip sm>{r[2]}</Chip>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <Btn sm>crop</Btn><Btn sm>set default</Btn><Btn sm ghost>remove</Btn>
          </div>
        </Box>
      ))}
    </div>

    <Box style={{ marginTop: 16, padding: 14 }}>
      <div className="hand-alt tiny">Remotion templates using your avatars</div>
      <Hr />
      {[
        ['Listing reveal (15s)',  'Primary headshot · intro card'],
        ['Market recap (45s)',    'Talking-head intro · b-roll transitions'],
        ['OH invite (10s)',       'Sign photo · Sat outro'],
        ['YouTube intro (6s)',    'Action shot · branded end-card'],
      ].map((r, i) => (
        <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div>{r[0]}</div><span className="tiny muted">{r[1]}</span>
        </div>
      ))}
    </Box>
  </Desktop>;
}

function SettingsV3_Personal() {
  return <Desktop active="Settings · Personal" url="command.app/settings/personal">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">ME · PERSONAL</div>
        <div className="serif" style={{ fontSize: 28 }}>Get to know me</div>
        <div className="tiny muted">Fuels AI personalization. Only you see this — never sent to clients unless you explicitly use it.</div>
      </div>
      <Chip sm>🔒 private</Chip>
    </div>

    <div className="row" style={{ gap: 12, marginTop: 14 }}>
      <Box className="grow">
        <div className="hand-alt tiny">Family</div>
        <Hr />
        {[
          ['Spouse',   'Miguel · met 2014',                  'often in posts'],
          ['Kids',     'Lila (6) · Theo (3)',                'occasional'],
          ['Pets',     'Biscuit (golden, 4yo)',              'often in posts'],
          ['Parents',  'Bea (Austin) · Ray (retired, TX)',  'rarely'],
        ].map((r, i) => (
          <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div><b>{r[0]}</b> · <span className="tiny muted">{r[1]}</span></div>
            <Chip sm>{r[2]}</Chip>
          </div>
        ))}

        <div className="hand-alt tiny" style={{ marginTop: 12 }}>Hobbies + interests</div>
        <Hr />
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {['running (trail)','gardening','bread baking','60s design','mid-century reno','college soccer (ex-player)','Austin FC games','bourbon'].map(x => <Chip key={x} sm>{x}</Chip>)}
          <Chip sm ghost>+ add</Chip>
        </div>
      </Box>

      <Box className="grow">
        <div className="hand-alt tiny">Values + how you work</div>
        <Hr />
        <textarea className="wf-input" rows={5} defaultValue="Never oversell. If a house is wrong for someone, I say so. I over-communicate during the ugly parts of a deal. I pick my clients carefully — I'd rather have 12 great ones than 30 okay ones." />

        <div className="hand-alt tiny" style={{ marginTop: 12 }}>Things I won't do</div>
        <Hr />
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {['fake urgency','"dream home" copy','hype-y emojis','discriminatory content','comp brag posts'].map(x => <Chip key={x} sm>{x}</Chip>)}
          <Chip sm ghost>+ add</Chip>
        </div>

        <div className="hand-alt tiny" style={{ marginTop: 12 }}>Favorite stories / anecdotes</div>
        <Hr />
        <div className="tiny muted" style={{ marginTop: 4 }}>AI weaves these in where relevant · you approve each use.</div>
        {[
          ['"The yellow door"', 'client who painted her door yellow after closing · I show up to showings with yellow flowers now'],
          ['Biscuit at inspections', 'dog comes to every inspection · clients love it'],
          ['My own reno',      'we gutted our 1962 house in 2021 · I know what that\'s like'],
        ].map((r,i) => (
          <div key={i} style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <b>{r[0]}</b><div className="tiny muted">{r[1]}</div>
          </div>
        ))}
      </Box>
    </div>
  </Desktop>;
}

function SettingsV4_BrandKit() {
  return <Desktop active="Settings · Brand" url="command.app/settings/brand">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">ME · BRAND KIT</div>
        <div className="serif" style={{ fontSize: 28 }}>Colors · fonts · feel</div>
      </div>
      <Btn sm>Export brand sheet PDF</Btn>
    </div>

    <div className="row" style={{ gap: 12, marginTop: 14 }}>
      <Box className="grow">
        <div className="hand-alt tiny">Palette</div>
        <Hr />
        {[
          ['Ink',         '#2a1f17', 'text · headers'],
          ['Accent tan',  '#be7b56', 'primary actions · highlights'],
          ['Accent sage', '#8a987a', 'ok · positive'],
          ['Accent rose', '#b06a73', 'alert · action'],
          ['Paper',       '#f5f1ea', 'background'],
        ].map((r, i) => (
          <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div className="row center" style={{ gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: r[1], border: '1px solid var(--line)' }}></div>
              <div><div>{r[0]}</div><div className="tiny mono muted">{r[1]}</div></div>
            </div>
            <span className="tiny muted">{r[2]}</span>
          </div>
        ))}

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>Fonts</div>
        <Hr />
        <div style={{ padding: '6px 0' }}><div className="serif" style={{ fontSize: 22 }}>Cormorant Garamond</div><div className="tiny muted">display · headings · titles</div></div>
        <div style={{ padding: '6px 0', borderTop: '1px dashed var(--faint)' }}><div style={{ fontSize: 16 }}>Nunito Sans</div><div className="tiny muted">body · UI</div></div>
      </Box>

      <Box className="grow">
        <div className="hand-alt tiny">Visual feel — 4 reference images</div>
        <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          {[1,2,3,4].map(i => (
            <Box key={i} dashed style={{ width: 130, height: 130, background: 'var(--paper-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="tiny muted">ref-{i}.jpg</span>
            </Box>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>AI matches new content to this feel.</div>

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>Tone sliders</div>
        <Hr />
        {[
          ['Formal',     'Casual',    70],
          ['Salesy',     'Factual',   90],
          ['Hyped',      'Calm',      85],
          ['Generic',    'Personal',  75],
        ].map(([l, r, pct], i) => (
          <div key={i} style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div className="row between tiny mono"><span>{l}</span><span>{r}</span></div>
            <div style={{ height: 4, background: 'var(--paper-2)', marginTop: 6, borderRadius: 2, position: 'relative' }}>
              <div style={{ position: 'absolute', left: `calc(${pct}% - 6px)`, top: -4, width: 12, height: 12, borderRadius: 6, background: 'var(--accent-tan)' }}></div>
            </div>
          </div>
        ))}
      </Box>
    </div>
  </Desktop>;
}

function SettingsV5_Billing() {
  return <Desktop active="Settings · Billing" url="command.app/settings/billing">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">SINGLE-USER · BUILT-FOR-ME</div>
        <div className="serif" style={{ fontSize: 28 }}>Costs + usage</div>
        <div className="tiny muted">Everything Command pays for on your behalf.</div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Btn sm>export CSV</Btn>
        <Btn sm primary>Send to accountant</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
      {[
        ['This month',    '$312.40', '18% under'],
        ['Last month',    '$387.12', '—'],
        ['YTD',           '$1,248',  'Jan–Apr'],
        ["Projected '26", '$4,100',  'based on trend'],
      ].map((r, i) => (
        <Box key={i} style={{ width: 200, padding: 12 }}>
          <div className="tiny mono">{r[0].toUpperCase()}</div>
          <div className="serif" style={{ fontSize: 26, marginTop: 4 }}>{r[1]}</div>
          <div className="tiny muted">{r[2]}</div>
        </Box>
      ))}
    </div>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt tiny">By service · this month</div>
      <Hr />
      <table className="wf-table">
        <thead><tr>
          <th>Service</th><th>Plan</th><th>This mo</th><th>YTD</th><th>Purpose</th>
        </tr></thead>
        <tbody>
          {[
            ['OpenAI API',      'Tier 4 pay-as-you-go',  '$84.20',  '$312',  'AI drafting · analysis'],
            ['Anthropic API',   'Pay-as-you-go',         '$41.50',  '$178',  'Long-doc review · voice training'],
            ['Supabase',        'Pro · $25/mo',          '$25.00',  '$100',  'Database + auth + storage'],
            ['Pinecone',        'Starter · $70/mo',      '$70.00',  '$280',  'Voice + content embeddings'],
            ['Vercel',          'Pro · $20/mo',          '$20.00',  '$80',   'App hosting'],
            ['Blotato',         'Pro · $29/mo',          '$29.00',  '$116',  'Social auto-post'],
            ['Vistaprint',      'Pay-per-order',         '$34.20',  '$142',  'Print materials'],
            ['Remotion',        'Indie · $15/mo',        '$15.00',  '$60',   'Auto-video render'],
            ['Twilio',          'Pay-per-use',           '$8.50',   '$38',   'SMS notifications'],
            ['Slack',           'Free tier',             '$0',      '$0',    '—'],
          ].map((r, i) => (
            <tr key={i}>
              <td>{r[0]}</td>
              <td className="tiny">{r[1]}</td>
              <td className="mono">{r[2]}</td>
              <td className="mono muted">{r[3]}</td>
              <td className="tiny muted">{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 12 }}>
      <div className="hand-alt tiny">AI usage breakdown · this month</div>
      <Hr />
      {[
        ['Email drafts',       '142 drafts',   '$12.40'],
        ['Voice training',     '1 session',    '$3.10'],
        ['Market analysis',    '8 pulls',      '$6.80'],
        ['Content generation', '47 posts',     '$14.20'],
        ['CMA narrative',      '4 deals',      '$7.50'],
        ['Transcription (OH)', '6 hours',      '$2.40'],
        ['Compliance check',   '89 reviews',   '$4.10'],
        ['Other',              '—',            '$76.20'],
      ].map((r,i) => (
        <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div>{r[0]}</div>
          <div className="row" style={{ gap: 12 }}><span className="tiny mono muted">{r[1]}</span><span className="tiny mono">{r[2]}</span></div>
        </div>
      ))}
    </Box>
  </Desktop>;
}

function SettingsV6_Integrations() {
  return <Desktop active="Settings · Integrations" url="command.app/settings/integrations">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">CONNECTED SERVICES</div>
        <div className="serif" style={{ fontSize: 28 }}>Integrations</div>
      </div>
      <Btn sm primary>+ connect new</Btn>
    </div>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt tiny">Active · 9 services</div>
      <Hr />
      <table className="wf-table">
        <thead><tr>
          <th>Service</th><th>Status</th><th>Since</th><th>OAuth expires</th><th>Scope</th><th></th>
        </tr></thead>
        <tbody>
          {[
            ['Lofty',       '✓ synced',      'Jan 2026',  '89d',   'read + write contacts',       'manage'],
            ['Gmail',       '⚠ expired 2d',  'Jan 2026',  '—',     'read + send',                  'reconnect'],
            ['Blotato',     '✓ posting',     'Feb 2026',  '9d',    'post + analytics',             'manage'],
            ['Slack',       '✓ active',      'Mar 2026',  '89d',   'channels · write · upload',   'manage'],
            ['Vistaprint',  '✓ ordering',    'Feb 2026',  '180d',  'orders · delivery status',     'manage'],
            ['Google Drive','✓ reading',     'Jan 2026',  '89d',   'read-only · library sync',     'manage'],
            ['Vercel',      '✓ deployed',    'Jan 2026',  'n/a',   'API token',                    'manage'],
            ['Supabase',    '✓ linked',      'Jan 2026',  'n/a',   'service role',                 'manage'],
            ['Remotion',    '✓ rendering',   'Mar 2026',  'n/a',   'API token',                    'manage'],
          ].map((r, i) => (
            <tr key={i}>
              <td>{r[0]}</td>
              <td className="tiny">{r[1]}</td>
              <td className="tiny muted">{r[2]}</td>
              <td className="tiny mono">{r[3]}</td>
              <td className="tiny muted">{r[4]}</td>
              <td><Btn sm>{r[5]}</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 12 }}>
      <div className="hand-alt tiny">Not connected yet</div>
      <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        {['MLS (pending)','Transact','DocuSign','Zillow Premier','Ring Central','Mailchimp backup'].map(x => <Chip key={x} sm>{x}</Chip>)}
      </div>
    </Box>
  </Desktop>;
}

function SettingsV7_SystemHealth() {
  return <Desktop active="Settings · Health" url="command.app/settings/health">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">WHAT NEEDS FIXING</div>
        <div className="serif" style={{ fontSize: 28 }}>Issues · errors · cleanup</div>
        <div className="tiny muted">Your "it's broken" dashboard. Everything Command thinks you should look at.</div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Chip sm>3 urgent</Chip><Chip sm filled>12 total</Chip>
      </div>
    </div>

    <Box style={{ marginTop: 14, background: 'var(--accent-rose-2)', padding: 12, borderLeft: '4px solid var(--accent-rose)' }}>
      <div className="hand-alt">🔴 Urgent · fix today</div>
      <Hr />
      {[
        ['Gmail OAuth expired 2d ago',   'Email send broken · 14 drafts queued',      'reconnect'],
        ['Blotato Pro ran out of posts',  '5 posts queued since 2:42pm',                'upgrade or wait'],
        ['2222 Yellow Wood · no flyers',  'OH is Sat · Vistaprint is down · pick fallback', 'fix now'],
      ].map((r,i) => (
        <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed rgba(0,0,0,0.15)' : 'none' }}>
          <div><b>{r[0]}</b><div className="tiny muted">{r[1]}</div></div>
          <Btn sm primary>{r[2]}</Btn>
        </div>
      ))}
    </Box>

    <Box style={{ marginTop: 12, background: 'var(--accent-tan-2)', padding: 12, borderLeft: '4px solid var(--accent-tan)' }}>
      <div className="hand-alt">🟡 Soon · this week</div>
      <Hr />
      {[
        ['Lofty OAuth expires in 5d',    'contact sync will pause',                    'reconnect'],
        ['63 contacts missing phone',    'prospect sequences skip them',               'review'],
        ['18 expired tags',               'cleanup suggested — 8 merge opportunities', 'review'],
        ['4 checklists conflicting with Lofty templates', 'see conflict resolver',     'resolve'],
      ].map((r,i) => (
        <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed rgba(0,0,0,0.15)' : 'none' }}>
          <div><b>{r[0]}</b><div className="tiny muted">{r[1]}</div></div>
          <Btn sm>{r[2]}</Btn>
        </div>
      ))}
    </Box>

    <Box style={{ marginTop: 12, padding: 12 }}>
      <div className="hand-alt">🟢 Backlog · when you have time</div>
      <Hr />
      {[
        ['Voice training has 0 samples',       'AI is using preset'],
        ['3 contacts with dupes',               'auto-merge suggested'],
        ['12 assets in library are unused',    '>6 months'],
        ['87 old drafts in email',             'auto-archive?'],
        ['Settings: headshot is 2 years old',  'optional refresh'],
      ].map((r,i) => (
        <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div>{r[0]}</div>
          <span className="tiny muted">{r[1]}</span>
        </div>
      ))}
    </Box>
  </Desktop>;
}

/* ====================== DATE TRACKING / LIFECYCLE ====================== */

function DateV1_ScheduledItems() {
  return <Desktop active="Schedule" url="command.app/schedule/2222-yellow-wood">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">2222 YELLOW WOOD LN · LIFECYCLE</div>
        <div className="serif" style={{ fontSize: 26 }}>Everything scheduled · auto-cleanup</div>
        <div className="tiny muted">Every date-dependent thing for this listing. We add them at trigger, remove them at close.</div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Chip sm filled>☀️ 68° Sat</Chip>
        <Btn sm>+ add scheduled item</Btn>
      </div>
    </div>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt tiny">Physical installs + removals</div>
      <Hr />
      <table className="wf-table">
        <thead><tr>
          <th>Item</th><th>Install</th><th>Remove</th><th>Vendor</th><th>Cost</th><th>Status</th>
        </tr></thead>
        <tbody>
          {[
            ['For-sale sign',         'Fri Apr 24 · 3pm', 'at close or cancel', 'BoldSign Co',       '$45/mo',   'scheduled', 'sage'],
            ['Lockbox',                'Fri Apr 24 · 5pm', 'at close or cancel', 'Supra (inventory)', '—',        'scheduled', 'sage'],
            ['Open house signs (6)',  'Sat Apr 26 · 10am','Sat Apr 26 · 4pm',   'me',                '—',        'scheduled', 'sage'],
            ['Directional signs (8)', 'Sat Apr 26 · 10am','Sat Apr 26 · 4pm',   'me',                '—',        'scheduled', 'sage'],
            ['Photography session',    'Wed Apr 22 · 9am', 'one-time',           'Javier @ Bright',   '$385',    'confirmed', 'sage'],
            ['Staging',                'Tue Apr 21 · 11am','within 3d of close', 'Studio Maple',      '$1,200/mo','active',    'tan'],
            ['Supra reader batteries', '—',                '—',                   'Amazon auto-ship',  '$22',      'shipped',   'tan'],
          ].map((r,i) => (
            <tr key={i}>
              <td>{r[0]}</td>
              <td className="tiny mono">{r[1]}</td>
              <td className="tiny mono muted">{r[2]}</td>
              <td className="tiny">{r[3]}</td>
              <td className="tiny mono">{r[4]}</td>
              <td><Chip sm filled style={{ background: `var(--accent-${r[6]})`, color: 'var(--paper)' }}>{r[5]}</Chip></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt tiny">Digital + automated</div>
      <Hr />
      {[
        ['Blotato IG/FB/TT queue',  '3 posts · Wed/Fri/Sat',             'through close'],
        ['Email drip to neighbors',  '100-door · goes Wed',                'one-time'],
        ['Weather check reminder',   'Fri 6pm · Sat 6am',                 'day before + morning'],
        ['Follow-up email draft',    'Sat 6pm · Mon 9am',                 'auto-remove if no OH'],
        ['Weekly seller update',     'every Mon 5pm',                      'until close'],
        ['QR sign-in link',           'live from sign install',             'until lockbox removed'],
        ['Supra notifications',      'every sign-in / key check',         'until lockbox removed'],
      ].map((r,i) => (
        <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div><b>{r[0]}</b> · <span className="tiny muted">{r[1]}</span></div>
          <span className="tiny mono">{r[2]}</span>
        </div>
      ))}
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 12 }}>
      <div className="hand-alt tiny">When deal closes or listing is canceled</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Command auto-triggers: sign removal · lockbox pickup · staging return · pause all social · archive checklist · move to closed deals. You review the list before anything happens.</div>
      <div className="row" style={{ gap: 8, marginTop: 8 }}><Btn sm>preview close-out</Btn><Btn sm ghost>edit default close-out</Btn></div>
    </Box>
  </Desktop>;
}

function DateV2_GlobalCal() {
  return <Desktop active="Schedule · Calendar" url="command.app/schedule">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">ALL SCHEDULED ITEMS · ACROSS LISTINGS</div>
        <div className="serif" style={{ fontSize: 26 }}>This week</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>all</Chip><Chip sm filled>physical</Chip><Chip sm>digital</Chip><Chip sm>vendor</Chip>
      </div>
    </div>

    <Box style={{ marginTop: 14 }}>
      {[
        ['MON Apr 20', [
          ['10am', 'Staging install · 22 Hawthorn',     'Studio Maple',      'tan'],
          ['3pm',  'Weekly seller update · Chens',      'auto · via email',  'sage'],
        ]],
        ['TUE Apr 21', [
          ['11am', 'Staging install · 2222 Yellow Wood','Studio Maple',      'tan'],
        ]],
        ['WED Apr 22', [
          ['9am',  'Photography · 2222 Yellow Wood',    'Javier @ Bright',   'tan'],
          ['6pm',  'IG/FB/TT post · Yellow Wood teaser','Blotato',            'sage'],
        ]],
        ['THU Apr 23', [
          ['—',    'Flyers arrive · Vistaprint',         '100 flyers',        'tan'],
          ['11am', 'Listing appt · 47 Olive',           'at their house',    'rose'],
        ]],
        ['FRI Apr 24', [
          ['3pm',  'Sign install · 2222 Yellow Wood',   'BoldSign',           'tan'],
          ['5pm',  'Lockbox install · 2222 Yellow Wood','me',                'tan'],
          ['6pm',  'Weather check · Sat OH',            'auto',              'sage'],
        ]],
        ['SAT Apr 26', [
          ['10am', 'OH sign setup · Yellow Wood',       'me',                'rose'],
          ['1pm',  'Open house starts',                  '—',                  'rose'],
          ['3pm',  'Open house ends',                    '—',                  'rose'],
          ['4pm',  'Sign pickup · OH sign removal',     'me',                'tan'],
          ['6pm',  'Follow-up email draft · sign-ins',  'auto',              'sage'],
        ]],
      ].map(([day, items], i) => (
        <div key={i} style={{ borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div className="hand-alt tiny" style={{ padding: '10px 0 4px' }}>{day}</div>
          {items.map((r, j) => (
            <div key={j} className="row between" style={{ padding: '6px 0' }}>
              <div className="row center" style={{ gap: 12 }}>
                <span className="tiny mono" style={{ width: 50 }}>{r[0]}</span>
                <div>{r[1]}</div>
              </div>
              <div className="row center" style={{ gap: 8 }}>
                <span className="tiny muted">{r[2]}</span>
                <Chip sm filled style={{ background: `var(--accent-${r[3]})`, color: 'var(--paper)' }}>●</Chip>
              </div>
            </div>
          ))}
        </div>
      ))}
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 10 }}>
      <div className="tiny">● <b>rose</b> = needs you · <b>tan</b> = happening / vendor · <b>sage</b> = automated, no action</div>
    </Box>
  </Desktop>;
}

/* ====================== CONFLICT RESOLVER ====================== */

function ConflictV1_Checklists() {
  return <Desktop active="Conflicts · Checklists" url="command.app/settings/conflicts/checklists">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">BEFORE WE SYNC LOFTY</div>
        <div className="serif" style={{ fontSize: 28 }}>You have existing checklists</div>
        <div className="tiny muted">Command found overlapping checklists. Decide on each before we merge.</div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Chip sm filled>12 yours</Chip><Chip sm filled>8 Lofty</Chip><Chip sm>4 conflicts</Chip>
      </div>
    </div>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt tiny">🔴 Conflicts · same name, different content</div>
      <Hr />
      {[
        {
          name: 'Buyer · under contract',
          yours: '22 items · you\'ve used 47 times',
          lofty: '18 items · Lofty default',
          note: 'Yours has 4 custom steps Lofty doesn\'t (lender intro, inspection followup email, pre-walkthrough text, post-close gift)',
        },
        {
          name: 'New listing',
          yours: '15 items · your version',
          lofty: '12 items · Lofty default',
          note: 'Lofty has MLS submission step yours doesn\'t',
        },
        {
          name: 'Open house',
          yours: '19 items · heavily customized',
          lofty: '8 items · basic',
          note: 'Keep yours — Lofty\'s is bare-bones',
        },
        {
          name: 'Seller · under contract',
          yours: '16 items',
          lofty: '16 items',
          note: 'Nearly identical — just naming differences',
        },
      ].map((c, i) => (
        <div key={i} style={{ padding: '12px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div className="row between center">
            <div>
              <b>{c.name}</b>
              <div className="tiny muted" style={{ marginTop: 4 }}>{c.note}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Btn sm>keep mine</Btn>
              <Btn sm>use Lofty\'s</Btn>
              <Btn sm primary>merge</Btn>
              <Btn sm ghost>compare side-by-side</Btn>
            </div>
          </div>
          <div className="row" style={{ gap: 10, marginTop: 8 }}>
            <Box className="grow" style={{ padding: 8, background: 'var(--accent-sage-2)' }}>
              <div className="tiny mono">YOURS</div>
              <div className="tiny" style={{ marginTop: 4 }}>{c.yours}</div>
            </Box>
            <Box className="grow" style={{ padding: 8, background: 'var(--accent-tan-2)' }}>
              <div className="tiny mono">LOFTY</div>
              <div className="tiny" style={{ marginTop: 4 }}>{c.lofty}</div>
            </Box>
          </div>
        </div>
      ))}
    </Box>

    <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
      <Btn ghost>cancel sync</Btn>
      <Btn>decide each later</Btn>
      <Btn primary>Apply decisions · continue sync →</Btn>
    </div>
  </Desktop>;
}

function ConflictV2_Templates() {
  return <Desktop active="Conflicts · Templates" url="command.app/settings/conflicts/templates">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">EMAIL + SMS TEMPLATES</div>
        <div className="serif" style={{ fontSize: 28 }}>Existing templates to preserve</div>
      </div>
      <Chip sm filled>34 yours · 22 Lofty · 6 conflicts</Chip>
    </div>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt tiny">Decision needed</div>
      <Hr />
      <table className="wf-table">
        <thead><tr>
          <th>Template</th><th>Type</th><th>Yours</th><th>Lofty</th><th>Used</th><th>Action</th>
        </tr></thead>
        <tbody>
          {[
            ['Buyer inquiry response',   'email', 'v3 · 2 yr old',     'v1 · generic',    '127 times', 'keep mine'],
            ['OH sign-in follow-up',     'email', 'v2 · last edit Jan','v1 · generic',    '284 times', 'keep mine'],
            ['Listing appt recap',       'email', 'v1 · yours',        'v1 · Lofty',      '89 times',  'merge'],
            ['Price reduction FYI',      'email', 'v2',                'n/a',             '12 times',  'keep mine'],
            ['Weekly seller update',     'email', 'heavily customized','basic',           '340 times', 'keep mine'],
            ['Past-client 90-day',       'email', 'none',              'v1',              '0 times',   'use Lofty'],
          ].map((r, i) => (
            <tr key={i}>
              <td>{r[0]}</td>
              <td className="tiny">{r[1]}</td>
              <td className="tiny mono">{r[2]}</td>
              <td className="tiny mono muted">{r[3]}</td>
              <td className="tiny">{r[4]}</td>
              <td><Chip sm filled>{r[5]}</Chip></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 12 }}>
      <div className="hand-alt">🛟 Safety net</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>We'll keep a backup of your current templates for 90 days. If you don't like how this shook out, one-click revert.</div>
    </Box>

    <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
      <Btn>export current as backup</Btn>
      <Btn primary>Apply · sync Lofty →</Btn>
    </div>
  </Desktop>;
}

function ConflictV3_Tags() {
  return <Desktop active="Conflicts · Tags" url="command.app/settings/conflicts/tags">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">TAG RECONCILIATION</div>
        <div className="serif" style={{ fontSize: 28 }}>Merge duplicate tags</div>
      </div>
      <Chip sm filled>61 tags · 18 dupes · 4 merges suggested</Chip>
    </div>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt tiny">Suggested merges</div>
      <Hr />
      {[
        {
          target: '#first-time-buyer',
          sources: ['#ftb', '#first_time_buyer', '#FTB', '#1st-time'],
          count: 43,
          action: 'merge all',
        },
        {
          target: '#sphere',
          sources: ['#soi', '#SOI', '#personal'],
          count: 124,
          action: 'merge all',
        },
        {
          target: '#maple-creek-farm',
          sources: ['#maple-creek', '#maple'],
          count: 28,
          action: 'merge all',
        },
        {
          target: '#renovation',
          sources: ['#reno', '#flip', '#fixer'],
          count: 17,
          action: 'review — these might be different',
        },
      ].map((m, i) => (
        <div key={i} style={{ padding: '10px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div className="row between center">
            <div className="row center" style={{ gap: 10 }}>
              <Chip filled>{m.target}</Chip>
              <span className="tiny">←</span>
              <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                {m.sources.map(s => <Chip key={s} sm>{s}</Chip>)}
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <span className="tiny muted">{m.count} contacts</span>
              <Chip sm filled>{m.action}</Chip>
            </div>
          </div>
        </div>
      ))}
    </Box>

    <Box style={{ marginTop: 14, background: 'var(--accent-rose-2)', padding: 12, borderLeft: '4px solid var(--accent-rose)' }}>
      <div className="hand-alt">⚠ Before you merge</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Any filter, campaign, or segment using the old tags will be auto-updated. Preview the change list before applying.</div>
      <Btn sm style={{ marginTop: 8 }}>preview impact · 23 places affected</Btn>
    </Box>

    <div className="row" style={{ justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
      <Btn>review one-by-one</Btn>
      <Btn primary>Apply suggested merges →</Btn>
    </div>
  </Desktop>;
}

window.SettingsScreens = [
  { id: 's1', label: 'V1 · Me · identity',         caption: 'Control center. Name, bio variants, what AI uses this for.',                Component: SettingsV1_Me },
  { id: 's2', label: 'V2 · Me · avatars',          caption: 'Photo variants for video, Remotion, signs, email.',                         Component: SettingsV2_Avatars },
  { id: 's3', label: 'V3 · Me · personal + values', caption: 'Family, hobbies, stories, values, what I won\'t do. Fuels personalization.', Component: SettingsV3_Personal },
  { id: 's4', label: 'V4 · Brand kit',              caption: 'Palette, fonts, feel, tone sliders. Shared across all content.',              Component: SettingsV4_BrandKit },
  { id: 's5', label: 'V5 · Billing + usage',        caption: 'Monthly costs across Pinecone, Supabase, OpenAI, etc. CSV + accountant export.', Component: SettingsV5_Billing },
  { id: 's6', label: 'V6 · Integrations',           caption: 'Active services, OAuth expiration tracking, scope review.',                  Component: SettingsV6_Integrations },
  { id: 's7', label: 'V7 · Issues · errors · health', caption: 'What needs fixing now vs. later. Urgent / soon / backlog.',                  Component: SettingsV7_SystemHealth },
  { id: 's8', label: 'V8 · Date tracking · per listing', caption: 'All scheduled items for a listing. Installs, removals, vendors. Auto-close.', Component: DateV1_ScheduledItems },
  { id: 's9', label: 'V9 · Date tracking · weekly',      caption: 'This week across all listings. Physical / digital / vendor filters.',         Component: DateV2_GlobalCal },
  { id: 's10', label: 'V10 · Conflicts · checklists',     caption: 'Before Lofty sync, reconcile your checklists vs. their defaults.',           Component: ConflictV1_Checklists },
  { id: 's11', label: 'V11 · Conflicts · templates',      caption: 'Keep, merge, or replace email templates. 90-day safety backup.',              Component: ConflictV2_Templates },
  { id: 's12', label: 'V12 · Conflicts · tags',           caption: 'Suggested tag merges with impact preview.',                                    Component: ConflictV3_Tags },
];

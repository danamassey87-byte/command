/* ============================================================
   EMPTY + ERROR STATES
   ============================================================ */

function Empty1_MLSOff() {
  return <Desktop active="Properties" url="command.app/properties">
    <div style={{ maxWidth: 820, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 54 }}>🔒</div>
      <div className="serif" style={{ fontSize: 28, marginTop: 10 }}>MLS not connected</div>
      <div className="muted" style={{ marginTop: 8 }}>You're running without MLS access right now. That's fine — here's how to fill the gap.</div>

      <Box style={{ marginTop: 20, padding: 14, textAlign: 'left' }}>
        <div className="hand-alt">What you can still do</div>
        <Hr />
        {[
          ['Manual add listings',      'Drop in address · AI pulls public data + photos from Zillow/Redfin'],
          ['AI research a property',   'Paste URL or address. AI pulls specs, history, taxes, photos'],
          ['Import via CSV',           'Bulk upload from any spreadsheet'],
          ['Ask your broker',          'Have them forward the MLS feed'],
        ].map((r, i) => (
          <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
            <div><div>{r[0]}</div><div className="tiny muted">{r[1]}</div></div>
            <Btn sm>try →</Btn>
          </div>
        ))}
      </Box>

      <Box dashed style={{ marginTop: 14, padding: 10, textAlign: 'left' }}>
        <div className="tiny"><b>Heads up:</b> listing-specific features (auto-price-drops, comp pulls, CMA auto-build) will be limited. Core features (CRM, content, OH, transactions, email) work fully.</div>
      </Box>

      <div className="row" style={{ gap: 10, justifyContent: 'center', marginTop: 16 }}>
        <Btn primary>Add first listing manually →</Btn>
        <Btn ghost>Request MLS access</Btn>
      </div>
    </div>
  </Desktop>;
}

function Empty2_NoPhotos() {
  return <Desktop active="Studio · Library" url="command.app/studio/library/photos">
    <div className="row between center">
      <div className="serif" style={{ fontSize: 22 }}>Photos</div>
      <Btn primary>Upload photos →</Btn>
    </div>

    <Box dashed style={{ marginTop: 20, padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 46 }}>📸</div>
      <div className="serif" style={{ fontSize: 22, marginTop: 8 }}>Library's empty</div>
      <div className="muted" style={{ marginTop: 6 }}>Upload your headshots, lifestyle shots, b-roll. Command tags + uses them everywhere.</div>

      <div className="row" style={{ gap: 10, justifyContent: 'center', marginTop: 20 }}>
        <Btn primary>Upload from computer</Btn>
        <Btn>Google Drive</Btn>
        <Btn>Dropbox</Btn>
        <Btn ghost>iPhone (scan QR)</Btn>
      </div>
    </Box>

    <Box style={{ marginTop: 16, padding: 14 }}>
      <div className="hand-alt tiny">While you're empty, we'll:</div>
      <Hr />
      {[
        ['Use placeholder b-roll', 'Generic real-estate shots so content still looks OK'],
        ['Pull from MLS photos',   'For listing-specific content'],
        ['Generate thumbnails',    'AI-generated hero images for blog posts'],
        ['Remind you',             'Weekly nudge until library has 30+ assets'],
      ].map((r, i) => (
        <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div>{r[0]}</div>
          <span className="tiny muted">{r[1]}</span>
        </div>
      ))}
    </Box>
  </Desktop>;
}

function Empty3_BlotatoLimit() {
  return <Desktop active="Content" url="command.app/content/publish">
    <Box style={{ background: 'var(--accent-rose-2)', padding: 16, borderLeft: '4px solid var(--accent-rose)' }}>
      <div className="row between">
        <div>
          <div className="hand-alt">⚠ Blotato rate limit hit</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>You've used 30/30 posts this hour. Resets at 3:42pm (in 23 min).</div>
        </div>
        <Chip sm>pause auto-publish</Chip>
      </div>
    </Box>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt">5 posts queued · here's what we'll do</div>
      <Hr />
      {[
        ['IG Reel · 42 Oak preview',      '3:45pm', 'auto-retry',    'sage'],
        ['FB · 2222 Yellow Wood OH Sat',  '3:47pm', 'auto-retry',    'sage'],
        ['TikTok · dawn drone',           '3:50pm', 'auto-retry',    'sage'],
        ['LinkedIn · March market recap', '4:00pm', 'move to queue', 'tan'],
        ['Pinterest · 42 Oak kitchen pin', '4:02pm', 'auto-retry',    'sage'],
        ['IG Carousel · staging tips',    '4:05pm', 'hold for you',  'rose'],
      ].map((r,i) => (
        <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div>{r[0]}</div>
          <div className="row" style={{ gap: 8 }}><span className="tiny mono">{r[1]}</span><Chip sm>{r[2]}</Chip></div>
        </div>
      ))}
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 10 }}>
      <div className="tiny"><b>Tip:</b> upgrade Blotato to Pro ($29/mo) for 100/hr. Or we'll stretch posts across hours automatically.</div>
    </Box>
  </Desktop>;
}

function Empty4_VistaprintOut() {
  return <Desktop active="Open House · Flyers" url="command.app/oh/2222-yellow-wood/flyers">
    <Box style={{ background: 'var(--accent-rose-2)', padding: 14, borderLeft: '4px solid var(--accent-rose)' }}>
      <div className="row between">
        <div>
          <div className="hand-alt">⚠ Vistaprint is down</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>API returning 503 · last successful order 11 hours ago.</div>
        </div>
        <Chip sm>status</Chip>
      </div>
    </Box>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt">Fallbacks · pick one</div>
      <Hr />
      {[
        ['Moo.com',        'Compatible PDF. Next-day delivery possible.',        '$0.42/flyer', 'try this'],
        ['4over.com',      'Trade printer. Cheapest but 3-day minimum.',         '$0.18/flyer', 'try this'],
        ['FedEx Office',   'Same-day pickup. Expensive.',                        '$1.10/flyer', 'try this'],
        ['Print at home',  '8.5×11 PDFs. Good enough for OH signs.',            'free',       'download'],
      ].map((r, i) => (
        <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div><div>{r[0]}</div><div className="tiny muted">{r[1]}</div></div>
          <div className="row" style={{ gap: 8 }}><span className="tiny mono">{r[2]}</span><Btn sm primary>{r[3]}</Btn></div>
        </div>
      ))}
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 10 }}>
      <div className="tiny">Your Sat OH needs 100 flyers by Thu 5pm to arrive Fri. Cut-off for 4over: <b>today 8pm</b>. For Moo: <b>tomorrow 10am</b>.</div>
    </Box>
  </Desktop>;
}

function Empty5_NoLeads() {
  return <Desktop active="Prospect" url="command.app/prospect">
    <div style={{ maxWidth: 820, margin: '40px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>🌱</div>
      <div className="serif" style={{ fontSize: 28, marginTop: 10 }}>Week 1 · no leads yet</div>
      <div className="muted" style={{ marginTop: 6 }}>That's normal. Here's what to do.</div>
    </div>

    <Box style={{ marginTop: 20, padding: 16 }}>
      <div className="hand-alt">Lead sources — set up now, collect later</div>
      <Hr />
      {[
        ['Open house sign-ins',   'Biggest source · set up at your first OH',         'core'],
        ['Expireds + FSBOs',      'AI scrapes daily · we call for you',               'passive'],
        ['Bio link page',          'Every IG/FB post · captures viewers',              'passive'],
        ['Google Business profile','People searching your area',                       'free'],
        ['Farm postcards',        'Vistaprint auto-send to your farm',                 'paid'],
        ['Referrals',             'Ask 5 past clients · we\'ll draft the text',        'warm'],
      ].map((r,i) => (
        <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div><div>{r[0]}</div><div className="tiny muted">{r[1]}</div></div>
          <div className="row" style={{ gap: 8 }}><Chip sm>{r[2]}</Chip><Btn sm>setup →</Btn></div>
        </div>
      ))}
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 12 }}>
      <div className="hand-alt tiny">Typical week 1 yield</div>
      <div className="tiny muted" style={{ marginTop: 4 }}>With Lofty import: ~10–20 warm contacts. Without Lofty: 0–3 OH sign-ins if you run one.</div>
      <div className="tiny muted" style={{ marginTop: 4 }}>Real pipeline usually kicks in week 3–4. Keep setting up.</div>
    </Box>
  </Desktop>;
}

function Empty6_OAuthExpired() {
  return <Desktop active="Settings · Integrations" url="command.app/settings/integrations">
    <Box style={{ background: 'var(--accent-rose-2)', padding: 14, borderLeft: '4px solid var(--accent-rose)' }}>
      <div className="row between">
        <div>
          <div className="hand-alt">⚠ 3 integrations need re-authorization</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Gmail expired 2 days ago · features limited until reconnected.</div>
        </div>
      </div>
    </Box>

    <Box style={{ marginTop: 14 }}>
      <div className="hand-alt">What's affected</div>
      <Hr />
      {[
        ['Gmail',      'expired 2d ago', 'Can\'t send emails · no inbound triggers', 'reconnect', 'rose'],
        ['Lofty',      'expires in 5d',  'Contact sync paused soon',                  'reconnect', 'tan'],
        ['Blotato',    'expires in 9d',  'Auto-posting paused soon',                  'reconnect', 'tan'],
        ['Slack',      'ok · 89d left',  '—',                                          '✓',         'sage'],
        ['Vistaprint', 'ok · 180d left', '—',                                          '✓',         'sage'],
      ].map((r,i) => (
        <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
          <div><div>{r[0]}</div><div className="tiny muted">{r[2]}</div></div>
          <div className="row" style={{ gap: 8 }}><span className="tiny mono">{r[1]}</span><Chip sm>{r[3]}</Chip></div>
        </div>
      ))}
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 10 }}>
      <div className="tiny">Turn on <b>auto-renew prompts</b> in Settings → we'll nudge you 14 days before any expiration.</div>
    </Box>
  </Desktop>;
}

function Empty7_NoVoice() {
  return <Desktop active="Content" url="command.app/content/hub">
    <Box style={{ background: 'var(--accent-tan-2)', padding: 14, borderLeft: '4px solid var(--accent-tan)' }}>
      <div className="row between">
        <div>
          <div className="hand-alt">AI voice not trained</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Drafts will sound generic until you train it. ~3 min.</div>
        </div>
        <Btn sm primary>Train now →</Btn>
      </div>
    </Box>

    <div className="row" style={{ gap: 12, marginTop: 16 }}>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono">SAMPLE · WITHOUT YOUR VOICE</div>
        <div className="tiny" style={{ marginTop: 8, fontStyle: 'italic', color: 'var(--muted)' }}>"Welcome to 2222 Yellow Wood Lane, a stunning property featuring 4 bedrooms, 3 bathrooms, and breathtaking views. Schedule your showing today!"</div>
        <div className="tiny muted" style={{ marginTop: 8 }}>→ sounds like Zillow</div>
      </Box>
      <Box className="grow" style={{ padding: 14, background: 'var(--accent-sage-2)' }}>
        <div className="tiny mono">SAMPLE · WITH YOUR VOICE (projected)</div>
        <div className="tiny" style={{ marginTop: 8 }}>"Real talk on 2222 Yellow Wood — the upstairs primary has a window seat I could live in. Sat 1–3, come walk it."</div>
        <div className="tiny muted" style={{ marginTop: 8 }}>→ sounds like Dana</div>
      </Box>
    </div>
  </Desktop>;
}

function Empty8_NoSearch() {
  return <Desktop active="Command-K" url="command.app/search?q=maple%20reno">
    <div style={{ maxWidth: 820, margin: '40px auto' }}>
      <Input value="maple reno" style={{ fontSize: 18, padding: '10px 14px' }} />
      <div className="tiny muted" style={{ marginTop: 8 }}>0 results</div>

      <Box dashed style={{ marginTop: 20, padding: 30, textAlign: 'center' }}>
        <div style={{ fontSize: 44 }}>🔍</div>
        <div className="serif" style={{ fontSize: 22, marginTop: 8 }}>Nothing matched "maple reno"</div>
        <div className="muted" style={{ marginTop: 6 }}>Here are some things to try:</div>
      </Box>

      <div className="row" style={{ gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
        {[
          'try just "maple"',
          'spell out "renovation"',
          'search by address',
          'search by client',
          'search by tag',
          'ask AI instead →',
        ].map(s => <Chip key={s}>{s}</Chip>)}
      </div>

      <Box style={{ marginTop: 18, padding: 14, background: 'var(--accent-sage-2)' }}>
        <div className="hand-alt">AI found something close</div>
        <div className="tiny" style={{ marginTop: 8 }}>No contacts tagged <b>reno</b>. But 7 contacts are tagged <b>#maple-creek-farm</b> and 3 have note-text mentioning "remodel".</div>
        <Btn sm primary style={{ marginTop: 8 }}>show those →</Btn>
      </Box>
    </div>
  </Desktop>;
}

window.EmptyStateScreens = [
  { id: 'em1', label: 'V1 · MLS not connected',     caption: 'Graceful fallback. Manual + AI research + CSV + broker request.',     Component: Empty1_MLSOff },
  { id: 'em2', label: 'V2 · No photos yet',         caption: 'Empty library with placeholder strategy during upload gap.',         Component: Empty2_NoPhotos },
  { id: 'em3', label: 'V3 · Blotato rate limit',    caption: 'Queue management + per-post decision (retry / move / hold).',        Component: Empty3_BlotatoLimit },
  { id: 'em4', label: 'V4 · Vistaprint outage',     caption: 'Auto-fallback to Moo / 4over / FedEx / print-at-home with ETAs.',    Component: Empty4_VistaprintOut },
  { id: 'em5', label: 'V5 · No leads (week 1)',      caption: 'Setup-forward empty — 6 lead sources with expected yields.',         Component: Empty5_NoLeads },
  { id: 'em6', label: 'V6 · OAuth expiring',        caption: 'Integration re-auth dashboard · impact clearly stated.',             Component: Empty6_OAuthExpired },
  { id: 'em7', label: 'V7 · Voice not trained',     caption: 'Inline nudge + generic vs. your-voice preview.',                     Component: Empty7_NoVoice },
  { id: 'em8', label: 'V8 · Search · no results',    caption: 'Query help + AI fallback finds something close.',                    Component: Empty8_NoSearch },
];

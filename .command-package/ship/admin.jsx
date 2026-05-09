/* ============================================================
 * Command · Admin & Settings
 *   - Usage & Costs (all services, per-month, budget guardrails)
 *   - System Health (errors, failed jobs, integration status)
 *   - Integrations hub (Blotato, Transact, Lofty, Resend, Claude,
 *       OpenAI, Pinecone, Supabase, Vercel, Sentry, PostHog, Google)
 *   - Lofty detail (API key, sync status, tag mapping, conflict inbox)
 *   - Transact detail
 *   - Compliance index (RESPA/Fair Housing/MLS rules, re-index status)
 *
 * All components use globals: Desktop, Box, Chip, Btn, Input, Hr, Bar, Anno
 * ============================================================ */

/* Cell helper for status strips */
const StatusDot = ({ s }) => {
  const map = {
    ok:      { c: 'var(--accent-sage)', t: 'OK' },
    warn:    { c: 'var(--warn)',        t: 'WARN' },
    err:     { c: '#c0604a',            t: 'ERR' },
    off:     { c: 'var(--faint)',       t: 'OFF' },
    syncing: { c: 'var(--accent-tan)',  t: 'SYNC' },
  };
  const v = map[s] || map.ok;
  return <span style={{ display:'inline-flex', alignItems:'center', gap: 5 }}>
    <span style={{ width: 7, height: 7, borderRadius:'50%', background: v.c }} />
    <span className="tiny mono muted" style={{ fontSize: 10 }}>{v.t}</span>
  </span>;
};


/* ============================================================
 * V1 — USAGE & COSTS
 * ============================================================ */
function AdminV1_Usage() {
  const lines = [
    // [name, category, this-month $, budget $, pull-source, trend, notes]
    ['Vercel',          'host',      '$20.00', '$25',  'API',    '+0%',  'Pro plan'],
    ['Supabase',        'db/auth/storage', '$25.00', '$40', 'API', '+8%', 'Nearing storage limit'],
    ['Pinecone',        'vector',    '$70.00', '$80',  'API',    '+12%', 'compliance + brain + voice namespaces'],
    ['Resend',          'email',     '$12.40', '$20',  'API',    '+2%',  '1.2k sends'],
    ['Anthropic (Claude)','LLM',     '$42.18', '$120', 'API',    '+34%', 'Haiku 78% · Sonnet 22%'],
    ['OpenAI',          'LLM',       '$9.02',  '$40',  'API',    '−12%', 'fallback only'],
    ['Remotion Lambda', 'video',     '$14.60', '$30',  'AWS',    '+22%', '312 renders'],
    ['Cloudflare R2',   'media CDN', '$3.80',  '$10',  'API',    '+4%',  '46GB stored'],
    ['Sentry',          'errors',    '$0.00',  '$0',   'API',    '—',    'free tier'],
    ['PostHog',         'analytics', '$0.00',  '$0',   'API',    '—',    'free tier'],
    ['Blotato',         'publishing','$29.00', '$29',  'manual', '+0%',  'flat mo'],
    ['Transact',        'paperwork', '$55.00', '$55',  'manual', '+0%',  'already paying'],
    ['Lofty (legacy)',  'client search','$179.00','$179','manual','+0%', 'keep until v2'],
    ['MLS dues',        'data',      '$48.00', '$48',  'manual', '+0%',  'board'],
  ];
  const total = 507.00;
  const budget = 630;
  const pct = Math.round(total/budget*100);

  return <Desktop active="Settings" url="command.app/admin/usage">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">ADMIN · APP COSTS</span>
        <span className="serif" style={{ fontSize: 26 }}>Usage & Costs</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>Apr 2026</Chip>
        <Btn sm>▸ export CSV</Btn>
        <Btn sm>refresh all</Btn>
      </div>
    </div>

    {/* top summary */}
    <div className="row" style={{ gap: 10 }}>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">THIS MONTH</div>
        <div className="serif" style={{ fontSize: 36 }}>${total.toFixed(2)}</div>
        <div className="tiny muted">of ${budget} budget · {pct}%</div>
        <Bar pct={pct} style={{ marginTop: 6 }} />
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">PROJECTED · MO END</div>
        <div className="serif" style={{ fontSize: 30 }}>$612.40</div>
        <div className="tiny" style={{ color:'var(--accent-sage)' }}>under budget by $17.60</div>
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">AVG LAST 3 MO</div>
        <div className="serif" style={{ fontSize: 30 }}>$598.12</div>
        <div className="tiny muted">+4.4% MoM</div>
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">PER DEAL CLOSED</div>
        <div className="serif" style={{ fontSize: 30 }}>$149</div>
        <div className="tiny muted">4 closed YTD · falling</div>
      </Box>
    </div>

    {/* Alerts */}
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ Watch list</div>
      <div className="col" style={{ gap: 3, marginTop: 4 }}>
        <div className="tiny">• <b>Pinecone</b> will hit $80 cap in ~6 days. Compliance index growing. <Btn sm style={{ marginLeft: 6 }}>prune older</Btn></div>
        <div className="tiny">• <b>Anthropic</b> Haiku usage up 34% — fine, but review which flows still call Sonnet. <Btn sm style={{ marginLeft: 6 }}>see routing</Btn></div>
        <div className="tiny">• <b>Supabase storage</b> 82% used. Cold-storage older b-roll? <Btn sm style={{ marginLeft: 6 }}>move &gt;90d to R2</Btn></div>
      </div>
    </Box>

    {/* line items */}
    <Box style={{ padding: 0 }}>
      <table className="wf-table">
        <thead><tr>
          <th>Service</th><th>Category</th><th>This month</th><th>Budget</th><th>% used</th><th>Source</th><th>Trend</th><th>Notes</th><th></th>
        </tr></thead>
        <tbody>
          {lines.map((r,i)=>{
            const spend = parseFloat(r[2].replace('$',''));
            const bud = parseFloat(r[3].replace('$',''));
            const p = bud>0 ? Math.round(spend/bud*100) : 0;
            const color = p>=95 ? '#c0604a' : p>=80 ? 'var(--warn)' : 'var(--accent-sage)';
            return (
              <tr key={i}>
                <td style={{ fontWeight: 500 }}>{r[0]}</td>
                <td className="tiny muted">{r[1]}</td>
                <td className="mono">{r[2]}</td>
                <td className="mono muted">{r[3]}</td>
                <td>
                  <div className="row center" style={{ gap: 6 }}>
                    <div style={{ width: 60, height: 6, background:'var(--paper-2)', position:'relative' }}>
                      <div style={{ position:'absolute', left: 0, top: 0, bottom: 0, width: Math.min(p,100)+'%', background: color }} />
                    </div>
                    <span className="tiny mono">{p}%</span>
                  </div>
                </td>
                <td><Chip sm {...(r[4]==='manual'?{tan:true}:{})}>{r[4]}</Chip></td>
                <td className="tiny" style={{ color: r[5].includes('+')?'var(--accent-tan)':'var(--accent-sage)' }}>{r[5]}</td>
                <td className="tiny muted">{r[6]}</td>
                <td><Btn sm>▾</Btn></td>
              </tr>
            );
          })}
          <tr style={{ background:'var(--paper-2)', fontWeight: 600 }}>
            <td>TOTAL</td><td></td>
            <td className="mono">${total.toFixed(2)}</td>
            <td className="mono muted">${budget}</td>
            <td className="mono">{pct}%</td>
            <td></td><td></td><td></td><td></td>
          </tr>
        </tbody>
      </table>
    </Box>

    {/* AI / token detail card — because this is where spend can run */}
    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 16 }}>AI token detail</span>
        <span className="tiny mono muted">cached 71% of Sonnet input · saving ≈ $82/mo</span>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        {[
          ['Haiku · in','42.1M','$3.37'],
          ['Haiku · out','8.4M','$3.36'],
          ['Sonnet · in','6.2M','$18.60'],
          ['Sonnet · in (cached)','4.4M','$4.40'],
          ['Sonnet · out','0.8M','$12.00'],
          ['OpenAI mini','3.1M','$9.02'],
        ].map(([l,t,c],i)=>(
          <div key={i} className="col grow" style={{ padding: 8, border:'1px solid var(--line)', background:'#fff' }}>
            <span className="tiny mono muted">{l}</span>
            <span className="serif" style={{ fontSize: 16 }}>{c}</span>
            <span className="tiny muted">{t} tokens</span>
          </div>
        ))}
      </div>
      <Hr />
      <div className="tiny muted">Biggest spenders: Voice rewriter (39%) · CMA generator (22%) · Email drafter (15%) · Compliance check (9%). <a style={{ color:'var(--ink)', textDecoration:'underline', cursor:'pointer' }}>See flow breakdown →</a></div>
    </Box>

    <Anno style={{ alignSelf:'flex-end' }}>↑ manual rows = paste from dashboard · API rows auto-sync</Anno>
  </Desktop>;
}


/* ============================================================
 * V2 — SYSTEM HEALTH (errors, jobs, integrations)
 * ============================================================ */
function AdminV2_Health() {
  const integrations = [
    ['Supabase',          'ok',      '100%',   'polled 8s ago'],
    ['Vercel',            'ok',      '99.99%', '—'],
    ['Pinecone',          'ok',      '100%',   'last write 12m ago'],
    ['Resend',            'ok',      'delivered 98.4% (7d)', '—'],
    ['Anthropic',         'ok',      'p50 420ms', 'cache hit 71%'],
    ['OpenAI',            'ok',      '—',      'fallback idle'],
    ['Remotion Lambda',   'warn',    '2 queued renders stuck', 'retry in 4m'],
    ['Cloudflare R2',     'ok',      '—',      '—'],
    ['Blotato API',       'ok',      '12 posts queued this wk', '—'],
    ['Transact API',      'syncing', 'pulling 6 files',         'next pull 02:00'],
    ['Lofty API',         'warn',    '3 tag mismatches',        'conflict inbox'],
    ['Gmail · Workspace', 'ok',      '—',      '—'],
    ['Slack',             'ok',      '42 events delivered today', 'last 3m ago'],
    ['MLS (manual)',      'off',     'no API yet',              'backed by AI research'],
    ['Sentry',            'ok',      '2 new errors today',      '—'],
    ['PostHog',           'ok',      '—',      '—'],
  ];

  const jobs = [
    ['compliance · re-index handbooks', 'ok',     '4h ago · 142 chunks added'],
    ['lofty · pull contacts + tags',    'ok',     '12m ago · 3 updated'],
    ['transact · pull files',           'syncing','now · 6 files'],
    ['brain · re-embed',                'ok',     '2d ago'],
    ['remotion · render queue',         'warn',   '2 stuck · retrying'],
    ['resend · daily digest',           'ok',     'sent 08:00'],
    ['kpi · nightly rollup',            'ok',     '00:04 · 2s'],
    ['posthog · event backfill',        'ok',     '—'],
  ];

  const errors = [
    ['Studio · Composer',  'TypeError: cannot read dur of undefined', '4',  '3h ago', 'open'],
    ['Lofty sync',         'tag mismatch: "investor"/"INVESTOR"',      '3',  '12m ago','open'],
    ['Remotion render',    '429 from Lambda · throttled',              '2',  '1h ago', 'auto-retry'],
    ['CMA generator',      'slow AI response · p95 8.4s',              '9',  'ongoing','monitor'],
  ];

  return <Desktop active="Settings" url="command.app/admin/health">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">ADMIN · SYSTEM HEALTH</span>
        <span className="serif" style={{ fontSize: 26 }}>What needs fixing</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>live · auto-refresh 30s</Chip>
        <Btn sm>▸ open Sentry</Btn>
        <Btn sm>▸ open PostHog</Btn>
      </div>
    </div>

    {/* TOP SUMMARY */}
    <div className="row" style={{ gap: 10 }}>
      <Box className="grow" style={{ padding: 14, borderLeft:'3px solid var(--accent-sage)' }}>
        <div className="tiny mono muted">OVERALL</div>
        <div className="serif" style={{ fontSize: 26 }}>Healthy · 2 warns</div>
        <div className="tiny muted">13/15 integrations green · 0 critical errors</div>
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">ERRORS · 24H</div>
        <div className="serif" style={{ fontSize: 26 }}>18</div>
        <div className="tiny muted">4 new issues · 2 auto-recovered</div>
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">JOBS · 24H</div>
        <div className="serif" style={{ fontSize: 26 }}>124 / 126</div>
        <div className="tiny muted">98.4% success · 2 retrying</div>
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">P95 RESPONSE</div>
        <div className="serif" style={{ fontSize: 26 }}>820ms</div>
        <div className="tiny muted">down 14% week over week</div>
      </Box>
    </div>

    {/* TRIAGE · what needs fixing */}
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 15 }}>✦ Triage · what I'd fix first</div>
      <div className="col" style={{ gap: 4, marginTop: 6 }}>
        <div className="row between center" style={{ padding:'6px 8px', background:'#fff', border:'1px solid var(--line)' }}>
          <div className="col"><span className="serif" style={{ fontSize: 14 }}>Lofty tag mismatches (3)</span><span className="tiny muted">"investor" / "INVESTOR" / "Investor" — unify casing</span></div>
          <div className="row" style={{ gap: 6 }}><Chip sm>medium</Chip><Btn sm tan>open inbox</Btn></div>
        </div>
        <div className="row between center" style={{ padding:'6px 8px', background:'#fff', border:'1px solid var(--line)' }}>
          <div className="col"><span className="serif" style={{ fontSize: 14 }}>Remotion renders stuck (2)</span><span className="tiny muted">Lambda throttle · will auto-retry in 4m · ok to ignore</span></div>
          <div className="row" style={{ gap: 6 }}><Chip sm>low</Chip><Btn sm>force retry</Btn></div>
        </div>
        <div className="row between center" style={{ padding:'6px 8px', background:'#fff', border:'1px solid var(--line)' }}>
          <div className="col"><span className="serif" style={{ fontSize: 14 }}>Composer crash · 4 occurrences</span><span className="tiny muted">missing duration on imported clip · defensive fix needed</span></div>
          <div className="row" style={{ gap: 6 }}><Chip sm>high</Chip><Btn sm tan>Sentry →</Btn></div>
        </div>
      </div>
    </Box>

    <div className="row" style={{ gap: 10, alignItems:'stretch' }}>
      {/* Integrations */}
      <Box className="grow">
        <div className="serif" style={{ fontSize: 15 }}>Integrations</div>
        <div className="col" style={{ gap: 2, marginTop: 6 }}>
          {integrations.map((r,i)=>(
            <div key={i} className="row between center" style={{ padding:'6px 8px', background: i%2?'var(--paper-2)':'#fff', border:'1px solid var(--line)' }}>
              <div className="row center" style={{ gap: 8 }}>
                <StatusDot s={r[1]} />
                <span className="tiny" style={{ fontWeight: 500 }}>{r[0]}</span>
              </div>
              <div className="row center" style={{ gap: 8 }}>
                <span className="tiny muted">{r[2]}</span>
                <span className="tiny mono muted">{r[3]}</span>
              </div>
            </div>
          ))}
        </div>
      </Box>

      {/* Background jobs */}
      <Box className="grow">
        <div className="serif" style={{ fontSize: 15 }}>Background jobs</div>
        <div className="col" style={{ gap: 2, marginTop: 6 }}>
          {jobs.map((r,i)=>(
            <div key={i} className="row between center" style={{ padding:'6px 8px', background: i%2?'var(--paper-2)':'#fff', border:'1px solid var(--line)' }}>
              <div className="row center" style={{ gap: 8 }}>
                <StatusDot s={r[1]} />
                <span className="tiny">{r[0]}</span>
              </div>
              <span className="tiny mono muted">{r[2]}</span>
            </div>
          ))}
        </div>
      </Box>
    </div>

    {/* Errors */}
    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 15 }}>Recent errors</span>
        <span className="tiny mono muted">from Sentry · last 24h</span>
      </div>
      <table className="wf-table" style={{ marginTop: 8 }}>
        <thead><tr><th>Where</th><th>Error</th><th>#</th><th>Last seen</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {errors.map((r,i)=>(
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{r[0]}</td>
              <td className="tiny mono">{r[1]}</td>
              <td className="mono">{r[2]}</td>
              <td className="tiny muted">{r[3]}</td>
              <td><Chip sm {...(r[4]==='open'?{tan:true}:{})}>{r[4]}</Chip></td>
              <td><Btn sm>▸</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Anno style={{ alignSelf:'flex-start' }}>↑ one page · "what's broken right now" + "what should I look at"</Anno>
  </Desktop>;
}


/* ============================================================
 * V3 — INTEGRATIONS HUB
 * ============================================================ */
function AdminV3_Integrations() {
  const cats = [
    ['Core platform', [
      ['Supabase',   'db · auth · storage', 'ok', 'connected · project cmd-prod'],
      ['Vercel',     'hosting',              'ok', 'linked · auto-deploy main'],
      ['Pinecone',   'vector / RAG',         'ok', '4 namespaces · 182k vectors'],
      ['Cloudflare R2','media CDN',          'ok', '46GB · b-roll + exports'],
    ]],
    ['LLMs', [
      ['Anthropic (Claude)','primary LLM',   'ok', 'Haiku + Sonnet · caching on'],
      ['OpenAI',            'fallback + embeddings', 'ok', 'gpt-4o-mini · text-embed-3-small'],
    ]],
    ['Email / SMS / Calendar', [
      ['Resend',     'transactional + broadcast', 'ok', 'from dana@yourdomain'],
      ['Gmail · Google Workspace','inbox + calendar', 'ok', 'OAuth · dana@yourdomain'],
      ['iMessage (deep-link)',    'click → opens Messages', 'ok', 'no API · sms:+1… handler'],
    ]],
    ['Notifications', [
      ['Slack',      'daily brief · event routing · interactive actions', 'ok', '7 channels · last event 3m ago'],
    ]],
    ['Real estate workflows', [
      ['Lofty',      'client search · valuations · OH emails', 'warn', '3 tag mismatches · review'],
      ['Transact',   'paperwork · e-sign', 'ok', 'OAuth · 14 active files'],
      ['Blotato',    'social publishing',  'ok', 'API · draft → schedule'],
      ['MLS',        'listings · comps',   'off', 'no API yet · manual + AI'],
    ]],
    ['Content · video', [
      ['Remotion Lambda','programmatic video render', 'warn', '2 queued stuck'],
      ['CapCut (manual)','trending audio layer',      'off', 'manual handoff'],
    ]],
    ['Observability', [
      ['Sentry',   'errors',    'ok', 'JS + Node'],
      ['PostHog',  'analytics', 'ok', 'events + sessions'],
    ]],
    ['Compliance', [
      ['Compliance index','RESPA · TILA · Fair Housing · MLS rules · brokerage handbook', 'ok', 'last re-indexed 4h ago'],
    ]],
  ];

  return <Desktop active="Settings" url="command.app/settings/integrations">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">SETTINGS</span>
        <span className="serif" style={{ fontSize: 26 }}>Integrations</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Input placeholder="search…" style={{ width: 180 }} />
        <Btn sm primary>+ connect new</Btn>
      </div>
    </div>

    {cats.map((c,i)=>(
      <div key={i} className="col" style={{ gap: 6 }}>
        <div className="row between center">
          <span className="serif" style={{ fontSize: 16 }}>{c[0]}</span>
          <span className="tiny mono muted">{c[1].length} services</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 8 }}>
          {c[1].map((s,k)=>(
            <Box key={k} style={{ padding: 10 }}>
              <div className="row between center">
                <div className="row center" style={{ gap: 8 }}>
                  <div style={{ width: 28, height: 28, background:'var(--paper-2)', border:'1px solid var(--line)', borderRadius: 4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-display)', fontSize: 14 }}>{s[0][0]}</div>
                  <div className="col">
                    <span className="serif" style={{ fontSize: 14 }}>{s[0]}</span>
                    <span className="tiny muted">{s[1]}</span>
                  </div>
                </div>
                <StatusDot s={s[2]} />
              </div>
              <Hr />
              <div className="row between center">
                <span className="tiny muted">{s[3]}</span>
                <Btn sm>open</Btn>
              </div>
            </Box>
          ))}
        </div>
      </div>
    ))}

    <Anno style={{ alignSelf:'flex-end' }}>↑ one hub · every service Dana pays for lives here</Anno>
  </Desktop>;
}


/* ============================================================
 * V4 — LOFTY DETAIL (sync + tag mapping + conflict inbox)
 * ============================================================ */
function AdminV4_Lofty() {
  const conflicts = [
    ['Tag casing',  '"investor" vs "INVESTOR" vs "Investor"', 'unify to investor', 'tag'],
    ['Name',        'M. Patel (Command) vs Mitul Patel (Lofty)', 'prefer Lofty', 'contact'],
    ['Phone',       '602-555-1212 vs (602) 555-1212',  'normalize format',    'contact'],
  ];

  const tagMap = [
    ['Command', 'Lofty', 'mode'],
    ['buyer · active','Active Buyer','1:1'],
    ['buyer · nurture','Nurture','1:1'],
    ['seller · consult','Seller Lead','1:1'],
    ['investor','Investor','1:1'],
    ['past client','Past Client','1:1'],
    ['soi','Sphere','1:1'],
    ['oh · signed in','OH Attendee','1:1'],
  ];

  return <Desktop active="Settings" url="command.app/settings/integrations/lofty">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">SETTINGS · INTEGRATIONS</span>
        <span className="serif" style={{ fontSize: 24 }}>Lofty · bidirectional sync</span>
        <span className="tiny muted">Client search & OH auto-emails stay in Lofty. Everything else mirrors into Command.</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>connected</Chip>
        <Btn sm>run sync now</Btn>
        <Btn sm>▾ disconnect</Btn>
      </div>
    </div>

    {/* Connection + sync status */}
    <div className="row" style={{ gap: 10 }}>
      <Box className="grow">
        <div className="tiny mono muted">API KEY</div>
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          <Input value="lofty_pk_••••••••••••7f2a" onChange={()=>{}} style={{ flex: 1, fontFamily:'var(--font-mono)', fontSize: 12 }} />
          <Btn sm>rotate</Btn>
        </div>
        <Hr />
        <div className="tiny mono muted">SYNC STATUS</div>
        <div className="col" style={{ gap: 3, marginTop: 4 }}>
          <div className="row between"><span className="tiny">Last pull</span><span className="tiny mono muted">12m ago · 3 updates</span></div>
          <div className="row between"><span className="tiny">Next pull</span><span className="tiny mono muted">in 3m · every 15m</span></div>
          <div className="row between"><span className="tiny">Webhook</span><span className="tiny" style={{ color:'var(--accent-sage)' }}>receiving · last 8m ago</span></div>
          <div className="row between"><span className="tiny">Contacts in sync</span><span className="tiny mono">1,284 / 1,284</span></div>
          <div className="row between"><span className="tiny">Tags in sync</span><span className="tiny mono">42 / 45 <span style={{ color:'var(--warn)' }}>· 3 conflicts</span></span></div>
          <div className="row between"><span className="tiny">Notes mirrored</span><span className="tiny mono">3,118 / 3,118</span></div>
          <div className="row between"><span className="tiny">Saved searches (read-only)</span><span className="tiny mono">842</span></div>
          <div className="row between"><span className="tiny">Valuations (deep-link)</span><span className="tiny mono">147</span></div>
        </div>
      </Box>

      <Box className="grow">
        <div className="tiny mono muted">SYNCED ENTITIES</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {[
            ['Contacts','bidirectional','Command ⇆ Lofty · conflict-safe merge'],
            ['Tags',     'bidirectional','mapped below · conflicts show at top'],
            ['Notes',    'append-only',  'each note tagged with source · no overwrites'],
            ['Saved searches','Lofty → Command (read)','show in contact profile'],
            ['Home valuations','deep-link only',         'opens Lofty in new tab'],
            ['OH attendee → Lofty',    'Command → Lofty','triggers Lofty similar-homes email'],
          ].map((r,i)=>(
            <div key={i} className="row between" style={{ padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
              <div className="col"><span className="tiny" style={{ fontWeight: 500 }}>{r[0]}</span><span className="tiny muted">{r[2]}</span></div>
              <Chip sm>{r[1]}</Chip>
            </div>
          ))}
        </div>
      </Box>
    </div>

    {/* Conflict inbox */}
    <Box dashed>
      <div className="row between center">
        <span className="hand-alt" style={{ fontSize: 15 }}>✦ Conflict inbox · 3 items</span>
        <Btn sm tan>resolve all (use suggested)</Btn>
      </div>
      <div className="col" style={{ gap: 4, marginTop: 8 }}>
        {conflicts.map((r,i)=>(
          <div key={i} className="row between center" style={{ padding:'8px 10px', background:'#fff', border:'1px solid var(--line)' }}>
            <div className="row center" style={{ gap: 10 }}>
              <Chip sm>{r[3]}</Chip>
              <div className="col">
                <span className="tiny" style={{ fontWeight: 500 }}>{r[0]}</span>
                <span className="tiny muted">{r[1]}</span>
              </div>
            </div>
            <div className="row center" style={{ gap: 6 }}>
              <span className="tiny" style={{ color:'var(--accent-sage)' }}>suggest: {r[2]}</span>
              <Btn sm>accept</Btn>
              <Btn sm>manual</Btn>
            </div>
          </div>
        ))}
      </div>
    </Box>

    {/* Tag mapping */}
    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 16 }}>Tag mapping</span>
        <Btn sm>+ add mapping</Btn>
      </div>
      <table className="wf-table" style={{ marginTop: 8 }}>
        <thead><tr><th>Command tag</th><th>Lofty tag</th><th>Mode</th><th></th></tr></thead>
        <tbody>
          {tagMap.slice(1).map((r,i)=>(
            <tr key={i}>
              <td><Chip sm filled>{r[0]}</Chip></td>
              <td><Chip sm>{r[1]}</Chip></td>
              <td className="tiny muted">{r[2]}</td>
              <td><Btn sm>edit</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    {/* Data roadmap */}
    <Box style={{ padding: 12, background:'var(--card)' }}>
      <span className="hand-alt" style={{ fontSize: 14 }}>Migration path · Lofty → Command (v2)</span>
      <div className="tiny muted" style={{ marginTop: 4 }}>Everything above is already in Command. When you're ready, disconnect Lofty and flip on Command-native MLS search + saved alerts. No re-import needed — it's all there.</div>
    </Box>

    <Anno style={{ alignSelf:'flex-end' }}>↑ Lofty handles client search · Command owns the relationship</Anno>
  </Desktop>;
}


/* ============================================================
 * V5 — TRANSACT DETAIL
 * ============================================================ */
function AdminV5_Transact() {
  const files = [
    ['42 Oak St · Chen',          'Listing', '62%', 'Inspection period',  'Apr 28', 'on track'],
    ['777 Cedar · Haleigh + Tom', 'Buyer',   '84%', 'Appraisal ordered',  'Apr 24', 'on track'],
    ['88 Elm Ave · Marcus Reid',  'Listing', '14%', 'Signatures pending', 'Apr 22', 'blocked'],
    ['9 Juniper · Kim Pair',      'Buyer',   '38%', 'Under review',       'May 2',  'on track'],
  ];

  return <Desktop active="Settings" url="command.app/settings/integrations/transact">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">SETTINGS · INTEGRATIONS</span>
        <span className="serif" style={{ fontSize: 24 }}>Transact · read-through paperwork</span>
        <span className="tiny muted">Transact is source of truth. Command mirrors statuses. Checklist steps with [Transact] badge live here.</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>connected · OAuth</Chip>
        <Btn sm>run sync now</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10 }}>
      <Box className="grow">
        <div className="tiny mono muted">CONNECTION</div>
        <div className="col" style={{ gap: 3, marginTop: 4 }}>
          <div className="row between"><span className="tiny">Account</span><span className="tiny mono muted">dana@brokerage</span></div>
          <div className="row between"><span className="tiny">Last pull</span><span className="tiny mono muted">now · 6 files</span></div>
          <div className="row between"><span className="tiny">Webhook</span><span className="tiny" style={{ color:'var(--accent-sage)' }}>ok · 2m ago</span></div>
          <div className="row between"><span className="tiny">Active files</span><span className="tiny mono">14</span></div>
          <div className="row between"><span className="tiny">Pending signatures</span><span className="tiny mono" style={{ color:'var(--warn)' }}>3</span></div>
        </div>
      </Box>
      <Box className="grow">
        <div className="tiny mono muted">AUTO-CREATE RULES</div>
        <div className="col" style={{ gap: 4, marginTop: 4 }}>
          {[
            ['When deal goes under contract →','create Transact file','ON'],
            ['When buyer signs BBA in Command →','attach to Transact','ON'],
            ['When Transact milestone hits →','check off Command checklist','ON'],
            ['When Transact file closes →','mark deal closed + commission in Money','ON'],
          ].map((r,i)=>(
            <div key={i} className="row between" style={{ padding:'5px 8px', background:'#fff', border:'1px solid var(--line)' }}>
              <div className="col"><span className="tiny">{r[0]}</span><span className="tiny muted">{r[1]}</span></div>
              <Chip sm filled>{r[2]}</Chip>
            </div>
          ))}
        </div>
      </Box>
    </div>

    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 16 }}>Active files · live from Transact</span>
        <Btn sm>open Transact ↗</Btn>
      </div>
      <table className="wf-table" style={{ marginTop: 8 }}>
        <thead><tr><th>File</th><th>Type</th><th>Progress</th><th>Current step</th><th>Close by</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {files.map((r,i)=>(
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{r[0]}</td>
              <td className="tiny"><Chip sm>{r[1]}</Chip></td>
              <td>
                <div className="row center" style={{ gap: 6 }}>
                  <div style={{ width: 70, height: 6, background:'var(--paper-2)', position:'relative' }}>
                    <div style={{ position:'absolute', left: 0, top: 0, bottom: 0, width: r[2], background: r[5]==='blocked'?'#c0604a':'var(--accent-tan)' }} />
                  </div>
                  <span className="tiny mono">{r[2]}</span>
                </div>
              </td>
              <td className="tiny">{r[3]}</td>
              <td className="tiny mono">{r[4]}</td>
              <td><Chip sm {...(r[5]==='blocked'?{tan:true}:{})}>{r[5]}</Chip></td>
              <td><Btn sm>open in Transact ↗</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Box dashed>
      <span className="hand-alt" style={{ fontSize: 14 }}>✦ Checklist mirror</span>
      <div className="tiny muted" style={{ marginTop: 4 }}>Every checklist template in Command with a <Chip sm>Transact</Chip> step pulls status from here. Check off in Transact → it checks in Command. No duplicate work.</div>
    </Box>

    <Anno style={{ alignSelf:'flex-end' }}>↑ Transact = source of truth for paperwork · Command just reads</Anno>
  </Desktop>;
}


/* ============================================================
 * V6 — COMPLIANCE INDEX
 * ============================================================ */
function AdminV6_Compliance() {
  const sources = [
    ['Arizona real estate handbook', 'state law',        'v2026.1', 'Mar 14', 842,   'ok',   'weekly'],
    ['Brokerage compliance guide',   'brokerage',        'v4.2',    'Feb 02', 186,   'ok',   'on change'],
    ['RESPA — 12 CFR 1024',          'federal · HUD',    '2024 ed', 'Jan 01', 412,   'ok',   'monthly'],
    ['TILA — 12 CFR 1026',           'federal · CFPB',   '2024 ed', 'Jan 01', 640,   'ok',   'monthly'],
    ['Fair Housing Act',             'federal · HUD',    'current', 'Oct 12', 78,    'ok',   'on change'],
    ['ARMLS rules & regulations',    'MLS board',        'v2026.1', 'Apr 01', 220,   'ok',   'quarterly'],
    ['Meta ad policies · housing',   'platform',         'current', 'Apr 15', 34,    'warn', 'watch'],
    ['TikTok commerce · RE',         'platform',         'current', 'Apr 10', 28,    'ok',   'monthly'],
    ['CAN-SPAM / state email laws',  'federal + state',  'current', 'Mar 22', 58,    'ok',   'monthly'],
  ];

  return <Desktop active="Settings" url="command.app/settings/compliance">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">SETTINGS · AI SAFETY</span>
        <span className="serif" style={{ fontSize: 24 }}>Compliance index</span>
        <span className="tiny muted">Pre-publish AI check reads from these sources. Re-indexed on schedule + on change.</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>+ add source</Btn>
        <Btn sm>re-index all now</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10 }}>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">CHECKS · LAST 7D</div>
        <div className="serif" style={{ fontSize: 28 }}>312</div>
        <div className="tiny muted">284 pass · 22 warn · 6 block</div>
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">MOST-TRIGGERED RULE</div>
        <div className="serif" style={{ fontSize: 16 }}>Fair Housing · steering</div>
        <div className="tiny muted">11 warns · "neighborhood vibe" phrasing</div>
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">RESPA REFERRAL LANGUAGE</div>
        <div className="serif" style={{ fontSize: 16 }}>2 blocks</div>
        <div className="tiny muted">Vendor tab · Sec 8 violations caught</div>
      </Box>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="tiny mono muted">HUMAN REVIEW DUE</div>
        <div className="serif" style={{ fontSize: 16 }}>28 days</div>
        <div className="tiny muted">quarterly sanity check</div>
      </Box>
    </div>

    <Box style={{ padding: 0 }}>
      <table className="wf-table">
        <thead><tr>
          <th>Source</th><th>Authority</th><th>Version</th><th>Updated</th><th>Chunks</th><th>Status</th><th>Re-index</th><th></th>
        </tr></thead>
        <tbody>
          {sources.map((r,i)=>(
            <tr key={i}>
              <td style={{ fontWeight: 500 }}>{r[0]}</td>
              <td className="tiny"><Chip sm>{r[1]}</Chip></td>
              <td className="tiny mono muted">{r[2]}</td>
              <td className="tiny muted">{r[3]}</td>
              <td className="mono">{r[4]}</td>
              <td><StatusDot s={r[5]} /></td>
              <td className="tiny muted">{r[6]}</td>
              <td className="row" style={{ gap: 4 }}><Btn sm>view</Btn><Btn sm>re-index</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ How a check works</div>
      <div className="tiny" style={{ marginTop: 4 }}>
        You hit "publish" in Studio or Email. AI reads draft + citations from this index · scores risk · returns:
        <b> ✓ pass</b> (green, publish) · <b>⚠ warn</b> (yellow, shows which rule + page, you decide) · <b>✗ block</b> (red, must fix or override with a noted reason your broker can audit).
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Safety net, not a lawyer. Quarterly human review keeps the index fresh.</div>
    </Box>

    <Anno style={{ alignSelf:'flex-start' }}>↑ RAG-powered pre-publish check · every channel</Anno>
  </Desktop>;
}


/* ============================================================
 * V7 — SLACK (routing rules + daily brief + interactive actions)
 * ============================================================ */
function AdminV7_Slack() {
  const channels = [
    ['SELLERS', 'group', [
      ['#seller_chen-42-oak',          'per-listing · auto-created', '—'],
      ['#seller_haleigh-tom-777',      'per-listing',                '—'],
      ['#seller_marcus-reid',          'per-listing',                '—'],
    ]],
    ['BUYERS', 'group', [
      ['#buyer_mitul-patel',           'per-buyer · auto-created',   '—'],
      ['#buyer_kim-pair',              'per-buyer',                  '—'],
      ['#buyer_ashley-jordan',         'per-buyer',                  '—'],
    ]],
    ['LEADS & OPPS', 'group', [
      ['#expired-listings',            'expired matches · daily roundup',    'realtime'],
      ['#open-house-opportunities',    'OH performance · weather prep · sign-ins', 'realtime'],
      ['#openclaw',                    'hot leads · OH debrief actions',     'realtime'],
    ]],
    ['GENERAL SHIZ', 'group', [
      ['#all-dana-massey-realtor',     'everything-announce channel',  'fyi'],
      ['#cma-pricing-strategies',      'CMA drafts + price change alerts', 'realtime'],
      ['#client-updates_airtable',     'weekly seller update digest',  'weekly'],
      ['#signage',                     'sign orders · install notices', 'realtime'],
      ['#daily-brief',                 '7 AM brief · 5 PM wrap-up',    'scheduled'],
      ['#content-review',              'AI drafts ready for approval', 'realtime'],
      ['#compliance',                  'warnings · blocks · overrides','realtime'],
      ['#system',                      'integration errors · cost alerts','realtime'],
      ['#wins',                        'closed deals · reviews · viral posts','realtime'],
    ]],
  ];

  const rules = [
    ['Transact',    'BBA signed',          '#buyer_{slug} · #seller_{slug}', 'post + "next step" button'],
    ['Transact',    'file closed',         '#wins · client channel',         'celebrate + commission in Money'],
    ['Studio',      'render finished',     '#content-review',                'thumbnails + approve-all button'],
    ['Bio Link',    'hot lead form fill',  '#openclaw',                      'text-them-now iMessage deep-link'],
    ['OH Kiosk',    'new sign-in',         '#openclaw · #open-house-opportunities', 'name · tier · auto-drip started'],
    ['OH Schedule', 'OH scheduled',        '#open-house-opportunities',      'weather preview + checklist link'],
    ['OH Morning',  'day-of · 7 AM',       '#open-house-opportunities · #daily-brief', 'live forecast · radar · prep flags'],
    ['Compliance',  'pre-publish block',   '#compliance',                    'rule cited · override link'],
    ['Cost guard',  '>95% of budget',      '#system · @dana',                'which service · projected over'],
    ['Sentry',      'new error group',     '#system',                        'stack · retry link'],
    ['CMA',         'new CMA drafted',     '#cma-pricing-strategies',        'preview + send-to-seller button'],
    ['Weekly email','seller update queued','#client-updates_airtable',       'preview · approve · send'],
    ['Expired MLS', 'new match',           '#expired-listings',              'address · days expired · skip-trace'],
    ['KPI nightly', 'goal pace shift',     '#daily-brief',                   'delta vs yesterday'],
    ['Lofty sync',  'conflict > 3',        '#system',                        'open conflict inbox'],
  ];

  return <Desktop active="Settings" url="command.app/settings/integrations/slack">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">SETTINGS · INTEGRATIONS</span>
        <span className="serif" style={{ fontSize: 24 }}>Slack · notifications & daily brief</span>
        <span className="tiny muted">Push-notify your phone · interactive buttons · per-client channels auto-created.</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>connected · dana-command.slack.com</Chip>
        <Btn sm>test send to #daily-brief</Btn>
        <Btn sm>▾ disconnect</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 10 }}>
      <Box className="grow">
        <div className="tiny mono muted">WORKSPACE</div>
        <div className="col" style={{ gap: 3, marginTop: 4 }}>
          <div className="row between"><span className="tiny">Workspace</span><span className="tiny mono muted">dana-command</span></div>
          <div className="row between"><span className="tiny">Bot user</span><span className="tiny mono muted">@command</span></div>
          <div className="row between"><span className="tiny">Scopes</span><span className="tiny mono muted">chat:write · channels:manage · files:write · commands</span></div>
          <div className="row between"><span className="tiny">Events today</span><span className="tiny mono">42 sent · 0 failed</span></div>
          <div className="row between"><span className="tiny">Button clicks today</span><span className="tiny mono">7 acted on</span></div>
        </div>
      </Box>

      <Box className="grow">
        <div className="tiny mono muted">PREVIEW & PRIVACY</div>
        <div className="col" style={{ gap: 5, marginTop: 4 }}>
          {[
            ['Redact client names in notifications','ON','lock-screen won\'t show "Chen"'],
            ['Include $ amounts in preview',        'OFF','private safety'],
            ['Ring at night (10p–7a)',              'OFF','silent except #system critical'],
            ['Quiet mode when OH is live',          'ON','pauses non-urgent'],
          ].map((r,i)=>(
            <div key={i} className="row between" style={{ padding:'5px 8px', background:'#fff', border:'1px solid var(--line)' }}>
              <div className="col"><span className="tiny">{r[0]}</span><span className="tiny muted">{r[2]}</span></div>
              <Chip sm filled>{r[1]}</Chip>
            </div>
          ))}
        </div>
      </Box>
    </div>

    {/* Daily brief preview */}
    <div className="row" style={{ gap: 10, alignItems:'stretch' }}>
      <Box className="grow" dashed>
        <div className="hand-alt" style={{ fontSize: 15 }}>✦ Daily brief · 7 AM preview</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize: 12, background:'#fff', border:'1px solid var(--line)', padding: 12, marginTop: 8, lineHeight: 1.7, color:'var(--ink)' }}>
          <div><b>@command</b> · posted to <b>#daily-brief</b> · 7:00 AM</div>
          <div style={{ marginTop: 6 }}>Good morning Dana ☀</div>
          <div>────────────────────</div>
          <div><b>TODAY</b> · 3 showings · 1 closing prep · OH Sun 1–3</div>
          <div><b>FOLLOW UPS</b> · 4 overdue · tap to see</div>
          <div><b>HOT</b> · Mitul P. opened CMA 3× overnight</div>
          <div><b>KPI</b> · Pipeline +$340k · April pace 78%</div>
          <div><b>WEATHER</b> · Sun 72° partly cloudy (your OH)</div>
          <div>────────────────────</div>
          <div style={{ marginTop: 6 }}>[ Open Command → ]  [ Snooze brief tomorrow ]</div>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <Chip sm filled>7:00 AM Mon–Sat</Chip>
          <Chip sm>5:00 PM wrap-up</Chip>
          <Btn sm>edit schedule</Btn>
          <Btn sm>edit content blocks</Btn>
        </div>
      </Box>

      <Box className="grow" dashed>
        <div className="hand-alt" style={{ fontSize: 15 }}>✦ Interactive event · example</div>
        <div style={{ fontFamily:'var(--font-mono)', fontSize: 12, background:'#fff', border:'1px solid var(--line)', padding: 12, marginTop: 8, lineHeight: 1.7 }}>
          <div><b>@command</b> → <b>#seller_chen-42-oak</b> · 2m ago</div>
          <div style={{ marginTop: 6 }}>📄 <b>BBA signed</b> by Chen (42 Oak St)</div>
          <div className="muted">via Transact · 10:42 AM</div>
          <div style={{ marginTop: 8 }}>Next checklist step: <b>schedule inspection</b> by Apr 24</div>
          <div style={{ marginTop: 8 }}>
            <span style={{ background:'var(--paper-2)', padding:'3px 8px', border:'1px solid var(--line)', marginRight: 4 }}>✓ Mark done</span>
            <span style={{ background:'var(--paper-2)', padding:'3px 8px', border:'1px solid var(--line)', marginRight: 4 }}>⏱ Snooze 2h</span>
            <span style={{ background:'var(--paper-2)', padding:'3px 8px', border:'1px solid var(--line)' }}>↗ Open in Transact</span>
          </div>
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>Slack buttons post back to Command · checklist updates live · no tab-switching.</div>
      </Box>
    </div>

    {/* Channels */}
    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 16 }}>Channels · matches your Slack sidebar</span>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>import existing channels</Btn>
          <Btn sm>+ add channel</Btn>
        </div>
      </div>
      <div className="tiny muted" style={{ marginTop: 4 }}>
        Groups mirror your Slack sections (SELLERS · BUYERS · LEADS & OPPS · GENERAL SHIZ). Per-client channels auto-create with your naming: <span className="mono">seller_firstname-lastname</span> or <span className="mono">buyer_firstname-lastname</span>.
      </div>
      <div className="col" style={{ gap: 10, marginTop: 10 }}>
        {channels.map((grp,gi)=>(
          <div key={gi} className="col" style={{ gap: 4 }}>
            <div className="row center" style={{ gap: 6 }}>
              <span style={{ fontSize: 13 }}>{grp[0]==='SELLERS'?'🤍':grp[0]==='BUYERS'?'🖤':grp[0]==='LEADS & OPPS'?'🎯':'🔥'}</span>
              <span className="tiny mono" style={{ letterSpacing:'.08em', fontWeight: 600 }}>{grp[0]}</span>
              <span className="tiny muted">· {grp[2].length} channels</span>
            </div>
            <div className="col" style={{ gap: 2 }}>
              {grp[2].map((c,ci)=>(
                <div key={ci} className="row between center" style={{ padding:'5px 8px', background: ci%2?'var(--paper-2)':'#fff', border:'1px solid var(--line)' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize: 12, fontWeight: 500 }}>{c[0]}</span>
                  <div className="row center" style={{ gap: 8 }}>
                    <span className="tiny muted">{c[1]}</span>
                    <Chip sm>{c[2]==='—'?'auto':c[2]}</Chip>
                    <Btn sm>edit</Btn>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Box>

    {/* Routing rules */}
    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 16 }}>Routing rules · event → channel</span>
        <Btn sm>+ add rule</Btn>
      </div>
      <table className="wf-table" style={{ marginTop: 8 }}>
        <thead><tr><th>Source</th><th>Event</th><th>Destination</th><th>Behavior</th><th></th></tr></thead>
        <tbody>
          {rules.map((r,i)=>(
            <tr key={i}>
              <td><Chip sm>{r[0]}</Chip></td>
              <td className="tiny">{r[1]}</td>
              <td style={{ fontFamily:'var(--font-mono)', fontSize: 12 }}>{r[2]}</td>
              <td className="tiny muted">{r[3]}</td>
              <td><Btn sm>edit</Btn></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    {/* Per-client channel auto-create */}
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ Per-client channels · matches your existing Slack format</div>
      <div className="tiny" style={{ marginTop: 4 }}>
        When you add a <b>buyer</b> or <b>seller</b> in Command, we auto-create the matching Slack channel with your naming convention: <span className="mono">#seller_firstname-lastname</span> or <span className="mono">#buyer_firstname-lastname</span>. For listings you can include the address: <span className="mono">#seller_lee-cortez_30011</span>. You're added, bot posts Transact milestones, signed docs, CMA drafts, and weekly updates there.
      </div>
      <div className="row" style={{ gap: 6, marginTop: 6, flexWrap:'wrap' }}>
        <Chip sm filled>auto-create ON</Chip>
        <Chip sm>naming: <span className="mono">seller_/buyer_firstname-lastname</span></Chip>
        <Chip sm>group: 🤍 SELLERS · 🖤 BUYERS</Chip>
        <Chip sm>archive 30d post-close (ARCHIVE channel)</Chip>
      </div>
    </Box>

    <Anno style={{ alignSelf:'flex-end' }}>↑ Slack = your mobile notification layer · daily brief · per-deal channels</Anno>
  </Desktop>;
}


/* ============================================================
 * Register
 * ============================================================ */
window.AdminScreens = [
  { id:'admin1', label:'V1 · Usage & Costs',     caption:'Per-service monthly spend · trends · budget alerts · AI token detail · API vs manual.',     Component: AdminV1_Usage },
  { id:'admin2', label:'V2 · System Health',     caption:'Errors · background jobs · integration status · triage "what to fix first".',                Component: AdminV2_Health },
  { id:'admin3', label:'V3 · Integrations hub',  caption:'Every service in one place · grouped by category · status dots · open to detail.',           Component: AdminV3_Integrations },
  { id:'admin4', label:'V4 · Lofty detail',      caption:'Bidirectional sync · tag mapping · conflict inbox · migration path when Command-native MLS lands.', Component: AdminV4_Lofty },
  { id:'admin5', label:'V5 · Transact detail',   caption:'Read-through file mirror · auto-create rules · checklist mirror badge.',                     Component: AdminV5_Transact },
  { id:'admin6', label:'V6 · Compliance index',  caption:'RAG sources for pre-publish AI check · re-index schedule · recent check stats.',             Component: AdminV6_Compliance },
  { id:'admin7', label:'V7 · Slack',             caption:'Daily brief · per-client channels · interactive buttons · event routing · privacy toggles.', Component: AdminV7_Slack },
];

/* ============================================================
 * Command · Studio
 *   - Library (your b-roll: photos, video, audio, text, brand)
 *   - Properties (paste MLS/Zillow/upload → property detail, split layout)
 *   - Templates (built-in, uploaded, inspo-to-template, AI)
 *   - Composer (hybrid editor — arrange in-app, export to Remotion/Canva/Gamma)
 *
 * All components read existing Box, Desktop, Phone, Chip, Btn, Input, Bar,
 * Hr, Anno from window globals set by wf-components.
 * ============================================================ */

/* ---------- tiny shared helpers ---------- */
const Swatch = ({ color, label }) => (
  <div className="col" style={{ gap: 2, alignItems:'center' }}>
    <div style={{ width: 28, height: 28, background: color, borderRadius: 3, border: '1px solid var(--line)' }} />
    <span className="tiny mono muted">{label}</span>
  </div>
);

// Placeholder media tile — polaroid/contact-sheet vibe. Pass `vid` for a video overlay.
function MediaTile({ color = 'var(--accent-tan)', label, tag, vid, dur, tall, wide, select, style = {} }) {
  const aspect = tall ? '3/4' : wide ? '16/9' : '1/1';
  return (
    <div
      className="col"
      style={{
        gap: 3,
        padding: 5,
        background: '#fff',
        border: '1px solid var(--line)',
        boxShadow: '1px 1.5px 0 var(--line)',
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          aspectRatio: aspect,
          background: color,
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-start',
          padding: 6,
          overflow: 'hidden',
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0 6px, transparent 6px 12px)',
        }}
      >
        {vid && (
          <div style={{ position:'absolute', top: 6, left: 6, padding:'1px 5px', background:'rgba(0,0,0,0.6)', color:'#fff', fontFamily:'JetBrains Mono,monospace', fontSize: 9, borderRadius: 2 }}>
            ▶ {dur || '0:12'}
          </div>
        )}
        {select && (
          <div style={{ position:'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%', background: select==='on' ? 'var(--accent-sage)' : '#fff', border: '1.5px solid var(--ink)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize: 10 }}>
            {select==='on' ? '✓' : ''}
          </div>
        )}
        <span style={{ fontFamily:'Caveat,cursive', fontSize: 13, color:'rgba(0,0,0,0.55)' }}>{label}</span>
      </div>
      {tag && <span className="tiny mono muted" style={{ fontSize: 9, padding: '0 2px' }}>{tag}</span>}
    </div>
  );
}

// Small property thumbnail card
function PropThumb({ addr, px, beds, baths, sqft, status, color, hero, compact }) {
  return (
    <div className="col" style={{ gap: 4, padding: 6, background:'#fff', border:'1px solid var(--line)', boxShadow:'1.5px 2px 0 var(--line)' }}>
      <div style={{ aspectRatio: compact ? '16/9' : '4/3', background: color || 'var(--accent-tan)', position:'relative',
        backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px)' }}>
        <span style={{ position:'absolute', top: 4, left: 4, fontFamily:'Caveat,cursive', fontSize: 12, color:'rgba(0,0,0,0.55)' }}>{hero || 'hero'}</span>
        {status && <span className="tiny mono" style={{ position:'absolute', top: 4, right: 4, background:'#fff', padding:'1px 5px', fontSize: 9, border:'1px solid var(--line)' }}>{status}</span>}
      </div>
      <div className="row between">
        <span className="serif" style={{ fontSize: 14, fontWeight: 500 }}>{addr}</span>
        <span className="serif" style={{ fontSize: 14 }}>{px}</span>
      </div>
      <div className="tiny muted mono">{beds}bd · {baths}ba · {sqft}sqft</div>
    </div>
  );
}


/* ============================================================
 * STUDIO · V1 — Home / Studio dashboard
 * The entry screen when you click the Studio tab.
 * ============================================================ */
function StudioV1_Home() {
  return <Desktop active="Studio" url="command.app/studio">
    <div className="row between center">
      <div className="col" style={{ gap: 2 }}>
        <span className="serif" style={{ fontSize: 26 }}>Studio</span>
        <span className="tiny muted">Your b-roll · Properties you love · Templates · Everything editable.</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>⌘K jump</Btn>
        <Btn sm primary>+ new post</Btn>
      </div>
    </div>

    {/* three big buckets */}
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow" style={{ padding: 14 }}>
        <div className="row between center">
          <span className="serif" style={{ fontSize: 18 }}>Library <span className="tiny muted">of you</span></span>
          <span className="tiny mono muted">412 items</span>
        </div>
        <div className="row" style={{ gap: 4, marginTop: 8 }}>
          {['tan','sage','rose','accent','tan','sage'].map((c,i)=>(
            <div key={i} style={{ flex:1, aspectRatio:'1/1', background:`var(--accent-${c==='accent'?'':''+c})` || `var(--accent-${c})`, borderRadius:2, backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 6px, transparent 6px 12px)' }}/>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>184 photos · 96 video clips · 22 voiceovers · 64 snippets · 46 brand files</div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <Chip sm>headshots 22</Chip><Chip sm>lifestyle 84</Chip><Chip sm>b-roll 96</Chip><Chip sm>+</Chip>
        </div>
      </Box>

      <Box className="grow" style={{ padding: 14 }}>
        <div className="row between center">
          <span className="serif" style={{ fontSize: 18 }}>Properties <span className="tiny muted">inspo</span></span>
          <span className="tiny mono muted">17 saved</span>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <PropThumb addr="188 Maple" px="$1.2M" beds="4" baths="3" sqft="2,840" status="love" color="var(--accent-tan)" hero="exterior · golden hr" compact />
          <PropThumb addr="42 Linden" px="$780k" beds="3" baths="2" sqft="1,640" status="used" color="var(--accent-sage)" hero="mid-century mod" compact />
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>MLS paste · Zillow/Redfin · manual upload → auto-attribution</div>
      </Box>

      <Box className="grow" style={{ padding: 14 }}>
        <div className="row between center">
          <span className="serif" style={{ fontSize: 18 }}>Templates</span>
          <span className="tiny mono muted">34 available</span>
        </div>
        <div className="col" style={{ gap: 4, marginTop: 8 }}>
          {[
            ['Reel · 3-shot hook + price reveal', '0:18', 'sage'],
            ['Carousel · 7 slides tour', '—', 'tan'],
            ['Story · just-listed takeover', '0:09', 'rose'],
          ].map(([l,d,c],i)=>(
            <div key={i} className="row between" style={{ padding:'6px 8px', border:'1px solid var(--line)', background:'#fff' }}>
              <span className="tiny">{l}</span>
              <span className="tiny mono muted">{d}</span>
            </div>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 8 }}>Mine · built-in · inspo-cloned · AI-generated</div>
      </Box>
    </div>

    {/* quick start row */}
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 16 }}>✦ Quick start · what are you making?</div>
      <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
        {[
          ['Paste MLS / Zillow link', '→ property → templates'],
          ['Drop an inspo post', '→ recreate with my listing'],
          ['Pick a template', '→ auto-fill with b-roll'],
          ['Start from a clip of me', '→ AI picks the format'],
          ['Weekly content batch', '→ 7 posts in 20 min'],
        ].map(([t,s],i)=>(
          <div key={i} className="col" style={{ gap: 2, padding:'8px 10px', border:'1.5px dashed var(--line)', background:'var(--card)', minWidth: 190 }}>
            <span className="serif" style={{ fontSize: 14, fontWeight: 500 }}>{t}</span>
            <span className="tiny muted">{s}</span>
          </div>
        ))}
      </div>
    </Box>

    {/* recent + pipeline */}
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="row between center">
          <span className="serif" style={{ fontSize: 16 }}>Recent posts</span>
          <span className="tiny muted">▾ 7 days</span>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 6 }}>
          {['Reel · 42 Oak','Carousel · buyer tips','Story · OH Sat','Email · new blog','Reel · 188 Maple'].map((t,i)=>(
            <MediaTile key={i} color={['var(--accent-tan)','var(--accent-sage)','var(--accent-rose)','var(--accent-tan)','var(--accent-sage)'][i]} label={t} tag={['12.4k','2.1k','8.9k','opened 44%','3.2k'][i]} vid={i%2===0} dur="0:15" style={{ flex:1 }} />
          ))}
        </div>
      </Box>
      <Box className="grow" dashed>
        <div className="serif" style={{ fontSize: 16 }}>In flight</div>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {[
            ['Reel · 188 Maple tour', 'draft · needs VO','60%'],
            ['Carousel · 42 Linden','ready to publish','100%'],
            ['Email · weekly market','AI draft awaiting','40%'],
          ].map(([t,s,p],i)=>(
            <div key={i} className="col" style={{ gap: 3 }}>
              <div className="row between"><span className="tiny">{t}</span><span className="tiny muted">{s}</span></div>
              <Bar pct={parseInt(p)} />
            </div>
          ))}
        </div>
      </Box>
    </div>
    <Anno style={{ alignSelf:'flex-end' }}>↑ everything feeds into everything else</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V2 — Library index (b-roll of YOU)
 * Filter by media type (requested). Side panel tags + sessions.
 * ============================================================ */
function StudioV2_Library() {
  const types = ['All', 'Photos', 'Video', 'Audio', 'Text', 'Brand'];
  const [active, setActive] = React.useState('Photos');

  // sample grid
  const photos = [
    ['Headshot · studio', 'var(--accent-tan)', 'headshot · 2026-01', 'tall'],
    ['Neighborhood walk', 'var(--accent-sage)', 'lifestyle · bright', 'tall'],
    ['Coffee shop local', 'var(--accent-rose)', 'lifestyle · warm', 'tall'],
    ['Showing a home', 'var(--accent-tan)', 'action · work', 'tall'],
    ['With a client', 'var(--accent-sage)', 'action · client', 'tall'],
    ['At the office', 'var(--accent)', 'talking-head · desk', 'tall'],
    ['Golden hour portrait', 'var(--accent-tan)', 'headshot · dusk', 'tall'],
    ['Sign in yard', 'var(--accent-rose)', 'action · listing', 'tall'],
  ];

  return <Desktop active="Studio" url="command.app/studio/library">
    <div className="row between center">
      <div className="col" style={{ gap: 2 }}>
        <span className="serif" style={{ fontSize: 22 }}>Library <span className="muted" style={{ fontSize:14 }}>· of Dana</span></span>
        <span className="tiny muted">Your face, voice, b-roll, snippets, brand — all in one shelf.</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>⬆ upload</Btn>
        <Btn sm>import from iCloud</Btn>
        <Btn sm primary>+ new session</Btn>
      </div>
    </div>

    {/* media-type tabs */}
    <Box style={{ padding: 0 }}>
      <div className="row" style={{ gap: 0, borderBottom:'1px solid var(--line)' }}>
        {types.map(t => (
          <button key={t} onClick={()=>setActive(t)}
            style={{
              padding:'10px 16px', border:'none', background:'none',
              borderBottom: active===t ? '2px solid var(--ink)' : '2px solid transparent',
              fontFamily:'inherit', fontSize: 14, cursor:'pointer',
              color: active===t ? 'var(--ink)' : 'var(--muted)', fontWeight: active===t ? 600 : 400,
            }}>
            {t} <span className="tiny muted" style={{ marginLeft: 4 }}>{({All:412, Photos:184, Video:96, Audio:22, Text:64, Brand:46})[t]}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="row center" style={{ padding:'0 10px', gap: 6 }}>
          <Input placeholder="search…" style={{ width: 160, fontSize: 12 }} />
          <span className="tiny muted">▾ sort · newest</span>
        </div>
      </div>

      {/* tag strip */}
      <div className="row wrap" style={{ gap: 6, padding: 10, borderBottom:'1px solid var(--line)', background:'var(--paper-2)' }}>
        <span className="tiny mono muted">filter:</span>
        <Chip sm filled>headshot 22</Chip>
        <Chip sm>lifestyle 84</Chip>
        <Chip sm>action 38</Chip>
        <Chip sm>talking-head 18</Chip>
        <Chip sm>outdoor 52</Chip>
        <Chip sm>golden hr 12</Chip>
        <Chip sm>with-client 24</Chip>
        <Chip sm>bright 96</Chip>
        <Chip sm>moody 34</Chip>
        <span className="tiny mono muted" style={{ marginLeft: 6 }}>+ add tag</span>
      </div>

      {/* grid */}
      <div className="row" style={{ padding: 12, gap: 12 }}>
        <div className="grow" style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8 }}>
          {photos.map((p,i)=>(
            <MediaTile key={i} color={p[1]} label={p[0]} tag={p[2]} tall select={i<2?'on':'off'} />
          ))}
        </div>

        {/* side rail: sessions + usage */}
        <div className="col" style={{ width: 220, gap: 10 }}>
          <Box style={{ padding: 10 }}>
            <span className="tiny mono muted">SESSIONS</span>
            <div className="col" style={{ gap: 3, marginTop: 6 }}>
              {['Jan · studio headshot','Feb · neighborhood','Mar · open house b-roll','Apr · office + desk'].map((s,i)=>(
                <div key={i} className="row between"><span className="tiny">{s}</span><span className="tiny muted mono">{[22,34,48,18][i]}</span></div>
              ))}
            </div>
          </Box>
          <Box style={{ padding: 10 }}>
            <span className="tiny mono muted">MOST USED</span>
            <div className="col" style={{ gap: 3, marginTop: 6 }}>
              {['Headshot · coffee','Drone · downtown','Sign-off · "see you in the neighborhood"'].map((s,i)=>(
                <div key={i} className="tiny">{s} <span className="muted">· {[18,14,9][i]}×</span></div>
              ))}
            </div>
          </Box>
          <Box dashed style={{ padding: 10 }}>
            <span className="hand-alt" style={{ fontSize: 13 }}>✦ AI suggests</span>
            <div className="tiny" style={{ marginTop: 4 }}>You've used the same 6 headshots on 82% of posts. Shoot a fresh batch?</div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}><Btn sm tan>Shot list</Btn><Btn sm>Later</Btn></div>
          </Box>
        </div>
      </div>
    </Box>

    <Anno style={{ alignSelf:'flex-start' }}>↑ select any → "use in post" or "add to template"</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V3 — Library · non-photo types (Video, Audio, Text, Brand)
 * Shows what the OTHER tabs feel like — one screen with 4 stacks.
 * ============================================================ */
function StudioV3_LibraryTypes() {
  return <Desktop active="Studio" url="command.app/studio/library/all">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Library · all media types</span>
      <div className="tiny muted">one screen, side-by-side</div>
    </div>

    {/* VIDEO row */}
    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 15 }}>Video b-roll <span className="tiny muted">· 96 clips · 42 min total</span></span>
        <span className="tiny mono muted">▸ see all</span>
      </div>
      <div className="row" style={{ gap: 6, marginTop: 6 }}>
        {[
          ['tour · 42 Oak', '0:12', 'var(--accent-tan)'],
          ['drive · gilbert', '0:08', 'var(--accent-sage)'],
          ['signing · desk', '0:22', 'var(--accent)'],
          ['walkthrough', '0:34', 'var(--accent-rose)'],
          ['drone · skyline', '0:18', 'var(--accent-tan)'],
          ['talking-head', '0:28', 'var(--accent-sage)'],
        ].map(([l,d,c],i)=>(
          <MediaTile key={i} color={c} label={l} tag={'vid · '+d} vid dur={d} wide style={{ flex:1 }} />
        ))}
      </div>
    </Box>

    {/* AUDIO row */}
    <Box>
      <div className="row between center">
        <span className="serif" style={{ fontSize: 15 }}>Voiceover clips <span className="tiny muted">· 22 files · trained voice model</span></span>
        <span className="tiny mono muted">▸ generate new VO</span>
      </div>
      <div className="col" style={{ gap: 4, marginTop: 6 }}>
        {[
          ['Just-listed intro', '0:08', 'Hey neighbors — you saw the sign go up on Oak yesterday...'],
          ['Sign-off (warm)', '0:04', '...if this home speaks to you, you know where to find me.'],
          ['Open house CTA', '0:06', 'Saturday 2 to 4 at 220 Birch, come hang with us.'],
          ['Market update', '0:14', 'Three things moved in our little Gilbert market this week...'],
        ].map(([t,d,p],i)=>(
          <div key={i} className="row center" style={{ gap: 10, padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
            <div style={{ width: 26, height: 26, borderRadius:'50%', background:'var(--ink)', color:'var(--paper)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>▶</div>
            {/* waveform placeholder */}
            <div style={{ flex:1, height: 22, display:'flex', alignItems:'center', gap: 2 }}>
              {Array.from({length: 60}).map((_,k)=>(
                <div key={k} style={{ flex:1, height: `${8 + Math.abs(Math.sin(k*0.7+i))*14}px`, background: k<20 ? 'var(--accent-tan)' : 'var(--line)' }}/>
              ))}
            </div>
            <span className="tiny mono muted" style={{ width: 36, textAlign:'right' }}>{d}</span>
            <span className="tiny" style={{ width: 220, color:'var(--muted)' }}>"{p}"</span>
            <Btn sm>use</Btn>
          </div>
        ))}
      </div>
    </Box>

    {/* TEXT row */}
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <span className="serif" style={{ fontSize: 15 }}>Text snippets <span className="tiny muted">· 64</span></span>
        <div className="col" style={{ gap: 4, marginTop: 6 }}>
          {[
            ['sign-off', '"see you in the neighborhood, friends."', 42],
            ['bio · short', '"Gilbert agent. Coffee drinker. 8-year local."', 18],
            ['bio · long', '"Dana Park helps families find the home that matches how they actually live...', 9],
            ['CTA · DM', '"DM me and I\'ll send you 3 that match."', 36],
            ['hook · curiosity', '"the one thing most agents in Gilbert aren\'t telling you..."', 12],
          ].map(([k,t,n],i)=>(
            <div key={i} className="row between" style={{ padding:'6px 8px', border:'1px solid var(--line)', background:'#fff' }}>
              <div className="col">
                <span className="tiny mono muted">{k}</span>
                <span className="tiny">{t}</span>
              </div>
              <span className="tiny muted mono">{n}×</span>
            </div>
          ))}
        </div>
      </Box>

      {/* BRAND row */}
      <Box className="grow">
        <span className="serif" style={{ fontSize: 15 }}>Brand <span className="tiny muted">· 46 files</span></span>
        <div className="row" style={{ gap: 10, marginTop: 8 }}>
          <div className="col" style={{ gap: 4 }}>
            <span className="tiny mono muted">LOGO</span>
            <div style={{ width: 90, height: 60, background:'#fff', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Fraunces,serif', fontSize: 14, fontStyle:'italic' }}>Dana Park</div>
            <span className="tiny muted">wordmark · mono</span>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="tiny mono muted">COLORS</span>
            <div className="row" style={{ gap: 4 }}>
              <Swatch color="#3d2e1f" label="ink" />
              <Swatch color="#c9a274" label="tan" />
              <Swatch color="#7a6a54" label="stone" />
              <Swatch color="#c78b7a" label="rose" />
            </div>
          </div>
          <div className="col" style={{ gap: 4 }}>
            <span className="tiny mono muted">TYPE</span>
            <div className="col" style={{ gap: 2 }}>
              <span className="serif" style={{ fontSize: 16 }}>Fraunces · heads</span>
              <span className="tiny" style={{ fontFamily:'system-ui' }}>Inter · body</span>
              <span className="hand-alt" style={{ fontSize: 14 }}>Caveat · accents</span>
            </div>
          </div>
        </div>
      </Box>
    </div>
    <Anno style={{ alignSelf:'flex-end' }}>↑ one shelf, four stacks</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V4 — Add a property (MLS / Zillow paste / upload)
 * ============================================================ */
function StudioV4_PropertyAdd() {
  return <Desktop active="Studio" url="command.app/studio/property/new">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Add a property</span>
      <span className="tiny muted">inspo · not yours · lives under "Properties I love"</span>
    </div>

    <div className="row" style={{ gap: 12 }}>
      {/* input modes */}
      <Box className="grow">
        <div className="serif" style={{ fontSize: 15 }}>1 · How are we pulling it in?</div>
        <div className="col" style={{ gap: 10, marginTop: 8 }}>
          {/* MLS */}
          <div className="col" style={{ gap: 4, padding: 10, border:'1.5px solid var(--accent)', background:'var(--card)' }}>
            <div className="row between"><span className="hand-alt" style={{ fontSize: 14 }}>✦ MLS paste · recommended</span><Chip sm filled>active</Chip></div>
            <div style={{ padding: 8, border:'1px solid var(--line)', background:'#fff', fontFamily:'JetBrains Mono,monospace', fontSize: 11 }}>
              mls.arizona.com/listing/6XXXXXXX
            </div>
            <div className="tiny muted">Auto-fetch: 24 photos · price · beds/baths/sqft · schools · HOA · agent attribution.</div>
          </div>

          {/* Zillow/Redfin */}
          <div className="col" style={{ gap: 4, padding: 10, border:'1px solid var(--line)' }}>
            <span className="serif" style={{ fontSize: 14 }}>Zillow / Redfin / Realtor link</span>
            <div className="row" style={{ gap: 6 }}>
              <Input placeholder="zillow.com/homedetails/..." style={{ flex:1 }} />
              <Btn sm>fetch</Btn>
            </div>
            <div className="tiny muted">Scrapes photos + specs. Auto-attributes listing agent.</div>
          </div>

          {/* Upload */}
          <div className="col" style={{ gap: 4, padding: 10, border:'1px dashed var(--line)' }}>
            <span className="serif" style={{ fontSize: 14 }}>Manual upload</span>
            <div className="row center" style={{ padding: 14, border:'2px dashed var(--line)', background:'var(--paper-2)', justifyContent:'center' }}>
              <span className="tiny muted">⬆ drop photos or drag a folder</span>
            </div>
            <div className="tiny muted">Fill in specs below. Best for pocket listings or inspo from social.</div>
          </div>

          {/* Screenshot */}
          <div className="col" style={{ gap: 4, padding: 10, border:'1px dashed var(--line)' }}>
            <span className="serif" style={{ fontSize: 14 }}>Inspo from social</span>
            <div className="row" style={{ gap: 6 }}>
              <Input placeholder="paste IG/TikTok URL or ⬆ screenshot" style={{ flex:1 }} />
              <Btn sm>parse</Btn>
            </div>
            <div className="tiny muted">AI finds address in caption/on-screen text, pulls MLS if we can match.</div>
          </div>
        </div>
      </Box>

      {/* preview after parse */}
      <Box className="grow" style={{ padding: 12 }}>
        <div className="serif" style={{ fontSize: 15 }}>2 · Preview · 188 Maple Ave, Gilbert</div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1.3, aspectRatio:'4/3', background:'var(--accent-tan)', border:'1px solid var(--line)', position:'relative', backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px)' }}>
            <span style={{ position:'absolute', bottom: 6, left: 6, fontFamily:'Caveat,cursive', fontSize: 14, color:'rgba(0,0,0,0.55)' }}>hero · exterior</span>
          </div>
          <div style={{ flex: 1, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 4 }}>
            {['kitchen','primary','great room','backyard'].map((l,i)=>(
              <div key={i} style={{ aspectRatio:'4/3', background:['var(--accent-sage)','var(--accent-rose)','var(--accent-tan)','var(--accent)'][i], position:'relative', backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 6px, transparent 6px 12px)' }}>
                <span style={{ position:'absolute', bottom: 3, left: 4, fontFamily:'Caveat,cursive', fontSize: 11, color:'rgba(0,0,0,0.55)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* specs */}
        <div className="row" style={{ gap: 6, marginTop: 10 }}>
          {[['$1,195,000','list'],['4','beds'],['3','baths'],['2,840','sqft'],['0.24','acres'],['2004','built']].map(([v,l],i)=>(
            <div key={i} className="col" style={{ flex:1, padding:'6px 8px', border:'1px solid var(--line)', background:'#fff' }}>
              <span className="serif" style={{ fontSize: 14 }}>{v}</span>
              <span className="tiny mono muted">{l}</span>
            </div>
          ))}
        </div>

        {/* attribution */}
        <Box dashed style={{ padding: 10, marginTop: 10 }}>
          <div className="row between center">
            <div className="col">
              <span className="hand-alt" style={{ fontSize: 13 }}>Attribution · required</span>
              <span className="tiny muted">Listed by Jane Orozco · Keller Williams Realty East Valley</span>
            </div>
            <Chip sm filled>auto-pulled</Chip>
          </div>
        </Box>

        <div className="row" style={{ gap: 6, marginTop: 10 }}>
          <Btn sm>save as inspo</Btn>
          <Btn sm tan>create content →</Btn>
        </div>
      </Box>
    </div>

    <Anno style={{ alignSelf:'flex-start' }}>↑ any input → same property object</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V5 — Property detail (SPLIT: left card, right content made)
 * ============================================================ */
function StudioV5_PropertyDetail() {
  return <Desktop active="Studio" url="command.app/studio/property/188-maple">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">PROPERTIES · INSPO</span>
        <span className="serif" style={{ fontSize: 22 }}>188 Maple Ave, Gilbert</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm>loved it</Chip>
        <Btn sm>⌫ remove</Btn>
        <Btn sm tan>+ new post about this</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 12, alignItems:'stretch' }}>
      {/* LEFT — property card */}
      <div className="col" style={{ width: 360, gap: 10 }}>
        <Box style={{ padding: 0, overflow:'hidden' }}>
          {/* hero */}
          <div style={{ aspectRatio:'4/3', background:'var(--accent-tan)', position:'relative', backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px)' }}>
            <span style={{ position:'absolute', bottom: 8, left: 8, fontFamily:'Caveat,cursive', fontSize: 16, color:'rgba(0,0,0,0.55)' }}>exterior · golden hour</span>
            <span className="tiny mono" style={{ position:'absolute', top: 8, right: 8, background:'#fff', padding:'2px 6px', border:'1px solid var(--line)' }}>1 / 24</span>
          </div>
          {/* thumbnail strip */}
          <div className="row" style={{ gap: 3, padding: 5 }}>
            {['kitchen','primary','great rm','back','bath','office'].map((l,i)=>(
              <div key={i} style={{ flex:1, aspectRatio:'1/1', background:['var(--accent-sage)','var(--accent-rose)','var(--accent-tan)','var(--accent)','var(--accent-sage)','var(--accent-rose)'][i], border: i===0?'1.5px solid var(--ink)':'1px solid var(--line)', backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 5px, transparent 5px 10px)' }} />
            ))}
          </div>
          {/* specs */}
          <div style={{ padding: 12, borderTop:'1px solid var(--line)' }}>
            <div className="row between center"><span className="serif" style={{ fontSize: 22 }}>$1,195,000</span><Chip sm>Active</Chip></div>
            <div className="tiny muted mono" style={{ marginTop: 3 }}>MLS 6123456 · DOM 14 · $/sqft 421</div>
            <div className="row wrap" style={{ gap: 6, marginTop: 8 }}>
              {[['4','beds'],['3','baths'],['2,840','sqft'],['0.24','ac'],['2004','yr'],['2-car','gar']].map(([v,l],i)=>(
                <div key={i} className="col" style={{ flex:'0 0 auto', padding:'4px 8px', border:'1px solid var(--line)' }}>
                  <span className="serif" style={{ fontSize: 13 }}>{v}</span>
                  <span className="tiny mono muted">{l}</span>
                </div>
              ))}
            </div>
            <Hr />
            <div className="tiny" style={{ lineHeight: 1.5 }}>Open plan · refinished oak floors · primary on main · oversized lot backs to canal · 4 min to Heritage District.</div>

            <Hr />
            <div className="tiny mono muted">LISTED BY</div>
            <div className="tiny">Jane Orozco · <span className="muted">Keller Williams Realty East Valley</span></div>
            <div className="tiny muted">listed Apr 2 · not my listing</div>
          </div>
        </Box>

        <Box dashed style={{ padding: 10 }}>
          <span className="hand-alt" style={{ fontSize: 13 }}>✦ Why you loved it</span>
          <div className="tiny" style={{ marginTop: 4 }}>"This is the kind of layout my ICA — Gilbert move-up families — asks about constantly. Mid-century lot but updated kitchen. Use as comp when I pitch similar listings."</div>
        </Box>
      </div>

      {/* RIGHT — content made from this property */}
      <div className="col grow" style={{ gap: 10 }}>
        <Box>
          <div className="row between center">
            <span className="serif" style={{ fontSize: 17 }}>Content made from this</span>
            <div className="row" style={{ gap: 4 }}>
              <Chip sm filled>All 7</Chip>
              <Chip sm>Reel 2</Chip>
              <Chip sm>Carousel 2</Chip>
              <Chip sm>Story 2</Chip>
              <Chip sm>Email 1</Chip>
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            {[
              ['Reel · 3-shot tour', 'var(--accent-tan)', '12.4k · 6d', 'vid', '0:18'],
              ['Carousel · 7 slides', 'var(--accent-sage)', '2.1k · 5d', '', ''],
              ['Story · quote card', 'var(--accent-rose)', '8.9k · 4d', '', ''],
              ['Reel · kitchen reveal', 'var(--accent)', '4.4k · 3d', 'vid', '0:09'],
            ].map(([l,c,t,v,d],i)=>(
              <MediaTile key={i} color={c} label={l} tag={t} vid={!!v} dur={d} style={{ flex:1 }} />
            ))}
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <Btn sm>+ new reel</Btn>
            <Btn sm>+ new carousel</Btn>
            <Btn sm>+ new story</Btn>
            <Btn sm tan>start from template ▾</Btn>
          </div>
        </Box>

        {/* recommended templates */}
        <Box>
          <div className="row between center">
            <span className="serif" style={{ fontSize: 15 }}>AI picks for this property</span>
            <span className="tiny muted">based on layout, palette, your voice</span>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            {[
              ['3-shot hook reel','warm mid-century vibe','sage'],
              ['tour carousel · 7 slides','matches $1M+ posts','tan'],
              ['quote story · price reveal','high-CTR for your ICA','rose'],
            ].map(([t,s,c],i)=>(
              <div key={i} className="col grow" style={{ padding: 10, border:'1.5px dashed var(--line)', background:'var(--card)' }}>
                <div className="row between">
                  <span className="serif" style={{ fontSize: 14 }}>{t}</span>
                  <div style={{ width: 10, height: 10, background:`var(--accent-${c})`, borderRadius: '50%' }} />
                </div>
                <span className="tiny muted">{s}</span>
                <Btn sm style={{ marginTop: 6, alignSelf:'flex-start' }}>use →</Btn>
              </div>
            ))}
          </div>
        </Box>

        {/* performance */}
        <Box dashed style={{ padding: 10 }}>
          <div className="row between">
            <span className="hand-alt" style={{ fontSize: 14 }}>Performance · this property's content</span>
            <span className="tiny muted">28k views · 240 saves · 18 DMs · 4 showings booked</span>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            {[['Reach','28k','+44%'],['Saves','240','+22%'],['DMs','18','+180%'],['Showings','4','—']].map(([l,v,d],i)=>(
              <div key={i} className="col grow" style={{ padding: 8, border:'1px solid var(--line)', background:'#fff' }}>
                <span className="tiny mono muted">{l}</span>
                <span className="serif" style={{ fontSize: 18 }}>{v}</span>
                <span className="tiny" style={{ color:'var(--accent-sage)' }}>{d}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>
    </div>

    <Anno style={{ alignSelf:'flex-start' }}>↑ split layout · property on left, everything you made from it on right</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V6 — Attribution options (3 legal-safety treatments side-by-side)
 * ============================================================ */
function StudioV6_Attribution() {
  const options = [
    {
      key: 'subtle',
      title: 'A · Subtle footer credit',
      sub: 'Small credit strip, always on, bottom-safe area.',
      risk: 'Low · widely accepted',
    },
    {
      key: 'banner',
      title: 'B · "Not my listing" banner',
      sub: 'Explicit top banner, forces acknowledgment before export.',
      risk: 'Lowest · belt + suspenders',
    },
    {
      key: 'watermark',
      title: 'C · Corner watermark',
      sub: 'Diagonal stamp in corner — unmissable, stays through crop.',
      risk: 'Low · screenshot-proof',
    },
  ];

  return <Desktop active="Studio" url="command.app/studio/attribution">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Attribution · 3 options</span>
      <span className="tiny muted">Pick a default. Always editable per-post.</span>
    </div>

    {/* 3 preview cards side-by-side showing the SAME story frame with each treatment */}
    <div className="row" style={{ gap: 12 }}>
      {options.map((o,i)=>(
        <Box key={o.key} className="grow" style={{ padding: 12 }}>
          <div className="row between">
            <span className="serif" style={{ fontSize: 15 }}>{o.title}</span>
            <Chip sm>{o.risk}</Chip>
          </div>
          <div className="tiny muted" style={{ marginBottom: 10 }}>{o.sub}</div>

          {/* preview frame — 9:16 story */}
          <div style={{ margin:'0 auto', width: 180, aspectRatio:'9/16', background:'var(--accent-tan)', position:'relative', border:'1px solid var(--line)', overflow:'hidden',
            backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px)' }}>
            {/* sample content */}
            <div style={{ position:'absolute', top: 14, left: 12, right: 12 }}>
              <span className="tiny mono" style={{ color: '#fff', background:'rgba(0,0,0,0.4)', padding:'2px 6px' }}>JUST LISTED · INSPO</span>
            </div>
            <div style={{ position:'absolute', bottom: 120, left: 12, right: 12 }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize: 20, color:'#fff', lineHeight: 1.15 }}>$1.195M</div>
              <div style={{ fontFamily:'Caveat,cursive', fontSize: 16, color:'#fff' }}>188 Maple · Gilbert</div>
            </div>

            {/* attribution treatments */}
            {o.key === 'subtle' && (
              <div style={{ position:'absolute', bottom: 8, left: 8, right: 8, padding:'3px 6px', background:'rgba(255,255,255,0.85)', fontFamily:'JetBrains Mono,monospace', fontSize: 7, color:'var(--ink)', textAlign:'center', borderRadius: 2 }}>
                Listed by Jane Orozco · Keller Williams · Shared by Dana Park
              </div>
            )}
            {o.key === 'banner' && (
              <div style={{ position:'absolute', top: 0, left: 0, right: 0, padding: 4, background:'#fff', fontFamily:'JetBrains Mono,monospace', fontSize: 8, color:'var(--ink)', textAlign:'center', borderBottom:'1px solid var(--ink)' }}>
                NOT MY LISTING · COURTESY OF KW EAST VALLEY
              </div>
            )}
            {o.key === 'watermark' && (
              <div style={{ position:'absolute', top: 30, right: -30, transform:'rotate(24deg)', padding:'3px 30px', background:'rgba(0,0,0,0.65)', color:'#fff', fontFamily:'JetBrains Mono,monospace', fontSize: 8 }}>
                COURTESY LISTING · KW
              </div>
            )}
          </div>

          {/* settings preview */}
          <div className="col" style={{ gap: 3, marginTop: 10, padding: 8, background:'var(--paper-2)' }}>
            <div className="tiny mono muted">SHOWS ON</div>
            <div className="tiny">Reel · Story · Carousel · Email · Flyer</div>
          </div>

          <Btn sm {...(i===0?{tan:true}:{})} style={{ marginTop: 8, width: '100%' }}>{i===0?'make default':'preview'}</Btn>
        </Box>
      ))}
    </div>

    <Box dashed style={{ padding: 10 }}>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ What the app enforces automatically</div>
      <ul className="tiny" style={{ margin: '6px 0 0 18px', lineHeight: 1.6 }}>
        <li>Any property not owned by you ships with attribution baked into the export — can't be removed accidentally.</li>
        <li>Caption auto-prepends "Not my listing — love on this from [agent, brokerage]."</li>
        <li>Export flow shows a final check: ✓ attribution present · ✓ no MLS-protected photos that require gating.</li>
        <li>Brokerage compliance contact gets a cc'd log of every third-party-listing post (opt-in).</li>
      </ul>
    </Box>
    <Anno style={{ alignSelf:'flex-end' }}>↑ you pick one default, override per post if needed</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V7 — Templates gallery (built-in + mine + recreate)
 * ============================================================ */
function StudioV7_Templates() {
  const tabs = ['All 34', 'Mine 12', 'Built-in 16', 'Recreate 6'];
  const [tab, setTab] = React.useState('All 34');

  const tpl = [
    { t:'3-shot hook · reel', fmt:'9:16 reel', len:'0:18', src:'built-in', c:'tan', use:28 },
    { t:'7-slide tour · carousel', fmt:'square', len:'7 slides', src:'built-in', c:'sage', use:22 },
    { t:'just-listed takeover · story', fmt:'9:16 story', len:'0:09', src:'mine', c:'rose', use:14 },
    { t:'price reveal quote', fmt:'9:16 story', len:'0:05', src:'mine', c:'accent', use:41 },
    { t:'before/after reveal', fmt:'9:16 reel', len:'0:12', src:'recreate', c:'tan', use:6 },
    { t:'day-in-the-life agent', fmt:'9:16 reel', len:'0:30', src:'mine', c:'sage', use:9 },
    { t:'neighborhood guide · carousel', fmt:'square', len:'10 slides', src:'built-in', c:'rose', use:18 },
    { t:'5 things in 30 seconds', fmt:'9:16 reel', len:'0:30', src:'built-in', c:'accent', use:12 },
  ];

  return <Desktop active="Studio" url="command.app/studio/templates">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Templates</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>⬆ upload (Canva/Gamma/PDF)</Btn>
        <Btn sm>paste URL · scrape</Btn>
        <Btn sm tan>✦ AI new from prompt</Btn>
      </div>
    </div>

    <Box style={{ padding: 0 }}>
      <div className="row" style={{ borderBottom:'1px solid var(--line)' }}>
        {tabs.map(t => (
          <button key={t} onClick={()=>setTab(t)}
            style={{ padding:'10px 14px', border:'none', background:'none', borderBottom: tab===t?'2px solid var(--ink)':'2px solid transparent', cursor:'pointer', fontFamily:'inherit', fontSize: 13, color: tab===t ? 'var(--ink)':'var(--muted)', fontWeight: tab===t?600:400 }}>{t}</button>
        ))}
        <div style={{ flex:1 }} />
        <div className="row center" style={{ padding:'0 10px', gap: 8 }}>
          <span className="tiny mono muted">format:</span>
          <Chip sm>reel</Chip><Chip sm>story</Chip><Chip sm>carousel</Chip><Chip sm>email</Chip>
        </div>
      </div>

      <div style={{ padding: 12, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
        {tpl.map((t,i)=>(
          <div key={i} className="col" style={{ gap: 4, background:'#fff', border:'1px solid var(--line)', padding: 8, boxShadow:'1.5px 2px 0 var(--line)' }}>
            <div style={{ aspectRatio: t.fmt.includes('square') ? '1/1' : '9/16', background:`var(--accent-${t.c})`, backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px)', position:'relative' }}>
              <span className="tiny mono" style={{ position:'absolute', top: 4, left: 4, background:'rgba(0,0,0,0.4)', color:'#fff', padding:'1px 5px', fontSize: 9 }}>{t.fmt}</span>
              <span className="tiny mono" style={{ position:'absolute', top: 4, right: 4, background:'#fff', padding:'1px 5px', fontSize: 9 }}>{t.len}</span>
              <span style={{ position:'absolute', bottom: 6, left: 6, right: 6, fontFamily:'Caveat,cursive', fontSize: 13, color:'rgba(0,0,0,0.55)' }}>{t.t}</span>
            </div>
            <div className="row between">
              <Chip sm>{t.src}</Chip>
              <span className="tiny mono muted">{t.use}× used</span>
            </div>
          </div>
        ))}

        {/* "recreate this" upload card — the inspo-to-template capability */}
        <div className="col" style={{ gap: 4, padding: 12, border:'1.5px dashed var(--accent)', background:'var(--card)', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontFamily:'Caveat,cursive', fontSize: 22, color:'var(--accent)' }}>✦ Recreate this</span>
          <span className="tiny muted" style={{ textAlign:'center' }}>Paste an inspo link or drop a screenshot. We'll reverse-engineer the structure and remake it with your property + b-roll.</span>
          <Btn sm tan style={{ marginTop: 6 }}>paste or drop →</Btn>
        </div>
      </div>
    </Box>

    {/* AI generate from prompt */}
    <Box dashed>
      <div className="row between">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ AI-generate from a style prompt</span>
        <span className="tiny muted">trains on your voice + palette + past winners</span>
      </div>
      <div className="row" style={{ gap: 6, marginTop: 6 }}>
        <Input placeholder='"editorial carousel with slow zooms, one stat per slide, ends on DM CTA"' style={{ flex: 1 }} />
        <Btn sm tan>generate 3 variants →</Btn>
      </div>
    </Box>

    <Anno style={{ alignSelf:'flex-end' }}>↑ built-in + mine + recreate + AI all live here</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V8 — Recreate-this flow (inspo → parsed structure → my property)
 * ============================================================ */
function StudioV8_Recreate() {
  return <Desktop active="Studio" url="command.app/studio/templates/recreate">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Recreate this · inspo → template</span>
      <span className="tiny muted">3 steps: input → parse → fill</span>
    </div>

    <div className="row" style={{ gap: 12, alignItems:'stretch' }}>
      {/* 1 — INPUT */}
      <Box className="grow" style={{ padding: 12 }}>
        <div className="tiny mono muted">STEP 1</div>
        <div className="serif" style={{ fontSize: 16 }}>Drop the inspo</div>
        <div className="row center" style={{ padding: 12, border:'2px dashed var(--line)', background:'var(--paper-2)', marginTop: 8, justifyContent:'center', flexDirection:'column', gap: 6 }}>
          <span className="tiny muted">IG / TikTok URL · screenshot · MP4 · link to Canva</span>
          <div style={{ width:120, aspectRatio:'9/16', background:'var(--accent-rose)', backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 6px, transparent 6px 12px)', position:'relative' }}>
            <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(0,0,0,0.55)', fontFamily:'Caveat,cursive', fontSize: 12 }}>erinandream · reel 042</span>
          </div>
        </div>
      </Box>

      {/* 2 — PARSED */}
      <Box className="grow" style={{ padding: 12 }}>
        <div className="tiny mono muted">STEP 2</div>
        <div className="serif" style={{ fontSize: 16 }}>AI parses structure</div>
        <div className="col" style={{ gap: 3, marginTop: 8 }}>
          {[
            ['0:00 – 0:02', 'hook · on-screen text reveal', 'sans bold 64pt'],
            ['0:02 – 0:06', 'clip · slow zoom exterior', 'warm tone + jazz'],
            ['0:06 – 0:10', 'clip · kitchen pan', 'cut on the beat'],
            ['0:10 – 0:14', 'clip · primary bed reveal', 'soft dissolve'],
            ['0:14 – 0:18', 'price card + address', 'serif italic'],
            ['caption', 'question hook → 3-line list → DM CTA', '—'],
          ].map(([a,b,c],i)=>(
            <div key={i} className="row between" style={{ padding:'5px 8px', background: i%2?'var(--paper-2)':'#fff', border:'1px solid var(--line)' }}>
              <span className="tiny mono muted" style={{ width: 84 }}>{a}</span>
              <span className="tiny" style={{ flex: 1 }}>{b}</span>
              <span className="tiny muted" style={{ width: 120, textAlign:'right' }}>{c}</span>
            </div>
          ))}
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>Detected: 3-shot format · 0:18 · warm grade · serif price card · question hook caption.</div>
      </Box>

      {/* 3 — FILL */}
      <Box className="grow" style={{ padding: 12 }}>
        <div className="tiny mono muted">STEP 3</div>
        <div className="serif" style={{ fontSize: 16 }}>Fill with your property</div>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          <div className="row between" style={{ padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
            <span className="tiny mono muted">property</span>
            <Chip sm filled>188 Maple</Chip>
          </div>
          <div className="row between" style={{ padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
            <span className="tiny mono muted">hook text</span>
            <span className="tiny">"a house worth knowing about" ✎</span>
          </div>
          <div className="row between" style={{ padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
            <span className="tiny mono muted">clips</span>
            <Chip sm>auto-pick 3</Chip>
          </div>
          <div className="row between" style={{ padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
            <span className="tiny mono muted">voice / style</span>
            <span className="tiny">Dana · warm editorial</span>
          </div>
          <div className="row between" style={{ padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
            <span className="tiny mono muted">attribution</span>
            <span className="tiny">subtle footer · KW East Valley</span>
          </div>
        </div>
        <Btn sm tan style={{ marginTop: 10, width:'100%' }}>open in composer →</Btn>
      </Box>
    </div>

    <Anno style={{ alignSelf:'flex-end' }}>↑ inspo never stays inspo — it becomes a reusable template</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V9 — Composer (hybrid editor: arrange + preview + handoff)
 * ============================================================ */
function StudioV9_Composer() {
  return <Desktop active="Studio" url="command.app/studio/composer/r-188m-01">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">DRAFT · REEL · 188 MAPLE · 3-SHOT HOOK</span>
        <span className="serif" style={{ fontSize: 18 }}>Composer</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <span className="tiny mono muted">auto-saved 12s ago</span>
        <Btn sm>preview</Btn>
        <Btn sm>export ▾</Btn>
        <Btn sm tan>publish · schedule</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 12, alignItems:'stretch' }}>
      {/* LEFT — media rail (your library + property photos) */}
      <Box style={{ width: 200, padding: 8 }}>
        <div className="tiny mono muted">MEDIA</div>
        <div className="row" style={{ gap: 4, marginTop: 6 }}>
          <Chip sm filled>property</Chip>
          <Chip sm>you</Chip>
          <Chip sm>brand</Chip>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 4, marginTop: 8 }}>
          {['exterior','kitchen','primary','great rm','back','bath','office','detail'].map((l,i)=>(
            <div key={i} style={{ aspectRatio:'1/1', background:['var(--accent-tan)','var(--accent-sage)','var(--accent-rose)','var(--accent)','var(--accent-tan)','var(--accent-sage)','var(--accent-rose)','var(--accent)'][i], backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 5px, transparent 5px 10px)', border:'1px solid var(--line)', position:'relative' }}>
              <span style={{ position:'absolute', bottom: 2, left: 3, fontFamily:'Caveat,cursive', fontSize: 9, color:'rgba(0,0,0,0.55)' }}>{l}</span>
            </div>
          ))}
        </div>
        <Hr />
        <div className="tiny mono muted">TEMPLATE</div>
        <div className="tiny" style={{ marginTop: 4 }}>3-shot hook reel · 0:18</div>
        <div className="tiny muted">warm grade · serif price card</div>
        <Btn sm style={{ marginTop: 8, width:'100%' }}>swap template</Btn>
      </Box>

      {/* CENTER — canvas + timeline */}
      <div className="col grow" style={{ gap: 8 }}>
        {/* canvas */}
        <Box style={{ padding: 14, background:'var(--paper-2)', display:'flex', justifyContent:'center' }}>
          <div style={{ width: 220, aspectRatio:'9/16', background:'var(--accent-tan)', position:'relative', border:'1px solid var(--line)', backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 8px, transparent 8px 16px)' }}>
            {/* shot 2 preview */}
            <div style={{ position:'absolute', bottom: 12, left: 12, right: 12 }}>
              <div style={{ fontFamily:'Fraunces,serif', fontSize: 22, color:'#fff', letterSpacing:'-0.01em', lineHeight: 1.1 }}>$1,195,000</div>
              <div style={{ fontFamily:'Caveat,cursive', fontSize: 18, color:'#fff' }}>188 Maple · Gilbert</div>
            </div>
            <div style={{ position:'absolute', top: 0, left: 0, right: 0, padding: 4, background:'#fff', fontFamily:'JetBrains Mono,monospace', fontSize: 7, color:'var(--ink)', textAlign:'center', borderBottom:'1px solid var(--ink)' }}>
              NOT MY LISTING · COURTESY OF KW EAST VALLEY
            </div>
            {/* scrubber */}
            <div style={{ position:'absolute', bottom: -1, left: 0, width: '62%', height: 3, background:'var(--accent-sage)' }} />
          </div>
        </Box>

        {/* timeline */}
        <Box style={{ padding: 10 }}>
          <div className="row between center">
            <span className="tiny mono muted">TIMELINE · 0:11 / 0:18</span>
            <div className="row" style={{ gap: 4 }}>
              <Btn sm>◀</Btn><Btn sm>▶</Btn><Btn sm>▶▶</Btn>
            </div>
          </div>
          <div className="row" style={{ gap: 3, marginTop: 6, height: 46, alignItems:'stretch' }}>
            {[
              ['0:00', 'hook · text', 'var(--accent-rose)', 20],
              ['0:02', 'exterior · zoom', 'var(--accent-tan)', 25],
              ['0:06', 'kitchen · pan', 'var(--accent-sage)', 25],
              ['0:11', 'primary · reveal', 'var(--accent)', 20],
              ['0:15', 'price card', 'var(--accent-rose)', 10],
            ].map(([a,b,c,w],i)=>(
              <div key={i} style={{ flex: w, border: i===2?'2px solid var(--ink)':'1px solid var(--line)', background: c, padding:'3px 5px', display:'flex', flexDirection:'column', justifyContent:'space-between', fontSize: 10 }}>
                <span className="mono" style={{ fontSize: 9 }}>{a}</span>
                <span className="hand-alt" style={{ fontSize: 11 }}>{b}</span>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 3, marginTop: 4, height: 22 }}>
            <div style={{ flex: 100, background:'#fff', border:'1px solid var(--line)', padding:'2px 6px', fontSize: 10 }}>
              <span className="tiny mono muted">AUDIO · </span>
              <span className="hand-alt" style={{ fontSize: 12 }}>warm-jazz-02.wav · VO: "a house worth knowing about..."</span>
            </div>
          </div>
        </Box>
      </div>

      {/* RIGHT — inspector */}
      <Box style={{ width: 230, padding: 10 }}>
        <div className="tiny mono muted">SHOT · KITCHEN · PAN</div>
        <div className="col" style={{ gap: 8, marginTop: 8 }}>
          <div className="col" style={{ gap: 3 }}>
            <span className="tiny mono muted">media</span>
            <div className="row between" style={{ padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
              <span className="tiny">kitchen · 188 Maple</span>
              <span className="tiny muted">swap</span>
            </div>
          </div>
          <div className="col" style={{ gap: 3 }}>
            <span className="tiny mono muted">duration</span>
            <Input value="4.0s" onChange={()=>{}} style={{ fontSize: 12 }} />
          </div>
          <div className="col" style={{ gap: 3 }}>
            <span className="tiny mono muted">motion</span>
            <div className="row" style={{ gap: 3 }}>
              <Chip sm>none</Chip><Chip sm filled>pan ←</Chip><Chip sm>zoom</Chip>
            </div>
          </div>
          <div className="col" style={{ gap: 3 }}>
            <span className="tiny mono muted">grade</span>
            <div className="row" style={{ gap: 3 }}>
              <Chip sm filled>warm</Chip><Chip sm>neutral</Chip><Chip sm>moody</Chip>
            </div>
          </div>
          <Hr />
          <div className="tiny mono muted">CAPTION</div>
          <div style={{ padding: 6, border:'1px solid var(--line)', background:'#fff', fontSize: 11, lineHeight: 1.4 }}>
            a house worth knowing about in Gilbert —<br/>
            4bd · mid-century lot · walk to Heritage<br/>
            DM if you want to see it before Sunday ↓
          </div>
          <Btn sm>AI rewrite in voice</Btn>
          <Hr />
          <div className="tiny mono muted">HANDOFF</div>
          <div className="row" style={{ gap: 4 }}>
            <Btn sm>→ Remotion</Btn>
            <Btn sm>→ Canva</Btn>
            <Btn sm>→ Gamma</Btn>
          </div>
        </div>
      </Box>
    </div>

    <Anno style={{ alignSelf:'flex-start' }}>↑ arrange + write in-app · export to motion tool for polish</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V10 — Batch / Calendar (one property → 7 posts)
 * ============================================================ */
function StudioV10_Batch() {
  const posts = [
    ['Mon', 'Reel · hook + exterior', 'Instagram', '9:16', 'var(--accent-tan)', 'scheduled'],
    ['Mon', 'Story · "just found this one"', 'Instagram', '9:16', 'var(--accent-rose)', 'scheduled'],
    ['Tue', 'Carousel · 7 slide tour', 'Instagram', 'square', 'var(--accent-sage)', 'draft'],
    ['Wed', 'Reel · kitchen reveal', 'TikTok', '9:16', 'var(--accent)', 'draft'],
    ['Thu', 'Email · houses worth knowing', 'Gmail', '—', 'var(--accent-tan)', 'AI draft'],
    ['Fri', 'Story · price reveal', 'Instagram', '9:16', 'var(--accent-rose)', 'draft'],
    ['Sun', 'Post · comp breakdown', 'LinkedIn', 'square', 'var(--accent-sage)', 'draft'],
    ['Tue', 'Pin · kitchen styling · 2:3', 'Pinterest', '2/3', 'var(--accent-tan)', 'AI draft'],
    ['Thu', 'Pin · before/after reno', 'Pinterest', '2/3', 'var(--accent-sage)', 'AI draft'],
    ['Sat', 'Idea Pin · 5 staging tips', 'Pinterest', '9:16', 'var(--accent-rose)', 'draft'],
  ];

  return <Desktop active="Studio" url="command.app/studio/batch/188-maple">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">ONE PROPERTY · SEVEN POSTS · WEEK OF APR 20</span>
        <span className="serif" style={{ fontSize: 22 }}>Batch · 188 Maple Ave</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>shuffle clips</Btn>
        <Btn sm>regenerate captions</Btn>
        <Btn sm tan>queue all to schedule</Btn>
      </div>
    </div>

    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ Auto-built from this property · 7 templates auto-matched to your pillars</div>
      <div className="tiny muted" style={{ marginTop: 3 }}>Market Intel · 2 · Lifestyle · 3 · Listings · 2 · every post attributed to KW East Valley.</div>
    </Box>

    {/* calendar grid */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap: 8 }}>
      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
        <div key={d} className="tiny mono muted" style={{ textAlign:'center' }}>{d}</div>
      ))}
      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day => {
        const dayPosts = posts.filter(p => p[0] === day);
        return (
          <div key={day} className="col" style={{ gap: 5, minHeight: 160, padding: 4, border:'1px dashed var(--line)', background:'var(--paper-2)' }}>
            {dayPosts.map((p,i)=>(
              <div key={i} className="col" style={{ gap: 2, padding: 5, background:'#fff', border:'1px solid var(--line)', boxShadow:'1px 1.5px 0 var(--line)' }}>
                <div style={{ aspectRatio: p[3]==='square'?'1/1':'9/16', background: p[4], backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 5px, transparent 5px 10px)', position:'relative' }}>
                  <span className="tiny mono" style={{ position:'absolute', top: 3, left: 3, background:'rgba(0,0,0,0.4)', color:'#fff', padding:'0 4px', fontSize: 8 }}>{p[3]}</span>
                </div>
                <span className="tiny" style={{ fontSize: 10, lineHeight: 1.15 }}>{p[1]}</span>
                <div className="row between">
                  <span className="tiny mono muted" style={{ fontSize: 8 }}>{p[2]}</span>
                  <span className="tiny mono" style={{ fontSize: 8, color: p[5]==='scheduled'?'var(--accent-sage)':'var(--accent-tan)' }}>{p[5]}</span>
                </div>
              </div>
            ))}
            {dayPosts.length === 0 && <span className="tiny muted" style={{ textAlign:'center', marginTop: 20 }}>+</span>}
          </div>
        );
      })}
    </div>

    {/* AI suggestions */}
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow" dashed>
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ AI suggests for this property</span>
        <ul className="tiny" style={{ margin:'4px 0 0 18px', lineHeight: 1.6 }}>
          <li>Lead with kitchen reveal (your top-performing hook for $1M+).</li>
          <li>Pair VO from your "warm sign-off" bank — 38% higher save rate.</li>
          <li>Schedule Mon 7:42am — 3× engagement vs random posting times.</li>
          <li>Email sends Thu 9am — highest open rate for your list.</li>
        </ul>
      </Box>
      <Box className="grow">
        <span className="serif" style={{ fontSize: 14 }}>Estimated reach</span>
        <div className="row" style={{ gap: 8, marginTop: 6 }}>
          {[['IG','18k'],['TikTok','4k'],['Pinterest','9k'],['Email','1.2k'],['LinkedIn','600']].map(([p,r],i)=>(
            <div key={i} className="col grow" style={{ padding: 6, border:'1px solid var(--line)', background:'#fff' }}>
              <span className="tiny mono muted">{p}</span>
              <span className="serif" style={{ fontSize: 16 }}>{r}</span>
            </div>
          ))}
        </div>
      </Box>
    </div>
    <Anno style={{ alignSelf:'flex-end' }}>↑ one property becomes a week of content in 20 minutes</Anno>
  </Desktop>;
}


/* ============================================================
 * STUDIO · V11 — Pinterest channel (visual search · evergreen · seller intent)
 * ============================================================ */
function StudioV11_Pinterest() {
  const boards = [
    ['Oak Park homes',            'your listings + sold',         '47 pins',  '+2 this wk',  'var(--accent-sage)'],
    ['Kitchens I love · AZ',       'editorial · sourced',           '128 pins', '+6',          'var(--accent-tan)'],
    ['Before · After · real remodels', 'case studies',              '34 pins',  '+1',          'var(--accent-rose)'],
    ['First-time buyer · tips',    'educational · link pins',       '22 pins',  '—',           'var(--ink)'],
    ['Desert landscaping',         'lifestyle · evergreen',          '41 pins', '+3',          'var(--accent-sage)'],
    ['Stage it · small rooms',     'styling playbook',               '19 pins', '+2',          'var(--accent-tan)'],
  ];
  const pins = [
    ['47 Oak · kitchen',    'matte island · warm wood',  '2,847 impr · 38 saves',  '12 outbound',  'var(--accent-tan)',   'live · 3d'],
    ['47 Oak · before/after bath',  '2010 vs today',       '1,412 impr · 29 saves',  '8',            'var(--accent-sage)',  'live · 3d'],
    ['Oak Park · how much $?',  'infographic · $689k avg',  '4,210 impr · 72 saves',  '34',            'var(--accent-rose)',  'live · 18d'],
    ['5 staging tips · small BR',  'idea pin · 5 slides',  '8,110 impr · 211 saves', '52',            'var(--accent-sage)',  'live · 46d'],
    ['Desert front yard · low water',  'idea pin',             '11,402 impr · 318 saves','88',            'var(--accent-tan)',   'evergreen · 112d'],
    ['188 Maple · listed $649k',  'hero shot',              '624 impr · 12 saves',    '4',            'var(--accent-rose)',  'live · 1d'],
  ];

  return <Desktop active="Studio" url="command.app/studio/pinterest">
    <div className="row between center">
      <div className="col">
        <span className="tiny mono muted">STUDIO · CHANNEL · PINTEREST</span>
        <span className="serif" style={{ fontSize: 22 }}>The evergreen channel</span>
        <span className="tiny muted">Pins compound. A strong pin from 6 months ago is still sending traffic today — different math than IG/TikTok.</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>connect Tailwind</Btn>
        <Btn sm>new board</Btn>
        <Btn sm tan>+ new pin</Btn>
      </div>
    </div>

    {/* why pinterest is different */}
    <Box tan>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ Why this is its own surface (not just "another social")</div>
      <div className="row" style={{ gap: 10, marginTop: 6, flexWrap:'wrap' }}>
        {[
          ['Visual search',      '87% of pinners search before buying a home'],
          ['Long lead',          'median: 4mo from save → action. This is seller-nurture fuel.'],
          ['Evergreen',          'pins live for 6–12mo. IG posts = 48hr.'],
          ['Outbound clicks',    'link pins drive to your microsite & listings. IG can\'t do that.'],
          ['Women 25–54',         '76% of users · matches your seller demo perfectly'],
        ].map(([t,d],i)=>(
          <Box key={i} className="grow" style={{ minWidth: 160, padding: 10 }}>
            <div className="hand-alt tiny">{t}</div>
            <div className="tiny" style={{ marginTop: 3 }}>{d}</div>
          </Box>
        ))}
      </div>
    </Box>

    <div className="row" style={{ gap: 14, alignItems:'flex-start' }}>
      {/* Left · boards */}
      <Box className="grow" style={{ flexBasis: 340 }}>
        <div className="row between center">
          <span className="hand-alt" style={{ fontSize: 14 }}>YOUR BOARDS · 6</span>
          <Chip sm>sort · performance</Chip>
        </div>
        <div className="col" style={{ gap: 6, marginTop: 8 }}>
          {boards.map((b,i)=>(
            <div key={i} className="row between" style={{ padding: 8, background:'#fff', border:'1px solid var(--line)' }}>
              <div className="col">
                <span style={{ fontSize: 13, fontWeight: 600 }}>{b[0]}</span>
                <span className="tiny muted">{b[1]}</span>
              </div>
              <div className="col" style={{ alignItems:'flex-end' }}>
                <span className="tiny mono">{b[2]}</span>
                <span className="tiny mono muted" style={{ color: b[3].includes('+') ? 'var(--accent-sage)' : 'var(--muted)' }}>{b[3]}</span>
              </div>
              <div style={{ width: 4, height: 36, background: b[4], marginLeft: 8 }} />
            </div>
          ))}
        </div>
      </Box>

      {/* Right · pin performance grid */}
      <div className="col grow" style={{ flexBasis: 520, gap: 10 }}>
        <div className="row between center">
          <span className="hand-alt" style={{ fontSize: 14 }}>RECENT PINS · 90 DAYS</span>
          <div className="row" style={{ gap: 4 }}>
            <Chip sm filled>all</Chip>
            <Chip sm>image</Chip>
            <Chip sm>idea pin</Chip>
            <Chip sm>link pin</Chip>
            <Chip sm>evergreen only</Chip>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10 }}>
          {pins.map((p,i)=>(
            <div key={i} className="col" style={{ gap: 4, padding: 6, background:'#fff', border:'1px solid var(--line)', boxShadow:'1px 1.5px 0 var(--line)' }}>
              <div style={{ aspectRatio:'2/3', background: p[4], backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 6px, transparent 6px 12px)', position:'relative', display:'flex', alignItems:'flex-end', padding: 6 }}>
                <span style={{ fontFamily:'Caveat,cursive', fontSize: 12, color:'rgba(0,0,0,0.55)' }}>{p[0]}</span>
                <span className="tiny mono" style={{ position:'absolute', top: 4, right: 4, background:'rgba(0,0,0,0.6)', color:'#fff', padding:'1px 5px', fontSize: 8 }}>{p[5]}</span>
              </div>
              <div className="col" style={{ gap: 1, padding: '2px 2px' }}>
                <span className="tiny" style={{ fontSize: 11 }}>{p[1]}</span>
                <span className="tiny mono muted" style={{ fontSize: 9 }}>{p[2]}</span>
                <span className="tiny mono" style={{ fontSize: 9, color:'var(--accent-sage)' }}>→ {p[3]} outbound clicks</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Pin composer preview */}
    <div className="row" style={{ gap: 14 }}>
      <Box className="grow">
        <span className="hand-alt" style={{ fontSize: 14 }}>✦ AI Pin composer · from a listing photo</span>
        <div className="row" style={{ gap: 10, marginTop: 8, alignItems:'flex-start' }}>
          <div style={{ width: 120 }}>
            <div style={{ aspectRatio:'2/3', background:'var(--accent-tan)', backgroundImage:'repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0 6px, transparent 6px 12px)', border:'1px solid var(--line)', position:'relative', padding: 8, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
              <div className="tiny mono" style={{ background:'rgba(0,0,0,0.7)', color:'#fff', padding:'2px 5px', alignSelf:'flex-start', fontSize: 8 }}>TIP</div>
              <div style={{ fontFamily:'Caveat, cursive', fontSize: 18, color:'#fff', textShadow:'1px 1px 2px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>5 kitchens that add<br/>$18k to resale</div>
              <div className="tiny mono" style={{ color:'#fff', fontSize: 8 }}>danamartinez.com →</div>
            </div>
            <span className="tiny mono muted" style={{ fontSize: 9 }}>2:3 · 1000×1500</span>
          </div>
          <div className="col grow" style={{ gap: 6 }}>
            <div className="tiny mono muted">TITLE (100ch · keyword-first)</div>
            <Box dashed style={{ padding:'6px 8px', fontSize: 12 }}>5 Kitchen Upgrades That Add $18k to Oak Park Home Resale</Box>
            <div className="tiny mono muted">DESCRIPTION (500ch · natural + tags)</div>
            <Box dashed style={{ padding:'6px 8px', fontSize: 11, lineHeight: 1.5 }}>Thinking of selling in Oak Park AZ? These 5 kitchen changes consistently returned $15k–$22k in 2025. Real comps from 47 local sales this year. #oakparkaz #sellingyourhome #kitchenremodel #homevalue</Box>
            <div className="tiny mono muted">LINK (→ your site)</div>
            <Box dashed style={{ padding:'6px 8px', fontSize: 11, fontFamily:'JetBrains Mono,monospace' }}>homevalue.danamartinez.com/kitchen-roi</Box>
            <div className="row" style={{ gap: 6, marginTop: 4 }}>
              <Chip sm sage>auto-alt-text ✓</Chip>
              <Chip sm sage>UTM attached</Chip>
              <Chip sm>make 4 variants</Chip>
            </div>
          </div>
        </div>
      </Box>

      <Box style={{ width: 260 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>✦ Pinterest strategy · AI-tuned to Dana</div>
        <ul className="tiny" style={{ margin:'6px 0 0 16px', lineHeight: 1.7 }}>
          <li>Pillar 1: <b>Oak Park listings</b> — 1 pin per property, 4 variants, 2 boards each.</li>
          <li>Pillar 2: <b>"$ADDED" infographics</b> — highest-converting format for seller leads.</li>
          <li>Pillar 3: <b>Idea pins · 5-slide tips</b> — compound saves best.</li>
          <li>Link every pin to <code>homevalue.danamartinez.com/{'{slug}'}</code>. Seller funnel.</li>
          <li>Post 3×/wk. Tailwind queue. Weekends: idea pins; weekdays: listings.</li>
          <li>Season: refresh "desert landscaping" every April. Re-pin the winners.</li>
        </ul>
        <Hr />
        <div className="tiny mono muted">90d impact</div>
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          <div className="col grow" style={{ padding: 6, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
            <span className="tiny mono muted">outbound</span>
            <span className="serif" style={{ fontSize: 18 }}>312</span>
          </div>
          <div className="col grow" style={{ padding: 6, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
            <span className="tiny mono muted">form fills</span>
            <span className="serif" style={{ fontSize: 18 }}>28</span>
          </div>
          <div className="col grow" style={{ padding: 6, background:'var(--paper-2)', border:'1px solid var(--line)' }}>
            <span className="tiny mono muted">listings</span>
            <span className="serif" style={{ fontSize: 18 }}>2</span>
          </div>
        </div>
      </Box>
    </div>

    <Anno style={{ alignSelf:'flex-end' }}>↑ Pinterest runs on a 6-month timeline · seed it now, harvest all year</Anno>
  </Desktop>;
}


/* ============================================================
 * Register
 * ============================================================ */
window.StudioScreens = [
  { id:'studio1', label:'V1 · Studio home', caption:'Library + Properties + Templates at a glance. Quick-start entry points.', Component: StudioV1_Home },
  { id:'studio2', label:'V2 · Library · photos', caption:'By media type (photos active). Tag filter. Sessions rail. "AI suggests shoot".', Component: StudioV2_Library },
  { id:'studio3', label:'V3 · Library · video + audio + text + brand', caption:'One screen with all four stacks. Waveforms, logos, color, type.', Component: StudioV3_LibraryTypes },
  { id:'studio4', label:'V4 · Add a property', caption:'MLS / Zillow / upload / inspo-screenshot → preview with attribution.', Component: StudioV4_PropertyAdd },
  { id:'studio5', label:'V5 · Property detail (split)', caption:'Left: property card. Right: every piece of content you made from it + AI template picks.', Component: StudioV5_PropertyDetail },
  { id:'studio6', label:'V6 · Attribution · 3 options', caption:'Subtle footer · "Not my listing" banner · Corner watermark — pick a default.', Component: StudioV6_Attribution },
  { id:'studio7', label:'V7 · Templates gallery', caption:'Built-in + mine + recreate + AI-from-prompt. Upload Canva/Gamma. Format filter.', Component: StudioV7_Templates },
  { id:'studio8', label:'V8 · Recreate-this flow', caption:'3 steps: drop inspo → AI parses shot list + caption structure → fill with property.', Component: StudioV8_Recreate },
  { id:'studio9', label:'V9 · Composer (hybrid)', caption:'Media rail + canvas + timeline + inspector. Handoff to Remotion/Canva/Gamma.', Component: StudioV9_Composer },
  { id:'studio10', label:'V10 · Batch · 1 property → 7 posts', caption:'Week calendar auto-filled. Reach estimate. AI tuning per pillar.', Component: StudioV10_Batch },
  { id:'studio11', label:'V11 · Pinterest channel', caption:'Boards + pin performance + AI pin composer · evergreen seller-intent channel in its own right.', Component: StudioV11_Pinterest },
];

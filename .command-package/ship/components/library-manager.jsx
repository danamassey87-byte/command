// ============================================================
// LIBRARY MANAGER — editable CRUD for everything:
// ICA (multiple), Pillars, Templates, Scripts, Voice, Areas, Tags
// ============================================================

// ICA · several, switchable, editable
function LibV1_ICAList() {
  const icas = [
    { name:'First-time buyers · Oak Park', age:'28–38', income:'$120–180k', tag:'sage', active:true, pieces: 34 },
    { name:'Move-up · growing family', age:'34–46', income:'$180–280k', tag:'tan', active:true, pieces: 22 },
    { name:'Downsizers · empty-nesters', age:'55–68', income:'$250k+', tag:'rose', active:true, pieces: 14 },
    { name:'Investor · small multi-family', age:'35–60', income:'cash buyer', tag:'', active:false, pieces: 8 },
    { name:'Luxury · $2M+ Oak Park', age:'42–60', income:'$500k+', tag:'tan', active:false, pieces: 0 },
  ];
  return <Desktop active="Library" url="command.app/library/ica">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Library · Ideal client avatars</div>
        <span className="serif" style={{ fontSize: 22 }}>ICAs <span className="tiny muted">· 5 defined · 3 active</span></span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>↓ duplicate from template</Btn>
        <Btn sm primary>+ new ICA</Btn>
      </div>
    </div>

    <Box dashed>
      <div className="tiny"><b>How this works.</b> You can run multiple ICAs at once. Every piece of content, email, and campaign gets <i>tagged</i> with one (or more). Generation pulls from the ICA you pick; analytics rolls up by ICA so you can see which audience actually engages.</div>
    </Box>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap: 10 }}>
      {icas.map((ica, i)=>(
        <Box key={i} style={{ position:'relative' }}>
          <div className="row between center">
            <div>
              <Chip sm className={ica.tag}>{ica.name}</Chip>
              <div className="tiny muted" style={{ marginTop: 4 }}>age {ica.age} · HHI {ica.income}</div>
            </div>
            <Chip sm className={ica.active?'sage':''}>{ica.active ? '● active' : '○ archived'}</Chip>
          </div>
          <Hr />
          <div className="row between tiny mono muted">
            <span>{ica.pieces} content pieces linked</span>
            <span>{i===0?'Apr 12 edited':i===1?'Apr 3 edited':'Jan 18 edited'}</span>
          </div>
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            <Btn sm>edit →</Btn>
            <Btn sm ghost>duplicate</Btn>
            <Btn sm ghost>{ica.active?'archive':'reactivate'}</Btn>
          </div>
        </Box>
      ))}
      {/* New card */}
      <Box dashed style={{ textAlign:'center', padding:'24px 16px' }}>
        <div className="hand-alt" style={{ fontSize: 16 }}>+ new ICA</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>start blank · copy existing · or let AI draft one from your past content</div>
        <div className="row center" style={{ gap: 6, marginTop: 8, justifyContent:'center' }}>
          <Btn sm>blank</Btn>
          <Btn sm>from template</Btn>
          <Btn sm primary>✦ AI draft</Btn>
        </div>
      </Box>
    </div>
  </Desktop>;
}

// ICA editor — full CRUD form
function LibV2_ICAEditor() {
  return <Desktop active="Library" url="command.app/library/ica/oak-park-first-timers">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← ICAs · First-time buyers · Oak Park</div>
        <span className="serif" style={{ fontSize: 22 }}>Edit ICA</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>preview generated sample</Btn>
        <Btn sm>duplicate</Btn>
        <Btn sm ghost>archive</Btn>
        <Btn sm primary>save</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">Identity</div>
        <Hr />
        <div className="tiny mono muted">NAME</div>
        <Input value="First-time buyers · Oak Park" />
        <div className="tiny mono muted" style={{ marginTop: 8 }}>SHORT DESCRIPTION (shown when tagging)</div>
        <Input value="Young couples ready to stop renting, stretching for Oak Park proximity to Metra." />
        <div className="tiny mono muted" style={{ marginTop: 8 }}>COLOR TAG</div>
        <div className="row" style={{ gap: 6 }}>
          {['sage','tan','rose','ink'].map(c=><Chip key={c} sm className={c==='sage'?'sage':c==='tan'?'tan':c==='rose'?'rose':''}>{c}</Chip>)}
        </div>

        <Hr />
        <div className="hand-alt">Demographics <span className="tiny muted">(optional — helps AI target)</span></div>
        <div className="row" style={{ gap: 6 }}>
          <div className="grow">
            <div className="tiny mono muted">AGE RANGE</div>
            <Input value="28 – 38" />
          </div>
          <div className="grow">
            <div className="tiny mono muted">HOUSEHOLD INCOME</div>
            <Input value="$120k – $180k" />
          </div>
        </div>
        <div className="row" style={{ gap: 6, marginTop: 6 }}>
          <div className="grow">
            <div className="tiny mono muted">LIFE STAGE</div>
            <Input value="Newly married / no kids yet / early career" />
          </div>
          <div className="grow">
            <div className="tiny mono muted">LOCATION</div>
            <Input value="Oak Park · Forest Park · west Chicago" />
          </div>
        </div>

        <Hr />
        <div className="hand-alt">Pains & wants <span className="tiny muted">(biggest driver of voice + hooks)</span></div>
        <div className="tiny mono muted">TOP 3 PAINS</div>
        {[
          '"I\'m wasting $3,200/mo in rent and getting nothing"',
          '"I have no idea what I can actually afford"',
          '"I\'m scared of making a mistake I\'ll regret for 30 years"',
        ].map((p,i)=>(
          <div key={i} className="row" style={{ gap: 6, marginTop: 4 }}>
            <Input value={p} style={{ flex: 1 }} />
            <Btn sm ghost>×</Btn>
          </div>
        ))}
        <Btn sm style={{ marginTop: 4 }}>+ add pain</Btn>

        <div className="tiny mono muted" style={{ marginTop: 10 }}>TOP 3 WANTS</div>
        {[
          '"A place that appreciates while we live in it"',
          '"Walkable, under 30 min to downtown"',
          '"Not a money pit — I can\'t DIY"',
        ].map((p,i)=>(
          <div key={i} className="row" style={{ gap: 6, marginTop: 4 }}>
            <Input value={p} style={{ flex: 1 }} />
            <Btn sm ghost>×</Btn>
          </div>
        ))}
        <Btn sm style={{ marginTop: 4 }}>+ add want</Btn>

        <Hr />
        <div className="hand-alt">Objections you hear from them</div>
        <div className="row wrap" style={{ gap: 6 }}>
          {['"We\'ll wait until rates drop"','"Let\'s look for a year"','"Zillow says the market\'s crashing"','"My dad says buy new construction"'].map(o=>(
            <Chip key={o} sm>{o} <span style={{ marginLeft: 6, opacity: 0.5 }}>×</span></Chip>
          ))}
          <Chip sm dashed>+ add</Chip>
        </div>

        <Hr />
        <div className="hand-alt">Where they hang out</div>
        <div className="row wrap" style={{ gap: 6 }}>
          {['Instagram','TikTok','Pinterest (home inspo)','Reddit r/RealEstate','Zillow app','NextDoor','Podcasts (BiggerPockets)'].map(o=><Chip key={o} sm>{o} ×</Chip>)}
          <Chip sm dashed>+ add</Chip>
        </div>
      </Box>

      <Box style={{ width: 320, flexShrink: 0 }}>
        <div className="hand-alt">Voice preset for this ICA</div>
        <Hr />
        <Check checked>Use my default voice</Check>
        <Check>Override with a different voice</Check>
        <div className="tiny muted" style={{ marginTop: 6 }}>e.g. more reassuring for nervous first-timers</div>

        <Hr />
        <div className="hand-alt">Linked pillars <span className="tiny muted">(which to draw from)</span></div>
        <Check checked>First-timer education</Check>
        <Check checked>Oak Park lifestyle</Check>
        <Check checked>Market & money</Check>
        <Check>Listings showcase</Check>
        <Check>Behind-the-scenes</Check>

        <Hr />
        <div className="hand-alt">Distribution defaults</div>
        <Check checked>Instagram · reels + carousels</Check>
        <Check checked>Blog + SEO</Check>
        <Check>Email · weekly nurture</Check>
        <Check>TikTok</Check>
        <Check checked>Pinterest · pins + idea pins</Check>

        <Hr />
        <div className="hand-alt">Performance</div>
        <div className="row between tiny"><span>Pieces</span><span className="mono">34</span></div>
        <div className="row between tiny"><span>Avg engagement</span><span className="mono">4.8% ★</span></div>
        <div className="row between tiny"><span>Leads tagged</span><span className="mono">11</span></div>
        <div className="row between tiny"><span>Deals closed</span><span className="mono">3 ($38k GCI)</span></div>
      </Box>
    </div>

    <Box sage>
      <div className="hand-alt">✦ AI helpers on this ICA</div>
      <div className="row" style={{ gap: 6, marginTop: 4, flexWrap:'wrap' }}>
        <Btn sm>rewrite pains in their words</Btn>
        <Btn sm>draft 20 hooks</Btn>
        <Btn sm>find 5 similar creators I should study</Btn>
        <Btn sm>generate 30-day content plan</Btn>
      </div>
    </Box>
  </Desktop>;
}

// PILLARS — CRUD
function LibV3_Pillars() {
  const pillars = [
    { name:'First-timer education', desc:'Breaking down intimidating stuff', icas:['First-time buyers'], ratio:30, color:'sage', pieces:42 },
    { name:'Oak Park lifestyle', desc:'Neighborhood love, spots, events', icas:['First-time buyers','Move-up'], ratio:25, color:'tan', pieces:38 },
    { name:'Market & money', desc:'Weekly stat, comps, trends', icas:['Move-up','Downsizers'], ratio:20, color:'rose', pieces:24 },
    { name:'Listings showcase', desc:'Properties I rep / just-sold', icas:['all'], ratio:15, color:'', pieces:31 },
    { name:'Behind-the-scenes', desc:'Real workday, humor, process', icas:['all'], ratio:10, color:'tan', pieces:18 },
  ];
  const total = pillars.reduce((a,p)=>a+p.ratio,0);
  return <Desktop active="Library" url="command.app/library/pillars">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← Library · Content pillars</div>
        <span className="serif" style={{ fontSize: 22 }}>Content pillars <span className="tiny muted">· 5 active · mix sums to {total}%</span></span>
      </div>
      <Btn sm primary>+ new pillar</Btn>
    </div>

    {/* Mix bar */}
    <Box>
      <div className="hand-alt">Content mix</div>
      <Hr />
      <div style={{
        display:'flex', height: 32, borderRadius: 8, overflow:'hidden',
        border:'1px solid var(--line)',
      }}>
        {pillars.map((p,i)=>(
          <div key={i} style={{
            width: `${p.ratio}%`,
            background:
              p.color==='sage' ? 'var(--accent-sage)' :
              p.color==='tan' ? 'var(--accent-tan)' :
              p.color==='rose' ? 'var(--accent-rose)' :
              'var(--ink)',
            color: '#fbf5ea',
            fontSize: 11, fontWeight: 600,
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{p.ratio}%</div>
        ))}
      </div>
      <div className="row between tiny muted" style={{ marginTop: 6 }}>
        <span>Last 30 days: you hit this mix within ±4% · 🎯 on plan</span>
        <Btn sm ghost>rebalance →</Btn>
      </div>
    </Box>

    {pillars.map((p,i)=>(
      <Box key={i}>
        <div className="row between center">
          <div className="row" style={{ gap: 10 }}>
            <div style={{
              width: 10, height: 40, borderRadius: 3,
              background:
                p.color==='sage' ? 'var(--accent-sage)' :
                p.color==='tan' ? 'var(--accent-tan)' :
                p.color==='rose' ? 'var(--accent-rose)' : 'var(--ink)',
            }} />
            <div>
              <div className="hand-alt" style={{ fontSize: 16 }}>{p.name}</div>
              <div className="tiny muted">{p.desc}</div>
              <div className="row" style={{ gap: 4, marginTop: 4 }}>
                {p.icas.map(x=><Chip key={x} sm className={x==='all'?'':'sage'}>{x==='all'?'all ICAs':`ICA: ${x}`}</Chip>)}
              </div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div className="tiny mono muted">RATIO</div>
            <div className="serif" style={{ fontSize: 22 }}>{p.ratio}%</div>
            <div className="tiny muted">{p.pieces} pieces</div>
          </div>
        </div>
        <Hr />
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>edit</Btn>
          <Btn sm ghost>duplicate</Btn>
          <Btn sm ghost>see 42 pieces →</Btn>
          <Btn sm ghost>+ linked ICA</Btn>
          <Btn sm ghost style={{ marginLeft:'auto', color:'var(--accent-rose)' }}>archive</Btn>
        </div>
      </Box>
    ))}
  </Desktop>;
}

// UNIVERSAL LIBRARY INDEX
function LibV4_Index() {
  const sections = [
    ['ICAs', 5, '3 active · multi-profile', 'sage'],
    ['Content pillars', 5, 'mix sums to 100%', 'tan'],
    ['Voice profiles', 2, 'default + "serious for luxury"', 'rose'],
    ['Email templates', 18, '6 campaigns, 12 one-offs', 'tan'],
    ['Scripts · calls', 14, 'Ferry, Serhant, custom', 'sage'],
    ['Checklists', 12, 'every flow has a template', ''],
    ['Areas / farms', 4, 'Oak Park, Forest Park, River Forest, Berwyn', 'tan'],
    ['Neighborhood guides', 6, 'PDF + landing pages', 'rose'],
    ['Vendor directory', 14, 'bulk pricing tracked', ''],
    ['Tags (global)', 38, 'client + content + deal', ''],
    ['Listing presentation decks', 3, 'luxury, standard, investor', 'tan'],
    ['Buyer guides / PDFs', 5, 'auto-sent via Bio Link', 'sage'],
  ];
  return <Desktop active="Library" url="command.app/library">
    <div className="row between center">
      <div>
        <span className="serif" style={{ fontSize: 24 }}>Library</span>
        <div className="tiny muted">Everything is editable, duplicable, and versioned. You can always have more than one.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Input placeholder="search library…" style={{ width: 240 }} />
        <Btn sm primary>+ new</Btn>
      </div>
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 10 }}>
      {sections.map(([n,c,s,t],i)=>(
        <Box key={i}>
          <div className="row between center">
            <Chip sm className={t}>{n}</Chip>
            <span className="serif" style={{ fontSize: 22 }}>{c}</span>
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>{s}</div>
          <Hr />
          <div className="row" style={{ gap: 4 }}>
            <Btn sm>manage →</Btn>
            <Btn sm ghost>+ add</Btn>
          </div>
        </Box>
      ))}
    </div>
    <Box dashed>
      <div className="hand-alt">✦ Universal rules</div>
      <ul style={{ margin:'6px 0 0 18px', fontSize: 13, lineHeight: 1.6 }}>
        <li>Anything you create (ICA, pillar, script, template) can be <b>duplicated</b> and <b>edited</b> without losing the original.</li>
        <li>You can <b>archive</b> anything — it vanishes from dropdowns but history stays.</li>
        <li>Items have <b>versions</b>. Rolling back is one click.</li>
        <li>Multi-select + bulk edit works across the whole library.</li>
        <li>Every library item exposes "+ AI draft from…" (from past content, competitor, prompt).</li>
      </ul>
    </Box>
  </Desktop>;
}

// PICKER — shows up inside generation flows
function LibV5_InlinePicker() {
  return <Desktop active="Content Studio" url="command.app/content/new">
    <div className="hand-neat tiny muted">← Content studio · new piece</div>
    <span className="serif" style={{ fontSize: 22 }}>Generate content</span>

    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt">What are we making?</div>
        <Hr />
        <div className="tiny mono muted">TOPIC</div>
        <Input value="What your HOA docs actually mean" />

        <Hr />
        <div className="tiny mono muted">WHICH ICA IS THIS FOR? <span style={{ color:'var(--accent-rose)' }}>★ required</span></div>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
          <Chip sage>✓ First-time buyers · Oak Park</Chip>
          <Chip>Move-up · families</Chip>
          <Chip>Downsizers</Chip>
          <Chip>Investor</Chip>
          <Chip dashed>+ quick-add new ICA</Chip>
        </div>
        <div className="tiny muted" style={{ marginTop: 4 }}>You can pick more than one — AI blends voice accordingly.</div>

        <Hr />
        <div className="tiny mono muted">PILLAR</div>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
          <Chip sage>✓ First-timer education</Chip>
          <Chip tan>Oak Park lifestyle</Chip>
          <Chip rose>Market & money</Chip>
          <Chip>Listings</Chip>
          <Chip>Behind-the-scenes</Chip>
          <Chip dashed>+ new pillar</Chip>
        </div>

        <Hr />
        <div className="tiny mono muted">VOICE</div>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
          <Chip sage>✓ My default (warm, plain-spoken)</Chip>
          <Chip>Serious (luxury)</Chip>
          <Chip dashed>+ new voice</Chip>
        </div>

        <Hr />
        <div className="tiny mono muted">FORMATS · generate all at once</div>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
          <Chip sage>✓ Blog (SEO)</Chip>
          <Chip sage>✓ IG carousel (7 slides)</Chip>
          <Chip sage>✓ Reel script (45s)</Chip>
          <Chip>Email newsletter</Chip>
          <Chip>Threads post</Chip>
          <Chip>TikTok script</Chip>
          <Chip>Pinterest pin (4 variants)</Chip>
        </div>

        <Btn primary style={{ marginTop: 12 }}>✦ generate all 3 →</Btn>
      </Box>

      <Box style={{ width: 280, flexShrink: 0 }}>
        <div className="hand-alt">Everything here is editable</div>
        <Hr />
        <div className="tiny">Don't see an ICA, pillar, or voice that fits?</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>Quick-add from this screen — you don't have to leave the flow.</div>
        <Hr />
        <Btn sm>+ new ICA (opens sheet)</Btn>
        <Btn sm style={{ marginTop: 6 }}>+ new pillar</Btn>
        <Btn sm style={{ marginTop: 6 }}>+ new voice</Btn>
        <Btn sm style={{ marginTop: 6 }}>+ new distribution preset</Btn>
        <Hr />
        <div className="hand-alt">Preview · linked items</div>
        <div className="tiny muted">This piece will roll up into:</div>
        <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
          <Chip sm sage>ICA · First-timers</Chip>
          <Chip sm sage>Pillar · First-timer ed.</Chip>
          <Chip sm>Voice · Default</Chip>
        </div>
      </Box>
    </div>
  </Desktop>;
}

window.LibraryScreens = [
  { id:'lib1', label:'V1 · Library index', caption:'Everything-editable home. ICAs, pillars, voices, templates, scripts, guides, vendors, tags.', Component: LibV4_Index },
  { id:'lib2', label:'V2 · ICA list (multiple)', caption:'Several ICAs, active/archived, per-piece rollup, AI draft new.', Component: LibV1_ICAList },
  { id:'lib3', label:'V3 · ICA editor', caption:'Full CRUD: identity, pains, wants, objections, channels, linked pillars, performance.', Component: LibV2_ICAEditor },
  { id:'lib4', label:'V4 · Pillars + mix', caption:'CRUD pillars with ratio mix bar, linked ICAs, drift detection.', Component: LibV3_Pillars },
  { id:'lib5', label:'V5 · Inline picker', caption:'How CRUD shows up inside flows: pick ICA/pillar/voice or add-new without leaving.', Component: LibV5_InlinePicker },
];

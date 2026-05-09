// Content Studio — Inspo Vault (3 variations) + Taste Profile
// Drop inspo, AI extracts, learn preferences, recreate with "this property"

function InspoV1_Vault() {
  const items = [
    { k:'reel', src:'@theagencyre', label:'dawn drone pan · jazz undertone', tags:['cinematic','listing','luxury'], liked:true },
    { k:'carousel', src:'@ryanserhant', label:'8-slide "3 biggest mistakes"', tags:['educational','carousel','punchy'], liked:true },
    { k:'photo', src:'pinterest', label:'matte kitchen · styled flat-lay', tags:['photo','warm','editorial'] },
    { k:'tiktok', src:'@glennsanford', label:'talking head + b-roll overlays', tags:['talking-head','fast-cut'] },
    { k:'reel', src:'@erinandream', label:'walk-through w/ voiceover list', tags:['voiceover','walk-through'], liked:true },
    { k:'post', src:'@oakparkdana', label:'before/after renovation grid', tags:['before-after','story'] },
    { k:'email', src:'flodesk', label:'quarterly recap, soft serif', tags:['newsletter','editorial'] },
    { k:'carousel', src:'@mollymccaw', label:'neighborhood guide · mapped', tags:['neighborhood','carousel','guide'], liked:true },
    { k:'photo', src:'domino', label:'dusk exterior · golden hour', tags:['photo','golden-hour'] },
  ];
  return <Desktop active="Content" url="command.app/content/inspo">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>Inspo vault</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>⎗ paste link</Btn>
        <Btn sm>↑ upload</Btn>
        <Btn sm>📎 IG saved sync</Btn>
        <Btn sm primary>✦ extract from selection →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 180, flexShrink: 0 }}>
        <div className="hand-alt" style={{ fontSize: 14 }}>Filter</div>
        <Hr />
        <div className="tiny mono muted">TYPE</div>
        <div className="col" style={{ gap: 2, marginTop: 4 }}>
          {['All 42','Reel 14','Carousel 11','Photo 9','TikTok 5','Pin 7','Email 3'].map(t=>
            <div key={t} className="wf-chip" style={{ justifyContent:'flex-start', fontSize: 11 }}>{t}</div>)}
        </div>
        <div className="tiny mono muted" style={{ marginTop: 10 }}>TAG</div>
        <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
          {['cinematic','editorial','warm','walk-through','voiceover','before-after','carousel','golden-hour','educational'].map(t=>
            <Chip key={t} sm>{t}</Chip>)}
        </div>
        <div className="tiny mono muted" style={{ marginTop: 10 }}>STATUS</div>
        <Check>★ loved (14)</Check>
        <Check>○ saved (28)</Check>
        <Check>✓ recreated (9)</Check>
      </Box>
      <div className="grow">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10 }}>
          {items.map((it,i)=>(
            <Box key={i} style={{ padding: 0, overflow: 'hidden' }}>
              <Img label={`[ ${it.k} · ${it.src} ]`} h={140} />
              <div style={{ padding: 10 }}>
                <div className="row between center">
                  <span className="tiny mono muted">{it.src}</span>
                  <span className="tiny">{it.liked ? '★' : '○'}</span>
                </div>
                <div className="hand-neat" style={{ fontSize: 13, marginTop: 2 }}>{it.label}</div>
                <div className="row wrap" style={{ gap: 3, marginTop: 4 }}>
                  {it.tags.map(t=><Chip key={t} sm>{t}</Chip>)}
                </div>
                <div className="row" style={{ gap: 4, marginTop: 6 }}>
                  <Btn sm>✦ Recreate</Btn>
                  <Btn sm ghost>notes</Btn>
                </div>
              </div>
            </Box>
          ))}
        </div>
      </div>
    </div>
    <Box dashed>
      <div className="hand-alt" style={{ fontSize: 14 }}>✦ What I learned this week</div>
      <div className="tiny">You ★'d 4 cinematic listing reels with warm color-grade and no on-screen text. You dismissed 3 talking-head pieces. I'll prioritize those patterns in new suggestions.</div>
    </Box>
  </Desktop>;
}

function InspoV2_Extract() {
  return <Desktop active="Content" url="command.app/content/inspo/reel-erinandream-042">
    <div className="row between center">
      <span className="hand-neat muted">← Inspo · @erinandream listing walk-through</span>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>★ love</Btn>
        <Btn sm>add note</Btn>
        <Btn sm primary>✦ Recreate with… →</Btn>
      </div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box style={{ width: 260, flexShrink: 0, padding: 0, overflow:'hidden' }}>
        <Img label="[ reel preview · 0:47 ]" h={380} />
        <div style={{ padding: 10 }}>
          <div className="tiny mono muted">SOURCE</div>
          <div className="tiny">instagram.com/reel/Cx7h…</div>
          <div className="tiny mono muted" style={{ marginTop: 6 }}>SAVED</div>
          <div className="tiny">Apr 14, 2026 · 2:14pm</div>
        </div>
      </Box>
      <div className="col grow" style={{ gap: 10 }}>
        <Box>
          <div className="hand-alt" style={{ fontSize: 15 }}>✦ AI extracted</div>
          <Hr />
          <div className="row" style={{ gap: 12 }}>
            <div className="grow">
              <div className="tiny mono muted">FORMAT</div>
              <div>45–60s reel · vertical · 3-scene structure</div>
              <div className="tiny mono muted" style={{ marginTop: 6 }}>HOOK (0–2s)</div>
              <div className="serif" style={{ fontSize: 16 }}>"You will not believe what's behind this door."</div>
              <div className="tiny mono muted" style={{ marginTop: 6 }}>PACING</div>
              <div>1 cut every 1.8s · slow push-ins · voiceover under music at -18db</div>
            </div>
            <div className="grow">
              <div className="tiny mono muted">VISUAL LANGUAGE</div>
              <div>warm LUT · matte highlights · no on-screen text</div>
              <div className="tiny mono muted" style={{ marginTop: 6 }}>MUSIC</div>
              <div>low-tempo piano (epidemic "Honey Oak")</div>
              <div className="tiny mono muted" style={{ marginTop: 6 }}>CTA</div>
              <div>"link in bio to tour" · held 3s over exterior</div>
            </div>
          </div>
        </Box>
        <Box>
          <div className="hand-alt" style={{ fontSize: 15 }}>Why you liked it  <span className="tiny muted">· tell AI more</span></div>
          <Hr />
          <div className="row wrap" style={{ gap: 4 }}>
            {[['hook','★'],['pacing','★'],['voiceover','★'],['color grade','★'],['CTA',''],['music',''],['caption','—']].map(([l,v])=>(
              <Chip key={l}>{l} {v}</Chip>
            ))}
          </div>
          <Input placeholder="what specifically do you love about this? (teaches your taste)" value="the single-line hook without on-screen text — feels cinematic, not salesy" style={{ marginTop: 8, minHeight: 50 }} />
          <div className="row" style={{ gap: 4, marginTop: 6 }}>
            <Btn sm>👍 more like this</Btn>
            <Btn sm ghost>👎 not my style</Btn>
          </div>
        </Box>
        <Box dashed>
          <div className="hand-alt">Recreate this with…</div>
          <div className="row" style={{ gap: 6, marginTop: 6, flexWrap:'wrap' }}>
            <Chip>🏡 42 Oak St (active)</Chip>
            <Chip>🏡 88 Elm St (active)</Chip>
            <Chip>🏡 1428 Magnolia (upcoming)</Chip>
            <Chip>📍 Oak Park neighborhood</Chip>
            <Chip>☕ Fiore coffee shop feature</Chip>
            <Chip tan>+ custom brief</Chip>
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>AI keeps the structure (hook→3 scenes→CTA) but swaps the subject. Script, shot list, and caption draft appear in the Carousel/Script builder.</div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

function InspoV3_TasteProfile() {
  const loves = [
    ['warm, matte color grade', 14],
    ['single-line hooks (no on-screen text)', 11],
    ['voiceover over soft piano', 9],
    ['slow push-in shots', 7],
    ['editorial serif captions', 6],
    ['before/after structure', 5],
    ['neighborhood-as-character', 4],
  ];
  const avoids = [
    ['talking-head direct-to-cam',4],
    ['trending audio / memes',7],
    ['hard-sell CTAs in caption',5],
    ['neon/gradient overlays',3],
    ['screen-text-heavy edits',6],
  ];
  return <Desktop active="Content" url="command.app/content/taste">
    <div className="row between center">
      <span className="serif" style={{ fontSize: 22 }}>My taste profile</span>
      <div className="tiny mono muted">BUILT FROM 42 INSPO · 9 RECREATES · 138 SIGNALS</div>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>What Dana loves</div>
        <Hr />
        {loves.map(([l,n])=>(
          <div key={l} className="row between center" style={{ padding: '3px 0' }}>
            <span>{l}</span>
            <div className="row center" style={{ gap: 6 }}>
              <Bar pct={n*7} />
              <span className="tiny mono muted" style={{ width: 20 }}>{n}</span>
            </div>
          </div>
        ))}
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 15 }}>What Dana avoids</div>
        <Hr />
        {avoids.map(([l,n])=>(
          <div key={l} className="row between center" style={{ padding: '3px 0' }}>
            <span>{l}</span>
            <div className="row center" style={{ gap: 6 }}>
              <Bar pct={n*10} color="var(--accent-rose)" />
              <span className="tiny mono muted" style={{ width: 20 }}>{n}</span>
            </div>
          </div>
        ))}
      </Box>
    </div>
    <div className="row" style={{ gap: 12 }}>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 14 }}>Voice · signature phrases</div>
        <div className="tiny">"let's walk it" · "here's what I'd do" · "the room that sold me" · "you don't buy a house, you buy a life"</div>
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 14 }}>Palette reference</div>
        <div className="row" style={{ gap: 4, marginTop: 4 }}>
          {['#3d2e1f','#c9a274','#8a9b7f','#c78b7a','#f5f1ea'].map(c=>
            <div key={c} style={{ width: 28, height: 28, borderRadius: 4, background: c, border:'1px solid var(--line)' }} />
          )}
        </div>
      </Box>
      <Box className="grow">
        <div className="hand-alt" style={{ fontSize: 14 }}>Reference creators</div>
        <div className="tiny">@erinandream · @mollymccaw · @theagencyre · @ryanserhant (educational only)</div>
      </Box>
    </div>
    <Box dashed>
      <div className="hand-alt">✦ Ready to use this profile</div>
      <div className="row" style={{ gap: 6, marginTop: 6, flexWrap:'wrap' }}>
        <Chip tan>draft this week's reel (3 ideas)</Chip>
        <Chip>rewrite pinned posts in voice</Chip>
        <Chip>suggest 5 inspo to save next</Chip>
        <Chip>build a listing launch pack for 42 Oak</Chip>
      </div>
    </Box>
    <Anno style={{ alignSelf:'flex-end' }}>↑ the longer you use it, the sharper it gets</Anno>
  </Desktop>;
}

window.InspoScreens = [
  { id:'insp1', label:'V1 · Inspo vault', caption:'Drop links/uploads/IG saves. Grid, filter, tag, love, recreate.', Component: InspoV1_Vault },
  { id:'insp2', label:'V2 · Extract + recreate', caption:'AI breaks down what makes the piece work. Pick a property to recreate with.', Component: InspoV2_Extract },
  { id:'insp3', label:'V3 · Taste profile', caption:'What AI has learned. Loves, avoids, voice, palette, creators.', Component: InspoV3_TasteProfile },
];

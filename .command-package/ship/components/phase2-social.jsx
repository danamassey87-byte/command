// ============================================================
// Open House · Full Promotion Kit
// Flow: "I have an open house" → input property + photos
//      → everything generates (social · print · email)
//      → manual post or schedule with Blotato
// ============================================================

/* ---------- Shared: poster image component ---------- */
function OHPoster({ addr, city, date, time, price, beds, baths, sqft, tone = 'warm', photo = true }) {
  const bg = tone === 'warm'
    ? 'linear-gradient(155deg, #E9DBC9 0%, #D8C2A6 55%, #B79782 100%)'
    : tone === 'ink'
    ? 'linear-gradient(155deg, #3A2A1E 0%, #5A4136 100%)'
    : 'linear-gradient(155deg, #EFEDE8 0%, #C8C3B9 60%, #8B9A7B 100%)';
  const fg = tone === 'ink' ? '#EFEDE8' : '#3A2A1E';
  return (
    <div style={{
      width: '100%', aspectRatio: '1 / 1', borderRadius: 8, position: 'relative',
      background: bg, overflow: 'hidden', border: '1px solid var(--line)',
      fontFamily: "'Cormorant Garamond', serif",
      color: fg,
    }}>
      <div style={{ position:'absolute', inset: 10, border: `1px solid ${tone === 'ink' ? 'rgba(239,237,232,0.35)' : 'rgba(58,42,30,0.35)'}`, borderRadius: 4 }} />
      <div style={{ position:'absolute', top: 22, left: 0, right: 0, textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize: 9, letterSpacing:'0.22em' }}>✦ OPEN HOUSE ✦</div>
      <div style={{ position:'absolute', top: 42, left: 0, right: 0, textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize: 9, letterSpacing:'0.14em', opacity: 0.82 }}>{date} · {time}</div>
      {photo && (
        <div style={{ position:'absolute', left: '12%', right: '12%', top: '26%', height: '36%', background: tone === 'ink' ? 'rgba(239,237,232,0.12)' : 'rgba(58,42,30,0.12)', borderRadius: 4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize: 9, letterSpacing:'0.14em', opacity: 0.6 }}>
          HERO PHOTO
        </div>
      )}
      <div style={{ position:'absolute', left: 0, right: 0, top: '66%', textAlign:'center', fontSize:'clamp(14px, 3.2vw, 22px)', fontWeight: 500, lineHeight: 1.1, padding:'0 18px' }}>{addr}</div>
      <div style={{ position:'absolute', left: 0, right: 0, top: '74%', textAlign:'center', fontFamily:"'Nunito Sans', sans-serif", fontSize:'clamp(9px, 2vw, 11px)', opacity: 0.75 }}>{city}</div>
      <div style={{ position:'absolute', left:'14%', right:'14%', bottom:'18%', display:'flex', justifyContent:'space-around', padding:'6px 0', borderTop:`1px solid ${tone === 'ink' ? 'rgba(239,237,232,0.28)' : 'rgba(58,42,30,0.28)'}`, borderBottom:`1px solid ${tone === 'ink' ? 'rgba(239,237,232,0.28)' : 'rgba(58,42,30,0.28)'}`, fontFamily:"'IBM Plex Mono', monospace", fontSize:'clamp(8px, 1.6vw, 10px)' }}>
        <div>{beds} BD</div><div>{baths} BA</div><div>{sqft} SF</div>
      </div>
      <div style={{ position:'absolute', left: 0, right: 0, bottom: '7%', textAlign:'center', fontSize:'clamp(13px, 2.8vw, 18px)', fontWeight: 500 }}>{price}</div>
      <div style={{ position:'absolute', left: 0, right: 0, bottom: 10, textAlign:'center', fontFamily:"'IBM Plex Mono', monospace", fontSize: 8, letterSpacing:'0.14em', opacity: 0.7 }}>DANA MASSEY · REAL BROKER AZ</div>
    </div>
  );
}

/* Hero photo tile — used in uploader */
function PhotoTile({ label = 'HERO', hero, dim = false }) {
  return (
    <div style={{
      width:'100%', aspectRatio:'4 / 3', borderRadius: 6, position:'relative',
      background: 'linear-gradient(135deg, #D8C2A6, #B79782 60%, #8B9A7B)',
      border: hero ? '2px solid var(--accent-sage)' : '1px solid var(--line)',
      opacity: dim ? 0.45 : 1, overflow:'hidden',
    }}>
      {hero && <div style={{ position:'absolute', top: 4, left: 4, background:'var(--accent-sage)', color:'#fff', fontFamily:"'IBM Plex Mono',monospace", fontSize: 8, padding:'2px 5px', borderRadius: 3, letterSpacing:'0.14em' }}>HERO</div>}
      <div style={{ position:'absolute', bottom: 4, right: 6, fontFamily:"'IBM Plex Mono',monospace", fontSize: 8, letterSpacing:'0.1em', color:'rgba(58,42,30,0.6)' }}>{label}</div>
    </div>
  );
}

/* Social preview card — generic wrapper */
function PlatformShell({ platform, children, icon, scheduled }) {
  return (
    <div style={{ background:'var(--paper)', border:'1px solid var(--line)', borderRadius: 6, padding: 10 }}>
      <div className="row between center" style={{ marginBottom: 8 }}>
        <div className="row" style={{ gap: 6, alignItems:'center' }}>
          <div style={{ width: 22, height: 22, borderRadius: 4, background:'var(--paper-2)', border:'1px solid var(--line)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize: 10 }}>{icon}</div>
          <div className="hand-alt" style={{ fontSize: 14 }}>{platform}</div>
        </div>
        {scheduled
          ? <Chip sm style={{ background:'var(--accent-sage-soft, #EEF1E9)', borderColor:'var(--accent-sage)' }}>{scheduled}</Chip>
          : <Chip sm dashed>draft</Chip>}
      </div>
      {children}
    </div>
  );
}

// =========================================================
// V1 — "I have an open house" wizard · STEP 1 · Property + photos
// =========================================================
function OHS_V1_WizardSetup() {
  return <Desktop active="Open House" url="command.app/openhouse/new">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">New open house · step 1 of 3</div>
        <span className="serif" style={{ fontSize: 24 }}>Tell Command about the house</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>save draft</Btn>
        <Btn sm primary>continue → photos</Btn>
      </div>
    </div>

    {/* Progress bar */}
    <div className="row" style={{ gap: 8, fontFamily:"'IBM Plex Mono',monospace", fontSize: 10, letterSpacing:'0.14em' }}>
      <span style={{ color:'var(--accent-sage)' }}>● PROPERTY</span>
      <span className="muted">── ○ PHOTOS ── ○ REVIEW & PUBLISH</span>
    </div>

    <div className="row" style={{ gap: 12, alignItems:'flex-start' }}>
      {/* LEFT — form */}
      <Box className="grow">
        <div className="hand-alt">Property</div>
        <div className="tiny muted" style={{ marginBottom: 8 }}>
          Typing the MLS # auto-fills the rest. Or start from one of your active listings.
        </div>

        <div className="col" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 6 }}>
            <Input placeholder="MLS #" value="ARMLS-6842017" style={{ flex: 1 }} />
            <Btn sm>or pick from my listings ▾</Btn>
          </div>
          <Input value="88 Elm Ave" />
          <div className="row" style={{ gap: 6 }}>
            <Input value="Paradise Valley" style={{ flex: 2 }} />
            <Input value="AZ" style={{ width: 60 }} />
            <Input value="85253" style={{ width: 90 }} />
          </div>
          <Input value="$825,000" />
          <div className="row" style={{ gap: 6 }}>
            <Input value="4 bd" style={{ flex: 1 }} />
            <Input value="3 ba" style={{ flex: 1 }} />
            <Input value="2,420 sf" style={{ flex: 1 }} />
            <Input value=".28 ac lot" style={{ flex: 1 }} />
          </div>
        </div>

        <Hr />
        <div className="hand-alt">Open house details</div>
        <div className="col" style={{ gap: 8, marginTop: 6 }}>
          <div className="row" style={{ gap: 6 }}>
            <Input value="Sat, Apr 25" style={{ flex: 2 }} />
            <Input value="11:00 AM" style={{ flex: 1 }} />
            <Input value="1:00 PM" style={{ flex: 1 }} />
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Check checked>public</Check>
            <Check>brokers-only preview</Check>
            <Check checked>include on MLS open house feed</Check>
          </div>
        </div>

        <Hr />
        <div className="hand-alt">Highlights — AI will write captions around these</div>
        <div className="tiny muted" style={{ marginBottom: 6 }}>we pulled 5 from the listing · drop, edit, or add your own</div>
        <div className="row wrap" style={{ gap: 4 }}>
          <Chip sm filled>remodeled kitchen (2023)</Chip>
          <Chip sm filled>walk-in pantry</Chip>
          <Chip sm filled>mountain views from primary</Chip>
          <Chip sm>new HVAC</Chip>
          <Chip sm>covered patio</Chip>
          <Chip sm dashed>+ add</Chip>
        </div>
      </Box>

      {/* RIGHT — preview of what will be generated */}
      <Box dashed style={{ width: 340, flexShrink: 0 }}>
        <div className="hand-alt tiny">What Command will generate next</div>
        <div className="tiny muted" style={{ marginBottom: 8 }}>you'll review before anything posts</div>
        <div className="col" style={{ gap: 8 }}>
          {[
            ['◆ Social posts × 8 platforms', 'Nextdoor · FB Marketplace · IG feed · IG story · FB · TikTok · LinkedIn · Threads'],
            ['✉ Email campaigns × 3', 'Farm (85253 · 1,240) · Buyer list (482) · SOI (86)'],
            ['📄 Print collateral × 4', 'Door hangers · flyer · just-listed postcard · buyer packet'],
            ['📅 Schedule', 'Manual post OR Blotato schedule (tue 8am / fri 10am / sat 8am)'],
          ].map(([t, s], i) => (
            <div key={i} style={{ padding: 8, background:'var(--paper-2)', borderRadius: 4, border:'1px solid var(--line)' }}>
              <div style={{ fontWeight: 500 }}>{t}</div>
              <div className="tiny muted">{s}</div>
            </div>
          ))}
        </div>
        <Hr />
        <div className="tiny muted" style={{ lineHeight: 1.6 }}>
          All 15 assets pull from the same source of truth. Edit the address here and it cascades everywhere.
        </div>
      </Box>
    </div>
  </Desktop>;
}

// =========================================================
// V2 — Wizard STEP 2 · Photo upload + hero selection
// =========================================================
function OHS_V2_PhotoUpload() {
  return <Desktop active="Open House" url="command.app/openhouse/new/photos">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">New open house · step 2 of 3</div>
        <span className="serif" style={{ fontSize: 24 }}>Photos</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>← property</Btn>
        <Btn sm primary>continue → review</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 8, fontFamily:"'IBM Plex Mono',monospace", fontSize: 10, letterSpacing:'0.14em' }}>
      <span className="muted">✓ PROPERTY ──</span>
      <span style={{ color:'var(--accent-sage)' }}>● PHOTOS</span>
      <span className="muted">── ○ REVIEW & PUBLISH</span>
    </div>

    <Box>
      <div className="row between center">
        <div>
          <div className="hand-alt">Upload your photos</div>
          <div className="tiny muted">we'll auto-crop and size them for every platform</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>⇅ pull from MLS (23)</Btn>
          <Btn sm>⇅ pull from Listing record</Btn>
          <Btn sm primary>↑ upload files</Btn>
        </div>
      </div>

      {/* Drag zone */}
      <div style={{
        border:'2px dashed var(--line)', borderRadius: 8, padding: 20,
        background:'var(--paper-2)', textAlign:'center', margin:'10px 0',
      }}>
        <div className="hand-neat" style={{ fontSize: 14 }}>Drag & drop photos here</div>
        <div className="tiny muted">JPG, PNG, HEIC · up to 30 photos · 10 MB each</div>
      </div>

      {/* Photo grid — 12 photos, first is hero */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 8 }}>
        <PhotoTile label="01 · front" hero />
        <PhotoTile label="02 · kitchen" />
        <PhotoTile label="03 · primary" />
        <PhotoTile label="04 · living" />
        <PhotoTile label="05 · back yard" />
        <PhotoTile label="06 · dining" />
        <PhotoTile label="07 · hallway" />
        <PhotoTile label="08 · pantry" />
        <PhotoTile label="09 · bath" />
        <PhotoTile label="10 · patio" />
        <PhotoTile label="11 · aerial" />
        <PhotoTile label="12 · view" />
      </div>

      <div className="tiny muted" style={{ marginTop: 8 }}>
        Tap any photo to set as hero. Drag to reorder. The hero goes on posters, door hangers, flyer covers, email headers, and is the first image on every social post.
      </div>
    </Box>

    {/* Per-output photo assignment */}
    <Box>
      <div className="hand-alt">AI-picked photo per output</div>
      <div className="tiny muted" style={{ marginBottom: 8 }}>override any of these — what gets used for each asset</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
        {[
          ['◆ Nextdoor post', '01 · front'],
          ['◆ FB Marketplace', '01 · front'],
          ['◆ IG feed (carousel)', '01, 02, 03, 05, 11'],
          ['◆ IG story', '02 · kitchen'],
          ['◆ FB feed', '01 · front'],
          ['◆ TikTok', '01→12 slideshow'],
          ['◆ LinkedIn', '01 · front'],
          ['◆ Threads', '01 · front'],
          ['📄 Door hanger · front', '01 · front'],
          ['📄 Door hanger · back', '02 · kitchen'],
          ['📄 Flyer cover', '01 · front'],
          ['✉ Email · farm', '01 · front'],
        ].map(([out, photo], i) => (
          <div key={i} style={{ padding: 6, background:'var(--paper-2)', borderRadius: 4, border:'1px solid var(--line)' }}>
            <div className="tiny" style={{ fontWeight: 500 }}>{out}</div>
            <div className="tiny muted">{photo}</div>
            <Btn sm ghost style={{ marginTop: 4, fontSize: 10 }}>change →</Btn>
          </div>
        ))}
      </div>
    </Box>
  </Desktop>;
}

// =========================================================
// V3 — Wizard STEP 3 · Review everything before publish
// =========================================================
function OHS_V3_ReviewAll() {
  const assets = [
    ['◆ Nextdoor',        'social',  '1080×1080 poster · 520 char caption · neighborhood-scoped'],
    ['◆ FB Marketplace',  'social',  '1200×1200 poster · structured listing'],
    ['◆ IG feed carousel','social',  '5-slide carousel · hook + highlights + map + CTA'],
    ['◆ IG story',        'social',  '1080×1920 animated · "OPEN TODAY" sticker · swipe-up'],
    ['◆ FB feed',         'social',  'Full caption · location tagged · 3 photos'],
    ['◆ TikTok',          'social',  'Slideshow from 12 photos · trending audio · 15s'],
    ['◆ LinkedIn',        'social',  'Professional tone · market context · agent intro'],
    ['◆ Threads',         'social',  'Short · conversational · 280 char'],
    ['✉ Email · farm',    'email',   '1,240 homeowners in 85253 · dropped 2024'],
    ['✉ Email · buyers',  'email',   '482 active buyers · budget $650k–$950k'],
    ['✉ Email · SOI',     'email',   '86 sphere of influence'],
    ['📄 Door hanger',    'print',   '4.25×11 · front + back · 150 print-ready PDFs'],
    ['📄 Flyer',          'print',   '8.5×11 · 2-sided · QR to listing'],
    ['📄 Postcard',       'print',   '6×9 just-listed · EDDM-ready · 1,240'],
    ['📄 Buyer packet',   'print',   '8 pages · photos + specs + neighborhood + financing'],
  ];
  return <Desktop active="Open House" url="command.app/openhouse/new/review">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">New open house · step 3 of 3</div>
        <span className="serif" style={{ fontSize: 24 }}>Review · 15 assets ready</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>← photos</Btn>
        <Btn sm>save as draft</Btn>
        <Btn sm primary>✦ generate all</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 8, fontFamily:"'IBM Plex Mono',monospace", fontSize: 10, letterSpacing:'0.14em' }}>
      <span className="muted">✓ PROPERTY ── ✓ PHOTOS ──</span>
      <span style={{ color:'var(--accent-sage)' }}>● REVIEW & PUBLISH</span>
    </div>

    <div className="row" style={{ gap: 12, alignItems:'flex-start' }}>
      {/* LEFT — asset list */}
      <Box className="grow">
        <div className="row between center">
          <div className="hand-alt">Everything that will be created</div>
          <div className="row" style={{ gap: 4 }}>
            <Chip sm filled>all 15</Chip>
            <Chip sm>social (8)</Chip>
            <Chip sm>email (3)</Chip>
            <Chip sm>print (4)</Chip>
          </div>
        </div>
        <Hr />

        <div className="col" style={{ gap: 6 }}>
          {assets.map(([label, type, desc], i) => (
            <div key={i} className="row between center" style={{ padding: 8, background: i%2?'var(--paper-2)':'var(--paper)', borderRadius: 4, border:'1px solid var(--line)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{label}</div>
                <div className="tiny muted">{desc}</div>
              </div>
              <Chip sm className={type==='social'?'':type==='email'?'sage':'tan'}>{type}</Chip>
              <div className="row" style={{ gap: 4, marginLeft: 8 }}>
                <Btn sm ghost>edit →</Btn>
                <Check checked />
              </div>
            </div>
          ))}
        </div>
      </Box>

      {/* RIGHT — publish plan */}
      <div className="col" style={{ width: 340, gap: 10, flexShrink: 0 }}>
        <Box accent>
          <div className="hand-alt" style={{ fontSize: 15 }}>How we publish</div>
          <Hr />
          <div className="tiny" style={{ opacity: 0.9, lineHeight: 1.7 }}>
            <div className="row between"><span>◆ Nextdoor</span><span className="mono">manual</span></div>
            <div className="row between"><span>◆ FB Marketplace</span><span className="mono">manual</span></div>
            <div className="row between"><span>◆ IG feed</span><span className="mono">✦ Blotato · Fri 10am</span></div>
            <div className="row between"><span>◆ IG story</span><span className="mono">✦ Blotato · Sat 8am</span></div>
            <div className="row between"><span>◆ FB feed</span><span className="mono">✦ Blotato · Fri 10am</span></div>
            <div className="row between"><span>◆ TikTok</span><span className="mono">✦ Blotato · Thu 6pm</span></div>
            <div className="row between"><span>◆ LinkedIn</span><span className="mono">✦ Blotato · Tue 8am</span></div>
            <div className="row between"><span>◆ Threads</span><span className="mono">✦ Blotato · Fri 10am</span></div>
            <div className="row between"><span>✉ Farm email</span><span className="mono">Wed 9am</span></div>
            <div className="row between"><span>✉ Buyer email</span><span className="mono">Thu 10am</span></div>
            <div className="row between"><span>✉ SOI email</span><span className="mono">Fri 8am</span></div>
            <div className="row between"><span>📄 Print order</span><span className="mono">sent today</span></div>
          </div>
          <Hr />
          <Btn sm style={{ background:'var(--paper)', color:'var(--ink)' }}>edit schedule →</Btn>
        </Box>

        <Box dashed>
          <div className="hand-alt tiny">Compliance</div>
          <div className="row" style={{ gap: 4, marginTop: 4 }}>
            <Chip sm style={{ background:'var(--accent-sage-soft,#EEF1E9)', borderColor:'var(--accent-sage)' }}>✓ R4-28-502</Chip>
            <Chip sm style={{ background:'var(--accent-sage-soft,#EEF1E9)', borderColor:'var(--accent-sage)' }}>✓ ADV-001</Chip>
            <Chip sm style={{ background:'var(--accent-sage-soft,#EEF1E9)', borderColor:'var(--accent-sage)' }}>✓ ADV-004</Chip>
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Broker name + license visible on every asset</div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

// =========================================================
// V4 — All-platforms social grid · per-platform preview
// =========================================================
function OHS_V4_SocialGrid() {
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/social">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← 88 Elm Ave · promotion</div>
        <span className="serif" style={{ fontSize: 22 }}>Social · 10 platforms</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>↓ download all images</Btn>
        <Btn sm>✦ regenerate captions</Btn>
        <Btn sm primary>send all to Blotato →</Btn>
      </div>
    </div>

    <div className="tiny muted">Each card is its own edit surface. Green = scheduled via Blotato. Tan = manual (copy/paste).</div>

    <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 12 }}>
      <PlatformShell platform="Nextdoor" icon="N" scheduled={null}>
        <div className="row" style={{ gap: 8, alignItems:'flex-start' }}>
          <div style={{ width: 120, flexShrink: 0 }}>
            <OHPoster addr="88 Elm Ave" city="Paradise Valley" date="SAT APR 25" time="11A–1P" price="$825,000" beds="4" baths="3" sqft="2,420" />
          </div>
          <div className="col" style={{ gap: 4, flex: 1 }}>
            <div className="tiny mono muted">TITLE</div>
            <div className="tiny" style={{ fontWeight: 600 }}>Open House Saturday · 88 Elm Ave</div>
            <div className="tiny mono muted" style={{ marginTop: 4 }}>CAPTION (520 ch)</div>
            <div className="tiny" style={{ background:'var(--paper-2)', padding: 6, borderRadius: 4, maxHeight: 70, overflow:'hidden' }}>Hi neighbors — I'm hosting an open house at 88 Elm Ave this Saturday, April 25, from 11am–1pm. Come take a look…</div>
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              <Btn sm>↓ image</Btn>
              <Btn sm>copy caption</Btn>
              <Btn sm ghost>edit →</Btn>
            </div>
            <div className="tiny muted">Manual post · NextDoor blocks 3rd-party posting</div>
          </div>
        </div>
      </PlatformShell>

      <PlatformShell platform="FB Marketplace" icon="M" scheduled={null}>
        <div className="row" style={{ gap: 8, alignItems:'flex-start' }}>
          <div style={{ width: 120, flexShrink: 0 }}>
            <OHPoster addr="88 Elm Ave" city="Paradise Valley" date="SAT APR 25" time="11A–1P" price="$825,000" beds="4" baths="3" sqft="2,420" tone="sage" />
          </div>
          <div className="col" style={{ gap: 4, flex: 1 }}>
            <div className="tiny mono muted">STRUCTURED FIELDS</div>
            <div className="tiny">$825,000 · Single family · 4/3 · 2,420 sf · 85253</div>
            <div className="tiny mono muted" style={{ marginTop: 4 }}>TITLE</div>
            <div className="tiny" style={{ fontWeight: 600 }}>Open Sat 11–1 · Remodeled 4BR Paradise Valley · $825K</div>
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              <Btn sm>↓ image</Btn>
              <Btn sm>copy fields</Btn>
              <Btn sm ghost>edit →</Btn>
            </div>
            <div className="tiny muted">Manual post · Marketplace blocks 3rd-party posting</div>
          </div>
        </div>
      </PlatformShell>

      <PlatformShell platform="Instagram · feed carousel" icon="IG" scheduled="Blotato · Fri 10am">
        <div className="row" style={{ gap: 4 }}>
          <div style={{ width: 72 }}><OHPoster addr="88 Elm" city="PV" date="SAT" time="11–1" price="$825K" beds="4" baths="3" sqft="2,420" /></div>
          <div style={{ width: 72 }}><PhotoTile label="kitchen" /></div>
          <div style={{ width: 72 }}><PhotoTile label="primary" /></div>
          <div style={{ width: 72 }}><PhotoTile label="yard" /></div>
          <div style={{ width: 72 }}><PhotoTile label="map" /></div>
        </div>
        <div className="tiny mono muted" style={{ marginTop: 6 }}>CAPTION</div>
        <div className="tiny" style={{ background:'var(--paper-2)', padding: 6, borderRadius: 4 }}>OPEN SATURDAY ↓ swipe · This remodeled 4BR in Paradise Valley has the kitchen you've been looking for...</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>#paradisevalleyrealestate #azrealestate #openhouse #homesforsale</div>
        <div className="row" style={{ gap: 4, marginTop: 4 }}>
          <Btn sm ghost>preview →</Btn>
          <Btn sm ghost>edit →</Btn>
          <Btn sm>reschedule</Btn>
        </div>
      </PlatformShell>

      <PlatformShell platform="Instagram · story" icon="ST" scheduled="Blotato · Sat 8am">
        <div className="row" style={{ gap: 8, alignItems:'flex-start' }}>
          <div style={{ width: 90, height: 160, borderRadius: 6, background:'linear-gradient(155deg, #3A2A1E, #5A4136)', position:'relative', overflow:'hidden', color:'#EFEDE8', fontFamily:"'Cormorant Garamond',serif", flexShrink: 0 }}>
            <div style={{ position:'absolute', top: 10, left: 0, right: 0, textAlign:'center', fontSize: 8, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:'0.2em' }}>OPEN TODAY</div>
            <div style={{ position:'absolute', top: '45%', left: 0, right: 0, textAlign:'center', fontSize: 14, fontWeight: 500 }}>88 Elm Ave</div>
            <div style={{ position:'absolute', top: '60%', left: 0, right: 0, textAlign:'center', fontSize: 9, opacity: 0.7 }}>11am – 1pm</div>
            <div style={{ position:'absolute', bottom: 20, left: 10, right: 10, padding: 4, background:'rgba(239,237,232,0.14)', textAlign:'center', borderRadius: 20, fontSize: 8, letterSpacing:'0.14em' }}>SWIPE UP ↑</div>
          </div>
          <div className="col grow">
            <div className="tiny mono muted">ELEMENTS</div>
            <div className="tiny">· animated "OPEN TODAY" sticker<br/>· countdown to 11am<br/>· location sticker · 88 Elm Ave<br/>· swipe-up → listing page</div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}>
              <Btn sm ghost>edit →</Btn>
              <Btn sm>reschedule</Btn>
            </div>
          </div>
        </div>
      </PlatformShell>

      <PlatformShell platform="Facebook · feed" icon="FB" scheduled="Blotato · Fri 10am">
        <div className="row" style={{ gap: 8, alignItems:'flex-start' }}>
          <div style={{ width: 110, flexShrink: 0 }}><OHPoster addr="88 Elm" city="PV" date="SAT" time="11–1" price="$825K" beds="4" baths="3" sqft="2,420" /></div>
          <div className="col grow">
            <div className="tiny" style={{ background:'var(--paper-2)', padding: 6, borderRadius: 4, lineHeight: 1.6 }}>
              ✨ OPEN HOUSE SAT 11–1 ✨<br/>Come see 88 Elm Ave in Paradise Valley — recently remodeled, mountain views, and a kitchen that will ruin you for other kitchens 😅...
            </div>
            <div className="tiny muted" style={{ marginTop: 4 }}>📍 tagged location · 3 photos attached</div>
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              <Btn sm ghost>edit →</Btn>
              <Btn sm>reschedule</Btn>
            </div>
          </div>
        </div>
      </PlatformShell>

      <PlatformShell platform="TikTok · slideshow" icon="TT" scheduled="Blotato · Thu 6pm">
        <div className="row" style={{ gap: 8, alignItems:'flex-start' }}>
          <div style={{ width: 90, height: 160, borderRadius: 6, background:'var(--paper-2)', border:'1px solid var(--line)', position:'relative', overflow:'hidden', flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize: 9 }}>
            SLIDESHOW
            <div style={{ position:'absolute', bottom: 6, left: 4, right: 4, fontSize: 8 }}>🎵 trending audio</div>
          </div>
          <div className="col grow">
            <div className="tiny mono muted">15 SEC · 12 PHOTOS</div>
            <div className="tiny">Hook: "POV: you're house hunting in Paradise Valley..."</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>Trending audio matched · #openhouse #paradisevalley #az</div>
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              <Btn sm ghost>pick different audio →</Btn>
              <Btn sm ghost>edit →</Btn>
            </div>
          </div>
        </div>
      </PlatformShell>

      <PlatformShell platform="LinkedIn" icon="in" scheduled="Blotato · Tue 8am">
        <div className="tiny" style={{ background:'var(--paper-2)', padding: 8, borderRadius: 4, lineHeight: 1.7 }}>
          Hosting an open house this Saturday in Paradise Valley. The remodel on this one is worth a walk-through if you know anyone weighing the $800k tier in east valley. Full details and RSVP in comments.
        </div>
        <div className="tiny muted" style={{ marginTop: 4 }}>Professional tone · market context in first comment</div>
      </PlatformShell>

      <PlatformShell platform="Threads" icon="@" scheduled="Blotato · Fri 10am">
        <div className="tiny" style={{ background:'var(--paper-2)', padding: 8, borderRadius: 4 }}>
          open sat 11–1 at 88 elm in paradise valley. the kitchen is a whole thing. come say hi ☕️
        </div>
        <div className="tiny muted" style={{ marginTop: 4 }}>280 char · conversational · no hashtag spam</div>
      </PlatformShell>

      <PlatformShell platform="Pinterest · pin" icon="P" scheduled="Blotato · Fri 9am">
        <div className="row" style={{ gap: 8, alignItems:'flex-start' }}>
          <div style={{ width: 78, flexShrink: 0 }}>
            <OHPoster addr="88 Elm" city="PV" date="SAT" time="11–1" price="$825K" beds="4" baths="3" sqft="2,420" tone="sage" />
          </div>
          <div className="col" style={{ gap: 4, flex: 1 }}>
            <div className="tiny mono muted">TITLE (100ch · keyword-first)</div>
            <div className="tiny" style={{ fontWeight: 600 }}>Paradise Valley Open House · Remodeled 4BR Home Tour · $825K</div>
            <div className="tiny mono muted" style={{ marginTop: 4 }}>DESCRIPTION (500ch)</div>
            <div className="tiny" style={{ background:'var(--paper-2)', padding: 6, borderRadius: 4, maxHeight: 52, overflow:'hidden' }}>
              Tour a remodeled 4-bed Paradise Valley home open Sat 4/25 · 11am–1pm. Kitchen renovation, desert landscaping, great schools. #paradisevalleyaz #openhouse #azhomes
            </div>
            <div className="tiny mono muted" style={{ marginTop: 4 }}>BOARD · LINK</div>
            <div className="tiny">→ <b>"Paradise Valley homes"</b> · link: danamartinez.com/88-elm</div>
            <div className="row" style={{ gap: 4, marginTop: 4 }}>
              <Chip sm sage>2:3 aspect ✓</Chip>
              <Chip sm sage>UTM attached</Chip>
              <Chip sm dashed>+ 3 pin variants</Chip>
            </div>
            <div className="tiny muted">Evergreen · still sending leads 6mo after OH</div>
          </div>
        </div>
      </PlatformShell>

      <PlatformShell platform="Pinterest · idea pin" icon="P" scheduled="Blotato · Sat 6am">
        <div className="tiny" style={{ background:'var(--paper-2)', padding: 8, borderRadius: 4 }}>
          <b>"5 things I love about 88 Elm"</b> · 5-slide idea pin · kitchen · backyard · primary suite · schools · price/sqft math
        </div>
        <div className="tiny muted" style={{ marginTop: 4 }}>9:16 · compound saves · taggable (style, area, budget) · drives outbound to listing page</div>
      </PlatformShell>
    </div>
  </Desktop>;
}

// =========================================================
// V5 — Per-platform detail (single platform zoomed in: IG carousel)
// =========================================================
function OHS_V5_PlatformDetail() {
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/social/instagram">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← 88 Elm · social · Instagram feed</div>
        <span className="serif" style={{ fontSize: 22 }}>IG feed carousel</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>← back to all platforms</Btn>
        <Btn sm>preview in IG mock</Btn>
        <Btn sm primary>save + schedule</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 12, alignItems:'flex-start' }}>
      {/* LEFT — carousel editor */}
      <Box className="grow">
        <div className="hand-alt">5 slides · drag to reorder</div>

        <div className="row" style={{ gap: 8, marginTop: 8, overflowX:'auto', paddingBottom: 4 }}>
          {[
            ['1', 'cover poster'],
            ['2', 'kitchen'],
            ['3', 'primary'],
            ['4', 'yard'],
            ['5', 'map + CTA'],
          ].map(([n, label], i) => (
            <div key={i} style={{ width: 140, flexShrink: 0 }}>
              <div style={{ aspectRatio:'1/1', border: i===0?'2px solid var(--accent-sage)':'1px solid var(--line)', borderRadius: 6, background:'var(--paper-2)', position:'relative', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Cormorant Garamond',serif" }}>
                {i===0 ? <div style={{ textAlign:'center' }}><div className="tiny mono">OPEN SAT</div><div style={{ fontSize: 14 }}>88 Elm Ave</div></div>
                  : i===4 ? <div style={{ textAlign:'center' }}><div className="tiny mono">MAP + CTA</div><div className="tiny">"Message for details"</div></div>
                  : <PhotoTile label={label} />}
                <div className="tiny mono" style={{ position:'absolute', top: 4, left: 4, background:'var(--paper)', padding:'1px 4px', borderRadius: 2 }}>{n}/5</div>
              </div>
              <div className="tiny muted" style={{ marginTop: 4, textAlign:'center' }}>{label}</div>
              <div className="row" style={{ gap: 2, justifyContent:'center', marginTop: 2 }}>
                <Btn sm ghost style={{ fontSize: 10 }}>swap</Btn>
                <Btn sm ghost style={{ fontSize: 10 }}>edit text</Btn>
              </div>
            </div>
          ))}
          <div style={{ width: 140, flexShrink: 0, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Btn sm dashed>+ slide</Btn>
          </div>
        </div>

        <Hr />

        <div className="hand-alt">Caption</div>
        <div style={{ background:'var(--paper-2)', padding: 10, borderRadius: 4, border:'1px solid var(--line)', marginTop: 4, lineHeight: 1.7 }}>
          <div>OPEN SATURDAY 11–1 ↓ swipe</div>
          <br />
          <div>This remodeled 4BR in Paradise Valley has the kitchen you've been looking for. Walk-in pantry, clean lines, and the mountain view from the primary is unreal in the morning.</div>
          <br />
          <div>📍 88 Elm Ave, Paradise Valley<br/>💰 $825,000 · 4 bd / 3 ba / 2,420 sf<br/>☕️ Coffee + cookies. No RSVP needed.</div>
          <br />
          <div style={{ opacity: 0.7 }}>#paradisevalleyrealestate #azrealestate #openhouse #homesforsale #paradisevalleyaz #85253</div>
          <br />
          <div style={{ fontSize: 12, opacity: 0.7 }}>Dana Massey · REAL Broker AZ, LLC · DM for details</div>
        </div>
        <div className="row" style={{ gap: 4, marginTop: 6 }}>
          <Btn sm>✦ rewrite — punchier</Btn>
          <Btn sm>✦ rewrite — quieter</Btn>
          <Btn sm>✦ swap hook</Btn>
          <Btn sm ghost>match my voice from Library →</Btn>
        </div>
      </Box>

      {/* RIGHT — schedule + settings */}
      <div className="col" style={{ width: 320, gap: 10, flexShrink: 0 }}>
        <Box accent>
          <div className="hand-alt" style={{ fontSize: 15 }}>Schedule</div>
          <Hr />
          <div className="row between center" style={{ marginTop: 6 }}>
            <span>Publish via</span>
            <div className="row" style={{ gap: 4 }}>
              <Chip sm filled>Blotato</Chip>
              <Chip sm>manual</Chip>
            </div>
          </div>
          <div className="row between center" style={{ marginTop: 6 }}>
            <span>When</span>
            <span className="mono tiny">Fri Apr 24 · 10:00 am</span>
          </div>
          <div className="tiny muted" style={{ marginTop: 2 }}>day before · peak engagement window for your followers</div>
          <Btn sm style={{ background:'var(--paper)', color:'var(--ink)', marginTop: 6 }}>✦ let AI pick best time</Btn>
        </Box>

        <Box>
          <div className="hand-alt tiny">Cross-post to</div>
          <Check checked>Facebook feed (same caption, trimmed)</Check>
          <Check>Threads (shortened)</Check>
          <Check>LinkedIn (professional rewrite)</Check>
        </Box>

        <Box dashed>
          <div className="hand-alt tiny">After it posts</div>
          <Check checked>DM every profile-viewer who isn't following yet</Check>
          <Check checked>Save every commenter to "IG engaged — 88 Elm" CRM tag</Check>
          <Check>Auto-reply DMs with listing link</Check>
        </Box>
      </div>
    </div>
  </Desktop>;
}

// =========================================================
// V6 — Email composer: farm / buyer / SOI audiences
// =========================================================
function OHS_V6_EmailCompose() {
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/email">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← 88 Elm · promotion</div>
        <span className="serif" style={{ fontSize: 22 }}>Email · 3 audiences</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>preview in Gmail</Btn>
        <Btn sm>send test to me</Btn>
        <Btn sm primary>schedule all 3 →</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 12, alignItems:'flex-start' }}>
      {/* LEFT · audience picker + drafts */}
      <Box className="grow">
        <div className="hand-alt">Audiences</div>
        <div className="tiny muted" style={{ marginBottom: 8 }}>three auto-written emails · tone changes per audience</div>

        <div className="col" style={{ gap: 10 }}>
          {/* FARM */}
          <div style={{ padding: 10, border:'2px solid var(--accent-sage)', borderRadius: 6, background:'var(--paper)' }}>
            <div className="row between center">
              <div>
                <div className="hand-alt" style={{ fontSize: 15 }}>1 · Farm · 85253 homeowners</div>
                <div className="tiny muted">1,240 contacts · dropped to this zip 2024 · 42% open rate avg</div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Chip sm filled>active</Chip>
                <Btn sm ghost>change list →</Btn>
              </div>
            </div>
            <Hr />
            <div className="tiny mono muted">SUBJECT</div>
            <div style={{ fontWeight: 600 }}>Your neighbors are curious — 88 Elm opens Saturday</div>
            <div className="tiny mono muted" style={{ marginTop: 6 }}>PREVIEW</div>
            <div className="tiny" style={{ background:'var(--paper-2)', padding: 6, borderRadius: 4 }}>
              Hey {'{first_name}'} — just a heads up that 88 Elm is opening this Saturday 11–1. Paradise Valley is moving quickly this spring, and I thought you might want to peek...
            </div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}>
              <Btn sm>edit content</Btn>
              <Btn sm>edit subject</Btn>
              <Chip sm className="tan">Wed 9am</Chip>
            </div>
          </div>

          {/* BUYERS */}
          <div style={{ padding: 10, border:'1px solid var(--line)', borderRadius: 6, background:'var(--paper)' }}>
            <div className="row between center">
              <div>
                <div className="hand-alt" style={{ fontSize: 15 }}>2 · Active buyers · budget-matched</div>
                <div className="tiny muted">482 contacts · budget $650k–$950k in east valley · 58% open avg</div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Chip sm filled>active</Chip>
                <Btn sm ghost>tighten filter →</Btn>
              </div>
            </div>
            <Hr />
            <div className="tiny mono muted">SUBJECT</div>
            <div style={{ fontWeight: 600 }}>You asked about Paradise Valley — new open this Sat</div>
            <div className="tiny" style={{ background:'var(--paper-2)', padding: 6, borderRadius: 4, marginTop: 4 }}>
              Hey {'{first_name}'} — you told me earlier this year you were keeping an eye on Paradise Valley in the $800k range. 88 Elm just listed and it's opening this Saturday 11–1...
            </div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}>
              <Btn sm>edit content</Btn>
              <Btn sm>edit subject</Btn>
              <Chip sm className="tan">Thu 10am</Chip>
            </div>
          </div>

          {/* SOI */}
          <div style={{ padding: 10, border:'1px solid var(--line)', borderRadius: 6, background:'var(--paper)' }}>
            <div className="row between center">
              <div>
                <div className="hand-alt" style={{ fontSize: 15 }}>3 · Sphere of influence</div>
                <div className="tiny muted">86 contacts · tagged "SOI" · 71% open avg</div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <Chip sm filled>active</Chip>
                <Btn sm ghost>pick list →</Btn>
              </div>
            </div>
            <Hr />
            <div className="tiny mono muted">SUBJECT</div>
            <div style={{ fontWeight: 600 }}>Coffee + a house this Saturday?</div>
            <div className="tiny" style={{ background:'var(--paper-2)', padding: 6, borderRadius: 4, marginTop: 4 }}>
              Hey {'{first_name}'} — opening a house in Paradise Valley this Saturday 11–1 and would love if you popped by. Coffee's on me. If you know anyone curious about the neighborhood, bring 'em...
            </div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}>
              <Btn sm>edit content</Btn>
              <Btn sm>edit subject</Btn>
              <Chip sm className="tan">Fri 8am</Chip>
            </div>
          </div>

          {/* Add another */}
          <Btn sm dashed>+ add another audience (e.g. past clients, renters)</Btn>
        </div>
      </Box>

      {/* RIGHT — email preview */}
      <Box style={{ width: 340, flexShrink: 0, background:'var(--paper)' }}>
        <div className="tiny mono muted">GMAIL PREVIEW · FARM</div>
        <Hr />
        <div className="tiny mono muted">FROM</div>
        <div className="tiny">Dana Massey &lt;dana@danamassey.com&gt;</div>
        <div className="tiny mono muted" style={{ marginTop: 4 }}>SUBJECT</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Your neighbors are curious — 88 Elm opens Saturday</div>

        <div style={{ marginTop: 10, borderRadius: 6, overflow:'hidden', border:'1px solid var(--line)' }}>
          {/* Hero image */}
          <div style={{ aspectRatio:'16/9', background:'linear-gradient(135deg, #D8C2A6, #B79782 60%, #8B9A7B)', position:'relative' }}>
            <div style={{ position:'absolute', bottom: 10, left: 10, right: 10, color:'#EFEDE8', fontFamily:"'Cormorant Garamond',serif" }}>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize: 8, letterSpacing:'0.14em' }}>OPEN SAT · APR 25 · 11–1</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>88 Elm Ave</div>
            </div>
          </div>
          <div style={{ padding: 10, background:'var(--paper)', fontSize: 12, lineHeight: 1.7 }}>
            <div>Hey {'{first_name}'} —</div>
            <div style={{ marginTop: 6 }}>Just a heads up that 88 Elm is opening this Saturday from 11 to 1. It's a 4-bed, 3-bath just around the corner — remodeled kitchen, mountain views, and you'll know what I mean when you walk the yard.</div>
            <div style={{ marginTop: 6 }}>Paradise Valley's moving quickly this spring. If you've been even a little curious about what your neighbors' houses are trading at, this is the easiest look.</div>
            <div style={{ marginTop: 6 }}>Come by whenever — no RSVP needed. I'll have coffee on.</div>
            <div style={{ marginTop: 10 }}><span style={{ padding:'6px 10px', background:'var(--accent)', color:'var(--paper)', borderRadius: 4, fontSize: 11 }}>See the listing →</span></div>
            <div style={{ marginTop: 14, opacity: 0.7, fontSize: 11 }}>Dana Massey · REAL Broker AZ, LLC · 602-XXX-XXXX · Equal housing opportunity</div>
          </div>
        </div>
        <div className="tiny muted" style={{ marginTop: 6 }}>Reply-trackable · unsub link auto-appended · CAN-SPAM compliant</div>
      </Box>
    </div>
  </Desktop>;
}

// =========================================================
// V7 — Print collateral: door hangers, flyers, postcards
// =========================================================
function OHS_V7_Print() {
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/print">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← 88 Elm · promotion</div>
        <span className="serif" style={{ fontSize: 22 }}>Print collateral</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>↓ all as PDF</Btn>
        <Btn sm>shareable link</Btn>
        <Btn sm>Vistaprint</Btn>
        <Btn sm primary>send to title company →</Btn>
      </div>
    </div>

    <div className="tiny muted">Auto-generated from your property info + photos. Every piece is editable. Title co (Marisol · First American) prints free in exchange for co-brand · Vistaprint / MyEDDM / local also pre-wired.</div>

    {/* DOOR HANGERS */}
    <Box>
      <div className="row between center">
        <div>
          <div className="hand-alt">Door hangers</div>
          <div className="tiny muted">4.25" × 11" · front + back · quantity 150</div>
        </div>
        <div className="row" style={{ gap: 4 }}>
          <Btn sm ghost>swap template</Btn>
          <Btn sm>edit copy</Btn>
        </div>
      </div>
      <div className="row" style={{ gap: 12, alignItems:'flex-start', marginTop: 8 }}>
        {/* Front */}
        <div>
          <div className="tiny mono muted" style={{ marginBottom: 4, textAlign:'center' }}>FRONT</div>
          <div style={{ width: 180, height: 470, background:'linear-gradient(155deg, #E9DBC9, #D8C2A6 55%, #B79782)', borderRadius: 6, border:'1px solid var(--line)', position:'relative', fontFamily:"'Cormorant Garamond',serif", color:'#3A2A1E', padding: 16 }}>
            <div style={{ position:'absolute', top: 18, left: 0, right: 0, height: 20, borderBottom:'1px solid rgba(58,42,30,0.3)' }}></div>
            <div style={{ position:'absolute', top: 2, left: '50%', transform:'translateX(-50%)', width: 40, height: 14, border:'1px solid rgba(58,42,30,0.4)', borderRadius: 20 }}></div>
            <div style={{ position:'absolute', top: 55, left: 0, right: 0, textAlign:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize: 8, letterSpacing:'0.22em' }}>✦ YOU'RE INVITED ✦</div>
            <div style={{ position:'absolute', top: 80, left: 16, right: 16, height: 120, background:'rgba(58,42,30,0.14)', borderRadius: 4, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 9, fontFamily:"'IBM Plex Mono',monospace" }}>HERO PHOTO</div>
            <div style={{ position:'absolute', top: 220, left: 0, right: 0, textAlign:'center', fontSize: 10, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:'0.14em' }}>OPEN HOUSE</div>
            <div style={{ position:'absolute', top: 240, left: 0, right: 0, textAlign:'center', fontSize: 18, fontWeight: 500, lineHeight: 1.1 }}>Saturday<br/>April 25</div>
            <div style={{ position:'absolute', top: 300, left: 0, right: 0, textAlign:'center', fontSize: 14 }}>11 am – 1 pm</div>
            <div style={{ position:'absolute', top: 340, left: 12, right: 12, textAlign:'center', fontSize: 14, fontWeight: 500, borderTop:'1px solid rgba(58,42,30,0.3)', paddingTop: 8 }}>88 Elm Ave</div>
            <div style={{ position:'absolute', top: 370, left: 0, right: 0, textAlign:'center', fontSize: 10, opacity: 0.75 }}>Paradise Valley, AZ</div>
            <div style={{ position:'absolute', bottom: 36, left: 12, right: 12, textAlign:'center', fontSize: 12 }}>$825,000 · 4bd · 3ba</div>
            <div style={{ position:'absolute', bottom: 12, left: 0, right: 0, textAlign:'center', fontSize: 7, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:'0.12em' }}>DANA MASSEY · REAL BROKER AZ</div>
          </div>
        </div>
        {/* Back */}
        <div>
          <div className="tiny mono muted" style={{ marginBottom: 4, textAlign:'center' }}>BACK</div>
          <div style={{ width: 180, height: 470, background:'#EFEDE8', borderRadius: 6, border:'1px solid var(--line)', position:'relative', fontFamily:"'Cormorant Garamond',serif", color:'#3A2A1E', padding: 16 }}>
            <div style={{ position:'absolute', top: 0, left: 0, right: 0, height: 38, background:'#3A2A1E' }}></div>
            <div style={{ position:'absolute', top: 50, left: 16, right: 16, textAlign:'center', fontSize: 14 }}>Thinking of selling?</div>
            <div style={{ position:'absolute', top: 80, left: 16, right: 16, textAlign:'center', fontSize: 11, lineHeight: 1.5, opacity: 0.85 }}>Paradise Valley is moving. 12 homes sold over ask this quarter alone.</div>
            <Hr />
            <div style={{ position:'absolute', top: 170, left: 16, right: 16, textAlign:'center', fontFamily:"'IBM Plex Mono',monospace", fontSize: 9, letterSpacing:'0.14em' }}>SCAN FOR VALUE</div>
            <div style={{ position:'absolute', top: 195, left: '50%', transform:'translateX(-50%)', width: 80, height: 80, background:'#EFEDE8', border:'1px solid #3A2A1E', display:'grid', gridTemplateColumns:'repeat(8, 1fr)', padding: 4, gap: 1 }}>
              {[...Array(64)].map((_, i) => <div key={i} style={{ background: Math.random() > 0.5 ? '#3A2A1E':'#EFEDE8' }}></div>)}
            </div>
            <div style={{ position:'absolute', top: 290, left: 16, right: 16, textAlign:'center', fontSize: 9, opacity: 0.75 }}>Instant home value · no signup</div>
            <div style={{ position:'absolute', bottom: 80, left: 16, right: 16, textAlign:'center', fontSize: 13, fontWeight: 500 }}>Dana Massey</div>
            <div style={{ position:'absolute', bottom: 60, left: 16, right: 16, textAlign:'center', fontSize: 10 }}>Realtor · Paradise Valley specialist</div>
            <div style={{ position:'absolute', bottom: 30, left: 16, right: 16, textAlign:'center', fontSize: 9, fontFamily:"'IBM Plex Mono',monospace" }}>602-XXX-XXXX</div>
          </div>
        </div>

        <div className="col grow" style={{ gap: 8 }}>
          <div className="tiny mono muted">DELIVERY PLAN</div>
          <div className="tiny">· walk target · 150 doors in surrounding 3 streets</div>
          <div className="tiny">· delivery day · Fri Apr 24 (day before)</div>
          <div className="tiny">· printed by · Vistaprint · ships 2-day</div>
          <Hr />
          <div className="tiny mono muted">COST</div>
          <div className="tiny">150 × $0.42 = $63 + $8 ship = <b>$71</b></div>
          <div className="row wrap" style={{ gap: 4, marginTop: 4 }}>
            <Btn sm primary>send to title co →</Btn>
            <Btn sm>order via Vistaprint</Btn>
            <Btn sm ghost>use my local printer</Btn>
            <Btn sm ghost>↓ PDFs + shareable link</Btn>
          </div>
          <div className="tiny muted" style={{ marginTop: 4 }}>
            Title co prints free for you (co-branded). Link expires in 30 days · no login needed on their end.
          </div>
        </div>
      </div>
    </Box>

    {/* TITLE COMPANY HANDOFF */}
    <Box accent>
      <div className="row between center">
        <div>
          <div className="hand-alt" style={{ fontSize: 15 }}>◆ Send to title company · co-branded print</div>
          <div className="tiny" style={{ opacity: 0.85 }}>Your title rep prints flyers, postcards, and door hangers for free in exchange for logo placement. We handle the handoff.</div>
        </div>
        <Chip sm style={{ background:'var(--paper)', borderColor:'var(--accent-sage)' }}>✓ 3 reps linked</Chip>
      </div>
      <Hr />
      <div className="row" style={{ gap: 10, alignItems:'flex-start' }}>
        {/* Rep picker */}
        <div style={{ flex: 1 }}>
          <div className="tiny mono" style={{ opacity: 0.7 }}>PICK A REP</div>
          <div className="col" style={{ gap: 4, marginTop: 4 }}>
            <div className="row between center" style={{ padding: 6, background:'var(--paper)', borderRadius: 4, border:'2px solid var(--accent-sage)' }}>
              <div>
                <div style={{ fontWeight: 500, color:'var(--ink)' }}>Marisol Reyes · First American</div>
                <div className="tiny" style={{ color:'var(--muted)' }}>prints within 48h · she covers up to $200/mo · last used 2 weeks ago</div>
              </div>
              <Chip sm filled>selected</Chip>
            </div>
            <div className="row between center" style={{ padding: 6, background:'var(--paper)', borderRadius: 4, border:'1px solid var(--line)' }}>
              <div>
                <div style={{ fontWeight: 500, color:'var(--ink)' }}>Tom Beck · Chicago Title</div>
                <div className="tiny" style={{ color:'var(--muted)' }}>prints within 24h · no monthly cap · prefers EDDM volumes</div>
              </div>
              <Btn sm ghost>use instead</Btn>
            </div>
            <div className="row between center" style={{ padding: 6, background:'var(--paper)', borderRadius: 4, border:'1px solid var(--line)' }}>
              <div>
                <div style={{ fontWeight: 500, color:'var(--ink)' }}>Priya Shah · Old Republic</div>
                <div className="tiny" style={{ color:'var(--muted)' }}>5-day turnaround · best for buyer packets</div>
              </div>
              <Btn sm ghost>use instead</Btn>
            </div>
            <Btn sm dashed>+ add another rep</Btn>
          </div>
        </div>

        {/* What's in the handoff */}
        <div style={{ flex: 1 }}>
          <div className="tiny mono" style={{ opacity: 0.7 }}>WHAT MARISOL GETS</div>
          <div className="col" style={{ gap: 4, marginTop: 4, padding: 10, background:'var(--paper)', borderRadius: 6 }}>
            <div className="tiny" style={{ color:'var(--muted)' }}>🔗 One link · print-ready PDFs · no login</div>
            <Hr />
            <Check checked>Door hangers · 150 · front+back · $71 est</Check>
            <Check checked>Flyers · 200 · 2-sided · $48 est</Check>
            <Check checked>Just-listed postcards · 1,240 EDDM · $310 est</Check>
            <Check>Buyer packet · 8pg · $180 est</Check>
            <Hr />
            <div className="tiny" style={{ color:'var(--muted)' }}><b>Co-branding:</b> Marisol's logo + NMLS on back · your logo + license on front</div>
            <div className="tiny" style={{ color:'var(--muted)' }}><b>Ship to:</b> your office · arrives Wed Apr 23 · tracking auto-forwards to your phone</div>
            <div className="tiny" style={{ color:'var(--muted)' }}><b>Total est:</b> $429 · <i>$0 to you</i></div>
          </div>
        </div>

        {/* Draft — open to edit before sending */}
        <div style={{ flex: 1 }}>
          <div className="row between center">
            <div className="tiny mono" style={{ opacity: 0.7 }}>DRAFT · EDIT BEFORE SENDING</div>
            <Chip sm style={{ background:'var(--paper)' }}>not sent</Chip>
          </div>
          <div style={{ background:'var(--paper)', borderRadius: 6, marginTop: 4, border:'1px dashed var(--line)' }}>
            <div style={{ padding: 8, borderBottom:'1px solid var(--line)', fontSize: 11 }}>
              <div className="row between"><span style={{ color:'var(--muted)' }}>to</span><span style={{ color:'var(--ink)' }}>marisol.reyes@firstam.com · 602-XXX-XXXX (SMS)</span></div>
              <div className="row between" style={{ marginTop: 2 }}><span style={{ color:'var(--muted)' }}>subject</span><span style={{ color:'var(--ink)' }}>New OH print pack · 88 Elm · need by Wed</span></div>
              <div className="row between" style={{ marginTop: 2 }}><span style={{ color:'var(--muted)' }}>attach</span><span style={{ color:'var(--ink)' }}>🔗 command.app/print/t/8f2a · expires in 30d</span></div>
            </div>
            <div style={{ padding: 10, fontSize: 12, color:'var(--ink)', lineHeight: 1.6, background:'var(--paper)' }} contentEditable suppressContentEditableWarning>
              Hi Marisol — new OH at 88 Elm (Paradise Valley, Sat Apr 25). Sending the co-branded print pack.<br/><br/>
              Need it at my office by Wed if possible. Thanks!
              <div className="tiny" style={{ color:'var(--muted)', marginTop: 4, borderTop:'1px dashed var(--line)', paddingTop: 4 }}>✎ editable · tap to change</div>
            </div>
          </div>
          <div className="col" style={{ gap: 4, marginTop: 8 }}>
            <Btn sm style={{ background:'var(--paper)', color:'var(--ink)' }}>preview the link →</Btn>
            <Btn sm style={{ background:'var(--paper)', color:'var(--ink)' }}>swap template · short / formal</Btn>
            <Btn primary>open in composer to edit + send →</Btn>
          </div>
          <div className="tiny" style={{ opacity: 0.75, marginTop: 6 }}>draft saves as you type · nothing sends until you hit send in the composer · logged to Marisol's vendor scorecard only after send</div>
        </div>
      </div>
    </Box>

    {/* FLYER + POSTCARD + PACKET */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12 }}>
      <Box>
        <div className="hand-alt">Flyer · 8.5 × 11</div>
        <div className="tiny muted">2-sided · MLS-feed photos · QR to listing</div>
        <div style={{ aspectRatio:'8.5/11', background:'linear-gradient(155deg, #E9DBC9, #B79782)', borderRadius: 4, border:'1px solid var(--line)', marginTop: 6, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Cormorant Garamond',serif", fontSize: 14 }}>88 Elm · OPEN SAT</div>
        <div className="row" style={{ gap: 4, marginTop: 6 }}>
          <Btn sm>preview</Btn>
          <Btn sm>edit</Btn>
          <Btn sm ghost>↓ PDF</Btn>
        </div>
      </Box>
      <Box>
        <div className="hand-alt">Just-listed postcard · 6 × 9</div>
        <div className="tiny muted">EDDM-ready · 1,240 · zip 85253</div>
        <div style={{ aspectRatio:'9/6', background:'#EFEDE8', border:'1px solid var(--line)', borderRadius: 4, marginTop: 6, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Cormorant Garamond',serif", fontSize: 13 }}>JUST LISTED</div>
        <div className="row" style={{ gap: 4, marginTop: 6 }}>
          <Btn sm>preview</Btn>
          <Btn sm>edit</Btn>
          <Btn sm ghost>EDDM wizard →</Btn>
        </div>
      </Box>
      <Box>
        <div className="hand-alt">Buyer packet · 8 pg</div>
        <div className="tiny muted">photos · specs · neighborhood · financing</div>
        <div style={{ aspectRatio:'8.5/11', background:'var(--paper-2)', border:'1px solid var(--line)', borderRadius: 4, marginTop: 6, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Cormorant Garamond',serif", fontSize: 12 }}>8-pg packet</div>
        <div className="row" style={{ gap: 4, marginTop: 6 }}>
          <Btn sm>preview</Btn>
          <Btn sm>edit</Btn>
          <Btn sm ghost>↓ PDF</Btn>
        </div>
      </Box>
    </div>
  </Desktop>;
}

// =========================================================
// V8 — Blotato schedule view · kanban by day
// =========================================================
function OHS_V8_Schedule() {
  const days = [
    { day: 'TUE · Apr 21', items: [['LinkedIn', '8:00 am', 'Blotato · queued']] },
    { day: 'WED · Apr 22', items: [['✉ Farm email', '9:00 am', 'scheduled']] },
    { day: 'THU · Apr 23', items: [['TikTok', '6:00 pm', 'Blotato · queued'], ['✉ Buyer email', '10:00 am', 'scheduled']] },
    { day: 'FRI · Apr 24', items: [['IG feed carousel', '10:00 am', 'Blotato · queued'], ['FB feed', '10:00 am', 'Blotato · queued'], ['Threads', '10:00 am', 'Blotato · queued'], ['✉ SOI email', '8:00 am', 'scheduled'], ['Door hangers · walk', 'afternoon', 'reminder']] },
    { day: 'SAT · Apr 25', items: [['IG story', '8:00 am', 'Blotato · queued'], ['Nextdoor post', '9:00 am', 'manual reminder'], ['FB Marketplace', '9:00 am', 'manual reminder'], ['🏡 OPEN HOUSE', '11:00 am', 'live']] },
  ];
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/schedule">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← 88 Elm · promotion</div>
        <span className="serif" style={{ fontSize: 22 }}>Publish schedule · week of Apr 21</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>list view</Btn>
        <Btn sm filled>week</Btn>
        <Btn sm primary>send everything to Blotato</Btn>
      </div>
    </div>

    <Box dashed>
      <div className="row between center">
        <div className="hand-alt tiny">Connected: Blotato</div>
        <div className="row" style={{ gap: 4 }}>
          <Chip sm style={{ background:'var(--accent-sage-soft,#EEF1E9)', borderColor:'var(--accent-sage)' }}>✓ linked</Chip>
          <span className="tiny muted">IG · FB · TikTok · LinkedIn · Threads</span>
        </div>
      </div>
    </Box>

    {/* Week grid */}
    <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 8 }}>
      {days.map(d => (
        <Box key={d.day} style={{ minHeight: 260 }}>
          <div className="hand-alt tiny">{d.day}</div>
          <Hr />
          <div className="col" style={{ gap: 6 }}>
            {d.items.map((it, i) => (
              <div key={i} style={{ padding: 6, background:'var(--paper-2)', borderRadius: 4, border:'1px solid var(--line)' }}>
                <div className="tiny" style={{ fontWeight: 500 }}>{it[0]}</div>
                <div className="tiny muted">{it[1]}</div>
                <Chip sm>{it[2]}</Chip>
              </div>
            ))}
          </div>
          <Btn sm dashed style={{ marginTop: 8, width:'100%' }}>+ add</Btn>
        </Box>
      ))}
    </div>

    <Box>
      <div className="hand-alt">Manual post reminders</div>
      <div className="tiny muted" style={{ marginBottom: 6 }}>for Nextdoor + FB Marketplace (no API). We'll ping you and pre-copy content to clipboard.</div>
      <div className="col" style={{ gap: 4 }}>
        <div className="row between center" style={{ padding: 6, background:'var(--paper-2)', borderRadius: 4 }}>
          <div>
            <div className="tiny" style={{ fontWeight: 500 }}>Nextdoor post · 88 Elm</div>
            <div className="tiny muted">Sat Apr 25 · 9:00 am · push notification + caption copied</div>
          </div>
          <Btn sm ghost>edit →</Btn>
        </div>
        <div className="row between center" style={{ padding: 6, background:'var(--paper-2)', borderRadius: 4 }}>
          <div>
            <div className="tiny" style={{ fontWeight: 500 }}>FB Marketplace · 88 Elm</div>
            <div className="tiny muted">Sat Apr 25 · 9:00 am · push notification + fields copied</div>
          </div>
          <Btn sm ghost>edit →</Btn>
        </div>
      </div>
    </Box>
  </Desktop>;
}

// =========================================================
// V9 — Mobile morning-of · "time to post Nextdoor + Marketplace"
// =========================================================
function OHS_V9_MobileMorningOf() {
  return <Phone tabbarItems={[{label:'Home', active:true},{label:'Prospect'},{label:'CRM'},{label:'Deals'},{label:'More'}]}>
    <Box accent>
      <div className="tiny mono" style={{ opacity: 0.8 }}>9:00 AM · YOUR OPEN HOUSE IN 2H</div>
      <div className="serif" style={{ fontSize: 18 }}>Time to post to Nextdoor + Marketplace</div>
      <div className="tiny" style={{ opacity: 0.88 }}>Everything else already auto-posted via Blotato. Two taps each — you're done.</div>
    </Box>

    <Box>
      <div className="hand-alt" style={{ fontSize: 14 }}>◆ Nextdoor</div>
      <div className="tiny muted">caption copied to clipboard · image saved to photos</div>
      <div className="row" style={{ gap: 4, marginTop: 8 }}>
        <Btn sm>↓ save image</Btn>
        <Btn sm>copy caption</Btn>
        <Btn sm primary>open Nextdoor →</Btn>
      </div>
      <Hr />
      <Check>I posted it ✓</Check>
    </Box>

    <Box>
      <div className="hand-alt" style={{ fontSize: 14 }}>◆ FB Marketplace</div>
      <div className="tiny muted">fields copied · image saved</div>
      <div className="row" style={{ gap: 4, marginTop: 8 }}>
        <Btn sm>↓ save image</Btn>
        <Btn sm>copy fields</Btn>
        <Btn sm primary>open Marketplace →</Btn>
      </div>
      <Hr />
      <Check>I posted it ✓</Check>
    </Box>

    <Box dashed>
      <div className="hand-alt tiny">Already live via Blotato (auto)</div>
      <div className="tiny" style={{ marginTop: 4 }}>
        ✓ IG feed · posted 10am Fri<br/>
        ✓ IG story · posted 8am today<br/>
        ✓ FB feed · posted 10am Fri<br/>
        ✓ TikTok · posted 6pm Thu<br/>
        ✓ LinkedIn · posted 8am Tue<br/>
        ✓ Threads · posted 10am Fri
      </div>
    </Box>

    <Box filled>
      <div className="hand-alt" style={{ fontSize: 14 }}>Engagement so far</div>
      <div className="tiny" style={{ marginTop: 4 }}>
        · 12 DMs from IG · <u>reply now</u><br/>
        · 8 RSVPs from farm email<br/>
        · 34 views on Nextdoor post (day-before post)<br/>
        · 2 warm leads auto-tagged "88 Elm · interested"
      </div>
      <Btn sm style={{ marginTop: 6 }}>see everyone coming →</Btn>
    </Box>
  </Phone>;
}

// =========================================================
// V10 — Results: what each channel drove (after the OH)
// =========================================================
function OHS_V10_Results() {
  const rows = [
    ['◆ Nextdoor',        '34 views',  '6 clicks',  '3 signed',  'direct neighbor'],
    ['◆ FB Marketplace',  '128 views', '11 saves',  '4 signed',  'buyer inquiry'],
    ['◆ IG feed',         '2.1k reach','42 DMs',    '2 signed',  'IG-tagged CRM'],
    ['◆ IG story',        '418 views', '18 taps',   '1 signed',  'swipe-up converted'],
    ['◆ FB feed',         '1.8k reach','12 rxns',   '2 signed',  '—'],
    ['◆ TikTok',          '8.4k views','38 comms',  '0 signed',  'brand awareness'],
    ['◆ LinkedIn',        '412 views', '7 likes',   '1 signed',  'agent referral'],
    ['◆ Threads',         '280 views', '3 reps',    '1 signed',  '—'],
    ['✉ Farm email',      '1,240 sent','42% open',  '8 signed',  'biggest driver'],
    ['✉ Buyer email',     '482 sent',  '58% open',  '4 signed',  'budget-matched'],
    ['✉ SOI email',       '86 sent',   '71% open',  '2 signed',  'sphere ref'],
    ['📄 Door hangers',   '150 walked','—',         '5 signed',  'highest-intent'],
    ['📄 Postcard · EDDM','1,240',     '—',         '2 signed',  'slow burn'],
  ];
  return <Desktop active="Open House" url="command.app/openhouse/88-elm/results">
    <div className="row between center">
      <div>
        <div className="hand-neat tiny muted">← 88 Elm · Sat Apr 25 · debrief</div>
        <span className="serif" style={{ fontSize: 22 }}>Where the 34 sign-ins came from</span>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Btn sm>export CSV</Btn>
        <Btn sm primary>use this learning on next OH →</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 8 }}>
      <Box className="grow" accent><div className="tiny mono" style={{ opacity: 0.8 }}>SIGN-INS</div><div className="serif" style={{ fontSize: 28 }}>34</div></Box>
      <Box className="grow"><div className="tiny mono muted">TOTAL REACH</div><div className="serif" style={{ fontSize: 22 }}>16.2k</div></Box>
      <Box className="grow"><div className="tiny mono muted">LEADS CAPTURED</div><div className="serif" style={{ fontSize: 22 }}>21</div></Box>
      <Box className="grow"><div className="tiny mono muted">COST</div><div className="serif" style={{ fontSize: 22 }}>$148</div><div className="tiny muted">$7.04 / lead</div></Box>
    </div>

    <Box>
      <div className="row between center">
        <div className="hand-alt">Attribution by channel</div>
        <div className="tiny muted">sourced from OH sign-in "how did you hear" · cross-referenced w/ CRM tags</div>
      </div>
      <Hr />
      <table style={{ width:'100%', fontSize: 12 }}>
        <thead>
          <tr style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize: 10, letterSpacing:'0.1em', color:'var(--muted)', textAlign:'left' }}>
            <th>CHANNEL</th><th>REACH</th><th>ENGAGED</th><th>SIGN-INS</th><th>NOTE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop:'1px solid var(--line)' }}>
              <td style={{ padding:'6px 4px', fontWeight: 500 }}>{r[0]}</td>
              <td style={{ padding:'6px 4px' }}>{r[1]}</td>
              <td style={{ padding:'6px 4px' }}>{r[2]}</td>
              <td style={{ padding:'6px 4px' }}><b>{r[3]}</b></td>
              <td style={{ padding:'6px 4px', color:'var(--muted)' }}>{r[4]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Box>

    <Box dashed>
      <div className="hand-alt tiny">What Command learned</div>
      <div className="tiny" style={{ lineHeight: 1.7 }}>
        · Farm email was your single biggest driver — 8 sign-ins. Next OH, publish 2 days before instead of 1.<br/>
        · Door hangers drove 5 high-intent sign-ins (3 of them converted to showings). Keep doing these.<br/>
        · TikTok got 8.4k views but 0 sign-ins. Brand awareness only — consider reducing frequency.<br/>
        · Nextdoor + FB Marketplace deserve more effort — high conversion per view.<br/>
        <i>Applied to future OH templates automatically. You can override in Settings → Templates.</i>
      </div>
    </Box>
  </Desktop>;
}

window.OpenHouseSocialScreens = [
  { id:'ohs1', label:'V1 · Wizard · property + photos',        caption:'Step 1 of 3. MLS # auto-fills. Shows what will be generated (15 assets).', Component: OHS_V1_WizardSetup },
  { id:'ohs2', label:'V2 · Wizard · photo upload',              caption:'Step 2 of 3. Upload/MLS-pull/drag photos. AI picks one per output · override anything.', Component: OHS_V2_PhotoUpload },
  { id:'ohs3', label:'V3 · Wizard · review + generate',         caption:'Step 3 of 3. All 15 assets listed with schedule. Compliance checks. Generate all.', Component: OHS_V3_ReviewAll },
  { id:'ohs4', label:'V4 · Social · all 10 platforms',          caption:'Per-platform previews: Nextdoor, Marketplace, IG feed, IG story, FB, TikTok, LinkedIn, Threads, Pinterest pin, Pinterest idea pin.', Component: OHS_V4_SocialGrid },
  { id:'ohs5', label:'V5 · Social · IG carousel detail',        caption:'Zoom into one platform. 5-slide editor, caption AI rewrites, schedule via Blotato, cross-post toggles.', Component: OHS_V5_PlatformDetail },
  { id:'ohs6', label:'V6 · Email · 3 audiences',                caption:'Farm (1,240) + Buyers (482) + SOI (86). Different tone per audience. Gmail preview.', Component: OHS_V6_EmailCompose },
  { id:'ohs7', label:'V7 · Print collateral',                   caption:'Door hangers (front+back), flyer, just-listed postcard, buyer packet. Order via Vistaprint/EDDM.', Component: OHS_V7_Print },
  { id:'ohs8', label:'V8 · Publish schedule',                   caption:'Week view · everything queued to Blotato · manual-post reminders for Nextdoor+Marketplace.', Component: OHS_V8_Schedule },
  { id:'ohs9', label:'V9 · Mobile · morning-of prompts',        caption:'Day of OH on mobile. Two taps to post the manual channels. Live engagement feed.', Component: OHS_V9_MobileMorningOf },
  { id:'ohs10',label:'V10 · Results · attribution',             caption:'After the OH: where every sign-in came from. Cost per lead. What Command learned for next time.', Component: OHS_V10_Results },
];

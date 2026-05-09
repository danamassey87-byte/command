/* ============================================================
   RELATIONSHIPS · social tracking · family · co-buyers
   Extensions to Contact + Deal objects
   ============================================================ */

const SOCIAL_PLATFORMS = [
  { key: 'ig',   name: 'Instagram',   handle: 'example_handle' },
  { key: 'fb',   name: 'Facebook',    handle: 'j.ortiz.44' },
  { key: 'li',   name: 'LinkedIn',    handle: 'in/jortiz' },
  { key: 'tt',   name: 'TikTok',      handle: '@jenortiz' },
  { key: 'x',    name: 'X / Twitter', handle: '@jen_o' },
  { key: 'yt',   name: 'YouTube',     handle: '@jenortizhome' },
  { key: 'th',   name: 'Threads',     handle: '@jenortiz' },
  { key: 'nd',   name: 'Nextdoor',    handle: 'Jen O. · Oak Park' },
  { key: 'zl',   name: 'Zillow',      handle: 'jen.ortiz.agent' },
];

function SocialRow({ platform, handle, following, friend, verified, onClick }) {
  return <div className="row" style={{ gap: 8, padding: '6px 0', borderTop: '1px dashed var(--faint)', alignItems: 'center', fontSize: 12 }}>
    <span style={{ width: 90, fontWeight: 600 }}>{platform}</span>
    <span className="mono muted" style={{ flex: 1, fontSize: 11 }}>{handle || <span style={{ opacity: 0.4 }}>not linked</span>}</span>
    <div className="row" style={{ gap: 4 }}>
      {verified && <Chip sm style={{ fontSize: 9, padding: '1px 5px' }}>✓ matched</Chip>}
      {following && <Chip sm filled style={{ fontSize: 9, padding: '1px 5px', background: 'var(--accent-sage)', color: 'var(--paper)', border: 'none' }}>following</Chip>}
      {friend && <Chip sm filled style={{ fontSize: 9, padding: '1px 5px', background: 'var(--accent-tan)', color: 'var(--paper)', border: 'none' }}>friends</Chip>}
      {!handle && <button style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', border: '1px dashed var(--line)', cursor: 'pointer' }}>+ find</button>}
    </div>
  </div>;
}

/* ====================== V1 · CONTACT PROFILE · SOCIAL SECTION ====================== */
function Rel1_SocialProfiles() {
  const rows = [
    ['Instagram',  '@jen_ortiz',        true,  true,  true],
    ['Facebook',   'jen.ortiz.44',       false, true,  true],
    ['LinkedIn',   'in/jortiz',          true,  false, true],
    ['TikTok',     '@jenortizhome',      false, false, true],
    ['X / Twitter','@jen_o',             false, false, false],
    ['YouTube',    '',                   false, false, false],
    ['Threads',    '@jenortiz',          true,  false, true],
    ['Nextdoor',   'Jen O. · Oak Park',  false, true,  true],
    ['Zillow',     'jen.ortiz.buyer',    false, false, true],
  ];

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Jen Ortiz · contact" url="command.app/crm/jen-ortiz#social" style={{ width: 940 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">CONTACT · past client · closed Mar 24</div>
          <div className="serif" style={{ fontSize: 24 }}>Jen Ortiz</div>
          <div className="tiny muted">42 · married to Carlos · 2 kids · Oak Park · referral from Pattersons</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>overview</Btn>
          <Btn sm primary>social</Btn>
          <Btn sm>family</Btn>
          <Btn sm>activity</Btn>
          <Btn sm>deals</Btn>
          <Btn sm>notes</Btn>
        </div>
      </div>

      <div className="row" style={{ gap: 14, marginTop: 14, alignItems: 'flex-start' }}>
        <Box style={{ flex: 1.3, padding: 14 }}>
          <div className="row between center">
            <div className="hand-alt tiny">SOCIAL PROFILES · 9 platforms</div>
            <Btn sm>⎘ auto-find more</Btn>
          </div>
          <div style={{ marginTop: 8 }}>
            {rows.map((r, i) => (
              <SocialRow key={i} platform={r[0]} handle={r[1]} following={r[2]} friend={r[3]} verified={r[4]} />
            ))}
          </div>

          <Box tan style={{ marginTop: 12, padding: 10 }}>
            <div className="tiny mono">✦ AI FOUND</div>
            <div className="tiny" style={{ marginTop: 4 }}>Likely Jen on <b>Pinterest</b> (@jenortizdesign · 23 mutual follows, Oak Park pins) and <b>Strava</b> (@jen-o-runs · matches friend graph). Confirm to add?</div>
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              <Btn sm primary>add both</Btn>
              <Btn sm>just Pinterest</Btn>
              <Btn sm>ignore</Btn>
            </div>
          </Box>
        </Box>

        <div style={{ width: 300 }}>
          <Box style={{ padding: 12 }}>
            <div className="hand-alt tiny">RELATIONSHIP STATUS</div>
            <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.9 }}>
              <div className="row between">following on <b>3 platforms</b></div>
              <div className="row between">friends on <b>3 platforms</b></div>
              <div className="row between">she follows you on <b>5</b></div>
              <div className="row between">last DM <span className="muted">Mar 12 · IG</span></div>
              <div className="row between">last like <span className="muted">Apr 19 · on your reel</span></div>
            </div>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">ENGAGEMENT SIGNAL</div>
            <div className="tiny" style={{ marginTop: 4 }}>Jen has liked your last 4 posts and shared your listing reel to her story. <b>Warm and active — good testimonial candidate.</b></div>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">HYGIENE</div>
            <div className="tiny" style={{ marginTop: 4 }}>3 platforms she's on that you're <b>not following back</b> — follow her back from here to stay balanced.</div>
            <Btn sm block style={{ marginTop: 6 }}>follow back on 3</Btn>
          </Box>
        </div>
      </div>
    </Desktop>

    <div style={{ maxWidth: 240, paddingTop: 20 }}>
      <div className="hand-alt">Social profiles per contact</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>9 platforms tracked. For each: is she there, are you following, are you friends, is the match verified. AI suggests new ones from mutual signals.</p>
    </div>
  </div>;
}

/* ====================== V2 · FAMILY SECTION (rich) ====================== */
function Rel2_Family() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Jen Ortiz · family" url="command.app/crm/jen-ortiz#family" style={{ width: 940 }}>
      <div className="hand-alt tiny">CONTACT · family · who else matters</div>
      <div className="serif" style={{ fontSize: 22 }}>The people around Jen</div>

      {/* Spouse card — links to own contact */}
      <Box style={{ marginTop: 14, padding: 14 }}>
        <div className="row between center">
          <div className="hand-alt tiny">SPOUSE / PARTNER</div>
          <Btn sm>⎘ open Carlos's profile →</Btn>
        </div>
        <div className="row" style={{ gap: 14, marginTop: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: 'var(--accent-tan)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontFamily: "'Caveat',cursive" }}>CO</div>
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.8 }}>
            <div className="serif" style={{ fontSize: 18 }}>Carlos Ortiz</div>
            <div className="row" style={{ gap: 16 }}>
              <span><b>44</b> <span className="muted">· 2 yrs older than Jen</span></span>
              <span><b>civil engineer</b> <span className="muted">· city planning</span></span>
              <span><b>415-555-0119</b></span>
            </div>
            <div className="muted tiny">carlos.ortiz@example.com · IG @carlos_ortiz_cycles · decision-maker on big purchases</div>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <Chip sm>co-signer on mortgage</Chip>
              <Chip sm>following on IG</Chip>
              <Chip sm>cyclist · runs Sunday</Chip>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 16, marginTop: 14, padding: 10, background: 'var(--tint)', borderRadius: 4 }}>
          <div className="tiny" style={{ flex: 1 }}><b>Wedding anniversary</b><div className="muted">Jun 14 · celebrating 16 yrs</div></div>
          <div className="tiny" style={{ flex: 1 }}><b>Carlos birthday</b><div className="muted">Oct 3 · turning 45</div></div>
          <div className="tiny" style={{ flex: 1 }}><b>Jen birthday</b><div className="muted">Feb 22 · next in 304d</div></div>
        </div>
      </Box>

      {/* Kids */}
      <Box style={{ marginTop: 10, padding: 14 }}>
        <div className="row between center">
          <div className="hand-alt tiny">KIDS · 2</div>
          <Btn sm>+ add kid</Btn>
        </div>

        <div className="row" style={{ gap: 10, marginTop: 10 }}>
          {[
            ['Mateo',  'son',      14,  'Sep 09 · 8th grade',    'soccer · gamer · gets a bike for 15'],
            ['Luna',   'daughter', 11,  'Mar 18 · 5th grade',    'ballet · bookworm · afraid of dogs'],
          ].map((k, i) => (
            <Box key={i} dashed style={{ padding: 10, flex: 1 }}>
              <div className="row between">
                <b>{k[0]}</b>
                <span className="tiny muted">{k[1]} · {k[2]}</span>
              </div>
              <div className="tiny muted" style={{ marginTop: 2 }}>{k[3]}</div>
              <div className="tiny" style={{ marginTop: 4, fontFamily: "'Caveat',cursive", fontSize: 13 }}>{k[4]}</div>
            </Box>
          ))}
        </div>
      </Box>

      {/* Pets */}
      <Box style={{ marginTop: 10, padding: 14 }}>
        <div className="row between center">
          <div className="hand-alt tiny">PETS · 2</div>
          <Btn sm>+ add pet</Btn>
        </div>
        <div className="row" style={{ gap: 10, marginTop: 10 }}>
          {[['Biscuit', 'labrador', '7 yrs', 'loves trail walks'], ['Mochi', 'cat', '4 yrs', 'indoor · photogenic']].map((p, i) => (
            <Box key={i} dashed style={{ padding: 10, flex: 1 }}>
              <b>{p[0]}</b> <span className="tiny muted">· {p[1]} · {p[2]}</span>
              <div className="tiny muted" style={{ marginTop: 2 }}>{p[3]}</div>
            </Box>
          ))}
        </div>
      </Box>

      {/* Extended family */}
      <Box style={{ marginTop: 10, padding: 14 }}>
        <div className="row between center">
          <div className="hand-alt tiny">EXTENDED · parents / siblings / close friends</div>
          <Btn sm>+ add person</Btn>
        </div>
        <div style={{ marginTop: 8 }}>
          {[
            ['Marta Ortiz',       'mother-in-law',  '72',  'Tucson · visits twice/yr · likely future seller'],
            ['Renata Alvarez',    'Jen\'s sister',  '39',  'Phoenix · referred Jen to you · good will'],
            ['David + Kim',       'best friends',   '—',   'also clients · closed Dec 2023'],
          ].map((p, i) => (
            <div key={i} className="row" style={{ padding: '8px 0', borderTop: '1px dashed var(--faint)', fontSize: 12, alignItems: 'center' }}>
              <b style={{ width: 170 }}>{p[0]}</b>
              <span style={{ width: 120 }} className="tiny muted">{p[1]}</span>
              <span style={{ width: 40 }} className="tiny muted">{p[2]}</span>
              <span style={{ flex: 1 }} className="tiny">{p[3]}</span>
              <button style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', border: '1px dashed var(--line)', cursor: 'pointer' }}>→ profile</button>
            </div>
          ))}
        </div>
      </Box>

      {/* Important dates roll-up */}
      <Box tan style={{ marginTop: 12, padding: 14 }}>
        <div className="hand-alt tiny">✦ ALL IMPORTANT DATES · ROLLED UP</div>
        <div style={{ marginTop: 8 }}>
          {[
            ['Jun 14', 'Jen + Carlos · 16th anniversary',   'send card · week before'],
            ['Sep 09', 'Mateo\'s 15th birthday',             'bike-themed card'],
            ['Mar 18', 'Luna\'s 12th birthday',              'book recs from Carlos'],
            ['Feb 22', 'Jen\'s 43rd birthday',               'flowers · she loves peonies'],
            ['Oct 03', 'Carlos\'s 45th birthday',            'cycling journal gift'],
            ['Mar 24', 'Home-closing anniversary',          'tax-season CMA + equity check'],
          ].map((d, i) => (
            <div key={i} className="row" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12, alignItems: 'center' }}>
              <span style={{ width: 60 }} className="mono tiny">{d[0]}</span>
              <span style={{ flex: 1 }}>{d[1]}</span>
              <span className="tiny muted" style={{ fontFamily: "'Caveat',cursive", fontSize: 13 }}>{d[2]}</span>
            </div>
          ))}
        </div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Family · richly</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Spouse is a full contact (linked). Kids, pets, extended. Every important date rolls up to the reminder engine — anniversaries, birthdays, closing anniversary.</p>
    </div>
  </div>;
}

/* ====================== V3 · ADD/EDIT CONTACT FORM ====================== */
function Rel3_EditForm() {
  const field = (label, val, hint) => (
    <Box dashed style={{ padding: 8, marginBottom: 6 }}>
      <div className="tiny mono" style={{ color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: 13, marginTop: 2 }}>{val || <span style={{ opacity: 0.4 }}>—</span>}</div>
      {hint && <div className="tiny muted" style={{ marginTop: 2 }}>{hint}</div>}
    </Box>
  );

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Edit contact · Jen Ortiz" url="command.app/crm/jen-ortiz/edit" style={{ width: 940 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">EDIT CONTACT · autosaves</div>
          <div className="serif" style={{ fontSize: 22 }}>Jen Ortiz</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>cancel</Btn>
          <Btn sm primary>done</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 4, marginTop: 12, borderBottom: '1px dashed var(--faint)', paddingBottom: 4 }}>
        {['basics', 'social · 9', 'family · 5', 'address · 1', 'tags · 12', 'custom · 3'].map((t, i) => (
          <button key={i} style={{ padding: '4px 10px', fontSize: 11, background: i === 1 ? 'var(--ink)' : 'transparent', color: i === 1 ? 'var(--paper)' : 'var(--ink)', border: 'none', cursor: 'pointer' }}>{t}</button>
        ))}
      </div>

      {/* Social tab content */}
      <div className="row" style={{ gap: 14, marginTop: 14, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="hand-alt tiny">SOCIAL PROFILES</div>
          {[
            ['Instagram',   '@jen_ortiz',        true,  true],
            ['Facebook',    'jen.ortiz.44',       false, true],
            ['LinkedIn',    'in/jortiz',          true,  false],
            ['TikTok',      '@jenortizhome',      false, false],
            ['X / Twitter', '@jen_o',             false, false],
            ['YouTube',     '',                   false, false],
            ['Threads',     '@jenortiz',          true,  false],
            ['Nextdoor',    'Jen O. · Oak Park',  false, true],
            ['Zillow',      'jen.ortiz.buyer',    false, false],
          ].map((r, i) => (
            <div key={i} className="row" style={{ gap: 8, padding: '8px 0', borderTop: '1px dashed var(--faint)', alignItems: 'center', fontSize: 12 }}>
              <span style={{ width: 90, fontSize: 11 }}>{r[0]}</span>
              <Box dashed style={{ flex: 1, padding: '4px 8px', fontSize: 11, fontFamily: 'monospace' }}>{r[1] || <span style={{ opacity: 0.4 }}>paste link or handle</span>}</Box>
              <label className="row" style={{ gap: 4, alignItems: 'center', fontSize: 10, cursor: 'pointer' }}>
                <span style={{ width: 14, height: 14, border: '1px solid var(--line)', display: 'inline-block', background: r[2] ? 'var(--accent-sage)' : 'transparent', position: 'relative' }}>
                  {r[2] && <span style={{ position: 'absolute', color: 'var(--paper)', fontSize: 9, left: 2, top: -2 }}>✓</span>}
                </span>
                following
              </label>
              <label className="row" style={{ gap: 4, alignItems: 'center', fontSize: 10, cursor: 'pointer' }}>
                <span style={{ width: 14, height: 14, border: '1px solid var(--line)', display: 'inline-block', background: r[3] ? 'var(--accent-tan)' : 'transparent', position: 'relative' }}>
                  {r[3] && <span style={{ position: 'absolute', color: 'var(--paper)', fontSize: 9, left: 2, top: -2 }}>✓</span>}
                </span>
                friends
              </label>
              <button style={{ fontSize: 10, padding: '2px 6px', background: 'transparent', border: '1px dashed var(--line)', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
          <Btn sm block style={{ marginTop: 8 }}>+ add custom platform</Btn>
        </div>

        <div style={{ width: 260 }}>
          <Box tan style={{ padding: 10 }}>
            <div className="tiny mono">✦ HOW IT USES THIS</div>
            <div className="tiny" style={{ marginTop: 4, lineHeight: 1.6 }}>
              <b>Following</b> → she'll see your posts. Helps you judge if content marketing reaches her.<br/><br/>
              <b>Friends</b> → higher-tier algorithmic reach; tagging her is safe; posts about her (with permission) show up in her feed.<br/><br/>
              <b>Not tracked</b> → excluded from "sphere engagement" metrics. Marked for cleanup.
            </div>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">AUTO-MATCH</div>
            <div className="tiny" style={{ marginTop: 4 }}>Paste a full profile URL → Command parses handle, verifies match against email/phone/location, marks ✓ automatically.</div>
          </Box>
        </div>
      </div>
    </Desktop>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Edit form</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Each platform: handle + following + friends checkboxes. Auto-match from pasted URLs. Mobile-friendly tabbed layout.</p>
    </div>
  </div>;
}

/* ====================== V4 · DEAL · PEOPLE ON THIS DEAL ====================== */
function Rel4_DealPeople() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Deal · 418 Ironwood · people" url="command.app/deals/418-ironwood#people" style={{ width: 940 }}>
      <div className="row between">
        <div>
          <div className="hand-alt tiny">DEAL · 418 IRONWOOD · under contract · closes May 23</div>
          <div className="serif" style={{ fontSize: 22 }}>People on this deal</div>
          <div className="tiny muted">Everyone with a stake — buyers, co-buyers, agents, lender, title, family involved in the decision.</div>
        </div>
        <Btn sm primary>+ add person</Btn>
      </div>

      {/* Primary buyers */}
      <div className="hand-alt tiny" style={{ marginTop: 14 }}>BUYERS · 3 (decision group)</div>
      <div className="row" style={{ gap: 10, marginTop: 8 }}>
        {[
          ['Jen Ortiz',     'primary buyer',   'on mortgage',  '1099 · self-emp',  'var(--accent-sage)'],
          ['Carlos Ortiz',  'spouse · co-buyer','on mortgage', 'W2 · engineer',    'var(--accent-sage)'],
          ['Renata Alvarez','Jen\'s sister · co-signer', 'co-signer only', 'helping w/ down payment · not on title', 'var(--accent-tan)'],
        ].map((p, i) => (
          <Box key={i} dashed style={{ flex: 1, padding: 10 }}>
            <div className="row between">
              <b style={{ fontSize: 13 }}>{p[0]}</b>
              <Chip sm style={{ background: p[4], color: 'var(--paper)', border: 'none', fontSize: 9 }}>{p[2]}</Chip>
            </div>
            <div className="tiny muted" style={{ marginTop: 2 }}>{p[1]}</div>
            <div className="tiny" style={{ marginTop: 6 }}>{p[3]}</div>
            <div className="row" style={{ gap: 4, marginTop: 8 }}>
              <button style={{ fontSize: 9, padding: '2px 5px', background: 'transparent', border: '1px dashed var(--line)', cursor: 'pointer' }}>profile</button>
              <button style={{ fontSize: 9, padding: '2px 5px', background: 'transparent', border: '1px dashed var(--line)', cursor: 'pointer' }}>email</button>
              <button style={{ fontSize: 9, padding: '2px 5px', background: 'transparent', border: '1px dashed var(--line)', cursor: 'pointer' }}>text</button>
            </div>
          </Box>
        ))}
      </div>

      <Box tan style={{ marginTop: 10, padding: 10 }}>
        <div className="tiny mono">✦ DECISION GROUP</div>
        <div className="tiny" style={{ marginTop: 4 }}>Command will CC Carlos on contracts, loop Renata on funds docs only. <b>All three</b> need to sign disclosures. Jen is the comms lead — text her for approvals, she syncs the rest.</div>
      </Box>

      {/* Other party */}
      <div className="hand-alt tiny" style={{ marginTop: 14 }}>OTHER SIDE · seller + seller agent</div>
      <div className="row" style={{ gap: 10, marginTop: 8 }}>
        {[
          ['E. Grayson',    'seller',           'FSBO · DIY-turned-represented at offer stage'],
          ['(no agent)',    'seller side',      'Grayson represented himself · Dana is dual-role but disclosed'],
        ].map((p, i) => (
          <Box key={i} dashed style={{ flex: 1, padding: 10 }}>
            <b style={{ fontSize: 13 }}>{p[0]}</b>
            <div className="tiny muted" style={{ marginTop: 2 }}>{p[1]}</div>
            <div className="tiny" style={{ marginTop: 4 }}>{p[2]}</div>
          </Box>
        ))}
      </div>

      {/* Vendors */}
      <div className="hand-alt tiny" style={{ marginTop: 14 }}>VENDORS · 5</div>
      <Box style={{ marginTop: 8, padding: 0 }}>
        {[
          ['Dan Reyes · US Bank',       'lender',           'pre-approval 4/08 · appraisal ordered 4/22'],
          ['Tasha · Landmark Title',    'title · escrow',   'opened 4/18 · wire instructions sent'],
          ['Mark · Nexgen Inspection',  'inspection',       'scheduled Thu Apr 25 · 10am'],
          ['Julio · AZ Pest Control',   'termite clear',    'awaiting letter'],
          ['Phoenix Insurance Group',    'home insurance',   'quote pending · Jen to confirm'],
        ].map((v, i) => (
          <div key={i} className="row" style={{ padding: '8px 10px', borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12, alignItems: 'center' }}>
            <b style={{ width: 220 }}>{v[0]}</b>
            <span style={{ width: 120 }} className="tiny muted">{v[1]}</span>
            <span style={{ flex: 1 }} className="tiny">{v[2]}</span>
          </div>
        ))}
      </Box>

      {/* Influencers */}
      <div className="hand-alt tiny" style={{ marginTop: 14 }}>BEHIND THE SCENES · people influencing the decision</div>
      <Box style={{ marginTop: 8, padding: 0 }}>
        {[
          ['Marta Ortiz',       'Jen\'s mother-in-law',  'visited the house · said "too small for holidays"', 'watch'],
          ['Mateo (14)',        'Jen\'s son',             'wants the room with the tree outside',             'tied · positive'],
          ['Luna (11)',         'Jen\'s daughter',        'cried because backyard is smaller than current',   'negative'],
          ['David + Kim',       'best friends · also clients', '"the neighborhood is up-and-coming"',       'positive'],
        ].map((p, i) => (
          <div key={i} className="row" style={{ padding: '8px 10px', borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12, alignItems: 'center' }}>
            <b style={{ width: 170 }}>{p[0]}</b>
            <span style={{ width: 180 }} className="tiny muted">{p[1]}</span>
            <span style={{ flex: 1 }} className="tiny">{p[2]}</span>
            <Chip sm style={{ background: p[3] === 'positive' ? 'var(--accent-sage)' : p[3] === 'negative' ? 'var(--accent-rose)' : 'var(--accent-tan)', color: 'var(--paper)', border: 'none', fontSize: 9 }}>{p[3]}</Chip>
          </div>
        ))}
      </Box>

      <Box dashed style={{ marginTop: 10, padding: 10 }}>
        <div className="tiny mono">✦ WHY TRACK THIS</div>
        <div className="tiny" style={{ marginTop: 4 }}>Deals die in the gap between "Jen loves it" and "the family loves it." Tracking influencers = knowing who to address in the next showing, what video to send Mateo, and why Luna's tears need a backyard counter-narrative.</div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Deal roster</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Primary, co-buyers, co-signers with role tags. Plus the family members quietly influencing the choice.</p>
    </div>
  </div>;
}

/* ====================== V5 · SOCIAL HYGIENE DASHBOARD ====================== */
function Rel5_Hygiene() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Sphere · social hygiene" url="command.app/sphere/social" style={{ width: 940 }}>
      <div className="hand-alt tiny">SPHERE · SOCIAL COVERAGE · 2,847 contacts</div>
      <div className="serif" style={{ fontSize: 26 }}>Who are you really connected to?</div>
      <div className="tiny muted">Not "how many followers" — which of your actual contacts can you reach through which platforms.</div>

      {/* Summary cards */}
      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        {[
          ['Contacts w/ social linked',   '1,912',  '67% of sphere'],
          ['You follow them',              '1,204', '42%'],
          ['They follow you',              '1,688', '59%'],
          ['Mutual (both follow)',         '1,142', '40%'],
          ['Friends (FB)',                 '487',   '17%'],
          ['Zero platforms linked',        '935',   '33% · add now'],
        ].map((s, i) => (
          <Box key={i} style={{ flex: 1, padding: 10 }}>
            <div className="tiny mono">{s[0]}</div>
            <div className="serif" style={{ fontSize: 22, marginTop: 4 }}>{s[1]}</div>
            <div className="tiny muted">{s[2]}</div>
          </Box>
        ))}
      </div>

      {/* Per-platform matrix */}
      <div className="hand-alt tiny" style={{ marginTop: 14 }}>PER-PLATFORM BREAKDOWN</div>
      <Box style={{ marginTop: 8, padding: 0 }}>
        <div className="row" style={{ padding: '6px 10px', background: 'var(--tint)', fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
          <span style={{ width: 120 }}>PLATFORM</span>
          <span style={{ width: 110, textAlign: 'right' }}>CONTACTS ON IT</span>
          <span style={{ width: 110, textAlign: 'right' }}>YOU FOLLOW</span>
          <span style={{ width: 110, textAlign: 'right' }}>THEY FOLLOW</span>
          <span style={{ width: 110, textAlign: 'right' }}>MUTUAL</span>
          <span style={{ flex: 1, textAlign: 'right' }}>GAP TO CLOSE</span>
        </div>
        {[
          ['Instagram',  1547, 1102, 1341, 972,  'follow back 239'],
          ['Facebook',   1203, 892,  1034, 756,  'friend 142 pending'],
          ['LinkedIn',   876,  743,  698,  611,  'connect 133'],
          ['TikTok',     401,  218,  287,  174,  'follow 69'],
          ['YouTube',    289,  201,  176,  134,  'subscribe to 68'],
          ['Nextdoor',   612,  489,  523,  412,  'friend 77'],
          ['Threads',    203,  156,  178,  123,  'follow back 55'],
          ['Zillow',     934,  0,    478,  0,    'not a follow platform'],
        ].map((r, i) => (
          <div key={i} className="row" style={{ padding: '8px 10px', borderTop: '1px dashed var(--faint)', fontSize: 12, alignItems: 'center' }}>
            <b style={{ width: 120 }}>{r[0]}</b>
            <span style={{ width: 110, textAlign: 'right' }} className="mono">{r[1].toLocaleString()}</span>
            <span style={{ width: 110, textAlign: 'right' }} className="mono">{r[2].toLocaleString()}</span>
            <span style={{ width: 110, textAlign: 'right' }} className="mono">{r[3].toLocaleString()}</span>
            <span style={{ width: 110, textAlign: 'right' }} className="mono"><b>{r[4].toLocaleString()}</b></span>
            <span style={{ flex: 1, textAlign: 'right' }} className="tiny muted" style={{ fontFamily: "'Caveat',cursive", fontSize: 13 }}>{r[5]}</span>
          </div>
        ))}
      </Box>

      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <Box tan style={{ flex: 1, padding: 10 }}>
          <div className="tiny mono">✦ THIS WEEK'S SUGGESTIONS</div>
          <div className="tiny" style={{ marginTop: 4 }}>Close 239 IG follow-backs (15 min) · friend 77 on Nextdoor (where your farm lives) · connect 133 on LinkedIn (referral signal).</div>
          <Btn sm primary block style={{ marginTop: 6 }}>start batch follow-back →</Btn>
        </Box>
        <Box dashed style={{ flex: 1, padding: 10 }}>
          <div className="tiny mono">HIDDEN CONTACTS</div>
          <div className="tiny" style={{ marginTop: 4 }}>935 people in your CRM have zero social linked. 60% are probably on IG + FB. Run auto-find overnight — costs 40 AI credits, adds ~550 matches.</div>
        </Box>
        <Box dashed style={{ flex: 1, padding: 10 }}>
          <div className="tiny mono">STALE LINKS</div>
          <div className="tiny" style={{ marginTop: 4 }}>41 handles last verified over 6 months ago — profiles may have moved. Re-check weekly.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Social coverage</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Turns "I have 5k followers" into "here's how many of my actual clients I can reach, by platform, and what gaps to close."</p>
    </div>
  </div>;
}

/* ====================== V6 · LIFE EVENTS TIMELINE ====================== */
function Rel6_LifeEvents() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Life events · upcoming 90 days" url="command.app/sphere/life-events" style={{ width: 900 }}>
      <div className="hand-alt tiny">LIFE EVENTS · NEXT 90 DAYS · SPHERE-WIDE</div>
      <div className="serif" style={{ fontSize: 26 }}>What matters to your people this month</div>
      <div className="tiny muted">Birthdays, anniversaries, closing-anniversaries, kid graduations, new-baby windows. All surfaced from family data.</div>

      <div className="row" style={{ gap: 6, marginTop: 12 }}>
        <Chip sm filled>all (47)</Chip>
        <Chip sm>birthdays (18)</Chip>
        <Chip sm>anniversaries (8)</Chip>
        <Chip sm>closing anniv (11)</Chip>
        <Chip sm>kids' milestones (6)</Chip>
        <Chip sm>other (4)</Chip>
      </div>

      <Box style={{ marginTop: 12, padding: 0 }}>
        {[
          ['Apr 25 · Fri', '3d',   'Ashley Chen',            'birthday · 34',                      'past client · March 2024', 'card · $25 Philz', 'primary'],
          ['Apr 28 · Mon', '6d',   'The Pattersons',          'home-closing anniv · 2 yr',          'past client · referrers',  'pop-by · equity gift', 'primary'],
          ['May 02 · Fri', '10d',  'Marcus + Sara',          'wedding anniv · 7 yr',                'past client · buyers 2022','card · handwritten', 'secondary'],
          ['May 09 · Fri', '17d',  'Luna Ortiz',             'her 12th birthday',                    'Jen\'s daughter · past client family', 'note to Jen + small book', 'secondary'],
          ['May 14 · Wed', '22d',  'Jen Ortiz',              'home-closing anniv · 1 yr',           'past client · referrer 2x','pop-by · equity + CMA', 'primary'],
          ['May 18 · Sun', '26d',  'David Kim',              'birthday · 41',                        'SOI · friend-of-client',   'text · his cocktail bar', 'secondary'],
          ['Jun 02 · Mon', '41d',  'Mateo Ortiz',            'his 15th birthday · gets bike',       'Jen\'s son',                'card to Mateo · $50 REI', 'secondary'],
          ['Jun 14 · Sat', '53d',  'Jen + Carlos Ortiz',      'wedding anniv · 16 yr',               'past client · anniv gift',  'dinner gift card $100',  'primary'],
        ].map((r, i) => (
          <div key={i} className="row" style={{ padding: '10px 12px', borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12, alignItems: 'center' }}>
            <span style={{ width: 110 }} className="mono tiny">{r[0]}</span>
            <Chip sm style={{ width: 40, fontSize: 9 }}>{r[1]}</Chip>
            <b style={{ width: 170 }}>{r[2]}</b>
            <span style={{ width: 190 }}>{r[3]}</span>
            <span style={{ width: 180 }} className="tiny muted">{r[4]}</span>
            <span style={{ flex: 1 }} className="tiny">{r[5]}</span>
            <Chip sm filled={r[6] === 'primary'} style={{ fontSize: 9, background: r[6] === 'primary' ? 'var(--accent-sage)' : 'var(--paper)', color: r[6] === 'primary' ? 'var(--paper)' : 'var(--ink)' }}>{r[6] === 'primary' ? 'do' : 'nice'}</Chip>
          </div>
        ))}
      </Box>

      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        <Box tan style={{ flex: 1, padding: 10 }}>
          <div className="tiny mono">✦ AUTOMATION</div>
          <div className="tiny" style={{ marginTop: 4 }}>You can set "auto-send card 7d before" per event type — cards print + mail from your closest PrintSource with a handwritten-font note. Max $40/event, confirm each one over $20.</div>
        </Box>
        <Box dashed style={{ flex: 1, padding: 10 }}>
          <div className="tiny mono">DATA SOURCE</div>
          <div className="tiny" style={{ marginTop: 4 }}>Dates pulled from: family records (you), MLS closing dates, Facebook birthdays (opt-in sync), manual entries. All editable on the contact.</div>
        </Box>
        <Box dashed style={{ flex: 1, padding: 10 }}>
          <div className="tiny mono">BUDGET</div>
          <div className="tiny" style={{ marginTop: 4 }}>Month to date: <b>$287</b> · YTD <b>$1,840</b> · Target <b>$4k/yr</b> on client gifting. 60% of past-client referrals attribute to "gift + note," so ROI is real.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Life events roll-up</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Every family date on every contact → one feed → auto-gift options. Birthdays, anniversaries, kids' milestones, closing anniversaries.</p>
    </div>
  </div>;
}

/* ====================== V7 · CO-BUYER ADD FLOW (mobile) ====================== */
function Rel7_CoBuyerMobile() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">DEAL · 418 IRONWOOD</div>
        <div className="serif" style={{ fontSize: 20, marginTop: 4 }}>Add someone to this deal</div>

        <Box dashed style={{ marginTop: 12, padding: 10 }}>
          <div className="tiny mono">SEARCH OR CREATE</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>Start typing a name · if they're in your CRM we'll link · otherwise we'll create.</div>
          <Box style={{ marginTop: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'monospace' }}>Renata A_</Box>
        </Box>

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>3 MATCHES</div>
        {[
          ['Renata Alvarez', 'Jen Ortiz\'s sister', 'in CRM · tagged SOI'],
          ['Renata A. Moreno', 'no deal · farm area', 'in CRM · met at 2024 OH'],
          ['+ create new · "Renata A"', '', ''],
        ].map((r, i) => (
          <Box key={i} style={{ marginTop: 6, padding: 10 }}>
            <b style={{ fontSize: 13 }}>{r[0]}</b>
            <div className="tiny muted">{r[1]}</div>
            <div className="tiny muted">{r[2]}</div>
          </Box>
        ))}
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">ADD RENATA · role on deal</div>
        <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>How is she involved?</div>

        <div style={{ marginTop: 12 }}>
          {[
            ['spouse · co-buyer',       'on mortgage + title',          false],
            ['co-buyer · partner/other','on mortgage + title',          false],
            ['co-signer (not on title)','helping qualify, not owning',  true],
            ['co-signer (on title)',    'owning share, not decision',   false],
            ['investor silent partner', 'funds only',                    false],
            ['family helping w/ funds', 'down payment gift',             false],
            ['influencer / advisor',    'opinion carries weight, no $', false],
          ].map((r, i) => (
            <label key={i} className="row" style={{ gap: 10, padding: '10px 8px', borderTop: '1px dashed var(--faint)', cursor: 'pointer', alignItems: 'flex-start', background: r[2] ? 'var(--accent-sage-2)' : 'transparent' }}>
              <span style={{ width: 16, height: 16, borderRadius: 8, border: '2px solid var(--ink)', flexShrink: 0, marginTop: 1, background: r[2] ? 'var(--ink)' : 'transparent' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{r[0]}</div>
                <div className="tiny muted">{r[1]}</div>
              </div>
            </label>
          ))}
        </div>

        <Btn primary block style={{ marginTop: 14 }}>Add to deal →</Btn>
        <div className="tiny muted" style={{ marginTop: 8, textAlign: 'center' }}>She'll be CC'd on funds docs only, per role.</div>
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">DEAL UPDATED</div>
        <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>Renata added</div>

        <Box tan style={{ marginTop: 12, padding: 10 }}>
          <div className="tiny mono">✦ COMMAND WILL</div>
          <div className="tiny" style={{ marginTop: 6, lineHeight: 1.6 }}>
            • CC her on funds docs + wire instructions<br/>
            • Request her ID/info via text<br/>
            • Add her to the closing-day list<br/>
            • Skip her on offer/negotiation updates (Jen is comms lead)<br/>
            • Create a "Renata" contact if new · linked to Jen as sibling
          </div>
        </Box>

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>DEAL ROSTER NOW</div>
        <Box style={{ marginTop: 6, padding: 0 }}>
          {[
            ['Jen Ortiz', 'primary', '✓'],
            ['Carlos Ortiz', 'spouse', '✓'],
            ['Renata Alvarez', 'co-signer (not title)', '● new'],
          ].map((p, i) => (
            <div key={i} className="row between" style={{ padding: '8px 10px', borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12 }}>
              <div>
                <b>{p[0]}</b>
                <div className="tiny muted">{p[1]}</div>
              </div>
              <span className="tiny mono">{p[2]}</span>
            </div>
          ))}
        </Box>

        <Btn primary block style={{ marginTop: 14 }}>Back to deal</Btn>
      </div>
    </Phone>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">Add-to-deal flow</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Mobile-first. Search existing contacts or create. Pick role → Command routes comms + docs correctly.</p>
    </div>
  </div>;
}

/* ====================== REGISTRATIONS ====================== */

window.RelationshipScreens = [
  { id: 'rel1', label: 'V1 · Social profiles · contact', caption: '9 platforms tracked · handle + following + friends + verified · AI suggests new matches.', Component: Rel1_SocialProfiles },
  { id: 'rel2', label: 'V2 · Family section',            caption: 'Spouse as linked contact · kids · pets · extended family · every date rolled up.',       Component: Rel2_Family },
  { id: 'rel3', label: 'V3 · Edit contact form',         caption: 'Tabbed editor · paste-URL auto-match · how Command uses each platform field.',           Component: Rel3_EditForm },
  { id: 'rel4', label: 'V4 · Deal · people',             caption: 'Co-buyers, co-signers, vendors, and the family behind the scenes influencing the call.',Component: Rel4_DealPeople },
  { id: 'rel5', label: 'V5 · Social coverage dashboard', caption: 'Per-platform sphere coverage · follow gaps · hidden contacts · batch actions.',           Component: Rel5_Hygiene },
  { id: 'rel6', label: 'V6 · Life events timeline',      caption: 'Sphere-wide 90-day feed of birthdays · anniversaries · closing dates · kids\' milestones.',Component: Rel6_LifeEvents },
  { id: 'rel7', label: 'V7 · Add co-buyer flow (mobile)',caption: 'Search-or-create · role picker w/ comms-routing implications · auto-links family.',     Component: Rel7_CoBuyerMobile },
];

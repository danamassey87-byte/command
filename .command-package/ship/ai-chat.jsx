/* ============================================================
   AI ASSISTANT · AMBIENT "TALK TO COMMAND" SURFACES
   ============================================================ */

/* ====================== V1 · FLOATING PILL (anywhere) ====================== */
function Chat1_Pill() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ position: 'relative', width: 900 }}>
      <Desktop active="CRM" url="command.app/crm">
        <div style={{ opacity: 0.35, filter: 'grayscale(0.5)' }}>
          <div className="hand-alt tiny">CONTACTS · 847</div>
          <div className="serif" style={{ fontSize: 28 }}>All contacts</div>
          <div style={{ marginTop: 16 }}>
            {['Alison Chen · Buyer · Hot', 'Marcus Webb · SOI · 2yr silent', 'Jen Ortiz · Past client · closed Mar 24'].map((r, i) => (
              <div key={i} className="row between" style={{ padding: '10px 0', borderTop: '1px dashed var(--faint)' }}>
                <div>{r}</div><Chip sm>●</Chip>
              </div>
            ))}
          </div>
        </div>
      </Desktop>

      {/* The ambient pill — bottom center, always available */}
      <div style={{
        position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--ink)', color: 'var(--paper)',
        borderRadius: 999, padding: '10px 18px',
        display: 'flex', alignItems: 'center', gap: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        fontFamily: "'Patrick Hand',cursive", fontSize: 14,
        width: 420,
      }}>
        <span style={{ fontSize: 16 }}>✦</span>
        <div style={{ flex: 1, opacity: 0.7 }}>Ask Command anything · ⌘ /</div>
        <span style={{ opacity: 0.5, fontSize: 11 }}>hold to dictate</span>
      </div>
    </div>

    <div style={{ maxWidth: 280, paddingTop: 20 }}>
      <div className="hand-alt">Ambient pill</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Floats bottom-center on every screen. Click or ⌘/ to expand. Hold to voice. Always knows what page you're on.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">CONTEXT AWARENESS</div>
        <div className="tiny" style={{ marginTop: 6 }}>CRM → "this contact..." · Deals → "this deal..." · Listing → "this listing..." · Home → "today..."</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V2 · EXPANDED CHAT (in-context) ====================== */
function Chat2_Expanded() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ position: 'relative', width: 900 }}>
      <Desktop active="Contact · Alison Chen" url="command.app/crm/alison">
        <div style={{ opacity: 0.3 }}>
          <div className="serif" style={{ fontSize: 24 }}>Alison Chen</div>
          <div className="tiny muted">Buyer · pre-approved $620K · 14 showings · 0 offers</div>
        </div>
      </Desktop>

      {/* Expanded chat panel */}
      <div style={{
        position: 'absolute', bottom: 24, right: 24, width: 440,
        background: 'var(--paper)', border: '1px solid var(--ink)',
        borderRadius: 12, padding: 14, boxShadow: '0 12px 30px rgba(0,0,0,0.16)',
      }}>
        <div className="row between center">
          <div className="hand-alt tiny">✦ COMMAND · re: Alison Chen</div>
          <span className="tiny muted">✕</span>
        </div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 320, overflow: 'hidden' }}>
          {/* User bubble */}
          <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--ink)', color: 'var(--paper)', padding: '8px 12px', borderRadius: 14, fontSize: 13 }}>
            why hasn't she made an offer yet
          </div>

          {/* AI bubble */}
          <div style={{ alignSelf: 'flex-start', maxWidth: '90%', fontSize: 13, lineHeight: 1.45 }}>
            Three reads from the data:<br/>
            <b>1.</b> She's gone in on 14 homes — the 3 she rated 5★ all sold above list. Budget is probably the wall.<br/>
            <b>2.</b> Her partner Mike hasn't joined a showing since #7. Alignment risk.<br/>
            <b>3.</b> She texted you Tuesday "maybe we should pause" — you haven't replied.
            <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Chip sm filled>draft reply to Tuesday text</Chip>
              <Chip sm>book 3-way w/ Mike</Chip>
              <Chip sm>re-run pre-approval</Chip>
            </div>
          </div>

          {/* User follow-up */}
          <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--ink)', color: 'var(--paper)', padding: '8px 12px', borderRadius: 14, fontSize: 13 }}>
            draft the reply
          </div>
        </div>

        <Box dashed style={{ marginTop: 12, padding: 8 }}>
          <div className="tiny mono">DRAFTING...</div>
          <div className="tiny" style={{ marginTop: 4 }}>"Hey Alison — no worries at all. I think we should talk, not pause. Can I call Thursday 7pm? Want Mike there if he's around."</div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <Btn sm primary>send text</Btn>
            <Btn sm>edit</Btn>
            <Btn sm ghost>try again</Btn>
          </div>
        </Box>

        <div className="row between" style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--faint)' }}>
          <input className="tiny" placeholder="ask anything..." style={{ border: 'none', flex: 1, background: 'transparent', fontFamily: 'inherit', outline: 'none' }} />
          <span className="tiny muted">⏎</span>
        </div>
      </div>
    </div>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Expanded · in-context</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>When you ask about "this contact," it reads the full profile, last 90 days of activity, related deals, texts, showings. Grounded, not guessing.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">ACTIONS, NOT ANSWERS</div>
        <div className="tiny" style={{ marginTop: 6 }}>Every answer ends with what you can DO. Draft, book, remind, run, pull.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V3 · VOICE MODE (press & hold) ====================== */
function Chat3_Voice() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ position: 'relative', width: 900 }}>
      <Desktop active="Home" url="command.app">
        <div style={{ opacity: 0.25, filter: 'blur(0.5px)' }}>
          <div className="serif" style={{ fontSize: 32 }}>Tuesday, April 22</div>
        </div>
      </Desktop>

      {/* Voice modal — full overlay */}
      <div style={{
        position: 'absolute', inset: 0, background: 'rgba(33,33,33,0.85)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
        color: 'var(--paper)', borderRadius: 12,
      }}>
        <div className="hand-alt tiny" style={{ opacity: 0.7 }}>LISTENING · RELEASE TO SEND</div>

        {/* Waveform */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {[18, 34, 22, 48, 30, 54, 40, 26, 42, 20, 36, 28, 46].map((h, i) => (
            <div key={i} style={{ width: 4, height: h, background: 'var(--paper)', borderRadius: 2, opacity: 0.8 }} />
          ))}
        </div>

        <div style={{ fontFamily: "'Caveat',cursive", fontSize: 28, lineHeight: 1.2, maxWidth: 560, textAlign: 'center' }}>
          "remind me to call the Hendersons Thursday about their listing decision... and pull up comps for 47 Olive"
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.7 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>●</div>
          <span className="tiny">0:14 · hold spacebar</span>
        </div>

        <div className="tiny" style={{ opacity: 0.5 }}>Command is parsing into 2 actions · release to confirm</div>
      </div>
    </div>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Voice · press & hold</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Hold spacebar (or tap the pill) to dictate. Release to send. Multi-intent is parsed into distinct actions with individual confirm.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">MOBILE</div>
        <div className="tiny" style={{ marginTop: 6 }}>On phone, tap-and-hold the floating pill. Great in the car between showings.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V4 · MULTI-ACTION CONFIRM ====================== */
function Chat4_Confirm() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ width: 560 }}>
      <Box style={{ padding: 16 }}>
        <div className="hand-alt tiny">✦ I HEARD 3 THINGS · confirm each</div>
        <div className="serif" style={{ fontSize: 20, marginTop: 4 }}>Before I run these</div>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['1', 'Call reminder · Thursday 10am', 'Call the Hendersons about listing decision', ['✓ reminder', 'edit time', 'skip']],
            ['2', 'Pull comps · 47 Olive St', '5 active, 3 pending, 12 sold (90d) · 0.5mi radius', ['✓ pull now', 'add to CMA', 'skip']],
            ['3', 'Draft text · to Miguel Henderson', '"Hey Miguel — quick Q about Thursday before you call..."', ['✓ review draft', 'send now', 'skip']],
          ].map((a, i) => (
            <Box key={i} dashed style={{ padding: 10 }}>
              <div className="row between" style={{ gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: 'var(--ink)', color: 'var(--paper)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{a[0]}</div>
                    <b style={{ fontSize: 13 }}>{a[1]}</b>
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4, marginLeft: 28 }}>{a[2]}</div>
                </div>
              </div>
              <div className="row" style={{ gap: 6, marginTop: 10, marginLeft: 28, flexWrap: 'wrap' }}>
                {a[3].map((c, j) => <Chip key={j} sm filled={j === 0}>{c}</Chip>)}
              </div>
            </Box>
          ))}
        </div>

        <div className="row between" style={{ marginTop: 14 }}>
          <Btn ghost sm>undo last</Btn>
          <div className="row" style={{ gap: 6 }}>
            <Btn sm>skip all</Btn>
            <Btn primary sm>Do all 3 →</Btn>
          </div>
        </div>
      </Box>
    </div>

    <div style={{ maxWidth: 280, paddingTop: 20 }}>
      <div className="hand-alt">Multi-action confirm</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Never run multiple things silently. Every action is previewed with a 1-click approve, edit, or skip. Trust is built here.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">AUTO-APPROVE TIERS</div>
        <div className="tiny" style={{ marginTop: 6 }}>Low-risk (reminders, pulls) → auto. Medium (drafts) → review. High (sends, posts, payments) → always confirm.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V5 · CHAT HISTORY · FULL PAGE ====================== */
function Chat5_History() {
  const convos = [
    ['today', '9:04am', 'Morning briefing',        'You wanted a summary of overnight + today priorities', 12],
    ['today', '11:20am', 'Alison Chen reply',        'Drafted + sent after your edit', 4],
    ['today', '1:45pm', 'Comps · 47 Olive',          '20 comps analyzed · CMA drafted', 6],
    ['yesterday', '3:12pm', 'Open house recap',      'Summarized 14 visitors · 3 hot leads tagged', 9],
    ['yesterday', '7:48pm', 'Weekend content batch', '12 posts drafted across 5 platforms', 18],
    ['apr 20', '10:02am', 'Marcus Webb reactivation','Drafted 3 re-engagement variants', 7],
    ['apr 19', '2:30pm',  'Listing deck · the Chens','Built 48-slide deck with their comps', 11],
  ];

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Chat history" url="command.app/chat" style={{ width: 900 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">✦ CONVERSATIONS · 247 this month</div>
          <div className="serif" style={{ fontSize: 26 }}>Everything you've asked Command</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>export</Btn>
          <Btn sm primary>new chat</Btn>
        </div>
      </div>

      <div className="row" style={{ gap: 12, marginTop: 14, alignItems: 'flex-start' }}>
        {/* Left: list */}
        <Box style={{ width: 440, padding: 0 }}>
          {convos.map((c, i) => (
            <div key={i} className="row between" style={{ padding: 12, borderTop: i ? '1px dashed var(--faint)' : 'none', background: i === 1 ? 'var(--accent-sage-2)' : 'transparent' }}>
              <div style={{ flex: 1 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span className="tiny muted" style={{ minWidth: 72 }}>{c[0]} · {c[1]}</span>
                  <b style={{ fontSize: 13 }}>{c[2]}</b>
                </div>
                <div className="tiny muted" style={{ marginTop: 4 }}>{c[3]}</div>
              </div>
              <span className="tiny mono">{c[4]} msgs</span>
            </div>
          ))}
        </Box>

        {/* Right: selected thread */}
        <Box style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">ALISON CHEN REPLY · today 11:20am</div>
          <div className="serif" style={{ fontSize: 16, marginTop: 4 }}>Drafted + sent after your edit</div>

          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
            <div style={{ alignSelf: 'flex-end', maxWidth: '75%', background: 'var(--ink)', color: 'var(--paper)', padding: '6px 10px', borderRadius: 10 }}>draft the reply</div>
            <div style={{ alignSelf: 'flex-start' }}>"Hey Alison — no worries at all. I think we should..."</div>
            <div style={{ alignSelf: 'flex-end', maxWidth: '75%', background: 'var(--ink)', color: 'var(--paper)', padding: '6px 10px', borderRadius: 10 }}>make it warmer, less businessy</div>
            <div style={{ alignSelf: 'flex-start' }}>"Hey A! Don't stress — pause isn't the vibe. Can we..."</div>
            <div style={{ alignSelf: 'flex-end', maxWidth: '75%', background: 'var(--ink)', color: 'var(--paper)', padding: '6px 10px', borderRadius: 10 }}>send</div>
            <Box dashed style={{ padding: 6 }}>
              <div className="tiny mono">✓ sent 11:22am · delivered · read 11:24am</div>
            </Box>
          </div>

          <div className="row" style={{ gap: 6, marginTop: 12 }}>
            <Btn sm>pin</Btn>
            <Btn sm>save as template</Btn>
            <Btn sm ghost>delete</Btn>
          </div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Everything in one place</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Searchable. Pinnable. Saved conversations become templates ("do this again next Friday").</p>
    </div>
  </div>;
}

/* ====================== V6 · MOBILE · FLOATING + EXPANDED ====================== */
function Chat6_Mobile() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">DRIVING · back from showing</div>
        <div className="serif" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>Home</div>

        <div style={{ marginTop: 14, opacity: 0.3 }}>
          {['12:45pm · Alison · done', '1:30pm · 47 Olive showing', '3:00pm · CMA call Chens'].map((r, i) => (
            <div key={i} className="row between" style={{ padding: '10px 0', borderTop: '1px dashed var(--faint)' }}>
              <div>{r}</div>
            </div>
          ))}
        </div>

        {/* Floating command button */}
        <div style={{ position: 'absolute', bottom: 62, left: 14, right: 14,
          background: 'var(--ink)', color: 'var(--paper)', borderRadius: 999,
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        }}>
          <span style={{ fontSize: 14 }}>✦</span>
          <div className="tiny" style={{ flex: 1, opacity: 0.7, fontFamily: "'Patrick Hand',cursive" }}>hold to talk...</div>
          <span style={{ opacity: 0.5, fontSize: 10 }}>◉</span>
        </div>
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">✦ COMMAND</div>
        <div className="serif" style={{ fontSize: 18, marginTop: 4 }}>after 47 Olive</div>

        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
          <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--ink)', color: 'var(--paper)', padding: '6px 10px', borderRadius: 10 }}>
            log the showing. they loved it. husband nervous about roof
          </div>
          <div style={{ alignSelf: 'flex-start', maxWidth: '90%' }}>
            Logged. Tagged <b>roof-concern</b>. Pulled roof inspection from MLS (2021, GAF 30-yr). Want me to draft a text w/ the inspection attached?
            <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Chip sm filled>draft text</Chip>
              <Chip sm>book inspector visit</Chip>
            </div>
          </div>
          <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: 'var(--ink)', color: 'var(--paper)', padding: '6px 10px', borderRadius: 10 }}>yes draft</div>
          <Box dashed style={{ padding: 6 }}>
            <div className="tiny">"Hey Marcus — loved having you guys today. Re: the roof, MLS shows it was replaced 2021 with GAF 30-yr shingles — here's the inspection report from that install..."</div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}>
              <Btn sm primary>send</Btn>
              <Btn sm>edit</Btn>
            </div>
          </Box>
        </div>

        <div style={{ position: 'absolute', bottom: 62, left: 14, right: 14,
          border: '1px solid var(--line)', borderRadius: 18,
          padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--paper)',
        }}>
          <Ic size={12} label="⏎" />
          <div className="tiny" style={{ flex: 1, color: 'var(--muted)' }}>reply...</div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>◉</div>
        </div>
      </div>
    </Phone>

    <div style={{ maxWidth: 240, paddingTop: 20 }}>
      <div className="hand-alt">Mobile · everywhere</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Floating button pinned above tab bar. Tap-and-hold to talk while driving. Expanded view mirrors desktop chat.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">CAR-SAFE MODE</div>
        <div className="tiny" style={{ marginTop: 6 }}>When Bluetooth = car, buttons enlarge, AI reads replies aloud, "say yes to confirm."</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V7 · PROACTIVE · AI STARTS THE CONVO ====================== */
function Chat7_Proactive() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ width: 520 }}>
      <div className="hand-alt tiny">COMMAND NOTICED SOMETHING · 11:23am</div>
      <Box style={{ marginTop: 8, padding: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--accent-sage)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✦</div>
          <div style={{ flex: 1 }}>
            <b>The Henderson listing has been sitting 38 days.</b>
            <div className="tiny muted" style={{ marginTop: 4 }}>Avg days-on-market in your zip is 14. Three things to consider — want to talk through them?</div>

            <Box dashed style={{ marginTop: 10, padding: 8 }}>
              <div className="tiny">
                <b>1.</b> Price ($689K) is 4% above comp median ($663K). Two competing listings dropped this week.<br/>
                <b>2.</b> Showings trending down: 11 week 1, 8 week 2, 3 this week.<br/>
                <b>3.</b> Photos still show winter — grass is green now. Re-shoot could help.
              </div>
            </Box>

            <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <Chip sm filled>draft price-drop convo</Chip>
              <Chip sm>book re-shoot</Chip>
              <Chip sm>pull fresh CMA</Chip>
              <Chip sm>remind me tomorrow</Chip>
              <Chip sm>dismiss</Chip>
            </div>
          </div>
        </div>
      </Box>

      <div className="hand-alt tiny" style={{ marginTop: 18 }}>EARLIER · 8:03am · morning briefing</div>
      <Box tan style={{ marginTop: 8, padding: 14 }}>
        <div className="row" style={{ gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>☕</div>
          <div style={{ flex: 1 }}>
            <b>Morning. You've got 4 things today.</b>
            <div className="tiny" style={{ marginTop: 6 }}>Showings 12:45 + 3:30 · Hendersons call 10am · Jen's closing anniversary Sunday (send card?) · 2 inspection contingency deadlines this week.</div>
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              <Chip sm filled>walk me through each</Chip>
              <Chip sm>prep my 10am</Chip>
              <Chip sm>skip to showings</Chip>
            </div>
          </div>
        </div>
      </Box>
    </div>

    <div style={{ maxWidth: 280, paddingTop: 20 }}>
      <div className="hand-alt">Proactive · AI starts</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Command doesn't just wait to be asked. It watches your data — listings, pipeline, anniversaries — and opens a thread when something deserves attention.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">TRIGGERS</div>
        <div className="tiny" style={{ marginTop: 6 }}>DOM exceeds zip avg · showing velocity drop · inspection deadline &lt; 48hr · contact silent &gt; 90d · anniversary in 7d · offer-deadline in 24hr.</div>
      </Box>
      <Box dashed style={{ marginTop: 10, padding: 10 }}>
        <div className="tiny mono">NEVER ANNOYING</div>
        <div className="tiny" style={{ marginTop: 6 }}>Max 3 proactive prompts per day. Batched into morning briefing unless truly urgent.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V8 · CONTEXT PICKER / FOLLOW-UPS ====================== */
function Chat8_Context() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ width: 520 }}>
      <Box style={{ padding: 12 }}>
        <div className="hand-alt tiny">✦ ASK COMMAND</div>
        <input className="wf-input" placeholder="about..." style={{ marginTop: 6, width: '100%', fontFamily: 'inherit' }} defaultValue="draft a farm update email" />

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>WITH CONTEXT FROM</div>
        <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {[
            ['@oak-park-farm',     true,  '847 contacts'],
            ['@last-week-sales',   true,  '3 closings'],
            ['@my-voice',          true,  'tone file'],
            ['@spring-market-data', false, 'zip stats'],
            ['@testimonials',       false, '14 saved'],
            ['@just-listed',        false, '47 Olive'],
          ].map(([label, on, hint], i) => (
            <div key={i} className="wf-chip" style={{
              background: on ? 'var(--accent-sage)' : 'transparent',
              color: on ? 'var(--paper)' : 'var(--muted)',
              border: on ? 'none' : '1px dashed var(--line)',
              fontSize: 11, padding: '4px 10px',
            }}>
              {label} <span style={{ opacity: 0.7, marginLeft: 4 }}>{hint}</span>
            </div>
          ))}
        </div>

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>OR TYPE @ TO ADD</div>
        <Box dashed style={{ marginTop: 6, padding: 8 }}>
          <div className="tiny mono">@</div>
          <div style={{ marginTop: 6 }}>
            {['contact', 'listing', 'deal', 'farm', 'campaign', 'document', 'date range', 'call transcript'].map((t, i) => (
              <div key={i} className="row between" style={{ padding: '4px 0', fontSize: 12 }}>
                <span>@{t}</span>
                <span className="tiny muted">search {t}s</span>
              </div>
            ))}
          </div>
        </Box>

        <Btn primary block style={{ marginTop: 12 }}>Draft →</Btn>
      </Box>
    </div>

    <div style={{ maxWidth: 280, paddingTop: 20 }}>
      <div className="hand-alt">Contextual @mentions</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Unlike ChatGPT, Command knows your data. @contact, @listing, @farm, @campaign — any entity pulls in real data to ground the response.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">GROUNDED = NO HALLUCINATIONS</div>
        <div className="tiny" style={{ marginTop: 6 }}>If you @ a listing, every stat in the draft is real. Prices, sqft, features — all from MLS, not invented.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V9 · AI CAPABILITIES EXPLORER ====================== */
function Chat9_Capabilities() {
  const groups = [
    ['Find', '🔍', ['who haven\'t I texted in 90 days', 'homes with pools under $700K in my farm', 'contacts who opened my last 3 emails but never replied', 'everything Mike said about 47 Olive']],
    ['Draft', '✎', ['a just-listed text for the Chen listing', 'a price-drop email to the Hendersons', '10 Instagram captions about the new gym on Main', 'a personalized video script for Alison']],
    ['Analyze', '📊', ['how am I doing vs goal this quarter', 'which source sent me the most closings last year', 'why is my buyer conversion dropping', 'am I pricing listings too aggressively']],
    ['Do', '⚡', ['send this to everyone on the Oak Park farm', 'schedule the 12 Instagram posts for next week', 'book CMA review calls with sellers at 30 DOM', 'build me a listing deck for 47 Olive']],
    ['Remember', '🧠', ['Miguel\'s dog is Biscuit', 'never call Ashley before 10am', 'Jen\'s anniversary is March 22', 'the Hendersons care more about schools than price']],
  ];

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="What Command can do" url="command.app/chat/capabilities" style={{ width: 900 }}>
      <div className="hand-alt tiny">✦ COMMAND CAN</div>
      <div className="serif" style={{ fontSize: 30 }}>Try any of these</div>
      <div className="tiny muted" style={{ marginTop: 4 }}>Click to run · tap the star to save to your shortcuts.</div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {groups.map((g, i) => (
          <Box key={i} style={{ padding: 12 }}>
            <div className="row between center">
              <div className="hand-alt tiny">{g[1]} {g[0].toUpperCase()}</div>
              <span className="tiny muted">{g[2].length} examples</span>
            </div>
            {g[2].map((ex, j) => (
              <div key={j} className="row between" style={{ padding: '8px 0', borderTop: '1px dashed var(--faint)', fontSize: 12 }}>
                <span style={{ flex: 1 }}>"{ex}"</span>
                <span className="tiny muted">☆</span>
              </div>
            ))}
          </Box>
        ))}
      </div>

      <Box dashed style={{ marginTop: 14, padding: 12 }}>
        <div className="hand-alt tiny">WHAT IT WON'T DO</div>
        <div className="tiny" style={{ marginTop: 6 }}>
          ✗ Send without showing you the draft · ✗ Invent contact details · ✗ Quote prices it can't back up with MLS ·
          ✗ Post publicly without your approval · ✗ Commit you to anything with a client · ✗ Share data across team members without permission.
        </div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 240, paddingTop: 20 }}>
      <div className="hand-alt">Capabilities menu</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>New agents don't know what to ask. This page is the 30-second "here's what you have" tour — accessible from ⌘/ or the pill menu.</p>
    </div>
  </div>;
}

/* ====================== REGISTRATIONS ====================== */

window.AIChatScreens = [
  { id: 'ai1', label: 'V1 · Ambient pill',       caption: 'Floating command pill, always available. ⌘/ or hold to dictate. Context-aware.',   Component: Chat1_Pill },
  { id: 'ai2', label: 'V2 · Expanded · in-context', caption: 'In-context chat with suggested actions. Grounded in the current entity.',         Component: Chat2_Expanded },
  { id: 'ai3', label: 'V3 · Voice · press & hold', caption: 'Hold to dictate, release to send. Multi-intent parsed into confirm-per-item.',     Component: Chat3_Voice },
  { id: 'ai4', label: 'V4 · Multi-action confirm', caption: 'Never run silently. Preview every action with approve/edit/skip.',                  Component: Chat4_Confirm },
  { id: 'ai5', label: 'V5 · Full chat history',   caption: 'Searchable, pinnable, saved conversations become templates.',                       Component: Chat5_History },
  { id: 'ai6', label: 'V6 · Mobile · everywhere', caption: 'Floating + expanded on phone. Car-safe mode for between showings.',                 Component: Chat6_Mobile },
  { id: 'ai7', label: 'V7 · Proactive · AI starts', caption: 'Command watches your data and opens a thread when something deserves attention.',  Component: Chat7_Proactive },
  { id: 'ai8', label: 'V8 · Contextual @mentions', caption: 'Pull in real data: @contact, @listing, @farm. Grounded = no hallucinations.',       Component: Chat8_Context },
  { id: 'ai9', label: 'V9 · Capabilities explorer', caption: 'Try-any-of-these directory. What Command can do · what it won\'t do.',              Component: Chat9_Capabilities },
];

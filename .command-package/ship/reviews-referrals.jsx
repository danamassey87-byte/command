/* ============================================================
   REFERRALS + REVIEWS · ASK FLOW · TESTIMONIALS · REFERRAL TREE
   ============================================================ */

/* ====================== V1 · TIMING ENGINE · WHO TO ASK ====================== */
function Rev1_Timing() {
  const queue = [
    ['Jen Ortiz',        'past client · closed Mar 24',  'perfect',  'closed 28d ago · no ask yet · tagged "raving fan"', 'ask now'],
    ['the Chens',        'sellers · closed Apr 12',       'perfect',  'closed 10d ago · they cried at closing', 'ask now'],
    ['Marcus + Sara',    'buyers · closed Feb 08',        'warm',     'closed 73d ago · sent gift · replied happy', 'ask soon'],
    ['the Hendersons',   'sellers · NO CLOSE',             'skip',     'deal fell through · NEVER ask', '—'],
    ['Alison Chen',      'buyer · active',                 'too-early','still searching · no deal yet', 'wait'],
    ['Miguel R.',        'past client · closed 2023',      'stale',    'closed 14mo ago · already reviewed 5★', 'done'],
    ['the Pattersons',   'past client · closed 2024',      're-ask',   'closed 8mo · 5★ Google · no video yet', 'ask video'],
  ];

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Reviews · who to ask" url="command.app/reviews" style={{ width: 900 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">✦ REVIEW ENGINE · 7 ready to ask</div>
          <div className="serif" style={{ fontSize: 26 }}>The ask, at the right time</div>
          <div className="tiny muted">Command watches every deal close, every gift sent, every happy text. Surfaces ask-worthy moments.</div>
        </div>
        <Btn primary>Send 2 "perfect" asks →</Btn>
      </div>

      <div className="row" style={{ gap: 6, marginTop: 14 }}>
        {[['perfect', 2, 'var(--accent-sage)'], ['warm', 1, 'var(--accent-tan)'], ['re-ask', 1, 'var(--accent-tan)'], ['too-early', 1, 'var(--muted)'], ['skip', 1, 'var(--accent-rose)'], ['done', 1, 'var(--muted)']].map(([l, n, c], i) => (
          <Chip key={i} sm style={{ background: c, color: 'var(--paper)', border: 'none' }}>{l} · {n}</Chip>
        ))}
      </div>

      <Box style={{ marginTop: 14, padding: 0 }}>
        <div className="row" style={{ padding: '8px 12px', background: 'var(--tint)', fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
          <span style={{ width: 140 }}>CLIENT</span>
          <span style={{ width: 200 }}>RELATIONSHIP</span>
          <span style={{ width: 80 }}>SIGNAL</span>
          <span style={{ flex: 1 }}>WHY</span>
          <span style={{ width: 90 }}>ACTION</span>
        </div>
        {queue.map((r, i) => (
          <div key={i} className="row" style={{ padding: '10px 12px', borderTop: '1px dashed var(--faint)', fontSize: 12, alignItems: 'center', background: r[2] === 'perfect' ? 'var(--accent-sage-2)' : 'transparent' }}>
            <b style={{ width: 140 }}>{r[0]}</b>
            <span style={{ width: 200 }} className="muted">{r[1]}</span>
            <Chip sm style={{ width: 68, fontSize: 10,
              background: r[2] === 'perfect' ? 'var(--accent-sage)' : r[2] === 'skip' ? 'var(--accent-rose)' : r[2] === 'done' ? 'transparent' : 'var(--accent-tan)',
              color: r[2] === 'done' ? 'var(--muted)' : 'var(--paper)',
              border: r[2] === 'done' ? '1px dashed var(--line)' : 'none',
              justifyContent: 'center', display: 'flex',
            }}>{r[2]}</Chip>
            <span style={{ flex: 1, marginLeft: 8 }}>{r[3]}</span>
            <Chip sm filled={r[4] !== '—' && r[4] !== 'wait'} style={{ width: 80, fontSize: 10 }}>{r[4]}</Chip>
          </div>
        ))}
      </Box>

      <Box dashed style={{ marginTop: 14, padding: 12 }}>
        <div className="hand-alt tiny">WHY TIMING MATTERS</div>
        <div className="tiny" style={{ marginTop: 6 }}>
          <b>Week 2–4 after close</b> is the sweet spot — fresh emotion, but past the move-in chaos. Waiting too long &gt; you get "I meant to but...". Asking too early &gt; exhausted client says no.
        </div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Timing engine</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Most agents forget to ask — or ask everyone at the same stale moment. This surfaces exactly who's ready right now.</p>
    </div>
  </div>;
}

/* ====================== V2 · THE ASK FLOW (mobile client view) ====================== */
function Rev2_AskFlow() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Phone>
      <div style={{ padding: '14px 16px', textAlign: 'center' }}>
        <Avatar initials="DM" size={44} />
        <div className="serif" style={{ fontSize: 18, marginTop: 10 }}>Dana Martinez sent you a note</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>about your move to Oak Park</div>

        <Box dashed style={{ marginTop: 14, padding: 12, textAlign: 'left' }}>
          <div className="hand-alt tiny">MARCH 24 · CLOSING DAY</div>
          <Img label="you, kids + keys photo" h={120} style={{ marginTop: 6 }} />
          <div className="tiny" style={{ marginTop: 8, fontFamily: "'Caveat',cursive", fontSize: 16, lineHeight: 1.2 }}>
            "Jen — still get choked up seeing this. Thank you for trusting me with the biggest yes. Hope the kids are loving the yard."
          </div>
          <div className="tiny muted" style={{ marginTop: 6 }}>— Dana</div>
        </Box>

        <div style={{ marginTop: 18, padding: '0 4px' }}>
          <div className="tiny" style={{ lineHeight: 1.4 }}>
            Would you be open to sharing your experience? Totally optional — if it's easier to <b>talk</b> than type, use the video option. Takes &lt;2 min.
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn primary block>📹 1-tap video (best)</Btn>
          <Btn block>✍ write a paragraph</Btn>
          <Btn block>⭐ post to Google (1-tap)</Btn>
          <div className="tiny muted" style={{ marginTop: 4 }}>or · later / no thanks</div>
        </div>
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '14px 16px' }}>
        <div className="hand-alt tiny">📹 VIDEO REVIEW · 3 prompts</div>
        <Img label="camera preview · you" h={200} style={{ marginTop: 8 }} />

        <Box dashed style={{ marginTop: 10, padding: 10 }}>
          <div className="tiny mono">PROMPT 1 of 3</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>What were you scared of when you started?</div>
        </Box>

        <div className="row" style={{ gap: 6, marginTop: 10, justifyContent: 'center' }}>
          <Btn sm>skip prompt</Btn>
          <Btn primary sm>● record · 30s</Btn>
          <Btn sm>next</Btn>
        </div>

        <Box dashed style={{ marginTop: 10, padding: 8 }}>
          <div className="tiny">📍 Upcoming · "What surprised you about Dana" · "Would you send a friend?"</div>
        </Box>
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '14px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginTop: 40 }}>✨</div>
        <div className="serif" style={{ fontSize: 20, marginTop: 10 }}>Thank you, Jen.</div>
        <div className="tiny muted" style={{ marginTop: 6 }}>That meant more than you know.</div>

        <Box dashed style={{ marginTop: 18, padding: 12, textAlign: 'left' }}>
          <div className="hand-alt tiny">ONE MORE THING?</div>
          <div className="tiny" style={{ marginTop: 6 }}>Know anyone else thinking of moving? I'd love to help them the way I helped you.</div>
          <input className="wf-input" placeholder="friend's name..." style={{ width: '100%', marginTop: 8 }} />
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            <Btn sm>share my info</Btn>
            <Btn sm ghost>skip</Btn>
          </div>
        </Box>
      </div>
    </Phone>

    <div style={{ maxWidth: 220, paddingTop: 20 }}>
      <div className="hand-alt">The ask · client view</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Not a link to Google. A personal moment. Video is the default because it's the highest-impact and lowest-effort.</p>
      <Box dashed style={{ marginTop: 12, padding: 10 }}>
        <div className="tiny mono">3 PROMPTS = BETTER VIDEO</div>
        <div className="tiny" style={{ marginTop: 6 }}>People freeze on "say something nice." 3 specific questions = authentic, specific, usable clips.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V3 · TESTIMONIAL LIBRARY ====================== */
function Rev3_Library() {
  const testimonials = [
    ['Jen Ortiz',    'video',   '0:47',  'Mar 24 close · Oak Park',  ['patient','first-time','schools'],     'published', 'IG+web+bio'],
    ['the Chens',    'video',   '1:12',  'Apr 12 close · listing',    ['honest','tough convo','net'],          'published', 'web+bio'],
    ['Marcus+Sara',  'written', '—',     'Feb 08 close · buyers',      ['investment','numbers','calm'],         'published', 'web'],
    ['the Pattersons','video',  '0:38',  '2024 close · sellers',       ['fast','high-offer','staging'],         'draft',     '—'],
    ['M. Ramirez',   'written', '—',     '2024 referral · buyers',     ['1st gen','bilingual','trust'],         'published', 'web+bio'],
    ['D. Weber',     'google',  '—',     '2023 close · buyer',         ['relocation','remote','kind'],          '5★',        'Google'],
    ['J. Tran',      'google',  '—',     '2023 close · listing',       ['staging','light','responsive'],        '5★',        'Google'],
  ];

  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Testimonial library" url="command.app/reviews/library" style={{ width: 900 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">✦ TESTIMONIAL LIBRARY · 24 assets</div>
          <div className="serif" style={{ fontSize: 26 }}>Proof, ready to use</div>
          <div className="tiny muted">Searchable by tag. Drop into any listing deck, email, social post, or bio page.</div>
        </div>
        <Btn sm primary>request new</Btn>
      </div>

      <div className="row" style={{ gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <Chip sm filled>all</Chip>
        <Chip sm>video only</Chip>
        <Chip sm>written</Chip>
        <Chip sm>google</Chip>
        <Chip sm>— tag —</Chip>
        <Chip sm>patient</Chip>
        <Chip sm>honest</Chip>
        <Chip sm>first-time</Chip>
        <Chip sm>investment</Chip>
        <Chip sm>bilingual</Chip>
        <Chip sm>+ 12 more</Chip>
      </div>

      <Box style={{ marginTop: 12, padding: 0 }}>
        {testimonials.map((t, i) => (
          <div key={i} className="row" style={{ padding: 12, borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12, alignItems: 'center', gap: 10 }}>
            <div style={{ width: 60, height: 60, background: t[1] === 'video' ? 'var(--ink)' : 'var(--tint)', color: t[1] === 'video' ? 'var(--paper)' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, flexShrink: 0 }}>
              {t[1] === 'video' ? '▶' : t[1] === 'google' ? 'G' : '"'}
            </div>
            <div style={{ width: 130 }}><b>{t[0]}</b><div className="tiny muted">{t[1]} · {t[2]}</div></div>
            <div style={{ width: 160 }} className="muted">{t[3]}</div>
            <div style={{ flex: 1, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {t[4].map((tag, j) => <Chip key={j} sm>{tag}</Chip>)}
            </div>
            <Chip sm filled={t[5] === 'published'}>{t[5]}</Chip>
            <span className="tiny muted" style={{ width: 70, textAlign: 'right' }}>{t[6]}</span>
          </div>
        ))}
      </Box>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">AI TAGGING</div>
          <div className="tiny" style={{ marginTop: 6 }}>Command watches each video and auto-tags emotion, phrases, scenarios — so you can grab the right clip for the right deck.</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">USAGE TRACKING</div>
          <div className="tiny" style={{ marginTop: 6 }}>See which testimonials convert best. Jen's video has driven 4 listing appts since March.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Library</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Every captured testimonial is tagged + searchable. Your entire career of proof, instantly findable.</p>
    </div>
  </div>;
}

/* ====================== V4 · VIDEO CLIP EDITOR ====================== */
function Rev4_ClipEditor() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Testimonial · Jen Ortiz" url="command.app/reviews/jen-ortiz" style={{ width: 900 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">TESTIMONIAL · JEN ORTIZ · 0:47</div>
          <div className="serif" style={{ fontSize: 22 }}>3 usable clips from this one video</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <Btn sm>download full</Btn>
          <Btn sm primary>publish clips</Btn>
        </div>
      </div>

      <Box style={{ marginTop: 12, padding: 12 }}>
        <Img label="video · Jen on couch at closing" h={240} />
        {/* Timeline */}
        <div style={{ marginTop: 10, position: 'relative', height: 50 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'var(--tint)', border: '1px dashed var(--line)' }} />
          {/* Clip highlights */}
          <div style={{ position: 'absolute', left: '8%', width: '18%', top: 4, bottom: 4, background: 'var(--accent-sage)', opacity: 0.7 }}><span className="tiny" style={{ color: 'var(--paper)', padding: 4 }}>clip 1</span></div>
          <div style={{ position: 'absolute', left: '34%', width: '14%', top: 4, bottom: 4, background: 'var(--accent-tan)', opacity: 0.7 }}><span className="tiny" style={{ color: 'var(--ink)', padding: 4 }}>clip 2</span></div>
          <div style={{ position: 'absolute', left: '68%', width: '22%', top: 4, bottom: 4, background: 'var(--accent-rose)', opacity: 0.7 }}><span className="tiny" style={{ color: 'var(--paper)', padding: 4 }}>clip 3</span></div>
        </div>
        <div className="tiny mono" style={{ marginTop: 4 }}>0:00 ————————— 0:47</div>
      </Box>

      <div className="row" style={{ gap: 10, marginTop: 12 }}>
        {[
          ['clip 1', '0:04 — 0:12', 'The scared moment', '"I thought we couldn\'t afford anything in a school we actually wanted."', 'IG reel · vertical', 'var(--accent-sage)'],
          ['clip 2', '0:16 — 0:23', 'The turning point', '"She made us see the third house differently — and that changed everything."', 'web · horizontal', 'var(--accent-tan)'],
          ['clip 3', '0:32 — 0:43', 'The recommendation', '"If you\'re moving with kids, just call Dana. She gets it."', 'bio page · square', 'var(--accent-rose)'],
        ].map((c, i) => (
          <Box key={i} style={{ padding: 10, flex: 1, borderTopWidth: 4, borderTopStyle: 'solid', borderTopColor: c[5] }}>
            <div className="row between">
              <b style={{ fontSize: 13 }}>{c[0]}</b>
              <span className="tiny muted">{c[1]}</span>
            </div>
            <div className="tiny" style={{ marginTop: 4 }}>{c[2]}</div>
            <div className="tiny" style={{ marginTop: 6, fontFamily: "'Caveat',cursive", fontSize: 13 }}>"{c[3]}"</div>
            <div className="tiny mono" style={{ marginTop: 8, color: 'var(--muted)' }}>{c[4]}</div>
            <div className="row" style={{ gap: 4, marginTop: 6 }}>
              <Chip sm filled>use here</Chip>
              <Chip sm>download</Chip>
            </div>
          </Box>
        ))}
      </div>

      <Box dashed style={{ marginTop: 14, padding: 10 }}>
        <div className="tiny mono">✦ AI CAPTIONING</div>
        <div className="tiny" style={{ marginTop: 4 }}>Each clip gets burned-in captions (brand font), optimized aspect ratio per channel, and auto-generated social captions tuned to each platform.</div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Clip editor</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>AI identifies 3 usable moments from every testimonial — the story arc, the pivot, the rec. Ready for different channels.</p>
    </div>
  </div>;
}

/* ====================== V5 · REFERRAL TREE · PROVENANCE ====================== */
function Rev5_Tree() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Referral tree" url="command.app/referrals/tree" style={{ width: 900 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">✦ REFERRAL NETWORK · traced to source</div>
          <div className="serif" style={{ fontSize: 26 }}>Where your business comes from</div>
          <div className="tiny muted">Every client, traced back to the friend-of-friend who started the chain. 23 closings last year · 14 roots.</div>
        </div>
        <Btn sm>filter by year ›</Btn>
      </div>

      <div className="row" style={{ gap: 6, marginTop: 12 }}>
        <Chip sm filled>Miguel Ramirez (2019) · 6 descendants · $92K GCI</Chip>
        <Chip sm>Jen Ortiz (2024) · 0 · $18K</Chip>
        <Chip sm>the Chens (2025) · 0 · $24K</Chip>
        <Chip sm>+ 11 roots</Chip>
      </div>

      {/* Tree visualization — ASCII-sketchy */}
      <Box style={{ marginTop: 12, padding: 16, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.6 }}>
        <div>● <b>Miguel Ramirez</b>                                                   <span style={{ color: 'var(--muted)' }}>root · 2019 closing · Zillow lead</span></div>
        <div>├── ● <b>his brother Carlos</b>                                           <span style={{ color: 'var(--muted)' }}>2020 · $8K GCI</span></div>
        <div>│   ├── ● Tanya (Carlos's coworker)                                      <span style={{ color: 'var(--muted)' }}>2022 · $14K</span></div>
        <div>│   │   └── ● <b>the Weber family</b>                                    <span style={{ color: 'var(--muted)' }}>2024 · $22K</span></div>
        <div>│   └── ● Carlos again (upgrade)                                          <span style={{ color: 'var(--muted)' }}>2024 · $19K</span></div>
        <div>├── ● Miguel's mom (Rosa)                                                 <span style={{ color: 'var(--muted)' }}>2021 · $11K</span></div>
        <div>└── ● Miguel again (investment prop)                                      <span style={{ color: 'var(--muted)' }}>2023 · $18K</span></div>
        <div style={{ marginTop: 8 }}>● <b>Jen Ortiz</b>                                                      <span style={{ color: 'var(--muted)' }}>root · 2024 closing · FB ad</span></div>
        <div>│   <i>(gave 3 ref intros this month — watching)</i></div>
        <div style={{ marginTop: 8 }}>● <b>D. Weber family</b>                                               <span style={{ color: 'var(--muted)' }}>2024 · relocation root</span></div>
        <div>└── ● the Pattersons (Weber's neighbors)                                  <span style={{ color: 'var(--muted)' }}>2024 · $26K</span></div>
      </Box>

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">✦ INSIGHT</div>
          <div className="tiny" style={{ marginTop: 4 }}>Miguel alone has generated <b>$92K GCI across 6 deals</b> over 6 years. Treating him like a $92K client (not an $8K one) would change everything.</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">PROACTIVE REMINDERS</div>
          <div className="tiny" style={{ marginTop: 4 }}>Command now nudges you before Miguel's birthday, home anniversary, tax-season equity check — because he's a root, not a leaf.</div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">The tree</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Most agents don't know which client is actually their top referrer. The provenance graph makes it impossible to forget who to nurture.</p>
    </div>
  </div>;
}

/* ====================== V6 · REFERRAL INCENTIVE / TRACKING ====================== */
function Rev6_Incentive() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Referral · Miguel sent Carlos" url="command.app/referrals/intro-392" style={{ width: 900 }}>
      <div className="hand-alt tiny">INTRO · apr 21 · from Miguel Ramirez</div>
      <div className="serif" style={{ fontSize: 24 }}>Carlos Santos · looking in Oak Park</div>

      <div className="row" style={{ gap: 12, marginTop: 14, alignItems: 'flex-start' }}>
        {/* Left: the intro */}
        <Box style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">HOW IT CAME IN</div>
          <Box dashed style={{ marginTop: 8, padding: 10 }}>
            <div className="tiny" style={{ fontFamily: "'Caveat',cursive", fontSize: 14 }}>
              "Hey Dana — my brother Carlos is looking in Oak Park. Budget around $550. You still the go-to? —M"
            </div>
            <div className="tiny mono" style={{ marginTop: 6, color: 'var(--muted)' }}>sms · Apr 21 · 3:02pm</div>
          </Box>

          <div className="hand-alt tiny" style={{ marginTop: 14 }}>AI AUTO-RESPONSE (drafted)</div>
          <Box tan style={{ marginTop: 8, padding: 10 }}>
            <div className="tiny">"Miguel — YES, and thank you. Tell Carlos I'll text him tonight. Remind me — same beer you like?"</div>
            <div className="row" style={{ gap: 6, marginTop: 8 }}>
              <Btn sm primary>send</Btn>
              <Btn sm>edit</Btn>
            </div>
          </Box>

          <div className="hand-alt tiny" style={{ marginTop: 14 }}>AUTO-ACTIONS QUEUED</div>
          {[
            ['create Carlos as lead', 'tagged: from Miguel (referral)'],
            ['source: referral · root = Miguel', 'for tree tracking'],
            ['send Carlos opening text', 'soft intro · not salesy'],
            ['schedule Miguel thank-you gift', '14 days · if Carlos engages'],
            ['schedule Miguel closing gift', 'if Carlos closes · 15% of GCI budget'],
          ].map((a, i) => (
            <div key={i} className="row between" style={{ padding: '8px 0', borderTop: '1px dashed var(--faint)', fontSize: 12 }}>
              <span>✓ {a[0]}</span><span className="tiny muted">{a[1]}</span>
            </div>
          ))}
        </Box>

        {/* Right: Miguel's value */}
        <div style={{ width: 280 }}>
          <Box filled style={{ padding: 12 }}>
            <div className="hand-alt tiny">MIGUEL'S LIFETIME VALUE</div>
            <div className="serif" style={{ fontSize: 30 }}>$92K</div>
            <div className="tiny" style={{ marginTop: 4 }}>6 deals across his tree · since 2019</div>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">LAST GIFT SENT</div>
            <div className="tiny" style={{ marginTop: 4 }}>Dec 2024 · mezcal + Biscuit's dog toy · $80</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>(Biscuit is his golden retriever.)</div>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">NEXT TOUCH (scheduled)</div>
            <div className="tiny" style={{ marginTop: 4 }}>May 4 · his wife Sofia's bday · flowers + handwritten card</div>
          </Box>

          <Box dashed style={{ marginTop: 10, padding: 10 }}>
            <div className="tiny mono">✦ SUGGESTED</div>
            <div className="tiny" style={{ marginTop: 4 }}>You haven't been to dinner w/ Miguel + Sofia in 11mo. Want me to suggest 3 times?</div>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <Btn sm filled>yes, draft</Btn>
              <Btn sm>later</Btn>
            </div>
          </Box>
        </div>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Referral · in motion</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>When an intro lands, Command instantly tags the source, drafts the thank-you, queues the gift, and surfaces Miguel's full history so you don't fumble.</p>
    </div>
  </div>;
}

/* ====================== V7 · REVIEW WALL (public) ====================== */
function Rev7_Wall() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <div style={{ width: 780 }}>
      <div className="hand-alt tiny">PUBLIC · danamartinez.com/reviews</div>
      <Box style={{ marginTop: 8, padding: 20, background: 'var(--paper)' }}>
        <div className="row between">
          <div>
            <div className="serif" style={{ fontSize: 28 }}>What clients say</div>
            <div className="tiny muted">127 reviews · 4.96★ avg · 68 video · from 2018–today</div>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <Chip sm>all</Chip>
            <Chip sm>video</Chip>
            <Chip sm filled>first-time</Chip>
            <Chip sm>sellers</Chip>
          </div>
        </div>

        {/* Masonry testimonial grid */}
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          <Box dashed style={{ padding: 10, gridRow: 'span 2' }}>
            <Img label="▶ Jen Ortiz video" h={180} />
            <div className="tiny muted" style={{ marginTop: 4 }}>Jen O. · Oak Park · Mar 2025</div>
            <div className="tiny" style={{ marginTop: 4, fontFamily: "'Caveat',cursive", fontSize: 14 }}>"If you're moving with kids, just call Dana."</div>
          </Box>
          <Box dashed style={{ padding: 10 }}>
            <div className="tiny">★★★★★</div>
            <div className="tiny" style={{ marginTop: 4 }}>"Honest when she told us the house wasn't right. Saved us from a disaster."</div>
            <div className="tiny muted" style={{ marginTop: 6 }}>— M. Webb</div>
          </Box>
          <Box dashed style={{ padding: 10 }}>
            <Img label="▶ Chen video" h={120} />
          </Box>
          <Box dashed style={{ padding: 10 }}>
            <div className="tiny">★★★★★</div>
            <div className="tiny" style={{ marginTop: 4 }}>"We closed $24K over list in 6 days. Her pricing call was everything."</div>
            <div className="tiny muted" style={{ marginTop: 6 }}>— the Pattersons</div>
          </Box>
          <Box dashed style={{ padding: 10 }}>
            <div className="tiny">★★★★★</div>
            <div className="tiny" style={{ marginTop: 4 }}>"Bilingual, patient, real. Explained every doc so my mom could understand."</div>
            <div className="tiny muted" style={{ marginTop: 6 }}>— M. Ramirez</div>
          </Box>
          <Box dashed style={{ padding: 10 }}>
            <Img label="▶ Weber video" h={120} />
          </Box>
        </div>

        <Box tan style={{ marginTop: 18, padding: 14, textAlign: 'center' }}>
          <div className="serif" style={{ fontSize: 18 }}>Your move could be next.</div>
          <div className="tiny muted" style={{ marginTop: 4 }}>15-min call · no pressure, just a plan.</div>
          <Btn primary style={{ marginTop: 10 }}>Book my intro call →</Btn>
        </Box>
      </Box>
    </div>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Public wall</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>One link (danamartinez.com/reviews) you can send to any prospect who asks for references. Rotates videos, filters by category.</p>
      <Box dashed style={{ marginTop: 10, padding: 10 }}>
        <div className="tiny mono">SEO + AEO</div>
        <div className="tiny" style={{ marginTop: 4 }}>Reviews are indexed + schema-marked so they feed Google's Knowledge Panel + LLM answer-engines.</div>
      </Box>
    </div>
  </div>;
}

/* ====================== V8 · FOLLOW-UP · REMINDER IF THEY GHOST ====================== */
function Rev8_Followup() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Review ask · Jen Ortiz · sent 4d ago" url="command.app/reviews/ask-jen" style={{ width: 820 }}>
      <div className="row between center">
        <div>
          <div className="hand-alt tiny">ASK · JEN ORTIZ · sent apr 17</div>
          <div className="serif" style={{ fontSize: 22 }}>Not a reply in 4 days</div>
        </div>
        <Chip sm filled>awaiting</Chip>
      </div>

      {/* Timeline */}
      <Box style={{ marginTop: 14, padding: 0 }}>
        {[
          ['apr 17 · 2:14pm',  'sent',     'text with personal note + photo · opened',   '✓'],
          ['apr 17 · 2:16pm',  'clicked',  'tapped into the ask page · didn\'t record',  '→'],
          ['apr 18 · —',        '—',        'no action',                                 '·'],
          ['apr 19 · 9:02am',  'nudge?',   'Command waiting · will auto-nudge apr 21',   '·'],
          ['apr 21 · 10am',    'plan',     'soft follow-up: "no pressure · one last nudge then I stop"', 'queued'],
          ['apr 24 · —',       'stop',     'if still silent · archive, don\'t bug again', '—'],
        ].map((r, i) => (
          <div key={i} className="row" style={{ padding: '10px 12px', borderTop: i ? '1px dashed var(--faint)' : 'none', fontSize: 12, alignItems: 'center', gap: 10, background: r[1] === 'plan' ? 'var(--accent-sage-2)' : 'transparent' }}>
            <span className="mono tiny" style={{ width: 130 }}>{r[0]}</span>
            <Chip sm style={{ width: 70, fontSize: 10 }}>{r[1]}</Chip>
            <span style={{ flex: 1 }}>{r[2]}</span>
            <span className="tiny mono">{r[3]}</span>
          </div>
        ))}
      </Box>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">THE RULE: 3 NUDGES MAX</div>
          <div className="tiny" style={{ marginTop: 4 }}>Never become the agent who annoys past clients. After 3 soft asks, Command archives and puts them back in normal care rhythm — no guilt, no loop.</div>
        </Box>
        <Box dashed style={{ padding: 10, flex: 1 }}>
          <div className="tiny mono">✦ RE-ASK WINDOW</div>
          <div className="tiny" style={{ marginTop: 4 }}>If they never give a review, Command waits 12 months and asks at a new trigger — home anniversary or referral event — not a cold ping.</div>
        </Box>
      </div>

      <Box tan style={{ marginTop: 14, padding: 12 }}>
        <div className="hand-alt tiny">✦ DRAFTED SOFT NUDGE (queued apr 21)</div>
        <div className="tiny" style={{ marginTop: 6, fontFamily: "'Caveat',cursive", fontSize: 15 }}>
          "Hey Jen — totally no pressure, I know life. If it's not a good moment for that video, I'll stop bugging you 😅 But if you ever do want to, the link's still there. Hope the yard's been perfect."
        </div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <Btn sm primary>approve · send apr 21</Btn>
          <Btn sm>edit</Btn>
          <Btn sm ghost>skip · don't nudge</Btn>
        </div>
      </Box>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Respectful follow-up</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>The hardest part of asking for reviews is knowing when to stop. Command handles that for you so you never feel pushy.</p>
    </div>
  </div>;
}

/* ====================== V9 · DASHBOARD · REVIEW HEALTH ====================== */
function Rev9_Health() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Desktop active="Reviews · health" url="command.app/reviews/health" style={{ width: 900 }}>
      <div className="hand-alt tiny">✦ REVIEW HEALTH · quarterly</div>
      <div className="serif" style={{ fontSize: 26 }}>How your proof machine is running</div>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        {[
          ['Ask rate',           '74%',  'of perfect-timing closings get asked',    'up 22% q/q'],
          ['Response rate',      '58%',  'of asks become a review',                  'up 8% q/q'],
          ['Video rate',         '41%',  'of responses are video',                   'up 14% q/q'],
          ['Referral intros',    '11',   'from past clients this quarter',            'down 2'],
        ].map((s, i) => (
          <Box key={i} style={{ padding: 12, flex: 1 }}>
            <div className="hand-alt tiny">{s[0]}</div>
            <div className="serif" style={{ fontSize: 28, marginTop: 4 }}>{s[1]}</div>
            <div className="tiny muted">{s[2]}</div>
            <Chip sm style={{ marginTop: 8, background: s[3].includes('up') ? 'var(--accent-sage)' : 'var(--accent-tan)', color: 'var(--paper)', border: 'none' }}>{s[3]}</Chip>
          </Box>
        ))}
      </div>

      <div className="row" style={{ gap: 12, marginTop: 14 }}>
        <Box style={{ flex: 2, padding: 12 }}>
          <div className="hand-alt tiny">WHAT'S CONVERTING</div>
          <div style={{ marginTop: 8 }}>
            {[
              ['1st-time buyer testimonials',      '6 listings won · $84K GCI'],
              ['Video > written · on bio page',    '2.3x booking rate'],
              ['Jen Ortiz clip on IG reels',       '14k views · 3 DMs · 1 listing appt'],
              ['Weber family video · paid ads',    '$1.80 CPM vs $4.10 for stock creative'],
            ].map((r, i) => (
              <div key={i} className="row between" style={{ padding: '8px 0', borderTop: '1px dashed var(--faint)', fontSize: 12 }}>
                <span>{r[0]}</span><span className="tiny muted">{r[1]}</span>
              </div>
            ))}
          </div>
        </Box>

        <Box tan style={{ flex: 1, padding: 12 }}>
          <div className="hand-alt tiny">GAPS TO CLOSE</div>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            <b>You have 0 testimonials for:</b>
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              <li>investment buyers</li>
              <li>sellers over 65</li>
              <li>bilingual Spanish</li>
              <li>relocation from CA</li>
            </ul>
            <Box dashed style={{ marginTop: 10, padding: 8 }}>
              <div className="tiny mono">✦ SUGGESTION</div>
              <div className="tiny" style={{ marginTop: 4 }}>Rosa Ramirez · bilingual · senior seller · closed 2022. Ask her for a video next month? She's mentioned you to friends 4x.</div>
              <Btn sm filled style={{ marginTop: 6 }}>queue the ask →</Btn>
            </Box>
          </div>
        </Box>
      </div>
    </Desktop>

    <div style={{ maxWidth: 260, paddingTop: 20 }}>
      <div className="hand-alt">Review health</div>
      <p className="tiny muted" style={{ marginTop: 8 }}>Quarterly snapshot of how your social proof machine is performing — plus the exact gaps to fill next.</p>
    </div>
  </div>;
}

/* ====================== REGISTRATIONS ====================== */

window.ReviewsReferralScreens = [
  { id: 'rv1', label: 'V1 · Timing engine',       caption: 'Who to ask, right now. Perfect / warm / skip — surfaced from every deal signal.', Component: Rev1_Timing },
  { id: 'rv2', label: 'V2 · Ask flow · client',   caption: 'Personal moment, not a Google link. Video-first, 3 prompts, referral nudge after.', Component: Rev2_AskFlow },
  { id: 'rv3', label: 'V3 · Testimonial library', caption: 'Tagged, searchable proof. Drop into decks, emails, bio, ads.',                  Component: Rev3_Library },
  { id: 'rv4', label: 'V4 · Video clip editor',   caption: 'AI finds 3 usable clips per testimonial · captions · per-channel aspect ratios.', Component: Rev4_ClipEditor },
  { id: 'rv5', label: 'V5 · Referral tree',       caption: 'Provenance graph: every client traced to the root who started the chain.',     Component: Rev5_Tree },
  { id: 'rv6', label: 'V6 · Referral · in motion', caption: 'Intro lands → tag source · draft thanks · queue gift · surface history.',       Component: Rev6_Incentive },
  { id: 'rv7', label: 'V7 · Public review wall',   caption: 'danamartinez.com/reviews — tagged, filterable, schema-marked for SEO+AEO.',     Component: Rev7_Wall },
  { id: 'rv8', label: 'V8 · Respectful follow-up', caption: 'Soft nudges, 3-max rule, auto-archive, re-ask at new trigger 12mo later.',     Component: Rev8_Followup },
  { id: 'rv9', label: 'V9 · Review health',        caption: 'Ask rate · response rate · video rate · gaps to close. Quarterly snapshot.',   Component: Rev9_Health },
];

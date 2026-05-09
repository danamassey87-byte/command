/* ============================================================
   MOBILE PARITY · NOTIFICATIONS · COMMAND-K
   ============================================================ */

/* ====================== MOBILE · LISTING APPT ====================== */

function MobListing1_Prep() {
  return <div className="row" style={{ gap: 20, alignItems: 'flex-start' }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">PRE-APPT · in 40 min</div>
        <div className="serif" style={{ fontSize: 22, lineHeight: 1.1, marginTop: 4 }}>47 Olive St · the Chens</div>
        <div className="tiny muted">Driving · 18 min · leave by 10:52</div>

        <div style={{ marginTop: 14 }}>
          {[
            ['Before you go',            '5 items',  '3 done'],
            ['CMA comps',                 'ready',    '8 pulled'],
            ['Seller net sheet',          'auto',     'done'],
            ['Marketing deck (48 slides)','ready',    'done'],
            ['Listing agreement',         'DocuSign',  'pending at appt'],
          ].map((r, i) => (
            <div key={i} className="row between" style={{ padding: '10px 0', borderTop: '1px dashed var(--faint)' }}>
              <div><b>{r[0]}</b><div className="tiny muted">{r[1]}</div></div>
              <span className="tiny mono">{r[2]}</span>
            </div>
          ))}
        </div>

        <Box dashed style={{ marginTop: 14, padding: 10 }}>
          <div className="tiny mono">THINGS TO REMEMBER</div>
          <div className="tiny" style={{ marginTop: 6 }}>Miguel's golden <b>Biscuit</b> is at the house · they mentioned in 2023 they had bad experience with flat-fee broker · Ashley's mom is sick so don't push for decision today.</div>
        </Box>

        <Btn primary block style={{ marginTop: 12 }}>Start drive →</Btn>
      </div>
    </Phone>

    <div style={{ maxWidth: 300, paddingTop: 20 }}>
      <div className="hand-alt">Pre-appt</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Command pulls every detail from the Lofty record, past interactions, and public data on the home. The "remember" card reads straight from your notes + voice memos.</div>
    </div>
  </div>;
}

function MobListing2_OnSite() {
  return <div className="row" style={{ gap: 20 }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="row between">
          <div>
            <div className="hand-alt tiny">ON-SITE · 11:14am</div>
            <div className="serif" style={{ fontSize: 20 }}>47 Olive St</div>
          </div>
          <Chip sm>⏱ 47 min in</Chip>
        </div>

        <Box style={{ marginTop: 10, padding: 10, background: 'var(--accent-rose-2)', borderLeft: '3px solid var(--accent-rose)' }}>
          <div className="hand-alt tiny">🎙 Recording · transcript live</div>
          <div className="tiny" style={{ marginTop: 4 }}>"...so if we list at 935, looking at Sept comps, you're probably looking at 8–14 days..."</div>
        </Box>

        <div style={{ marginTop: 12 }}>
          <div className="hand-alt tiny">QUICK CAPTURE</div>
          <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <Chip sm>📸 photo</Chip>
            <Chip sm>📝 note</Chip>
            <Chip sm>🎙 voice memo</Chip>
            <Chip sm>✏️ room measure</Chip>
            <Chip sm>⚠ issue flag</Chip>
          </div>
        </div>

        <Box style={{ marginTop: 12 }}>
          <div className="hand-alt tiny">CAPTURED · 18 items</div>
          <Hr />
          {[
            ['📸 Kitchen · back wall',        '11:02'],
            ['📝 "Roof was done 2019 per Ash"', '11:07'],
            ['⚠ HVAC unit looks old',         '11:09'],
            ['📸 Primary bath',                '11:11'],
            ['✏️ Living · 14.5 x 18',          '11:13'],
          ].map((r, i) => (
            <div key={i} className="row between" style={{ padding: '5px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
              <div className="tiny">{r[0]}</div>
              <div className="tiny mono muted">{r[1]}</div>
            </div>
          ))}
        </Box>

        <Btn primary block style={{ marginTop: 12 }}>Present pricing deck →</Btn>
      </div>
    </Phone>

    <div style={{ maxWidth: 300, paddingTop: 20 }}>
      <div className="hand-alt">On-site capture</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Everything you capture links to the listing record. Photos feed the MLS draft. Voice memo becomes the follow-up email draft.</div>
    </div>
  </div>;
}

function MobListing3_Deck() {
  return <div className="row" style={{ gap: 20 }}>
    <Phone>
      <div style={{ padding: 0, background: '#000' }}>
        <div style={{ height: 320, background: 'linear-gradient(180deg, var(--accent-tan-2), var(--ink))', color: 'var(--paper)', padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="hand-alt tiny" style={{ opacity: 0.7 }}>SLIDE 12 / 48</div>
            <div className="serif" style={{ fontSize: 20, marginTop: 8 }}>Price positioning</div>
          </div>
          <div>
            <div className="serif" style={{ fontSize: 48, lineHeight: 1 }}>$935k</div>
            <div className="tiny" style={{ opacity: 0.8, marginTop: 6 }}>within 2.1% of strongest 6 comps · 8–14 day projection</div>
          </div>
        </div>
        <div style={{ padding: 10, background: 'var(--paper)' }}>
          <div className="row" style={{ gap: 6 }}>
            <Btn sm>‹ prev</Btn>
            <Btn sm primary className="grow">next ›</Btn>
            <Btn sm>notes</Btn>
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>Ashley's eye tracking · spent 4.2s on this slide last time</div>
        </div>
      </div>
    </Phone>

    <div style={{ maxWidth: 300, paddingTop: 20 }}>
      <div className="hand-alt">Present from phone</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Mirror to TV via AirPlay, or hand iPad over. Every slide tracked — you see what they dwell on. Post-appt summary flags the hesitation slides.</div>
    </div>
  </div>;
}

function MobListing4_PostAppt() {
  return <div className="row" style={{ gap: 20 }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">POST-APPT · 1 hr ago</div>
        <div className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>47 Olive · recap ready</div>

        <Box style={{ marginTop: 12, padding: 12, background: 'var(--accent-sage-2)' }}>
          <div className="hand-alt tiny">WHAT AI HEARD</div>
          <div className="tiny" style={{ marginTop: 6 }}>They want to list at $949 · you pushed for $935 · they want to think until Friday · Ash's mom is the real decision point · they are afraid of being on market too long.</div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <Btn sm>edit</Btn><Btn sm>approve</Btn>
          </div>
        </Box>

        <Box style={{ marginTop: 10 }}>
          <div className="hand-alt tiny">DRAFT RECAP EMAIL</div>
          <div className="tiny" style={{ marginTop: 6 }}>
            <b>Subject:</b> 47 Olive · thinking on Friday<br/>
            Thanks again for having me over. Here's what we talked through + the comps I pulled:...
          </div>
          <div className="row" style={{ gap: 6, marginTop: 8 }}>
            <Btn sm>review</Btn><Btn sm primary>send</Btn>
          </div>
        </Box>

        <Box style={{ marginTop: 10 }}>
          <div className="hand-alt tiny">FOLLOW-UPS SCHEDULED</div>
          <Hr />
          <div className="tiny">Thu 3pm · check-in text<br/>Fri 10am · "decision day" call<br/>Mon · if still thinking, send your 6-buyer story</div>
        </Box>
      </div>
    </Phone>

    <div style={{ maxWidth: 300, paddingTop: 20 }}>
      <div className="hand-alt">Post-appt</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Transcript → AI recap → email draft → follow-up cadence. You approve each step.</div>
    </div>
  </div>;
}

/* ====================== MOBILE · DEALS ====================== */

function MobDeal1_List() {
  return <div className="row" style={{ gap: 20 }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="row between">
          <div className="serif" style={{ fontSize: 22 }}>Deals · active</div>
          <Chip sm>4</Chip>
        </div>

        <div style={{ marginTop: 12 }}>
          {[
            {name:'2222 Yellow Wood', stage:'UC · day 9/30', close:'Apr 30', health:'ok',   hc:'sage', next:'Inspection · Wed 2pm'},
            {name:'22 Hawthorn',       stage:'Listed · day 14', close:'—',       health:'ok',   hc:'sage', next:'Price check · Sat'},
            {name:'814 Cedar (buyer)', stage:'Offer made',     close:'tbd',     health:'!',    hc:'rose', next:'Counter expected tonight'},
            {name:'47 Olive (listing appt)', stage:'Pitching',  close:'—',       health:'warm', hc:'tan',  next:'Friday decision'},
          ].map((d, i) => (
            <Box key={i} style={{ padding: 10, marginBottom: 8 }}>
              <div className="row between">
                <div><b>{d.name}</b><div className="tiny muted">{d.stage}</div></div>
                <Chip sm filled style={{ background: `var(--accent-${d.hc})`, color: 'var(--paper)' }}>●</Chip>
              </div>
              <div className="tiny muted" style={{ marginTop: 4 }}>{d.next}</div>
            </Box>
          ))}
        </div>
      </div>
    </Phone>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">2222 YELLOW WOOD · UC day 9</div>
        <div className="serif" style={{ fontSize: 20, lineHeight: 1.1 }}>To close · 21 days</div>

        <div style={{ marginTop: 10 }}>
          <div className="hand-alt tiny">TIMELINE</div>
          <Hr />
          {[
            ['✓ Contract signed',      'Apr 15'],
            ['✓ Earnest deposit',       'Apr 16'],
            ['→ Inspection',            'Wed 2pm'],
            ['→ Appraisal ordered',     'Apr 23'],
            ['  Loan contingency',      'May 2'],
            ['  Final walkthrough',     'May 5'],
            ['  Closing',                'May 7'],
          ].map((r, i) => (
            <div key={i} className="row between" style={{ padding: '5px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
              <span className="tiny">{r[0]}</span>
              <span className="tiny mono">{r[1]}</span>
            </div>
          ))}
        </div>

        <Box style={{ marginTop: 10, padding: 10, background: 'var(--accent-tan-2)' }}>
          <div className="hand-alt tiny">NEEDS YOU</div>
          <div className="tiny" style={{ marginTop: 4 }}>Buyer's inspector texted · can we move to Thu 3pm?</div>
          <div className="row" style={{ gap: 6, marginTop: 6 }}>
            <Btn sm>approve</Btn>
            <Btn sm>counter</Btn>
            <Btn sm primary>call them</Btn>
          </div>
        </Box>
      </div>
    </Phone>
  </div>;
}

function MobDeal2_ContractRead() {
  return <div className="row" style={{ gap: 20 }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">CONTRACT · 2222 YELLOW WOOD</div>
        <div className="serif" style={{ fontSize: 20 }}>AI read-through</div>

        <Box style={{ marginTop: 10, padding: 10, background: 'var(--accent-sage-2)' }}>
          <div className="hand-alt tiny">SUMMARY</div>
          <div className="tiny" style={{ marginTop: 4 }}>$645k · conventional 20% · inspection 10d · appraisal 21d · close May 7 · seller keeps washer/dryer · 1yr home warranty included.</div>
        </Box>

        <Box style={{ marginTop: 8, padding: 10, background: 'var(--accent-rose-2)', borderLeft: '3px solid var(--accent-rose)' }}>
          <div className="hand-alt tiny">⚠ UNUSUAL</div>
          <div className="tiny" style={{ marginTop: 4 }}>Buyer added a "right to cure" clause (line 47) extending loan contingency by 5 days if underwriter requests docs. Not standard.</div>
        </Box>

        <Box style={{ marginTop: 8 }}>
          <div className="hand-alt tiny">KEY DATES · AUTO-TRACKED</div>
          <Hr />
          {[
            ['Inspection',         'Apr 23', 'day 8'],
            ['Inspection resp.',    'Apr 25', 'day 10'],
            ['Appraisal',          'Apr 30', 'day 15'],
            ['Loan contingency',    'May 5',  'day 20 (ext)'],
            ['Final walkthrough',   'May 6'],
            ['Close',              'May 7'],
          ].map((r,i) => (
            <div key={i} className="row between" style={{ padding: '4px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
              <span className="tiny">{r[0]}</span>
              <span className="tiny mono">{r[1]} {r[2] ? <span className="muted">· {r[2]}</span> : null}</span>
            </div>
          ))}
        </Box>
      </div>
    </Phone>

    <div style={{ maxWidth: 300, paddingTop: 20 }}>
      <div className="hand-alt">AI contract read</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>Upload PDF. AI extracts terms, flags non-standard language in plain English, sets up date tracking automatically, and queues reminders 48h before each deadline.</div>
    </div>
  </div>;
}

/* ====================== MOBILE · CONTENT STUDIO ====================== */

function MobContent1_Hub() {
  return <div className="row" style={{ gap: 20 }}>
    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="serif" style={{ fontSize: 22 }}>Content Studio</div>
        <div className="tiny muted">12 drafts · 3 scheduled · 2 need approval</div>

        <Box style={{ marginTop: 12, padding: 10, background: 'var(--accent-tan-2)' }}>
          <div className="hand-alt tiny">NEEDS YOUR APPROVAL</div>
          <Hr />
          {[
            ['IG Reel · Yellow Wood teaser',   '18s · auto-scored'],
            ['Blog · Austin spring market',    '720 words · 9min read'],
          ].map((r,i) => (
            <div key={i} className="row between" style={{ padding: '6px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
              <div className="tiny"><b>{r[0]}</b><div className="muted">{r[1]}</div></div>
              <Btn sm primary>review</Btn>
            </div>
          ))}
        </Box>

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>QUICK CREATE</div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          {['📝 blog','📸 IG post','🎬 reel','📧 email','📮 postcard','🎙 podcast clip'].map(x => <Chip key={x} sm>{x}</Chip>)}
        </div>

        <div className="hand-alt tiny" style={{ marginTop: 14 }}>SCHEDULED · NEXT 7 DAYS</div>
        <Box style={{ padding: 0, marginTop: 6 }}>
          {[
            ['Mon 9am',  'IG · sold-for-$22k-over story'],
            ['Wed 6pm',  'Yellow Wood teaser'],
            ['Thu 7am',  'Market recap blog'],
            ['Fri 11am', 'OH invite (Sat)'],
            ['Sun 9am',  'Weekend recap email'],
          ].map((r, i) => (
            <div key={i} className="row between" style={{ padding: '8px 10px', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
              <div className="tiny mono">{r[0]}</div>
              <div className="tiny">{r[1]}</div>
            </div>
          ))}
        </Box>
      </div>
    </Phone>

    <Phone>
      <div style={{ padding: '12px 14px' }}>
        <div className="hand-alt tiny">REEL DRAFT · YELLOW WOOD</div>
        <Box dashed style={{ marginTop: 8, height: 280, background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="tiny mono" style={{ opacity: 0.6 }}>▶ 0:18 · Remotion preview</div>
        </Box>

        <div className="row between" style={{ marginTop: 10 }}>
          <Chip sm>hook · 0:02</Chip>
          <Chip sm>b-roll · 0:06</Chip>
          <Chip sm>end card · 0:02</Chip>
        </div>

        <Box style={{ marginTop: 10, padding: 10, background: 'var(--accent-sage-2)' }}>
          <div className="hand-alt tiny">AI SCORING</div>
          <div className="tiny" style={{ marginTop: 4 }}>Hook · 8.2 · "you paid what for this?"<br/>Retention · 7.6 (good)<br/>CTA · 6.1 · weak — suggests "Sat 1-3, come walk it" over "visit this weekend"</div>
        </Box>

        <div className="row" style={{ gap: 6, marginTop: 10 }}>
          <Btn sm>edit</Btn>
          <Btn sm>re-generate</Btn>
          <Btn sm primary>approve + schedule</Btn>
        </div>
      </div>
    </Phone>
  </div>;
}

function MobContent2_Capture() {
  return <div className="row" style={{ gap: 20 }}>
    <Phone>
      <div style={{ padding: 0, background: '#000' }}>
        <div style={{ height: 380, background: 'linear-gradient(180deg, #2a3e2a, #1a1a1a)', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 16 }}>
          <div className="row between">
            <Chip sm style={{ background: 'rgba(255,255,255,0.15)', color:'#fff', border: 'none' }}>🔴 REC 0:28</Chip>
            <Chip sm style={{ background: 'rgba(255,255,255,0.15)', color:'#fff', border: 'none' }}>b-roll</Chip>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="tiny mono" style={{ opacity: 0.6 }}>TAP TO CAPTURE</div>
            <div style={{ width: 78, height: 78, borderRadius: 39, border: '4px solid #fff', margin: '12px auto', background: '#b06a73' }}></div>
          </div>

          <div className="row between">
            <Chip sm style={{ background: 'rgba(255,255,255,0.15)', color:'#fff', border: 'none' }}>📷 photo</Chip>
            <Chip sm style={{ background: 'rgba(255,255,255,0.15)', color:'#fff', border: 'none' }}>🎙 voice</Chip>
            <Chip sm style={{ background: 'rgba(255,255,255,0.15)', color:'#fff', border: 'none' }}>💡 hook</Chip>
          </div>
        </div>

        <div style={{ padding: 10, background: 'var(--paper)' }}>
          <div className="hand-alt tiny">AUTO-TAGGING</div>
          <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {['2222 Yellow Wood','kitchen','b-roll','afternoon light','reel-ready'].map(x => <Chip key={x} sm>{x}</Chip>)}
          </div>
          <div className="tiny muted" style={{ marginTop: 8 }}>Location · MLS match · lighting · composition all auto-detected.</div>
        </div>
      </div>
    </Phone>

    <div style={{ maxWidth: 300, paddingTop: 20 }}>
      <div className="hand-alt">Capture on the fly</div>
      <div className="tiny muted" style={{ marginTop: 6 }}>One-handed capture inside the app. Everything auto-uploads to Library with smart tags. No manual sorting — AI groups clips by listing, lighting, usable-for-X.</div>
    </div>
  </div>;
}

/* ====================== NOTIFICATIONS ====================== */

function Notif1_Inbox() {
  return <Desktop active="Inbox" url="command.app/inbox">
    <div className="row between center">
      <div>
        <div className="hand-alt tiny">ONE INBOX · EVERYTHING</div>
        <div className="serif" style={{ fontSize: 28 }}>Inbox</div>
        <div className="tiny muted">Print viewed · post live · lead reply · bounce · system. You decide what interrupts you.</div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        <Chip sm filled>18 new</Chip>
        <Chip sm>mark all read</Chip>
        <Btn sm>notification prefs</Btn>
      </div>
    </div>

    <div className="row" style={{ gap: 12, marginTop: 14 }}>
      <Box style={{ width: 180, padding: 0 }}>
        {[
          ['All',            18, true],
          ['Needs action',   3,  false],
          ['Replies',        7,  false],
          ['System',         4,  false],
          ['Publishing',     2,  false],
          ['Print + deliv.', 1,  false],
          ['Vendor',         1,  false],
          ['Mentions',       0,  false],
        ].map(([l, c, act], i) => (
          <div key={i} className="row between" style={{ padding: '10px 12px', borderTop: i ? '1px dashed var(--faint)' : 'none', background: act ? 'var(--accent-sage-2)' : 'transparent' }}>
            <span style={{ fontSize: 13 }}>{l}</span>
            <Chip sm filled={c > 0}>{c}</Chip>
          </div>
        ))}
      </Box>

      <div className="grow">
        {[
          {ic:'💬', t:'Kim Park replied · 22 Hawthorn', sub:'"ok love to see it Sun 3pm if open" · 2 min ago',          tag:'reply',      urg:'rose'},
          {ic:'🎥', t:'IG Reel posted · 1.2k views',    sub:'Yellow Wood teaser · up 340% from your avg · 14 min ago',   tag:'publish',    urg:'sage'},
          {ic:'📮', t:'Postcard delivered',             sub:'Vistaprint · 100 cards arrived · Marcy\'s got them · 1h ago', tag:'print',      urg:'sage'},
          {ic:'⚠',  t:'Gmail OAuth expired',            sub:'Reconnect — 14 emails queued · 2h ago',                       tag:'system',     urg:'rose'},
          {ic:'📧', t:'Email bounce · 3 contacts',      sub:'Newsletter blast · auto-retry tomorrow · 2h ago',             tag:'email',      urg:'tan'},
          {ic:'💬', t:'Kent Martin · lender intro',     sub:'"hey Dana, passing along Jimmy..." · 3h ago',                 tag:'reply',      urg:'tan'},
          {ic:'📮', t:'Print job viewed by 28 people',  sub:'Yellow Wood flyer · QR scan stats · 4h ago',                   tag:'print',      urg:'sage'},
          {ic:'✅', t:'Blotato post batch scheduled',    sub:'5 posts · Tue-Sun · across IG/FB/TT · 5h ago',                 tag:'system',     urg:'sage'},
          {ic:'🔔', t:'Ashley Chen viewed deck 2x',     sub:'47 Olive · dwelled 6s on price slide · 7h ago',                 tag:'mentions',   urg:'tan'},
        ].map((n, i) => (
          <div key={i} className="row" style={{ padding: '12px 0', borderBottom: '1px dashed var(--faint)', gap: 12 }}>
            <div style={{ width: 36, textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{n.ic}</div>
              <Chip sm filled style={{ background: `var(--accent-${n.urg})`, color: 'var(--paper)', marginTop: 4, fontSize: 9 }}>●</Chip>
            </div>
            <div className="grow">
              <div className="row between">
                <b>{n.t}</b>
                <span className="tiny mono muted">{n.tag}</span>
              </div>
              <div className="tiny muted" style={{ marginTop: 2 }}>{n.sub}</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Btn sm>open</Btn>
              {n.urg === 'rose' && <Btn sm primary>act</Btn>}
            </div>
          </div>
        ))}
      </div>
    </div>
  </Desktop>;
}

function Notif2_Prefs() {
  return <Desktop active="Settings · Notifications" url="command.app/settings/notifications">
    <div className="serif" style={{ fontSize: 28 }}>Notification preferences</div>
    <div className="tiny muted" style={{ marginTop: 4 }}>What interrupts you vs. what waits in the inbox.</div>

    <Box style={{ marginTop: 14 }}>
      <div className="row">
        <div style={{ flex: 1 }} className="hand-alt tiny">Event</div>
        <div style={{ width: 80, textAlign: 'center' }} className="hand-alt tiny">App</div>
        <div style={{ width: 80, textAlign: 'center' }} className="hand-alt tiny">Push</div>
        <div style={{ width: 80, textAlign: 'center' }} className="hand-alt tiny">SMS</div>
        <div style={{ width: 80, textAlign: 'center' }} className="hand-alt tiny">Slack</div>
        <div style={{ width: 80, textAlign: 'center' }} className="hand-alt tiny">Email</div>
      </div>
      <Hr />

      {[
        ['Lead replies',             'immediate interrupt', [1,1,1,1,0]],
        ['Under-contract deadlines', '48h + day-of',        [1,1,0,1,0]],
        ['OH sign-in (new)',          'batched every 15min', [1,0,0,1,0]],
        ['OH sign-in (return)',       '',                    [1,0,0,0,0]],
        ['Post went live',            '',                    [1,0,0,1,0]],
        ['Post hit viral threshold',  'alert me',             [1,1,0,1,0]],
        ['Email bounce',              'batched daily',        [1,0,0,0,1]],
        ['Print job viewed',          'batched daily',        [1,0,0,0,0]],
        ['Print job delivered',       '',                     [1,0,0,1,0]],
        ['Supra key scan',            'per-scan',             [1,1,0,1,0]],
        ['Weather affecting OH',      '',                     [1,1,1,1,0]],
        ['OAuth expiring',            '14d + 7d + 1d',        [1,0,0,0,1]],
        ['AI cost threshold',         '>$X/day',              [1,0,0,1,0]],
        ['System errors',             '',                     [1,0,0,1,1]],
        ['Weekly digest',             'Sun 6pm',              [1,0,0,0,1]],
      ].map((r, i) => (
        <div key={i} className="row" style={{ padding: '10px 0', borderTop: '1px dashed var(--faint)' }}>
          <div style={{ flex: 1 }}>
            <div>{r[0]}</div>
            <div className="tiny muted">{r[1]}</div>
          </div>
          {r[2].map((on, j) => (
            <div key={j} style={{ width: 80, textAlign: 'center' }}>
              <div className="row center" style={{ justifyContent: 'center' }}>
                <div style={{ width: 32, height: 18, borderRadius: 9, background: on ? 'var(--accent-sage)' : 'var(--line)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 14, height: 14, borderRadius: 7, background: 'var(--paper)' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </Box>

    <Box dashed style={{ marginTop: 14, padding: 12 }}>
      <div className="hand-alt tiny">Quiet hours</div>
      <div className="row" style={{ gap: 8, marginTop: 8 }}>
        <Input defaultValue="9:00 pm" style={{ maxWidth: 120 }} />
        <span className="tiny">to</span>
        <Input defaultValue="6:30 am" style={{ maxWidth: 120 }} />
        <Chip sm filled>weekdays</Chip>
        <Chip sm>weekends 10pm–7am</Chip>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>Only lead replies + deal deadlines + weather get through. Everything else waits.</div>
    </Box>
  </Desktop>;
}

/* ====================== COMMAND-K ====================== */

function CmdK1_Open() {
  return <Desktop active="—" url="command.app">
    <div style={{ position: 'relative', minHeight: 500 }}>
      {/* dim background */}
      <div style={{ opacity: 0.3 }}>
        <Box style={{ padding: 20 }}>
          <div className="serif" style={{ fontSize: 24 }}>Your week</div>
          <div className="tiny muted">— dashboard behind the search —</div>
        </Box>
      </div>

      {/* spotlight */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <Box style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row center" style={{ gap: 10 }}>
              <span style={{ fontSize: 16 }}>⌘</span>
              <input placeholder="Search anything · contacts, listings, deals, files, actions..." style={{ border: 'none', outline: 'none', fontSize: 16, flex: 1, background: 'transparent' }} />
              <Chip sm>⌘K</Chip>
            </div>
          </div>
          <div style={{ padding: 10 }}>
            <div className="hand-alt tiny" style={{ padding: '6px 8px' }}>RECENT</div>
            {[
              ['Kim Park',           'buyer · 3 saved searches',        'contact'],
              ['2222 Yellow Wood Ln','active · UC day 9',              'listing'],
              ['Yellow Wood flyer',  'last edited 2h ago',              'asset'],
            ].map((r, i) => (
              <div key={i} className="row between" style={{ padding: '8px 10px' }}>
                <div className="row center" style={{ gap: 10 }}><span>◷</span><div><b>{r[0]}</b><span className="tiny muted" style={{ marginLeft: 8 }}>{r[1]}</span></div></div>
                <Chip sm>{r[2]}</Chip>
              </div>
            ))}

            <div className="hand-alt tiny" style={{ padding: '10px 8px 6px' }}>QUICK ACTIONS</div>
            {[
              ['Add contact',             '⌘⇧C'],
              ['Create new listing',       '⌘⇧L'],
              ['Schedule open house',      '⌘⇧H'],
              ['Start listing appt',       '⌘⇧A'],
              ['Draft email to...',        '⌘⇧E'],
              ['Pull CMA',                 '⌘⇧M'],
            ].map((r, i) => (
              <div key={i} className="row between" style={{ padding: '8px 10px' }}>
                <div className="row center" style={{ gap: 10 }}><span>›</span>{r[0]}</div>
                <span className="tiny mono muted">{r[1]}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

function CmdK2_Typed() {
  return <Desktop active="—" url="command.app">
    <div style={{ position: 'relative', minHeight: 600 }}>
      <div style={{ opacity: 0.3 }}>
        <Box style={{ padding: 20 }}><div className="tiny muted">— dashboard —</div></Box>
      </div>

      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', width: 720, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <Box style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
            <div className="row center" style={{ gap: 10 }}>
              <span style={{ fontSize: 16 }}>⌘</span>
              <input value="kim" style={{ border: 'none', outline: 'none', fontSize: 16, flex: 1, background: 'transparent', fontWeight: 600 }} />
              <span className="tiny muted">24 results</span>
            </div>
          </div>
          <div style={{ padding: 10 }}>
            {[
              ['contacts', [
                ['Kim Park',        'buyer · 3 searches · last touch 2d',       'open'],
                ['Kimberly Lenz',   'past client · closed Mar \'24',             'open'],
                ['Kim Asano',       'sphere · Austin FC group',                  'open'],
              ]],
              ['listings', [
                ['411 Kimball St',  'comp in Yellow Wood CMA',                   'open'],
              ]],
              ['emails', [
                ['Kim Park · Thu',  '"ok I\'m free Sun afternoon"',               'open'],
                ['Kim Park · Mar 4','"loved the Maple walk-through"',             'open'],
              ]],
              ['ai actions', [
                ['Draft email to Kim Park',             'one-click',               'do it'],
                ['Show Kim\'s full history',            'timeline view',            'do it'],
                ['Find listings matching Kim\'s search', '8 new since Friday',       'do it'],
                ['Start showing route for Kim',         'pick homes · build day',   'do it'],
              ]],
            ].map(([group, items], i) => (
              <div key={i}>
                <div className="hand-alt tiny" style={{ padding: '10px 8px 6px', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>{group.toUpperCase()}</div>
                {items.map((r, j) => (
                  <div key={j} className="row between" style={{ padding: '8px 10px', background: i===3 && j===0 ? 'var(--accent-sage-2)' : 'transparent' }}>
                    <div className="row center" style={{ gap: 10 }}>
                      <span>{group === 'ai actions' ? '✨' : '◷'}</span>
                      <div><b>{r[0]}</b><span className="tiny muted" style={{ marginLeft: 8 }}>{r[1]}</span></div>
                    </div>
                    <Chip sm>{r[2]}</Chip>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between' }}>
            <span className="tiny mono muted">↑↓ navigate · ⏎ select · esc close</span>
            <span className="tiny mono muted">⌘. · ask AI instead</span>
          </div>
        </Box>
      </div>
    </div>
  </Desktop>;
}

function CmdK3_NLQuery() {
  return <Desktop active="—" url="command.app">
    <div style={{ maxWidth: 780, margin: '40px auto' }}>
      <Box style={{ padding: 0 }}>
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
          <div className="row center" style={{ gap: 10 }}>
            <span style={{ fontSize: 16 }}>✨</span>
            <input value="who haven't I touched in 90 days that's warm" style={{ border: 'none', outline: 'none', fontSize: 15, flex: 1, background: 'transparent', fontWeight: 500 }} />
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div className="tiny muted" style={{ marginBottom: 8 }}>I read this as: contacts tagged warm/hot · last inbound or outbound &gt;90d · not on active deal.</div>
          <Chip sm filled>14 people</Chip>

          <div style={{ marginTop: 12 }}>
            {[
              ['Ashley Chen',          'listing appt Fri',       '67d',  'high'],
              ['Marcus Webb',           'saw a home in Feb',      '94d',  'high'],
              ['Lisa Ortega',           'past client + referral', '118d', 'medium'],
              ['Kent Martin',           'lender · cross-refer',   '91d',  'medium'],
              ['The Shahs',             'pre-approved buyers',    '101d', 'high'],
              ['Ben Koh',               'seller potential',        '96d',  'medium'],
            ].map((r, i) => (
              <div key={i} className="row between" style={{ padding: '8px 0', borderTop: i ? '1px dashed var(--faint)' : 'none' }}>
                <div>
                  <b>{r[0]}</b>
                  <span className="tiny muted" style={{ marginLeft: 8 }}>{r[1]}</span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="tiny mono">{r[2]}</span>
                  <Chip sm filled={r[3]==='high'}>{r[3]}</Chip>
                </div>
              </div>
            ))}
          </div>

          <Box dashed style={{ marginTop: 14, padding: 10 }}>
            <div className="hand-alt tiny">WANT ME TO...</div>
            <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <Chip sm filled>draft personalized outreach to all 14</Chip>
              <Chip sm>save as smart list</Chip>
              <Chip sm>add to power hour</Chip>
              <Chip sm>export CSV</Chip>
            </div>
          </Box>
        </div>
      </Box>
    </div>
  </Desktop>;
}

/* ====================== REGISTRATIONS ====================== */

window.MobileListingScreens = [
  { id: 'ml1', label: 'V1 · Pre-appt prep',   caption: 'Drive-time countdown, CMA ready, "things to remember" card from notes.', Component: MobListing1_Prep },
  { id: 'ml2', label: 'V2 · On-site capture', caption: 'Live transcript, quick capture (photo/note/voice/measure/flag).',        Component: MobListing2_OnSite },
  { id: 'ml3', label: 'V3 · Present deck',    caption: 'Phone/AirPlay deck with eye-tracking dwell data.',                        Component: MobListing3_Deck },
  { id: 'ml4', label: 'V4 · Post-appt recap', caption: 'AI-heard summary + draft recap email + follow-up cadence.',              Component: MobListing4_PostAppt },
];

window.MobileDealScreens = [
  { id: 'md1', label: 'V1 · Deals list + detail',    caption: 'Active deals with health · deal detail with timeline + NEEDS YOU card.', Component: MobDeal1_List },
  { id: 'md2', label: 'V2 · AI contract read-through', caption: 'Summary + flagged unusual clauses + auto-extracted key dates.',        Component: MobDeal2_ContractRead },
];

window.MobileContentScreens = [
  { id: 'mc1', label: 'V1 · Studio hub',  caption: 'Inbox-style content control: approval queue, schedule, quick create.',    Component: MobContent1_Hub },
  { id: 'mc2', label: 'V2 · Capture UI',  caption: 'Full-screen camera/voice capture with auto-tagging back to Library.',     Component: MobContent2_Capture },
];

window.NotificationScreens = [
  { id: 'n1', label: 'V1 · Inbox',         caption: 'Unified inbox: replies, publishing, print, system, vendor, mentions.',   Component: Notif1_Inbox },
  { id: 'n2', label: 'V2 · Preferences',   caption: 'Per-event channel matrix · quiet hours · interrupt rules.',              Component: Notif2_Prefs },
];

window.CmdKScreens = [
  { id: 'ck1', label: 'V1 · Empty ⌘K',             caption: 'Recent + quick actions. The command palette at rest.',             Component: CmdK1_Open },
  { id: 'ck2', label: 'V2 · Typed query',           caption: 'Grouped results: contacts, listings, emails, AI actions.',         Component: CmdK2_Typed },
  { id: 'ck3', label: 'V3 · Natural-language',     caption: '"Who haven\'t I touched in 90 days" → ranked list + bulk actions.',  Component: CmdK3_NLQuery },
];

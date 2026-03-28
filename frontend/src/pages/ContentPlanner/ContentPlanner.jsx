import { useState, useMemo } from 'react'
import { Button } from '../../components/ui/index.jsx'
import './ContentPlanner.css'

// ─── Storage ───
const STORAGE_KEY = 'content_planner'
const FORMAT_KEY = 'content_weekly_format'
const INSPO_KEY = 'content_inspo_bank'

// ─── Default weekly format ───
const DEFAULT_FORMAT = [
  { day: 'Monday',    emoji: '🏡', format: 'CAROUSEL',     topic: 'Area spotlight — bars, restaurants, things to do', niche: 'COMMUNITY' },
  { day: 'Tuesday',   emoji: '🎬', format: 'REEL',         topic: 'House For Sale / Listing showcase', niche: 'LISTINGS' },
  { day: 'Wednesday', emoji: '🎯', format: 'REEL / CAROUSEL', topic: 'Me as Expert — market stats, tips, listing tips', niche: 'AUTHORITY' },
  { day: 'Thursday',  emoji: '☕', format: 'STORY / TIP',   topic: 'Coffee & Contracts — Q&A, behind the scenes', niche: 'PERSONAL' },
  { day: 'Friday',    emoji: '🏠', format: 'CAROUSEL',     topic: 'Houses I\'d Send My Buyers — curated picks', niche: 'LISTINGS' },
  { day: 'Saturday',  emoji: '🌿', format: 'STORY / REEL', topic: 'Life Lately / Day in the Life — personal, family', niche: 'PERSONAL' },
  { day: 'Sunday',    emoji: '❤️', format: 'STORY / REEL', topic: 'Coffee & Contracts Random — casual tips, weekly wrap', niche: 'COMMUNITY' },
]

const NICHE_COLORS = {
  COMMUNITY: '#6a9e72',
  LISTINGS: '#c99a2e',
  AUTHORITY: '#5a87b4',
  PERSONAL: '#b79782',
  LOCAL: '#c0604a',
}

const HOOK_IDEAS = [
  { text: "If you're moving to [Area] and don't know where to eat…", niche: 'COMMUNITY' },
  { text: "I grew up in [Area] and these are the only spots I'd take my out-of-town friends.", niche: 'LOCAL' },
  { text: "The honest guide to [Area] that no one talks about.", niche: 'COMMUNITY' },
  { text: "3 things I'd do my first weekend moving to [Area].", niche: 'COMMUNITY' },
  { text: "Stop scrolling — this house just hit the market.", niche: 'LISTINGS' },
  { text: "This is the house your Pinterest board has been manifesting.", niche: 'LISTINGS' },
  { text: "POV: You just got the keys to your dream home.", niche: 'LISTINGS' },
  { text: "The market is doing something weird right now. Let me explain.", niche: 'AUTHORITY' },
  { text: "Here's what I wish every buyer knew before making an offer.", niche: 'AUTHORITY' },
  { text: "Nobody talks about this part of buying a home.", niche: 'AUTHORITY' },
  { text: "A day in my life as a REALTOR® in the East Valley.", niche: 'PERSONAL' },
  { text: "The reality of being a real estate agent that nobody shows you.", niche: 'PERSONAL' },
]

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + (offset * 7))
  monday.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function fmtDate(d) { return d.toISOString().slice(0, 10) }
function fmtShort(d) { return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function dayName(d) { return d.toLocaleDateString('en-US', { weekday: 'long' }) }
function dayAbbr(d) { return d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() }

function loadPlanner() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} } catch { return {} }
}
function savePlanner(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) }
function loadFormat() {
  try { return JSON.parse(localStorage.getItem(FORMAT_KEY)) || DEFAULT_FORMAT } catch { return DEFAULT_FORMAT }
}
function saveFormat(data) { localStorage.setItem(FORMAT_KEY, JSON.stringify(data)) }
function loadInspo() {
  try { return JSON.parse(localStorage.getItem(INSPO_KEY)) || [] } catch { return [] }
}
function saveInspo(data) { localStorage.setItem(INSPO_KEY, JSON.stringify(data)) }

// ─── Main Component ───
export default function ContentPlanner() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [planner, setPlanner] = useState(loadPlanner)
  const [format, setFormat] = useState(loadFormat)
  const [inspoBank, setInspoBank] = useState(loadInspo)
  const [selectedDate, setSelectedDate] = useState(null)
  const [editingFormat, setEditingFormat] = useState(false)

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])
  const today = fmtDate(new Date())

  const weekLabel = `Week of ${fmtShort(weekDates[0])} - ${fmtShort(weekDates[6])}`

  // Get or create day entry
  const getDayEntry = (dateStr) => {
    const dayOfWeek = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' })
    const fmt = format.find(f => f.day === dayOfWeek) || {}
    return {
      topic: '',
      format: fmt.format || '',
      emoji: fmt.emoji || '📝',
      niche: fmt.niche || '',
      hook: '',
      caption: '',
      manychatKeyword: '',
      notes: '',
      canvaLink: '',
      planned: false,
      ...planner[dateStr],
    }
  }

  const updateDay = (dateStr, updates) => {
    const newPlanner = { ...planner, [dateStr]: { ...getDayEntry(dateStr), ...updates } }
    setPlanner(newPlanner)
    savePlanner(newPlanner)
  }

  const updateFormat = (idx, updates) => {
    const newFormat = [...format]
    newFormat[idx] = { ...newFormat[idx], ...updates }
    setFormat(newFormat)
    saveFormat(newFormat)
  }

  const handleInspoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const updated = [...inspoBank, { id: crypto.randomUUID(), imageUrl: reader.result, addedAt: new Date().toISOString() }]
      setInspoBank(updated)
      saveInspo(updated)
    }
    reader.readAsDataURL(file)
  }

  const removeInspo = (id) => {
    const updated = inspoBank.filter(i => i.id !== id)
    setInspoBank(updated)
    saveInspo(updated)
  }

  const sel = selectedDate ? getDayEntry(selectedDate) : null
  const selDayName = selectedDate ? dayName(new Date(selectedDate + 'T12:00:00')) : ''
  const selDayNum = selectedDate ? new Date(selectedDate + 'T12:00:00').getDate() : ''

  return (
    <div className="cp">
      {/* ─── Header ─── */}
      <div className="cp__header">
        <div>
          <p className="cp__bestie">YOUR CONTENT BESTIE</p>
          <h2 className="cp__title">Content <em>Planner</em></h2>
        </div>
        <div className="cp__week-nav">
          <button className="cp__nav-btn" onClick={() => setWeekOffset(w => w - 1)}>‹</button>
          <span className="cp__week-label">{weekLabel}</span>
          <button className="cp__nav-btn" onClick={() => setWeekOffset(w => w + 1)}>›</button>
          {weekOffset !== 0 && <button className="cp__today-btn" onClick={() => setWeekOffset(0)}>Today</button>}
        </div>
      </div>

      {/* ─── Weekly Calendar Strip ─── */}
      <div className="cp__strip">
        {weekDates.map(date => {
          const dateStr = fmtDate(date)
          const entry = getDayEntry(dateStr)
          const dayFmt = format.find(f => f.day === dayName(date))
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDate

          return (
            <div
              key={dateStr}
              className={`cp__day ${isToday ? 'cp__day--today' : ''} ${isSelected ? 'cp__day--selected' : ''} ${entry.planned ? 'cp__day--planned' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
            >
              <p className="cp__day-abbr">{dayAbbr(date)}</p>
              <p className="cp__day-num">{date.getDate()}</p>
              <span className="cp__day-emoji">{dayFmt?.emoji || '📝'}</span>
              <p className="cp__day-topic">{entry.topic || dayFmt?.topic?.split('—')[0]?.trim() || ''}</p>
              <p className="cp__day-format">{entry.format || dayFmt?.format || ''}</p>
              <button className="cp__plan-btn" onClick={(e) => { e.stopPropagation(); setSelectedDate(dateStr) }}>
                {entry.planned ? '✓ PLANNED' : '+ PLAN IT'}
              </button>
            </div>
          )
        })}
      </div>

      {/* ─── Bottom Section: Detail + Inspo + Weekly Format ─── */}
      <div className="cp__bottom">
        {/* Selected Day Detail */}
        <div className="cp__detail">
          {sel ? (
            <>
              <div className="cp__detail-card">
                <p className="cp__detail-label">SELECTED DAY</p>
                <h3 className="cp__detail-day">{selDayName} {selDayNum}</h3>
                <p className="cp__detail-topic">
                  {sel.emoji} {sel.topic || format.find(f => f.day === selDayName)?.topic || 'No topic set'}
                </p>
                <span className="cp__detail-format">{sel.format || format.find(f => f.day === selDayName)?.format}</span>
                {sel.niche && <span className="cp__detail-niche" style={{ background: NICHE_COLORS[sel.niche] || 'var(--brown-mid)' }}>{sel.niche}</span>}
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">YOUR HOOK</label>
                <textarea
                  className="cp__textarea"
                  value={sel.hook}
                  onChange={e => updateDay(selectedDate, { hook: e.target.value })}
                  placeholder="Write or pick a hook above..."
                  rows={2}
                />
              </div>

              <div className="cp__hook-ideas">
                <p className="cp__field-label">HOOK IDEAS — CLICK TO USE</p>
                <div className="cp__hooks-list">
                  {HOOK_IDEAS.filter(h => !sel.niche || h.niche === sel.niche || h.niche === 'COMMUNITY').slice(0, 5).map((h, i) => (
                    <button key={i} className="cp__hook-pill" onClick={() => updateDay(selectedDate, { hook: h.text })}>
                      {h.text}
                    </button>
                  ))}
                </div>
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">CAPTION DRAFT</label>
                <textarea
                  className="cp__textarea cp__textarea--lg"
                  value={sel.caption}
                  onChange={e => updateDay(selectedDate, { caption: e.target.value })}
                  placeholder="Write your caption here... or click Generate below"
                  rows={5}
                />
                <Button size="sm" variant="primary" onClick={() => { /* TODO: Claude AI generate */ }}>✨ Generate Caption</Button>
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">MANYCHAT KEYWORD</label>
                <input
                  className="cp__input"
                  value={sel.manychatKeyword}
                  onChange={e => updateDay(selectedDate, { manychatKeyword: e.target.value })}
                  placeholder="e.g. ARCADIA, GUIDE, TIPS"
                />
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">CANVA LINK</label>
                <input
                  className="cp__input"
                  value={sel.canvaLink}
                  onChange={e => updateDay(selectedDate, { canvaLink: e.target.value })}
                  placeholder="https://canva.com/design/..."
                />
              </div>

              <div className="cp__field-group">
                <label className="cp__field-label">NOTES</label>
                <textarea
                  className="cp__textarea"
                  value={sel.notes}
                  onChange={e => updateDay(selectedDate, { notes: e.target.value })}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="cp__detail-actions">
                <Button size="sm" variant={sel.planned ? 'ghost' : 'accent'} onClick={() => updateDay(selectedDate, { planned: !sel.planned })}>
                  {sel.planned ? '↩ Unmark Planned' : '✓ Mark as Planned'}
                </Button>
              </div>
            </>
          ) : (
            <div className="cp__detail-empty">
              <p>👈 Select a day to start planning</p>
            </div>
          )}
        </div>

        {/* Right column: Inspo Bank + Weekly Format */}
        <div className="cp__right-col">
          {/* Inspo Bank */}
          <div className="cp__inspo">
            <h4 className="cp__section-title">INSPO BANK</h4>
            <p className="cp__section-sub">Screenshots of posts that performed well</p>
            <div className="cp__inspo-grid">
              {inspoBank.map(item => (
                <div key={item.id} className="cp__inspo-item">
                  <img src={item.imageUrl} alt="" />
                  <button className="cp__inspo-remove" onClick={() => removeInspo(item.id)}>×</button>
                </div>
              ))}
              <label className="cp__inspo-upload">
                <span>📲</span>
                <span>Drop inspo screenshots here</span>
                <input type="file" accept="image/*" onChange={handleInspoUpload} hidden />
              </label>
            </div>
          </div>

          {/* Weekly Format */}
          <div className="cp__weekly-format">
            <div className="cp__format-header">
              <h4 className="cp__section-title">YOUR WEEKLY FORMAT</h4>
              <button className="cp__edit-format-btn" onClick={() => setEditingFormat(e => !e)}>
                {editingFormat ? '✓ Done' : '✏️ Edit'}
              </button>
            </div>
            {format.map((f, idx) => (
              <div key={f.day} className="cp__format-row">
                <span className="cp__format-emoji">{f.emoji}</span>
                <div className="cp__format-info">
                  {editingFormat ? (
                    <>
                      <div className="cp__format-edit-row">
                        <strong>{f.day}</strong>
                        <input value={f.emoji} onChange={e => updateFormat(idx, { emoji: e.target.value })} className="cp__format-input cp__format-input--sm" placeholder="emoji" />
                      </div>
                      <input value={f.format} onChange={e => updateFormat(idx, { format: e.target.value })} className="cp__format-input" placeholder="CAROUSEL, REEL, STORY..." />
                      <input value={f.topic} onChange={e => updateFormat(idx, { topic: e.target.value })} className="cp__format-input" placeholder="Topic description..." />
                      <select value={f.niche} onChange={e => updateFormat(idx, { niche: e.target.value })} className="cp__format-input">
                        <option value="">Niche...</option>
                        <option value="COMMUNITY">COMMUNITY</option>
                        <option value="LISTINGS">LISTINGS</option>
                        <option value="AUTHORITY">AUTHORITY</option>
                        <option value="PERSONAL">PERSONAL</option>
                        <option value="LOCAL">LOCAL</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <p className="cp__format-day">
                        <strong>{f.day}</strong>
                        <span className="cp__format-badge" style={{ background: NICHE_COLORS[f.niche] || 'var(--brown-mid)' }}>{f.format}</span>
                      </p>
                      <p className="cp__format-topic">{f.topic}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

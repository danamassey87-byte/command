import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/index.jsx'
import { useContentPieces, useContentPillars, useOpenHouses } from '../../lib/hooks.js'
import * as DB from '../../lib/supabase.js'

/* ─── Date helpers ─── */
function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}
function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d }
function toISO(date) { return date.toISOString().slice(0, 10) }
function fmtDay(date) { return date.toLocaleDateString('en-US', { weekday: 'short' }) }
function fmtDate(date) { return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
function fmtMonthYear(date) { return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }

const todayISO = toISO(new Date())

const WEEKLY_SLOTS = [
  { day: 'Mon', format: 'REEL', topic: 'Area spotlight — bars, restaurants, things to do', niche: 'LOCAL' },
  { day: 'Tue', format: 'CAROUSEL', topic: 'Me as Expert — market stats, tips', niche: 'AUTHORITY' },
  { day: 'Wed', format: 'STORY', topic: 'Coffee & Contracts — Q&A, behind the scenes', niche: 'PERSONAL' },
  { day: 'Thu', format: 'REEL', topic: 'Houses I\'d Send My Buyers — curated picks', niche: 'LISTINGS' },
  { day: 'Fri', format: 'CAROUSEL', topic: 'Home buyer tips & tricks', niche: 'EDUCATION' },
  { day: 'Sat', format: 'STORY / REEL', topic: 'Life Lately / Day in the Life', niche: 'LIFESTYLE' },
  { day: 'Sun', format: 'STORY', topic: 'Client win / testimonial / just sold', niche: 'SOCIAL PROOF' },
]

export default function PlanTab() {
  const navigate = useNavigate()
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [dragOverDay, setDragOverDay] = useState(null)

  const weekEnd = addDays(weekStart, 6)
  const { data: pieces, refetch } = useContentPieces(toISO(weekStart), toISO(weekEnd))
  const { data: pillars } = useContentPillars()
  const { data: openHouses } = useOpenHouses()

  const pillarMap = useMemo(() => {
    const m = {}
    for (const p of (pillars ?? [])) m[p.id] = p
    return m
  }, [pillars])

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i)
      return { date: d, iso: toISO(d), dayLabel: fmtDay(d), dateLabel: fmtDate(d) }
    }), [weekStart]
  )

  const piecesByDate = useMemo(() => {
    const m = {}
    for (const p of (pieces ?? [])) {
      if (!p.content_date) continue
      if (!m[p.content_date]) m[p.content_date] = []
      m[p.content_date].push(p)
    }
    return m
  }, [pieces])

  const ohByDate = useMemo(() => {
    const m = {}
    for (const oh of (openHouses ?? [])) {
      if (!oh.date) continue
      const iso = oh.date.slice(0, 10)
      if (iso < toISO(weekStart) || iso > toISO(weekEnd)) continue
      if (!m[iso]) m[iso] = []
      m[iso].push(oh)
    }
    return m
  }, [openHouses, weekStart, weekEnd])

  // Stats
  const allPieces = pieces ?? []
  const published = allPieces.filter(p => p.status === 'published').length
  const scheduled = allPieces.filter(p => p.status === 'scheduled').length
  const drafts    = allPieces.filter(p => p.status === 'draft').length
  const banked    = allPieces.filter(p => p.status === 'banked').length

  // Drag and drop
  async function handleDrop(e, dayISO) {
    e.preventDefault()
    setDragOverDay(null)
    const pieceId = e.dataTransfer.getData('text/plain')
    if (!pieceId) return
    await DB.updateContentPiece(pieceId, { content_date: dayISO })
    refetch()
  }

  function handleDragStart(e, piece) {
    e.dataTransfer.setData('text/plain', piece.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function createForDay(dayISO) {
    navigate(`/content/create?date=${dayISO}`)
  }

  function chipColor(piece) {
    if (piece.status === 'published') return 'plan-chip--published'
    if (piece.status === 'scheduled') return 'plan-chip--scheduled'
    return 'plan-chip--draft'
  }

  return (
    <div className="plan-layout">
      {/* Calendar */}
      <div className="plan-cal">
        <div className="plan-cal__header">
          <h2 className="plan-cal__title">{fmtMonthYear(weekStart)}</h2>
          <div className="plan-cal__nav">
            <button onClick={() => setWeekStart(getWeekStart(new Date()))}>Today</button>
            <button onClick={() => setWeekStart(addDays(weekStart, -7))}>←</button>
            <button onClick={() => setWeekStart(addDays(weekStart, 7))}>→</button>
          </div>
        </div>

        <div className="plan-week">
          {weekDays.map(day => {
            const dayPieces = piecesByDate[day.iso] || []
            const dayOH = ohByDate[day.iso] || []
            const isToday = day.iso === todayISO

            return (
              <div
                key={day.iso}
                className={`plan-day${isToday ? ' plan-day--today' : ''}${dragOverDay === day.iso ? ' plan-day--dragover' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOverDay(day.iso) }}
                onDragLeave={() => setDragOverDay(null)}
                onDrop={e => handleDrop(e, day.iso)}
              >
                <div className="plan-day__label">{day.dayLabel}</div>
                <div className="plan-day__date">
                  {isToday ? (
                    <span className="plan-day__date--today">{new Date(day.date).getDate()}</span>
                  ) : (
                    new Date(day.date).getDate()
                  )}
                </div>

                {/* Open houses */}
                {dayOH.map(oh => (
                  <div key={oh.id} className="plan-chip" style={{ borderLeftColor: 'var(--sage-green)', background: '#edf4ee', fontSize: '0.65rem' }}>
                    🏡 OH: {oh.property?.address?.split(',')[0] || 'Open House'}
                  </div>
                ))}

                {/* Content pieces */}
                {dayPieces.map(p => (
                  <div
                    key={p.id}
                    className={`plan-chip ${chipColor(p)}`}
                    draggable
                    onDragStart={e => handleDragStart(e, p)}
                    onClick={() => navigate(`/content/create/${p.id}`)}
                    title={p.title || p.body_text?.slice(0, 60)}
                  >
                    {p.channel ? `${p.channel.slice(0, 2).toUpperCase()} ` : ''}{p.title?.slice(0, 25) || p.body_text?.slice(0, 25) || 'Untitled'}
                  </div>
                ))}

                <button className="plan-day__add" onClick={() => createForDay(day.iso)}>+ Add</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Sidebar */}
      <div className="plan-sidebar">
        {/* Week stats */}
        <div className="plan-card">
          <h3 className="plan-card__title">This Week</h3>
          <div className="plan-stats">
            <div className="plan-stat">
              <div className="plan-stat__num">{published}</div>
              <div className="plan-stat__label">Published</div>
            </div>
            <div className="plan-stat">
              <div className="plan-stat__num">{scheduled}</div>
              <div className="plan-stat__label">Scheduled</div>
            </div>
            <div className="plan-stat">
              <div className="plan-stat__num">{drafts}</div>
              <div className="plan-stat__label">Drafts</div>
            </div>
            <div className="plan-stat">
              <div className="plan-stat__num">{banked}</div>
              <div className="plan-stat__label">Banked</div>
            </div>
          </div>
        </div>

        {/* Weekly format guide */}
        <div className="plan-card">
          <h3 className="plan-card__title">Weekly Format</h3>
          {WEEKLY_SLOTS.map((slot, i) => (
            <div key={i} className="plan-slot">
              <div className="plan-slot__day">{slot.day}</div>
              <div className="plan-slot__info" onClick={() => createForDay(weekDays[i]?.iso)}>
                <div style={{ fontWeight: 600, fontSize: '0.72rem', color: 'var(--brown-dark)' }}>{slot.format}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 1 }}>{slot.topic}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="plan-card">
          <h3 className="plan-card__title">Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Button size="sm" onClick={() => navigate('/content/create')}>+ New Post</Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/content/bank')}>View Content Bank</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

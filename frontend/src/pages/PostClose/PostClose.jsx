import { useState, useMemo, useEffect } from 'react'
import { Button, Badge, SectionHeader, Input, Select } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase.js'
import supabase from '../../lib/supabase.js'

const CADENCE_TEMPLATES = {
  '5-year-standard': { label: '5-Year Standard', desc: 'Annual anniversary + quarterly check-ins + holidays', touchCount: 24 },
  'investor':        { label: 'Investor',        desc: 'Quarterly market reports + annual portfolio review', touchCount: 20 },
  'sphere-vip':      { label: 'Sphere VIP',      desc: 'Monthly touchpoints + birthday + referral asks', touchCount: 40 },
}

const TOUCH_KINDS = {
  email:        { icon: '📧', label: 'Email' },
  'call-task':  { icon: '📞', label: 'Call' },
  print:        { icon: '✉️', label: 'Mail' },
  gift:         { icon: '🎁', label: 'Gift' },
  'review-ask': { icon: '⭐', label: 'Review Ask' },
  'referral-ask': { icon: '🤝', label: 'Referral Ask' },
}

const STATUS_VARIANT = {
  active: 'success', paused: 'warning', completed: 'default', 'opted-out': 'danger',
}

// Generate default touch schedule for a cadence template
function generateTouches(planId, cadence, startDate) {
  const touches = []
  const start = new Date(startDate)
  const addTouch = (offsetDays, kind) => {
    const d = new Date(start)
    d.setDate(d.getDate() + offsetDays)
    touches.push({ plan_id: planId, kind, scheduled_for: d.toISOString() })
  }

  if (cadence === '5-year-standard') {
    addTouch(7, 'email')          // Week 1: thank you email
    addTouch(7, 'review-ask')     // Week 1: review request
    addTouch(14, 'gift')          // Week 2: closing gift
    addTouch(30, 'call-task')     // Month 1: check-in call
    addTouch(90, 'email')         // Month 3: check-in
    addTouch(180, 'email')        // Month 6
    addTouch(270, 'email')        // Month 9
    addTouch(365, 'email')        // Year 1 anniversary
    addTouch(365, 'print')        // Year 1 card
    addTouch(545, 'email')        // Month 18
    addTouch(730, 'email')        // Year 2
    addTouch(730, 'print')        // Year 2 card
    addTouch(1095, 'email')       // Year 3
    addTouch(1460, 'email')       // Year 4
    addTouch(1825, 'email')       // Year 5
    addTouch(1825, 'referral-ask') // Year 5 referral ask
  } else if (cadence === 'investor') {
    addTouch(7, 'email')
    addTouch(90, 'email')
    addTouch(180, 'email')
    addTouch(270, 'email')
    addTouch(365, 'call-task')
    addTouch(455, 'email')
    addTouch(545, 'email')
    addTouch(730, 'call-task')
    addTouch(1095, 'call-task')
    addTouch(1460, 'call-task')
    addTouch(1825, 'call-task')
  } else if (cadence === 'sphere-vip') {
    for (let m = 1; m <= 60; m++) {
      addTouch(m * 30, m % 3 === 0 ? 'call-task' : 'email')
    }
    addTouch(7, 'review-ask')
    addTouch(365, 'referral-ask')
    addTouch(730, 'referral-ask')
  }

  return touches
}

export default function PostClose() {
  const [plans, setPlans] = useState([])
  const [touches, setTouches] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)

  // Create form
  const [createDraft, setCreateDraft] = useState({ contact_id: '', deal_id: '', cadence_template: '5-year-standard' })
  const [contacts, setContacts] = useState([])
  const [deals, setDeals] = useState([])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: p } = await supabase.from('client_for_life_plans')
        .select('*, contact:contacts(id, name, first_name, last_name, email, phone), deal:transactions(id, property_id, status, closing_date)')
        .order('started_at', { ascending: false })
      setPlans(p ?? [])

      // Load touches for all plans
      const planIds = (p ?? []).map(pl => pl.id)
      if (planIds.length) {
        const { data: t } = await supabase.from('post_close_touches')
          .select('*')
          .in('plan_id', planIds)
          .order('scheduled_for')
        const byPlan = {}
        for (const touch of (t ?? [])) {
          if (!byPlan[touch.plan_id]) byPlan[touch.plan_id] = []
          byPlan[touch.plan_id].push(touch)
        }
        setTouches(byPlan)
      }

      // Load contacts + deals for create form
      const { data: c } = await supabase.from('contacts').select('id, name').is('deleted_at', null).order('name')
      setContacts(c ?? [])
      const { data: d } = await supabase.from('transactions').select('id, contact_id, status, closing_date, property:properties(address)').order('created_at', { ascending: false })
      setDeals(d ?? [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    if (!createDraft.contact_id || !createDraft.deal_id) return
    setCreating(true)
    try {
      const plan = await DB.createChecklistRun // reuse pattern
      const { data: newPlan } = await supabase.from('client_for_life_plans').insert({
        contact_id: createDraft.contact_id,
        deal_id: createDraft.deal_id,
        cadence_template: createDraft.cadence_template,
        status: 'active',
      }).select().single()

      if (newPlan) {
        // Generate touches
        const touchData = generateTouches(newPlan.id, createDraft.cadence_template, new Date().toISOString())
        if (touchData.length) {
          await supabase.from('post_close_touches').insert(touchData)
        }
      }

      setShowCreate(false)
      setCreateDraft({ contact_id: '', deal_id: '', cadence_template: '5-year-standard' })
      await loadAll()
    } catch (e) { alert(e.message) }
    finally { setCreating(false) }
  }

  const handleToggleTouch = async (touchId, currentOutcome) => {
    const newOutcome = currentOutcome === 'done' ? null : 'done'
    await supabase.from('post_close_touches').update({
      outcome: newOutcome,
      executed_at: newOutcome ? new Date().toISOString() : null,
    }).eq('id', touchId)
    await loadAll()
  }

  const handlePausePlan = async (planId, currentStatus) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused'
    await supabase.from('client_for_life_plans').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', planId)
    await loadAll()
  }

  // Active plans stats
  const activePlans = plans.filter(p => p.status === 'active')
  const upcomingTouches = useMemo(() => {
    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 86400000)
    const upcoming = []
    for (const plan of activePlans) {
      for (const touch of (touches[plan.id] ?? [])) {
        if (!touch.executed_at && new Date(touch.scheduled_for) <= thirtyDays && new Date(touch.scheduled_for) >= now) {
          upcoming.push({ ...touch, plan })
        }
      }
    }
    return upcoming.sort((a, b) => new Date(a.scheduled_for) - new Date(b.scheduled_for))
  }, [activePlans, touches])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <SectionHeader title="Client for Life" subtitle="Post-close touch plans — keep relationships warm for years" />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={{ background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{plans.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Plans</div>
        </div>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{activePlans.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Active</div>
        </div>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1 }}>{upcomingTouches.length}</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Due 30d</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Button onClick={() => setShowCreate(!showCreate)}>+ New Plan</Button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{
          padding: 16, background: 'var(--cream)', borderRadius: 8, border: '1px solid var(--color-border)',
          marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 500 }}>Start a Client for Life plan</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Select label="Client" value={createDraft.contact_id} onChange={e => setCreateDraft(d => ({ ...d, contact_id: e.target.value }))} style={{ flex: 1 }}>
              <option value="">Select client...</option>
              {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select label="Deal" value={createDraft.deal_id} onChange={e => setCreateDraft(d => ({ ...d, deal_id: e.target.value }))} style={{ flex: 1 }}>
              <option value="">Select deal...</option>
              {deals.filter(d => !createDraft.contact_id || d.contact_id === createDraft.contact_id).map(d => (
                <option key={d.id} value={d.id}>{d.property?.address || d.id.slice(0, 8)} — {d.status}</option>
              ))}
            </Select>
          </div>
          <Select label="Cadence" value={createDraft.cadence_template} onChange={e => setCreateDraft(d => ({ ...d, cadence_template: e.target.value }))}>
            {Object.entries(CADENCE_TEMPLATES).map(([key, tmpl]) => (
              <option key={key} value={key}>{tmpl.label} — {tmpl.desc}</option>
            ))}
          </Select>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleCreate} disabled={creating || !createDraft.contact_id || !createDraft.deal_id}>
              {creating ? 'Creating...' : 'Create Plan'}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Upcoming touches */}
      {upcomingTouches.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 500, marginBottom: 8 }}>
            Due Soon
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {upcomingTouches.slice(0, 8).map(touch => {
              const meta = TOUCH_KINDS[touch.kind] || TOUCH_KINDS.email
              const daysUntil = Math.ceil((new Date(touch.scheduled_for) - new Date()) / 86400000)
              return (
                <div key={touch.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: daysUntil <= 3 ? 'rgba(201,154,46,.06)' : 'var(--color-bg-subtle, #faf8f5)',
                  borderRadius: 6, borderLeft: `3px solid ${daysUntil <= 3 ? '#c99a2e' : 'var(--color-border)'}`,
                }}>
                  <button
                    onClick={() => handleToggleTouch(touch.id, touch.outcome)}
                    style={{
                      width: 20, height: 20, borderRadius: 4, flexShrink: 0,
                      border: '2px solid var(--color-border)', background: 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem',
                    }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>{meta.icon}</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                      {touch.plan?.contact?.name || '—'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginLeft: 8 }}>{meta.label}</span>
                  </div>
                  <span style={{
                    fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600,
                    color: daysUntil <= 3 ? '#c99a2e' : 'var(--brown-warm)',
                  }}>
                    {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plan list */}
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 500, marginBottom: 8 }}>
        All Plans ({plans.length})
      </h3>
      {plans.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', padding: '20px 0' }}>
          No post-close plans yet. Create one after a deal closes to stay in touch for years.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {plans.map(plan => {
            const planTouches = touches[plan.id] ?? []
            const done = planTouches.filter(t => t.executed_at).length
            const total = planTouches.length
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const tmpl = CADENCE_TEMPLATES[plan.cadence_template] || { label: plan.cadence_template }
            const isSelected = selectedPlan === plan.id

            return (
              <div key={plan.id}>
                <div
                  onClick={() => setSelectedPlan(isSelected ? null : plan.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8, cursor: 'pointer',
                    border: isSelected ? '1px solid var(--brown-dark)' : '1px solid transparent',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                        {plan.contact?.name || plan.contact?.first_name || '—'}
                      </span>
                      <Badge variant={STATUS_VARIANT[plan.status]} size="sm">{plan.status}</Badge>
                      <span style={{
                        fontSize: '0.62rem', padding: '1px 6px', borderRadius: 999,
                        border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
                      }}>{tmpl.label}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {done}/{total} touches · Started {new Date(plan.started_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ width: 80 }}>
                    <div style={{ height: 4, background: 'var(--color-border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--sage-green, #8B9A7B)', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 2 }}>{pct}%</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); handlePausePlan(plan.id, plan.status) }}>
                    {plan.status === 'paused' ? 'Resume' : 'Pause'}
                  </Button>
                </div>

                {/* Expanded touches */}
                {isSelected && (
                  <div style={{ padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {planTouches.map(touch => {
                      const meta = TOUCH_KINDS[touch.kind] || TOUCH_KINDS.email
                      const isDone = !!touch.executed_at
                      const isPast = new Date(touch.scheduled_for) < new Date() && !isDone
                      return (
                        <div key={touch.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
                          borderRadius: 4, background: isPast ? 'rgba(192,96,74,.04)' : 'transparent',
                        }}>
                          <button
                            onClick={() => handleToggleTouch(touch.id, touch.outcome)}
                            style={{
                              width: 18, height: 18, borderRadius: 3, flexShrink: 0,
                              border: `2px solid ${isDone ? 'var(--sage-green)' : 'var(--color-border)'}`,
                              background: isDone ? 'var(--sage-green)' : 'transparent',
                              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6rem',
                            }}
                          >
                            {isDone ? '✓' : ''}
                          </button>
                          <span style={{ fontSize: '0.8rem', width: 18, textAlign: 'center' }}>{meta.icon}</span>
                          <span style={{
                            fontSize: '0.78rem', flex: 1,
                            color: isDone ? 'var(--color-text-muted)' : isPast ? '#c0604a' : 'var(--brown-dark)',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}>
                            {meta.label}
                          </span>
                          <span style={{
                            fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                            color: isPast ? '#c0604a' : 'var(--color-text-muted)',
                          }}>
                            {new Date(touch.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

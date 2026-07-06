import { useState, useMemo, useCallback } from 'react'
import { Button, Badge } from './ui/index.jsx'
import { useChecklistRun, useChecklistTemplates } from '../lib/hooks.js'
import * as DB from '../lib/supabase.js'

// ─── System badge colors per Command design system ──────────────────────────
const SYSTEM_BADGES = {
  command:  { label: 'Command',  bg: '#fff', border: 'var(--color-border, #C8C3B9)', color: 'var(--brown-warm, #5A4136)' },
  transact: { label: 'Transact', bg: '#F3EBE3', border: 'var(--brown-mid, #B79782)', color: 'var(--brown-warm, #5A4136)' },
  lofty:    { label: 'Lofty',    bg: '#EEF1E9', border: 'var(--sage-green, #8B9A7B)', color: '#566b4a' },
  blotato:  { label: 'Blotato',  bg: '#FAEFEC', border: '#c0604a', color: '#c0604a' },
  slack:    { label: 'Slack',    bg: '#fff', border: 'var(--color-border)', color: 'var(--brown-warm)' },
  resend:   { label: 'Resend',   bg: '#fff', border: 'var(--color-border)', color: 'var(--brown-warm)' },
  mls:      { label: 'MLS',      bg: '#FAF1DD', border: '#c99a2e', color: '#c99a2e' },
}

function SystemBadge({ system }) {
  const style = SYSTEM_BADGES[system] || SYSTEM_BADGES.command
  return (
    <span style={{
      fontSize: '0.6rem', padding: '1px 6px', borderRadius: 999,
      border: `1px solid ${style.border}`, background: style.bg, color: style.color,
      fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.06em',
    }}>
      {style.label}
    </span>
  )
}

// Arizona-specific steps get an "AZ" badge. Honors an explicit `arizona` flag
// (set via Settings ▸ Checklists) and falls back to keyword detection so the
// existing templates light up without a data migration.
const AZ_PATTERN = /\b(ARS|ADRE|AAR|SPDS|BINSR|affidavit|lead[- ]based paint|wire fraud|agency disclosure|fair housing|CC&Rs?|unincorporated|Maricopa)\b/i
function isArizonaStep(step) {
  if (step.arizona === true) return true
  return AZ_PATTERN.test(`${step.label || ''} ${step.notes || ''} ${step.section || ''}`)
}

// ─── Step row ────────────────────────────────────────────────────────────────
function StepRow({ step, isDone, isNA, doneAt, doneSource, onToggle, onToggleNA }) {
  const az = isArizonaStep(step)
  const dimmed = isDone || isNA
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
        background: isDone ? 'rgba(139,154,123,.06)' : isNA ? 'rgba(120,120,120,.05)' : 'transparent',
        borderRadius: 6, transition: 'background 0.15s',
      }}
    >
      <button
        onClick={onToggle}
        disabled={isNA}
        title={isNA ? 'Marked N/A' : isDone ? 'Mark not done' : 'Mark done'}
        style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${isDone ? 'var(--sage-green, #8B9A7B)' : 'var(--color-border, #C8C3B9)'}`,
          background: isDone ? 'var(--sage-green, #8B9A7B)' : 'transparent',
          color: '#fff', cursor: isNA ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', lineHeight: 1, transition: 'all 0.15s', opacity: isNA ? 0.4 : 1,
        }}
      >
        {isDone ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.82rem', color: 'var(--brown-dark, #3A2A1E)',
            textDecoration: dimmed ? 'line-through' : 'none',
            opacity: dimmed ? 0.55 : 1,
          }}>
            {step.label}
          </span>
          {isNA && (
            <span style={{
              fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3,
              background: 'rgba(120,120,120,.15)', color: '#6b6b6b',
              fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.06em',
            }}>
              N/A
            </span>
          )}
          {step.role && (
            <span
              style={{
                fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3,
                background: step.role === 'TC' ? 'rgba(184,153,90,.18)' : 'rgba(139,154,123,.18)',
                color: step.role === 'TC' ? '#7d5f23' : '#566b4a',
                fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.06em',
              }}
              title={step.role === 'TC' ? 'Transaction Coordinator' : 'Agent (Dana)'}
            >
              {step.role}
            </span>
          )}
          {step.system && step.system !== 'command' && <SystemBadge system={step.system} />}
          {az && (
            <span
              style={{
                fontSize: '0.6rem', padding: '1px 5px', borderRadius: 3,
                background: 'rgba(201,154,46,.16)', color: '#8a6d1f',
                fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.06em',
              }}
              title="Arizona-specific requirement"
            >
              AZ
            </span>
          )}
          {step.offset_days != null && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #B79782)' }}>
              {step.offset_days > 0 ? `+${step.offset_days}d` : step.offset_days === 0 ? 'day-of' : `${step.offset_days}d`}
            </span>
          )}
          {step.notes && (
            <span
              style={{ fontSize: '0.7rem', color: 'var(--color-text-muted, #B79782)', cursor: 'help' }}
              title={step.notes}
            >
              ⓘ
            </span>
          )}
        </div>
        {isDone && doneAt && (
          <span style={{ fontSize: '0.65rem', color: 'var(--sage-green, #8B9A7B)' }}>
            Done {new Date(doneAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {doneSource && doneSource !== 'command' ? ` via ${doneSource}` : ''}
          </span>
        )}
      </div>
      {step.deep_link && (
        <a
          href={step.deep_link} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '0.7rem', color: 'var(--brown-mid, #B79782)', textDecoration: 'none' }}
          title="Open in external system"
        >
          ↗
        </a>
      )}
      <button
        onClick={onToggleNA}
        title={isNA ? 'Un-mark N/A' : 'Mark as not applicable'}
        style={{
          flexShrink: 0, fontSize: '0.6rem', padding: '2px 6px', borderRadius: 4,
          border: `1px solid ${isNA ? '#9a9a9a' : 'var(--color-border, #C8C3B9)'}`,
          background: isNA ? 'rgba(120,120,120,.12)' : 'transparent',
          color: isNA ? '#5f5f5f' : 'var(--color-text-muted, #B79782)',
          cursor: 'pointer', fontFamily: 'var(--font-mono, monospace)', textTransform: 'uppercase', letterSpacing: '.05em',
        }}
      >
        N/A
      </button>
    </div>
  )
}

// ─── Main checklist runner ──────────────────────────────────────────────────
export default function ChecklistRunner({ parentKind, parentId, category }) {
  const { data: run, refetch } = useChecklistRun(parentKind, parentId)
  const { data: templates } = useChecklistTemplates()
  const [starting, setStarting] = useState(false)

  // Filter templates to matching category
  const matchingTemplates = useMemo(() =>
    (templates ?? []).filter(t => t.category === category),
    [templates, category]
  )

  const steps = useMemo(() => {
    if (!run?.template) return []
    return Array.isArray(run.template.steps) ? run.template.steps : []
  }, [run])

  const stepStates = run?.step_states || {}

  const progress = useMemo(() => {
    if (!steps.length) return { done: 0, total: 0, na: 0, pct: 0 }
    // N/A steps are tracked but excluded from the completion denominator.
    const applicable = steps.filter(s => !stepStates[s.id]?.na)
    const done = applicable.filter(s => stepStates[s.id]?.done).length
    const na = steps.length - applicable.length
    return { done, total: applicable.length, na, pct: applicable.length ? Math.round((done / applicable.length) * 100) : 0 }
  }, [steps, stepStates])

  // Group steps by section
  const sections = useMemo(() => {
    const groups = {}
    for (const step of steps) {
      const section = step.section || 'General'
      if (!groups[section]) groups[section] = []
      groups[section].push(step)
    }
    // Sort steps within each section by order
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => (a.order || 0) - (b.order || 0))
    }
    return groups
  }, [steps])

  // Complete once every applicable (non-N/A) step is done.
  const computeCompletedAt = useCallback((states) => {
    const applicable = steps.filter(s => !states[s.id]?.na)
    const allDone = applicable.length > 0 && applicable.every(s => states[s.id]?.done)
    return allDone ? new Date().toISOString() : null
  }, [steps])

  const handleToggle = useCallback(async (stepId) => {
    if (!run) return
    const current = stepStates[stepId]
    if (current?.na) return // can't complete an N/A step
    const newStates = { ...stepStates }
    if (current?.done) {
      newStates[stepId] = { done: false, done_at: null, source: null }
    } else {
      newStates[stepId] = { done: true, done_at: new Date().toISOString(), source: 'command' }
    }
    await DB.updateChecklistRun(run.id, {
      step_states: newStates,
      completed_at: computeCompletedAt(newStates),
    })
    refetch()
  }, [run, stepStates, refetch, computeCompletedAt])

  const handleToggleNA = useCallback(async (stepId) => {
    if (!run) return
    const current = stepStates[stepId]
    const newStates = { ...stepStates }
    if (current?.na) {
      newStates[stepId] = { done: false, done_at: null, source: null, na: false }
    } else {
      // Marking N/A clears any done state.
      newStates[stepId] = { done: false, done_at: null, source: null, na: true, na_at: new Date().toISOString() }
    }
    await DB.updateChecklistRun(run.id, {
      step_states: newStates,
      completed_at: computeCompletedAt(newStates),
    })
    refetch()
  }, [run, stepStates, refetch, computeCompletedAt])

  const handleStart = async (templateId) => {
    setStarting(true)
    try {
      await DB.createChecklistRun({
        template_id: templateId,
        parent_kind: parentKind,
        parent_id: parentId,
        step_states: {},
      })
      refetch()
    } catch (e) { alert(e.message) }
    finally { setStarting(false) }
  }

  // No run yet — show template picker
  if (!run) {
    if (!matchingTemplates.length) return null
    return (
      <div style={{
        padding: 16, background: 'var(--cream, #EFEDE8)', borderRadius: 8,
        border: '1px solid var(--color-border, #C8C3B9)',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
          fontWeight: 500, fontSize: '1.1rem', margin: '0 0 8px',
        }}>
          Checklist
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--brown-warm, #5A4136)', margin: '0 0 10px' }}>
          Start a checklist to track progress:
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {matchingTemplates.map(t => (
            <Button key={t.id} size="sm" onClick={() => handleStart(t.id)} disabled={starting}>
              {t.name} ({(Array.isArray(t.steps) ? t.steps : []).length} steps)
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // Active run — show checklist
  return (
    <div style={{
      background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 8,
      border: '1px solid var(--color-border, #C8C3B9)', overflow: 'hidden',
    }}>
      {/* Header with progress */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-border, #C8C3B9)',
      }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontWeight: 500, fontSize: '1.1rem', margin: 0,
          }}>
            {run.template?.name || 'Checklist'}
          </h3>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #B79782)' }}>
            {progress.done}/{progress.total} complete{progress.na > 0 ? ` · ${progress.na} N/A` : ''}
          </span>
        </div>
        {progress.pct === 100 ? (
          <Badge variant="success" size="sm">Complete</Badge>
        ) : (
          <div style={{
            width: 48, height: 48, borderRadius: '50%', position: 'relative',
            background: `conic-gradient(var(--sage-green, #8B9A7B) ${progress.pct * 3.6}deg, var(--color-border, #C8C3B9) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', background: 'var(--color-bg-subtle, #faf8f5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 600, color: 'var(--brown-dark, #3A2A1E)',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
              {progress.pct}%
            </div>
          </div>
        )}
      </div>

      {/* Steps grouped by section */}
      <div style={{ padding: '8px 4px' }}>
        {Object.entries(sections).map(([section, sectionSteps]) => (
          <div key={section}>
            {Object.keys(sections).length > 1 && (
              <div style={{
                fontSize: '0.68rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em',
                color: 'var(--color-text-muted, #B79782)', padding: '8px 12px 2px',
                fontFamily: 'var(--font-mono, monospace)',
              }}>
                {section}
              </div>
            )}
            {sectionSteps.map(step => {
              const state = stepStates[step.id] || {}
              return (
                <StepRow
                  key={step.id}
                  step={step}
                  isDone={!!state.done}
                  isNA={!!state.na}
                  doneAt={state.done_at}
                  doneSource={state.source}
                  onToggle={() => handleToggle(step.id)}
                  onToggleNA={() => handleToggleNA(step.id)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

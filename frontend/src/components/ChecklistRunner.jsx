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

// ─── Step row ────────────────────────────────────────────────────────────────
function StepRow({ step, isDone, doneAt, doneSource, onToggle }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
        background: isDone ? 'rgba(139,154,123,.06)' : 'transparent',
        borderRadius: 6, transition: 'background 0.15s',
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${isDone ? 'var(--sage-green, #8B9A7B)' : 'var(--color-border, #C8C3B9)'}`,
          background: isDone ? 'var(--sage-green, #8B9A7B)' : 'transparent',
          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', lineHeight: 1, transition: 'all 0.15s',
        }}
      >
        {isDone ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.82rem', color: 'var(--brown-dark, #3A2A1E)',
            textDecoration: isDone ? 'line-through' : 'none',
            opacity: isDone ? 0.6 : 1,
          }}>
            {step.label}
          </span>
          {step.system && step.system !== 'command' && <SystemBadge system={step.system} />}
          {step.offset_days != null && (
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted, #B79782)' }}>
              {step.offset_days > 0 ? `+${step.offset_days}d` : step.offset_days === 0 ? 'day-of' : `${step.offset_days}d`}
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
    if (!steps.length) return { done: 0, total: 0, pct: 0 }
    const done = steps.filter(s => stepStates[s.id]?.done).length
    return { done, total: steps.length, pct: Math.round((done / steps.length) * 100) }
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

  const handleToggle = useCallback(async (stepId) => {
    if (!run) return
    const current = stepStates[stepId]
    const newStates = { ...stepStates }
    if (current?.done) {
      newStates[stepId] = { done: false, done_at: null, source: null }
    } else {
      newStates[stepId] = { done: true, done_at: new Date().toISOString(), source: 'command' }
    }
    // Check if all done
    const allDone = steps.every(s => newStates[s.id]?.done)
    await DB.updateChecklistRun(run.id, {
      step_states: newStates,
      completed_at: allDone ? new Date().toISOString() : null,
    })
    refetch()
  }, [run, stepStates, steps, refetch])

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
            {progress.done}/{progress.total} complete
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
                  doneAt={state.done_at}
                  doneSource={state.source}
                  onToggle={() => handleToggle(step.id)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { Badge } from './index.jsx'
import { pauseEnrollment, resumeEnrollment, stopEnrollment } from '../../lib/campaigns.js'

/**
 * Click-to-manage badge for a single campaign enrollment.
 * Shows the campaign name; click to pause/resume/stop without leaving the page.
 *
 * Props:
 *   enrollment: { id, status, campaign: { id, name } }
 *   onChange:   () => void  (called after a successful action so the parent can refetch)
 */
export default function CampaignBadgePopover({ enrollment, onChange }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const status = enrollment.status || 'active'
  const variant = status === 'paused' ? 'warning' : status === 'stopped' || status === 'completed' ? 'default' : 'success'
  const name = enrollment.campaign?.name || 'Campaign'

  const run = async (fn) => {
    setBusy(true)
    try {
      await fn(enrollment.id)
      setOpen(false)
      onChange?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
      >
        <Badge variant={variant} size="sm">{name}{status === 'paused' ? ' · paused' : ''}</Badge>
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 1000,
            background: '#fff',
            border: '1px solid var(--color-border, #e5e1d8)',
            borderRadius: 'var(--radius-md, 8px)',
            boxShadow: '0 4px 18px rgba(0,0,0,0.08)',
            padding: 6,
            minWidth: 140,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {status === 'active' && (
            <button type="button" disabled={busy} onClick={() => run(pauseEnrollment)} className="cbp-action">Pause</button>
          )}
          {status === 'paused' && (
            <button type="button" disabled={busy} onClick={() => run(resumeEnrollment)} className="cbp-action">Resume</button>
          )}
          {status !== 'stopped' && status !== 'completed' && (
            <button type="button" disabled={busy} onClick={() => { if (confirm('Stop this enrollment? They\'ll receive no further emails from this campaign.')) run(stopEnrollment) }} className="cbp-action cbp-action--danger">Stop</button>
          )}
          {(status === 'stopped' || status === 'completed') && (
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8b7a68)', padding: '6px 10px' }}>
              {status === 'completed' ? 'Completed' : 'Stopped'}
            </span>
          )}
        </div>
      )}
      <style>{`
        .cbp-action {
          background: none;
          border: none;
          font-family: inherit;
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--brown-dark, #3A2A1E);
          padding: 6px 10px;
          text-align: left;
          cursor: pointer;
          border-radius: 4px;
        }
        .cbp-action:hover { background: var(--cream, #f6f1e8); }
        .cbp-action:disabled { opacity: 0.5; cursor: default; }
        .cbp-action--danger { color: var(--color-danger, #c5221f); }
        .cbp-action--danger:hover { background: rgba(197,34,31,0.08); }
      `}</style>
    </span>
  )
}

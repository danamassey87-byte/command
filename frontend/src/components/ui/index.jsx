import { useEffect, useState, useRef } from 'react'
import './ui.css'

/* ─── Button ─── */
export function Button({ children, variant = 'primary', size = 'md', onClick, disabled, className = '', icon, ...props }) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="btn__icon">{icon}</span>}
      {children}
    </button>
  )
}

/* ─── Badge ─── */
export function Badge({ children, variant = 'default', size = 'md' }) {
  return <span className={`badge badge--${variant} badge--${size}`}>{children}</span>
}

/* ─── Card ─── */
export function Card({ children, className = '', padding = true, hover = false }) {
  return (
    <div className={`card ${padding ? 'card--padded' : ''} ${hover ? 'card--hover' : ''} ${className}`}>
      {children}
    </div>
  )
}

/* ─── Stat Card ─── */
export function StatCard({ label, value, delta, deltaLabel, icon, accent }) {
  const isPositive = delta > 0
  return (
    <div className={`stat-card ${accent ? 'stat-card--accent' : ''}`}>
      {icon && <div className="stat-card__icon">{icon}</div>}
      <div className="stat-card__body">
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value}</p>
        {delta !== undefined && (
          <p className={`stat-card__delta ${isPositive ? 'stat-card__delta--up' : 'stat-card__delta--down'}`}>
            <span>{isPositive ? '↑' : '↓'}</span>
            {Math.abs(delta)}% {deltaLabel}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Input ─── */
export function Input({ label, id, error, className = '', ...props }) {
  return (
    <div className={`field ${className}`}>
      {label && <label className="field__label" htmlFor={id}>{label}</label>}
      <input id={id} className={`field__input ${error ? 'field__input--error' : ''}`} {...props} />
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

/* ─── Select ─── */
export function Select({ label, id, error, children, className = '', ...props }) {
  return (
    <div className={`field ${className}`}>
      {label && <label className="field__label" htmlFor={id}>{label}</label>}
      <select id={id} className={`field__input field__select ${error ? 'field__input--error' : ''}`} {...props}>
        {children}
      </select>
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

/* ─── Section Header ─── */
export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="section-header">
      <div>
        <h2 className="section-header__title">{title}</h2>
        {subtitle && <p className="section-header__sub">{subtitle}</p>}
      </div>
      {actions && <div className="section-header__actions">{actions}</div>}
    </div>
  )
}

/* ─── Tab Bar ─── */
export function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.value}
          className={`tab-bar__tab ${active === tab.value ? 'tab-bar__tab--active' : ''}`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="tab-bar__count">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ─── Checkbox Item ─── */
// Optional onEdit / onDelete props add hover-reveal pencil + trash buttons.
// When onEdit is provided, double-clicking the label or clicking the pencil
// enters inline edit mode.
export function CheckItem({ label, checked, onChange, note, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState(label)
  const inputRef = useRef(null)

  useEffect(() => { setDraftLabel(label) }, [label])
  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus() }, [editing])

  const commitEdit = () => {
    const next = draftLabel.trim()
    if (next && next !== label && onEdit) onEdit(next)
    setEditing(false)
  }
  const cancelEdit = () => { setDraftLabel(label); setEditing(false) }

  const hasActions = !!(onEdit || onDelete)

  return (
    <label className={`check-item ${checked ? 'check-item--done' : ''} ${hasActions ? 'check-item--has-actions' : ''}`}>
      <input
        type="checkbox"
        className="check-item__input"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="check-item__box">
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,6 4,9 11,2" />
          </svg>
        )}
      </span>
      {editing ? (
        <input
          ref={inputRef}
          className="check-item__edit-input"
          type="text"
          value={draftLabel}
          onChange={e => setDraftLabel(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
            if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
          }}
          onClick={e => { e.preventDefault(); e.stopPropagation() }}
        />
      ) : (
        <span
          className="check-item__label"
          onDoubleClick={e => { if (onEdit) { e.preventDefault(); setEditing(true) } }}
        >
          {label}
        </span>
      )}
      {note && !editing && <span className="check-item__note">{note}</span>}
      {hasActions && !editing && (
        <span className="check-item__actions" onClick={e => e.preventDefault()}>
          {onEdit && (
            <button
              type="button"
              className="check-item__action-btn"
              title="Edit"
              onClick={e => { e.preventDefault(); e.stopPropagation(); setEditing(true) }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="check-item__action-btn check-item__action-btn--danger"
              title="Delete"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete() }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </span>
      )}
    </label>
  )
}

/* ─── Empty State ─── */
export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state__icon">{icon}</div>}
      <h3 className="empty-state__title">{title}</h3>
      {description && <p className="empty-state__desc">{description}</p>}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  )
}

/* ─── Textarea ─── */
export function Textarea({ label, id, error, className = '', rows = 3, ...props }) {
  return (
    <div className={`field ${className}`}>
      {label && <label className="field__label" htmlFor={id}>{label}</label>}
      <textarea id={id} rows={rows} className={`field__input field__textarea ${error ? 'field__input--error' : ''}`} {...props} />
      {error && <p className="field__error">{error}</p>}
    </div>
  )
}

/* ─── SlidePanel ─── */
export function SlidePanel({ open, onClose, title, subtitle, width = 460, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div className={`slide-panel__backdrop ${open ? 'slide-panel__backdrop--open' : ''}`} onClick={onClose} />
      <div className={`slide-panel ${open ? 'slide-panel--open' : ''}`} style={{ width }}>
        <div className="slide-panel__header">
          <div className="slide-panel__title-area">
            <h3 className="slide-panel__title">{title}</h3>
            {subtitle && <p className="slide-panel__sub">{subtitle}</p>}
          </div>
          <button className="slide-panel__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="slide-panel__body">{children}</div>
      </div>
    </>
  )
}

/* ─── Info Tip ─── */
export function InfoTip({ text, position = 'top' }) {
  return (
    <span className={`infotip infotip--${position}`} data-tip={text}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="infotip__icon">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="8.5" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="12" y1="11" x2="12" y2="16" />
      </svg>
    </span>
  )
}

/* ─── Address Link (opens in maps app) ─── */
export function AddressLink({ address, city, children, className = '' }) {
  if (!address) return <span className={className}>{children ?? '—'}</span>
  const full = city ? `${address}, ${city}` : address
  const url = `https://maps.google.com/maps?q=${encodeURIComponent(full)}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`address-link ${className}`}
      onClick={e => e.stopPropagation()}
      title={`Open ${full} in Maps`}
    >
      {children ?? address}
    </a>
  )
}

/* ─── Data Table ─── */
export function DataTable({ columns, rows, onRowClick }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} className="data-table__th" style={{ width: col.width }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table__empty">
                No records found
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={row.id ?? i}
                className={`data-table__row ${onRowClick ? 'data-table__row--clickable' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(col => (
                  <td key={col.key} className="data-table__td">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

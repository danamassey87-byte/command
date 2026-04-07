import './quick-add.css'

/**
 * Surfaces potential duplicates detected before saving a new record.
 * The user must explicitly choose one of:
 *  - Use an existing match (calls onUseExisting with the matched row)
 *  - Confirm the new entry is unique (calls onForceCreate)
 *
 * Works for both contact and property matches. `kind` controls labelling.
 */
export default function DuplicateWarning({
  kind, // 'contact' | 'property'
  matches,
  onUseExisting,
  onForceCreate,
  mode = 'blocking', // 'blocking' | 'suggestion'
}) {
  if (!matches?.length) return null

  const label = kind === 'property' ? 'property address' : 'contact'
  const icon = kind === 'property' ? '📍' : '👤'
  const isSuggestion = mode === 'suggestion'

  return (
    <div className={`dup-warning ${isSuggestion ? 'dup-warning--suggestion' : ''}`} role={isSuggestion ? 'status' : 'alert'}>
      <div className="dup-warning__header">
        <span className="dup-warning__icon">{isSuggestion ? '💡' : '⚠️'}</span>
        <div>
          <div className="dup-warning__title">
            {isSuggestion
              ? `Existing ${label} on file`
              : `Possible duplicate ${label}${matches.length > 1 ? 's' : ''} found`}
          </div>
          <div className="dup-warning__sub">
            {isSuggestion
              ? 'Link to the existing record so history stays connected, or continue with what you typed.'
              : 'Choose an existing record or confirm this is a new unique entry.'}
          </div>
        </div>
      </div>

      <ul className="dup-warning__list">
        {matches.map(m => (
          <li key={m.id} className="dup-warning__item">
            <button
              type="button"
              className="dup-warning__match"
              onClick={() => onUseExisting(m)}
            >
              <span className="dup-warning__match-icon">{icon}</span>
              <div className="dup-warning__match-body">
                <div className="dup-warning__match-primary">
                  {kind === 'property' ? m.address : m.name}
                </div>
                <div className="dup-warning__match-meta">
                  {kind === 'property'
                    ? [m.city, m.state, m.zip].filter(Boolean).join(', ')
                    : [m.type, m.email, m.phone].filter(Boolean).join(' · ')}
                  {m.score != null && (
                    <span className="dup-warning__score">
                      {Math.round(m.score * 100)}% match
                    </span>
                  )}
                </div>
              </div>
              <span className="dup-warning__use">Use this →</span>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="dup-warning__force"
        onClick={onForceCreate}
      >
        {isSuggestion ? 'Continue with what I typed' : 'None of these — create as new'}
      </button>
    </div>
  )
}

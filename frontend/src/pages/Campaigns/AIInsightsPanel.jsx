// ─────────────────────────────────────────────────────────────────────────────
// AIInsightsPanel — Claude-powered campaign optimization recommendations
// Shows pending recommendations with Apply / Edit / Dismiss / Snooze actions
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import { Button, Badge, Card } from '../../components/ui/index.jsx'
import * as DB from '../../lib/supabase'

const TYPE_LABELS = {
  subject_line: { label: 'Subject Line', emoji: '✉️', color: '#c99a2e' },
  email_body:   { label: 'Email Body',   emoji: '📝', color: 'var(--brown-mid)' },
  cta:          { label: 'CTA Button',   emoji: '🔘', color: '#6a9e72' },
  send_time:    { label: 'Send Time',    emoji: '🕐', color: '#8a7a9b' },
  step_order:   { label: 'Step Order',   emoji: '🔄', color: '#c0604a' },
  funnel:       { label: 'Funnel',       emoji: '📊', color: '#b79782' },
}

function confidenceBadge(c) {
  if (c >= 0.8) return <Badge variant="success" size="sm">High confidence</Badge>
  if (c >= 0.5) return <Badge variant="warning" size="sm">Medium</Badge>
  return <Badge variant="default" size="sm">Low</Badge>
}

export default function AIInsightsPanel({ campaignId, campaigns, onApply }) {
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)

  const loadRecs = async () => {
    setLoading(true)
    try {
      if (campaignId) {
        setRecs(await DB.getAIRecommendations(campaignId) ?? [])
      } else {
        setRecs(await DB.getAllPendingRecommendations() ?? [])
      }
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { loadRecs() }, [campaignId])

  const handleAnalyze = async () => {
    setAnalyzing(true); setError(null)
    try {
      await DB.triggerCampaignAnalysis(campaignId)
      await loadRecs()
    } catch (e) {
      setError(e.message)
    } finally { setAnalyzing(false) }
  }

  const handleAction = async (rec, action) => {
    try {
      if (action === 'apply') {
        await DB.updateRecommendation(rec.id, { status: 'applied' })
        // Apply the change to the campaign step
        if (onApply && rec.suggested_value) {
          onApply(rec)
        }
      } else if (action === 'dismiss') {
        const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        await DB.updateRecommendation(rec.id, { status: 'dismissed', dismissed_until: until })
      } else if (action === 'snooze') {
        const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        await DB.updateRecommendation(rec.id, { status: 'snoozed', dismissed_until: until })
      }
      await loadRecs()
    } catch (e) {
      setError(e.message)
    }
  }

  const pendingRecs = recs.filter(r => r.status === 'pending')

  return (
    <div className="ai-insights">
      <div className="ai-insights__header">
        <div>
          <h3 className="ai-insights__title">AI Campaign Optimizer</h3>
          <p className="ai-insights__subtitle">
            {pendingRecs.length > 0
              ? `${pendingRecs.length} recommendation${pendingRecs.length !== 1 ? 's' : ''} ready`
              : 'Analyze your campaigns for optimization opportunities'}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAnalyze}
          disabled={analyzing}
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
        >
          {analyzing ? 'Analyzing...' : 'Analyze Campaigns'}
        </Button>
      </div>

      {error && <p className="ai-insights__error">{error}</p>}

      {loading && <p className="ai-insights__loading">Loading recommendations...</p>}

      {!loading && pendingRecs.length === 0 && !analyzing && (
        <div className="ai-insights__empty">
          <p>No pending recommendations. Hit "Analyze Campaigns" to get AI-powered suggestions based on your send data.</p>
          <p className="ai-insights__empty-note">Campaigns need at least 20 sends for meaningful analysis.</p>
        </div>
      )}

      {pendingRecs.length > 0 && (
        <div className="ai-insights__list">
          {pendingRecs.map(rec => {
            const meta = TYPE_LABELS[rec.type] || { label: rec.type, emoji: '💡', color: '#999' }
            const campaignName = rec.campaign?.name || campaigns?.find(c => c.id === rec.campaign_id)?.name || '—'

            return (
              <Card key={rec.id} className="ai-rec-card">
                <div className="ai-rec-card__top">
                  <div className="ai-rec-card__type">
                    <span>{meta.emoji}</span>
                    <Badge size="sm" style={{ background: meta.color, color: '#fff' }}>{meta.label}</Badge>
                    {rec.step_index != null && <span className="ai-rec-card__step">Step {rec.step_index + 1}</span>}
                  </div>
                  {confidenceBadge(rec.confidence)}
                </div>

                {!campaignId && (
                  <p className="ai-rec-card__campaign">{campaignName}</p>
                )}

                {rec.current_value && (
                  <div className="ai-rec-card__compare">
                    <div className="ai-rec-card__current">
                      <span className="ai-rec-card__label">Current</span>
                      <p className="ai-rec-card__value">{rec.current_value}</p>
                    </div>
                    <span className="ai-rec-card__arrow">→</span>
                    <div className="ai-rec-card__suggested">
                      <span className="ai-rec-card__label">Suggested</span>
                      <p className="ai-rec-card__value ai-rec-card__value--new">{rec.suggested_value}</p>
                    </div>
                  </div>
                )}

                {!rec.current_value && rec.suggested_value && (
                  <p className="ai-rec-card__suggestion">{rec.suggested_value}</p>
                )}

                <p className="ai-rec-card__reasoning">{rec.reasoning}</p>

                <div className="ai-rec-card__actions">
                  <Button size="sm" variant="primary" onClick={() => handleAction(rec, 'apply')}>Apply</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (onApply) onApply({ ...rec, _editMode: true })
                  }}>Edit & Apply</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleAction(rec, 'snooze')}>Remind Later</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleAction(rec, 'dismiss')}>Dismiss</Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

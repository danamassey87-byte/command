// ─────────────────────────────────────────────────────────────────────────────
// TriggerPicker — lives inside the CampaignEditor. Lets Dana attach one or more
// auto-enrollment triggers to a campaign.
//
// Triggers are stored in the `campaign_triggers` table — saved independently
// of the campaign form (not part of the form state), because an existing
// campaign may gain/lose triggers without touching its name/steps.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { Button, Select, Badge } from '../../components/ui'
import * as campaignsApi from '../../lib/campaigns'
import { TRIGGER_GROUPS, TRIGGERS_BY_KEY, labelForTrigger } from './triggerCatalog'

export default function TriggerPicker({ campaignId, tags = [], campaigns = [] }) {
  const [triggers, setTriggers] = useState([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newType, setNewType] = useState('tag_added')
  const [newConfig, setNewConfig] = useState({})

  const reload = useCallback(async () => {
    if (!campaignId) {
      setTriggers([])
      return
    }
    setLoading(true)
    try {
      const rows = await campaignsApi.listTriggersForCampaign(campaignId)
      setTriggers(rows)
    } catch (err) {
      console.warn('[TriggerPicker] load failed:', err.message)
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => { reload() }, [reload])

  const handleAdd = async () => {
    if (!campaignId) {
      alert('Save the campaign first — triggers attach to a saved campaign.')
      return
    }
    try {
      await campaignsApi.createTrigger({
        campaign_id: campaignId,
        trigger_type: newType,
        config: newConfig,
        enabled: true,
      })
      setAdding(false)
      setNewType('tag_added')
      setNewConfig({})
      await reload()
    } catch (err) {
      alert('Failed to create trigger: ' + err.message)
    }
  }

  const handleToggle = async (id, enabled) => {
    try { await campaignsApi.updateTrigger(id, { enabled: !enabled }); reload() }
    catch (err) { alert('Failed to toggle trigger: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this trigger?')) return
    try { await campaignsApi.deleteTrigger(id); reload() }
    catch (err) { alert('Failed to delete trigger: ' + err.message) }
  }

  const currentDef = TRIGGERS_BY_KEY[newType]

  return (
    <div className="sc-triggers">
      <div className="sc-triggers__header">
        <h4>Enrollment Triggers</h4>
        {!adding && campaignId && (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>+ Add trigger</Button>
        )}
      </div>

      {!campaignId && (
        <p className="sc-triggers__hint">
          Save this campaign first, then attach triggers to auto-enroll contacts on events
          (tag added, BBA signed, listing active, etc).
        </p>
      )}

      {/* ─── Existing triggers ─── */}
      {campaignId && (
        <div className="sc-triggers__list">
          {loading && <p style={{ fontSize: 12, color: '#888' }}>Loading...</p>}
          {!loading && triggers.length === 0 && !adding && (
            <p className="sc-triggers__hint">
              No triggers attached. Contacts can only be enrolled manually via the
              <strong> + Enroll </strong> button.
            </p>
          )}
          {triggers.map(t => {
            const def = TRIGGERS_BY_KEY[t.trigger_type]
            return (
              <div key={t.id} className={`sc-trigger-row ${!t.enabled ? 'is-disabled' : ''}`}>
                <div className="sc-trigger-row__main">
                  <div className="sc-trigger-row__label">
                    {def?.label ?? t.trigger_type}
                    {!t.enabled && <Badge size="sm" variant="default">paused</Badge>}
                  </div>
                  <div className="sc-trigger-row__detail">
                    {def?.description}
                    {t.config && Object.keys(t.config).length > 0 && (
                      <> · config: {JSON.stringify(t.config)}</>
                    )}
                  </div>
                </div>
                <div className="sc-trigger-row__actions">
                  <button
                    className="sc-trigger-row__btn"
                    onClick={() => handleToggle(t.id, t.enabled)}
                    title={t.enabled ? 'Pause trigger' : 'Resume trigger'}
                  >
                    {t.enabled ? 'Pause' : 'Enable'}
                  </button>
                  <button
                    className="sc-trigger-row__btn sc-trigger-row__btn--danger"
                    onClick={() => handleDelete(t.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Add new trigger form ─── */}
      {adding && campaignId && (
        <div className="sc-trigger-add">
          <Select
            label="Trigger type"
            value={newType}
            onChange={e => { setNewType(e.target.value); setNewConfig({}) }}
          >
            {TRIGGER_GROUPS.map(g => (
              <optgroup key={g.label} label={g.label}>
                {g.triggers.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </optgroup>
            ))}
          </Select>

          {currentDef?.description && (
            <p className="sc-triggers__hint">{currentDef.description}</p>
          )}

          {/* Config fields */}
          {currentDef?.configFields?.map(field => (
            <ConfigField
              key={field.key}
              field={field}
              value={newConfig[field.key] ?? ''}
              onChange={(v) => setNewConfig({ ...newConfig, [field.key]: v || undefined })}
              tags={tags}
              campaigns={campaigns}
            />
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button size="sm" onClick={handleAdd}>Attach trigger</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewConfig({}) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfigField — renders one field of a trigger's config based on its `type`
// ─────────────────────────────────────────────────────────────────────────────
function ConfigField({ field, value, onChange, tags, campaigns }) {
  if (field.type === 'tag-picker') {
    return (
      <Select
        label={field.label}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— select a tag —</option>
        {tags.map(t => (
          <option key={t.id} value={t.id}>
            {t.category ? `${t.category} · ` : ''}{t.name}
          </option>
        ))}
      </Select>
    )
  }

  if (field.type === 'select') {
    return (
      <Select
        label={field.label}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {field.options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
    )
  }

  if (field.type === 'campaign-picker') {
    return (
      <Select
        label={field.label}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">— any campaign —</option>
        {campaigns.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
    )
  }

  return null
}

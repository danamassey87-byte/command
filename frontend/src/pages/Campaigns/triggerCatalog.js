// ─────────────────────────────────────────────────────────────────────────────
// Campaign trigger catalog — metadata for every trigger_type enum value.
// Used by TriggerPicker to render the type dropdown + config fields, and by
// the activity feed to render human-readable labels.
// ─────────────────────────────────────────────────────────────────────────────

export const TRIGGER_GROUPS = [
  {
    label: 'Manual',
    triggers: [
      { key: 'manual', label: 'Manual only', description: 'No auto-trigger — enroll by hand', configFields: [] },
    ],
  },
  {
    label: 'Tags',
    triggers: [
      {
        key: 'tag_added',
        label: 'Tag added',
        description: 'Fires when a specific tag is added to a contact',
        configFields: [{ key: 'tag_id', label: 'Tag', type: 'tag-picker', required: true }],
      },
      {
        key: 'tag_removed',
        label: 'Tag removed',
        description: 'Fires when a specific tag is removed from a contact',
        configFields: [{ key: 'tag_id', label: 'Tag', type: 'tag-picker', required: true }],
      },
    ],
  },
  {
    label: 'Contact Lifecycle',
    triggers: [
      {
        key: 'contact_created',
        label: 'New contact created',
        description: 'Fires whenever a new contact is created (optionally filtered by type)',
        configFields: [
          { key: 'type', label: 'Only if type is', type: 'select', options: [
            { value: '', label: 'Any type' },
            { value: 'lead', label: 'Lead' },
            { value: 'buyer', label: 'Buyer' },
            { value: 'seller', label: 'Seller' },
            { value: 'investor', label: 'Investor' },
            { value: 'past_client', label: 'Past client' },
          ] },
        ],
      },
      {
        key: 'contact_type_changed',
        label: 'Contact type changed',
        description: "Fires when a contact's type changes (e.g. lead → buyer)",
        configFields: [
          { key: 'to', label: 'Changed to', type: 'select', options: [
            { value: '', label: 'Any' },
            { value: 'buyer', label: 'Buyer' },
            { value: 'seller', label: 'Seller' },
            { value: 'investor', label: 'Investor' },
            { value: 'past_client', label: 'Past client' },
          ] },
        ],
      },
    ],
  },
  {
    label: 'Buyer Side',
    triggers: [
      {
        key: 'bba_signed',
        label: 'BBA signed',
        description: 'Fires when bba_signed flips to true on a buyer contact',
        configFields: [],
      },
    ],
  },
  {
    label: 'Seller Side',
    triggers: [
      {
        key: 'listing_appt_booked',
        label: 'Listing appointment booked',
        description: 'Fires when a new listing appointment is scheduled',
        configFields: [],
      },
      {
        key: 'listing_appt_completed',
        label: 'Listing appointment completed',
        description: 'Fires when a listing appointment is marked completed',
        configFields: [],
      },
      {
        key: 'listing_agreement_signed',
        label: 'Listing agreement signed',
        description: 'Fires when listing_agreement_signed flips to true',
        configFields: [],
      },
      {
        key: 'listing_active',
        label: 'Listing goes active',
        description: "Fires when a listing's status changes to 'active'",
        configFields: [],
      },
      {
        key: 'listing_under_contract',
        label: 'Listing under contract',
        description: "Fires when a listing's status changes to 'pending'",
        configFields: [],
      },
      {
        key: 'listing_closed',
        label: 'Listing closed',
        description: "Fires when a listing's status changes to 'closed'",
        configFields: [],
      },
      {
        key: 'listing_expired',
        label: 'Listing expired',
        description: "Fires when a listing's status changes to 'expired'",
        configFields: [],
      },
    ],
  },
  {
    label: 'Transactions',
    triggers: [
      {
        key: 'transaction_closed',
        label: 'Transaction closed',
        description: 'Fires when a transaction closes (great for post-close nurture chains)',
        configFields: [],
      },
    ],
  },
  {
    label: 'Engagement (needs Resend / Gmail)',
    triggers: [
      {
        key: 'email_opened',
        label: 'Email opened',
        description: 'Fires when a contact opens an email from another campaign. Needs Resend webhook.',
        configFields: [],
      },
      {
        key: 'email_clicked',
        label: 'Email link clicked',
        description: 'Fires when a contact clicks a link in a previous email. Needs Resend webhook.',
        configFields: [],
      },
      {
        key: 'email_replied',
        label: 'Email replied to',
        description: 'Fires when a contact replies to an email. Needs Gmail read-only integration.',
        configFields: [],
      },
    ],
  },
  {
    label: 'Forms',
    triggers: [
      {
        key: 'form_submitted',
        label: 'Form submitted',
        description: 'Fires when a public intake form is submitted',
        configFields: [],
      },
    ],
  },
  {
    label: 'Campaign Flow',
    triggers: [
      {
        key: 'campaign_completed',
        label: 'Previous campaign completed',
        description: 'Chain campaigns — fires when a contact finishes another campaign',
        configFields: [
          { key: 'from_campaign_id', label: 'From campaign', type: 'campaign-picker', required: false },
        ],
      },
    ],
  },
]

// Flattened lookup: triggerType → { label, description, configFields, group }
export const TRIGGERS_BY_KEY = {}
for (const group of TRIGGER_GROUPS) {
  for (const t of group.triggers) {
    TRIGGERS_BY_KEY[t.key] = { ...t, group: group.label }
  }
}

export function labelForTrigger(triggerType) {
  return TRIGGERS_BY_KEY[triggerType]?.label ?? triggerType
}

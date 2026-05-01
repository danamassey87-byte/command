import { useState, useEffect, useMemo } from 'react'
import { listLeads } from '../../lib/biolink.js'
import ProspectingList from './ProspectingList'

export default function BioLinkLeads() {
  const [biolinkLeads, setBiolinkLeads] = useState([])

  useEffect(() => {
    listLeads().then(data => setBiolinkLeads(data ?? [])).catch(() => {})
  }, [])

  // Normalize biolink_leads into prospect-shaped rows
  const extraRows = useMemo(() => {
    return biolinkLeads.map(bl => ({
      id: `bl_${bl.id}`,
      _isBioLink: true,
      _contact_id: bl.contact_id || null,
      name: bl.name || bl.email?.split('@')[0] || 'Unknown',
      phone: bl.phone || null,
      email: bl.email || null,
      source: 'bio_link',
      status: 'new',
      address: null,
      city: null,
      zip: null,
      mls_id: null,
      list_price: null,
      notes: [
        bl.guide_type && `Guide: ${bl.guide_type}`,
      ].filter(Boolean).join(' · ') || null,
      labels: [
        bl.guide_type && bl.guide_type,
        'bio-link',
      ].filter(Boolean),
      workflow_steps: {},
      created_at: bl.created_at,
      last_contacted: null,
      next_follow_up: null,
    }))
  }, [biolinkLeads])

  return (
    <ProspectingList
      source="bio_link"
      title="Bio Link Leads"
      subtitle="Leads captured from your bio link page — guides, forms, opt-ins"
      extraRows={extraRows}
    />
  )
}

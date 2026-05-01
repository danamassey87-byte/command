import { useState, useEffect, useMemo } from 'react'
import * as DB from '../../lib/supabase.js'
import ProspectingList from './ProspectingList'

export default function OHLeads() {
  const [signIns, setSignIns] = useState([])

  useEffect(() => {
    DB.getAllOHSignIns().then(data => setSignIns(data ?? [])).catch(() => {})
  }, [])

  // Normalize oh_sign_ins into prospect-shaped rows so ProspectingList can render them
  const extraRows = useMemo(() => {
    return signIns.map(si => ({
      id: `oh_${si.id}`,
      _isSignIn: true,
      _contact_id: si.contact_id || null,
      name: si.name || 'Unknown',
      phone: si.phone || null,
      email: si.email || null,
      source: 'open_house',
      status: si.follow_up_status || 'new',
      address: si.open_house?.property?.address || null,
      city: si.open_house?.property?.city || null,
      zip: null,
      mls_id: null,
      list_price: null,
      notes: [
        si.buyer_stage && `Stage: ${si.buyer_stage}`,
        si.agent_name && `Agent: ${si.agent_name}`,
        si.lender_name && `Lender: ${si.lender_name}`,
        si.comments,
      ].filter(Boolean).join(' · ') || null,
      labels: si.open_house?.date ? [`OH ${new Date(si.open_house.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`] : [],
      workflow_steps: {},
      created_at: si.created_at,
      last_contacted: null,
      next_follow_up: null,
    }))
  }, [signIns])

  return (
    <ProspectingList
      source="open_house"
      title="Open House Leads"
      subtitle="Sign-in contacts from open houses — not yet clients"
      extraRows={extraRows}
    />
  )
}

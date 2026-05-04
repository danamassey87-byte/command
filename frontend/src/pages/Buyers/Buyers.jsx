import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, SectionHeader, TabBar, DataTable, Card, SlidePanel, Input, Select, Textarea, AddressLink } from '../../components/ui/index.jsx'
import LeadSourcePicker from '../../components/ui/LeadSourcePicker.jsx'
import { TagPicker, TagBadge } from '../../components/ui/TagPicker.jsx'
import RelatedPeopleSection, { cleanRelatedPeople, RelatedPeopleDisplay } from '../../components/related-people/RelatedPeopleSection.jsx'
import { useBuyers, useTransactions, useShowingSessionsForContact, useContactTags, useNotesForContact, useVendors, useProperties, useExpensesForContact } from '../../lib/hooks.js'
import { useNotesContext } from '../../lib/NotesContext.jsx'
import FavoriteButton from '../../components/layout/FavoriteButton.jsx'
import InteractionsTimeline from '../../components/InteractionsTimeline.jsx'
import SocialProfilesPanel from '../../components/SocialProfilesPanel.jsx'
import LifeEventsPanel from '../../components/LifeEventsPanel.jsx'
import FamilyLinksPanel from '../../components/FamilyLinksPanel.jsx'
import IntakeFormTracker from '../../components/IntakeFormTracker.jsx'
import * as DB from '../../lib/supabase.js'
import supabase from '../../lib/supabase.js'
import { pauseContactWithAutoEnroll } from '../../lib/onHoldFollowUps.js'
import SendEmailModal from '../../components/email/SendEmailModal'
import './Buyers.css'

// Map Supabase contact row → internal buyer shape
function mapClient(c) {
  return {
    id:                  c.id,
    name:                c.name ?? '—',
    phone:               c.phone ?? '',
    email:               c.email ?? '',
    source:              c.source ?? 'Client',
    stage:               c.stage  ?? 'New Lead',
    preApproved:         !!c.pre_approval_amount,
    pre_approval_amount: c.pre_approval_amount ?? '',
    lender_name:         c.lender_name ?? '',
    repAgreement:        !!c.bba_signed,
    budget:              c.budget_min ? `$${Number(c.budget_min).toLocaleString()}${c.budget_max ? `–$${Number(c.budget_max).toLocaleString()}` : '+'}` : '—',
    budget_min:          c.budget_min ?? '',
    budget_max:          c.budget_max ?? '',
    areas:               c.areas ?? [],
    beds:                c.beds_min ?? 0,
    baths:               c.baths_min ?? 0,
    bba_signed:          c.bba_signed ?? false,
    bba_signed_date:     c.bba_signed_date ?? null,
    bba_expiration_date: c.bba_expiration_date ?? null,
    notes:               c.notes ?? '',
    type:                c.type ?? 'buyer',
    related_people:      Array.isArray(c.related_people) ? c.related_people : [],
    showings:            [],
    created_at:          c.created_at,
    // Command Phase 1 fields
    tier:                c.tier ?? 'warm',
    first_name:          c.first_name ?? '',
    last_name:           c.last_name ?? '',
    lofty_id:            c.lofty_id ?? null,
    looking_for:         c.looking_for ?? null,
    voice_notes:         c.voice_notes ?? '',
    timezone:            c.timezone ?? 'America/Phoenix',
    do_not_contact:      c.do_not_contact ?? false,
  }
}


const stages = ['New Lead', 'Pre-Approval', 'Active Search', 'Showing', 'Under Contract', 'Closed', 'On Hold', 'Inactive']
const sources = ['Referral', 'Open House', 'CertiLead', 'Expired Listing', 'Cannonball', 'Zillow', 'Realtor.com', 'Instagram', 'Facebook', 'Door Knocking', 'Sign Call', 'Sphere of Influence', 'Past Client', 'Website', 'Client', 'Other']

const stageVariant = {
  'New Lead': 'default', 'Pre-Approval': 'warning', 'Active Search': 'info',
  'Showing': 'info', 'Under Contract': 'accent', 'Closed': 'success', 'On Hold': 'warning', 'Inactive': 'danger',
}

const showingStatusVariant = { 'scheduled': 'info', 'toured': 'default', 'offer-accepted': 'success' }

// ─── Lender Picker (pulls from Vendors rolodex) ────────────────────────────────
function LenderPicker({ value, onChange }) {
  const { data: lenders, refetch } = useVendors({ roleGroup: 'representation' })
  const lenderVendors = useMemo(() =>
    (lenders ?? []).filter(v => v.role === 'lender' && (v.status ?? 'active') !== 'do_not_use'),
    [lenders]
  )
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCompany, setNewCompany] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const handleAddLender = async () => {
    if (!newName.trim()) return
    setAddSaving(true)
    try {
      await DB.createVendor({
        role: 'lender',
        role_group: 'representation',
        name: newName.trim(),
        company: newCompany.trim() || null,
        phone: newPhone.trim() || null,
        email: newEmail.trim() || null,
        status: 'active',
      })
      onChange(newName.trim() + (newCompany.trim() ? ` – ${newCompany.trim()}` : ''))
      await refetch()
      setShowAdd(false)
      setNewName(''); setNewCompany(''); setNewPhone(''); setNewEmail('')
    } catch (e) {
      console.error(e)
    } finally {
      setAddSaving(false)
    }
  }

  return (
    <div className="lender-picker">
      <label className="lender-picker__label">Lender / Loan Officer</label>
      <select
        className="lender-picker__select"
        value={lenderVendors.some(l => (l.name + (l.company ? ` – ${l.company}` : '')) === value) ? value : '__custom__'}
        onChange={e => {
          if (e.target.value === '__add__') { setShowAdd(true) }
          else if (e.target.value === '__custom__') { /* keep current */ }
          else onChange(e.target.value)
        }}
      >
        <option value="">— Select lender —</option>
        {lenderVendors.map(l => {
          const display = l.name + (l.company ? ` – ${l.company}` : '')
          return <option key={l.id} value={display}>{display}{l.preferred ? ' ★' : ''}</option>
        })}
        {value && !lenderVendors.some(l => (l.name + (l.company ? ` – ${l.company}` : '')) === value) && (
          <option value="__custom__">{value}</option>
        )}
        <option value="__add__">+ Add new lender to rolodex…</option>
      </select>
      <input
        type="text"
        className="lender-picker__input"
        placeholder="Or type lender name manually"
        value={value}
        onChange={e => onChange(e.target.value)}
      />

      {showAdd && (
        <div className="lender-picker__add-form">
          <p className="panel-section-label">Add Lender to Vendors</p>
          <input className="lender-picker__field" placeholder="Name *" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="lender-picker__field" placeholder="Company" value={newCompany} onChange={e => setNewCompany(e.target.value)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="lender-picker__field" placeholder="Phone" value={newPhone} onChange={e => setNewPhone(e.target.value)} style={{ flex: 1 }} />
            <input className="lender-picker__field" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button className="lender-picker__btn lender-picker__btn--save" disabled={addSaving || !newName.trim()} onClick={handleAddLender}>
              {addSaving ? 'Saving…' : 'Add & Select'}
            </button>
            <button className="lender-picker__btn lender-picker__btn--cancel" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Buyer Edit Form ───────────────────────────────────────────────────────────
function BuyerForm({ buyer, onSave, onDelete, onPutOnHold, onClose, saving, deleting }) {
  const isNew = !buyer?.id || typeof buyer.id === 'number'
  const { data: tagData } = useContactTags(buyer?.id)
  const [contactTags, setContactTags] = useState([])
  useEffect(() => {
    if (tagData) setContactTags((tagData ?? []).map(ct => ct.tag).filter(Boolean))
  }, [tagData])
  const [draft, setDraft] = useState({
    name:                buyer?.name ?? '',
    phone:               buyer?.phone ?? '',
    email:               buyer?.email ?? '',
    type:                buyer?.type ?? 'buyer',
    source:              buyer?.source ?? 'Client',
    stage:               buyer?.stage ?? 'New Lead',
    budget_min:          buyer?.budget_min ?? '',
    budget_max:          buyer?.budget_max ?? '',
    areas:               Array.isArray(buyer?.areas) ? buyer.areas.join(', ') : (buyer?.areas ?? ''),
    beds_min:            buyer?.beds ?? buyer?.beds_min ?? '',
    baths_min:           buyer?.baths ?? buyer?.baths_min ?? '',
    pre_approval_amount: buyer?.pre_approval_amount ?? '',
    lender_name:         buyer?.lender_name ?? '',
    bba_signed:          buyer?.bba_signed ?? buyer?.repAgreement ?? false,
    bba_signed_date:     buyer?.bba_signed_date ?? '',
    bba_expiration_date: buyer?.bba_expiration_date ?? '',
    notes:               buyer?.notes ?? '',
    related_people:      Array.isArray(buyer?.related_people) ? buyer.related_people : [],
    // Command fields
    tier:                buyer?.tier ?? 'warm',
    do_not_contact:      buyer?.do_not_contact ?? false,
    timezone:            buyer?.timezone ?? 'America/Phoenix',
    voice_notes:         buyer?.voice_notes ?? '',
  })
  const set = (k, v) => setDraft(p => ({ ...p, [k]: v }))

  const handleSave = () => {
    onSave({
      name:                draft.name.trim(),
      phone:               draft.phone.trim() || null,
      email:               draft.email.trim() || null,
      source:              draft.source || null,
      stage:               draft.stage,
      budget_min:          draft.budget_min !== '' ? Number(draft.budget_min) : null,
      budget_max:          draft.budget_max !== '' ? Number(draft.budget_max) : null,
      areas:               draft.areas ? draft.areas.split(',').map(a => a.trim()).filter(Boolean) : [],
      beds_min:            draft.beds_min !== '' ? Number(draft.beds_min) : null,
      baths_min:           draft.baths_min !== '' ? Number(draft.baths_min) : null,
      pre_approval_amount: draft.pre_approval_amount !== '' ? Number(draft.pre_approval_amount) : null,
      lender_name:         draft.lender_name.trim() || null,
      bba_signed:          draft.bba_signed,
      bba_signed_date:     draft.bba_signed && draft.bba_signed_date ? draft.bba_signed_date : null,
      bba_expiration_date: draft.bba_signed && draft.bba_expiration_date ? draft.bba_expiration_date : null,
      notes:               draft.notes.trim() || null,
      type:                draft.type,
      related_people:      cleanRelatedPeople(draft.related_people),
      tier:                draft.tier,
      do_not_contact:      draft.do_not_contact,
      timezone:            draft.timezone || 'America/Phoenix',
      voice_notes:         draft.voice_notes?.trim() || null,
    })
  }

  return (
    <>
      <div className="panel-section">
        <Input label="Full Name *" value={draft.name} onChange={e => set('name', e.target.value)} placeholder="First & Last Name" />
        <div className="panel-row">
          <Input label="Phone" value={draft.phone} onChange={e => set('phone', e.target.value)} placeholder="(480) 555-0000" />
          <Input label="Email" value={draft.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
        </div>
        <div className="panel-row">
          <Select label="Client Type" value={draft.type} onChange={e => set('type', e.target.value)}>
            <option value="buyer">Buyer</option>
            <option value="seller">Seller</option>
            <option value="both">Buyer & Seller</option>
          </Select>
          <LeadSourcePicker label="Source" value={draft.source} onChange={v => set('source', v)} />
        </div>
        <div className="panel-row">
          <Select label="Stage" value={draft.stage} onChange={e => set('stage', e.target.value)}>
            {stages.map(s => <option key={s}>{s}</option>)}
          </Select>
          <Select label="Tier" value={draft.tier} onChange={e => set('tier', e.target.value)}>
            <option value="hot">Hot</option>
            <option value="warm">Warm</option>
            <option value="nurture">Nurture</option>
            <option value="cold">Cold</option>
            <option value="past">Past</option>
          </Select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--brown-warm, #5A4136)', cursor: 'pointer', padding: '4px 0' }}>
          <input type="checkbox" checked={draft.do_not_contact} onChange={e => set('do_not_contact', e.target.checked)} />
          Do not contact (blocks all sends)
        </label>
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Requirements</p>
        <div className="panel-row">
          <Input label="Budget Min ($)" type="number" value={draft.budget_min} onChange={e => set('budget_min', e.target.value)} placeholder="450000" />
          <Input label="Budget Max ($)" type="number" value={draft.budget_max} onChange={e => set('budget_max', e.target.value)} placeholder="500000" />
        </div>
        <div className="panel-row">
          <Input label="Pre-Approval Amount ($)" type="number" value={draft.pre_approval_amount} onChange={e => set('pre_approval_amount', e.target.value)} placeholder="500000" />
          <LenderPicker value={draft.lender_name} onChange={v => set('lender_name', v)} />
        </div>
        <div className="panel-row">
          <Input label="Min Beds" type="number" value={draft.beds_min} onChange={e => set('beds_min', e.target.value)} min="0" />
          <Input label="Min Baths" type="number" value={draft.baths_min} onChange={e => set('baths_min', e.target.value)} min="0" />
        </div>
        <Input label="Target Areas (comma-separated)" value={draft.areas} onChange={e => set('areas', e.target.value)} placeholder="Gilbert, Chandler, Mesa" />
      </div>

      <hr className="panel-divider" />
      <div className="panel-section">
        <p className="panel-section-label">Compliance</p>
        <label className="buyer-checkbox-label">
          <input type="checkbox" checked={draft.bba_signed} onChange={e => set('bba_signed', e.target.checked)} />
          BBA / Buyer Representation Agreement Signed
        </label>
        {draft.bba_signed && (
          <div className="panel-row" style={{ marginTop: 10 }}>
            <Input label="Signed Date" type="date" value={draft.bba_signed_date} onChange={e => set('bba_signed_date', e.target.value)} />
            <Input label="Expiration Date" type="date" value={draft.bba_expiration_date} onChange={e => set('bba_expiration_date', e.target.value)} />
          </div>
        )}
      </div>

      <hr className="panel-divider" />
      <RelatedPeopleSection
        value={draft.related_people}
        onChange={v => set('related_people', v)}
      />

      <hr className="panel-divider" />
      <Textarea label="Notes" rows={3} value={draft.notes} onChange={e => set('notes', e.target.value)} placeholder="Key requirements, timeline, financing notes…" />
      <Textarea label="Voice Notes" rows={2} value={draft.voice_notes} onChange={e => set('voice_notes', e.target.value)} placeholder="Quick voice memo transcription, observations..." />

      {!isNew && buyer?.id && (
        <>
          <hr className="panel-divider" />
          <div className="panel-section">
            <p className="panel-section-label">Tags</p>
            <TagPicker
              contactId={buyer.id}
              assignedTags={contactTags}
              onTagsChange={setContactTags}
            />
          </div>
        </>
      )}

      {buyer?.created_at && (
        <p className="panel-timestamp">Added {new Date(buyer.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
      )}

      <div className="panel-footer">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || !draft.name.trim()}>
          {saving ? 'Saving…' : isNew ? 'Add Buyer' : 'Save Changes'}
        </Button>
        {!isNew && (
          <>
            <Button variant="warning" size="sm" onClick={onPutOnHold} disabled={saving}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></svg>}
            >Put on Hold</Button>
            <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
              {deleting ? 'Removing…' : 'Delete'}
            </Button>
          </>
        )}
      </div>
    </>
  )
}

// ─── Email Engagement for Contact ─────────────────────────────────────────────
function EmailEngagement({ contactId }) {
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!contactId) return
    async function load() {
      try {
        const { data: enrollments } = await supabase.from('campaign_enrollments').select('id').eq('contact_id', contactId)
        if (!enrollments?.length) { setLoading(false); return }
        const eids = enrollments.map(e => e.id)
        const { data: history } = await supabase.from('campaign_step_history').select('id, subject, sent_at, opened_at, clicked_at, replied_at, bounced_at, delivery_status')
          .in('enrollment_id', eids).order('sent_at', { ascending: false }).limit(10)
        setEmails(history ?? [])
      } catch { /* silent */ }
      finally { setLoading(false) }
    }
    load()
  }, [contactId])

  if (loading) return <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Loading...</p>
  if (emails.length === 0) return <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>No campaign emails sent yet.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {emails.map(e => (
        <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem' }}>
          <span style={{ minWidth: 70, color: 'var(--color-text-muted)' }}>
            {e.sent_at ? new Date(e.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
          </span>
          <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject || '(no subject)'}</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {e.opened_at && <Badge variant="success" size="sm">Opened</Badge>}
            {e.clicked_at && <Badge variant="accent" size="sm">Clicked</Badge>}
            {(e.replied_at) && <Badge variant="success" size="sm">Replied</Badge>}
            {e.bounced_at && <Badge variant="danger" size="sm">Bounced</Badge>}
            {!e.opened_at && !e.bounced_at && <Badge variant="default" size="sm">Sent</Badge>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Buyer Detail ─────────────────────────────────────────────────────────────
function BuyerDriveButton({ buyer }) {
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState(buyer.drive_folder_url || null)
  const handleClick = async () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
      return
    }
    setBusy(true)
    try {
      const result = await DB.createDriveFolder({ kind: 'contact', id: buyer.id, name: buyer.name || 'Buyer' })
      if (result?.folder_url) {
        setUrl(result.folder_url)
        window.open(result.folder_url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      alert(err.message || 'Could not create Drive folder')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={busy} title={url ? 'Open Drive folder' : 'Create Drive folder for this client'}>
      {busy ? 'Creating…' : '📁 Drive'}
    </Button>
  )
}

function BuyerDetail({ buyer, onBack, onEdit }) {
  const navigate = useNavigate()
  const { data: allTransactions } = useTransactions()
  const { data: sessionsData, refetch: refetchSessions } = useShowingSessionsForContact(buyer.id)
  const { data: linkedNotes, refetch: refetchNotes } = useNotesForContact(buyer.id)
  const { openNote, createAndOpen } = useNotesContext()
  const { data: propertiesData } = useProperties()
  const { data: buyerExpenses } = useExpensesForContact(buyer.id)
  const sessions = sessionsData ?? []

  // OH attendance for this buyer (from oh_sign_ins linked by contact_id)
  const [buyerOHs, setBuyerOHs] = useState([])
  useEffect(() => {
    if (!buyer.id) return
    supabase.from('oh_sign_ins')
      .select('*, open_house:open_houses(id, date, property:properties(id, address, city))')
      .eq('contact_id', buyer.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setBuyerOHs(data ?? []))
  }, [buyer.id])

  // Expense summary for this buyer
  const expenseTotal = (buyerExpenses ?? []).reduce((s, e) => s + Number(e.amount || 0), 0)

  // Inline showing scheduler state
  const [showScheduler, setShowScheduler] = useState(false)
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split('T')[0])
  const [schedPropSearch, setSchedPropSearch] = useState('')
  const [schedProps, setSchedProps] = useState([])
  const [schedSaving, setSchedSaving] = useState(false)

  const schedFilteredProps = useMemo(() => {
    if (!schedPropSearch) return (propertiesData ?? []).slice(0, 6)
    const q = schedPropSearch.toLowerCase()
    return (propertiesData ?? []).filter(p => (p.address ?? '').toLowerCase().includes(q) || (p.city ?? '').toLowerCase().includes(q)).slice(0, 6)
  }, [propertiesData, schedPropSearch])

  const handleQuickSchedule = async () => {
    if (!schedProps.length || !schedDate) return
    setSchedSaving(true)
    try {
      const session = await DB.createShowingSession({ contact_id: buyer.id, date: schedDate })
      for (const prop of schedProps) {
        await DB.createShowing({ session_id: session.id, property_id: prop.id, contact_id: buyer.id, status: 'scheduled' })
      }
      setShowScheduler(false)
      setSchedProps([])
      setSchedPropSearch('')
      refetchSessions()
    } catch (e) { alert(e.message) }
    finally { setSchedSaving(false) }
  }

  // Find deals linked to this buyer
  const buyerDeals = useMemo(() =>
    (allTransactions ?? []).filter(t => t.contact_id === buyer.id)
  , [allTransactions, buyer.id])

  const [editingShowingId, setEditingShowingId] = useState(null)
  const [showingDraft, setShowingDraft]         = useState({})
  const [savingShowing, setSavingShowing]       = useState(false)

  const openShowingEdit = (showing) => {
    setEditingShowingId(showing.id)
    setShowingDraft({
      prep_notes:         showing.prep_notes        ?? '',
      buyer_feedback:     showing.buyer_feedback     ?? '',
      feedback_price:     showing.feedback_price     ?? '',
      feedback_condition: showing.feedback_condition ?? '',
      would_offer:        showing.would_offer        ?? false,
      follow_up_sent:     showing.follow_up_sent     ?? false,
      interest_level:     showing.interest_level     ?? '',
    })
  }

  const saveShowingEdit = async (showingId) => {
    setSavingShowing(true)
    try {
      await DB.updateShowing(showingId, {
        prep_notes:         showingDraft.prep_notes.trim()        || null,
        buyer_feedback:     showingDraft.buyer_feedback.trim()    || null,
        feedback_price:     showingDraft.feedback_price           || null,
        feedback_condition: showingDraft.feedback_condition       || null,
        would_offer:        showingDraft.would_offer,
        follow_up_sent:     showingDraft.follow_up_sent,
        interest_level:     showingDraft.interest_level           || null,
      })
      await refetchSessions()
      setEditingShowingId(null)
    } catch { /* silent */ } finally { setSavingShowing(false) }
  }

  const setSD = (k, v) => setShowingDraft(p => ({ ...p, [k]: v }))

  const allShowings = sessions.flatMap(s => (s.showings ?? []).map(sh => ({ ...sh, sessionDate: s.date })))
  const interestVariant = { high:'success', medium:'warning', low:'danger' }
  const priceLabel = { too_high:'Too High', fair:'Fair', too_low:'Good Value' }
  const priceVariant = { too_high:'danger', fair:'success', too_low:'info' }

  return (
    <div className="buyer-detail">
      <div className="buyer-detail__nav">
        <button className="oh-detail__back" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Buyers
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          <Button variant="ghost" size="sm" onClick={() => setShowScheduler(!showScheduler)}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
          >{showScheduler ? 'Cancel' : 'Schedule Showing'}</Button>
          <BuyerDriveButton buyer={buyer} />
          <Button variant="ghost" size="sm" onClick={onEdit}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
          >Edit Buyer</Button>
        </div>
      </div>

      <div className="buyer-detail__header">
        <div>
          <h2 className="buyer-detail__name">{buyer.name}</h2>
          <p className="buyer-detail__contact">{buyer.phone} &bull; {buyer.email}</p>
          <div className="buyer-detail__tags">
            <Badge variant={stageVariant[buyer.stage]}>{buyer.stage}</Badge>
            {buyer.tier && buyer.tier !== 'warm' && (
              <Badge variant={buyer.tier === 'hot' ? 'danger' : buyer.tier === 'cold' ? 'default' : buyer.tier === 'past' ? 'default' : 'warning'} size="sm">
                {buyer.tier}
              </Badge>
            )}
            {buyer.preApproved && <Badge variant="success" size="sm">Pre-Approved ✓</Badge>}
            {buyer.repAgreement && <Badge variant="accent" size="sm">BBA Signed ✓</Badge>}
            {buyer.do_not_contact && <Badge variant="danger" size="sm">Do Not Contact</Badge>}
          </div>
        </div>
        <div className="buyer-detail__quick-stats">
          <div className="buyer-detail__stat">
            <p className="buyer-detail__stat-value">{buyer.budget}</p>
            <p className="buyer-detail__stat-label">Budget</p>
          </div>
          <div className="buyer-detail__stat">
            <p className="buyer-detail__stat-value">{buyer.pre_approval_amount ? `$${Number(buyer.pre_approval_amount).toLocaleString()}` : '—'}</p>
            <p className="buyer-detail__stat-label">Pre-Approval</p>
            {buyer.lender_name && <p className="buyer-detail__stat-sub">{buyer.lender_name}</p>}
          </div>
          <div className="buyer-detail__stat">
            <p className="buyer-detail__stat-value">{buyer.beds}bd / {buyer.baths}ba</p>
            <p className="buyer-detail__stat-label">Requirements</p>
          </div>
          <div className="buyer-detail__stat">
            <p className="buyer-detail__stat-value">{(buyer.areas ?? []).join(', ') || '—'}</p>
            <p className="buyer-detail__stat-label">Target Areas</p>
          </div>
          <div className="buyer-detail__stat">
            <p className="buyer-detail__stat-value">{allShowings.length}</p>
            <p className="buyer-detail__stat-label">Showings</p>
          </div>
          {expenseTotal > 0 && (
            <div className="buyer-detail__stat">
              <p className="buyer-detail__stat-value">${Math.round(expenseTotal).toLocaleString()}</p>
              <p className="buyer-detail__stat-label">Spend</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Inline Showing Scheduler ── */}
      {showScheduler && (
        <Card style={{ padding: 16, marginBottom: 12, border: '2px solid var(--brown-mid)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brown-dark)', margin: '0 0 10px' }}>Schedule Showing for {buyer.name}</h4>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <label style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 3 }}>Date</span>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
            </label>
            <label style={{ flex: 2 }}>
              <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brown-dark)', marginBottom: 3 }}>Search Properties</span>
              <input value={schedPropSearch} onChange={e => setSchedPropSearch(e.target.value)} placeholder="Type address..." style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }} />
            </label>
          </div>
          {schedPropSearch && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 140, overflowY: 'auto', marginBottom: 8, border: '1px solid var(--color-border)', borderRadius: 6 }}>
              {schedFilteredProps.map(p => (
                <button key={p.id} type="button"
                  onClick={() => { if (!schedProps.find(sp => sp.id === p.id)) setSchedProps(prev => [...prev, p]); setSchedPropSearch('') }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', fontSize: '0.82rem', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--color-bg-hover, #f5f0ea)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >
                  <strong>{p.address}</strong> <span style={{ color: 'var(--color-text-muted)' }}>{p.city}{p.price ? ` · $${Number(p.price).toLocaleString()}` : ''}</span>
                </button>
              ))}
              {schedFilteredProps.length === 0 && <p style={{ padding: 10, fontSize: '0.78rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>No matches</p>}
            </div>
          )}
          {schedProps.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              {schedProps.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{p.address}{p.city ? `, ${p.city}` : ''}</span>
                  <button onClick={() => setSchedProps(prev => prev.filter(sp => sp.id !== p.id))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-danger)', fontSize: '0.9rem' }}>×</button>
                </div>
              ))}
            </div>
          )}
          <Button size="sm" onClick={handleQuickSchedule} disabled={schedSaving || !schedProps.length || !schedDate}>
            {schedSaving ? 'Scheduling...' : `Schedule ${schedProps.length} Showing${schedProps.length > 1 ? 's' : ''}`}
          </Button>
        </Card>
      )}

      {/* ── Active Deals ── */}
      {buyerDeals.length > 0 && (
        <div className="buyer-detail__showings-section">
          <div className="buyer-detail__showings-header">
            <h3>Deals ({buyerDeals.length})</h3>
            <Button variant="ghost" size="sm" onClick={() => navigate('/pipeline')}>View Pipeline</Button>
          </div>
          {buyerDeals.map(deal => {
            const stg = (deal.status ?? '').replace(/_/g, ' ')
            const isClosed = stg.includes('closed')
            const isDeclined = stg.includes('declined')
            return (
              <Card key={deal.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--brown-dark)' }}>
                      {deal.property?.address ?? 'No address'}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {deal.property?.city ?? ''}{deal.property?.price ? ` · $${Number(deal.property.price).toLocaleString()}` : ''}
                    </p>
                    {deal.closing_date && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                        {isClosed ? 'Closed' : 'Target close'}: {new Date(deal.closing_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <Badge variant={isClosed ? 'success' : isDeclined ? 'danger' : 'accent'} size="sm" style={{ textTransform: 'capitalize' }}>
                    {stg || 'Active'}
                  </Badge>
                </div>
                {deal.lender && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>Lender: {deal.lender}</p>}
                {deal.title_company && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Title: {deal.title_company}</p>}
              </Card>
            )
          })}
        </div>
      )}

      {Array.isArray(buyer.related_people) && buyer.related_people.length > 0 && (
        <Card>
          <RelatedPeopleDisplay value={buyer.related_people} title="Other Parties on This Transaction" />
        </Card>
      )}

      {buyer.notes && (
        <Card className="buyer-detail__notes">
          <p className="oh-detail__notes-label">Notes</p>
          <p style={{ fontSize:'0.85rem', color:'var(--brown-dark)' }}>{buyer.notes}</p>
        </Card>
      )}

      {buyer.created_at && (
        <p style={{ fontSize:'0.72rem', color:'var(--color-text-muted)', marginTop:-4 }}>
          Added {new Date(buyer.created_at).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
        </p>
      )}

      {/* ── Linked Notes ── */}
      <div className="buyer-detail__showings-section">
        <div className="buyer-detail__showings-header">
          <h3>Notes ({(linkedNotes ?? []).length})</h3>
          <Button variant="ghost" size="sm" onClick={async () => { await createAndOpen({ contact_id: buyer.id }); refetchNotes() }}>+ Add Note</Button>
        </div>
        {(linkedNotes ?? []).length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', padding: '8px 0' }}>No notes linked to this client yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(linkedNotes ?? []).map(n => (
              <div key={n.id} onClick={() => openNote(n)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--cream)', borderRadius: 'var(--radius-md)', cursor: 'pointer', borderLeft: n.color ? `3px solid ${n.color}` : '3px solid var(--brown-mid)' }}>
                <div>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{n.title || 'Untitled'}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{(n.body ?? '').slice(0, 80)}{(n.body ?? '').length > 80 ? '...' : ''}</p>
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <FavoriteButton type="note" id={n.id} label={n.title || 'Untitled'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Email Engagement ── */}
      {buyer.email && (
        <div className="buyer-detail__showings-section">
          <div className="buyer-detail__showings-header">
            <h3>Email Activity</h3>
            <a href="/email/reporting" style={{ fontSize: '0.78rem', color: 'var(--brown-mid)' }}>View All Reporting</a>
          </div>
          <EmailEngagement contactId={buyer.id} />
        </div>
      )}

      {/* ── Intake Forms ── */}
      <IntakeFormTracker contactId={buyer.id} contactEmail={buyer.email} contactName={buyer.name} />

      {/* ── Social Profiles ── */}
      <SocialProfilesPanel contactId={buyer.id} />

      {/* ── Family & Relationships ── */}
      <FamilyLinksPanel contactId={buyer.id} />

      {/* ── Life Events ── */}
      <LifeEventsPanel contactId={buyer.id} />

      {/* ── Activity Timeline ── */}
      <InteractionsTimeline contactId={buyer.id} />

      {/* ── Open Houses Attended ── */}
      {buyerOHs.length > 0 && (
        <div className="buyer-detail__showings-section">
          <div className="buyer-detail__showings-header">
            <h3>Open Houses Attended ({buyerOHs.length})</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {buyerOHs.map(si => {
              const dateStr = si.open_house?.date ? new Date(si.open_house.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
              const interestLabel = { hot: 'Very interested', warm: 'Maybe', cool: 'Not for me', just_browsing: 'Just browsing' }[si.interest_level]
              const priceLabel = { too_high: 'Too high', fair: 'About right', great_deal: 'Great deal' }[si.price_perception]
              const offerLabel = { yes: 'Yes', maybe: 'Maybe', no: 'No' }[si.would_offer]
              const hasFeedback = si.interest_level || si.price_perception || si.would_offer || si.liked || si.concerns || si.comments
              return (
                <div key={si.id} style={{ padding: '10px 12px', background: 'var(--cream-3, #F6F4EE)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hasFeedback ? 6 : 0 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                      {si.open_house?.property?.address || 'Open House'}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{dateStr}</span>
                  </div>
                  {hasFeedback && (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: si.liked || si.concerns || si.comments ? 6 : 0 }}>
                        {interestLabel && <Badge variant={si.interest_level === 'hot' ? 'success' : si.interest_level === 'warm' ? 'info' : 'default'} size="sm">{interestLabel}</Badge>}
                        {priceLabel && <Badge variant="default" size="sm">Price: {priceLabel}</Badge>}
                        {offerLabel && <Badge variant={si.would_offer === 'yes' ? 'success' : 'default'} size="sm">Offer: {offerLabel}</Badge>}
                      </div>
                      {si.liked    && <p style={{ fontSize: '0.78rem', color: 'var(--brown-warm)', marginBottom: 2 }}><strong>Liked:</strong> {si.liked}</p>}
                      {si.concerns && <p style={{ fontSize: '0.78rem', color: 'var(--brown-warm)', marginBottom: 2 }}><strong>Concerns:</strong> {si.concerns}</p>}
                      {si.comments && <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>"{si.comments}"</p>}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Showings ── */}
      <div className="buyer-detail__showings-section">
        <div className="buyer-detail__showings-header">
          <h3>Properties Shown ({allShowings.length})</h3>
        </div>

        {/* Property visit summary */}
        {allShowings.length > 0 && (() => {
          const propVisits = {}
          allShowings.forEach(sh => {
            const addr = sh.property?.address || 'Unknown'
            const pid = sh.property?.id || addr
            if (!propVisits[pid]) propVisits[pid] = { address: addr, city: sh.property?.city, price: sh.property?.price, visits: 0, lastInterest: null }
            propVisits[pid].visits++
            if (sh.interest_level) propVisits[pid].lastInterest = sh.interest_level
          })
          const props = Object.values(propVisits).sort((a, b) => b.visits - a.visits)
          return (
            <div style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--brown-dark)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {props.length} Properties · {allShowings.length} Total Visits
              </p>
              {props.map(p => (
                <div key={p.address} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: '0.82rem' }}>
                  <span style={{ flex: 1, fontWeight: 500, color: 'var(--brown-dark)' }}>{p.address}{p.city ? `, ${p.city}` : ''}</span>
                  {p.price && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>${Number(p.price).toLocaleString()}</span>}
                  <Badge variant="default" size="sm">{p.visits} visit{p.visits > 1 ? 's' : ''}</Badge>
                  {p.lastInterest && <Badge variant={interestVariant[p.lastInterest]} size="sm">{p.lastInterest}</Badge>}
                </div>
              ))}
            </div>
          )
        })()}

        {allShowings.length === 0 ? (
          <div className="buyer-detail__showings-empty">
            <p>No properties shown yet. Showing sessions for this buyer will appear here once logged via Showing Sessions.</p>
          </div>
        ) : (
          <div className="showing-cards">
            {allShowings.map((sh) => {
              const isEditing = editingShowingId === sh.id
              return (
                <div key={sh.id} className={`showing-card showing-card--${sh.status ?? 'scheduled'}`}>
                  <div className="showing-card__body" style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div>
                        <AddressLink
                          address={sh.property?.address}
                          city={sh.property?.city}
                          className="showing-card__address"
                        >
                          {sh.property?.address ?? '—'}
                        </AddressLink>
                        <p className="showing-card__city">
                          {sh.property?.city ?? ''}
                          {sh.property?.price ? ` · $${Number(sh.property.price).toLocaleString()}` : ''}
                        </p>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                        {sh.interest_level && <Badge variant={interestVariant[sh.interest_level] ?? 'default'} size="sm">{sh.interest_level}</Badge>}
                        {sh.feedback_price && <Badge variant={priceVariant[sh.feedback_price] ?? 'default'} size="sm">{priceLabel[sh.feedback_price]}</Badge>}
                        {sh.would_offer && <Badge variant="accent" size="sm">Would Offer</Badge>}
                        {sh.follow_up_sent && <Badge variant="success" size="sm">Follow-up Sent</Badge>}
                      </div>
                    </div>

                    {!isEditing && (
                      <>
                        {sh.prep_notes && <p className="showing-card__feedback" style={{ marginTop:6 }}><strong>Prep:</strong> {sh.prep_notes}</p>}
                        {sh.buyer_feedback && <p className="showing-card__feedback"><strong>Feedback:</strong> {sh.buyer_feedback}</p>}
                        <button className="showing-edit-btn" onClick={() => openShowingEdit(sh)}>
                          {sh.buyer_feedback || sh.prep_notes ? 'Edit notes' : '+ Add prep & feedback'}
                        </button>
                      </>
                    )}

                    {isEditing && (
                      <div className="showing-edit-form">
                        <div className="showing-edit-grid">
                          <div>
                            <label className="showing-edit-label">Interest Level</label>
                            <select className="showing-edit-select" value={showingDraft.interest_level} onChange={e => setSD('interest_level', e.target.value)}>
                              <option value="">—</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                          <div>
                            <label className="showing-edit-label">Price Perception</label>
                            <select className="showing-edit-select" value={showingDraft.feedback_price} onChange={e => setSD('feedback_price', e.target.value)}>
                              <option value="">—</option>
                              <option value="too_high">Too High</option>
                              <option value="fair">Fair</option>
                              <option value="too_low">Good Value</option>
                            </select>
                          </div>
                        </div>
                        <textarea
                          className="showing-edit-textarea"
                          placeholder="Pre-showing prep notes (talking points, things to highlight)…"
                          rows={2}
                          value={showingDraft.prep_notes}
                          onChange={e => setSD('prep_notes', e.target.value)}
                        />
                        <textarea
                          className="showing-edit-textarea"
                          placeholder="Buyer reaction & feedback after the showing…"
                          rows={2}
                          value={showingDraft.buyer_feedback}
                          onChange={e => setSD('buyer_feedback', e.target.value)}
                        />
                        <div className="showing-edit-checks">
                          <label className="showing-edit-check-label">
                            <input type="checkbox" checked={showingDraft.would_offer} onChange={e => setSD('would_offer', e.target.checked)} />
                            Would make an offer
                          </label>
                          <label className="showing-edit-check-label">
                            <input type="checkbox" checked={showingDraft.follow_up_sent} onChange={e => setSD('follow_up_sent', e.target.checked)} />
                            Follow-up sent
                          </label>
                        </div>
                        <div style={{ display:'flex', gap:8 }}>
                          <Button size="sm" variant="primary" onClick={() => saveShowingEdit(sh.id)} disabled={savingShowing}>
                            {savingShowing ? 'Saving…' : 'Save'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingShowingId(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Buyers Page ─────────────────────────────────────────────────────────
export default function Buyers() {
  const { data: clientsData, loading, refetch } = useBuyers()
  const buyers = useMemo(() =>
    (clientsData ?? []).map(mapClient), [clientsData]
  )

  const [filter, setFilter]               = useState('all')
  const [selectedBuyer, setSelectedBuyer] = useState(null)
  const [panelOpen, setPanelOpen]         = useState(false)
  const [editingBuyer, setEditingBuyer]   = useState(null)
  const [saving, setSaving]               = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [error, setError]                 = useState(null)
  const [emailContact, setEmailContact]   = useState(null)

  const openCreate = () => { setEditingBuyer(null); setPanelOpen(true) }
  const openEdit   = (buyer) => { setEditingBuyer(buyer); setPanelOpen(true) }
  const closePanel = () => { setPanelOpen(false); setEditingBuyer(null); setError(null) }

  const handleSave = async (data) => {
    setSaving(true)
    setError(null)
    try {
      if (editingBuyer && typeof editingBuyer.id === 'string') {
        await DB.updateContact(editingBuyer.id, data)
        await DB.logActivity('contact_updated', `Updated buyer: ${data.name}`, { contactId: editingBuyer.id })
        // Ensure Slack channel if stage changed to active
        if (data.stage && ACTIVE_BUYER_STAGES.includes(data.stage)) {
          DB.ensureSlackChannel({ contactId: editingBuyer.id, contactType: 'buyer' }).catch(() => {})
        }
      } else {
        const result = await DB.createContact(data)
        await DB.logActivity('contact_created', `New buyer added: ${data.name}`, { contactId: result.id })
        // Ensure Slack channel if created with active stage
        if (data.stage && ACTIVE_BUYER_STAGES.includes(data.stage)) {
          DB.ensureSlackChannel({ contactId: result.id, contactType: 'buyer' }).catch(() => {})
        }
      }
      await refetch()
      closePanel()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingBuyer || typeof editingBuyer.id !== 'string') return
    if (!confirm(`Remove ${editingBuyer.name} from your buyers?`)) return
    setDeleting(true)
    try {
      await DB.logActivity('contact_deleted', `Removed buyer: ${editingBuyer.name}`, { contactId: editingBuyer.id })
      await DB.deleteContact(editingBuyer.id)
      await refetch()
      closePanel()
      if (selectedBuyer?.id === editingBuyer.id) setSelectedBuyer(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setDeleting(false)
    }
  }

  // ─── Put on Hold ──
  const [onHoldModal, setOnHoldModal] = useState(false)
  const [onHoldReason, setOnHoldReason] = useState('')
  const handlePutOnHold = () => {
    if (!editingBuyer || typeof editingBuyer.id !== 'string') return
    setOnHoldReason('')
    setOnHoldModal(true)
  }
  const confirmPutOnHold = async () => {
    try {
      const result = await pauseContactWithAutoEnroll(editingBuyer.id, onHoldReason.trim())
      const detail = `Put on hold: ${editingBuyer.name}${result.enrolled ? ' (auto-enrolled in nurture campaign)' : ''}`
      await DB.logActivity('contact_on_hold', detail, { contactId: editingBuyer.id, autoEnrolled: result.enrolled, campaignId: result.campaignId })
      await refetch()
      setOnHoldModal(false)
      closePanel()
    } catch (e) {
      setError(e.message)
    }
  }

  // Inline field update — saves a single field without opening the panel
  const [savingInline, setSavingInline] = useState({})
  const ACTIVE_BUYER_STAGES = ['Pre-Approval', 'Active Search', 'Showing', 'Under Contract']
  const inlineUpdate = async (id, field, value) => {
    setSavingInline(p => ({ ...p, [id + field]: true }))
    try {
      await DB.updateContact(id, { [field]: value })
      // Auto-create Slack channel when buyer enters active pipeline
      if (field === 'stage' && ACTIVE_BUYER_STAGES.includes(value)) {
        const buyer = buyers.find(b => b.id === id)
        if (buyer) {
          DB.ensureSlackChannel({
            contactId: id,
            contactType: 'buyer',
          }).catch(() => {})
        }
      }
      await refetch()
    } catch { /* silent */ } finally {
      setSavingInline(p => ({ ...p, [id + field]: false }))
    }
  }

  // Inline BBA date editing
  const [bbaEditId, setBbaEditId] = useState(null)
  const [bbaDraft, setBbaDraft]   = useState({ bba_signed_date: '', bba_expiration_date: '' })

  const openBbaEdit = (row, e) => {
    e.stopPropagation()
    const today = new Date().toISOString().slice(0, 10)
    const expiry = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)
    setBbaDraft({
      bba_signed_date:     row.bba_signed_date ?? today,
      bba_expiration_date: row.bba_expiration_date ?? expiry,
    })
    setBbaEditId(row.id)
  }

  const saveBba = async (id, signed) => {
    setSavingInline(p => ({ ...p, [id + 'bba_signed']: true }))
    try {
      await DB.updateContact(id, {
        bba_signed:          signed,
        bba_signed_date:     signed ? (bbaDraft.bba_signed_date || null) : null,
        bba_expiration_date: signed ? (bbaDraft.bba_expiration_date || null) : null,
      })
      await refetch()
      setBbaEditId(null)
    } catch { /* silent */ } finally {
      setSavingInline(p => ({ ...p, [id + 'bba_signed']: false }))
    }
  }

  if (loading && !buyers.length) return <div className="page-loading">Loading buyers…</div>

  if (selectedBuyer) {
    const buyer = buyers.find(b => b.id === selectedBuyer.id) ?? selectedBuyer
    return (
      <>
        <BuyerDetail
          buyer={buyer}
          onBack={() => setSelectedBuyer(null)}
          onEdit={() => openEdit(buyer)}
        />
        <SlidePanel
          open={panelOpen}
          onClose={closePanel}
          title={editingBuyer ? 'Edit Buyer' : 'Add Buyer'}
          subtitle={editingBuyer?.name}
          width={460}
        >
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
          <BuyerForm key={editingBuyer?.id || 'new'} buyer={editingBuyer} onSave={handleSave} onDelete={handleDelete} onPutOnHold={handlePutOnHold} onClose={closePanel} saving={saving} deleting={deleting} />
        </SlidePanel>
      </>
    )
  }

  const [tierFilter, setTierFilter] = useState('all')
  const filtered = buyers.filter(b => {
    if (filter !== 'all' && b.stage !== filter) return false
    if (tierFilter !== 'all' && b.tier !== tierFilter) return false
    return true
  })

  const columns = [
    {
      key: 'name', label: 'Buyer',
      render: (v, row) => (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            <a href={`/contact/${row.id}`} onClick={e => { e.stopPropagation() }} style={{ color: 'inherit', textDecoration: 'none' }}>{v}</a>
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{row.source}</p>
        </div>
      ),
    },
    { key: 'budget', label: 'Budget' },
    {
      key: 'pre_approval_amount', label: 'Pre-Approval',
      render: (v, row) => v ? (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--green-dark, #2d6a4f)' }}>${Number(v).toLocaleString()}</p>
          {row.lender_name && <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{row.lender_name}</p>}
        </div>
      ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>—</span>,
    },
    { key: 'areas', label: 'Target Areas', render: v => Array.isArray(v) ? v.join(', ') : v },
    {
      key: 'stage', label: 'Stage',
      render: (v, row) => (
        <select
          className={`buyer-inline-select buyer-inline-select--stage buyer-inline-select--${(v ?? '').toLowerCase().replace(/\s+/g, '-')}`}
          value={v ?? ''}
          disabled={!!savingInline[row.id + 'stage']}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); inlineUpdate(row.id, 'stage', e.target.value) }}
        >
          {stages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    {
      key: 'source', label: 'Source',
      render: (v, row) => (
        <select
          className="buyer-inline-select buyer-inline-select--source"
          value={v ?? ''}
          disabled={!!savingInline[row.id + 'source']}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); inlineUpdate(row.id, 'source', e.target.value) }}
        >
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    {
      key: 'tier', label: 'Tier',
      render: (v, row) => (
        <select
          className={`buyer-inline-select buyer-inline-select--tier buyer-inline-select--${v ?? 'warm'}`}
          value={v ?? 'warm'}
          disabled={!!savingInline[row.id + 'tier']}
          onClick={e => e.stopPropagation()}
          onChange={e => { e.stopPropagation(); inlineUpdate(row.id, 'tier', e.target.value) }}
          style={{
            color: v === 'hot' ? '#c0604a' : v === 'cold' ? 'var(--color-text-muted)' : v === 'past' ? 'var(--color-text-muted)' : 'var(--brown-warm)',
            fontWeight: v === 'hot' ? 700 : 400,
          }}
        >
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="nurture">Nurture</option>
          <option value="cold">Cold</option>
          <option value="past">Past</option>
        </select>
      ),
    },
    {
      key: 'repAgreement', label: 'BBA',
      render: (v, row) => {
        const isSaving = !!savingInline[row.id + 'bba_signed']
        const isEditing = bbaEditId === row.id
        const fmt = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'

        if (isEditing) {
          return (
            <div className="bba-inline-form" onClick={e => e.stopPropagation()}>
              <div className="bba-inline-dates">
                <label className="bba-inline-label">Signed
                  <input type="date" className="bba-inline-date" value={bbaDraft.bba_signed_date}
                    onChange={e => setBbaDraft(p => ({ ...p, bba_signed_date: e.target.value }))} />
                </label>
                <label className="bba-inline-label">Expires
                  <input type="date" className="bba-inline-date" value={bbaDraft.bba_expiration_date}
                    onChange={e => setBbaDraft(p => ({ ...p, bba_expiration_date: e.target.value }))} />
                </label>
              </div>
              <div className="bba-inline-actions">
                <button className="bba-inline-save" disabled={isSaving} onClick={() => saveBba(row.id, true)}>
                  {isSaving ? '…' : 'Save'}
                </button>
                <button className="bba-inline-cancel" onClick={() => setBbaEditId(null)}>✕</button>
              </div>
            </div>
          )
        }

        return (
          <div onClick={e => e.stopPropagation()}>
            <button
              className={`buyer-inline-toggle ${v ? 'buyer-inline-toggle--on' : 'buyer-inline-toggle--off'}`}
              disabled={isSaving}
              onClick={e => { if (v) { saveBba(row.id, false) } else { openBbaEdit(row, e) } }}
              title={v ? 'BBA signed — click to unmark' : 'Not signed — click to set dates'}
            >
              {isSaving ? '…' : v ? '✓ Signed' : 'Pending'}
            </button>
            {v && (
              <div className="bba-date-line" onClick={e => openBbaEdit(row, e)}>
                {fmt(row.bba_signed_date)} → {fmt(row.bba_expiration_date)}
              </div>
            )}
          </div>
        )
      },
    },
    { key: 'showings', label: 'Showings', render: v => <span style={{ fontWeight: 600 }}>{Array.isArray(v) ? v.length : 0}</span> },
    { key: 'updated_at', label: 'Last Activity', render: v => {
      if (!v) return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>—</span>
      const d = new Date(v)
      const days = Math.floor((new Date() - d) / 86400000)
      const variant = days > 30 ? 'danger' : days > 14 ? 'warning' : 'default'
      return <Badge variant={variant} size="sm">{days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days}d ago`}</Badge>
    }},
    {
      key: 'edit', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: 6 }}>
          {row.email && (
            <Button size="sm" variant="ghost" title="Send email" onClick={e => { e.stopPropagation(); setEmailContact({ id: row.id, name: row.name, email: row.email }) }}
              icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
            />
          )}
          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); openEdit(row) }}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
          >Edit</Button>
        </div>
      ),
    },
  ]

  const pipelineCounts = stages.reduce((acc, s) => { acc[s] = buyers.filter(b => b.stage === s).length; return acc }, {})

  // Dashboard stats — use budget_max (or budget_min) as the value per buyer
  const buyerValue = (b) => Number(b.budget_max) || Number(b.budget_min) || 0
  const activeStages = ['New Lead', 'Pre-Approval', 'Active Search', 'Showing', 'Under Contract']
  const activeBuyers = buyers.filter(b => activeStages.includes(b.stage))
  const totalPipeline = activeBuyers.reduce((sum, b) => sum + buyerValue(b), 0)
  const closedValue   = buyers.filter(b => b.stage === 'Closed').reduce((sum, b) => sum + buyerValue(b), 0)
  const onHoldValue   = buyers.filter(b => b.stage === 'On Hold').reduce((sum, b) => sum + buyerValue(b), 0)
  const lostValue     = buyers.filter(b => b.stage === 'Inactive').reduce((sum, b) => sum + buyerValue(b), 0)
  const preApprovedCount = activeBuyers.filter(b => b.preApproved).length
  const fmtVal = (v) => v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : v > 0 ? `$${(v / 1000).toFixed(0)}K` : '$0'

  return (
    <div className="buyers">
      <SectionHeader
        title="Buyers"
        subtitle="CRM pipeline and compliance tracking"
        actions={
          <Button variant="primary" size="md" onClick={openCreate}
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
          >Add Buyer</Button>
        }
      />

      {/* ── Pipeline Dashboard ── */}
      <div className="buyer-dashboard">
        <div className="buyer-dashboard__card buyer-dashboard__card--primary">
          <p className="buyer-dashboard__value">{fmtVal(totalPipeline)}</p>
          <p className="buyer-dashboard__label">Active Pipeline</p>
          <p className="buyer-dashboard__sub">{activeBuyers.length} buyer{activeBuyers.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="buyer-dashboard__card buyer-dashboard__card--success">
          <p className="buyer-dashboard__value">{fmtVal(closedValue)}</p>
          <p className="buyer-dashboard__label">Closed Won</p>
          <p className="buyer-dashboard__sub">{pipelineCounts['Closed'] ?? 0} buyer{(pipelineCounts['Closed'] ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <div className="buyer-dashboard__card buyer-dashboard__card--warning">
          <p className="buyer-dashboard__value">{fmtVal(onHoldValue)}</p>
          <p className="buyer-dashboard__label">On Hold</p>
          <p className="buyer-dashboard__sub">{pipelineCounts['On Hold'] ?? 0} buyer{(pipelineCounts['On Hold'] ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <div className="buyer-dashboard__card buyer-dashboard__card--danger">
          <p className="buyer-dashboard__value">{fmtVal(lostValue)}</p>
          <p className="buyer-dashboard__label">Lost / Inactive</p>
          <p className="buyer-dashboard__sub">{pipelineCounts['Inactive'] ?? 0} buyer{(pipelineCounts['Inactive'] ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <div className="buyer-dashboard__card">
          <p className="buyer-dashboard__value">{preApprovedCount}/{activeBuyers.length}</p>
          <p className="buyer-dashboard__label">Pre-Approved</p>
          <p className="buyer-dashboard__sub">{activeBuyers.length > 0 ? Math.round((preApprovedCount / activeBuyers.length) * 100) : 0}% of active</p>
        </div>
      </div>

      <div className="pipeline-strip">
        {stages.map(stage => (
          <div key={stage} className={`pipeline-stage ${pipelineCounts[stage] > 0 ? 'pipeline-stage--active' : ''}`}>
            <span className="pipeline-stage__count">{pipelineCounts[stage]}</span>
            <span className="pipeline-stage__label">{stage}</span>
          </div>
        ))}
      </div>

      {/* ── Source Breakdown ── */}
      {(() => {
        const srcMap = {}
        buyers.forEach(b => { const s = b.source || 'Unknown'; srcMap[s] = (srcMap[s] || 0) + 1 })
        const sources = Object.entries(srcMap).sort((a, b) => b[1] - a[1])
        const srcLabels = { open_house: 'OH', referral: 'Referral', expired: 'Expired', circle: 'Circle', soi: 'SOI', fsbo: 'FSBO', online: 'Online', Unknown: 'Unknown' }
        if (sources.length <= 1) return null
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
            {sources.map(([src, count]) => (
              <span key={src} style={{ padding: '3px 10px', fontSize: '0.72rem', borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-subtle, #faf8f5)', color: 'var(--brown-dark)', fontWeight: 500 }}>
                {srcLabels[src] || src}: {count}
              </span>
            ))}
          </div>
        )
      })()}

      <TabBar
        tabs={[
          { label: 'All', value: 'all', count: buyers.length },
          { label: 'Active Search', value: 'Active Search' },
          { label: 'Showing', value: 'Showing' },
          { label: 'Under Contract', value: 'Under Contract' },
        ]}
        active={filter}
        onChange={setFilter}
      />

      {/* ── Tier filter ── */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        {['all', 'hot', 'warm', 'nurture', 'cold', 'past'].map(t => {
          const count = t === 'all' ? buyers.length : buyers.filter(b => b.tier === t).length
          if (t !== 'all' && count === 0) return null
          return (
            <button key={t} onClick={() => setTierFilter(t)} style={{
              padding: '3px 10px', fontSize: '0.68rem', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${tierFilter === t ? 'var(--brown-dark)' : 'var(--color-border)'}`,
              background: tierFilter === t ? 'var(--brown-dark)' : 'transparent',
              color: tierFilter === t ? 'var(--cream)' : t === 'hot' ? '#c0604a' : t === 'cold' ? 'var(--color-text-muted)' : 'var(--brown-warm)',
              fontWeight: t === 'hot' ? 600 : 400,
            }}>
              {t === 'all' ? 'All Tiers' : t.charAt(0).toUpperCase() + t.slice(1)} {count > 0 ? `(${count})` : ''}
            </button>
          )
        })}
      </div>

      {/* ── Alerts ── */}
      {(() => {
        const now = new Date()
        const expiringBBAs = buyers.filter(b => {
          if (!b.bba_expiration_date) return false
          const exp = new Date(b.bba_expiration_date)
          const days = Math.ceil((exp - now) / 86400000)
          return days >= 0 && days <= 14
        })
        const staleBuyers = buyers.filter(b => {
          if (!b.updated_at && !b.created_at) return false
          const d = new Date(b.updated_at || b.created_at)
          return (now - d) / 86400000 > 30 && !['Closed', 'Inactive', 'On Hold'].includes(b.stage)
        })
        if (expiringBBAs.length === 0 && staleBuyers.length === 0) return null
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {expiringBBAs.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(230,126,34,0.08)', border: '1px solid rgba(230,126,34,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>⚠️</span>
                <div style={{ fontSize: '0.82rem', color: 'var(--brown-dark)' }}>
                  <strong>BBA Expiring Soon:</strong> {expiringBBAs.map(b => b.name).join(', ')}
                </div>
              </div>
            )}
            {staleBuyers.length > 0 && (
              <div style={{ padding: '10px 14px', background: 'rgba(139,122,104,0.08)', border: '1px solid rgba(139,122,104,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1rem' }}>📋</span>
                <div style={{ fontSize: '0.82rem', color: 'var(--brown-dark)' }}>
                  <strong>{staleBuyers.length} stale buyer{staleBuyers.length > 1 ? 's' : ''}:</strong> No activity in 30+ days — {staleBuyers.slice(0, 3).map(b => b.name).join(', ')}{staleBuyers.length > 3 ? ` +${staleBuyers.length - 3} more` : ''}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      <DataTable columns={columns} rows={filtered} onRowClick={setSelectedBuyer} />

      <SlidePanel
        open={panelOpen}
        onClose={closePanel}
        title={editingBuyer ? 'Edit Buyer' : 'Add Buyer'}
        subtitle={editingBuyer?.name}
        width={460}
      >
        {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.82rem' }}>{error}</p>}
        <BuyerForm key={editingBuyer?.id || 'new'} buyer={editingBuyer} onSave={handleSave} onDelete={handleDelete} onPutOnHold={handlePutOnHold} onClose={closePanel} saving={saving} deleting={deleting} />
      </SlidePanel>

      <SendEmailModal open={!!emailContact} onClose={() => setEmailContact(null)} contact={emailContact || {}} contactType="buyer" />

      {/* On-Hold Reason Modal */}
      {onHoldModal && (
        <div className="on-hold-modal__overlay" onClick={() => setOnHoldModal(false)}>
          <div className="on-hold-modal" onClick={e => e.stopPropagation()}>
            <h3>Put {editingBuyer?.name} on Hold</h3>
            <div className="on-hold-modal__field">
              <label>Reason (optional)</label>
              <textarea
                value={onHoldReason}
                onChange={e => setOnHoldReason(e.target.value)}
                placeholder="e.g. Waiting on lease to end, market timing, personal reasons..."
                autoFocus
              />
            </div>
            <div className="on-hold-modal__actions">
              <Button variant="ghost" size="sm" onClick={() => setOnHoldModal(false)}>Cancel</Button>
              <Button variant="warning" size="sm" onClick={confirmPutOnHold}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Button, Badge } from '../../components/ui/index.jsx'
import { useIsMobile } from '../../lib/hooks.js'
import InteractionsTimeline from '../../components/InteractionsTimeline.jsx'
import SocialProfilesPanel from '../../components/SocialProfilesPanel.jsx'
import LifeEventsPanel from '../../components/LifeEventsPanel.jsx'
import FamilyLinksPanel from '../../components/FamilyLinksPanel.jsx'
import supabase from '../../lib/supabase.js'

const TIER_STYLE = {
  hot: { color: '#c0604a', bg: 'rgba(192,96,74,.1)' },
  warm: { color: 'var(--brown-warm)', bg: 'rgba(183,151,130,.1)' },
  nurture: { color: '#c99a2e', bg: 'rgba(201,154,46,.1)' },
  cold: { color: 'var(--color-text-muted)', bg: 'rgba(200,195,185,.15)' },
  past: { color: 'var(--color-text-muted)', bg: 'rgba(200,195,185,.1)' },
}

export default function ContactProfile() {
  const isMobile = useIsMobile()
  const { id } = useParams()
  const navigate = useNavigate()
  const [contact, setContact] = useState(null)
  const [deals, setDeals] = useState([])
  const [showings, setShowings] = useState([])
  const [ohSignIns, setOHSignIns] = useState([])
  const [biolinkLeads, setBiolinkLeads] = useState([])
  const [formSubmissions, setFormSubmissions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      const [{ data: c }, { data: d }, { data: s }, { data: oh }, { data: bl }, { data: fs }] = await Promise.all([
        supabase.from('contacts').select('*').eq('id', id).single(),
        supabase.from('transactions').select('*, property:properties(address, city)').eq('contact_id', id).order('created_at', { ascending: false }),
        supabase.from('showings').select('*, property:properties(address, city), session:showing_sessions(date)').eq('contact_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('oh_sign_ins').select('*, open_house:open_houses(id, date, property:properties(id, address, city))').eq('contact_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('biolink_leads').select('*').eq('contact_id', id).order('created_at', { ascending: false }).limit(20),
        supabase.from('public_form_submissions').select('id, form_slug, created_at, data').eq('merged_contact_id', id).order('created_at', { ascending: false }).limit(20),
      ])
      setContact(c)
      setDeals(d ?? [])
      setShowings(s ?? [])
      setOHSignIns(oh ?? [])
      setBiolinkLeads(bl ?? [])
      setFormSubmissions(fs ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</div>
  if (!contact) return <div style={{ padding: 40, textAlign: 'center' }}>Contact not found.</div>

  const tier = TIER_STYLE[contact.tier] || TIER_STYLE.warm
  const displayName = contact.first_name ? `${contact.first_name} ${contact.last_name || ''}`.trim() : contact.name

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 12 : 20, marginBottom: 24, flexDirection: isMobile ? 'column' : 'row' }}>
        {/* Avatar */}
        <div style={{
          width: isMobile ? 56 : 72, height: isMobile ? 56 : 72, borderRadius: '50%', flexShrink: 0,
          background: 'var(--brown-mid, #B79782)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 500,
        }}>
          {(contact.first_name?.[0] || contact.name?.[0] || '?').toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
            fontSize: '2rem', fontWeight: 500, margin: '0 0 4px',
            color: 'var(--brown-dark)',
          }}>
            {displayName}
          </h1>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {contact.tier && (
              <span style={{
                fontSize: '0.68rem', padding: '2px 10px', borderRadius: 999,
                background: tier.bg, color: tier.color, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '.06em',
              }}>{contact.tier}</span>
            )}
            {contact.stage && <Badge variant="default" size="sm">{contact.stage}</Badge>}
            {contact.type && <Badge variant="info" size="sm">{contact.type}</Badge>}
            {contact.source && (
              <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', padding: '2px 8px', border: '1px solid var(--color-border)', borderRadius: 999 }}>
                {contact.source}
              </span>
            )}
            {contact.do_not_contact && <Badge variant="danger" size="sm">Do Not Contact</Badge>}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--brown-warm)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {contact.phone && (
              <a href={`tel:${contact.phone}`} style={{ color: 'var(--brown-warm)', textDecoration: 'none' }}>
                📞 {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} style={{ color: 'var(--brown-warm)', textDecoration: 'none' }}>
                📧 {contact.email}
              </a>
            )}
            {contact.timezone && (
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>🕐 {contact.timezone}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
          <Button variant="ghost" size="sm" onClick={() => {
            const label = `${displayName}\n${contact.email || ''}\n${contact.phone || ''}\n${contact.city ? contact.city + ', AZ' : ''}`
            const win = window.open('', '_blank', 'width=400,height=300')
            win.document.write(`<pre style="font-family:sans-serif;font-size:14px;padding:20px">${label}</pre>`)
            win.print()
          }}>Print Label</Button>
          {contact.email && (
            <Button variant="ghost" size="sm" onClick={() => window.location.href = `mailto:${contact.email}`}>Email</Button>
          )}
          {contact.phone && (
            <Button variant="ghost" size="sm" onClick={() => window.location.href = `tel:${contact.phone}`}>Call</Button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1 }}>{deals.length}</div>
          <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Deals</div>
        </div>
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1 }}>{showings.length}</div>
          <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Showings</div>
        </div>
        {ohSignIns.length > 0 && (
          <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1 }}>{ohSignIns.length}</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>OHs Attended</div>
          </div>
        )}
        {contact.budget_min && (
          <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1 }}>
              ${Number(contact.budget_min).toLocaleString()}{contact.budget_max ? `–${Number(contact.budget_max).toLocaleString()}` : '+'}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Budget</div>
          </div>
        )}
        {contact.pre_approval_amount && (
          <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', lineHeight: 1 }}>
              ${Number(contact.pre_approval_amount).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginTop: 4 }}>Pre-Approval</div>
          </div>
        )}
        {contact.bba_signed_date && (
          <div style={{ background: 'rgba(139,154,123,.06)', border: '1px solid var(--sage-green)', borderRadius: 8, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#566b4a' }}>BBA ✓</div>
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              {new Date(contact.bba_signed_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* Notes + Voice Notes */}
      {(contact.notes || contact.voice_notes) && (
        <div style={{ display: 'grid', gridTemplateColumns: contact.notes && contact.voice_notes ? '1fr 1fr' : '1fr', gap: 12, marginBottom: 16 }}>
          {contact.notes && (
            <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Notes</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--brown-warm)', margin: 0, lineHeight: 1.5 }}>{contact.notes}</p>
            </div>
          )}
          {contact.voice_notes && (
            <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Voice Notes</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--brown-warm)', margin: 0, lineHeight: 1.5 }}>{contact.voice_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Looking For */}
      {contact.looking_for && (
        <div style={{ background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: '0.62rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--color-text-muted)', marginBottom: 6 }}>Looking For</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--brown-warm)' }}>
            {typeof contact.looking_for === 'string' ? contact.looking_for : JSON.stringify(contact.looking_for, null, 2)}
          </div>
        </div>
      )}

      {/* Deals */}
      {deals.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500, margin: '0 0 8px' }}>Deals ({deals.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {deals.map(d => (
              <Link key={d.id} to="/pipeline/board" style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: 'var(--color-bg-subtle)', borderRadius: 6, textDecoration: 'none', color: 'inherit',
              }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>
                  {d.property?.address || '—'}
                </span>
                <Badge variant={d.status === 'closed' ? 'success' : 'default'} size="sm">{d.status}</Badge>
                {d.offer_price && <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>${Number(d.offer_price).toLocaleString()}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Open House Attendance */}
      {ohSignIns.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500, margin: '0 0 8px' }}>
            Open Houses Attended ({ohSignIns.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ohSignIns.map(si => {
              const dateStr = si.open_house?.date ? new Date(si.open_house.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
              const interestLabel = { hot: 'Very interested', warm: 'Maybe', cool: 'Not for me', just_browsing: 'Just browsing' }[si.interest_level]
              const priceLabel = { too_high: 'Too high', fair: 'About right', great_deal: 'Great deal' }[si.price_perception]
              const offerLabel = { yes: 'Yes', maybe: 'Maybe', no: 'No' }[si.would_offer]
              const hasFeedback = si.interest_level || si.price_perception || si.would_offer || si.liked || si.concerns || si.comments
              return (
                <div key={si.id} style={{ padding: '10px 12px', background: 'var(--cream-3)', border: '1px solid var(--color-border)', borderRadius: 8 }}>
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

      {/* Showings */}
      {showings.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500, margin: '0 0 8px' }}>
            Private Showings ({showings.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {showings.slice(0, 8).map(sh => (
              <div key={sh.id} style={{ padding: '8px 12px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--brown-dark)' }}>{sh.property?.address || '—'}</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {sh.interest_level && <Badge variant={sh.interest_level === 'high' || sh.interest_level === 'hot' ? 'success' : sh.interest_level === 'medium' || sh.interest_level === 'warm' ? 'info' : 'default'} size="sm">{sh.interest_level}</Badge>}
                    {sh.would_offer === 'yes' && <Badge variant="success" size="sm">Offer: Yes</Badge>}
                    {sh.session?.date && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date(sh.session.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                  </div>
                </div>
                {sh.buyer_feedback && <p style={{ fontSize: '0.74rem', color: 'var(--brown-warm)', marginTop: 4 }}>{sh.buyer_feedback}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Capture (bio link + intake forms) */}
      {(biolinkLeads.length > 0 || formSubmissions.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 500, margin: '0 0 8px' }}>
            Lead Capture ({biolinkLeads.length + formSubmissions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {biolinkLeads.map(bl => (
              <div key={`bl-${bl.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--brown-warm)' }}>
                  Bio Link · {bl.guide_type ? `${bl.guide_type} guide` : 'form submission'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date(bl.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
            {formSubmissions.map(fs => (
              <div key={`fs-${fs.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--color-bg-subtle, #faf8f5)', borderRadius: 6 }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--brown-warm)' }}>
                  Form · {fs.form_slug}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{new Date(fs.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column: Relationships | Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <SocialProfilesPanel contactId={id} />
          <FamilyLinksPanel contactId={id} />
          <LifeEventsPanel contactId={id} />
        </div>
        <div>
          <InteractionsTimeline contactId={id} />
        </div>
      </div>
    </div>
  )
}

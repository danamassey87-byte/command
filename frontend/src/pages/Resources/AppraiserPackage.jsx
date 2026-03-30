import { useState, useRef } from 'react'
import { SectionHeader, Button, Card } from '../../components/ui/index.jsx'
import { useTransactions } from '../../lib/hooks.js'
import { useBrandSignature } from '../../lib/BrandContext'
import './AppraiserPackage.css'

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDollar(v) {
  if (!v) return '$0'
  return '$' + Number(v).toLocaleString()
}
function pricePerSqft(price, sqft) {
  if (!price || !sqft) return '—'
  return '$' + Math.round(price / sqft).toLocaleString()
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
}

const EMPTY_COMP = {
  address: '', mlsNumber: '', status: 'Sold', price: '', sqft: '', beds: '', baths: '',
  pricePerSqft: '', dom: '', pool: 'No', lotSqft: '', yearBuilt: '', notes: '',
}

const DEFAULT_SUBJECT = {
  address: '', city: '', state: 'AZ', zip: '', price: '', sqft: '', beds: '', baths: '',
  pool: 'No', yearBuilt: '', lotSqft: '', garage: '', stories: '',
  sellerConcessions: '', buyerBrokerComp: '', listDate: '', contractDate: '', coeDate: '',
}

// ─── Step 1: Deal Picker ────────────────────────────────────────────────────
function DealPicker({ transactions, onSelect }) {
  const [search, setSearch] = useState('')
  const active = (transactions ?? []).filter(t =>
    t.status && !['closed', 'cancelled', 'withdrawn'].includes(t.status.toLowerCase())
  )
  const filtered = active.filter(t => {
    const addr = t.property?.address || ''
    const name = t.contact?.name || ''
    return (addr + ' ' + name).toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="ap-picker">
      <div className="ap-picker__header">
        <h2>Select a Deal</h2>
        <p>Choose an active pipeline deal to generate the appraiser package for.</p>
      </div>
      <input
        className="ap-picker__search"
        placeholder="Search by address or client name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="ap-picker__list">
        {filtered.length === 0 ? (
          <p className="ap-picker__empty">No matching deals found.</p>
        ) : filtered.map(t => (
          <button key={t.id} className="ap-picker__deal" onClick={() => onSelect(t)}>
            <span className="ap-picker__addr">{t.property?.address || 'No address'}</span>
            <span className="ap-picker__meta">
              {t.contact?.name || '—'} &middot; {fmtDollar(t.offer_price || t.property?.price)} &middot; {t.deal_type === 'buyer' ? 'Buyer' : t.deal_type === 'seller' ? 'Seller' : 'Both Sides'}
            </span>
          </button>
        ))}
      </div>
      <div className="ap-picker__or">
        <span>or</span>
      </div>
      <Button variant="ghost" size="md" onClick={() => onSelect(null)}>
        Start from Scratch
      </Button>
    </div>
  )
}

// ─── Step 2: Confirm Subject Property ───────────────────────────────────────
function ConfirmSubject({ subject, onChange, onConfirm, onBack }) {
  const field = (key, label, opts = {}) => (
    <div className="ap-field" key={key}>
      <label>{label}</label>
      <input
        type={opts.type || 'text'}
        value={subject[key] || ''}
        onChange={e => onChange({ ...subject, [key]: e.target.value })}
        placeholder={opts.placeholder || ''}
      />
    </div>
  )

  return (
    <div className="ap-confirm">
      <div className="ap-confirm__header">
        <h2>Confirm Subject Property</h2>
        <p>Verify the details below. These will populate your appraiser package.</p>
      </div>

      <div className="ap-confirm__grid">
        {field('address', 'Street Address', { placeholder: '1508 Sun Copper Dr' })}
        {field('city', 'City', { placeholder: 'Las Vegas' })}
        {field('state', 'State')}
        {field('zip', 'Zip', { placeholder: '89117' })}
      </div>

      <h3 className="ap-confirm__section-label">Property Details</h3>
      <div className="ap-confirm__grid ap-confirm__grid--4col">
        {field('beds', 'Beds', { type: 'number' })}
        {field('baths', 'Baths', { type: 'number' })}
        {field('sqft', 'Sq Ft', { type: 'number' })}
        {field('yearBuilt', 'Year Built')}
        {field('lotSqft', 'Lot Sq Ft', { type: 'number' })}
        {field('garage', 'Garage', { placeholder: '3 / Attached' })}
        {field('stories', 'Stories', { placeholder: '2' })}
        {field('pool', 'Pool', { placeholder: 'Yes / No' })}
      </div>

      <h3 className="ap-confirm__section-label">Deal Info</h3>
      <div className="ap-confirm__grid ap-confirm__grid--4col">
        {field('price', 'List Price', { type: 'number' })}
        {field('sellerConcessions', 'Seller Concessions', { placeholder: '$12,500' })}
        {field('buyerBrokerComp', 'Buyer Broker Comp', { placeholder: '$17,500' })}
        {field('contractDate', 'Contract Date', { type: 'date' })}
        {field('listDate', 'List Date', { type: 'date' })}
        {field('coeDate', 'COE Date', { type: 'date' })}
      </div>

      <div className="ap-confirm__actions">
        <Button variant="ghost" size="md" onClick={onBack}>Back</Button>
        <Button variant="primary" size="md" onClick={onConfirm}>Confirm &amp; Build Package</Button>
      </div>
    </div>
  )
}

// ─── Step 3: Package Builder ────────────────────────────────────────────────
function PackageBuilder({ subject, sig, comps, setComps, narrative, setNarrative, compNotes, setCompNotes, onBack }) {
  const printRef = useRef(null)
  const [activeTab, setActiveTab] = useState('preview')

  const handlePrint = () => {
    window.print()
  }

  const addComp = () => setComps(c => [...c, { ...EMPTY_COMP }])
  const updateComp = (i, key, val) => {
    setComps(c => c.map((comp, idx) => idx === i ? { ...comp, [key]: val } : comp))
  }
  const removeComp = (i) => setComps(c => c.filter((_, idx) => idx !== i))

  const fullAddress = [subject.address, subject.city, subject.state, subject.zip].filter(Boolean).join(', ')
  const ppsqft = pricePerSqft(subject.price, subject.sqft)
  const agentName = sig?.full_name || 'Agent Name'
  const brokerage = sig?.brokerage || 'Brokerage'
  const agentPhone = sig?.phone || ''
  const agentEmail = sig?.email || ''
  const licenseNum = sig?.license || ''

  return (
    <div className="ap-builder">
      {/* ─── Toolbar ─── */}
      <div className="ap-toolbar no-print">
        <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
        <div className="ap-toolbar__tabs">
          <button className={`ap-toolbar__tab ${activeTab === 'preview' ? 'ap-toolbar__tab--active' : ''}`} onClick={() => setActiveTab('preview')}>Preview</button>
          <button className={`ap-toolbar__tab ${activeTab === 'comps' ? 'ap-toolbar__tab--active' : ''}`} onClick={() => setActiveTab('comps')}>Edit Comps</button>
          <button className={`ap-toolbar__tab ${activeTab === 'letter' ? 'ap-toolbar__tab--active' : ''}`} onClick={() => setActiveTab('letter')}>Edit Letter</button>
        </div>
        <Button variant="primary" size="sm" onClick={handlePrint}>Print / Save PDF</Button>
      </div>

      {/* ─── Comps Editor ─── */}
      {activeTab === 'comps' && (
        <div className="ap-comps-editor no-print">
          <div className="ap-comps-editor__header">
            <h3>Comparable Properties</h3>
            <Button variant="primary" size="sm" onClick={addComp}>+ Add Comp</Button>
          </div>
          {comps.length === 0 && <p className="ap-comps-editor__empty">No comps added yet. Click "Add Comp" to start.</p>}
          {comps.map((comp, i) => (
            <div key={i} className="ap-comp-card">
              <div className="ap-comp-card__header">
                <span className="ap-comp-card__num">Comp {i + 1}</span>
                <button className="ap-comp-card__remove" onClick={() => removeComp(i)}>Remove</button>
              </div>
              <div className="ap-comp-card__grid">
                <div className="ap-field">
                  <label>Address</label>
                  <input value={comp.address} onChange={e => updateComp(i, 'address', e.target.value)} placeholder="9316 Sienna Ridge Dr" />
                </div>
                <div className="ap-field">
                  <label>MLS #</label>
                  <input value={comp.mlsNumber} onChange={e => updateComp(i, 'mlsNumber', e.target.value)} placeholder="#2642266" />
                </div>
                <div className="ap-field">
                  <label>Status</label>
                  <select value={comp.status} onChange={e => updateComp(i, 'status', e.target.value)}>
                    <option value="Sold">Sold</option>
                    <option value="UC">Under Contract</option>
                    <option value="Active">Active</option>
                  </select>
                </div>
                <div className="ap-field">
                  <label>Price</label>
                  <input type="number" value={comp.price} onChange={e => updateComp(i, 'price', e.target.value)} placeholder="520000" />
                </div>
                <div className="ap-field">
                  <label>Sq Ft</label>
                  <input type="number" value={comp.sqft} onChange={e => updateComp(i, 'sqft', e.target.value)} placeholder="1788" />
                </div>
                <div className="ap-field">
                  <label>$/Sq Ft</label>
                  <input value={comp.pricePerSqft || (comp.price && comp.sqft ? '$' + Math.round(comp.price / comp.sqft) : '')} onChange={e => updateComp(i, 'pricePerSqft', e.target.value)} placeholder="$291" />
                </div>
                <div className="ap-field">
                  <label>Beds</label>
                  <input type="number" value={comp.beds} onChange={e => updateComp(i, 'beds', e.target.value)} placeholder="3" />
                </div>
                <div className="ap-field">
                  <label>Baths</label>
                  <input value={comp.baths} onChange={e => updateComp(i, 'baths', e.target.value)} placeholder="2/2/0" />
                </div>
                <div className="ap-field">
                  <label>DOM</label>
                  <input type="number" value={comp.dom} onChange={e => updateComp(i, 'dom', e.target.value)} placeholder="7" />
                </div>
                <div className="ap-field">
                  <label>Pool</label>
                  <select value={comp.pool} onChange={e => updateComp(i, 'pool', e.target.value)}>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div className="ap-field">
                  <label>Year Built</label>
                  <input value={comp.yearBuilt} onChange={e => updateComp(i, 'yearBuilt', e.target.value)} placeholder="1991" />
                </div>
                <div className="ap-field">
                  <label>Lot Sq Ft</label>
                  <input value={comp.lotSqft} onChange={e => updateComp(i, 'lotSqft', e.target.value)} placeholder="6,098" />
                </div>
              </div>
              <div className="ap-field ap-field--full">
                <label>Notes</label>
                <textarea rows={2} value={comp.notes} onChange={e => updateComp(i, 'notes', e.target.value)} placeholder="Describe condition, upgrades, relevance…" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Letter Editor ─── */}
      {activeTab === 'letter' && (
        <div className="ap-letter-editor no-print">
          <h3>Property Summary Letter</h3>
          <p className="ap-letter-editor__hint">Write the narrative that accompanies the comps. This is the body of your appraiser letter.</p>
          <textarea
            className="ap-letter-editor__body"
            rows={18}
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            placeholder="Thank you for taking the time to appraise [address]. I wanted to provide some background on how we arrived at our pricing…"
          />
          <h3 style={{ marginTop: 24 }}>Comp-by-Comp Notes</h3>
          <p className="ap-letter-editor__hint">Detailed analysis for each comp shown in the letter.</p>
          <textarea
            className="ap-letter-editor__body"
            rows={12}
            value={compNotes}
            onChange={e => setCompNotes(e.target.value)}
            placeholder="9316 Sienna Ridge Dr – Much smaller. While it sold for more per square foot, total price is not comparable…"
          />
        </div>
      )}

      {/* ─── Print Preview ─── */}
      <div className={`ap-preview ${activeTab !== 'preview' ? 'ap-preview--hidden no-print' : ''}`} ref={printRef}>

        {/* ── Page 1: Cover ── */}
        <div className="ap-page ap-cover">
          <div className="ap-cover__logo-area">
            <div className="ap-cover__logo-placeholder">
              <span>Agent Logo / Brokerage Logo</span>
            </div>
          </div>
          <div className="ap-cover__hero">
            <div className="ap-cover__photo-placeholder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
              <span>Property Photo</span>
            </div>
          </div>
          <div className="ap-cover__title">
            <h1>APPRAISER<br />PACKAGE</h1>
            <p className="ap-cover__address">{subject.address || '123 Main Street'}</p>
          </div>
        </div>

        {/* ── Page 2: Summary Letter ── */}
        <div className="ap-page ap-letter">
          <div className="ap-letter__heading">
            <h2>Subject Property Summary</h2>
            <p className="ap-letter__property-line">
              {fullAddress} &nbsp;|&nbsp; {subject.beds || '—'} bed &nbsp;|&nbsp; {subject.baths || '—'} bath &nbsp;|&nbsp; {subject.pool || 'No'} pool &nbsp;|&nbsp; {fmtDollar(subject.price)} &nbsp;|&nbsp; {ppsqft}/sqft
            </p>
          </div>

          <div className="ap-letter__body">
            {narrative ? (
              narrative.split('\n').map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p className="ap-letter__placeholder">Your property summary letter will appear here. Use the "Edit Letter" tab to write it.</p>
            )}
          </div>

          <div className="ap-letter__signature">
            <p>Warmly,</p>
            <p><strong>{agentName}</strong></p>
            {licenseNum && <p>Realtor® | Lic. #{licenseNum}</p>}
            <p>{brokerage}</p>
            {agentPhone && <p>{agentPhone}</p>}
            {agentEmail && <p>{agentEmail}</p>}
          </div>
        </div>

        {/* ── Page 3: Comps Analysis ── */}
        <div className="ap-page ap-comps-page">
          <h2 className="ap-comps-page__title">Comparable Sales Analysis</h2>

          {/* Comp detail notes */}
          {compNotes && (
            <div className="ap-comps-page__notes">
              {compNotes.split('\n').map((p, i) => <p key={i}>{p}</p>)}
            </div>
          )}

          {/* Comps Table */}
          {comps.length > 0 && (
            <div className="ap-comps-table-wrap">
              <table className="ap-comps-table">
                <thead>
                  <tr>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>SqFt</th>
                    <th>$/SqFt</th>
                    <th>DOM</th>
                    <th>Pool</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Subject row highlighted */}
                  <tr className="ap-comps-table__subject">
                    <td>{subject.address || '—'}</td>
                    <td>Active</td>
                    <td>{fmtDollar(subject.price)}</td>
                    <td>{subject.sqft ? Number(subject.sqft).toLocaleString() : '—'}</td>
                    <td>{ppsqft}</td>
                    <td>—</td>
                    <td>{subject.pool || 'No'}</td>
                  </tr>
                  {comps.map((c, i) => (
                    <tr key={i}>
                      <td>{c.address || '—'}</td>
                      <td>{c.status}</td>
                      <td>{c.price ? fmtDollar(c.price) : '—'}</td>
                      <td>{c.sqft ? Number(c.sqft).toLocaleString() : '—'}</td>
                      <td>{c.pricePerSqft || (c.price && c.sqft ? '$' + Math.round(c.price / c.sqft) : '—')}</td>
                      <td>{c.dom || '—'}</td>
                      <td>{c.pool}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {comps.length === 0 && (
            <p className="ap-comps-page__empty">No comps added. Use the "Edit Comps" tab to add comparable properties.</p>
          )}

          {/* How we compare section */}
          <div className="ap-compare-section">
            <h3>How We Compare</h3>
            <p>Priced at {ppsqft}/sqft, the subject property sits competitively within the range of comparable sales in the area.</p>
          </div>
        </div>

        {/* ── Page 4: Comp Thumbnails ── */}
        {comps.length > 0 && (
          <div className="ap-page ap-thumbnails">
            <h2 className="ap-thumbnails__title">Cross Property Agent Thumbnail</h2>
            <div className="ap-thumbnails__grid">
              {/* Subject property card */}
              <div className="ap-thumb-card ap-thumb-card--subject">
                <div className="ap-thumb-card__photo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                </div>
                <div className="ap-thumb-card__info">
                  <div className="ap-thumb-card__row">
                    <strong>{subject.address}</strong>
                    <span className="ap-thumb-card__tag ap-thumb-card__tag--active">Active</span>
                    <span className="ap-thumb-card__price">{fmtDollar(subject.price)}</span>
                  </div>
                  <div className="ap-thumb-card__details">
                    <span>Sq Ft: {subject.sqft ? Number(subject.sqft).toLocaleString() : '—'}</span>
                    <span>Beds: {subject.beds || '—'}</span>
                    <span>Baths: {subject.baths || '—'}</span>
                    <span>Pool: {subject.pool || 'No'}</span>
                    <span>$/SqFt: {ppsqft}</span>
                    {subject.yearBuilt && <span>Built: {subject.yearBuilt}</span>}
                  </div>
                </div>
              </div>

              {/* Comp cards */}
              {comps.map((c, i) => (
                <div key={i} className="ap-thumb-card">
                  <div className="ap-thumb-card__photo">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                  </div>
                  <div className="ap-thumb-card__info">
                    <div className="ap-thumb-card__row">
                      {c.mlsNumber && <span className="ap-thumb-card__mls">{c.mlsNumber}</span>}
                      <strong>{c.address || 'Comp Address'}</strong>
                      <span className={`ap-thumb-card__tag ${c.status === 'Sold' ? 'ap-thumb-card__tag--sold' : c.status === 'UC' ? 'ap-thumb-card__tag--uc' : 'ap-thumb-card__tag--active'}`}>{c.status}</span>
                      <span className="ap-thumb-card__price">{c.price ? fmtDollar(c.price) : '—'}</span>
                    </div>
                    <div className="ap-thumb-card__details">
                      <span>Sq Ft: {c.sqft ? Number(c.sqft).toLocaleString() : '—'}</span>
                      <span>Beds: {c.beds || '—'}</span>
                      <span>Baths: {c.baths || '—'}</span>
                      <span>Pool: {c.pool}</span>
                      <span>$/SqFt: {c.pricePerSqft || (c.price && c.sqft ? '$' + Math.round(c.price / c.sqft) : '—')}</span>
                      <span>DOM: {c.dom || '—'}</span>
                      {c.yearBuilt && <span>Built: {c.yearBuilt}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AppraiserPackage() {
  const { data: transactions, loading } = useTransactions()
  const sig = useBrandSignature()
  const [step, setStep] = useState('pick')       // pick → confirm → build
  const [subject, setSubject] = useState({ ...DEFAULT_SUBJECT })
  const [comps, setComps] = useState([])
  const [narrative, setNarrative] = useState('')
  const [compNotes, setCompNotes] = useState('')

  const handleDealSelect = (deal) => {
    if (!deal) {
      setSubject({ ...DEFAULT_SUBJECT })
    } else {
      const prop = deal.property || {}
      const addr = prop.address || ''
      // Try to parse city from address (last part after comma)
      const parts = addr.split(',').map(s => s.trim())
      const streetAddr = parts[0] || addr
      const cityPart = parts[1] || ''

      setSubject({
        ...DEFAULT_SUBJECT,
        address: streetAddr,
        city: cityPart || prop.city || '',
        price: deal.offer_price || prop.price || '',
        contractDate: deal.contract_date || '',
        coeDate: deal.closing_date || '',
      })
    }
    setStep('confirm')
  }

  const handleConfirm = () => setStep('build')

  if (step === 'build') {
    return (
      <PackageBuilder
        subject={subject}
        sig={sig}
        comps={comps}
        setComps={setComps}
        narrative={narrative}
        setNarrative={setNarrative}
        compNotes={compNotes}
        setCompNotes={setCompNotes}
        onBack={() => setStep('confirm')}
      />
    )
  }

  return (
    <div className="ap-page-wrap">
      <div className="no-print">
        <SectionHeader
          title="Appraiser Package"
          subtitle="Generate a branded appraiser package with comps and property details"
        />
      </div>

      {step === 'pick' && (
        loading ? (
          <Card><p style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading deals…</p></Card>
        ) : (
          <DealPicker transactions={transactions} onSelect={handleDealSelect} />
        )
      )}

      {step === 'confirm' && (
        <ConfirmSubject
          subject={subject}
          onChange={setSubject}
          onConfirm={handleConfirm}
          onBack={() => setStep('pick')}
        />
      )}
    </div>
  )
}

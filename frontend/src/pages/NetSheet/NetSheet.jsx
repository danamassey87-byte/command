import { useState, useMemo, useCallback } from 'react'
import { Button, Card, Input, Select, SectionHeader } from '../../components/ui/index.jsx'
import './NetSheet.css'

// ─── Maricopa County defaults ─────────────────────────────────────────────────
const DEFAULTS = {
  salePrice: '',
  loanPayoff: '',
  commissionRate: 5, // total %
  listingSideRate: 2.5,
  buyerSideRate: 2.5,
  titleInsurance: '',
  escrowFee: '',
  recordingFee: 75,
  hoaTransferFee: '',
  hoaProration: '',
  propertyTaxProration: '',
  homeWarranty: 500,
  repairCredits: '',
  sellerConcessions: '',
  otherCredits: '',
  otherFees: '',
}

function fmtDollar(v) {
  if (!v && v !== 0) return '$0'
  return '$' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function num(v) { return Number(v) || 0 }

// Title insurance estimate based on sale price (AZ standard rate schedule approximation)
function estimateTitleInsurance(price) {
  if (!price) return 0
  const p = num(price)
  if (p <= 100000) return p * 0.005
  if (p <= 500000) return 500 + (p - 100000) * 0.004
  return 2100 + (p - 500000) * 0.003
}

// Escrow fee estimate
function estimateEscrowFee(price) {
  if (!price) return 0
  return Math.max(350, num(price) * 0.001)
}

export default function NetSheet() {
  const [values, setValues] = useState(DEFAULTS)
  const [clientName, setClientName] = useState('')
  const [propertyAddr, setPropertyAddr] = useState('')

  const set = useCallback((key, val) => {
    setValues(prev => ({ ...prev, [key]: val }))
  }, [])

  // Auto-estimate title & escrow when sale price changes
  const handlePriceChange = (val) => {
    const p = num(val)
    setValues(prev => ({
      ...prev,
      salePrice: val,
      titleInsurance: prev.titleInsurance || '',
      escrowFee: prev.escrowFee || '',
    }))
  }

  // Calculations
  const calc = useMemo(() => {
    const price = num(values.salePrice)
    const listingCommission = price * (num(values.listingSideRate) / 100)
    const buyerCommission = price * (num(values.buyerSideRate) / 100)
    const totalCommission = listingCommission + buyerCommission

    const titleIns = num(values.titleInsurance) || estimateTitleInsurance(price)
    const escrow = num(values.escrowFee) || estimateEscrowFee(price)
    const recording = num(values.recordingFee)
    const hoaTransfer = num(values.hoaTransferFee)
    const hoaProration = num(values.hoaProration)
    const propertyTax = num(values.propertyTaxProration)
    const homeWarranty = num(values.homeWarranty)
    const repairs = num(values.repairCredits)
    const concessions = num(values.sellerConcessions)
    const otherCredits = num(values.otherCredits)
    const otherFees = num(values.otherFees)

    const totalClosingCosts = titleIns + escrow + recording + hoaTransfer + hoaProration + propertyTax + homeWarranty + otherFees
    const totalDeductions = totalCommission + totalClosingCosts + repairs + concessions + otherCredits
    const loanPayoff = num(values.loanPayoff)
    const netProceeds = price - loanPayoff - totalDeductions

    return {
      price,
      listingCommission,
      buyerCommission,
      totalCommission,
      titleIns,
      escrow,
      recording,
      hoaTransfer,
      hoaProration,
      propertyTax,
      homeWarranty,
      repairs,
      concessions,
      otherCredits,
      otherFees,
      totalClosingCosts,
      totalDeductions,
      loanPayoff,
      netProceeds,
    }
  }, [values])

  const reset = () => {
    setValues(DEFAULTS)
    setClientName('')
    setPropertyAddr('')
  }

  return (
    <div className="ns">
      <div className="ns__layout">
        {/* ─── Input Form ─── */}
        <div className="ns__form">
          <Card padding>
            <h3 className="ns__section-title">Property Info</h3>
            <div className="ns__field-group">
              <Input label="Client Name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Jane Smith" />
              <Input label="Property Address" value={propertyAddr} onChange={e => setPropertyAddr(e.target.value)} placeholder="123 E Main St, Gilbert AZ" />
              <Input label="Sale Price" type="number" value={values.salePrice} onChange={e => handlePriceChange(e.target.value)} placeholder="450000" />
              <Input label="Loan Payoff" type="number" value={values.loanPayoff} onChange={e => set('loanPayoff', e.target.value)} placeholder="280000" />
            </div>
          </Card>

          <Card padding>
            <h3 className="ns__section-title">Commission</h3>
            <div className="ns__field-row">
              <Input label="Listing Side %" type="number" step="0.1" value={values.listingSideRate} onChange={e => set('listingSideRate', e.target.value)} />
              <Input label="Buyer Side %" type="number" step="0.1" value={values.buyerSideRate} onChange={e => set('buyerSideRate', e.target.value)} />
            </div>
          </Card>

          <Card padding>
            <h3 className="ns__section-title">Closing Costs</h3>
            <div className="ns__field-group">
              <Input label="Title Insurance (auto-estimated if blank)" type="number" value={values.titleInsurance} onChange={e => set('titleInsurance', e.target.value)} placeholder={calc.titleIns ? calc.titleIns.toFixed(0) : ''} />
              <Input label="Escrow Fee (auto-estimated if blank)" type="number" value={values.escrowFee} onChange={e => set('escrowFee', e.target.value)} placeholder={calc.escrow ? calc.escrow.toFixed(0) : ''} />
              <div className="ns__field-row">
                <Input label="Recording Fee" type="number" value={values.recordingFee} onChange={e => set('recordingFee', e.target.value)} />
                <Input label="Home Warranty" type="number" value={values.homeWarranty} onChange={e => set('homeWarranty', e.target.value)} />
              </div>
              <div className="ns__field-row">
                <Input label="HOA Transfer Fee" type="number" value={values.hoaTransferFee} onChange={e => set('hoaTransferFee', e.target.value)} placeholder="0" />
                <Input label="HOA Proration" type="number" value={values.hoaProration} onChange={e => set('hoaProration', e.target.value)} placeholder="0" />
              </div>
              <Input label="Property Tax Proration" type="number" value={values.propertyTaxProration} onChange={e => set('propertyTaxProration', e.target.value)} placeholder="0" />
              <Input label="Other Fees" type="number" value={values.otherFees} onChange={e => set('otherFees', e.target.value)} placeholder="0" />
            </div>
          </Card>

          <Card padding>
            <h3 className="ns__section-title">Credits & Concessions</h3>
            <div className="ns__field-group">
              <Input label="Repair Credits" type="number" value={values.repairCredits} onChange={e => set('repairCredits', e.target.value)} placeholder="0" />
              <Input label="Seller Concessions" type="number" value={values.sellerConcessions} onChange={e => set('sellerConcessions', e.target.value)} placeholder="0" />
              <Input label="Other Credits to Buyer" type="number" value={values.otherCredits} onChange={e => set('otherCredits', e.target.value)} placeholder="0" />
            </div>
          </Card>

          <div className="ns__form-actions">
            <Button variant="ghost" onClick={reset}>Reset</Button>
          </div>
        </div>

        {/* ─── Results Panel ─── */}
        <div className="ns__results">
          <div className="ns__results-card">
            {clientName && <p className="ns__results-client">{clientName}</p>}
            {propertyAddr && <p className="ns__results-addr">{propertyAddr}</p>}

            <div className="ns__result-hero">
              <span className="ns__result-hero-label">Estimated Net Proceeds</span>
              <span className={`ns__result-hero-value ${calc.netProceeds < 0 ? 'ns__result-hero-value--negative' : ''}`}>
                {fmtDollar(calc.netProceeds)}
              </span>
            </div>

            <div className="ns__breakdown">
              <div className="ns__line ns__line--total">
                <span>Sale Price</span>
                <span>{fmtDollar(calc.price)}</span>
              </div>

              <div className="ns__line ns__line--deduct">
                <span>Loan Payoff</span>
                <span>({fmtDollar(calc.loanPayoff)})</span>
              </div>

              <div className="ns__divider" />

              <div className="ns__line ns__line--header"><span>Commission</span></div>
              <div className="ns__line ns__line--sub">
                <span>Listing Side ({num(values.listingSideRate)}%)</span>
                <span>({fmtDollar(calc.listingCommission)})</span>
              </div>
              <div className="ns__line ns__line--sub">
                <span>Buyer Side ({num(values.buyerSideRate)}%)</span>
                <span>({fmtDollar(calc.buyerCommission)})</span>
              </div>

              <div className="ns__divider" />

              <div className="ns__line ns__line--header"><span>Closing Costs</span></div>
              <div className="ns__line ns__line--sub"><span>Title Insurance</span><span>({fmtDollar(calc.titleIns)})</span></div>
              <div className="ns__line ns__line--sub"><span>Escrow Fee</span><span>({fmtDollar(calc.escrow)})</span></div>
              <div className="ns__line ns__line--sub"><span>Recording Fee</span><span>({fmtDollar(calc.recording)})</span></div>
              {calc.hoaTransfer > 0 && <div className="ns__line ns__line--sub"><span>HOA Transfer</span><span>({fmtDollar(calc.hoaTransfer)})</span></div>}
              {calc.hoaProration > 0 && <div className="ns__line ns__line--sub"><span>HOA Proration</span><span>({fmtDollar(calc.hoaProration)})</span></div>}
              {calc.propertyTax > 0 && <div className="ns__line ns__line--sub"><span>Property Tax Proration</span><span>({fmtDollar(calc.propertyTax)})</span></div>}
              {calc.homeWarranty > 0 && <div className="ns__line ns__line--sub"><span>Home Warranty</span><span>({fmtDollar(calc.homeWarranty)})</span></div>}
              {calc.otherFees > 0 && <div className="ns__line ns__line--sub"><span>Other Fees</span><span>({fmtDollar(calc.otherFees)})</span></div>}

              {(calc.repairs > 0 || calc.concessions > 0 || calc.otherCredits > 0) && (
                <>
                  <div className="ns__divider" />
                  <div className="ns__line ns__line--header"><span>Credits & Concessions</span></div>
                  {calc.repairs > 0 && <div className="ns__line ns__line--sub"><span>Repair Credits</span><span>({fmtDollar(calc.repairs)})</span></div>}
                  {calc.concessions > 0 && <div className="ns__line ns__line--sub"><span>Seller Concessions</span><span>({fmtDollar(calc.concessions)})</span></div>}
                  {calc.otherCredits > 0 && <div className="ns__line ns__line--sub"><span>Other Credits</span><span>({fmtDollar(calc.otherCredits)})</span></div>}
                </>
              )}

              <div className="ns__divider ns__divider--thick" />
              <div className="ns__line ns__line--deduct">
                <span>Total Deductions</span>
                <span>({fmtDollar(calc.totalDeductions)})</span>
              </div>
              <div className={`ns__line ns__line--net ${calc.netProceeds < 0 ? 'ns__line--negative' : ''}`}>
                <span>Net to Seller</span>
                <span>{fmtDollar(calc.netProceeds)}</span>
              </div>
            </div>

            <p className="ns__disclaimer">
              *This is an estimate only. Actual costs may vary. Consult with your title company for exact figures.
              Based on Maricopa County, AZ standard rates.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

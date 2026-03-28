import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'

// ─── Existing pages ──────────────────────────────────────────────────────────
import Dashboard from './pages/Dashboard/Dashboard'
import DailyTracker from './pages/DailyTracker/DailyTracker'
import ListingAppts from './pages/ListingAppts/ListingAppts'
import Buyers from './pages/Buyers/Buyers'
import Sellers from './pages/Sellers/Sellers'
import Investors from './pages/Investors/Investors'
import LeadGen from './pages/LeadGen/LeadGen'
import BuyerShowings from './pages/BuyerShowings/BuyerShowings'
import SellerShowings from './pages/SellerShowings/SellerShowings'
import Properties from './pages/Properties/Properties'
import OpenHouses from './pages/OpenHouses/OpenHouses'
import ContentCalendar from './pages/ContentCalendar/ContentCalendar'
import Stats from './pages/Stats/Stats'
import Goals from './pages/Goals/Goals'
import ContentPlanner from './pages/ContentPlanner/ContentPlanner'
import Settings from './pages/Settings/Settings'
import BioLinkBuilder from './pages/BioLink/BioLinkBuilder'
import EmailBuilder from './pages/EmailBuilder/EmailBuilder'

// ─── Placeholder for new pages (renders a "Coming Soon" card) ────────────────
function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', textAlign: 'center', gap: 12 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--brown-dark)' }}>{title}</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: 400 }}>This section is being built. Check back soon.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* ─── Dashboard ─── */}
          <Route path="/"                  element={<Dashboard />} />
          <Route path="/dashboard/daily"   element={<DailyTracker />} />
          <Route path="/dashboard/appts"   element={<ListingAppts />} />

          {/* ─── Prospecting ─── */}
          <Route path="/prospecting"            element={<LeadGen />} />
          <Route path="/prospecting/expired"    element={<LeadGen />} />
          <Route path="/prospecting/fsbo"       element={<ComingSoon title="FSBO Leads" />} />
          <Route path="/prospecting/circle"     element={<ComingSoon title="Circle Prospecting" />} />
          <Route path="/prospecting/soi"        element={<ComingSoon title="Personal Circle / SOI" />} />
          <Route path="/prospecting/referrals"  element={<ComingSoon title="Referrals" />} />
          <Route path="/prospecting/oh-leads"   element={<ComingSoon title="Open House Leads" />} />

          {/* ─── CRM ─── */}
          <Route path="/crm"              element={<Buyers />} />
          <Route path="/crm/buyers"       element={<Buyers />} />
          <Route path="/crm/sellers"      element={<Sellers />} />
          <Route path="/crm/showings"         element={<BuyerShowings />} />
          <Route path="/crm/seller-showings"  element={<SellerShowings />} />
          <Route path="/crm/investors"        element={<Investors />} />
          <Route path="/crm/properties"       element={<Properties />} />
          {/* leads moved to /prospecting */}

          {/* ─── Pipeline ─── */}
          <Route path="/pipeline"          element={<ComingSoon title="Pipeline" />} />
          <Route path="/pipeline/escrow"   element={<ComingSoon title="Escrow Tracker" />} />
          <Route path="/pipeline/closed"   element={<ComingSoon title="Closed Deals" />} />

          {/* ─── Calendar ─── */}
          <Route path="/calendar"          element={<ComingSoon title="Calendar — Showings + Tasks" />} />
          <Route path="/calendar/today"    element={<ComingSoon title="Today's Showings" />} />
          <Route path="/calendar/tasks"    element={<ComingSoon title="Tasks" />} />

          {/* ─── Open Houses ─── */}
          <Route path="/open-houses"       element={<OpenHouses />} />

          {/* ─── Content ─── */}
          <Route path="/content"           element={<ComingSoon title="Content Pillars" />} />
          <Route path="/content/calendar"  element={<ContentPlanner />} />
          <Route path="/content/planning"  element={<ContentPlanner />} />
          <Route path="/content/templates" element={<ComingSoon title="Content Templates" />} />
          <Route path="/content/ai-studio" element={<ComingSoon title="AI Studio" />} />
          <Route path="/content/stats"     element={<ComingSoon title="Content Stats" />} />

          {/* ─── P&L ─── */}
          <Route path="/pnl"              element={<ComingSoon title="P&L Overview" />} />
          <Route path="/pnl/expenses"     element={<ComingSoon title="Expenses" />} />
          <Route path="/pnl/income"       element={<ComingSoon title="Income" />} />

          {/* ─── Net Sheet ─── */}
          <Route path="/net-sheet"         element={<ComingSoon title="Net Sheet Calculator" />} />

          {/* ─── Market ─── */}
          <Route path="/market"            element={<Stats />} />

          {/* ─── Goals ─── */}
          <Route path="/goals"             element={<Goals />} />

          {/* ─── Resources ─── */}
          <Route path="/resources"         element={<ComingSoon title="Resource Hub" />} />
          <Route path="/resources/email"   element={<ComingSoon title="Email Templates" />} />
          <Route path="/resources/sms"     element={<ComingSoon title="SMS Templates" />} />

          {/* ─── Link in Bio ─── */}
          <Route path="/bio-link"          element={<BioLinkBuilder />} />
          <Route path="/bio-link/forms"    element={<ComingSoon title="Links & Forms" />} />
          <Route path="/bio-link/guides"   element={<ComingSoon title="Guides" />} />
          <Route path="/bio-link/drips"    element={<ComingSoon title="Drip Campaigns" />} />
          <Route path="/bio-link/leads"    element={<ComingSoon title="Leads Captured" />} />

          {/* ─── Email ─── */}
          <Route path="/email"             element={<EmailBuilder />} />
          <Route path="/email/templates"   element={<ComingSoon title="Email Templates" />} />
          <Route path="/email/campaigns"   element={<ComingSoon title="Campaigns" />} />
          <Route path="/email/sent"        element={<ComingSoon title="Sent Emails" />} />

          {/* ─── Settings ─── */}
          <Route path="/settings"          element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

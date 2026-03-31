import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { BrandProvider } from './lib/BrandContext'
import { NotesProvider } from './lib/NotesContext'
import { FavoritesProvider } from './lib/FavoritesContext'
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
import ListingPlan from './pages/ListingPlan/ListingPlan'
import BioLinkBuilder from './pages/BioLink/BioLinkBuilder'
import EmailBuilder from './pages/EmailBuilder/EmailBuilder'
import IntakeForms from './pages/IntakeForms/IntakeForms'
import CalendarSchedule from './pages/Calendar/CalendarSchedule'
import TodayShowings from './pages/Calendar/TodayShowings'
import CalendarTasks from './pages/Calendar/Tasks'
import SocialDashboard from './pages/Content/SocialDashboard'
import AIStudio from './pages/AIStudio/AIStudio'

// ─── Section Dashboards ────────────────────────────────────────────────────────
import CrmDashboard from './pages/CRM/CrmDashboard'
import PipelineDashboard from './pages/Pipeline/PipelineDashboard'
import ProspectingDashboard from './pages/Prospecting/ProspectingDashboard'
import ContentDashboard from './pages/Content/ContentDashboard'
import CalendarDashboard from './pages/Calendar/CalendarDashboard'
import EmailDashboard from './pages/Email/EmailDashboard'
import CampaignsDashboard from './pages/Campaigns/CampaignsDashboard'
import ResourcesDashboard from './pages/Resources/ResourcesDashboard'
import AppraiserPackage from './pages/Resources/AppraiserPackage'
import BioLinkDashboard from './pages/BioLink/BioLinkDashboard'

// ─── Pipeline Pages ─────────────────────────────────────────────────────────
import PipelineBoard from './pages/Pipeline/Pipeline'
import EscrowTracker from './pages/Pipeline/EscrowTracker'
import ClosedDeals from './pages/Pipeline/ClosedDeals'
import SellerSOP from './pages/Pipeline/SellerSOP'
import BuyerSOP from './pages/Pipeline/BuyerSOP'

// ─── Daily Tasks ─────────────────────────────────────────────────────────────
import DailyTasks from './pages/Tasks/DailyTasks'

// ─── Notes ──────────────────────────────────────────────────────────────────
import Notes from './pages/Notes/Notes'

// ─── Expired / Cannonball Tracker ─────────────────────────────────────────────
import ExpiredCannonball from './pages/Prospecting/ExpiredCannonball'

// ─── Smart Campaigns ────────────────────────────────────────────────────────
import SmartCampaigns from './pages/Campaigns/SmartCampaigns'

// ─── Database (Contact Hub) ──────────────────────────────────────────────────
import Database from './pages/Database/Database'

// ─── Net Sheet ──────────────────────────────────────────────────────────────
import NetSheet from './pages/NetSheet/NetSheet'

// ─── P&L Pages ──────────────────────────────────────────────────────────────
import PnLOverview from './pages/PnL/PnLOverview'
import PnLExpenses from './pages/PnL/Expenses'
import PnLIncome   from './pages/PnL/Income'
import MileageLog  from './pages/PnL/MileageLog'
import TaxSummary  from './pages/PnL/TaxSummary'
import RecurringExpenses from './pages/PnL/RecurringExpenses'
import BudgetVsActual from './pages/PnL/BudgetVsActual'

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
    <BrandProvider>
    <NotesProvider>
    <FavoritesProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* ─── Dashboard ─── */}
          <Route path="/"                  element={<Dashboard />} />
          <Route path="/dashboard/daily"   element={<DailyTracker />} />
          <Route path="/dashboard/appts"   element={<ListingAppts />} />

          {/* ─── Daily Tasks ─── */}
          <Route path="/tasks"             element={<DailyTasks />} />
          <Route path="/tasks/vendors"     element={<DailyTasks />} />

          {/* ─── Prospecting ─── */}
          <Route path="/prospecting"            element={<ProspectingDashboard />} />
          <Route path="/prospecting/expired"    element={<ExpiredCannonball />} />
          <Route path="/prospecting/fsbo"       element={<ComingSoon title="FSBO Leads" />} />
          <Route path="/prospecting/circle"     element={<ComingSoon title="Circle Prospecting" />} />
          <Route path="/prospecting/soi"        element={<ComingSoon title="Personal Circle / SOI" />} />
          <Route path="/prospecting/referrals"  element={<ComingSoon title="Referrals" />} />
          <Route path="/prospecting/oh-leads"   element={<ComingSoon title="Open House Leads" />} />

          {/* ─── CRM ─── */}
          <Route path="/crm"              element={<CrmDashboard />} />
          <Route path="/crm/buyers"       element={<Buyers />} />
          <Route path="/crm/sellers"      element={<Sellers />} />
          <Route path="/crm/showings"         element={<BuyerShowings />} />
          <Route path="/crm/seller-showings"  element={<SellerShowings />} />
          <Route path="/crm/listing-plan"    element={<ListingPlan />} />
          <Route path="/crm/investors"        element={<Investors />} />
          <Route path="/crm/properties"       element={<Properties />} />
          <Route path="/crm/intake-forms"    element={<IntakeForms />} />
          <Route path="/crm/database"       element={<Database />} />

          {/* ─── Pipeline ─── */}
          <Route path="/pipeline"            element={<PipelineDashboard />} />
          <Route path="/pipeline/board"      element={<PipelineBoard />} />
          <Route path="/pipeline/buyer-sop"  element={<BuyerSOP />} />
          <Route path="/pipeline/seller-sop" element={<SellerSOP />} />
          <Route path="/pipeline/escrow"     element={<EscrowTracker />} />
          <Route path="/pipeline/closed"     element={<ClosedDeals />} />

          {/* ─── Calendar ─── */}
          <Route path="/calendar"          element={<CalendarDashboard />} />
          <Route path="/calendar/schedule" element={<CalendarSchedule />} />
          <Route path="/calendar/today"    element={<TodayShowings />} />
          <Route path="/calendar/tasks"    element={<CalendarTasks />} />
          <Route path="/calendar/notes"    element={<Notes />} />

          {/* ─── Open Houses ─── */}
          <Route path="/open-houses"       element={<OpenHouses />} />

          {/* ─── Content ─── */}
          <Route path="/content"           element={<ContentDashboard />} />
          <Route path="/content/calendar"  element={<ContentPlanner />} />
          <Route path="/content/planning"  element={<ContentPlanner />} />
          <Route path="/content/templates" element={<ComingSoon title="Content Templates" />} />
          <Route path="/content/ai-studio" element={<AIStudio />} />
          <Route path="/content/social"    element={<SocialDashboard />} />
          <Route path="/content/ads"       element={<ComingSoon title="Ads Manager" />} />
          <Route path="/content/ads/reports" element={<ComingSoon title="Ad Reports" />} />
          <Route path="/content/stats"     element={<ComingSoon title="Content Stats" />} />

          {/* ─── P&L ─── */}
          <Route path="/pnl"              element={<PnLOverview />} />
          <Route path="/pnl/expenses"     element={<PnLExpenses />} />
          <Route path="/pnl/income"       element={<PnLIncome />} />
          <Route path="/pnl/mileage"      element={<MileageLog />} />
          <Route path="/pnl/recurring"    element={<RecurringExpenses />} />
          <Route path="/pnl/budget"       element={<BudgetVsActual />} />
          <Route path="/pnl/tax"          element={<TaxSummary />} />

          {/* ─── Net Sheet ─── */}
          <Route path="/net-sheet"         element={<NetSheet />} />

          {/* ─── Market ─── */}
          <Route path="/market"            element={<Stats />} />

          {/* ─── Goals ─── */}
          <Route path="/goals"             element={<Goals />} />

          {/* ─── Resources ─── */}
          <Route path="/resources"         element={<ResourcesDashboard />} />
          <Route path="/resources/email"   element={<ComingSoon title="Email Templates" />} />
          <Route path="/resources/sms"     element={<ComingSoon title="SMS Templates" />} />
          <Route path="/resources/appraiser-package" element={<AppraiserPackage />} />

          {/* ─── Link in Bio ─── */}
          <Route path="/bio-link"          element={<BioLinkDashboard />} />
          <Route path="/bio-link/page"     element={<BioLinkBuilder />} />
          <Route path="/bio-link/forms"    element={<ComingSoon title="Links & Forms" />} />
          <Route path="/bio-link/guides"   element={<ComingSoon title="Guides" />} />
          <Route path="/bio-link/drips"    element={<ComingSoon title="Drip Campaigns" />} />
          <Route path="/bio-link/leads"    element={<ComingSoon title="Leads Captured" />} />

          {/* ─── Smart Campaigns ─── */}
          <Route path="/campaigns"            element={<CampaignsDashboard />} />
          <Route path="/campaigns/manage"     element={<SmartCampaigns />} />
          <Route path="/campaigns/queue"      element={<SmartCampaigns />} />
          <Route path="/campaigns/enrollments" element={<SmartCampaigns />} />
          <Route path="/campaigns/history"    element={<SmartCampaigns />} />
          <Route path="/campaigns/templates"  element={<SmartCampaigns />} />

          {/* ─── Email ─── */}
          <Route path="/email"             element={<EmailDashboard />} />
          <Route path="/email/builder"     element={<EmailBuilder />} />
          <Route path="/email/templates"   element={<ComingSoon title="Email Templates" />} />
          <Route path="/email/campaigns"   element={<ComingSoon title="Campaigns" />} />
          <Route path="/email/sent"        element={<ComingSoon title="Sent Emails" />} />

          {/* ─── Settings ─── */}
          <Route path="/settings"          element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </FavoritesProvider>
    </NotesProvider>
    </BrandProvider>
  )
}

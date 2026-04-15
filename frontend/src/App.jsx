import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { BrandProvider } from './lib/BrandContext'
import { NotesProvider } from './lib/NotesContext'
import { FavoritesProvider } from './lib/FavoritesContext'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login/Login'

// ─── Existing pages ──────────────────────────────────────────────────────────
import Dashboard from './pages/Dashboard/Dashboard'
import DailyTracker from './pages/DailyTracker/DailyTracker'
import ListingAppts from './pages/ListingAppts/ListingAppts'
import Buyers from './pages/Buyers/Buyers'
import Sellers from './pages/Sellers/Sellers'
import SellerClients from './pages/Sellers/SellerClients'
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
import Recovery from './pages/Recovery/Recovery'
import ListingPlan from './pages/ListingPlan/ListingPlan'
import BioLinkBuilder from './pages/BioLink/BioLinkBuilder'
import EmailBuilder from './pages/EmailBuilder/EmailBuilder'
import NewslettersPage from './pages/Newsletters/Newsletters'
import IntakeForms from './pages/IntakeForms/IntakeForms'
import PublicForm from './pages/PublicForm/PublicForm'
import OHSignIn from './pages/OHSignIn/OHSignIn'
import GoogleCallback from './pages/Auth/GoogleCallback'
import Notifications from './pages/Notifications/Notifications'
import CalendarSchedule from './pages/Calendar/CalendarSchedule'
import TodayShowings from './pages/Calendar/TodayShowings'
import CalendarTasks from './pages/Calendar/Tasks'
import SocialDashboard from './pages/Content/SocialDashboard'
import AIStudio from './pages/AIStudio/AIStudio'
import PostComposer from './pages/PostComposer/PostComposer'
import HashtagBank from './pages/HashtagBank/HashtagBank'
import KeywordTracker from './pages/KeywordTracker/KeywordTracker'
import InspoRecreator from './pages/InspoRecreator/InspoRecreator'
import GammaPresentations from './pages/GammaPresentations/GammaPresentations'
import VideoStudio from './pages/VideoStudio/VideoStudio'
import AdsManager from './pages/Ads/AdsManager'
import AdReports from './pages/Ads/AdReports'

// ─── Content Hub (new unified structure) ──────────────────────────────────────
import ContentHub from './pages/ContentHub/ContentHub'
import PlanTab from './pages/ContentHub/PlanTab'
import CreateTab from './pages/ContentHub/CreateTab'
import PublishTab from './pages/ContentHub/PublishTab'
import MeasureTab from './pages/ContentHub/MeasureTab'
import ContentBank from './pages/ContentHub/ContentBank'
import Vendors from './pages/Vendors/Vendors'

// ─── Section Dashboards ────────────────────────────────────────────────────────
import CrmDashboard from './pages/CRM/CrmDashboard'
import PipelineDashboard from './pages/Pipeline/PipelineDashboard'
import ProspectingDashboard from './pages/Prospecting/ProspectingDashboard'
import ContentDashboard from './pages/Content/ContentDashboard'
import CalendarDashboard from './pages/Calendar/CalendarDashboard'
import EmailDashboard from './pages/Email/EmailDashboard'
import EmailTemplates from './pages/Email/EmailTemplates'
import SentHistory from './pages/Email/SentHistory'
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

// ─── Prospecting Pages ──────────────────────────────────────────────────────
import AllProspects from './pages/Prospecting/AllProspects'
import FsboLeads from './pages/Prospecting/FsboLeads'
import CircleProspecting from './pages/Prospecting/CircleProspecting'
import PersonalCircle from './pages/Prospecting/PersonalCircle'
import Referrals from './pages/Prospecting/Referrals'
import OHLeads from './pages/Prospecting/OHLeads'

// ─── Smart Campaigns ────────────────────────────────────────────────────────
import SmartCampaigns from './pages/Campaigns/SmartCampaigns'

// ─── Database (Contact Hub) ──────────────────────────────────────────────────
import Database from './pages/Database/Database'
import OnHoldContacts from './pages/OnHoldContacts/OnHoldContacts'

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
import CostTracker from './pages/PnL/CostTracker'
import ROIAnalytics from './pages/PnL/ROIAnalytics'

// ─── Placeholder for new pages (renders a "Coming Soon" card) ────────────────
function ComingSoon({ title }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 32px', textAlign: 'center', gap: 12 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--brown-dark)' }}>{title}</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: 400 }}>This section is being built. Check back soon.</p>
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public client-facing pages (unauthed) */}
        <Route path="/form/:slug" element={<PublicForm />} />
        <Route path="/oh-signin/:openHouseId" element={<OHSignIn />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        <Route path="/login" element={<LoginGate />} />
        <Route element={<ProtectedRoute><BrandProvider><NotesProvider><FavoritesProvider><Layout /></FavoritesProvider></NotesProvider></BrandProvider></ProtectedRoute>}>
          {/* ─── Dashboard ─── */}
          <Route path="/"                  element={<Dashboard />} />
          <Route path="/dashboard/daily"   element={<DailyTracker />} />
          <Route path="/dashboard/appts"   element={<ListingAppts />} />

          {/* ─── Daily Tasks ─── */}
          <Route path="/tasks"             element={<DailyTasks />} />
          <Route path="/tasks/vendors"     element={<DailyTasks />} />

          {/* ─── Prospecting ─── */}
          <Route path="/prospecting"            element={<ProspectingDashboard />} />
          <Route path="/prospecting/all"        element={<AllProspects />} />
          <Route path="/prospecting/expired"    element={<ExpiredCannonball />} />
          <Route path="/prospecting/fsbo"       element={<FsboLeads />} />
          <Route path="/prospecting/circle"     element={<CircleProspecting />} />
          <Route path="/prospecting/soi"        element={<PersonalCircle />} />
          <Route path="/prospecting/referrals"  element={<Referrals />} />
          <Route path="/prospecting/oh-leads"   element={<OHLeads />} />

          {/* ─── CRM ─── */}
          <Route path="/crm"              element={<CrmDashboard />} />
          <Route path="/crm/buyers"       element={<Buyers />} />
          <Route path="/crm/seller-clients" element={<SellerClients />} />
          <Route path="/crm/sellers"      element={<Sellers />} />
          <Route path="/crm/showings"         element={<BuyerShowings />} />
          <Route path="/crm/seller-showings"  element={<SellerShowings />} />
          <Route path="/crm/listing-plan"    element={<ListingPlan />} />
          <Route path="/crm/investors"        element={<Investors />} />
          <Route path="/crm/properties"       element={<Properties />} />
          <Route path="/crm/intake-forms"    element={<IntakeForms />} />
          <Route path="/crm/database"       element={<Database />} />
          <Route path="/crm/on-hold"       element={<OnHoldContacts />} />

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

          {/* ─── Content Hub (unified 4-tab structure) ─── */}
          <Route path="/content" element={<ContentHub />}>
            <Route index element={<PlanTab />} />
            <Route path="plan" element={<PlanTab />} />
            <Route path="create" element={<CreateTab />} />
            <Route path="create/:pieceId" element={<CreateTab />} />
            <Route path="publish" element={<PublishTab />} />
            <Route path="measure" element={<MeasureTab />} />
            <Route path="bank" element={<ContentBank />} />
          </Route>

          {/* ─── Legacy content redirects ─── */}
          <Route path="/content/calendar"  element={<Navigate to="/content/plan" replace />} />
          <Route path="/content/planning"  element={<Navigate to="/content/plan" replace />} />
          <Route path="/content/ai-studio" element={<Navigate to="/content/create" replace />} />
          <Route path="/content/composer"  element={<Navigate to="/content/create" replace />} />
          <Route path="/content/composer/:pieceId" element={<Navigate to="/content/create" replace />} />
          <Route path="/content/hashtags"  element={<Navigate to="/content/measure" replace />} />
          <Route path="/content/seo"       element={<Navigate to="/content/measure" replace />} />
          <Route path="/content/inspo"     element={<InspoRecreator />} />
          <Route path="/content/social"    element={<Navigate to="/content/measure" replace />} />
          <Route path="/content/stats"     element={<Navigate to="/content/measure" replace />} />
          <Route path="/content/templates" element={<Navigate to="/content/create" replace />} />
          {/* Video + Gamma still have their own full pages (linked from Create tab modes) */}
          <Route path="/content/gamma"   element={<GammaPresentations />} />
          <Route path="/content/video"   element={<VideoStudio />} />
          <Route path="/content/ads"       element={<AdsManager />} />
          <Route path="/content/ads/reports" element={<AdReports />} />

          {/* ─── P&L ─── */}
          <Route path="/pnl"              element={<PnLOverview />} />
          <Route path="/pnl/expenses"     element={<PnLExpenses />} />
          <Route path="/pnl/income"       element={<PnLIncome />} />
          <Route path="/pnl/mileage"      element={<MileageLog />} />
          <Route path="/pnl/recurring"    element={<RecurringExpenses />} />
          <Route path="/pnl/budget"       element={<BudgetVsActual />} />
          <Route path="/pnl/tax"          element={<TaxSummary />} />
          <Route path="/pnl/costs"       element={<CostTracker />} />
          <Route path="/pnl/roi"         element={<ROIAnalytics />} />

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

          {/* ─── Email (includes Smart Campaigns) ─── */}
          <Route path="/email"             element={<EmailDashboard />} />
          <Route path="/email/builder"     element={<EmailBuilder />} />
          <Route path="/email/newsletters" element={<NewslettersPage />} />
          <Route path="/email/templates"   element={<EmailTemplates />} />
          <Route path="/email/campaigns"       element={<SmartCampaigns />} />
          <Route path="/email/campaigns/queue" element={<SmartCampaigns />} />
          <Route path="/email/campaigns/enrollments" element={<SmartCampaigns />} />
          <Route path="/email/campaigns/history" element={<SmartCampaigns />} />
          <Route path="/email/campaigns/templates" element={<SmartCampaigns />} />
          <Route path="/email/sent"        element={<SentHistory />} />

          {/* ─── Legacy campaign redirects ─── */}
          <Route path="/campaigns"            element={<Navigate to="/email/campaigns" replace />} />
          <Route path="/campaigns/manage"     element={<Navigate to="/email/campaigns" replace />} />
          <Route path="/campaigns/queue"      element={<Navigate to="/email/campaigns/queue" replace />} />
          <Route path="/campaigns/enrollments" element={<Navigate to="/email/campaigns/enrollments" replace />} />
          <Route path="/campaigns/history"    element={<Navigate to="/email/campaigns/history" replace />} />
          <Route path="/campaigns/templates"  element={<Navigate to="/email/campaigns/templates" replace />} />

          {/* ─── Vendors ─── */}
          <Route path="/vendors"           element={<Vendors />} />

          {/* ─── Notifications ─── */}
          <Route path="/notifications"     element={<Notifications />} />

          {/* ─── Settings ─── */}
          <Route path="/settings"          element={<Settings />} />
          <Route path="/settings/recovery" element={<Recovery />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}

function LoginGate() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <Login />
}

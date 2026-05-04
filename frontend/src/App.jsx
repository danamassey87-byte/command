import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { BrandProvider } from './lib/BrandContext'
import { NotesProvider } from './lib/NotesContext'
import { FavoritesProvider } from './lib/FavoritesContext'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/layout/Layout'
import ReviewsAndReferrals from './components/ReviewsPanel.jsx'

// ─── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Login = lazy(() => import('./pages/Login/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'))
const DailyTracker = lazy(() => import('./pages/DailyTracker/DailyTracker'))
const ListingAppts = lazy(() => import('./pages/ListingAppts/ListingAppts'))
const Buyers = lazy(() => import('./pages/Buyers/Buyers'))
const Sellers = lazy(() => import('./pages/Sellers/Sellers'))
const SellerClients = lazy(() => import('./pages/Sellers/SellerClients'))
const Investors = lazy(() => import('./pages/Investors/Investors'))
const LeadGen = lazy(() => import('./pages/LeadGen/LeadGen'))
const BuyerShowings = lazy(() => import('./pages/BuyerShowings/BuyerShowings'))
const SellerShowings = lazy(() => import('./pages/SellerShowings/SellerShowings'))
const Properties = lazy(() => import('./pages/Properties/Properties'))
const OpenHouses = lazy(() => import('./pages/OpenHouses/OpenHouses'))
const ContentCalendar = lazy(() => import('./pages/ContentCalendar/ContentCalendar'))
const Stats = lazy(() => import('./pages/Stats/Stats'))
const Goals = lazy(() => import('./pages/Goals/Goals'))
const ContentPlanner = lazy(() => import('./pages/ContentPlanner/ContentPlanner'))
const Settings = lazy(() => import('./pages/Settings/Settings'))
const Recovery = lazy(() => import('./pages/Recovery/Recovery'))
const SystemHealth = lazy(() => import('./pages/SystemHealth/SystemHealth'))
const PostClose = lazy(() => import('./pages/PostClose/PostClose.jsx'))
const MediaLibrary = lazy(() => import('./pages/MediaLibrary/MediaLibrary.jsx'))
const HomeValue = lazy(() => import('./pages/HomeValue/HomeValue.jsx'))
const PrintDelivery = lazy(() => import('./pages/PrintDelivery/PrintDelivery.jsx'))
const SeoAeo = lazy(() => import('./pages/SeoAeo/SeoAeo.jsx'))
const AIAssistant = lazy(() => import('./pages/AIAssistant/AIAssistant.jsx'))
const Onboarding = lazy(() => import('./pages/Onboarding/Onboarding.jsx'))
const ContactProfile = lazy(() => import('./pages/ContactProfile/ContactProfile.jsx'))
const ListingPlan = lazy(() => import('./pages/ListingPlan/ListingPlan'))
const BioLinkBuilder = lazy(() => import('./pages/BioLink/BioLinkBuilder'))
const EmailBuilder = lazy(() => import('./pages/EmailBuilder/EmailBuilder'))
const NewslettersPage = lazy(() => import('./pages/Newsletters/Newsletters'))
const IntakeForms = lazy(() => import('./pages/IntakeForms/IntakeForms'))
const PublicForm = lazy(() => import('./pages/PublicForm/PublicForm'))
const BioLinkPublic = lazy(() => import('./pages/BioLink/BioLinkPublic'))
const OHSignIn = lazy(() => import('./pages/OHSignIn/OHSignIn'))
const OHBriefing = lazy(() => import('./pages/OHBriefing/OHBriefing'))
const OHHostReport = lazy(() => import('./pages/OHBriefing/OHHostReport'))
const GoogleCallback = lazy(() => import('./pages/Auth/GoogleCallback'))
const Notifications = lazy(() => import('./pages/Notifications/Notifications'))
const CalendarSchedule = lazy(() => import('./pages/Calendar/CalendarSchedule'))
const TodayShowings = lazy(() => import('./pages/Calendar/TodayShowings'))
const CalendarTasks = lazy(() => import('./pages/Calendar/Tasks'))
const SocialDashboard = lazy(() => import('./pages/Content/SocialDashboard'))
const AIStudio = lazy(() => import('./pages/AIStudio/AIStudio'))
const PostComposer = lazy(() => import('./pages/PostComposer/PostComposer'))
const HashtagBank = lazy(() => import('./pages/HashtagBank/HashtagBank'))
const KeywordTracker = lazy(() => import('./pages/KeywordTracker/KeywordTracker'))
const InspoRecreator = lazy(() => import('./pages/InspoRecreator/InspoRecreator'))
const GammaPresentations = lazy(() => import('./pages/GammaPresentations/GammaPresentations'))
const VideoStudio = lazy(() => import('./pages/VideoStudio/VideoStudio'))
const AdsManager = lazy(() => import('./pages/Ads/AdsManager'))
const AdReports = lazy(() => import('./pages/Ads/AdReports'))

// ─── Content Hub (new unified structure) ──────────────────────────────────────
const ContentHub = lazy(() => import('./pages/ContentHub/ContentHub'))
const PlanTab = lazy(() => import('./pages/ContentHub/PlanTab'))
const CreateTab = lazy(() => import('./pages/ContentHub/CreateTab'))
const PublishTab = lazy(() => import('./pages/ContentHub/PublishTab'))
const MeasureTab = lazy(() => import('./pages/ContentHub/MeasureTab'))
const ContentBank = lazy(() => import('./pages/ContentHub/ContentBank'))
const ContentSettingsTab = lazy(() => import('./pages/ContentHub/ContentSettingsTab'))
const Vendors = lazy(() => import('./pages/Vendors/Vendors'))

// ─── Section Dashboards ────────────────────────────────────────────────────────
const CrmDashboard = lazy(() => import('./pages/CRM/CrmDashboard'))
const PipelineDashboard = lazy(() => import('./pages/Pipeline/PipelineDashboard'))
const ProspectingDashboard = lazy(() => import('./pages/Prospecting/ProspectingDashboard'))
const ContentDashboard = lazy(() => import('./pages/Content/ContentDashboard'))
const CalendarDashboard = lazy(() => import('./pages/Calendar/CalendarDashboard'))
const EmailDashboard = lazy(() => import('./pages/Email/EmailDashboard'))
const SentHistory = lazy(() => import('./pages/Email/SentHistory'))
const EmailReporting = lazy(() => import('./pages/Email/EmailReporting'))
const CampaignsDashboard = lazy(() => import('./pages/Campaigns/CampaignsDashboard'))
const ResourcesDashboard = lazy(() => import('./pages/Resources/ResourcesDashboard'))
const AppraiserPackage = lazy(() => import('./pages/Resources/AppraiserPackage'))
const BioLinkDashboard = lazy(() => import('./pages/BioLink/BioLinkDashboard'))

// ─── Pipeline Pages ─────────────────────────────────────────────────────────
const PipelineBoard = lazy(() => import('./pages/Pipeline/Pipeline'))
const EscrowTracker = lazy(() => import('./pages/Pipeline/EscrowTracker'))
const ClosedDeals = lazy(() => import('./pages/Pipeline/ClosedDeals'))
const SellerSOP = lazy(() => import('./pages/Pipeline/SellerSOP'))
const BuyerSOP = lazy(() => import('./pages/Pipeline/BuyerSOP'))

// ─── Daily Tasks ─────────────────────────────────────────────────────────────
const DailyTasks = lazy(() => import('./pages/Tasks/DailyTasks'))

// ─── Notes ──────────────────────────────────────────────────────────────────
const Notes = lazy(() => import('./pages/Notes/Notes'))

// ─── Expired / Cannonball Tracker ─────────────────────────────────────────────
const ExpiredCannonball = lazy(() => import('./pages/Prospecting/ExpiredCannonball'))

// ─── Prospecting Pages ──────────────────────────────────────────────────────
const AllProspects = lazy(() => import('./pages/Prospecting/AllProspects'))
const FsboLeads = lazy(() => import('./pages/Prospecting/FsboLeads'))
const CircleProspecting = lazy(() => import('./pages/Prospecting/CircleProspecting'))
const PersonalCircle = lazy(() => import('./pages/Prospecting/PersonalCircle'))
const Referrals = lazy(() => import('./pages/Prospecting/Referrals'))
const OHLeads = lazy(() => import('./pages/Prospecting/OHLeads'))
const BioLinkLeads = lazy(() => import('./pages/Prospecting/BioLinkLeads'))

// ─── Smart Campaigns ────────────────────────────────────────────────────────
const SmartCampaigns = lazy(() => import('./pages/Campaigns/SmartCampaigns'))

// ─── Database (Contact Hub) ──────────────────────────────────────────────────
const Database = lazy(() => import('./pages/Database/Database'))
const OnHoldContacts = lazy(() => import('./pages/OnHoldContacts/OnHoldContacts'))

// ─── Net Sheet ──────────────────────────────────────────────────────────────
const NetSheet = lazy(() => import('./pages/NetSheet/NetSheet'))

// ─── P&L Pages ──────────────────────────────────────────────────────────────
const PnLOverview = lazy(() => import('./pages/PnL/PnLOverview'))
const PnLExpenses = lazy(() => import('./pages/PnL/Expenses'))
const PnLIncome   = lazy(() => import('./pages/PnL/Income'))
const MileageLog  = lazy(() => import('./pages/PnL/MileageLog'))
const TaxSummary  = lazy(() => import('./pages/PnL/TaxSummary'))
const RecurringExpenses = lazy(() => import('./pages/PnL/RecurringExpenses'))
const BudgetVsActual = lazy(() => import('./pages/PnL/BudgetVsActual'))
const CostTracker = lazy(() => import('./pages/PnL/CostTracker'))
const ROIAnalytics = lazy(() => import('./pages/PnL/ROIAnalytics'))

// ─── Loading spinner (brand-styled) ────────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: '60vh',
      backgroundColor: 'var(--cream)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--cream)',
        borderTopColor: 'var(--brown-dark)',
        borderRadius: '50%',
        animation: 'app-spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes app-spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

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
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function OnboardingGate({ children }) {
  const { onboardingComplete, demoMode } = useAuth()
  const location = useLocation()

  // Demo users and users already on /onboarding skip the gate
  if (demoMode || location.pathname === '/onboarding') return children
  // Still loading onboarding status
  if (onboardingComplete === null) return <PageLoader />
  // Redirect to onboarding if not complete
  if (!onboardingComplete) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public client-facing pages (unauthed) */}
        <Route path="/form/:slug" element={<PublicForm />} />
        <Route path="/p/:slug" element={<BioLinkPublic />} />
        <Route path="/oh-signin/:openHouseId" element={<OHSignIn />} />
        <Route path="/oh/:openHouseId/briefing"    element={<OHBriefing />} />
        <Route path="/oh/:openHouseId/host-report" element={<OHHostReport />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        <Route path="/login" element={<LoginGate />} />
        <Route element={<ProtectedRoute><OnboardingGate><BrandProvider><NotesProvider><FavoritesProvider><Layout /></FavoritesProvider></NotesProvider></BrandProvider></OnboardingGate></ProtectedRoute>}>
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
          <Route path="/prospecting/oh-leads"      element={<OHLeads />} />
          <Route path="/prospecting/bio-link"      element={<BioLinkLeads />} />

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

          {/* ─── Top-level nav aliases (sidebar shortcuts) ─── */}
          <Route path="/listing-appts"    element={<ListingAppts />} />
          <Route path="/sellers"          element={<Sellers />} />
          <Route path="/seller-showings"  element={<SellerShowings />} />
          <Route path="/listing-plan"     element={<ListingPlan />} />
          <Route path="/buyers"           element={<Buyers />} />
          <Route path="/buyer-showings"   element={<BuyerShowings />} />
          <Route path="/properties"       element={<Properties />} />
          <Route path="/database"         element={<Database />} />
          <Route path="/on-hold"          element={<OnHoldContacts />} />
          <Route path="/investors"        element={<Investors />} />

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
            <Route path="settings" element={<ContentSettingsTab />} />
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
          <Route path="/resources/email"   element={<Navigate to="/email/builder" replace />} />
          <Route path="/resources/sms"     element={<Navigate to="/email/builder" replace />} />
          <Route path="/resources/appraiser-package" element={<AppraiserPackage />} />

          {/* ─── Link in Bio ─── */}
          <Route path="/bio-link"          element={<BioLinkDashboard />} />
          <Route path="/bio-link/page"     element={<BioLinkBuilder />} />
          <Route path="/bio-link/forms"    element={<Navigate to="/bio-link/page" replace />} />
          <Route path="/bio-link/guides"   element={<Navigate to="/bio-link/page" replace />} />
          <Route path="/bio-link/drips"    element={<Navigate to="/email/campaigns" replace />} />
          <Route path="/bio-link/leads"    element={<Navigate to="/database" replace />} />

          {/* ─── Email (includes Smart Campaigns) ─── */}
          <Route path="/email"             element={<EmailDashboard />} />
          <Route path="/email/builder"     element={<EmailBuilder />} />
          <Route path="/email/newsletters" element={<NewslettersPage />} />
          <Route path="/email/templates"   element={<Navigate to="/email/builder" replace />} />
          <Route path="/email/campaigns"       element={<SmartCampaigns />} />
          <Route path="/email/campaigns/queue" element={<SmartCampaigns />} />
          <Route path="/email/campaigns/enrollments" element={<SmartCampaigns />} />
          <Route path="/email/campaigns/history" element={<SmartCampaigns />} />
          <Route path="/email/campaigns/templates" element={<SmartCampaigns />} />
          <Route path="/email/sent"        element={<SentHistory />} />
          <Route path="/email/reporting"  element={<EmailReporting />} />

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

          {/* ─── Reviews & Referrals ─── */}
          <Route path="/reviews"           element={<ReviewsAndReferrals />} />

          {/* ─── Post-Close ─── */}
          <Route path="/post-close"        element={<PostClose />} />

          {/* ─── Media Library ─── */}
          <Route path="/media"             element={<MediaLibrary />} />

          {/* ─── Home Value / Seller Leads ─── */}
          <Route path="/home-value"        element={<HomeValue />} />

          {/* ─── Print & Delivery ─── */}
          <Route path="/print"             element={<PrintDelivery />} />

          {/* ─── SEO & AEO ─── */}
          <Route path="/seo"               element={<SeoAeo />} />

          {/* ─── AI Assistant ─── */}
          <Route path="/ai"                element={<AIAssistant />} />

          {/* ─── Onboarding ─── */}
          <Route path="/onboarding"        element={<Onboarding />} />

          {/* ─── Contact Profile ─── */}
          <Route path="/contact/:id"       element={<ContactProfile />} />

          {/* ─── Settings ─── */}
          <Route path="/settings"          element={<Settings />} />
          <Route path="/settings/system"  element={<SystemHealth />} />
          <Route path="/settings/recovery" element={<Recovery />} />
          <Route path="/settings/intake-forms" element={<IntakeForms />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
    </AuthProvider>
  )
}

function LoginGate() {
  const { user, loading, demoMode } = useAuth()
  if (loading) return null
  if (user || demoMode) return <Navigate to="/" replace />
  return <Login />
}

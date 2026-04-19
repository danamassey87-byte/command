import { useState, useCallback, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNav, { MobileMenuContext } from './TopNav'
import GlobalSearch from './GlobalSearch'
import QuickAddContact from './QuickAddContact'
import ContextSidebar, { getActiveSection } from './ContextSidebar'
import DockPanel from './DockPanel'
import FavoritesTray from './FavoritesTray'
import NotesWidget from './NotesWidget'
import { useNotesContext } from '../../lib/NotesContext'
import { syncListingContentReminders } from '../../lib/safeguards'
import DemoBanner from '../DemoBanner'
import './Layout.css'

const pageTitles = {
  '/':                   'Dashboard',
  '/dashboard/daily':    'Daily Tracker',
  '/dashboard/appts':    'Listing Appointments',
  '/tasks':              'Daily Tasks',
  '/tasks/vendors':      'Vendors',
  '/prospecting':             'Prospecting',
  '/prospecting/expired':     'Expired Listings',
  '/prospecting/fsbo':        'FSBO Leads',
  '/prospecting/circle':      'Circle Prospecting',
  '/prospecting/soi':         'Personal Circle',
  '/prospecting/referrals':   'Referrals',
  '/prospecting/oh-leads':    'Open House Leads',
  '/crm':                'CRM',
  '/crm/buyers':         'Buyers',
  '/crm/sellers':        'Sellers',
  '/crm/investors':      'Investors',
  '/crm/leads':          'Lead Gen',
  '/pipeline':            'Pipeline',
  '/pipeline/board':      'Deal Board',
  '/pipeline/buyer-sop':  'Buyer Playbook',
  '/pipeline/seller-sop': 'Seller Playbook',
  '/pipeline/escrow':     'Escrow Tracker',
  '/pipeline/closed':     'Closed Deals',
  '/crm/showings':         'Buyer Showings',
  '/crm/seller-showings':  'Listing Showings',
  '/crm/listing-plan':     'Listing Plan',
  '/crm/properties':       'Properties',
  '/crm/intake-forms':     'Intake Forms',
  '/crm/database':         'Contact Database',
  '/calendar':             'Calendar',
  '/calendar/schedule':    'Full Schedule',
  '/calendar/today':       'Today\'s Showings',
  '/calendar/tasks':       'Tasks',
  '/calendar/notes':       'Notes',
  '/open-houses':        'Open Houses',
  '/content':            'Content',
  '/content/calendar':   'Content Calendar',
  '/content/planning':   'Content Planning',
  '/content/templates':  'Content Templates',
  '/content/social':     'Social Media',
  '/content/ai-studio':  'Content Studio',
  '/content/stats':      'Content Stats',
  '/pnl':                'P&L Overview',
  '/pnl/expenses':       'Expenses',
  '/pnl/income':         'Income',
  '/pnl/recurring':      'Recurring Expenses',
  '/pnl/mileage':        'Mileage Log',
  '/pnl/budget':         'Budget vs Actual',
  '/pnl/tax':            'Tax Summary',
  '/net-sheet':          'Net Sheet',
  '/market':             'Market Report',
  '/goals':              'Goals & KPIs',
  '/bio-link':           'Link in Bio',
  '/bio-link/page':      'My Page',
  '/bio-link/forms':     'Links & Forms',
  '/bio-link/guides':    'Guides',
  '/bio-link/drips':     'Drip Campaigns',
  '/bio-link/leads':     'Leads Captured',
  '/campaigns':              'Smart Campaigns',
  '/campaigns/manage':       'My Campaigns',
  '/campaigns/queue':        'Send Queue',
  '/campaigns/enrollments':  'Enrollments',
  '/campaigns/history':      'Campaign History',
  '/campaigns/templates':    'Campaign Templates',
  '/email':              'Email',
  '/email/builder':      'Email Builder',
  '/email/templates':    'Email Templates',
  '/email/newsletters':  'Newsletters',
  '/email/campaigns':    'Campaigns',
  '/email/sent':         'Sent Emails',
  '/resources':          'Resource Hub',
  '/resources/email':    'Email Templates',
  '/resources/sms':      'SMS Templates',
  '/settings':           'Settings',
  '/settings/intake-forms': 'Intake Forms',
  '/email/reporting':    'Email Reporting',
  '/listing-appts':      'Listing Appointments',
  '/sellers':            'Sellers',
  '/seller-showings':    'Listing Showings',
  '/listing-plan':       'Listing Plan',
  '/buyers':             'Buyers',
  '/buyer-showings':     'Buyer Showings',
  '/properties':         'Properties',
  '/database':           'Contact Database',
  '/on-hold':            'On Hold',
  '/investors':          'Investors',
}

export default function Layout() {
  const { pathname } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { dockOpen } = useNotesContext()

  const title = pageTitles[pathname] ?? pageTitles['/' + pathname.split('/').slice(1, 2).join('/')] ?? 'COMMAND'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const section = getActiveSection(pathname)
  const sidebarSections = ['home', 'prospect', 'people', 'deals', 'content', 'email', 'campaigns', 'biolink', 'money', 'toolkit']
  const showSidebar = sidebarSections.includes(section)

  // Cmd+N to open quick-add contact
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n' && !e.shiftKey) {
        // Don't intercept if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return
        e.preventDefault()
        setQuickAddOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Periodically scan for listings missing a content plan and emit reminders.
  // Runs once on mount + every 30 minutes thereafter. Failures are non-fatal.
  useEffect(() => {
    let cancelled = false
    const tick = () => {
      syncListingContentReminders({ minAgeDays: 1 }).catch(e => {
        if (!cancelled) console.error('syncListingContentReminders failed:', e)
      })
    }
    tick()
    const interval = setInterval(tick, 30 * 60 * 1000) // 30 min
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const ctxValue = {
    mobileMenuOpen,
    setMobileMenuOpen: useCallback((v) => setMobileMenuOpen(v), []),
    mobileSidebarOpen,
    setMobileSidebarOpen: useCallback((v) => setMobileSidebarOpen(v), []),
  }

  return (
    <MobileMenuContext.Provider value={ctxValue}>
      <DemoBanner />
      <div className="layout">
        <TopNav />
        <div className={`layout__body ${showSidebar ? 'layout__body--with-sidebar' : ''}`}>
          {showSidebar && <ContextSidebar />}
          <div className="layout__main">
            <header className="layout__header">
              <div>
                <h1 className="layout__page-title">{title}</h1>
                <p className="layout__date">{today}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GlobalSearch />
                <button onClick={() => setQuickAddOpen(true)} style={{
                  padding: '6px 12px', background: 'var(--brown-mid)', color: '#fff',
                  borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                }}>+ Contact</button>
              </div>
              {/* Mobile sidebar toggle — only shows when section has sub-pages */}
              {showSidebar && (
                <button
                  className="layout__sidebar-toggle"
                  onClick={() => setMobileSidebarOpen(prev => !prev)}
                  aria-label="Toggle section menu"
                >
                  ☰ Menu
                </button>
              )}
            </header>
            <main className="layout__content">
              <Outlet />
            </main>
          </div>
          {dockOpen && <DockPanel />}
        </div>
        <FavoritesTray />
        <NotesWidget />
        <QuickAddContact open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      </div>
    </MobileMenuContext.Provider>
  )
}

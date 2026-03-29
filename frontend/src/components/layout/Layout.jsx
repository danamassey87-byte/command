import { useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNav, { MobileMenuContext } from './TopNav'
import ContextSidebar, { getActiveSection } from './ContextSidebar'
import './Layout.css'

const pageTitles = {
  '/':                   'Dashboard',
  '/dashboard/daily':    'Daily Tracker',
  '/dashboard/appts':    'Listing Appointments',
  '/prospecting':             'All Prospects',
  '/prospecting/expired':     'Expired / Cannonball',
  '/prospecting/fsbo':        'FSBO Leads',
  '/prospecting/circle':      'Circle Prospecting',
  '/prospecting/soi':         'Personal Circle',
  '/prospecting/referrals':   'Referrals',
  '/prospecting/oh-leads':    'Open House Leads',
  '/crm':                'All Contacts',
  '/crm/buyers':         'Buyers',
  '/crm/sellers':        'Sellers',
  '/crm/investors':      'Investors',
  '/crm/leads':          'Lead Gen',
  '/pipeline':            'Pipeline',
  '/pipeline/buyer-sop':  'Buyer SOP',
  '/pipeline/seller-sop': 'Seller SOP',
  '/pipeline/escrow':     'Escrow Tracker',
  '/pipeline/closed':     'Closed Deals',
  '/crm/showings':         'Buyer Showings',
  '/crm/seller-showings':  'Listing Showings',
  '/crm/listing-plan':     'Listing Plan',
  '/crm/properties':       'Properties',
  '/calendar':             'Calendar',
  '/calendar/today':       'Today\'s Showings',
  '/calendar/tasks':       'Tasks',
  '/open-houses':        'Open Houses',
  '/content':            'Content Pillars',
  '/content/calendar':   'Content Calendar',
  '/content/planning':   'Content Planning',
  '/content/templates':  'Content Templates',
  '/content/ai-studio':  'AI Studio',
  '/content/stats':      'Content Stats',
  '/pnl':                'P&L Overview',
  '/pnl/expenses':       'Expenses',
  '/pnl/income':         'Income',
  '/net-sheet':          'Net Sheet',
  '/market':             'Market Report',
  '/goals':              'Goals & KPIs',
  '/bio-link':           'My Page',
  '/bio-link/forms':     'Links & Forms',
  '/bio-link/guides':    'Guides',
  '/bio-link/drips':     'Drip Campaigns',
  '/bio-link/leads':     'Leads Captured',
  '/email':              'Email Builder',
  '/email/templates':    'Email Templates',
  '/email/campaigns':    'Campaigns',
  '/email/sent':         'Sent Emails',
  '/resources':          'Resource Hub',
  '/resources/email':    'Email Templates',
  '/resources/sms':      'SMS Templates',
  '/settings':           'Settings',
}

export default function Layout() {
  const { pathname } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const title = pageTitles[pathname] ?? pageTitles['/' + pathname.split('/').slice(1, 2).join('/')] ?? 'COMMAND'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const section = getActiveSection(pathname)
  const sidebarSections = ['dashboard', 'prospecting', 'crm', 'pipeline', 'calendar', 'content', 'pnl', 'bio-link', 'email', 'resources']
  const showSidebar = sidebarSections.includes(section)

  const ctxValue = {
    mobileMenuOpen,
    setMobileMenuOpen: useCallback((v) => setMobileMenuOpen(v), []),
    mobileSidebarOpen,
    setMobileSidebarOpen: useCallback((v) => setMobileSidebarOpen(v), []),
  }

  return (
    <MobileMenuContext.Provider value={ctxValue}>
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
        </div>
      </div>
    </MobileMenuContext.Provider>
  )
}

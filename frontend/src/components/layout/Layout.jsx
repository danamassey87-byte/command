import { useState, useCallback } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNav, { MobileMenuContext } from './TopNav'
import ContextSidebar, { getActiveSection } from './ContextSidebar'
import DockPanel from './DockPanel'
import FavoritesTray from './FavoritesTray'
import { useNotesContext } from '../../lib/NotesContext'
import './Layout.css'

const pageTitles = {
  '/':                   'Dashboard',
  '/dashboard/daily':    'Daily Tracker',
  '/dashboard/appts':    'Listing Appointments',
  '/tasks':              'Daily Tasks',
  '/tasks/vendors':      'Vendors',
  '/prospecting':             'Prospecting',
  '/prospecting/expired':     'Expired / Cannonball',
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
  '/content/ai-studio':  'AI Studio',
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
  const { dockOpen } = useNotesContext()

  const title = pageTitles[pathname] ?? pageTitles['/' + pathname.split('/').slice(1, 2).join('/')] ?? 'COMMAND'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  const section = getActiveSection(pathname)
  const sidebarSections = ['home', 'prospect', 'people', 'deals', 'content', 'money', 'toolkit']
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
          {dockOpen && <DockPanel />}
        </div>
        <FavoritesTray />
      </div>
    </MobileMenuContext.Provider>
  )
}

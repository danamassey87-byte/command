import React, { useContext, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MobileMenuContext } from './TopNav'
import './ContextSidebar.css'

/* ─── Routes that are ComingSoon (greyed out in sidebar) ─── */
const COMING_SOON = new Set([
  '/prospecting/fsbo',
  '/prospecting/circle',
  '/prospecting/soi',
  '/prospecting/referrals',
  '/prospecting/oh-leads',
  '/content/templates',
  '/content/ai-studio',
  '/content/stats',
  '/resources/email',
  '/resources/sms',
  '/bio-link/forms',
  '/bio-link/guides',
  '/bio-link/drips',
  '/bio-link/leads',
  '/email/templates',
  '/email/campaigns',
  '/email/sent',
])

/* ─── Section definitions (consolidated 7-tab nav) ─── */
const SECTIONS = {
  home: {
    title: 'Home',
    items: [
      { label: 'Dashboard',      path: '/',                  icon: 'home' },
      { label: 'Daily Tracker',  path: '/dashboard/daily',   icon: 'check-square' },
      { label: 'Daily Tasks',    path: '/tasks',             icon: 'clipboard' },
      { label: 'Calendar',       path: '/calendar',          icon: 'calendar',      group: 'Schedule' },
      { label: 'Full Schedule',  path: '/calendar/schedule', icon: 'columns' },
      { label: 'Listing Appts',  path: '/dashboard/appts',   icon: 'calendar' },
      { label: 'Showings Today', path: '/calendar/today',    icon: 'eye' },
      { label: 'Tasks',          path: '/calendar/tasks',    icon: 'check-square' },
      { label: 'Notes',          path: '/calendar/notes',    icon: 'file-text' },
      { label: 'Goals & KPIs',   path: '/goals',             icon: 'target',        group: 'Goals' },
    ],
  },
  prospect: {
    title: 'Prospecting',
    items: [
      { label: 'Overview',              path: '/prospecting',           icon: 'users' },
      { label: 'Expired / Cannonball',  path: '/prospecting/expired',   icon: 'target' },
      { label: 'FSBO',                  path: '/prospecting/fsbo',      icon: 'home' },
      { label: 'Circle Prospecting',    path: '/prospecting/circle',    icon: 'map-pin' },
      { label: 'Personal Circle',       path: '/prospecting/soi',       icon: 'heart' },
      { label: 'Referrals',             path: '/prospecting/referrals', icon: 'user' },
      { label: 'Open Houses',           path: '/open-houses',           icon: 'eye',          group: 'Open Houses' },
      { label: 'Open House Leads',      path: '/prospecting/oh-leads',  icon: 'users' },
    ],
  },
  people: {
    title: 'People',
    items: [
      { label: 'Overview',         path: '/crm',                 icon: 'users' },
      { label: 'Clients',          path: '/crm/buyers',          icon: 'user',          group: 'Buyers' },
      { label: 'Showings',         path: '/crm/showings',        icon: 'eye' },
      { label: 'Properties',       path: '/crm/properties',      icon: 'map-pin' },
      { label: 'Investors',        path: '/crm/investors',       icon: 'trending-up' },
      { label: 'Listings',         path: '/crm/sellers',         icon: 'home',          group: 'Sellers' },
      { label: 'Listing Showings', path: '/crm/seller-showings', icon: 'eye' },
      { label: 'Listing Plan',     path: '/crm/listing-plan',    icon: 'zap' },
      { label: 'Intake Forms',     path: '/crm/intake-forms',    icon: 'clipboard',     group: 'Tools' },
      { label: 'Contact Database', path: '/crm/database',        icon: 'database' },
    ],
  },
  deals: {
    title: 'Deals',
    items: [
      { label: 'Overview',       path: '/pipeline',            icon: 'layers' },
      { label: 'Deal Board',     path: '/pipeline/board',      icon: 'columns' },
      { label: 'Escrow Tracker', path: '/pipeline/escrow',     icon: 'clock' },
      { label: 'Closed Deals',   path: '/pipeline/closed',     icon: 'check-circle' },
    ],
  },
  content: {
    title: 'Content',
    items: [
      { label: 'Overview',      path: '/content',             icon: 'columns' },
      { label: 'Calendar',      path: '/content/calendar',    icon: 'calendar' },
      { label: 'Planning',      path: '/content/planning',    icon: 'clipboard' },
      { label: 'Social Media',  path: '/content/social',      icon: 'trending-up' },
      { label: 'Templates',     path: '/content/templates',   icon: 'file-text' },
      { label: 'AI Studio',     path: '/content/ai-studio',   icon: 'zap' },
      { label: 'Stats',         path: '/content/stats',       icon: 'bar-chart' },
      { label: 'My Campaigns',  path: '/campaigns/manage',    icon: 'layers',        group: 'Campaigns' },
      { label: 'Send Queue',    path: '/campaigns/queue',     icon: 'clock' },
      { label: 'Enrollments',   path: '/campaigns/enrollments', icon: 'users' },
      { label: 'History',       path: '/campaigns/history',   icon: 'clipboard' },
      { label: 'Campaign Tpl',  path: '/campaigns/templates', icon: 'file-text' },
      { label: 'Email Builder', path: '/email/builder',       icon: 'zap',           group: 'Email' },
      { label: 'Email Tpl',     path: '/email/templates',     icon: 'file-text' },
      { label: 'Email Sends',   path: '/email/campaigns',     icon: 'layers' },
      { label: 'Sent',          path: '/email/sent',          icon: 'check-circle' },
      { label: 'My Page',       path: '/bio-link/page',       icon: 'link',          group: 'Link in Bio' },
      { label: 'Links & Forms', path: '/bio-link/forms',      icon: 'clipboard' },
      { label: 'Guides',        path: '/bio-link/guides',     icon: 'file-text' },
      { label: 'Drip Campaigns',path: '/bio-link/drips',      icon: 'mail' },
      { label: 'Leads Captured',path: '/bio-link/leads',      icon: 'users' },
    ],
  },
  money: {
    title: 'Money',
    items: [
      { label: 'P&L Overview',  path: '/pnl',             icon: 'dollar-sign' },
      { label: 'Expenses',      path: '/pnl/expenses',    icon: 'minus-circle' },
      { label: 'Income',        path: '/pnl/income',      icon: 'plus-circle' },
      { label: 'Recurring',     path: '/pnl/recurring',   icon: 'clock' },
      { label: 'Mileage Log',   path: '/pnl/mileage',     icon: 'map-pin' },
      { label: 'Budget',        path: '/pnl/budget',       icon: 'target' },
      { label: 'Tax Summary',   path: '/pnl/tax',          icon: 'bar-chart' },
      { label: 'Net Sheet',     path: '/net-sheet',        icon: 'clipboard',     group: 'Tools' },
      { label: 'Market Stats',  path: '/market',           icon: 'bar-chart' },
    ],
  },
  toolkit: {
    title: 'Toolkit',
    items: [
      { label: 'Resource Hub',       path: '/resources',           icon: 'link' },
      { label: 'Email Templates',    path: '/resources/email',     icon: 'mail' },
      { label: 'SMS Templates',      path: '/resources/sms',       icon: 'message-square' },
      { label: 'Buyer Playbook',     path: '/pipeline/buyer-sop',  icon: 'clipboard',     group: 'Playbooks' },
      { label: 'Seller Playbook',    path: '/pipeline/seller-sop', icon: 'clipboard' },
      { label: 'Settings',           path: '/settings',            icon: 'zap',           group: 'Settings' },
    ],
  },
}

/* Minimal feather-style SVG icons */
const ICONS = {
  'home':          <><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
  'check-square':  <><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>,
  'calendar':      <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  'users':         <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
  'user':          <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  'trending-up':   <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
  'target':        <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  'layers':        <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  'clock':         <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  'check-circle':  <><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>,
  'eye':           <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
  'columns':       <><path d="M12 3h7a2 2 0 012 2v14a2 2 0 01-2 2h-7m0-18H5a2 2 0 00-2 2v14a2 2 0 002 2h7m0-18v18"/></>,
  'clipboard':     <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></>,
  'file-text':     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  'zap':           <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>,
  'bar-chart':     <><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>,
  'dollar-sign':   <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
  'minus-circle':  <><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  'plus-circle':   <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  'link':          <><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>,
  'mail':          <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22 6 12 13 2 6"/></>,
  'message-square':<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
  'map-pin':       <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
  'heart':         <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></>,
  'database':      <><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/></>,
}

export function getActiveSection(pathname) {
  if (pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/goals') || pathname.startsWith('/calendar') || pathname.startsWith('/tasks')) return 'home'
  if (pathname.startsWith('/prospecting') || pathname.startsWith('/open-houses')) return 'prospect'
  if (pathname.startsWith('/crm'))         return 'people'
  // SOP/playbook routes live under toolkit, not deals
  if (pathname === '/pipeline/buyer-sop' || pathname === '/pipeline/seller-sop') return 'toolkit'
  if (pathname.startsWith('/pipeline'))    return 'deals'
  if (pathname.startsWith('/content') || pathname.startsWith('/campaigns') || pathname.startsWith('/email') || pathname.startsWith('/bio-link')) return 'content'
  if (pathname.startsWith('/pnl') || pathname.startsWith('/net-sheet') || pathname.startsWith('/market')) return 'money'
  if (pathname.startsWith('/resources') || pathname.startsWith('/settings')) return 'toolkit'
  return 'home'
}

export default function ContextSidebar() {
  const { pathname } = useLocation()
  const { mobileSidebarOpen, setMobileSidebarOpen } = useContext(MobileMenuContext)
  const sectionKey = getActiveSection(pathname)
  const section = SECTIONS[sectionKey]

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileSidebarOpen(false)
  }, [pathname, setMobileSidebarOpen])

  // Single-page sections don't need a sidebar
  if (!section || section.items.length <= 1) return null

  // Determine which paths need "end" matching (dashboard-level overview routes)
  const endPaths = new Set([
    '/', '/crm', '/pipeline', '/calendar', '/content', '/pnl',
    '/prospecting', '/bio-link', '/campaigns', '/email', '/resources',
    '/goals', '/tasks', '/open-houses', '/net-sheet', '/market', '/settings',
  ])

  return (
    <>
      {/* Desktop sidebar (always visible) + Mobile sidebar (conditionally visible) */}
      {mobileSidebarOpen && (
        <div className="ctx-sidebar__overlay" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <aside className={`ctx-sidebar ${mobileSidebarOpen ? 'ctx-sidebar--open' : ''}`}>
        <h3 className="ctx-sidebar__title">{section.title}</h3>
        <nav className="ctx-sidebar__nav">
          {section.items.map(item => {
            const isComingSoon = COMING_SOON.has(item.path)
            return (
              <React.Fragment key={item.path}>
                {item.group && <span className="ctx-sidebar__group-label">{item.group}</span>}
                <NavLink
                  to={item.path}
                  end={endPaths.has(item.path)}
                  className={({ isActive }) =>
                    `ctx-sidebar__link ${isActive ? 'ctx-sidebar__link--active' : ''} ${isComingSoon ? 'ctx-sidebar__link--coming-soon' : ''}`
                  }
                >
                  <span className="ctx-sidebar__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      {ICONS[item.icon]}
                    </svg>
                  </span>
                  <span className="ctx-sidebar__label">{item.label}</span>
                  {isComingSoon && <span className="ctx-sidebar__soon-badge">Soon</span>}
                </NavLink>
              </React.Fragment>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

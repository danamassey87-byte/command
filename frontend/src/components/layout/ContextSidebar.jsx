import React, { useContext, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { MobileMenuContext } from './TopNav'
import './ContextSidebar.css'

/* ─── Routes that are ComingSoon (greyed out in sidebar) ─── */
const COMING_SOON = new Set([
  '/content/templates',
  '/content/stats',
  '/resources/email',
  '/resources/sms',
])

/* ─── Section definitions (consolidated 7-tab nav) ─── */
const SECTIONS = {
  home: {
    title: 'Home',
    items: [
      { label: 'Dashboard',      path: '/',                  icon: 'home' },
      { label: 'Goals & KPIs',   path: '/goals',             icon: 'target' },
      { label: 'Daily Tracker',  path: '/dashboard/daily',   icon: 'check-square' },
      { label: 'Daily Tasks',    path: '/tasks',             icon: 'clipboard' },
      { label: 'Calendar',       path: '/calendar',          icon: 'calendar',      group: 'Schedule' },
      { label: 'Full Schedule',  path: '/calendar/schedule', icon: 'columns' },
      { label: 'Listing Appts',  path: '/dashboard/appts',   icon: 'calendar' },
      { label: 'Showings Today', path: '/calendar/today',    icon: 'eye' },
      { label: 'Tasks',          path: '/calendar/tasks',    icon: 'check-square' },
      { label: 'Notes',          path: '/calendar/notes',    icon: 'file-text' },
    ],
  },
  prospect: {
    title: 'Prospecting',
    items: [
      { label: 'Overview',              path: '/prospecting',           icon: 'users' },
      { label: 'All Prospects',         path: '/prospecting/all',       icon: 'database' },
      { label: 'Expired Listings',      path: '/prospecting/expired',   icon: 'target' },
      { label: 'FSBO',                  path: '/prospecting/fsbo',      icon: 'home' },
      { label: 'Circle Prospecting',    path: '/prospecting/circle',    icon: 'map-pin' },
      { label: 'Personal Circle',       path: '/prospecting/soi',       icon: 'heart' },
      { label: 'Referrals',             path: '/prospecting/referrals', icon: 'user' },
      { label: 'OH Prospecting',          path: '/prospecting/oh-leads',  icon: 'users',        group: 'Open Houses' },
      { label: 'Open Houses',            path: '/open-houses',           icon: 'eye' },
      { label: 'Home Value',             path: '/home-value',            icon: 'home',         group: 'Seller Leads' },
    ],
  },
  people: {
    title: 'CRM',
    items: [
      { label: 'Overview',         path: '/crm',                 icon: 'users' },
      { label: 'Listing Appts',    path: '/listing-appts',       icon: 'clipboard',     group: 'Sellers' },
      { label: 'Listings',         path: '/sellers',             icon: 'home' },
      { label: 'Listing Showings', path: '/seller-showings',     icon: 'eye' },
      { label: 'Listing Plan',     path: '/listing-plan',        icon: 'zap' },
      { label: 'Clients',          path: '/buyers',              icon: 'user',          group: 'Buyers' },
      { label: 'Showings',         path: '/buyer-showings',      icon: 'eye' },
      { label: 'Properties',       path: '/properties',          icon: 'map-pin' },
      { label: 'Contact Database', path: '/database',            icon: 'database',      group: 'Overall' },
      { label: 'On Hold',          path: '/on-hold',             icon: 'clock' },
      { label: 'Vendors',          path: '/vendors',             icon: 'users' },
      { label: 'Investors',        path: '/investors',           icon: 'trending-up' },
      { label: 'Reviews',          path: '/reviews',             icon: 'target',        group: 'Sphere' },
      { label: 'Post-Close',       path: '/post-close',          icon: 'check-circle' },
      { label: 'Print & Mail',     path: '/print',               icon: 'clipboard' },
    ],
  },
  deals: {
    title: 'Deals',
    items: [
      { label: 'Overview',       path: '/pipeline',            icon: 'layers' },
      { label: 'Deal Board',     path: '/pipeline/board',      icon: 'columns' },
      { label: 'Escrow Tracker', path: '/pipeline/escrow',     icon: 'clock' },
      { label: 'Closed Deals',   path: '/pipeline/closed',     icon: 'check-circle' },
      { label: 'Post-Close',     path: '/post-close',          icon: 'check-circle',  group: 'After Close' },
    ],
  },
  content: {
    title: 'Content',
    items: [
      { label: 'Plan',          path: '/content/plan',        icon: 'calendar' },
      { label: 'Create',        path: '/content/create',      icon: 'zap' },
      { label: 'Publish',       path: '/content/publish',     icon: 'columns' },
      { label: 'Measure',       path: '/content/measure',     icon: 'bar-chart' },
      { label: 'Content Bank',  path: '/content/bank',        icon: 'database' },
      { label: 'Media Library', path: '/media',               icon: 'columns',       group: 'Assets' },
      { label: 'SEO & AEO',    path: '/seo',                icon: 'trending-up',   group: 'Growth' },
      { label: 'Ads Manager',   path: '/content/ads',         icon: 'target',        group: 'Ads' },
      { label: 'Ad Reports',    path: '/content/ads/reports', icon: 'bar-chart-2' },
      { label: 'Content Settings', path: '/content/settings', icon: 'zap',          group: 'Settings' },
    ],
  },
  email: {
    title: 'Email',
    items: [
      { label: 'Overview',      path: '/email',               icon: 'mail' },
      { label: 'Email Builder', path: '/email/builder',       icon: 'zap' },
      { label: 'Newsletters',   path: '/email/newsletters',   icon: 'file-text' },
      { label: 'Smart Campaigns', path: '/email/campaigns',   icon: 'layers',        group: 'Campaigns' },
      { label: 'Send Queue',    path: '/email/campaigns/queue',       icon: 'clock' },
      { label: 'Enrollments',   path: '/email/campaigns/enrollments', icon: 'users' },
      { label: 'Send Log',      path: '/email/sent',          icon: 'check-circle',  group: 'Tracking' },
      { label: 'Reporting',     path: '/email/reporting',     icon: 'bar-chart-2' },
    ],
  },
  biolink: {
    title: 'Bio Link',
    items: [
      { label: 'Overview',      path: '/bio-link',            icon: 'link' },
      { label: 'My Page',       path: '/bio-link/page',       icon: 'columns' },
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
      { label: 'Cost Tracker',  path: '/pnl/costs',       icon: 'clipboard',     group: 'Tracking' },
      { label: 'ROI Analytics', path: '/pnl/roi',         icon: 'trending-up' },
      { label: 'Net Sheet',     path: '/net-sheet',        icon: 'clipboard',     group: 'Tools' },
      { label: 'Market Stats',  path: '/market',           icon: 'bar-chart' },
    ],
  },
  toolkit: {
    title: 'Toolkit',
    items: [
      { label: 'Resource Hub',       path: '/resources',           icon: 'link',          group: 'Resources' },
      { label: 'Email Templates',    path: '/resources/email',     icon: 'mail' },
      { label: 'SMS Templates',      path: '/resources/sms',       icon: 'message-square' },
      { label: 'Buyer Playbook',     path: '/pipeline/buyer-sop',  icon: 'clipboard',     group: 'Playbooks' },
      { label: 'Seller Playbook',    path: '/pipeline/seller-sop', icon: 'clipboard' },
      { label: 'Settings',           path: '/settings',            icon: 'zap',           group: 'Settings' },
      { label: 'System Health',     path: '/settings/system',     icon: 'bar-chart' },
      { label: 'AI Assistant',      path: '/ai',                  icon: 'zap',           group: 'AI' },
    ],
  },
}

/* Refined architectural-style SVG icons — dark brown strokes */
const ICONS = {
  'home':          <><path d="M4 10l8-7 8 7v10a1 1 0 01-1 1H5a1 1 0 01-1-1V10z"/><path d="M9 21v-7h6v7"/></>,
  'check-square':  <><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="9 11 12 14 16 9"/></>,
  'calendar':      <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  'users':         <><circle cx="9" cy="7" r="3"/><path d="M15 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="17" cy="7" r="2.5"/><path d="M22 21v-1.5a3.5 3.5 0 00-2.5-3.36"/></>,
  'user':          <><circle cx="12" cy="8" r="4"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/></>,
  'trending-up':   <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>,
  'target':        <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
  'layers':        <><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>,
  'clock':         <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/></>,
  'check-circle':  <><circle cx="12" cy="12" r="9"/><polyline points="9 12 11 14 15 10"/></>,
  'eye':           <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
  'columns':       <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></>,
  'clipboard':     <><rect x="5" y="4" width="14" height="18" rx="2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></>,
  'file-text':     <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></>,
  'zap':           <><path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z"/></>,
  'bar-chart':     <><rect x="4" y="14" width="4" height="7" rx="0.5"/><rect x="10" y="8" width="4" height="13" rx="0.5"/><rect x="16" y="3" width="4" height="18" rx="0.5"/></>,
  'bar-chart-2':   <><rect x="4" y="14" width="4" height="7" rx="0.5"/><rect x="10" y="8" width="4" height="13" rx="0.5"/><rect x="16" y="3" width="4" height="18" rx="0.5"/></>,
  'dollar-sign':   <><line x1="12" y1="2" x2="12" y2="22"/><path d="M16 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H7"/></>,
  'minus-circle':  <><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  'plus-circle':   <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  'link':          <><path d="M15 7h3a5 5 0 010 10h-3m-6 0H6A5 5 0 016 7h3"/><line x1="8" y1="12" x2="16" y2="12"/></>,
  'mail':          <><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></>,
  'message-square':<><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
  'map-pin':       <><path d="M12 21s-7-5.25-7-10.5a7 7 0 0114 0C19 15.75 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.5"/></>,
  'heart':         <><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"/></>,
  'database':      <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3"/></>,
}

export function getActiveSection(pathname) {
  if (pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/goals') || pathname.startsWith('/calendar') || pathname.startsWith('/tasks')) return 'home'
  if (pathname.startsWith('/prospecting') || pathname.startsWith('/open-houses') || pathname.startsWith('/home-value')) return 'prospect'
  if (pathname.startsWith('/crm') || pathname.startsWith('/vendors') || pathname.startsWith('/print') || pathname.startsWith('/reviews') || pathname.startsWith('/post-close') || pathname.startsWith('/on-hold') || pathname.startsWith('/investors') || pathname.startsWith('/database') || pathname.startsWith('/listing-') || pathname.startsWith('/sellers') || pathname.startsWith('/seller-') || pathname.startsWith('/buyers') || pathname.startsWith('/buyer-') || pathname.startsWith('/properties')) return 'people'
  // SOP/playbook routes live under toolkit, not deals
  if (pathname === '/pipeline/buyer-sop' || pathname === '/pipeline/seller-sop') return 'toolkit'
  if (pathname.startsWith('/pipeline'))    return 'deals'
  if (pathname.startsWith('/content') || pathname.startsWith('/seo') || pathname.startsWith('/media')) return 'content'
  if (pathname.startsWith('/email'))      return 'email'
  if (pathname.startsWith('/campaigns'))  return 'email'
  if (pathname.startsWith('/bio-link'))   return 'biolink'
  if (pathname.startsWith('/pnl') || pathname.startsWith('/net-sheet') || pathname.startsWith('/market')) return 'money'
  if (pathname.startsWith('/resources') || pathname.startsWith('/settings') || pathname.startsWith('/ai')) return 'toolkit'
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
    '/prospecting', '/bio-link', '/email', '/email/campaigns', '/resources',
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

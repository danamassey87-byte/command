import { useState, useMemo } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import './ContentHub.css'

const TABS = [
  { id: 'plan',    path: '/content/plan',    label: 'Plan',    icon: '📅' },
  { id: 'create',  path: '/content/create',  label: 'Create',  icon: '✏️' },
  { id: 'publish', path: '/content/publish', label: 'Publish', icon: '🚀' },
  { id: 'measure', path: '/content/measure', label: 'Measure', icon: '📊' },
]

export default function ContentHub() {
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = useMemo(() => {
    const path = location.pathname
    if (path.startsWith('/content/create')) return 'create'
    if (path.startsWith('/content/publish')) return 'publish'
    if (path.startsWith('/content/measure')) return 'measure'
    if (path.startsWith('/content/bank')) return 'bank'
    return 'plan'
  }, [location.pathname])

  return (
    <div className="ch-page">
      <div className="ch-header">
        <div>
          <h1 className="ch-header__title">Content</h1>
          <p className="ch-header__sub">Plan, create, publish, and measure — all in one place</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ch-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`ch-tab${activeTab === t.id ? ' ch-tab--active' : ''}`}
            onClick={() => navigate(t.path)}
          >
            <span className="ch-tab__icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button
          className={`ch-tab${activeTab === 'bank' ? ' ch-tab--active' : ''}`}
          onClick={() => navigate('/content/bank')}
          style={{ marginLeft: 'auto' }}
        >
          <span className="ch-tab__icon">📦</span>
          Content Bank
        </button>
      </div>

      {/* Active tab content renders via Outlet (nested routes) */}
      <Outlet />
    </div>
  )
}

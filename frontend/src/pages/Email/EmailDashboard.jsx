import { Link } from 'react-router-dom'
import './EmailDashboard.css'

function DashCard({ title, children, className = '' }) {
  return (
    <div className={`sd-card ${className}`}>
      <h3 className="sd-card__title">{title}</h3>
      {children}
    </div>
  )
}

const TEMPLATES = [
  { name: 'Welcome Email', desc: 'New client onboarding', icon: '👋' },
  { name: 'Listing Alert', desc: 'New listing notification', icon: '🏠' },
  { name: 'Open House Invite', desc: 'OH invitation blast', icon: '🏡' },
  { name: 'Price Reduction', desc: 'Listing price update', icon: '📉' },
  { name: 'Closed Deal', desc: 'Congratulations email', icon: '🎉' },
  { name: 'Market Update', desc: 'Monthly market recap', icon: '📊' },
]

export default function EmailDashboard() {
  return (
    <div className="section-dash email-dash">

      <div className="em-hero">
        <h2 className="em-hero__title">Email Center</h2>
        <p className="em-hero__sub">Build, manage, and track your email communications</p>
      </div>

      <div className="sd-row sd-row--50-50">
        <DashCard title="Quick Start Templates">
          <div className="em-templates">
            {TEMPLATES.map(t => (
              <Link to="/email/builder" key={t.name} className="em-template-card">
                <span className="em-template-card__icon">{t.icon}</span>
                <div className="em-template-card__text">
                  <span className="em-template-card__name">{t.name}</span>
                  <span className="em-template-card__desc">{t.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </DashCard>

        <DashCard title="Email Tools">
          <div className="em-tools">
            <Link to="/email/builder" className="em-tool-link">
              <span className="em-tool-link__icon">✏️</span>
              <div>
                <span className="em-tool-link__name">Email Builder</span>
                <span className="em-tool-link__desc">Design emails with drag-and-drop blocks</span>
              </div>
            </Link>
            <Link to="/email/templates" className="em-tool-link">
              <span className="em-tool-link__icon">📄</span>
              <div>
                <span className="em-tool-link__name">Saved Templates</span>
                <span className="em-tool-link__desc">Your library of reusable templates</span>
              </div>
            </Link>
            <Link to="/email/campaigns" className="em-tool-link">
              <span className="em-tool-link__icon">📬</span>
              <div>
                <span className="em-tool-link__name">Email Campaigns</span>
                <span className="em-tool-link__desc">Bulk sends and campaign management</span>
              </div>
            </Link>
            <Link to="/email/sent" className="em-tool-link">
              <span className="em-tool-link__icon">✅</span>
              <div>
                <span className="em-tool-link__name">Sent History</span>
                <span className="em-tool-link__desc">Track and review sent emails</span>
              </div>
            </Link>
          </div>
        </DashCard>
      </div>
    </div>
  )
}

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

// Map quick-start names → EmailBuilder STARTER_TEMPLATES ids
const TEMPLATES = [
  { name: 'Welcome Email', desc: 'New client onboarding', icon: '👋', templateId: 'buyer-followup' },
  { name: 'Listing Alert', desc: 'New listing notification', icon: '🏠', templateId: 'new-listing' },
  { name: 'Open House Invite', desc: 'OH invitation blast', icon: '🏡', templateId: 'open-house-invite' },
  { name: 'Price Reduction', desc: 'Listing price update', icon: '📉', templateId: 'blank' },
  { name: 'Closed Deal', desc: 'Congratulations email', icon: '🎉', templateId: 'just-sold' },
  { name: 'Market Update', desc: 'Monthly market recap', icon: '📊', templateId: 'market-update' },
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
              <Link to={`/email/builder?template=${t.templateId}`} key={t.name} className="em-template-card">
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
            <Link to="/email/builder" className="em-tool-link">
              <span className="em-tool-link__icon">📄</span>
              <div>
                <span className="em-tool-link__name">Templates & Builder</span>
                <span className="em-tool-link__desc">Saved templates and drag-and-drop email builder</span>
              </div>
            </Link>
            <Link to="/email/newsletters" className="em-tool-link">
              <span className="em-tool-link__icon">📰</span>
              <div>
                <span className="em-tool-link__name">Newsletters</span>
                <span className="em-tool-link__desc">One-shot bulk emails with 18 templates</span>
              </div>
            </Link>
            <Link to="/email/campaigns" className="em-tool-link">
              <span className="em-tool-link__icon">📬</span>
              <div>
                <span className="em-tool-link__name">Smart Campaigns</span>
                <span className="em-tool-link__desc">Automated email sequences</span>
              </div>
            </Link>
            <Link to="/email/sent" className="em-tool-link">
              <span className="em-tool-link__icon">✅</span>
              <div>
                <span className="em-tool-link__name">Send Log</span>
                <span className="em-tool-link__desc">Individual email send history</span>
              </div>
            </Link>
            <Link to="/email/reporting" className="em-tool-link">
              <span className="em-tool-link__icon">📊</span>
              <div>
                <span className="em-tool-link__name">Reporting</span>
                <span className="em-tool-link__desc">Campaign stats, open rates, client history</span>
              </div>
            </Link>
          </div>
        </DashCard>
      </div>
    </div>
  )
}

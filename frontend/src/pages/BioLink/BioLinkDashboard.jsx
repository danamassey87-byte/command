import { Link } from 'react-router-dom'
import './BioLinkDashboard.css'

export default function BioLinkDashboard() {
  return (
    <div className="section-dash bio-dash">

      <div className="bio-hero">
        <h2 className="bio-hero__title">Link in Bio</h2>
        <p className="bio-hero__sub">Your personal landing page for social media and lead capture</p>
      </div>

      <div className="bio-grid">
        <Link to="/bio-link/page" className="bio-card">
          <span className="bio-card__icon">🔗</span>
          <h3 className="bio-card__title">My Page</h3>
          <p className="bio-card__desc">Design and customize your landing page</p>
        </Link>
        <Link to="/bio-link/forms" className="bio-card">
          <span className="bio-card__icon">📋</span>
          <h3 className="bio-card__title">Links & Forms</h3>
          <p className="bio-card__desc">Manage links, buttons, and embedded forms</p>
        </Link>
        <Link to="/bio-link/guides" className="bio-card">
          <span className="bio-card__icon">📖</span>
          <h3 className="bio-card__title">Guides</h3>
          <p className="bio-card__desc">Buyer and seller guides for lead capture</p>
        </Link>
        <Link to="/bio-link/drips" className="bio-card">
          <span className="bio-card__icon">💧</span>
          <h3 className="bio-card__title">Drip Campaigns</h3>
          <p className="bio-card__desc">Automated follow-ups for captured leads</p>
        </Link>
        <Link to="/bio-link/leads" className="bio-card">
          <span className="bio-card__icon">👥</span>
          <h3 className="bio-card__title">Leads Captured</h3>
          <p className="bio-card__desc">View and manage captured lead information</p>
        </Link>
      </div>
    </div>
  )
}

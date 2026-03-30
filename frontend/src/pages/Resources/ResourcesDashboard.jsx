import { Link } from 'react-router-dom'
import './ResourcesDashboard.css'

const RESOURCES = [
  {
    title: 'Email Templates',
    desc: 'Pre-written emails for every stage of the transaction',
    icon: '✉️',
    link: '/resources/email',
    items: ['New Client Welcome', 'Listing Presentation Follow-up', 'Offer Submitted', 'Under Contract', 'Closing Day', 'Post-Close Check-in'],
  },
  {
    title: 'SMS Templates',
    desc: 'Quick text message templates for fast communication',
    icon: '💬',
    link: '/resources/sms',
    items: ['Showing Confirmation', 'Open House Reminder', 'Price Reduction Alert', 'Just Listed', 'Appointment Reminder', 'Thank You'],
  },
  {
    title: 'Transaction Checklists',
    desc: 'Step-by-step SOPs for Arizona transactions',
    icon: '📋',
    link: '/pipeline/buyer-sop',
    items: ['Buyer SOP', 'Seller SOP', 'Pre-Listing Checklist', 'Closing Checklist'],
  },
  {
    title: 'Marketing Materials',
    desc: 'Flyers, social posts, and listing assets',
    icon: '🎨',
    link: '/content/calendar',
    items: ['Social Media Templates', 'Open House Flyers', 'Just Listed/Sold Cards', 'Market Update Graphics'],
  },
]

export default function ResourcesDashboard() {
  return (
    <div className="section-dash res-dash">

      <div className="res-hero">
        <h2 className="res-hero__title">Resource Hub</h2>
        <p className="res-hero__sub">Templates, checklists, and tools to streamline your business</p>
      </div>

      <div className="res-grid">
        {RESOURCES.map(r => (
          <Link to={r.link} key={r.title} className="res-card">
            <div className="res-card__header">
              <span className="res-card__icon">{r.icon}</span>
              <h3 className="res-card__title">{r.title}</h3>
              <p className="res-card__desc">{r.desc}</p>
            </div>
            <ul className="res-card__items">
              {r.items.map(item => (
                <li key={item} className="res-card__item">{item}</li>
              ))}
            </ul>
            <span className="res-card__cta">Open →</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

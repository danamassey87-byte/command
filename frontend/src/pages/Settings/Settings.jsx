import { SectionHeader, Card, Button } from '../../components/ui/index.jsx'
import './Settings.css'

const brandAssets = [
  { name: 'DM Logo (Dark)', file: '/assets/branding/dm-logo-dark.png', category: 'Logos' },
  { name: 'DM Logo (Light)', file: '/assets/branding/dm-logo-light.png', category: 'Logos' },
  { name: 'REAL Broker Logo', file: '/assets/branding/real-broker-logo.png', category: 'Logos' },
  { name: 'PSA Certification', file: '/assets/branding/psa-logo.png', category: 'Certifications' },
  { name: 'Headshot - Kitchen', file: '/assets/branding/headshot-1.jpg', category: 'Headshots' },
  { name: 'Facebook Banner', file: '/assets/branding/facebook-banner.jpg', category: 'Marketing' },
  { name: 'Open House Sign (Left)', file: '/assets/branding/oh-sign-left.jpg', category: 'Marketing' },
  { name: 'Open House Sign (Right)', file: '/assets/branding/oh-sign-right.jpg', category: 'Marketing' },
]

export default function Settings() {
  const categories = [...new Set(brandAssets.map(a => a.category))]

  const handleDownload = (asset) => {
    const a = document.createElement('a')
    a.href = asset.file
    a.download = asset.file.split('/').pop()
    a.click()
  }

  return (
    <div className="settings">
      <SectionHeader
        title="Settings"
        subtitle="Brand assets, preferences, and configuration"
      />

      <div className="settings__section">
        <h3 className="settings__section-title">Brand Assets</h3>
        <p className="settings__section-desc">Your logos, headshots, and marketing materials. Click to preview, use the download button to save.</p>

        {categories.map(cat => (
          <div key={cat} className="settings__asset-group">
            <h4 className="settings__asset-group-title">{cat}</h4>
            <div className="settings__asset-grid">
              {brandAssets.filter(a => a.category === cat).map(asset => (
                <div key={asset.name} className="asset-card">
                  <div className="asset-card__preview">
                    <img
                      src={asset.file}
                      alt={asset.name}
                      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                    />
                    <div className="asset-card__placeholder" style={{ display: 'none' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                      <span>Not uploaded yet</span>
                    </div>
                  </div>
                  <div className="asset-card__info">
                    <span className="asset-card__name">{asset.name}</span>
                    <button className="asset-card__download" onClick={() => handleDownload(asset)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <Card className="settings__upload-hint">
          <p>To add or update assets, place image files in <code>public/assets/branding/</code> and update the list above.</p>
        </Card>
      </div>
    </div>
  )
}

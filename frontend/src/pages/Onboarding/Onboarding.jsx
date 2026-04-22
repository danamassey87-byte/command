import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input } from '../../components/ui/index.jsx'
import { useIsMobile } from '../../lib/hooks.js'
import { useAuth } from '../../lib/AuthContext'
import * as DB from '../../lib/supabase.js'

const STEPS = [
  { id: 'welcome', title: 'Welcome to Command', subtitle: 'Let\'s set up your real estate operating system' },
  { id: 'profile', title: 'Your Profile', subtitle: 'Basic info that appears across the platform' },
  { id: 'integrations', title: 'Connect Your Tools', subtitle: 'Link the services you already use' },
  { id: 'checklist', title: 'First Steps', subtitle: 'Quick wins to get started' },
]

export default function Onboarding() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { markOnboardingComplete } = useAuth()
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState({
    name: 'Dana Massey',
    email: 'dana@danamassey.com',
    phone: '',
    brokerage: 'REAL Brokerage',
    market: 'Gilbert / East Valley, AZ',
    tagline: '',
  })
  const [saving, setSaving] = useState(false)

  const current = STEPS[step]
  const isLast = step === STEPS.length - 1

  const handleNext = async () => {
    if (step === 1) {
      // Save profile to user_settings
      setSaving(true)
      try {
        await DB.upsertUserSetting('onboarding_profile', profile)
      } catch { /* silent */ }
      finally { setSaving(false) }
    }
    if (isLast) {
      // Mark onboarding complete in DB and auth context
      try {
        await DB.upsertUserSetting('onboarding_complete', { completed_at: new Date().toISOString() })
      } catch { /* silent */ }
      markOnboardingComplete()
      navigate('/')
      return
    }
    setStep(s => s + 1)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream, #EFEDE8)', padding: isMobile ? 16 : 40,
    }}>
      <div style={{
        maxWidth: isMobile ? '100%' : 560, width: '100%', background: '#fff',
        borderRadius: 12, border: '1px solid var(--color-border, #C8C3B9)',
        padding: isMobile ? '24px 20px' : '40px 48px', boxShadow: '0 4px 24px rgba(58,42,30,.06)',
      }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= step ? 'var(--brown-dark, #3A2A1E)' : 'var(--color-border, #C8C3B9)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Header */}
        <h1 style={{
          fontFamily: 'var(--font-display, "Cormorant Garamond", serif)',
          fontSize: '2rem', fontWeight: 500, margin: '0 0 4px',
          color: 'var(--brown-dark, #3A2A1E)',
        }}>
          {current.title}
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted, #B79782)', margin: '0 0 28px' }}>
          {current.subtitle}
        </p>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div>
            <p style={{ fontSize: '0.88rem', color: 'var(--brown-warm, #5A4136)', lineHeight: 1.6, marginBottom: 16 }}>
              Command is your daily operating system for real estate. It replaces the dozen tools you're juggling and wraps everything into one place — CRM, deals, content, marketing, finances, and AI.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { icon: '👥', label: 'CRM & Contacts' },
                { icon: '🏠', label: 'Open Houses' },
                { icon: '📧', label: 'Email Campaigns' },
                { icon: '📱', label: 'Content Studio' },
                { icon: '💰', label: 'P&L Tracking' },
                { icon: '🤖', label: 'AI Assistant' },
              ].map(f => (
                <div key={f.label} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                  background: 'var(--cream, #EFEDE8)', borderRadius: 6, fontSize: '0.82rem',
                }}>
                  <span>{f.icon}</span>
                  <span style={{ color: 'var(--brown-dark)' }}>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Profile */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <Input label="Full Name" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} style={{ flex: 1 }} />
              <Input label="Phone" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="(480) 555-0000" style={{ flex: 1 }} />
            </div>
            <Input label="Email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            <div style={{ display: 'flex', gap: 10, flexDirection: isMobile ? 'column' : 'row' }}>
              <Input label="Brokerage" value={profile.brokerage} onChange={e => setProfile(p => ({ ...p, brokerage: e.target.value }))} style={{ flex: 1 }} />
              <Input label="Market Area" value={profile.market} onChange={e => setProfile(p => ({ ...p, market: e.target.value }))} style={{ flex: 1 }} />
            </div>
            <Input label="Tagline (optional)" value={profile.tagline} onChange={e => setProfile(p => ({ ...p, tagline: e.target.value }))} placeholder="Your real estate reimagined." />
          </div>
        )}

        {/* Step 2: Integrations */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { name: 'Lofty CRM', status: 'queued', desc: 'Bidirectional contact sync', icon: '🔗' },
              { name: 'Transact', status: 'queued', desc: 'Deal file management', icon: '📋' },
              { name: 'Blotato', status: 'connected', desc: 'Social media publishing', icon: '📱' },
              { name: 'Resend', status: 'connected', desc: 'Email delivery', icon: '📧' },
              { name: 'Google Calendar', status: 'reconnect', desc: 'Schedule sync', icon: '📅' },
              { name: 'Slack', status: 'queued', desc: 'Notifications & daily brief', icon: '💬' },
            ].map(int => (
              <div key={int.name} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: 'var(--cream, #EFEDE8)', borderRadius: 8,
              }}>
                <span style={{ fontSize: '1.2rem' }}>{int.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--brown-dark)' }}>{int.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{int.desc}</div>
                </div>
                <span style={{
                  fontSize: '0.65rem', padding: '2px 8px', borderRadius: 999,
                  border: `1px solid ${int.status === 'connected' ? 'var(--sage-green)' : int.status === 'reconnect' ? '#c99a2e' : 'var(--color-border)'}`,
                  color: int.status === 'connected' ? '#566b4a' : int.status === 'reconnect' ? '#c99a2e' : 'var(--color-text-muted)',
                  background: int.status === 'connected' ? 'rgba(139,154,123,.1)' : '#fff',
                }}>
                  {int.status === 'connected' ? 'Connected' : int.status === 'reconnect' ? 'Reconnect' : 'Set up later'}
                </span>
              </div>
            ))}
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
              You can configure all integrations later in Settings → Connected Accounts.
            </p>
          </div>
        )}

        {/* Step 3: First steps */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Create your first open house', path: '/open-houses', done: false },
              { label: 'Import contacts from Lofty', path: '/settings', done: false },
              { label: 'Set up your email signature', path: '/settings', done: false },
              { label: 'Schedule your first content post', path: '/content/create', done: false },
              { label: 'Run a compliance check on your bio', path: '/ai', done: false },
              { label: 'Track your first expense', path: '/pnl/expenses', done: false },
            ].map((task, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: 'var(--cream)', borderRadius: 8,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 4, border: '2px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--brown-dark)' }}>{task.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)}>Back</Button>
          ) : <div />}
          <Button onClick={handleNext} disabled={saving}>
            {saving ? 'Saving...' : isLast ? 'Launch Command' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}

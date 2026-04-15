import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/index.jsx'
import PostComposer from '../PostComposer/PostComposer.jsx'

const MODES = [
  { id: 'post',          label: 'Post',          icon: '📱', desc: 'Social media post' },
  { id: 'blog',          label: 'Blog',          icon: '✍️',  desc: 'Long-form SEO article' },
  { id: 'video',         label: 'Video',         icon: '🎬', desc: 'Remotion branded video' },
  { id: 'presentation',  label: 'Presentation',  icon: '🎯', desc: 'Gamma slide deck' },
  { id: 'direct_mail',   label: 'Direct Mail',   icon: '✉️',  desc: 'Postcard or letter' },
]

export default function CreateTab() {
  const { pieceId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [mode, setMode] = useState('post')

  // Pick up date from Plan tab "Add" button
  const dateFromPlan = searchParams.get('date')

  // If editing existing piece, detect mode from content_type
  // (PostComposer handles its own piece loading)

  return (
    <div>
      {/* Mode selector */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 16,
        padding: '10px 14px', background: '#fff',
        border: '1px solid #e8e3de', borderRadius: 10,
        overflowX: 'auto',
      }}>
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: '0.82rem',
              border: mode === m.id ? '2px solid var(--brown-dark)' : '2px solid transparent',
              background: mode === m.id ? '#faf8f5' : '#fff',
              color: 'var(--brown-dark)', cursor: 'pointer',
              fontWeight: mode === m.id ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: 6,
              whiteSpace: 'nowrap', transition: 'all 0.15s ease',
            }}
          >
            <span>{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Active mode */}
      {mode === 'post' && <PostComposer />}

      {mode === 'blog' && (
        <BlogPlaceholder onSwitch={() => setMode('post')} />
      )}

      {mode === 'video' && (
        <ModePlaceholder
          icon="🎬"
          title="Video Studio"
          desc="Create branded videos with Remotion templates — Just Listed, Market Stats, Testimonials."
          actionLabel="Open Video Studio"
          onAction={() => navigate('/content/video')}
        />
      )}

      {mode === 'presentation' && (
        <ModePlaceholder
          icon="🎯"
          title="Gamma Presentations"
          desc="AI-generated listing presentations, buyer consultations, CMAs, and market reports."
          actionLabel="Open Gamma Studio"
          onAction={() => navigate('/content/gamma')}
        />
      )}

      {mode === 'direct_mail' && (
        <DirectMailPlaceholder onSwitch={() => setMode('post')} />
      )}
    </div>
  )
}

/* ─── Blog Mode (Phase 2 — basic long-form editor) ─── */
function BlogPlaceholder({ onSwitch }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [seoKeyword, setSeoKeyword] = useState('')
  const [metaDesc, setMetaDesc] = useState('')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
      <div>
        <div style={{
          background: '#fff', border: '1px solid #e8e3de', borderRadius: 12,
          padding: '20px', marginBottom: 16,
        }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Blog post title..."
            style={{
              width: '100%', border: 'none', fontSize: '1.3rem',
              fontFamily: 'var(--font-display)', fontWeight: 600,
              color: 'var(--brown-dark)', marginBottom: 12, outline: 'none',
              background: 'transparent',
            }}
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Start writing your blog post... Use markdown for headings (## Heading), bold (**bold**), and lists (- item)."
            style={{
              width: '100%', minHeight: 400, border: 'none', resize: 'vertical',
              fontSize: '0.92rem', lineHeight: 1.8, color: 'var(--brown-dark)',
              fontFamily: 'var(--font-body)', outline: 'none', background: 'transparent',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost">Save Draft</Button>
          <Button size="sm" variant="ghost">Save to Bank</Button>
          <Button size="sm">Publish Blog Post</Button>
        </div>
      </div>

      {/* SEO sidebar */}
      <div style={{
        background: '#fff', border: '1px solid #e8e3de', borderRadius: 12,
        padding: '16px', alignSelf: 'start',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--brown-dark)', margin: '0 0 12px' }}>
          SEO Settings
        </h3>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Target Keyword
          </label>
          <input
            value={seoKeyword}
            onChange={e => setSeoKeyword(e.target.value)}
            placeholder="e.g. homes for sale Gilbert AZ"
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem' }}
          />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Meta Description
          </label>
          <textarea
            value={metaDesc}
            onChange={e => setMetaDesc(e.target.value)}
            placeholder="155 characters max for Google snippets"
            rows={3}
            style={{ width: '100%', padding: '7px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.82rem', resize: 'vertical' }}
          />
          <div style={{ fontSize: '0.7rem', color: metaDesc.length > 155 ? '#c5221f' : 'var(--color-text-muted)', marginTop: 2 }}>
            {metaDesc.length}/155
          </div>
        </div>

        {/* SEO checklist */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
            SEO Checklist
          </div>
          {[
            { check: !!title, label: 'Has a title' },
            { check: seoKeyword && title.toLowerCase().includes(seoKeyword.toLowerCase()), label: 'Keyword in title' },
            { check: body.length > 300, label: '300+ words' },
            { check: body.includes('##'), label: 'Has subheadings' },
            { check: metaDesc.length >= 50 && metaDesc.length <= 155, label: 'Meta description 50-155 chars' },
            { check: seoKeyword && body.toLowerCase().includes(seoKeyword.toLowerCase()), label: 'Keyword in body' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: '0.78rem', marginBottom: 4 }}>
              <span style={{ color: item.check ? 'var(--sage-green)' : '#c5221f' }}>
                {item.check ? '✓' : '✗'}
              </span>
              <span style={{ color: item.check ? 'var(--brown-dark)' : 'var(--color-text-muted)' }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Direct Mail Mode ─── */
function DirectMailPlaceholder({ onSwitch }) {
  const [mailType, setMailType] = useState('postcard')
  const [headline, setHeadline] = useState('')
  const [body, setBody] = useState('')
  const [cta, setCta] = useState('')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
      <div style={{
        background: '#fff', border: '1px solid #e8e3de', borderRadius: 12,
        padding: '20px',
      }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {['postcard', 'letter', 'expired_letter', 'farming_piece'].map(t => (
            <button
              key={t}
              onClick={() => setMailType(t)}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: '0.78rem',
                border: mailType === t ? '2px solid var(--brown-dark)' : '1px solid #e0dbd6',
                background: mailType === t ? '#faf8f5' : '#fff',
                color: 'var(--brown-dark)', cursor: 'pointer',
                fontWeight: mailType === t ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Headline
          </label>
          <input
            value={headline}
            onChange={e => setHeadline(e.target.value)}
            placeholder={mailType === 'expired_letter' ? 'Your listing expired. Here\'s why.' : 'Thinking about selling?'}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.95rem', fontWeight: 600 }}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Body Copy
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your direct mail copy here..."
            rows={mailType === 'postcard' ? 5 : 10}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.88rem', lineHeight: 1.7, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Call to Action
          </label>
          <input
            value={cta}
            onChange={e => setCta(e.target.value)}
            placeholder="Call Dana: 480.818.7554"
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #e0dbd6', borderRadius: 6, fontSize: '0.88rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="ghost">Save Draft</Button>
          <Button size="sm" variant="ghost">Save to Bank</Button>
          <Button size="sm">Export as PDF</Button>
        </div>
      </div>

      {/* Tips sidebar */}
      <div style={{
        background: '#fff', border: '1px solid #e8e3de', borderRadius: 12,
        padding: '16px', alignSelf: 'start',
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--brown-dark)', margin: '0 0 10px' }}>
          {mailType === 'expired_letter' ? 'Expired Seller Tips' :
           mailType === 'farming_piece' ? 'Farming Tips' :
           mailType === 'letter' ? 'Letter Tips' : 'Postcard Tips'}
        </h3>
        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          {mailType === 'expired_letter' ? (
            <>
              <p style={{ marginBottom: 8 }}><strong>Framework:</strong> PAS (Problem · Agitate · Solution)</p>
              <p style={{ marginBottom: 8 }}>Lead with the pain — their listing expired. Agitate — every day it sat, buyers assumed something was wrong. Solution — you fix both pricing and marketing.</p>
              <p>Keep it under 250 words. One clear CTA.</p>
            </>
          ) : mailType === 'farming_piece' ? (
            <>
              <p style={{ marginBottom: 8 }}><strong>Framework:</strong> BAB (Before · After · Bridge)</p>
              <p style={{ marginBottom: 8 }}>Show the transformation. "Before: 97 days on market. After: Under contract in 9 days." Bridge: Different agent, different result.</p>
              <p>Include a recent sold stat from the neighborhood.</p>
            </>
          ) : mailType === 'postcard' ? (
            <>
              <p style={{ marginBottom: 8 }}><strong>Framework:</strong> BAB or 4Ps</p>
              <p style={{ marginBottom: 8 }}>Postcards are scannable — 3 seconds max. Lead with a bold stat or transformation. One image, one CTA.</p>
              <p>Keep body under 75 words.</p>
            </>
          ) : (
            <>
              <p style={{ marginBottom: 8 }}><strong>Framework:</strong> PASTOR</p>
              <p>Letters give you room for story + proof. Open with the problem, share a client success story, paint the transformation, make your offer, close with one clear next step.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Generic placeholder for modes that link to full pages ─── */
function ModePlaceholder({ icon, title, desc, actionLabel, onAction }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e8e3de', borderRadius: 12,
      padding: '40px 20px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--brown-dark)', marginBottom: 6 }}>{title}</div>
      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 16, maxWidth: 400, margin: '0 auto 16px' }}>{desc}</p>
      <Button size="sm" onClick={onAction}>{actionLabel}</Button>
    </div>
  )
}
